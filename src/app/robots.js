export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/checkout/success/', '/user/'],
      },
    ],
    sitemap: 'https://www.me-sim.com/sitemap.xml',
  };
}
