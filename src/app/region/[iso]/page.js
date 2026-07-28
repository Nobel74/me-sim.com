'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ALL_WORLD_COUNTRIES, getTranslation, getCountryName, getRegionName } from '../../../lib/i18n';
import { convertCurrency, formatCurrency } from '../../../lib/currency';
import CountryCard from '../../../components/CountryCard';
import FaqSection from '../../../components/FaqSection';

const REGION_HERO_IMAGES = {
  europe: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1000&auto=format&fit=crop',
  asia: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'middle-east': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
  'north-america': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1000&auto=format&fit=crop',
  'south-america': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1000&auto=format&fit=crop',
  caribbean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
  africa: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1000&auto=format&fit=crop',
  oceania: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=1000&auto=format&fit=crop',
  aukus: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=1000&auto=format&fit=crop',
  'china-hk-macau': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1000&auto=format&fit=crop',
  'east-asia': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'southeast-asia': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1000&auto=format&fit=crop',
};

const REGION_DESCRIPTIONS = {
  europe: {
    es: 'Viaja sin fronteras de Lisboa a Helsinki. Mantén tus aplicaciones y mapas activos en más de 35 países europeos con una sola instalación.',
    en: 'Travel border-free from Lisbon to Helsinki. Keep your apps and maps connected across 35+ European countries on a single eSIM profile.',
  },
  asia: {
    es: 'Desde la tecnología de Tokio hasta las playas de Bangkok. Cobertura ultrarrápida en 18 países asiáticos sin cuotas ocultas de roaming.',
    en: 'From Tokyo high-tech to Bangkok beaches. Ultra-fast coverage across 18 Asian countries with zero roaming surprises.',
  },
  'middle-east': {
    es: 'Conéctate sin interrupciones en Dubái, Riad, Doha y los 12 estados del Golfo. Redes 5G/4G locales preferentes para viajeros de ocio y negocios.',
    en: 'Seamless 5G/4G connectivity across Dubai, Riyadh, Doha, and all 12 Gulf states. Top local networks for business and leisure travelers.',
  },
  'north-america': {
    es: 'EE.UU., Canadá y México unidos en una sola eSIM. Conéctate a AT&T, T-Mobile y Telcel automáticamente.',
    en: 'USA, Canada, and Mexico united on a single eSIM profile. Auto-connects to premium networks AT&T, T-Mobile, and Telcel.',
  },
  'south-america': {
    es: 'Explora Brasil, Argentina, Colombia, Chile y más de 14 destinos sudamericanos con datos móviles inmediatos al aterrizar.',
    en: 'Explore Brazil, Argentina, Colombia, Chile, and 14+ South American destinations with instant mobile data upon arrival.',
  },
  caribbean: {
    es: 'Navega en tus vacaciones por Aruba, Curazao, Jamaica y 16 islas caribeñas sin cambiar de tarjeta SIM física.',
    en: 'Island hop across Aruba, Curaçao, Jamaica, and 16 Caribbean islands without swapping physical SIM cards.',
  },
  africa: {
    es: 'De El Cairo a Ciudad del Cabo. Datos móviles fiables en 26 países africanos con soporte prioritario 24/7.',
    en: 'From Cairo to Cape Town. Reliable mobile internet across 26 African nations with 24/7 priority support.',
  },
  oceania: {
    es: 'Conexión garantizada en Australia, Nueva Zelanda, Fiyi y las islas del Pacífico con los mejores operadores locales.',
    en: 'Guaranteed 5G/4G connectivity in Australia, New Zealand, Fiji, and Pacific islands with top tier carriers.',
  },
  aukus: {
    es: 'Australia, Reino Unido y EE.UU. unidos en una sola eSIM. Cobertura directa 5G de alta velocidad en las 3 potencias aliadas.',
    en: 'Australia, United Kingdom, and USA united on a single eSIM profile. Top tier 5G connectivity across all 3 alliance nations.',
  },
  'china-hk-macau': {
    es: 'Navega en China Continental, Hong Kong y Macao sin bloqueos. Conexión directa a WhatsApp, Google, Instagram y YouTube sin necesidad de instalar VPN.',
    en: 'Connect seamlessly in Mainland China, Hong Kong, and Macau without censorship. Direct access to WhatsApp, Google, Instagram, and YouTube with zero VPN needed.',
  },
  'east-asia': {
    es: 'Conexión 5G ultra rápida en Japón, Corea del Sur y Taiwán. Ideal para viajes multilaterales por Asia Oriental.',
    en: 'Ultra fast 5G connectivity across Japan, South Korea, and Taiwan. Ideal for multi-destination trips in East Asia.',
  },
  'southeast-asia': {
    es: 'Recorre Tailandia, Malasia, Singapur, Indonesia, Vietnam y Filipinas con una sola eSIM y cobertura instantánea en todas las fronteras.',
    en: 'Explore Thailand, Malaysia, Singapore, Indonesia, Vietnam, and Philippines on a single eSIM profile with instant cross-border data.',
  },
};

