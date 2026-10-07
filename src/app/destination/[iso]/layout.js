import { getCountryName } from '../../../lib/i18n.js';

export async function generateMetadata({ params }) {
  const country = (params?.country || params?.iso || '').toLowerCase();
  const countryName = getCountryName(country, 'es') || country.toUpperCase();

  return {
    title: `eSIM ${countryName} | Datos Móviles e Internet | ME-SIM`,
    description: `Compra tu eSIM para ${countryName}. Conexión a internet rápida y segura sin cargos de roaming. Entrega inmediata por código QR.`,
    alternates: {
      canonical: `https://www.me-sim.com/destination/${country}`,
    },
  };
}

export default function DestinationLayout({ children }) {
  return children;
}
