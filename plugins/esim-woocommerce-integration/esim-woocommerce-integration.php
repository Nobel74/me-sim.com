<?php
/**
 * Plugin Name: StrongEsim WooCommerce Integration
 * Plugin URI: https://strongesim.com/
 * Description: Integrates StrongEsim APIs with WooCommerce to automatically sync eSIM products, manage orders, and deliver eSIM QR codes to customers.
 * Version: 0.3.2
 * Author: Fuat Shakjiri
 * Author URI: https://strongesim.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: esim-woocommerce-integration
 * Domain Path: /languages
 * Requires at least: 6.5
 * Tested up to: 7.1
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * WC requires at least: 8.2
 * WC tested up to: 11.1
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('ESIM_WC_VERSION', '0.3.2');
define('ESIM_WC_PLUGIN_FILE', __FILE__);
define('ESIM_WC_PLUGIN_DIR', plugin_dir_path(__FILE__));

/**
 * Tell WooCommerce which of its opt-in features this plugin supports.
 *
 * Without the custom_order_tables declaration WooCommerce lists the plugin as
 * incompatible with High-Performance Order Storage and blocks stores from
 * enabling it, so this has to run on before_woocommerce_init.
 */
add_action('before_woocommerce_init', function () {
    if (!class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        return;
    }
    \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', ESIM_WC_PLUGIN_FILE, true);
    \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', ESIM_WC_PLUGIN_FILE, true);
    \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('product_block_editor', ESIM_WC_PLUGIN_FILE, true);
});

/**
 * Boot the plugin once WooCommerce is known to be loaded.
 *
 * The previous version instantiated everything at file scope and hung order
 * processing off woocommerce_loaded, which never fires if this plugin happens
 * to load after WooCommerce. plugins_loaded is safe in both orders.
 */
add_action('plugins_loaded', 'esim_wc_bootstrap', 20);

function esim_wc_bootstrap() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'esim_wc_missing_woocommerce_notice');
        return;
    }

    require_once ESIM_WC_PLUGIN_DIR . 'includes/Utils/Logger.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/Utils/OrderStore.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/Api/StrongESIM_API.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/SettingsHandler.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/WebhookHandler.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/ProductSyncManager.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/OrderHandler.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/AdminPageHandler.php';
    require_once ESIM_WC_PLUGIN_DIR . 'includes/ProductAdminHandler.php';

    ESIMWooCommerceIntegration::instance();
}

function esim_wc_missing_woocommerce_notice() {
    if (!current_user_can('activate_plugins')) {
        return;
    }
    echo '<div class="notice notice-error"><p>'
        . esc_html__('StrongEsim WooCommerce Integration requires WooCommerce to be installed and active.', 'esim-woocommerce-integration')
        . '</p></div>';
}

class ESIMWooCommerceIntegration {
    private static $instance = null;

    private $settings;
    private $webhookHandler;
    private $productSyncManager;
    private $orderHandler;
    private $adminPageHandler;
    private $productAdminPageHandler;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->settings = new SettingsHandler();
        $this->productSyncManager = new ProductSyncManager($this->settings);
        $this->orderHandler = new OrderHandler($this->settings, $this->productSyncManager);
        $this->webhookHandler = new WebhookHandler($this->settings, $this->orderHandler);
        $this->adminPageHandler = new AdminPageHandler($this->settings, $this->productSyncManager);
        $this->productAdminPageHandler = new ProductAdminHandler();

        add_action('admin_init', array($this->settings, 'register_settings'));
        add_action('admin_menu', array($this->adminPageHandler, 'add_admin_menu'));
        add_action('add_meta_boxes', array($this->adminPageHandler, 'add_order_meta_box'), 10, 2);
        add_action('rest_api_init', array($this->webhookHandler, 'register_routes'));

        // Order fulfilment. Registered directly rather than on woocommerce_loaded,
        // which may already have fired by the time this plugin loads.
        $this->orderHandler->init_hooks();

