<?php

class WebhookHandler {
    private $settings;
    private $orderHandler;

    public function __construct($settings, $orderHandler) {
        $this->settings = $settings;
        $this->orderHandler = $orderHandler;
    }

    public function register_webhook_handler() {
        add_action('rest_api_init', function () {
            register_rest_route('esim/v1', '/webhook', array(
                'methods'  => 'POST',
                'callback' => array($this, 'handle_webhook_request'),
                'permission_callback' => '__return_true'
            ));
        });
    }

    /**
     * Main webhook handler for StrongESIM API
     */
    public function handle_webhook_request(WP_REST_Request $request) {
        try {
            // Get raw body for signature verification
            $raw_body = $request->get_body();
            $signature = $request->get_header('X-Webhook-Signature');

            $this->log_message('Received webhook request');

            // Verify HMAC signature
            if (!$this->verify_signature($raw_body, $signature)) {
                $this->log_message('ERROR: Invalid webhook signature');
                return new WP_REST_Response(array('received' => false, 'error' => 'Invalid signature'), 401);
            }

            // Parse webhook data
            $webhook_data = json_decode($raw_body, true);

            if (!$webhook_data) {
                $this->log_message('ERROR: Invalid JSON in webhook body');
                return new WP_REST_Response(array('received' => false, 'error' => 'Invalid JSON'), 400);
            }

            $this->log_message('Webhook data: ' . json_encode($webhook_data));

            // Route to appropriate handler based on event type
            $event_type = $webhook_data['event_type'] ?? '';

            switch ($event_type) {
                case 'order.status_changed':
                    $this->handle_order_status_changed($webhook_data);
                    break;

                case 'order.data_usage_updated':
                    $this->handle_data_usage_updated($webhook_data);
                    break;

                case 'order.validity_updated':
                    $this->handle_validity_updated($webhook_data);
                    break;

                case 'esim.status_changed':
                    $this->handle_esim_status_changed($webhook_data);
                    break;

                case 'esim.smdp_event':
                    $this->handle_smdp_event($webhook_data);
                    break;

                case 'webhook.health_check':
                    $this->log_message('Health check received');
                    break;

                default:
                    $this->log_message("Unknown webhook event type: $event_type");
            }

            // Always return 200 OK
            return new WP_REST_Response(array('received' => true), 200);

        } catch (Exception $e) {
            $this->log_message('Webhook processing error: ' . $e->getMessage());
            // Still return 200 to prevent retries for unrecoverable errors
            return new WP_REST_Response(array('received' => true, 'error' => $e->getMessage()), 200);
        }
    }

    /**
     * Verify HMAC signature
     */
    private function verify_signature($payload, $signature) {
        $secret = get_option('esim_webhook_secret');

        if (!$secret) {
            $this->log_message('ERROR: Webhook secret not found in settings');
            return false;
        }

        if (!$signature) {
            $this->log_message('ERROR: No signature header provided');
            return false;
        }

        // Calculate expected signature (without sha256= prefix)
        $expected = hash_hmac('sha256', $payload, $secret);

        // Check if signature has 'sha256=' prefix and remove it
        $signature_hash = $signature;
        if (strpos($signature, 'sha256=') === 0) {
            $signature_hash = substr($signature, 7);
        }

        // Use timing-safe comparison
        $is_valid = hash_equals($expected, $signature_hash);

        if (!$is_valid) {
            $this->log_message('Signature mismatch.');
            $this->log_message('Expected: ' . substr($expected, 0, 20) . '...');
            $this->log_message('Got: ' . substr($signature_hash, 0, 20) . '...');
            $this->log_message('Raw signature header: ' . substr($signature, 0, 30) . '...');
            $this->log_message('Secret (first 10 chars): ' . substr($secret, 0, 10) . '...');
        } else {
            $this->log_message('Signature verification successful');
        }

        return $is_valid;
    }

