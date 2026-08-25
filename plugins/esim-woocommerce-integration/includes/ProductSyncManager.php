<?php
require_once(plugin_dir_path(__FILE__) . 'Utils/Logger.php');
require_once(plugin_dir_path(__FILE__) . 'Services/PriceCalculator.php');
require_once(plugin_dir_path(__FILE__) . 'Services/ProductDescriptionGenerator.php');
require_once(plugin_dir_path(__FILE__) . 'Api/StrongESIM_API.php');
require_once(plugin_dir_path(__FILE__) . 'Services/ProductService.php');

use ESIMWooCommerce\Utils\Logger;

class ProductSyncManager
{
    private $api_client;
    private $logger;
    private $product_service;
    private $price_calculator;
    private $description_generator;
    private $sync_results;

    private $batch_size = 10; // Process products in batches of 10
    private $sync_start_time;
    private $memory_usage_start;

    // Progress tracking
    const SYNC_PROGRESS_OPTION = 'esim_sync_progress';
    const SYNC_STATUS_OPTION = 'esim_sync_status';

    public function __construct($settings)
    {
        $this->logger = new Logger('eSIM Plugin');

        $email = $settings->get_option('esim_api_email');
        $password = $settings->get_option('esim_api_password');

        $this->api_client = new StrongESIM_API($email, $password, $this->logger);
        $this->price_calculator = new PriceCalculator($settings, $this->logger);
        $this->description_generator = new ProductDescriptionGenerator();
        $this->product_service = new ProductService($this->logger, $this->price_calculator, $this->description_generator);
        
        // Initialize sync results
        $this->sync_results = [
            'created' => 0,
            'updated' => 0,
            'failed' => 0,
        ];
    }

    /**
     * Delete any products that exist in WooCommerce but not in the StrongEsim API
     * Also deletes duplicate products (same package code, multiple products - keeps only one)
     *
     * @param array $existing_product_map Map of package codes to product IDs (after processing, contains duplicates/outdated)
     * @param array $api_package_codes Package codes from the API
     */
    private function deleteOutdatedProducts($existing_product_map, $api_package_codes) {
        $this->logger->log("Checking for outdated and duplicate products to delete");

        // Find package codes that exist in WooCommerce but not in API (outdated products)
        $codes_to_delete = array_diff(array_keys($existing_product_map), $api_package_codes);

        $this->logger->log("Found " . count($codes_to_delete) . " package codes no longer in the API");

        // Delete outdated products (package codes no longer in API)
        foreach ($codes_to_delete as $code) {
            $product_ids = $existing_product_map[$code];
            if (empty($product_ids)) continue;

            $this->logger->log("Deleting outdated products for package code {$code}: " . implode(', ', $product_ids));

            foreach ($product_ids as $pid) {
                $product = wc_get_product($pid);
                if ($product) {
                    $is_sync_product = $product->get_meta('_esim_sync_product');

                    if ($is_sync_product === 'yes') {
                        $this->logger->log("Deleting outdated product ID: {$pid} (package code: {$code})");
                        if ($this->product_service->deleteProduct($pid)) {
                            $this->sync_results['deleted']++;
                        }
                    } else {
                        $this->logger->log("Skipping deletion of product ID: {$pid} - Not marked as sync product");
                    }
                }
            }
        }

        // Delete duplicate products (package codes that ARE in API but have multiple products)
        // After processing, $existing_product_map contains leftover IDs (duplicates)
        $codes_with_duplicates = array_intersect(array_keys($existing_product_map), $api_package_codes);

        foreach ($codes_with_duplicates as $code) {
            $leftover_ids = $existing_product_map[$code];
            if (empty($leftover_ids)) continue;

            $this->logger->log("Found " . count($leftover_ids) . " duplicate product(s) for package code {$code}: " . implode(', ', $leftover_ids));

            foreach ($leftover_ids as $pid) {
                $product = wc_get_product($pid);
                if ($product) {
                    $is_sync_product = $product->get_meta('_esim_sync_product');

                    if ($is_sync_product === 'yes') {
                        $this->logger->log("Deleting duplicate product ID: {$pid} (package code: {$code})");
                        if ($this->product_service->deleteProduct($pid)) {
                            $this->sync_results['deleted']++;
                        }
                    }
                }
            }
        }

        $this->logger->log("Completed deletion of outdated/duplicate products. Total deleted: {$this->sync_results['deleted']}");
    }

