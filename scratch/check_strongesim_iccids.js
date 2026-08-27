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

  console.log('StrongeSIM Auth OK. Session ID:', sessionId);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Session-ID': sessionId,
  };

  // 1. Fetch recent orders from StrongeSIM
  console.log('\n--- Fetching recent orders from StrongeSIM ---');
  const ordersRes = await fetch(`${baseUrl}/orders?limit=20`, { headers });
  if (ordersRes.ok) {
    const ordersData = await ordersRes.json();
    console.log('Total orders in StrongeSIM:', ordersData.data?.length);
    ordersData.data?.forEach(ord => {
      console.log(`Order ID: ${ord.id} | Code: ${ord.order_no || ord.order_code || ord.order_id} | Status: ${ord.status} | Email: ${ord.customer_email || ord.email} | Created: ${ord.created_at} | ICCID: ${ord.iccid || ord.esim_tran_no || (ord.profiles && ord.profiles[0]?.iccid)}`);
    });
    console.log('\nSample order detail:', JSON.stringify(ordersData.data?.[0], null, 2));
  }

  // 2. ICCIDs from Francisco's orders:
  const iccidList = [
    '8910300000059840898', // Order 78
    '8965012605190115715', // Order 77
    '8948010010053422290', // Order 76
  ];

  for (const iccid of iccidList) {
    console.log(`\n==================================================`);
    console.log(`Checking details for ICCID: ${iccid}`);
    console.log(`==================================================`);

    const endpoints = [
      `/profiles/${iccid}`,
      `/profiles/${iccid}/usage`,
      `/profiles/${iccid}/status`,
      `/esim/${iccid}`,
      `/esim/${iccid}/usage`,
      `/usage/${iccid}`,
      `/cards/${iccid}`,
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`, { headers });
      console.log(`GET ${ep} -> Status ${res.status}`);
      if (res.ok) {
        const body = await res.json();
        console.log(`Result for ${ep}:`, JSON.stringify(body, null, 2));
      } else {
        console.log(`Error ${ep}:`, await res.text());
      }
    }
  }
}

main().catch(console.error);