    /**
     * Handle order.status_changed event
     */
    private function handle_order_status_changed($data) {
        $this->log_message('Handling order.status_changed event');

        $order_id = $data['data']['order_id'] ?? null;
        $new_status = $data['data']['status'] ?? null;
        $old_status = $data['data']['previous_status'] ?? null;
        $iccid = $data['data']['iccid'] ?? null;
        $qr_code_url = $data['data']['qr_code_url'] ?? null;
        $activation_code = $data['data']['activation_code'] ?? null;
        $customer_email = $data['data']['customer_email'] ?? null;
        $plan_name = $data['data']['plan_name'] ?? null;

        if (!$order_id) {
            $this->log_message('ERROR: No order_id in webhook data');
            return;
        }

        // Find WooCommerce order by StrongESIM order ID
        $wc_order = $this->get_wc_order_by_esim_order_id($order_id);

        if (!$wc_order) {
            $this->log_message("No WooCommerce order found for StrongESIM order ID: {$order_id}");
            return;
        }

        $wc_order_id = $wc_order->get_id();

        // Map StrongESIM status to WooCommerce status
        $status_map = array(
            'pending' => 'pending',
            'processing' => 'processing',
            'allocated' => 'processing',
            'activated' => 'completed',
            'failed' => 'failed',
            'cancelled' => 'cancelled',
        );

        $wc_status = $status_map[$new_status] ?? null;

        if ($wc_status) {
            $wc_order->update_status($wc_status,
                sprintf('eSIM status updated: %s → %s', $old_status, $new_status)
            );
        }

        // Store eSIM data as order meta
        if ($qr_code_url) {
            $wc_order->update_meta_data('_esim_qr_code', $qr_code_url);
        }
        if ($iccid) {
            $wc_order->update_meta_data('_esim_iccid', $iccid);
        }
        if ($activation_code) {
            $wc_order->update_meta_data('_esim_activation_code', $activation_code);
        }
        if ($new_status) {
            $wc_order->update_meta_data('_esim_status', $new_status);
        }

        $wc_order->save();

        // Send customer notification for activated eSIMs
        // Commented out - email sending now handled by API
        // if ($new_status === 'activated' && $qr_code_url) {
        //     $this->send_activation_email($wc_order, $qr_code_url, $iccid, $activation_code);
        // }

        $this->log_message("Updated WooCommerce order {$wc_order_id} with eSIM status: {$new_status}");
    }

    /**
     * Handle order.data_usage_updated event
     */
    private function handle_data_usage_updated($data) {
        $this->log_message('Handling order.data_usage_updated event');

        $order_id = $data['data']['order_id'] ?? null;
        $iccid = $data['data']['iccid'] ?? null;
        $data_used_mb = $data['data']['data_used_mb'] ?? 0;
        $total_data_mb = $data['data']['total_data_mb'] ?? 0;
        $remaining_mb = $data['data']['remaining_mb'] ?? 0;
        $usage_percentage = $data['data']['usage_percentage'] ?? 0;
        $threshold_triggered = $data['data']['threshold_triggered'] ?? false;
        $threshold_percent = $data['data']['threshold_percent'] ?? null;

        if (!$order_id) {
            $this->log_message('ERROR: No order_id in webhook data');
            return;
        }

        $wc_order = $this->get_wc_order_by_esim_order_id($order_id);

        if (!$wc_order) {
            $this->log_message("No WooCommerce order found for StrongESIM order ID: {$order_id}");
            return;
        }

        $wc_order_id = $wc_order->get_id();

        // Update order meta with usage data
        $usage_data = array(
            'data_used_mb' => $data_used_mb,
            'total_data_mb' => $total_data_mb,
            'remaining_mb' => $remaining_mb,
            'usage_percentage' => $usage_percentage,
            'last_updated' => current_time('mysql')
        );

        $wc_order->update_meta_data('_esim_data_usage', $usage_data);
        $wc_order->update_meta_data('_esim_data_remaining', $remaining_mb);
        $wc_order->save();

        // Add order note
        $wc_order->add_order_note(
            sprintf(
                'eSIM data usage updated for ICCID %s: %.2f%% used (%d MB / %d MB)',
                $iccid,
                $usage_percentage,
                $data_used_mb,
                $total_data_mb
            )
        );

        // Send SMS if threshold triggered and enabled
        if ($threshold_triggered && get_option('esim_sms_data_usage') === 'yes') {
            $message = sprintf(
                'Your eSIM has reached %d%% data usage. %d MB remaining out of %d MB total.',
                $threshold_percent,
                $remaining_mb,
                $total_data_mb
            );
            $this->orderHandler->send_sms($wc_order_id, $message);
        }

        $this->log_message("Updated data usage for order {$wc_order_id}: {$usage_percentage}% used");
    }

