'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [lang, setLang] = useState('es');
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    setMounted(true);
    // Detect language safely
    let currentLang = 'es';
    try {
      currentLang = localStorage.getItem('mesim_lang') || 'es';
    } catch (e) {
      console.warn("localStorage is blocked:", e);
    }
    setLang(currentLang);

    const handleLangChange = () => {
      try {
        setLang(localStorage.getItem('mesim_lang') || 'es');
      } catch (e) {}
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);

    // Check existing consent safely
    let savedConsent = null;
    try {
      savedConsent = localStorage.getItem('mesim_cookie_consent');
    } catch (e) {
      console.warn("localStorage is blocked:", e);
    }

    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        setPreferences(parsed);
        loadScripts(parsed);
      } catch (e) {
        setShowBanner(true);
      }
    }

    return () => {
      window.removeEventListener('mesim_lang_changed', handleLangChange);
    };
  }, []);

  const loadScripts = (consent) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': consent.analytics ? 'granted' : 'denied',
        'ad_storage': consent.marketing ? 'granted' : 'denied',
        'ad_user_data': consent.marketing ? 'granted' : 'denied',
        'ad_personalization': consent.marketing ? 'granted' : 'denied'
      });

      // Update dataLayer events for GTM trigger updates
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'consent_update',
        analytics_consent: consent.analytics ? 'granted' : 'denied',
        marketing_consent: consent.marketing ? 'granted' : 'denied'
      });
    }
  };

  const saveConsent = (newPreferences) => {
    try {
      localStorage.setItem('mesim_cookie_consent', JSON.stringify(newPreferences));
    } catch (e) {
      console.warn("localStorage is blocked, choices won't persist:", e);
    }
    setPreferences(newPreferences);
    loadScripts(newPreferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  // Text translations
  const content = {
    es: {
      title: 'Configuración de Cookies',
      description: 'En ME-SIM utilizamos cookies propias y de terceros para garantizar el correcto funcionamiento del sitio, recordar tus preferencias e integrar herramientas de analítica y marketing. Puedes configurar tus opciones abajo. Para más información, consulta nuestra ',
      cookiePolicy: 'Política de Cookies',
      acceptAll: 'Aceptar Todas',
      rejectAll: 'Rechazar Todas',
      configure: 'Personalizar',
      save: 'Guardar Configuración',
      back: 'Volver',
      necessaryTitle: '1. Cookies Necesarias (Obligatorias)',
      necessaryDesc: 'Esenciales para navegar, guardar productos en el carrito, iniciar sesión y recordar tus decisiones de cookies. No se pueden desactivar.',
      analyticsTitle: '2. Cookies de Analítica (Google Analytics)',
      analyticsDesc: 'Nos permiten medir de forma anónima el número de visitas, el tráfico y las páginas más populares para optimizar tu experiencia.',
      marketingTitle: '3. Cookies de Marketing (Google Tag Manager)',
      marketingDesc: 'Utilizadas para medir el éxito de las campañas de marketing, conversiones y habilitar píxeles publicitarios.',
    },
    en: {
      title: 'Cookie Configuration',
      description: 'At ME-SIM we use first and third-party cookies to guarantee the correct operation of the site, remember your preferences, and integrate analytics and marketing tools. You can customize your options below. For more information, please see our ',
      cookiePolicy: 'Cookie Policy',
      acceptAll: 'Accept All',
      rejectAll: 'Reject All',
      configure: 'Customize',
      save: 'Save Settings',
      back: 'Go Back',
      necessaryTitle: '1. Necessary Cookies (Obligatory)',
      necessaryDesc: 'Essential for browsing, saving items in your shopping cart, logging in, and remembering your cookie choices. Cannot be disabled.',
      analyticsTitle: '2. Analytics Cookies (Google Analytics)',
      analyticsDesc: 'Allow us to measure traffic, visits, and most popular pages anonymously to optimize your experience.',
      marketingTitle: '3. Marketing Cookies (Google Tag Manager)',
      marketingDesc: 'Used to measure the success of marketing campaigns, conversions, and enable advertising tracking pixels.',
    }
  };

  const t = content[lang] || content['es'];

  // Button to allow users to reopen settings (AEPD / GDPR requirement)
  useEffect(() => {
    const handleReopen = () => {
      setShowPreferences(true);
    };
    window.addEventListener('mesim_reopen_cookies', handleReopen);
    return () => {
      window.removeEventListener('mesim_reopen_cookies', handleReopen);
    };
  }, []);

  if (!mounted || (!showBanner && !showPreferences)) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      {/* Mini minimal banner */}
      {showBanner && !showPreferences && (
        <div className="bg-black/95 border border-zinc-800 text-white rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-2xl animate-scale-in pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-md">
          <div className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed text-left space-y-1">
            <strong className="text-white font-semi text-sm sm:text-base block mb-0.5">
              {lang === 'en' ? 'Your Privacy Preferences' : 'Tus Preferencias de Privacidad'}
            </strong>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium">
              {t.description}
              <Link href={lang === 'en' ? '/en/cookie-policy/' : '/politica-de-cookies/'} className="text-[#ffec00] hover:underline font-bold">
                {t.cookiePolicy}
              </Link>.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto flex-shrink-0 justify-end">
            <button
              onClick={handleRejectAll}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all w-full sm:w-auto font-sans"
            >
              {t.rejectAll}
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all w-full sm:w-auto font-sans"
            >
              {t.configure}
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2.5 rounded-xl bg-[#ffec00] hover:bg-yellow-300 text-black font-extrabold text-xs transition-all w-full sm:w-auto font-sans shadow-md border border-black/10"
            >
              {t.acceptAll}
            </button>
          </div>
        </div>
      )}

      {/* Customize preferences view */}
      {showPreferences && (
        <div className="bg-black/95 border border-zinc-800 text-white rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-scale-in pointer-events-auto flex flex-col gap-6 backdrop-blur-md">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <h4 className="text-lg font-bold font-semi text-[#ffec00] flex items-center gap-2">
              <svg className="w-5 h-5 fill-current text-[#ffec00] flex-shrink-0" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span>{t.title}</span>
            </h4>
            {!showBanner && (
              <button
                onClick={() => setShowPreferences(false)}
                className="text-zinc-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[50vh] pr-1">
            {/* 1. Necessary */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{t.necessaryTitle}</span>
                <p className="text-[11px] text-zinc-200 leading-normal font-sans font-medium">{t.necessaryDesc}</p>
              </div>
              <div className="relative inline-flex items-center flex-shrink-0 mt-0.5">
                <div className="w-9 h-5 bg-[#ffec00]/40 rounded-full relative">
                  <div className="absolute top-[2px] left-[18px] w-4 h-4 rounded-full bg-black/60"></div>
                </div>
              </div>
            </div>

            {/* 2. Analytics */}
            <label className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{t.analyticsTitle}</span>
                <p className="text-[11px] text-zinc-200 leading-normal font-sans font-medium">{t.analyticsDesc}</p>
              </div>
              <div className="relative inline-flex items-center flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 rounded-full transition-colors peer-checked:bg-[#ffec00] relative">
                  <div className={`absolute top-[2px] w-4 h-4 rounded-full transition-all ${preferences.analytics ? 'left-[18px] bg-black' : 'left-[2px] bg-zinc-400'}`}></div>
                </div>
              </div>
            </label>

            {/* 3. Marketing */}
            <label className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{t.marketingTitle}</span>
                <p className="text-[11px] text-zinc-200 leading-normal font-sans font-medium">{t.marketingDesc}</p>
              </div>
              <div className="relative inline-flex items-center flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 rounded-full transition-colors peer-checked:bg-[#ffec00] relative">
                  <div className={`absolute top-[2px] w-4 h-4 rounded-full transition-all ${preferences.marketing ? 'left-[18px] bg-black' : 'left-[2px] bg-zinc-400'}`}></div>
                </div>
              </div>
            </label>
          </div>

          <div className="flex justify-between items-center gap-3 pt-2 border-t border-zinc-800">
            {showBanner && (
              <button
                onClick={() => setShowPreferences(false)}
                className="px-3.5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all font-sans"
              >
                {t.back}
              </button>
            )}
            <button
              onClick={handleSavePreferences}
              className="px-4 py-2.5 rounded-xl bg-[#ffec00] hover:bg-yellow-300 text-black font-extrabold text-xs transition-all flex-1 font-sans text-center shadow-md border border-black/10"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