export default function RegionPage() {
  const routeParams = useParams();
  const regionKey = (routeParams?.iso || 'europe').toLowerCase();

  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [plans, setPlans] = useState([]);

  const syncPreferences = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');
    setCurrency(localStorage.getItem('mesim_curr') || 'EUR');
  };

  useEffect(() => {
    syncPreferences();

    const handleCurrencyChange = () => syncPreferences();
    const handleLangChange = () => syncPreferences();

    window.addEventListener('mesim_currency_changed', handleCurrencyChange);
    window.addEventListener('mesim_lang_changed', handleLangChange);

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
    };
  }, []);

  const t = getTranslation(lang);
  const regionName = getRegionName(regionKey, lang);
  const regionDesc = REGION_DESCRIPTIONS[regionKey] ? REGION_DESCRIPTIONS[regionKey][lang] : '';
  const heroImage = REGION_HERO_IMAGES[regionKey] || REGION_HERO_IMAGES.europe;

  // Filter countries belonging to this region
  let regionCountries = [];
  if (regionKey === 'aukus') {
    regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['au', 'gb', 'us'].includes(c.iso));
  } else if (regionKey === 'china-hk-macau') {
    regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['cn', 'hk', 'mo'].includes(c.iso));
  } else if (regionKey === 'east-asia') {
    regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['jp', 'kr', 'tw'].includes(c.iso));
  } else if (regionKey === 'southeast-asia') {
    regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['th', 'my', 'sg', 'id', 'vn', 'ph', 'kh', 'la', 'mm'].includes(c.iso));
  } else {
    regionCountries = ALL_WORLD_COUNTRIES.filter((c) => c.region === regionKey);
  }

  // Find cheapest price in this region
  const minPriceEur = regionCountries.reduce((min, c) => Math.min(min, c.baseEur || 4.90), 4.90);
  const displayMinPrice = convertCurrency(minPriceEur, currency, rates);

  return (
    <div className="container-naked">
      {/* Breadcrumb Navigation */}
      <div className="pt-4 mb-4 flex items-center gap-2 text-xs font-semibold text-zinc-500 font-sans">
        <Link href="/" className="hover:text-black transition-colors">
          {lang === 'en' ? 'Home' : 'Inicio'}
        </Link>
        <span>/</span>
        <Link href="/destinations" className="hover:text-black transition-colors">
          {lang === 'en' ? 'Regions' : 'Regiones'}
        </Link>
        <span>/</span>
        <span className="text-black font-bold capitalize">{regionName}</span>
      </div>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 text-white mb-10 shadow-2xl border border-zinc-800">
        <img
          src={heroImage}
          alt={regionName}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-75 filter brightness-95 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25"></div>

        <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-3xl">
          <span className="bg-[#ffec00] text-black text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm">
            ⚡ {lang === 'en' ? 'Regional eSIM Hub' : 'eSIM Cobertura Regional Multi-País'}
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight mb-3 text-white leading-tight">
            {lang === 'en' ? `eSIM for ${regionName}` : `eSIM para viajar a ${regionName}`}
          </h1>

          <p className="text-zinc-100 font-sans text-base sm:text-lg md:text-xl font-medium leading-relaxed mb-8">
            {regionDesc}
          </p>

          {/* Option A: Regional All-in-One eSIM Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-[#ffec00] uppercase tracking-wider block mb-0.5">
                {lang === 'en' ? 'Multi-Country eSIM' : 'Plan Global Multipaís'}
              </span>
              <strong className="text-base sm:text-xl font-bold text-white block">
                {lang === 'en' ? `Full ${regionName} Pass (${regionCountries.length} Countries)` : `Pase Multipaís ${regionName} (${regionCountries.length} Países)`}
              </strong>
              <span className="text-xs text-zinc-300">
                {lang === 'en' ? 'One eSIM connects in all regional destinations' : 'Una sola instalación funciona en todos los países de la región'}
              </span>
            </div>

            <Link
              href={`/destination/${regionKey}`}
              className="w-full sm:w-auto bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-sans px-5 py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap border border-black/10 flex-shrink-0"
            >
              <span>{lang === 'en' ? 'View Regional Plan' : 'Ver Plan Regional'}</span> ➔
            </Link>
          </div>
        </div>
      </div>

      {/* Section Header for Country Selection */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-4">
          <div>
            <span className="text-xs font-bold font-sans tracking-widest text-zinc-500 uppercase block mb-1">
              /// {lang === 'en' ? `DESTINATIONS IN ${regionName.toUpperCase()}` : `DESTINOS EN ${regionName.toUpperCase()}`}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-sans text-black tracking-tight">
              {lang === 'en' ? `Select a country in ${regionName}` : `Selecciona un país en ${regionName}`}
            </h2>
            <p className="text-zinc-600 font-sans text-xs sm:text-base font-normal mt-1">
              {lang === 'en'
                ? `Prefer a single-country plan for your trip? Choose your target destination below from ${formatCurrency(displayMinPrice, currency)}.`
                : `¿Prefieres un plan enfocado solo a un país específico? Elige tu destino a continuación desde ${formatCurrency(displayMinPrice, currency)}.`}
            </p>
          </div>

          <span className="bg-zinc-200 text-black text-xs font-bold px-3 py-1 rounded-full uppercase font-sans">
            {regionCountries.length} {lang === 'en' ? 'Countries' : 'Países'}
          </span>
        </div>
      </div>

      {/* Grid of Individual Country Cards in this Region */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {regionCountries.map((c) => {
          const matchingPlan = plans.find((p) => (p.iso || '').toLowerCase() === c.iso);
          const safePrice = matchingPlan ? matchingPlan.priceEur : (c.baseEur || 4.90);

          return (
            <CountryCard
              key={c.iso}
              iso={c.iso}
              countryName={getCountryName(c.iso, lang, c.nameEs)}
              priceEur={safePrice}
              lang={lang}
              currency={currency}
              rates={rates}
            />
          );
        })}
      </div>

      {/* Interactive FAQ Section */}
      <FaqSection />
    </div>
  );
}
