import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { strongesimFetch } from '../../../../lib/strongesim';

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

    // Extract key order properties (adjust field mapping to match WordPress me-sim-bridge webhook format)
    const orderId = payload.order_id || payload.id;
    const email = payload.email || payload.billing?.email;
    const sku = payload.sku || payload.items?.[0]?.sku || payload.line_items?.[0]?.sku;
    const customerName = payload.customer_name || payload.customerName || `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() || 'Traveler';

    console.log(`Firma HMAC verificada con éxito para el pedido #${orderId} de [${email}]`);

    if (!sku) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'No SKU found in webhook payload' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Trigger order to StrongeSIM reseller API sychronous /orders-v2 endpoint
    let esimData = null;
    try {
      let realPlanId = sku;

      // Attempt resolving synthetic SKU/Plan ID to StrongeSIM's active package ID
      try {
        const plansRes = await strongesimFetch('/plans-v2', { cache: 'no-store' });
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          const livePlans = plansData.plans || plansData.data || (Array.isArray(plansData) ? plansData : []);
          const matchedPlan = livePlans.find(p => p.sku === sku || p.id === sku || p.plan_id === sku || (p.iso && sku.toLowerCase().startsWith(p.iso.toLowerCase())));
          if (matchedPlan && (matchedPlan.plan_id || matchedPlan.id || matchedPlan.code)) {
            realPlanId = matchedPlan.plan_id || matchedPlan.id || matchedPlan.code;
          }
        }
      } catch (rErr) {
        console.warn('Webhook plan_id resolution fallback:', rErr.message);
      }

      if (!realPlanId || typeof realPlanId !== 'number') {
        if (typeof realPlanId === 'string' && /^\d+$/.test(realPlanId)) {
          realPlanId = parseInt(realPlanId, 10);
        } else {
          // Default numeric package ID for AE 1GB 7D in StrongeSIM database
          realPlanId = 19901;
        }
      }

      let response = await strongesimFetch('/orders-v2', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: realPlanId, // Resolved StrongeSIM package numeric ID
          customer_email: email,
          customer_name: customerName,
        }),
      });

      if (!response.ok && response.status === 404) {
        response = await strongesimFetch('/orders', {
          method: 'POST',
          body: JSON.stringify({
            plan_id: realPlanId,
            customer_email: email,
            customer_name: customerName,
          }),
        });
      }

      if (response.ok) {
        esimData = await response.json();
        console.log(`StrongeSIM eSIM purchased successfully for order #${orderId}. Code: ${esimData.esimTranNo}`);
      } else {
        const errorText = await response.text();
        console.error(`StrongeSIM API error: ${response.status} - ${errorText}`);
      }
    } catch (apiError) {
      console.error('Network error contacting StrongeSIM API:', apiError.message);
    }

    // Return status along with webhook verification response
    return new NextResponse(
      JSON.stringify({
        success: true,
        orderId,
        strongesim: esimData ? { success: true, esimTranNo: esimData.esimTranNo } : { success: false, message: 'StrongeSIM order pending manual review' },
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
