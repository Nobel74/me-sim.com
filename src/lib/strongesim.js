import { addDiagnosticLog } from './logger';

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

/**
 * Resuelve el plan_id numérico real de StrongeSIM usando /plans?limit=10000
 * Garantiza la coincidencia por país (ES/España) e impide el fallback a Uzbekistán (ID 1005)
 */
export async function resolveStrongeSimPlanId({ sku, iso = 'es', dataAmount = '', days = 30 }) {
  if (typeof sku === 'number') return sku;
  if (typeof sku === 'string' && /^\d+$/.test(sku.trim())) return parseInt(sku.trim(), 10);

  const targetIso = (iso || (typeof sku === 'string' ? sku.split('-')[0] : '') || 'es').toUpperCase();
  const rawDataStr = (dataAmount || sku || '').toLowerCase();

  // Extraer valor de datos desinfectado ("500", "10", "1", "20", "5")
  let cleanDataNumber = '';
  if (rawDataStr.includes('500')) {
    cleanDataNumber = '500';
  } else {
    const numMatch = rawDataStr.match(/(\d+)\s*gb/);
    if (numMatch) {
      cleanDataNumber = numMatch[1];
    } else {
      const anyNum = rawDataStr.match(/\d+/);
      if (anyNum) cleanDataNumber = anyNum[0];
    }
  }

  try {
    const res = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      const plansList = body.data || body.plans || body.packages || (Array.isArray(body) ? body : []);

      if (Array.isArray(plansList) && plansList.length > 0) {
        // 1. Filtrado estricto por ISO o Nombre de País (España / Spain / ES)
        const countryPlans = plansList.filter(p => {
          const pIso = (p.iso || p.isoCode || p.country_code || p.countryCode || '').toUpperCase();
          const pCountry = (p.country || p.country_name || p.name || p.title || '').toUpperCase();

          if (pIso === targetIso || pIso.includes(targetIso)) return true;
          if (targetIso === 'ES' && (pCountry.includes('SPAIN') || pCountry.includes('ESPAÑA'))) return true;
          if (targetIso === 'FR' && (pCountry.includes('FRANCE') || pCountry.includes('FRANCIA'))) return true;
          if (targetIso === 'US' && (pCountry.includes('UNITED STATES') || pCountry.includes('USA'))) return true;
          if (pCountry.includes(targetIso)) return true;
          return false;
        });

        // Usamos UNICAMENTE los paquetes del país destino. Nunca caemos a plansList[0] global (1005 Uzbekistán)
        const pool = countryPlans.length > 0 ? countryPlans : [];

        if (pool.length > 0) {
          // Coincidencia exacta por SKU/ID/Código
          let match = pool.find(p => String(p.id || p.plan_id || p.code || p.sku) === String(sku));

          // Coincidencia por etiqueta de datos (500, 10, 1, etc)
          if (!match && cleanDataNumber) {
            match = pool.find(p => {
              const pData = (p.dataAmount || p.data || p.name || p.title || '').toLowerCase();
              return pData.includes(cleanDataNumber);
            });
          }

          // Fallback al primer paquete del MISMO PAÍS (España)
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
