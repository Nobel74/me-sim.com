import { NextResponse } from 'next/server.js';
import { getAdminSessionFromRequest } from '../../../../../lib/adminAuth.js';
import { cancelStrongeSimOrder } from '../../../../../lib/strongesim.js';
import { addDiagnosticLog } from '../../../../../lib/logger.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = getAdminSessionFromRequest(request);
    const adminKey = request.headers.get('x-admin-key') || request.headers.get('x-me-sim-key');
    const configuredSecret = process.env.ME_SIM_BRIDGE_SECRET || 'Este_2026_Clem_y_yo_nos_vamos_a_forrar!';

    if (!session && adminKey !== configuredSecret) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, reason = 'Cancelado desde panel de administración ME-SIM' } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Falta el orderId de StrongeSIM' }, { status: 400 });
    }

    addDiagnosticLog('ADMIN_CANCEL_ORDER', 'REQUEST', { orderId, reason });

    const result = await cancelStrongeSimOrder(orderId, reason);

    return NextResponse.json({
      success: result.ok,
      status: result.status,
      data: result.data,
      message: result.ok
        ? 'Orden cancelada con éxito en StrongeSIM. Saldo reembolsado al monedero prepago.'
        : 'Error al cancelar la orden en StrongeSIM.',
    }, { status: result.ok ? 200 : (result.status || 400) });
  } catch (error) {
    console.error('Error en admin cancel-order:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error interno procesando la cancelación',
    }, { status: 500 });
  }
}
