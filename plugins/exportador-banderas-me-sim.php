<?php
/**
 * Plugin Name: Exportador de Banderas ME-SIM
 * Plugin URI: https://me-sim.com/
 * Description: Exporta las banderas de los productos de WooCommerce integrando las reglas del ME-SIM Catálogo Parser V2. Renombra por código ISO o zona de cobertura, genera flags.json y empaqueta en ZIP descargable.
 * Version: 2.1.2
 * Author: Paco Fernández & Antigravity
 * Author URI: https://me-sim.com/
 * License: GPL2
 * Text Domain: exportador-banderas-me-sim
 */

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * 1. DICCIONARIO EXHAUSTIVO DE MAPEO PAÍS EN ESPAÑOL/INGLÉS A ISO (2 LETRAS)
 */
function ebms_get_iso_mapping() {
    static $iso_map = null;
    if ( $iso_map !== null ) {
        return $iso_map;
    }

    $iso_map = array(
        // América
        'aruba' => 'aw',
        'argentina' => 'ar',
        'antigua y barbuda' => 'ag',
        'antigua & barbuda' => 'ag',
        'bahamas' => 'bs',
        'barbados' => 'bb',
        'belice' => 'bz',
        'belize' => 'bz',
        'bolivia' => 'bo',
        'brasil' => 'br',
        'brazil' => 'br',
        'canadá' => 'ca',
        'canada' => 'ca',
        'chile' => 'cl',
        'colombia' => 'co',
        'costa rica' => 'cr',
        'cuba' => 'cu',
        'dominica' => 'dm',
        'ecuador' => 'ec',
        'el salvador' => 'sv',
        'estados unidos' => 'us',
        'united states' => 'us',
        'usa' => 'us',
        'eeuu' => 'us',
        'ee.uu.' => 'us',
        'granada' => 'gd',
        'grenada' => 'gd',
        'guatemala' => 'gt',
        'guyana' => 'gy',
        'haití' => 'ht',
        'haiti' => 'ht',
        'honduras' => 'hn',
        'jamaica' => 'jm',
        'méxico' => 'mx',
        'mexico' => 'mx',
        'nicaragua' => 'ni',
        'panamá' => 'pa',
        'panama' => 'pa',
        'paraguay' => 'py',
        'perú' => 'pe',
        'peru' => 'pe',
        'puerto rico' => 'pr',
        'república dominicana' => 'do',
        'republica dominicana' => 'do',
        'dominican republic' => 'do',
        'san cristóbal y nieves' => 'kn',
        'st kitts & nevis' => 'kn',
        'santa lucía' => 'lc',
        'st lucia' => 'lc',
        'san vicente y las granadinas' => 'vc',
        'st vincent & grenadines' => 'vc',
        'surinam' => 'sr',
        'suriname' => 'sr',
        'trinidad y tobago' => 'tt',
        'trinidad & tobago' => 'tt',
        'uruguay' => 'uy',
        'venezuela' => 've',

        // Europa
        'albania' => 'al',
        'alemania' => 'de',
        'germany' => 'de',
        'andorra' => 'ad',
        'armenia' => 'am',
        'austria' => 'at',
        'azerbaiyán' => 'az',
        'azerbaijan' => 'az',
        'bélgica' => 'be',
        'belgium' => 'be',
        'bielorrusia' => 'by',
        'belarus' => 'by',
        'bosnia y herzegovina' => 'ba',
        'bosnia & herzegovina' => 'ba',
        'bosnia' => 'ba',
        'bulgaria' => 'bg',
        'chipre' => 'cy',
        'cyprus' => 'cy',
        'ciudad del vaticano' => 'va',
        'vatican city' => 'va',
        'croacia' => 'hr',
        'croatia' => 'hr',
        'dinamarca' => 'dk',
        'denmark' => 'dk',
        'eslovaquia' => 'sk',
        'slovakia' => 'sk',
        'eslovenia' => 'si',
        'slovenia' => 'si',
        'españa' => 'es',
        'espana' => 'es',
        'spain' => 'es',
        'estonia' => 'ee',
        'finlandia' => 'fi',
        'finland' => 'fi',
        'francia' => 'fr',
        'france' => 'fr',
        'georgia' => 'ge',
        'gibraltar' => 'gi',
        'grecia' => 'gr',
        'greece' => 'gr',
        'groenlandia' => 'gl',
        'greenland' => 'gl',
        'hungría' => 'hu',
        'hungary' => 'hu',
        'irlanda' => 'ie',
        'ireland' => 'ie',
        'islandia' => 'is',
        'iceland' => 'is',
        'italia' => 'it',
        'italy' => 'it',
        'letonia' => 'lv',
        'latvia' => 'lv',
        'liechtenstein' => 'li',
        'lituania' => 'lt',
        'lithuania' => 'lt',
        'luxemburgo' => 'lu',
        'luxembourg' => 'lu',
        'macedonia del norte' => 'mk',
        'north macedonia' => 'mk',
        'macedonia' => 'mk',
        'malta' => 'mt',
        'moldavia' => 'md',
        'moldova' => 'md',
        'mónaco' => 'mc',
        'monaco' => 'mc',
        'montenegro' => 'me',
        'noruega' => 'no',
        'norway' => 'no',
        'países bajos' => 'nl',
        'paises bajos' => 'nl',
        'netherlands' => 'nl',
        'holanda' => 'nl',
        'polonia' => 'pl',
        'poland' => 'pl',
        'portugal' => 'pt',
        'reino unido' => 'gb',
        'united kingdom' => 'gb',
        'uk' => 'gb',
        'inglaterra' => 'gb',
        'england' => 'gb',
        'república checa' => 'cz',
        'republica checa' => 'cz',
        'czech republic' => 'cz',
        'czechia' => 'cz',
        'rumanía' => 'ro',
        'rumania' => 'ro',
        'romania' => 'ro',
        'rusia' => 'ru',
        'russia' => 'ru',
        'san marino' => 'sm',
        'serbia' => 'rs',
        'suecia' => 'se',
        'sweden' => 'se',
        'suiza' => 'ch',
        'switzerland' => 'ch',
        'turquía' => 'tr',
        'turquia' => 'tr',
        'turkey' => 'tr',
        'türkiye' => 'tr',
        'ucrania' => 'ua',
        'ukraine' => 'ua',

        // Asia & Oceanía
        'afganistán' => 'af',
        'afghanistan' => 'af',
        'arabia saudita' => 'sa',
        'arabia saudí' => 'sa',
        'saudi arabia' => 'sa',
        'australia' => 'au',
        'bangladés' => 'bd',
        'bangladesh' => 'bd',
        'baréin' => 'bh',
        'bahrain' => 'bh',
        'birmania' => 'mm',
        'myanmar' => 'mm',
        'brunéi' => 'bn',
        'brunei' => 'bn',
        'bután' => 'bt',
        'bhutan' => 'bt',
        'camboya' => 'kh',
        'cambodia' => 'kh',
        'catar' => 'qa',
        'qatar' => 'qa',
        'china' => 'cn',
        'china mainland' => 'cn',
        'corea del sur' => 'kr',
        'south korea' => 'kr',
        'corea' => 'kr',
        'korea' => 'kr',
        'corea del norte' => 'kp',
        'north korea' => 'kp',
        'emiratos árabes unidos' => 'ae',
        'united arab emirates' => 'ae',
        'uae' => 'ae',
        'eau' => 'ae',
        'filipinas' => 'ph',
        'philippines' => 'ph',
        'fiyi' => 'fj',
        'fiji' => 'fj',
        'hong kong' => 'hk',
        'hk' => 'hk',
        'india' => 'in',
        'indonesia' => 'id',
        'irak' => 'iq',
        'iraq' => 'iq',
        'irán' => 'ir',
        'iran' => 'ir',
        'islas marshall' => 'mh',
        'marshall islands' => 'mh',
        'islas salomón' => 'sb',
        'solomon islands' => 'sb',
        'israel' => 'il',
        'japón' => 'jp',
        'japon' => 'jp',
        'japan' => 'jp',
        'jordania' => 'jo',
        'jordan' => 'jo',
        'kazajistán' => 'kz',
        'kazakhstan' => 'kz',
        'kirguistán' => 'kg',
        'kyrgyzstan' => 'kg',
        'kiribati' => 'ki',
        'kuwait' => 'kw',
        'laos' => 'la',
        'líbano' => 'lb',
        'lebanon' => 'lb',
        'macao' => 'mo',
        'macau' => 'mo',
        'malasia' => 'my',
        'malaysia' => 'my',
        'maldivas' => 'mv',
        'maldives' => 'mv',
        'mongolia' => 'mn',
        'nauru' => 'nr',
        'nepal' => 'np',
        'nueva zelanda' => 'nz',
        'new zealand' => 'nz',
        'omán' => 'om',
        'oman' => 'om',
        'pakistán' => 'pk',
        'pakistan' => 'pk',
        'palaos' => 'pw',
        'palau' => 'pw',
        'palestina' => 'ps',
        'palestine' => 'ps',
        'papúa nueva guinea' => 'pg',
        'papua new guinea' => 'pg',
        'samoa' => 'ws',
        'singapur' => 'sg',
        'singapore' => 'sg',
        'siria' => 'sy',
        'syria' => 'sy',
        'sri lanka' => 'lk',
        'tailandia' => 'th',
        'thailand' => 'th',
        'taiwán' => 'tw',
        'taiwan' => 'tw',
        'tayikistán' => 'tj',
        'tajikistan' => 'tj',
        'timor oriental' => 'tl',
        'east timor' => 'tl',
        'tonga' => 'to',
        'turkmenistán' => 'tm',
        'turkmenistan' => 'tm',
        'tuvalu' => 'tv',
        'uzbekistán' => 'uz',
        'uzbekistan' => 'uz',
        'vanuatu' => 'vu',
        'vietnam' => 'vn',
        'yemen' => 'ye',

        // África
        'angola' => 'ao',
        'argelia' => 'dz',
        'algeria' => 'dz',
        'benín' => 'bj',
        'benin' => 'bj',
        'botsuana' => 'bw',
        'botswana' => 'bw',
        'burkina faso' => 'bf',
        'burundi' => 'bi',
        'cabo verde' => 'cv',
        'cape verde' => 'cv',
        'camerún' => 'cm',
        'cameroon' => 'cm',
        'chad' => 'td',
        'comoras' => 'km',
        'comoros' => 'km',
        'costa de marfil' => 'ci',
        'ivory coast' => 'ci',
        'egipto' => 'eg',
        'egypt' => 'eg',
        'eritrea' => 'er',
        'etiopía' => 'et',
        'etiopia' => 'et',
        'ethiopia' => 'et',
        'gabón' => 'ga',
        'gabon' => 'ga',
        'gambia' => 'gm',
        'ghana' => 'gh',
        'guinea' => 'gn',
        'guinea-bisáu' => 'gw',
        'guinea ecuatorial' => 'gq',
        'lesoto' => 'ls',
        'lesotho' => 'ls',
        'liberia' => 'lr',
        'libia' => 'ly',
        'libya' => 'ly',
        'madagascar' => 'mg',
        'malaui' => 'mw',
        'malawi' => 'mw',
        'malí' => 'ml',
        'mali' => 'ml',
        'marruecos' => 'ma',
        'morocco' => 'ma',
        'mauricio' => 'mu',
        'mauritius' => 'mu',
        'mauritania' => 'mr',
        'mozambique' => 'mz',
        'namibia' => 'na',
        'níger' => 'ne',
        'niger' => 'ne',
        'nigeria' => 'ng',
        'república centroafricana' => 'cf',
        'república del congo' => 'cg',
        'república democrática del congo' => 'cd',
        'ruanda' => 'rw',
        'rwanda' => 'rw',
        'santo tomé y príncipe' => 'st',
        'senegal' => 'sn',
        'seychelles' => 'sc',
        'sierra leona' => 'sl',
        'sierra leone' => 'sl',
        'somalia' => 'so',
        'sudáfrica' => 'za',
        'south africa' => 'za',
        'sudafrika' => 'za',
        'sudán' => 'sd',
        'sudan' => 'sd',
        'sudán del sur' => 'ss',
        'south sudan' => 'ss',
        'swazilandia' => 'sz',
        'esuatini' => 'sz',
        'tanzania' => 'tz',
        'togo' => 'tg',
        'túnez' => 'tn',
        'tunisia' => 'tn',
        'uganda' => 'ug',
        'yibuti' => 'dj',
        'djibouti' => 'dj',
        'zambia' => 'zm',
        'zimbabue' => 'zw',
        'zimbabwe' => 'zw',

        // Additional Territories & Hyphenated Variations
        'aland islands' => 'ax',
        'aland-islands' => 'ax',
        'islas aland' => 'ax',
        'anguilla' => 'ai',
        'anguila' => 'ai',
        'antigua and barbuda' => 'ag',
        'antigua-and-barbuda' => 'ag',
        'bermuda' => 'bm',
        'bermudas' => 'bm',
        'cayman islands' => 'ky',
        'cayman-islands' => 'ky',
        'cayman-lslands' => 'ky',
        'islas caimán' => 'ky',
        'islas caiman' => 'ky',
        'cote d\'ivoire' => 'ci',
        'cote-divoire' => 'ci',
        'côte d\'ivoire' => 'ci',
        'curacao' => 'cw',
        'curaçao' => 'cw',
        'curazao' => 'cw',
        'democratic republic of the congo' => 'cd',
        'democratic-republic-of-the-congo' => 'cd',
        'eswatini' => 'sz',
        'etiopia' => 'et',
        'etiopía' => 'et',
        'faroe islands' => 'fo',
        'faroe-islands' => 'fo',
        'islas feroe' => 'fo',
        'french guiana' => 'gf',
        'french-guiana' => 'gf',
        'guayana francesa' => 'gf',
        'french polynesia' => 'pf',
        'french-polynesia' => 'pf',
        'polinesia francesa' => 'pf',
        'guadeloupe' => 'gp',
        'guadalupe' => 'gp',
        'guam' => 'gu',
        'guernsey' => 'gg',
        'isle of man' => 'im',
        'isle-of-man' => 'im',
        'isla de man' => 'im',
        'jersey' => 'je',
        'kenya' => 'ke',
        'kenia' => 'ke',
        'martinique' => 'mq',
        'martinica' => 'mq',
        'mayotte' => 'yt',
        'montserrat' => 'ms',
        'philippine' => 'ph',
        'republic of the congo' => 'cg',
        'republic-of-the-congo' => 'cg',
        'reunion' => 're',
        'réunion' => 're',
        'reunión' => 're',
        'saint barthelemy' => 'bl',
        'saint-barthelemy' => 'bl',
        'san bartolomé' => 'bl',
        'saint kitts and nevis' => 'kn',
        'saint-kitts-and-nevis' => 'kn',
        'saint lucia' => 'lc',
        'saint-lucia' => 'lc',
        'saint martin' => 'mf',
        'saint-martin' => 'mf',
        'san martín' => 'mf',
        'saint vincent and the grenadines' => 'vc',
        'saint-vincent-and-the-grenadines' => 'vc',
        'trinidad and tobago' => 'tt',
        'trinidad-and-tobago' => 'tt',
        'turks and caicos islands' => 'tc',
        'turks-and-caicos-islands' => 'tc',
        'islas turcas y caicos' => 'tc',
        'virgin islands british' => 'vg',
        'virgin-islands-british' => 'vg',
        'british virgin islands' => 'vg',
        'islas vírgenes británicas' => 'vg'
    );

    // Sort descending by string length of keys so longer strings match first
    uksort( $iso_map, function( $a, $b ) {
        return mb_strlen( $b, 'UTF-8' ) - mb_strlen( $a, 'UTF-8' );
    });

    return $iso_map;
}

