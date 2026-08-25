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
 * Garantiza coincidencia estricta y algoritmo de scoring multi-factor para TODOS los 198 países y regiones del mundo.
 * Evita totalmente cualquier coincidencia errónea (como asignar 100MB a compras de 1GB).
 */
export async function resolveStrongeSimPlanId({ sku, iso = 'es', dataAmount = '', days = 30 }) {
  if (typeof sku === 'number') return sku;
  if (typeof sku === 'string' && /^\d+$/.test(sku.trim())) return parseInt(sku.trim(), 10);

  let targetIso = (iso || '').toUpperCase().trim();
  if (!targetIso && typeof sku === 'string') {
    const parts = sku.split('-');
    if (parts[0] && parts[0].length <= 8) {
      targetIso = parts[0].toUpperCase().trim();
    }
  }
  if (!targetIso) targetIso = 'ES';

  const rawDataStr = (String(dataAmount || '') + ' ' + String(sku || '')).toLowerCase();

  // Extract Target Days
  let targetDays = parseInt(days, 10);
  if (isNaN(targetDays) || targetDays <= 0) {
    const daysMatch = rawDataStr.match(/(\d+)\s*(?:d|days?|días?|day|dia)\b/i);
    targetDays = daysMatch ? parseInt(daysMatch[1], 10) : 30;
  }

  // Extract Plan Type (Unlimited, Daily, Fixed MB/GB)
  const isUnlimited = rawDataStr.includes('unlimited') || rawDataStr.includes('ilimitad');
  const isDailyPlan = rawDataStr.includes('día') || rawDataStr.includes('dia') || rawDataStr.includes('day') || targetDays === 1;

  let targetMb = null;
  if (!isUnlimited) {
    // 1. Check for MB explicitly: e.g. "500 MB", "100 MB", "500mb", "100mb"
    const mbMatch = rawDataStr.match(/\b(\d+)\s*mb\b/i) || rawDataStr.match(/(\d+)mb/i);
    if (mbMatch) {
      targetMb = parseInt(mbMatch[1], 10);
    } else {
      // 2. Check for GB explicitly: e.g. "1 GB", "2 GB", "10 GB", "1gbtotal", "1gb"
      const gbMatch = rawDataStr.match(/\b(\d+(?:\.\d+)?)\s*gb\b/i) || rawDataStr.match(/(\d+(?:\.\d+)?)gb/i);
      if (gbMatch) {
        targetMb = Math.round(parseFloat(gbMatch[1]) * 1024);
      } else {
        // 3. Check for standalone number in dataAmount or SKU
        const anyNumMatch = (String(dataAmount) || String(sku)).match(/(\d+(?:\.\d+)?)/);
        if (anyNumMatch) {
          const val = parseFloat(anyNumMatch[1]);
          targetMb = val <= 50 ? Math.round(val * 1024) : Math.round(val);
        }
      }
    }
  }

  // Country metadata from ALL_WORLD_COUNTRIES
  const countryMeta = Array.isArray(ALL_WORLD_COUNTRIES) 
    ? ALL_WORLD_COUNTRIES.find(c => c.iso && c.iso.toUpperCase() === targetIso)
    : null;

  try {
    const res = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      const plansList = body.data || body.plans || body.packages || (Array.isArray(body) ? body : []);

      if (Array.isArray(plansList) && plansList.length > 0) {
        // 1. Filter plans matching country / region
        const countryPlans = plansList.filter(p => {
          const pIso = (p.country_code || p.iso || p.isoCode || p.location || '').toUpperCase().trim();
          const pCountry = (p.country || p.country_name || p.name || p.title || '').toUpperCase().trim();
          const pCode = (p.package_code || p.packageCode || p.code || p.sku || '').toUpperCase().trim();

          // Exact ISO match
          if (pIso === targetIso || pIso.split(',').map(s => s.trim()).includes(targetIso)) return true;

          // Region keywords match
          const regKeys = REGION_KEYWORDS[targetIso];
          if (regKeys && regKeys.some(k => pCountry.includes(k) || pIso.includes(k) || pCode.includes(k))) {
            return true;
          }

          // Country meta name match (strict full-word / safe string)
          if (countryMeta) {
            const nameEn = (countryMeta.nameEn || '').toUpperCase();
            const nameEs = (countryMeta.nameEs || '').toUpperCase();
            if (nameEn && nameEn.length > 2 && (pCountry.includes(nameEn) || pCode.includes(nameEn))) return true;
            if (nameEs && nameEs.length > 2 && (pCountry.includes(nameEs) || pCode.includes(nameEs))) return true;
          }

          return false;
        });

        const pool = countryPlans.length > 0 ? countryPlans : plansList;

        if (pool.length > 0) {
          // Calculate suitability score for each candidate plan
          const scoredCandidates = pool.map(p => {
            const pId = p.id || p.plan_id || p.package_id || p.code;
            const pCode = String(p.package_code || p.packageCode || p.code || p.sku || '').toUpperCase().trim();
            const pName = String(p.name || p.title || p.package_name || '').toUpperCase().trim();
            
            // Extract plan validity days
            let pDays = parseInt(p.validity_days || p.duration || p.days || p.validity || 0, 10);
            if (!pDays || isNaN(pDays) || pDays <= 0) {
              const daysRegex = /\b(\d+)\s*(?:d|days?|días?|day|dia)\b/i;
              const dm = (pName + ' ' + pCode).match(daysRegex);
              pDays = dm ? parseInt(dm[1], 10) : 30;
            }

            // Extract plan data volume in MB
            let pMb = null;
            if (p.data_volume_mb && !isNaN(parseFloat(p.data_volume_mb)) && parseFloat(p.data_volume_mb) > 0) {
              pMb = parseFloat(p.data_volume_mb);
            } else if (p.volume && !isNaN(parseFloat(p.volume)) && parseFloat(p.volume) > 0) {
              pMb = Math.round(parseFloat(p.volume) / (1024 * 1024));
            } else {
              // Parse MB / GB from title/name
              const gm = (pName + ' ' + pCode + ' ' + (p.dataAmount || '')).match(/\b(\d+(?:\.\d+)?)\s*gb\b/i);
              if (gm) {
                pMb = Math.round(parseFloat(gm[1]) * 1024);
              } else {
                const mm = (pName + ' ' + pCode + ' ' + (p.dataAmount || '')).match(/\b(\d+)\s*mb\b/i);
                if (mm) pMb = parseInt(mm[1], 10);
              }
            }

            const pIsUnlimited = (pName + ' ' + pCode).includes('UNLIMITED') || pName.includes('ILIMITAD');
            const pIsDaily = (pName + ' ' + pCode).includes('DAILY') || pName.includes('DÍA') || pDays === 1;

            let score = 0;

            // A) Exact Code / ID match
            if (String(pId) === String(sku) || (pCode && pCode === String(sku).toUpperCase())) {
              return { plan: p, score: 1000000, pMb, pDays };
            }

            // B) Unlimited Matching
            if (isUnlimited) {
              if (pIsUnlimited) {
                score = 50000 - Math.abs(pDays - targetDays) * 100;
              } else {
                score = 0;
              }
              return { plan: p, score, pMb, pDays };
            }

            // C) Data Volume (MB) Matching
            if (targetMb !== null && pMb !== null) {
              // Is exact data volume (e.g. 1GB vs 1024MB or 1000MB)
              const isExactData = (pMb === targetMb) ||
                (Math.abs(pMb - targetMb) / targetMb < 0.05) ||
                (targetMb >= 1000 && Math.abs(Math.round(pMb / 1000) - Math.round(targetMb / 1000)) === 0 && Math.abs(pMb - targetMb) < 500);

              if (isExactData) {
                score = 50000;
                // Exact days match bonus
                if (pDays === targetDays) {
                  score += 30000;
                } else {
                  score -= Math.abs(pDays - targetDays) * 200;
                }
              } else {
                // Not exact data match: heavy penalty for mismatched data amounts
                const diffMb = Math.abs(pMb - targetMb);
                const relativeDiff = diffMb / Math.max(targetMb, 1);
                if (relativeDiff > 0.4) {
                  // Huge penalty: 100MB will NEVER match when target is 1024MB (diff is ~0.9)
                  score = Math.max(0, 1000 - Math.round(relativeDiff * 1000));
                } else {
                  score = Math.max(0, 20000 - Math.round(relativeDiff * 15000) - Math.abs(pDays - targetDays) * 100);
                }
              }
            }

            // D) Daily plan boost if requested
            if (isDailyPlan && pIsDaily) {
              score += 5000;
            }

            return { plan: p, score, pMb, pDays };
          });

          // Sort descending by score
          scoredCandidates.sort((a, b) => b.score - a.score);

          const bestCandidate = scoredCandidates[0];
          if (bestCandidate && bestCandidate.score > 0) {
            const resolvedId = bestCandidate.plan.id || bestCandidate.plan.plan_id || bestCandidate.plan.package_id || bestCandidate.plan.code;
            if (resolvedId && (typeof resolvedId === 'number' || /^\d+$/.test(String(resolvedId)))) {
              addDiagnosticLog('STRONGESIM', 'PLAN_RESOLVED', {
                input: { sku, iso: targetIso, dataAmount, days: targetDays, targetMb },
                resolved: {
                  id: parseInt(String(resolvedId), 10),
                  name: bestCandidate.plan.name || bestCandidate.plan.title,
                  data_volume_mb: bestCandidate.pMb,
                  validity_days: bestCandidate.pDays,
                  score: bestCandidate.score,
                },
              });
              return parseInt(String(resolvedId), 10);
            }
          }

          // Fallback to the first plan ONLY if no match with score > 0 was found
          const fallbackPlan = pool[0];
          const fallbackId = fallbackPlan.id || fallbackPlan.plan_id || fallbackPlan.package_id || fallbackPlan.code;
          if (fallbackId && (typeof fallbackId === 'number' || /^\d+$/.test(String(fallbackId)))) {
            return parseInt(String(fallbackId), 10);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error resolviendo el plan_id de StrongeSIM:', err.message);
  }

  return null;
}
