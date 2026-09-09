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

    const finalTran = order.esimTranNo || order.iccid || '';
    const finalLpa = order.lpaString || order.lpaCode || (finalTran ? `LPA:1$rsp.strongesim.com$${finalTran}` : '');
    const finalQr = order.qrCodeUrl || (finalLpa ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalLpa)}` : '');

    const orderData = {
      orderId: order.orderId || order.id || 'ORD-SUPPORT',
      customerName: order.customerName || (order.billing ? `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim() : '') || 'Cliente ME-SIM',
      title: order.title || order.plan || 'Plan eSIM',
      totalPrice: order.totalPrice || (order.amount ? `${order.amount} ${order.currency || 'EUR'}` : '0.00 EUR'),
      esimTranNo: finalTran,
      qrCodeUrl: finalQr,
      lpaCode: finalLpa,
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

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message || (isEn ? 'Failed to deliver email through mail server.' : 'No se pudo entregar el correo a través del servidor de correo.'),
          result,
        },
        { status: 500 }
      );
    }

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
