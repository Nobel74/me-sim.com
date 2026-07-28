import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Sesión no válida o expirada.' },
        { status: 401 }
      );
    }

    const billingData = await request.json();

    return NextResponse.json({
      success: true,
      billing: billingData,
      message: '¡Datos de facturación actualizados correctamente!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error al guardar los datos de facturación.', error: error.message },
      { status: 500 }
    );
  }
}
