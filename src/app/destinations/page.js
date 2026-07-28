'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTranslation, ALL_WORLD_COUNTRIES, getRegionName } from '../../lib/i18n';
import CountryCard from '../../components/CountryCard';

export default function AllDestinationsPage() {
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({ EUR: 1, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

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

    return () => {
      window.removeEventListener('mesim_currency_changed', handleCurrencyChange);
      window.removeEventListener('mesim_lang_changed', handleLangChange);
    };
  }, []);

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
  ];

  const regions = regionKeys.map((key) => ({
    key,
    label: getRegionName(key, lang),
  }));

  const filteredCountries = ALL_WORLD_COUNTRIES.filter((country) => {
    const query = searchTerm.toLowerCase().trim();
    const name = lang === 'en' ? country.nameEn : country.nameEs;

    const matchesSearch =
      !query ||
      name.toLowerCase().includes(query) ||
      country.iso.toLowerCase().includes(query) ||
      country.nameEs.toLowerCase().includes(query) ||
      country.nameEn.toLowerCase().includes(query);

    const matchesRegion = selectedRegion === 'all' || country.region === selectedRegion;

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

      {/* Soft & Elegant Hero Banner */}
      <div className="bg-gradient-to-br from-zinc-100 via-white to-[#ffec00]/15 text-black rounded-3xl p-8 md:p-12 mb-10 shadow-xl relative border border-zinc-200/80 overflow-visible">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#ffec00]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-20">
          <span className="bg-[#ffec00] text-black text-xs font-semibold font-condensed tracking-widest px-3.5 py-1.5 rounded-full uppercase mb-4 inline-block shadow-xs border border-black/10">
            🌍 {lang === 'en' ? '198 Destinations Covered' : '198 Países Cobertura Total'}
          </span>

          <h1 className="text-3xl md:text-5xl font-semibold font-semi mb-3 text-black leading-tight">
            {t.allDestinationsTitle}
          </h1>
          <p className="text-zinc-600 text-base md:text-xl max-w-2xl font-normal">
            {t.allDestinationsSubtitle}
          </p>

          <div className="mt-8 max-w-xl">
            <div className="flex items-center bg-white rounded-full p-2 pl-6 shadow-xl border border-zinc-300">
              <svg
                className="w-6 h-6 text-black mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full text-black font-semibold text-base outline-none bg-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-zinc-400 hover:text-black px-3 font-semibold text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Region Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {regions.map((reg) => (
          <button
            key={reg.key}
            onClick={() => setSelectedRegion(reg.key)}
            className={`px-5 py-2.5 rounded-xl font-semibold font-condensed text-base whitespace-nowrap transition-all shadow-sm ${
              selectedRegion === reg.key
                ? 'bg-black text-[#ffec00] shadow-md'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
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
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 landscape:grid-cols-2 sm:landscape:grid-cols-3 lg:landscape:grid-cols-3 xl:landscape:grid-cols-4 gap-4 sm:gap-5 mb-16">
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
