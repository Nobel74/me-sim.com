import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest, COOKIE_NAME } from '../../../../../lib/adminAuth';

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'No autenticado.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: session,
  });
}

export async function POST(request) {
  // Logout
  const response = NextResponse.json({
    success: true,
    message: 'Sesión finalizada',
  });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
