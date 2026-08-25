<?php
class SettingsHandler {
    private $country_groups = array(
        'Y' => array(
            'name' => 'Group Y - Asia Pacific & Eastern Europe',
            'countries' => array(
                'AU', 'CN', 'HK', 'ID', 'JP', 'MO', 'MY', 'SG', 'KR', 'TH', 'TR', 
                'UA', 'RO', 'PL', 'NO', 'FI'
            )
         ),
        'Z' => array(
            'name' => 'Group Z - Western Europe & US',
            'countries' => array(
                'AT', 'FR', 'DE', 'GR', 'IE', 'IT', 'PT', 'ES', 'SE', 'CH', 'US',
                'SI', 'SK', 'GB', 'NL', 'LU', 'DK', 'EE', 'LT', 'LV', 'HR', 'BG', 'CZ'
            )
        ),
        'A' => array(
            'name' => 'Group A - Premium',
            'countries' => array('BE', 'EU-30')
        ),
        'B' => array(
            'name' => 'Group B - Europe & Middle East',
            'countries' => array(
                'DZ', 'CY', 'CN', 'EU', 'HU', 'GE', 'IL', 'IS', 'MT', 'KZ', 'UZ', 
                'LI', 'MA', 'AL', 'BA', 'CENTRALASIA', 'CN-3'
            )
        ),
        'C' => array(
            'name' => 'Group C - Special Regions',
            'countries' => array(
                'AX', 'AS', 'NZ', 'PK', 'PH', 'TN', 'VN', 'JO', 'AS-7', 'AUNZ', 'AM', 'BY', 'FO'
            )
        ),
        'D' => array(
            'name' => 'Group D - Americas & Mixed',
            'countries' => array(
                'BR', 'KH', 'EG', 'KW', 'KG', 'MX', 'ME', 'NA', 'CA', 'GU',
                'AD', 'AZ', 'BH', 'CNJPKR', 'ME-6', 'IQ', 'LA'
            )
        ),
        'E' => array(
            'name' => 'Group E - Global Mix',
            'countries' => array(
                'BD', 'GI', 'GP', 'IN', 'IM', 'JE', 'PR', 'RU', 'SA', 
                'RS', 'LK', 'AE', 'BALKANS-5', 'CO', 'GG', 'EU-42'
            )
        ),
        'F' => array(
            'name' => 'Group F - Regional Special',
            'countries' => array(
                'AR', 'MD', 'MK', 'QA', 'RE', 'ZA', 'TZ', 'AS-12', 'EU-42-MA'
            )
        ),
        'G' => array(
            'name' => 'Group G - Central & South America',
            'countries' => array(
                'BN', 'UY', 'PY', 'PA', 'NI', 'HN', 'CR', 'EC', 'GT',
                'AF', 'AS-20', 'AS-20+', 'GA', 'GL-120', 'GL-120+'
            )
        ),
        'H' => array(
            'name' => 'Group H - Global Mix Premium',
            'countries' => array(
                'CL', 'DO', 'NG', 'CD', 'MZ', 'MG', 'ZM', 'BO', 'PE',
                'OM', 'UG', 'TD', 'XK', 'MW', 'KE', 'SV', 'LB', 'MC',
                'AF-29', 'AI', 'AG', 'BB', 'CB-24', 'KY', 'GCC-6', 'GD', 'SV'
            )
        ),
        'I' => array(
            'name' => 'Group I - Global & Regional',
            'countries' => array(
                'CI', 'CM', 'ML', 'BW', 'NE', 'SN', 'SZ', 'CF',
                'BF', '!GL', 'BS', 'DM', 'GL-130', 'GL-138', 'GL-139', 'GL-144'
            )
        ),
        'J' => array(
            'name' => 'Group J - Special Territories',
            'countries' => array('GW', 'NP', 'SC', 'BZ', 'BM')
        ),
        'K' => array(
            'name' => 'Group K - Special Region',
            'countries' => array('YE', 'SD')
        ),
        'L' => array(
            'name' => 'Group L - Unassigned',
            'countries' => array()
        ),
        'M' => array(
            'name' => 'Group M - Catchall (Unassigned)',
            'countries' => array() // Will catch any country not in groups Y-L
        )
    );

    public function get_option($option_name, $default = '')
    {
        return get_option($option_name, $default);
    }

