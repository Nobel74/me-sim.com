import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'admin-users.json');
const COOKIE_NAME = 'mesim_admin_token';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'mesim_super_secret_jwt_key_2026_isolated_guard';

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

export function getAllAdminUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading admin-users.json:', err);
  }
  return [];
}

export function saveAdminUsers(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving admin-users.json:', err);
    return false;
  }
}

export function createAdminToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role, // 'admin' | 'partner'
    avatar: user.avatar || '',
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
