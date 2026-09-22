import fs from 'fs';
import path from 'path';
import { ALL_WORLD_COUNTRIES } from './i18n.js';

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

// Caché en memoria para entorno Serverless / Edge y alta velocidad
let memoryLiveRules = null;
let memoryDraftRules = null;
let memoryBackupRules = null;

/**
 * Asegura que la carpeta config/ exista si el disco lo permite
 */
function ensureConfigDir() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  } catch (_) {
    // Entorno de sólo lectura en Vercel
  }
}

/**
 * Escritura Atómica y Segura:
 * 1. Intenta escribir en filePath local.
 * 2. Si el sistema de archivos es de sólo lectura (Vercel Serverless EROFS), recurre a /tmp.
 * 3. En Windows, si renameSync falla con EPERM, realiza copia directa segura.
 */
export function writeAtomicJson(filePath, data) {
  const serialized = JSON.stringify(data, null, 2);

  // 1. Intento en directorio de configuración local
  try {
    ensureConfigDir();
    const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    try {
      fs.renameSync(tempPath, filePath);
    } catch (renameErr) {
      fs.copyFileSync(tempPath, filePath);
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return true;
  } catch (localErr) {
    // 2. Fallback a /tmp en entornos Serverless (AWS Lambda / Vercel)
    try {
      const fileName = path.basename(filePath);
      const tmpPath = path.join('/tmp', fileName);
      fs.writeFileSync(tmpPath, serialized, 'utf-8');
      return true;
    } catch (tmpErr) {
      console.warn('writeAtomicJson: Escritura omitida (entorno seguro en memoria):', tmpErr.message);
      return false;
    }
  }
}

/**
 * Sincronización con WooCommerce (base de datos persistente en la nube de ME-SIM)
 */
async function syncPricingToWooCommerce(metaKey, data) {
  try {
    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    const wcUrl = rawWcUrl.split('/wp-json')[0].replace(/\/$/, '');
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || 'ck_ebbe1fdf83a8fa6be4659946bc71a9b1a227854b';
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || 'cs_b5b62eb3636ce242e1ab7e8db77365660ef5e190';

    if (ck && cs) {
      const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
      await fetch(`${wcUrl}/wp-json/wc/v3/customers/45`, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta_data: [{ key: metaKey, value: JSON.stringify(data) }],
        }),
      });
    }
  } catch (err) {
    console.warn(`syncPricingToWooCommerce (${metaKey}) failed:`, err.message);
  }
}

