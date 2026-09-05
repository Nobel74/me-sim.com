import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest, getAllAdminUsers, COOKIE_NAME } from '../../../../../lib/adminAuth';

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'No autenticado.' },
      { status: 401 }
    );
  }

  const users = await getAllAdminUsers();
  const dbUser = users.find(
    (u) => u.id === session.id || (u.email && session.email && u.email.toLowerCase() === session.email.toLowerCase())
  );

  return NextResponse.json({
    success: true,
    user: {
      id: session.id,
      email: session.email,
      name: dbUser?.name || session.name,
      role: dbUser?.role || session.role,
      avatar: dbUser?.avatar || '',
    },
  });
}

export async function POST(request) {
  // Logout
  const response = NextResponse.json({
    success: true,
    message: 'Sesión finalizada',
  });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

