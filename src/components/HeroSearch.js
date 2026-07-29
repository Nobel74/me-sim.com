'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation, getCountryName, ALL_WORLD_COUNTRIES } from '../lib/i18n';
import { convertCurrency, formatCurrency } from '../lib/currency';
import { matchesCountryQuery } from '../lib/searchUtils';

const COUNTRY_ALIASES = {
  fr: ['francia', 'france', 'fr'],
  es: ['españa', 'spain', 'espanha', 'spanien', 'es'],
  us: ['estados unidos', 'united states', 'usa', 'eeuu', 'ee.uu.', 'us'],
  cn: ['china', 'cn'],
  it: ['italia', 'italy', 'it'],
  tr: ['turquia', 'turquía', 'turkey', 'tr'],
  mx: ['mexico', 'méxico', 'mx'],
  th: ['tailandia', 'thailand', 'th'],
  de: ['alemania', 'germany', 'deutschland', 'de'],
  gb: ['reino unido', 'united kingdom', 'uk', 'england', 'inglaterra', 'gb'],
  jp: ['japon', 'japón', 'japan', 'jp'],
  at: ['austria', 'at'],
  gr: ['grecian', 'grecia', 'greece', 'gr'],
  my: ['malasia', 'malaysia', 'my'],
  ae: ['emiratos arabes', 'emiratos árabes unidos', 'dubai', 'dubái', 'uae', 'ae'],
  sa: ['arabia saudita', 'saudi arabia', 'sa'],
  pt: ['portugal', 'pt'],
  ca: ['canada', 'canadá', 'ca'],
  pl: ['polonia', 'poland', 'pl'],
  nl: ['paises bajos', 'países bajos', 'netherlands', 'holland', 'holanda', 'nl'],
  in: ['india', 'in'],
  hr: ['croacia', 'croatia', 'hr'],
  hu: ['hungria', 'hungría', 'hungary', 'hu'],
  kr: ['corea del sur', 'south korea', 'korea', 'kr'],
  vn: ['vietnam', 'viet nam', 'vn'],
  ma: ['marruecos', 'morocco', 'ma'],
  ch: ['suiza', 'switzerland', 'schweiz', 'ch'],
  sg: ['singapur', 'singapore', 'sg'],
  id: ['indonesia', 'id'],
  eg: ['egipto', 'egypt', 'eg'],
};

const PREFERRED_ISO_ORDER = [
  'fr', 'es', 'us', 'cn', 'it', 'tr', 'mx', 'th', 'de', 'gb',
  'jp', 'at', 'gr', 'my', 'ae', 'sa', 'pt', 'ca', 'pl', 'nl',
  'in', 'hr', 'hu', 'kr', 'vn', 'ma', 'ch', 'sg', 'id', 'eg'
];

export default function HeroSearch({ lang = 'es', currency = 'EUR', rates = {}, plans = [] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const t = getTranslation(lang);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (iso) => {
    setIsOpen(false);
    router.push(`/destination/${iso}`);
  };

  const popularDestinations = PREFERRED_ISO_ORDER.map((iso) => {
    const matchingPlans = plans.filter((p) => (p.iso || '').toLowerCase() === iso);
    const minPrice = Math.min(...matchingPlans.map((p) => p.priceEur));
    const safePrice = isFinite(minPrice) ? minPrice : 2.90;
    return { iso, priceEur: safePrice };
  });

  const searchSuggestions = searchTerm.trim()
    ? ALL_WORLD_COUNTRIES
        .filter((country) => matchesCountryQuery(country.iso, searchTerm, lang, COUNTRY_ALIASES))
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

  return (
    <div ref={searchContainerRef} className="mt-6 md:mt-8 max-w-2xl w-full relative z-50">
      <div
        className={`flex items-center bg-white rounded-full p-1 sm:p-1.5 pl-2.5 sm:pl-6 shadow-2xl border-2 transition-all ${
          isOpen ? 'border-[#ffec00] ring-4 ring-[#ffec00]/30' : 'border-white/20 hover:border-[#ffec00]'
        }`}
      >
        <svg
          className="w-4 h-4 sm:w-6 sm:h-6 text-black flex-shrink-0 mr-1.5 sm:mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
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
          className="w-full text-black font-semibold text-sm sm:text-lg outline-none bg-transparent placeholder-zinc-400 font-sans"
        />

        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(true);
            }}
            className="text-zinc-400 hover:text-black px-1.5 font-semibold text-sm sm:text-base font-sans"
          >
            ✕
          </button>
        )}

        <button
          onClick={() => setIsOpen(false)}
          className="bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-condensed tracking-wider uppercase px-4 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-lg shadow-md transition-all flex-shrink-0 ml-1.5 sm:ml-2 border border-black/10"
        >
          {t.searchButton}
        </button>
      </div>

      {/* Dropdown Menu Floating Layer */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-zinc-200 p-3 sm:p-4 text-black overflow-hidden z-50 transition-all max-h-80 sm:max-h-96 overflow-y-auto scrollbar-thin animate-scale-in">
          {!searchTerm.trim() ? (
            <div>
              <h4 className="text-xs font-semibold font-condensed tracking-wider text-zinc-400 uppercase mb-3 px-3">
                {t.popularDestinations}
              </h4>
              <div className="space-y-1">
                {popularDestinations.map((dest) => {
                  const name = getCountryName(dest.iso, lang);
                  const displayPrice = convertCurrency(dest.priceEur, currency, rates);

                  return (
                    <div
                      key={dest.iso}
                      onClick={() => handleNavigate(dest.iso)}
                      className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl hover:bg-[#ffec00]/20 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5">
                        <img
                          src={`/flags/${dest.iso}.webp`}
                          alt={name}
                          className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-zinc-200 shadow-sm"
                        />
                        <span className="font-semibold font-semi text-black text-sm sm:text-lg">
                          {name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 font-condensed">
                        {t.fromPrice} <strong className="text-black text-sm sm:text-base font-semibold font-condensed ml-1">{formatCurrency(displayPrice, currency)}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-semibold font-condensed tracking-wider text-zinc-400 uppercase mb-3 px-3">
                RESULTADOS PARA &quot;{searchTerm.toUpperCase()}&quot;
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
                            src={`/flags/${item.iso}.webp`}
                            alt={item.countryName}
                            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-zinc-200 shadow-sm"
                            onError={(e) => {
                              e.target.src = '/flags/gl.webp';
                            }}
                          />
                          <div>
                            <span className="font-semibold font-semi text-black text-sm sm:text-lg block">
                              {item.countryName}
                            </span>
                          </div>
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
      )}
    </div>
  );
}
