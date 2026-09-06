import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/adminAuth';
import { sendEmail, generateOrderConfirmationHtml } from '../../../../../lib/email';

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const order = body.order || body;
    const targetEmail = (body.targetEmail || order.customerEmail || order.email || order.billing?.email || '').trim().toLowerCase();
    const lang = body.lang || order.lang || 'es';
    const isEn = lang === 'en';

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, message: isEn ? 'Missing customer email address.' : 'Datos de orden o correo del cliente ausentes.' },
        { status: 400 }
      );
    }

    const orderData = {
      orderId: order.orderId || order.id || 'ORD-SUPPORT',
      customerName: order.customerName || (order.billing ? `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim() : '') || 'Cliente ME-SIM',
      title: order.title || order.plan || 'Plan eSIM',
      totalPrice: order.totalPrice || (order.amount ? `${order.amount} ${order.currency || 'EUR'}` : '0.00 EUR'),
      esimTranNo: order.esimTranNo || order.iccid || '',
      qrCodeUrl: order.qrCodeUrl || (order.esimTranNo ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.strongesim.com$${order.esimTranNo}` : ''),
      lpaCode: order.lpaString || order.lpaCode || (order.esimTranNo ? `LPA:1$rsp.strongesim.com$${order.esimTranNo}` : ''),
    };

    const htmlText = generateOrderConfirmationHtml(orderData, lang);

    const subject = isEn
      ? `[ME-SIM SUPPORT] Your eSIM QR Code & Setup Instructions (#${orderData.orderId})`
      : `[SOPORTE ME-SIM] Tu Código QR y Datos de Instalación eSIM (#${orderData.orderId})`;

    const result = await sendEmail({
      to: targetEmail,
      subject,
      htmlText,
      type: 'order_confirmation',
      data: orderData,
    });

    return NextResponse.json({
      success: true,
      message: isEn
        ? `QR & instructions sent successfully to ${targetEmail}.`
        : `QR e instrucciones enviadas correctamente a ${targetEmail}.`,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error reenviando correo de eSIM', error: err.message },
      { status: 500 }
    );
  }
}