/**
 * 2. FUNCIONES DE EXTRACCIÓN Y PARSEO DEL CATALOG PARSER V2.9.1
 */
function ebms_helper_clean_title( $title ) {
    $t = html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
    return trim( preg_replace( '/^eSIM\s+/i', '', $t ) );
}

function ebms_helper_coverage( $title ) {
    $t = strtolower( html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
    if ( strpos( $t, 'europe' ) !== false && strpos( $t, 'morocco' ) !== false ) {
        return 'europe-morocco';
    }

    $regiones = array(
        'Global' => 'global', 
        'Central Asia' => 'central-asia', 
        'Ireland & Slovenia' => 'ireland-slovenia',
        'Ireland & Uk' => 'ireland-uk', 
        'Japan & South Korea' => 'japan-south-korea',
        'Australia & United Kingdom (UK) & United States (USA)' => 'aukus', 
        'Oceania Orange' => 'oceania-orange',
        'Middle East & North Africa' => 'middle-east-north-africa', 
        'Asia' => 'asia', 
        'Europe' => 'europe',
        'Caribbean' => 'caribbean', 
        'Balkans' => 'balkans', 
        'Usa & Canada' => 'usa-canada',
        'Australia & New Zealand' => 'australia-new-zealand', 
        'Middle East' => 'middle-east',
        'China Mainland & Japan & South Korea' => 'china-mainland-japan-south-korea', 
        'Gulf Region' => 'gulf-region',
        'Africa' => 'africa', 
        'Singapore & Malaysia & Thailand' => 'singapore-malaysia-thailand',
        'Singapore & Malaysia & Vietnam & Thailand & Indonesia' => 'singapore-malaysia-vietnam-thailand-indonesia',
        'China Mainland & Hk' => 'china-mainland-hong-kong', 
        'Singapore & Malaysia' => 'singapore-malaysia',
        'South America' => 'south-america',
        'Latin America' => 'latin-america',
        'North America' => 'north-america',
        'Central America' => 'central-america',
        'Oceania' => 'oceania'
    );

    foreach ( $regiones as $l => $v ) {
        if ( strpos( $t, strtolower( $l ) ) !== false ) {
            return $v;
        }
    }

    return 'ninguno';
}

function ebms_helper_country( $title ) {
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

/**
 * Obtiene la información procesada de país / código ISO / zona para un producto
 */
function ebms_get_product_flag_info( $product_id, $product_title ) {
    $country_meta  = get_post_meta( $product_id, 'country_name', true );
    $coverage_meta = get_post_meta( $product_id, 'coverage', true );

    // Purge legacy postmeta override where Etiopía was saved as a coverage zone
    if ( strtolower( $coverage_meta ) === 'etiopia' || strtolower( $coverage_meta ) === 'ethiopia' ) {
        $coverage_meta = 'ninguno';
        if ( empty( $country_meta ) ) {
            $country_meta = 'Etiopía';
        }
    }

    $clean_title = ebms_helper_clean_title( $product_title );

    if ( empty( $coverage_meta ) ) {
        $coverage_meta = ebms_helper_coverage( $clean_title );
    }

    if ( empty( $country_meta ) ) {
        $country_meta = ebms_helper_country( $clean_title );
    }

    // Si es una zona/región
    if ( ! empty( $coverage_meta ) && $coverage_meta !== 'ninguno' ) {
        return array(
            'country_raw' => $country_meta ? $country_meta : $coverage_meta,
            'code'        => strtolower( $coverage_meta ),
            'is_region'   => true,
        );
    }

    // Si es un país individual
    $iso_mapping = ebms_get_iso_mapping();
    $country_lower = mb_strtolower( trim( $country_meta ), 'UTF-8' );

    $code = null;
    if ( isset( $iso_mapping[$country_lower] ) ) {
        $code = $iso_mapping[$country_lower];
    } else {
        foreach ( $iso_mapping as $c_name => $c_code ) {
            if ( mb_strpos( $country_lower, $c_name ) !== false ) {
                $code = $c_code;
                break;
            }
        }
    }

    if ( ! $code ) {
        $code = sanitize_title( $country_meta );
    }
    if ( empty( $code ) ) {
        $code = sanitize_title( $clean_title );
    }

    return array(
        'country_raw' => $country_meta ? $country_meta : $clean_title,
        'code'        => strtolower( $code ),
        'is_region'   => false,
    );
}

/**
 * 3. MENÚ DE ADMINISTRACIÓN NATIVO
 */
add_action( 'admin_menu', 'ebms_add_admin_menu' );
function ebms_add_admin_menu() {
    add_menu_page(
        'Exportador de Banderas ME-SIM',
        'Exportar Banderas',
        'manage_options',
        'exportador-banderas-me-sim',
        'ebms_admin_page_layout',
        'dashicons-translation',
        58
    );
}

/**
 * 4. DIAGNÓSTICO EN TIEMPO REAL DE PRODUCTOS
 */
function ebms_get_products_diagnostics() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        return array();
    }

    $products = get_posts( array(
        'post_type'      => 'product',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'orderby'        => 'ID',
        'order'          => 'DESC'
    ) );

    $diagnostics = array();
    $processed_codes = array();

    foreach ( $products as $product ) {
        $flag_info = ebms_get_product_flag_info( $product->ID, $product->post_title );

        $thumbnail_id = get_post_thumbnail_id( $product->ID );
        $image_url = $thumbnail_id ? wp_get_attachment_url( $thumbnail_id ) : '';
        
        $code = $flag_info['code'];
        $status = 'ready';
        $message = 'Listo para exportar';

        if ( empty( $code ) ) {
            $status = 'no_country';
            $message = 'País/Zona no detectado';
        } elseif ( ! $thumbnail_id ) {
            $status = 'no_image';
            $message = 'Sin imagen destacada';
        } elseif ( in_array( $code, $processed_codes ) ) {
            $status = 'duplicate';
            $message = 'Ignorado (Duplicado: ' . strtoupper( $code ) . ')';
        } else {
            $processed_codes[] = $code;
        }

        $diagnostics[] = array(
            'id'            => $product->ID,
            'title'         => $product->post_title,
            'country'       => $flag_info['country_raw'],
            'code'          => $code,
            'is_region'     => $flag_info['is_region'],
            'image_url'     => $image_url,
            'status'        => $status,
            'message'       => $message
        );
    }

    return $diagnostics;
}

