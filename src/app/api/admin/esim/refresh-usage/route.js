import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/adminAuth';
import { fetchEsimProfileTelemetry } from '../../../../../lib/strongesim';
import { getOrderById } from '../../../../../lib/ordersService';
import { resolveUniversalTelemetry, getOrderTelemetryWithCache } from '../../../../../lib/universalTelemetry';

export const dynamic = 'force-dynamic';

async function processTelemetry(request, queryParams = {}) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  try {
    const orderId = queryParams.orderId;
    const esimTranNo = queryParams.esimTranNo || queryParams.iccid;

    if (!orderId && !esimTranNo) {
      return NextResponse.json({ success: false, message: 'Se requiere orderId o esimTranNo' }, { status: 400 });
    }

    // 1. Obtener los datos reales del pedido de forma universal
    let order = null;
    if (orderId) {
      order = await getOrderById(orderId);
    }
    if (!order && esimTranNo) {
      order = await getOrderById(esimTranNo);
    }
    if (!order) {
      order = {
        orderId: orderId || '0',
        esimTranNo: esimTranNo || '',
        status: 'Completed',
      };
    }

    // 2. Consulta en vivo forzada a StrongeSIM con actualización automática de la caché compartida
    const resolvedTelemetry = await getOrderTelemetryWithCache(order, true);

    return NextResponse.json({
      success: true,
      message: 'Telemetría de consumo actualizada desde la API del operador StrongeSIM.',
      usage: resolvedTelemetry,
      telemetry: resolvedTelemetry,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error al refrescar telemetría', error: err.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId') || searchParams.get('id');
  const esimTranNo = searchParams.get('esimTranNo') || searchParams.get('iccid');
  return processTelemetry(request, { orderId, esimTranNo });
}

export async function POST(request) {
  try {
    const body = await request.json();
    return processTelemetry(request, body);
  } catch {
    return processTelemetry(request, {});
  }
}