        add_action('woocommerce_account_dashboard', array($this, 'display_esim_qr_codes_on_account'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_account_styles'));

        // Scheduled QR code polling.
        add_action('esim_query_qr_code', array($this->orderHandler, 'scheduled_qr_code_query'), 10, 3);

        // Admin AJAX.
        add_action('wp_ajax_delete_all_synced_products', array($this, 'ajax_delete_all_synced_products'));
        add_action('wp_ajax_esim_sync_products', array($this, 'ajax_sync_products'));
        add_action('wp_ajax_esim_resume_sync', array($this, 'ajax_resume_sync'));
        add_action('wp_ajax_esim_get_sync_status', array($this, 'ajax_get_sync_status'));
        add_action('wp_ajax_esim_clear_sync_progress', array($this, 'ajax_clear_sync_progress'));
        add_action('wp_ajax_esim_save_auto_image_setting', array($this, 'ajax_save_auto_image_setting'));
        add_action('wp_ajax_esim_send_sms', array($this, 'ajax_send_esim_sms'));
        add_action('wp_ajax_esim_test_connection', array($this, 'ajax_test_connection'));
    }

    /**
     * Shared guard for every admin AJAX entry point.
     */
    private function verify_admin_ajax($action, $nonce_field = 'nonce') {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'), 403);
        }
        if (!check_ajax_referer($action, $nonce_field, false)) {
            wp_send_json_error(array('message' => 'Security check failed. Reload the page and try again.'), 403);
        }
    }

    /**
     * Raise limits for long-running sync requests.
     *
     * display_errors is turned off as well: a PHP notice printed into the
     * response body corrupts the JSON, which the browser reports as a bare
     * "connection error" with no explanation.
     */
    private function prepare_long_request() {
        @set_time_limit(3600);
        @ini_set('memory_limit', '512M');
        @ini_set('display_errors', '0');

        if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

    public function ajax_delete_all_synced_products() {
        $this->verify_admin_ajax('delete_all_synced_products');
        $this->prepare_long_request();

        try {
            $count = $this->productSyncManager->deleteAllSyncedProducts();
            wp_send_json_success(array('message' => "Successfully deleted {$count} products."));
        } catch (\Throwable $e) {
            wp_send_json_error(array('message' => $e->getMessage()));
        }
    }

    public function ajax_sync_products() {
        $this->verify_admin_ajax('esim_sync_products');
        $this->prepare_long_request();

        $specific_package_code = isset($_POST['package_code']) ? sanitize_text_field(wp_unslash($_POST['package_code'])) : null;
        if ($specific_package_code === 'null' || $specific_package_code === '') {
            $specific_package_code = null;
        }

        try {
            $sync_start = microtime(true);
            $sync_results = $this->productSyncManager->sync_products($specific_package_code);
            $sync_time = round(microtime(true) - $sync_start, 2);

            if (isset($sync_results['error'])) {
                wp_send_json_error(array(
                    'message' => $sync_results['error'],
                    'time' => $sync_time,
                    'can_resume' => $this->productSyncManager->canResume()
                ));
            }

            wp_send_json_success(array(
                'message' => 'Sync completed successfully',
                'time' => $sync_time,
                'results' => $sync_results
            ));
        } catch (\Throwable $e) {
            wp_send_json_error(array(
                'message' => 'Exception: ' . $e->getMessage(),
                'can_resume' => $this->productSyncManager->canResume()
            ));
        }
    }

    public function ajax_resume_sync() {
        $this->verify_admin_ajax('esim_sync_products');
        $this->prepare_long_request();

        try {
            if (!$this->productSyncManager->canResume()) {
                wp_send_json_error(array('message' => 'No sync to resume. Start a fresh sync instead.'));
            }

            $sync_start = microtime(true);
            $sync_results = $this->productSyncManager->resumeSync();
            $sync_time = round(microtime(true) - $sync_start, 2);

            if (isset($sync_results['error'])) {
                wp_send_json_error(array(
                    'message' => $sync_results['error'],
                    'time' => $sync_time,
                    'can_resume' => $this->productSyncManager->canResume()
                ));
            }

            wp_send_json_success(array(
                'message' => 'Sync resumed and completed successfully',
                'time' => $sync_time,
                'results' => $sync_results
            ));
        } catch (\Throwable $e) {
            wp_send_json_error(array(
                'message' => 'Exception: ' . $e->getMessage(),
                'can_resume' => $this->productSyncManager->canResume()
            ));
        }
    }

    public function ajax_get_sync_status() {
        $this->verify_admin_ajax('esim_sync_products');

        wp_send_json_success(array(
            'status' => $this->productSyncManager->getSyncStatus(),
            'progress' => $this->productSyncManager->getSyncProgress(),
            'can_resume' => $this->productSyncManager->canResume()
        ));
    }

    public function ajax_clear_sync_progress() {
        $this->verify_admin_ajax('esim_sync_products');

        $this->productSyncManager->clearSyncProgress();
        wp_send_json_success(array('message' => 'Sync progress cleared'));
    }

    public function ajax_save_auto_image_setting() {
        $this->verify_admin_ajax('esim_sync_products');

        $enabled = (isset($_POST['enabled']) && $_POST['enabled'] === 'yes') ? 'yes' : 'no';
        update_option('esim_auto_image_upload', $enabled);

        wp_send_json_success(array('message' => 'Auto image upload setting saved', 'enabled' => $enabled));
    }

    /**
     * Step-by-step API connection test for the settings page.
     */
    public function ajax_test_connection() {
        $this->verify_admin_ajax('esim_test_connection');

        @set_time_limit(120);
        // The test opens raw sockets on purpose; a PHP notice printed into the
        // body would corrupt the JSON this endpoint returns.
        @ini_set('display_errors', '0');

        $steps = $this->adminPageHandler->get_api_client()->diagnose();

        // Escape here: every value is rendered as HTML by the settings page.
        $safe = array();
        foreach ($steps as $step) {
            $safe[] = array(
                'label' => esc_html($step['label']),
                'ok' => (bool) $step['ok'],
                'detail' => esc_html($step['detail']),
            );
        }

        wp_send_json_success(array('steps' => $safe));
    }

    /**
     * Send an SMS to an order's eSIM profile from the order screen.
     *
     * The old handler checked a "wp_rest" nonce that the button never sent, so
     * it always failed with -1.
     */
    public function ajax_send_esim_sms() {
        $this->verify_admin_ajax('esim_send_sms');

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $message = isset($_POST['message']) ? sanitize_textarea_field(wp_unslash($_POST['message'])) : '';

        if (!$order_id || $message === '') {
            wp_send_json_error(array('message' => 'An order and a message are both required.'));
        }

        $result = $this->orderHandler->send_sms($order_id, $message);

        if (!empty($result['success'])) {
            wp_send_json_success(array('message' => $result['message']));
        }

        wp_send_json_error(array('message' => $result['message']));
    }

    /**
     * Customer-facing QR codes on the My Account dashboard.
     */
    public function display_esim_qr_codes_on_account() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return;
        }

