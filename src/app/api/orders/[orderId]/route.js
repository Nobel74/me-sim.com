import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../../lib/strongesim';

export async function GET(request, { params }) {
  const { orderId } = params;

  try {
    const response = await strongesimFetch(`/orders-v2/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
  }

  // Demo fallback response
  return NextResponse.json({
    success: true,
    order_id: orderId,
    esimTranNo: '898529900123456789',
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=LPA:1$rsp.strongesim.com$898529900123456789`,
    status: 'ACTIVE',
    iccid: '898529900123456789',
    plan_name: 'España 10GB 30Days',
    isDemo: true,
  });
}
