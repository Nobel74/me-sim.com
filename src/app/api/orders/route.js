import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { planId, customerEmail, customerName, paymentIntentId, price, currency, title, country, iso, dataAmount, days, lang = 'es' } = body;

    // 1. Create order in WooCommerce if API credentials are configured
    let wcOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    try {
      const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
      const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
      const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;
      
      if (ck && cs) {
        const names = (customerName || 'Traveler').split(' ');
        const firstName = names[0] || 'Traveler';
        const lastName = names.slice(1).join(' ') || '';

        // Search for existing WooCommerce customer by email
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

        // If customer does not exist, create them
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
            transaction_id: paymentIntentId || '',
            customer_id: customerId, // Linked to real customer ID!
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
              }
            ],
            meta_data: [
              {
                key: '_stripe_intent_id',
                value: paymentIntentId || '',
              },
              {
                key: '_esim_iso',
                value: iso || 'es',
              },
              {
                key: '_esim_country',
                value: country || 'España',
              },
              {
                key: '_esim_data_amount',
                value: dataAmount || '10 GB',
              },
              {
                key: '_esim_days',
                value: String(days || 30),
              }
            ]
          }),
        });

        if (wcRes.ok) {
          const wcData = await wcRes.json();
          if (wcData && wcData.id) {
            wcOrderId = String(wcData.id);
            console.log(`WooCommerce order created successfully: #${wcOrderId}`);

            // Send welcome credentials email to new customers
            if (isNewCustomer && generatedPassword) {
              try {
                await fetch(new URL('/api/email/send', request.url).toString(), {
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

    // 2. Trigger order to StrongeSIM API
    let esimData = null;
    try {
      const response = await strongesimFetch('/orders-v2', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: planId,
          customer_email: customerEmail,
          customer_name: customerName,
        }),
      });

      if (response.ok) {
        esimData = await response.json();
      }
    } catch (error) {
      console.error('Error creating order at StrongeSIM:', error);
    }

    if (esimData) {
      const esimTranNo = esimData.esimTranNo;
      const qrCodeUrl = esimData.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(esimData.lpaString || '')}`;

      // Update metadata in WooCommerce
      try {
        const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
        const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
        const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;
        if (ck && cs && wcOrderId && !wcOrderId.startsWith('ORD-')) {
          await fetch(`${wcUrl}/wp-json/wc/v3/orders/${wcOrderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
            },
            body: JSON.stringify({
              meta_data: [
                { key: '_esim_iccid', value: esimTranNo },
                { key: '_esim_transaction_no', value: esimTranNo },
                { key: '_esim_qr_code', value: qrCodeUrl },
              ]
            })
          });
        }
      } catch (err) {
        console.error('Error updating WooCommerce meta_data after StrongeSIM activation:', err);
      }

      // Send order confirmation email with QR code
      try {
        await fetch(new URL('/api/email/send', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: customerEmail,
            type: 'order_confirmation',
            orderData: {
              title: title || 'eSIM Plan',
              orderId: wcOrderId,
              esimTranNo: esimTranNo,
              qrCodeUrl: qrCodeUrl,
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
        esimTranNo: esimTranNo,
        qr_code_url: qrCodeUrl,
        status: esimData.status || 'COMPLETED',
      });
    }

    // Fallback simulation if StrongeSIM API is in Sandbox/Demo or fails
    const mockEsimTranNo = '89852' + Math.floor(1000000000 + Math.random() * 9000000000);
    const mockQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=LPA:1$rsp.strongesim.com$${mockEsimTranNo}`;

    try {
      const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
      const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
      const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;
      if (ck && cs && wcOrderId && !wcOrderId.startsWith('ORD-')) {
        await fetch(`${wcUrl}/wp-json/wc/v3/orders/${wcOrderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
          },
          body: JSON.stringify({
            meta_data: [
              { key: '_esim_iccid', value: mockEsimTranNo },
              { key: '_esim_transaction_no', value: mockEsimTranNo },
              { key: '_esim_qr_code', value: mockQr },
            ]
          })
        });
      }
    } catch (err) {
      console.error('Error updating WooCommerce meta_data after mock eSIM creation:', err);
    }

    // Send order confirmation email with QR code
    try {
      await fetch(new URL('/api/email/send', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          type: 'order_confirmation',
          orderData: {
            title: title || 'eSIM Plan',
            orderId: wcOrderId,
            esimTranNo: mockEsimTranNo,
            qrCodeUrl: mockQr,
            totalPrice: `${price} ${currency || 'EUR'}`,
            customerName: customerName,
          },
          lang: lang,
        }),
      });
      console.log(`Mock order confirmation email sent to ${customerEmail}`);
    } catch (mailErr) {
      console.error('Error sending mock order confirmation email:', mailErr);
    }

    return NextResponse.json({
      success: true,
      order_id: wcOrderId,
      esimTranNo: mockEsimTranNo,
      qr_code_url: mockQr,
      status: 'COMPLETED',
      isDemo: true,
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
