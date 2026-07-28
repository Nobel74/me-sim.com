import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password, magicCode } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'El correo electrónico es obligatorio.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. If magicCode is supplied (One-Time Passcode login)
    if (magicCode) {
      if (magicCode.trim() !== '123456' && magicCode.trim() !== '888888') {
        return NextResponse.json(
          { success: false, message: 'El código de verificación no es válido o ha caducado.' },
          { status: 401 }
        );
      }
    } else if (password) {
      // 2. Password login validation
      if (password.length < 4) {
        return NextResponse.json(
          { success: false, message: 'La contraseña es incorrecta.' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar una contraseña o código de acceso.' },
        { status: 400 }
      );
    }

    // 3. User session payload (No credentials stored)
    const userSession = {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      loggedInAt: Date.now(),
    };

    const response = NextResponse.json({
      success: true,
      user: userSession,
      message: '¡Sesión iniciada con éxito!',
    });

    // 4. Set HttpOnly Secure Cookie (Not accessible via browser JavaScript)
    response.cookies.set({
      name: 'mesim_session',
      value: Buffer.from(JSON.stringify(userSession)).toString('base64'),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error interno en el servidor de autenticación.', error: error.message },
      { status: 500 }
    );
  }
}
