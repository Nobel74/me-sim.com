import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateInvoicePdfBuffer, resolveInvoiceLanguage } from '../../../../lib/invoices';
import { getCompanyConfigAsync } from '../../../../lib/companyConfig';
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

    // 1. Extraer datos fiscales en tiempo real desde la petición (si el cliente los introduce en el formulario activo)
    const qFirst = searchParams.get('firstName');
    const qLast = searchParams.get('lastName');
    const qComp = searchParams.get('company');
    const qVat = searchParams.get('vatId');
    const qAddr = searchParams.get('address');
    const qCity = searchParams.get('city');
    const qPost = searchParams.get('postcode');
    const qCountry = searchParams.get('country');
    const qPhone = searchParams.get('phone');

    // 2. Extraer usuario autenticado de la sesión si existe
    let sessionEmail = '';
    try {
      const sessionCookie = request.cookies.get('mesim_session');
      if (sessionCookie?.value) {
        const sessionUser = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
        if (sessionUser?.email) {
          sessionEmail = sessionUser.email.toLowerCase().trim();
        }
      }
    } catch (e) {
      console.warn('Could not read session cookie in invoice route:', e.message);
    }

    // 3. Cargar perfil guardado del usuario (por sesión o por email del pedido)
    const customerEmail = (order.customerEmail || order.billing?.email || '').toLowerCase().trim();
    let userProfile = {};
    try {
      const billingProfilesFile = path.join(process.cwd(), 'src', 'data', 'billing-profiles.json');
      if (fs.existsSync(billingProfilesFile)) {
        const profiles = JSON.parse(fs.readFileSync(billingProfilesFile, 'utf-8'));
        userProfile = (sessionEmail && profiles[sessionEmail]) || (customerEmail && profiles[customerEmail]) || {};
      }
    } catch (err) {
      console.warn('Could not read billing profile in dynamic route:', err.message);
    }

    // 4. Precedencia: Datos en tiempo real del formulario > Perfil persistente del cliente > Datos del pedido
    const orderBilling = order.billing || {};
    const billing = {
      firstName: (qFirst !== null && qFirst.trim() !== '') ? qFirst.trim() : (userProfile.firstName || orderBilling.firstName || ''),
      lastName: (qLast !== null && qLast.trim() !== '') ? qLast.trim() : (userProfile.lastName || orderBilling.lastName || ''),
      company: (qComp !== null) ? qComp.trim() : (userProfile.company !== undefined ? userProfile.company : (orderBilling.company || '')),
      vatId: (qVat !== null) ? qVat.trim() : (userProfile.vatId !== undefined ? userProfile.vatId : (orderBilling.vatId || '')),
      address: (qAddr !== null && qAddr.trim() !== '') ? qAddr.trim() : (userProfile.address || orderBilling.address || ''),
      city: (qCity !== null && qCity.trim() !== '') ? qCity.trim() : (userProfile.city || orderBilling.city || ''),
      postcode: (qPost !== null && qPost.trim() !== '') ? qPost.trim() : (userProfile.postcode || orderBilling.postcode || ''),
      country: (qCountry !== null && qCountry.trim() !== '') ? qCountry.trim() : (userProfile.country || orderBilling.country || ''),
      phone: (qPhone !== null) ? qPhone.trim() : (userProfile.phone || orderBilling.phone || ''),
    };

    const invoiceLang = resolveInvoiceLanguage(order, billing, rawLang);
    const company = await getCompanyConfigAsync();
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
      company,
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
