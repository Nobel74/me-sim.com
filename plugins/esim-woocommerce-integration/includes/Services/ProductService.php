<?php

use ESIMWooCommerce\Utils\Logger;

class ProductService {
    private $logger;
    private $priceCalculator;
    private $descriptionGenerator;

    // Add caches to reduce database queries
    private $category_term_cache = [];
    private $tag_term_cache = [];

    public function __construct($logger, $priceCalculator, $descriptionGenerator) {
        $this->logger = $logger;
        $this->priceCalculator = $priceCalculator;
        $this->descriptionGenerator = $descriptionGenerator;
    }

    /**
     * Preload taxonomy terms to reduce database queries during sync
     */
    public function preloadTaxonomyTerms() {
        $this->logger->log("Preloading taxonomy terms for performance optimization");
        
        // Get all product categories
        $categories = get_terms([
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
        ]);
        
        if (!is_wp_error($categories)) {
            foreach ($categories as $term) {
                $this->category_term_cache[$term->name] = $term->term_id;
            }
            $this->logger->log("Preloaded " . count($this->category_term_cache) . " product categories");
        }
        
        // Get all product tags
        $tags = get_terms([
            'taxonomy' => 'product_tag',
            'hide_empty' => false,
        ]);
        
        if (!is_wp_error($tags)) {
            foreach ($tags as $term) {
                $this->tag_term_cache[$term->name] = $term->term_id;
            }
            $this->logger->log("Preloaded " . count($this->tag_term_cache) . " product tags");
        }
    }

    public function createOrUpdateProduct($package, $current_product_id = null) {
        // Try to reuse product object if we already know it exists
        $product_id = $current_product_id ?: $this->getProductIdByPackageCode($package['packageCode']);
        
        // If not found by code, try to find by name to prevent duplicates
        if (!$product_id) {
            $found_id = $this->getProductIdByName($package['name']);
            if ($found_id) {
                // Check if this found product already has a package code
                $existing_code = get_post_meta($found_id, '_esim_package_code', true);
                
                // If it has a code and it's different, it's a collision (same name, different product)
                // In this case, we should NOT update it, but create a new one
                if ($existing_code && $existing_code !== $package['packageCode']) {
                    $this->logger->log("Name collision detected. Product '$found_id' has name '{$package['name']}' but code '$existing_code' (expected '{$package['packageCode']}'). Creating new product.");
                } else {
                    $product_id = $found_id;
                    $this->logger->log("Found existing product by name: {$package['name']} (ID: $product_id). Updating instead of creating new.");
                }
            }
        }

        // Create or update the product object
        if (!$product_id) {
            $product = new WC_Product_Simple();
            $status = 'created';
        } else {
            $product = wc_get_product($product_id);
            $status = 'updated';
        }

        $this->logger->log("Processing package: " . json_encode($package));

        // Check if the package is for Europe and update the name accordingly
        $is_europe = stripos($package['name'], 'europe') !== false;

        if ($is_europe) {
            if (!str_contains($package['name'], '(30+ areas)')) {
                // Append "(35+ areas)" if it's not already there
                $package['name'] = trim($package['name']) . ' (35+ areas)';
            }
        }

        // Set the product name
        $product->set_name($package['name']);
        
        // Optimize SEO: Prefix slug with 'esim-'
        $slug = 'esim-' . sanitize_title($package['name']);
        $product->set_slug($slug);

        $product->set_status('publish');
        $product->update_meta_data('_esim_package_code', $package['packageCode']);
        $product->update_meta_data('_esim_plan_id', $package['id']);
        $product->update_meta_data('_is_esim_product', 'yes');
        $product->update_meta_data('_esim_sync_product', 'yes');

        // Generate SKU
        $sku = $this->generateSku($package);
        $product->set_sku($sku);

        // Set product price
        $original_price = $package['price'];
        $country = $package['location'];
        $final_price = $this->priceCalculator->calculatePrice($original_price, $country, $product_id);

        // Actually set the price on the product
        $product->set_regular_price(strval($final_price));
        $product->set_price(strval($final_price)); // Also set the active price

        // Set categories, tags, and attributes
        $categories = ['eSIM', 'Single'];
        $product->set_category_ids($this->getOrCreateCategoryIds($categories));
        $tags = $this->generateTags($package);
        $product->set_tag_ids($this->getOrCreateTagIds($tags));
        $this->setProductAttributes($product, $package);

        // Set product descriptions
        $product->set_short_description($this->descriptionGenerator->generateShortDescription($package));
        $product->set_description($this->descriptionGenerator->generateProductDescription($package));

        // Add minor optimization: disable WordPress post revision system temporarily
        add_filter('wp_revisions_to_keep', '__return_zero', 100, 2);
        
        // Assign product image
        $this->assignProductImage($product, $package);
        
        try {
            $product_id = $product->save();
            
            // Re-enable revisions
            remove_filter('wp_revisions_to_keep', '__return_zero', 100);
            
            if (!$product_id) {
                throw new Exception('Failed to save product');
            }
            
            $this->logger->log("Product saved successfully. ID: {$product_id}, Name: {$package['name']}, Price: {$final_price}, SKU: {$sku}");
            return array('status' => $status, 'product_id' => $product_id);
        } catch (Exception $e) {
            // Re-enable revisions in case of error
            remove_filter('wp_revisions_to_keep', '__return_zero', 100);
            $this->logger->log('Error saving product: ' . $e->getMessage());
            throw new Exception('Error saving product: ' . $e->getMessage());
        }
    }

