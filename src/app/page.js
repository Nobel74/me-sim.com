'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTranslation, getCountryName } from '../lib/i18n';
import { formatCurrency, convertCurrency } from '../lib/currency';
import HeroSearch from '../components/HeroSearch';
import CountryCard from '../components/CountryCard';
import RegionCard from '../components/RegionCard';
import ModeSwitcher from '../components/ModeSwitcher';
import RegionModal from '../components/RegionModal';
import FaqSection from '../components/FaqSection';

const PREFERRED_ISO_ORDER = [
  'fr', 'es', 'us', 'cn', 'it', 'tr', 'mx', 'th', 'de', 'gb',
  'jp', 'at', 'gr', 'my', 'ae', 'sa', 'pt', 'ca', 'pl', 'nl',
  'in', 'hr', 'hu', 'kr', 'vn', 'ma', 'ch', 'sg', 'id', 'eg'
];

const REGION_CARDS_DATA = [
  {
    iso: 'europe',
    nameEs: 'Europa',
    nameEn: 'Europe',
    descEs: 'De Lisboa a Helsinki en un solo plan',
    descEn: 'One eSIM from Lisbon to Helsinki',
    badgeEs: '35+ países',
    badgeEn: '35+ countries',
    priceEur: 4.90,
    flags: ['es', 'fr', 'it', 'de'],
    extraCount: '+31',
  },
  {
    iso: 'asia',
    nameEs: 'Asia',
    nameEn: 'Asia',
    descEs: 'De Tokio a Bangkok en una sola eSIM',
    descEn: 'Tokyo to Bangkok on a single plan',
    badgeEs: '18 países',
    badgeEn: '18 countries',
    priceEur: 5.90,
    flags: ['jp', 'th', 'vn', 'kr'],
    extraCount: '+14',
  },
  {
    iso: 'middle-east',
    nameEs: 'Oriente Medio (GCC)',
    nameEn: 'Gulf (GCC)',
    descEs: 'Todos los estados del Golfo en una eSIM',
    descEn: 'All Gulf states, one eSIM',
    badgeEs: '12 países',
    badgeEn: '12 countries',
    priceEur: 5.90,
    flags: ['ae', 'sa', 'eg'],
    extraCount: '+9',
  },
  {
    iso: 'north-america',
    nameEs: 'Norteamérica',
    nameEn: 'North America',
    descEs: 'EE.UU., Canadá y México conectados',
    descEn: 'USA, Canada & Mexico, connected',
    badgeEs: '3 países',
    badgeEn: '3 countries',
    priceEur: 4.90,
    flags: ['us', 'ca', 'mx'],
    extraCount: '+0',
  },
  {
    iso: 'south-america',
    nameEs: 'Sudamérica',
    nameEn: 'South America',
    descEs: 'Una sola eSIM para más de 14 destinos',
    descEn: 'One eSIM across 14 destinations',
    badgeEs: '14 países',
    badgeEn: '14 countries',
    priceEur: 6.90,
    flags: ['br', 'ar', 'co', 'cl'],
    extraCount: '+10',
  },
  {
    iso: 'caribbean',
    nameEs: 'Caribe',
    nameEn: 'Caribbean',
    descEs: 'Explora todas las islas sin cambiar de SIM',
    descEn: 'Explore all islands, no SIM swapping',
    badgeEs: '16 islas',
    badgeEn: '16 islands',
    priceEur: 6.90,
    flags: ['aw', 'cw', 'jm'],
    extraCount: '+13',
  },
  {
    iso: 'africa',
    nameEs: 'África',
    nameEn: 'Africa',
    descEs: 'De El Cairo a Ciudad del Cabo, cubierto',
    descEn: 'Cairo to Cape Town, covered',
    badgeEs: '26 países',
    badgeEn: '26 countries',
    priceEur: 7.90,
    flags: ['ma', 'eg', 'ke', 'et'],
    extraCount: '+22',
  },
  {
    iso: 'oceania',
    nameEs: 'Australia & Nueva Zelanda',
    nameEn: 'Australia & New Zealand',
    descEs: 'Conexión total en el Pacífico',
    descEn: 'Total connectivity across the Pacific',
    badgeEs: '8 países',
    badgeEn: '8 countries',
    priceEur: 5.90,
    flags: ['au', 'nz'],
    extraCount: '+6',
  },
  {
    iso: 'aukus',
    nameEs: 'Alianza AUKUS',
    nameEn: 'AUKUS Alliance',
    descEs: 'Australia, Reino Unido y EE.UU. en una sola eSIM',
    descEn: 'Australia, UK & USA on one single eSIM',
    badgeEs: '3 países',
    badgeEn: '3 countries',
    priceEur: 4.90,
    flags: ['au', 'gb', 'us'],
    extraCount: null,
  },
  {
    iso: 'china-hk-macau',
    nameEs: 'China + Hong Kong + Macao',
    nameEn: 'China + Hong Kong + Macau',
    descEs: 'Acceso total a Google, WhatsApp e Instagram sin VPN',
    descEn: 'Full access to Google, WhatsApp & IG with zero VPN needed',
    badgeEs: 'Sin Cortafuegos',
    badgeEn: 'No Firewall',
    priceEur: 4.90,
    flags: ['cn', 'hk', 'mo'],
    extraCount: null,
  },
  {
    iso: 'east-asia',
    nameEs: 'Japón, Corea & Taiwán',
    nameEn: 'Japan, S. Korea & Taiwan',
    descEs: 'Triángulo de alta tecnología en Asia Oriental',
    descEn: 'High-tech East Asia triangle connectivity',
    badgeEs: '3 países',
    badgeEn: '3 countries',
    priceEur: 5.90,
    flags: ['jp', 'kr', 'tw'],
    extraCount: null,
  },
  {
    iso: 'southeast-asia',
    nameEs: 'Sudeste Asiático (SEA)',
    nameEn: 'Southeast Asia (SEA)',
    descEs: 'Tailandia, Malasia, Singapur, Indonesia y Vietnam',
    descEn: 'Thailand, Malaysia, Singapore, Indonesia & Vietnam',
    badgeEs: '10 países',
    badgeEn: '10 countries',
    priceEur: 5.90,
    flags: ['th', 'my', 'sg', 'id', 'vn'],
    extraCount: '+5',
  },
  {
    iso: 'europe-morocco',
    nameEs: 'Europa + Marruecos',
    nameEn: 'Europe + Morocco',
    descEs: 'Toda la UE y Marruecos en una sola eSIM',
    descEn: 'All EU countries & Morocco on a single eSIM',
    badgeEs: '36+ países',
    badgeEn: '36+ countries',
    priceEur: 4.90,
    flags: ['es', 'fr', 'ma', 'de'],
    extraCount: '+32',
  },
  {
    iso: 'global',
    nameEs: 'Plan Global Multipaís',
    nameEn: 'Global Multi-Country Plan',
    descEs: 'Conectividad total en más de 85 países en una sola eSIM',
    descEn: 'Total connectivity across 85+ countries on a single eSIM',
    badgeEs: 'Mundial',
    badgeEn: 'Worldwide',
    priceEur: 9.90,
    flags: ['us', 'es', 'jp', 'gb'],
    extraCount: '+81',
  },
];

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

