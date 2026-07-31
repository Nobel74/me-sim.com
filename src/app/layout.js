import './globals.css';
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from 'next/font/google';
import ClientLayout from './ClientLayout';
import SeoMeta from '../components/SeoMeta';
import Script from 'next/script';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-barlow-semi',
  display: 'swap',
});

export const metadata = {
  title: 'eSIM Internacional para Viajar | ME-SIM',
  description: 'Conectividad móvil instantánea en más de 198 países sin roaming',
  icons: {
    icon: [
      { url: '/favicon/favicon.png', type: 'image/png' }
    ],
    shortcut: '/favicon/favicon.png',
    apple: '/favicon/favicon.png',
  },
};

export default function RootLayout({ children }) {
  const defaultWebsiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "ME-SIM",
    "url": "https://me-sim.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://me-sim.com/?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} ${barlowSemiCondensed.variable}`}>
      <head>
        {/* Google Search Console - Meta Verification (Sustituye por tu código real si lo deseas) */}
        <meta name="google-site-verification" content="TU_CODIGO_DE_VERIFICACION_DE_SEARCH_CONSOLE" />

        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PHSFJ537');
            `,
          }}
        />

        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XZ9CSKPTFH"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XZ9CSKPTFH');
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900 bg-slate-50">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PHSFJ537"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <SeoMeta path="/" schemaJson={defaultWebsiteSchema} />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
