import fs from 'fs';
import path from 'path';
import { ALL_WORLD_COUNTRIES } from './i18n';

export const CONFIG_DIR = path.join(process.cwd(), 'config');
export const LIVE_RULES_FILE = path.join(CONFIG_DIR, 'pricing-rules.json');
export const DRAFT_RULES_FILE = path.join(CONFIG_DIR, 'pricing-rules.draft.json');
export const BACKUP_RULES_FILE = path.join(CONFIG_DIR, 'pricing-rules.backup.json');
export const AUDIT_LOG_FILE = path.join(CONFIG_DIR, 'pricing-audit.log');

// 14 Bloques Oficiales + Regla Fallback
export const DEFAULT_PRICING_RULES = {
  floorPriceEur: 2.90,
  minProfitNetEur: 1.50,
  usdToEurRate: 0.926,
  defaultFallbackMarkup: 1.60,
  regionMarkups: {
    'europe': 1.85,
    'asia': 1.68,
    'middle-east': 1.61,
    'north-america': 1.75,
    'south-america': 1.65,
    'caribbean': 1.65,
    'africa': 1.60,
    'oceania': 1.65,
    'aukus': 1.70,
    'china-hk-macau': 1.70,
    'japan-korea-taiwan': 1.70,
    'southeast-asia': 1.68,
    'europe-morocco': 1.80,
    'global': 1.60,
  },
};

// Tasas estimadas de cambio secundario para visualización en tabla (GBP, AUD)
export const CURRENCY_RATES = {
  EUR_TO_USD: 1.09,
  EUR_TO_GBP: 0.855,
  EUR_TO_AUD: 1.645,
};

/**
 * Asegura que la carpeta config/ exista
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Escritura Atómica en Disco: escribe a un archivo temporal y renombra atómicamente.
 * Evita lecturas concurrentes de JSON incompleto o corrupto.
 */
