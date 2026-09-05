import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BILLING_PROFILES_FILE = path.join(process.cwd(), 'src', 'data', 'billing-profiles.json');

function getBillingProfiles() {
  try {
    if (fs.existsSync(BILLING_PROFILES_FILE)) {
      return JSON.parse(fs.readFileSync(BILLING_PROFILES_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading billing-profiles.json:', err);
  }
  return {};
}

function saveBillingProfiles(profiles) {
  try {
    const dir = path.dirname(BILLING_PROFILES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BILLING_PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving billing-profiles.json:', err);
    return false;
  }
}

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const user = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
    const profiles = getBillingProfiles();
    const userBilling = profiles[user.email.toLowerCase()] || null;

    return NextResponse.json({
      success: true,
      billing: userBilling,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionCookie = request.cookies.get('mesim_session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, message: 'Sesión no válida o expirada.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
    const billingData = await request.json();

    const profiles = getBillingProfiles();
    profiles[user.email.toLowerCase()] = {
      ...billingData,
      updatedAt: new Date().toISOString(),
    };
    saveBillingProfiles(profiles);

    return NextResponse.json({
      success: true,
      billing: profiles[user.email.toLowerCase()],
      message: '¡Datos de facturación guardados y sincronizados correctamente!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error al guardar los datos de facturación.', error: error.message },
      { status: 500 }
    );
  }
}
