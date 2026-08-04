'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getTranslation, getCountryName, getRegionName, ALL_WORLD_COUNTRIES } from '../../../lib/i18n';
import { convertCurrency, formatCurrency } from '../../../lib/currency';
import FixedPlanList from '../../../components/FixedPlanList';
import SingleCalendar from '../../../components/SingleCalendar';
import CompatibilityModal from '../../../components/CompatibilityModal';
import SeoMeta from '../../../components/SeoMeta';

const DESTINATION_IMAGES = {
  es: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=1000&auto=format&fit=crop',
  us: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1000&auto=format&fit=crop',
  tr: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1000&auto=format&fit=crop',
  gb: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1000&auto=format&fit=crop',
  fr: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop',
  it: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1000&auto=format&fit=crop',
  jp: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  ae: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
  au: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=1000&auto=format&fit=crop',
  cn: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1000&auto=format&fit=crop',
  at: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=1000&auto=format&fit=crop',
  th: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1000&auto=format&fit=crop',
  de: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1000&auto=format&fit=crop',
  mx: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?q=80&w=1000&auto=format&fit=crop',
  europe: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1000&auto=format&fit=crop',
  asia: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'middle-east': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
};

const DESTINATION_LOCATIONS = {
  es: 'Gran Vía, Madrid',
  us: 'Times Square, New York',
  fr: 'Tour Eiffel, Paris',
  it: 'Colosseo, Roma',
  gb: 'Big Ben, London',
  tr: 'Hagia Sophia, Istanbul',
  jp: 'Shibuya, Tokyo',
  ae: 'Burj Khalifa, Dubai',
  au: 'Opera House, Sydney',
  cn: 'Gran Muralla, Pekín',
  at: 'Ópera de Viena, Austria',
  th: 'Gran Palacio, Bangkok',
  de: 'Puerta de Brandeburgo, Berlín',
  mx: 'Chichén Itzá, México',
  europe: 'Lisboa a Helsinki',
  asia: 'Tokio a Bangkok',
  'middle-east': 'Dubai a Riyadh',
};

const ISO_SEARCH_KEYS = {
  jp: ['jp', 'japon', 'japón', 'japan'],
  es: ['es', 'españa', 'spain', 'espanha'],
  us: ['us', 'estados unidos', 'united states', 'usa'],
  tr: ['tr', 'turquia', 'turquía', 'turkey'],
  fr: ['fr', 'francia', 'france'],
  it: ['it', 'italia', 'italy'],
  gb: ['gb', 'reino unido', 'united kingdom', 'uk', 'england'],
  de: ['de', 'alemania', 'germany'],
  cn: ['cn', 'china'],
  mx: ['mx', 'mexico', 'méxico'],
  th: ['th', 'tailandia', 'thailand'],
  ae: ['ae', 'emiratos arabes', 'emiratos árabes unidos', 'uae', 'dubai'],
  au: ['au', 'australia'],
};

