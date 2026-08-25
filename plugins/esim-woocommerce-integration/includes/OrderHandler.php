<?php

require_once(plugin_dir_path(__FILE__) . 'Api/StrongESIM_API.php');

use ESIMWooCommerce\Utils\Logger;

class OrderHandler {
    private $settings;
    private $productSyncManager;
    private $api_url = 'https://api.strongesim.com/api/v1/';
    private $api_client; // Add API client property

    public function __construct($settings, $productSyncManager, $api_client = null) {
        $this->settings = $settings;
        $this->productSyncManager = $productSyncManager;
        $this->api_client = $api_client;
        
        // If API client wasn't provided, create one
        if ($this->api_client === null && class_exists('StrongESIM_API')) {
            // Create logger
            $logger = new Logger('eSIM Plugin');
            $this->api_client = new StrongESIM_API(
                $settings->get_option('esim_api_email'),
                $settings->get_option('esim_api_password'),
                $logger
            );
        }
    }

    public function init_hooks() {
        add_action('woocommerce_order_status_completed', array($this, 'process_esim_order'));
        add_action('woocommerce_order_status_cancelled', array($this, 'cancel_esim_order'));
        add_action('woocommerce_order_status_refunded', array($this, 'cancel_esim_order'));
        add_action('woocommerce_order_status_failed', array($this, 'cancel_esim_order'));
    }

    public function process_esim_order($order_id) {
        try {
            $this->log_message("Processing eSIM order for WooCommerce order ID: {$order_id}");
            $order = wc_get_order($order_id);
            if (!$order) {
                $this->log_message("Order with ID {$order_id} not found.");
                return;
            }

            $esim_orders = array();

            foreach ($order->get_items() as $item_id => $item) {
                $product = $item->get_product();
                if (!$product) {
                    $this->log_message("Product not found for item ID: {$item_id}");
                    continue;
                }

                // Use product object methods for HPOS compatibility
                $is_esim_product = $product->get_meta('_is_esim_product', true);
                if ($is_esim_product !== 'yes') {
                    $this->log_message("Product ID {$product->get_id()} is not an eSIM product.");
                    continue;
                }

                // Use product object methods for HPOS compatibility
                $package_code = $product->get_meta('_esim_package_code', true);
                if (!$package_code) {
                    $this->log_message("Package code not found for product ID: {$product->get_id()}. Product name: {$product->get_name()}");
                    $this->log_message("All meta for product {$product->get_id()}: " . json_encode($product->get_meta_data()));
                    continue;
                }

                $quantity = $item->get_quantity();

                // Get plan ID for new API using product object method for HPOS compatibility
                $plan_id = $product->get_meta('_esim_plan_id', true);
                if (!$plan_id) {
                     // Fallback check or log error?
                     // If sync was run, it should be there. If legacy product, might fail.
                     $this->log_message("Plan ID not found for product ID: {$product->get_id()}. Please re-sync products.");
                     // Try to find it via package code if possible? No, we need ID.
                     continue;
                }

                $esim_orders[] = array(
                    'plan_id' => $plan_id,
                    'quantity' => $quantity,
                    'packageCode' => $package_code, // Keep for reference
                    'item_id' => $item_id // Store item ID for association
                );
            }

            if (!empty($esim_orders)) {
                $this->log_message("Ordering eSIM profiles for order ID: {$order_id}");
                
                // For StrongESIM, we process each item individually as the API creates 1 order per call (or we need to check if it supports batch).
                // The provided API doc example shows single order creation.
                // We will loop through esim_orders and create an order for each.
                
                foreach ($esim_orders as $esim_order) {
                    $result = $this->api_client->createOrder(
                        $esim_order['plan_id'],
                        $esim_order['quantity'],
                        $order->get_billing_email(),
                        $order->get_formatted_billing_full_name()
                    );

                    if ($result && isset($result['success']) && $result['success']) {
                        $order_id_api = $result['data']['id']; // API returns UUID
                        $this->log_message("eSIM ordered successfully. API Order ID: {$order_id_api}");
                        $order->add_order_note('eSIM ordered successfully. API Order ID: ' . $order_id_api);

                        // Store the API order ID in BOTH order-level meta AND item-level meta
                        // Order-level meta (for backward compatibility and global reference)
                        $existing_ids = $order->get_meta('_esim_order_ids', true);
                        if (!is_array($existing_ids)) $existing_ids = [];
                        $existing_ids[] = $order_id_api;
                        $order->update_meta_data('_esim_order_ids', $existing_ids);
                        $order->update_meta_data('_esim_order_number', $order_id_api);
                        $order->save();

                        // Item-level meta (for proper association with specific items - CRITICAL for cancellation)
                        if (isset($esim_order['item_id'])) {
                            wc_update_order_item_meta($esim_order['item_id'], '_esim_order_no', $order_id_api);
                            $this->log_message("Saved StrongESIM order ID {$order_id_api} to item {$esim_order['item_id']}");
                        }

                        // Schedule immediate QR code query attempts
                        $this->schedule_qr_code_query($order_id, $order_id_api);
                    } else {
                        $this->log_message("Failed to order eSIM profile. Error: " . json_encode($result));
                        $order->add_order_note('Failed to order eSIM profile. Error: ' . json_encode($result));
                    }
                }
            }
        }  catch (Exception $e) {
            $this->log_message("Error processing eSIM order: " . $e->getMessage());
            // Optionally, add an order note about the error
            $order = wc_get_order($order_id);
            if ($order) {
                $order->add_order_note("Error processing eSIM order: " . $e->getMessage());
            }
        }
        
    }