        $qr_codes = $this->orderHandler->get_user_qr_codes($user_id);
        if (empty($qr_codes)) {
            return;
        }

        echo '<h2>' . esc_html__('Your eSIM QR Codes', 'esim-woocommerce-integration') . '</h2>';
        echo '<div class="esim-qr-codes">';
        foreach ($qr_codes as $qr_code) {
            echo '<div class="esim-qr-code">';
            echo '<h3>' . sprintf(
                /* translators: %s: order number */
                esc_html__('Order %s', 'esim-woocommerce-integration'),
                esc_html($qr_code['order_number'])
            ) . '</h3>';
            echo '<img src="' . esc_url($qr_code['qr_code_url']) . '" alt="' . esc_attr__('eSIM QR Code', 'esim-woocommerce-integration') . '" style="max-width:200px;" />';
            if (!empty($qr_code['activation_code'])) {
                echo '<p class="esim-activation-code"><strong>' . esc_html__('Activation code:', 'esim-woocommerce-integration') . '</strong> <code>' . esc_html($qr_code['activation_code']) . '</code></p>';
            }
            echo '</div>';
        }
        echo '</div>';
    }

    public function enqueue_account_styles() {
        if (function_exists('is_account_page') && is_account_page()) {
            wp_enqueue_style(
                'esim-account-styles',
                plugins_url('css/esim-account-styles.css', ESIM_WC_PLUGIN_FILE),
                array(),
                ESIM_WC_VERSION
            );
        }
    }
}
