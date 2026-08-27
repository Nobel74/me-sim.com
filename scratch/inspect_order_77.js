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

  console.log('Fetching Order #77 from WooCommerce...');
  const wcRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders/77`, {
    headers: { Authorization: authHeader },
  });
  if (wcRes.ok) {
    const wcOrder = await wcRes.json();
    console.log('Order #77 in WooCommerce:');
    console.log({
      id: wcOrder.id,
      status: wcOrder.status,
      date_created: wcOrder.date_created,
      line_items: wcOrder.line_items,
      meta_data: wcOrder.meta_data,
    });
  }

  // Check StrongeSIM
  const baseUrl = (env.STRONGESIM_BASE_URL || 'https://api.strongesim.com/api/v1').replace(/\/+$/, '');
  const username = env.STRONGESIM_USERNAME || env.STRONGESIM_EMAIL;
  const password = env.STRONGESIM_PASSWORD;

  const authRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: username, username, password }),
  });

  const authData = await authRes.json();
  const token = authData.data?.accessToken;
  const sessionId = authData.data?.session_id || authData.data?.sessionId;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Session-ID': sessionId,
  };

  const iccid = '8965012605190115715';
  console.log(`\nFetching StrongeSIM profile for ICCID ${iccid}...`);
  const profRes = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
  if (profRes.ok) {
    const profData = await profRes.json();
    console.log('StrongeSIM Profile Data:', JSON.stringify(profData, null, 2));
  } else {
    console.log('StrongeSIM Profile Error:', await profRes.text());
  }

  // Also test usage endpoint
  const usageRes = await fetch(`${baseUrl}/profiles/${iccid}/usage?provider_id=1`, { headers });
  if (usageRes.ok) {
    const usageData = await usageRes.json();
    console.log('StrongeSIM /usage?provider_id=1 response:', JSON.stringify(usageData, null, 2));
  } else {
    console.log('StrongeSIM /usage error:', await usageRes.text());
  }
}

main().catch(console.error);