/**
 * 5. RENDERING DE LA PÁGINA PRINCIPAL DE ADMINISTRACIÓN
 */
function ebms_admin_page_layout() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        echo '<div class="notice notice-error"><p>WooCommerce no está activo en este sitio.</p></div>';
        return;
    }

    $diagnostics = ebms_get_products_diagnostics();
    $total_products = count( $diagnostics );
    $total_ready = 0;
    $total_no_country = 0;
    $total_no_image = 0;
    $total_duplicate = 0;

    foreach ( $diagnostics as $item ) {
        if ( $item['status'] === 'ready' ) {
            $total_ready++;
        } elseif ( $item['status'] === 'no_country' ) {
            $total_no_country++;
        } elseif ( $item['status'] === 'no_image' ) {
            $total_no_image++;
        } elseif ( $item['status'] === 'duplicate' ) {
            $total_duplicate++;
        }
    }
    ?>
    <div class="wrap" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
        <h1 style="font-weight: 700; margin-bottom: 20px; color: #1d2327;">Exportador de Banderas ME-SIM <span style="font-size: 13px; background: #FFEC00; color: #1a1a1a; padding: 4px 10px; border-radius: 12px; font-weight: bold; margin-left: 10px;">v2.0.0</span></h1>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 25px;">
            <!-- Main Card -->
            <div style="flex: 1 1 350px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; border: 1px solid #e0e0e0;">
                <h2 style="margin-top: 0; font-size: 18px; font-weight: 600; color: #1d2327;">Panel de Exportación de Banderas</h2>
                <p style="color: #646970; font-size: 14px; line-height: 1.5;">Extrae las imágenes destacadas de los productos publicadas integrando la lógica oficial del <strong>Catálogo Parser V2.9.1</strong>, renombra a su código ISO/Zona, guarda <code>flags.json</code> y comprime en <code>banderas-me-sim.zip</code>.</p>
                
                <div style="display: flex; gap: 10px; margin-top: 25px; flex-wrap: wrap;">
                    <form method="post" action="">
                        <?php wp_nonce_field( 'ebms_export_action', 'ebms_export_nonce' ); ?>
                        <input type="submit" name="ebms_start_export" class="button button-primary button-large" style="height: 46px; padding: 0 24px; font-size: 15px; font-weight: 600; border-radius: 6px; background: #2271b1;" value="Exportar Banderas a ZIP">
                    </form>

                    <form method="post" action="">
                        <?php wp_nonce_field( 'ebms_diagnostic_action', 'ebms_diagnostic_nonce' ); ?>
                        <input type="submit" name="ebms_download_diagnostics" class="button button-secondary button-large" style="height: 46px; padding: 0 24px; font-size: 15px; font-weight: 600; border-radius: 6px;" value="Descargar Log (JSON)">
                    </form>
                </div>
            </div>

            <!-- Stats Widget -->
            <div style="flex: 1 1 300px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px; border: 1px solid #e0e0e0; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: #f6f7f7; padding: 15px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700; color: #1d2327;"><?php echo esc_html( $total_products ); ?></div>
                    <div style="font-size: 12px; color: #646970; font-weight: 500; margin-top: 4px;">Productos Totales</div>
                </div>
                <div style="background: #e7f5ec; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #00a32a;">
                    <div style="font-size: 28px; font-weight: 700; color: #008a20;"><?php echo esc_html( $total_ready ); ?></div>
                    <div style="font-size: 12px; color: #008a20; font-weight: 500; margin-top: 4px;">Banderas Únicas</div>
                </div>
                <div style="background: #fcf0f1; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #d63638;">
                    <div style="font-size: 28px; font-weight: 700; color: #b32d2e;"><?php echo esc_html( $total_no_country + $total_no_image ); ?></div>
                    <div style="font-size: 12px; color: #b32d2e; font-weight: 500; margin-top: 4px;">Sin Imagen / Código</div>
                </div>
                <div style="background: #fbf5e6; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #dba617;">
                    <div style="font-size: 28px; font-weight: 700; color: #bd8600;"><?php echo esc_html( $total_duplicate ); ?></div>
                    <div style="font-size: 12px; color: #bd8600; font-weight: 500; margin-top: 4px;">Duplicados</div>
                </div>
            </div>
        </div>

        <h2 style="font-weight: 600; font-size: 20px; margin: 30px 0 15px 0;">Detalle de Diagnóstico del Catálogo</h2>
        <div style="background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; overflow-x: auto;">
            <table class="wp-list-table widefat fixed striped table-view-list" style="border: none; border-collapse: collapse; width: 100%;">
                <thead>
                    <tr style="background: #f6f7f7;">
                        <th style="font-weight: 600; padding: 12px 15px; width: 60px;">ID</th>
                        <th style="font-weight: 600; padding: 12px 15px;">Título del Producto</th>
                        <th style="font-weight: 600; padding: 12px 15px; width: 160px;">País/Zona Detectado</th>
                        <th style="font-weight: 600; padding: 12px 15px; width: 130px; text-align: center;">Código Final</th>
                        <th style="font-weight: 600; padding: 12px 15px; width: 80px; text-align: center;">Miniatura</th>
                        <th style="font-weight: 600; padding: 12px 15px; width: 220px;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ( empty( $diagnostics ) ): ?>
                        <tr>
                            <td colspan="6" style="padding: 20px; text-align: center; color: #646970;">No se encontraron productos de WooCommerce.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ( $diagnostics as $item ): 
                            $badge_style = 'padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; display: inline-block;';
                            if ( $item['status'] === 'ready' ) {
                                $badge_style .= 'background: #e7f5ec; color: #008a20;';
                            } elseif ( $item['status'] === 'duplicate' ) {
                                $badge_style .= 'background: #fbf5e6; color: #bd8600;';
                            } else {
                                $badge_style .= 'background: #fcf0f1; color: #b32d2e;';
                            }
                        ?>
                            <tr>
                                <td style="padding: 12px 15px; vertical-align: middle;"><?php echo esc_html( $item['id'] ); ?></td>
                                <td style="padding: 12px 15px; vertical-align: middle; font-weight: 500;"><?php echo esc_html( $item['title'] ); ?></td>
                                <td style="padding: 12px 15px; vertical-align: middle; color: #1d2327; font-weight: 500;">
                                    <?php echo esc_html( $item['country'] ? ucfirst( $item['country'] ) : '-' ); ?>
                                    <?php if ( $item['is_region'] ): ?>
                                        <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 5px; border-radius: 3px; margin-left: 4px;">Zona</span>
                                    <?php endif; ?>
                                </td>
                                <td style="padding: 12px 15px; vertical-align: middle; text-align: center; font-family: monospace; font-weight: bold;"><?php echo esc_html( $item['code'] ? strtoupper( $item['code'] ) : '-' ); ?></td>
                                <td style="padding: 12px 15px; vertical-align: middle; text-align: center;">
                                    <?php if ( $item['image_url'] ): ?>
                                        <img src="<?php echo esc_url( $item['image_url'] ); ?>" style="width: 32px; height: auto; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); display: inline-block;" />
                                    <?php else: ?>
                                        <span style="color: #a7aaad;">—</span>
                                    <?php endif; ?>
                                </td>
                                <td style="padding: 12px 15px; vertical-align: middle;">
                                    <span style="<?php echo esc_attr( $badge_style ); ?>"><?php echo esc_html( $item['message'] ); ?></span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php
}

