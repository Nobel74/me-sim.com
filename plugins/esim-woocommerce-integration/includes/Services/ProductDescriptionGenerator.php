<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Builds the product short description and long description from a plan.
 *
 * Every field is read defensively: the plan shape returned by the platform does
 * not contain the eSIM Access fields the first version of this file assumed
 * (unusedValidTime, locationNetworkList), and reading a missing array key emits
 * a PHP warning which, during an AJAX sync, is printed into the response body
 * and breaks the JSON the admin page is waiting for.
 */
class ProductDescriptionGenerator {

    public function generateShortDescription($package) {
        $locationName = $this->getLocationDisplayName($package);
        $dataLabel = $this->dataLabel($package);
        $days = isset($package['duration']) ? (int) $package['duration'] : 0;

        $items = array();
        $items[] = '<strong>' . esc_html($locationName) . ' eSIM Data</strong>';

        if ($dataLabel !== '') {
            if (!empty($package['is_unlimited'])) {
                $items[] = esc_html($dataLabel) . ' data, renewed every day';
            } else {
                $items[] = esc_html($dataLabel) . ' of data';
            }
        }
        if ($days > 0) {
            $items[] = esc_html($days . ' ' . _n('day', 'days', $days, 'esim-woocommerce-integration')) . ' validity';
        }

        $items[] = 'Works on all unlocked eSIM supporting devices';
        $items[] = 'Instant delivery of QR code';
        $items[] = 'Shareable hot spot';
        $items[] = 'Full high-speed data, no throttle';

        $html = '<div class="woocommerce-product-details__short-description"><ul>';
        foreach ($items as $item) {
            $html .= '<li>' . $item . '</li>';
        }
        $html .= '</ul></div>';

        return $html;
    }

    public function generateProductDescription($package) {
        $locationName = $this->getLocationDisplayName($package);

        $description = '<div class="product-description modern-style" style="font-family: Arial, sans-serif; color: #333;">';
        $description .= '<h2 style="color: #2c3e50; margin-bottom: 20px;">' . esc_html($locationName) . ' eSIM Data</h2>';

        $item_style = 'background-color: #d8f3ed; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
        $grid_style = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;';
        $heading_style = 'color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-top: 30px;';

        // Basic information
        $description .= '<section class="basic-info" style="margin-bottom: 20px;">';
        $description .= '<h3 style="' . $heading_style . '">Basic Information</h3>';
        $description .= '<div class="info-grid" style="' . $grid_style . '">';
        $description .= '<div class="info-item" style="' . $item_style . '"><strong>Package Name:</strong> ' . esc_html($this->value($package, 'name')) . '</div>';
        $description .= '</div></section>';

        // Data and duration
        $dataLabel = $this->dataLabel($package);
        $days = isset($package['duration']) ? (int) $package['duration'] : 0;

        $description .= '<section class="data-duration" style="margin-bottom: 20px;">';
        $description .= '<h3 style="' . $heading_style . '">Data and Duration</h3>';
        $description .= '<div class="info-grid" style="' . $grid_style . '">';

        if ($dataLabel !== '') {
            $label = !empty($package['is_unlimited']) ? 'Data' : 'Data Volume';
            $description .= '<div class="info-item" style="' . $item_style . '"><strong>' . $label . ':</strong> ' . esc_html($dataLabel) . '</div>';
        }
        if ($days > 0) {
            $unit = $this->value($package, 'durationUnit', 'Day');
            $description .= '<div class="info-item" style="' . $item_style . '"><strong>Duration:</strong> ' . esc_html($days . ' ' . $unit . ($days === 1 ? '' : 's')) . '</div>';
        }
        if (!empty($package['is_unlimited'])) {
            $description .= '<div class="info-item" style="' . $item_style . '"><strong>Allowance:</strong> renewed every day for the whole validity period</div>';
        }

        $description .= '</div></section>';

        // Network information
        $speed = trim((string) $this->value($package, 'speed'));
        if ($speed !== '') {
            if (strpos($speed, '5G') === false) {
                $speed .= '/5G';
            }
            $description .= '<section class="network-info" style="margin-bottom: 20px;">';
            $description .= '<h3 style="' . $heading_style . '">Network Information</h3>';
            $description .= '<div class="info-grid" style="' . $grid_style . '">';
            $description .= '<div class="info-item" style="' . $item_style . '"><strong>Speed:</strong> ' . esc_html($speed) . '</div>';
            $description .= '</div></section>';
        }

        // Supported countries
        $countries = $this->countryCodes($package);
        if (count($countries) > 1) {
            $description .= '<section class="supported-countries" style="margin-bottom: 20px;">';
            $description .= '<h3 style="' . $heading_style . '">Supported Countries</h3>';
            $description .= '<div class="country-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; margin-top: 15px; max-height: 320px; overflow: auto;">';

            foreach ($countries as $country_code) {
                $code = strtolower(trim($country_code));
                // Flags only exist for two-letter ISO codes; region codes such as
                // "EU-30" would render as a broken image.
                if (!preg_match('/^[a-z]{2}$/', $code)) {
                    continue;
                }
                $country_name = $this->getCountryName($code);
                $description .= '<div class="country-item" style="text-align: center;">'
                    . '<img src="' . esc_url("https://flagcdn.com/w40/{$code}.png") . '"'
                    . ' srcset="' . esc_url("https://flagcdn.com/w80/{$code}.png") . ' 2x"'
                    . ' width="40" loading="lazy" alt="' . esc_attr($country_name) . ' Flag"'
                    . ' title="' . esc_attr($country_name) . '" style="display: block; margin: 0 auto 5px;">'
                    . '<span style="font-size: 0.9em;">' . esc_html($country_name) . '</span>'
                    . '</div>';
            }

            $description .= '</div></section>';
        }

        // Supported networks. The platform calls this operator_list; the old
        // locationNetworkList key is still accepted.
        $operators = array();
        if (!empty($package['operator_list']) && is_array($package['operator_list'])) {
            $operators = $this->normaliseOperators($package['operator_list']);
        } elseif (!empty($package['locationNetworkList']) && is_array($package['locationNetworkList'])) {
            $operators = $this->flattenLegacyNetworkList($package['locationNetworkList']);
        }

        if (!empty($operators)) {
            $description .= '<section class="supported-networks" style="margin-bottom: 20px;">';
            $description .= '<h3 style="' . $heading_style . '">Supported Networks</h3>';
            $description .= '<div class="table-container" style="overflow-x: auto; margin-top: 15px; max-height: 320px; overflow: auto;">';
            $description .= '<table class="network-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="background-color: #f2f2f2;">'
                . '<th style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">Country</th>'
                . '<th style="border: 1px solid #e0e0e0; padding: 10px; text-align: left;">Operator</th>'
                . '</tr></thead><tbody>';

            foreach ($operators as $operator) {
                if (!is_array($operator)) {
                    continue;
                }
                $location_code = '';
                foreach (array('locationCode', 'location_code', 'countryCode') as $field) {
                    if (!empty($operator[$field])) {
                        $location_code = strtoupper($operator[$field]);
                        break;
                    }
                }
                $operator_name = '';
                foreach (array('operatorName', 'operator_name', 'name') as $field) {
                    if (!empty($operator[$field])) {
                        $operator_name = $operator[$field];
                        break;
                    }
                }
                if ($operator_name === '') {
                    continue;
                }
                if (!empty($operator['networkType'])) {
                    $operator_name .= ' (' . $operator['networkType'] . ')';
                }

                $description .= '<tr>'
                    . '<td style="border: 1px solid #e0e0e0; padding: 10px;">' . esc_html($location_code !== '' ? $this->getCountryName($location_code) : '-') . '</td>'
                    . '<td style="border: 1px solid #e0e0e0; padding: 10px;">' . esc_html($operator_name) . '</td>'
                    . '</tr>';
            }

            $description .= '</tbody></table></div></section>';
        }

        $description .= '</div>';

        return $description;
    }

