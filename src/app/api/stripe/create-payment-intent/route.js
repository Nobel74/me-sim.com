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
      const params = new URLSearchParams();
      params.append('amount', Math.round(amount * 100).toString());
      params.append('currency', currency.toLowerCase());
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
        });
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
