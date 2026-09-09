import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/adminAuth';
import { sendEmail, generateOrderConfirmationHtml } from '../../../../../lib/email';
import { resolveCustomerLanguage } from '../../../../../lib/i18n';
import { getOrderById } from '../../../../../lib/ordersService';

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const order = body.order || body;
    const targetEmail = (body.targetEmail || order.customerEmail || order.email || order.billing?.email || '').trim().toLowerCase();
    
    // Obtener datos fiscales completos del pedido desde el servicio persistente para reflejar cupones y desglose real
    const orderId = order.orderId || order.id || body.orderId;
    let fullOrder = null;
    if (orderId) {
      try {
        fullOrder = await getOrderById(orderId);
      } catch (err) {
        console.warn('Could not fetch full order in resend-email:', err.message);
      }
    }
    const resolvedOrder = { ...(fullOrder || {}), ...order };

    // Respetar prioritariamente el idioma del cliente registrado en su pedido o navegación
    const lang = resolveCustomerLanguage({
      lang: resolvedOrder.lang || body.targetLang || body.customerLang,
      country: resolvedOrder.country || resolvedOrder.billing?.country,
      email: targetEmail,
    }) || (body.lang === 'en' ? 'en' : 'es');
    const isEn = lang === 'en';

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, message: isEn ? 'Missing customer email address.' : 'Datos de orden o correo del cliente ausentes.' },
        { status: 400 }
      );
    }

    const finalTran = resolvedOrder.esimTranNo || resolvedOrder.iccid || '';
    const finalLpa = resolvedOrder.lpaString || resolvedOrder.lpaCode || (finalTran ? `LPA:1$rsp.strongesim.com$${finalTran}` : '');
    const finalQr = resolvedOrder.qrCodeUrl || (finalLpa ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalLpa)}` : '');

    const orderData = {
      orderId: resolvedOrder.orderId || orderId || 'ORD-SUPPORT',
      customerName: resolvedOrder.customerName || (resolvedOrder.billing ? `${resolvedOrder.billing.first_name || ''} ${resolvedOrder.billing.last_name || ''}`.trim() : '') || 'Cliente ME-SIM',
      title: resolvedOrder.title || resolvedOrder.plan || 'Plan eSIM',
      totalPrice: resolvedOrder.totalPrice || (resolvedOrder.amount ? `${resolvedOrder.amount} ${resolvedOrder.currency || 'EUR'}` : '0.00 EUR'),
      amount: parseFloat(resolvedOrder.amount || resolvedOrder.priceEur || 0),
      price: parseFloat(resolvedOrder.amount || resolvedOrder.priceEur || 0),
      currency: (resolvedOrder.currency || 'EUR').toUpperCase(),
      coupon: resolvedOrder.coupon || '',
      couponCode: resolvedOrder.coupon || '',
      couponPercent: parseFloat(resolvedOrder.couponPercent || 0),
      originalAmount: parseFloat(resolvedOrder.originalAmount || resolvedOrder.amount || 0),
      originalPrice: parseFloat(resolvedOrder.originalAmount || resolvedOrder.amount || 0),
      discountAmount: parseFloat(resolvedOrder.discountAmount || 0),
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
