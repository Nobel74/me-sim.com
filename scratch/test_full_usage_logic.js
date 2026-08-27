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
    '8910300000059840898', // Francisco - Order 78 (Spain 500MB 1Day)
    '8965012605190115715', // Francisco - Order 77 (Indonesia)
    '8948010010053422290', // Francisco - Order 76 (Uzbekistan)
    '8910300000062676734', // Ian Rudrum - Order 81 (UAE 1GB 7Days)
    '8910300000065236068', // Mark Forrest - Order 80 (UAE 1GB 7Days)
  ];

  for (const iccid of iccids) {
    const res = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
    if (!res.ok) {
      console.log(`ICCID ${iccid} -> Error HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    const data = json.data || {};
    const profile = Array.isArray(data.profiles) ? data.profiles[0] : (data.profile || data);

    const totalBytes = profile.totalVolume || 0;
    const usedBytes = profile.orderUsage || 0;
    const remainingBytes = Math.max(0, totalBytes - usedBytes);
    const totalGb = totalBytes / (1024 * 1024 * 1024);
    const usedGb = usedBytes / (1024 * 1024 * 1024);
    const totalMb = totalBytes / (1024 * 1024);
    const usedMb = usedBytes / (1024 * 1024);
    const pct = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

    const esimStatus = profile.esimStatus || 'UNKNOWN';
    const smdpStatus = profile.smdpStatus || 'UNKNOWN';
    const expiredTime = profile.expiredTime;
    const isPastExpiry = expiredTime ? (new Date(expiredTime).getTime() < Date.now()) : false;
    const isExpired = esimStatus === 'USED_EXPIRED' || esimStatus === 'EXPIRED' || esimStatus === 'COMPLETED' || esimStatus === 'CANCELLED' || isPastExpiry;

    console.log(`\n--------------------------------------------------`);
    console.log(`ICCID: ${iccid}`);
    console.log(`Package: ${profile.packageList?.[0]?.packageName || 'N/A'}`);
    console.log(`Status: ${esimStatus} | SMDP: ${smdpStatus} | IsExpired: ${isExpired}`);
    console.log(`ExpiredTime: ${expiredTime} (IsPastExpiry: ${isPastExpiry})`);
    console.log(`ActivateTime: ${profile.activateTime} | InstallationTime: ${profile.installationTime}`);
    console.log(`Data Usage: ${usedMb.toFixed(2)} MB / ${totalMb.toFixed(2)} MB (${pct}%) [${usedGb.toFixed(4)} GB / ${totalGb.toFixed(4)} GB]`);
  }
}

main().catch(console.error);
