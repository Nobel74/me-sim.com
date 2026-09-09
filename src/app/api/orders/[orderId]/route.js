import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../../lib/strongesim';
import { getOrderById } from '../../../../lib/ordersService';

export async function GET(request, { params }) {
  const { orderId } = params;

  try {
    const localOrder = await getOrderById(orderId);
    if (localOrder) {
      return NextResponse.json({
        success: true,
        order_id: localOrder.orderId,
        esimTranNo: localOrder.realIccid || localOrder.esimTranNo,
        iccid: localOrder.realIccid || localOrder.esimTranNo,
        qr_code_url: localOrder.qrCodeUrl || '',
        lpaString: localOrder.lpaString || '',
        status: localOrder.status,
        plan_name: localOrder.plan || localOrder.title,
        order: localOrder,
      });
    }

    const response = await strongesimFetch(`/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
  }

  return NextResponse.json(
    { success: false, message: 'Pedido no encontrado' },
    { status: 404 }
  );
}
