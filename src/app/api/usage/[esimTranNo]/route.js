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

  // Real-time data consumption mock (e.g. 4.2 / 10.0 GB)
  return NextResponse.json({
    success: true,
    esimTranNo: esimTranNo,
    totalBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    usedBytes: 4.2 * 1024 * 1024 * 1024,  // 4.2 GB
    remainingBytes: 5.8 * 1024 * 1024 * 1024,
    totalGb: 10.0,
    usedGb: 4.2,
    remainingGb: 5.8,
    percentageUsed: 42.0,
    isDemo: true,
  });
}