    public function register_settings() {
        // Base API settings
        register_setting('esim_api_settings', 'esim_api_email', array(
            'sanitize_callback' => 'sanitize_email'
        ));

        register_setting('esim_api_settings', 'esim_api_password', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));

        // Exchange rate settings
        register_setting('esim_api_settings', 'esim_manual_exchange_rate', array(
            'sanitize_callback' => 'floatval'
        ));

        // Global price increase setting
        register_setting('esim_api_settings', 'esim_price_increase_percentage', array(
            'sanitize_callback' => 'absint'
        ));

        // SMS notification settings
        register_setting('esim_api_settings', 'esim_sms_data_usage', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));
        
        register_setting('esim_api_settings', 'esim_sms_validity_usage', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));

        // Add setting for usage check interval
        register_setting('esim_api_settings', 'esim_usage_check_interval', array(
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'daily'
        ));

        // Add option to enable/disable data usage tracking
        register_setting('esim_api_settings', 'esim_track_data_usage', array(
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'yes'
        ));

        // Add option to enable/disable auto product image upload
        register_setting('esim_api_settings', 'esim_auto_image_upload', array(
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'yes'
        ));

        // Webhook settings
        register_setting('esim_api_settings', 'esim_webhook_id', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));

        register_setting('esim_api_settings', 'esim_webhook_secret', array(
            'sanitize_callback' => 'sanitize_text_field'
        ));

        // Register markup settings for each group
        $groups = array('Y', 'Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M');
        foreach ($groups as $group) {
            register_setting('esim_api_settings', 'esim_markup_' . $group, array(
                'sanitize_callback' => array($this, 'sanitize_markup_percentage'),
                'default' => $this->get_default_markup($group)
            ));
        }

        // Add settings sections
        add_settings_section(
            'esim_api_settings_section',
            'StrongESIM API Settings',
            array($this, 'render_api_settings_section'),
            'esim_api_settings'
        );
    }

    public function render_api_settings_section()
    {
        echo '<p>Enter your StrongESIM API credentials.</p>';
    }

    public function render_markup_section_description()
    {
        echo '<p>Set markup percentages for different country groups. These markups will be applied to base prices from the StrongEsim API.</p>';
        echo '<p>Base prices are multiplied by (1 + markup/100) to get the final price.</p>';
    }

    public function render_markup_field($args)
    {
        $code = $args['code'];
        $name = $args['name'];
        $countries = implode(', ', $args['countries']);
        $value = get_option('esim_markup_' . $code, $this->get_default_markup($code));

        ?>
        <input type="number"
               name="<?php echo esc_attr('esim_markup_' . $code); ?>"
               value="<?php echo esc_attr($value); ?>"
               min="0"
               step="1"
               class="small-text" />%
        <p class="description">
            Default: <?php echo esc_html($this->get_default_markup($code)); ?>%<br>
            Countries: <?php echo esc_html($countries); ?>
        </p>
        <?php
    }

    private function get_default_markup($group_code)
    {
        $markups = array(
            'Y' => 150,  // 1.5x markup
            'Z' => 180,  // 1.8x markup
            'A' => 200,  // 2.0x markup
            'B' => 220,  // 2.2x markup
            'C' => 250,  // 2.5x markup
            'D' => 280,  // 2.8x markup
            'E' => 300,  // 3.0x markup
            'F' => 320,  // 3.2x markup
            'G' => 350,  // 3.5x markup
            'H' => 380,  // 3.8x markup
            'I' => 400,  // 4.0x markup
            'J' => 450,  // 4.5x markup
            'K' => 500   // 5.0x markup
        );
        return isset($markups[$group_code]) ? $markups[$group_code] : 100;
    }

    public function sanitize_markup_percentage($input) {
    $input = floatval($input);
    if ($input < 0) {
        $input = 0;
    }
    error_log("Sanitizing markup percentage: " . $input);
    return $input;
}

    public function get_country_groups()
    {
        return $this->country_groups;
    }

    public function get_group_for_country($country_code)
    {
        foreach ($this->country_groups as $group_code => $group) {
            if (in_array($country_code, $group['countries'])) {
                return $group_code;
            }
        }
        // If country not found in any group Y-L, assign to catchall Group M
        return 'M';
    }
}