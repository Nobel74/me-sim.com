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

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Session-ID': sessionId,
  };

  const testIccids = [
    '8910300000059840898', // Order 78
    '8965012605190115715', // Order 77
    '8948010010053422290', // Order 76
    '8910300000062676734', // Order 81
    '8910300000065236068', // Order 80
  ];

  for (const iccid of testIccids) {
    console.log(`\n================== ICCID: ${iccid} ==================`);
    
    // Test 1: GET /profiles/${iccid}
    const profRes = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
    console.log(`GET /profiles/${iccid} -> Status ${profRes.status}`);
    if (profRes.ok) {
      const profJson = await profRes.json();
      console.log('Profile Data:');
      const order = profJson.data?.order;
      const profile = profJson.data?.profiles?.[0];
      console.log('Order:', {
        id: order?.id,
        order_id: order?.order_id,
        provider_id: order?.provider_id,
        status: order?.status,
        created_at: order?.created_at
      });
      console.log('Profile:', {
        esimTranNo: profile?.esimTranNo,
        orderNo: profile?.orderNo,
        smdpStatus: profile?.smdpStatus,
        esimStatus: profile?.esimStatus,
        totalVolume: profile?.totalVolume,
        orderUsage: profile?.orderUsage,
        activateTime: profile?.activateTime,
        expiredTime: profile?.expiredTime,
        installationTime: profile?.installationTime,
        packageList: profile?.packageList
      });

      const providerId = order?.provider_id || 1;

      // Test 2: Usage with providerId queries
      const usageQueries = [
        `/profiles/${iccid}/usage?providerId=${providerId}`,
        `/profiles/${iccid}/usage?provider_id=${providerId}`,
        `/profiles/${iccid}/usage?providerId=1`,
        `/profiles/${iccid}/usage?providerId=2`,
        `/profiles/${iccid}/usage?esimTranNo=${profile?.esimTranNo || ''}&providerId=${providerId}`,
        `/usage?iccid=${iccid}&providerId=${providerId}`,
      ];

      for (const uq of usageQueries) {
        const uRes = await fetch(`${baseUrl}${uq}`, { headers });
        console.log(`  Usage query [${uq}] -> Status ${uRes.status}`);
        if (uRes.ok) {
          const uJson = await uRes.json();
          console.log(`  Usage Response:`, JSON.stringify(uJson, null, 2));
        } else {
          console.log(`  Usage Error:`, await uRes.text());
        }
      }
    }
  }
}

main().catch(console.error);
