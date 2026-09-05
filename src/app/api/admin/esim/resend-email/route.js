import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/adminAuth';
import { sendEmail, generateOrderConfirmationHtml } from '../../../../../lib/email';

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { order, targetEmail } = await request.json();

    if (!order || (!targetEmail && !order.customerEmail)) {
      return NextResponse.json(
        { success: false, message: 'Datos de orden o correo del cliente ausentes.' },
        { status: 400 }
      );
    }

    const emailToSend = (targetEmail || order.customerEmail).trim().toLowerCase();

    const orderData = {
      orderId: order.orderId || 'ORD-SUPPORT',
      customerName: order.customerName || 'Cliente ME-SIM',
      title: order.title || order.plan || 'Plan eSIM',
      totalPrice: `${order.amount || '0.00'} ${order.currency || 'EUR'}`,
      esimTranNo: order.esimTranNo || '',
      qrCodeUrl: order.qrCodeUrl || '',
      lpaCode: order.lpaString || '',
    };

    const htmlText = generateOrderConfirmationHtml(orderData, 'es');

    const result = await sendEmail({
      to: emailToSend,
      subject: `[SOPORTE ME-SIM] Tu Código QR y Datos de Instalación eSIM (#${orderData.orderId})`,
      htmlText,
      type: 'order_confirmation',
      data: orderData,
    });

    return NextResponse.json({
      success: true,
      message: `Correo de eSIM reenviado correctamente a ${emailToSend}.`,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error reenviando correo de eSIM', error: err.message },
      { status: 500 }
    );
  }
}
