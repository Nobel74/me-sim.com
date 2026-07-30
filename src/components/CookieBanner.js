'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [lang, setLang] = useState('es');
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Detect language
    const currentLang = localStorage.getItem('mesim_lang') || 'es';
    setLang(currentLang);

    const handleLangChange = () => {
      setLang(localStorage.getItem('mesim_lang') || 'es');
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);

    // Check existing consent
    const savedConsent = localStorage.getItem('mesim_cookie_consent');
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      const parsed = JSON.parse(savedConsent);
      setPreferences(parsed);
      loadScripts(parsed);
    }

    return () => {
      window.removeEventListener('mesim_lang_changed', handleLangChange);
    };
  }, []);

  const loadScripts = (consent) => {
    // 1. Google Analytics Loader
    if (consent.analytics) {
      const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX'; // Placeholder GA4 ID
      if (gaId && !document.getElementById('google-analytics-script')) {
        // Embed Global Site Tag
        const script1 = document.createElement('script');
        script1.id = 'google-analytics-script';
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.id = 'google-analytics-init';
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { 'anonymize_ip': true });
        `;
        document.head.appendChild(script2);
      }
    }

    // 2. Google Tag Manager Loader
    if (consent.marketing) {
      const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'; // Placeholder GTM ID
      if (gtmId && !document.getElementById('google-tagmanager-script')) {
        const scriptGtm = document.createElement('script');
        scriptGtm.id = 'google-tagmanager-script';
        scriptGtm.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `;
        document.head.appendChild(scriptGtm);
      }
    }
  };

  const saveConsent = (newPreferences) => {
    localStorage.setItem('mesim_cookie_consent', JSON.stringify(newPreferences));
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
      title: 'Configuración de Cookies 🍪',
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
      title: 'Cookie Configuration 🍪',
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
      marketingDesc: 'Used to measure the success of marketing campaigns, conversions, and enable ad pixels.',
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

  if (!showBanner && !showPreferences) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 flex justify-center pointer-events-none">
      {/* Banner view */}
      {showBanner && !showPreferences && (
        <div className="bg-black/95 border border-zinc-800 text-white rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl animate-scale-in pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-md">
          <div className="text-left space-y-1.5 flex-1 min-w-0 pr-0 md:pr-4">
            <h4 className="text-base font-bold font-semi text-[#ffec00] tracking-tight">{t.title}</h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
              {t.description}
              <Link href={lang === 'en' ? '/en/cookie-policy/' : '/politica-de-cookies/'} className="text-[#ffec00] underline font-bold hover:text-yellow-400">
                {t.cookiePolicy}
              </Link>.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full md:w-auto flex-shrink-0 justify-end">
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
            <h4 className="text-lg font-bold font-semi text-[#ffec00]">{t.title}</h4>
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
