const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const wcUrl = env.WOOCOMMERCE_API_URL || 'https://me-sim.com';
const ck = env.WOOCOMMERCE_CONSUMER_KEY;
const cs = env.WOOCOMMERCE_CONSUMER_SECRET;

if (!ck || !cs) {
  console.log(JSON.stringify({ success: false, error: 'WooCommerce API keys are missing in .env.local' }));
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

fetch(`${wcUrl}/wp-json/wc/v3/coupons`, {
  headers: {
    'Authorization': authHeader
  }
})
.then(res => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
})
.then(coupons => {
  console.log(JSON.stringify({ success: true, coupons }));
})
.catch(err => {
  console.log(JSON.stringify({ success: false, error: err.message }));
});
