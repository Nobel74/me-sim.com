<?php

class CountryHelper {
    /**
     * Get the full country name from a country code
     * 
     * @param string $country_code The country code (e.g., "CR")
     * @return string The full country name (e.g., "Costa Rica")
     */
    public static function getFullCountryName($country_code) {
        $countries = new WC_Countries();
        $country_name = isset($countries->countries[strtoupper($country_code)]) 
            ? $countries->countries[strtoupper($country_code)] 
            : self::getCountryNameFallback($country_code);
        
        return $country_name;
    }
    
    /**
     * Fallback country name lookup for codes that WooCommerce might not handle
     * 
     * @param string $code The country code
     * @return string The country name or the original code if not found
     */
    private static function getCountryNameFallback($code) {
        $special_cases = [
            // Regions
            'EU' => 'Europe',
            'GL' => 'Global',
            'AS' => 'Asia',
            'AF' => 'Africa',
            'ME' => 'Middle East',
            'CB' => 'Caribbean',
            'SA' => 'South America',
            'NA' => 'North America',
            '!GL' => 'Global',
            
            // Region codes with suffixes
            'AS-7' => 'Asia (7 areas)',
            'AS-12' => 'Asia (12 areas)',
            'AS-20' => 'Asia (20 areas)',
            'AS-20+' => 'Asia (20+ areas)',
            'AS-31' => 'Asia (31 areas)',
            'ASPAC' => 'Asia-Pacific',
            'AF-29' => 'Africa (25+ areas)',
            'EU-30' => 'Europe (30+ areas)',
            'EU-42' => 'Europe (40+ areas)',
            'EU-42-MA' => 'Europe (40+ areas) & Morocco',
            'ME-13' => 'Middle East (13 areas)',
            'ME-6' => 'Gulf Region',
            'GCC-6' => 'GCC (6 areas)',
            'CB-24' => 'Caribbean (20+ areas)',
            'GL-120' => 'Global (120+ areas)',
            'GL-130' => 'Global (130+ areas)',
            'GL-138' => 'Global (138 areas)',
            'GL-139' => 'Global (139 areas)',
            'GL-144' => 'Global (144 areas)',
            'CN-3' => 'China (mainland, HK, Macao)',
            'AUNZ' => 'Australia & New Zealand',
            'BALKANS-5' => 'Balkans (5+ areas)',
            'CENTRALASIA' => 'Central Asia',
            
            // Special groups
            'CNJPKR' => 'China mainland & Japan & South Korea',
            'CNJPKR-3' => 'China mainland & Japan & South Korea',
            'SGMYTH' => 'Singapore & Malaysia & Thailand',
            
            // Territories that might not be in WC_Countries
            'AX' => 'Aaland Islands',
            'GG' => 'Guernsey',
            'IM' => 'Isle of Man',
            'JE' => 'Jersey',
            'GP' => 'Guadeloupe',
            'GU' => 'Guam',
            'MO' => 'Macao (China)',
            'HK' => 'Hong Kong (China)',
            'RE' => 'Reunion',
            'PR' => 'Puerto Rico',
            'XK' => 'Kosovo',
            'PS' => 'Palestine',
            'FO' => 'Faroe Islands',
            
            // Other special cases
            'TRNC' => 'Turkish Republic of Northern Cyprus',
        ];
        
        return isset($special_cases[$code]) ? $special_cases[$code] : $code;
    }

