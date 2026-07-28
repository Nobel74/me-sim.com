<?php
/**
 * Plugin Name: ME-SIM Catálogo - Core & Parser (Versión 2.9.1 - Cart Translation Fix)
 * Description: Conserva la interfaz v2.9.0. Añade un interceptor dinámico por PHP para forzar la traducción de los botones "VER CARRITO" y "FINALIZAR COMPRA" en el minicart de Elementor cuando se navega en inglés.
 * Version: 2.9.1
 * Author: ME-SIM Developer
 * License: GPL2
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 1. MENÚ EN EL BACKEND
 */
add_action( 'admin_menu', 'mesim_parser_menu_v291' );
function mesim_parser_menu_v291() {
    add_menu_page(
        'ME-SIM Parser',
        'ME-SIM Catálogo',
        'manage_options',
        'mesim-parser',
        'mesim_parser_admin_page_v291',
        'dashicons-admin-links',
        56
    );
}

/**
 * 2. REGISTRO DE ACTIONS PARA AJAX
 */
add_action( 'wp_ajax_mesim_execute_batch_ajax', 'mesim_execute_batch_ajax_handler_v291' );
add_action( 'wp_ajax_mesim_global_search_ajax', 'mesim_global_search_ajax_handler_v291' );

/**
 * 🔥 2.1 TRADUCCIÓN FORZADA EN CALIENTE DEL MINICART (ELEMENTOR)
 * Intercepta las cadenas fijas en español del editor de Elementor si el idioma actual es inglés.
 */
add_filter( 'gettext', 'mesim_sys_translate_cart_buttons_v291', 20, 3 );
function mesim_sys_translate_cart_buttons_v291( $translated_text, $text, $domain ) {
    // Detectamos si el idioma activo en el entorno de WordPress contiene la raíz inglesa 'en'
    $current_lang = determine_locale();
    
    if ( strpos( $current_lang, 'en' ) === 0 ) {
        // Normalizamos a mayúsculas para evitar fallos si se escribió con variaciones
        $upper_text = trim( mb_strtoupper( $text, 'UTF-8' ) );
        
        if ( $upper_text === 'VER CARRITO' ) {
            return 'VIEW CART';
        }
        if ( $upper_text === 'FINALIZAR COMPRA' ) {
            return 'CHECKOUT';
        }
    }
    
    return $translated_text;
}

/**
 * 2.2 INTERCEPTOR SQL OPTIMIZADO PARA EL BUSCADOR NATIVO DE ELEMENTOR
 */
add_filter( 'posts_join', 'mesim_sys_native_search_join_v291', 10, 2 );
function mesim_sys_native_search_join_v291( $join, $wp_query ) {
    global $wpdb;
    if ( ! is_admin() && $wp_query->is_search() ) {
        $join .= " LEFT JOIN $wpdb->postmeta AS mesim_pm ON ($wpdb->posts.ID = mesim_pm.post_id) ";
    }
    return $join;
}

add_filter( 'posts_where', 'mesim_sys_native_search_where_v291', 10, 2 );
function mesim_sys_native_search_where_v291( $where, $wp_query ) {
    global $wpdb;
    if ( ! is_admin() && $wp_query->is_search() ) {
        $search_term = $wp_query->get('s');
        if ( ! empty($search_term) ) {
            $escaped = esc_sql( $wpdb->esc_like( $search_term ) );
            $where .= " OR (mesim_pm.meta_key IN ('country_name', 'search_keywords') AND mesim_pm.meta_value LIKE '%{$escaped}%' AND $wpdb->posts.post_type = 'product' AND $wpdb->posts.post_status = 'publish') ";
        }
    }
    return $where;
}

add_filter( 'posts_distinct', 'mesim_sys_native_search_distinct_v291', 10, 2 );
function mesim_sys_native_search_distinct_v291( $distinct, $wp_query ) {
    if ( ! is_admin() && $wp_query->is_search() ) {
        return 'DISTINCT'; 
    }
    return $distinct;
}

/**
 * 2.3 ANULACIÓN DEL INTRO POR PHP
 */
add_action( 'template_redirect', 'mesim_sys_block_search_redirect_v291' );
function mesim_sys_block_search_redirect_v291() {
    if ( ! is_admin() && is_search() ) {
        if ( ! defined('DOING_AJAX') && empty($_REQUEST['elementor_load_more']) ) {
            wp_safe_redirect( home_url( '/' ) );
            exit;
        }
    }
}

/**
 * 3. FUNCIONES DE PARSEO CORE
 */
function mesim_helper_clean_title( $title ) {
    return preg_replace( '/^eSIM\s+/i', '', $title );
}

function mesim_helper_clean_slug( $slug ) {
    return sanitize_title( preg_replace( '/^esim-/', '', $slug ) );
}

