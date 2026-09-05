import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../lib/adminAuth';
import { getCompanyConfig, saveCompanyConfig } from '../../../../lib/companyConfig';

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  const config = getCompanyConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Permiso denegado. Solo administradores pueden modificar los datos fiscales.' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const result = saveCompanyConfig(data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Datos fiscales oficiales de ME-SIM.COM actualizados con éxito.',
        config: result.config,
      });
    }

    return NextResponse.json(
      { success: false, message: 'No se pudieron guardar los datos.', error: result.error },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Error al procesar la solicitud', error: err.message },
      { status: 500 }
    );
  }
}
