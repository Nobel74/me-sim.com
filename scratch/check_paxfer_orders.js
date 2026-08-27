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

async function main() {
  const wcUrl = env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
  const ck = env.WOOCOMMERCE_CONSUMER_KEY || env.WC_CONSUMER_KEY;
  const cs = env.WOOCOMMERCE_CONSUMER_SECRET || env.WC_CONSUMER_SECRET;
  const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

  console.log('Fetching all orders for paxfer@gmail.com...');
  const res = await fetch(`${wcUrl}/wp-json/wc/v3/orders?search=paxfer@gmail.com&per_page=50`, {
    headers: { Authorization: authHeader },
  });

  const orders = await res.json();
  console.log(`Found ${orders.length} orders matching paxfer@gmail.com`);

  orders.forEach(o => {
    console.log(`\n========================================`);
    console.log(`Order #${o.id} - Status: ${o.status} - Total: ${o.total} ${o.currency} - Date: ${o.date_created}`);
    const lineItem = o.line_items?.[0] || {};
    console.log(`Item: ${lineItem.name} (qty: ${lineItem.quantity}, sku: ${lineItem.sku})`);
    const metas = (o.meta_data || []).filter(m => m.key.startsWith('_esim') || m.key.startsWith('plan') || m.key.startsWith('_plan'));
    console.log('Metas:', JSON.stringify(metas, null, 2));
  });

  // StrongeSIM check
  const baseUrl = (env.STRONGESIM_BASE_URL || 'https://api.strongesim.com/api/v1').replace(/\/+$/, '');
  const username = env.STRONGESIM_USERNAME || env.STRONGESIM_EMAIL;
  const password = env.STRONGESIM_PASSWORD;

  const authRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: username, username, password }),
  });

  const authData = await authRes.json();
  const token = authData.data?.accessToken || authData.data?.token;
  const sessionId = authData.data?.sessionId;

  console.log('\n--- StrongeSIM Authentication ---');
  console.log('Auth OK, token obtained.');

  // Let's test usage/profile endpoints for the ICCIDs in the orders
  for (const o of orders) {
    const iccidMeta = (o.meta_data || []).find(m => m.key === '_esim_iccid' || m.key === '_esim_transaction_no');
    if (iccidMeta && iccidMeta.value) {
      const iccid = iccidMeta.value;
      console.log(`\n--- Checking StrongeSIM for Order #${o.id} ICCID: ${iccid} ---`);
      
      const endpointsToTest = [
        `/profiles/${iccid}`,
        `/profiles/${iccid}/usage`,
        `/esims/${iccid}`,
        `/esims/${iccid}/usage`,
        `/orders/${iccid}`,
        `/orders/${iccid}/usage`,
        `/cards/${iccid}`,
        `/sims/${iccid}`,
        `/profiles/usage?iccid=${iccid}`,
        `/usage/${iccid}`
      ];

      for (const ep of endpointsToTest) {
        try {
          const epRes = await fetch(`${baseUrl}${ep}`, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
            },
          });
          console.log(`Endpoint ${ep} -> Status ${epRes.status}`);
          if (epRes.ok) {
            const body = await epRes.json();
            console.log(`Response for ${ep}:`, JSON.stringify(body, null, 2));
          } else {
            const errText = await epRes.text();
            console.log(`Response for ${ep} (${epRes.status}):`, errText.slice(0, 150));
          }
        } catch (e) {
          console.log(`Error testing ${ep}:`, e.message);
        }
      }
    }
  }
}

main().catch(console.error);