    /**
     * Schedule QR code query attempts with retry logic
     */
    private function schedule_qr_code_query($order_id, $order_no) {
        $this->log_message("Scheduling QR code query for order ID: {$order_id}");
        
        // Try immediately (sometimes QR is ready right away)
        wp_schedule_single_event(time() + 10, 'esim_query_qr_code', array($order_id, $order_no, 1));
        
        // Schedule retries at increasing intervals
        wp_schedule_single_event(time() + 60, 'esim_query_qr_code', array($order_id, $order_no, 2));
        wp_schedule_single_event(time() + 300, 'esim_query_qr_code', array($order_id, $order_no, 3));
        wp_schedule_single_event(time() + 900, 'esim_query_qr_code', array($order_id, $order_no, 4));
    }

    private function order_profiles($transaction_id, $esim_orders) {
        // Deprecated, logic moved to process_esim_order
        return [];
    }

    public function query_esim_profile($order_id, $api_order_id) {
        $this->log_message("Querying eSIM profile for order ID: {$order_id}, API order ID: {$api_order_id}");
        
        $result = $this->api_client->getOrderDetails($api_order_id);

        $this->log_message('eSIM Profile Query Response: ' . json_encode($result));

        if ($result && isset($result['success']) && $result['success'] && isset($result['data'])) {
            $data = $result['data'];
            // New structure: data -> order -> ... and data -> profiles (array)
            // Example response has "profiles" array with iccid, qr_code_url, activation_code
            
            if (isset($data['profiles']) && is_array($data['profiles'])) {
                // Get order object for HPOS compatibility
                $order = wc_get_order($order_id);
                if (!$order) {
                    $this->log_message("Order ID {$order_id} not found when querying profile.");
                    return;
                }

                foreach ($data['profiles'] as $profile) {
                    $iccid = $profile['iccid'];
                    $qr_code = $profile['qr_code_url'];
                    $activation_code = $profile['activation_code'];
                    
                    $changes = false;

                    if ($iccid) {
                        $order->update_meta_data('_esim_iccid', $iccid);
                        $this->log_message("Saved ICCID {$iccid} for order ID: {$order_id}");
                        $changes = true;
                    }
                    if ($qr_code) {
                        $order->update_meta_data('_esim_qr_code', $qr_code);
                        $order->update_meta_data('_esim_activation_code', $activation_code);
                        $this->log_message("Stored QR code URL and Activation Code for order ID: {$order_id}");
                        // Commented out - email sending now handled by API
                        // $this->send_qr_code_email($order_id, $qr_code);
                        $changes = true;
                    }
                    
                    $order->update_meta_data('_esim_status', 'COMPLETED'); // Assuming successful retrieval means completed
                    $changes = true;

                    if ($changes) {
                        $order->save();
                    }
                }
            }
        } else {
            $this->log_message('eSIM profile not ready yet or error occurred.');
        }
    }

    public function get_user_qr_codes($user_id) {
        $qr_codes = array();
        $customer_orders = wc_get_orders(array(
            'customer' => $user_id,
            'status' => array('wc-completed'),
        ));

        foreach ($customer_orders as $order) {
            $qr_code_url = get_post_meta($order->get_id(), '_esim_qr_code', true);
            if ($qr_code_url) {
                $qr_codes[] = array(
                    'order_id' => $order->get_id(),
                    'qr_code_url' => $qr_code_url
                );
            }
        }

        return $qr_codes;
    }

