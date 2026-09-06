import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateInvoicePdfBuffer, resolveInvoiceLanguage } from '../../../../lib/invoices';
import { getCompanyConfig } from '../../../../lib/companyConfig';
import { getOrderById } from '../../../../lib/ordersService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invoices/[filename]
 * Permite que la URL termine exactamente con el nombre oficial del documento PDF:
 * Ejemplo: /api/invoices/MS-77%20-%20Francisco%20Fern%C3%A1ndez%20-%202026-08-25.pdf?orderId=77&lang=es&view=inline
 * Así la pestaña del navegador (Chrome, Edge, Adobe Acrobat) muestra el nombre real del archivo en lugar de "generate".
 */
export async function GET(request, { params }) {
  try {
    const rawFilename = decodeURIComponent(params?.filename || '');
    const { searchParams } = new URL(request.url);
    
    // Extraer orderId de query o deducir del nombre de archivo (ej. "MS-77 - ..." o "77 - ...")
    let orderId = searchParams.get('orderId') || searchParams.get('id');
    if (!orderId && rawFilename) {
      const match = rawFilename.match(/(?:MS-)?(\d+)/i);
      if (match) orderId = match[1];
    }

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Identificador de pedido no especificado.' },
        { status: 400 }
      );
    }

    const rawLang = searchParams.get('lang');
    const view = searchParams.get('view') === 'attachment' ? 'attachment' : 'inline';

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: `El pedido #${orderId} no existe en el sistema.` },
        { status: 404 }
      );
    }

    // Completar con perfil de facturación si es necesario
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
        console.warn('Could not read billing profile in dynamic route:', err.message);
      }
    }

    const invoiceLang = resolveInvoiceLanguage(order, billing, rawLang);
    const company = getCompanyConfig();
    const invoiceNumber = `${company.invoicePrefix || 'MS-'}${order.orderId}`;
    const clientName = `${billing.firstName || ''} ${billing.lastName || ''}`.trim() || billing.company || order.customerName || (invoiceLang === 'en' ? 'Customer' : 'Cliente');
    const safeClientName = clientName.replace(/[/\\?%*:|"<>]/g, '').trim();
    const cleanDate = order.date ? String(order.date).split('T')[0] : new Date().toISOString().split('T')[0];
    
    // Nombre oficial exacto: número de factura - Nombre del cliente - Fecha.pdf
    const finalFilename = `${invoiceNumber} - ${safeClientName} - ${cleanDate}.pdf`;

    const pdfBuffer = generateInvoicePdfBuffer({
      order,
      billing,
      lang: invoiceLang,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${view}; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Error in GET /api/invoices/[filename]:', err);
    return NextResponse.json(
      { success: false, message: 'Error generando la factura PDF', error: err.message },
      { status: 500 }
    );
  }
}
