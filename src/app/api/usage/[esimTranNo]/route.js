import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../../lib/strongesim';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { esimTranNo } = params;

  if (!esimTranNo) {
    return NextResponse.json({ success: false, message: 'Missing esimTranNo' }, { status: 400 });
  }

  try {
    const response = await strongesimFetch(`/profiles/${encodeURIComponent(esimTranNo)}`, { cache: 'no-store' });
    
    if (response.ok) {
      const json = await response.json();
      const data = json.data || {};
      const profile = Array.isArray(data.profiles) ? data.profiles[0] : (data.profile || data);

      if (profile) {
        const totalBytes = Number(profile.totalVolume) || 0;
        const usedBytes = Number(profile.orderUsage) || 0;
        const remainingBytes = Math.max(0, totalBytes - usedBytes);

        const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
        const totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
        const remainingMb = parseFloat((remainingBytes / (1024 * 1024)).toFixed(2));

        const usedGb = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(3));
        const totalGb = parseFloat((totalBytes / (1024 * 1024 * 1024)).toFixed(3));
        const remainingGb = parseFloat((remainingBytes / (1024 * 1024 * 1024)).toFixed(3));

        const percentageUsed = totalBytes > 0 ? parseFloat(Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100)).toFixed(1)) : 0.0;

        const esimStatus = profile.esimStatus || 'GOT_RESOURCE';
        const smdpStatus = profile.smdpStatus || '';
        const activateTime = profile.activateTime || null;
        const installationTime = profile.installationTime || null;
        const expiredTime = profile.expiredTime || null;

        const isPastExpiry = expiredTime ? (new Date(expiredTime).getTime() < Date.now()) : false;
        const isDataExhausted = totalBytes > 0 && usedBytes >= totalBytes;
        const isExpired = esimStatus === 'USED_EXPIRED' || esimStatus === 'EXPIRED' || esimStatus === 'COMPLETED' || esimStatus === 'CANCELLED' || isPastExpiry || isDataExhausted;

        // Optionally fetch detailed provider usage logs
        let usageLogs = [];
        const providerId = data.order?.provider_id || 1;
        try {
          const logsRes = await strongesimFetch(`/profiles/${encodeURIComponent(esimTranNo)}/usage?provider_id=${providerId}`, { cache: 'no-store' });
          if (logsRes.ok) {
            const logsData = await logsRes.json();
            usageLogs = logsData.data || [];
          }
        } catch (_) {}

        return NextResponse.json({
          success: true,
          esimTranNo,
          totalBytes,
          usedBytes,
          remainingBytes,
          totalMb,
          usedMb,
          remainingMb,
          totalGb,
          usedGb,
          remainingGb,
          percentageUsed,
          esimStatus,
          smdpStatus,
          activateTime,
          installationTime,
          expiredTime,
          isPastExpiry,
          isDataExhausted,
          isExpired,
          packageName: profile.packageList?.[0]?.packageName || '',
          duration: profile.totalDuration || profile.packageList?.[0]?.duration || 1,
          durationUnit: profile.durationUnit || 'DAY',
          usageLogs,
          isDemo: false,
        });
      }
    }
  } catch (error) {
    console.error(`Error fetching real-time telemetry for ${esimTranNo}:`, error);
  }

  // Safe fallback if provider has not registered network traffic or ICCID is unprovisioned
  return NextResponse.json({
    success: true,
    esimTranNo: esimTranNo,
    totalBytes: 0,
    usedBytes: 0,
    remainingBytes: 0,
    totalMb: 0.0,
    usedMb: 0.0,
    remainingMb: 0.0,
    totalGb: 0.0,
    usedGb: 0.0,
    remainingGb: 0.0,
    percentageUsed: 0.0,
    esimStatus: 'GOT_RESOURCE',
    smdpStatus: '',
    activateTime: null,
    installationTime: null,
    expiredTime: null,
    isPastExpiry: false,
    isDataExhausted: false,
    isExpired: false,
    isDemo: true,
  });
}

