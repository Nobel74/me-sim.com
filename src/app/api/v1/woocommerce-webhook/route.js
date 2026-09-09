import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { strongesimFetch, resolveStrongeSimPlanId } from '../../../../lib/strongesim';
import { addDiagnosticLog } from '../../../../lib/logger';
import { checkOrderProvisioned, markOrderProvisioned } from '../../../../lib/idempotency';
import { saveOrUpdateOrder } from '../../../../lib/ordersService';
import { resolveCustomerLanguage } from '../../../../lib/i18n';

// Secure CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://api.me-sim.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-ME-SIM-Signature',
};

// preflight request handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// WooCommerce Webhook receiver
export async function POST(req) {
  try {
    // 1. Read request body as raw text buffer to prevent Next.js JSON sorting issues altering signature
    const rawBody = await req.text();

    // 2. Extract signature header
    const signature = req.headers.get('x-me-sim-signature') || '';

    // 3. Recalculate HMAC-SHA256 signature
    const bridgeSecret = process.env.ME_SIM_BRIDGE_SECRET;
    if (!bridgeSecret) {
      console.error('Webhook Error: ME_SIM_BRIDGE_SECRET environment variable is not defined.');
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Internal Server Configuration Error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const calculatedHmac = crypto
      .createHmac('sha256', bridgeSecret)
      .update(rawBody)
      .digest('hex');

    // Convert both signatures to buffers for safe timing attack prevention comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHmac, 'hex');

    // Prevent timing safe comparison errors by matching buffer lengths
    if (
      signatureBuffer.length !== calculatedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, calculatedBuffer)
    ) {
      console.warn('Webhook Security: Rejected unauthorized request signature.');
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Parse payload safely since signature is verified
    const payload = JSON.parse(rawBody);

    // Extract key order properties
    const orderId = payload.order_id || payload.id;
    const email = payload.email || payload.billing?.email;
    const itemObj = payload.items?.[0] || payload.line_items?.[0] || {};
    const sku = payload.sku || itemObj.sku;

    const metaMap = {};
    if (Array.isArray(itemObj.meta_data)) {
      itemObj.meta_data.forEach(m => {
        if (m.key && m.value !== undefined) metaMap[m.key] = m.value;
      });
    }
    if (Array.isArray(payload.meta_data)) {
      payload.meta_data.forEach(m => {
        if (m.key && m.value !== undefined) metaMap[m.key] = m.value;
      });
    }

    const itemIso = itemObj.iso || metaMap.iso || metaMap._esim_iso || payload.iso || 'es';
    const itemDataAmount = itemObj.dataAmount || metaMap.data_amount || metaMap._esim_data_amount || payload.data_amount || itemObj.name || '1 GB Total';
    const itemDays = itemObj.days || metaMap.days || metaMap._esim_days || payload.days || 30;
    const customerName = payload.customer_name || payload.customerName || `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() || 'Traveler';

    // Determinar con exactitud el idioma de comunicación con el cliente según el idioma de la orden/web
    const customerLang = resolveCustomerLanguage({
      lang: metaMap._order_lang || metaMap._customer_lang || metaMap.lang || metaMap.customer_language || payload.lang || payload.language,
      country: metaMap._esim_country || payload.billing?.country || itemIso,
      iso: itemIso,
      email: email,
    });

    addDiagnosticLog('WEBHOOK', 'RECEIVED_ORDER_COMPLETED', { orderId, email, sku, itemIso, itemDataAmount, itemDays, customerName, customerLang });

    console.log(`Firma HMAC verificada con éxito para el pedido #${orderId} de [${email}]`);

    // =========================================================================
    // 5. IDEMPOTENCIA: Verificar si la eSIM ya fue aprovisionada previamente
    // =========================================================================
    const existingIccidFromPayload = payload.esim_iccid || metaMap._esim_iccid || metaMap._esim_transaction_no;
    const isAlreadyProvisionedInPayload = payload.is_provisioned === true || metaMap._esim_provisioned === 'yes' || !!existingIccidFromPayload;
    
    // Check in-memory idempotency lock
    const inMemoryLock = checkOrderProvisioned(orderId) || (email && sku ? checkOrderProvisioned(`${email}_${sku}`) : null);

    if (isAlreadyProvisionedInPayload || inMemoryLock) {
      const activeIccid = existingIccidFromPayload || inMemoryLock?.iccid || 'PROVISIONED';
      console.log(`[Webhook Idempotency] El pedido #${orderId} de [${email}] ya fue aprovisionado previamente (ICCID: ${activeIccid}). Omitiendo llamada duplicada a StrongeSIM.`);
      addDiagnosticLog('WEBHOOK', 'SKIPPED_DUPLICATE_ORDER', { orderId, email, iccid: activeIccid });

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: 'Order already provisioned, duplicate call skipped',
          orderId,
          esimTranNo: activeIccid,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Check WooCommerce REST API metadata directly if needed
    const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://api.me-sim.com';
    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;
    
    if (ck && cs && orderId) {
      try {
        const wcCheckRes = await fetch(`${wcUrl}/wp-json/wc/v3/orders/${orderId}`, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
          },
          cache: 'no-store',
        });
        if (wcCheckRes.ok) {
          const wcOrderData = await wcCheckRes.json();
          const wcMetas = wcOrderData.meta_data || [];
          const foundIccidMeta = wcMetas.find(m => m.key === '_esim_iccid' || m.key === '_esim_transaction_no');
          const foundProvMeta = wcMetas.find(m => m.key === '_esim_provisioned');
          if (foundIccidMeta?.value || foundProvMeta?.value === 'yes') {
            const foundIccid = foundIccidMeta?.value || 'PROVISIONED';
            console.log(`[Webhook Idempotency] Verificado en WooCommerce API: Pedido #${orderId} ya tiene eSIM (ICCID: ${foundIccid}). Omitiendo compra duplicada.`);
            markOrderProvisioned(orderId, { iccid: foundIccid, email });
            return new NextResponse(
              JSON.stringify({
                success: true,
                message: 'Order already provisioned in WooCommerce, duplicate call skipped',
                orderId,
                esimTranNo: foundIccid,
              }),
              {
                status: 200,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json',
                },
              }
            );
          }
        }
      } catch (checkErr) {
        console.warn(`[Webhook] Error checking WooCommerce order #${orderId} meta:`, checkErr.message);
      }
    }

    if (!sku && !itemIso) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'No SKU or ISO found in webhook payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Lock order in memory to prevent concurrent purchases
    markOrderProvisioned(orderId, { status: 'in-flight', email });
    if (email && sku) markOrderProvisioned(`${email}_${sku}`, { status: 'in-flight', orderId });

    // 6. Resolve real numeric StrongeSIM package ID dynamically
    const realPlanId = await resolveStrongeSimPlanId({
      sku: sku,
      iso: itemIso,
      dataAmount: itemDataAmount,
      days: itemDays,
    });

    if (!realPlanId) {
      console.error(`No StrongeSIM package found matching SKU [${sku}], ISO [${itemIso}], Data [${itemDataAmount}]`);
      return new NextResponse(
        JSON.stringify({ success: false, error: `Could not resolve package for ${itemIso} (${sku})` }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Webhook resolved SKU [${sku}] -> StrongeSIM package ID: [${realPlanId}] for country [${itemIso}]`);

    let response = await strongesimFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: realPlanId,
        customer_email: email,
        end_customer_email: email,
        email: email,
        user_email: email,
        customer_name: customerName,
        send_email: true,
        sendEmail: true,
        send_email_to_customer: true,
        notify_customer: true,
        send_qr_email: true,
        deliver_qr: true,
      }),
    });

    let esimData;
    if (response.ok) {
      esimData = await response.json();
      const nested = esimData.data || esimData;
      const ord = nested.order || nested;
      const targetId = ord.id || ord.orderId || ord.transactionId || nested.id || nested.orderId || nested.transactionId;

      let realIccid = ord.iccid || ord.esimTranNo || nested.iccid || nested.esimTranNo;
      let qrCodeUrl = ord.qr_code_url || ord.qrCodeUrl || nested.qr_code_url || nested.qrCodeUrl;
      let lpaString = ord.activation_code || ord.lpaString || ord.lpa || nested.lpaString || nested.lpa || nested.activation_code;

      const profilesArr = nested.profiles || ord.profiles;
      if (Array.isArray(profilesArr) && profilesArr.length > 0) {
        const firstProf = profilesArr[0];
        if (firstProf.iccid) realIccid = firstProf.iccid;
        if (firstProf.qr_code_url || firstProf.qrCodeUrl) qrCodeUrl = firstProf.qr_code_url || firstProf.qrCodeUrl;
        if (firstProf.activation_code || firstProf.ac) lpaString = firstProf.activation_code || firstProf.ac;
      }

      // Extract from profiles array returned by StrongeSIM GET /orders/{targetId} if needed
      if (targetId && (!qrCodeUrl || !lpaString || !realIccid || !/^\d+$/.test(realIccid))) {
        try {
          const profileRes = await strongesimFetch(`/orders/${targetId}`, { cache: 'no-store' });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const pNested = profileData.data || profileData;
            const pOrd = pNested.order || pNested;
            const pProfiles = pNested.profiles || (pNested.data && pNested.data.profiles);
            const firstProfile = Array.isArray(pProfiles) ? pProfiles[0] : pOrd;

            if (pOrd?.iccid) realIccid = pOrd.iccid;
            if (pOrd?.qr_code_url) qrCodeUrl = pOrd.qr_code_url;
            if (pOrd?.activation_code) lpaString = pOrd.activation_code;

            if (firstProfile) {
              if (firstProfile.iccid) realIccid = firstProfile.iccid;
              if (firstProfile.qr_code_url || firstProfile.qrCodeUrl) qrCodeUrl = firstProfile.qr_code_url || firstProfile.qrCodeUrl;
              if (firstProfile.activation_code || firstProfile.ac) lpaString = firstProfile.activation_code || firstProfile.ac;
            }
          }
        } catch (pErr) {
          console.warn('Could not fetch expanded profile from StrongeSIM:', pErr.message);
        }
      }

      // Si tenemos realIccid y todavía falta el QR directo del CDN de StrongeSIM, consultar /profiles/{realIccid}
      if (realIccid && /^\d+$/.test(realIccid) && (!qrCodeUrl || !lpaString)) {
        try {
          const profRes = await strongesimFetch(`/profiles/${realIccid}`, { cache: 'no-store' });
          if (profRes.ok) {
            const profData = await profRes.json();
            const p = Array.isArray(profData.data?.profiles) ? profData.data.profiles[0] : (profData.data?.profile || profData.data);
            if (p) {
              if (p.qrCodeUrl || p.qr_code_url || p.shortUrl) qrCodeUrl = p.qrCodeUrl || p.qr_code_url || p.shortUrl;
              if (p.ac || p.activation_code) lpaString = p.ac || p.activation_code;
            }
          }
        } catch (eProf) {
          console.warn('Could not fetch direct profile from StrongeSIM:', eProf.message);
        }
      }

      const finalIccid = (realIccid && /^\d+$/.test(realIccid)) ? realIccid : (targetId || '');
      const finalLpa = lpaString || '';
      const finalQrCodeUrl = qrCodeUrl || '';

      console.log(`StrongeSIM eSIM purchased successfully for order #${orderId}. Real ICCID: ${finalIccid}, QR: ${finalQrCodeUrl}`);

      // Lock as completed in memory
      markOrderProvisioned(orderId, { iccid: finalIccid, email });
      if (email && sku) markOrderProvisioned(`${email}_${sku}`, { iccid: finalIccid, orderId });

      // Update WooCommerce order metadata
      try {
        if (ck && cs && orderId) {
          await fetch(`${wcUrl}/wp-json/wc/v3/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
            },
            body: JSON.stringify({
              meta_data: [
                { key: '_esim_iccid', value: finalIccid },
                { key: '_esim_transaction_no', value: finalIccid },
                { key: '_esim_qr_code', value: finalQrCodeUrl },
                { key: '_esim_activation_code', value: finalLpa },
                { key: '_esim_provisioned', value: 'yes' },
                { key: '_order_lang', value: customerLang },
                { key: '_customer_lang', value: customerLang },
              ]
            })
          });
          console.log(`Updated WooCommerce Order #${orderId} with real ICCID [${finalIccid}] and lang [${customerLang}] metadata.`);
        }
      } catch (wcMetaErr) {
        console.error(`Error updating WooCommerce Order #${orderId} metadata:`, wcMetaErr);
      }

      // Persistir orden localmente con su cupón de WooCommerce
      try {
        const rawCoupon = payload.coupon_lines?.[0]?.code || metaMap.coupon_code || metaMap._coupon_code || '';
        const wcDiscount = parseFloat(payload.discount_total || '0');
        const orderPrice = parseFloat(payload.total || 0);
        saveOrUpdateOrder({
          orderId: String(orderId),
          customerName: customerName,
          customerEmail: email,
          lang: customerLang,
          title: itemObj.name || `eSIM ${itemIso.toUpperCase()}`,
          plan: itemObj.name || `eSIM ${itemIso.toUpperCase()} ${itemDataAmount}`,
          amount: orderPrice,
          priceEur: orderPrice,
          discountAmount: wcDiscount > 0 ? wcDiscount : 0,
          originalAmount: wcDiscount > 0 ? parseFloat((orderPrice + wcDiscount).toFixed(2)) : orderPrice,
          currency: payload.currency || 'EUR',
          status: 'Completed',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          paymentMethod: payload.payment_method_title || 'WooCommerce',
          esimTranNo: finalIccid,
          realIccid: finalIccid,
          qrCodeUrl: finalQrCodeUrl,
          lpaString: finalLpa,
          country: metaMap._esim_country || itemIso,
          coupon: rawCoupon,
          billing: payload.billing || {},
        });
      } catch (saveErr) {
        console.warn('Error saving local order in webhook:', saveErr.message);
      }

      // Send order confirmation email with real QR code
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://me-sim.com';
        await fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            type: 'order_confirmation',
            orderData: {
              title: itemObj.name || `eSIM ${itemIso.toUpperCase()}`,
              orderId: orderId,
              esimTranNo: finalIccid,
              qrCodeUrl: finalQrCodeUrl,
              lpaCode: finalLpa,
              totalPrice: `${payload.total_amount || '0.00'} ${payload.currency || 'EUR'}`,
              customerName: customerName,
            },
            lang: customerLang,
          }),
        });
        console.log(`Order confirmation email with QR sent to ${email} (lang: ${customerLang})`);
      } catch (emailErr) {
        console.error(`Error sending QR email for Order #${orderId}:`, emailErr);
      }
    } else {
      const errorText = await response.text();
      console.error(`StrongeSIM API error: ${response.status} - ${errorText}`);
    }

    // Return status along with webhook verification response
    return new NextResponse(
      JSON.stringify({
        success: true,
        orderId,
        strongesim: esimData ? { success: true, esimTranNo: esimData.data?.iccid || esimData.iccid } : { success: false, message: 'StrongeSIM order pending' },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Webhook processing exception:', err);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error', message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
