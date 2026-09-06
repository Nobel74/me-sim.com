export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/api/admin',
        '/api/admin/',
        '/api/',
        '/dashboard',
        '/dashboard/',
        '/cart',
        '/cart/',
      ],
    },
    sitemap: 'https://me-sim.com/sitemap.xml',
  };
}