    private function generateSku($package) {
        $days = $package['duration'];
        $volume_gb = number_format($package['volume'] / (1024 * 1024 * 1024), 0);
        $package_code = strtolower($package['packageCode']);

        // Check if there are multiple countries in the location
        $countries = explode(',', $package['location']);
        if (count($countries) > 1) {
            // Use the package name as the base for SKU
            $sku_base = strtolower(trim($package['name']));
            $sku_base = preg_replace('/[^a-z0-9]+/', '_', $sku_base); // Ensure valid characters for SKU
        } else {
            // Use the country code as the base for SKU
            $sku_base = strtolower(trim($package['location']));
        }

        $sku = "{$sku_base}_{$volume_gb}_{$days}";

        // Check for duplicate SKU - append package code to ensure uniqueness
        $existing_product_id = wc_get_product_id_by_sku($sku);
        if ($existing_product_id) {
            // Check if the existing product is the same package (same package code)
            $existing_package_code = get_post_meta($existing_product_id, '_esim_package_code', true);

            if ($existing_package_code === $package['packageCode']) {
                // Same package, reuse the SKU
                $this->logger->log("SKU {$sku} belongs to the same package, reusing.");
                return $sku;
            }

            // Different package with same location/volume/duration - append package code for uniqueness
            $this->logger->log("Duplicate SKU detected: {$sku}. Appending package code for uniqueness.");
            $sku = "{$sku_base}_{$volume_gb}_{$days}_{$package_code}";
        }

        return $sku;
    }

    private function generateTags($package) {
        $tags = [];

        // Extract countries from package location
        if (isset($package['location'])) {
            $countries = explode(',', $package['location']);
            foreach ($countries as $country_code) {
                $country_code = trim($country_code);
                $country_name = $this->getCountryName($country_code);
                $tags[] = strtolower($country_name);
            }
        }

        // Add default tags
        $tags[] = 'esim';
        $tags[] = 'strongesim';
        $tags[] = 'strongesim.com';

        return $tags;
    }

    private function getOrCreateTagIds($tags) {
        $tag_ids = [];
        
        // Use cache for better performance
        foreach ($tags as $tag) {
            if (isset($this->tag_term_cache[$tag])) {
                $tag_ids[] = $this->tag_term_cache[$tag];
            } else {
                $term = get_term_by('name', $tag, 'product_tag');
                if (!$term) {
                    $term = wp_insert_term($tag, 'product_tag');
                    if (!is_wp_error($term)) {
                        $this->tag_term_cache[$tag] = $term['term_id'];
                        $tag_ids[] = $term['term_id'];
                    }
                } else {
                    $this->tag_term_cache[$tag] = $term->term_id;
                    $tag_ids[] = $term->term_id;
                }
            }
        }
        
        return $tag_ids;
    }

