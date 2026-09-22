import { NextResponse } from 'next/server.js';
import { getAdminSessionFromRequest } from '../../../../lib/adminAuth.js';
import { strongesimFetch } from '../../../../lib/strongesim.js';
import { getLocalOrders, saveOrUpdateOrder } from '../../../../lib/ordersService.js';
import { sendEmail, generateOrderConfirmationHtml } from '../../../../lib/email.js';
import { addDiagnosticLog } from '../../../../lib/logger.js';

export const dynamic = 'force-dynamic';

function extractQrFromData(data) {
  if (!data) return '';
  if (typeof data === 'string' && data.startsWith('http')) return data;
  return (
    data.qr_code_url ||
    data.qrCodeUrl ||
    data.qr_code ||
    data.qrCode ||
    data.qr ||
    data.profile_url ||
    data.profileUrl ||
    data.shortUrl ||
    data.short_url ||
    ''
  );
}

function extractLpaFromData(data) {
  if (!data) return '';
  return (
    data.activation_code ||
    data.activationCode ||
    data.lpaString ||
    data.lpa_string ||
    data.lpa ||
    data.ac ||
    ''
  );
}

function extractIccidFromData(data) {
  if (!data) return '';
  return (
    data.iccid ||
    data.esimTranNo ||
    data.esim_tran_no ||
    data.sim_no ||
    data.simNo ||
    ''
  );
}

function checkAuthorization(request) {
  // 1. Sesión de administrador estándar por cookie
  const session = getAdminSessionFromRequest(request);
  if (session) return true;

  // 2. Cabecera secreta de puente o clave interna
  const secretHeader = request.headers.get('x-admin-key') || request.headers.get('x-me-sim-key');
  const configuredSecret = process.env.ME_SIM_BRIDGE_SECRET || 'Este_2026_Clem_y_yo_nos_vamos_a_forrar!';
  if (secretHeader && secretHeader === configuredSecret) return true;

  // 3. Parámetro de query en URL
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret') || searchParams.get('key');
  if (secretParam && secretParam === configuredSecret) return true;

  return false;
}

export async function GET(request) {
  return handleReconciliation(request);
}

export async function POST(request) {
  return handleReconciliation(request);
}

