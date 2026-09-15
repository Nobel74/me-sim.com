import { ALL_WORLD_COUNTRIES } from '../lib/i18n';

export default async function sitemap() {
  const baseUrl = 'https://www.me-sim.com';
  const currentDate = new Date();

  // 1. Homepage principal
  const homeRoute = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  // 2. Destinos de eSIM por país (~197+ países mundiales)
  const destinationRoutes = ALL_WORLD_COUNTRIES
    .filter((country) => country.iso && country.iso !== 'global')
    .map((country) => ({
      url: `${baseUrl}/destination/${country.iso}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  // Retornar exclusivamente la homepage y las páginas públicas de destinos
  return [...homeRoute, ...destinationRoutes];
}