    private function getOrCreateCategoryIds($categories) {
        $category_ids = [];
        
        // Use cache for better performance
        foreach ($categories as $category) {
            if (isset($this->category_term_cache[$category])) {
                $category_ids[] = $this->category_term_cache[$category];
            } else {
                $term = get_term_by('name', $category, 'product_cat');
                if (!$term) {
                    $term = wp_insert_term($category, 'product_cat');
                    if (!is_wp_error($term)) {
                        $this->category_term_cache[$category] = $term['term_id'];
                        $category_ids[] = $term['term_id'];
                    }
                } else {
                    $this->category_term_cache[$category] = $term->term_id;
                    $category_ids[] = $term->term_id;
                }
            }
        }
        
        return $category_ids;
    }

    /**
     * Get all eSIM products from WooCommerce
     *
     * @return array Array of product IDs and their package codes
     */
    public function getAllEsimProducts() {
        $products = wc_get_products(array(
            'meta_key'   => '_is_esim_product',
            'meta_value' => 'yes',
            'limit'      => -1,
        ));
        $esim_products = [];
        foreach ($products as $product) {
            $code = $product->get_meta('_esim_package_code', true);
            if ($code) {
                if (!isset($esim_products[$code])) {
                    $esim_products[$code] = [];
                }
                $esim_products[$code][] = $product->get_id();
            }
        }
        return $esim_products;
    }

