<?php
class AdminPageHandler
{
    private $settings;
    private $productSyncManager;

    public function __construct($settings, $productSyncManager)
    {
         $this->settings = $settings;
        $this->productSyncManager = $productSyncManager;

        add_action('admin_post_register_esim_webhook', array($this, 'register_webhook'));
        add_filter('plugin_action_links_esim-woocommerce-integration/esim-woocommerce-integration.php', array($this, 'add_plugin_action_links'));
    }

    public function add_plugin_action_links($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=esim-api-settings') . '">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    private function getLogoUrl() {
        return plugins_url('esim-woocommerce-integration/assets/logo/strongesim-logo.webp');
    }

    private function getAccountInfo() {
        $api_client = new \StrongESIM_API(
            $this->settings->get_option('esim_api_email'),
            $this->settings->get_option('esim_api_password'),
            new \ESIMWooCommerce\Utils\Logger()
        );
        $account_info = $api_client->getAccountInfo();

        // Return empty array if API fails
        if (!$account_info) {
            return array('error' => 'Unable to fetch account info');
        }

        return $account_info;
    }

    private function getTotalPlansCount() {
        $api_client = new \StrongESIM_API(
            $this->settings->get_option('esim_api_email'),
            $this->settings->get_option('esim_api_password'),
            new \ESIMWooCommerce\Utils\Logger()
        );
        return $api_client->getTotalPlansCount();
    }