export default function HomePage() {
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState('local');
  const [heroBg, setHeroBg] = useState(HERO_RANDOM_BACKGROUNDS[0]);

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

  const getMinPriceDisplay = () => {
    if (!plans || plans.length === 0) return currency === 'EUR' ? '2.90 €' : '£2.89';
    const minEur = Math.min(...plans.map((p) => p.priceEur || p.price || 999));
    if (minEur === 999) return currency === 'EUR' ? '2.90 €' : '£2.89';
    const converted = convertCurrency(minEur, currency, rates);
    return formatCurrency(converted, currency);
  };

  const localPlansMap = new Map();
  plans.forEach((plan) => {
    if (plan.iso && !plan.is_region && !localPlansMap.has(plan.iso)) {
      localPlansMap.set(plan.iso, plan);
    }
  });

  const orderedLocalPlans = PREFERRED_ISO_ORDER
    .map((iso) => localPlansMap.get(iso))
    .filter(Boolean);

  const remainingLocalPlans = Array.from(localPlansMap.values()).filter(
    (plan) => !PREFERRED_ISO_ORDER.includes(plan.iso)
  );

  const filteredLocalPlans = [...orderedLocalPlans, ...remainingLocalPlans];

  return (
    <div className="container-naked">
      {/* Full Hero Header Design with Random Background Wallpapers */}
      <div className="relative rounded-3xl bg-zinc-900 text-white mb-12 shadow-2xl border border-zinc-800">
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <img
            src={heroBg.url}
            alt={lang === 'en' ? heroBg.nameEn : heroBg.nameEs}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75 filter brightness-95 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25"></div>
        </div>

        <div className="relative z-10 p-4 sm:p-10 md:p-12 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-3.5">
            <div className="bg-black/80 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold tracking-wide px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-sm leading-tight">
              <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5-2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>{lang === 'en' ? `Global Coverage (198+ Countries) • ${heroBg.nameEn}` : `Conectividad Global (198+ Países) • ${heroBg.nameEs}`}</span>
            </div>

            <span className="bg-[#ffec00] text-black text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block flex-shrink-0"></span>
              <span>{lang === 'en' ? 'Instant delivery • Activate in 180 days' : 'Entrega instantánea • Activa en 180 días'}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight mb-2.5 text-white leading-tight">
            {lang === 'en' ? 'eSIM for Travel Worldwide' : 'eSIM para Viajar por todo el Mundo'}
          </h1>

          <p className="text-zinc-100 font-sans text-sm sm:text-lg md:text-xl font-medium leading-relaxed mb-5">
            {lang === 'en'
              ? 'High-speed 4G/5G data from the second you land. Instant QR code delivery, zero roaming fees, no SIM swap.'
              : 'Datos de alta velocidad 4G/5G desde que aterrizas. Entrega de código QR instantánea, sin cargos de roaming y sin cambiar de SIM.'}
          </p>

          {/* Quick Search Bar */}
          <div className="mb-5 w-full">
            <HeroSearch lang={lang} currency={currency} rates={rates} plans={plans} />
          </div>

          {/* Glassmorphism Feature Highlight Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 sm:p-5 rounded-2xl flex flex-col items-center sm:items-stretch gap-3 shadow-xl w-full text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
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

            <div className="w-full">
              <strong className="text-base sm:text-xl md:text-2xl font-bold text-white block mb-2 leading-tight">
                {lang === 'en' ? 'High-Speed 4G/5G eSIM for 198+ Destinations' : 'eSIM 4G/5G Alta Velocidad para más de 198 Destinos'}
              </strong>

              <button
                onClick={() => {
                  const el = document.getElementById('catalog-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full sm:w-auto bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-sans px-5 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap border border-black/10 inline-flex mt-1 mb-1"
              >
                <span>{lang === 'en' ? 'Choose Data Plan' : 'Elegir Plan de Datos'}</span> ➔
              </button>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2.5 text-xs text-zinc-300 font-medium pt-2 border-t border-white/10 w-full">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 2h2v3h-2v-3zm3 3h3v3h-3v-3zm-3 2h2v2h-2v-2z" />
                </svg>
                {lang === 'en' ? 'QR in seconds' : 'QR en segundos'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                  <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-4c-2.21 0-4.21.9-5.66 2.34l1.42 1.42C8.9 16.63 10.37 16 12 16s3.1.63 4.24 1.76l1.42-1.42C16.21 14.9 14.21 14 12 14zm0-4c-3.87 0-7.37 1.57-9.9 4.1l1.42 1.42C5.76 13.27 8.68 12 12 12s6.24 1.27 8.48 3.52l1.42-1.42C19.37 11.57 15.87 10 12 10z" />
                </svg>
                {lang === 'en' ? 'Hotspot included' : 'Hotspot incluido'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 12c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
                {lang === 'en' ? 'WhatsApp intact' : 'WhatsApp intacto'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WHERE TO NEXT Header */}
      <div id="catalog-section" className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div className="w-full md:w-auto">
            <span className="text-xs font-semibold font-condensed tracking-widest text-black uppercase block mb-1">
              /// WHERE TO NEXT
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold font-semi text-black tracking-tight">
              {lang === 'en' ? 'Find your eSIM' : 'Encuentra tu eSIM'}
            </h2>
            <p className="text-zinc-600 font-sans text-sm md:text-base font-medium mt-1">
              {mode === 'local'
                ? (lang === 'en' ? 'Single-country plans for the spots our travelers reach for most.' : 'Planes por país individual para tus destinos más habituales.')
                : (lang === 'en' ? 'One plan that covers a whole region, for trips that cross borders.' : 'Un solo plan que cubre toda una región para viajes multi-país.')}
            </p>
          </div>

          <Link
            href="/destinations"
            className="w-full sm:w-auto text-center justify-center bg-[#ffec00] hover:bg-yellow-300 text-black border border-black/10 px-5 py-3 rounded-xl flex sm:inline-flex items-center gap-2 font-semibold font-condensed tracking-wide transition-all shadow-md hover:shadow-lg text-base flex-shrink-0"
          >
            {lang === 'en' ? 'See all 198 countries' : 'Ver los 198 países'} ➔
          </Link>
        </div>

        <ModeSwitcher mode={mode} setMode={setMode} lang={lang} />
      </div>

      {/* MODE 1: LOCAL */}
      {mode === 'local' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 landscape:grid-cols-2 sm:landscape:grid-cols-3 lg:landscape:grid-cols-3 xl:landscape:grid-cols-4 gap-4 sm:gap-5 mb-16">
          {filteredLocalPlans.map((plan) => (
            <CountryCard
              key={plan.id}
              iso={plan.iso}
              countryName={getCountryName(plan.iso, lang, plan.country)}
              priceEur={plan.priceEur}
              lang={lang}
              currency={currency}
              rates={rates}
            />
          ))}
        </div>
      )}

      {/* MODE 2: REGIONAL */}
      {mode === 'regional' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {REGION_CARDS_DATA.map((reg) => (
            <RegionCard
              key={reg.iso}
              regionData={reg}
              lang={lang}
              currency={currency}
              rates={rates}
            />
          ))}
        </div>
      )}

      {/* Interactive FAQ Accordion */}
      <FaqSection />
    </div>
  );
}