    /* ------------------------------------------------------------------ */

    private function value($package, $key, $default = '') {
        return (isset($package[$key]) && $package[$key] !== null) ? $package[$key] : $default;
    }

    /**
     * "Unlimited" for a daily-reset plan, otherwise the volume in GB/MB.
     */
    private function dataLabel($package) {
        if (class_exists('ProductService') && method_exists('ProductService', 'dataLabel')) {
            return ProductService::dataLabel($package);
        }

        if (!empty($package['data_display'])) {
            return (string) $package['data_display'];
        }
        if (!empty($package['is_unlimited'])) {
            return 'Unlimited';
        }

        $mb = isset($package['data_volume_mb'])
            ? (float) $package['data_volume_mb']
            : (isset($package['volume']) ? ((float) $package['volume']) / (1024 * 1024) : 0);

        if ($mb <= 0) {
            return '';
        }
        if ($mb < 1024) {
            return round($mb) . ' MB';
        }

        $gb = $mb / 1024;
        return (floor($gb) == $gb ? (string) (int) $gb : number_format($gb, 1)) . ' GB';
    }

    private function countryCodes($package) {
        $location = $this->value($package, 'location');
        if ($location === '' || !is_string($location)) {
            return array();
        }
        return array_filter(array_map('trim', explode(',', $location)));
    }

    /**
     * operator_list comes back in two shapes: a flat list of operators, and the
     * nested per-country shape the live API actually returns
     * ([{locationCode, locationName, operatorList: [...]}]).
     */
    private function normaliseOperators($list) {
        $nested = false;
        foreach ($list as $entry) {
            if (is_array($entry) && isset($entry['operatorList'])) {
                $nested = true;
                break;
            }
        }

        return $nested ? $this->flattenLegacyNetworkList($list) : $list;
    }

    private function flattenLegacyNetworkList($list) {
        $flat = array();
        foreach ($list as $location) {
            if (empty($location['operatorList']) || !is_array($location['operatorList'])) {
                continue;
            }
            foreach ($location['operatorList'] as $operator) {
                $operator['locationCode'] = isset($location['locationCode']) ? $location['locationCode'] : '';
                $flat[] = $operator;
            }
        }
        return $flat;
    }

    /**
     * Display-friendly location name for the plan.
     */
    private function getLocationDisplayName($package) {
        $name = (string) $this->value($package, 'name');
        $countries = $this->countryCodes($package);

        $special_regions = array(
            'South America', 'Caribbean', 'Australia & New Zealand', 'Asia',
            'Middle East', 'Gulf Region', 'Global', 'Africa', 'China', 'Europe',
            'North America', 'Singapore & Malaysia & Thailand', 'China mainland & Japan & South Korea',
        );

        foreach ($special_regions as $region) {
            if ($name !== '' && stripos($name, $region) === 0) {
                $package_parts = explode(' ', $name);
                $region_name = '';
                foreach ($package_parts as $part) {
                    $region_name .= ' ' . $part;
                    if (is_numeric($part) || preg_match('/^\d+GB$/i', $part)) {
                        break;
                    }
                }
                return trim($region_name);
            }
        }

        if (count($countries) !== 1) {
            return $name;
        }

        return $this->getCountryName($countries[0]);
    }

    private function getCountryName($country_code) {
        if (!class_exists('WC_Countries')) {
            return $country_code;
        }
        $countries = new WC_Countries();
        $code = strtoupper($country_code);
        return isset($countries->countries[$code]) ? $countries->countries[$code] : $country_code;
    }
}
