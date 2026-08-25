import { addDiagnosticLog } from './logger';
import { ALL_WORLD_COUNTRIES } from './i18n';

let authToken = null;
let sessionId = null;
let tokenExpiresAt = 0;
let lastAuthError = '';

export function getLastAuthError() {
  return lastAuthError;
}

export async function getStrongeSIMAuth() {
  const now = Date.now();
  if (authToken && now < tokenExpiresAt) {
    return { accessToken: authToken, sessionId };
  }

  const baseUrl = process.env.STRONGESIM_BASE_URL || process.env.STRONGESIM_API_URL || 'https://api.strongesim.com/api/v1';
  const username = process.env.STRONGESIM_USERNAME || process.env.STRONGESIM_EMAIL;
  const password = process.env.STRONGESIM_PASSWORD;

  if (!username || !password) {
    lastAuthError = 'Credenciales STRONGESIM_USERNAME o STRONGESIM_PASSWORD no configuradas en entorno';
    addDiagnosticLog('STRONGESIM_AUTH', 'MISSING_CREDENTIALS', { username: !!username, password: !!password });
    return { accessToken: null, sessionId: null };
  }

  try {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: username,
        username: username,
        password: password,
      }),
      cache: 'no-store',
    });

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {}

    addDiagnosticLog('STRONGESIM_AUTH', 'LOGIN_RESPONSE', {
      status: response.status,
      ok: response.ok,
      success: responseData.success,
      baseUrl,
      username,
    });

    if (response.ok && responseData.success) {
      authToken = responseData.data?.accessToken || responseData.data?.token || responseData.accessToken;
      sessionId = responseData.data?.sessionId || responseData.data?.session_id || 'session_active';

      if (authToken) {
        tokenExpiresAt = now + 3600 * 1000;
        lastAuthError = '';
        return { accessToken: authToken, sessionId };
      }
    }

    lastAuthError = `HTTP ${response.status}: ${responseText}`;
  } catch (error) {
    lastAuthError = `Error de conexión: ${error.message}`;
    addDiagnosticLog('STRONGESIM_AUTH', 'LOGIN_EXCEPTION', { error: error.message });
  }

  return { accessToken: null, sessionId: null };
}

/**
 * Realiza peticiones autenticadas al servidor de StrongeSIM
 */
export async function strongesimFetch(endpoint, options = {}) {
  let rawBaseUrl = process.env.STRONGESIM_BASE_URL || process.env.STRONGESIM_API_URL || 'https://api.strongesim.com/api/v1';
  let cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const { accessToken, sessionId } = await getStrongeSIMAuth();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${cleanBaseUrl}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  return response;
}

// Mapa de palabras clave para regiones multi-país
const REGION_KEYWORDS = {
  EUROPE: ['EUROPE', 'EUROPA', 'EU 35', 'EU 30', 'EU 33', 'EUROPEAN'],
  ASIA: ['ASIA', 'ASIAN', 'ASIATICO', 'ASIÁTICO'],
  'NORTH-AMERICA': ['NORTH AMERICA', 'NORTEAMÉRICA', 'NORTEAMERICA', 'USA & CANADA'],
  'SOUTH-AMERICA': ['SOUTH AMERICA', 'AMÉRICA DEL SUR', 'AMERICA DEL SUR', 'LATAM', 'LATIN AMERICA'],
  CARIBBEAN: ['CARIBBEAN', 'CARIBE'],
  AFRICA: ['AFRICA', 'ÁFRICA'],
  'MIDDLE-EAST': ['MIDDLE EAST', 'ORIENTE MEDIO', 'MIDDLE-EAST'],
  OCEANIA: ['OCEANIA', 'OCEANÍA', 'AUSTRALIA & NEW ZEALAND'],
  AUKUS: ['AUKUS', 'AUSTRALIA, UK, US'],
  'CHINA-HK-MACAU': ['CHINA, HONG KONG, MACAU', 'CHINA HONG KONG MACAU', 'CHINA-HK-MACAU'],
  'EAST-ASIA': ['EAST ASIA', 'JAPAN, KOREA, TAIWAN'],
  'SOUTHEAST-ASIA': ['SOUTHEAST ASIA', 'SUDESTE ASIÁTICO', 'SEA 10', 'SEA 8'],
  'EUROPE-MOROCCO': ['EUROPE + MOROCCO', 'EUROPA + MARRUECOS'],
};

