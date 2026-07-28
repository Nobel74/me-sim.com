import { NextResponse } from 'next/server';
import { getStrongeSIMAuth } from '../../../lib/strongesim';

export async function POST() {
  const auth = await getStrongeSIMAuth();
  if (auth.accessToken) {
    return NextResponse.json({ success: true, message: 'Autenticación exitosa con StrongeSIM API' });
  }
  return NextResponse.json({ success: false, message: 'Credenciales pendientes de configurar en .env.local' }, { status: 401 });
}
