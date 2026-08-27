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

  const res = await fetch(`${baseUrl}/orders?limit=50`, { headers });
  const data = await res.json();
  const orders = data.data || [];

  console.log(`Total StrongeSIM orders found: ${orders.length}`);
  for (const o of orders) {
    console.log(`\nStrongeSIM Order: ID=${o.id} | Email=${o.end_customer_email || o.customer_email || o.email} | PlanID=${o.plan_id} | ICCID=${o.iccid} | Status=${o.status} | Created=${o.created_at || o.createdAt}`);
  }
}

main().catch(console.error);
