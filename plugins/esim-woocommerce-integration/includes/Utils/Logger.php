<?php

namespace ESIMWooCommerce\Utils;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin logger.
 *
 * Writes through WC_Logger so entries land in wp-content/uploads/wc-logs/,
 * which WooCommerce protects with a hashed filename and a deny rule. The old
 * behaviour (wp-content/esim-plugin.log) was readable over HTTP by anyone and
 * contained ICCIDs and QR code URLs, so it is no longer used.
 *
 * Entries are visible under WooCommerce > Status > Logs (source "strongesim").
 */
class Logger {
    const SOURCE = 'strongesim';

    private $log_prefix;
    private static $wc_logger = null;

    public function __construct($prefix = 'eSIM Plugin') {
        $this->log_prefix = $prefix;
    }

    public function log($message, $level = 'info') {
        if (!is_scalar($message)) {
            $message = function_exists('wp_json_encode') ? wp_json_encode($message) : json_encode($message);
        }

        $line = '[' . $this->log_prefix . '] ' . $message;

        $logger = self::logger();
        if ($logger) {
            $logger->log($level, $line, array('source' => self::SOURCE));
            return;
        }

        // WooCommerce not loaded yet (should not normally happen).
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log($line);
        }
    }

    public function error($message) {
        $this->log($message, 'error');
    }

    public function debug($message) {
        $this->log($message, 'debug');
    }

    private static function logger() {
        if (self::$wc_logger === null) {
            self::$wc_logger = function_exists('wc_get_logger') ? wc_get_logger() : false;
        }
        return self::$wc_logger ? self::$wc_logger : null;
    }
}
