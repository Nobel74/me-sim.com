<?php

use ESIMWooCommerce\Utils\Logger;

class StrongESIM_API {
    private $api_url = 'https://api.strongesim.com/api/v1/';
    private $email;
    private $password;
    private $logger;
    private $auth_token = null;
    private $session_id = null;

    public function __construct($email, $password, $logger) {
        $this->email = $email;
        $this->password = $password;
        $this->logger = $logger;
    }

    /**
     * Authenticate with the API and get the access token and session ID
     */
    private function login() {
        if ($this->auth_token && $this->session_id) {
            return true; // Already authenticated
        }
        
        // Try to get cached token
        $cached_token = get_transient('strongesim_auth_token');
        $cached_session = get_transient('strongesim_session_id');

        if ($cached_token && $cached_session) {
            $this->auth_token = $cached_token;
            $this->session_id = $cached_session;
            return true;
        }

        $endpoint = $this->api_url . 'auth/login';
        $body = array(
            'email' => $this->email,
            'password' => $this->password, 
            'role' => 'reseller'
        );

        $args = array(
            'body' => json_encode($body),
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'method' => 'POST',
            'timeout' => 30,
        );

        $this->logger->log("Attempting login to StrongESIM API for email: " . $this->email);

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Login Error: ' . $response->get_error_message());
            return false;
        }

        $response_body = wp_remote_retrieve_body($response);
        $result = json_decode($response_body, true);

        if (isset($result['success']) && $result['success'] && isset($result['data']['accessToken'])) {
            $this->auth_token = $result['data']['accessToken'];
            $this->session_id = $result['data']['session_id'];
            
            // Cache the token for slightly less than expiration (assuming 24h, verify if needed, but safe default)
            // Or better, don't rely heavily on long caching if we can just re-login on failure.
            // Let's cache for 1 hour to be safe.
            set_transient('strongesim_auth_token', $this->auth_token, HOUR_IN_SECONDS);
            set_transient('strongesim_session_id', $this->session_id, HOUR_IN_SECONDS);
            
            $this->logger->log("StrongESIM Login successful.");
            return true;
        }

