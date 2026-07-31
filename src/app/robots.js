export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/cart/', '/admin/'],
    },
    sitemap: 'https://me-sim.com/sitemap.xml',
  };
}