/**
 * Resuelve el plan_id numérico real de StrongeSIM usando /plans?limit=10000
 * Garantiza coincidencia estricta para TODOS los 198 países y regiones del mundo usando ALL_WORLD_COUNTRIES
 * Impide totalmente falsos positivos (como "INDONESIA".includes("ES"))
 */
export async function resolveStrongeSimPlanId({ sku, iso = 'es', dataAmount = '', days = 30 }) {
  if (typeof sku === 'number') return sku;
  if (typeof sku === 'string' && /^\d+$/.test(sku.trim())) return parseInt(sku.trim(), 10);

  const targetIso = (iso || (typeof sku === 'string' ? sku.split('-')[0] : '') || 'es').toUpperCase().trim();
  const rawDataStr = (dataAmount || sku || '').toLowerCase();
  const targetDays = parseInt(days || 30, 10);

  // Extraer etiquetas de datos probables (500MB, 0.5GB, 10GB, 1GB, Daily, Unlimited)
  let dataTags = [];
  const isDailyPlan = rawDataStr.includes('día') || rawDataStr.includes('dia') || rawDataStr.includes('day') || targetDays === 1;

  if (rawDataStr.includes('500')) {
    dataTags = ['500', '0.5', '500mb', '0.5gb'];
  } else if (rawDataStr.includes('unlimited') || rawDataStr.includes('ilimitad')) {
    dataTags = ['unlimited', 'ilimitad'];
  } else {
    const gbMatch = rawDataStr.match(/(\d+)\s*gb/);
    if (gbMatch) {
      const num = gbMatch[1];
      dataTags = [`${num}gb`, `${num} gb`, `${num}g`, `${num}`];
    } else {
      const anyNum = rawDataStr.match(/\d+/);
      if (anyNum) dataTags = [anyNum[0]];
    }
  }

  // Buscar metadatos oficiales del país en ALL_WORLD_COUNTRIES (198 países)
  const countryMeta = Array.isArray(ALL_WORLD_COUNTRIES) 
    ? ALL_WORLD_COUNTRIES.find(c => c.iso && c.iso.toUpperCase() === targetIso)
    : null;

  try {
    const res = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      const plansList = body.data || body.plans || body.packages || (Array.isArray(body) ? body : []);

      if (Array.isArray(plansList) && plansList.length > 0) {
        // 1. Filtrado estricto para Países (198) y Regiones Multi-país
        const countryPlans = plansList.filter(p => {
          const pIso = (p.iso || p.isoCode || p.country_code || p.countryCode || '').toUpperCase().trim();
          const pCountry = (p.country || p.country_name || p.name || p.title || '').toUpperCase();

          if (pIso === targetIso) return true;

          const regKeys = REGION_KEYWORDS[targetIso];
          if (regKeys && regKeys.some(k => pCountry.includes(k) || pIso.includes(k))) {
            return true;
          }

          if (countryMeta) {
            const nameEn = (countryMeta.nameEn || '').toUpperCase();
            const nameEs = (countryMeta.nameEs || '').toUpperCase();

            if (nameEn && pCountry.includes(nameEn)) return true;
            if (nameEs && pCountry.includes(nameEs)) return true;
          }

          return false;
        });

        const pool = countryPlans.length > 0 ? countryPlans : [];

        if (pool.length > 0) {
          // A) Coincidencia exacta por SKU/ID/Código
          let match = pool.find(p => String(p.id || p.plan_id || p.code || p.sku) === String(sku));

          // B) Coincidencia por etiquetas de datos (500MB, 0.5GB, 10GB, etc)
          if (!match && dataTags.length > 0) {
            match = pool.find(p => {
              const pData = (p.dataAmount || p.data || p.name || p.title || p.package_name || '').toLowerCase();
              return dataTags.some(tag => pData.includes(tag));
            });
          }

          // C) Si es un plan diario (1 día), buscar un paquete diario o Unlimited del mismo país
          if (!match && isDailyPlan) {
            match = pool.find(p => {
              const pTitle = (p.name || p.title || p.package_name || '').toLowerCase();
              return pTitle.includes('daily') || pTitle.includes('unlimited') || p.days === 1 || p.duration === 1;
            });
          }

          // D) Fallback seguro al primer paquete del MISMO PAÍS O REGIÓN
          if (!match) {
            match = pool[0];
          }

          if (match) {
            const resolvedId = match.id || match.plan_id || match.package_id || match.code;
            if (resolvedId && (typeof resolvedId === 'number' || /^\d+$/.test(String(resolvedId)))) {
              return parseInt(String(resolvedId), 10);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error resolviendo el plan_id de StrongeSIM:', err.message);
  }

  return null;
}
