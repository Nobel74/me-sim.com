import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'company.json');

const DEFAULT_COMPANY_CONFIG = {
  companyName: 'ME-SIM CONNECTIVITY S.L.',
  taxId: 'B-12345678',
  address: 'Calle Gran Vía 28, Planta 4',
  city: 'Madrid',
  postalCode: '28013',
  country: 'España',
  email: 'info@me-sim.com',
  phone: '+34 910 000 000',
  website: 'https://me-sim.com',
  vatRate: 21,
  invoicePrefix: 'MS-',
  logo: '/logos/Logo-me-sim-mail.png',
  updatedAt: new Date().toISOString(),
};

let memoryCompanyCache = null;

export function getCompanyConfig() {
  if (memoryCompanyCache) {
    return memoryCompanyCache;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryCompanyCache = { ...DEFAULT_COMPANY_CONFIG, ...JSON.parse(content) };
      return memoryCompanyCache;
    }
  } catch (err) {
    console.error('Error reading company.json:', err);
  }
  memoryCompanyCache = DEFAULT_COMPANY_CONFIG;
  return DEFAULT_COMPANY_CONFIG;
}

export async function getCompanyConfigAsync() {
  const current = getCompanyConfig();

  // Intento de obtener la configuración más reciente desde WooCommerce
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
        const meta = (customer.meta_data || []).find((m) => m.key === 'mesim_company_settings');
        if (meta && meta.value) {
          const parsed = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
          const merged = { ...current, ...parsed };
          memoryCompanyCache = merged;
          return merged;
        }
      }
    }
  } catch (err) {
    console.warn('getCompanyConfigAsync: WooCommerce check failed:', err.message);
  }

  return current;
}

export function saveCompanyConfig(newConfig) {
  const current = getCompanyConfig();
  const updated = {
    ...current,
    ...newConfig,
    updatedAt: new Date().toISOString(),
  };
  memoryCompanyCache = updated;

  // 1. Guardar localmente si el sistema de archivos lo permite
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('saveCompanyConfig: Guardado local omitido (entorno de sólo lectura):', err.message);
  }

  // 2. Persistir en segundo plano en WooCommerce MySQL
  (async () => {
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
            meta_data: [{ key: 'mesim_company_settings', value: JSON.stringify(updated) }],
          }),
        });
      }
    } catch (e) {
      console.error('Error sincronizando companyConfig con WooCommerce:', e.message);
    }
  })();

  return { success: true, config: updated };
}
