const fs = require('fs');

// Read .env.local
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

async function run() {
  const wcUrl = env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
  const ck = env.WOOCOMMERCE_CONSUMER_KEY || env.WC_CONSUMER_KEY;
  const cs = env.WOOCOMMERCE_CONSUMER_SECRET || env.WC_CONSUMER_SECRET;

  const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
  console.log('Querying WooCommerce orders from:', wcUrl);

  const res = await fetch(`${wcUrl}/wp-json/wc/v3/orders?per_page=10`, {
    headers: { Authorization: authHeader },
  });

  console.log('WC status:', res.status);
  if (res.ok) {
    const orders = await res.json();
    orders.forEach(o => {
      console.log(`\n---------------------------------------`);
      console.log(`Order #${o.id} - Status: ${o.status} - Total: ${o.total} ${o.currency}`);
      console.log(`Customer: ${o.billing?.first_name} ${o.billing?.last_name} (${o.billing?.email})`);
      console.log(`Date: ${o.date_created}`);
      const metas = (o.meta_data || []).filter(m => m.key.startsWith('_esim') || m.key.startsWith('plan'));
      console.log('eSIM Metadata:', metas);
    });
  }
}

run();
