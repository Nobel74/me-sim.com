import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));

    return NextResponse.json({
      authenticated: true,
      user: {
        email: sessionData.email,
        name: sessionData.name,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}
