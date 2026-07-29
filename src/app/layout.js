import './globals.css';
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from 'next/font/google';
import ClientLayout from './ClientLayout';
import SeoMeta from '../components/SeoMeta';

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
      <body className="font-sans antialiased text-slate-900 bg-slate-50">
        <SeoMeta path="/" schemaJson={defaultWebsiteSchema} />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
