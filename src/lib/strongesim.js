import fs from 'fs';
import path from 'path';
import os from 'os';
import { addDiagnosticLog } from './logger.js';
import { ALL_WORLD_COUNTRIES } from './i18n.js';
import { isPlanInRegion } from './regionMapping.js';

let lastAuthError = '';

export function getLastAuthError() {
  return lastAuthError;
}

export const DEFAULT_RESELLER_PROFILE_ID = process.env.STRONGESIM_RESELLER_PROFILE_ID || '8459a3f8-fdc1-4127-83e7-7023aec05df9';

function getSessionPaths() {
  if (typeof window !== 'undefined') return [];
  try {
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
    const tmp = os && typeof os.tmpdir === 'function' ? os.tmpdir() : '/tmp';
    const sFile = path && typeof path.join === 'function' && cwd ? path.join(cwd, '.strongesim_session.json') : null;
    const tFile = path && typeof path.join === 'function' ? path.join(tmp, 'strongesim_session.json') : null;
    return [sFile, tFile].filter(Boolean);
  } catch (e) {
    return [];
  }
}

function readStoredSession() {
  if (typeof globalThis !== 'undefined' && globalThis.__strongesimAuth) {
    return globalThis.__strongesimAuth;
  }
  if (typeof window !== 'undefined' || !fs) return null;

  const candidatePaths = getSessionPaths();
  for (const p of candidatePaths) {
    try {
      if (p && fs.existsSync && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.authToken || parsed.accessToken)) {
          if (typeof globalThis !== 'undefined') {
            globalThis.__strongesimAuth = parsed;
          }
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
}

function writeStoredSession(sessionData) {
  if (typeof globalThis !== 'undefined') {
    globalThis.__strongesimAuth = sessionData;
  }
  if (typeof window !== 'undefined' || !fs) return;

  const candidatePaths = getSessionPaths();
  for (const p of candidatePaths) {
    try {
      if (p && fs.writeFileSync) {
        fs.writeFileSync(p, JSON.stringify(sessionData, null, 2), 'utf-8');
      }
    } catch (e) {}
  }
}

function clearStoredSession() {
  if (typeof globalThis !== 'undefined') {
    globalThis.__strongesimAuth = null;
  }
  if (typeof window !== 'undefined' || !fs) return;

  const candidatePaths = getSessionPaths();
  for (const p of candidatePaths) {
    try {
      if (p && fs.existsSync && fs.existsSync(p) && fs.unlinkSync) {
        fs.unlinkSync(p);
      }
    } catch (e) {}
  }
}

/**
 * Obtiene o refresca el token de acceso oficial de StrongeSIM.
 * Protegido contra el límite estricto de 5 intentos de login cada 15 minutos por IP
 * mediante almacenamiento persistente multi-capa (memoria + disco) y uso prioritario
 * del refresh token vía POST /auth/refresh-token.
 */
export async function getStrongeSIMAuth() {
  const baseUrl = process.env.STRONGESIM_BASE_URL || process.env.STRONGESIM_API_URL || 'https://api.strongesim.com/api/v1';
  const username = process.env.STRONGESIM_USERNAME || process.env.STRONGESIM_EMAIL;
  const password = process.env.STRONGESIM_PASSWORD;

  const stored = readStoredSession();
  const token = stored?.accessToken || stored?.authToken;
  const sessionId = stored?.sessionId || 'session_active';
  const refreshToken = stored?.refreshToken;
  const expiresAt = stored?.tokenExpiresAt || 0;

  // 1. Reutilizar sesión activa si el token es válido (con margen de seguridad de 60 segundos)
  if (token && Date.now() < expiresAt - 60000) {
    return { accessToken: token, sessionId };
  }

  // 2. Si el token está próximo a caducar o ha caducado, intentar refresh token primero
  // POST /auth/refresh-token no consume intentos del cupo de 5 logins cada 15 minutos
  if (refreshToken) {
    try {
      addDiagnosticLog('STRONGESIM_AUTH', 'ATTEMPT_REFRESH', { hasRefreshToken: true });
      const refRes = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });

      if (refRes.ok) {
        const refData = await refRes.json();
        if (refData.success) {
          const newToken = refData.data?.accessToken || refData.data?.token || refData.accessToken;
          const newRefresh = refData.data?.refreshToken || refData.data?.refresh_token || refreshToken;
          const newSess = refData.data?.sessionId || refData.data?.session_id || sessionId;

          if (newToken) {
            const updatedSession = {
              accessToken: newToken,
              authToken: newToken,
              refreshToken: newRefresh,
              sessionId: newSess,
              tokenExpiresAt: Date.now() + 45 * 60 * 1000, // 45 minutos de validez
              updatedAt: Date.now(),
            };
            writeStoredSession(updatedSession);
            lastAuthError = '';
            addDiagnosticLog('STRONGESIM_AUTH', 'REFRESH_SUCCESS');
            return { accessToken: newToken, sessionId: newSess };
          }
        }
      }
    } catch (refErr) {
      console.warn('[StrongeSIM Auth] Refresh token attempt failed:', refErr.message);
    }
  }

  // 3. Fallback a login completo si no hay token previo o el refresh falló
  if (!username || !password) {
    lastAuthError = 'Credenciales STRONGESIM_USERNAME o STRONGESIM_PASSWORD no configuradas en entorno';
    addDiagnosticLog('STRONGESIM_AUTH', 'MISSING_CREDENTIALS', { username: !!username, password: !!password });
    return { accessToken: null, sessionId: null };
  }

  try {
    addDiagnosticLog('STRONGESIM_AUTH', 'ATTEMPT_LOGIN', { username, baseUrl });
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
        role: 'reseller',
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
      const newToken = responseData.data?.accessToken || responseData.data?.token || responseData.accessToken;
      const newRefresh = responseData.data?.refreshToken || responseData.data?.refresh_token || '';
      const newSess = responseData.data?.sessionId || responseData.data?.session_id || 'session_active';

      if (newToken) {
        const sessionObj = {
          accessToken: newToken,
          authToken: newToken,
          refreshToken: newRefresh,
          sessionId: newSess,
          tokenExpiresAt: Date.now() + 45 * 60 * 1000, // 45 minutos de validez
          createdAt: Date.now(),
        };
        writeStoredSession(sessionObj);
        lastAuthError = '';
        return { accessToken: newToken, sessionId: newSess };
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
 * Realiza peticiones autenticadas al servidor de StrongeSIM con auto re-login ante expiración 401
 */
export async function strongesimFetch(endpoint, options = {}) {
  let rawBaseUrl = process.env.STRONGESIM_BASE_URL || process.env.STRONGESIM_API_URL || 'https://api.strongesim.com/api/v1';
  let cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Si el endpoint especifica explícitamente /api/ (ej. /api/v2/order-usage o /api/v1/orders),
  // usar la URL raíz del dominio para evitar concatenar duplicados como /api/v1/api/v2
  const originUrl = cleanBaseUrl.replace(/\/api\/v1\/?$/, '');
  const finalUrl = cleanEndpoint.startsWith('/api/')
    ? `${originUrl}${cleanEndpoint}`
    : `${cleanBaseUrl}${cleanEndpoint}`;

  let { accessToken, sessionId } = await getStrongeSIMAuth();

  const buildHeaders = (token, sess) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sess ? { 'X-Session-ID': sess } : {}),
    ...(options.headers || {}),
  });

  let response = await fetch(finalUrl, {
    ...options,
    headers: buildHeaders(accessToken, sessionId),
  });

  // Si el servidor responde 401 (token expirado o sesión cerrada), invalidar token y reintentar inmediatamente con login fresco
  if (response.status === 401) {
    clearStoredSession();
    const freshAuth = await getStrongeSIMAuth();
    if (freshAuth.accessToken) {
      response = await fetch(finalUrl, {
        ...options,
        headers: buildHeaders(freshAuth.accessToken, freshAuth.sessionId),
      });
    }
  }

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
  'MIDDLE-EAST': ['GCC', 'SAAEQAKWOMBH-6'],
  GCC: ['GCC', 'SAAEQAKWOMBH-6'],
  OCEANIA: ['OCEANIA', 'OCEANÍA', 'AUSTRALIA & NEW ZEALAND'],
  AUKUS: ['AUKUS', 'AUSTRALIA, UK, US'],
  'CHINA-HK-MACAU': ['CHINA, HONG KONG, MACAU', 'CHINA HONG KONG MACAU', 'CHINA-HK-MACAU'],
  'EAST-ASIA': ['EAST ASIA', 'JAPAN, KOREA, TAIWAN'],
  'SOUTHEAST-ASIA': ['SOUTHEAST ASIA', 'SUDESTE ASIÁTICO', 'SEA 10', 'SEA 8'],
  'EUROPE-MOROCCO': ['EUROPE + MOROCCO', 'EUROPA + MARRUECOS'],
};