    private function renderHeader() {
        $account_info = $this->getAccountInfo();
        $logo_url = $this->getLogoUrl();
        ?>
        <style>
            :root {
                --strongesim-bg-primary: #fff;
                --strongesim-bg-secondary: #f8f9fa;
                --strongesim-text-primary: #333;
                --strongesim-text-secondary: #666;
                --strongesim-text-tertiary: #999;
                --strongesim-border: #ddd;
                --strongesim-border-light: #f0f0f0;
                --strongesim-bg-third: #2d2d2d;
            }

            body.strongesim-dark-mode {
                --strongesim-bg-primary: #121212;
                --strongesim-bg-secondary: #1e1e1e;
                --strongesim-text-primary: #f0f0f0;
                --strongesim-text-secondary: #b3b3b3;
                --strongesim-text-tertiary: #888888;
                --strongesim-border: #404040;
                --strongesim-border-light: #2a2a2a;
                --strongesim-bg-third: #1e1e1e;
            }

            .esim-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: #2d2d2d !important;
                border-bottom: 1px solid #404040 !important;
                border-radius: 5px;
                margin-bottom: 20px;
                color: #f0f0f0 !important;
            }
            .esim-header h2,
            .esim-header .esim-account-info-label,
            .esim-header .esim-account-info-value,
            .esim-header .esim-account-info-email {
                color: #f0f0f0 !important;
            }
            .esim-header-left {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
            }
            .esim-header-logo {
                max-height: 50px;
                width: auto;
            }
            .esim-header-title {
                margin: 0;
                color: var(--strongesim-text-primary);
            }
            .esim-header-middle {
                display: flex;
                align-items: center;
                gap: 20px;
                flex: 1;
                justify-content: center;
            }
            .esim-mode-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                background: var(--strongesim-bg-primary);
                border: 1px solid var(--strongesim-border);
                border-radius: 20px;
                padding: 5px 10px;
            }
            .esim-mode-toggle input {
                display: none;
            }
            .esim-mode-toggle label {
                cursor: pointer;
                margin: 0;
                font-size: 14px;
                user-select: none;
            }
            .esim-mode-toggle-slider {
                display: inline-block;
                width: 40px;
                height: 20px;
                background: #ccc;
                border-radius: 10px;
                position: relative;
                transition: background 0.3s;
            }
            .esim-mode-toggle-slider::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: left 0.3s;
            }
            .esim-mode-toggle input:checked + label .esim-mode-toggle-slider {
                background: #2563eb;
            }
            .esim-mode-toggle input:checked + label .esim-mode-toggle-slider::after {
                left: 22px;
            }
            .esim-header-right {
                display: flex;
                gap: 40px;
                align-items: center;
                flex: 1;
                justify-content: flex-end;
            }
            .esim-account-info {
                text-align: right;
            }
            .esim-account-info-label {
                font-size: 11px;
                color: var(--strongesim-text-tertiary);
                text-transform: uppercase;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            .esim-account-info-value {
                font-size: 16px;
                font-weight: 700;
                color: var(--strongesim-text-primary);
                margin-top: 4px;
            }
            .esim-account-info-email {
                font-size: 13px;
                color: var(--strongesim-text-secondary);
                margin-top: 3px;
            }
            .esim-status-badge {
                display: inline-block;
                padding: 3px 8px;
                background: #d4edda;
                color: #155724;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 600;
            }
            .esim-status-badge.verified {
                background: #d4edda;
                color: #155724;
            }
            .esim-status-badge.pending {
                background: #fff3cd;
                color: #856404;
            }

            /* Dark mode comprehensive styling */
            body.strongesim-dark-mode {
                background-color: var(--strongesim-bg-primary) !important;
                color: var(--strongesim-text-primary) !important;
            }

            body.strongesim-dark-mode .wrap,
            body.strongesim-dark-mode .strongesim-admin-page,
            body.strongesim-dark-mode .strongesim-page-content {
                background-color: var(--strongesim-bg-primary) !important;
                color: var(--strongesim-text-primary) !important;
            }

            body.strongesim-dark-mode .esim-settings-section,
            body.strongesim-dark-mode .esim-sync-container {
                background: var(--strongesim-bg-secondary) !important;
                border-color: var(--strongesim-border) !important;
                color: var(--strongesim-text-primary) !important;
            }

            body.strongesim-dark-mode .esim-settings-section h3,
            body.strongesim-dark-mode .esim-sync-container h3,
            body.strongesim-dark-mode .esim-sync-container h2,
            body.strongesim-dark-mode h2,
            body.strongesim-dark-mode h3,
            body.strongesim-dark-mode h4 {
                color: var(--strongesim-text-primary) !important;
                border-color: var(--strongesim-border-light) !important;
            }

            body.strongesim-dark-mode .form-table {
                border-collapse: collapse;
            }

            body.strongesim-dark-mode .form-table th,
            body.strongesim-dark-mode .form-table td {
                color: var(--strongesim-text-primary) !important;
                border-color: var(--strongesim-border) !important;
                background-color: transparent !important;
            }

            body.strongesim-dark-mode .form-table input[type="email"],
            body.strongesim-dark-mode .form-table input[type="password"],
            body.strongesim-dark-mode .form-table input[type="text"],
            body.strongesim-dark-mode .form-table input[type="number"],
            body.strongesim-dark-mode .form-table textarea,
            body.strongesim-dark-mode .form-table select {
                background-color: var(--strongesim-bg-primary) !important;
                color: var(--strongesim-text-primary) !important;
                border-color: var(--strongesim-border) !important;
            }

            body.strongesim-dark-mode .form-table input::placeholder,
            body.strongesim-dark-mode .form-table textarea::placeholder {
                color: var(--strongesim-text-tertiary) !important;
            }

            body.strongesim-dark-mode .description,
            body.strongesim-dark-mode p {
                color: var(--strongesim-text-secondary) !important;
            }

            body.strongesim-dark-mode .regular-text,
            body.strongesim-dark-mode .small-text {
                color: var(--strongesim-text-primary) !important;
            }

            body.strongesim-dark-mode label {
                color: var(--strongesim-text-primary) !important;
            }

            body.strongesim-dark-mode .button,
            body.strongesim-dark-mode .button-primary,
            body.strongesim-dark-mode .button-secondary {
                background-color: #2563eb !important;
                color: #ffffff !important;
                border-color: #1d4ed8 !important;
            }

            body.strongesim-dark-mode .button:hover,
            body.strongesim-dark-mode .button-primary:hover,
            body.strongesim-dark-mode .button-secondary:hover {
                background-color: #1d4ed8 !important;
                border-color: #1e40af !important;
            }

            /* Delete button styling - red in all modes */
            #delete-all-products {
                background-color: #dc3545 !important;
                color: #fff !important;
                border: 1px solid #c82333 !important;
                padding: 8px 16px !important;
            }

            #delete-all-products:hover {
                background-color: #c82333 !important;
                border-color: #bd2130 !important;
            }

            body.strongesim-dark-mode #delete-all-products {
                background-color: #dc3545 !important;
                color: #fff !important;
                border-color: #c82333 !important;
            }

            body.strongesim-dark-mode #delete-all-products:hover {
                background-color: #c82333 !important;
                border-color: #bd2130 !important;
            }

            body.strongesim-dark-mode .esim-sync-info-bar {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
                color: #ffffff !important;
            }
        </style>
        <div class="esim-header">
            <div class="esim-header-left">
                <img src="<?php echo esc_url($logo_url); ?>" alt="StrongESIM" class="esim-header-logo">
                <h2 class="esim-header-title"><?php echo isset($_GET['page']) && $_GET['page'] === 'sync-esim-products' ? 'Product Sync' : 'API Settings'; ?></h2>
            </div>
            <div class="esim-header-middle">
                <div class="esim-mode-toggle">
                    <span>☀️</span>
                    <input type="checkbox" id="strongesim-dark-mode-toggle">
                    <label for="strongesim-dark-mode-toggle">
                        <span class="esim-mode-toggle-slider"></span>
                    </label>
                    <span>🌙</span>
                </div>
            </div>
            <div class="esim-header-right">
                <?php if ($account_info && !isset($account_info['error'])) { ?>
                    <div class="esim-account-info">
                        <div class="esim-account-info-label">Account Email</div>
                        <div class="esim-account-info-email"><?php echo isset($account_info['email']) ? esc_html($account_info['email']) : 'N/A'; ?></div>
                        <div style="margin-top: 6px;">
                            <?php if (isset($account_info['verified_at'])) { ?>
                                <span class="esim-status-badge verified">✓ Verified</span>
                            <?php } else { ?>
                                <span class="esim-status-badge pending">Pending</span>
                            <?php } ?>
                        </div>
                    </div>
                    <div class="esim-account-info">
                        <div class="esim-account-info-label">Account Balance</div>
                        <div class="esim-account-info-value"><?php echo isset($account_info['balance']) ? '$' . number_format($account_info['balance'], 2) : 'N/A'; ?></div>
                        <div class="esim-account-info-email"><?php echo isset($account_info['currency']) ? esc_html($account_info['currency']) : 'USD'; ?></div>
                    </div>
                    <div class="esim-account-info">
                        <div class="esim-account-info-label">Account Role</div>
                        <div class="esim-account-info-value"><?php echo isset($account_info['role']) ? ucfirst(esc_html($account_info['role'])) : 'N/A'; ?></div>
                        <div class="esim-account-info-email">StrongESIM Account</div>
                    </div>
                <?php } else { ?>
                    <div style="color: #dc3545; font-size: 13px;">
                        <p style="margin: 0;"><strong>⚠ Connection Failed</strong></p>
                        <p style="margin: 5px 0 0 0; font-size: 11px;">Check API credentials</p>
                    </div>
                <?php } ?>
            </div>
        </div>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const toggle = document.getElementById('strongesim-dark-mode-toggle');
            const mode = localStorage.getItem('strongesim-theme-mode') || 'light';

            if (mode === 'dark') {
                document.body.classList.add('strongesim-dark-mode');
                toggle.checked = true;
            }

            toggle.addEventListener('change', function() {
                if (this.checked) {
                    document.body.classList.add('strongesim-dark-mode');
                    localStorage.setItem('strongesim-theme-mode', 'dark');
                } else {
                    document.body.classList.remove('strongesim-dark-mode');
                    localStorage.setItem('strongesim-theme-mode', 'light');
                }
            });
        });
        </script>
        <?php
    }

    public function add_admin_menu()
    {
        add_options_page('StrongESIM API Settings', 'StrongESIM API', 'manage_options', 'esim-api-settings', array($this, 'settings_page'));
        add_submenu_page('edit.php?post_type=product', 'Sync StrongESIM Products', 'Sync StrongESIM Products', 'manage_options', 'sync-esim-products', array($this, 'sync_products_page'));
        add_meta_box('esim_order_details', 'eSIM Details', array($this, 'display_esim_order_details'), 'shop_order', 'normal', 'high');

    }

    public function register_webhook()
    {
        check_admin_referer('register_esim_webhook_action');

        $logger = new \ESIMWooCommerce\Utils\Logger();
        $webhook_url = get_site_url() . '/wp-json/esim/v1/webhook';

        // First, unregister old webhook if exists
        $old_webhook_id = get_option('esim_webhook_id');
        if ($old_webhook_id) {
            $logger->log('Unregistering existing webhook ID: ' . $old_webhook_id);
            $this->unregister_webhook_api();
        }

        $logger->log('Attempting to register webhook at: ' . $webhook_url);
        $response = $this->register_webhook_api($webhook_url);

        $logger->log('Webhook registration completed. Response: ' . json_encode($response));

        if ($response && isset($response['success']) && $response['success'] === true) {
            // Store webhook ID and secret
            update_option('esim_webhook_id', $response['data']['id']);
            update_option('esim_webhook_secret', $response['data']['secret']);

            $logger->log('Webhook registered successfully. ID: ' . $response['data']['id']);
            add_settings_error('esim_webhook', 'webhook_registered', 'Webhook registered successfully with StrongESIM API!', 'updated');
        } else {
            $error_message = isset($response['message']) ? $response['message'] : 'Unknown error occurred';
            $logger->log('Webhook registration failed: ' . $error_message);
            add_settings_error('esim_webhook', 'webhook_failed', 'Failed to register webhook: ' . $error_message, 'error');
        }

        wp_redirect(admin_url('options-general.php?page=esim-api-settings'));
        exit;
    }

    private function register_webhook_api($webhook_url)
    {
        $logger = new \ESIMWooCommerce\Utils\Logger();
        $api_client = new \StrongESIM_API(
            $this->settings->get_option('esim_api_email'),
            $this->settings->get_option('esim_api_password'),
            $logger
        );

        $response = $api_client->registerWebhook($webhook_url);

        // Log the response for debugging
        $logger->log('Webhook registration response: ' . json_encode($response));

        return $response;
    }

    private function unregister_webhook_api()
    {
        $webhook_id = get_option('esim_webhook_id');
        if (!$webhook_id) {
            return false;
        }

        $api_client = new \StrongESIM_API(
            $this->settings->get_option('esim_api_email'),
            $this->settings->get_option('esim_api_password'),
            new \ESIMWooCommerce\Utils\Logger()
        );

        $response = $api_client->deleteWebhook($webhook_id);

        if ($response && isset($response['success']) && $response['success']) {
            delete_option('esim_webhook_id');
            delete_option('esim_webhook_secret');
            return true;
        }

        return false;
    }

    public function settings_page()
{
    ?>
    <style>
        /* WhatsApp Contact Button Styles */
        .esim-whatsapp-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background-color: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
            transition: all 0.3s ease;
            z-index: 999;
            font-size: 28px;
        }

        .esim-whatsapp-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(37, 211, 102, 0.6);
        }

        .esim-whatsapp-button:active {
            transform: scale(0.95);
        }

        /* WhatsApp Modal Styles */
        .esim-whatsapp-modal {
            display: none;
            position: fixed;
            z-index: 10001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.2s ease;
        }

        .esim-whatsapp-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .esim-whatsapp-modal-content {
            background: var(--strongesim-bg-primary);
            border-radius: 12px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        }

        .esim-whatsapp-modal-close {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: var(--strongesim-text-secondary);
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
        }

        .esim-whatsapp-modal-close:hover {
            color: var(--strongesim-text-primary);
        }

        .esim-whatsapp-header {
            text-align: center;
            margin-bottom: 25px;
            padding-top: 10px;
        }

        .esim-whatsapp-header-icon {
            width: 60px;
            height: 60px;
            background-color: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 15px;
        }

        .esim-whatsapp-header h3 {
            color: var(--strongesim-text-primary);
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
        }

        .esim-whatsapp-header p {
            color: var(--strongesim-text-secondary);
            font-size: 13px;
            margin: 0;
            line-height: 1.5;
        }

        .esim-whatsapp-reply-time {
            color: var(--strongesim-text-tertiary);
            font-size: 12px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--strongesim-border);
        }

        .esim-whatsapp-contact-card {
            background: var(--strongesim-bg-secondary);
            border: 1px solid var(--strongesim-border);
            border-radius: 8px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 20px;
        }

        .esim-whatsapp-contact-card:hover {
            background: var(--strongesim-bg-primary);
            border-color: #25D366;
            box-shadow: 0 2px 8px rgba(37, 211, 102, 0.2);
        }

        .esim-whatsapp-contact-icon {
            width: 50px;
            height: 50px;
            background-color: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }

        .esim-whatsapp-contact-info h4 {
            color: var(--strongesim-text-primary);
            font-size: 14px;
            font-weight: 600;
            margin: 0 0 4px 0;
        }

        .esim-whatsapp-contact-info p {
            color: var(--strongesim-text-secondary);
            font-size: 12px;
            margin: 0;
        }

        .esim-whatsapp-arrow {
            margin-left: auto;
            color: var(--strongesim-text-secondary);
            font-size: 20px;
        }

        body.strongesim-dark-mode .esim-whatsapp-button {
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
        }

        body.strongesim-dark-mode .esim-whatsapp-button:hover {
            box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5);
        }
    </style>

    <div class="wrap strongesim-admin-page">
        <?php $this->renderHeader(); ?>
        <div class="strongesim-page-content">
            <form method="post" action="options.php">
                <?php
                settings_fields('esim_api_settings');
                do_settings_sections('esim_api_settings');
                ?>

            <style>
                .esim-settings-section {
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 25px;
                    margin-bottom: 25px;
                }
                .esim-settings-section h3 {
                    margin-top: 0;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                    color: #333;
                    font-size: 16px;
                }
                .esim-settings-section p.description {
                    margin-top: 8px;
                    font-size: 12px;
                    color: #666;
                }
            </style>

            <!-- StrongESIM API Credentials Section -->
            <div class="esim-settings-section">
                <h3>StrongESIM API Credentials</h3>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">API Email</th>
                        <td>
                            <input type="email"
                                   name="esim_api_email"
                                   value="<?php echo esc_attr(get_option('esim_api_email')); ?>"
                                   class="regular-text" />
                            <p class="description">Your StrongESIM account email address used for API authentication</p>
                        </td>
                    </tr>

                    <tr valign="top">
                        <th scope="row">API Password</th>
                        <td>
                            <input type="password"
                                   name="esim_api_password"
                                   value="<?php echo esc_attr(get_option('esim_api_password')); ?>"
                                   class="regular-text" />
                            <p class="description">Your StrongESIM account password. Kept secure on your server.</p>
                        </td>
                    </tr>


                </table>
            </div>

            <!-- Pricing Settings Section -->
            <div class="esim-settings-section">
                <h3>Pricing Settings</h3>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Manual Exchange Rate</th>
                        <td>
                            <input type="text"
                                   name="esim_manual_exchange_rate"
                                   value="<?php echo esc_attr(get_option('esim_manual_exchange_rate')); ?>"
                                   class="regular-text" />
                            <p class="description">Optional: Set a fixed exchange rate from USD to your store's currency. Leave blank to use automatic rates.</p>
                        </td>
                    </tr>

                    <tr valign="top">
                        <th scope="row">Global Price Markup</th>
                        <td>
                            <input type="number"
                                   name="esim_price_increase_percentage"
                                   value="<?php echo esc_attr(get_option('esim_price_increase_percentage', 30)); ?>"
                                   min="0"
                                   step="1"
                                   class="small-text" />%
                            <p class="description">Default profit margin percentage applied to all products. Individual country groups can override this.</p>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Notifications Section -->
            <div class="esim-settings-section">
                <h3>Customer Notifications</h3>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">SMS Alerts</th>
                        <td>
                            <label>
                                <input type="checkbox"
                                       name="esim_sms_data_usage"
                                       value="yes"
                                       <?php checked('yes', get_option('esim_sms_data_usage')); ?> />
                                Send SMS when data is running low
                            </label>
                            <br><br>
                            <label>
                                <input type="checkbox"
                                       name="esim_sms_validity_usage"
                                       value="yes"
                                       <?php checked('yes', get_option('esim_sms_validity_usage')); ?> />
                                Send SMS when plan is about to expire
                            </label>
                            <p class="description">Keep customers informed about their eSIM status</p>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Country Group Markups Section -->
            <div class="esim-settings-section">
                <h3>Country Group Pricing</h3>
                <p style="color: #666; margin-bottom: 15px;">Set profit margins for different regions. These override the global price markup above.</p>
                <table class="form-table markup-settings">
                <tr valign="top">
                    <th scope="row">Group Y - Asia Pacific & Nordic</th>
                    <td>
                        <input type="number"
                               name="esim_markup_Y"
                               value="<?php echo esc_attr(get_option('esim_markup_Y', 150)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Australia, China mainland, Hong Kong, Indonesia, Japan, Macao, Malaysia, Singapore, South Korea, Thailand, Turkey, Ukraine, Romania, Poland, Norway, Finland</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group Z - Western Europe & US</th>
                    <td>
                        <input type="number"
                               name="esim_markup_Z"
                               value="<?php echo esc_attr(get_option('esim_markup_Z', 180)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Austria, France, Germany, Greece, Ireland, Italy, Portugal, Spain, Sweden, Switzerland, United States, Slovenia, Slovakia, United Kingdom, Netherlands, Luxembourg, Denmark, Estonia, Lithuania, Latvia, Croatia, Bulgaria, Czech Republic</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group A - Premium</th>
                    <td>
                        <input type="number"
                               name="esim_markup_A"
                               value="<?php echo esc_attr(get_option('esim_markup_A', 200)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Belgium, Europe (30+ areas)</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group B - Europe & Middle East</th>
                    <td>
                        <input type="number"
                               name="esim_markup_B"
                               value="<?php echo esc_attr(get_option('esim_markup_B', 220)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Algeria, Cyprus, Europe, Hungary, Georgia, Israel, Iceland, Malta, Kazakhstan, Uzbekistan, Liechtenstein, Morocco, Albania, Bosnia and Herzegovina, Central Asia, China (mainland HK Macao)</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group C - Special Regions</th>
                    <td>
                        <input type="number"
                               name="esim_markup_C"
                               value="<?php echo esc_attr(get_option('esim_markup_C', 250)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Aland Islands, Asia (7 areas), New Zealand, Pakistan, Philippines, Tunisia, Vietnam, Jordan, Australia & New Zealand, Armenia, Belarus, Faroe Islands</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group D - Americas & Mixed</th>
                    <td>
                        <input type="number"
                               name="esim_markup_D"
                               value="<?php echo esc_attr(get_option('esim_markup_D', 280)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Brazil, Cambodia, Egypt, Kuwait, Kyrgyzstan, Mexico, Montenegro, North America, Canada, Guam, Andorra, Azerbaijan, Bahrain, China mainland & Japan & South Korea, Gulf Region, Iraq, Laos</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group E - Global Mix</th>
                    <td>
                        <input type="number"
                               name="esim_markup_E"
                               value="<?php echo esc_attr(get_option('esim_markup_E', 300)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Bangladesh, Gibraltar, Guadeloupe, India, Isle of Man, Jersey, Puerto Rico, Russia, Saudi Arabia, Serbia, Sri Lanka, United Arab Emirates, Balkans (5+ areas), Colombia, Guernsey, Europe (40+ areas)</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group F - Regional Special</th>
                    <td>
                        <input type="number"
                               name="esim_markup_F"
                               value="<?php echo esc_attr(get_option('esim_markup_F', 320)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Argentina, Moldova, North Macedonia, Qatar, Reunion, South Africa, Tanzania, Asia (12 areas), Europe (40+ areas) & Morocco</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group G - Central & South America</th>
                    <td>
                        <input type="number"
                               name="esim_markup_G"
                               value="<?php echo esc_attr(get_option('esim_markup_G', 350)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Brunei, Uruguay, Paraguay, Panama, Nicaragua, Honduras, Costa Rica, Ecuador, Guatemala, Afghanistan, Asia (20 areas), Asia (20+ areas), Gabon, Global (120+ areas)</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group H - Global Mix Premium</th>
                    <td>
                        <input type="number"
                               name="esim_markup_H"
                               value="<?php echo esc_attr(get_option('esim_markup_H', 380)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Chile, Dominican Republic, Nigeria, Congo, Mozambique, Madagascar, Zambia, Bolivia, Peru, Oman, Uganda, Chad, Kosovo, Malawi, Kenya, El Salvador, Lebanon, Monaco, Africa (25+ areas), Anguilla, Antigua and Barbuda, Barbados, Caribbean (20+ areas), Cayman Islands, GCC (6 areas), Grenada</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group I - Global & Regional</th>
                    <td>
                        <input type="number"
                               name="esim_markup_I"
                               value="<?php echo esc_attr(get_option('esim_markup_I', 400)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Cote d'Ivoire, Cameroon, Mali, Botswana, Niger, Senegal, Eswatini, Central African Republic, Burkina Faso, Global (120+ areas), Bahamas, Dominica, Global (130+ areas), Global (138-144 areas)</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group J - Special Territories</th>
                    <td>
                        <input type="number"
                               name="esim_markup_J"
                               value="<?php echo esc_attr(get_option('esim_markup_J', 450)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Guinea-Bissau, Nepal, Seychelles, Belize, Bermuda</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group K - Special Region</th>
                    <td>
                        <input type="number"
                               name="esim_markup_K"
                               value="<?php echo esc_attr(get_option('esim_markup_K', 500)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Countries: Yemen, Sudan</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group L - Unassigned</th>
                    <td>
                        <input type="number"
                               name="esim_markup_L"
                               value="<?php echo esc_attr(get_option('esim_markup_L', 450)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Reserved for future assignments</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Group M - Catchall (Unassigned)</th>
                    <td>
                        <input type="number"
                               name="esim_markup_M"
                               value="<?php echo esc_attr(get_option('esim_markup_M', 500)); ?>"
                               min="0"
                               step="1"
                               class="small-text" />%
                        <p class="description">Any country or region not explicitly assigned to groups Y-L will use this markup percentage.</p>
                    </td>
                </tr>
            </table>
                </div>

            <!-- Submit Button -->
            <div style="margin: 30px 0;">
                <?php submit_button('Save Settings', 'primary'); ?>
            </div>
        </form>

        <!-- Webhook Settings Section -->
        <div class="esim-settings-section">
            <h3>Webhook Configuration</h3>
            <p style="color: #666; margin-bottom: 15px;">Register your webhook URL with the eSIM API to receive real-time notifications about orders and account changes.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <?php wp_nonce_field('register_esim_webhook_action'); ?>
                <input type="hidden" name="action" value="register_esim_webhook">
                <p>Webhook URL: <code><?php echo esc_html(get_site_url() . '/wp-json/esim/v1/webhook'); ?></code></p>
                <?php
                $webhook_id = get_option('esim_webhook_id');
                if ($webhook_id) {
                    echo '<p style="color: #28a745;"><strong>✓ Webhook Status:</strong> Active (ID: ' . esc_html($webhook_id) . ')</p>';
                } else {
                    echo '<p style="color: #666;"><strong>Webhook Status:</strong> Not registered</p>';
                }
                ?>
                <?php submit_button('Register Webhook', 'secondary'); ?>
            </form>
        </div>
        </div>
    </div>

    <style>
        .strongesim-admin-page {
            background: var(--strongesim-bg-primary);
            color: var(--strongesim-text-primary);
            padding: 20px;
            min-height: 100vh;
        }
        .strongesim-page-content {
            background: var(--strongesim-bg-primary);
            color: var(--strongesim-text-primary);
        }
        .markup-settings th {
            padding-left: 20px;
            color: var(--strongesim-text-primary);
        }
        .markup-settings .description {
            font-size: 12px;
            color: var(--strongesim-text-secondary);
            margin-top: 5px;
        }

        /* Additional global dark mode support */
        body.strongesim-dark-mode code {
            background-color: var(--strongesim-bg-secondary) !important;
            color: #8dd3f3 !important;
            padding: 2px 6px;
            border-radius: 3px;
        }

        body.strongesim-dark-mode .metabox-holder .postbox {
            background-color: var(--strongesim-bg-secondary) !important;
            border-color: var(--strongesim-border) !important;
            color: var(--strongesim-text-primary) !important;
        }

        body.strongesim-dark-mode .postbox h2,
        body.strongesim-dark-mode .postbox h3 {
            color: var(--strongesim-text-primary) !important;
        }

        body.strongesim-dark-mode .spinner {
            border-color: var(--strongesim-border) !important;
            border-right-color: #2563eb !important;
        }
    </style>

    <!-- WhatsApp Contact Button -->
    <div class="esim-whatsapp-button" id="esim-whatsapp-trigger" title="Need help? Chat with us">💬</div>

    <!-- WhatsApp Contact Modal -->
    <div id="esim-whatsapp-modal" class="esim-whatsapp-modal">
        <div class="esim-whatsapp-modal-content">
            <button class="esim-whatsapp-modal-close" id="esim-whatsapp-modal-close">&times;</button>

            <div class="esim-whatsapp-header">
                <div class="esim-whatsapp-header-icon">💬</div>
                <h3>Start a Conversation</h3>
                <p>Hi! Click one of our member below to chat on WhatsApp</p>
            </div>

            <div class="esim-whatsapp-contact-card" id="esim-whatsapp-contact-link">
                <div class="esim-whatsapp-contact-icon">💚</div>
                <div class="esim-whatsapp-contact-info">
                    <h4>Contact Support</h4>
                    <p>Our team typically replies in a few minutes</p>
                </div>
                <div class="esim-whatsapp-arrow">→</div>
            </div>

            <p class="esim-whatsapp-reply-time">The team typically replies in a few minutes.</p>
        </div>
    </div>

    <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
        const whatsappButton = document.getElementById('esim-whatsapp-trigger');
        const whatsappModal = document.getElementById('esim-whatsapp-modal');
        const whatsappCloseBtn = document.getElementById('esim-whatsapp-modal-close');
        const whatsappContactLink = document.getElementById('esim-whatsapp-contact-link');

        const whatsappUrl = 'https://api.whatsapp.com/send?phone=14382556657&text=Hello,%20I%20need%20help';

        // Open modal when clicking WhatsApp button
        if (whatsappButton) {
            whatsappButton.addEventListener('click', function() {
                whatsappModal.classList.add('active');
            });
        }

        // Close modal when clicking close button
        if (whatsappCloseBtn) {
            whatsappCloseBtn.addEventListener('click', function() {
                whatsappModal.classList.remove('active');
            });
        }

        // Open WhatsApp when clicking contact card
        if (whatsappContactLink) {
            whatsappContactLink.addEventListener('click', function() {
                window.open(whatsappUrl, '_blank');
            });
        }

        // Close modal when clicking outside of it
        window.addEventListener('click', function(event) {
            if (event.target === whatsappModal) {
                whatsappModal.classList.remove('active');
            }
        });
    });
    </script>
    <?php
}

    public function sync_products_page()
    {
        ?>
        <div class="wrap strongesim-admin-page">
            <?php $this->renderHeader(); ?>
            <div class="strongesim-page-content">
            <?php
if (isset($_POST['sync_esim_products'])) {
            check_admin_referer('sync_esim_products', 'sync_esim_products_nonce');
            $specific_package_code = isset($_POST['esim_package_code']) ? sanitize_text_field($_POST['esim_package_code']) : null;

            // Disable output buffering to show progress immediately
            while (ob_get_level()) {
                ob_end_flush();
            }

            // Set headers to prevent buffering
            header('Content-Type: text/html; charset=utf-8');
            header('Cache-Control: no-cache');
            header('X-Accel-Buffering: no'); // Disable nginx buffering

            echo '<div id="sync-progress" style="background: #f0f0f1; padding: 15px; margin: 10px 0; border-left: 4px solid #2271b1;">';
            echo '<p><strong>Sync in progress...</strong> Please wait, do not close this page.</p>';
            echo '<p>Check the log file at <code>wp-content/esim-plugin.log</code> for detailed progress.</p>';
            echo '<p id="sync-status">Starting sync...</p>';
            echo '</div>';
            flush();

            // Run the sync
            $sync_start = microtime(true);
            $sync_results = $this->productSyncManager->sync_products($specific_package_code);
            $sync_time = round(microtime(true) - $sync_start, 2);

            // Hide progress div and show results
            echo '<script>document.getElementById("sync-progress").style.display = "none";</script>';
            flush();

            if (isset($sync_results['error'])) {
                ?>
                    <div class="error">
                        <p><strong>Error:</strong> <?php echo esc_html($sync_results['error']); ?></p>
                        <p>Sync ran for <?php echo esc_html($sync_time); ?> seconds before failing.</p>
                        <p>Check <code>wp-content/esim-plugin.log</code> for details.</p>
                    </div>
                    <?php
} else {
                ?>
                    <div class="updated">
                        <p><strong>Sync completed successfully!</strong> (<?php echo esc_html($sync_time); ?> seconds)</p>
                    </div>
                    <h3>Sync Results:</h3>
                    <ul>
                        <li><strong>Created:</strong> <?php echo esc_html($sync_results['created']); ?></li>
                        <li><strong>Updated:</strong> <?php echo esc_html($sync_results['updated']); ?></li>
                        <li><strong>Skipped:</strong> <?php echo esc_html($sync_results['skipped'] ?? 0); ?> (unchanged)</li>
                        <li><strong>Deleted:</strong> <?php echo esc_html($sync_results['deleted'] ?? 0); ?></li>
                        <li><strong>Failed:</strong> <?php echo esc_html($sync_results['failed']); ?></li>
                    </ul>
                    <p><em>View detailed logs in <code>wp-content/esim-plugin.log</code></em></p>
                    <?php
}
        }
        ?>
            <style>
                .esim-sync-container {
                    background: var(--strongesim-bg-primary);
                    border: 1px solid var(--strongesim-border);
                    border-radius: 5px;
                    padding: 30px;
                    margin-top: 20px;
                    color: var(--strongesim-text-primary);
                }
                .esim-sync-container h2 {
                    color: var(--strongesim-text-primary);
                }
                .esim-sync-container p {
                    color: var(--strongesim-text-secondary);
                }
                .esim-sync-info-bar {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    padding: 20px;
                    border-radius: 5px;
                    margin-bottom: 30px;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                }
                .esim-sync-info-item {
                    text-align: center;
                }
                .esim-sync-info-value {
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 5px;
                }
                .esim-sync-info-label {
                    font-size: 12px;
                    opacity: 0.9;
                    text-transform: uppercase;
                }
                .esim-progress-bar {
                    width: 100%;
                    height: 30px;
                    background: #f0f0f0;
                    border-radius: 15px;
                    overflow: hidden;
                    margin: 20px 0;
                    display: none;
                }
                body.strongesim-dark-mode .esim-progress-bar {
                    background: #2a2a2a;
                }
                .esim-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #28a745, #20c997);
                    width: 0%;
                    transition: width 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-size: 12px;
                    font-weight: 600;
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                .esim-progress-fill.active {
                    background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #28a745 100%);
                    background-size: 1000px 100%;
                    animation: shimmer 2s infinite;
                }
                .esim-sync-controls {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .esim-sync-controls input {
                    flex: 1;
                    max-width: 300px;
                }
                .esim-sync-controls button {
                    margin: 0;
                }
                .esim-time-estimate {
                    background: #e7f3ff;
                    border-left: 4px solid #0066cc;
                    padding: 12px;
                    border-radius: 3px;
                    color: #004085;
                    font-size: 12px;
                    margin-bottom: 20px;
                }
                body.strongesim-dark-mode .esim-time-estimate {
                    background: #1e3a4a;
                    border-left-color: #2563eb;
                    color: #b8d8e8;
                }
                #sync-status-box {
                    background: #e7f3ff !important;
                    border: 1px solid #b3d9ff !important;
                    color: #004085 !important;
                }
                body.strongesim-dark-mode #sync-status-box {
                    background: #1e3a4a !important;
                    border: 1px solid #2563eb !important;
                    color: #b8d8e8 !important;
                }
                #sync-status-box h4,
                body.strongesim-dark-mode #sync-status-box h4 {
                    color: #004085;
                }
                body.strongesim-dark-mode #sync-status-box h4 {
                    color: #b8d8e8 !important;
                }
                #previous-sync-info {
                    color: #004085;
                }
                body.strongesim-dark-mode #previous-sync-info {
                    color: #b8d8e8 !important;
                }
                body.strongesim-dark-mode .error,
                body.strongesim-dark-mode .updated,
                body.strongesim-dark-mode .notice {
                    background-color: var(--strongesim-bg-secondary) !important;
                    border-color: var(--strongesim-border) !important;
                    color: var(--strongesim-text-primary) !important;
                }
            </style>
            <div class="esim-sync-container">
                <h2 style="margin-top: 0;">Product Synchronization</h2>
                <p>Sync saves progress automatically and can be resumed if interrupted.</p>

                <?php
                    $total_plans = $this->getTotalPlansCount();
                    if ($total_plans && $total_plans !== false) {
                        $estimated_time = ceil($total_plans / 10) * 2; // Rough estimate: ~2 seconds per 10 products
                ?>
                <div class="esim-sync-info-bar">
                    <div class="esim-sync-info-item">
                        <div class="esim-sync-info-value"><?php echo esc_html($total_plans); ?></div>
                        <div class="esim-sync-info-label">Total Products</div>
                    </div>
                    <div class="esim-sync-info-item">
                        <div class="esim-sync-info-value">~<?php echo esc_html($estimated_time); ?>s</div>
                        <div class="esim-sync-info-label">Est. Time</div>
                    </div>
                    <div class="esim-sync-info-item">
                        <div class="esim-sync-info-value">Batch</div>
                        <div class="esim-sync-info-label">Processing</div>
                    </div>
                </div>
                <div class="esim-time-estimate">
                    ⏱️ Once started processing, it will process ~<?php echo esc_html($total_plans); ?> products in batches. This will take several minutes. Do not close this page or navigate away.
                </div>
                <?php } ?>

                <div id="sync-status-box" style="display:none; border-radius: 5px; padding: 20px; margin-bottom: 30px;">
                    <h4 style="margin-top: 0;">Previous Sync Status</h4>
                    <div id="previous-sync-info"></div>
                </div>

                <div class="esim-progress-bar">
                    <div class="esim-progress-fill" style="width: 0%;">0%</div>
                </div>

                <!-- Auto Image Upload Settings -->
                <style>
                    .esim-image-upload-section {
                        background: var(--strongesim-bg-secondary);
                        border: 1px solid var(--strongesim-border);
                        border-radius: 5px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }

                    /* Custom Checkbox Styling - Cross Browser Compatible */
                    .esim-checkbox-wrapper {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 8px;
                    }

                    .esim-checkbox-wrapper input[type="checkbox"] {
                        appearance: none;
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        width: 24px;
                        height: 24px;
                        min-width: 24px;
                        min-height: 24px;
                        border: 2px solid #2563eb;
                        border-radius: 4px;
                        background-color: var(--strongesim-bg-primary);
                        cursor: pointer;
                        position: relative;
                        transition: all 0.2s ease;
                        margin-top: 2px;
                    }

                    .esim-checkbox-wrapper input[type="checkbox"]:hover {
                        border-color: #1d4ed8;
                        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                    }

                    .esim-checkbox-wrapper input[type="checkbox"]:checked {
                        background-color: #2563eb;
                        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 11.94l6.72-6.72a.75.75 0 011.06 0z'/%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: center;
                        background-size: 14px;
                    }

                    .esim-checkbox-wrapper input[type="checkbox"]:checked:hover {
                        background-color: #1d4ed8;
                        box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
                    }

                    .esim-checkbox-wrapper input[type="checkbox"]:focus {
                        outline: none;
                        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
                    }

                    body.strongesim-dark-mode .esim-checkbox-wrapper input[type="checkbox"] {
                        background-color: var(--strongesim-bg-primary);
                        border-color: #2563eb;
                    }

                    body.strongesim-dark-mode .esim-checkbox-wrapper input[type="checkbox"]:checked {
                        background-color: #2563eb;
                    }

                    .esim-checkbox-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .esim-checkbox-label {
                        color: var(--strongesim-text-primary);
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        margin: 0;
                    }

                    .esim-info-icon {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 20px;
                        height: 20px;
                        background-color: #2563eb;
                        color: white;
                        border-radius: 50%;
                        font-size: 12px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }

                    .esim-info-icon:hover {
                        background-color: #1d4ed8;
                        transform: scale(1.1);
                    }

                    body.strongesim-dark-mode .esim-info-icon {
                        background-color: #2563eb;
                    }

                    body.strongesim-dark-mode .esim-info-icon:hover {
                        background-color: #1d4ed8;
                    }

                    .esim-description {
                        color: var(--strongesim-text-secondary);
                        font-size: 13px;
                        margin: 0 0 0 32px;
                        line-height: 1.5;
                    }

                    /* Modal Styles */
                    .esim-modal {
                        display: none;
                        position: fixed;
                        z-index: 10000;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        animation: fadeIn 0.2s ease;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    .esim-modal.active {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .esim-modal-content {
                        background: var(--strongesim-bg-primary);
                        border-radius: 8px;
                        padding: 30px;
                        max-width: 600px;
                        width: 90%;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                        animation: slideUp 0.3s ease;
                    }

                    @keyframes slideUp {
                        from {
                            transform: translateY(20px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }

                    .esim-modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--strongesim-border);
                    }

                    .esim-modal-title {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--strongesim-text-primary);
                        margin: 0;
                    }

                    .esim-modal-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: var(--strongesim-text-secondary);
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: color 0.2s ease;
                    }

                    .esim-modal-close:hover {
                        color: var(--strongesim-text-primary);
                    }

                    .esim-modal-body {
                        color: var(--strongesim-text-primary);
                    }

                    .esim-modal-body p {
                        margin: 0 0 12px 0;
                        font-size: 13px;
                        line-height: 1.6;
                    }

                    .esim-modal-body p:first-child {
                        font-weight: 600;
                        color: var(--strongesim-text-primary);
                        margin-bottom: 8px;
                    }

                    .esim-modal-body code {
                        background: var(--strongesim-bg-secondary);
                        color: #2563eb;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 12px;
                    }

                    body.strongesim-dark-mode .esim-modal-body code {
                        background: #2d2d2d;
                        color: #8dd3f3;
                    }

                    .esim-modal-body ul {
                        margin: 8px 0;
                        padding-left: 20px;
                        color: var(--strongesim-text-secondary);
                        font-size: 13px;
                    }

                    .esim-modal-body ul li {
                        margin-bottom: 6px;
                        line-height: 1.5;
                    }

                    .esim-modal-body ul li:last-child {
                        margin-bottom: 0;
                    }

                    .esim-modal-footer {
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid var(--strongesim-border);
                        text-align: right;
                    }

                    .esim-modal-footer button {
                        background-color: #2563eb;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                        transition: background-color 0.2s ease;
                    }

                    .esim-modal-footer button:hover {
                        background-color: #1d4ed8;
                    }
                </style>

                <div class="esim-image-upload-section">
                    <div class="esim-checkbox-wrapper">
                        <input type="checkbox"
                               id="esim-auto-image-upload"
                               name="esim_auto_image_upload"
                               value="yes"
                               <?php checked(get_option('esim_auto_image_upload', 'yes'), 'yes'); ?>>
                        <div class="esim-checkbox-header">
                            <label for="esim-auto-image-upload" class="esim-checkbox-label">
                                Auto Product Image Upload
                            </label>
                            <span class="esim-info-icon" id="esim-image-info-trigger" title="Click for more information">?</span>
                        </div>
                    </div>
                    <p class="esim-description">
                        If enabled, the system will match country or region names from your WordPress Media Library and automatically assign matching images to products.
                    </p>
                </div>

                <!-- Image Upload Info Modal -->
                <div id="esim-image-modal" class="esim-modal">
                    <div class="esim-modal-content">
                        <div class="esim-modal-header">
                            <h2 class="esim-modal-title">How Image Matching Works</h2>
                            <button class="esim-modal-close" id="esim-modal-close">&times;</button>
                        </div>
                        <div class="esim-modal-body">
                            <p>How Image Matching Works:</p>
                            <p>The system searches your WordPress Media Library for images matching the product's country or region name.</p>
                            <p style="font-weight: 600; color: var(--strongesim-text-primary); margin-top: 12px; margin-bottom: 8px;">✅ Matching Rules (exact filename matches):</p>
                            <ul>
                                <li>For <strong>Germany</strong> product: Matches <code>germany.png</code>, <code>germany.webp</code>, <code>germany-esim.jpg</code></li>
                                <li>For <strong>Asia</strong> region: Matches <code>asia.png</code>, <code>asia-esim.webp</code></li>
                                <li>Supported formats: PNG, WEBP, JPG, JPEG (case-insensitive)</li>
                            </ul>
                            <p style="font-weight: 600; color: var(--strongesim-text-primary); margin-top: 12px; margin-bottom: 8px;">❌ Will NOT match:</p>
                            <ul>
                                <li><code>germany-travel.png</code> (has extra words after country name)</li>
                                <li><code>asia-countries.jpg</code> (has extra words after region name)</li>
                            </ul>
                        </div>
                        <div class="esim-modal-footer">
                            <button id="esim-modal-ok">Got it</button>
                        </div>
                    </div>
                </div>

                <script type="text/javascript">
                document.addEventListener('DOMContentLoaded', function() {
                    const infoIcon = document.getElementById('esim-image-info-trigger');
                    const modal = document.getElementById('esim-image-modal');
                    const closeBtn = document.getElementById('esim-modal-close');
                    const okBtn = document.getElementById('esim-modal-ok');

                    // Open modal when clicking info icon
                    if (infoIcon) {
                        infoIcon.addEventListener('click', function() {
                            modal.classList.add('active');
                        });
                    }

                    // Close modal when clicking close button
                    if (closeBtn) {
                        closeBtn.addEventListener('click', function() {
                            modal.classList.remove('active');
                        });
                    }

                    // Close modal when clicking OK button
                    if (okBtn) {
                        okBtn.addEventListener('click', function() {
                            modal.classList.remove('active');
                        });
                    }

                    // Close modal when clicking outside of it
                    window.addEventListener('click', function(event) {
                        if (event.target === modal) {
                            modal.classList.remove('active');
                        }
                    });
                });
                </script>

                <div class="esim-sync-controls">
                    <button id="ajax-sync-button" class="button button-primary" style="padding: 8px 20px;">Start Fresh Sync</button>
                    <button id="ajax-resume-button" class="button button-secondary" style="display:none; padding: 8px 20px;">Resume Previous Sync</button>
                    <button id="clear-progress-button" class="button" style="display:none; padding: 8px 20px;">Clear Progress</button>
                </div>

                <div id="ajax-sync-status"></div>
            </div>

            <script type="text/javascript">
            jQuery(document).ready(function($) {
                var syncNonce = '<?php echo wp_create_nonce('esim_sync_products'); ?>';

                // Handle auto image upload checkbox
                $('#esim-auto-image-upload').change(function() {
                    var isChecked = $(this).is(':checked');
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'esim_save_auto_image_setting',
                            nonce: syncNonce,
                            enabled: isChecked ? 'yes' : 'no'
                        },
                        success: function(response) {
                            console.log('Auto image upload setting saved:', isChecked);
                        }
                    });
                });

                // Check sync status on page load
                checkSyncStatus();

                function checkSyncStatus() {
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'esim_get_sync_status',
                            nonce: syncNonce
                        },
                        success: function(response) {
                            if (response.success) {
                                var data = response.data;
                                if (data.can_resume && data.progress) {
                                    var p = data.progress;
                                    var processed = p.processed_codes ? p.processed_codes.length : 0;
                                    var total = p.total || 0;
                                    var percent = total > 0 ? Math.round((processed / total) * 100) : 0;

                                    $('#sync-status-box').show();
                                    $('#previous-sync-info').html(
                                        '<p><strong>Status:</strong> ' + (data.status.status || 'Unknown') + '</p>' +
                                        '<p><strong>Progress:</strong> ' + processed + ' of ' + total + ' products (' + percent + '%)</p>' +
                                        (p.last_error ? '<p><strong>Last Error:</strong> ' + p.last_error + '</p>' : '') +
                                        '<p><strong>Last Updated:</strong> ' + (p.last_updated || 'Unknown') + '</p>' +
                                        (p.results ? '<p><strong>Results so far:</strong> Created: ' + p.results.created + ', Updated: ' + p.results.updated + ', Failed: ' + p.results.failed + '</p>' : '')
                                    );
                                    $('#ajax-resume-button').show();
                                    $('#clear-progress-button').show();
                                } else {
                                    $('#sync-status-box').hide();
                                    $('#ajax-resume-button').hide();
                                    $('#clear-progress-button').hide();
                                }
                            }
                        }
                    });
                }

                function showSyncProgress(startTime) {
                    // Add warning messages above progress bar
                    $('#ajax-sync-status').html(
                        '<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 12px; margin-bottom: 15px; color: #856404; font-size: 13px;">' +
                        '<strong>⚠ Sync in Progress</strong><br>' +
                        'Do not close this page or navigate away. Your sync progress is being saved automatically.' +
                        '</div>'
                    );

                    // Show progress bar
                    $('.esim-progress-bar').show();
                    $('.esim-progress-fill').addClass('active').text('0%');

                    return setInterval(function() {
                        var elapsed = Math.round((new Date() - startTime) / 1000);

                        // Poll for progress updates
                        $.ajax({
                            url: ajaxurl,
                            type: 'POST',
                            data: {
                                action: 'esim_get_sync_status',
                                nonce: syncNonce
                            },
                            success: function(response) {
                                if (response.success && response.data.progress) {
                                    var p = response.data.progress;
                                    var processed = p.processed_codes ? p.processed_codes.length : 0;
                                    var total = p.total || 0;
                                    var percent = total > 0 ? Math.round((processed / total) * 100) : 0;

                                    // Update progress bar with elapsed time
                                    if (percent > 0) {
                                        $('.esim-progress-fill').css('width', percent + '%').text(processed + ' / ' + total + ' (' + percent + '%) • ' + elapsed + 's');
                                    }
                                }
                            }
                        });
                    }, 1000);
                }

                function showSyncResults(response, timer) {
                    clearInterval(timer);
                    // Hide progress bar
                    $('.esim-progress-bar').hide();
                    $('.esim-progress-fill').removeClass('active');

                    if (response.success) {
                        var r = response.data.results;
                        $('#ajax-sync-status').html(
                            '<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin-top: 20px;">' +
                            '<h3 style="color: #155724; margin-top: 0;">✓ Sync Completed Successfully</h3>' +
                            '<p style="color: #155724; margin: 10px 0;"><strong>Sync Time:</strong> ' + response.data.time + ' seconds</p>' +
                            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">' +
                            '<div style="background: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #28a745;">' +
                            '<div style="font-size: 28px; font-weight: 700; color: #28a745;">' + r.created + '</div>' +
                            '<div style="font-size: 12px; color: #666; text-transform: uppercase;">Created</div>' +
                            '</div>' +
                            '<div style="background: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #17a2b8;">' +
                            '<div style="font-size: 28px; font-weight: 700; color: #17a2b8;">' + r.updated + '</div>' +
                            '<div style="font-size: 12px; color: #666; text-transform: uppercase;">Updated</div>' +
                            '</div>' +
                            '<div style="background: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #6c757d;">' +
                            '<div style="font-size: 28px; font-weight: 700; color: #6c757d;">' + (r.skipped || 0) + '</div>' +
                            '<div style="font-size: 12px; color: #666; text-transform: uppercase;">Skipped</div>' +
                            '</div>' +
                            '<div style="background: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #ffc107;">' +
                            '<div style="font-size: 28px; font-weight: 700; color: #ffc107;">' + (r.deleted || 0) + '</div>' +
                            '<div style="font-size: 12px; color: #666; text-transform: uppercase;">Deleted</div>' +
                            '</div>' +
                            '<div style="background: #fff; padding: 15px; border-radius: 3px; border-left: 4px solid #dc3545;">' +
                            '<div style="font-size: 28px; font-weight: 700; color: #dc3545;">' + r.failed + '</div>' +
                            '<div style="font-size: 12px; color: #666; text-transform: uppercase;">Failed</div>' +
                            '</div>' +
                            '</div>' +
                            '<p style="color: #155724; margin-top: 20px; margin-bottom: 0;"><em>View detailed logs in <code>wp-content/esim-plugin.log</code></em></p>' +
                            '</div>'
                        );
                        $('#sync-status-box').hide();
                        $('#ajax-resume-button').hide();
                        $('#clear-progress-button').hide();
                    } else {
                        var canResume = response.data.can_resume;
                        $('#ajax-sync-status').html(
                            '<div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin-top: 20px;">' +
                            '<h3 style="color: #721c24; margin-top: 0;">✕ Sync Error</h3>' +
                            '<p style="color: #721c24;"><strong>Error:</strong> ' + response.data.message + '</p>' +
                            '<p style="color: #721c24;"><strong>Time:</strong> ' + (response.data.time || 'unknown') + ' seconds</p>' +
                            (canResume ? '<p style="color: #721c24;"><strong>You can resume this sync!</strong> Click "Resume Previous Sync" to continue.</p>' : '') +
                            '<p style="color: #721c24; margin-bottom: 0;">Check <code>wp-content/esim-plugin.log</code> for details.</p>' +
                            '</div>'
                        );
                        if (canResume) {
                            $('#ajax-resume-button').show();
                            $('#clear-progress-button').show();
                            checkSyncStatus();
                        }
                    }
                }

                function showConnectionError(timer, startTime, error, status) {
                    clearInterval(timer);
                    // Hide progress bar
                    $('.esim-progress-bar').hide();
                    $('.esim-progress-fill').removeClass('active');

                    var elapsed = Math.round((new Date() - startTime) / 1000);
                    $('#ajax-sync-status').html(
                        '<div class="error" style="padding: 15px;">' +
                        '<p><strong>Connection Error</strong></p>' +
                        '<p>Status: ' + status + '</p>' +
                        '<p>Error: ' + error + '</p>' +
                        '<p>Elapsed: ' + elapsed + ' seconds</p>' +
                        '<p><strong>The sync may still be running or can be resumed.</strong></p>' +
                        '<p>Check <code>wp-content/esim-plugin.log</code> for status, then click "Resume Previous Sync" to continue.</p>' +
                        '</div>'
                    );
                    // Check if we can resume after connection error
                    setTimeout(checkSyncStatus, 2000);
                }

                // Fresh Sync Button
                $('#ajax-sync-button').click(function(e) {
                    e.preventDefault();

                    var $btn = $(this);
                    var startTime = new Date();

                    $btn.prop('disabled', true).text('Syncing...');
                    $('#ajax-resume-button').prop('disabled', true);
                    $('#ajax-sync-status').html('');

                    var timer = showSyncProgress(startTime);

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        timeout: 3600000,
                        data: {
                            action: 'esim_sync_products',
                            nonce: syncNonce,
                            package_code: null
                        },
                        success: function(response) {
                            showSyncResults(response, timer);
                            $btn.prop('disabled', false).text('Start Fresh Sync');
                            $('#ajax-resume-button').prop('disabled', false);
                        },
                        error: function(xhr, status, error) {
                            showConnectionError(timer, startTime, error, status);
                            $btn.prop('disabled', false).text('Start Fresh Sync');
                            $('#ajax-resume-button').prop('disabled', false);
                        }
                    });
                });

                // Resume Sync Button
                $('#ajax-resume-button').click(function(e) {
                    e.preventDefault();

                    var $btn = $(this);
                    var startTime = new Date();

                    $btn.prop('disabled', true).text('Resuming...');
                    $('#ajax-sync-button').prop('disabled', true);
                    $('#ajax-sync-status').html('');

                    var timer = showSyncProgress(startTime);

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        timeout: 3600000,
                        data: {
                            action: 'esim_resume_sync',
                            nonce: syncNonce
                        },
                        success: function(response) {
                            showSyncResults(response, timer);
                            $btn.prop('disabled', false).text('Resume Previous Sync');
                            $('#ajax-sync-button').prop('disabled', false);
                        },
                        error: function(xhr, status, error) {
                            showConnectionError(timer, startTime, error, status);
                            $btn.prop('disabled', false).text('Resume Previous Sync');
                            $('#ajax-sync-button').prop('disabled', false);
                        }
                    });
                });

                // Clear Progress Button
                $('#clear-progress-button').click(function(e) {
                    e.preventDefault();

                    if (!confirm('Are you sure you want to clear the sync progress? You will need to start a fresh sync.')) {
                        return;
                    }

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'esim_clear_sync_progress',
                            nonce: syncNonce
                        },
                        success: function(response) {
                            $('#sync-status-box').hide();
                            $('#ajax-resume-button').hide();
                            $('#clear-progress-button').hide();
                            $('#ajax-sync-status').html('<div class="updated" style="padding: 10px;">Sync progress cleared.</div>');
                        }
                    });
                });
            });
            </script>

            <div class="esim-sync-container" style="border: 2px solid #dc3545; margin-top: 40px;">
                <h3 style="color: #dc3545; margin-top: 0;">⚠ Danger Zone</h3>
                <p style="color: #666;">Delete all eSIM products that have been synced to this website. <strong>This action cannot be undone.</strong></p>
                <button id="delete-all-products" class="button button-link-delete" style="background-color: #dc3545; color: #fff; border: none; padding: 8px 16px; cursor: pointer; border-radius: 3px;">Delete All eSIM Products</button>
                <div id="delete-status" style="margin-top: 15px;"></div>
            </div>

            <script type="text/javascript">
            jQuery(document).ready(function($) {
                $('#delete-all-products').click(function(e) {
                    e.preventDefault();
                    
                    if (!confirm('Are you sure you want to delete ALL eSIM synced products? This cannot be undone.')) {
                        return;
                    }
                    
                    var $btn = $(this);
                    $btn.prop('disabled', true).text('Deleting...');
                    $('#delete-status').html('<span class="spinner is-active" style="float:none; margin:0 5px 0 0;"></span> Processing deletion...');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'delete_all_synced_products',
                            nonce: '<?php echo wp_create_nonce('delete_all_synced_products'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                $('#delete-status').html('<div class="updated inline"><p>' + response.data.message + '</p></div>');
                            } else {
                                $('#delete-status').html('<div class="error inline"><p>Error: ' + (response.data ? response.data : 'Unknown error') + '</p></div>');
                            }
                            $btn.prop('disabled', false).text('Delete All eSIM Products');
                        },
                        error: function() {
                            $('#delete-status').html('<div class="error inline"><p>Connection error. Please try again.</p></div>');
                            $btn.prop('disabled', false).text('Delete All eSIM Products');
                        }
                    });
                });
            });
            </script>

            <!-- WhatsApp Styles for Sync Page -->
            <style>
                /* WhatsApp Contact Button Styles */
                .esim-whatsapp-button {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    width: 60px;
                    height: 60px;
                    background-color: #25D366;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
                    transition: all 0.3s ease;
                    z-index: 999;
                    font-size: 28px;
                }

                .esim-whatsapp-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(37, 211, 102, 0.6);
                }

                .esim-whatsapp-button:active {
                    transform: scale(0.95);
                }

                /* WhatsApp Modal Styles */
                .esim-whatsapp-modal {
                    display: none;
                    position: fixed;
                    z-index: 10001;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: fadeIn 0.2s ease;
                }

                .esim-whatsapp-modal.active {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .esim-whatsapp-modal-content {
                    background: var(--strongesim-bg-primary);
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s ease;
                    position: relative;
                }

                .esim-whatsapp-modal-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: var(--strongesim-text-secondary);
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s ease;
                }

                .esim-whatsapp-modal-close:hover {
                    color: var(--strongesim-text-primary);
                }

                .esim-whatsapp-header {
                    text-align: center;
                    margin-bottom: 25px;
                    padding-top: 10px;
                }

                .esim-whatsapp-header-icon {
                    width: 60px;
                    height: 60px;
                    background-color: #25D366;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    margin: 0 auto 15px;
                }

                .esim-whatsapp-header h3 {
                    color: var(--strongesim-text-primary);
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                }

                .esim-whatsapp-header p {
                    color: var(--strongesim-text-secondary);
                    font-size: 13px;
                    margin: 0;
                    line-height: 1.5;
                }

                .esim-whatsapp-reply-time {
                    color: var(--strongesim-text-tertiary);
                    font-size: 12px;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid var(--strongesim-border);
                }

                .esim-whatsapp-contact-card {
                    background: var(--strongesim-bg-secondary);
                    border: 1px solid var(--strongesim-border);
                    border-radius: 8px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-top: 20px;
                }

                .esim-whatsapp-contact-card:hover {
                    background: var(--strongesim-bg-primary);
                    border-color: #25D366;
                    box-shadow: 0 2px 8px rgba(37, 211, 102, 0.2);
                }

                .esim-whatsapp-contact-icon {
                    width: 50px;
                    height: 50px;
                    background-color: #25D366;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    flex-shrink: 0;
                }

                .esim-whatsapp-contact-info h4 {
                    color: var(--strongesim-text-primary);
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0 0 4px 0;
                }

                .esim-whatsapp-contact-info p {
                    color: var(--strongesim-text-secondary);
                    font-size: 12px;
                    margin: 0;
                }

                .esim-whatsapp-arrow {
                    margin-left: auto;
                    color: var(--strongesim-text-secondary);
                    font-size: 20px;
                }

                body.strongesim-dark-mode .esim-whatsapp-button {
                    box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
                }

                body.strongesim-dark-mode .esim-whatsapp-button:hover {
                    box-shadow: 0 6px 16px rgba(37, 211, 102, 0.5);
                }
            </style>

            <!-- WhatsApp Contact Button -->
            <div class="esim-whatsapp-button" id="esim-whatsapp-trigger-sync" title="Need help? Chat with us">💬</div>

            <!-- WhatsApp Contact Modal -->
            <div id="esim-whatsapp-modal-sync" class="esim-whatsapp-modal">
                <div class="esim-whatsapp-modal-content">
                    <button class="esim-whatsapp-modal-close" id="esim-whatsapp-modal-close-sync">&times;</button>

                    <div class="esim-whatsapp-header">
                        <div class="esim-whatsapp-header-icon">💬</div>
                        <h3>Start a Conversation</h3>
                        <p>Hi! Click one of our member below to chat on WhatsApp</p>
                    </div>

                    <div class="esim-whatsapp-contact-card" id="esim-whatsapp-contact-link-sync">
                        <div class="esim-whatsapp-contact-icon">💚</div>
                        <div class="esim-whatsapp-contact-info">
                            <h4>Contact Support</h4>
                            <p>Our team typically replies in a few minutes</p>
                        </div>
                        <div class="esim-whatsapp-arrow">→</div>
                    </div>

                    <p class="esim-whatsapp-reply-time">The team typically replies in a few minutes.</p>
                </div>
            </div>

            <script type="text/javascript">
            document.addEventListener('DOMContentLoaded', function() {
                const whatsappButton = document.getElementById('esim-whatsapp-trigger-sync');
                const whatsappModal = document.getElementById('esim-whatsapp-modal-sync');
                const whatsappCloseBtn = document.getElementById('esim-whatsapp-modal-close-sync');
                const whatsappContactLink = document.getElementById('esim-whatsapp-contact-link-sync');

                const whatsappUrl = 'https://api.whatsapp.com/send?phone=14382556657&text=Hello,%20I%20need%20help';

                // Open modal when clicking WhatsApp button
                if (whatsappButton) {
                    whatsappButton.addEventListener('click', function() {
                        whatsappModal.classList.add('active');
                    });
                }

                // Close modal when clicking close button
                if (whatsappCloseBtn) {
                    whatsappCloseBtn.addEventListener('click', function() {
                        whatsappModal.classList.remove('active');
                    });
                }

                // Open WhatsApp when clicking contact card
                if (whatsappContactLink) {
                    whatsappContactLink.addEventListener('click', function() {
                        window.open(whatsappUrl, '_blank');
                    });
                }

                // Close modal when clicking outside of it
                window.addEventListener('click', function(event) {
                    if (event.target === whatsappModal) {
                        whatsappModal.classList.remove('active');
                    }
                });
            });
            </script>
            </div>
        </div>
        <?php
}

    public function display_esim_order_details($post)
    {
        $order_id = $post->ID;
        $qr_code_url = get_post_meta($order_id, '_esim_qr_code', true);
        $iccid = get_post_meta($order_id, '_esim_iccid', true);
        $esim_status = get_post_meta($order_id, '_esim_status', true);
        $data_usage = get_post_meta($order_id, '_esim_data_usage', true);
        $data_remaining = get_post_meta($order_id, '_esim_data_remaining', true);
        $expiry_date = get_post_meta($order_id, '_esim_expiry_date', true);
        $days_remaining = get_post_meta($order_id, '_esim_days_remaining', true);

        error_log("eSIM Details for Order ID {$order_id}:");
        error_log("QR Code URL: " . ($qr_code_url ? $qr_code_url : 'Not set'));
        error_log("ICCID: " . ($iccid ? $iccid : 'Not set'));
        error_log("Status: " . ($esim_status ? $esim_status : 'Not set'));
        error_log("Data Usage: " . ($data_usage ? $data_usage : 'Not set'));
        error_log("Data Remaining: " . ($data_remaining ? $data_remaining : 'Not set'));
        error_log("Expiry Date: " . ($expiry_date ? $expiry_date : 'Not set'));
        error_log("Days Remaining: " . ($days_remaining ? $days_remaining : 'Not set'));

        echo '<div class="esim-details">';
        if ($qr_code_url) {
            echo '<img src="' . esc_url($qr_code_url) . '" alt="eSIM QR Code" style="max-width:200px;" />';
        } else {
            echo '<p>No QR code available</p>';
        }
        echo '<p><strong>ICCID:</strong> ' . ($iccid ? esc_html($iccid) : 'Not available') . '</p>';
        echo '<p><strong>Status:</strong> ' . ($esim_status ? esc_html($esim_status) : 'Not available') . '</p>';
        echo '<p><strong>Data Usage:</strong> ' . ($data_usage ? esc_html($data_usage) . ' bytes' : 'Not available') . '</p>';
        echo '<p><strong>Data Remaining:</strong> ' . ($data_remaining ? esc_html($data_remaining) . ' bytes' : 'Not available') . '</p>';
        echo '<p><strong>Expiry Date:</strong> ' . ($expiry_date ? esc_html($expiry_date) : 'Not available') . '</p>';
        echo '<p><strong>Days Remaining:</strong> ' . ($days_remaining ? esc_html($days_remaining) : 'Not available') . '</p>';

        echo '<h4>Send SMS</h4>';
        echo '<textarea id="esim-sms-message" rows="3" cols="50"></textarea><br>';
        echo '<button id="esim-send-sms" class="button">Send SMS</button>';
        echo '<span id="esim-sms-status"></span>';

        echo '</div>';

        // Add JavaScript to handle SMS sending
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('#esim-send-sms').click(function() {
                var message = $('#esim-sms-message').val();
                var orderId = '<?php echo $order_id; ?>';
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'send_esim_sms',
                        order_id: orderId,
                        message: message
                    },
                    success: function(response) {
                        $('#esim-sms-status').text(response.success ? 'SMS sent successfully' : 'Failed to send SMS');
                    }
                });
            });
        });
        </script>
        <?php
}
}
