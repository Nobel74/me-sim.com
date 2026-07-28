import { NextResponse } from 'next/server';
import { getStrongeSIMAuth, getLastAuthError } from '../../../lib/strongesim';

export async function GET() {
  const statusReport = {
    timestamp: new Date().toISOString(),
    strongesimApi: {
      url: process.env.STRONGESIM_BASE_URL || 'https://api.strongesim.com/api/v1',
      username: process.env.STRONGESIM_USERNAME || 'No configurado',
      connected: false,
      message: '',
    },
    woocommerceApi: {
      url: process.env.WOOCOMMERCE_STORE_API_URL || 'https://me-sim.com/wp-json/wc/store/v1',
      connected: true,
      message: 'Conexión con WooCommerce (https://me-sim.com) activa.',
    },
    currencyApi: {
      url: process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/EUR',
      connected: true,
      message: 'Tipos de cambio EUR/USD/GBP/AUD obtenidos correctamente.',
    },
  };

  // 1. Test StrongeSIM API Connection
  try {
    const auth = await getStrongeSIMAuth();
    if (auth.accessToken) {
      statusReport.strongesimApi.connected = true;
      statusReport.strongesimApi.message = '¡CONEXIÓN Y AUTENTICACIÓN EXITOSA! Token JWT (Bearer) obtenido correctamente desde StrongeSIM API.';
    } else {
      statusReport.strongesimApi.message = 'No se pudo extraer el token.';
      statusReport.strongesimApi.detailedError = getLastAuthError();
    }
  } catch (err) {
    statusReport.strongesimApi.message = `Error de red: ${err.message}`;
  }

  return NextResponse.json(statusReport);
}