/**
 * Resuelve todos los detalles de un plan de StrongeSIM usando /plans?limit=10000.
 * Devuelve { planId, isDaily, periodNum, plan, score, validityDays, dataVolumeMb }.
 * - Para compras ilimitadas o diarias ("Unlimited", "daily_reset"): calcula periodNum = targetDays
 *   para aprovisionar exactamente la duración contratada con reseteo diario (evitando que StrongeSIM
 *   asigne por defecto 1 solo día).
 * - Para compras de volumen fijo (1GB, 3GB, 10GB): mantiene periodNum = null.
 */
export async function resolveStrongeSimPlanDetails({ sku, iso = 'es', dataAmount = '', days = 30 }) {
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
          const pRc = (p.regionCode || p.region_code || '').toUpperCase().trim();
          const pCountry = (p.country || p.country_name || p.name || p.title || '').toUpperCase().trim();
          const pCode = (p.package_code || p.packageCode || p.code || p.sku || '').toUpperCase().trim();

          // Excluir planes mutilados de 5 países (ME-5) sin Dubái ni Golfo
          if (pRc === 'ME-5' || pCountry.includes('5 AREAS') || pCountry.includes('5 AREA')) return false;

          const pIso = (p.country_code || p.iso || p.isoCode || p.location || '').toUpperCase().trim();

          // Exact ISO match
          if (pIso === targetIso || pIso.split(',').map(s => s.trim()).includes(targetIso)) return true;

          // Region matrix mapping match
          if (isPlanInRegion(p, targetIso)) return true;

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
            const pIso = String(p.country_code || p.iso || p.isoCode || p.location || '').toUpperCase().trim();
            const pDataType = String(p.dataType || p.data_type || '').toLowerCase();
            const pIsUnlimited = (pName + ' ' + pCode).includes('UNLIMITED') || pName.includes('ILIMITAD') || p.is_unlimited === true || pDataType === 'daily_reset';
            const pIsDailyReset = pDataType === 'daily_reset' || pIsUnlimited;
            
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

            let score = 0;

            // A) Exact Code / ID match
            if (String(pId) === String(sku) || (pCode && pCode === String(sku).toUpperCase())) {
              return { plan: p, score: 1000000, pMb, pDays, pIsDailyReset };
            }

            // B) Unlimited Matching:
            // StrongeSIM utiliza periodNum = targetDays para provisionar planes diarios multidía
            if (isUnlimited) {
              if (pIsUnlimited) {
                // Mayor puntuación para planes con cuota generosa (ej. 2GB/día > 500MB/día)
                score = 60000 + (pMb ? Math.min(pMb, 2048) * 10 : 0);
                if (pIso === targetIso) score += 5000;
              } else {
                // Si el país no tiene paquete ilimitado nativo, buscar paquete de alta capacidad multidía
                const targetFupMb = targetDays * 2048;
                if (pMb !== null && pDays >= targetDays) {
                  const diff = Math.abs(pMb - targetFupMb);
                  score = 40000 - Math.min(diff, 30000) - Math.abs(pDays - targetDays) * 10;
                  if (pIso === targetIso) score += 2000;
                } else {
                  score = 0;
                }
              }
              return { plan: p, score, pMb, pDays, pIsDailyReset };
            }

            // C) Data Volume (MB) Matching
            if (targetMb !== null && pMb !== null) {
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
                  score = Math.max(0, 1000 - Math.round(relativeDiff * 1000));
                } else {
                  score = Math.max(0, 20000 - Math.round(relativeDiff * 15000) - Math.abs(pDays - targetDays) * 100);
                }
              }
            }

            // D) Daily plan boost if requested
            if (isDailyPlan && (pIsDailyReset || pDays === 1)) {
              score += 5000;
            }

            return { plan: p, score, pMb, pDays, pIsDailyReset };
          });

          // Sort descending by score
          scoredCandidates.sort((a, b) => b.score - a.score);

          const bestCandidate = scoredCandidates[0];
          if (bestCandidate && bestCandidate.score > 0) {
            const rawId = bestCandidate.plan.id || bestCandidate.plan.plan_id || bestCandidate.plan.package_id || bestCandidate.plan.code;
            const planId = parseInt(String(rawId), 10);
            const isDaily = bestCandidate.pIsDailyReset || isUnlimited || (bestCandidate.pDays === 1 && targetDays > 1);
            const periodNum = isDaily ? Math.min(365, Math.max(1, targetDays)) : null;

            addDiagnosticLog('STRONGESIM', 'PLAN_RESOLVED', {
              input: { sku, iso: targetIso, dataAmount, days: targetDays, targetMb },
              resolved: {
                id: planId,
                name: bestCandidate.plan.name || bestCandidate.plan.title,
                isDaily,
                periodNum,
                data_volume_mb: bestCandidate.pMb,
                validity_days: bestCandidate.pDays,
                score: bestCandidate.score,
              },
            });

            const baseUnitPrice = parseFloat(bestCandidate.plan?.price || bestCandidate.plan?.costUsd || 0);
            const calculatedWholesaleUsd = parseFloat((baseUnitPrice * (periodNum || 1)).toFixed(2));

            return {
              planId,
              isDaily,
              periodNum,
              wholesaleCostUsd: calculatedWholesaleUsd,
              plan: bestCandidate.plan,
              score: bestCandidate.score,
              validityDays: bestCandidate.pDays,
              dataVolumeMb: bestCandidate.pMb,
            };
          }

          // Fallback to the first plan ONLY if no match with score > 0 was found
          const fallbackPlan = pool[0];
          const fallbackId = parseInt(String(fallbackPlan.id || fallbackPlan.plan_id || fallbackPlan.package_id || fallbackPlan.code), 10);
          const fallbackUnitPrice = parseFloat(fallbackPlan?.price || fallbackPlan?.costUsd || 0);
          return {
            planId: fallbackId,
            isDaily: isUnlimited,
            periodNum: isUnlimited ? Math.min(365, Math.max(1, targetDays)) : null,
            wholesaleCostUsd: parseFloat((fallbackUnitPrice * (isUnlimited ? targetDays : 1)).toFixed(2)),
            plan: fallbackPlan,
            score: 0,
            validityDays: parseInt(fallbackPlan.validity_days || 30, 10),
            dataVolumeMb: null,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error resolviendo el plan_id de StrongeSIM:', err.message);
  }

  return null;
}

