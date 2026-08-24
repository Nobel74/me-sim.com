import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../../lib/strongesim';

export async function GET(request, { params }) {
  const { esimTranNo } = params;

  try {
    const response = await strongesimFetch(`/profiles/${encodeURIComponent(esimTranNo)}/usage`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error(`Error fetching usage for ${esimTranNo}:`, error);
  }

  // Real-time data consumption fallback (0 GB used if no StrongeSIM telemetry yet)
  return NextResponse.json({
    success: true,
    esimTranNo: esimTranNo,
    totalBytes: 0,
    usedBytes: 0,
    remainingBytes: 0,
    totalGb: 0.0,
    usedGb: 0.0,
    remainingGb: 0.0,
    percentageUsed: 0.0,
    isDemo: true,
  });
}
