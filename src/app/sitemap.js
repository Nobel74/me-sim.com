import { ALL_WORLD_COUNTRIES } from '../lib/i18n.js';
import { REGION_MAPPING } from '../lib/regionMapping.js';

export default async function sitemap() {
  const baseUrl = 'https://www.me-sim.com';
  const currentDate = new Date();

  // 1. Páginas principales públicas (sin barra final para coherencia con trailingSlash: false)
  const mainRoutes = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/destinations`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // 2. Regiones comerciales canónicas oficiales (14 regiones multi-país)
  const canonicalRegionSlugs = [
    ...new Set(Object.values(REGION_MAPPING).map((r) => r.canonicalSlug)),
  ];

  const regionRoutes = canonicalRegionSlugs.map((slug) => ({
    url: `${baseUrl}/region/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // 3. Destinos de eSIM por país (~198+ países mundiales sin 'global')
  const destinationRoutes = ALL_WORLD_COUNTRIES
    .filter((country) => country.iso && country.iso.toLowerCase() !== 'global')
    .map((country) => ({
      url: `${baseUrl}/destination/${country.iso.toLowerCase()}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  // Retornar catálogo público canónico con estado 200 garantizado
  return [...mainRoutes, ...regionRoutes, ...destinationRoutes];
}