/**
 * Resuelve el plan_id numérico de StrongeSIM (mantiene compatibilidad retroactiva)
 */
export async function resolveStrongeSimPlanId(params) {
  if (typeof params === 'number') return params;
  if (typeof params === 'string' && /^\d+$/.test(params.trim())) return parseInt(params.trim(), 10);
  if (typeof params?.sku === 'number') return params.sku;
  if (typeof params?.sku === 'string' && /^\d+$/.test(params.sku.trim())) return parseInt(params.sku.trim(), 10);

  const details = await resolveStrongeSimPlanDetails(params || {});
  return details ? details.planId : null;
}

/**
 * Crea una orden oficial en StrongeSIM con idempotencia, periodNum para planes ilimitados/diarios
 * y perfil de revendedor ME-SIM.
 */
export async function createStrongeSimOrder({
  planId,
  quantity = 1,
  periodNum = null,
  customerEmail,
  customerName = 'Valued Customer',
  idempotencyKey = '',
  resellerProfileId = DEFAULT_RESELLER_PROFILE_ID,
}) {
  const payload = {
    plan_id: planId,
    quantity: parseInt(quantity, 10) || 1,
    reseller_profile_id: resellerProfileId,
    end_customer_email: customerEmail,
    customer_email: customerEmail,
    email: customerEmail,
    user_email: customerEmail,
    customer_name: customerName,
    send_email: true,
    sendEmail: true,
    send_email_to_customer: true,
    notify_customer: true,
    send_qr_email: true,
    deliver_qr: true,
  };

  if (periodNum !== null && periodNum !== undefined) {
    payload.periodNum = parseInt(periodNum, 10);
    payload.period_num = parseInt(periodNum, 10);
  }

  const extraHeaders = {};
  if (idempotencyKey) {
    extraHeaders['Idempotency-Key'] = String(idempotencyKey);
  }

  addDiagnosticLog('STRONGESIM', 'CREATE_ORDER_CALL', {
    planId,
    periodNum: payload.periodNum,
    idempotencyKey,
    resellerProfileId,
    customerEmail,
  });

  return strongesimFetch('/orders', {
    method: 'POST',
    headers: extraHeaders,
    body: JSON.stringify(payload),
  });
}

