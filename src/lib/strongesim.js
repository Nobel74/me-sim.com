/**
 * Helper del Lado del Servidor para Autenticación y llamadas Proxy a StrongeSIM API
 */

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
    lastAuthError = 'Credenciales STRONGESIM_USERNAME o STRONGESIM_PASSWORD no configuradas en .env.local';
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

    if (response.ok && responseData.success) {
      // Extraemos accessToken directamente de data.accessToken
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