        $this->logger->log('StrongESIM Login Failed: ' . $response_body);
        return false;
    }

    /**
     * Get validated headers for API requests
     */
    private function getHeaders() {
        if (!$this->login()) {
            return false;
        }

        return array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $this->auth_token,
            'X-Session-ID' => $this->session_id
        );
    }
    
    /**
     * Trigger sync of plans on the API side
     */
    public function syncPlans() {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'plans/sync/1';

        $args = array(
            'headers' => $headers,
            'method' => 'POST',
            'timeout' => 60,
        );

        $this->logger->log("Triggering plans sync on StrongESIM API...");
        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Sync Plans Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['success']) && $result['success']) {
            $this->logger->log('StrongESIM Sync Plans Success: ' . $result['message']);
            return $result;
        }

        $this->logger->log('StrongESIM Sync Plans Failed: ' . substr($body, 0, 200));
        return false;
    }

    /**
     * Fetch all available plans
     */
    public function getPlans() {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'plans?limit=10000';

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 60,
        );

        // Increase limits for large response
        $original_memory = ini_get('memory_limit');
        $original_time = ini_get('max_execution_time');
        @ini_set('memory_limit', '512M');
        @ini_set('max_execution_time', '360');

        $this->logger->log("Fetching plans from StrongESIM API...");
        $response = wp_remote_get($endpoint, $args);

         // Restore original limits
        @ini_set('memory_limit', $original_memory);
        @ini_set('max_execution_time', $original_time);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Get Plans Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['data'])) {
             // The structure matches what ProductSyncManager expects if we return the rawresult or just data?
             // ProductSyncManager currently expects ['obj']['packageList'].
             // We should adapt this class to return raw data and let SyncManager handle specific logic,
             // OR adapt SyncManager. Given SyncManager is tightly coupled to old structure,
             // it might be cleaner to return normalized data here or update SyncManager.
             // Decision: Update SyncManager to handle this new structure.
             return $result;
        }

        $this->logger->log('StrongESIM Get Plans Failed or Empty: ' . substr($body, 0, 200));
        return false;
    }

    /**
     * Create a new order
     */
    public function createOrder($plan_id, $quantity, $customer_email, $customer_name) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'orders';
        
        $body = array(
            'plan_id' => $plan_id,
            'quantity' => $quantity,
            'reseller_profile_id' => null,
            'end_customer_email' => $customer_email,
            'customer_name' => $customer_name
        );

        $args = array(
            'body' => json_encode($body),
            'headers' => $headers,
            'method' => 'POST',
            'timeout' => 45,
        );

        $this->logger->log("Creating order for Plan ID: $plan_id, Email: $customer_email");

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Create Order Error: ' . $response->get_error_message());
            return array('success' => false, 'message' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return $result;
    }

    /**
     * Get Order Details (including QR code)
     */
    public function getOrderDetails($order_id) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'orders/' . $order_id;
        
        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $this->logger->log("Getting order details for Order ID: $order_id");
        
        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Get Order Details Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }
    
    /**
     * Cancel Order
     */
    public function cancelOrder($order_id) {
         $headers = $this->getHeaders();
        if (!$headers) {
            $this->logger->log('Missing authentication headers for cancel order');
            return false;
        }

        $endpoint = $this->api_url . 'orders/' . $order_id . '/cancel';

        $body = array(
            'reason' => "Customer requested cancellation via WooCommerce",
            'force' => false
        );

        $args = array(
            'body' => json_encode($body),
            'headers' => $headers,
            'method' => 'POST',
            'timeout' => 30,
        );

        $this->logger->log("Cancelling StrongESIM Order ID: $order_id via endpoint: $endpoint");

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
             $this->logger->log('StrongESIM Cancel Order Error: ' . $response->get_error_message());
            return array('success' => false, 'message' => $response->get_error_message());
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        $this->logger->log("StrongESIM Cancel Order Response (HTTP $response_code): " . json_encode($result));

        return $result;
    }

    /**
     * Register a webhook subscription
     */
    public function registerWebhook($webhook_url, $event_types = null) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions';

        if ($event_types === null) {
            $event_types = array(
                'order.status_changed',
                'order.data_usage_updated',
                'order.validity_updated',
                'esim.status_changed',
                'esim.smdp_event'
            );
        }

        $secret = wp_generate_password(32, false);

        $request_body = array(
            'name' => 'WordPress - ' . get_bloginfo('name'),
            'endpoint_url' => $webhook_url,
            'event_types' => $event_types,
            'secret' => $secret,
            'timeout_seconds' => 30,
            'retry_count' => 3
        );

        $args = array(
            'body' => json_encode($request_body),
            'headers' => $headers,
            'method' => 'POST',
            'timeout' => 30,
        );

        $this->logger->log("Registering webhook: $webhook_url");
        $this->logger->log("Webhook request body: " . json_encode($request_body));

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Register Webhook Error: ' . $response->get_error_message());
            return array('success' => false, 'message' => $response->get_error_message());
        }

        $http_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        $this->logger->log("Webhook registration HTTP response code: " . $http_code);
        $this->logger->log("Webhook registration response body: " . $response_body);

        $result = json_decode($response_body, true);

        if (isset($result['success']) && $result['success']) {
            $this->logger->log("Webhook registered successfully. ID: " . $result['data']['id']);
        } else {
            $this->logger->log("Webhook registration failed or returned non-success response");
        }

        return $result;
    }

    /**
     * List all webhook subscriptions
     */
    public function listWebhooks() {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions';

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM List Webhooks Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Get specific webhook subscription
     */
    public function getWebhook($webhook_id) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions/' . $webhook_id;

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Get Webhook Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Delete a webhook subscription
     */
    public function deleteWebhook($webhook_id) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions/' . $webhook_id;

        $args = array(
            'headers' => $headers,
            'method' => 'DELETE',
            'timeout' => 30,
        );

        $this->logger->log("Deleting webhook ID: $webhook_id");

        $response = wp_remote_request($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Delete Webhook Error: ' . $response->get_error_message());
            return array('success' => false, 'message' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['success']) && $result['success']) {
            $this->logger->log("Webhook deleted successfully");
        }

        return $result;
    }

    /**
     * Test a webhook subscription
     */
    public function testWebhook($webhook_id) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions/' . $webhook_id . '/test';

        $args = array(
            'headers' => $headers,
            'method' => 'POST',
            'timeout' => 30,
        );

        $this->logger->log("Testing webhook ID: $webhook_id");

        $response = wp_remote_post($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Test Webhook Error: ' . $response->get_error_message());
            return array('success' => false, 'message' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Get webhook delivery logs
     */
    public function getWebhookLogs($webhook_id) {
        $headers = $this->getHeaders();
        if (!$headers) return false;

        $endpoint = $this->api_url . 'webhook-subscriptions/' . $webhook_id . '/logs';

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM Get Webhook Logs Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Get account information (balance, email, role, etc.)
     */
    public function getAccountInfo() {
        $this->logger->log("Fetching account information from StrongESIM API");

        $headers = $this->getHeaders();
        if (!$headers) {
            $this->logger->log('Missing authentication headers');
            return false;
        }

        $endpoint = $this->api_url . 'users/me';

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM API Error during account info query: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['success']) && $result['success'] && isset($result['data'])) {
            $account_data = $result['data'];
            // Extract account details
            $account_info = array(
                'id' => isset($account_data['id']) ? $account_data['id'] : null,
                'email' => isset($account_data['email']) ? $account_data['email'] : null,
                'role' => isset($account_data['role']) ? $account_data['role'] : null,
                'verified_at' => isset($account_data['verified_at']) ? $account_data['verified_at'] : null,
                'balance' => isset($account_data['credit']['balance']) ? $account_data['credit']['balance'] : 0,
                'currency' => isset($account_data['credit']['currency']) ? $account_data['credit']['currency'] : 'USD',
                'soft_limit_threshold' => isset($account_data['credit']['soft_limit_threshold']) ? $account_data['credit']['soft_limit_threshold'] : null,
                'profile_complete' => isset($account_data['profile_complete']) ? $account_data['profile_complete'] : false,
            );
            $this->logger->log('Account Info Response: ' . json_encode($account_info));
            return $account_info;
        }

        $this->logger->log('Failed to get account info: ' . json_encode($result));
        return false;
    }

    /**
     * Get total plans count from API with pagination
     */
    public function getTotalPlansCount() {
        $this->logger->log("Fetching total plans count from StrongESIM API");

        $headers = $this->getHeaders();
        if (!$headers) {
            $this->logger->log('Missing authentication headers');
            return false;
        }

        $endpoint = $this->api_url . 'plans?page=1&limit=1';

        $args = array(
            'headers' => $headers,
            'method' => 'GET',
            'timeout' => 30,
        );

        $response = wp_remote_get($endpoint, $args);

        if (is_wp_error($response)) {
            $this->logger->log('StrongESIM API Error during plans count query: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);

        if (isset($result['pagination']['total'])) {
            $total = $result['pagination']['total'];
            $this->logger->log('Total plans count: ' . $total);
            return $total;
        }

        $this->logger->log('Failed to get plans count: ' . json_encode($result));
        return false;
    }
}
