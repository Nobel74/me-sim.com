'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTranslation, ALL_WORLD_COUNTRIES, getRegionName, getCountryName } from '../../lib/i18n';
import { formatCurrency, convertCurrency } from '../../lib/currency';
import { matchesCountryQuery } from '../../lib/searchUtils';
import CountryCard from '../../components/CountryCard';

const HERO_RANDOM_BACKGROUNDS = [
  { url: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=1200&auto=format&fit=crop', nameEs: 'España & Marruecos', nameEn: 'Spain & Morocco' },
  { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop', nameEs: 'París, Francia', nameEn: 'Paris, France' },
  { url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop', nameEs: 'Tokio, Japón', nameEn: 'Tokyo, Japan' },
  { url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop', nameEs: 'Dubái, EAU', nameEn: 'Dubai, UAE' },
  { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop', nameEs: 'Londres, Reino Unido', nameEn: 'London, UK' },
  { url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop', nameEs: 'Roma, Italia', nameEn: 'Rome, Italy' },
  { url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1200&auto=format&fit=crop', nameEs: 'Gran Muralla, China', nameEn: 'Great Wall, China' },
  { url: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=1200&auto=format&fit=crop', nameEs: 'Sídney, Australia', nameEn: 'Sydney, Australia' },
  { url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1200&auto=format&fit=crop', nameEs: 'Bangkok, Tailandia', nameEn: 'Bangkok, Thailand' },
  { url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200&auto=format&fit=crop', nameEs: 'El Cairo, Egipto', nameEn: 'Cairo, Egypt' },
  { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=1200&auto=format&fit=crop', nameEs: 'Nueva York, EE.UU.', nameEn: 'New York, USA' },
  { url: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=1200&auto=format&fit=crop', nameEs: 'Estambul, Turquía', nameEn: 'Istanbul, Turkey' },
  { url: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=1200&auto=format&fit=crop', nameEs: 'Playa del Carmen, México', nameEn: 'Mexico' },
  { url: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1200&auto=format&fit=crop', nameEs: 'Río de Janeiro, Brasil', nameEn: 'Rio, Brazil' },
  { url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop', nameEs: 'Bali, Indonesia', nameEn: 'Bali, Indonesia' },
];

export default function AllDestinationsPage() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [heroBg, setHeroBg] = useState(HERO_RANDOM_BACKGROUNDS[0]);
  const [plans, setPlans] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const t = getTranslation(lang);

  const syncPreferences = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');
    setCurrency(localStorage.getItem('mesim_curr') || 'EUR');
  };

  useEffect(() => {
    syncPreferences();

    const randomIndex = Math.floor(Math.random() * HERO_RANDOM_BACKGROUNDS.length);
    setHeroBg(HERO_RANDOM_BACKGROUNDS[randomIndex]);

    const handleCurrencyChange = () => syncPreferences();
    const handleLangChange = () => syncPreferences();

    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mesim_currency_changed', handleCurrencyChange);
    window.addEventListener('mesim_lang_changed', handleLangChange);
    document.addEventListener('mousedown', handleClickOutside);

    fetch('https://open.er-api.com/v6/latest/EUR')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setRates({
            EUR: 1.0,
            USD: data.rates.USD || 1.09,
            GBP: data.rates.GBP || 0.85,
            AUD: data.rates.AUD || 1.65,
          });
        }
      })
      .catch(() => {});

    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.plans) {
          setPlans(data.plans);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('mesim_currency_changed', handleCurrencyChange);
      window.removeEventListener('mesim_lang_changed', handleLangChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getMinPriceDisplay = () => {
    if (!plans || plans.length === 0) return currency === 'EUR' ? '2.90 €' : '£2.89';
    const minEur = Math.min(...plans.map((p) => p.priceEur || p.price || 999));
    if (minEur === 999) return currency === 'EUR' ? '2.90 €' : '£2.89';
    const converted = convertCurrency(minEur, currency, rates);
    return formatCurrency(converted, currency);
  };

  const handleNavigate = (iso) => {
    setIsOpen(false);
    router.push(`/destination/${iso}`);
  };

  const searchSuggestions = searchTerm.trim()
    ? ALL_WORLD_COUNTRIES
        .filter((country) => matchesCountryQuery(country.iso, searchTerm, lang))
        .map((country) => {
          const iso = country.iso;
          const matchingPlans = plans.filter((p) => (p.iso || '').toLowerCase() === iso);
          let safePrice = country.baseEur || 4.90;
          if (matchingPlans.length > 0) {
            const minPrice = Math.min(...matchingPlans.map((p) => p.priceEur));
            if (isFinite(minPrice)) safePrice = minPrice;
          }

          return {
            iso,
            countryName: getCountryName(iso, lang, country.nameEs),
            minPriceEur: safePrice,
          };
        })
        .slice(0, 8)
    : [];

  const regionKeys = [
    'all',
    'europe',
    'asia',
    'north-america',
    'south-america',
    'caribbean',
    'africa',
    'middle-east',
    'oceania',
    'aukus',
    'china-hk-macau',
    'east-asia',
    'southeast-asia',
    'europe-morocco',
  ];

  const regions = regionKeys.map((key) => ({
    key,
    label: getRegionName(key, lang),
  }));

  const filteredCountries = ALL_WORLD_COUNTRIES.filter((country) => {
    const matchesSearch = matchesCountryQuery(country.iso, searchTerm, lang);

    let matchesRegion = selectedRegion === 'all' || country.region === selectedRegion;

    if (selectedRegion === 'aukus') {
      matchesRegion = ['au', 'gb', 'us'].includes(country.iso);
    } else if (selectedRegion === 'china-hk-macau') {
      matchesRegion = ['cn', 'hk', 'mo'].includes(country.iso);
    } else if (selectedRegion === 'east-asia') {
      matchesRegion = ['jp', 'kr', 'tw'].includes(country.iso);
    } else if (selectedRegion === 'southeast-asia') {
      matchesRegion = ['th', 'my', 'sg', 'id', 'vn', 'ph', 'kh', 'la', 'mm'].includes(country.iso);
    } else if (selectedRegion === 'europe-morocco') {
      matchesRegion = country.region === 'europe' || country.iso === 'ma';
    }

    return matchesSearch && matchesRegion;
  });

  return (
    <div className="container-naked font-sans">
      {/* Breadcrumbs */}
      <nav className="text-sm font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold font-semi">{lang === 'en' ? 'Global Directory' : 'Catálogo 198 Países'}</span>
      </nav>

      {/* Hero Banner Section (Matching Destination/Home dark aesthetic) */}
      <div className="relative rounded-3xl bg-zinc-900 text-white mb-10 shadow-2xl border border-zinc-800">
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <img
            src={heroBg.url}
            alt="Global Destinations"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75 filter brightness-95 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25"></div>
        </div>

        <div className="relative z-10 p-6 sm:p-10 md:p-12 w-full">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold tracking-wide px-3.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-sm">
              <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>{lang === 'en' ? 'Global Connectivity (198+ Countries)' : 'Conectividad Global (198+ Países)'} • {heroBg[lang === 'en' ? 'nameEn' : 'nameEs']}</span>
            </div>
            <span className="bg-[#ffec00] text-black text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block flex-shrink-0"></span>
              <span>{lang === 'en' ? 'INSTANT DELIVERY • ACTIVATE IN 180 DAYS' : 'ENTREGA INSTANTÁNEA • ACTIVA EN 180 DÍAS'}</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight mb-3 text-white leading-tight">
            {lang === 'en' ? 'eSIM for Travel Worldwide' : 'eSIM para Viajar por todo el Mundo'}
          </h1>

          <p className="text-zinc-100 font-sans text-base sm:text-lg md:text-xl font-medium leading-relaxed mb-6 max-w-3xl">
            {lang === 'en'
              ? 'High-speed 4G/5G data from the second you land. Instant QR code delivery, no roaming charges and no SIM swap.'
              : 'Datos de alta velocidad 4G/5G desde que aterrizas. Entrega de código QR instantánea, sin cargos de roaming y sin cambiar de SIM.'}
          </p>

          {/* Search Input Bar inside Hero */}
          <div ref={searchContainerRef} className="mb-6 max-w-2xl relative">
            <div className={`flex items-center bg-white rounded-full p-1.5 sm:p-2 pl-5 sm:pl-6 shadow-2xl border-2 transition-all ${
              isOpen ? 'border-[#ffec00] ring-4 ring-[#ffec00]/30' : 'border-white/20 hover:border-[#ffec00]'
            }`}>
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-black mr-2.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                placeholder={t.searchPlaceholder}
                className="w-full text-black font-semibold text-sm sm:text-base outline-none bg-transparent placeholder-zinc-400 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setIsOpen(true);
                  }}
                  className="text-zinc-400 hover:text-black px-2 font-semibold text-sm"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-sans tracking-wider uppercase px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-all flex-shrink-0 ml-1.5 border border-black/10"
              >
                {lang === 'en' ? 'SEARCH' : 'BUSCAR'}
              </button>
            </div>

            {/* Floating Suggestions Dropdown */}
            {isOpen && searchTerm.trim() && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-zinc-200 p-3 sm:p-4 text-black overflow-hidden z-50 transition-all max-h-80 overflow-y-auto scrollbar-thin animate-scale-in">
                <h4 className="text-xs font-semibold font-condensed tracking-wider text-zinc-400 uppercase mb-3 px-3">
                  {lang === 'en' ? `RESULTS FOR "${searchTerm.toUpperCase()}"` : `RESULTADOS PARA "${searchTerm.toUpperCase()}"`}
                </h4>
                {searchSuggestions.length === 0 ? (
                  <p className="text-zinc-500 text-sm p-4 font-semibold font-sans">{t.noResults}</p>
                ) : (
                  <div className="space-y-1">
                    {searchSuggestions.map((item) => {
                      const displayPrice = convertCurrency(item.minPriceEur, currency, rates);

                      return (
                        <div
                          key={item.iso}
                          onClick={() => handleNavigate(item.iso)}
                          className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl hover:bg-[#ffec00]/20 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3.5">
                            <img
                              src={item.iso === 'global' ? '/flags/global.gif' : `/flags/${item.iso}.webp`}
                              alt={item.countryName}
                              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-zinc-200 shadow-sm"
                              onError={(e) => {
                                e.target.src = '/flags/gl.webp';
                              }}
                            />
                            <span className="font-semibold font-semi text-black text-sm sm:text-lg">
                              {item.countryName}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-zinc-500 font-condensed">
                            {t.fromPrice} <strong className="text-black text-sm sm:text-base font-semibold font-condensed ml-1">{formatCurrency(displayPrice, currency)}</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Glassmorphism Feature Highlight Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col gap-3.5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <span className="w-full sm:w-auto bg-[#ffec00] text-black text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-xs text-center flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 fill-current text-black flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                <span>{lang === 'en' ? 'Best Local Value' : 'Mejor Cobertura Local'}</span>
              </span>
              <span className="w-full sm:w-auto text-xs sm:text-sm text-white font-bold tracking-wide bg-black/60 px-3 py-1.5 rounded-full border border-white/10 shadow-xs text-center flex items-center justify-center">
                {lang === 'en' ? `Plans from ${getMinPriceDisplay()}` : `Planes desde ${getMinPriceDisplay()}`}
              </span>
            </div>

            <div>
              <strong className="text-lg sm:text-xl md:text-2xl font-bold text-white block mb-2 leading-tight">
                {lang === 'en' ? 'High-Speed 4G/5G eSIM for 198+ Destinations' : 'eSIM 4G/5G Alta Velocidad para más de 198 Destinos'}
              </strong>

              <button
                onClick={() => {
                  const el = document.getElementById('destinations-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full sm:w-auto bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-sans px-5 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap border border-black/10 inline-flex mt-1 mb-1"
              >
                <span>{lang === 'en' ? 'Choose Data Plan' : 'Elegir Plan de Datos'}</span> ➔
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-medium pt-2 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 2h2v3h-2v-3zm3 3h3v3h-3v-3zm-3 2h2v2h-2v-2z" />
                </svg>
                {lang === 'en' ? 'QR in seconds' : 'QR en segundos'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#ffec00] fill-current" viewBox="0 2 24 24">
                  <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-4c-2.21 0-4.21.9-5.66 2.34l1.42 1.42C8.9 16.63 10.37 16 12 16s3.1.63 4.24 1.76l1.42-1.42C16.21 14.9 14.21 14 12 14zm0-4c-3.87 0-7.37 1.57-9.9 4.1l1.42 1.42C5.76 13.27 8.68 12 12 12s6.24 1.27 8.48 3.52l1.42-1.42C19.37 11.57 15.87 10 10 12 10z" />
                </svg>
                {lang === 'en' ? 'Hotspot included' : 'Hotspot incluido'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 12c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
                {lang === 'en' ? 'WhatsApp intact' : 'WhatsApp intacto'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Region Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-4 mb-8">
        {regions.map((reg) => (
          <button
            key={reg.key}
            onClick={() => setSelectedRegion(reg.key)}
            className={`px-4 py-2 rounded-xl font-bold font-sans text-xs sm:text-sm whitespace-nowrap transition-all shadow-xs ${
              selectedRegion === reg.key
                ? 'bg-black text-[#ffec00] shadow-md border border-black'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-black border border-zinc-200'
            }`}
          >
            {reg.label}
          </button>
        ))}
      </div>

      {/* Country Counter Header */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-base font-semibold font-semi text-black">
          {lang === 'en'
            ? `Showing ${filteredCountries.length} destinations`
            : `Mostrando ${filteredCountries.length} destinos disponibles`}
        </span>
      </div>

      {/* 4-Column Responsive Grid consuming modular CountryCard */}
      {filteredCountries.length === 0 ? (
        <div id="destinations-grid" className="scroll-mt-24 bg-white rounded-3xl border border-zinc-200 p-12 text-center">
          <p className="text-zinc-600 font-semibold text-xl mb-3">{t.noResults}</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedRegion('all');
            }}
            className="text-black font-semibold font-condensed text-base underline"
          >
            Ver todos los países
          </button>
        </div>
      ) : (
        <div id="destinations-grid" className="scroll-mt-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 landscape:grid-cols-2 sm:landscape:grid-cols-3 lg:landscape:grid-cols-3 xl:landscape:grid-cols-4 gap-4 sm:gap-5 mb-16">
          {filteredCountries.map((country) => (
            <CountryCard
              key={country.iso}
              iso={country.iso}
              countryName={lang === 'en' ? country.nameEn : country.nameEs}
              priceEur={country.baseEur}
              lang={lang}
              currency={currency}
              rates={rates}
            />
          ))}
        </div>
      )}
    </div>
  );
}