    /**
     * Delete a WooCommerce product
     *
     * @param int $product_id The product ID to delete
     * @return bool True on success, false on failure
     */
    public function deleteProduct($product_id) {
        try {
            $this->logger->log("Deleting product ID: {$product_id}");
            $product = wc_get_product($product_id);
            if ($product) {
                $result = $product->delete(true);
                $this->logger->log("Product deleted. Result: " . ($result ? "Success" : "Failed"));
                return $result;
            }
            return false;
        } catch (Exception $e) {
            $this->logger->log("Error deleting product: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Add a product to a country category, ensuring it's only in its specific category
     *
     * @param int $product_id The product ID to add to the category
     * @param string $country_code The country code
     */
    public function addProductToCountryCategory($product_id, $country_code) {
        require_once(plugin_dir_path(__FILE__) . '../Utils/CountryHelper.php');
        
        // Skip for empty or invalid country codes
        if (empty($country_code) || $country_code === '!GL') {
            // For global products with !GL code, assign to Global category
            if ($country_code === '!GL') {
                $this->assignToContinent($product_id, 'Global');
            }
            return;
        }

        $product = wc_get_product($product_id);
        if (!$product) {
            $this->logger->log("Product not found for ID: {$product_id}");
            return;
        }

        // Get if this is a region/global product or a single country
        $is_region = $this->isRegionCode($country_code);
        $country_name = CountryHelper::getFullCountryName($country_code);
        
        $this->logger->log("Adding product {$product_id} to category: {$country_name} (is region: " . ($is_region ? 'Yes' : 'No') . ")");

        // Get or create the specific category for this country/region
        $category_id = $this->getOrCreateCategory($country_name);
        if (!$category_id) {
            $this->logger->log("Failed to create/get category for: {$country_name}");
            return;
        }

        // REMOVED: Don't assign individual countries to continent categories
        // We'll only assign continent categories in ProductSyncManager for packages
        // that explicitly mention the continent in their name

        // Get all category terms to find which ones to remove
        $category_terms = get_terms([
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
        ]);
        
        // Define categories to keep (always keep eSIM and Single categories)
        $categories_to_keep = ['eSIM', 'Single'];
        $categories_to_keep[] = $country_name;
        
        // Get current product categories
        $current_categories = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'all']);
        $new_category_ids = [];
        
        // Keep only the desired categories
        foreach ($current_categories as $term) {
            if (in_array($term->name, $categories_to_keep) || $term->term_id == $category_id) {
                $new_category_ids[] = $term->term_id;
            } else {
                // Check if it's a country/region category that should be removed
                $is_country_category = $this->isCountryRegionCategory($term->name, $category_terms);
                if (!$is_country_category) {
                    $new_category_ids[] = $term->term_id;
                } else {
                    $this->logger->log("Removing product {$product_id} from category: {$term->name}");
                }
            }
        }
        
        // Add the specific country/region category if not already included
        if (!in_array($category_id, $new_category_ids)) {
            $new_category_ids[] = $category_id;
        }
        
        // Set the new categories
        wp_set_object_terms($product_id, $new_category_ids, 'product_cat');
        $this->logger->log("Updated product {$product_id} categories, assigned to: {$country_name} (ID: {$category_id})");
    }
    
    /**
     * Assign a product to a continent category
     * 
     * @param int $product_id Product ID
     * @param string $continent Continent name
     */
    public function assignToContinent($product_id, $continent) {
        // Skip if no continent provided
        if (empty($continent)) {
            return;
        }
        
        $this->logger->log("Assigning product {$product_id} to continent: {$continent}");
        
        // Get or create the continent category
        $continent_cat_id = $this->getOrCreateCategory($continent);
        if (!$continent_cat_id) {
            $this->logger->log("Failed to create/get category for continent: {$continent}");
            return;
        }
        
        // Get current categories for the product
        $current_cat_ids = wp_get_object_terms($product_id, 'product_cat', ['fields' => 'ids']);
        
        // Add continent category if not already assigned
        if (!in_array($continent_cat_id, $current_cat_ids)) {
            $current_cat_ids[] = $continent_cat_id;
            wp_set_object_terms($product_id, $current_cat_ids, 'product_cat');
            $this->logger->log("Added product {$product_id} to continent category: {$continent}");
        }
    }
    
    /**
     * Ensure a regional product is only assigned to its specific continent category
     * and remove it from any individual country categories
     * 
     * @param int $product_id Product ID
     * @param string $continent Continent name
     * @return void
     */
    public function ensureOnlyContinentCategory($product_id, $continent) {
        $this->logger->log("Ensuring product {$product_id} is only assigned to continent: {$continent}");
        
        // Standard categories to keep
        $categories_to_keep = ['eSIM', 'Single', $continent];
        
        // Get all category terms
        $category_terms = get_terms([
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
        ]);
        
        // Get current product categories
        $current_categories = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'all']);
        $new_category_ids = [];
        
        // Get continent category ID
        $continent_cat_id = 0;
        foreach ($current_categories as $term) {
            if ($term->name === $continent) {
                $continent_cat_id = $term->term_id;
                break;
            }
        }
        
        // If we couldn't find the continent category, create it
        if (!$continent_cat_id) {
            $continent_cat_id = $this->getOrCreateCategory($continent);
        }
        
        // Keep only the base categories and continent category
        foreach ($current_categories as $term) {
            if (in_array($term->name, $categories_to_keep)) {
                $new_category_ids[] = $term->term_id;
            } else {
                // Check if it's a country/region category that should be removed
                $is_country_category = $this->isCountryRegionCategory($term->name, $category_terms);
                if (!$is_country_category) {
                    $new_category_ids[] = $term->term_id;
                } else {
                    $this->logger->log("Removing product {$product_id} from category: {$term->name}");
                }
            }
        }
        
        // Add the continent category if not already included
        if (!in_array($continent_cat_id, $new_category_ids)) {
            $new_category_ids[] = $continent_cat_id;
        }
        
