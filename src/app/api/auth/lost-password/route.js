import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, lang = 'es' } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: lang === 'en' ? 'Please enter a valid email address.' : 'Introduce un correo electrónico válido.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    let wcUrl = rawWcUrl;
    if (wcUrl.includes('/wp-json')) {
      wcUrl = wcUrl.split('/wp-json')[0];
    }
    if (wcUrl.endsWith('/')) {
      wcUrl = wcUrl.slice(0, -1);
    }

    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    if (!ck || !cs) {
      return NextResponse.json(
        { success: false, message: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // 1. Search for customer by email
    const searchRes = await fetch(`${wcUrl}/wp-json/wc/v3/customers?email=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
      },
      cache: 'no-store'
    });

    if (!searchRes.ok) {
      return NextResponse.json(
        { success: false, message: lang === 'en' ? 'Error checking email registration.' : 'Error al verificar el registro del correo.' },
        { status: 502 }
      );
    }

    const customers = await searchRes.json();
    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { success: false, message: lang === 'en' ? 'This email address is not registered.' : 'Este correo electrónico no está registrado.' },
        { status: 404 }
      );
    }

    const customerId = customers[0].id;

    // 2. Generate a new temporary password
    const newTempPassword = 'MS-' + Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Update customer password in WooCommerce
    const updateRes = await fetch(`${wcUrl}/wp-json/wc/v3/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
      },
      body: JSON.stringify({ password: newTempPassword }),
    });

    if (!updateRes.ok) {
      return NextResponse.json(
        { success: false, message: lang === 'en' ? 'Failed to update account password.' : 'No se pudo restablecer la contraseña en la cuenta.' },
        { status: 502 }
      );
    }

    // 4. Send email with the new temporary password
    try {
      await fetch(new URL('/api/email/send', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'password_reset',
          customPassword: newTempPassword,
          lang,
        }),
      });
    } catch (emailErr) {
      console.error('Error triggering password reset email dispatch:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: lang === 'en'
        ? 'A new temporary password has been sent to your email.'
        : 'Se ha enviado una nueva contraseña temporal a tu correo electrónico.',
    });

  } catch (error) {
    console.error('Error in lost-password API route:', error);
    return NextResponse.json(
      { success: false, message: 'Error procesando la solicitud de recuperación.' },
      { status: 500 }
    );
  }
}
