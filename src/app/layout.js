import './globals.css';
import localFont from 'next/font/local';
import ClientLayout from './ClientLayout';

const barlow = localFont({
  src: [
    { path: '../../assets/fonts/Barlow/Barlow-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/Barlow/Barlow-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../assets/fonts/Barlow/Barlow-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../assets/fonts/Barlow/Barlow-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../assets/fonts/Barlow/Barlow-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-barlow',
});

const barlowCondensed = localFont({
  src: [
    { path: '../../assets/fonts/Barlow_Condensed/BarlowCondensed-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Condensed/BarlowCondensed-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Condensed/BarlowCondensed-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Condensed/BarlowCondensed-ExtraBold.ttf', weight: '800', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Condensed/BarlowCondensed-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-barlow-condensed',
});

const barlowSemiCondensed = localFont({
  src: [
    { path: '../../assets/fonts/Barlow_Semi_Condensed/BarlowSemiCondensed-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Semi_Condensed/BarlowSemiCondensed-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Semi_Condensed/BarlowSemiCondensed-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../../assets/fonts/Barlow_Semi_Condensed/BarlowSemiCondensed-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-barlow-semi',
});

export const metadata = {
  title: 'eSIM Internacional para Viajar | ME-SIM',
  description: 'Conectividad móvil instantánea en más de 198 países sin roaming',
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
