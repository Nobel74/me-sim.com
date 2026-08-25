<?php

use ESIMWooCommerce\Utils\Logger;

class PriceCalculator {
    private $logger;
    private $settings;
    
    private $country_groups = array(
        'Y' => array(
            'name' => 'Asia Pacific & Nordic',
            'countries' => ['AU', 'CN', 'HK', 'ID', 'JP', 'MO', 'MY', 'SG', 'KR', 'TH', 'TR', 'UA', 'RO', 'PL', 'NO', 'FI'],
            'default_markup' => 150,
        ),
        'Z' => array(
            'name' => 'Western Europe & US',
            'countries' => ['AT', 'FR', 'DE', 'GR', 'IE', 'IT', 'PT', 'ES', 'SE', 'CH', 'US', 'SI', 'SK', 'GB', 'NL', 'LU', 'DK', 'EE', 'LT', 'LV', 'HR', 'BG', 'CZ'],
            'default_markup' => 180,
        ),
        'A' => array(
            'name' => 'Premium',
            'countries' => ['BE', 'EU-30'],
            'default_markup' => 200,
        ),
        'B' => array(
            'name' => 'Europe & Middle East',
            'countries' => ['DZ', 'CY', 'EU', 'HU', 'GE', 'IL', 'IS', 'MT', 'KZ', 'UZ', 'LI', 'MA', 'AL', 'BA', 'CENTRALASIA', 'CN-3'],
            'default_markup' => 220,
        ),
        'C' => array(
            'name' => 'Special Regions',
            'countries' => ['AX', 'AS', 'NZ', 'PK', 'PH', 'TN', 'VN', 'JO', 'AS-7', 'AUNZ', 'AM', 'BY', 'FO'],
            'default_markup' => 250,
        ),
        'D' => array(
            'name' => 'Americas & Mixed',
            'countries' => ['BR', 'KH', 'EG', 'KW', 'KG', 'MX', 'ME', 'NA', 'CA', 'GU', 'AD', 'AZ', 'BH', 'CNJPKR', 'ME-6', 'IQ', 'LA'],
            'default_markup' => 280,
        ),
        'E' => array(
            'name' => 'Global Mix',
            'countries' => ['BD', 'GI', 'GP', 'IN', 'IM', 'JE', 'PR', 'RU', 'SA', 'RS', 'LK', 'AE', 'BALKANS-5', 'CO', 'GG', 'EU-42'],
            'default_markup' => 300,
        ),
        'F' => array(
            'name' => 'Regional Special',
            'countries' => ['AR', 'MD', 'MK', 'QA', 'RE', 'ZA', 'TZ', 'AS-12', 'EU-42-MA'],
            'default_markup' => 320,
        ),
        'G' => array(
            'name' => 'Central & South America',
            'countries' => ['BN', 'UY', 'PY', 'PA', 'NI', 'HN', 'CR', 'EC', 'GT', 'AF', 'AS-20', 'AS-20+', 'GA', 'GL-120', 'GL-120+'],
            'default_markup' => 350,
        ),
        'H' => array(
            'name' => 'Global Mix Premium',
            'countries' => ['CL', 'DO', 'NG', 'CD', 'MZ', 'MG', 'ZM', 'BO', 'PE', 'OM', 'UG', 'TD', 'XK', 'MW', 'KE', 'SV', 'LB', 'MC', 'AF-29', 'AI', 'AG', 'BB', 'CB-24', 'KY', 'GCC-6', 'GD'],
            'default_markup' => 380,
        ),
        'I' => array(
            'name' => 'Global & Regional',
            'countries' => ['CI', 'CM', 'ML', 'BW', 'NE', 'SN', 'SZ', 'CF', 'BF', '!GL', 'BS', 'DM', 'GL-130', 'GL-138', 'GL-139', 'GL-144'],
            'default_markup' => 400,
        ),
        'J' => array(
            'name' => 'Special Territories',
            'countries' => ['GW', 'NP', 'SC', 'BZ', 'BM'],
            'default_markup' => 450,
        ),
        'K' => array(
            'name' => 'Special Region',
            'countries' => ['YE', 'SD'],
            'default_markup' => 500,
        ),
        'L' => array(
            'name' => 'Unassigned',
            'countries' => [],
            'default_markup' => 450,
        ),
        'M' => array(
            'name' => 'Catchall (Unassigned)',
            'countries' => [], // Will catch any country not in groups Y-L
            'default_markup' => 500,
        ),
    );

    public function __construct($settings, $logger) {
        $this->settings = $settings;
        $this->logger = $logger;
    }

