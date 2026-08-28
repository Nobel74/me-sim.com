'use client';

import { useRouter } from 'next/navigation';
import { ALL_WORLD_COUNTRIES, getTranslation, getCountryName } from '../lib/i18n';
import { convertCurrency, formatCurrency } from '../lib/currency';

export default function RegionModal({ regionData, onClose, lang = 'es', currency = 'EUR', rates = {} }) {
  const router = useRouter();
  if (!regionData) return null;

  const t = getTranslation(lang);
  const title = lang === 'en' ? regionData.nameEn : regionData.nameEs;

  // Filter countries belonging to this region key
  const regionCountries = ALL_WORLD_COUNTRIES.filter(
    (c) => c.region === regionData.iso || c.region === (regionData.iso === 'middle-east' ? 'middle-east' : regionData.iso)
  );

  const handleSelectRegionalPlan = () => {
    onClose();
    router.push(`/destination/${regionData.iso}`);
  };

  const handleSelectCountry = (iso) => {
    onClose();
    router.push(`/destination/${iso}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-zinc-900 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffec00] text-black font-bold text-xs flex items-center justify-center uppercase shadow-md flex-shrink-0">
              {regionData.iso.slice(0, 3)}
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-[#ffec00] tracking-widest block">
                {lang === 'en' ? 'Select Destination in' : 'Selecciona Destino en'}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-sans text-white leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-base font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body with 2 Options */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* OPTION 1: Full Region Multi-Country Plan */}
          <div
            onClick={handleSelectRegionalPlan}
            className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-4 sm:p-5 rounded-2xl border border-zinc-700 hover:border-[#ffec00] cursor-pointer transition-all shadow-md group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffec00]/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="bg-[#ffec00] text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <svg className="w-3 h-3 fill-current text-black flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                <span>{lang === 'en' ? 'All-in-One Multi-Country' : 'Plan Regional Multipaís'}</span>
              </span>
              <span className="text-xs font-bold text-zinc-300">
                {regionData.badgeEs}
              </span>
            </div>

            <h4 className="text-lg sm:text-xl font-bold text-white mb-1 group-hover:text-[#ffec00] transition-colors">
              {lang === 'en' ? `Full ${title} eSIM Plan` : `eSIM Multipaís ${title}`}
            </h4>
            <p className="text-xs sm:text-sm text-zinc-300 mb-3 font-normal">
              {regionData.descEs}
            </p>

            <div className="flex justify-between items-center pt-2 border-t border-zinc-700/80">
              <span className="text-xs font-bold text-zinc-300">
                {lang === 'en' ? 'Includes all regional countries' : 'Cubre todos los países de la región'}
              </span>
              <button className="bg-[#ffec00] hover:bg-yellow-300 text-black text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1">
                <span>{lang === 'en' ? 'View Regional Plan' : 'Ver Plan Regional'}</span> ➔
              </button>
            </div>
          </div>

          {/* OPTION 2: Individual Country Selection inside Region */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase mb-3 px-1 flex items-center justify-between">
              <span>{lang === 'en' ? `Individual Countries in ${title}` : `Países y Destinos de ${title}`}</span>
              <span className="text-zinc-400 font-semibold">{regionCountries.length} {lang === 'en' ? 'destinations' : 'destinos'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {regionCountries.map((c) => {
                const cName = getCountryName(c.iso, lang, c.nameEs);
                const displayPrice = convertCurrency(c.baseEur || 4.90, currency, rates);

                return (
                  <div
                    key={c.iso}
                    onClick={() => handleSelectCountry(c.iso)}
                    className="bg-zinc-50 hover:bg-[#ffec00]/15 border border-zinc-200 hover:border-black p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`/flags/${c.iso}.webp`}
                        alt={cName}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200 shadow-2xs flex-shrink-0"
                        onError={(e) => {
                          e.target.src = '/flags/gl.webp';
                        }}
                      />
                      <span className="font-bold text-sm text-black group-hover:text-black">
                        {cName}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-zinc-500 font-condensed">
                      {t.fromPrice} <strong className="text-black font-bold text-sm ml-0.5">{formatCurrency(displayPrice, currency)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
