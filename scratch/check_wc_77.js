const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

async function main() {
  const wcUrl = env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
  const ck = env.WOOCOMMERCE_CONSUMER_KEY || env.WC_CONSUMER_KEY;
  const cs = env.WOOCOMMERCE_CONSUMER_SECRET || env.WC_CONSUMER_SECRET;
  const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

  // Let's check Order #77 in WooCommerce
  const wcRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders/77`, {
    headers: { Authorization: authHeader },
  });
  const wcData = await wcRes.json();
  console.log('Current WooCommerce Order #77:', {
    id: wcData.id,
    status: wcData.status,
    meta: wcData.meta_data.filter(m => m.key.startsWith('_esim')),
  });
}

main().catch(console.error);