    /**
     * Handle order.validity_updated event
     */
    private function handle_validity_updated($data) {
        $this->log_message('Handling order.validity_updated event');

        $order_id = $data['data']['order_id'] ?? null;
        $iccid = $data['data']['iccid'] ?? null;
        $expires_at = $data['data']['expires_at'] ?? null;
        $days_remaining = $data['data']['days_remaining'] ?? null;
        $is_expired = $data['data']['is_expired'] ?? false;

        if (!$order_id) {
            $this->log_message('ERROR: No order_id in webhook data');
            return;
        }

        $wc_order = $this->get_wc_order_by_esim_order_id($order_id);

        if (!$wc_order) {
            $this->log_message("No WooCommerce order found for StrongESIM order ID: {$order_id}");
            return;
        }

        $wc_order_id = $wc_order->get_id();

        // Update order meta
        $wc_order->update_meta_data('_esim_expiry_date', $expires_at);
        $wc_order->update_meta_data('_esim_days_remaining', $days_remaining);
        $wc_order->update_meta_data('_esim_is_expired', $is_expired);
        $wc_order->save();

        // Add order note
        $wc_order->add_order_note(
            sprintf(
                'eSIM validity updated for ICCID %s: Expires on %s (%d days remaining)',
                $iccid,
                $expires_at,
                $days_remaining
            )
        );

        // Send SMS warning if expiring soon and enabled
        if ($days_remaining !== null && $days_remaining <= 3 && get_option('esim_sms_validity_usage') === 'yes') {
            $message = sprintf(
                'Your eSIM will expire in %d day(s) on %s. Please renew to continue service.',
                $days_remaining,
                date('F j, Y', strtotime($expires_at))
            );
            $this->orderHandler->send_sms($wc_order_id, $message);
        }

        $this->log_message("Updated validity for order {$wc_order_id}: {$days_remaining} days remaining");
    }

    /**
     * Handle esim.status_changed event
     */
    private function handle_esim_status_changed($data) {
        $this->log_message('Handling esim.status_changed event');

        $order_id = $data['data']['order_id'] ?? null;
        $iccid = $data['data']['iccid'] ?? null;
        $esim_status = $data['data']['esim_status'] ?? null;
        $previous_status = $data['data']['previous_status'] ?? null;
        $smdp_status = $data['data']['smdp_status'] ?? null;

        if (!$order_id) {
            $this->log_message('ERROR: No order_id in webhook data');
            return;
        }

        $wc_order = $this->get_wc_order_by_esim_order_id($order_id);

        if (!$wc_order) {
            $this->log_message("No WooCommerce order found for StrongESIM order ID: {$order_id}");
            return;
        }

        $wc_order_id = $wc_order->get_id();

        // Update order meta
        $wc_order->update_meta_data('_esim_status', $esim_status);
        if ($smdp_status) {
            $wc_order->update_meta_data('_esim_smdp_status', $smdp_status);
        }
        $wc_order->save();

        // Add order note
        $note = sprintf(
            'eSIM status changed for ICCID %s: %s → %s',
            $iccid,
            $previous_status,
            $esim_status
        );

        if ($smdp_status) {
            $note .= sprintf(' (SM-DP+: %s)', $smdp_status);
        }

        $wc_order->add_order_note($note);

        // Special handling for activated status
        if ($esim_status === 'activated' || $esim_status === 'IN_USE') {
            $wc_order->add_order_note('eSIM has been installed and activated by the customer.');
        }

        $this->log_message("Updated eSIM status for order {$wc_order_id}: {$esim_status}");
    }

