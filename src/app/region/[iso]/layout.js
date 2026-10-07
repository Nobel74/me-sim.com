import { getRegionName } from '../../../lib/i18n.js';

export async function generateMetadata({ params }) {
  const slug = (params?.slug || params?.iso || '').toLowerCase();
  const regionName = getRegionName(slug, 'es') || slug;

  return {
    title: `eSIM ${regionName} | Planes de Datos Multipaís | ME-SIM`,
    description: `Viaja por ${regionName} con una sola eSIM. Conexión a internet de alta velocidad sin cambiar de SIM. Activación instantánea.`,
    alternates: {
      canonical: `https://www.me-sim.com/region/${slug}`,
    },
  };
}

export default function RegionLayout({ children }) {
  return children;
}