export function writeAtomicJson(filePath, data) {
  ensureConfigDir();
  const serialized = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  fs.writeFileSync(tempPath, serialized, 'utf-8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Sanitización y validación estricta de rangos financieros
 */
export function validatePricingRules(rules) {
  if (!rules || typeof rules !== 'object') {
    return { valid: false, error: 'La estructura de reglas de precios no es válida.' };
  }

  const rate = parseFloat(rules.usdToEurRate);
  if (isNaN(rate) || rate < 0.70 || rate > 1.30) {
    return { valid: false, error: `usdToEurRate (${rules.usdToEurRate}) debe situarse entre 0.70 y 1.30.` };
  }

  const floor = parseFloat(rules.floorPriceEur);
  if (isNaN(floor) || floor < 2.50 || floor > 10.00) {
    return { valid: false, error: `floorPriceEur (${rules.floorPriceEur}) debe situarse entre 2.50 y 10.00 €.` };
  }

  const minProfit = parseFloat(rules.minProfitNetEur);
  if (isNaN(minProfit) || minProfit < 0.50 || minProfit > 10.00) {
    return { valid: false, error: `minProfitNetEur (${rules.minProfitNetEur}) debe situarse entre 0.50 y 10.00 €.` };
  }

  const fallbackMarkup = parseFloat(rules.defaultFallbackMarkup);
  if (isNaN(fallbackMarkup) || fallbackMarkup < 1.00 || fallbackMarkup > 5.00) {
    return { valid: false, error: `defaultFallbackMarkup (${rules.defaultFallbackMarkup}) debe situarse entre 1.00 y 5.00.` };
  }

  if (!rules.regionMarkups || typeof rules.regionMarkups !== 'object') {
    return { valid: false, error: 'regionMarkups es obligatorio.' };
  }

  for (const [regionKey, val] of Object.entries(rules.regionMarkups)) {
    const markupNum = parseFloat(val);
    if (isNaN(markupNum) || markupNum < 1.00 || markupNum > 5.00) {
      return { valid: false, error: `El multiplicador para la región '${regionKey}' (${val}) debe situarse entre 1.00 y 5.00.` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Registra una línea en el log inmutable de auditoría
 */
export function logPricingAudit(adminId, action, details) {
  try {
    ensureConfigDir();
    const entry = {
      timestamp: new Date().toISOString(),
      adminId: adminId || 'system',
      action,
      details,
    };
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error al registrar auditoría de precios:', err);
  }
}

/**
 * Obtiene las reglas de precios (live o draft).
 * Si el archivo no existe, lo inicializa de forma segura con DEFAULT_PRICING_RULES.
 */
export function getPricingRules(mode = 'live') {
  ensureConfigDir();
  const targetFile = mode === 'draft' ? DRAFT_RULES_FILE : LIVE_RULES_FILE;

  try {
    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_PRICING_RULES,
        ...parsed,
        regionMarkups: {
          ...DEFAULT_PRICING_RULES.regionMarkups,
          ...(parsed.regionMarkups || {}),
        },
      };
    }
  } catch (err) {
    console.error(`Error leyendo ${targetFile}:`, err.message);
  }

  // Inicializar si no existe
  try {
    writeAtomicJson(targetFile, DEFAULT_PRICING_RULES);
  } catch (e) {
    console.warn(`No se pudo inicializar ${targetFile}:`, e.message);
  }

  return DEFAULT_PRICING_RULES;
}

/**
 * Guarda reglas en borrador tras validar rangos
 */
export function saveDraftPricingRules(draftRules, adminId = 'admin') {
  const validation = validatePricingRules(draftRules);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const sanitized = {
    floorPriceEur: parseFloat(Number(draftRules.floorPriceEur).toFixed(2)),
    minProfitNetEur: parseFloat(Number(draftRules.minProfitNetEur).toFixed(2)),
    usdToEurRate: parseFloat(Number(draftRules.usdToEurRate).toFixed(4)),
    defaultFallbackMarkup: parseFloat(Number(draftRules.defaultFallbackMarkup).toFixed(2)),
    regionMarkups: {},
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  for (const [k, v] of Object.entries(draftRules.regionMarkups || {})) {
    sanitized.regionMarkups[k] = parseFloat(Number(v).toFixed(2));
  }

  writeAtomicJson(DRAFT_RULES_FILE, sanitized);
  logPricingAudit(adminId, 'SAVE_DRAFT', { keysUpdated: Object.keys(sanitized.regionMarkups).length });

  return { success: true, rules: sanitized };
}

/**
 * Publica el borrador a producción:
 * 1. Valida borrador.
 * 2. Guarda backup de las reglas vivas actuales.
 * 3. Escribe atómicamente a config/pricing-rules.json.
 * 4. Registra auditoría.
 */
export function publishDraftToLive(adminId = 'admin') {
  const draftRules = getPricingRules('draft');
  const validation = validatePricingRules(draftRules);
  if (!validation.valid) {
    return { success: false, error: `El borrador contiene errores: ${validation.error}` };
  }

  // 1. Crear copia de seguridad de las reglas vivas actuales
  const currentLive = getPricingRules('live');
  try {
    writeAtomicJson(BACKUP_RULES_FILE, {
      ...currentLive,
      backupCreatedAt: new Date().toISOString(),
      backupCreatedBy: adminId,
    });
  } catch (err) {
    console.error('Error creando backup de precios:', err);
  }

  // 2. Escribir atómicamente a producción
  const livePayload = {
    ...draftRules,
    publishedAt: new Date().toISOString(),
    publishedBy: adminId,
  };
  writeAtomicJson(LIVE_RULES_FILE, livePayload);

  // 3. Registrar auditoría
  logPricingAudit(adminId, 'PUBLISH_LIVE', {
    floorPriceEur: livePayload.floorPriceEur,
    minProfitNetEur: livePayload.minProfitNetEur,
    usdToEurRate: livePayload.usdToEurRate,
  });

  return { success: true, rules: livePayload };
}

/**
 * Restaura la versión anterior desde config/pricing-rules.backup.json
 */
export function rollbackToBackup(adminId = 'admin') {
  if (!fs.existsSync(BACKUP_RULES_FILE)) {
    return { success: false, error: 'No existe ninguna copia de seguridad previa para realizar Rollback.' };
  }

  try {
    const backupContent = fs.readFileSync(BACKUP_RULES_FILE, 'utf-8');
    const backupData = JSON.parse(backupContent);

    const validation = validatePricingRules(backupData);
    if (!validation.valid) {
      return { success: false, error: 'El archivo de backup está corrupto o no supera validaciones.' };
    }

    const restoredPayload = {
      ...backupData,
      restoredAt: new Date().toISOString(),
      restoredBy: adminId,
    };

    writeAtomicJson(LIVE_RULES_FILE, restoredPayload);
    // Sincronizar también el borrador con la versión restaurada
    writeAtomicJson(DRAFT_RULES_FILE, restoredPayload);

    logPricingAudit(adminId, 'ROLLBACK_TO_BACKUP', { restoredFrom: backupData.backupCreatedAt });

    return { success: true, rules: restoredPayload };
  } catch (err) {
    return { success: false, error: `Fallo al procesar rollback: ${err.message}` };
  }
}

/**
 * Verifica si existe copia de respaldo disponible
 */
export function hasBackupAvailable() {
  return fs.existsSync(BACKUP_RULES_FILE);
}

/**
 * Mapea un código ISO o región a uno de los 14 bloques oficiales
 */
export function mapIsoToRegion(iso = '', isRegion = false, fallbackRegion = null) {
  const cleanIso = (iso || '').toLowerCase().trim();

  // 1. Zonas oficiales directas (si ya es el código de región)
  const OFFICIAL_REGIONS = [
    'europe', 'north-america', 'asia', 'japan-korea-taiwan',
    'southeast-asia', 'china-hk-macau', 'middle-east', 'south-america',
    'caribbean', 'africa', 'oceania', 'aukus', 'europe-morocco', 'global'
  ];
  if (OFFICIAL_REGIONS.includes(cleanIso)) {
    return cleanIso;
  }

  // 2. Sub-regiones específicas y alianzas especiales
  if (['jp', 'kr', 'tw'].includes(cleanIso) || cleanIso === 'east-asia') {
    return 'japan-korea-taiwan';
  }
  if (['th', 'vn', 'sg', 'id', 'my', 'ph', 'kh', 'la'].includes(cleanIso)) {
    return 'southeast-asia';
  }
  if (['cn', 'hk', 'mo'].includes(cleanIso)) {
    return 'china-hk-macau';
  }
  if (cleanIso === 'aukus') {
    return 'aukus';
  }
  if (cleanIso === 'europe-morocco') {
    return 'europe-morocco';
  }
  if (['au', 'nz', 'australia-new-zealand'].includes(cleanIso)) {
    return 'oceania';
  }
  if (['us', 'ca', 'mx'].includes(cleanIso)) {
    return 'north-america';
  }

  // 3. Si se proporciona una región previa válida
  if (fallbackRegion && OFFICIAL_REGIONS.includes(fallbackRegion.toLowerCase())) {
    return fallbackRegion.toLowerCase();
  }

  // 4. Mapear desde catálogo oficial de países (ALL_WORLD_COUNTRIES)
  const country = ALL_WORLD_COUNTRIES.find((c) => c.iso === cleanIso);
  if (country && country.region && OFFICIAL_REGIONS.includes(country.region.toLowerCase())) {
    return country.region.toLowerCase();
  }

  // 5. Si country.region existe aunque no esté normalizado
  if (country && country.region) {
    return country.region;
  }

  // 6. Fallback final
  return fallbackRegion || 'global';
}

/**
 * Algoritmo financiero centralizado de cálculo de PVP y desglose:
 * Devuelve PVP final, IVA (21%), Stripe (1.5% + 0.25€), beneficio neto y si se aplicó el suelo.
 */
export function computePlanPricing(costUsd, regionKey, customRules = null) {
  const rules = customRules || getPricingRules('live');
  const rate = parseFloat(rules.usdToEurRate) || 0.926;
  const rawCostUsd = Math.max(0, parseFloat(costUsd) || 0);
  const costEur = parseFloat((rawCostUsd * rate).toFixed(4));

  // Multiplicador de zona
  const multiplier = rules.regionMarkups[regionKey] || rules.defaultFallbackMarkup || 1.60;
  const pvpBase = parseFloat((costEur * multiplier).toFixed(2));

  // Fórmula matemática para garantizar minProfitNetEur:
  // Neto = (PVP / 1.21) - (PVP * 0.015 + 0.25) - costEur >= minProfitNetEur
  // PVP * (1/1.21 - 0.015) = costEur + minProfitNetEur + 0.25
  const minProfitTarget = parseFloat(rules.minProfitNetEur) || 1.50;
  const denominator = (1 / 1.21) - 0.015; // ~0.811446
  const requiredPvpForProfit = parseFloat(((costEur + minProfitTarget + 0.25) / denominator).toFixed(2));

  const floorPrice = parseFloat(rules.floorPriceEur) || 2.90;
  const pvpFinal = Math.max(floorPrice, pvpBase, requiredPvpForProfit);

  const isFloorApplied = pvpFinal > pvpBase;

  // Desglose fiscal y comisiones
  const baseImponible = parseFloat((pvpFinal / 1.21).toFixed(2));
  const vat21 = parseFloat((pvpFinal - baseImponible).toFixed(2));
  const stripeFee = parseFloat(((pvpFinal * 0.015) + 0.25).toFixed(2));
  const netRevenue = parseFloat((baseImponible - stripeFee).toFixed(2));
  const profitNetEur = parseFloat((netRevenue - costEur).toFixed(2));
  const profitNetPct = costEur > 0 ? parseFloat(((profitNetEur / costEur) * 100).toFixed(1)) : 0;

  // Monedas secundarias
  const costGbp = parseFloat((costEur * CURRENCY_RATES.EUR_TO_GBP).toFixed(2));
  const costAud = parseFloat((costEur * CURRENCY_RATES.EUR_TO_AUD).toFixed(2));
  const pvpUsd = parseFloat((pvpFinal * CURRENCY_RATES.EUR_TO_USD).toFixed(2));
  const pvpGbp = parseFloat((pvpFinal * CURRENCY_RATES.EUR_TO_GBP).toFixed(2));
  const pvpAud = parseFloat((pvpFinal * CURRENCY_RATES.EUR_TO_AUD).toFixed(2));

  return {
    rawCostUsd,
    costEur,
    costGbp,
    costAud,
    multiplier,
    pvpBase,
    pvpFinal,
    pvpUsd,
    pvpGbp,
    pvpAud,
    isFloorApplied,
    vat21,
    baseImponible,
    stripeFee,
    netRevenue,
    profitNetEur,
    profitNetPct,
  };
}
