'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTranslation, getCountryName } from '../lib/i18n';
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
];

export default function HomePage() {
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [plans, setPlans] = useState([]);
  const [mode, setMode] = useState('local');

  const [selectedRegionData, setSelectedRegionData] = useState(null);

  const t = getTranslation(lang);

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

  const getCheapestPlansPerCountry = () => {
    const matchedRaw = plans.filter((plan) => {
      const isRegionalPackage = plan.is_region || plan.title.toLowerCase().includes('multi-país');
      return !isRegionalPackage;
    });

    const mapByIso = new Map();

    matchedRaw.forEach((plan) => {
      const iso = (plan.iso || 'gl').toLowerCase();
      if (!mapByIso.has(iso)) {
        mapByIso.set(iso, plan);
      } else {
        const existing = mapByIso.get(iso);
        if (plan.priceEur < existing.priceEur) {
          mapByIso.set(iso, plan);
        }
      }
    });

    const uniqueCountryPlans = Array.from(mapByIso.values());

    return uniqueCountryPlans.sort((a, b) => {
      const aIso = (a.iso || '').toLowerCase();
      const bIso = (b.iso || '').toLowerCase();

      const aIndex = PREFERRED_ISO_ORDER.indexOf(aIso);
      const bIndex = PREFERRED_ISO_ORDER.indexOf(bIso);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      return a.country.localeCompare(b.country);
    });
  };

  const filteredLocalPlans = getCheapestPlansPerCountry();

  return (
    <div className="container-naked">
      {/* Unencapsulated Open Hero Section sitting seamlessly over ambient yellow glow */}
      <div className="pt-4 pb-14 mb-6">
        <span className="w-full sm:w-auto text-center justify-center bg-[#ffec00] text-black text-xs font-semibold font-condensed tracking-widest uppercase px-4 py-2 rounded-full inline-flex sm:inline-block mb-5 shadow-xs border border-black/10">
          ⚡ {lang === 'en' ? 'Instant Global Data' : 'Datos Móviles Instantáneos Sin Roaming'}
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold font-semi tracking-tight mb-4 text-black leading-[1.1]">
          {t.title}
        </h1>

        <p className="text-zinc-600 font-sans text-base md:text-xl max-w-2xl font-normal leading-relaxed mb-8">
          {t.subtitle}
        </p>

        <HeroSearch lang={lang} currency={currency} rates={rates} plans={plans} />
      </div>

      {/* WHERE TO NEXT Header */}
      <div className="mb-8">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
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
