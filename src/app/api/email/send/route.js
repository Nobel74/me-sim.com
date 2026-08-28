import { NextResponse } from 'next/server';
import { sendEmail, generateMagicCodeHtml, generateWelcomeCredentialsHtml, generatePasswordResetHtml, generateOrderConfirmationHtml } from '../../../../lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, type, lang = 'es', customCode, customPassword } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Por favor, proporciona una dirección de email válida.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (type === 'magic_code') {
      // Generate a real random 6-digit verification code if customCode is not passed
      const code = customCode || Math.floor(100000 + Math.random() * 900000).toString();
      const htmlText = generateMagicCodeHtml(code, lang);
      const result = await sendEmail({
        to: cleanEmail,
        subject: lang === 'en' ? 'Your ME-SIM Access Code' : 'Tu Código de Acceso ME-SIM',
        htmlText,
        type: 'magic_code',
        data: { code },
      });

      const response = NextResponse.json({
        success: true,
        message: result.simulated
          ? (lang === 'en' ? `[DEMO EMAIL SENT] Verification code: ${code} sent to ${cleanEmail}` : `[CORREO ENVIADO A TU INBOX] Código enviado a ${cleanEmail} (Código demo: ${code})`)
          : (lang === 'en' ? `Verification code sent to ${cleanEmail}` : `Código de verificación enviado a ${cleanEmail}`),
      });

      // Save challenge in secure HttpOnly cookie (valid for 10 minutes)
      const challengePayload = Buffer.from(JSON.stringify({ email: cleanEmail, code, expires: Date.now() + 10 * 60 * 1000 })).toString('base64');
      response.cookies.set({
        name: 'mesim_magic_challenge',
        value: challengePayload,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 600, // 10 minutes
      });

      return response;
    }

    if (type === 'welcome_credentials') {
      const password = customPassword || 'MS-123456';
      const htmlText = generateWelcomeCredentialsHtml(cleanEmail, password, lang);
      const result = await sendEmail({
        to: cleanEmail,
        subject: lang === 'en' ? 'Your ME-SIM Account Has Been Created' : 'Tu Cuenta de ME-SIM Ha Sido Creada',
        htmlText,
        type: 'welcome_credentials',
        data: { email: cleanEmail, password },
      });

      return NextResponse.json({
        success: true,
        message: 'Welcome credentials email processed successfully.',
      });
    }

    if (type === 'password_reset') {
      const password = customPassword || 'MS-123456';
      const htmlText = generatePasswordResetHtml(cleanEmail, password, lang);
      const result = await sendEmail({
        to: cleanEmail,
        subject: lang === 'en' ? 'Your ME-SIM Password Has Been Reset' : 'Tu Contraseña de ME-SIM Ha Sido Restablecida',
        htmlText,
        type: 'password_reset',
        data: { email: cleanEmail, password },
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset email processed successfully.',
      });
    }

    if (type === 'order_confirmation') {
      const htmlText = generateOrderConfirmationHtml(body.orderData, lang);
      const result = await sendEmail({
        to: cleanEmail,
        subject: lang === 'en' ? 'Your ME-SIM eSIM Order Confirmation' : 'Confirmación de tu Pedido eSIM en ME-SIM',
        htmlText,
        type: 'order_confirmation',
        data: body.orderData,
      });

      return NextResponse.json({
        success: true,
        message: 'Order confirmation email processed successfully.',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Tipo de email no reconocido.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Email send endpoint error:', error);
    return NextResponse.json(
      { success: false, message: 'Error al enviar el email.', error: error.message },
      { status: 500 }
    );
  }
}