    /**
     * Handle esim.smdp_event
     */
    private function handle_smdp_event($data) {
        $this->log_message('Handling esim.smdp_event');

        $order_id = $data['data']['order_id'] ?? null;
        $iccid = $data['data']['iccid'] ?? null;
        $esim_status = $data['data']['esim_status'] ?? null;
        $smdp_status = $data['data']['smdp_status'] ?? null;

        if (!$order_id) {
            $this->log_message('ERROR: No order_id in webhook data');
            return;
        }

        $wc_order = $this->get_wc_order_by_esim_order_id($order_id);

        if (!$wc_order) {
            $this->log_message("No WooCommerce order found for StrongESIM order ID: {$order_id}");
            return;
        }

        $wc_order_id = $wc_order->get_id();

        // Update order meta based on SM-DP+ status
        $timestamp_key = null;
        switch ($smdp_status) {
            case 'DOWNLOAD':
                $timestamp_key = '_esim_download_time';
                break;
            case 'INSTALLATION':
                $timestamp_key = '_esim_installation_time';
                break;
            case 'ENABLED':
                $timestamp_key = '_esim_enabled_time';
                break;
            case 'DISABLED':
                $timestamp_key = '_esim_disabled_time';
                break;
            case 'DELETED':
                $timestamp_key = '_esim_deleted_time';
                break;
        }

        if ($timestamp_key) {
            $wc_order->update_meta_data($timestamp_key, current_time('mysql'));
        }

        $wc_order->update_meta_data('_esim_smdp_status', $smdp_status);
        $wc_order->save();

        // Add order note
        $note = "eSIM Profile SM-DP+ Event: {$smdp_status}";
        if ($iccid) {
            $note .= " for ICCID {$iccid}";
        }
        $wc_order->add_order_note($note);

        $this->log_message("Updated SM-DP+ status for order {$wc_order_id}: {$smdp_status}");
    }

    /**
     * Send activation email to customer
     * Commented out - email sending now handled by API
     */
    // private function send_activation_email($wc_order, $qr_code_url, $iccid, $activation_code) {
    //     $customer_email = $wc_order->get_billing_email();
    //
    //     $subject = 'Your eSIM is Activated!';
    //     $message = sprintf(
    //         "Your eSIM has been activated successfully!\n\n" .
    //         "Order #%s\n" .
    //         "ICCID: %s\n\n" .
    //         "QR Code: %s\n" .
    //         "Activation Code: %s\n\n" .
    //         "Download your QR code and install the eSIM on your device.\n\n" .
    //         "Thank you for your purchase!",
    //         $wc_order->get_order_number(),
    //         $iccid,
    //         $qr_code_url,
    //         $activation_code
    //     );
    //
    //     wp_mail($customer_email, $subject, $message);
    //
    //     $this->log_message("Sent activation email to {$customer_email}");
    // }

    /**
     * Get WooCommerce order by StrongESIM order ID
     */
    private function get_wc_order_by_esim_order_id($esim_order_id) {
        global $wpdb;

        // Try to find order by _esim_order_id meta key
        $order_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_esim_order_id' AND meta_value = %s",
            $esim_order_id
        ));

        // Fallback: try _esim_order_number (legacy)
        if (!$order_id) {
            $order_id = $wpdb->get_var($wpdb->prepare(
                "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_esim_order_number' AND meta_value = %s",
                $esim_order_id
            ));
        }

        if ($order_id) {
            return wc_get_order($order_id);
        }

        return null;
    }

    /**
     * Log message to file and error_log
     */
    private function log_message($message) {
        error_log('[eSIM Webhook] ' . $message);
        file_put_contents(
            WP_CONTENT_DIR . '/esim-plugin.log',
            date('[Y-m-d H:i:s] ') . $message . "\n",
            FILE_APPEND
        );
    }
}
