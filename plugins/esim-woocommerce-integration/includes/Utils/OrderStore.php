<?php
/**
 * HPOS-safe order helpers.
 *
 * WooCommerce 8.2+ stores orders in its own tables (High-Performance Order
 * Storage). On those stores get_post_meta()/$wpdb->postmeta return nothing for
 * an order, so every read and write has to go through the order CRUD object.
 * This class is the single place that knows how to do that on both storages.
 */

if (!defined('ABSPATH')) {
    exit;
}

class ESIM_OrderStore {

    /**
     * Is HPOS (custom order tables) the authoritative storage?
     */
    public static function hpos_enabled() {
        if (class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
            && method_exists('\Automattic\WooCommerce\Utilities\OrderUtil', 'custom_orders_table_usage_is_enabled')) {
            return \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
        }
        return false;
    }

    /**
     * Read a single order meta value. Works on both storages.
     *
     * @param int|WC_Order $order Order or order ID.
     * @param string       $key   Meta key.
     * @return mixed Empty string when not set (matches get_post_meta()).
     */
    public static function get_meta($order, $key) {
        $order = is_object($order) ? $order : wc_get_order($order);
        if (!$order) {
            return '';
        }
        $value = $order->get_meta($key, true);
        return ($value === null) ? '' : $value;
    }

    /**
     * Write one or more order meta values and save once.
     *
     * @param int|WC_Order $order Order or order ID.
     * @param array        $data  key => value pairs.
     * @return bool
     */
    public static function update_meta($order, array $data) {
        $order = is_object($order) ? $order : wc_get_order($order);
        if (!$order || empty($data)) {
            return false;
        }
        foreach ($data as $key => $value) {
            $order->update_meta_data($key, $value);
        }
        $order->save();
        return true;
    }

    /**
     * Find one order by a meta key/value pair, on either storage.
     *
     * @param string $key   Meta key.
     * @param string $value Meta value.
     * @return WC_Order|null
     */
    public static function find_order_by_meta($key, $value) {
        if ($value === '' || $value === null) {
            return null;
        }

        // wc_get_orders() understands meta_query on both the posts table and
        // the HPOS tables, so it is the portable path.
        $orders = wc_get_orders(array(
            'limit'      => 1,
            'orderby'    => 'date',
            'order'      => 'DESC',
            'status'     => 'any',
            'return'     => 'ids',
            'meta_query' => array(
                array(
                    'key'     => $key,
                    'value'   => $value,
                    'compare' => '=',
                ),
            ),
        ));

        if (!empty($orders)) {
            $order = wc_get_order($orders[0]);
            if ($order) {
                return $order;
            }
        }

        // Fallback: a direct lookup against whichever meta table is in use.
        // Needed for LIKE matching of serialised arrays (_esim_order_ids).
        global $wpdb;
        $table = self::meta_table();
        $id_column = self::hpos_enabled() ? 'order_id' : 'post_id';

        $order_id = $wpdb->get_var($wpdb->prepare(
            "SELECT {$id_column} FROM {$table} WHERE meta_key = %s AND meta_value LIKE %s ORDER BY {$id_column} DESC LIMIT 1",
            $key,
            '%' . $wpdb->esc_like($value) . '%'
        ));

        if ($order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                return $order;
            }
        }

        return null;
    }

    /**
     * Find the order that owns a StrongESIM order id, looking at order meta
     * and at line-item meta.
     *
     * @param string $esim_order_id StrongESIM order UUID.
     * @return WC_Order|null
     */
    public static function find_order_by_esim_order_id($esim_order_id) {
        if (empty($esim_order_id)) {
            return null;
        }

        foreach (array('_esim_order_number', '_esim_order_id', '_esim_order_ids') as $key) {
            $order = self::find_order_by_meta($key, $esim_order_id);
            if ($order) {
                return $order;
            }
        }

        // Last resort: the id is only on a line item.
        global $wpdb;
        $order_id = $wpdb->get_var($wpdb->prepare(
            "SELECT i.order_id
               FROM {$wpdb->prefix}woocommerce_order_itemmeta im
               INNER JOIN {$wpdb->prefix}woocommerce_order_items i ON i.order_item_id = im.order_item_id
              WHERE im.meta_key = '_esim_order_no' AND im.meta_value = %s
              LIMIT 1",
            $esim_order_id
        ));

        if ($order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                return $order;
            }
        }

        return null;
    }

    /**
     * The meta table orders currently live in.
     */
    public static function meta_table() {
        global $wpdb;
        if (class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
            && method_exists('\Automattic\WooCommerce\Utilities\OrderUtil', 'get_table_for_order_meta')) {
            return \Automattic\WooCommerce\Utilities\OrderUtil::get_table_for_order_meta();
        }
        return $wpdb->postmeta;
    }

    /**
     * Screen ids the order edit meta box has to be registered against.
     *
     * @return string[]
     */
    public static function order_screen_ids() {
        $ids = array('shop_order');

        if (class_exists('\Automattic\WooCommerce\Utilities\OrderUtil')
            && method_exists('\Automattic\WooCommerce\Utilities\OrderUtil', 'get_order_admin_screen')) {
            $ids[] = \Automattic\WooCommerce\Utilities\OrderUtil::get_order_admin_screen();
        } elseif (function_exists('wc_get_page_screen_id')) {
            $ids[] = wc_get_page_screen_id('shop-order');
        } else {
            $ids[] = 'woocommerce_page_wc-orders';
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * Normalise a meta box callback argument to a WC_Order.
     *
     * Under HPOS the callback is handed a WC_Order; on the legacy screen it is
     * handed a WP_Post.
     *
     * @param mixed $post_or_order
     * @return WC_Order|null
     */
    public static function resolve_order($post_or_order) {
        if ($post_or_order instanceof WC_Order) {
            return $post_or_order;
        }
        if ($post_or_order instanceof WP_Post) {
            $order = wc_get_order($post_or_order->ID);
            return $order ? $order : null;
        }
        if (is_numeric($post_or_order)) {
            $order = wc_get_order((int) $post_or_order);
            return $order ? $order : null;
        }
        return null;
    }
}
