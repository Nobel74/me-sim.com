import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, currency = 'eur', customerEmail } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Monto inválido para el procesamiento del pago.' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // 1. If Stripe Secret Key is configured, create PaymentIntent for client-side Stripe Elements tokenization
    if (stripeSecretKey) {
      const params = new URLSearchParams();
      params.append('amount', Math.round(amount * 100).toString());
      params.append('currency', currency.toLowerCase());
      params.append('payment_method_types[]', 'card');
      if (customerEmail) params.append('receipt_email', customerEmail);
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

      if (res.ok && paymentIntent.client_secret) {
        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });
      } else {
        return NextResponse.json(
          { success: false, message: paymentIntent.error?.message || 'Error al generar la intención de pago en Stripe.' },
          { status: 400 }
        );
      }
    }

    // 2. Default Sandbox / Simulation Mode if no Stripe secret key
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
