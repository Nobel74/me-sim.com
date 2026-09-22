/**
 * ME-SIM Regional Mapping Matrix
 * Maps commercial region slugs to StrongeSIM internal region codes (regionCode),
 * ISO country codes, and plan name matching keywords.
 */

import { ALL_WORLD_COUNTRIES } from './i18n.js';

export const REGION_MAPPING = {
  'middle-east': {
    canonicalSlug: 'middle-east',
    nameEs: 'Oriente Medio',
    nameEn: 'Middle East',
    regionCodes: ['ME-12', 'ME-13', 'MENA', 'MIDDLE-EAST'],
    countryCodes: ['QA', 'AE', 'SA', 'OM', 'KW', 'BH', 'JO', 'EG', 'IQ', 'IL', 'LB', 'PS', 'YE'],
    nameKeywords: ['middle east & north africa', 'middle east', 'mena', 'oriente medio'],
    preferredRegionCode: 'ME-12',
    aliases: ['middle_east', 'mena', 'oriente-medio', 'orientemedio'],
  },
  'europe': {
    canonicalSlug: 'europe',
    nameEs: 'Europa',
    nameEn: 'Europe',
    regionCodes: ['EU-35', 'EU-33', 'EU-30', 'EU-31', 'EU-42', 'EU-7', 'EUROPE', 'EU'],
    countryCodes: [
      'ES', 'FR', 'DE', 'IT', 'PT', 'GB', 'GR', 'CH', 'NL', 'AT', 'BE', 'SE', 'NO', 'FI', 'DK',
      'IE', 'PL', 'CZ', 'HU', 'HR', 'RO', 'BG', 'SK', 'SI', 'IS', 'CY', 'MT', 'LU', 'EE', 'LV',
      'LT', 'AL', 'AD', 'BA', 'ME', 'MK', 'RS', 'UA', 'TR'
    ],
    nameKeywords: ['europe', 'europa', 'balkans'],
    preferredRegionCode: 'EU-35',
    aliases: ['europa', 'eu', 'europe-35', 'europe-33'],
  },
  'asia': {
    canonicalSlug: 'asia',
    nameEs: 'Asia General',
    nameEn: 'Asia General',
    regionCodes: ['AS-21', 'AS-20', 'AS-12', 'AS-7', 'AS-5', 'CA-4', 'ASIA-15', 'ASIA-PACIFIC', 'AS'],
    countryCodes: ['BD', 'MO', 'TH', 'SG', 'MY', 'VN', 'ID', 'PH', 'JP', 'KR', 'TW', 'UZ', 'AZ', 'KZ', 'KG', 'KH', 'LA', 'IN'],
    nameKeywords: ['asia', 'central asia'],
    preferredRegionCode: 'AS-21',
    aliases: ['asia-general', 'asia-pacific', 'asiapacific'],
  },
  'north-america': {
    canonicalSlug: 'north-america',
    nameEs: 'Norteamérica',
    nameEn: 'North America',
    regionCodes: ['NA-3', 'USCA-2', 'NORTH-AMERICA', 'NA'],
    countryCodes: ['US', 'CA', 'MX'],
    nameKeywords: ['north america', 'norteamérica', 'norteamerica', 'usa & canada', 'usa and canada'],
    preferredRegionCode: 'NA-3',
    aliases: ['north_america', 'norteamerica', 'norte-america', 'usa-canada', 'usa_canada'],
  },
  'south-america': {
    canonicalSlug: 'south-america',
    nameEs: 'América del Sur',
    nameEn: 'South America',
    regionCodes: ['SA-18', 'SA-6', 'LATAM', 'SOUTH-AMERICA', 'SA'],
    countryCodes: ['BR', 'PR', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'EC', 'BO', 'VE', 'GY', 'SR'],
    nameKeywords: ['south america', 'américa del sur', 'america del sur', 'sudamerica', 'sudamérica', 'latam'],
    preferredRegionCode: 'SA-18',
    aliases: ['latin-america', 'latin_america', 'latam', 'south_america', 'sudamerica', 'sudamerica', 'america-del-sur'],
  },
  'caribbean': {
    canonicalSlug: 'caribbean',
    nameEs: 'Caribe',
    nameEn: 'Caribbean',
    regionCodes: ['CB-25', 'CB-24', 'CARIBBEAN'],
    countryCodes: ['BB', 'JM', 'BS', 'DO', 'TT', 'LC', 'AG', 'AW', 'CW', 'GD', 'KN', 'VC', 'TC', 'KY', 'VG'],
    nameKeywords: ['caribbean', 'caribe'],
    preferredRegionCode: 'CB-25',
    aliases: ['caribe'],
  },
  'africa': {
    canonicalSlug: 'africa',
    nameEs: 'África',
    nameEn: 'Africa',
    regionCodes: ['AF-29', 'AFRICA'],
    countryCodes: ['BF', 'EG', 'ZA', 'KE', 'NG', 'MA', 'GH', 'TZ', 'UG', 'SN', 'CI', 'CM', 'RW', 'MU', 'TN', 'DZ'],
    nameKeywords: ['africa (', 'africa 1gb', 'africa 3gb', 'africa 5gb', 'africa 10gb', 'africa 20gb', 'middle east & north africa'],
    preferredRegionCode: 'AF-29',
    aliases: ['africa', 'áfrica'],
  },
  'oceania': {
    canonicalSlug: 'oceania',
    nameEs: 'Oceanía',
    nameEn: 'Oceania',
    regionCodes: ['AUNZ-2', 'O-OC-3', 'OCEANIA', 'OC'],
    countryCodes: ['AU', 'NZ', 'NC', 'FJ', 'PG', 'WS', 'TO', 'VU'],
    nameKeywords: ['oceania', 'oceanía', 'australia & new zealand', 'australia and new zealand'],
    preferredRegionCode: 'AUNZ-2',
    aliases: ['oceania', 'oceanía', 'australia-new-zealand', 'australia_new_zealand', 'aunz'],
  },
  'australia-new-zealand': {
    canonicalSlug: 'oceania',
    nameEs: 'Australia y Nueva Zelanda',
    nameEn: 'Australia & New Zealand',
    regionCodes: ['AUNZ-2'],
    countryCodes: ['AU', 'NZ'],
    nameKeywords: ['australia & new zealand', 'australia and new zealand'],
    preferredRegionCode: 'AUNZ-2',
    aliases: ['aunz', 'australia-nz'],
  },
  'aukus': {
    canonicalSlug: 'aukus',
    nameEs: 'Alianza AUKUS',
    nameEn: 'AUKUS Alliance',
    regionCodes: ['AUKUS-3', 'AUKUS'],
    countryCodes: ['AU', 'GB', 'US'],
    nameKeywords: ['aukus'],
    preferredRegionCode: 'AUKUS-3',
    aliases: ['aukus-3', 'alianza-aukus'],
  },
  'china-hk-macau': {
    canonicalSlug: 'china-hk-macau',
    nameEs: 'China, Hong Kong y Macao',
    nameEn: 'China, HK & Macau',
    regionCodes: ['CN-3', 'CNHK-2'],
    countryCodes: ['MO', 'HK', 'CN'],
    nameKeywords: ['china (mainland hk macao)', 'china (mainland & hk)', 'china mainland'],
    preferredRegionCode: 'CN-3',
    aliases: ['china-hk', 'cnhk', 'china_hk_macau', 'cnhkmo'],
  },
  'japan-korea-taiwan': {
    canonicalSlug: 'japan-korea-taiwan',
    nameEs: 'Japón, Corea y Taiwán',
    nameEn: 'Japan, Korea & Taiwan',
    regionCodes: ['CNJPKR-3', 'JPKR-2'],
    countryCodes: ['JP', 'KR', 'TW'],
    nameKeywords: ['japan & south korea', 'china mainland & japan & south korea', 'japan and south korea'],
    preferredRegionCode: 'JPKR-2',
    aliases: ['east-asia', 'east_asia', 'jpkrtw', 'japon-corea-taiwan', 'jp-kr-tw'],
  },
  'east-asia': {
    canonicalSlug: 'japan-korea-taiwan',
    nameEs: 'Asia Oriental',
    nameEn: 'East Asia',
    regionCodes: ['CNJPKR-3', 'JPKR-2'],
    countryCodes: ['JP', 'KR', 'TW'],
    nameKeywords: ['japan & south korea', 'china mainland & japan & south korea'],
    preferredRegionCode: 'JPKR-2',
    aliases: ['east-asia', 'east_asia'],
  },
  'southeast-asia': {
    canonicalSlug: 'southeast-asia',
    nameEs: 'Sudeste Asiático',
    nameEn: 'Southeast Asia',
    regionCodes: ['SGMYVNTHID-5', 'SGMYTH-3', 'SGMY-2'],
    countryCodes: ['SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'KH', 'LA'],
    nameKeywords: ['singapore & malaysia', 'southeast asia', 'sudeste asiático', 'sea 10', 'sea'],
    preferredRegionCode: 'SGMYVNTHID-5',
    aliases: ['southeast_asia', 'sudeste-asiatico', 'sudeste_asiatico', 'sea'],
  },
  'europe-morocco': {
    canonicalSlug: 'europe-morocco',
    nameEs: 'Europa + Marruecos',
    nameEn: 'Europe + Morocco',
    regionCodes: ['EU-43'],
    countryCodes: ['NO', 'MA', 'ES', 'FR', 'IT', 'DE', 'GB', 'PT'],
    nameKeywords: ['europe (40+ areas) & morocco', 'morocco'],
    preferredRegionCode: 'EU-43',
    aliases: ['europe_morocco', 'europa-marruecos', 'eu-morocco'],
  },
  'global': {
    canonicalSlug: 'global',
    nameEs: 'Global Multidestino',
    nameEn: 'Global Multi-destination',
    regionCodes: ['GL-120', 'GL-139', 'GLOBAL'],
    countryCodes: ['PR'],
    nameKeywords: ['global (120+ areas)', 'global139', 'global'],
    preferredRegionCode: 'GL-120',
    aliases: ['world', 'mundial'],
  },
};

/**
 * Normaliza cualquier slug regional comercial a su clave canónica
 */
export function normalizeRegionSlug(slug = '') {
  const clean = (slug || '').toLowerCase().trim();
  if (!clean) return null;

  if (REGION_MAPPING[clean]) {
    return REGION_MAPPING[clean].canonicalSlug;
  }

  for (const [key, def] of Object.entries(REGION_MAPPING)) {
    if (def.aliases && def.aliases.includes(clean)) {
      return def.canonicalSlug;
    }
  }

  return null;
}

/**
 * Retorna la definición completa de una región si el slug coincide con alguna región comercial
 */
export function getRegionDefinition(slug = '') {
  const clean = (slug || '').toLowerCase().trim();
  if (!clean) return null;

  if (REGION_MAPPING[clean]) {
    return REGION_MAPPING[clean];
  }

  for (const [key, def] of Object.entries(REGION_MAPPING)) {
    if (def.aliases && def.aliases.includes(clean)) {
      return def;
    }
  }

  return null;
}

/**
 * Determina si un slug corresponde a una región o multi-país (y NO a un país individual)
 */
export function isRegionalSlug(slug = '') {
  return !!getRegionDefinition(slug);
}

/**
 * Valida si un plan de StrongeSIM pertenece a una región comercial específica.
 * Implementa protección estricta contra falsos positivos y falsos negativos:
 * - Filtra por regionCodes exactos del proveedor.
 * - Filtra por keywords explícitas en el nombre.
 * - Excluye planes individuales de un solo país para no canibalizar catálogo nacional.
 */
export function isPlanInRegion(plan, targetSlug = '') {
  const def = getRegionDefinition(targetSlug);
  if (!def) return false;

  const planRc = (plan.regionCode || plan.region_code || '').toUpperCase().trim();
  const planName = (plan.name || '').toLowerCase();
  const planCountryCode = (plan.country_code || '').toUpperCase().trim();

  // 1. Coincidencia directa por regionCode explícito de StrongeSIM
  if (planRc && def.regionCodes.includes(planRc)) {
    // Si el regionCode es un código de continente genérico (e.g. "EU", "AS", "AF", "NA", "SA", "OC", "US"),
    // verificar que no sea un plan individual de un solo país (e.g. "Spain 1GB 7Days" con RC: EU, CC: ES)
    const genericContinentCodes = ['EU', 'AS', 'AF', 'NA', 'SA', 'OC', 'US'];
    if (genericContinentCodes.includes(planRc)) {
      const isMultiCountryName =
        planName.includes('area') ||
        planName.includes('countr') ||
        planName.includes('&') ||
        planName.includes('+') ||
        planName.includes('region') ||
        planName.includes('middle east') ||
        planName.includes('global');

      if (!isMultiCountryName) {
        return false; // Es un plan individual de país
      }
    }
    return true;
  }

  // 2. Coincidencia por palabras clave en el nombre del plan
  if (def.nameKeywords && def.nameKeywords.some((kw) => planName.includes(kw))) {
    // Caso especial África: Excluir "South Africa" si estamos buscando el paquete regional "Africa"
    if (def.canonicalSlug === 'africa' && planName.includes('south africa')) {
      return false;
    }

    // Comprobar que sea un plan multi-destino y no un país suelto
    const isMultiCountry =
      planName.includes('area') ||
      planName.includes('countr') ||
      planName.includes('&') ||
      planName.includes('+') ||
      planName.includes('region') ||
      planName.includes('middle east') ||
      planName.includes('global') ||
      planName.includes('europe') ||
      planName.includes('asia') ||
      planName.includes('america');

    if (isMultiCountry) {
      return true;
    }
  }

  return false;
}

/**
 * Precios de salida mínimos oficiales (EUR) para cada región comercial.
 * Garantiza que la UI inicial renderice instantáneamente el precio correcto
 * sin parpadeos ni desfases antes de recibir la respuesta de la API.
 */
export const REGION_STARTING_PRICES = {
  'middle-east': 12.52,
  'europe': 3.01,
  'asia': 4.07,
  'north-america': 4.80,
  'south-america': 5.77,
  'latin-america': 5.77,
  'caribbean': 10.82,
  'africa': 10.13,
  'oceania': 4.76,
  'australia-new-zealand': 4.76,
  'aukus': 6.26,
  'china-hk-macau': 4.21,
  'japan-korea-taiwan': 4.01,
  'east-asia': 4.01,
  'southeast-asia': 3.66,
  'europe-morocco': 6.81,
  'global': 8.25,
};

/**
 * Retorna el precio base real (EUR) garantizado para cualquier destino (país o región).
 * Evita el salto visual o parpadeo ('flicker') antes de que la consulta a la API de StrongeSIM responda.
 */
export function getDestinationStartingPrice(iso = '') {
  const cleanIso = (iso || '').toLowerCase().trim();
  if (REGION_STARTING_PRICES[cleanIso]) {
    return REGION_STARTING_PRICES[cleanIso];
  }
  const country = ALL_WORLD_COUNTRIES.find((c) => c.iso === cleanIso);
  if (country && country.baseEur) {
    return country.baseEur;
  }
  return 2.90;
}

