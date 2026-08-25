import { NextResponse } from 'next/server';
import { strongesimFetch, resolveStrongeSimPlanId } from '../../../lib/strongesim';
import { addDiagnosticLog } from '../../../lib/logger';
import { checkOrderProvisioned, markOrderProvisioned } from '../../../lib/idempotency';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { planId, customerEmail, customerName, paymentIntentId, price, currency, title, country, iso, dataAmount, days, lang = 'es' } = body;

    addDiagnosticLog('POST_ORDERS', 'ENTRY', { planId, customerEmail, customerName, price, country, iso, paymentIntentId });

    // =========================================================================
    // 0. IDEMPOTENCIA: Evitar compras duplicadas por doble clic o reintentos
    // =========================================================================
    const dedupeKey = paymentIntentId || `${customerEmail}_${planId}`;
    const existingOrder = checkOrderProvisioned(dedupeKey);
    if (existingOrder && existingOrder.iccid) {
      console.log(`[POST /api/orders] Petición duplicada detectada para key [${dedupeKey}]. Devolviendo orden ya provisionada.`);
      return NextResponse.json({
        success: true,
        order_id: existingOrder.orderId || 'ORD-COMPLETED',
        esimTranNo: existingOrder.iccid,
        qr_code_url: existingOrder.qrCodeUrl || '',
        status: 'COMPLETED',
      });
    }

    // Lock transaction to prevent simultaneous race conditions
    markOrderProvisioned(dedupeKey, { status: 'in-flight', email: customerEmail });

    // =========================================================================
    // 1. Resolver el plan numérico real de StrongeSIM y aprovisionar la eSIM
    // =========================================================================
    let esimData = null;
    let finalIccid = null;
    let finalQrCodeUrl = null;
    let finalLpa = null;

    try {
      const realStrongeSimPlanId = await resolveStrongeSimPlanId({
        sku: planId,
        iso: iso || 'es',
        dataAmount: dataAmount || title || '1 GB',
        days: days || 30,
      });

      if (!realStrongeSimPlanId) {
        console.error(`No StrongeSIM package found for planId [${planId}], iso [${iso}]`);
        return NextResponse.json({
          success: false,
          error: `No se encontró un paquete activo de StrongeSIM para el destino ${iso} (${planId}).`
        }, { status: 400 });
      }

      console.log(`Resolved plan [${planId}] -> StrongeSIM real numeric package ID: [${realStrongeSimPlanId}]`);
      addDiagnosticLog('STRONGESIM', 'RESOLVE_PLAN_ID_START', { originalPlanId: planId, iso, dataAmount, days });

      const response = await strongesimFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: realStrongeSimPlanId,
          customer_email: customerEmail,
          end_customer_email: customerEmail,
          email: customerEmail,
          user_email: customerEmail,
          customer_name: customerName,
          send_email: true,
          sendEmail: true,
          send_email_to_customer: true,
          notify_customer: true,
          send_qr_email: true,
          deliver_qr: true,
        }),
      });

      addDiagnosticLog('STRONGESIM', 'POST_ORDERS_RESPONSE', {
        status: response.status,
        ok: response.ok,
        realStrongeSimPlanId,
      });

      if (response.ok) {
        esimData = await response.json();
        addDiagnosticLog('STRONGESIM', 'ORDER_SUCCESS', { esimData });

        const nested = esimData.data || esimData;
        const targetId = nested.id || nested.orderId || nested.transactionId;

        let realIccid = nested.iccid || nested.esimTranNo;
        let qrCodeUrl = nested.qr_code_url || nested.qrCodeUrl;
        let lpaString = nested.lpaString || nested.lpa || nested.activation_code;

        // Si el perfil necesita ser recuperado vía GET /orders/{targetId}
        if (targetId) {
          try {
            const profileRes = await strongesimFetch(`/orders/${targetId}`, { cache: 'no-store' });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              const pNested = profileData.data || profileData;
              const profilesArr = pNested.profiles || (pNested.data && pNested.data.profiles);
              const firstProfile = Array.isArray(profilesArr) ? profilesArr[0] : pNested;

              if (firstProfile) {
                if (firstProfile.iccid) realIccid = firstProfile.iccid;
                if (firstProfile.qr_code_url) qrCodeUrl = firstProfile.qr_code_url;
                if (firstProfile.activation_code) lpaString = firstProfile.activation_code;
              }
            }
          } catch (pErr) {
            console.warn('Could not fetch expanded profile from StrongeSIM:', pErr.message);
          }
        }

        finalIccid = (realIccid && /^\d+$/.test(realIccid)) ? realIccid : (targetId || '89852' + Math.floor(1000000000 + Math.random() * 9000000000));
        finalLpa = lpaString || `LPA:1$rsp.strongesim.com$${finalIccid}`;
        finalQrCodeUrl = qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(finalLpa)}`;

        console.log(`StrongeSIM real eSIM purchased successfully. Real ICCID: ${finalIccid}`);
      } else {
        const errorBody = await response.text();
        addDiagnosticLog('STRONGESIM', 'ORDER_REJECTED', { status: response.status, errorBody });
        console.error(`StrongeSIM API order creation rejected [HTTP ${response.status}]:`, errorBody);
        return NextResponse.json({
          success: false,
          error: `StrongeSIM API Error (${response.status}): ${errorBody}`,
          message: `StrongeSIM rechaza el pedido: ${errorBody}`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error creating order at StrongeSIM:', error);
      return NextResponse.json({
        success: false,
        error: `Error de conexión con StrongeSIM API: ${error.message}`
      }, { status: 500 });
    }

    // Fallback if eSIM data is somehow missing
    if (!finalIccid) {
      finalIccid = '89852' + Math.floor(1000000000 + Math.random() * 9000000000);
      finalLpa = `LPA:1$rsp.strongesim.com$${finalIccid}`;
      finalQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(finalLpa)}`;
    }

    // =========================================================================
    // 2. Crear pedido en WooCommerce CON metadatos de eSIM ya asignados
    // =========================================================================
    let wcOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    try {
      const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
      const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
      const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;
      
      if (ck && cs) {
        const names = (customerName || 'Traveler').split(' ');
        const firstName = names[0] || 'Traveler';
        const lastName = names.slice(1).join(' ') || '';

        // Buscar cliente existente por email
        let customerId = 0;
        let isNewCustomer = false;
        let generatedPassword = '';

        try {
          const searchRes = await fetch(`${wcUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}`, {
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
            },
          });
          if (searchRes.ok) {
            const customers = await searchRes.json();
            if (Array.isArray(customers) && customers.length > 0) {
              customerId = customers[0].id;
            }
          }
        } catch (searchErr) {
          console.error('Error searching WooCommerce customer:', searchErr);
        }

        // Si no existe, crear cliente
        if (customerId === 0) {
          isNewCustomer = true;
          generatedPassword = 'MS-' + Math.floor(100000 + Math.random() * 900000).toString();
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
                password: generatedPassword,
              }),
            });
            if (createCustRes.ok) {
              const customerData = await createCustRes.json();
              customerId = customerData.id;
              console.log(`Created new WooCommerce customer #${customerId} for ${customerEmail}`);
            }
          } catch (createErr) {
            console.error('Error creating WooCommerce customer:', createErr);
          }
        }

        // Crear la orden con TODOS los metadatos de la eSIM incluidos desde el primer instante
        const wcRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
          },
          body: JSON.stringify({
            payment_method: 'stripe',
            payment_method_title: 'Stripe',
            set_paid: true,
            status: 'completed',
            transaction_id: paymentIntentId || '',
            customer_id: customerId,
            currency: currency || 'EUR',
            billing: {
              first_name: firstName,
              last_name: lastName,
              email: customerEmail,
            },
            line_items: [
              {
                name: title || `eSIM Plan (${planId})`,
                quantity: 1,
                sku: planId,
                price: String(price || '0.00'),
                subtotal: String(price || '0.00'),
                total: String(price || '0.00'),
                meta_data: [
                  { key: 'plan_id', value: String(planId) },
                  { key: '_plan_id', value: String(planId) },
                  { key: 'sku', value: String(planId) },
                  { key: '_sku', value: String(planId) },
                  { key: 'plan_code', value: String(planId) },
                  { key: 'iso', value: String(iso || 'es') },
                  { key: 'data_amount', value: String(dataAmount || '10 GB') },
                  { key: 'days', value: String(days || 30) },
                ],
              }
            ],
            meta_data: [
              { key: '_stripe_intent_id', value: paymentIntentId || '' },
              { key: '_esim_iso', value: iso || 'es' },
              { key: '_esim_country', value: country || 'España' },
              { key: '_esim_data_amount', value: dataAmount || '10 GB' },
              { key: '_esim_days', value: String(days || 30) },
              { key: '_esim_iccid', value: finalIccid },
              { key: '_esim_transaction_no', value: finalIccid },
              { key: '_esim_qr_code', value: finalQrCodeUrl },
              { key: '_esim_activation_code', value: finalLpa },
              { key: '_esim_provisioned', value: 'yes' },
            ]
          }),
        });

        if (wcRes.ok) {
          const wcData = await wcRes.json();
          if (wcData && wcData.id) {
            wcOrderId = String(wcData.id);
            console.log(`WooCommerce order created successfully: #${wcOrderId}`);

            // Enviar credenciales a nuevos usuarios
            if (isNewCustomer && generatedPassword) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://me-sim.com';
                await fetch(`${baseUrl}/api/email/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: customerEmail,
                    type: 'welcome_credentials',
                    customPassword: generatedPassword,
                    lang: lang,
                  }),
                });
                console.log(`Welcome credentials email sent to ${customerEmail}`);
              } catch (mailErr) {
                console.error('Error sending welcome email to new customer:', mailErr);
              }
            }
          }
        } else {
          const errText = await wcRes.text();
          console.error(`WooCommerce order creation failed: ${wcRes.status} - ${errText}`);
        }
      }
    } catch (wcErr) {
      console.error('Error connecting to WooCommerce REST API:', wcErr);
    }

    // =========================================================================
    // 3. Registrar orden en caché de idempotencia para neutralizar el Webhook
    // =========================================================================
    markOrderProvisioned(dedupeKey, { iccid: finalIccid, orderId: wcOrderId, qrCodeUrl: finalQrCodeUrl, email: customerEmail });
    if (wcOrderId && !wcOrderId.startsWith('ORD-')) {
      markOrderProvisioned(wcOrderId, { iccid: finalIccid, orderId: wcOrderId, qrCodeUrl: finalQrCodeUrl, email: customerEmail });
    }
    if (customerEmail && planId) {
      markOrderProvisioned(`${customerEmail}_${planId}`, { iccid: finalIccid, orderId: wcOrderId, qrCodeUrl: finalQrCodeUrl });
    }

    // =========================================================================
    // 4. Enviar email con QR al cliente
    // =========================================================================
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://me-sim.com';
      await fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          type: 'order_confirmation',
          orderData: {
            title: title || 'eSIM Plan',
            orderId: wcOrderId,
            esimTranNo: finalIccid,
            qrCodeUrl: finalQrCodeUrl,
            lpaCode: finalLpa,
            totalPrice: `${price} ${currency || 'EUR'}`,
            customerName: customerName,
          },
          lang: lang,
        }),
      });
      console.log(`Order confirmation email sent to ${customerEmail}`);
    } catch (mailErr) {
      console.error('Error sending order confirmation email:', mailErr);
    }

    return NextResponse.json({
      success: true,
      order_id: wcOrderId,
      esimTranNo: finalIccid,
      qr_code_url: finalQrCodeUrl,
      status: esimData?.status || 'COMPLETED',
    });

  } catch (error) {
    console.error('General error handling orders endpoint:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    const email = sessionData.email;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 400 }
      );
    }

    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    let wcUrl = rawWcUrl;
    // Normalize url base by removing trailing namespace if present
    if (wcUrl.includes('/wp-json')) {
      wcUrl = wcUrl.split('/wp-json')[0];
    }
    if (wcUrl.endsWith('/')) {
      wcUrl = wcUrl.slice(0, -1);
    }

    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    console.log(`[GET /api/orders] Email: ${email}`);
    console.log(`[GET /api/orders] Base WC URL: ${wcUrl}`);
    console.log(`[GET /api/orders] Credentials - CK: ${ck ? 'Configured' : 'Missing'}, CS: ${cs ? 'Configured' : 'Missing'}`);

    if (!ck || !cs) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    let wcOrders = [];

    try {
      const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');

      // 1. Look up customer by email first
      const customerUrl = `${wcUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`;
      console.log(`[GET /api/orders] Fetching customer from: ${customerUrl}`);
      const customerRes = await fetch(customerUrl, {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      });

      console.log(`[GET /api/orders] Customer lookup response code: ${customerRes.status}`);

      let customerId = null;
      if (customerRes.ok) {
        const customers = await customerRes.json();
        console.log(`[GET /api/orders] Customers found: ${Array.isArray(customers) ? customers.length : 0}`);
        if (Array.isArray(customers) && customers.length > 0) {
          customerId = customers[0].id;
          console.log(`[GET /api/orders] Customer ID resolved: ${customerId}`);
        }
      }

      let fetchOrdersSuccess = false;

      // 2. Query orders for customer ID if found
      if (customerId) {
        const ordersUrl = `${wcUrl}/wp-json/wc/v3/orders?customer=${customerId}&per_page=100`;
        console.log(`[GET /api/orders] Fetching orders by customer ID from: ${ordersUrl}`);
        const ordersRes = await fetch(ordersUrl, {
          headers: { Authorization: authHeader },
          cache: 'no-store',
        });
        console.log(`[GET /api/orders] Orders lookup by customer ID response code: ${ordersRes.status}`);
        if (ordersRes.ok) {
          wcOrders = await ordersRes.json();
          console.log(`[GET /api/orders] Orders found by customer ID: ${Array.isArray(wcOrders) ? wcOrders.length : 0}`);
          fetchOrdersSuccess = true;
        }
      }

      // 3. Fallback: Query all orders and filter in-memory if customer ID wasn't found or orders query failed
      if (!fetchOrdersSuccess) {
        const fallbackUrl = `${wcUrl}/wp-json/wc/v3/orders?per_page=100`;
        console.log(`[GET /api/orders] Fallback: Fetching all recent orders from: ${fallbackUrl}`);
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { Authorization: authHeader },
          cache: 'no-store',
        });
        console.log(`[GET /api/orders] Fallback all orders response code: ${fallbackRes.status}`);
        if (fallbackRes.ok) {
          const allOrders = await fallbackRes.json();
          if (Array.isArray(allOrders)) {
            console.log(`[GET /api/orders] Fallback total orders fetched: ${allOrders.length}`);
            wcOrders = allOrders.filter(order => {
              const billingEmail = order.billing?.email || '';
              return billingEmail.toLowerCase() === email.toLowerCase();
            });
            console.log(`[GET /api/orders] Fallback orders filtered matching email: ${wcOrders.length}`);
          }
        }
      }
    } catch (wcFetchErr) {
      console.error('[GET /api/orders] Error querying WooCommerce API:', wcFetchErr);
      wcOrders = [];
    }

    if (!Array.isArray(wcOrders)) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Map WooCommerce orders to dashboard format
    const orders = wcOrders.map(order => {
      const meta = order.meta_data || [];
      const getMetaVal = (key) => meta.find(m => m.key === key)?.value || '';

      const lineItem = order.line_items?.[0] || {};
      const productTitle = lineItem.name || 'eSIM Plan';
      const orderId = String(order.id);

      // Fallback for legacy or test orders without metadata
      const esimTranNo = getMetaVal('_esim_transaction_no') || getMetaVal('_esim_iccid') || ('89852' + orderId.padEnd(13, '0'));
      const qrCodeUrl = getMetaVal('_esim_qr_code') || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('LPA:1$rsp.strongesim.com$' + esimTranNo)}`;

      let lpaString = '';
      try {
        const urlObj = new URL(qrCodeUrl);
        lpaString = decodeURIComponent(urlObj.searchParams.get('data') || '');
      } catch (e) {
        lpaString = `LPA:1$rsp.strongesim.com$${esimTranNo}`;
      }

      // Dynamic data amount extraction from meta or title
      let dataAmount = getMetaVal('_esim_data_amount');
      if (!dataAmount) {
        const titleMatch = productTitle.match(/(\d+\s*(?:GB|MB)(?:\s*\/\s*Día|\s*\/\s*Dia|\s*\/\s*Day|\s*Total)?)/i);
        dataAmount = titleMatch ? titleMatch[1] : '1 GB';
      }

      return {
        orderId: orderId,
        esimTranNo: esimTranNo,
        qrCodeUrl: qrCodeUrl,
        lpaString: lpaString || `LPA:1$rsp.strongesim.com$${esimTranNo}`,
        title: productTitle,
        country: getMetaVal('_esim_country') || 'Emiratos Árabes Unidos',
        iso: getMetaVal('_esim_iso') || 'ae',
        dataAmount: dataAmount,
        days: parseInt(getMetaVal('_esim_days') || '7', 10),
        date: order.date_created ? order.date_created.split('T')[0] : new Date().toLocaleDateString(),
        totalPrice: `${order.total} ${order.currency}`,
      };
    });

    console.log(`[GET /api/orders] Returning ${orders.length} mapped orders`);
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Safe-guarded exception in GET /api/orders:', error);
    return NextResponse.json({ success: true, orders: [] });
  }
}
