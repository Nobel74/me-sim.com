import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';

export async function GET() {
  try {
    const response = await strongesimFetch('/reseller/pricing', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error fetching /reseller/pricing:', error);
  }

  return NextResponse.json({ success: true, marginPercentage: 30, isDemo: true });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await strongesimFetch('/reseller/pricing', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error updating /reseller/pricing:', error);
  }

  return NextResponse.json({ success: true, message: 'Margen de ganancias actualizado correctamente.' });
}
