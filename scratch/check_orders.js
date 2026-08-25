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
  const baseUrl = (env.STRONGESIM_BASE_URL || 'https://api.strongesim.com/api/v1').replace(/\/+$/, '');
  const username = env.STRONGESIM_USERNAME || env.STRONGESIM_EMAIL;
  const password = env.STRONGESIM_PASSWORD;

  console.log('Logging into StrongeSIM...', { baseUrl, username });
  const authRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: username, username, password }),
  });

  const authData = await authRes.json();
  const token = authData.data?.accessToken || authData.data?.token || authData.token || authData.accessToken;
  const sessionId = authData.data?.sessionId || authData.data?.session_id;

  console.log('Auth OK. Token length:', token ? token.length : 'none');

  const ids = ['be8f49f2', 'e5dbd0c3', '0b1b5d0d', '3443d512'];
  
  for (const id of ids) {
    console.log('\n=======================================');
    console.log(`Checking Order: #${id}`);
    console.log('=======================================');
    const orderRes = await fetch(`${baseUrl}/orders/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
      },
    });

    console.log('HTTP Status:', orderRes.status);
    if (orderRes.ok) {
      const json = await orderRes.json();
      console.log('Data:', JSON.stringify(json, null, 2));
    } else {
      console.log('Error:', await orderRes.text());
    }
  }
}

run();