    /**
     * Handle adding products to country categories
     *
     * @param int $product_id Product ID
     * @param array $package Package data from StrongEsim
     */
    private function handleCountryCategories($product_id, $package) {
        if (isset($package['location'])) {
            $countries = explode(',', $package['location']);
            
            // Add package to continent category based on name matching
            $package_name = strtolower($package['name']);
            
            // Check for regional package first
            $is_regional_package = false;
            $assigned_continent = null;
            
            // For packages with regional naming patterns
            if (strpos($package_name, 'europe') !== false) {
                $this->product_service->assignToContinent($product_id, 'Europe');
                $is_regional_package = true;
                $assigned_continent = 'Europe';
            } elseif (strpos($package_name, 'asia') !== false) {
                $this->product_service->assignToContinent($product_id, 'Asia');
                $is_regional_package = true;
                $assigned_continent = 'Asia';
            } elseif (strpos($package_name, 'africa') !== false) {
                $this->product_service->assignToContinent($product_id, 'Africa');
                $is_regional_package = true;
                $assigned_continent = 'Africa';
            } elseif (strpos($package_name, 'north america') !== false) {
                $this->product_service->assignToContinent($product_id, 'North America');
                $is_regional_package = true;
                $assigned_continent = 'North America';
            } elseif (strpos($package_name, 'south america') !== false) {
                $this->product_service->assignToContinent($product_id, 'South America');
                $is_regional_package = true;
                $assigned_continent = 'South America';
            } elseif (strpos($package_name, 'caribbean') !== false) {
                $this->product_service->assignToContinent($product_id, 'Caribbean');
                $is_regional_package = true;
                $assigned_continent = 'Caribbean';
            } elseif (strpos($package_name, 'middle east') !== false || strpos($package_name, 'gulf region') !== false) {
                $this->product_service->assignToContinent($product_id, 'Middle East');
                $is_regional_package = true;
                $assigned_continent = 'Middle East';
            } elseif (strpos($package_name, 'global') !== false) {
                $this->product_service->assignToContinent($product_id, 'Global');
                $is_regional_package = true;
                $assigned_continent = 'Global';
            } elseif (strpos($package_name, 'australia') !== false && strpos($package_name, 'new zealand') !== false) {
                $this->product_service->assignToContinent($product_id, 'Oceania');
                $is_regional_package = true;
                $assigned_continent = 'Oceania';
            }
            
            // If this is a regional package, we've already assigned it to the correct continent
            // Skip assigning to individual country categories
            if ($is_regional_package) {
                $this->logger->log("Product {$product_id} is a regional package ({$assigned_continent}). Skipping individual country assignments.");
                
                // If it's a regional package, make sure it's ONLY assigned to the correct continent category
                $this->product_service->ensureOnlyContinentCategory($product_id, $assigned_continent);
                return;
            }
            
            // For non-regional packages, process individual country codes
            foreach ($countries as $country_code) {
                $country_code = trim($country_code);
                if (!empty($country_code)) {
                    $this->product_service->addProductToCountryCategory($product_id, $country_code);
                }
            }
        }
    }

    public function order_profiles($transaction_id, $esim_orders)
    {
        // For StrongESIM, this might need different logic if used directly, 
        // but currently OrderHandler calls createOrder directly on the API client.
        // This wrapper might be legacy or used by other parts. 
        // Let's defer to OrderHandler changes.
        return array('error' => 'Deprecated. Use OrderHandler.');
    }

    public function add_markup_settings($settings)
    {
        return $this->price_calculator->addMarkupSettings($settings);
    }

    private function log_message($message)
    {
        $this->logger->log($message);
    }

    /**
     * Check if a product needs updating by comparing with existing data
     *
     * @param array $package Package data from StrongEsim
     * @param int $product_id Product ID in WooCommerce
     * @return bool True if the product has changed and needs updating
     */
    private function product_has_changed($package, $product_id) {
        // Get basic product data to compare
        $product = wc_get_product($product_id);
        if (!$product) return true;
        
        // Compare name, exclude Europe suffix as we modify it in the process
        $name_match = true;
        if (stripos($package['name'], 'europe') === false) {
            $name_match = ($product->get_name() === $package['name']);
        }
        
        // Compare price (original price converted to our format)
        $original_price = $package['price'];
        $country = $package['location'];
        $calculated_price = $this->price_calculator->calculatePrice($original_price, $country);
        $product_price = $product->get_regular_price();
        $price_match = (abs(floatval($calculated_price) - floatval($product_price)) < 0.01);
        
        // Check if slug starts with 'esim-'
        $slug = $product->get_slug();
        $slug_match = (strpos($slug, 'esim-') === 0);
        
        // If either has changed or slug needs update, the product needs updating
        return !($name_match && $price_match && $slug_match);
    }