if ( ! function_exists( 'mesim_helper_country' ) ) {
    function mesim_helper_country( $title ) {
        $t = html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
        if ( stripos( $t, 'europe' ) !== false && stripos( $t, 'morocco' ) !== false ) {
            return 'Europe & Morocco';
        }
        if ( stripos( $t, 'ethiopia' ) !== false ) {
            return 'Etiopía';
        }
        $pos = strcspn( $t, '0123456789(' );
        return trim( substr( $t, 0, $pos ) );
    }
}

if ( ! function_exists( 'mesim_helper_coverage' ) ) {
    function mesim_helper_coverage( $title ) {
        $t = strtolower( html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
        if ( strpos( $t, 'europe' ) !== false && strpos( $t, 'morocco' ) !== false ) {
            return 'europe-morocco';
        }
        if ( strpos( $t, 'ethiopia' ) !== false || strpos( $t, 'etiopia' ) !== false ) {
            return 'etiopia';
        }

        $regiones = [
            'Global' => 'global', 'Central Asia' => 'central-asia', 'Ireland & Slovenia' => 'ireland-slovenia',
            'Ireland & Uk' => 'ireland-uk', 'Japan & South Korea' => 'japan-south-korea',
            'Australia & United Kingdom (UK) & United States (USA)' => 'aukus', 'Oceania Orange' => 'oceania-orange',
            'Middle East & North Africa' => 'middle-east-north-africa', 'Asia' => 'asia', 'Europe' => 'europe',
            'Caribbean' => 'caribbean', 'Balkans' => 'balkans', 'Usa & Canada' => 'usa-canada',
            'Australia & New Zealand' => 'australia-new-zealand', 'Middle East' => 'middle-east',
            'China Mainland & Japan & South Korea' => 'china-mainland-japan-south-korea', 'Gulf Region' => 'gulf-region',
            'Africa' => 'africa', 'Singapore & Malaysia & Thailand' => 'singapore-malaysia-thailand',
            'Singapore & Malaysia & Vietnam & Thailand & Indonesia' => 'singapore-malaysia-vietnam-thailand-indonesia',
            'China Mainland & Hk' => 'china-mainland-hong-kong', 'Singapore & Malaysia' => 'singapore-malaysia'
        ];
        foreach ( $regiones as $l => $v ) {
            if ( strpos( $t, strtolower( $l ) ) !== false ) return $v;
        }
        return 'ninguno';
    }
}

if ( ! function_exists( 'mesim_helper_data_duration' ) ) {
    function mesim_helper_data_duration( $title ) {
        $t = html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
        $res = [ 'gb' => null, 'unit' => 'GB', 'days' => null ];
        if ( preg_match( '/(\d+(\.\d+)?)\s?(GB|MB)/i', $t, $m ) ) {
            $res['gb'] = $m[1];
            $res['unit'] = strtoupper( $m[3] );
        }
        if ( preg_match( '/(\d+(\.\d+)?)\s?(GB|MB)\s?\/\s?Day/i', $t ) || preg_match( '/\bDaily\b/i', $t ) ) {
            $res['days'] = 1;
        } elseif ( preg_match( '/(\d+)\s?(Days?|D)\b/i', $t, $m ) ) {
            $res['days'] = intval( $m[1] );
        }
        return $res;
    }
}

if ( ! function_exists( 'mesim_get_global_catalog_data' ) ) {
    function mesim_get_global_catalog_data() {
        $cache = wp_cache_get( 'mesim_global_catalog_data' );
        if ( $cache !== false ) return $cache;

        $args = [
            'post_type'      => 'product',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'fields'         => 'ids'
        ];
        $all_ids = get_posts( $args );
        
        $groups = [];
        $flag_library = [];
        $unique_countries = [];
        $unique_zones = [];

        foreach ( $all_ids as $id ) {
            $title = get_the_title( $id );
            $coverage = mesim_helper_coverage( $title );
            $price = get_post_meta( $id, '_price', true );
            $thumb_id = get_post_meta( $id, '_thumbnail_id', true );

            $new_title = mesim_helper_clean_title( $title );
            $country_clean = mesim_helper_country( $new_title );

            if ( $coverage === 'ninguno' ) {
                $unique_countries[$country_clean] = true;
                preg_match( '/^[^\d]+/', $title, $match );
                $country = isset( $match[0] ) ? strtolower( trim( html_entity_decode( $match[0], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) ) : strtolower( $title );
                $key = 'country|' . preg_replace( '/\s+/', ' ', $country );
            } else {
                $unique_zones[$coverage] = true;
                $key = 'zone|' . $coverage;
            }

            if ( ! empty( $thumb_id ) && empty( $flag_library[$key] ) ) {
                $flag_library[$key] = $thumb_id;
            }

            if ( $price !== '' ) {
                $groups[$key][$id] = floatval( $price );
            }
        }

        $global_cheapest = [];
        foreach ( $groups as $key => $items ) {
            $min_val = min( $items );
            foreach ( $items as $id => $price_val ) {
                $global_cheapest[$id] = [
                    'is_cheapest' => ( $price_val == $min_val ) ? '1' : '0',
                    'min_price'   => $min_val
                ];
            }
        }

        $result = [ 
            'cheapest'      => $global_cheapest, 
            'flags'         => $flag_library,
            'country_count' => count($unique_countries),
            'zone_count'    => count($unique_zones)
        ];
        wp_cache_set( 'mesim_global_catalog_data', $result, '', 60 );
        return $result;
    }
}

/**
 * 4. INTERFAZ GRÁFICA RESPONSIVE PREMIUM
 */
function mesim_parser_admin_page_v291() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    $per_page = 500;
    $current_page = isset($_GET['paged_batch']) ? max(1, intval($_GET['paged_batch'])) : 1;
    $offset = ($current_page - 1) * $per_page;

    $all_products_count = get_posts( [
        'post_type'      => 'product',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'fields'         => 'ids'
    ] );
    $total_products = count( $all_products_count );
    $total_pages = ceil($total_products / $per_page);

    $global_data = mesim_get_global_catalog_data();
    ?>
    
    <div id="mesim-scroll-progress">
        <div id="mesim-scroll-fill">
            <span id="mesim-scroll-text">0%</span>
        </div>
    </div>

    <style>
        #mesim-scroll-progress { position: fixed; top: 32px; left: 0; width: 100%; height: 24px; background: rgba(241, 245, 249, 0.9); z-index: 99999; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border-bottom: 1px solid #cbd5e1; }
        #mesim-scroll-fill { height: 100%; width: 0%; background: rgba(26, 26, 26, 0.95); display: flex; align-items: center; justify-content: center; transition: width 0.1s ease; border-bottom-right-radius: 4px; }
        #mesim-scroll-text { color: #FFEC00; font-size: 11px; font-weight: 800; font-family: monospace; letter-spacing: 0.5px; padding-left: 10px; white-space: nowrap; }
        .mesim-container { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); padding: 30px; margin: 20px 20px 20px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; width: calc(100% - 20px); box-sizing: border-box; }
        .mesim-header { background: #FFEC00; border-radius: 10px; padding: 20px 30px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #e6d300; flex-wrap: wrap; gap: 15px; }
        .mesim-brand-wrapper { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .mesim-logo-img { height: 45px; width: auto; display: block; object-fit: contain; }
        .mesim-header-title { font-size: 20px; font-weight: 800; color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .mesim-badge { background: #1a1a1a; color: #FFEC00; font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: 700; margin-left: 10px; display: inline-block; }
        
        .mesim-analytics-panel { display: flex; gap: 12px; flex-wrap: wrap; }
        .mesim-analytic-card { background: #1a1a1a; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .mesim-analytic-card span { color: #FFEC00; font-size: 16px; font-weight: 800; font-family: monospace; }

        .mesim-dashboard { display: flex; gap: 15px; margin-bottom: 20px; background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; align-items: center; flex-wrap: wrap; }
        .mesim-btn { padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; justify-content: center; box-sizing: border-box; }
        .btn-simulate { background: #0052cc; color: white; width: 100%; }
        .btn-simulate:hover { background: #0041a3; }
        .btn-execute { background: #2ecc71; color: white; }
        .btn-execute:hover { background: #27ae60; }
        .mesim-search-wrapper { position: relative; display: inline-flex; align-items: center; }
        .mesim-search-input { padding: 11px 40px 11px 16px; border: 1px solid #cbd5e1; border-radius: 8px; width: 380px; font-size: 14px; outline: none; transition: border 0.2s; color: #334155; }
        .mesim-search-input:focus { border-color: #0052cc; box-shadow: 0 0 0 3px rgba(0,82,204,0.1); }
        .mesim-search-clear { position: absolute; right: 12px; font-size: 20px; color: #94a3b8; cursor: pointer; display: none; user-select: none; font-weight: bold; transition: color 0.2s; }
        .mesim-search-clear:hover { color: #475569; }
        .mesim-counter-badge { background: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; white-space: nowrap; }
        
        .mesim-progress-box { background: #f1f5f9; border-radius: 10px; padding: 20px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
        .progress-header { display: flex; justify-content: space-between; font-weight: 600; color: #334155; margin-bottom: 10px; font-size: 14px; }
        .progress-bar-container { background: #cbd5e1; height: 16px; border-radius: 10px; overflow: hidden; position: relative; }
        .progress-bar-fill { background: linear-gradient(90deg, #1a1a1a, #444444); width: 0%; height: 100%; transition: width 0.3s ease; }
        
        .mesim-audit-summary { margin-top: 15px; padding: 14px 18px; background: #ffffff; border-radius: 6px; border-left: 5px solid #2ecc71; font-size: 13px; font-weight: 700; color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: none; }

        .mesim-pagination { display: flex; gap: 6px; margin: 20px 0; align-items: center; flex-wrap: wrap; }
        .mesim-page-link { padding: 8px 14px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s; font-size: 13px; }
        .mesim-page-link:hover { border-color: #0052cc; color: #0052cc; background: #f8fafc; }
        .mesim-page-link.page-active { background: #1a1a1a; color: #FFEC00; border-color: #1a1a1a; pointer-events: none; }
        .mesim-table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; width: 100%; overflow-x: auto; }
        .mesim-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #334155; }
        .mesim-table th { background: #f8fafc; padding: 16px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .mesim-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .mesim-table tr:hover { background: #f8fafc; }
    </style>

    <div class="wrap">
        <div class="mesim-container">
            
            <div class="mesim-header">
                <div class="mesim-brand-wrapper">
                    <img src="https://me-sim.com/wp-content/uploads/Logo-me-sim-Header.svg" class="mesim-logo-img" alt="ME-SIM Logotipo" />
                    <h1 class="mesim-header-title">PANEL DE PARSEO AUTOMÁTICO <span class="mesim-badge">v2.9.1 Multi-Lang</span></h1>
                </div>
                
                <div class="mesim-analytics-panel">
                    <div class="mesim-analytic-card">📦 Catálogo: <span><?php echo $total_products; ?></span></div>
                    <div class="mesim-analytic-card">🌍 Países: <span><?php echo $global_data['country_count']; ?></span></div>
                    <div class="mesim-analytic-card">🗺️ Zonas: <span><?php echo $global_data['zone_count']; ?></span></div>
                </div>
            </div>

            <div class="mesim-dashboard">
                <form method="post" id="form-simulate">
                    <button type="submit" name="parser_simulate" id="btn-submit-simulate" class="mesim-btn btn-simulate">🔍 Simular Bloque Actual</button>
                </form>
                <button id="btn-start-ajax" class="mesim-btn btn-execute">🔥 Guardar Cambios e Imágenes</button>
                <div style="flex-grow: 1;"></div>
                
                <div style="display: inline-flex; align-items: center; gap: 10px; width: 100%; max-width: max-content; flex-wrap: wrap;">
                    <span id="search-counter" class="mesim-counter-badge">Filtro inactivo</span>
                    <div class="mesim-search-wrapper">
                        <input type="text" id="mesim-live-search" class="mesim-search-input" placeholder="🔍 Buscar país, ID o precio en todo el catálogo...">
                        <span id="mesim-clear-btn" class="mesim-search-clear" title="Borrar filtro">×</span>
                    </div>
                </div>
            </div>

            <div id="progress-box" class="mesim-progress-box" style="display: none;">
                <div class="progress-header">
                    <span id="progress-status">Inicializando...</span>
                    <span id="progress-percentage">0%</span>
                </div>
                <div class="progress-bar-container">
                    <div id="progress-fill" class="progress-bar-fill"></div>
                </div>
                
                <div id="mesim-audit-results" class="mesim-audit-summary"></div>
                <div id="progress-log" style="font-size:11px; color:#64748b; margin-top:8px; font-family:monospace; max-height: 80px; overflow-y:auto;"></div>
            </div>

            <div class="pagination-container-box">
                <?php
                if ($total_pages > 1) {
                    echo '<div class="mesim-pagination">';
                    echo '<span style="font-size:13px; color:#64748b; margin-right:8px;">Bloques del catálogo:</span>';
                    for ($i = 1; $i <= $total_pages; $i++) {
                        $active_class = ($i === $current_page) ? 'page-active' : '';
                        echo "<a href='?page=mesim-parser&paged_batch={$i}' class='mesim-page-link {$active_class}'>Pág {$i}</a>";
                    }
                    echo '</div>';
                }
                ?>
            </div>

            <div class="mesim-table-wrapper">
                <table class="mesim-table" id="mesim-table-data">
                    <thead>
                        <tr>
                            <th style="width:90px;">Imagen</th>
                            <th style="width:80px;">ID</th>
                            <th>Producto (Actual ➔ Propuesta)</th>
                            <th>Propiedades</th>
                            <th>Zonificación</th>
                            <th>Metacampos JetEngine</th>
                            <th style="width:110px;">Precio & Mínimo</th>
                        </tr>
                    </thead>
                    <tbody id="mesim-table-body-target">
                        <?php
                        $products = get_posts([
                            'post_type'      => 'product',
                            'posts_per_page' => $per_page,
                            'offset'         => $offset,
                            'post_status'    => 'publish',
                            'orderby'        => 'ID',
                            'order'          => 'ASC'
                        ]);

                        if ( ! empty( $products ) ) {
                            foreach ( $products as $p ) {
                                $title = $p->post_title;
                                $slug  = $p->post_name;
                                $price = get_post_meta( $p->ID, '_price', true );
                                $thumb = get_post_meta( $p->ID, '_thumbnail_id', true );

                                $new_title = mesim_helper_clean_title( $title );
                                $new_slug  = mesim_helper_clean_slug( $slug );
                                $country  = mesim_helper_country( $new_title );
                                $coverage = mesim_helper_coverage( $new_title );
                                $data_dur = mesim_helper_data_duration( $new_title );

                                if ( $coverage === 'ninguno' ) {
                                    preg_match( '/^[^\d]+/', $new_title, $match );
                                    $country_key = isset( $match[0] ) ? strtolower( trim( html_entity_decode( $match[0], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) ) : strtolower( $new_title );
                                    $group_key = 'country|' . preg_replace( '/\s+/', ' ', $country_key );
                                } else {
                                    $group_key = 'zone|' . $coverage;
                                }

                                $is_cheapest = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['is_cheapest'] : '0';
                                $min_price = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['min_price'] : 0;

                                if ( ! empty( $thumb ) ) {
                                    $img_url = wp_get_attachment_image_url( $thumb, 'thumbnail' );
                                    $flag_txt = '<span style="color:#64748b;font-size:11px;">✅ Activa</span>';
                                } else {
                                    if ( ! empty( $global_data['flags'][$group_key] ) ) {
                                        $img_url = wp_get_attachment_image_url( $global_data['flags'][$group_key], 'thumbnail' );
                                        $flag_txt = '<span style="color:#e67e22;font-size:11px;font-weight:bold;">🔄 Heredará</span>';
                                    } else {
                                        $img_url = wc_placeholder_img_src();
                                        $flag_txt = '<span style="color:#94a3b8;font-size:11px;">❌ Vacía</span>';
                                    }
                                }

                                $title_render = ( $title !== $new_title ) ? "<span style='color:#94a3b8;text-decoration:line-through;font-size:11px;'>{$title}</span><br><span style='color:#0052cc;font-weight:bold;'>{$new_title}</span>" : "<span>{$new_title}</span>";
                                $dias_render = $data_dur['days'] ? $data_dur['days'] . ' días' : '—';

                                echo '<tr>';
                                echo "<td><img src='{$img_url}' style='width:40px;height:40px;border-radius:50%;object-fit:cover;' /><br>{$flag_txt}</td>";
                                echo "<td><code>#{$p->ID}</code></td>";
                                echo "<td>{$title_render}<br><small style='color:#64748b;'>Slug: {$new_slug}</small></td>";
                                echo "<td><span style='background:#e0f2fe;color:#0369a1;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold;'>⚡ Virtual</span></td>";
                                echo "<td>🏳️ <strong>{$country}</strong><br><code>{$coverage}</code></td>";
                                echo "<td data-label='JetEngine'>📦 " . ($data_dur['gb'] ? $data_dur['gb'].' '.$data_dur['unit'] : '—') . "<br>📅 {$dias_render}</td>";
                                echo "<td><span style='font-weight:600;'>{$price} €</span><br>" . ($is_cheapest === '1' ? '<span style="background:#2ecc71;color:#fff;padding:2px 4px;font-size:9px;border-radius:3px;font-weight:bold;">🏆 MÍNIMO</span>' : '<span style="color:#94a3b8;font-size:11px;">Mín: '.$min_price.'€</span>') . "</td>";
                                echo '</tr>';
                            }
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const scrollProgress = document.getElementById('mesim-scroll-progress');
            const scrollFill = document.getElementById('mesim-scroll-fill');
            const scrollText = document.getElementById('mesim-scroll-text');

            window.addEventListener('scroll', function() {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                if (scrollTop > 30) { scrollProgress.style.opacity = '1'; } else { scrollProgress.style.opacity = '0'; }
                scrollFill.style.width = scrollPercent + '%';
                scrollText.innerText = 'Progreso lectura catálogo: ' + Math.round(scrollPercent) + '%';
            });

            const searchInput = document.getElementById('mesim-live-search');
            const clearBtn = document.getElementById('mesim-clear-btn');
            const counterBadge = document.getElementById('search-counter');
            const tableBody = document.getElementById('mesim-table-body-target');
            const paginationBoxes = document.querySelectorAll('.pagination-container-box');
            let searchTimeout = null;
            const originalHtmlCache = tableBody.innerHTML;

            function resetSearchInterface() {
                searchInput.value = ''; clearBtn.style.display = 'none'; tableBody.innerHTML = originalHtmlCache;
                counterBadge.textContent = 'Filtro inactivo'; counterBadge.style.background = '#f1f5f9'; counterBadge.style.color = '#475569';
                paginationBoxes.forEach(p => p.style.display = 'block');
            }

            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    const term = this.value.trim(); clearTimeout(searchTimeout);
                    if (term === '') { resetSearchInterface(); return; }
                    clearBtn.style.display = 'block'; counterBadge.textContent = '🔍 Buscando...';
                    paginationBoxes.forEach(p => p.style.display = 'none');

                    searchTimeout = setTimeout(function() {
                        jQuery.ajax({
                            url: ajaxurl, type: 'POST', dataType: 'json',
                            data: { action: 'mesim_global_search_ajax', search_term: term },
                            success: function(response) {
                                if (response && response.success) {
                                    tableBody.innerHTML = response.data.html;
                                    counterBadge.textContent = '🎯 Encontrados: ' + response.data.count + ' eSIMs';
                                    counterBadge.style.background = '#e0f2fe'; counterBadge.style.color = '#0369a1';
                                } else {
                                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No se han encontrado resultados.</td></tr>';
                                    counterBadge.textContent = 'Encontrados: 0';
                                }
                            }
                        });
                    }, 400);
                });
            }

            if (clearBtn) { clearBtn.addEventListener('click', resetSearchInterface); }

            const btnStart = document.getElementById('btn-start-ajax');
            if (btnStart) {
                btnStart.addEventListener('click', function() {
                    if (!confirm('¿Quieres lanzar la sincronización masiva para indexar las traducciones multilenguaje fijas?')) return;
                    
                    const progressBox = document.getElementById('progress-box');
                    const progressFill = document.getElementById('progress-fill');
                    const progressStatus = document.getElementById('progress-status');
                    const progressPercentage = document.getElementById('progress-percentage');
                    const progressLog = document.getElementById('progress-log');
                    const auditResults = document.getElementById('mesim-audit-results');
                    
                    progressBox.style.display = 'block';
                    auditResults.style.display = 'none';
                    btnStart.disabled = true; btnStart.style.opacity = '0.5';
                    
                    let currentOffset = 0;
                    const limitPerRequest = 100;
                    const totalProducts = <?php echo $total_products; ?>;
                    
                    let successOperations = 0;
                    let failedOperations = 0;
                    
                    function runNextBatch() {
                        progressStatus.textContent = 'Procesando metabloque: ' + currentOffset + ' a ' + Math.min((currentOffset + limitPerRequest), totalProducts) + '...';
                        
                        jQuery.ajax({
                            url: ajaxurl, type: 'POST', dataType: 'json',
                            data: { action: 'mesim_execute_batch_ajax', offset: currentOffset, limit: limitPerRequest },
                            success: function(response) {
                                if (response && response.success) {
                                    let processedInBatch = Math.min(limitPerRequest, totalProducts - currentOffset);
                                    successOperations += processedInBatch;
                                    
                                    currentOffset += limitPerRequest;
                                    let percentage = Math.min(Math.round((currentOffset / totalProducts) * 100), 100);
                                    
                                    progressFill.style.width = percentage + '%';
                                    progressPercentage.textContent = percentage + '%';
                                    progressLog.innerHTML += '📦 Bloque OK: ' + Math.min(currentOffset, totalProducts) + ' / ' + totalProducts + ' listados.<br>';
                                    progressLog.scrollTop = progressLog.scrollHeight;
                                    
                                    if (currentOffset < totalProducts) {
                                        runNextBatch();
                                    } else {
                                        progressStatus.textContent = '🎉 ¡Proceso masivo completado!';
                                        progressStatus.style.color = '#27ae60';
                                        
                                        auditResults.innerHTML = '📊 <strong>Reporte de Auditoría final:</strong> Operaciones con éxito: <span style="color:#2ecc71;">' + successOperations + ' eSIMs</span> | Operaciones con fallo/reintentos: <span style="color:#e74c3c;">' + failedOperations + '</span>';
                                        auditResults.style.display = 'block';
                                        
                                        alert('Actualización virtual multilenguaje completada.');
                                        location.reload();
                                    }
                                } else {
                                    failedOperations += limitPerRequest;
                                    progressStatus.textContent = '❌ Error devuelto por la BD en lote. Saltando al siguiente bloque...';
                                    currentOffset += limitPerRequest;
                                    runNextBatch();
                                }
                            },
                            error: function() {
                                failedOperations += 1;
                                progressStatus.textContent = '❌ Parpadeo en red. Reintentando lote en 2 segundos...';
                                setTimeout(runNextBatch, 2000);
                            }
                        });
                    }
                    runNextBatch();
                });
            }
        });
    </script>
    <?php
}

/**
 * 5. MANEJADOR AJAX BUSQUEDA GLOBAL
 */
function mesim_global_search_ajax_handler_v291() {
    if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error();
    $search_term = isset($_POST['search_term']) ? sanitize_text_field($_POST['search_term']) : '';
    if ( empty($search_term) ) wp_send_json_error();

    $products = get_posts([
        'post_type'      => 'product', 'posts_per_page' => 150, 'post_status'    => 'publish',
        's'              => $search_term, 'orderby'        => 'ID', 'order'          => 'ASC'
    ]);

    $global_data = mesim_get_global_catalog_data();
    $html_output = ''; $count = count($products);

    if ( ! empty($products) ) {
        foreach ( $products as $p ) {
            $title = $p->post_title; $slug = $p->post_name;
            $price = get_post_meta( $p->ID, '_price', true );
            $thumb = get_post_meta( $p->ID, '_thumbnail_id', true );

            $new_title = mesim_helper_clean_title( $title ); $new_slug = mesim_helper_clean_slug( $slug );
            $country = mesim_helper_country( $new_title ); $coverage = mesim_helper_coverage( $new_title );
            $data_dur = mesim_helper_data_duration( $new_title );

            if ( $coverage === 'ninguno' ) {
                preg_match( '/^[^\d]+/', $new_title, $match );
                $country_key = isset( $match[0] ) ? strtolower( trim( html_entity_decode( $match[0], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) ) : strtolower( $new_title );
                $group_key = 'country|' . preg_replace( '/\s+/', ' ', $country_key );
            } else {
                $group_key = 'zone|' . $coverage;
            }

            $is_cheapest = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['is_cheapest'] : '0';
            $min_price = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['min_price'] : 0;

            if ( ! empty( $thumb ) ) {
                $img_url = wp_get_attachment_image_url( $thumb, 'thumbnail' ); $flag_txt = '<span style="color:#64748b;font-size:11px;">✅ Activa</span>';
            } else {
                $img_url = ! empty( $global_data['flags'][$group_key] ) ? wp_get_attachment_image_url( $global_data['flags'][$group_key], 'thumbnail' ) : wc_placeholder_img_src();
                $flag_txt = ! empty( $global_data['flags'][$group_key] ) ? '<span style="color:#e67e22;font-size:11px;font-weight:bold;">🔄 Heredará</span>' : '<span style="color:#94a3b8;font-size:11px;">❌ Vacía</span>';
            }

            $title_render = ( $title !== $new_title ) ? "<span style='color:#94a3b8;text-decoration:line-through;font-size:11px;'>{$title}</span><br><span style='color:#0052cc;font-weight:bold;'>{$new_title}</span>" : "<span>{$new_title}</span>";
            $dias_render = $data_dur['days'] ? $data_dur['days'] . ' días' : '—';

            $html_output .= '<tr>';
            $html_output .= "<td><img src='{$img_url}' style='width:40px;height:40px;border-radius:50%;object-fit:cover;' /><br>{$flag_txt}</td>";
            $html_output .= "<td><code>#{$p->ID}</code></td>";
            $html_output .= "<td>{$title_render}<br><small>Slug: {$new_slug}</small></td>";
            $html_output .= "<td><span style='background:#e0f2fe;color:#0369a1;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold;'>⚡ Virtual</span></td>";
            $html_output .= "<td>🏳️ <strong>{$country}</strong><br><code>{$coverage}</code></td>";
            $html_output .= "<td>📦 " . ($data_dur['gb'] ? $data_dur['gb'].' '.$data_dur['unit'] : '—') . "<br>📅 {$dias_render}</td>";
            $html_output .= "<td><strong>{$price} €</strong><br>" . ($is_cheapest === '1' ? '<span style="background:#2ecc71;color:#fff;padding:2px 4px;font-size:9px;border-radius:3px;font-weight:bold;">🏆 MÍNIMO</span>' : 'Mín: '.$min_price.'€') . "</td>";
            $html_output .= '</tr>';
        }
    } else {
        $html_output = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No se han encontrado resultados globales.</td></tr>';
    }
    wp_send_json_success([ 'html' => $html_output, 'count' => $count ]);
}

/**
 * 6. MANEJADOR AJAX BACKGROUND CORE
 */
function mesim_execute_batch_ajax_handler_v291() {
    if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error();

    $offset = isset($_POST['offset']) ? intval($_POST['offset']) : 0;
    $limit  = isset($_POST['limit']) ? intval($_POST['limit']) : 100;

    $products = get_posts([
        'post_type'      => 'product', 'posts_per_page' => $limit, 'offset'         => $offset,
        'post_status'    => 'publish', 'orderby'        => 'ID', 'order'          => 'ASC'
    ]);

    $global_data = mesim_get_global_catalog_data();

    if ( ! empty( $products ) ) {
        foreach ( $products as $p ) {
            $title = $p->post_title; $slug = $p->post_name;
            $thumb = get_post_meta( $p->ID, '_thumbnail_id', true );

            $terms = wp_get_post_terms( $p->ID, 'product_cat' );
            $proposed_ids = [];
            if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
                foreach ( $terms as $t_obj ) {
                    $t_slug = strtolower( $t_obj->slug );
                    if ( $t_slug !== 'esim' && $t_slug !== 'single' && $t_slug !== 'uncategorized' ) {
                        $proposed_ids[] = $t_obj->term_id;
                    }
                }
            }
            if ( ! empty( $proposed_ids ) ) wp_set_post_terms( $p->ID, $proposed_ids, 'product_cat' );

            $new_title = mesim_helper_clean_title( $title ); $new_slug = mesim_helper_clean_slug( $slug );
            $country = mesim_helper_country( $new_title ); $coverage = mesim_helper_coverage( $new_title );
            $data_dur = mesim_helper_data_duration( $new_title );

            if ( $coverage === 'ninguno' ) {
                preg_match( '/^[^\d]+/', $new_title, $match );
                $country_key = isset( $match[0] ) ? strtolower( trim( html_entity_decode( $match[0], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) ) : strtolower( $new_title );
                $group_key = 'country|' . preg_replace( '/\s+/', ' ', $country_key );
            } else {
                $group_key = 'zone|' . $coverage;
            }

            $is_cheapest = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['is_cheapest'] : '0';
            $min_price = isset($global_data['cheapest'][$p->ID]) ? $global_data['cheapest'][$p->ID]['min_price'] : 0;

            $new_content = preg_replace_callback('/<div[^>]*class="[^"]*info-item[^"]*"[^>]*>(.*?)<\/div>/is', function($m) {
                return (stripos($m[0], 'Duration') !== false) ? preg_replace('/\bDayss\b/i', 'Days', $m[0]) : $m[0];
            }, $p->post_content);

            $post_update_data = [
                'ID'           => $p->ID,
                'post_title'   => $new_title,
                'post_name'    => $new_slug,
                'post_content' => $new_content
            ];

            if ( empty( $thumb ) && ! empty( $global_data['flags'][$group_key] ) ) {
                $post_update_data['meta_input'] = [ '_thumbnail_id' => $global_data['flags'][$group_key] ];
            }

            wp_update_post( $post_update_data );

            update_post_meta( $p->ID, 'country_name', $country );
            update_post_meta( $p->ID, 'coverage', $coverage );
            update_post_meta( $p->ID, 'mas_barato', $is_cheapest );
            update_post_meta( $p->ID, 'min_price_country', $min_price );
            
            update_post_meta( $p->ID, '_virtual', 'yes' );
            update_post_meta( $p->ID, '_downloadable', 'no' );
            update_post_meta( $p->ID, '_visibility', 'visible' );
            update_post_meta( $p->ID, '_stock_status', 'instock' );

            $keywords = array_unique([$country, $title, $new_title, 'Ethiopia', 'Etiopía', 'Etiopia', 'South America', 'América del Sur', 'South-America']);
            update_post_meta( $p->ID, 'search_keywords', implode(', ', $keywords) );

            $upper_t = strtoupper($new_title);
            $fup = (strpos($upper_t, 'FUP1MBPS') !== false) ? 'Fub-1MBPS' : ((strpos($upper_t, 'FUP128KBPS') !== false || strpos($upper_t, 'FUP-128KBPS') !== false) ? 'Fub-128KBPS' : 'normal');
            $net = (strpos(strtolower($new_title), 'nonhkip') !== false) ? 'nonhkip' : 'standard';
            update_post_meta( $p->ID, 'fup_speed', $fup );
            update_post_meta( $p->ID, 'network_type', $net );

            if ( $data_dur['gb'] ) {
                update_post_meta( $p->ID, 'data_gb', $data_dur['gb'] );
                update_post_meta( $p->ID, 'data_unit', strtolower($data_dur['unit']) );
            }
            if ( $data_dur['days'] ) {
                update_post_meta( $p->ID, 'duration_days', $data_dur['days'] );
                update_post_meta( $p->ID, 'duration_label', ($data_dur['days'] == 1 ? '1 Day' : $data_dur['days'] . ' Days') );
            }

            clean_post_cache($p->ID);
            if ( function_exists('wc_delete_product_transients') ) {
                wc_delete_product_transients($p->ID);
            }
        }
    }

    wp_cache_flush();
    wp_send_json_success();
}

/**
 * 7. COMPLEMENTOS MANTENIDOS
 */
if ( ! function_exists( 'mesim_sys_autocomplete' ) ) {
    add_action( 'woocommerce_payment_complete', 'mesim_sys_autocomplete' );
    function mesim_sys_autocomplete( $order_id ) {
        if ( ! $order_id ) return;
        $order = wc_get_order( $order_id );
        if ( $order && $order->is_paid() ) {
            $order->update_status( 'completed', 'eSIM Auto.' );
        }
    }
}