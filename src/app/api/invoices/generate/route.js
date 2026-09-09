import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateInvoicePdfBuffer, detectInvoiceLanguage, resolveInvoiceLanguage, calculateTaxBreakdown, calculateInvoiceFinancials } from '../../../../lib/invoices';
import { getCompanyConfigAsync } from '../../../../lib/companyConfig';
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

    // Intentar completar con perfil de facturación guardado si faltan datos
    let billing = { ...(order.billing || {}) };
    const customerEmail = order.customerEmail || (order.billing && order.billing.email);
    if (customerEmail) {
      try {
        const billingProfilesFile = path.join(process.cwd(), 'src', 'data', 'billing-profiles.json');
        if (fs.existsSync(billingProfilesFile)) {
          const profiles = JSON.parse(fs.readFileSync(billingProfilesFile, 'utf-8'));
          const userProfile = profiles[customerEmail.toLowerCase()];
          if (userProfile) {
            billing = {
              ...userProfile,
              ...billing,
              firstName: billing.firstName || userProfile.firstName,
              lastName: billing.lastName || userProfile.lastName,
              company: billing.company || userProfile.company,
              vatId: billing.vatId || userProfile.vatId,
              address: billing.address || userProfile.address,
              city: billing.city || userProfile.city,
              postcode: billing.postcode || userProfile.postcode,
              country: billing.country || userProfile.country,
            };
          }
        }
      } catch (err) {
        console.warn('Could not read billing profile:', err.message);
      }
    }

    const invoiceLang = resolveInvoiceLanguage(order, billing, rawLang);
    const company = await getCompanyConfigAsync();
    const invoiceNumber = `${company.invoicePrefix || 'MS-'}${order.orderId}`;
    const tax = calculateTaxBreakdown(order.amount || order.priceEur || 0);
    const financials = calculateInvoiceFinancials(order);

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
        financials: financials,
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
      company,
    });

    const clientName = `${billing.firstName || ''} ${billing.lastName || ''}`.trim() || billing.company || order.customerName || (invoiceLang === 'en' ? 'Customer' : 'Cliente');
    const safeClientName = clientName.replace(/[/\\?%*:|"<>]/g, '').trim();
    const cleanDate = order.date ? String(order.date).split('T')[0] : new Date().toISOString().split('T')[0];
    const filename = `${invoiceNumber} - ${safeClientName} - ${cleanDate}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${view}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
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

    // Perfil fiscal: combinar pedido, datos enviados y perfil guardado
    let finalBilling = { ...(finalOrder.billing || {}), ...(clientBilling || {}) };
    try {
      const billingProfilesFile = path.join(process.cwd(), 'src', 'data', 'billing-profiles.json');
      if (fs.existsSync(billingProfilesFile)) {
        const profiles = JSON.parse(fs.readFileSync(billingProfilesFile, 'utf-8'));
        const userProfile = profiles[userSession.email.toLowerCase()];
        if (userProfile) {
          finalBilling = {
            ...userProfile,
            ...finalBilling,
            firstName: finalBilling.firstName || userProfile.firstName,
            lastName: finalBilling.lastName || userProfile.lastName,
            company: finalBilling.company || userProfile.company,
            vatId: finalBilling.vatId || userProfile.vatId,
            address: finalBilling.address || userProfile.address,
            city: finalBilling.city || userProfile.city,
            postcode: finalBilling.postcode || userProfile.postcode,
            country: finalBilling.country || userProfile.country,
          };
        }
      }
    } catch (err) {
      console.warn('Could not read user billing profile:', err.message);
    }

    const acceptLanguage = request.headers.get('accept-language') || '';
    const invoiceLang = resolveInvoiceLanguage(
      finalOrder,
      finalBilling,
      requestedLang || (finalOrder?.lang ? finalOrder.lang : (acceptLanguage.includes('es') ? 'es' : 'en'))
    );

    const company = await getCompanyConfigAsync();
    const pdfBuffer = generateInvoicePdfBuffer({
      order: finalOrder,
      billing: finalBilling,
      lang: invoiceLang,
      company,
    });

    const invoiceNumber = `${company.invoicePrefix || 'MS-'}${finalOrder.orderId}`;
    const clientName = `${finalBilling.firstName || ''} ${finalBilling.lastName || ''}`.trim() || finalBilling.company || finalOrder.customerName || (invoiceLang === 'en' ? 'Customer' : 'Cliente');
    const safeClientName = clientName.replace(/[/\\?%*:|"<>]/g, '').trim();
    const cleanDate = finalOrder.date ? String(finalOrder.date).split('T')[0] : new Date().toISOString().split('T')[0];
    const filename = `${invoiceNumber} - ${safeClientName} - ${cleanDate}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
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
