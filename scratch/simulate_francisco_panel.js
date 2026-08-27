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

  // Query Francisco's orders (paxfer@gmail.com)
  const res = await fetch(`${wcUrl}/wp-json/wc/v3/orders?search=paxfer@gmail.com`, {
    headers: { Authorization: authHeader },
  });

  const orders = await res.json();
  console.log(`=== ORDERS FOR FRANCISCO FERNÁNDEZ (${orders.length} orders) ===\n`);

  // StrongeSIM Auth
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

  function formatUsageDisplay(usedMb, totalMb, totalGbContracted, isUnlimited) {
    if (isUnlimited) return { text: '', pct: 0 };
    const pct = totalMb > 0 ? Math.min(100, Math.max(0, parseFloat(((usedMb / totalMb) * 100).toFixed(1)))) : 0;
    const isMbPkg = totalMb < 1000 || (totalGbContracted && totalGbContracted < 1.0);
    let usedStr = '';
    let totalStr = '';
    if (isMbPkg) {
      usedStr = `${usedMb.toFixed(1)} MB`;
      totalStr = `${Math.round(totalMb)} MB`;
    } else {
      if (usedMb < 1000) {
        usedStr = `${usedMb.toFixed(1)} MB`;
      } else {
        const usedGb = usedMb / 1024;
        usedStr = `${usedGb.toFixed(1)} GB`;
      }
      const totalGbNum = totalGbContracted || (totalMb / 1024);
      totalStr = Number.isInteger(totalGbNum) ? `${totalGbNum} GB` : `${totalGbNum.toFixed(1)} GB`;
    }
    return { text: `${usedStr} / ${totalStr}`, pct };
  }

  for (const o of orders) {
    const meta = o.meta_data || [];
    const getMeta = (k) => meta.find(m => m.key === k)?.value || '';
    const iccid = getMeta('_esim_iccid') || getMeta('_esim_transaction_no');

    console.log(`----------------------------------------------------------------`);
    console.log(`Order #${o.id} - Status: ${o.status} - Title: ${o.line_items?.[0]?.name} - ICCID: ${iccid}`);

    if (iccid) {
      const pRes = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        const p = pData.data?.profiles?.[0] || pData.data?.profile;
        const totalBytes = Number(p?.totalVolume) || 0;
        const usedBytes = Number(p?.orderUsage) || 0;
        const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
        const totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
        const display = formatUsageDisplay(usedMb, totalMb, 0.5, false);

        console.log(`  Package: ${p?.packageList?.[0]?.packageName}`);
        console.log(`  Provider Status: ${p?.esimStatus} | SMDP: ${p?.smdpStatus}`);
        console.log(`  Activation: ${p?.activateTime} | Expiration: ${p?.expiredTime}`);
        console.log(`  Live Consumption: ${display.text} (${display.pct}%)`);
      }
    }
  }
}

main().catch(console.error);