/**
 * 6. CONTROLADORES DE Peticiones (Exportación y Descarga de JSON)
 */
add_action( 'admin_init', 'ebms_handle_export_request' );
function ebms_handle_export_request() {
    if ( isset( $_POST['ebms_start_export'] ) ) {
        if ( ! isset( $_POST['ebms_export_nonce'] ) || ! wp_verify_nonce( $_POST['ebms_export_nonce'], 'ebms_export_action' ) ) {
            wp_die( 'Error de validación de seguridad (Nonce no válido).' );
        }
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'No tienes permisos suficientes para realizar esta acción.' );
        }
        ebms_run_export();
    }
}

add_action( 'admin_init', 'ebms_handle_diagnostic_request' );
function ebms_handle_diagnostic_request() {
    if ( isset( $_POST['ebms_download_diagnostics'] ) ) {
        if ( ! isset( $_POST['ebms_diagnostic_nonce'] ) || ! wp_verify_nonce( $_POST['ebms_diagnostic_nonce'], 'ebms_diagnostic_action' ) ) {
            wp_die( 'Error de validación de seguridad (Nonce no válido).' );
        }
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'No tienes permisos suficientes para realizar esta acción.' );
        }
        ebms_run_diagnostic_download();
    }
}

function ebms_run_diagnostic_download() {
    $diagnostics = ebms_get_products_diagnostics();
    
    header( 'Content-Description: File Transfer' );
    header( 'Content-Type: application/json; charset=utf-8' );
    header( 'Content-Disposition: attachment; filename="diagnostico-exportacion.json"' );
    header( 'Expires: 0' );
    header( 'Cache-Control: must-revalidate' );
    header( 'Pragma: public' );
    
    if ( ob_get_level() ) {
        ob_end_clean();
    }
    
    echo json_encode( $diagnostics, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
    exit;
}

/**
 * 7. PROCESO PRINCIPAL DE GENERACIÓN Y DESCARGA DEL ZIP DE BANDERAS
 */
function ebms_run_export() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        wp_die( 'WooCommerce no está activo en este sitio.' );
    }

    $products = get_posts( array(
        'post_type'      => 'product',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'orderby'        => 'ID',
        'order'          => 'DESC'
    ) );

    if ( empty( $products ) ) {
        wp_die( 'No se encontraron productos publicados de WooCommerce.' );
    }

    $upload_dir = wp_upload_dir();
    $temp_dir   = trailingslashit( $upload_dir['basedir'] ) . 'export-banderas/';

    // Ensure clean temp dir
    if ( file_exists( $temp_dir ) ) {
        ebms_delete_directory( $temp_dir );
    }
    wp_mkdir_p( $temp_dir );

    $processed_codes = array();
    $flags_mapping   = array();

    foreach ( $products as $product_post ) {
        $flag_info = ebms_get_product_flag_info( $product_post->ID, $product_post->post_title );
        $code = $flag_info['code'];

        if ( empty( $code ) ) {
            continue;
        }

        // Avoid duplicates across multiple package sizes for the same country/region
        if ( in_array( $code, $processed_codes ) ) {
            continue;
        }

        // Get featured image
        $thumbnail_id = get_post_thumbnail_id( $product_post->ID );
        if ( ! $thumbnail_id ) {
            continue;
        }

        $image_path = get_attached_file( $thumbnail_id );
        $copied     = false;
        $dest_filename = '';

        if ( $image_path && file_exists( $image_path ) ) {
            $ext = strtolower( pathinfo( $image_path, PATHINFO_EXTENSION ) );
            if ( ! empty( $ext ) ) {
                $dest_filename = $code . '.' . $ext;
                $dest_path = $temp_dir . $dest_filename;
                if ( copy( $image_path, $dest_path ) ) {
                    $copied = true;
                }
            }
        }

        // Fallback: If local file copying failed or path doesn't exist, try downloading from URL.
        if ( ! $copied ) {
            $image_url = wp_get_attachment_url( $thumbnail_id );
            if ( $image_url ) {
                $url_path = parse_url( $image_url, PHP_URL_PATH );
                $ext = strtolower( pathinfo( $url_path, PATHINFO_EXTENSION ) );
                if ( empty( $ext ) ) {
                    $ext = 'png';
                }

                $dest_filename = $code . '.' . $ext;
                $dest_path = $temp_dir . $dest_filename;

                if ( ! function_exists( 'download_url' ) ) {
                    require_once ABSPATH . 'wp-admin/includes/file.php';
                }

                $tmp_file = download_url( $image_url );
                if ( ! is_wp_error( $tmp_file ) ) {
                    if ( copy( $tmp_file, $dest_path ) ) {
                        $copied = true;
                    }
                    @unlink( $tmp_file );
                }
            }
        }

        if ( $copied ) {
            $processed_codes[] = $code;
            $flags_mapping[$code] = $dest_filename;
        }
    }

    // Save mapping file flags.json inside the temp directory
    file_put_contents( $temp_dir . 'flags.json', json_encode( $flags_mapping, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );

    // Compress to ZIP
    if ( ! class_exists( 'ZipArchive' ) ) {
        wp_die( 'La clase PHP ZipArchive no está habilitada en el servidor.' );
    }

    $zip = new ZipArchive();
    $zip_file = trailingslashit( $upload_dir['basedir'] ) . 'banderas-me-sim.zip';

    if ( file_exists( $zip_file ) ) {
        @unlink( $zip_file );
    }

    if ( $zip->open( $zip_file, ZipArchive::CREATE ) === TRUE ) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator( $temp_dir, RecursiveDirectoryIterator::SKIP_DOTS ),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ( $files as $name => $file ) {
            if ( ! $file->isDir() ) {
                $file_path = $file->getRealPath();
                $relative_path = substr( $file_path, strlen( $temp_dir ) );
                $zip->addFile( $file_path, $relative_path );
            }
        }
        $zip->close();
    } else {
        wp_die( 'No se pudo crear el archivo comprimido ZIP.' );
    }

    // Clean up temporary directory
    ebms_delete_directory( $temp_dir );

    // Force ZIP download
    if ( file_exists( $zip_file ) ) {
        header( 'Content-Description: File Transfer' );
        header( 'Content-Type: application/zip' );
        header( 'Content-Disposition: attachment; filename="' . basename( $zip_file ) . '"' );
        header( 'Expires: 0' );
        header( 'Cache-Control: must-revalidate' );
        header( 'Pragma: public' );
        header( 'Content-Length: ' . filesize( $zip_file ) );
        
        if ( ob_get_level() ) {
            ob_end_clean();
        }
        
        readfile( $zip_file );
        
        // Clean up the ZIP file on the server
        @unlink( $zip_file );
        exit;
    } else {
        wp_die( 'El archivo comprimido ZIP no fue generado correctamente.' );
    }
}

/**
 * Función auxiliar para eliminar directorios temporal de forma recursiva
 */
function ebms_delete_directory( $dir ) {
    if ( ! file_exists( $dir ) ) {
        return true;
    }
    if ( ! is_dir( $dir ) ) {
        return unlink( $dir );
    }
    foreach ( scandir( $dir ) as $item ) {
        if ( $item == '.' || $item == '..' ) {
            continue;
        }
        if ( ! ebms_delete_directory( $dir . DIRECTORY_SEPARATOR . $item ) ) {
            return false;
        }
    }
    return rmdir( $dir );
}