export default function DestinationPage() {
  const router = useRouter();
  const routeParams = useParams();
  const isoCode = (routeParams?.iso || 'es').toLowerCase();

  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'unlimited' ? 'unlimited' : 'fixed';

  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 6);
  nextWeek.setHours(0, 0, 0, 0);

  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(nextWeek);
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

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

    fetch(`/api/plans?country=${isoCode}&region=${isoCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.plans) {
          const searchKeys = ISO_SEARCH_KEYS[isoCode] || [isoCode];

          let exactIsoPlans = data.plans.filter((p) => (p.iso || '').toLowerCase() === isoCode);

          if (exactIsoPlans.length === 0) {
            exactIsoPlans = data.plans.filter((p) => {
              const pIso = (p.iso || p.isoCode || '').toLowerCase();
              const pCountry = (p.country || p.title || '').toLowerCase();
              const pRegion = (p.region || '').toLowerCase();
              return (
                pIso === isoCode ||
                pRegion === isoCode ||
                searchKeys.some((k) => pIso.includes(k) || pCountry.includes(k))
              );
            });
          }

          const uniqueMap = new Map();
          exactIsoPlans.forEach((p) => {
            const key = `${p.dataAmount}-${p.days}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, p);
            } else {
              const existing = uniqueMap.get(key);
              if (p.priceEur < existing.priceEur) {
                uniqueMap.set(key, p);
              }
            }
          });

          const finalPlans = Array.from(uniqueMap.values());
          setPlans(finalPlans.length > 0 ? finalPlans : data.plans);
          if (finalPlans.length > 0) {
            setSelectedPlanId(finalPlans[0].id);
          }
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('mesim_currency_changed', handleCurrencyChange);
      window.removeEventListener('mesim_lang_changed', handleLangChange);
    };
  }, [isoCode]);

  const handleDayClick = (dayDate) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(dayDate);
      setRangeEnd(null);
    } else if (rangeStart && !rangeEnd) {
      if (dayDate < rangeStart) {
        setRangeStart(dayDate);
        setRangeEnd(null);
      } else {
        setRangeEnd(dayDate);
      }
    }
  };

  const calculateTravelDays = () => {
    if (!rangeStart) return 1;
    const end = rangeEnd || rangeStart;
    const diffMs = end.getTime() - rangeStart.getTime();
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
  };

  const travelDays = calculateTravelDays();

  const calculateUnlimitedPriceEur = (days) => {
    if (days <= 1) return 4.90;
    if (days <= 3) return 11.90;
    if (days <= 5) return 17.90;
    if (days <= 7) return 22.90;
    if (days <= 10) return 29.90;
    if (days <= 15) return 39.90;
    if (days <= 20) return 49.90;
    if (days <= 30) return 59.90;
    return 59.90 + (days - 30) * 1.50;
  };

  const unlimitedPriceEur = calculateUnlimitedPriceEur(travelDays);

  const fixedPlans = plans.filter((p) => !p.isUnlimited);
  const countryName = getCountryName(isoCode, lang, plans[0]?.country || getRegionName(isoCode, lang));
  const minPriceEur = plans.reduce((min, p) => (p.priceEur < min ? p.priceEur : min), plans[0]?.priceEur || 2.90);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || fixedPlans[0];

  const handleAddToCartFixed = () => {
    if (!selectedPlan) return;
    const existingCart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
    const newItem = {
      ...selectedPlan,
      title: selectedPlan.days === 1
        ? `eSIM ${countryName} ${selectedPlan.dataAmount}`
        : `eSIM ${countryName} ${selectedPlan.dataAmount} ${selectedPlan.days}Days`,
      country: countryName,
      cartId: Date.now(),
      convertedPrice: convertCurrency(selectedPlan.priceEur, currency, rates),
      currency: currency,
    };
    existingCart.push(newItem);
    localStorage.setItem('mesim_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('mesim_cart_changed'));
    router.push('/cart');
  };

  const handleAddToCartUnlimited = () => {
    const existingCart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
    const newItem = {
      id: `${isoCode}-unlimited-${travelDays}d`,
      title: `eSIM ${countryName} ${t.unlimitedData} ${travelDays} ${lang === 'en' ? 'Days' : 'Días'}`,
      country: countryName,
      iso: isoCode,
      region: plans[0]?.region || 'europe',
      dataAmount: t.unlimitedData,
      days: travelDays,
      priceEur: unlimitedPriceEur,
      convertedPrice: convertCurrency(unlimitedPriceEur, currency, rates),
      currency: currency,
      isUnlimited: true,
      cartId: Date.now(),
    };
    existingCart.push(newItem);
    localStorage.setItem('mesim_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('mesim_cart_changed'));
    router.push('/cart');
  };

  const formattedMinPrice = formatCurrency(convertCurrency(minPriceEur, currency, rates), currency);
  const landmarkName = DESTINATION_LOCATIONS[isoCode] || countryName;

  const apiImage = plans.find((p) => p.image || p.imageUrl || p.bannerUrl)?.image || plans.find((p) => p.image || p.imageUrl || p.bannerUrl)?.imageUrl || plans.find((p) => p.image || p.imageUrl || p.bannerUrl)?.bannerUrl;
  const heroImage = apiImage || DESTINATION_IMAGES[isoCode] || DESTINATION_IMAGES.europe;

  const coverageCountries = (() => {
    // Check if isoCode represents a multi-country region zone
    let regionCountries = [];
    if (isoCode === 'aukus') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['au', 'gb', 'us'].includes(c.iso));
    } else if (isoCode === 'china-hk-macau') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['cn', 'hk', 'mo'].includes(c.iso));
    } else if (isoCode === 'east-asia') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['jp', 'kr', 'tw'].includes(c.iso));
    } else if (isoCode === 'southeast-asia') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['th', 'my', 'sg', 'id', 'vn', 'ph', 'kh', 'la', 'mm'].includes(c.iso));
    } else if (isoCode === 'europe-morocco') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => c.region === 'europe' || c.iso === 'ma');
    } else if (isoCode === 'australia-new-zealand') {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => ['au', 'nz'].includes(c.iso));
    } else {
      regionCountries = ALL_WORLD_COUNTRIES.filter((c) => c.region === isoCode);
    }
    
    if (regionCountries.length > 0) return regionCountries;

    // Single country destination
    const singleMatch = ALL_WORLD_COUNTRIES.find((c) => c.iso === isoCode);
    if (singleMatch) return [singleMatch];

    return [];
  })();

  const [infoTab, setInfoTab] = useState('features');
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `eSIM ${countryName} - ME-SIM`,
    "image": heroImage,
    "description": lang === 'en'
      ? `High-Speed mobile data connection in ${countryName}. Get unlimited data or fixed GB packages instantly.`
      : `Conexión de datos móviles de alta velocidad en ${countryName}. Consigue datos ilimitados o paquetes de gigas fijos al instante.`,
    "brand": {
      "@type": "Brand",
      "name": "ME-SIM"
    },
    "offers": {
      "@type": "Offer",
      "price": minPriceEur,
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock",
      "url": `https://me-sim.com/destination/${isoCode}`,
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "ES",
        "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
        "merchantReturnLink": lang === 'en'
          ? "https://me-sim.com/en/refund-policy"
          : "https://me-sim.com/politica-de-reembolso"
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": 0,
          "currency": "EUR"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "ES"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 0,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 0,
            "unitCode": "DAY"
          }
        }
      }
    }
  };

  return (
    <div className="container-naked max-w-5xl font-sans pb-16 space-y-12">
      <SeoMeta path={`/destination/${isoCode}`} schemaJson={productSchema} />
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span>{lang === 'en' ? 'Destinations' : 'Destino'}</span>
        <span>/</span>
        <span className="text-black font-semibold font-semi">{countryName}</span>
      </nav>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl bg-zinc-900 text-white shadow-2xl border border-zinc-800">
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <img
            src={heroImage}
            alt={countryName}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-75 filter brightness-95 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25"></div>
        </div>
        <div className="relative z-10 p-4 sm:p-10 md:p-12 w-full flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-3.5">
            <img
              src={isoCode === 'global' ? '/flags/global.gif' : `/flags/${isoCode}.webp`}
              alt={countryName}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/30 shadow-md flex-shrink-0"
            />
            <div className="bg-black/80 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold tracking-wide px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-sm leading-tight">
              <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5-2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>{landmarkName}</span>
            </div>
            <span className="bg-[#ffec00] text-black text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              🟢 {lang === 'en' ? 'Instant delivery • Activate within 180 days' : 'Entrega instantánea • Activa en 180 días'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight mb-2.5 text-white leading-tight">
            {lang === 'en' ? `eSIM for ${countryName}` : `eSIM para ${countryName}`}
          </h1>

          <p className="text-zinc-100 font-sans text-sm sm:text-lg md:text-xl font-medium leading-relaxed mb-5">
            {lang === 'en'
              ? `Fast 4G/5G data from the second you land. Plans for ${countryName} from ${formattedMinPrice} or Unlimited for your travel dates. No roaming, no SIM swap.`
              : `Datos de alta velocidad 4G/5G desde que aterrizas. Planes para ${countryName} desde ${formattedMinPrice} o Datos Ilimitados para las fechas de tu viaje. Sin roaming, sin cambiar de SIM.`}
          </p>

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
                {lang === 'en' ? `Plans from ${formattedMinPrice}` : `Planes desde ${formattedMinPrice}`}
              </span>
            </div>

            <div className="w-full">
              <strong className="text-base sm:text-xl md:text-2xl font-bold text-white block mb-2 leading-tight">
                {lang === 'en' ? `High-Speed 4G/5G eSIM for ${countryName}` : `eSIM 4G/5G Alta Velocidad para ${countryName}`}
              </strong>

              <button
                onClick={() => {
                  const el = document.getElementById('plan-selector-switch');
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
                  <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-4c-2.21 0-4.21.9-5.66 2.34l1.42 1.42C8.9 16.63 10.37 16 12 16s3.1.63 4.24 1.76l1.42-1.42C16.21 14.9 14.21 14 12 14zm0-4c-3.87 0-7.37 1.57-9.9 4.1l1.42 1.42C5.76 13.27 8.68 12 12 12s6.24 1.27 8.48 3.52l1.42-1.42C19.37 11.57 15.87 10 10 12v10z" />
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

      {/* Plan Selector Section */}
      <div id="plan-selector-switch" className="scroll-mt-24 w-full bg-white rounded-3xl border border-zinc-200 p-3.5 sm:p-6 md:p-8 shadow-2xl">
        <div className="flex bg-zinc-100 p-1 rounded-full mb-6 sm:mb-8 max-w-md mx-auto border border-zinc-200 gap-1 w-full">
          <button
            onClick={() => setActiveTab('fixed')}
            className={`flex-1 py-2 px-1.5 sm:py-2.5 sm:px-3 text-[11px] xs:text-xs sm:text-sm font-bold font-condensed tracking-tight sm:tracking-wider uppercase rounded-full transition-all whitespace-nowrap text-center ${
              activeTab === 'fixed' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-900 hover:text-black font-bold'
            }`}
          >
            {lang === 'en' ? 'Fixed plans' : 'Planes Fijos'} ({fixedPlans.length})
          </button>

          {/* Unlimited Data Tab */}
          <button
            onClick={() => setActiveTab('unlimited')}
            className={`flex-1 py-2 px-1.5 sm:py-2.5 sm:px-3 text-[11px] xs:text-xs sm:text-sm font-bold font-condensed tracking-tight sm:tracking-wider uppercase rounded-full transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-center ${
              activeTab === 'unlimited' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-900 hover:text-black font-bold'
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current flex-shrink-0 transition-colors ${
                activeTab === 'unlimited' ? 'text-[#ffec00]' : 'text-zinc-900 group-hover:text-black'
              }`}
              viewBox="0 0 24 24"
            >
              <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.96 9.17 8.15C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53L12 13.04l2.83 2.81c.97.97 2.33 1.53 3.77 1.53 2.98 0 5.4-2.42 5.4-5.38s-2.42-5.38-5.4-5.38zM5.4 15.38c-1.87 0-3.4-1.51-3.4-3.38s1.53-3.38 3.4-3.38c.9 0 1.76.35 2.38.97l2.22 2.2-2.22 2.21c-.62.62-1.48.98-2.38.98zm13.2 0c-.9 0-1.76-.35-2.38-.97L14 12.2l2.22-2.21c.62-.62 1.48-.98 2.38-.98 1.87 0 3.4 1.51 3.4 3.38s-1.53 3.39-3.4 3.39z" />
            </svg>
            <span>{t.unlimitedData}</span>
          </button>
        </div>

        {activeTab === 'fixed' && (
          <FixedPlanList
            fixedPlans={fixedPlans}
            selectedPlanId={selectedPlanId}
            setSelectedPlanId={setSelectedPlanId}
            lang={lang}
            currency={currency}
            rates={rates}
            selectedPlan={selectedPlan}
            handleAddToCartFixed={handleAddToCartFixed}
            onOpenCompatibility={() => setIsCompModalOpen(true)}
          />
        )}

        {activeTab === 'unlimited' && (
          <div className="max-w-2xl mx-auto">
            <SingleCalendar
              lang={lang}
              currency={currency}
              rates={rates}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              handleDayClick={handleDayClick}
              travelDays={travelDays}
              unlimitedPriceEur={unlimitedPriceEur}
              handleAddToCartUnlimited={handleAddToCartUnlimited}
              onOpenCompatibility={() => setIsCompModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Specifications Sub-Navigation Tabs Section (Key features, Description, Technical details, Coverage) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xl">
        <div className="flex border-b border-zinc-200 gap-6 sm:gap-8 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setInfoTab('features')}
            className={`pb-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap border-b-2 ${
              infoTab === 'features' ? 'border-[#ffec00] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {lang === 'en' ? 'Key features' : 'Características'}
          </button>
          <button
            onClick={() => setInfoTab('description')}
            className={`pb-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap border-b-2 ${
              infoTab === 'description' ? 'border-[#ffec00] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {lang === 'en' ? 'Description' : 'Descripción'}
          </button>
          <button
            onClick={() => setInfoTab('technical')}
            className={`pb-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap border-b-2 ${
              infoTab === 'technical' ? 'border-[#ffec00] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {lang === 'en' ? 'Technical details' : 'Detalles técnicos'}
          </button>
          <button
            onClick={() => setInfoTab('coverage')}
            className={`pb-3 font-bold text-sm sm:text-base transition-all whitespace-nowrap border-b-2 ${
              infoTab === 'coverage' ? 'border-[#ffec00] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {lang === 'en' ? 'Coverage' : 'Cobertura'}
          </button>
        </div>

        {/* Tab 1: Key Features */}
        {infoTab === 'features' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? 'Instant delivery' : 'Entrega instantánea'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? 'QR code by email and in your user dashboard, seconds after checkout.'
                    : 'Código QR enviado por email y disponible en tu panel de usuario inmediatamente tras el pago.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? 'Data only, drama free' : 'Solo datos, sin sorpresas'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? `Pure mobile data for ${countryName}. Your number and WhatsApp stay exactly as they are.`
                    : `Datos móviles de alta velocidad para ${countryName}. Tu número y tu cuenta de WhatsApp se mantienen intactos.`}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? 'Hotspot included' : 'Hotspot e internet compartido'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? 'Tether laptops, tablets, and companion devices without restrictions.'
                    : 'Comparte datos con tu portátil, tablet u otros dispositivos sin restricciones.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? 'Flexible activation' : 'Activación flexible'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? '180 days to activate after purchase. Validity starts on first connection.'
                    : 'Dispones de 180 días para activar tu eSIM tras la compra. El periodo de validez empieza al conectar en destino.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? 'Top up anytime' : 'Recarga fácil en 1 clic'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? 'Add data or extend your days in seconds directly from your customer account.'
                    : 'Añade más datos o amplia tus días en segundos directamente desde tu panel de usuario.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <span className="w-7 h-7 rounded-full bg-[#ffec00] text-black flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                ✓
              </span>
              <div>
                <h4 className="font-bold text-black text-lg mb-1">
                  {lang === 'en' ? '24/7 human support' : 'Soporte humano 24/7'}
                </h4>
                <p className="text-base text-zinc-600 leading-relaxed font-sans">
                  {lang === 'en'
                    ? 'Real human assistance around the clock via email and dashboard.'
                    : 'Atención al cliente por personas reales las 24 horas del día por email y desde la web.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Description */}
        {infoTab === 'description' && (
          <div className="space-y-4 text-base text-zinc-700 leading-relaxed font-sans">
            <p>
              {lang === 'en'
                ? `Traveling to ${countryName}? Connect seamlessly before you even land. The me-sim.com eSIM is a digital SIM card you install in minutes with a quick QR code scan, ensuring instant 4G/5G connection upon arrival.`
                : `¿Viajas a ${countryName}? Conéctate a internet desde el segundo en que aterrizas. La eSIM de me-sim.com es una tarjeta digital que instalas en 2 minutos escaneando un código QR, garantizando conexión 4G/5G de alta velocidad al instante.`}
            </p>
            <p>
              {lang === 'en'
                ? `Avoid airport SIM kiosks, long queues, and expensive roaming fees. Your eSIM arrives by email in seconds, installs easily on your smartphone, and activates automatically when connecting to local networks.`
                : `Olvídate de buscar tiendas físicas en el aeropuerto, hacer colas o pagar sorpresas en tu factura de roaming. Recibirás tu eSIM por email al instante y dispones de 180 días para activarla cuando empiece tu viaje.`}
            </p>
            <p>
              {lang === 'en'
                ? `Choose between flexible fixed data packages or Unlimited data for the exact duration of your stay. Stay connected with zero stress with me-sim.com.`
                : `Elige entre paquetes de datos fijos o Datos Ilimitados para la duración exacta de tu viaje. Navega sin límites y sin preocupaciones con la garantía de me-sim.com.`}
            </p>
          </div>
        )}

        {/* Tab 3: Technical Details */}
        {infoTab === 'technical' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Network speed:' : 'Velocidad de red:'}</span>
              <span className="text-zinc-600 font-mono">4G / LTE / 5G</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Plan type:' : 'Tipo de plan:'}</span>
              <span className="text-zinc-600 font-sans">{lang === 'en' ? 'Data only (no phone number required)' : 'Solo Datos (Mantiene tu número original)'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Delivery:' : 'Entrega:'}</span>
              <span className="text-zinc-600 font-sans">{lang === 'en' ? 'Instant via email & account' : 'Instantánea por email y panel'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Hotspot / Tethering:' : 'Hotspot / Compartir datos:'}</span>
              <span className="text-emerald-700 font-semibold">{lang === 'en' ? 'Yes, included' : 'Sí, incluido en todos los planes'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Activation window:' : 'Plazo de activación:'}</span>
              <span className="text-zinc-600 font-sans">{lang === 'en' ? '180 days from purchase' : '180 días desde la compra'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Validity start:' : 'Inicio de validez:'}</span>
              <span className="text-zinc-600 font-sans">{lang === 'en' ? 'On first connection in destination' : 'Al conectar a la red en destino'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'eKYC / Registration:' : 'Registro eKYC:'}</span>
              <span className="text-emerald-700 font-semibold">{lang === 'en' ? 'Not required' : 'No requerido'}</span>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex justify-between items-center">
              <span className="font-bold text-black">{lang === 'en' ? 'Top ups:' : 'Recargas:'}</span>
              <span className="text-zinc-600 font-sans">{lang === 'en' ? 'Available in account' : 'Disponible en tu cuenta'}</span>
            </div>
          </div>
        )}

        {/* Tab 4: Coverage */}
        {infoTab === 'coverage' && (
          <div className="space-y-5 text-base">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-bold text-black text-lg">
                {lang === 'en'
                  ? `Coverage locations included in this plan (${coverageCountries.length}):`
                  : `Países y territorios incluidos en este plan (${coverageCountries.length}):`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto pr-1 p-1">
              {coverageCountries.map((c) => (
                <span
                  key={c.iso}
                  className="bg-zinc-50 border border-zinc-200/90 hover:border-black/30 px-3.5 py-2 rounded-2xl font-medium text-black flex items-center gap-2.5 text-sm shadow-2xs transition-all hover:bg-white"
                >
                  <img
                    src={`/flags/${c.iso}.webp`}
                    alt={lang === 'en' ? c.nameEn : c.nameEs}
                    className="w-5 h-5 rounded-full object-cover shadow-2xs border border-zinc-200 flex-shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/flags/es.webp';
                    }}
                  />
                  <span>{lang === 'en' ? c.nameEn : c.nameEs}</span>
                </span>
              ))}
            </div>

            <p className="text-zinc-600 text-sm leading-relaxed pt-2 border-t border-zinc-100">
              {lang === 'en'
                ? 'Connects automatically to the strongest 4G LTE / 5G partner networks in each covered location with automatic APN configuration.'
                : 'Se conecta automáticamente a las redes asociadas 4G LTE / 5G de mayor cobertura en cada país cubierto con configuración APN automática.'}
            </p>
          </div>
        )}
      </div>

      {/* How to get an eSIM Section (3 Steps, Zero Stress) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-4 sm:p-10 shadow-xl text-center space-y-6 sm:space-y-8">
        <div>
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-zinc-500 font-condensed">
            {lang === 'en' ? 'THREE STEPS, ZERO STRESS' : 'TRES PASOS, CERO ESTRÉS'}
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight mt-1">
            {lang === 'en' ? `How to get an eSIM for ${countryName}` : `Cómo instalar tu eSIM para ${countryName}`}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
          {/* Step 1 */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-[#ffec00] font-bold flex items-center justify-center text-base shadow-md">
              1
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Choose your plan' : 'Elige tu plan'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `Pick a fixed data pack or Unlimited for your ${countryName} travel dates. Checkout takes about a minute.`
                : `Selecciona un plan fijo o Datos Ilimitados para los días de tu viaje a ${countryName}. El proceso dura 1 minuto.`}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-[#ffec00] font-bold flex items-center justify-center text-base shadow-md">
              2
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Scan the QR code' : 'Escanea el código QR'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? 'We email it instantly. Scan it in your phone settings and the eSIM installs itself. No shop, no queue.'
                : 'Te lo enviamos al instante por email. Escanéalo en los ajustes de tu móvil y la eSIM se instala sola.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-[#ffec00] font-bold flex items-center justify-center text-base shadow-md">
              3
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Land and connect' : 'Aterriza y navega'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `Turn on the eSIM line when you arrive in ${countryName}. Data starts flowing before baggage claim does.`
                : `Activa la línea eSIM al llegar a ${countryName}. Tendrás conexión antes incluso de recoger tu equipaje.`}
            </p>
          </div>
        </div>
      </div>

      {/* Why ME-SIM Section */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-4 sm:p-10 shadow-xl space-y-6 sm:space-y-8 text-center">
        <div>
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-zinc-500 font-condensed">
            {lang === 'en' ? 'WHY ME-SIM.COM' : 'POR QUÉ ME-SIM.COM'}
          </span>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight mt-1">
            {lang === 'en' ? `Why get a ME-SIM eSIM for ${countryName}` : `Por qué elegir una eSIM de ME-SIM para ${countryName}`}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
          {/* Card 1: Fast Online */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Online in about 2 minutes' : 'Conectado en 2 minutos'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `Buy, scan, done. Your ${countryName} eSIM installs faster than the seatbelt sign turns off, connecting automatically when you land.`
                : `Compra, escanea y listo. Tu eSIM para ${countryName} se instala antes de que se apague el aviso del cinturón y se conecta automáticamente al aterrizar.`}
            </p>
          </div>

          {/* Card 2: Flat prices */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Flat prices, zero surprises' : 'Precios fijos, cero sorpresas'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `From ${formattedMinPrice}, paid upfront. No roaming invoice waiting at home like a bad souvenir.`
                : `Desde ${formattedMinPrice}, pago único sin permanencia. Sin facturas de roaming sorpresivas al volver de tus vacaciones.`}
            </p>
          </div>

          {/* Card 3: Keep number */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Keep your own number' : 'Mantén tu número habitual'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `Your home SIM keeps handling calls and texts while me-sim.com carries the data. Two SIMs, one phone, no juggling.`
                : `Tu SIM habitual sigue recibiendo llamadas y mensajes mientras me-sim.com gestiona tus datos móviles. Dos SIMs, un solo móvil.`}
            </p>
          </div>

          {/* Card 4: Local 4G 5G */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.2c-.2.2-.2.51 0 .71.2.2.51.2.71 0l1.63-1.63C8.21 19.38 10.03 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Real local 4G and 5G' : 'Conexión 4G y 5G local real'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? `We put you on leading ${countryName} networks, the same ones locals use. Maps, calls, and videos, all at full speed.`
                : `Te conectamos directamente a las principales redes de ${countryName}, las mismas que usan los residentes. Mapas y vídeo a máxima velocidad.`}
            </p>
          </div>

          {/* Card 5: Top up */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Top up in seconds' : 'Recargas en segundos'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? 'Running low mid trip? Add data from your customer dashboard in a few taps. No store visits, no paperwork.'
                : '¿Te quedas sin datos durante el viaje? Añade más gigas desde tu panel de usuario en 1 clic. Sin visitar tiendas ni trámites.'}
            </p>
          </div>

          {/* Card 6: Support */}
          <div className="bg-zinc-50 p-5 sm:p-8 rounded-2xl border border-zinc-200 flex flex-col items-center sm:items-start space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center border border-blue-100 shadow-2xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-lg sm:text-xl">{lang === 'en' ? 'Humans on support, 24/7' : 'Soporte humano 24/7'}</h3>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-sans">
              {lang === 'en'
                ? 'Real people, around the clock, in the rare case something needs fixing. Average first reply is measured in minutes.'
                : 'Atención personalizada por personas reales las 24 horas del día. Respuestas rápidas en minutos para resolver cualquier duda.'}
            </p>
          </div>
        </div>
      </div>

      {/* Device Compatibility Modal */}
      <CompatibilityModal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
