<?php

use ESIMWooCommerce\Utils\Logger;

if (!defined('ABSPATH')) {
    exit;
}

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

    /**
     * Retail price for a plan.
     *
     * @param float       $original_price Platform reseller price, in 1/10000 dollars.
     * @param string      $country        Country or region code(s) of the plan.
     * @param int|null    $product_id     Unused; kept for call compatibility.
     * @return float
     */
    public function calculatePrice($original_price, $country, $product_id = null) {
        $original_price_dollars = ((float) $original_price) / 10000;

        $markup_percentage = (float) $this->getMarkupForCountry($country);

        if ($markup_percentage <= 0) {
            $markup_percentage = (float) get_option('esim_price_increase_percentage', 30);
        }

        $marked_up_price = $original_price_dollars * (1 + ($markup_percentage / 100));

        // Charm pricing: always end on .90.
        $final_price = floor($marked_up_price) + 0.90;

        // Floor and mid-tier rules.
        if ($final_price < 1.90) {
            $final_price = 1.90;
        } elseif ($final_price <= 2.90) {
            $final_price = 2.90;
        }

        // One line per product instead of eight: a full catalogue sync used to
        // write tens of thousands of log entries here.
        $this->logger->debug(sprintf(
            'Price for %s: cost $%.2f, markup %s%%, retail $%.2f',
            $country !== '' ? $country : 'unknown',
            $original_price_dollars,
            rtrim(rtrim(number_format($markup_percentage, 2, '.', ''), '0'), '.'),
            $final_price
        ));

        // The price is returned and set by ProductService when it saves the
        // product. Saving the product here as well double-wrote every product
        // and could clobber the in-memory object the caller was still editing.
        return $final_price;
    }

    public function getMarkupForCountry($location) {
        $location = (string) $location;
        if ($location === '') {
            return (float) get_option('esim_markup_M', 500);
        }

        $countries = explode(',', $location);

        if ($location === '!GL' || strpos($location, 'Global') !== false) {
            return (float) get_option('esim_markup_I', 400); // Global plans use Group I markup
        }

        // Special handling for regions
        if (strpos($location, 'Europe') !== false) {
            return (float) get_option('esim_markup_B', 220); // Europe plans use Group B markup
        }
        if (strpos($location, 'Asia') !== false) {
            return (float) get_option('esim_markup_Y', 150); // Asia plans use Group Y markup
        }
        if (strpos($location, 'Africa') !== false) {
            return (float) get_option('esim_markup_H', 380); // Africa plans use Group H markup
        }
        if (strpos($location, 'South America') !== false) {
            return (float) get_option('esim_markup_G', 350); // South America plans use Group G markup
        }

        $highest_markup = 0.0;

        foreach ($countries as $country_code) {
            $country_code = trim($country_code);
            if ($country_code === '') {
                continue;
            }

            // Reset per country: the flag used to be set once for the whole
            // location, so every code after the first match skipped the
            // catchall group even when it belonged to no group at all.
            $found_in_group = false;

            foreach ($this->country_groups as $group_code => $group_data) {
                if (in_array($country_code, $group_data['countries'], true)) {
                    $group_markup = (float) get_option('esim_markup_' . $group_code, $group_data['default_markup']);
                    $highest_markup = max($highest_markup, $group_markup);
                    $found_in_group = true;
                }
            }

            if (!$found_in_group) {
                $group_markup = (float) get_option('esim_markup_M', $this->country_groups['M']['default_markup']);
                $highest_markup = max($highest_markup, $group_markup);
            }
        }

        return $highest_markup;
    }

    /**
     * Group definitions, for the settings screen.
     */
    public function getCountryGroups() {
        return $this->country_groups;
    }
}
