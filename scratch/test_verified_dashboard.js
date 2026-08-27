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

  // Test Francisco's completed Order 78 ICCID: 8910300000059840898
  const iccid = '8910300000059840898';
  console.log(`Checking profile for ICCID ${iccid}...`);
  const res = await fetch(`${baseUrl}/profiles/${iccid}`, { headers });
  const json = await res.json();
  const data = json.data || {};
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : (data.profile || data);

  const totalBytes = Number(profile.totalVolume) || 0;
  const usedBytes = Number(profile.orderUsage) || 0;
  const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
  const totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
  const pct = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

  console.log('Telemetry response:');
  console.log({
    esimTranNo: profile.esimTranNo,
    packageName: profile.packageList?.[0]?.packageName,
    esimStatus: profile.esimStatus,
    smdpStatus: profile.smdpStatus,
    activateTime: profile.activateTime,
    expiredTime: profile.expiredTime,
    totalVolumeBytes: totalBytes,
    orderUsageBytes: usedBytes,
    usedMb,
    totalMb,
    percentageUsed: pct,
  });

  // Verify display formatting helper
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

  console.log('\n--- Format test for 500 MB plan (Order #78) ---');
  console.log(formatUsageDisplay(usedMb, totalMb, 0.5, false));

  console.log('\n--- Format test for 10 GB plan with 60.2 MB used ---');
  console.log(formatUsageDisplay(60.2, 10240, 10, false));

  console.log('\n--- Format test for 10 GB plan with 1200 MB (1.2 GB) used ---');
  console.log(formatUsageDisplay(1200, 10240, 10, false));
}

main().catch(console.error);