    /**
     * Get the continent for a country/region code
     *
     * @param string $code The country/region code
     * @return string|null The continent name or null if can't determine
     */
    public static function getContinentFromCode($code) {
        // First check for obvious region codes
        $code = strtoupper($code);
        
        // Direct continent codes
        if ($code === 'EU' || strpos($code, 'EU-') === 0) {
            return 'Europe';
        }
        if ($code === 'AS' || strpos($code, 'AS-') === 0 || $code === 'ASPAC') {
            return 'Asia';
        }
        if ($code === 'AF' || strpos($code, 'AF-') === 0) {
            return 'Africa';
        }
        if ($code === 'NA' || strpos($code, 'NA-') === 0) {
            return 'North America';
        }
        if ($code === 'SA' || strpos($code, 'SA-') === 0) {
            return 'South America';
        }
        if ($code === 'ME' || strpos($code, 'ME-') === 0) {
            return 'Middle East';
        }
        if ($code === 'CB' || strpos($code, 'CB-') === 0) {
            return 'Caribbean';
        }
        if ($code === 'GL' || $code === '!GL' || strpos($code, 'GL-') === 0) {
            return 'Global';
        }

        // Special region combinations
        if ($code === 'CNJPKR' || $code === 'CNJPKR-3') {
            return 'Asia';
        }
        if ($code === 'SGMYTH') {
            return 'Asia';
        }
        if ($code === 'AUNZ') {
            return 'Oceania';
        }
        if ($code === 'CN-3') {
            return 'Asia';
        }

        // For regular country codes, use a mapping
        $continents = self::getCountryContinentMap();
        return isset($continents[$code]) ? $continents[$code] : null;
    }