    /**
     * Ensure essential meta fields are set for a product
     * This handles cases where a product exists but might be missing new meta fields
     * due to being created by an older version of the plugin or manual creation
     *
     * @param int $product_id Product ID
     * @param array $package Package data from API
     */
    private function ensureEssentialMeta($product_id, $package) {
        $product = wc_get_product($product_id);
        if (!$product) return;
        
        $changes_made = false;
        
        // Check and set package code
        if (!$product->meta_exists('_esim_package_code') || $product->get_meta('_esim_package_code') !== $package['packageCode']) {
            $product->update_meta_data('_esim_package_code', $package['packageCode']);
            $changes_made = true;
        }
        
        // Check and set plan ID
        if (isset($package['id']) && (!$product->meta_exists('_esim_plan_id') || $product->get_meta('_esim_plan_id') != $package['id'])) {
            $product->update_meta_data('_esim_plan_id', $package['id']);
            $changes_made = true;
        }
        
        // Check and set is_esim_product flag
        if (!$product->meta_exists('_is_esim_product') || $product->get_meta('_is_esim_product') !== 'yes') {
            $product->update_meta_data('_is_esim_product', 'yes');
            $changes_made = true;
        }

        // Check and set sync product flag
        if (!$product->meta_exists('_esim_sync_product') || $product->get_meta('_esim_sync_product') !== 'yes') {
            $product->update_meta_data('_esim_sync_product', 'yes');
            $changes_made = true;
        }
        
        if ($changes_made) {
            $product->save();
            $this->logger->log("Updated missing meta for skipped product: {$package['name']} ({$product_id})");
            $this->sync_results['updated']++; // Count as updated since we modified it
            $this->sync_results['skipped']--; // Decrease skipped count
        }
    }

    /**
     * Delete all products that have been synced (marked with _esim_sync_product)
     *
     * @return int Number of deleted products
     */
    public function deleteAllSyncedProducts() {
        $this->logger->log("Starting deletion of ALL synced products...");

        // Get all products with the sync flag
        $products = wc_get_products(array(
            'limit' => -1,
            'meta_key' => '_esim_sync_product',
            'meta_value' => 'yes',
            'return' => 'ids',
        ));

        $count = 0;
        foreach ($products as $product_id) {
            if ($this->product_service->deleteProduct($product_id)) {
                $count++;
            }
        }

        $this->logger->log("Deleted {$count} synced products.");
        return $count;
    }

    /**
     * Save sync progress to database
     */
    private function saveSyncProgress($processed_codes, $results, $total, $last_error = null) {
        $progress = array(
            'processed_codes' => $processed_codes,
            'results' => $results,
            'total' => $total,
            'last_updated' => current_time('mysql'),
            'last_error' => $last_error,
        );
        update_option(self::SYNC_PROGRESS_OPTION, $progress, false);
    }

    /**
     * Update sync status
     */
    private function updateSyncStatus($status, $message = '') {
        $data = array(
            'status' => $status, // 'running', 'completed', 'failed', 'paused'
            'message' => $message,
            'updated_at' => current_time('mysql'),
        );
        update_option(self::SYNC_STATUS_OPTION, $data, false);
    }

    /**
     * Get current sync progress
     */
    public function getSyncProgress() {
        return get_option(self::SYNC_PROGRESS_OPTION, null);
    }

    /**
     * Get current sync status
     */
    public function getSyncStatus() {
        return get_option(self::SYNC_STATUS_OPTION, array('status' => 'idle'));
    }

    /**
     * Clear sync progress (call after successful complete sync)
     */
    public function clearSyncProgress() {
        delete_option(self::SYNC_PROGRESS_OPTION);
        $this->updateSyncStatus('idle');
    }

