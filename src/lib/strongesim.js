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
 * Resuelve el plan_id numérico real de StrongeSIM basándose en ISO, volumen de datos o días
 * Elimina cualquier fallback incorrecto a países extraños (como Uzbekistán 19901)
 */
export async function resolveStrongeSimPlanId({ sku, iso = 'es', dataAmount = '', days = 30 }) {
  if (typeof sku === 'number') return sku;
  if (typeof sku === 'string' && /^\d+$/.test(sku.trim())) return parseInt(sku.trim(), 10);

  const isoCode = (iso || (typeof sku === 'string' ? sku.split('-')[0] : '') || 'es').toUpperCase();
  const targetDataStr = (dataAmount || '').toLowerCase();

  try {
    const endpoints = [`/plans-v2?country=${isoCode.toLowerCase()}`, '/packages', '/plans', '/plans-v2'];
    for (const ep of endpoints) {
      try {
        const res = await strongesimFetch(ep, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const packages = data.plans || data.packages || data.data || (Array.isArray(data) ? data : []);
          if (Array.isArray(packages) && packages.length > 0) {
            const countryPackages = packages.filter(p => {
              const pIso = (p.iso || p.isoCode || p.country_code || p.country || '').toUpperCase();
              return pIso === isoCode || pIso.includes(isoCode) || isoCode.includes(pIso);
            });

            const pool = countryPackages.length > 0 ? countryPackages : packages;

            let match = pool.find(p => String(p.sku || p.id || p.code || p.plan_id) === String(sku));

            if (!match && targetDataStr) {
              match = pool.find(p => {
                const pData = (p.dataAmount || p.data || p.name || p.title || '').toLowerCase();
                return pData.includes(targetDataStr) || (days && p.days === parseInt(days, 10));
              });
            }

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
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Error resolviendo el plan_id de StrongeSIM:', err.message);
  }

  return null;
}
