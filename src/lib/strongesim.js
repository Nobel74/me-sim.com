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
 * Resuelve el plan_id numérico real de StrongeSIM basándose en ISO y volumen de datos
 * Garantiza la coincidencia por país (ES/España) para evitar cualquier asignación de Uzbekistán u otros países
 */
export async function resolveStrongeSimPlanId({ sku, iso = 'es', dataAmount = '', days = 30 }) {
  if (typeof sku === 'number') return sku;
  if (typeof sku === 'string' && /^\d+$/.test(sku.trim())) return parseInt(sku.trim(), 10);

  const isoCode = (iso || (typeof sku === 'string' ? sku.split('-')[0] : '') || 'es').toUpperCase();
  
  // Extraer valor de datos desinfectado ("500", "10", "1", "5", etc.)
  const rawData = (dataAmount || sku || '').toLowerCase();
  let cleanDataTag = '';
  if (rawData.includes('500mb') || rawData.includes('500 mb') || rawData.includes('500')) {
    cleanDataTag = '500';
  } else {
    const gbMatch = rawData.match(/(\d+)\s*gb/);
    if (gbMatch) {
      cleanDataTag = gbMatch[1];
    }
  }

  try {
    const endpoints = [`/plans-v2?country=${isoCode.toLowerCase()}`, '/plans-v2', '/packages', '/plans'];
    for (const ep of endpoints) {
      try {
        const res = await strongesimFetch(ep, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const packages = data.plans || data.packages || data.data || (Array.isArray(data) ? data : []);
          
          if (Array.isArray(packages) && packages.length > 0) {
            // 1. Filtrado estricto por ISO o Nombre de País (España / Spain / ES)
            const countryPackages = packages.filter(p => {
              const pIso = (p.iso || p.isoCode || p.country_code || p.countryCode || '').toUpperCase();
              const pCountry = (p.country || p.country_name || p.name || p.title || '').toUpperCase();
              
              if (pIso === isoCode || pIso.includes(isoCode)) return true;
              if (isoCode === 'ES' && (pCountry.includes('SPAIN') || pCountry.includes('ESPAÑA'))) return true;
              if (isoCode === 'FR' && (pCountry.includes('FRANCE') || pCountry.includes('FRANCIA'))) return true;
              if (isoCode === 'US' && (pCountry.includes('UNITED STATES') || pCountry.includes('USA'))) return true;
              if (pCountry.includes(isoCode)) return true;
              return false;
            });

            // Usamos UNICAMENTE la piscina del país destino. Nunca caemos a packages[0] global
            const pool = countryPackages.length > 0 ? countryPackages : [];

            if (pool.length > 0) {
              // Coincidencia exacta por SKU/ID
              let match = pool.find(p => String(p.sku || p.id || p.code || p.plan_id) === String(sku));

              // Coincidencia por etiqueta de datos (500MB, 10GB, etc)
              if (!match && cleanDataTag) {
                match = pool.find(p => {
                  const pData = (p.dataAmount || p.data || p.name || p.title || '').toLowerCase();
                  return pData.includes(cleanDataTag);
                });
              }

              // Fallback seguro al primer paquete del MISMO PAÍS (España)
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
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Error resolviendo el plan_id de StrongeSIM:', err.message);
  }

  return null;
}