    /**
     * Check if there's a sync that can be resumed
     */
    public function canResume() {
        $progress = $this->getSyncProgress();
        $status = $this->getSyncStatus();

        if (!$progress) return false;

        // Can resume if sync was paused or failed
        if (in_array($status['status'], ['paused', 'failed'])) {
            return true;
        }

        // Can resume if there are unprocessed items
        if (isset($progress['processed_codes']) && isset($progress['total'])) {
            return count($progress['processed_codes']) < $progress['total'];
        }

        return false;
    }

    /**
     * Resume sync from where it left off
     */
    public function resumeSync() {
        $progress = $this->getSyncProgress();

        if (!$progress || empty($progress['processed_codes'])) {
            $this->logger->log("No progress found to resume, starting fresh sync");
            return $this->sync_products(null);
        }

        $this->logger->log("=== RESUMING SYNC ===");
        $this->logger->log("Previously processed: " . count($progress['processed_codes']) . " products");

        return $this->sync_products(null, $progress['processed_codes']);
    }

    /**
     * Sync products with optional resume capability
     *
     * @param string|null $specific_package_code Sync only this package code
     * @param array $skip_codes Package codes to skip (already processed)
     */
    public function sync_products($specific_package_code = null, $skip_codes = [])
    {
        $this->sync_start_time = microtime(true);
        $this->memory_usage_start = memory_get_usage();
        $is_resume = !empty($skip_codes);

        // Register shutdown handler to catch fatal errors
        $logger = $this->logger;
        $sync_id = uniqid('sync_');
        $self = $this;
        register_shutdown_function(function() use ($logger, $sync_id, $self) {
            $error = error_get_last();
            if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
                $logger->log("=== SYNC FATAL ERROR [{$sync_id}] ===");
                $logger->log("Error Type: " . $error['type']);
                $logger->log("Error Message: " . $error['message']);
                $logger->log("Error File: " . $error['file'] . " Line: " . $error['line']);
                $logger->log("Memory at crash: " . round(memory_get_usage() / 1048576, 2) . "MB");
                $logger->log("=== END FATAL ERROR ===");
                // Mark sync as failed so it can be resumed
                update_option(self::SYNC_STATUS_OPTION, array(
                    'status' => 'failed',
                    'message' => 'Fatal error: ' . $error['message'],
                    'updated_at' => current_time('mysql'),
                ), false);
            }
        });

        $mode = $is_resume ? "RESUME" : "FRESH";
        $this->logger->log("=== SYNC STARTED [{$sync_id}] ({$mode}) at " . date('Y-m-d H:i:s') . " ===");
        $this->logger->log("Memory usage at start: " . round($this->memory_usage_start / 1048576, 2) . " MB");
        $this->logger->log("PHP max_execution_time: " . ini_get('max_execution_time') . "s");
        $this->logger->log("PHP memory_limit: " . ini_get('memory_limit'));

        if ($is_resume) {
            $this->logger->log("Skipping " . count($skip_codes) . " already processed packages");
        }

        // Load previous results if resuming
        $previous_progress = $is_resume ? $this->getSyncProgress() : null;
        $this->sync_results = [
            'created' => $previous_progress['results']['created'] ?? 0,
            'updated' => $previous_progress['results']['updated'] ?? 0,
            'failed' => $previous_progress['results']['failed'] ?? 0,
            'deleted' => $previous_progress['results']['deleted'] ?? 0,
            'skipped' => $previous_progress['results']['skipped'] ?? 0,
        ];

        $processed_codes = $skip_codes;
        $this->updateSyncStatus('running', 'Sync in progress...');

