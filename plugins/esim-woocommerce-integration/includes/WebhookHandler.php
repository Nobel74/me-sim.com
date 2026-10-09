<?php

use ESIMWooCommerce\Utils\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Receives StrongESIM platform webhooks at /wp-json/esim/v1/webhook.
 *
 * Payload shape actually sent by the platform (outgoingWebhookService):
 *
 *   {
 *     "id": "uuid",                 // delivery id
 *     "timestamp": "ISO-8601",
 *     "event": "order.status_changed",
 *     "data": { "order_id": "uuid", ... },
 *     "version": "1.0"
 *   }
 *
 * Signature: header X-Webhook-Signature = "sha256=" + HMAC-SHA256(raw body, secret).
 */
class WebhookHandler {
    private $settings;
    private $orderHandler;
    private $logger;

    public function __construct($settings, $orderHandler) {
        $this->settings = $settings;
        $this->orderHandler = $orderHandler;
        $this->logger = new Logger('eSIM Webhook');
    }

    /**
     * Kept for backwards compatibility with the old bootstrap.
     */
    public function register_webhook_handler() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route('esim/v1', '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook_request'),
            // Authentication is the HMAC signature, verified in the callback.
            'permission_callback' => '__return_true',
        ));
    }

    public function handle_webhook_request(WP_REST_Request $request) {
        try {
            $raw_body = $request->get_body();
            $signature = $request->get_header('X-Webhook-Signature');

            if (!$this->verify_signature($raw_body, $signature)) {
                return new WP_REST_Response(array('received' => false, 'error' => 'Invalid signature'), 401);
            }

            $webhook_data = json_decode($raw_body, true);
            if (!is_array($webhook_data)) {
                $this->logger->error('Invalid JSON in webhook body.');
                return new WP_REST_Response(array('received' => false, 'error' => 'Invalid JSON'), 400);
            }

            // The platform sends "event". "event_type" is accepted as a fallback
            // in case the contract ever changes, and the X-Webhook-Event header
            // as a last resort.
            $event_type = '';
            if (!empty($webhook_data['event'])) {
                $event_type = $webhook_data['event'];
            } elseif (!empty($webhook_data['event_type'])) {
                $event_type = $webhook_data['event_type'];
            } else {
                $header_event = $request->get_header('X-Webhook-Event');
                $event_type = $header_event ? $header_event : '';
            }

            $data = isset($webhook_data['data']) && is_array($webhook_data['data']) ? $webhook_data['data'] : array();

            $this->logger->log("Webhook received: {$event_type}");

            switch ($event_type) {
                case 'order.status_changed':
                    $this->handle_order_status_changed($data);
                    break;

                case 'order.data_usage_updated':
                    $this->handle_data_usage_updated($data);
                    break;

                case 'order.validity_updated':
                    $this->handle_validity_updated($data);
                    break;

                case 'esim.status_changed':
                    $this->handle_esim_status_changed($data);
                    break;

                case 'esim.smdp_event':
                    $this->handle_smdp_event($data);
                    break;

                case 'webhook.health_check':
                    $this->logger->log('Health check received.');
                    break;

                default:
                    $this->logger->log("Unhandled webhook event type: {$event_type}");
            }

            return new WP_REST_Response(array('received' => true), 200);

        } catch (\Throwable $e) {
            $this->logger->error('Webhook processing error: ' . $e->getMessage());
            // 200 so the platform does not retry something that will fail again.
            return new WP_REST_Response(array('received' => true, 'error' => 'processing error'), 200);
        }
    }

    /**
     * Verify the HMAC signature over the raw request body.
     */
    private function verify_signature($payload, $signature) {
        $secret = get_option('esim_webhook_secret');

        if (empty($secret)) {
            $this->logger->error('Webhook rejected: no webhook secret stored. Re-register the webhook on the settings page.');
            return false;
        }

        if (empty($signature)) {
            $this->logger->error('Webhook rejected: no X-Webhook-Signature header.');
            return false;
        }

        $expected = hash_hmac('sha256', $payload, $secret);

        $signature_hash = $signature;
        if (strpos($signature, 'sha256=') === 0) {
            $signature_hash = substr($signature, 7);
        }

        if (!hash_equals($expected, $signature_hash)) {
            // Never log the secret or the full signatures.
            $this->logger->error('Webhook rejected: signature mismatch.');
            return false;
        }

        return true;
    }

    /* ---------------------------------------------------------------------
     * Event handlers
     * ------------------------------------------------------------------ */

    private function handle_order_status_changed($data) {
        $order = $this->resolve_order($data);
        if (!$order) {
            return;
        }

        $new_status = isset($data['status']) ? $data['status'] : null;
        $old_status = isset($data['previous_status']) ? $data['previous_status'] : null;

        if ($new_status) {
            $order->update_meta_data('_esim_status', $new_status);
        }
        // These are not part of order.status_changed today, but harmless to
        // store if the platform ever adds them.
        foreach (array('iccid' => '_esim_iccid', 'qr_code_url' => '_esim_qr_code', 'activation_code' => '_esim_activation_code') as $field => $meta_key) {
            if (!empty($data[$field])) {
                $order->update_meta_data($meta_key, $data[$field]);
            }
        }
        $order->save();

        $order->add_order_note(sprintf(
            'StrongESIM order status: %s -> %s',
            $old_status ? $old_status : 'unknown',
            $new_status ? $new_status : 'unknown'
        ));

        // The eSIM being ready is worth completing a paid order for. Anything
        // else is only recorded: a webhook must never cancel, refund or fail a
        // WooCommerce order that the customer has already paid for, and
        // "cancelled" in particular would re-trigger the cancellation hook and
        // call the platform's cancel endpoint in a loop.
        if (in_array($new_status, array('activated', 'completed', 'allocated'), true)
            && in_array($order->get_status(), array('processing', 'on-hold'), true)) {
            $order->update_status('completed', 'eSIM provisioned by StrongESIM.');
        }

        // Pull the QR code in now that the profile exists.
        $esim_order_id = $this->extract_order_id($data);
        if ($esim_order_id && !empty($data['qr_code_available'])) {
            $this->orderHandler->query_esim_profile($order->get_id(), $esim_order_id);
        }
    }

    private function handle_data_usage_updated($data) {
        $order = $this->resolve_order($data);
        if (!$order) {
            return;
        }

        $iccid = isset($data['iccid']) ? $data['iccid'] : '';
        $data_used_mb = isset($data['data_used_mb']) ? (float) $data['data_used_mb'] : 0;
        $total_data_mb = isset($data['total_data_mb']) ? (float) $data['total_data_mb'] : 0;

        // The platform sends remaining_data_mb; remaining_mb is accepted as a
        // fallback and otherwise derived.
        if (isset($data['remaining_data_mb'])) {
            $remaining_mb = (float) $data['remaining_data_mb'];
        } elseif (isset($data['remaining_mb'])) {
            $remaining_mb = (float) $data['remaining_mb'];
        } else {
            $remaining_mb = max(0, $total_data_mb - $data_used_mb);
        }

        if (isset($data['usage_percentage'])) {
            $usage_percentage = (float) $data['usage_percentage'];
        } else {
            $usage_percentage = $total_data_mb > 0 ? round(($data_used_mb / $total_data_mb) * 100, 2) : 0;
        }

        $order->update_meta_data('_esim_data_usage', array(
            'data_used_mb' => $data_used_mb,
            'total_data_mb' => $total_data_mb,
            'remaining_mb' => $remaining_mb,
            'usage_percentage' => $usage_percentage,
            'last_updated' => current_time('mysql'),
        ));
        $order->update_meta_data('_esim_data_remaining', $remaining_mb);
        $order->save();

        $order->add_order_note(sprintf(
            'eSIM data usage%s: %s%% used (%s MB of %s MB).',
            $iccid ? ' for ICCID ' . $iccid : '',
            number_format($usage_percentage, 2),
            number_format($data_used_mb, 2),
            number_format($total_data_mb, 2)
        ));

        if (!empty($data['threshold_triggered']) && get_option('esim_sms_data_usage') === 'yes') {
            $threshold_percent = isset($data['threshold_percent']) ? (float) $data['threshold_percent'] : $usage_percentage;
            $this->orderHandler->send_sms($order->get_id(), sprintf(
                'Your eSIM has reached %s%% data usage. %s MB remaining of %s MB.',
                number_format($threshold_percent, 0),
                number_format($remaining_mb, 0),
                number_format($total_data_mb, 0)
            ));
        }
    }

    private function handle_validity_updated($data) {
        $order = $this->resolve_order($data);
        if (!$order) {
            return;
        }

        $iccid = isset($data['iccid']) ? $data['iccid'] : '';

        // The platform sends expiry_date / remaining_days.
        $expires_at = null;
        foreach (array('expiry_date', 'expires_at') as $field) {
            if (!empty($data[$field])) {
                $expires_at = $data[$field];
                break;
            }
        }

        $days_remaining = null;
        foreach (array('remaining_days', 'days_remaining') as $field) {
            if (isset($data[$field]) && $data[$field] !== null) {
                $days_remaining = (int) $data[$field];
                break;
            }
        }

        if ($expires_at !== null) {
            $order->update_meta_data('_esim_expiry_date', $expires_at);
        }
        if ($days_remaining !== null) {
            $order->update_meta_data('_esim_days_remaining', $days_remaining);
            $order->update_meta_data('_esim_is_expired', $days_remaining <= 0 ? 'yes' : 'no');
        }
        $order->save();

        $order->add_order_note(sprintf(
            'eSIM validity%s: expires %s%s.',
            $iccid ? ' for ICCID ' . $iccid : '',
            $expires_at ? $expires_at : 'unknown',
            $days_remaining !== null ? sprintf(' (%d day(s) remaining)', $days_remaining) : ''
        ));

        if ($days_remaining !== null && $days_remaining <= 3 && $days_remaining >= 0
            && get_option('esim_sms_validity_usage') === 'yes') {
            $this->orderHandler->send_sms($order->get_id(), sprintf(
                'Your eSIM expires in %d day(s)%s. Top up to keep your data running.',
                $days_remaining,
                $expires_at ? ' on ' . date_i18n(get_option('date_format'), strtotime($expires_at)) : ''
            ));
        }
    }

    private function handle_esim_status_changed($data) {
        $order = $this->resolve_order($data);
        if (!$order) {
            return;
        }

        $iccid = isset($data['iccid']) ? $data['iccid'] : '';
        $esim_status = isset($data['esim_status']) ? $data['esim_status'] : null;
        $previous_status = isset($data['previous_status']) ? $data['previous_status'] : null;
        $smdp_status = isset($data['smdp_status']) ? $data['smdp_status'] : null;

        if ($esim_status) {
            $order->update_meta_data('_esim_status', $esim_status);
        }
        if ($smdp_status) {
            $order->update_meta_data('_esim_smdp_status', $smdp_status);
        }
        if ($iccid) {
            $order->update_meta_data('_esim_iccid', $iccid);
        }
        $order->save();

        $note = sprintf(
            'eSIM status%s: %s -> %s',
            $iccid ? ' for ICCID ' . $iccid : '',
            $previous_status ? $previous_status : 'unknown',
            $esim_status ? $esim_status : 'unknown'
        );
        if ($smdp_status) {
            $note .= sprintf(' (SM-DP+: %s)', $smdp_status);
        }
        $order->add_order_note($note);
    }

    private function handle_smdp_event($data) {
        $order = $this->resolve_order($data);
        if (!$order) {
            return;
        }

        $iccid = isset($data['iccid']) ? $data['iccid'] : '';
        $smdp_status = isset($data['smdp_status']) ? $data['smdp_status'] : '';

        $timestamp_keys = array(
            'DOWNLOAD' => '_esim_download_time',
            'INSTALLATION' => '_esim_installation_time',
            'ENABLED' => '_esim_enabled_time',
            'DISABLED' => '_esim_disabled_time',
            'DELETED' => '_esim_deleted_time',
        );

        if (isset($timestamp_keys[$smdp_status])) {
            $order->update_meta_data($timestamp_keys[$smdp_status], current_time('mysql'));
        }
        if ($smdp_status) {
            $order->update_meta_data('_esim_smdp_status', $smdp_status);
        }
        if (!empty($data['esim_status'])) {
            $order->update_meta_data('_esim_status', $data['esim_status']);
        }
        $order->save();

        $order->add_order_note(sprintf(
            'eSIM SM-DP+ event: %s%s',
            $smdp_status ? $smdp_status : 'unknown',
            $iccid ? ' for ICCID ' . $iccid : ''
        ));
    }

    /* ---------------------------------------------------------------------
     * Lookup
     * ------------------------------------------------------------------ */

    private function extract_order_id($data) {
        foreach (array('order_id', 'external_order_no', 'esim_tran_no') as $field) {
            if (!empty($data[$field])) {
                return $data[$field];
            }
        }
        return null;
    }

    /**
     * Find the WooCommerce order this event belongs to.
     */
    private function resolve_order($data) {
        $esim_order_id = $this->extract_order_id($data);

        if (!$esim_order_id) {
            $this->logger->error('Webhook has no order id in its data payload.');
            return null;
        }

        $order = ESIM_OrderStore::find_order_by_esim_order_id($esim_order_id);

        if (!$order) {
            $this->logger->log("No WooCommerce order found for StrongESIM order {$esim_order_id}.");
            return null;
        }

        return $order;
    }
}
