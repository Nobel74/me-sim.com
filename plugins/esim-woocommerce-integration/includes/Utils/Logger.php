<?php

namespace ESIMWooCommerce\Utils;

class Logger {
    private $log_prefix;

    public function __construct($prefix = 'eSIM Plugin') {
        $this->log_prefix = $prefix;
    }

    public function log($message) {
        error_log('[' . $this->log_prefix . '] ' . $message);
        file_put_contents(
            WP_CONTENT_DIR . '/esim-plugin.log', 
            date('[Y-m-d H:i:s] ') . $message . "\n", 
            FILE_APPEND
        );
    }
}
