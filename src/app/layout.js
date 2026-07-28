import './globals.css';
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from 'next/font/google';
import ClientLayout from './ClientLayout';

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
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} ${barlowSemiCondensed.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
