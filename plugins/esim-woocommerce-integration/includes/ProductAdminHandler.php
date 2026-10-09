<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * eSIM fields on the WooCommerce product edit screen.
 */
class ProductAdminHandler {

    public function __construct() {
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_esim_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_esim_product_fields'));
    }

    public function add_esim_product_fields() {
        global $post;

        $product = $post ? wc_get_product($post->ID) : null;

        echo '<div class="options_group">';

        woocommerce_wp_checkbox(array(
            'id' => '_is_esim_product',
            'value' => $product ? $product->get_meta('_is_esim_product', true) : '',
            'label' => __('eSIM product', 'esim-woocommerce-integration'),
            'description' => __('Check if this is an eSIM product', 'esim-woocommerce-integration'),
        ));

        woocommerce_wp_text_input(array(
            'id' => '_esim_package_code',
            'value' => $product ? $product->get_meta('_esim_package_code', true) : '',
            'label' => __('eSIM package code', 'esim-woocommerce-integration'),
            'description' => __('Provider package code for this plan.', 'esim-woocommerce-integration'),
            'desc_tip' => true,
        ));

        // The plan id is what the order API is actually called with, so it has to
        // be visible and editable for a manually created product.
        woocommerce_wp_text_input(array(
            'id' => '_esim_plan_id',
            'value' => $product ? $product->get_meta('_esim_plan_id', true) : '',
            'label' => __('StrongESIM plan ID', 'esim-woocommerce-integration'),
            'description' => __('Required to order this plan. Filled in automatically by the product sync.', 'esim-woocommerce-integration'),
            'desc_tip' => true,
        ));

        woocommerce_wp_text_input(array(
            'id' => '_esim_validity_days',
            'value' => $product ? $product->get_meta('_esim_validity_days', true) : '',
            'label' => __('Validity (days)', 'esim-woocommerce-integration'),
            'type' => 'number',
            'custom_attributes' => array('min' => '0', 'step' => '1'),
            'description' => __('Used as periodNum when ordering a daily (unlimited) plan.', 'esim-woocommerce-integration'),
            'desc_tip' => true,
        ));

        woocommerce_wp_checkbox(array(
            'id' => '_esim_is_daily_plan',
            'value' => $product ? $product->get_meta('_esim_is_daily_plan', true) : '',
            'label' => __('Daily (unlimited) plan', 'esim-woocommerce-integration'),
            'description' => __('Set by the sync from the plan data type. Daily plans are ordered with a periodNum.', 'esim-woocommerce-integration'),
        ));

        echo '</div>';
    }

    /**
     * WooCommerce verifies its own nonce before firing this hook.
     *
     * @param int $post_id
     */
    public function save_esim_product_fields($post_id) {
        $product = wc_get_product($post_id);
        if (!$product) {
            return;
        }

        $product->update_meta_data('_is_esim_product', isset($_POST['_is_esim_product']) ? 'yes' : 'no');
        $product->update_meta_data('_esim_is_daily_plan', isset($_POST['_esim_is_daily_plan']) ? 'yes' : 'no');

        if (isset($_POST['_esim_package_code'])) {
            $product->update_meta_data('_esim_package_code', sanitize_text_field(wp_unslash($_POST['_esim_package_code'])));
        }
        if (isset($_POST['_esim_plan_id'])) {
            $product->update_meta_data('_esim_plan_id', sanitize_text_field(wp_unslash($_POST['_esim_plan_id'])));
        }
        if (isset($_POST['_esim_validity_days'])) {
            $product->update_meta_data('_esim_validity_days', absint($_POST['_esim_validity_days']));
        }

        $product->save();
    }
}