async function handleReconciliation(request) {
  try {
    if (!checkAuthorization(request)) {
      return NextResponse.json({ success: false, message: 'No autorizado para ejecutar reconciliación de órdenes.' }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ success: false, message: 'STRIPE_SECRET_KEY no está configurada.' }, { status: 500 });
    }

    console.log('[RECONCILE] Iniciando auditoría y reconciliación de pagos de Stripe...');
    addDiagnosticLog('RECONCILE', 'START');

    // 1. Obtener pagos exitosos de Stripe de las últimas 48-72 horas
    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents?limit=50', {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
      cache: 'no-store',
    });

    if (!stripeRes.ok) {
      const errTxt = await stripeRes.text();
      return NextResponse.json({ success: false, message: `Error consultando Stripe API: ${errTxt}` }, { status: 500 });
    }

    const stripeData = await stripeRes.json();
    const paymentIntents = (stripeData.data || []).filter((pi) => pi.status === 'succeeded');

    // 2. Cargar pedidos locales
    const localOrders = getLocalOrders();
    const registeredIntentIds = new Set();
    const registeredIccids = new Set();

    for (const lo of localOrders) {
      if (lo.paymentIntentId) registeredIntentIds.add(String(lo.paymentIntentId).trim());
      if (lo.stripePaymentIntent) registeredIntentIds.add(String(lo.stripePaymentIntent).trim());
      if (lo.esimTranNo) registeredIccids.add(String(lo.esimTranNo).trim());
      if (lo.realIccid) registeredIccids.add(String(lo.realIccid).trim());
    }

    // 3. Cargar pedidos de WooCommerce
    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    let wcUrl = rawWcUrl;
    if (wcUrl.includes('/wp-json')) wcUrl = wcUrl.split('/wp-json')[0];
    if (wcUrl.endsWith('/')) wcUrl = wcUrl.slice(0, -1);

    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    let wcOrders = [];
    if (ck && cs) {
      try {
        const wcRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders?per_page=100`, {
          headers: { Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64') },
          cache: 'no-store',
        });
        if (wcRes.ok) {
          wcOrders = await wcRes.json();
          for (const wo of wcOrders) {
            if (wo.transaction_id) registeredIntentIds.add(String(wo.transaction_id).trim());
            const meta = wo.meta_data || [];
            const intentMeta = meta.find((m) => m.key === '_stripe_intent_id')?.value;
            if (intentMeta) registeredIntentIds.add(String(intentMeta).trim());
            const iccidMeta = meta.find((m) => m.key === '_esim_iccid' || m.key === '_esim_transaction_no')?.value;
            if (iccidMeta) registeredIccids.add(String(iccidMeta).trim());
          }
        }
      } catch (wcErr) {
        console.warn('[RECONCILE] Error fetching WooCommerce orders:', wcErr.message);
      }
    }

    // 4. Obtener órdenes recientes de StrongeSIM
    let strongesimOrders = [];
    try {
      const sRes = await strongesimFetch('/orders?limit=50', { cache: 'no-store' });
      if (sRes.ok) {
        const sData = await sRes.json();
        strongesimOrders = sData.data || [];
      }
    } catch (sErr) {
      console.warn('[RECONCILE] Error fetching StrongeSIM orders:', sErr.message);
    }

    const reconciled = [];
    const skippedAlreadySynced = [];

    // 5. Comparar cada PaymentIntent de Stripe
    for (const pi of paymentIntents) {
      const piId = String(pi.id).trim();
      const amount = (pi.amount / 100).toFixed(2);
      const currency = (pi.currency || 'EUR').toUpperCase();
      const customerEmail = (pi.receipt_email || '').toLowerCase().trim();
      const createdAt = new Date(pi.created * 1000).toISOString();

      if (registeredIntentIds.has(piId)) {
        skippedAlreadySynced.push({ id: piId, email: customerEmail, amount, status: 'already_synced' });
        continue;
      }

      console.log(`[RECONCILE] ⚠️ Pedido huérfano detectado en Stripe: ${piId} - ${customerEmail} (${amount} ${currency})`);

      // Buscar en StrongeSIM la orden asociada por email o coincidencia temporal cercana
      let matchedStrongeSimOrder = null;
      if (customerEmail) {
        matchedStrongeSimOrder = strongesimOrders.find((so) => {
          const soEmail = (so.end_customer_email || so.email || '').toLowerCase().trim();
          return soEmail === customerEmail;
        });
      }

      // Si no se encuentra por email directo, buscar por proximidad de timestamp
      if (!matchedStrongeSimOrder) {
        const piTime = pi.created * 1000;
        matchedStrongeSimOrder = strongesimOrders.find((so) => {
          const soTime = new Date(so.created_at || so.createdAt).getTime();
          return Math.abs(soTime - piTime) < 1000 * 60 * 30; // dentro de 30 minutos
        });
      }

      if (!matchedStrongeSimOrder) {
        console.warn(`[RECONCILE] No se localizó orden previa en StrongeSIM para ${customerEmail}. Requiere revisión.`);
        continue;
      }

      // Extraer datos de la orden de StrongeSIM
      const sOrd = matchedStrongeSimOrder;
      let finalIccid = extractIccidFromData(sOrd);
      let finalQrCodeUrl = extractQrFromData(sOrd);
      let finalLpa = extractLpaFromData(sOrd);
      const strongesimOrderId = sOrd.id || null;

      // Si el QR viene vacío, consultar /orders/{id}
      if (strongesimOrderId && (!finalQrCodeUrl || !finalLpa)) {
        try {
          const detRes = await strongesimFetch(`/orders/${strongesimOrderId}`, { cache: 'no-store' });
          if (detRes.ok) {
            const detData = await detRes.json();
            const nested = detData.data || detData;
            const ord = nested.order || nested;
            const prof = Array.isArray(nested.profiles) ? nested.profiles[0] : null;

            finalQrCodeUrl = extractQrFromData(ord) || extractQrFromData(prof) || extractQrFromData(nested) || finalQrCodeUrl;
            finalLpa = extractLpaFromData(ord) || extractLpaFromData(prof) || extractLpaFromData(nested) || finalLpa;
            finalIccid = extractIccidFromData(ord) || extractIccidFromData(prof) || extractIccidFromData(nested) || finalIccid;
          }
        } catch (detErr) {
          console.warn('[RECONCILE] Error fetching detailed StrongeSIM order:', detErr.message);
        }
      }

      // Si aún falta QR y tenemos ICCID, consultar /profiles/{iccid}
      if (finalIccid && /^\d+$/.test(finalIccid) && (!finalQrCodeUrl || !finalLpa)) {
        try {
          const pRes = await strongesimFetch(`/profiles/${finalIccid}`, { cache: 'no-store' });
          if (pRes.ok) {
            const pData = await pRes.json();
            const p = Array.isArray(pData.data?.profiles) ? pData.data.profiles[0] : (pData.data?.profile || pData.data);
            if (p) {
              const pQr = extractQrFromData(p);
              const pLpa = extractLpaFromData(p);
              if (pQr) finalQrCodeUrl = pQr;
              if (pLpa) finalLpa = pLpa;
            }
          }
        } catch (pErr) {
          console.warn('[RECONCILE] Error fetching profile by ICCID:', pErr.message);
        }
      }

      const planName = sOrd.plan?.name || 'Middle East & North Africa 1GB 7Days';
      const validityDays = sOrd.plan?.validity_days || 7;
      const dataDisplay = sOrd.plan?.data_display || '1 GB';
      const countryCode = sOrd.plan?.country_code || 'QA';
      const countryName = planName.includes('Middle East') ? 'Middle East & North Africa' : (sOrd.plan?.name || 'Internacional');

      // Obtener nombre del cliente de Stripe o de StrongeSIM
      let customerName = sOrd.customer_name || 'Ian Rudrum';
      try {
        if (pi.latest_charge) {
          const chRes = await fetch(`https://api.stripe.com/v1/charges/${pi.latest_charge}`, {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          });
          if (chRes.ok) {
            const chData = await chRes.json();
            if (chData.billing_details?.name) {
              customerName = chData.billing_details.name;
            }
          }
        }
      } catch (chErr) {}

      const names = customerName.split(' ');
      const firstName = names[0] || 'Cliente';
      const lastName = names.slice(1).join(' ') || '';

      // Crear pedido en WooCommerce
      let officialWcOrderId = null;
      if (ck && cs) {
        try {
          // 1. Buscar o crear cliente en WooCommerce
          let customerId = 0;
          try {
            const searchRes = await fetch(`${wcUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}`, {
              headers: { Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64') },
            });
            if (searchRes.ok) {
              const customers = await searchRes.json();
              if (Array.isArray(customers) && customers.length > 0) {
                customerId = customers[0].id;
              }
            }
          } catch (cSearchErr) {}

          if (customerId === 0) {
            try {
              const createCustRes = await fetch(`${wcUrl}/wp-json/wc/v3/customers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
                },
                body: JSON.stringify({
                  email: customerEmail,
                  first_name: firstName,
                  last_name: lastName,
                  username: customerEmail,
                }),
              });
              if (createCustRes.ok) {
                const cData = await createCustRes.json();
                customerId = cData.id;
              }
            } catch (cCreateErr) {}
          }

          // 2. Crear orden en WooCommerce
          const wcCreateRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
            },
            body: JSON.stringify({
              payment_method: 'stripe',
              payment_method_title: 'Credit Card / Stripe (Paid)',
              set_paid: true,
              status: 'completed',
              transaction_id: piId,
              customer_id: customerId,
              currency: currency,
              billing: {
                first_name: firstName,
                last_name: lastName,
                email: customerEmail,
              },
              line_items: [
                {
                  name: planName,
                  quantity: 1,
                  sku: String(sOrd.plan_id || 'esim-plan'),
                  price: String(amount),
                  subtotal: String(amount),
                  total: String(amount),
                  meta_data: [
                    { key: 'plan_id', value: String(sOrd.plan_id || '') },
                    { key: '_plan_id', value: String(sOrd.plan_id || '') },
                    { key: 'sku', value: String(sOrd.plan_id || '') },
                    { key: '_sku', value: String(sOrd.plan_id || '') },
                    { key: 'iso', value: countryCode.toLowerCase() },
                    { key: 'data_amount', value: dataDisplay },
                    { key: 'days', value: String(validityDays) },
                  ],
                }
              ],
              meta_data: [
                { key: '_stripe_intent_id', value: piId },
                { key: '_esim_iso', value: countryCode.toLowerCase() },
                { key: '_esim_country', value: countryName },
                { key: '_esim_data_amount', value: dataDisplay },
                { key: '_esim_days', value: String(validityDays) },
                { key: '_esim_iccid', value: finalIccid },
                { key: '_esim_transaction_no', value: finalIccid },
                { key: '_esim_qr_code', value: finalQrCodeUrl },
                { key: '_esim_activation_code', value: finalLpa },
                { key: '_strongesim_order_id', value: strongesimOrderId || '' },
                { key: '_esim_provisioned', value: 'yes' },
                { key: '_order_lang', value: 'en' },
                { key: '_customer_lang', value: 'en' },
                { key: 'lang', value: 'en' },
                { key: 'customer_language', value: 'en' },
              ]
            }),
          });

          if (wcCreateRes.ok) {
            const wcData = await wcCreateRes.json();
            if (wcData && wcData.id) {
              officialWcOrderId = String(wcData.id);
              console.log(`[RECONCILE] Creada orden en WooCommerce exitosamente: #${officialWcOrderId}`);
            }
          } else {
            const errBody = await wcCreateRes.text();
            console.warn(`[RECONCILE] Error creando orden en WooCommerce (${wcCreateRes.status}): ${errBody}`);
          }
        } catch (wcPostErr) {
          console.warn('[RECONCILE] WooCommerce exception during reconcile:', wcPostErr.message);
        }
      }

      // Si WooCommerce no respondió, usar ID de seguimiento orden
      const targetOrderId = officialWcOrderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000));

      // Guardar en la Base de Datos Local de ME-SIM
      const savedLocal = saveOrUpdateOrder({
        orderId: targetOrderId,
        paymentIntentId: piId,
        customerName: customerName,
        customerEmail: customerEmail,
        lang: 'en',
        title: planName,
        plan: planName,
        amount: parseFloat(amount),
        priceEur: parseFloat(amount),
        currency: currency,
        status: 'Completed',
        date: createdAt.split('T')[0],
        createdAt: createdAt,
        paymentMethod: 'Credit Card / Stripe (Paid)',
        esimTranNo: finalIccid,
        realIccid: finalIccid,
        strongesimOrderId: strongesimOrderId || '',
        qrCodeUrl: finalQrCodeUrl,
        lpaString: finalLpa,
        country: countryName,
        iso: countryCode.toLowerCase(),
        dataAmount: dataDisplay,
        days: parseInt(validityDays, 10),
        planId: String(sOrd.plan_id || ''),
        wholesaleCostUsd: parseFloat(sOrd.price_charged || 8.40),
        billing: {
          firstName: firstName,
          lastName: lastName,
        },
      });

      // Enviar correo electrónico con QR al cliente si está disponible
      let emailSent = false;
      if (finalQrCodeUrl && finalQrCodeUrl.startsWith('http')) {
        try {
          const emailHtml = generateOrderConfirmationHtml({
            title: planName,
            orderId: targetOrderId,
            esimTranNo: finalIccid,
            qrCodeUrl: finalQrCodeUrl,
            lpaCode: finalLpa,
            totalPrice: `${amount} ${currency}`,
            amount: parseFloat(amount),
            price: parseFloat(amount),
            currency: currency,
            customerName: customerName,
          }, 'en');

          const mailResult = await sendEmail({
            to: customerEmail,
            subject: 'Your ME-SIM eSIM Order Confirmation',
            htmlText: emailHtml,
            type: 'order_confirmation',
            data: {
              orderId: targetOrderId,
              esimTranNo: finalIccid,
              qrCodeUrl: finalQrCodeUrl,
            },
          });
          emailSent = mailResult.success;
          console.log(`[RECONCILE] Email de confirmación con QR enviado a ${customerEmail}:`, emailSent);
        } catch (mErr) {
          console.warn('[RECONCILE] Error sending order confirmation email:', mErr.message);
        }
      }

      registeredIntentIds.add(piId);
      reconciled.push({
        orderId: targetOrderId,
        paymentIntentId: piId,
        customerEmail,
        customerName,
        amount: `${amount} ${currency}`,
        planName,
        iccid: finalIccid,
        qrCodeUrl: finalQrCodeUrl,
        lpaString: finalLpa,
        wcSynced: !!officialWcOrderId,
        emailSent,
      });
    }

    console.log(`[RECONCILE] Auditoría finalizada. Reconciliados: ${reconciled.length}. Ya sincronizados: ${skippedAlreadySynced.length}.`);
    addDiagnosticLog('RECONCILE', 'FINISH', { reconciledCount: reconciled.length });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedCount: paymentIntents.length,
      reconciledCount: reconciled.length,
      alreadySyncedCount: skippedAlreadySynced.length,
      reconciledOrders: reconciled,
      alreadySynced: skippedAlreadySynced,
    });
  } catch (error) {
    console.error('[RECONCILE] Error general en endpoint de reconciliación:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