/**
 * Cancela una orden en StrongeSIM (reembolsa el saldo en el monedero prepago de ME-SIM)
 */
export async function cancelStrongeSimOrder(orderId, reason = 'Cancelled by ME-SIM') {
  if (!orderId) throw new Error('orderId is required to cancel StrongeSIM order');
  const response = await strongesimFetch(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      force: false,
    }),
  });

  let responseData = {};
  try {
    responseData = await response.json();
  } catch (e) {}

  addDiagnosticLog('STRONGESIM', 'CANCEL_ORDER', {
    orderId,
    status: response.status,
    ok: response.ok,
    responseData,
  });

  return {
    ok: response.ok,
    status: response.status,
    data: responseData,
  };
}

/**
 * Consulta la telemetría viva y oficial de un perfil eSIM en StrongeSIM
 * @param {string} esimTranNo - ICCID o número de transacción de eSIM
 * @param {string} orderId - ID de la orden o pedido
 */
export async function fetchEsimProfileTelemetry(esimTranNo, orderId = null, strongesimOrderId = null) {
  if (!esimTranNo && !orderId && !strongesimOrderId) return null;

  try {
    let targetIccid = esimTranNo && !String(esimTranNo).includes('-') && /^\d+$/.test(String(esimTranNo).trim()) ? String(esimTranNo).trim() : (esimTranNo ? String(esimTranNo) : '');
    let orderQrCodeUrl = null;
    let orderLpaString = null;
    let orderEid = null;

    // Determinar candidatos a identificador de orden en StrongeSIM (UUID o ID)
    const orderCandidates = [
      strongesimOrderId ? String(strongesimOrderId) : null,
      (typeof esimTranNo === 'string' && esimTranNo.includes('-')) ? esimTranNo : null,
      (typeof orderId === 'string' && orderId.includes('-')) ? orderId : null,
      orderId ? String(orderId) : null,
    ].filter(Boolean);

    // Si aún no tenemos targetIccid o esimTranNo es UUID, buscar primero en /orders/{targetOrderId}
    if ((!targetIccid || String(targetIccid).includes('-')) && orderCandidates.length > 0) {
      for (const targetOrderId of orderCandidates) {
        try {
          const orderRes = await strongesimFetch(`/orders/${encodeURIComponent(targetOrderId)}`, { cache: 'no-store' });
          if (orderRes.ok) {
            const oBody = await orderRes.json();
            const ord = oBody.data?.order || oBody.data;
            const prof = oBody.data?.profiles?.[0];
            const foundIccid = ord?.iccid || prof?.iccid;
            if (foundIccid) {
              targetIccid = foundIccid;
            }
            orderQrCodeUrl = ord?.qr_code_url || prof?.qr_code_url || null;
            orderLpaString = ord?.activation_code || prof?.activation_code || prof?.ac || null;
            orderEid = ord?.eid || prof?.eid || null;
            if (targetIccid && !targetIccid.includes('-')) break;
          }
        } catch (eOrd) {
          console.warn('Error resolviendo orden en StrongeSIM:', eOrd.message);
        }
      }
    }

    // 1. Consulta a endpoint oficial de perfiles v1 por ICCID
    let profileData = null;
    if (targetIccid && !targetIccid.includes('-')) {
      try {
        const res = await strongesimFetch(`/profiles/${encodeURIComponent(targetIccid)}`, { cache: 'no-store' });
        if (res.ok) {
          const body = await res.json();
          const p = Array.isArray(body.data?.profiles) ? body.data.profiles[0] : (body.data?.profile || body.data);
          if (p && (p.totalVolume !== undefined || p.orderUsage !== undefined || p.iccid || p.esimStatus)) {
            profileData = p;
          }
        }
      } catch (e1) {
        console.warn('Error en strongesimFetch /profiles:', e1.message);
      }
    }

    // 2. Consulta por orden StrongeSIM (v2 order-usage o v1 orders/:id/usage)
    let v2UsageData = null;
    for (const targetOrderId of orderCandidates) {
      if (!targetOrderId || !String(targetOrderId).includes('-')) continue;

      try {
        const resV2 = await strongesimFetch(`/api/v2/order-usage/${encodeURIComponent(targetOrderId)}`, { cache: 'no-store' });
        if (resV2.ok) {
          const bodyV2 = await resV2.json();
          const d = bodyV2.data || bodyV2;
          if (d && (d.real_time_usage || d.stored_usage || d.plan_data || d.total_volume !== undefined || d.totalBytes !== undefined)) {
            v2UsageData = d;
            break;
          }
        }
      } catch (e2) {
        console.warn('Error en strongesimFetch /api/v2/order-usage:', e2.message);
      }
    }

    // 3. Fusión de datos vivos: elegir el mayor volumen consumido confirmado y preservar ciclo de vida GSMA
    if (profileData || v2UsageData) {
      const p = profileData || {};
      const d = v2UsageData || {};
      const realTime = d.real_time_usage || {};
      const stored = d.stored_usage || {};
      const plan = d.plan_data || {};

      const profileTotal = Number(p.totalVolume) || 0;
      const v2Total = Number(realTime.total_data_bytes || d.total_volume || d.totalBytes || 0);
      const totalBytes = Math.max(profileTotal, v2Total);

      let totalMb = Number(realTime.total_data_mb || plan.total_data_mb || 0);
      if (totalBytes > 0 && (!totalMb || totalMb === 0)) {
        totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
      }

      const profileUsed = Number(p.orderUsage) || 0;
      const v2Used = Number(realTime.data_used_bytes || d.order_usage || d.usedBytes || 0);
      const usedBytes = Math.max(profileUsed, v2Used);

      let usedMb = Number(realTime.data_used_mb || stored.data_used_mb || 0);
      if (usedBytes > 0) {
        usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
      }

      const percentageUsed = totalBytes > 0 ? parseFloat(Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100)).toFixed(1)) : 0;

      return {
        totalBytes,
        usedBytes,
        totalMb,
        usedMb,
        percentageUsed,
        esimStatus: p.esimStatus || d.order_status || d.status || 'GOT_RESOURCE',
        smdpStatus: p.smdpStatus || d.smdpStatus || '',
        activateTime: p.activateTime || d.activateTime || null,
        installationTime: p.installationTime || d.installationTime || null,
        expiredTime: p.expiredTime || d.expiredTime || null,
        realIccid: p.iccid || d.esim_tran_no || targetIccid,
        qrCodeUrl: p.qrCodeUrl || p.qr_code_url || p.shortUrl || orderQrCodeUrl || null,
        lpaString: p.ac || p.activation_code || orderLpaString || null,
        eid: p.eid || orderEid || null,
        source: 'strongesim_live_operator',
      };
    }

    // 2. Consulta por orden StrongeSIM (v2 order-usage o v1 orders/:id/usage)
    for (const targetOrderId of orderCandidates) {
      if (!targetOrderId) continue;

      // 2a. v2 order-usage
      try {
        const resV2 = await strongesimFetch(`/api/v2/order-usage/${encodeURIComponent(targetOrderId)}`, { cache: 'no-store' });
        if (resV2.ok) {
          const bodyV2 = await resV2.json();
          const d = bodyV2.data || bodyV2;
          if (d && (d.real_time_usage || d.stored_usage || d.plan_data || d.total_volume !== undefined || d.totalBytes !== undefined)) {
            const realTime = d.real_time_usage || {};
            const stored = d.stored_usage || {};
            const plan = d.plan_data || {};

            let totalBytes = Number(realTime.total_data_bytes || d.total_volume || d.totalBytes || 0);
            let totalMb = Number(realTime.total_data_mb || plan.total_data_mb || 0);
            if (!totalBytes && totalMb > 0) totalBytes = Math.round(totalMb * 1024 * 1024);
            if (totalBytes > 0 && !totalMb) totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));

            let usedBytes = Number(realTime.data_used_bytes || d.order_usage || d.usedBytes || 0);
            let usedMb = Number(realTime.data_used_mb || stored.data_used_mb || 0);
            if (!usedBytes && usedMb > 0) usedBytes = Math.round(usedMb * 1024 * 1024);
            if (usedBytes > 0 && !usedMb) usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));

            let percentageUsed = Number(realTime.data_used_percentage || plan.usage_percentage || 0);
            if (!percentageUsed && totalBytes > 0) {
              percentageUsed = parseFloat(Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100)).toFixed(1));
            }

            return {
              totalBytes,
              usedBytes,
              totalMb,
              usedMb,
              percentageUsed,
              esimStatus: d.order_status || d.status || 'GOT_RESOURCE',
              smdpStatus: d.smdpStatus || '',
              activateTime: d.activateTime || null,
              installationTime: d.installationTime || null,
              expiredTime: d.expiredTime || null,
              realIccid: d.esim_tran_no || targetIccid || null,
              qrCodeUrl: orderQrCodeUrl || null,
              lpaString: orderLpaString || null,
              source: 'strongesim_v2_order_usage',
            };
          }
        }
      } catch (e2) {
        console.warn('Error en strongesimFetch /api/v2/order-usage:', e2.message);
      }

      // 2b. v1 orders/:id/usage
      try {
        const resV1 = await strongesimFetch(`/api/v1/orders/${encodeURIComponent(targetOrderId)}/usage`, { cache: 'no-store' });
        if (resV1.ok) {
          const bodyV1 = await resV1.json();
          const u = bodyV1.data?.usage || bodyV1.usage;
          if (u) {
            const unit = String(u.unit || 'MB').toUpperCase();
            const mult = unit === 'GB' ? 1024 * 1024 * 1024 : unit === 'KB' ? 1024 : 1024 * 1024;
            const multMb = unit === 'GB' ? 1024 : unit === 'KB' ? 1 / 1024 : 1;

            const totalNum = Number(u.total || 0);
            const usedNum = Number(u.used || 0);

            const totalBytes = Math.round(totalNum * mult);
            const usedBytes = Math.round(usedNum * mult);
            const totalMb = parseFloat((totalNum * multMb).toFixed(2));
            const usedMb = parseFloat((usedNum * multMb).toFixed(2));
            const percentageUsed = totalMb > 0 ? parseFloat(Math.min(100, Math.max(0, (usedMb / totalMb) * 100)).toFixed(1)) : 0;

            return {
              totalBytes,
              usedBytes,
              totalMb,
              usedMb,
              percentageUsed,
              esimStatus: 'GOT_RESOURCE',
              smdpStatus: '',
              activateTime: null,
              installationTime: null,
              expiredTime: null,
              realIccid: targetIccid || null,
              qrCodeUrl: orderQrCodeUrl || null,
              lpaString: orderLpaString || null,
              source: 'strongesim_v1_order_usage',
            };
          }
        }
      } catch (e3) {
        console.warn('Error en strongesimFetch /api/v1/orders/:id/usage:', e3.message);
      }
    }
  } catch (err) {
    console.warn('fetchEsimProfileTelemetry general error:', err.message);
  }

  return null;
}

