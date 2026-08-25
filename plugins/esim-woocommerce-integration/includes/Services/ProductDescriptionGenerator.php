<?php

class ProductDescriptionGenerator {
    public function generateShortDescription($package) {
        // Get country/region name for the title
        $locationName = $this->getLocationDisplayName($package);
        
        // Generate a short description for the product based on the package data
        return '
        <div class="woocommerce-product-details__short-description">
            <ul>
                <li><strong>' . esc_html($locationName) . ' eSIM Data</strong></li>
                <li>Works on all unlocked eSIM supporting devices</li>
                <li>Instant delivery of QR code</li>
                <li>Shareable hot spot</li>
                <li>Full high-speed data, no throttle</li>
            </ul>
        </div>';
    }

    public function generateProductDescription($package) {
        // Get country/region name for the title
        $locationName = $this->getLocationDisplayName($package);
        
        $description = '<div class="product-description modern-style" style="font-family: Arial, sans-serif; color: #333;">';
        
        // Title with country/region name
        $description .= '<h2 style="color: #2c3e50; margin-bottom: 20px;">' . esc_html($locationName) . ' eSIM Data</h2>';

        // Basic Information
        $description .= '<section class="basic-info" style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;">Basic Information</h3>
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div class="info-item" style="background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><strong>Package Name:</strong> ' . esc_html($package['name']) . '</div>
            </div>
        </section>';

        // Data and Duration
        $description .= '<section class="data-duration" style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;">Data and Duration</h3>
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div class="info-item" style="background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><strong>Data Volume:</strong> ' . number_format($package['volume'] / (1024 * 1024 * 1024), 2) . ' GB</div>
                <div class="info-item" style="background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><strong>Duration:</strong> ' . esc_html($package['duration']) . ' ' . esc_html($package['durationUnit']) . 's</div>
                <div class="info-item" style="background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><strong>Unused Valid Time:</strong> ' . esc_html($package['unusedValidTime']) . ' days</div>
            </div>
        </section>';

        // Network Information
        $speed = esc_html($package['speed']);
        if (strpos($speed, '5G') === false) {
            $speed .= '/5G';
        }

        $description .= '<section class="network-info" style="margin-bottom: 20px;">
            <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;">Network Information</h3>
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div class="info-item" style="background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><strong>Speed:</strong> ' . $speed . '</div>
            </div>
        </section>';

        // Supported Countries
        $countries = explode(',', $package['location']);
        if (count($countries) > 1) {
            $description .= '<section class="supported-countries" style="margin-bottom: 20px; ">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;">Supported Countries</h3>
                <div class="country-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; margin-top: 15px; max-height: 320px; overflow: auto;">';
            foreach ($countries as $country_code) {
                $country_code = trim(strtolower($country_code));
                $flag_url = "https://flagcdn.com/w40/{$country_code}.png";
                $country_name = $this->getCountryName($country_code);
                $description .= '<div class="country-item" style="text-align: center;">
                    <img src="' . esc_url($flag_url) . '"
                        srcset="https://flagcdn.com/w80/' . $country_code . '.png 2x"
                        width="40" alt="' . esc_attr($country_name) . ' Flag"
                        title="' . esc_attr($country_name) . '" style="display: block; margin: 0 auto 5px;">
                    <span style="font-size: 0.9em;">' . esc_html($country_name) . '</span>
                </div>';
            }
            $description .= '</div></section>';
        }

        // Supported Networks
        if (!empty($package['locationNetworkList'])) {
            $description .= '<section class="supported-networks" style="margin-bottom: 20px; ">
                <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;">Supported Networks</h3>
                <div class="table-container" style="overflow-x: auto; margin-top: 15px; max-height: 320px; overflow: auto;">
                    <table class="network-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">Country</th>
                                <th style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">Flag</th>
                                <th style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">Operators</th>
                            </tr>
                        </thead>
                        <tbody>';
            foreach ($package['locationNetworkList'] as $location) {
                $country_code = strtolower(basename($location['locationLogo'], '.png'));
                $flag_url = "https://flagcdn.com/w40/{$country_code}.png";
                $description .= '<tr>
                    <td style="border: 1px solid #e0e0e0; padding: 10px;">' . esc_html($location['locationName']) . '</td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px;"><img src="' . esc_url($flag_url) . '"
                        srcset="https://flagcdn.com/w80/' . $country_code . '.png 2x"
                        width="40" alt="' . esc_attr($location['locationName']) . ' Flag"
                        title="' . esc_attr($location['locationName']) . '"></td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px;">';
                if (!empty($location['operatorList'])) {
                    $description .= '<ul class="operator-list" style="list-style-type: none; padding: 0; margin: 0;">';
                    foreach ($location['operatorList'] as $operator) {
                        $description .= '<li style="margin-bottom: 5px;">' . esc_html($operator['operatorName']) . ' (' . esc_html($operator['networkType']) . ')</li>';
                    }
                    $description .= '</ul>';
                }
                $description .= '</td></tr>';
            }
            $description .= '</tbody></table></div></section>';
        }

        $description .= '</div>';

        return $description;
    }
    
    /**
     * Helper method to get a display-friendly location name from package data
     * 
     * @param array $package The package data
     * @return string The location display name
     */
    private function getLocationDisplayName($package) {
        // Check if this is a multi-country package
        $countries = explode(',', $package['location']);
        
        // First, extract directly from the package name if it's a special regional package
        $special_regions = [
            'South America', 'Caribbean', 'Australia & New Zealand', 'Asia', 
            'Middle East', 'Gulf Region', 'Global', 'Africa', 'China', 'Europe',
            'North America', 'Singapore & Malaysia & Thailand', 'China mainland & Japan & South Korea'
        ];
        
        foreach ($special_regions as $region) {
            if (stripos($package['name'], $region) === 0) {
                // The package name starts with one of our special regions
                // Extract the region part from the package name
                $package_parts = explode(' ', $package['name']);
                $region_name = '';
                
                foreach ($package_parts as $part) {
                    $region_name .= ' ' . $part;
                    // Break when we reach a number (likely the data amount)
                    if (is_numeric($part) || preg_match('/^\d+GB$/', $part)) {
                        break;
                    }
                }
                
                return trim($region_name);
            }
        }
        
        if (count($countries) > 1) {
            // For multi-country packages, use the package name directly
            return $package['name'];
        } else {
            // For single country, get the full country name
            $country_code = trim($countries[0]);
            $country_name = $this->getCountryName($country_code);
            return $country_name;
        }
    }

    private function getCountryName($country_code) {
        // Use WooCommerce Countries utility to get the full country name
        $countries = new WC_Countries();
        $country_name = isset($countries->countries[strtoupper($country_code)]) ? $countries->countries[strtoupper($country_code)] : $country_code;
        return $country_name;
    }
}