    // Commented out - email sending now handled by API
    // private function send_qr_code_email($order_id, $qr_code) {
    //     $this->log_message("Attempting to send QR code email for order ID: {$order_id}");
    //     $order = wc_get_order($order_id);
    //     if (!$order) {
    //         $this->log_message("Order with ID {$order_id} not found for email sending.");
    //         return;
    //     }
    //
    //     $customer_email = $order->get_billing_email();
    //     if (empty($customer_email)) {
    //         $this->log_message("No customer email found for order ID: {$order_id}");
    //         return;
    //     }
    //
    //     $subject = "Your eSIM QR Code";
    //     $headers = array('Content-Type: text/html; charset=UTF-8');
    //
    //     $message = "<!DOCTYPE html>\n";
    //     $message .= "<html lang='en'>\n";
    //     $message .= "<head>\n";
    //     $message .= "<meta charset='UTF-8'>\n";
    //     $message .= "<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
    //     $message .= "<title>eSIM QR Code Email Template</title>\n";
    //     $message .= "<link href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap' rel='stylesheet'>\n";
    //     $message .= "<style>\n";
    //     $message .= "body { font-family: 'Poppins', sans-serif; background-color: #d8f3ed; color: #4a4a4a; line-height: 1.8; margin: 0; padding: 0; }\n";
    //     $message .= ".container { background-color: #ffffff; max-width: 600px; margin: 50px auto; padding: 40px; border-radius: 15px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); border-top: 5px solid #00bfa6; }\n";
    //     $message .= "h1 { color: #333333; font-size: 28px; font-weight: 600; margin-bottom: 20px; }\n";
    //     $message .= ".qr-code { text-align: center; margin: 40px 0; }\n";
    //     $message .= ".qr-code img { border: 1px solid #e1e1e1; border-radius: 12px; padding: 15px; max-width: 220px; }\n";
    //     $message .= ".btn { display: inline-block; background: linear-gradient(90deg, #00bfa6, #00a8e8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; transition: background-color 0.3s ease, transform 0.3s ease; box-shadow: 0 8px 15px rgba(0, 175, 200, 0.4); }\n";
    //     $message .= ".btn:hover { background: linear-gradient(90deg, #00998a, #008ec0); transform: translateY(-2px); box-shadow: 0 12px 20px rgba(0, 145, 170, 0.3); }\n";
    //     $message .= "p { font-size: 16px; line-height: 1.6; }\n";
    //     $message .= ".footer { text-align: center; margin-top: 40px; font-size: 14px; color: #8a8a8a; }\n";
    //     $message .= ".footer a { color: #00a8e8; text-decoration: none; font-weight: 600; }\n";
    //     $message .= ".footer a:hover { text-decoration: underline; }\n";
    //     $message .= "</style>\n";
    //     $message .= "</head>\n";
    //     $message .= "<body>\n";
    //     $message .= "<div class='container'>\n";
    //     $message .= "<h1>Your eSIM QR Code</h1>\n";
    //     $message .= "<p>Thank you for your order! We are thrilled to provide you with your eSIM QR code. Please follow the instructions below to activate your eSIM:</p>\n";
    //     $message .= "<div class='qr-code'>\n";
    //     $message .= "<img src='{$qr_code}' alt='eSIM QR Code' />\n";
    //     $message .= "</div>\n";
    //     $message .= "<p>To activate your eSIM, simply scan this QR code with your device's camera. Once scanned, follow the prompts to complete the activation process.</p>\n";
    //     $message .= "<p>If you have any questions, please feel free to contact our support team for assistance.</p>\n";
    //     $message .= "<p>Thank you for choosing StrongEsim.com!</p>\n";
    //     $message .= "<div style='text-align: center;'>\n";
    //     $message .= "<a href='https://StrongEsim.com' class='btn'>Contact Support</a>\n";
    //     $message .= "</div>\n";
    //     $message .= "<div class='footer'>\n";
    //     $message .= "<p>Visit us at <a href='https://strongesim.com/'>StrongEsim.com</a> for more information and services.</p>\n";
    //     $message .= "</div>\n";
    //     $message .= "</div>\n";
    //     $message .= "</body>\n";
    //     $message .= "</html>";
    //
    //     $headers = array('Content-Type: text/html; charset=UTF-8');
    //
    //     // Log the email content details for debugging purposes
    //     $this->log_message("Sending email to: {$customer_email} with QR code URL: {$qr_code}");
    //
    //     $result = wp_mail($customer_email, $subject, $message, $headers);
    //
    //     if ($result) {
    //         $this->log_message("eSIM QR Code email sent successfully to {$customer_email} for order ID: {$order_id}");
    //         $order->add_order_note("eSIM QR Code email sent to customer.");
    //     } else {
    //         // Capture the last error if email failed to send
    //         $error_message = error_get_last()['message'] ?? 'Unknown error';
    //         $this->log_message("Failed to send eSIM QR Code email to {$customer_email} for order ID: {$order_id}. Error: {$error_message}");
    //         $order->add_order_note("Failed to send eSIM QR Code email. Error: {$error_message}");
    //     }
    // }

