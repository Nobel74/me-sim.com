export default async function sitemap() {
  const baseUrl = 'https://me-sim.com';
  
  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/soporte`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/politica-de-cookies`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/en/cookie-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/en/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/en/refund-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/en/terms-and-conditions`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const countries = ['es', 'us', 'gb', 'fr', 'it', 'tr', 'mx', 'th', 'de', 'jp', 'pt', 'ca', 'br', 'ar', 'co', 'pe', 'au'];
  
  const dynamicRoutes = countries.map((iso) => ({
    url: `${baseUrl}/destination/${iso}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
