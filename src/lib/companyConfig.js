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

export function getCompanyConfig() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return { ...DEFAULT_COMPANY_CONFIG, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error('Error reading company.json:', err);
  }
  return DEFAULT_COMPANY_CONFIG;
}

export function saveCompanyConfig(newConfig) {
  try {
    const current = getCompanyConfig();
    const updated = {
      ...current,
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return { success: true, config: updated };
  } catch (err) {
    console.error('Error saving company.json:', err);
    return { success: false, error: err.message };
  }
}
