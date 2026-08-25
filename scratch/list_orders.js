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

  const authRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: username, username, password }),
  });

  const authData = await authRes.json();
  const token = authData.data?.accessToken || authData.data?.token;
  const sessionId = authData.data?.sessionId;

  const endpoints = ['/orders', '/orders-v2', '/profiles'];
  for (const ep of endpoints) {
    console.log(`\nTesting endpoint: ${ep}`);
    const res = await fetch(`${baseUrl}${ep}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
      },
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Results count:', Array.isArray(data.data) ? data.data.length : (Array.isArray(data) ? data.length : 'object'));
      console.log('Sample/All Data:', JSON.stringify(data, null, 2).slice(0, 3000));
    }
  }
}

run();
