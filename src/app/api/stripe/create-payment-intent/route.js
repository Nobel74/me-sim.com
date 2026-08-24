import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { amount, currency = 'eur', customerEmail } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Monto inválido para el procesamiento del pago.' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // 1. If Stripe Secret Key is configured, call Stripe REST API directly using fetch (No external npm package required)
    if (stripeSecretKey) {
      const { cardNumber, cardExp, cardCvc } = body;

      // Create PaymentMethod directly via Stripe REST API if card details provided
      let paymentMethodId = 'pm_card_visa';
      if (cardNumber && cardExp) {
        const [expMonth, expYear] = cardExp.split('/');
        const pmParams = new URLSearchParams();
        pmParams.append('type', 'card');
        pmParams.append('card[number]', cardNumber);
        pmParams.append('card[exp_month]', expMonth || '12');
        pmParams.append('card[exp_year]', expYear ? (expYear.length === 2 ? `20${expYear}` : expYear) : '2028');
        if (cardCvc) pmParams.append('card[cvc]', cardCvc);

        const pmRes = await fetch('https://api.stripe.com/v1/payment_methods', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: pmParams.toString(),
        });
        const pmData = await pmRes.json();
        if (pmRes.ok && pmData.id) {
          paymentMethodId = pmData.id;
        } else if (pmData.error) {
          return NextResponse.json(
            { success: false, message: pmData.error.message || 'Datos de tarjeta inválidos' },
            { status: 400 }
          );
        }
      }

      const params = new URLSearchParams();
      params.append('amount', Math.round(amount * 100).toString());
      params.append('currency', currency.toLowerCase());
      if (customerEmail) params.append('receipt_email', customerEmail);
      params.append('payment_method', paymentMethodId);
      params.append('confirm', 'true');
      params.append('return_url', 'https://me-sim.com/checkout');
      params.append('metadata[integration]', 'ME-SIM Next.js Headless');

      const res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const paymentIntent = await res.json();

      if (res.ok && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture' || paymentIntent.client_secret)) {
        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });
      } else if (paymentIntent.error) {
        return NextResponse.json(
          { success: false, message: paymentIntent.error.message || 'Pago rechazado por el banco' },
          { status: 400 }
        );
      }
    }

    // 2. Default Sandbox / Simulation Mode (Zero real charges, zero extra dependencies)
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
      { success: false, message: 'Error al procesar la solicitud de pago.', error: error.message },
      { status: 500 }
    );
  }
}
