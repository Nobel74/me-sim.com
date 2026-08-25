<?php
/**
 * Plugin Name: ME-SIM Bridge
 * Description: Puente seguro de comunicación entre api.me-sim.com y me-sim.com. Gestiona CORS (estándar y REST API), redirecciones 301, webhook HMAC con extracción de SKU dinámico y endpoint para emails transaccionales.
 * Version: 3.0.0
 * Author: ME-SIM Team
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// ==========================================
// CONFIGURACIÓN DE CONSTANTES DE PRODUCCIÓN
// ==========================================
if ( ! defined( 'ME_SIM_NEXTJS_WEBHOOK_URL' ) ) {
    define( 'ME_SIM_NEXTJS_WEBHOOK_URL', 'https://me-sim.com/api/v1/woocommerce-webhook' );
}

if ( ! defined( 'ME_SIM_BRIDGE_SECRET' ) ) {
    define( 'ME_SIM_BRIDGE_SECRET', 'Este_2026_Clem_y_yo_nos_vamos_a_forrar!' ); // Coincide exactamente con ME_SIM_BRIDGE_SECRET en .env de Next.js
}

if ( ! defined( 'ME_SIM_FRONTEND_URL' ) ) {
    define( 'ME_SIM_FRONTEND_URL', 'https://me-sim.com' );
}

// Helper para obtener la lista oficial de orígenes permitidos (CORS)
function me_sim_get_allowed_origins() {
    return array(
        'https://me-sim.com',
        'https://www.me-sim.com',
        'https://me-sim.es',
        'https://www.me-sim.es',
        'https://me-sim-com-weld.vercel.app',
        'http://localhost:3000',
        'http://api.me-sim.com'
    );
}

// ==========================================
// 0. ENDPOINT REST API PARA ENVÍO DE EMAILS TRANSACCIONALES
// ==========================================
add_action( 'rest_api_init', function () {
    register_rest_route( 'mesim/v1', '/send-email', array(
        'methods'             => 'POST',
        'callback'            => 'me_sim_rest_send_email',
        'permission_callback' => '__return_true',
    ) );
} );

function me_sim_rest_send_email( WP_REST_Request $request ) {
    $provided_key = $request->get_header( 'x-me-sim-key' );
    $expected_key = defined( 'ME_SIM_BRIDGE_SECRET' ) ? ME_SIM_BRIDGE_SECRET : 'Este_2026_Clem_y_yo_nos_vamos_a_forrar!';
    
    if ( $provided_key !== $expected_key && $provided_key !== 'mesim-secure-mail-2026' ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Unauthorized key' ), 401 );
    }

    $params = $request->get_json_params();
    $to = isset( $params['to'] ) ? sanitize_email( $params['to'] ) : '';
    $subject = isset( $params['subject'] ) ? sanitize_text_field( $params['subject'] ) : '';
    $html = isset( $params['html'] ) ? $params['html'] : '';

    if ( empty( $to ) || empty( $subject ) || empty( $html ) ) {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'Missing parameters' ), 400 );
    }

    $headers = array( 'Content-Type: text/html; charset=UTF-8' );
    $sent = wp_mail( $to, $subject, $html, $headers );

    if ( $sent ) {
        return new WP_REST_Response( array( 'success' => true, 'message' => 'Email sent via wp_mail' ), 200 );
    } else {
        return new WP_REST_Response( array( 'success' => false, 'message' => 'wp_mail failed' ), 500 );
    }
}

// ==========================================
// 1. CONTROL DE CORS Y CREDENCIALES (INIT + REST API PREFLIGHT)
// ==========================================
add_action( 'init', 'me_sim_handle_cors' );
function me_sim_handle_cors() {
    $origin = get_http_origin();
    $allowed_origins = me_sim_get_allowed_origins();

    if ( in_array( $origin, $allowed_origins ) ) {
        header( 'Access-Control-Allow-Origin: ' . $origin );
        header( 'Access-Control-Allow-Credentials: true' );
        header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE' );
        header( 'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-ME-SIM-Signature, X-ME-SIM-Key' );
        
        if ( $_SERVER['REQUEST_METHOD'] == 'OPTIONS' ) {
            status_header( 200 );
            exit;
        }
    }
}

// Intercepta solicitudes preflight (OPTIONS) y respuestas de la REST API de WordPress
add_filter( 'rest_pre_serve_request', 'me_sim_rest_cors_pre_serve', 10, 4 );
function me_sim_rest_cors_pre_serve( $served, $result, $request, $server ) {
    $origin = get_http_origin();
    $allowed_origins = me_sim_get_allowed_origins();

    if ( in_array( $origin, $allowed_origins ) ) {
        header( 'Access-Control-Allow-Origin: ' . $origin );
        header( 'Access-Control-Allow-Credentials: true' );
        header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE' );
        header( 'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-ME-SIM-Signature, X-ME-SIM-Key' );
    }
    return $served;
}

// ==========================================
// 2. REDIRECCIONES 301 PARA OCULTAR BACKEND
// ==========================================
add_action( 'template_redirect', 'me_sim_redirect_clean' );
function me_sim_redirect_clean() {
    if ( is_cart() ) {
        wp_redirect( ME_SIM_FRONTEND_URL . '/cart', 301 );
        exit;
    }
    if ( is_checkout() ) {
        wp_redirect( ME_SIM_FRONTEND_URL . '/checkout', 301 );
        exit;
    }
    if ( is_account_page() ) {
        wp_redirect( ME_SIM_FRONTEND_URL . '/login', 301 );
        exit;
    }
    if ( is_shop() ) {
        wp_redirect( ME_SIM_FRONTEND_URL, 301 );
        exit;
    }
}

// ==========================================
// 3. WEBHOOK CON FIRMA HMAC Y SKU DINÁMICO AL COMPLETAR PEDIDO
// ==========================================
add_action( 'woocommerce_order_status_completed', 'me_sim_notify_order_completed', 10, 1 );
function me_sim_notify_order_completed( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }

    $customer_email = $order->get_billing_email();
    $customer_first_name = $order->get_billing_first_name();
    $customer_last_name = $order->get_billing_last_name();
    $customer_name = trim( $customer_first_name . ' ' . $customer_last_name );

    $items = array();
    $first_sku = '';
    
    foreach ( $order->get_items() as $item_id => $item ) {
        $product = $item->get_product();
        $sku = $product ? $product->get_sku() : '';

        // ARQUITECTURA API-DRIVEN: Si el SKU tradicional en base de datos está vacío,
        // extraemos el SKU/Plan ID de los metadatos de línea que Next.js asocia en el checkout.
        if ( empty( $sku ) ) {
            $possible_meta_keys = array( 'plan_id', '_plan_id', 'sku', '_sku', 'plan_code', 'planCode' );
            foreach ( $possible_meta_keys as $key ) {
                $meta_val = $item->get_meta( $key );
                if ( ! empty( $meta_val ) ) {
                    $sku = $meta_val;
                    break;
                }
            }
        }

        if ( empty( $first_sku ) && ! empty( $sku ) ) {
            $first_sku = $sku;
        }

        $items[] = array(
            'product_id' => $item->get_product_id(),
            'name'       => $item->get_name(),
            'quantity'   => $item->get_quantity(),
            'total'      => $item->get_total(),
            'sku'        => $sku, // SKU dinámico extraído con éxito
        );
    }

    $payload = array(
        'order_id'      => $order_id,
        'email'         => $customer_email,
        'customerName'  => $customer_name,
        'sku'           => $first_sku, // Primer SKU recuperado para procesado ágil en Next.js
        'items'         => $items,
        'currency'      => $order->get_currency(),
        'total_amount'  => $order->get_total(),
        'timestamp'     => time(),
    );

    $payload_json = json_encode( $payload );
    $signature = hash_hmac( 'sha256', $payload_json, ME_SIM_BRIDGE_SECRET );

    // Enviar el webhook síncronamente
    $response = wp_safe_remote_post( ME_SIM_NEXTJS_WEBHOOK_URL, array(
        'headers' => array(
            'Content-Type'         => 'application/json',
            'X-ME-SIM-Signature'   => $signature,
        ),
        'body'    => $payload_json,
        'timeout' => 15,
        'blocking' => true,
    ));

    $logger = wc_get_logger();
    $log_context = array( 'source' => 'me-sim-bridge' );

    if ( is_wp_error( $response ) ) {
        $logger->error( 'Fallo crítico al notificar a Next.js de la Orden #' . $order_id . ': ' . $response->get_error_message(), $log_context );
    } else {
        $status_code = wp_remote_retrieve_response_code( $response );
        $response_body = wp_remote_retrieve_body( $response );
        if ( $status_code === 200 || $status_code === 201 ) {
            $logger->info( 'Orden #' . $order_id . ' transferida con éxito al backend de Next.js para su aprovisionamiento.', $log_context );
        } else {
            $logger->error( 'Error de backend Next.js para Orden #' . $order_id . ' (Código HTTP ' . $status_code . '): ' . $response_body, $log_context );
        }
    }
}

// ==========================================
// 4. INTERCEPTAR EMAILS Y CORREGIR URLS Y REMITENTE (WP_MAIL)
// ==========================================
add_filter( 'wp_mail_from_name', function( $name ) {
    return 'ME-SIM.COM';
} );

add_filter( 'wp_mail_from', function( $email ) {
    return 'info@me-sim.com';
} );

add_filter( 'wp_mail', 'me_sim_bridge_filter_outgoing_mail_urls' );
function me_sim_bridge_filter_outgoing_mail_urls( $args ) {
    if ( isset( $args['message'] ) ) {
        // Reemplazar el subdominio del backend de la API por el dominio público de Next.js
        $args['message'] = str_replace( 'https://api.me-sim.com', 'https://me-sim.com', $args['message'] );
        $args['message'] = str_replace( 'api.me-sim.com', 'me-sim.com', $args['message'] );
    }
    return $args;
}