        try {
            $this->logger->log("Starting product sync. Specific package code: " . ($specific_package_code ?: 'None'));

            // First, trigger sync on the API side to ensure latest eSIMs are synced
            $this->logger->log("Triggering plans sync on StrongESIM API...");
            $sync_response = $this->api_client->syncPlans();

            if ($sync_response && isset($sync_response['success']) && $sync_response['success']) {
                $this->logger->log("Plans sync triggered successfully: " . $sync_response['message']);
            } else {
                $this->logger->log("Warning: Plans sync trigger failed, continuing with existing plans");
            }

            // Get all plans from StrongESIM
            $this->logger->log("Requesting plans from API...");
            $response = $this->api_client->getPlans();
            $this->logger->log("API Response received. Status: " . (isset($response['status']) ? $response['status'] : 'Unknown'));

            if (!$response || !isset($response['data'])) {
                $error_msg = "No plans found or invalid response structure";
                if (!$response) {
                    $error_msg = "Failed to retrieve plans from StrongESIM API.";
                }
                $this->logger->log("Error: " . $error_msg);
                $this->updateSyncStatus('failed', $error_msg);
                return array('error' => $error_msg);
            }

            $package_list = $response['data'];

            // Map new API fields to expected formats
            $mapped_packages = [];
            foreach ($package_list as $plan) {
                // Skip if critical fields are missing
                if (!isset($plan['package_code']) || !isset($plan['id'])) continue;

                $mapped = [
                    'id' => $plan['id'],
                    'packageCode' => $plan['package_code'],
                    'name' => $plan['name'],
                    // StrongESIM API returns price in dollars, but PriceCalculator expects 1/10000 dollars
                    // So we multiply by 10000 to convert (e.g., $5.00 -> 50000)
                    'price' => (floatval($plan['price'] ?? 0)) * 10000,
                    'location' => $plan['country_code'],
                    'duration' => $plan['validity_days'],
                    'durationUnit' => 'Days',
                    'volume' => ($plan['data_volume_mb'] ?? 0) * 1024 * 1024, // Convert MB to bytes
                    'speed' => $plan['networkSpeed'] ?? '',
                ];
                $mapped_packages[] = $mapped;
            }
            $package_list = $mapped_packages;

            $total_packages = count($package_list);
            $this->logger->log("Retrieved {$total_packages} plans from StrongESIM API");

            // Store all API package codes for comparison later
            $api_package_codes = [];
            foreach ($package_list as $package) {
                $api_package_codes[] = $package['packageCode'];
            }
            $this->logger->log("Found " . count($api_package_codes) . " unique package codes in API response");

            // If syncing a specific package, filter the list
            if ($specific_package_code) {
                $package_list = array_filter($package_list, function ($package) use ($specific_package_code) {
                    return $package['packageCode'] === $specific_package_code;
                });

                if (empty($package_list)) {
                    $this->logger->log("Error: Package with code $specific_package_code not found.");
                    return array('error' => "Package with code $specific_package_code not found.");
                }
            }

            // Filter out already processed packages if resuming
            if ($is_resume) {
                $original_count = count($package_list);
                $package_list = array_filter($package_list, function ($package) use ($skip_codes) {
                    return !in_array($package['packageCode'], $skip_codes);
                });
                $package_list = array_values($package_list); // Re-index array
                $this->logger->log("After filtering processed packages: " . count($package_list) . " remaining (was {$original_count})");
            }

            // Get all WooCommerce eSIM products - do this once only
            $existing_map = $this->product_service->getAllEsimProducts();
            // flatten all existing IDs
            $all_existing_ids = [];
            foreach ($existing_map as $ids) {
                $all_existing_ids = array_merge($all_existing_ids, $ids);
            }
            $processed_ids = [];

            $this->logger->log("Found " . count($existing_map) . " existing eSIM products in WooCommerce");

            // Optimize by pre-caching all product categories and tags
            $this->product_service->preloadTaxonomyTerms();

            // Track which products are synchronized
            $synced_product_codes = [];

            // Process products in batches
            $batch_number = 0;
            $processed = count($skip_codes); // Start from where we left off
            $packages_batches = array_chunk($package_list, $this->batch_size);
            $total_to_process = $total_packages;

            foreach ($packages_batches as $batch) {
                $batch_number++;
                $this->logger->log("Processing batch {$batch_number} of " . count($packages_batches) .
                                 " (" . count($batch) . " products). Memory: " . round(memory_get_usage() / 1048576, 2) . "MB");

                $batch_start_time = microtime(true);
                $batch_errors = 0;

                foreach ($batch as $package) {
                    $retry_count = 0;
                    $max_retries = 2;
                    $success = false;

                    while (!$success && $retry_count <= $max_retries) {
                        try {
                            $processed++;

                            $package_code = $package['packageCode'];
                            $synced_product_codes[] = $package_code;

                            // Skip unchanged products to improve performance
                            $code = $package['packageCode'];
                            $ids_for_code = $existing_map[$code] ?? [];
                            $product_id = !empty($ids_for_code) ? array_shift($ids_for_code) : null;
                            // store back any leftover duplicates
                            $existing_map[$code] = $ids_for_code;

                            if ($product_id && !$this->product_has_changed($package, $product_id)) {
                                $this->sync_results['skipped']++;
                                $this->logger->log("Skipping unchanged product: {$package['name']} ({$package_code})");

                                // Even if skipped, ensure essential meta fields are set
                                $this->ensureEssentialMeta($product_id, $package);

                                // Even if the product is skipped, ensure it's in the correct country categories
                                $this->handleCountryCategories($product_id, $package);

                                // Check if the product has an image, assign one if missing
                                $this->product_service->checkAndAssignImage($product_id, $package);
                            } else {
                                $result = $this->product_service->createOrUpdateProduct($package, $product_id);
                                $processed_ids[] = $result['product_id'];

                                if ($result['status'] == 'created') {
                                    $this->sync_results['created']++;
                                } else {
                                    $this->sync_results['updated']++;
                                }

                                // Handle country categories
                                $this->handleCountryCategories($result['product_id'], $package);
                            }

                            // Mark as processed
                            $processed_codes[] = $package_code;
                            $success = true;

                            if ($processed % 5 == 0 || $processed == $total_to_process) {
                                $percent_done = round(($processed / $total_to_process) * 100);
                                $elapsed_time = round(microtime(true) - $this->sync_start_time, 2);
                                $memory_usage = round(memory_get_usage() / 1048576, 2);
                                $this->logger->log("Progress: {$processed} of {$total_to_process} ({$percent_done}%) - Time: {$elapsed_time}s - Memory: {$memory_usage}MB");
                            }

                        } catch (Exception $e) {
                            $retry_count++;
                            if ($retry_count <= $max_retries) {
                                $this->logger->log("Error processing {$package['packageCode']}, retry {$retry_count}/{$max_retries}: " . $e->getMessage());
                                usleep(500000); // Wait 0.5s before retry
                            } else {
                                $this->logger->log('Failed after retries - package ' . $package['packageCode'] . ': ' . $e->getMessage());
                                $this->sync_results['failed']++;
                                $batch_errors++;
                                // Still mark as processed to avoid infinite retry loops
                                $processed_codes[] = $package_code;
                            }
                        }
                    }
                }

                $batch_time = round(microtime(true) - $batch_start_time, 2);
                $this->logger->log("Batch {$batch_number} completed in {$batch_time}s (errors: {$batch_errors})");

                // Save progress after each batch
                $this->saveSyncProgress($processed_codes, $this->sync_results, $total_packages);
                $this->updateSyncStatus('running', "Processed {$processed} of {$total_to_process} products");

                // Clear WP object cache periodically to prevent memory issues
                wp_cache_flush();

                // Add a small delay between batches to prevent server overload
                if (count($packages_batches) > 1) {
                    usleep(200000); // 0.2 seconds
                }
            }

            // Delete products that exist in WooCommerce but not in StrongEsim
            if (!$specific_package_code && !$is_resume) {
                $this->deleteOutdatedProducts($existing_map, $api_package_codes);
            }

            $total_time = round(microtime(true) - $this->sync_start_time, 2);
            $total_memory = round((memory_get_usage() - $this->memory_usage_start) / 1048576, 2);

            $this->logger->log("=== SYNC COMPLETED SUCCESSFULLY ===");
            $this->logger->log("Total time: {$total_time} seconds");
            $this->logger->log("Memory used: {$total_memory}MB");
            $this->logger->log("Results: Created={$this->sync_results['created']}, Updated={$this->sync_results['updated']}, Deleted={$this->sync_results['deleted']}, Skipped={$this->sync_results['skipped']}, Failed={$this->sync_results['failed']}");
            $this->logger->log("=== END SYNC ===");

            // Clear progress on successful completion
            $this->clearSyncProgress();
            $this->updateSyncStatus('completed', 'Sync completed successfully');

            return $this->sync_results;

        } catch (Exception $e) {
            $total_time = round(microtime(true) - $this->sync_start_time, 2);
            $this->logger->log("=== SYNC FAILED WITH EXCEPTION ===");
            $this->logger->log("Time elapsed: {$total_time} seconds");
            $this->logger->log('Error: ' . $e->getMessage());
            $this->logger->log("Stack trace: " . $e->getTraceAsString());
            $this->logger->log("=== END SYNC (FAILED) ===");

            // Save progress so sync can be resumed
            $this->saveSyncProgress($processed_codes, $this->sync_results, $total_packages ?? 0, $e->getMessage());
            $this->updateSyncStatus('failed', $e->getMessage());

            return array('error' => 'An error occurred during product synchronization: ' . $e->getMessage());
        }
    }
}