        // Set the new categories
        wp_set_object_terms($product_id, $new_category_ids, 'product_cat');
        $this->logger->log("Updated product {$product_id} categories, assigned only to: {$continent}");
    }
    
    /**
     * Check if a given code is for a region rather than a single country
     *
     * @param string $code Code to check
     * @return bool True if it's a region code
     */
    private function isRegionCode($code) {
        // Check if the code matches common region patterns
        return 
            strpos($code, '-') !== false || // Contains hyphen (e.g., EU-30, AS-7)
            strpos($code, 'GL') === 0 ||    // Global codes
            strpos($code, 'EU') === 0 ||    // Europe codes 
            strpos($code, 'AS') === 0 ||    // Asia codes
            strpos($code, 'ME') === 0 ||    // Middle East codes
            strpos($code, 'AF') === 0 ||    // Africa codes
            strpos($code, 'NA') === 0 ||    // North America codes
            strpos($code, 'SA') === 0 ||    // South America codes
            strpos($code, 'CB') === 0 ||    // Caribbean codes
            $code === 'CNJPKR' ||           // China, Japan, Korea
            $code === 'CNJPKR-3' ||         // China, Japan, Korea
            $code === 'SGMYTH' ||           // Singapore, Malaysia, Thailand
            $code === 'AUNZ';               // Australia & New Zealand
    }
    
    /**
     * Check if a term name represents a country or region category
     * 
     * @param string $term_name The term name to check
     * @param array $all_terms All available terms
     * @return bool True if it's a country/region category
     */
    private function isCountryRegionCategory($term_name, $all_terms) {
        // Standard categories that are not country/region specific
        $standard_categories = ['eSIM', 'Single', 'Featured', 'Popular', 'Best Sellers', 'New Arrivals'];
        
        if (in_array($term_name, $standard_categories)) {
            return false;
        }
        
        // Continent/region categories we should consider as region categories
        $continent_categories = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 
                                'Caribbean', 'Middle East', 'Global', 'Oceania'];
        
        if (in_array($term_name, $continent_categories)) {
            return true;
        }
        
        // Check if the term name matches any country name from WC_Countries
        $wc_countries = new WC_Countries();
        foreach ($wc_countries->countries as $country_code => $country_name) {
            if ($term_name === $country_name) {
                return true;
            }
        }
        
        // Check if the term name contains region keywords
        $region_keywords = ['Europe', 'Asia', 'Africa', 'America', 'Caribbean', 'Global', 
                           'Middle East', 'Gulf', 'Pacific', 'Islands'];
        foreach ($region_keywords as $keyword) {
            if (strpos($term_name, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get or create a category by name
     *
     * @param string $category_name The category name
     * @return int|false The category ID or false on failure
     */
    private function getOrCreateCategory($category_name) {
        $term = get_term_by('name', $category_name, 'product_cat');
        
        if ($term) {
            return $term->term_id;
        }
        
        // Create the category
        $result = wp_insert_term($category_name, 'product_cat', [
            'description' => "eSIM data for {$category_name}",
            'slug' => sanitize_title($category_name)
        ]);
        
        if (is_wp_error($result)) {
            $this->logger->log("Error creating category: " . $result->get_error_message());
            return false;
        }
        
        // If it's a continent category, create custom sorting order
        if (in_array($category_name, ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Caribbean', 'Middle East', 'Global', 'Oceania'])) {
            // Set menu order for continents to appear at top
            update_term_meta($result['term_id'], 'order', 1);
        }
        
        return $result['term_id'];
    }

    private function getCountryName($country_code) {
        // Use WooCommerce Countries utility to get the full country name
        $countries = new WC_Countries();
        $country_name = isset($countries->countries[strtoupper($country_code)]) ? $countries->countries[strtoupper($country_code)] : $country_code;
        return $country_name;
    }

    private function setProductAttributes($product, $package) {
        $attributes = array();

        if (isset($package['duration']) && isset($package['durationUnit'])) {
            $attr_duration = new WC_Product_Attribute();
            $attr_duration->set_name('Duration');
            $attr_duration->set_options(array($package['duration'] . ' ' . $package['durationUnit']));
            $attr_duration->set_visible(true);
            $attributes['duration'] = $attr_duration;
        }

        if (isset($package['volume'])) {
            $volume_in_gb = number_format($package['volume'] / (1024 * 1024 * 1024), 2) . ' GB';
            $attr_volume = new WC_Product_Attribute();
            $attr_volume->set_name('Data Volume');
            $attr_volume->set_options(array($volume_in_gb));
            $attr_volume->set_visible(true);
            $attributes['data_volume'] = $attr_volume;
        }

        if (isset($package['speed'])) {
            $attr_speed = new WC_Product_Attribute();
            $attr_speed->set_name('Speed');
            $attr_speed->set_options(array($package['speed']));
            $attr_speed->set_visible(true);
            $attributes['speed'] = $attr_speed;
        }

        $product->set_attributes($attributes);
    }

    public function getProductIdByPackageCode($package_code) {
        $products = wc_get_products(array(
            'meta_key' => '_esim_package_code',
            'meta_value' => $package_code,
            'limit' => 1,
        ));
        return !empty($products) ? $products[0]->get_id() : false;
    }

    /**
     * Get product ID by product name
     * Used to prevent duplicates when package code changes but name stays same
     * 
     * @param string $name Product name
     * @return int|false Product ID or false
     */
    public function getProductIdByName($name) {
        $product =  wc_get_product_id_by_sku($name); // Often SKU is not name, so we need a query
        
        // Use a direct query for exact title match to be safe and fast
        global $wpdb;
        $product_id = $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM $wpdb->posts WHERE post_type = 'product' AND post_title = %s AND post_status IN ('publish', 'private') LIMIT 1",
            $name
        ));
        
        return $product_id ?: false;
    }

    public function batchUpdateProducts($batch_data) {
        $url = get_home_url() . '/wp-json/wc/v3/products/batch';
        $consumer_key = get_option('woocommerce_api_consumer_key');
        $consumer_secret = get_option('woocommerce_api_consumer_secret');

        // Check if consumer_key and consumer_secret are available
        if (!$consumer_key || !$consumer_secret) {
            $this->logger->log('WooCommerce API credentials are missing. Please make sure to set the Consumer Key and Consumer Secret in WooCommerce settings.');
            return array('error' => 'WooCommerce API credentials are missing.');
        }

        $args = array(
            'body' => json_encode($batch_data),
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Basic ' . base64_encode($consumer_key . ':' . $consumer_secret),
            ),
            'method' => 'POST',
        );

        // Check if the URL is valid
        if (empty($url)) {
            $this->logger->log('WooCommerce API Error: No valid URL specified.');
            return array('error' => 'No valid URL specified for WooCommerce API.');
        }

        $response = wp_remote_post($url, $args);
        if (is_wp_error($response)) {
            $this->logger->log('WooCommerce API Batch Error: ' . $response->get_error_message());
            return array('error' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Analyze package name to detect regions
     *
     * @param array $package The package data
     * @return array Array of detected regions/continents
     */
    private function detectRegionsFromPackage($package) {
        $regions = [];
        $name = strtolower($package['name']);
        
        // Check for continent/region names in the package title
        $region_keywords = [
            'europe' => 'Europe',
            'asia' => 'Asia',
            'africa' => 'Africa',
            'north america' => 'North America', 
            'south america' => 'South America',
            'caribbean' => 'Caribbean',
            'middle east' => 'Middle East',
            'global' => 'Global',
            'australia & new zealand' => 'Oceania',
            'china' => 'Asia',
            'japan' => 'Asia',
            'korea' => 'Asia',
            'singapore' => 'Asia',
            'malaysia' => 'Asia',
            'thailand' => 'Asia',
            'gulf region' => 'Middle East'
        ];
        
        foreach ($region_keywords as $keyword => $region) {
            if (strpos($name, $keyword) !== false) {
                $regions[] = $region;
            }
        }
        
        return $regions;
    }

    /**
     * Assign an image to the product based on the country/region
     *
     * @param WC_Product $product The product object
     * @param array $package The package data
     */
    private function assignProductImage($product, $package) {
        // Check if auto image upload is enabled
        if (get_option('esim_auto_image_upload', 'yes') !== 'yes') {
            return;
        }

        // Skip if product already has an image
        if ($product->get_image_id()) {
            return;
        }

        // Determine the search terms
        $search_terms = [];

        // 1. Check if this is a regional product and prioritize region names
        $package_name_lower = strtolower($package['name']);
        $detected_region = null;

        $region_keywords = [
            'europe' => 'europe',
            'asia' => 'asia',
            'africa' => 'africa',
            'north america' => 'north-america',
            'south america' => 'south-america',
            'caribbean' => 'caribbean',
            'middle east' => 'middle-east',
            'gulf region' => 'middle-east',
            'global' => 'global',
            'oceania' => 'oceania',
        ];

        foreach ($region_keywords as $keyword => $region_slug) {
            if (strpos($package_name_lower, $keyword) !== false) {
                $detected_region = $region_slug;
                break;
            }
        }

        // If regional product detected, prioritize region-based images
        if ($detected_region) {
            $this->log("Detected regional product: {$detected_region}");
            $search_terms[] = $detected_region;
            $search_terms[] = $detected_region . '-esim';
        }

        // 2. Try exact package name match
        $search_terms[] = $this->sanitizeFileName($package['name']);

        // 3. Try location based match (Country name) - only for non-regional products
        if (!$detected_region && isset($package['location'])) {
            $countries = explode(',', $package['location']);
            foreach ($countries as $country_code) {
                $country_name = $this->getCountryName(trim($country_code));
                $search_terms[] = $this->sanitizeFileName($country_name);
            }
        }

        // 4. Try variations with 'esim' suffix (for non-region terms)
        $search_terms_with_suffix = [];
        foreach ($search_terms as $term) {
            if (!in_array($term, [$detected_region, $detected_region . '-esim'])) {
                $search_terms_with_suffix[] = $term . '-esim';
            }
        }
        $search_terms = array_merge($search_terms, $search_terms_with_suffix);

        // FIRST: Try to find image in WordPress Media Library
        $attachment_id = $this->searchMediaLibrary($search_terms);

        if ($attachment_id) {
            $product->set_image_id($attachment_id);
            $this->log("Assigned image ID $attachment_id from Media Library to product.");
            return;
        }

        // SECOND: Fall back to CountryPlanImages folder
        $image_folder = dirname(__FILE__, 3) . '/CountryPlanImages/';
        $matched_file = null;

        // Scan directory for matches
        if (is_dir($image_folder)) {
            $files = scandir($image_folder);
            foreach ($search_terms as $term) {
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;

                    // Check if file starts with the term (allows for -1, -2 suffixes)
                    // and is a webp image
                    if (strpos($file, $term) === 0 && pathinfo($file, PATHINFO_EXTENSION) === 'webp') {
                        $matched_file = $file;
                        $this->log("Matched image file: {$matched_file} for search term: {$term}");
                        break 2;
                    }
                }
            }
        }

        if ($matched_file) {
            $image_path = $image_folder . $matched_file;
            $this->log("Found matching image in folder: " . $matched_file);
            $attachment_id = $this->uploadImageToMediaLibrary($image_path, $matched_file);

            if ($attachment_id) {
                $product->set_image_id($attachment_id);
                $this->log("Assigned image ID $attachment_id to product.");
            }
        } else {
            $this->log("No matching image found for product: {$package['name']}. Searched terms: " . implode(', ', $search_terms));
        }
    }

    /**
     * Search WordPress Media Library for images matching search terms
     * Uses EXACT filename matching to prevent false positives
     *
     * @param array $search_terms Array of search terms to match
     * @return int|null Attachment ID if found, null otherwise
     */
    private function searchMediaLibrary($search_terms) {
        // Get all images from media library
        $args = [
            'post_type' => 'attachment',
            'post_mime_type' => 'image',
            'post_status' => 'inherit',
            'posts_per_page' => -1,
            'fields' => 'ids',
        ];

        $attachments = get_posts($args);

        if (empty($attachments)) {
            $this->log("No images found in Media Library");
            return null;
        }

        // Define allowed image extensions
        $allowed_extensions = ['png', 'webp', 'jpg', 'jpeg'];

        // Search for exact matches
        foreach ($search_terms as $term) {
            $term_lower = strtolower($term);

            foreach ($attachments as $attachment_id) {
                $file_path = get_attached_file($attachment_id);

                if (!$file_path) {
                    continue;
                }

                $filename = basename($file_path);
                $filename_lower = strtolower($filename);
                $file_parts = pathinfo($filename_lower);
                $name_without_ext = $file_parts['filename'];
                $extension = isset($file_parts['extension']) ? $file_parts['extension'] : '';

                // Check if extension is allowed
                if (!in_array($extension, $allowed_extensions)) {
                    continue;
                }

                // EXACT MATCH RULES:
                // 1. Exact match: "germany" matches "germany.png"
                // 2. With -esim suffix: "germany" matches "germany-esim.png"
                // 3. Should NOT match: "germany-travel.png" or "germany-countries.jpg"

                $is_exact_match = ($name_without_ext === $term_lower);
                $is_esim_suffix_match = ($name_without_ext === $term_lower . '-esim');

                if ($is_exact_match || $is_esim_suffix_match) {
                    $this->log("Found EXACT match in Media Library: '{$filename}' (ID: {$attachment_id}) for search term: '{$term}'");
                    return $attachment_id;
                }
            }
        }

        $this->log("No exact filename matches found in Media Library for search terms: " . implode(', ', $search_terms));
        return null;
    }

    /**
     * Check if a product needs an image and assign one if missing
     * This is used during sync for skipped products
     *
     * @param int $product_id Product ID
     * @param array $package Package data
     */
    public function checkAndAssignImage($product_id, $package) {
        $product = wc_get_product($product_id);

        if (!$product) {
            return;
        }

        // If product already has an image, skip
        if ($product->get_image_id()) {
            return;
        }

        $this->log("Product ID {$product_id} has no image. Attempting to assign one.");

        // Try to assign an image
        $this->assignProductImage($product, $package);

        // Save the product if an image was assigned
        if ($product->get_image_id()) {
            $product->save();
            $this->log("Image assigned and saved for product ID {$product_id}");
        }
    }

    /**
     * Sanitize string for file matching (lowercase, dashes)
     */
    private function sanitizeFileName($name) {
        $name = strtolower($name);
        $name = preg_replace('/[^a-z0-9]+/', '-', $name);
        $name = trim($name, '-');
        return $name;
    }

    /**
     * Upload image to Media Library or get existing one
     */
    private function uploadImageToMediaLibrary($image_path, $filename) {
        // Check if image already exists in media library by filename
        global $wpdb;
        $attachment_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = '_wp_attached_file' AND meta_value LIKE %s",
            '%' . $filename
        ));

        if ($attachment_id) {
            return $attachment_id;
        }

        // It needs to be uploaded
        $upload_dir = wp_upload_dir();
        $image_data = file_get_contents($image_path);
        
        // Generate unique name for upload dir
        $unique_filename = wp_unique_filename($upload_dir['path'], $filename);
        $file = $upload_dir['path'] . '/' . $unique_filename;
        
        file_put_contents($file, $image_data);

        // Check image file type
        $wp_filetype = wp_check_filetype($filename, null);

        // Attachment attributes
        $attachment = array(
            'guid'           => $upload_dir['url'] . '/' . $unique_filename,
            'post_mime_type' => $wp_filetype['type'],
            'post_title'     => sanitize_file_name($filename),
            'post_content'   => '',
            'post_status'    => 'inherit'
        );

        // Insert attachment
        $attach_id = wp_insert_attachment($attachment, $file);

        // Make sure image.php is loaded
        require_once(ABSPATH . 'wp-admin/includes/image.php');

        // Generate meta data
        $attach_data = wp_generate_attachment_metadata($attach_id, $file);
        wp_update_attachment_metadata($attach_id, $attach_data);

        return $attach_id;
    }

    private function log($message) {
        $this->logger->log($message);
    }
}
