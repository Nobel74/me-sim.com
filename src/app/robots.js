export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/login',
          '/register',
          '/dashboard',
          '/dashboard/*',
          '/cart',
          '/checkout',
          '/api/*',
          '/en/privacy-policy',
          '/en/terms-and-conditions',
          '/es/politica-de-privacidad',
          '/es/terminos-y-condiciones',
          '/privacy-policy',
          '/terms-and-conditions',
        ],
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bytespider'],
        allow: ['/', '/destination/*', '/destinations', '/destinations/*'],
        disallow: [
          '/admin/*',
          '/dashboard/*',
          '/api/*',
          '/login',
          '/cart',
          '/checkout',
        ],
      },
    ],
    sitemap: 'https://www.me-sim.com/sitemap.xml',
  };
}
