import { NextResponse } from 'next/server';
import { generateInvoicePdfBuffer, detectInvoiceLanguage, resolveInvoiceLanguage, calculateTaxBreakdown } from '../../../../lib/invoices';
import { getCompanyConfig } from '../../../../lib/companyConfig';
import { loadCompanyLogoBuffer } from '../../../../lib/pdfImageLoader';
import { getOrderById } from '../../../../lib/ordersService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invoices/generate
 * Endpoint para generación y visualización de facturas PDF oficiales de ME-SIM
 * Consume datos reales desde el servicio unificado de pedidos (WooCommerce API / Almacén Persistente / StrongeSIM).
 * Soporta cualquier pedido actual o futuro.
 * Parámetros:
 * - orderId: ID del pedido (ej. '81', '80', '79', '78', '77', '76', '75' o cualquier pedido de WooCommerce)
 * - lang: 'es' | 'en' (opcional, detección automática según divisa y país)
 * - format: 'pdf' (defecto) | 'json'
 * - view: 'inline' (abrir en navegador) | 'attachment' (descargar fichero)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || searchParams.get('id') || '81';
    const rawLang = searchParams.get('lang');
    const format = (searchParams.get('format') || 'pdf').toLowerCase();
    const view = searchParams.get('view') === 'attachment' ? 'attachment' : 'inline';

    // Obtener pedido REAL desde el servicio unificado de pedidos
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: `El pedido #${orderId} no se encuentra registrado en el sistema. Por favor, verifica el identificador.`,
        },
        { status: 404 }
      );
    }

    const billing = order.billing || {};
    const invoiceLang = resolveInvoiceLanguage(order, billing, rawLang);
    const company = getCompanyConfig();
    const invoiceNumber = `${company.invoicePrefix || 'MS-'}${order.orderId}`;
    const tax = calculateTaxBreakdown(order.amount || order.priceEur || 0);

    // Si se solicita formato JSON para diagnóstico o telemetría
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        message: `Datos reales del pedido #${order.orderId} obtenidos correctamente.`,
        invoiceNumber,
        date: order.date,
        currency: order.currency,
        language: invoiceLang,
        taxBreakdown: tax,
        company: {
          name: company.companyName,
          taxId: company.taxId,
          address: company.address,
          configuredLogo: company.logo,
          logoLoaded: (() => {
            try {
              const res = loadCompanyLogoBuffer(company.logo);
              return res ? { width: res.width, height: res.height, hasAlpha: res.hasAlpha, type: res.type } : 'Failed to load';
            } catch (e) {
              return { error: e.message };
            }
          })(),
        },
        client: {
          name: order.customerName,
          email: order.customerEmail,
          billing: billing,
        },
        order: {
          id: order.orderId,
          title: order.title || order.plan,
          esimTranNo: order.esimTranNo,
          amount: order.amount || order.priceEur,
          currency: order.currency,
          status: order.status,
          date: order.date,
        },
        testUrls: {
          previewPdf: `/api/invoices/generate?orderId=${orderId}&view=inline`,
          downloadPdf: `/api/invoices/generate?orderId=${orderId}&view=attachment`,
          englishPdf: `/api/invoices/generate?orderId=${orderId}&lang=en`,
          spanishPdf: `/api/invoices/generate?orderId=${orderId}&lang=es`,
        },
      });
    }

    // Generar buffer PDF vectorial 100% nativo con WinAnsiEncoding, logotipo oficial y diseño premium
    const pdfBuffer = generateInvoicePdfBuffer({
      order,
      billing,
      lang: invoiceLang,
    });

    const filename = `factura_${order.orderId}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${view}; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Error in GET /api/invoices/generate:', err);
    return NextResponse.json(
      { success: false, message: 'Error generando factura', error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/generate
 * Para descarga segura desde el panel de usuario autenticado
 */
export async function POST(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');
    let userSession = null;

    if (sessionCookie?.value) {
      try {
        userSession = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
      } catch (e) {
        console.error('Error decoding customer session:', e);
      }
    }

    if (!userSession?.email) {
      return NextResponse.json(
        { success: false, message: 'Debes iniciar sesión para descargar o generar facturas.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, order: clientOrder, billing: clientBilling, lang: requestedLang } = body;

    const targetOrderId = orderId || clientOrder?.orderId;
    if (!targetOrderId && !clientOrder) {
      return NextResponse.json(
        { success: false, message: 'Faltan los datos del pedido a facturar.' },
        { status: 400 }
      );
    }

    // Obtener pedido real desde el backend
    let realOrder = targetOrderId ? await getOrderById(targetOrderId) : null;
    const finalOrder = realOrder || clientOrder;

    // Control de aislamiento de cuenta
    if (finalOrder.customerEmail && finalOrder.customerEmail.toLowerCase() !== userSession.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Acceso no autorizado a este pedido.' },
        { status: 403 }
      );
    }

    const finalBilling = finalOrder.billing || clientBilling || {};
    const acceptLanguage = request.headers.get('accept-language') || '';
    const invoiceLang = resolveInvoiceLanguage(finalOrder, finalBilling, requestedLang || (acceptLanguage.includes('es') ? 'es' : 'en'));

    const pdfBuffer = generateInvoicePdfBuffer({
      order: finalOrder,
      billing: finalBilling,
      lang: invoiceLang,
    });

    const filename = `factura_${finalOrder.orderId}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    return NextResponse.json(
      { success: false, message: 'Error interno generando la factura PDF', error: err.message },
      { status: 500 }
    );
  }
}
