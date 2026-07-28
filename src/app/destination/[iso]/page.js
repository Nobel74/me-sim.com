'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getTranslation, getCountryName, getRegionName } from '../../../lib/i18n';
import { convertCurrency, formatCurrency } from '../../../lib/currency';
import FixedPlanList from '../../../components/FixedPlanList';
import SingleCalendar from '../../../components/SingleCalendar';

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

  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState('fixed');
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
      title: `eSIM ${countryName} ${selectedPlan.dataAmount} ${selectedPlan.days}Days`,
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

  return (
    <div className="container-naked max-w-5xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span>{lang === 'en' ? 'Destinations' : 'Destino'}</span>
        <span>/</span>
        <span className="text-black font-semibold font-semi">{countryName}</span>
      </nav>

      {/* Hero Banner Section */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900 text-white mb-10 shadow-2xl border border-zinc-800">
        <img
          src={DESTINATION_IMAGES[isoCode] || DESTINATION_IMAGES.europe}
          alt={countryName}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-75 filter brightness-95 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25"></div>

        <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <img
              src={`/flags/${isoCode}.webp`}
              alt={countryName}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white/30 shadow-md flex-shrink-0"
            />
            <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold tracking-wide px-3.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-sm">
              <svg className="w-3.5 h-3.5 text-[#ffec00] fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span>{landmarkName}</span>
            </div>
            <span className="bg-[#ffec00] text-black text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              🟢 {lang === 'en' ? 'Instant delivery • Activate within 180 days' : 'Entrega instantánea • Activa en 180 días'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight mb-3 text-white leading-tight">
            {lang === 'en' ? `eSIM for ${countryName}` : `eSIM para ${countryName}`}
          </h1>

          <p className="text-zinc-100 font-sans text-base sm:text-lg md:text-xl font-medium leading-relaxed mb-6">
            {lang === 'en'
              ? `Fast 4G/5G data from the second you land. Plans for ${countryName} from ${formattedMinPrice} or Unlimited for your travel dates. No roaming, no SIM swap.`
              : `Datos de alta velocidad 4G/5G desde que aterrizas. Planes para ${countryName} desde ${formattedMinPrice} o Datos Ilimitados para las fechas de tu viaje. Sin roaming, sin cambiar de SIM.`}
          </p>

          {/* Glassmorphism Feature Highlight Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col gap-3.5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <span className="w-full sm:w-auto bg-[#ffec00] text-black text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-xs text-center flex items-center justify-center">
                ⚡ {lang === 'en' ? 'Best Local Value' : 'Mejor Cobertura Local'}
              </span>
              <span className="w-full sm:w-auto text-xs sm:text-sm text-white font-bold tracking-wide bg-black/60 px-3 py-1.5 rounded-full border border-white/10 shadow-xs text-center flex items-center justify-center">
                {lang === 'en' ? `Plans from ${formattedMinPrice}` : `Planes desde ${formattedMinPrice}`}
              </span>
            </div>

            <div>
              <strong className="text-lg sm:text-xl md:text-2xl font-bold text-white block mb-2 leading-tight">
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
                  <path d="M12 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-4c-2.21 0-4.21.9-5.66 2.34l1.42 1.42C8.9 16.63 10.37 16 12 16s3.1.63 4.24 1.76l1.42-1.42C16.21 14.9 14.21 14 12 14zm0-4c-3.87 0-7.37 1.57-9.9 4.1l1.42 1.42C5.76 13.27 8.68 12 12 12s6.24 1.27 8.48 3.52l1.42-1.42C19.37 11.57 15.87 10 12 10z" />
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

      {/* Plan Selector Section */}
      <div id="plan-selector-switch" className="scroll-mt-24 w-full bg-white rounded-3xl border border-zinc-200 p-3.5 sm:p-6 md:p-8 shadow-2xl">
        <div className="flex bg-zinc-100 p-1 sm:p-1.5 rounded-full mb-6 sm:mb-8 max-w-md mx-auto border border-zinc-200 gap-1">
          <button
            onClick={() => setActiveTab('fixed')}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold font-condensed tracking-wider uppercase rounded-full transition-all whitespace-nowrap text-center ${
              activeTab === 'fixed' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-900 hover:text-black font-bold'
            }`}
          >
            {lang === 'en' ? 'Fixed plans' : 'Planes Fijos'} ({fixedPlans.length})
          </button>

          {/* Unlimited Data Tab */}
          <button
            onClick={() => setActiveTab('unlimited')}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold font-condensed tracking-wider uppercase rounded-full transition-all flex items-center justify-center gap-1.5 whitespace-nowrap text-center ${
              activeTab === 'unlimited' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-900 hover:text-black font-bold'
            }`}
          >
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 fill-current flex-shrink-0 transition-colors ${
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
            />
          </div>
        )}
      </div>
    </div>
  );
}
