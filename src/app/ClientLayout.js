'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslation, detectBrowserPreferences } from '../lib/i18n';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = getTranslation(lang);

  const checkUserSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
      setCartCount(cart.length);
    } catch {
      setCartCount(0);
    }
  };

  const syncPreferences = () => {
    const { lang: prefLang, currency: prefCurr } = detectBrowserPreferences();
    setLang(prefLang);
    setCurrency(prefCurr);
    updateCartCount();
    checkUserSession();
  };

  useEffect(() => {
    syncPreferences();

    const handleCurrencyChange = () => syncPreferences();
    const handleLangChange = () => syncPreferences();
    const handleCartChange = () => updateCartCount();
    const handleAuthChange = () => checkUserSession();

    window.addEventListener('mesim_currency_changed', handleCurrencyChange);
    window.addEventListener('mesim_lang_changed', handleLangChange);
    window.addEventListener('mesim_cart_changed', handleCartChange);
    window.addEventListener('mesim_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleCartChange);

    return () => {
      window.removeEventListener('mesim_currency_changed', handleCurrencyChange);
      window.removeEventListener('mesim_lang_changed', handleLangChange);
      window.removeEventListener('mesim_cart_changed', handleCartChange);
      window.removeEventListener('mesim_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleCartChange);
    };
  }, []);

  useEffect(() => {
    updateCartCount();
    checkUserSession();
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('mesim_lang', newLang);
    window.dispatchEvent(new Event('mesim_lang_changed'));

    // Automatic route redirect for localized static pages
    if (pathname.includes('/pollitica-de-privacidad') || pathname.includes('/privacy-policy')) {
      if (newLang === 'en') {
        router.push('/en/privacy-policy/');
      } else {
        router.push('/pollitica-de-privacidad/');
      }
    } else if (pathname.includes('/condiciones-de-servicio') || pathname.includes('/terms-and-conditions')) {
      if (newLang === 'en') {
        router.push('/en/terms-and-conditions/');
      } else {
        router.push('/condiciones-de-servicio/');
      }
    } else if (pathname.includes('/politica-de-reembolso') || pathname.includes('/refund-policy')) {
      if (newLang === 'en') {
        router.push('/en/refund-policy/');
      } else {
        router.push('/politica-de-reembolso/');
      }
    }
  };

  const handleCurrChange = (newCurr) => {
    setCurrency(newCurr);
    localStorage.setItem('mesim_curr', newCurr);
    window.dispatchEvent(new Event('mesim_currency_changed'));
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      window.dispatchEvent(new Event('mesim_auth_changed'));
      setIsMenuOpen(false);
      router.push('/');
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Top Preference Bar (Hidden on tiny mobile, shown in drawer or desktop) */}
      <div className="bg-black text-white py-2.5 text-xs font-sans border-b border-zinc-800 hidden md:block">
        <div className="container-naked flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffec00] animate-pulse"></span>
            <span className="font-medium text-zinc-300 text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                <path d="M12 2.5s-6 5.5-6 11.5c0 3.31 2.69 6 6 6s6-2.69 6-6c0-6-6-11.5-6-11.5zm0 14.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
              </svg>
              {t.topBanner}
            </span>
          </div>
          <div className="flex gap-5 items-center">
            {/* Language Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-medium text-xs flex items-center gap-1">
                <svg className="w-3.5 h-3.5 fill-current text-zinc-400" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                {t.language}:
              </span>
              {['es', 'en'].map((l) => (
                <button
                  key={l}
                  onClick={() => handleLangChange(l)}
                  className={`px-2.5 py-0.5 rounded-md font-semibold text-xs uppercase tracking-wider transition-all ${
                    lang === l
                      ? 'bg-[#ffec00] text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:text-white font-medium'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Currency Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-medium text-xs flex items-center gap-1">
                <svg className="w-3.5 h-3.5 fill-current text-zinc-400" viewBox="0 0 24 24">
                  <path d="M12.89 11.1c-1.78-.59-2.64-.96-2.64-1.9 0-1.02 1.11-1.7 2.85-1.7 2.01 0 2.84.87 2.92 2.21h2.24c-.1-2.17-1.42-3.79-3.77-4.24V3h-3v2.44c-2.37.49-4.14 2.03-4.14 4.35 0 2.87 2.37 3.86 5.56 4.9 1.96.65 2.54 1.25 2.54 2.1 0 1.09-1.04 1.8-2.92 1.8-2.31 0-3.15-.99-3.26-2.39H7.03c.12 2.47 1.69 4.09 4.22 4.54V21h3v-2.22c2.44-.47 4.25-1.97 4.25-4.42 0-2.86-2.18-3.95-5.61-5.26z" />
                </svg>
                {t.currency}:
              </span>
              {['EUR', 'USD', 'GBP', 'AUD'].map((curr) => (
                <button
                  key={curr}
                  onClick={() => handleCurrChange(curr)}
                  className={`px-2.5 py-0.5 rounded-md font-semibold text-xs uppercase tracking-wider transition-all ${
                    currency === curr
                      ? 'bg-[#ffec00] text-black font-bold shadow-xs'
                      : 'text-zinc-300 hover:text-white font-medium'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white/90 border-b border-zinc-200/80 py-3.5 shadow-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="container-naked flex justify-between items-center">
          <Link href="/" className="flex items-center no-underline">
            <img
              src="/logos/Logo-me-sim.svg"
              alt="ME-SIM"
              className="h-10 md:h-11 w-auto hover:scale-105 transition-transform"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-7 items-center font-semibold text-base text-zinc-800 font-sans">
            <Link href="/" className="hover:text-black hover:underline underline-offset-4 decoration-[#ffec00] decoration-4 transition-all">
              {t.navCatalog}
            </Link>
            <Link href="/soporte" className="hover:text-black hover:underline underline-offset-4 decoration-[#ffec00] decoration-4 transition-all flex items-center gap-1.5">
              <span>{t.navSupport || (lang === 'en' ? 'Support' : 'Soporte')}</span>
            </Link>

            {currentUser ? (
              <div className="flex items-center gap-7">
                <Link href="/dashboard" className="hover:text-black hover:underline underline-offset-4 decoration-[#ffec00] decoration-4 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4 fill-current text-black" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <span>{t.navDashboard}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:text-red-600 font-semibold text-base transition-all flex items-center gap-1.5 text-zinc-800 hover:scale-105"
                  title={lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}
                >
                  <svg className="w-4 h-4 fill-current text-current" viewBox="0 0 24 24">
                    <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                  </svg>
                  <span>{lang === 'en' ? 'Salir' : 'Salir'}</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="hover:text-black hover:underline underline-offset-4 decoration-[#ffec00] decoration-4 transition-all flex items-center gap-2">
                <svg className="w-4 h-4 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2h-8.35zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
                <span>{lang === 'en' ? 'Sign In' : 'Iniciar Sesión'}</span>
              </Link>
            )}

            {/* Icon Cart Button with Badge Globito */}
            <Link
              href="/cart"
              className="bg-[#ffec00] hover:bg-yellow-300 text-black border border-black/10 w-10 h-10 rounded-xl flex items-center justify-center relative transition-all shadow-xs hover:shadow-md hover:scale-105"
              title={lang === 'en' ? 'Shopping Cart' : 'Carrito de Compra'}
            >
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z" />
              </svg>

              <span className="absolute -top-1.5 -right-1.5 bg-black text-[#ffec00] font-bold font-sans text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-xs border border-white">
                {cartCount}
              </span>
            </Link>
          </nav>

          {/* Mobile Actions: Cart Icon + Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/cart"
              className="bg-[#ffec00] text-black border border-black/10 w-10 h-10 rounded-xl flex items-center justify-center relative transition-all shadow-xs"
            >
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 bg-black text-[#ffec00] font-bold font-sans text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 border border-white">
                {cartCount}
              </span>
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-zinc-100 border border-zinc-300 w-10 h-10 rounded-xl flex items-center justify-center text-black"
              aria-label="Abrir Menú"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Drawer Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-zinc-200 p-6 space-y-6 shadow-2xl animate-slide-down">
            <div className="space-y-4">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="block font-semibold text-lg text-black py-2 border-b border-zinc-100"
              >
                {t.navCatalog}
              </Link>

              <Link
                href="/soporte"
                onClick={() => setIsMenuOpen(false)}
                className="block font-semibold text-lg text-black py-2 border-b border-zinc-100"
              >
                💬 {t.navSupport || (lang === 'en' ? 'Support' : 'Soporte')}
              </Link>

              {currentUser ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block font-semibold text-lg text-black py-2 border-b border-zinc-100"
                  >
                    {t.navDashboard}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left font-semibold text-lg text-red-600 py-2 border-b border-zinc-100 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 fill-current text-red-600" viewBox="0 0 24 24">
                      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                    </svg>
                    <span>{lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block font-semibold text-lg text-black py-2 border-b border-zinc-100"
                >
                  {lang === 'en' ? 'Sign In' : 'Iniciar Sesión'}
                </Link>
              )}
            </div>

            {/* Language & Currency Controls in Mobile Drawer */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase">{t.language}:</span>
                <div className="flex gap-2">
                  {['es', 'en'].map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLangChange(l)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        lang === l ? 'bg-[#ffec00] text-black border border-black/10' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase">{t.currency}:</span>
                <div className="flex gap-1.5">
                  {['EUR', 'USD', 'GBP', 'AUD'].map((curr) => (
                    <button
                      key={curr}
                      onClick={() => handleCurrChange(curr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        currency === curr ? 'bg-black text-[#ffec00]' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Layout Wrapper */}
      <main className="min-h-screen py-6 md:py-10 bg-zinc-50/70 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-[#ffec00]/25 via-[#ffec00]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-[#ffec00]/15 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#ffec00]/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

        <div className="relative z-10">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-zinc-400 py-12 text-base border-t border-zinc-800 font-sans relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ffec00]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container-naked flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img src="/logos/Logo-me-sim-Header.svg" alt="ME-SIM" className="h-8 w-auto" />
            <div className="hidden sm:block h-5 w-px bg-zinc-800"></div>
            <p className="text-sm text-zinc-400 font-sans text-center sm:text-left">{t.footerTagline}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-center sm:text-right text-zinc-400">
            <Link
              href="/soporte"
              className="hover:text-[#ffec00] transition-colors underline font-medium"
            >
              {t.navSupport || (lang === 'en' ? 'Support' : 'Soporte')}
            </Link>
            <div className="hidden sm:block h-4 w-px bg-zinc-800"></div>
            <Link
              href={lang === 'en' ? '/en/privacy-policy/' : '/pollitica-de-privacidad/'}
              className="hover:text-[#ffec00] transition-colors underline font-medium"
            >
              {t.privacyPolicy}
            </Link>
            <div className="hidden sm:block h-4 w-px bg-zinc-800"></div>
            <Link
              href={lang === 'en' ? '/en/terms-and-conditions/' : '/condiciones-de-servicio/'}
              className="hover:text-[#ffec00] transition-colors underline font-medium"
            >
              {t.termsAndConditions}
            </Link>
            <div className="hidden sm:block h-4 w-px bg-zinc-800"></div>
            <Link
              href={lang === 'en' ? '/en/refund-policy/' : '/politica-de-reembolso/'}
              className="hover:text-[#ffec00] transition-colors underline font-medium"
            >
              {t.refundPolicy}
            </Link>
            <div className="hidden sm:block h-4 w-px bg-zinc-800"></div>
            <div>
              <p>© {new Date().getFullYear()} ME-SIM. {t.footerRights}</p>
              <p className="mt-1 text-[#ffec00] font-condensed font-semibold tracking-wider">{t.footerCurrencyNote}</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
