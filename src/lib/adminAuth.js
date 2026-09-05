import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'admin-users.json');
const COOKIE_NAME = 'mesim_admin_token';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'mesim_super_secret_jwt_key_2026_isolated_guard';

// Caché en memoria para alta velocidad y fallback
let memoryUsersCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 segundos

const DEFAULT_USERS = [
  {
    id: 'usr-admin-1',
    email: 'paxfer@gmail.com',
    name: 'Paco (Admin)',
    role: 'admin',
    avatar: '',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    createdAt: '2026-09-01T10:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr-partner-1',
    email: 'evans.clem@gmail.com',
    name: 'Clem Evans',
    role: 'partner',
    avatar: '',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    createdAt: '2026-09-01T10:00:00.000Z',
    status: 'active',
  },
];

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'La contraseña es obligatoria.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener una longitud mínima de 8 caracteres.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos una letra mayúscula (A-Z).' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-\+=/\\[\]~`§±]/.test(password)) {
    return { valid: false, message: 'La contraseña debe incluir al menos un carácter especial (ej. !@#$%&*).' };
  }
  return { valid: true };
}

/**
 * Lee usuarios administradores desde la base de datos de WooCommerce (MySQL persistente)
 * con fallback al archivo local src/data/admin-users.json y memoria caché.
 */
export async function getAllAdminUsers() {
  const now = Date.now();
  if (memoryUsersCache && now - lastFetchTime < CACHE_TTL_MS) {
    return memoryUsersCache;
  }

  // 1. Intento de carga persistente desde WooCommerce (cliente 45 - Paco Fernández)
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
        const meta = (customer.meta_data || []).find((m) => m.key === 'mesim_admin_users');
        if (meta && meta.value) {
          const parsed = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryUsersCache = parsed;
            lastFetchTime = now;
            // Guardar copia local si el entorno lo permite
            try {
              if (fs.existsSync(path.dirname(USERS_FILE))) {
                fs.writeFileSync(USERS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
              }
            } catch {}
            return parsed;
          }
        }
      }
    }
  } catch (err) {
    console.warn('getAllAdminUsers: Error conectando a WooCommerce:', err.message);
  }

  // 2. Fallback a archivo local src/data/admin-users.json
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryUsersCache = parsed;
        lastFetchTime = now;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading admin-users.json:', err);
  }

  // 3. Fallback por defecto si no hay nada guardado
  memoryUsersCache = DEFAULT_USERS;
  lastFetchTime = now;
  return DEFAULT_USERS;
}

/**
 * Guarda usuarios administradores tanto en WooCommerce (persistencia global en la nube)
 * como en el archivo local src/data/admin-users.json (en desarrollo).
 */
export async function saveAdminUsers(users) {
  memoryUsersCache = users;
  lastFetchTime = Date.now();

  let localSaved = false;
  // 1. Guardar localmente si el sistema de archivos es de escritura
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    localSaved = true;
  } catch (err) {
    console.warn('saveAdminUsers: Guardado local omitido (entorno de sólo lectura en la nube):', err.message);
  }

  // 2. Guardar en WooCommerce MySQL (cliente 45 - persistencia permanente para Vercel / Producción)
  try {
    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    const wcUrl = rawWcUrl.split('/wp-json')[0].replace(/\/$/, '');
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || 'ck_ebbe1fdf83a8fa6be4659946bc71a9b1a227854b';
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || 'cs_b5b62eb3636ce242e1ab7e8db77365660ef5e190';

    if (ck && cs) {
      const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
      const res = await fetch(`${wcUrl}/wp-json/wc/v3/customers/45`, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta_data: [
            { key: 'mesim_admin_users', value: JSON.stringify(users) },
          ],
        }),
      });

      if (res.ok) {
        return true;
      }
      const errBody = await res.text();
      console.error('saveAdminUsers WooCommerce API error:', res.status, errBody);
    }
  } catch (err) {
    console.error('saveAdminUsers WooCommerce exception:', err.message);
  }

  return localSaved;
}

export function createAdminToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role, // 'admin' | 'partner'
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export function getAdminSessionFromRequest(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}

export { COOKIE_NAME };