    public function send_sms($order_id, $message) {
        $iccid = get_post_meta($order_id, '_esim_iccid', true);
        if (!$iccid) {
            $this->log_message("No ICCID found for order ID: {$order_id}");
            return false;
        }

        $endpoint = $this->api_url . 'esim/sendSms';
        $data = array(
            'iccid' => $iccid,
            'message' => $message
        );

        $timestamp = (string)(time() * 1000);
        $request_id = wp_generate_uuid4();
        $signature = $this->generate_signature($data, $timestamp, $request_id);

        $args = array(
            'body' => json_encode($data),
            'headers' => array(
                'Content-Type' => 'application/json',
                'RT-AccessCode' => $this->access_code,
                'RT-RequestID' => $request_id,
                'RT-Signature' => $signature,
                'RT-Timestamp' => $timestamp,
            ),
            'method' => 'POST',
        );

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->log_message('SMS Send Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if ($result && isset($result['success']) && $result['success']) {
            $this->log_message("SMS sent successfully to ICCID {$iccid} for order ID: {$order_id}");
            return true;
        } else {
            $this->log_message("Failed to send SMS to ICCID {$iccid} for order ID: {$order_id}");
            return false;
        }
    }


    private function generate_uuid() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Cancel an eSIM order when the corresponding WooCommerce order is cancelled,
     * refunded or failed.
     *
     * @param int $order_id WooCommerce order ID
     */
    public function cancel_esim_order($order_id) {
        $this->log_message("Cancelling eSIM for order ID: {$order_id}");

        $order = wc_get_order($order_id);
        if (!$order) {
            $this->log_message("Error: Order with ID {$order_id} not found.");
            return;
        }

        // Check if order has eSIM profiles
        $esim_orders = $this->get_esim_orders_from_wc_order($order);

        if (empty($esim_orders)) {
            $this->log_message("No eSIM profiles found for order ID {$order_id}");
            return;
        }

        $this->log_message("Found " . count($esim_orders) . " eSIM order(s) to cancel: " . json_encode(array_column($esim_orders, 'order_no')));
        
        $success_count = 0;
        $failed_count = 0;
        
        // Cancel each eSIM profile
        foreach ($esim_orders as $esim_order) {
            $order_no = $esim_order['order_no'];
            
            if (empty($order_no)) {
                $this->log_message("Error: Missing eSIM order number for one of the items in order ID {$order_id}");
                $failed_count++;
                continue;
            }
            
            // Call API to cancel the eSIM profile
            if ($this->api_client) {
                $result = $this->api_client->cancelOrder($order_no);
            } else {
                 $failed_count++;
                 continue; // Client not init
            }
            
            // Check result
            if ($result && isset($result['success']) && $result['success']) {
                $this->log_message("Successfully cancelled eSIM profile with order number: {$order_no}");
                $success_count++;
                
                // Update the order item meta
                foreach ($order->get_items() as $item_id => $item) {
                    $item_esim_order_no = wc_get_order_item_meta($item_id, '_esim_order_no', true);
                    if ($item_esim_order_no === $order_no) {
                        wc_update_order_item_meta($item_id, '_esim_cancelled', 'yes');
                        wc_update_order_item_meta($item_id, '_esim_cancel_date', current_time('mysql'));
                    }
                }
                
                // Add order note
                $order->add_order_note("eSIM profile with order number {$order_no} has been cancelled.");
            } else {
                $this->log_message("Failed to cancel eSIM profile with order number: {$order_no}");
                $this->log_message("API Response: " . json_encode($result));
                $failed_count++;
                
                // Add order note
                $order->add_order_note("Failed to cancel eSIM profile with order number {$order_no}. Please check logs.");
            }
        }
        
        // Add summary note to order
        if ($success_count > 0 && $failed_count > 0) {
            $order->add_order_note("eSIM cancellation summary: {$success_count} profiles cancelled successfully, {$failed_count} profiles failed to cancel.");
        } else if ($success_count > 0) {
            $order->add_order_note("All eSIM profiles cancelled successfully ({$success_count} profiles).");
        } else if ($failed_count > 0) {
            $order->add_order_note("Failed to cancel any eSIM profiles ({$failed_count} attempts).");
        }
    }
    