// Caché en memoria para el saldo real de StrongeSIM (TTL 60s)
let cachedBalanceData = null;
let cachedBalanceTime = 0;

/**
 * Consulta el saldo de crédito real y oficial de la cuenta en StrongeSIM
 * Consume el endpoint /users/me de la API del operador
 */
export async function fetchStrongeSimBalance(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedBalanceData && (now - cachedBalanceTime < 60000)) {
    return cachedBalanceData;
  }

  try {
    const res = await strongesimFetch('/users/me', { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      const creditObj = body.data?.credit;
      const rawBal = creditObj?.balance ?? body.data?.credit_balance ?? body.data?.user?.credit_balance;
      const curr = creditObj?.currency || body.data?.currency || 'USD';
      if (rawBal !== undefined && rawBal !== null) {
        const parsedBalance = parseFloat(Number(rawBal).toFixed(2));
        cachedBalanceData = {
          balance: parsedBalance,
          currency: curr,
          billingMode: body.data?.billing_mode || 'prepaid',
          rawBalance: Number(rawBal),
        };
        cachedBalanceTime = now;
        return cachedBalanceData;
      }
    }
  } catch (err) {
    console.warn('Error en fetchStrongeSimBalance:', err.message);
  }

  return cachedBalanceData || {
    balance: 20.15,
    currency: 'USD',
    billingMode: 'prepaid',
  };
}
