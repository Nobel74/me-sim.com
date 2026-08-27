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

  const iccids = [
    '8965012605190115715', // Order 77 ICCID
    '8965012601090431104', // Other Order 77 attempt
    '8910300000063677656', // Other Order 78 attempt
    '8910300000059840898', // Order 78 ICCID
  ];

  for (const iccid of iccids) {
    console.log(`\n================================================`);
    console.log(`Checking ICCID: ${iccid}`);
    console.log(`================================================`);
    const res = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
    if (res.ok) {
      const json = await res.json();
      const p = json.data?.profiles?.[0] || json.data?.profile;
      console.log('Profile detail:', {
        iccid: p?.iccid,
        packageName: p?.packageList?.[0]?.packageName,
        esimStatus: p?.esimStatus,
        smdpStatus: p?.smdpStatus,
        totalVolume: p?.totalVolume,
        orderUsage: p?.orderUsage,
        activateTime: p?.activateTime,
        expiredTime: p?.expiredTime,
        installationTime: p?.installationTime,
      });
    } else {
      console.log('Error:', res.status, await res.text());
    }
  }
}

main().catch(console.error);