    /**
     * Fallback method to directly cancel an eSIM profile if API client isn't available
     *
     * @param string $order_no The eSIM order number to cancel
     * @return array Response from the API
     */
    /**
     * Fallback method deprecated
     */
    private function cancel_esim_profile($order_no) {
       return array('error' => 'Deprecated');
    }
    
    /**
     * Helper method to get eSIM orders from a WooCommerce order
     *
     * @param WC_Order $order WooCommerce order object
     * @return array Array of eSIM orders with order_no and other details
     */
    private function get_esim_orders_from_wc_order($order) {
        $esim_orders = array();

        foreach ($order->get_items() as $item_id => $item) {
            $order_no = wc_get_order_item_meta($item_id, '_esim_order_no', true);
            $is_cancelled = wc_get_order_item_meta($item_id, '_esim_cancelled', true);

            // Only include non-cancelled eSIM orders
            if (!empty($order_no) && $is_cancelled !== 'yes') {
                $esim_orders[] = array(
                    'order_no' => $order_no,
                    'item_id' => $item_id,
                    'product_id' => $item->get_product_id()
                );
            }
        }

        // Fallback: Check order-level meta for legacy orders (before item-level meta was implemented)
        if (empty($esim_orders)) {
            $order_ids = $order->get_meta('_esim_order_ids', true);
            if (is_array($order_ids) && !empty($order_ids)) {
                foreach ($order_ids as $oid) {
                    $esim_orders[] = array(
                        'order_no' => $oid,
                        'item_id' => null, // No specific item association
                        'product_id' => null
                    );
                }
            } else {
                // Try single order number field (legacy)
                $single_order_no = $order->get_meta('_esim_order_number', true);
                if (!empty($single_order_no)) {
                    $esim_orders[] = array(
                        'order_no' => $single_order_no,
                        'item_id' => null,
                        'product_id' => null
                    );
                }
            }
        }

        return $esim_orders;
    }
    
    private function log_message($message) {
        error_log('[eSIM Plugin] ' . $message);
        file_put_contents(WP_CONTENT_DIR . '/esim-plugin.log', date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
    }
    
    private function generate_signature($data, $timestamp, $request_id) {
        $sign_data = $timestamp . $request_id . $this->access_code . json_encode($data);
        return hash_hmac('sha256', $sign_data, $this->secret_key);
    }
    
    /**
     * Scheduled QR code query with retry logic
     */
    public function scheduled_qr_code_query($order_id, $order_no, $attempt) {
        $this->log_message("Scheduled QR code query attempt {$attempt} for order ID: {$order_id}");
        
        // Check if QR code is already available
        $existing_qr = get_post_meta($order_id, '_esim_qr_code', true);
        if ($existing_qr) {
            $this->log_message("QR code already exists for order ID: {$order_id}, skipping query");
            // Cancel any remaining scheduled events for this order
            $this->cancel_remaining_qr_queries($order_id, $order_no, $attempt);
            return;
        }
        
        // Query the profile
        $this->query_esim_profile($order_id, $order_no);
        
        // Check if we got the QR code
        $qr_code = get_post_meta($order_id, '_esim_qr_code', true);
        if ($qr_code) {
            $this->log_message("QR code successfully retrieved on attempt {$attempt} for order ID: {$order_id}");
            
            // Cancel remaining scheduled events since we got the QR code
            $this->cancel_remaining_qr_queries($order_id, $order_no, $attempt);
            
            // Add order note about successful QR code retrieval
            $order = wc_get_order($order_id);
            if ($order) {
                $order->add_order_note("eSIM QR code successfully retrieved on attempt {$attempt}");
            }
        } else {
            $this->log_message("QR code not yet available on attempt {$attempt} for order ID: {$order_id}");
        }
    }

    /**
     * Cancel remaining scheduled QR code queries for an order
     */
    private function cancel_remaining_qr_queries($order_id, $order_no, $current_attempt) {
        // Cancel attempts that haven't run yet
        for ($i = $current_attempt + 1; $i <= 4; $i++) {
            $next_hook = wp_next_scheduled('esim_query_qr_code', array($order_id, $order_no, $i));
            if ($next_hook) {
                wp_unschedule_event($next_hook, 'esim_query_qr_code', array($order_id, $order_no, $i));
                $this->log_message("Cancelled scheduled QR code query attempt {$i} for order ID: {$order_id}");
            }
        }
    }
}
