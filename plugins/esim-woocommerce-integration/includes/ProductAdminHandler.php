<?php
class ProductAdminHandler {

    public function __construct() {
        // Add custom field to product admin page
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_esim_product_fields'));

         // Save custom field when product is saved
        add_action('woocommerce_process_product_meta', array($this, 'save_esim_product_fields'));
    }

    /**
     * Adds a custom eSIM Package Code field to the product general settings in WooCommerce.
     */
    public function add_esim_product_fields() {
        global $woocommerce, $post;

        echo '<div class="options_group">';
        
        // Add checkbox to indicate if this product is an eSIM product
        woocommerce_wp_checkbox(
            array(
                'id' => '_is_esim_product',
                'label' => __('eSIM Product', 'woocommerce'),
                'description' => __('Check if this is an eSIM product', 'woocommerce'),
            )
        );

        // Add text field for eSIM Package Code
        woocommerce_wp_text_input(
            array(
                'id' => '_esim_package_code',
                'label' => __('eSIM Package Code', 'woocommerce'),
                'description' => __('Enter the eSIM package code', 'woocommerce'),
                'desc_tip' => true,
            )
        );

        echo '</div>';
    }

    /**
     * Save the custom eSIM fields when the product is saved in WooCommerce.
     *
     * @param int $post_id The ID of the product being saved.
     */
    public function save_esim_product_fields($post_id) {
        $product = wc_get_product($post_id);
        if (!$product) return;

        // Save eSIM checkbox value
        $is_esim_product = isset($_POST['_is_esim_product']) ? 'yes' : 'no';
        $product->update_meta_data('_is_esim_product', $is_esim_product);

        // Save eSIM Package Code value
        if (isset($_POST['_esim_package_code'])) {
            $product->update_meta_data('_esim_package_code', sanitize_text_field($_POST['_esim_package_code']));
        }
        
        $product->save();
    }
}

