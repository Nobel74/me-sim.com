<?php
/**
 * Plugin Name: StrongEsim WooCommerce Integration
 * Description: Integrates StrongEsim APIs with WooCommerce
 * Version: 0.2.1
 * Author: Fuat Shakjiri
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
} 

ini_set('memory_limit', '512M');
ini_set('max_execution_time', 3000);

require_once plugin_dir_path(__FILE__) . 'includes/Utils/Logger.php';
require_once plugin_dir_path(__FILE__) . 'includes/Api/StrongESIM_API.php';
require_once plugin_dir_path(__FILE__) . 'includes/SettingsHandler.php';
require_once plugin_dir_path(__FILE__) . 'includes/WebhookHandler.php';
require_once plugin_dir_path(__FILE__) . 'includes/ProductSyncManager.php';
require_once plugin_dir_path(__FILE__) . 'includes/OrderHandler.php';
require_once plugin_dir_path(__FILE__) . 'includes/AdminPageHandler.php';
require_once plugin_dir_path(__FILE__) . 'includes/ProductAdminHandler.php';

class ESIMWooCommerceIntegration {
    private $settings;
    private $webhookHandler;
    private $productSyncManager;
    private $orderHandler;
    private $adminPageHandler;
    private $productAdminPageHandler;

    public function __construct() {
        $this->settings = new SettingsHandler();
        $this->productSyncManager = new ProductSyncManager($this->settings);
        $this->orderHandler = new OrderHandler($this->settings, $this->productSyncManager);
        $this->webhookHandler = new WebhookHandler($this->settings, $this->orderHandler);
        $this->adminPageHandler = new AdminPageHandler($this->settings, $this->productSyncManager);
        $this->productAdminPageHandler = new ProductAdminHandler();

        add_action('admin_init', array($this->settings, 'register_settings'));
        add_action('admin_menu', array($this->adminPageHandler, 'add_admin_menu'));
        add_action('init', array($this->webhookHandler, 'register_webhook_handler'));
        add_action('woocommerce_loaded', array($this, 'init'));
        add_action('wp_ajax_send_esim_sms', array($this, 'ajax_send_esim_sms'));
        add_action('woocommerce_account_dashboard', array($this, 'display_esim_qr_codes_on_account'));
        add_action('wp_enqueue_scripts', 'esim_enqueue_account_styles');
        
        // Add scheduled event for QR code queries
        add_action('esim_query_qr_code', array($this->orderHandler, 'scheduled_qr_code_query'), 10, 3);
        
        // Add AJAX handlers for product deletion
        add_action('wp_ajax_delete_all_synced_products', array($this, 'ajax_delete_all_synced_products'));

        // Add AJAX handler for sync products (with better timeout handling)
        add_action('wp_ajax_esim_sync_products', array($this, 'ajax_sync_products'));

        // Add AJAX handlers for resume and status
        add_action('wp_ajax_esim_resume_sync', array($this, 'ajax_resume_sync'));
        add_action('wp_ajax_esim_get_sync_status', array($this, 'ajax_get_sync_status'));
        add_action('wp_ajax_esim_clear_sync_progress', array($this, 'ajax_clear_sync_progress'));

        // Add AJAX handler for saving auto image upload setting
        add_action('wp_ajax_esim_save_auto_image_setting', array($this, 'ajax_save_auto_image_setting'));
    }

    public function ajax_delete_all_synced_products() {
        check_ajax_referer('delete_all_synced_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        try {
            $count = $this->productSyncManager->deleteAllSyncedProducts();
            wp_send_json_success(array('message' => "Successfully deleted {$count} products."));
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }

    public function ajax_sync_products() {
        check_ajax_referer('esim_sync_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        // Increase limits for long-running sync
        @set_time_limit(3600); // 1 hour
        @ini_set('memory_limit', '512M');

        // Close session to allow other requests
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        $specific_package_code = isset($_POST['package_code']) ? sanitize_text_field($_POST['package_code']) : null;

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
            } else {
                wp_send_json_success(array(
                    'message' => 'Sync completed successfully',
                    'time' => $sync_time,
                    'results' => $sync_results
                ));
            }
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => 'Exception: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'can_resume' => $this->productSyncManager->canResume()
            ));
        }
    }

    public function ajax_resume_sync() {
        check_ajax_referer('esim_sync_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        // Increase limits for long-running sync
        @set_time_limit(3600); // 1 hour
        @ini_set('memory_limit', '512M');

        // Close session to allow other requests
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

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
            } else {
                wp_send_json_success(array(
                    'message' => 'Sync resumed and completed successfully',
                    'time' => $sync_time,
                    'results' => $sync_results
                ));
            }
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => 'Exception: ' . $e->getMessage(),
                'can_resume' => $this->productSyncManager->canResume()
            ));
        }
    }

    public function ajax_get_sync_status() {
        check_ajax_referer('esim_sync_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        $status = $this->productSyncManager->getSyncStatus();
        $progress = $this->productSyncManager->getSyncProgress();
        $can_resume = $this->productSyncManager->canResume();

        wp_send_json_success(array(
            'status' => $status,
            'progress' => $progress,
            'can_resume' => $can_resume
        ));
    }

    public function ajax_clear_sync_progress() {
        check_ajax_referer('esim_sync_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        $this->productSyncManager->clearSyncProgress();
        wp_send_json_success(array('message' => 'Sync progress cleared'));
    }

    public function ajax_save_auto_image_setting() {
        check_ajax_referer('esim_sync_products', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permission denied');
        }

        $enabled = isset($_POST['enabled']) ? sanitize_text_field($_POST['enabled']) : 'no';
        update_option('esim_auto_image_upload', $enabled);

        wp_send_json_success(array('message' => 'Auto image upload setting saved', 'enabled' => $enabled));
    }

    public function init() {
        $this->orderHandler->init_hooks();
    }

    public function ajax_send_esim_sms() {
        check_ajax_referer('wp_rest', '_wpnonce');
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
        $message = isset($_POST['message']) ? sanitize_textarea_field($_POST['message']) : '';

        if ($order_id && $message) {
            $result = $this->orderHandler->send_sms($order_id, $message);
            wp_send_json_success($result);
        } else {
            wp_send_json_error('Invalid order ID or message');
        }
        wp_die();
    }

    public function display_esim_qr_codes_on_account() {
        $user_id = get_current_user_id();
        $qr_codes = $this->orderHandler->get_user_qr_codes($user_id);

        if (!empty($qr_codes)) {
            echo '<h2>Your eSIM QR Codes</h2>';
            echo '<div class="esim-qr-codes">';
            foreach ($qr_codes as $qr_code) {
                echo '<div class="esim-qr-code">';
                echo '<h3>Order #' . $qr_code['order_id'] . '</h3>';
                echo '<img src="' . esc_url($qr_code['qr_code_url']) . '" alt="eSIM QR Code" style="max-width:200px;" />';
                echo '</div>';
            }
            echo '</div>';
        }
    }
}

// Move this function outside of the class
function esim_enqueue_account_styles() {
    if (is_account_page()) {
        wp_enqueue_style('esim-account-styles', plugins_url('css/esim-account-styles.css', __FILE__));
    }
}

new ESIMWooCommerceIntegration();