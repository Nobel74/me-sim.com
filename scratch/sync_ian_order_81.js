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

  // Get exact profile for Ian's installed ICCID: 8910300000037872369
  const pRes = await fetch(`${baseUrl}/profiles/8910300000037872369`, { headers });
  const pData = await pRes.json();
  const p = pData.data?.profiles?.[0] || pData.data?.profile;
  console.log('Ian installed profile in StrongeSIM:', {
    iccid: p?.iccid,
    ac: p?.ac,
    qrCodeUrl: p?.qrCodeUrl,
    smdpStatus: p?.smdpStatus,
    installationTime: p?.installationTime,
  });

  // Update WooCommerce Order #81
  console.log('Updating WooCommerce Order #81 with installed ICCID...');
  const updateRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders/81`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      meta_data: [
        { key: '_esim_iccid', value: p.iccid },
        { key: '_esim_transaction_no', value: p.iccid },
        { key: '_esim_activation_code', value: p.ac },
        { key: '_esim_qr_code', value: p.qrCodeUrl },
      ],
    }),
  });

  console.log('Update Status for Order #81:', updateRes.status);
  if (updateRes.ok) {
    console.log('Order #81 metadata synchronized perfectly!');
  }
}

main().catch(console.error);
