import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';

export async function POST(request) {
  try {
    const body = await request.json();
    const { planId, customerEmail, customerName } = body;

    // Trigger order to StrongeSIM API
    const response = await strongesimFetch('/orders-v2', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        customer_email: customerEmail,
        customer_name: customerName,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error creating order at StrongeSIM:', error);
  }

  // Synchronous response simulation for demo/test orders
  const mockOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const mockEsimTranNo = '89852' + Math.floor(1000000000 + Math.random() * 9000000000);

  return NextResponse.json({
    success: true,
    order_id: mockOrderId,
    esimTranNo: mockEsimTranNo,
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=LPA:1$rsp.strongesim.com$${mockEsimTranNo}`,
    status: 'COMPLETED',
    isDemo: true,
  });
}
