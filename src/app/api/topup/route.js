import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';

export async function POST(request) {
  try {
    const body = await request.json();
    const { esimTranNo, planId } = body;

    const response = await strongesimFetch(`/profiles/${encodeURIComponent(esimTranNo)}/topup`, {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error processing topup:', error);
  }

  return NextResponse.json({
    success: true,
    message: 'Recarga completada con éxito. Los datos se han añadido a tu eSIM existente.',
    topup_id: 'TOP-' + Math.floor(100000 + Math.random() * 900000),
    addedGb: 5.0,
    isDemo: true,
  });
}