async function fetchPricingFromWooCommerce(metaKey) {
  try {
    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    const wcUrl = rawWcUrl.split('/wp-json')[0].replace(/\/$/, '');
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || 'ck_ebbe1fdf83a8fa6be4659946bc71a9b1a227854b';
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || 'cs_b5b62eb3636ce242e1ab7e8db77365660ef5e190';

    if (ck && cs) {
      const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
      const res = await fetch(`${wcUrl}/wp-json/wc/v3/customers/45`, {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      });
      if (res.ok) {
        const customer = await res.json();
        const meta = (customer.meta_data || []).find((m) => m.key === metaKey);
        if (meta && meta.value) {
          const parsed = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn(`fetchPricingFromWooCommerce (${metaKey}) failed:`, err.message);
  }
  return null;
}

/**
 * Sanitización y validación estricta de rangos financieros (tolerante a comas decimales)
 */
export function validatePricingRules(rules) {
  if (!rules || typeof rules !== 'object') {
    return { valid: false, error: 'La estructura de reglas de precios no es válida.' };
  }

  const parseSafeFloat = (v) => {
    if (v === null || v === undefined) return NaN;
    const str = String(v).trim().replace(',', '.');
    return parseFloat(str);
  };

  const rate = parseSafeFloat(rules.usdToEurRate);
  if (isNaN(rate) || rate < 0.70 || rate > 1.30) {
    return { valid: false, error: `usdToEurRate (${rules.usdToEurRate}) debe situarse entre 0.70 y 1.30.` };
  }

  const floor = parseSafeFloat(rules.floorPriceEur);
  if (isNaN(floor) || floor < 2.50 || floor > 10.00) {
    return { valid: false, error: `floorPriceEur (${rules.floorPriceEur}) debe situarse entre 2.50 y 10.00 €.` };
  }

  const minProfit = parseSafeFloat(rules.minProfitNetEur);
  if (isNaN(minProfit) || minProfit < 0.50 || minProfit > 10.00) {
    return { valid: false, error: `minProfitNetEur (${rules.minProfitNetEur}) debe situarse entre 0.50 y 10.00 €.` };
  }

  const fallbackMarkup = parseSafeFloat(rules.defaultFallbackMarkup);
  if (isNaN(fallbackMarkup) || fallbackMarkup < 1.00 || fallbackMarkup > 5.00) {
    return { valid: false, error: `defaultFallbackMarkup (${rules.defaultFallbackMarkup}) debe situarse entre 1.00 y 5.00.` };
  }

  if (!rules.regionMarkups || typeof rules.regionMarkups !== 'object') {
    return { valid: false, error: 'regionMarkups es obligatorio.' };
  }

  for (const [regionKey, val] of Object.entries(rules.regionMarkups)) {
    const markupNum = parseSafeFloat(val);
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
    try {
      fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (_) {
      try {
        const tmpAudit = path.join('/tmp', 'pricing-audit.log');
        fs.appendFileSync(tmpAudit, JSON.stringify(entry) + '\n', 'utf-8');
      } catch (__) {}
    }
  } catch (err) {
    console.error('Error al registrar auditoría de precios:', err);
  }
}

/**
 * Obtiene las reglas de precios de forma síncrona (live o draft).
 * Consulta primero la memoria viva, luego /tmp, luego disco local y por último defaults.
 */
export function getPricingRules(mode = 'live') {
  if (mode === 'draft' && memoryDraftRules) return memoryDraftRules;
  if (mode === 'live' && memoryLiveRules) return memoryLiveRules;

  const targetFile = mode === 'draft' ? DRAFT_RULES_FILE : LIVE_RULES_FILE;
  const tmpFile = path.join('/tmp', path.basename(targetFile));

  // 1. Probar en /tmp (Serverless)
  try {
    if (fs.existsSync(tmpFile)) {
      const content = fs.readFileSync(tmpFile, 'utf-8');
      const parsed = JSON.parse(content);
      const result = {
        ...DEFAULT_PRICING_RULES,
        ...parsed,
        regionMarkups: { ...DEFAULT_PRICING_RULES.regionMarkups, ...(parsed.regionMarkups || {}) },
      };
      if (mode === 'draft') memoryDraftRules = result;
      else memoryLiveRules = result;
      return result;
    }
  } catch (_) {}

  // 2. Probar en config/ local
  try {
    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8');
      const parsed = JSON.parse(content);
      const result = {
        ...DEFAULT_PRICING_RULES,
        ...parsed,
        regionMarkups: { ...DEFAULT_PRICING_RULES.regionMarkups, ...(parsed.regionMarkups || {}) },
      };
      if (mode === 'draft') memoryDraftRules = result;
      else memoryLiveRules = result;
      return result;
    }
  } catch (_) {}

  // 3. Fallback a valores por defecto
  const fallback = { ...DEFAULT_PRICING_RULES };
  if (mode === 'draft') memoryDraftRules = fallback;
  else memoryLiveRules = fallback;
  return fallback;
}

/**
 * Obtiene las reglas sincronizadas con WooCommerce Cloud
 */
export async function getPricingRulesAsync(mode = 'live') {
  const current = getPricingRules(mode);
  const metaKey = mode === 'draft' ? 'mesim_pricing_rules_draft' : 'mesim_pricing_rules';

  try {
    const cloudRules = await fetchPricingFromWooCommerce(metaKey);
    if (cloudRules && cloudRules.regionMarkups) {
      const merged = {
        ...DEFAULT_PRICING_RULES,
        ...cloudRules,
        regionMarkups: {
          ...DEFAULT_PRICING_RULES.regionMarkups,
          ...(cloudRules.regionMarkups || {}),
        },
      };
      if (mode === 'draft') memoryDraftRules = merged;
      else memoryLiveRules = merged;
      writeAtomicJson(mode === 'draft' ? DRAFT_RULES_FILE : LIVE_RULES_FILE, merged);
      return merged;
    }
  } catch (err) {
    console.warn(`getPricingRulesAsync (${mode}) fallback to memory:`, err.message);
  }

  return current;
}

/**
 * Guarda reglas en borrador tras validar rangos y persiste en memoria, disco y WooCommerce
 */
export async function saveDraftPricingRules(draftRules, adminId = 'admin') {
  const validation = validatePricingRules(draftRules);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const parseSafeFloat = (v) => parseFloat(String(v ?? '').trim().replace(',', '.'));

  const sanitized = {
    floorPriceEur: parseFloat(parseSafeFloat(draftRules.floorPriceEur).toFixed(2)),
    minProfitNetEur: parseFloat(parseSafeFloat(draftRules.minProfitNetEur).toFixed(2)),
    usdToEurRate: parseFloat(parseSafeFloat(draftRules.usdToEurRate).toFixed(4)),
    defaultFallbackMarkup: parseFloat(parseSafeFloat(draftRules.defaultFallbackMarkup).toFixed(2)),
    regionMarkups: {},
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  for (const [k, v] of Object.entries(draftRules.regionMarkups || {})) {
    sanitized.regionMarkups[k] = parseFloat(parseSafeFloat(v).toFixed(2));
  }

  // 1. Guardar en memoria viva
  memoryDraftRules = sanitized;

  // 2. Guardar en disco / tmp
  writeAtomicJson(DRAFT_RULES_FILE, sanitized);

  // 3. Persistir en WooCommerce
  await syncPricingToWooCommerce('mesim_pricing_rules_draft', sanitized);

  // 4. Log de auditoría
  logPricingAudit(adminId, 'SAVE_DRAFT', { keysUpdated: Object.keys(sanitized.regionMarkups).length });

  return { success: true, rules: sanitized };
}

/**
 * Publica el borrador a producción:
 * 1. Valida borrador.
 * 2. Guarda backup.
 * 3. Escribe a producción (memoria, disco/tmp y WooCommerce).
 * 4. Registra auditoría.
 */
export async function publishDraftToLive(adminId = 'admin') {
  const draftRules = getPricingRules('draft');
  const validation = validatePricingRules(draftRules);
  if (!validation.valid) {
    return { success: false, error: `El borrador contiene errores: ${validation.error}` };
  }

  // 1. Crear backup de la configuración en vivo actual
  const currentLive = getPricingRules('live');
  const backupPayload = {
    ...currentLive,
    backupCreatedAt: new Date().toISOString(),
    backupCreatedBy: adminId,
  };
  memoryBackupRules = backupPayload;
  writeAtomicJson(BACKUP_RULES_FILE, backupPayload);
  await syncPricingToWooCommerce('mesim_pricing_rules_backup', backupPayload);

  // 2. Publicar a vivo
  const livePayload = {
    ...draftRules,
    publishedAt: new Date().toISOString(),
    publishedBy: adminId,
  };
  memoryLiveRules = livePayload;
  writeAtomicJson(LIVE_RULES_FILE, livePayload);
  await syncPricingToWooCommerce('mesim_pricing_rules', livePayload);

  // 3. Registrar auditoría
  logPricingAudit(adminId, 'PUBLISH_LIVE', {
    floorPriceEur: livePayload.floorPriceEur,
    minProfitNetEur: livePayload.minProfitNetEur,
    usdToEurRate: livePayload.usdToEurRate,
  });

  return { success: true, rules: livePayload };
}

/**
 * Restaura la versión anterior desde backup
 */
export async function rollbackToBackup(adminId = 'admin') {
  let backupData = memoryBackupRules;
  if (!backupData && fs.existsSync(BACKUP_RULES_FILE)) {
    try {
      backupData = JSON.parse(fs.readFileSync(BACKUP_RULES_FILE, 'utf-8'));
    } catch (_) {}
  }
  const tmpBackup = path.join('/tmp', path.basename(BACKUP_RULES_FILE));
  if (!backupData && fs.existsSync(tmpBackup)) {
    try {
      backupData = JSON.parse(fs.readFileSync(tmpBackup, 'utf-8'));
    } catch (_) {}
  }
  if (!backupData) {
    backupData = await fetchPricingFromWooCommerce('mesim_pricing_rules_backup');
  }

  if (!backupData) {
    return { success: false, error: 'No existe ninguna copia de seguridad previa para realizar Rollback.' };
  }

  memoryLiveRules = backupData;
  memoryDraftRules = backupData;
  writeAtomicJson(LIVE_RULES_FILE, backupData);
  writeAtomicJson(DRAFT_RULES_FILE, backupData);
  await syncPricingToWooCommerce('mesim_pricing_rules', backupData);
  await syncPricingToWooCommerce('mesim_pricing_rules_draft', backupData);

  logPricingAudit(adminId, 'ROLLBACK_TO_BACKUP', { restoredFrom: backupData.backupCreatedAt });

  return { success: true, rules: backupData };
}

/**
 * Comprueba si hay backup disponible
 */
export function hasBackupAvailable() {
  if (memoryBackupRules) return true;
  if (fs.existsSync(BACKUP_RULES_FILE)) return true;
  const tmpBackup = path.join('/tmp', path.basename(BACKUP_RULES_FILE));
  if (fs.existsSync(tmpBackup)) return true;
  return false;
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
  if (['latin-america', 'latam'].includes(cleanIso)) {
    return 'south-america';
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

  const isFloorApplied = Math.abs(pvpFinal - floorPrice) < 0.001;
  const isMinProfitApplied = Math.abs(pvpFinal - requiredPvpForProfit) < 0.001 && pvpFinal > pvpBase && !isFloorApplied;

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
    isMinProfitApplied,
    vat21,
    baseImponible,
    stripeFee,
    netRevenue,
    profitNetEur,
    profitNetPct,
  };
}
