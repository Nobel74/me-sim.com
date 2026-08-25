import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, currency = 'eur', customerEmail, customerName, cardNumber, cardExp, cardCvc } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Monto inválido para el procesamiento del pago.' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // 1. If Stripe Secret Key is configured, process payment with real Stripe API
    if (stripeSecretKey) {
      const cleanCardNumber = (cardNumber || '').replace(/\s+/g, '');
      const expParts = (cardExp || '').split(/[\/\-]/);
      let expMonth = (expParts[0] || '').trim();
      let expYear = (expParts[1] || '').trim();
      if (expYear.length === 2) expYear = '20' + expYear;
      const cleanCvc = (cardCvc || '').trim();

      if (!cleanCardNumber || !expMonth || !expYear || !cleanCvc) {
        return NextResponse.json(
          { success: false, message: 'Por favor, introduce los datos completos de tu tarjeta bancaria (número, caducidad y CVC).' },
          { status: 400 }
        );
      }

      // A. Create PaymentMethod on Stripe using card details
      const pmParams = new URLSearchParams();
      pmParams.append('type', 'card');
      pmParams.append('card[number]', cleanCardNumber);
      pmParams.append('card[exp_month]', expMonth);
      pmParams.append('card[exp_year]', expYear);
      pmParams.append('card[cvc]', cleanCvc);
      if (customerEmail) pmParams.append('billing_details[email]', customerEmail);
      if (customerName) pmParams.append('billing_details[name]', customerName);

      const pmRes = await fetch('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: pmParams.toString(),
      });

      const pmData = await pmRes.json();

      if (!pmRes.ok || pmData.error) {
        return NextResponse.json(
          { success: false, message: pmData.error?.message || 'Los datos de la tarjeta son incorrectos o fueron rechazados por el banco.' },
          { status: 400 }
        );
      }

      const paymentMethodId = pmData.id;

      // B. Create & Confirm PaymentIntent in Stripe
      const piParams = new URLSearchParams();
      piParams.append('amount', Math.round(amount * 100).toString());
      piParams.append('currency', currency.toLowerCase());
      piParams.append('payment_method', paymentMethodId);
      piParams.append('confirm', 'true');
      piParams.append('return_url', 'https://me-sim.com/checkout');
      if (customerEmail) piParams.append('receipt_email', customerEmail);
      piParams.append('metadata[integration]', 'ME-SIM Next.js Headless');

      const piRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: piParams.toString(),
      });

      const paymentIntent = await piRes.json();

      // STRICT VALIDATION: Only return success if Stripe confirmed payment succeeded
      if (piRes.ok && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });
      }

      if (piRes.ok && paymentIntent.status === 'requires_action') {
        const redirectUrl = paymentIntent.next_action?.redirect_to_url?.url;
        return NextResponse.json({
          success: false,
          requiresAction: true,
          redirectUrl: redirectUrl,
          message: 'Se requiere autenticación 3D Secure con tu banco.',
        }, { status: 402 });
      }

      // If status is not succeeded (e.g., requires_payment_method, failed, etc.)
      const errorMsg = paymentIntent.error?.message || `El pago no pudo ser completado por Stripe (Estado: ${paymentIntent.status || 'fallido'}).`;
      return NextResponse.json(
        { success: false, message: errorMsg, status: paymentIntent.status },
        { status: 400 }
      );
    }

    // Only fallback if NO Stripe Secret Key is defined at all in environment
    const mockClientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`;

    return NextResponse.json({
      success: true,
      clientSecret: mockClientSecret,
      paymentIntentId: `pi_mock_${Date.now()}`,
      simulated: true,
      message: 'Modo Sandbox: Pago simulado correctamente sin cargos reales.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error al procesar la solicitud de pago con Stripe.', error: error.message },
      { status: 500 }
    );
  }
}
