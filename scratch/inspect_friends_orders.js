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

  // WooCommerce Auth
  const wcUrl = env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
  const ck = env.WOOCOMMERCE_CONSUMER_KEY || env.WC_CONSUMER_KEY;
  const cs = env.WOOCOMMERCE_CONSUMER_SECRET || env.WC_CONSUMER_SECRET;
  const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

  const emails = ['ian.rudrum@btinternet.com', 'mark.s.forrest@btinternet.com'];

  for (const email of emails) {
    console.log(`\n===============================================================`);
    console.log(`INVESTIGATING CUSTOMER: ${email}`);
    console.log(`===============================================================`);

    // 1. Check WooCommerce Orders
    const wcRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders?search=${encodeURIComponent(email)}`, {
      headers: { Authorization: authHeader },
    });
    if (wcRes.ok) {
      const wcOrders = await wcRes.json();
      console.log(`\n--- WooCommerce Orders (${wcOrders.length} found) ---`);
      for (const wco of wcOrders) {
        const meta = wco.meta_data || [];
        const iccid = meta.find(m => m.key === '_esim_iccid')?.value;
        const ac = meta.find(m => m.key === '_esim_activation_code')?.value;
        console.log(`WC Order #${wco.id} | Status: ${wco.status} | Date: ${wco.date_created} | Item: ${wco.line_items?.[0]?.name} | ICCID: ${iccid}`);
        console.log(`  AC: ${ac}`);
      }
    }

    // 2. Check StrongeSIM Orders
    console.log(`\n--- StrongeSIM Orders ---`);
    const sRes = await fetch(`${baseUrl}/orders?search=${encodeURIComponent(email)}&limit=20`, { headers });
    if (sRes.ok) {
      const sData = await sRes.json();
      const sOrders = (sData.data || []).filter(o => (o.end_customer_email || o.email || '').toLowerCase() === email.toLowerCase());
      console.log(`StrongeSIM Orders found: ${sOrders.length}`);
      for (const so of sOrders) {
        console.log(`\nStrongeSIM Order ID: ${so.id} | Short: #${so.id.substring(0, 8)} | Status: ${so.status} | PlanID: ${so.plan_id} | ICCID: ${so.iccid} | Created: ${so.created_at || so.createdAt}`);
        
        // Fetch Profile for this ICCID
        if (so.iccid) {
          const profRes = await fetch(`${baseUrl}/profiles/${so.iccid}`, { headers });
          if (profRes.ok) {
            const profData = await profRes.json();
            const p = profData.data?.profiles?.[0] || profData.data?.profile;
            console.log(`  Profile details for ICCID ${so.iccid}:`);
            console.log(`    Package: ${p?.packageList?.[0]?.packageName}`);
            console.log(`    esimStatus: ${p?.esimStatus}`);
            console.log(`    smdpStatus: ${p?.smdpStatus}`);
            console.log(`    installationTime: ${p?.installationTime}`);
            console.log(`    activateTime: ${p?.activateTime}`);
            console.log(`    expiredTime: ${p?.expiredTime}`);
            console.log(`    totalVolume: ${p?.totalVolume} bytes`);
            console.log(`    orderUsage: ${p?.orderUsage} bytes`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