    public function calculatePrice($original_price, $country, $product_id = null) {
        // Convert from cents to dollars
        $original_price_dollars = $original_price / 10000;

        // Get markup percentage for the country/group with additional logging
        $markup_percentage = $this->getMarkupForCountry($country);
        $this->logger->log("Initial markup percentage from getMarkupForCountry: {$markup_percentage}%");
        
        // Check if markup is being stored and retrieved correctly
        if ($markup_percentage === 0) {
            $global_markup = floatval(get_option('esim_price_increase_percentage', 30));
            $this->logger->log("Using global markup percentage: {$global_markup}%");
            $markup_percentage = $global_markup;
        }
        
        // Calculate markup multiplier
        $markup_multiplier = 1 + ($markup_percentage / 100);
        
        // Apply markup
        $marked_up_price = $original_price_dollars * $markup_multiplier;
        $this->logger->log("Marked up price before rounding: $" . number_format($marked_up_price, 2));

        // Round to .90
        $integer_part = floor($marked_up_price);
        $this->logger->log("Integer part of marked up price: {$integer_part}");
          // Set final price to integer part + 0.90
        $final_price = $integer_part + 0.90;
        $this->logger->log("Price after setting to .90: $" . number_format($final_price, 2));

        // Apply pricing rules:
        // - If price < $1.90, set to $1.90
        // - If price >= $1.90 and <= $2.90, set to $2.90
        // - If price > $2.90, keep the calculated price
        if ($final_price < 1.90) {
            $final_price = 1.90;
            $this->logger->log("Price set to minimum: $1.90");
        } elseif ($final_price >= 1.90 && $final_price <= 2.90) {
            $final_price = 2.90;
            $this->logger->log("Price set to mid-tier: $2.90");
        } else {
            $this->logger->log("Price kept as calculated: $" . number_format($final_price, 2));
        }
        
        $this->logger->log("Final price after applying pricing rules: $" . number_format($final_price, 2));

        // Detailed logging
        $this->logger->log(sprintf(
            "Detailed price calculation:\n" .
            "- Original price (cents): %d\n" .
            "- Original price (dollars): $%.2f\n" .
            "- Country: %s\n" .
            "- Group markup percentage: %d%%\n" .
            "- Markup multiplier: %.2f\n" .
            "- Pre-round price: $%.2f\n" .
            "- Final price: $%.2f",
            $original_price,
            $original_price_dollars,
            $country,
            $markup_percentage,
            $markup_multiplier,
            $marked_up_price,
            $final_price
        ));

        try {
            if ($product_id) {
                $product = wc_get_product($product_id);
                if ($product) {
                    $product->set_regular_price(strval($final_price));
                    $product->set_price(strval($final_price));
                    $product->save();
                    $this->logger->log("Price updated directly in calculatePrice: $" . $product->get_regular_price());
                }
            }
        } catch (Exception $e) {
            $this->logger->log("Error updating WooCommerce price: " . $e->getMessage());
        }

        return $final_price;
    }

    public function getMarkupForCountry($location) {
        $this->logger->log('Getting markup for location: ' . $location);

        $countries = explode(',', $location);

        if ($location === '!GL' || strpos($location, 'Global') !== false) {
            return get_option('esim_markup_I', 400); // Global plans use Group I markup
        }

        // Special handling for regions
        if (strpos($location, 'Europe') !== false) {
            return get_option('esim_markup_B', 220); // Europe plans use Group B markup
        }
        if (strpos($location, 'Asia') !== false) {
            return get_option('esim_markup_Y', 150); // Asia plans use Group Y markup
        }
        if (strpos($location, 'Africa') !== false) {
            return get_option('esim_markup_H', 380); // Africa plans use Group H markup
        }
        if (strpos($location, 'South America') !== false) {
            return get_option('esim_markup_G', 350); // South America plans use Group G markup
        }

        $highest_markup = 0;
        $found_in_group = false;
        foreach ($countries as $country_code) {
            $country_code = trim($country_code);

            foreach ($this->country_groups as $group_code => $group_data) {
                if (in_array($country_code, $group_data['countries'])) {
                    $markup_key = 'esim_markup_' . $group_code;
                    $group_markup = get_option($markup_key, $group_data['default_markup']);
                    $highest_markup = max($highest_markup, $group_markup);
                    $found_in_group = true;
                    $this->logger->log("Found markup for country {$country_code} in group {$group_code}: {$group_markup}%");
                }
            }
            
            // If country not found in any group Y-L, use Group M (catchall)
            if (!$found_in_group) {
                $markup_key = 'esim_markup_M';
                $group_markup = get_option($markup_key, $this->country_groups['M']['default_markup']);
                $highest_markup = max($highest_markup, $group_markup);
                $this->logger->log("Country {$country_code} not in any group, using catchall Group M: {$group_markup}%");
            }
        }

        if ($highest_markup === 0) {
            return 0;    
        }

        $this->logger->log("Final markup for location {$location}: {$highest_markup}%");
        return $highest_markup;
    }

    public function addMarkupSettings($settings) {
        $settings[] = array(
            'title' => 'Country Group Markups',
            'type' => 'title',
            'desc' => 'Set markup percentages for different country groups',
            'id' => 'esim_markup_settings',
        );

        $country_groups = array(
            'YYY' => 'Asia Pacific Group 1',
            'ZZZ' => 'North America',
            'AAA' => 'Premium Markets',
            'BBB' => 'Europe Group 1',
            'CCC' => 'Asia & Europe Special',
            'DDD' => 'Emerging Markets 1',
            'EEE' => 'Mixed Markets 1',
            'FFF' => 'Mixed Markets 2',
            'GGG' => 'Mixed Markets 3',
            'HHH' => 'Global Markets',
            'III' => 'Europe & Middle East',
            'JJJ' => 'Global Special',
            'KKK' => 'Africa Group',
        );

        foreach ($country_groups as $code => $name) {
            $settings[] = array(
                'title' => $name . ' Group Markup',
                'desc' => 'Markup percentage for ' . $name . ' group',
                'id' => 'esim_markup_' . $code,
                'default' => '100',
                'type' => 'number',
                'custom_attributes' => array(
                    'min' => '0',
                    'step' => '1',
                ),
            );
        }

        $settings[] = array(
            'type' => 'sectionend',
            'id' => 'esim_markup_settings',
        );

        return $settings;
    }
}
