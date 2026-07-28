import { NextResponse } from 'next/server';
import { sendEmail, generateMagicCodeHtml } from '../../../../lib/email';

export async function POST(request) {
  try {
    const { email, type, lang = 'es' } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Por favor, proporciona una dirección de email válida.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (type === 'magic_code') {
      const code = '123456'; // Generate code
      const htmlText = generateMagicCodeHtml(code, lang);
      const result = await sendEmail({
        to: cleanEmail,
        subject: lang === 'en' ? '🔑 Your ME-SIM Access Code' : '🔑 Tu Código de Acceso ME-SIM',
        htmlText,
        type: 'magic_code',
        data: { code },
      });

      return NextResponse.json({
        success: true,
        message: result.simulated
          ? (lang === 'en' ? `[DEMO EMAIL SENT] Verification code: 123456 sent to ${cleanEmail}` : `[CORREO ENVIADO A TU INBOX] Código enviado a ${cleanEmail} (Código demo: 123456)`)
          : (lang === 'en' ? `Verification code sent to ${cleanEmail}` : `Código de verificación enviado a ${cleanEmail}`),
      });
    }

    return NextResponse.json(
      { success: false, message: 'Tipo de email no reconocido.' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error al enviar el email.', error: error.message },
      { status: 500 }
    );
  }
}
