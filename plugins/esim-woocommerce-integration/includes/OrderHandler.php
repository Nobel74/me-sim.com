<?php

use ESIMWooCommerce\Utils\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Turns a paid WooCommerce order into eSIM orders on the StrongESIM platform,
 * then pulls the QR codes back onto the order.
 *
 * Two invariants this class has to hold:
 *  - never provision the same line item twice (it debits the reseller wallet);
 *  - never leave a paid order without an eSIM and without a visible failure.
 */
class OrderHandler {
    /** Line item meta: platform order id for that item. */
    const ITEM_META_ORDER_NO = '_esim_order_no';
    /** Line item meta: stable idempotency key sent to the platform. */
    const ITEM_META_IDEMPOTENCY = '_esim_idempotency_key';

    private $settings;
    private $productSyncManager;
    private $logger;
    private $api_client;

    public function __construct($settings, $productSyncManager, $api_client = null) {
        $this->settings = $settings;
        $this->productSyncManager = $productSyncManager;
        $this->logger = new Logger('eSIM Orders');

        if ($api_client === null && class_exists('StrongESIM_API')) {
            $api_client = new StrongESIM_API(
                $settings->get_option('esim_api_email'),
                $settings->get_option('esim_api_password'),
                $this->logger
            );
        }

        $this->api_client = $api_client;
    }

    public function init_hooks() {
        // Provision as soon as the order is paid. Gateways that leave orders in
        // "processing" (anything not virtual+downloadable, or a store that
        // completes manually) would otherwise never deliver an eSIM.
        // Both entry points are safe because provisioning is guarded per item.
        add_action('woocommerce_order_status_processing', array($this, 'process_esim_order'), 10, 1);
        add_action('woocommerce_order_status_completed', array($this, 'process_esim_order'), 10, 1);

        add_action('woocommerce_order_status_cancelled', array($this, 'cancel_esim_order'), 10, 1);
        add_action('woocommerce_order_status_refunded', array($this, 'cancel_esim_order'), 10, 1);
        add_action('woocommerce_order_status_failed', array($this, 'cancel_esim_order'), 10, 1);
    }

    /* ---------------------------------------------------------------------
     * Provisioning
     * ------------------------------------------------------------------ */

    /**
     * Provision every eSIM line item on a WooCommerce order.
     *
     * @param int $order_id
     */
    public function process_esim_order($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            $this->logger->error("Order {$order_id} not found.");
            return;
        }

        if (!$this->api_client) {
            $order->add_order_note('eSIM provisioning skipped: StrongESIM API credentials are not configured.');
            $this->logger->error('API client unavailable; check the StrongESIM API settings.');
            return;
        }

        // Guard against the two status hooks firing in the same request, and
        // against a second concurrent request for the same order.
        $lock_key = 'esim_provision_lock_' . $order->get_id();
        if (get_transient($lock_key)) {
            $this->logger->log("Order {$order_id} is already being provisioned; skipping this run.");
            return;
        }
        set_transient($lock_key, 1, 5 * MINUTE_IN_SECONDS);