    /**
     * Mapping of country codes to their continents
     *
     * @return array Country code to continent mapping
     */
    private static function getCountryContinentMap() {
        return [
            // Europe
            'AL' => 'Europe', 'AD' => 'Europe', 'AT' => 'Europe', 'BE' => 'Europe', 'BA' => 'Europe',
            'BG' => 'Europe', 'HR' => 'Europe', 'CY' => 'Europe', 'CZ' => 'Europe', 'DK' => 'Europe',
            'EE' => 'Europe', 'FI' => 'Europe', 'FR' => 'Europe', 'DE' => 'Europe', 'GR' => 'Europe',
            'HU' => 'Europe', 'IS' => 'Europe', 'IE' => 'Europe', 'IT' => 'Europe', 'LV' => 'Europe',
            'LI' => 'Europe', 'LT' => 'Europe', 'LU' => 'Europe', 'MT' => 'Europe', 'MC' => 'Europe',
            'ME' => 'Europe', 'NL' => 'Europe', 'MK' => 'Europe', 'NO' => 'Europe', 'PL' => 'Europe',
            'PT' => 'Europe', 'RO' => 'Europe', 'RU' => 'Europe', 'SM' => 'Europe', 'RS' => 'Europe',
            'SK' => 'Europe', 'SI' => 'Europe', 'ES' => 'Europe', 'SE' => 'Europe', 'CH' => 'Europe',
            'GB' => 'Europe', 'UK' => 'Europe', 'VA' => 'Europe', 'AX' => 'Europe', 'GG' => 'Europe',
            'IM' => 'Europe', 'JE' => 'Europe', 'MD' => 'Europe', 'XK' => 'Europe',
            
            // North America
            'CA' => 'North America', 'US' => 'North America', 'MX' => 'North America', 
            'GL' => 'North America', 'BM' => 'North America', 'GU' => 'North America',
            
            // Central America & Caribbean 
            'BZ' => 'Caribbean', 'CR' => 'Caribbean', 'SV' => 'Caribbean', 'GT' => 'Caribbean',
            'HN' => 'Caribbean', 'NI' => 'Caribbean', 'PA' => 'Caribbean', 'BS' => 'Caribbean',
            'BB' => 'Caribbean', 'CU' => 'Caribbean', 'DM' => 'Caribbean', 'DO' => 'Caribbean',
            'HT' => 'Caribbean', 'JM' => 'Caribbean', 'PR' => 'Caribbean', 'KN' => 'Caribbean',
            'LC' => 'Caribbean', 'VC' => 'Caribbean', 'TT' => 'Caribbean', 'GP' => 'Caribbean',
            'TC' => 'Caribbean',
            
            // South America
            'AR' => 'South America', 'BO' => 'South America', 'BR' => 'South America', 'CL' => 'South America',
            'CO' => 'South America', 'EC' => 'South America', 'GF' => 'South America', 'GY' => 'South America',
            'PY' => 'South America', 'PE' => 'South America', 'SR' => 'South America', 'UY' => 'South America',
            'VE' => 'South America',
            
            // Asia
            'AF' => 'Asia', 'AM' => 'Asia', 'AZ' => 'Asia', 'BH' => 'Asia', 'BD' => 'Asia',
            'BT' => 'Asia', 'BN' => 'Asia', 'KH' => 'Asia', 'CN' => 'Asia', 'GE' => 'Asia',
            'HK' => 'Asia', 'IN' => 'Asia', 'ID' => 'Asia', 'IR' => 'Asia', 'IQ' => 'Asia',
            'IL' => 'Asia', 'JP' => 'Asia', 'JO' => 'Asia', 'KZ' => 'Asia', 'KW' => 'Asia',
            'KG' => 'Asia', 'LA' => 'Asia', 'LB' => 'Asia', 'MO' => 'Asia', 'MY' => 'Asia',
            'MV' => 'Asia', 'MN' => 'Asia', 'MM' => 'Asia', 'NP' => 'Asia', 'KP' => 'Asia',
            'OM' => 'Asia', 'PK' => 'Asia', 'PS' => 'Asia', 'PH' => 'Asia', 'QA' => 'Asia',
            'SA' => 'Asia', 'SG' => 'Asia', 'KR' => 'Asia', 'LK' => 'Asia', 'SY' => 'Asia',
            'TW' => 'Asia', 'TJ' => 'Asia', 'TH' => 'Asia', 'TR' => 'Asia', 'TM' => 'Asia',
            'AE' => 'Asia', 'UZ' => 'Asia', 'VN' => 'Asia', 'YE' => 'Asia',
            
            // Africa
            'DZ' => 'Africa', 'AO' => 'Africa', 'BJ' => 'Africa', 'BW' => 'Africa', 'BF' => 'Africa',
            'BI' => 'Africa', 'CM' => 'Africa', 'CV' => 'Africa', 'CF' => 'Africa', 'TD' => 'Africa',
            'KM' => 'Africa', 'CI' => 'Africa', 'CD' => 'Africa', 'DJ' => 'Africa', 'EG' => 'Africa',
            'GQ' => 'Africa', 'ER' => 'Africa', 'ET' => 'Africa', 'GA' => 'Africa', 'GM' => 'Africa',
            'GH' => 'Africa', 'GN' => 'Africa', 'GW' => 'Africa', 'KE' => 'Africa', 'LS' => 'Africa',
            'LR' => 'Africa', 'LY' => 'Africa', 'MG' => 'Africa', 'MW' => 'Africa', 'ML' => 'Africa',
            'MR' => 'Africa', 'MU' => 'Africa', 'MA' => 'Africa', 'MZ' => 'Africa', 'NA' => 'Africa',
            'NE' => 'Africa', 'NG' => 'Africa', 'CG' => 'Africa', 'RE' => 'Africa', 'RW' => 'Africa',
            'ST' => 'Africa', 'SN' => 'Africa', 'SC' => 'Africa', 'SL' => 'Africa', 'SO' => 'Africa',
            'ZA' => 'Africa', 'SS' => 'Africa', 'SD' => 'Africa', 'SZ' => 'Africa', 'TZ' => 'Africa',
            'TG' => 'Africa', 'TN' => 'Africa', 'UG' => 'Africa', 'ZM' => 'Africa', 'ZW' => 'Africa',
            
            // Oceania
            'AU' => 'Oceania', 'FJ' => 'Oceania', 'KI' => 'Oceania', 'MH' => 'Oceania', 
            'FM' => 'Oceania', 'NR' => 'Oceania', 'NZ' => 'Oceania', 'PW' => 'Oceania',
            'PG' => 'Oceania', 'WS' => 'Oceania', 'SB' => 'Oceania', 'TO' => 'Oceania',
            'TV' => 'Oceania', 'VU' => 'Oceania',

            // Middle East (some countries may be listed in both Middle East and Asia)
            'BH' => 'Middle East', 'IR' => 'Middle East', 'IQ' => 'Middle East', 'IL' => 'Middle East',
            'JO' => 'Middle East', 'KW' => 'Middle East', 'LB' => 'Middle East', 'OM' => 'Middle East',
            'QA' => 'Middle East', 'SA' => 'Middle East', 'SY' => 'Middle East', 'TR' => 'Middle East',
            'AE' => 'Middle East', 'YE' => 'Middle East',
        ];
    }
}
