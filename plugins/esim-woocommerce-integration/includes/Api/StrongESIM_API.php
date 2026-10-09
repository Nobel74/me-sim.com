<?php

use ESIMWooCommerce\Utils\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Client for the StrongESIM platform API (https://api.strongesim.com/api/v1/).
 *
 * The reseller access token is short lived (about an hour) and the session can
 * be revoked server side at any time, so every call goes through request(),
 * which re-authenticates once and retries when the platform answers 401/403.
 * A raw cached-token fetch would silently start failing an hour after login.
 */
class StrongESIM_API {
    const TOKEN_TRANSIENT   = 'strongesim_auth_token';
    const SESSION_TRANSIENT = 'strongesim_session_id';

    /** Page size used when walking the plan catalogue. */
    const PLANS_PAGE_SIZE = 200;

    private $api_url = 'https://api.strongesim.com/api/v1/';
    private $email;
    private $password;
    private $logger;
    private $auth_token = null;
    private $session_id = null;
    /** Human readable reason the last call failed. */
    private $last_error = '';

    public function __construct($email, $password, $logger = null) {
        $this->email = $email;
        $this->password = $password;
        $this->logger = $logger ? $logger : new Logger('eSIM API');

        // A host-level override, for the rare case where StrongESIM supplies an
        // alternative endpoint (define ESIM_API_BASE_URL in wp-config.php).
        if (defined('ESIM_API_BASE_URL') && ESIM_API_BASE_URL) {
            $this->api_url = trailingslashit(ESIM_API_BASE_URL);
        }

        /**
         * Filter the platform API base URL (must end with a slash).
         */
        $this->api_url = apply_filters('esim_api_base_url', $this->api_url);

        self::register_curl_tuning();
    }

    public function has_credentials() {
        return !empty($this->email) && !empty($this->password);
    }

    /**
     * Give our own requests a longer connect timeout.
     *
     * WordPress passes `timeout` to cURL but leaves the *connect* timeout at the
     * Requests default of 10 seconds, which is why a blocked or slow route fails
     * with "cURL error 28: Connection timed out after 10001 milliseconds" no
     * matter what timeout the caller asked for.
     */
    private static function register_curl_tuning() {
        static $registered = false;
        if ($registered) {
            return;
        }
        $registered = true;

        add_action('http_api_curl', function ($handle, $parsed_args, $url) {
            if (strpos($url, 'strongesim.com') === false) {
                return;
            }

            /**
             * Filter the connect timeout, in seconds, for StrongESIM API calls.
             */
            $connect_timeout = (int) apply_filters('esim_api_connect_timeout', 20);
            if ($connect_timeout > 0 && function_exists('curl_setopt')) {
                curl_setopt($handle, CURLOPT_CONNECTTIMEOUT, $connect_timeout);
            }

            /**
             * Filter whether StrongESIM API calls are forced over IPv4. Useful on
             * hosts whose IPv6 routing is broken, where every connection hangs
             * until it times out.
             */
            if (apply_filters('esim_api_force_ipv4', false) && defined('CURL_IPRESOLVE_V4')) {
                curl_setopt($handle, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
            }
        }, 10, 3);
    }

    /**
     * The API base URL in use.
     */
    public function get_api_url() {
        return $this->api_url;
    }

    /**
     * Why the last call failed, for showing on screen instead of a generic
     * "check your credentials".
     */
    public function get_last_error() {
        return $this->last_error;
    }

    /* ---------------------------------------------------------------------
     * Authentication
     * ------------------------------------------------------------------ */

    /**
     * Authenticate and cache the token/session pair.
     *
     * @param bool $force Ignore anything cached and log in again.
     */
    private function login($force = false) {
        if (!$this->has_credentials()) {
            $this->last_error = empty($this->email)
                ? 'No API email is saved in the settings.'
                : 'No API password is saved in the settings.';
            $this->logger->error('StrongESIM API credentials are not configured.');
            return false;
        }

        if (!$force) {
            if ($this->auth_token && $this->session_id) {
                return true;
            }

            $cached_token = get_transient(self::TOKEN_TRANSIENT);
            $cached_session = get_transient(self::SESSION_TRANSIENT);

            if ($cached_token && $cached_session) {
                $this->auth_token = $cached_token;
                $this->session_id = $cached_session;
                return true;
            }
        } else {
            $this->forget_session();
        }

        $response = wp_remote_post($this->api_url . 'auth/login', array(
            'body' => wp_json_encode(array(
                'email' => $this->email,
                'password' => $this->password,
                'role' => 'reseller',
            )),
            'headers' => array('Content-Type' => 'application/json'),
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            $this->last_error = 'Could not reach api.strongesim.com from this server: ' . $response->get_error_message();
            $this->logger->error('StrongESIM login transport error: ' . $response->get_error_message());
            return false;
        }

        $code = wp_remote_retrieve_response_code($response);
        $result = json_decode(wp_remote_retrieve_body($response), true);

        if ($code === 200 && !empty($result['success']) && !empty($result['data']['accessToken'])) {
            $this->auth_token = $result['data']['accessToken'];
            $this->session_id = isset($result['data']['session_id']) ? $result['data']['session_id'] : '';

            // Kept well inside the token lifetime; request() re-logs in anyway
            // if the platform rejects the token early.
            set_transient(self::TOKEN_TRANSIENT, $this->auth_token, 45 * MINUTE_IN_SECONDS);
            set_transient(self::SESSION_TRANSIENT, $this->session_id, 45 * MINUTE_IN_SECONDS);

            $this->logger->log('StrongESIM login successful.');
            return true;
        }

        // Never log the response body here, it can echo the submitted password.
        $message = isset($result['message']) ? $result['message'] : 'unknown error';
        $this->last_error = self::explain_login_failure($code, $result, $message);
        $this->logger->error("StrongESIM login failed (HTTP {$code}): {$message}");
        return false;
    }

    private function forget_session() {
        $this->auth_token = null;
        $this->session_id = null;
        delete_transient(self::TOKEN_TRANSIENT);
        delete_transient(self::SESSION_TRANSIENT);
    }

    private function auth_headers() {
        $headers = array(
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $this->auth_token,
        );
        if (!empty($this->session_id)) {
            $headers['X-Session-ID'] = $this->session_id;
        }
        return $headers;
    }

    /* ---------------------------------------------------------------------
     * Transport
     * ------------------------------------------------------------------ */

    /**
     * Perform an authenticated API request, re-authenticating once on 401/403.
     *
     * @param string $method   HTTP method.
     * @param string $path     Path relative to the API base.
     * @param array|null $body Request body, JSON encoded when present.
     * @param array  $args     Extra wp_remote_request args (timeout, headers).
     * @return array|false Decoded response, or false on transport/auth failure.
     */
    private function request($method, $path, $body = null, $args = array()) {
        if (!$this->login()) {
            return false;
        }

        $attempt = 0;

        while ($attempt < 2) {
            $attempt++;

            $request_args = array(
                'method' => strtoupper($method),
                'timeout' => isset($args['timeout']) ? $args['timeout'] : 30,
                'headers' => array_merge($this->auth_headers(), isset($args['headers']) ? $args['headers'] : array()),
            );

            if ($body !== null) {
                $request_args['body'] = wp_json_encode($body);
            }

            $response = wp_remote_request($this->api_url . ltrim($path, '/'), $request_args);

            if (is_wp_error($response)) {
                $this->last_error = 'Could not reach api.strongesim.com from this server: ' . $response->get_error_message();
                $this->logger->error(strtoupper($method) . " {$path} transport error: " . $response->get_error_message());
                return false;
            }

            $code = (int) wp_remote_retrieve_response_code($response);
            $raw = wp_remote_retrieve_body($response);
            $decoded = json_decode($raw, true);

            // Token expired or session revoked: log in again and retry once.
            if (($code === 401 || $code === 403) && $attempt === 1) {
                $this->logger->log("HTTP {$code} on {$path}; re-authenticating and retrying once.");
                if (!$this->login(true)) {
                    return false;
                }
                continue;
            }

            if ($code >= 400) {
                $message = is_array($decoded) && isset($decoded['message']) ? $decoded['message'] : substr($raw, 0, 300);
                $this->last_error = sprintf('%s %s returned HTTP %d: %s', strtoupper($method), $path, $code, $message);
                $this->logger->error(strtoupper($method) . " {$path} failed (HTTP {$code}): {$message}");
            }

            if (!is_array($decoded)) {
                $this->last_error = sprintf('%s %s returned a non-JSON body (HTTP %d). A security plugin or proxy may be intercepting the request.', strtoupper($method), $path, $code);
                $this->logger->error(strtoupper($method) . " {$path} returned a non-JSON body (HTTP {$code}).");
                return false;
            }

            // Surface the status code so callers can distinguish a business
            // rejection from a transport failure.
            $decoded['_http_code'] = $code;
            return $decoded;
        }

        return false;
    }

    /* ---------------------------------------------------------------------
     * Plans
     * ------------------------------------------------------------------ */

    /**
     * Ask the platform to refresh its plan catalogue from the provider.
     *
     * Best effort: a failure here only means the catalogue may be slightly
     * stale, so the caller continues with whatever the platform already has.
     */
    public function syncPlans($provider_id = null) {
        if ($provider_id === null) {
            /**
             * Filter the provider id used to trigger a platform-side plan sync.
             */
            $provider_id = apply_filters('esim_sync_provider_id', '1');
        }

        $response = wp_remote_post($this->api_url . 'plans/sync/' . rawurlencode($provider_id), array(
            'timeout' => 120,
            'headers' => array('Accept' => 'application/json'),
        ));

        if (is_wp_error($response)) {
            $this->logger->error('StrongESIM plan sync trigger failed: ' . $response->get_error_message());
            return false;
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);

        if (is_array($result) && !empty($result['success'])) {
            $this->logger->log('StrongESIM plan sync triggered.');
            return $result;
        }

        $this->logger->log('StrongESIM plan sync trigger returned no success flag; continuing with the existing catalogue.');
        return false;
    }

    /**
     * Fetch the full plan catalogue, one page at a time.
     *
     * The old single request with limit=10000 was the main cause of the sync
     * dying: one huge JSON body had to be held in memory twice (raw + decoded)
     * before a single product was written.
     *
     * @return array|false array( 'data' => plans, 'pagination' => ... )
     */
    public function getPlans() {
        if (!$this->validate_session()) {
            $this->logger->error('Refusing to fetch plans: the reseller session could not be validated, and /plans answers an unauthenticated request with public prices instead of reseller prices.');
            return false;
        }

        $page = 1;
        $total_pages = 1;
        $plans = array();
        $pagination = array();

        do {
            $result = $this->request('GET', 'plans?page=' . $page . '&limit=' . self::PLANS_PAGE_SIZE, null, array('timeout' => 60));

            if (!$result || !isset($result['data']) || !is_array($result['data'])) {
                if ($page === 1) {
                    $this->logger->error('Failed to retrieve plans from the StrongESIM API.');
                    return false;
                }
                // Partial catalogue: stop here and let the caller decide.
                $this->logger->error("Plan page {$page} failed; returning " . count($plans) . ' plans fetched so far.');
                break;
            }

            $plans = array_merge($plans, $result['data']);
            $pagination = isset($result['pagination']) ? $result['pagination'] : array();

            $total_pages = isset($pagination['totalPages']) ? (int) $pagination['totalPages'] : 1;
            $this->logger->log("Fetched plan page {$page} of {$total_pages} (" . count($result['data']) . ' plans).');

            unset($result);
            $page++;
        } while ($page <= $total_pages && $page <= 500);

        return array(
            'data' => $plans,
            'pagination' => $pagination,
            'complete' => ($page - 1) >= $total_pages,
        );
    }

    /**
     * Confirm the current token is really accepted by the platform.
     *
     * GET /plans treats the Bearer token as optional: with an expired token it
     * returns 200 with public prices rather than 401, so reseller pricing would
     * be silently replaced by public pricing. users/me requires authentication,
     * so it answers 401 and request() re-logs in and retries.
     */
    public function validate_session() {
        $result = $this->request('GET', 'users/me');
        return is_array($result) && !empty($result['success']);
    }

    /**
     * Total number of plans the platform currently offers this reseller.
     */
    public function getTotalPlansCount() {
        $result = $this->request('GET', 'plans?page=1&limit=1');

        if ($result && isset($result['pagination']['total'])) {
            return (int) $result['pagination']['total'];
        }

        return false;
    }

    /* ---------------------------------------------------------------------
     * Orders
     * ------------------------------------------------------------------ */

    /**
     * Create an eSIM order on the platform.
     *
     * @param string|int  $plan_id         Platform plan id.
     * @param int         $quantity        Number of eSIMs.
     * @param string      $customer_email  End customer email.
     * @param string      $customer_name   End customer name.
     * @param string      $idempotency_key Stable key for this retail order line.
     *                                     A retry with the same key returns the
     *                                     original order instead of provisioning
     *                                     (and charging the wallet) twice.
     * @param int|null    $period_num      Days for a daily/unlimited plan. Must
     *                                     be omitted for fixed-volume plans.
     * @return array|false
     */
    public function createOrder($plan_id, $quantity, $customer_email, $customer_name, $idempotency_key = '', $period_num = null) {
        $body = array(
            'plan_id' => $plan_id,
            'quantity' => (int) $quantity,
        );

        if (!empty($customer_email)) {
            $body['end_customer_email'] = $customer_email;
        }
        if (!empty($customer_name)) {
            $body['customer_name'] = $customer_name;
        }
        if ($period_num !== null) {
            $body['periodNum'] = (int) $period_num;
        }

        $headers = array();
        if (!empty($idempotency_key)) {
            $headers['Idempotency-Key'] = $idempotency_key;
        }

        $this->logger->log(sprintf(
            'Creating order: plan %s, qty %d%s, idempotency key %s',
            $plan_id,
            $quantity,
            $period_num !== null ? ", periodNum {$period_num}" : '',
            $idempotency_key !== '' ? $idempotency_key : '(none)'
        ));

        $result = $this->request('POST', 'orders', $body, array(
            'timeout' => 60,
            'headers' => $headers,
        ));

        if ($result === false) {
            return array('success' => false, 'message' => 'Could not reach the StrongESIM API.');
        }

        return $result;
    }

    /**
     * Order details including provisioned profiles (QR codes).
     */
    public function getOrderDetails($order_id) {
        return $this->request('GET', 'orders/' . rawurlencode($order_id), null, array('timeout' => 45));
    }

    /**
     * Cancel an order on the platform (refunds the reseller wallet).
     */
    public function cancelOrder($order_id, $reason = 'Cancelled in WooCommerce') {
        $result = $this->request('POST', 'orders/' . rawurlencode($order_id) . '/cancel', array(
            'reason' => $reason,
            'force' => false,
        ), array('timeout' => 45));

        if ($result === false) {
            return array('success' => false, 'message' => 'Could not reach the StrongESIM API.');
        }

        return $result;
    }

    /**
     * Send an SMS to a provisioned profile.
     *
     * The platform exposes this as POST /profiles/:identifier/sms and needs the
     * provider the profile was issued by. The previous version of this plugin
     * called an eSIM Access endpoint directly with signing headers it never
     * built, so it could not have worked.
     *
     * @param string $iccid       Profile ICCID.
     * @param string $message     Message body.
     * @param string $provider_id Provider the profile belongs to.
     * @return array|false
     */
    public function sendSms($iccid, $message, $provider_id) {
        if (empty($iccid) || empty($message) || empty($provider_id)) {
            return array('success' => false, 'message' => 'ICCID, message and provider id are all required.');
        }

        $result = $this->request('POST', 'profiles/' . rawurlencode($iccid) . '/sms', array(
            'provider_id' => $provider_id,
            'message' => $message,
            'type' => 'iccid',
        ), array('timeout' => 45));

        if ($result === false) {
            return array('success' => false, 'message' => 'Could not reach the StrongESIM API.');
        }

        return $result;
    }

    /* ---------------------------------------------------------------------
     * Webhook subscriptions
     * ------------------------------------------------------------------ */

    public function registerWebhook($webhook_url, $event_types = null) {
        if ($event_types === null) {
            $event_types = array(
                'order.status_changed',
                'order.data_usage_updated',
                'order.validity_updated',
                'esim.status_changed',
                'esim.smdp_event',
            );
        }

        $result = $this->request('POST', 'webhook-subscriptions', array(
            'name' => 'WordPress - ' . get_bloginfo('name'),
            'endpoint_url' => $webhook_url,
            'event_types' => $event_types,
            'secret' => wp_generate_password(48, false),
            'timeout_seconds' => 30,
            'retry_count' => 3,
        ), array('timeout' => 45));

        if ($result === false) {
            return array('success' => false, 'message' => 'Could not reach the StrongESIM API.');
        }

        if (!empty($result['success']) && isset($result['data']['id'])) {
            $this->logger->log('Webhook registered. ID: ' . $result['data']['id']);
        }

        return $result;
    }

    public function listWebhooks() {
        return $this->request('GET', 'webhook-subscriptions');
    }

    public function getWebhook($webhook_id) {
        return $this->request('GET', 'webhook-subscriptions/' . rawurlencode($webhook_id));
    }

    public function deleteWebhook($webhook_id) {
        $result = $this->request('DELETE', 'webhook-subscriptions/' . rawurlencode($webhook_id));

        if ($result === false) {
            return array('success' => false, 'message' => 'Could not reach the StrongESIM API.');
        }

        return $result;
    }

    public function testWebhook($webhook_id) {
        return $this->request('POST', 'webhook-subscriptions/' . rawurlencode($webhook_id) . '/test');
    }

    public function getWebhookLogs($webhook_id) {
        return $this->request('GET', 'webhook-subscriptions/' . rawurlencode($webhook_id) . '/logs');
    }

    /* ---------------------------------------------------------------------
     * Diagnostics
     * ------------------------------------------------------------------ */

    /**
     * Turn a failed login into a specific, actionable sentence.
     *
     * The platform answers a wrong password, an unknown email and a role
     * mismatch with the same generic 401, so the distinguishable cases are
     * handled explicitly.
     *
     * @param int         $code    HTTP status.
     * @param array|null  $result  Decoded body.
     * @param string      $message Platform message.
     * @return string
     */
    private static function explain_login_failure($code, $result, $message) {
        if ($code === 0) {
            return 'No response from api.strongesim.com.';
        }
        if ($code === 429) {
            return 'The platform has temporarily locked this account after repeated failed logins (' . $message . '). Wait for the lock to expire, then try once with the correct password.';
        }
        if ($code === 401 && is_array($result) && !empty($result['verificationPending'])) {
            return 'This account has not confirmed its email address yet. Verify the email, then log in again.';
        }
        if ($code === 401) {
            return 'The platform rejected these credentials (HTTP 401: ' . $message . '). Either the password is wrong, or the email is not registered with the "reseller" role.';
        }
        if ($code === 400) {
            return 'The platform rejected the request (HTTP 400: ' . $message . ').';
        }
        if ($code >= 500) {
            return 'The platform returned a server error (HTTP ' . $code . ': ' . $message . '). Try again shortly.';
        }
        return 'Login failed (HTTP ' . $code . ': ' . $message . ').';
    }

    /**
     * Step-by-step connection test for the settings screen.
     *
     * Runs against the live API using raw requests so nothing is written to the
     * cached session, and additionally probes whether the email exists under a
     * different role, which is otherwise indistinguishable from a wrong password.
     *
     * @return array List of array{ label, ok, detail }.
     */
    public function diagnose() {
        $steps = array();
        $host = parse_url($this->api_url, PHP_URL_HOST);
        $host = $host ? $host : 'api.strongesim.com';

        // 1. Credentials present
        if (!$this->has_credentials()) {
            $steps[] = array(
                'label' => 'Credentials saved',
                'ok' => false,
                'detail' => empty($this->email) ? 'No API email saved.' : 'No API password saved. Type it into the password field and save.',
            );
        } else {
            $steps[] = array('label' => 'Credentials saved', 'ok' => true, 'detail' => $this->email);
        }

        // 2. Is WordPress itself refusing outbound requests?
        if (defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL) {
            $allowed = defined('WP_ACCESSIBLE_HOSTS') ? WP_ACCESSIBLE_HOSTS : '';
            $is_allowed = $allowed && (stripos($allowed, $host) !== false || strpos($allowed, '*.strongesim.com') !== false);
            $steps[] = array(
                'label' => 'WordPress HTTP policy',
                'ok' => $is_allowed,
                'detail' => $is_allowed
                    ? 'WP_HTTP_BLOCK_EXTERNAL is on, and ' . $host . ' is allowed.'
                    : 'WP_HTTP_BLOCK_EXTERNAL is set in wp-config.php and ' . $host . ' is not in WP_ACCESSIBLE_HOSTS. Add it: define(\'WP_ACCESSIBLE_HOSTS\', \'' . $host . ',*.wordpress.org\');',
            );
            if (!$is_allowed) {
                return $steps;
            }
        }

        // 3. DNS
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            // The endpoint is already an IP address, so there is nothing to resolve.
            $resolved = $host;
            $steps[] = array('label' => 'DNS lookup', 'ok' => true, 'detail' => 'Endpoint is an IP address (' . $host . '), no lookup needed.');
        } else {
            $resolved = function_exists('gethostbyname') ? gethostbyname($host) : $host;
            $dns_ok = ($resolved !== $host && filter_var($resolved, FILTER_VALIDATE_IP));
            $steps[] = array(
                'label' => 'DNS lookup',
                'ok' => (bool) $dns_ok,
                'detail' => $dns_ok
                    ? $host . ' resolves to ' . $resolved
                    : 'This server could not resolve ' . $host . '. Its DNS resolver is broken or is filtering the domain.',
            );
        }

        // 4. Raw TCP connect on 443, which separates a network block from
        // anything happening at the HTTP or TLS layer.
        if (function_exists('fsockopen')) {
            $errno = 0;
            $errstr = '';
            $started = microtime(true);
            $socket = @fsockopen('tcp://' . $host, 443, $errno, $errstr, 10);
            $elapsed = round(microtime(true) - $started, 1);

            if ($socket) {
                fclose($socket);
                $steps[] = array(
                    'label' => 'TCP connect (port 443)',
                    'ok' => true,
                    'detail' => 'Connected in ' . $elapsed . 's.',
                );
            } else {
                $steps[] = array(
                    'label' => 'TCP connect (port 443)',
                    'ok' => false,
                    'detail' => 'Could not open a connection to ' . $host . ':443 after ' . $elapsed . 's (' . ($errstr !== '' ? $errstr : 'error ' . $errno) . '). Nothing above the network layer was reached, so this is a firewall, not credentials.',
                );
            }
        }

        // 5. Control test: does outbound HTTPS work at all from this server?
        // This is what decides who has to fix it. If WordPress.org answers and
        // StrongESIM does not, the route to StrongESIM specifically is blocked.
        $control = wp_remote_get('https://api.wordpress.org/core/version-check/1.7/', array('timeout' => 20));
        $control_ok = !is_wp_error($control) && (int) wp_remote_retrieve_response_code($control) === 200;
        $steps[] = array(
            'label' => 'Outbound HTTPS works',
            'ok' => $control_ok,
            'detail' => $control_ok
                ? 'api.wordpress.org answered, so this server can make outbound HTTPS requests in general.'
                : 'api.wordpress.org could not be reached either' . (is_wp_error($control) ? ' (' . $control->get_error_message() . ')' : '') . ', so outbound HTTPS is blocked for this server as a whole.',
        );

        // 6. The API itself
        $reach = wp_remote_get($this->api_url . 'plans?page=1&limit=1', array('timeout' => 25));
        if (is_wp_error($reach)) {
            $steps[] = array(
                'label' => 'Reach ' . $host,
                'ok' => false,
                'detail' => $reach->get_error_message(),
            );
            $steps[] = array(
                'label' => 'What to do',
                'ok' => false,
                'detail' => $control_ok
                    ? 'This server reaches other HTTPS sites but not ' . $host . ' (' . $resolved . '). The route to that one address is being dropped: either this server\'s firewall blocks outbound traffic to it, or the StrongESIM server is blocking this server\'s public IP. Ask your host to allow outbound TCP 443 to ' . $resolved . ', and ask StrongESIM to allow this site\'s public IP. Server address seen by PHP: ' . (isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : 'unknown') . ' (confirm the real outbound IP over SSH with: curl -s ifconfig.me).'
                    : 'This server cannot make outbound HTTPS requests at all. That is a hosting-level restriction: ask your host to allow outbound HTTPS (TCP 443), or move the site to a host that permits it.',
            );
            return $steps;
        }

        $reach_code = (int) wp_remote_retrieve_response_code($reach);
        $steps[] = array(
            'label' => 'Reach ' . $host,
            'ok' => ($reach_code === 200),
            'detail' => 'HTTP ' . $reach_code . ' from GET /plans',
        );
        if ($reach_code !== 200) {
            return $steps;
        }

        if (!$this->has_credentials()) {
            return $steps;
        }

        // 3. Login as a reseller
        $login = $this->raw_login($this->email, $this->password, 'reseller');
        $steps[] = array(
            'label' => 'Log in as reseller',
            'ok' => $login['ok'],
            'detail' => $login['ok']
                ? 'Authenticated. Role: ' . $login['role']
                : self::explain_login_failure($login['code'], $login['body'], $login['message']),
        );

        // 3b. If the reseller login failed, find out whether the email exists
        // under a different role. The generic 401 cannot tell you that.
        if (!$login['ok'] && $login['code'] === 401) {
            $any_role = $this->raw_login($this->email, $this->password, null);
            if ($any_role['ok']) {
                $steps[] = array(
                    'label' => 'Account role check',
                    'ok' => false,
                    'detail' => 'The password is correct, but this account\'s role is "' . $any_role['role'] . '", not "reseller". This plugin needs a reseller account. Ask StrongESIM to give you reseller credentials, or use your reseller login.',
                );
            } else {
                $steps[] = array(
                    'label' => 'Account role check',
                    'ok' => false,
                    'detail' => 'The email and password combination was also rejected without a role filter, so the password itself is not accepted for this email.',
                );
            }
            return $steps;
        }

        if (!$login['ok']) {
            return $steps;
        }

        $headers = array(
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Authorization' => 'Bearer ' . $login['token'],
        );
        if (!empty($login['session_id'])) {
            $headers['X-Session-ID'] = $login['session_id'];
        }

        // 4. Authenticated profile
        $me = wp_remote_get($this->api_url . 'users/me', array('headers' => $headers, 'timeout' => 30));
        if (is_wp_error($me)) {
            $steps[] = array('label' => 'Read account profile', 'ok' => false, 'detail' => $me->get_error_message());
            return $steps;
        }
        $me_code = (int) wp_remote_retrieve_response_code($me);
        $me_body = json_decode(wp_remote_retrieve_body($me), true);

        if ($me_code === 200 && is_array($me_body) && !empty($me_body['data'])) {
            $data = $me_body['data'];
            $balance = isset($data['credit']['balance']) ? $data['credit']['balance'] : null;
            $detail = 'Role: ' . (isset($data['role']) ? $data['role'] : '?');
            $detail .= $balance !== null
                ? '. Wallet balance: ' . $balance . ' ' . (isset($data['credit']['currency']) ? $data['credit']['currency'] : '')
                : '. No credit account on this user, so orders cannot be charged.';
            if (empty($data['verified_at'])) {
                $detail .= '. Email is not verified.';
            }
            $steps[] = array('label' => 'Read account profile', 'ok' => true, 'detail' => $detail);
        } else {
            $steps[] = array(
                'label' => 'Read account profile',
                'ok' => false,
                'detail' => 'HTTP ' . $me_code . ': ' . (is_array($me_body) && isset($me_body['message']) ? $me_body['message'] : 'unexpected response'),
            );
            return $steps;
        }

        // 5. Reseller-priced catalogue
        $plans = wp_remote_get($this->api_url . 'plans?page=1&limit=1', array('headers' => $headers, 'timeout' => 30));
        if (!is_wp_error($plans)) {
            $plans_body = json_decode(wp_remote_retrieve_body($plans), true);
            $total = isset($plans_body['pagination']['total']) ? (int) $plans_body['pagination']['total'] : 0;
            $steps[] = array(
                'label' => 'Read plan catalogue',
                'ok' => $total > 0,
                'detail' => $total > 0 ? $total . ' plans available to this account.' : 'No plans returned for this account.',
            );
        }

        return $steps;
    }

    /**
     * A login that does not touch the cached session.
     *
     * @param string      $email
     * @param string      $password
     * @param string|null $role Role filter, or null for any role.
     * @return array
     */
    private function raw_login($email, $password, $role = 'reseller') {
        $body = array('email' => $email, 'password' => $password);
        if ($role !== null) {
            $body['role'] = $role;
        }

        $response = wp_remote_post($this->api_url . 'auth/login', array(
            'body' => wp_json_encode($body),
            'headers' => array('Content-Type' => 'application/json'),
            'timeout' => 30,
        ));

        if (is_wp_error($response)) {
            return array('ok' => false, 'code' => 0, 'message' => $response->get_error_message(), 'body' => null, 'token' => '', 'session_id' => '', 'role' => '');
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $decoded = json_decode(wp_remote_retrieve_body($response), true);

        $ok = ($code === 200 && is_array($decoded) && !empty($decoded['success']) && !empty($decoded['data']['accessToken']));

        return array(
            'ok' => $ok,
            'code' => $code,
            'message' => (is_array($decoded) && isset($decoded['message'])) ? $decoded['message'] : '',
            'body' => is_array($decoded) ? $decoded : null,
            'token' => $ok ? $decoded['data']['accessToken'] : '',
            'session_id' => ($ok && isset($decoded['data']['session_id'])) ? $decoded['data']['session_id'] : '',
            'role' => ($ok && isset($decoded['data']['user']['role'])) ? $decoded['data']['user']['role'] : 'unknown',
        );
    }

    /* ---------------------------------------------------------------------
     * Account
     * ------------------------------------------------------------------ */

    /**
     * Reseller account info (wallet balance, role, verification state).
     *
     * Cached briefly because the admin pages render it on every load.
     */
    public function getAccountInfo($use_cache = true) {
        $cache_key = 'strongesim_account_info';

        if ($use_cache) {
            $cached = get_transient($cache_key);
            if (is_array($cached)) {
                return $cached;
            }
        }

        $result = $this->request('GET', 'users/me');

        if (!$result || empty($result['success']) || empty($result['data'])) {
            if ($this->last_error === '') {
                $this->last_error = 'The platform did not return an account profile for these credentials.';
            }
            return false;
        }

        $data = $result['data'];
        $account_info = array(
            'id' => isset($data['id']) ? $data['id'] : null,
            'email' => isset($data['email']) ? $data['email'] : null,
            'role' => isset($data['role']) ? $data['role'] : null,
            'verified_at' => isset($data['verified_at']) ? $data['verified_at'] : null,
            'balance' => isset($data['credit']['balance']) ? $data['credit']['balance'] : 0,
            'currency' => isset($data['credit']['currency']) ? $data['credit']['currency'] : 'USD',
            'soft_limit_threshold' => isset($data['credit']['soft_limit_threshold']) ? $data['credit']['soft_limit_threshold'] : null,
            'profile_complete' => isset($data['profile_complete']) ? $data['profile_complete'] : false,
        );

        set_transient($cache_key, $account_info, 2 * MINUTE_IN_SECONDS);

        return $account_info;
    }
}