        try {
            $this->provision_order_items($order);
        } catch (\Throwable $e) {
            $this->logger->error("Error processing eSIM order {$order_id}: " . $e->getMessage());
            $order->add_order_note('Error while ordering eSIM profiles: ' . $e->getMessage());
            $order->update_meta_data('_esim_provision_failed', 'yes');
            $order->save();
        } finally {
            delete_transient($lock_key);
        }
    }

    private function provision_order_items(WC_Order $order) {
        $order_id = $order->get_id();
        $this->logger->log("Processing eSIM order for WooCommerce order {$order_id}");

        $provisioned = 0;
        $failed = 0;

        foreach ($order->get_items() as $item_id => $item) {
            // Already provisioned: never order again, it debits the wallet twice.
            $existing = wc_get_order_item_meta($item_id, self::ITEM_META_ORDER_NO, true);
            if (!empty($existing)) {
                $this->logger->log("Item {$item_id} already has eSIM order {$existing}; skipping.");
                continue;
            }

            $product = $item->get_product();
            if (!$product) {
                continue;
            }

            if ($product->get_meta('_is_esim_product', true) !== 'yes') {
                continue;
            }

            $plan_id = $product->get_meta('_esim_plan_id', true);
            if (empty($plan_id)) {
                $this->logger->error("Product {$product->get_id()} has no _esim_plan_id. Re-run the product sync.");
                $order->add_order_note(sprintf(
                    'Cannot order "%s": the product has no StrongESIM plan id. Re-run the product sync.',
                    $product->get_name()
                ));
                $failed++;
                continue;
            }

            $quantity = max(1, (int) $item->get_quantity());

            // One stable key per retail order line. A retried webhook, a double
            // status transition or an admin re-save all reuse this key, and the
            // platform returns the original order instead of provisioning again.
            $idempotency_key = wc_get_order_item_meta($item_id, self::ITEM_META_IDEMPOTENCY, true);
            if (empty($idempotency_key)) {
                $idempotency_key = $this->build_idempotency_key($order, $item_id);
                wc_update_order_item_meta($item_id, self::ITEM_META_IDEMPOTENCY, $idempotency_key);
            }

            $result = $this->api_client->createOrder(
                $plan_id,
                $quantity,
                $order->get_billing_email(),
                $order->get_formatted_billing_full_name(),
                $idempotency_key,
                $this->resolve_period_num($product)
            );

            if (is_array($result) && !empty($result['success']) && !empty($result['data']['id'])) {
                $api_order_id = $result['data']['id'];

                wc_update_order_item_meta($item_id, self::ITEM_META_ORDER_NO, $api_order_id);

                // Needed later to send an SMS to the profile.
                $provider_id = $product->get_meta('_esim_provider_id', true);
                if (!empty($provider_id)) {
                    wc_update_order_item_meta($item_id, '_esim_provider_id', $provider_id);
                }

                $existing_ids = $order->get_meta('_esim_order_ids', true);
                if (!is_array($existing_ids)) {
                    $existing_ids = array();
                }
                if (!in_array($api_order_id, $existing_ids, true)) {
                    $existing_ids[] = $api_order_id;
                }
                $order->update_meta_data('_esim_order_ids', $existing_ids);
                $order->update_meta_data('_esim_order_number', $api_order_id);
                $order->delete_meta_data('_esim_provision_failed');
                $order->save();

                $order->add_order_note('eSIM ordered successfully. StrongESIM order ID: ' . $api_order_id);
                $this->logger->log("eSIM ordered for item {$item_id}. API order ID: {$api_order_id}");

                $this->schedule_qr_code_query($order_id, $api_order_id);
                $provisioned++;
            } else {
                $message = $this->describe_api_error($result);
                $this->logger->error("Failed to order eSIM for item {$item_id}: {$message}");
                $order->add_order_note(sprintf('Failed to order eSIM for "%s": %s', $product->get_name(), $message));
                $failed++;
            }
        }

        if ($failed > 0) {
            // Flag it so the order screen and any monitoring can see that a paid
            // order is missing its eSIM.
            $order->update_meta_data('_esim_provision_failed', 'yes');
            $order->save();
            $order->add_order_note(sprintf(
                'eSIM provisioning incomplete: %d ordered, %d failed. Check WooCommerce > Status > Logs (source "strongesim").',
                $provisioned,
                $failed
            ));
        }
    }

    /**
     * Stable, collision-free idempotency key for one retail order line.
     */
    private function build_idempotency_key(WC_Order $order, $item_id) {
        $seed = implode(':', array(
            'wc',
            (string) get_current_blog_id(),
            (string) $order->get_id(),
            (string) $item_id,
        ));

        // Hashed with the site's own salt so two stores sharing a reseller
        // account cannot collide on the same key.
        return 'wc-' . substr(hash_hmac('sha256', $seed, wp_salt('nonce')), 0, 40);
    }

    /**
     * periodNum for a daily ("unlimited") plan, or null for a fixed plan.
     *
     * The platform renames every daily-reset plan to "Unlimited", so the plan
     * type must come from the stored data type, never from the plan name. The
     * platform defaults periodNum to 1 day when it is omitted, which would
     * provision a one-day eSIM for a plan the customer bought for longer.
     */
    private function resolve_period_num($product) {
        $is_daily = $product->get_meta('_esim_is_daily_plan', true) === 'yes';
        if (!$is_daily) {
            return null;
        }

        $days = (int) $product->get_meta('_esim_validity_days', true);
        if ($days < 1) {
            $days = 1;
        }

        return min(365, $days);
    }

    private function describe_api_error($result) {
        if (!is_array($result)) {
            return 'no response from the StrongESIM API';
        }
        if (isset($result['message'])) {
            $message = $result['message'];
            if (isset($result['error_code'])) {
                $message .= ' (' . $result['error_code'] . ')';
            }
            if (isset($result['required'], $result['available'])) {
                $message .= sprintf(' required %s, available %s', $result['required'], $result['available']);
            }
            return $message;
        }
        return 'unexpected response: ' . wp_json_encode($result);
    }

    /* ---------------------------------------------------------------------
     * QR code retrieval
     * ------------------------------------------------------------------ */

    private function schedule_qr_code_query($order_id, $order_no) {
        $delays = array(15, 60, 300, 900);

        foreach ($delays as $index => $delay) {
            $attempt = $index + 1;
            $args = array($order_id, $order_no, $attempt);
            if (!wp_next_scheduled('esim_query_qr_code', $args)) {
                wp_schedule_single_event(time() + $delay, 'esim_query_qr_code', $args);
            }
        }
    }

    /**
     * Scheduled poll for a provisioned profile.
     */
    public function scheduled_qr_code_query($order_id, $order_no, $attempt = 1) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        if ($this->profile_stored($order, $order_no)) {
            $this->cancel_remaining_qr_queries($order_id, $order_no, $attempt);
            return;
        }

        $this->query_esim_profile($order_id, $order_no);

        $order = wc_get_order($order_id); // Re-read: query_esim_profile saved meta.
        if ($order && $this->profile_stored($order, $order_no)) {
            $this->logger->log("QR code retrieved on attempt {$attempt} for order {$order_id}.");
            $order->add_order_note("eSIM QR code retrieved (attempt {$attempt}).");
            $this->cancel_remaining_qr_queries($order_id, $order_no, $attempt);
        } elseif ($attempt >= 4) {
            $this->logger->error("QR code still unavailable for order {$order_id} after {$attempt} attempts.");
            if ($order) {
                $order->add_order_note('eSIM QR code is still not available from StrongESIM. The customer will receive it by email from StrongESIM once the profile is allocated.');
            }
        }
    }

    private function profile_stored(WC_Order $order, $order_no) {
        $profiles = $order->get_meta('_esim_profiles', true);

        if (is_array($profiles) && !empty($profiles)) {
            // Only this platform order counts. Falling back to the flat
            // _esim_qr_code key here would report "done" for every remaining
            // eSIM on a multi-item order as soon as the first one arrived.
            return isset($profiles[$order_no]) && !empty($profiles[$order_no]['qr_code_url']);
        }

        // Orders created before per-profile storage existed.
        return !empty($order->get_meta('_esim_qr_code', true));
    }

    /**
     * Fetch profiles for one platform order and store them on the WC order.
     */
    public function query_esim_profile($order_id, $api_order_id) {
        if (!$this->api_client) {
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $result = $this->api_client->getOrderDetails($api_order_id);

        if (!is_array($result) || empty($result['success']) || empty($result['data'])) {
            $this->logger->log("Profile for {$api_order_id} not ready yet.");
            return;
        }

        $data = $result['data'];

        // The platform answers 307 with a redirectToId when the id matched via
        // its fallback lookup; follow it once.
        if (isset($data['redirectToId']) && $data['redirectToId'] !== $api_order_id) {
            $result = $this->api_client->getOrderDetails($data['redirectToId']);
            if (!is_array($result) || empty($result['data'])) {
                return;
            }
            $data = $result['data'];
        }

        if (empty($data['profiles']) || !is_array($data['profiles'])) {
            $this->logger->log("Order {$api_order_id} has no profiles yet (status: " . (isset($data['status']) ? $data['status'] : 'unknown') . ').');
            return;
        }

        $profiles = $order->get_meta('_esim_profiles', true);
        if (!is_array($profiles)) {
            $profiles = array();
        }

        $stored = array();
        foreach ($data['profiles'] as $profile) {
            $stored[] = array(
                'iccid' => isset($profile['iccid']) ? $profile['iccid'] : '',
                'qr_code_url' => isset($profile['qr_code_url']) ? $profile['qr_code_url'] : '',
                'activation_code' => isset($profile['activation_code']) ? $profile['activation_code'] : '',
                'status' => isset($profile['status']) ? $profile['status'] : '',
            );
        }

        $first = $stored[0];
        $profiles[$api_order_id] = $first;
        $profiles[$api_order_id]['all'] = $stored;

        $order->update_meta_data('_esim_profiles', $profiles);

        // Keep the flat keys too: the order screen, the account page and any
        // existing store customisation read these.
        if (!empty($first['iccid'])) {
            $order->update_meta_data('_esim_iccid', $first['iccid']);
        }
        if (!empty($first['qr_code_url'])) {
            $order->update_meta_data('_esim_qr_code', $first['qr_code_url']);
        }
        if (!empty($first['activation_code'])) {
            $order->update_meta_data('_esim_activation_code', $first['activation_code']);
        }
        if (!empty($data['order']['status'])) {
            $order->update_meta_data('_esim_status', $data['order']['status']);
        } elseif (!empty($first['qr_code_url'])) {
            $order->update_meta_data('_esim_status', 'completed');
        }

        $order->save();

        $this->logger->log("Stored " . count($stored) . " profile(s) for order {$order_id} / {$api_order_id}.");
    }

    private function cancel_remaining_qr_queries($order_id, $order_no, $current_attempt) {
        for ($i = $current_attempt + 1; $i <= 4; $i++) {
            $args = array($order_id, $order_no, $i);
            $timestamp = wp_next_scheduled('esim_query_qr_code', $args);
            if ($timestamp) {
                wp_unschedule_event($timestamp, 'esim_query_qr_code', $args);
            }
        }
    }

    /* ---------------------------------------------------------------------
     * Customer-facing data
     * ------------------------------------------------------------------ */

    /**
     * QR codes for a customer's orders.
     *
     * Reads through the order CRUD so it works with High-Performance Order
     * Storage, where order meta is not in the posts table at all.
     */
    public function get_user_qr_codes($user_id) {
        $qr_codes = array();

        $orders = wc_get_orders(array(
            'customer_id' => $user_id,
            'limit' => 50,
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('processing', 'completed'),
        ));

        foreach ($orders as $order) {
            if (!$order instanceof WC_Order) {
                continue;
            }

            $profiles = $order->get_meta('_esim_profiles', true);

            if (is_array($profiles) && !empty($profiles)) {
                foreach ($profiles as $profile) {
                    if (empty($profile['qr_code_url'])) {
                        continue;
                    }
                    $qr_codes[] = array(
                        'order_id' => $order->get_id(),
                        'order_number' => $order->get_order_number(),
                        'qr_code_url' => $profile['qr_code_url'],
                        'activation_code' => isset($profile['activation_code']) ? $profile['activation_code'] : '',
                        'iccid' => isset($profile['iccid']) ? $profile['iccid'] : '',
                    );
                }
                continue;
            }

            $qr_code_url = $order->get_meta('_esim_qr_code', true);
            if (!empty($qr_code_url)) {
                $qr_codes[] = array(
                    'order_id' => $order->get_id(),
                    'order_number' => $order->get_order_number(),
                    'qr_code_url' => $qr_code_url,
                    'activation_code' => $order->get_meta('_esim_activation_code', true),
                    'iccid' => $order->get_meta('_esim_iccid', true),
                );
            }
        }

        return $qr_codes;
    }

    /* ---------------------------------------------------------------------
     * SMS
     * ------------------------------------------------------------------ */

    /**
     * Send an SMS to the eSIM profile(s) on an order, through the platform.
     *
     * @param int    $order_id WooCommerce order id.
     * @param string $message  Message body.
     * @return array{success:bool,message:string}
     */
    public function send_sms($order_id, $message) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return array('success' => false, 'message' => 'Order not found.');
        }
        if (!$this->api_client) {
            return array('success' => false, 'message' => 'StrongESIM API credentials are not configured.');
        }

        $targets = $this->collect_sms_targets($order);

        if (empty($targets)) {
            return array('success' => false, 'message' => 'No provisioned eSIM (ICCID + provider) found on this order yet.');
        }

        $sent = 0;
        $errors = array();

        foreach ($targets as $target) {
            $result = $this->api_client->sendSms($target['iccid'], $message, $target['provider_id']);
            if (is_array($result) && !empty($result['success'])) {
                $sent++;
            } else {
                $errors[] = $this->describe_api_error($result);
            }
        }

        if ($sent > 0) {
            $order->add_order_note(sprintf('SMS sent to %d eSIM profile(s).', $sent));
            $this->logger->log("SMS sent for order {$order_id} to {$sent} profile(s).");
            return array('success' => true, 'message' => sprintf('SMS sent to %d profile(s).', $sent));
        }

        $this->logger->error("SMS failed for order {$order_id}: " . implode('; ', $errors));
        return array('success' => false, 'message' => implode('; ', $errors));
    }

    /**
     * ICCID + provider id pairs an SMS can be sent to.
     */
    private function collect_sms_targets(WC_Order $order) {
        $targets = array();

        // Provider id is per line item; ICCIDs come from the stored profiles.
        $profiles = $order->get_meta('_esim_profiles', true);
        $provider_by_order_no = array();

        foreach ($order->get_items() as $item_id => $item) {
            $order_no = wc_get_order_item_meta($item_id, self::ITEM_META_ORDER_NO, true);
            $provider_id = wc_get_order_item_meta($item_id, '_esim_provider_id', true);
            if (empty($provider_id)) {
                $product = $item->get_product();
                if ($product) {
                    $provider_id = $product->get_meta('_esim_provider_id', true);
                }
            }
            if (!empty($order_no) && !empty($provider_id)) {
                $provider_by_order_no[$order_no] = $provider_id;
            }
        }

        if (is_array($profiles)) {
            foreach ($profiles as $order_no => $profile) {
                if (empty($profile['iccid']) || empty($provider_by_order_no[$order_no])) {
                    continue;
                }
                $targets[] = array(
                    'iccid' => $profile['iccid'],
                    'provider_id' => $provider_by_order_no[$order_no],
                );
            }
        }

        // Legacy single-profile orders.
        if (empty($targets)) {
            $iccid = $order->get_meta('_esim_iccid', true);
            $provider_id = reset($provider_by_order_no);
            if (!empty($iccid) && !empty($provider_id)) {
                $targets[] = array('iccid' => $iccid, 'provider_id' => $provider_id);
            }
        }

        return $targets;
    }

    /* ---------------------------------------------------------------------
     * Cancellation
     * ------------------------------------------------------------------ */

    /**
     * Cancel the platform eSIM orders behind a cancelled/refunded/failed order.
     */
    public function cancel_esim_order($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        if (!$this->api_client) {
            return;
        }

        $esim_orders = $this->get_esim_orders_from_wc_order($order);
        if (empty($esim_orders)) {
            return;
        }

        $this->logger->log("Cancelling " . count($esim_orders) . " eSIM order(s) for WooCommerce order {$order_id}.");

        $success_count = 0;
        $failed_count = 0;

        foreach ($esim_orders as $esim_order) {
            $order_no = $esim_order['order_no'];
            if (empty($order_no)) {
                $failed_count++;
                continue;
            }

            $result = $this->api_client->cancelOrder(
                $order_no,
                sprintf('WooCommerce order %s was %s', $order->get_order_number(), $order->get_status())
            );

            if (is_array($result) && !empty($result['success'])) {
                $success_count++;
                $this->logger->log("Cancelled eSIM order {$order_no}.");

                if (!empty($esim_order['item_id'])) {
                    wc_update_order_item_meta($esim_order['item_id'], '_esim_cancelled', 'yes');
                    wc_update_order_item_meta($esim_order['item_id'], '_esim_cancel_date', current_time('mysql'));
                } else {
                    foreach ($order->get_items() as $item_id => $item) {
                        if (wc_get_order_item_meta($item_id, self::ITEM_META_ORDER_NO, true) === $order_no) {
                            wc_update_order_item_meta($item_id, '_esim_cancelled', 'yes');
                            wc_update_order_item_meta($item_id, '_esim_cancel_date', current_time('mysql'));
                        }
                    }
                }

                $refund = isset($result['data']['refunded_amount']) ? $result['data']['refunded_amount'] : null;
                $order->add_order_note(sprintf(
                    'eSIM order %s cancelled%s.',
                    $order_no,
                    $refund !== null ? sprintf(' (wallet refund: %s)', $refund) : ''
                ));
            } else {
                $failed_count++;
                $message = $this->describe_api_error($result);
                $this->logger->error("Failed to cancel eSIM order {$order_no}: {$message}");
                $order->add_order_note(sprintf('Failed to cancel eSIM order %s: %s', $order_no, $message));
            }
        }

        if ($success_count > 0 && $failed_count > 0) {
            $order->add_order_note("eSIM cancellation: {$success_count} cancelled, {$failed_count} failed.");
        }
    }

    /**
     * Platform order ids attached to a WooCommerce order.
     */
    private function get_esim_orders_from_wc_order(WC_Order $order) {
        $esim_orders = array();

        foreach ($order->get_items() as $item_id => $item) {
            $order_no = wc_get_order_item_meta($item_id, self::ITEM_META_ORDER_NO, true);
            $is_cancelled = wc_get_order_item_meta($item_id, '_esim_cancelled', true);

            if (!empty($order_no) && $is_cancelled !== 'yes') {
                $esim_orders[] = array(
                    'order_no' => $order_no,
                    'item_id' => $item_id,
                    'product_id' => $item->get_product_id(),
                );
            }
        }

        if (!empty($esim_orders)) {
            return $esim_orders;
        }

        // Orders created before line-item meta existed.
        $order_ids = $order->get_meta('_esim_order_ids', true);
        if (is_array($order_ids) && !empty($order_ids)) {
            foreach ($order_ids as $oid) {
                $esim_orders[] = array('order_no' => $oid, 'item_id' => null, 'product_id' => null);
            }
            return $esim_orders;
        }

        $single_order_no = $order->get_meta('_esim_order_number', true);
        if (!empty($single_order_no)) {
            $esim_orders[] = array('order_no' => $single_order_no, 'item_id' => null, 'product_id' => null);
        }

        return $esim_orders;
    }
}
