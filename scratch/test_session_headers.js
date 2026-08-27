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

  console.log('Token:', token?.slice(0, 20) + '...');
  console.log('SessionId:', sessionId);

  // Let's test calling /orders with different header formats for sessionId
  const headerVariations = [
    { 'X-Session-ID': sessionId },
    { 'X-Session-Id': sessionId },
    { 'x-session-id': sessionId },
    { 'X-Session-Token': sessionId },
    { 'session_id': sessionId },
    { 'Session-ID': sessionId },
    { 'X-Session': sessionId },
    { 'X-Session-ID': sessionId, 'X-Session-Id': sessionId, 'x-session-id': sessionId, 'session-id': sessionId, 'session_id': sessionId }
  ];

  for (const h of headerVariations) {
    const headerName = Object.keys(h).join(',');
    const res = await fetch(`${baseUrl}/orders?limit=5`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...h
      }
    });
    console.log(`Headers [${headerName}] -> Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Success! Orders count: ${data.data?.length || (Array.isArray(data) ? data.length : 'ok')}`);
    } else {
      console.log('Error:', await res.text());
    }
  }
}

main().catch(console.error);
