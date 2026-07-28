'use client';

import { useRouter } from 'next/navigation';
import { getTranslation } from '../lib/i18n';
import { convertCurrency, formatCurrency } from '../lib/currency';

export default function RegionCard({ regionData, lang = 'es', currency = 'EUR', rates = {} }) {
  const router = useRouter();
  const t = getTranslation(lang);

  const displayPrice = convertCurrency(regionData.priceEur, currency, rates);
  const title = lang === 'en' ? regionData.nameEn : regionData.nameEs;
  const desc = lang === 'en' ? regionData.descEn : regionData.descEs;
  const badge = lang === 'en' ? regionData.badgeEn : regionData.badgeEs;

  return (
    <div
      onClick={() => router.push(`/destination/${regionData.iso}`)}
      aria-label={`eSIM ${title}`}
      className="bg-white rounded-3xl border border-zinc-200 hover:border-black p-3.5 sm:p-5 flex flex-col justify-between cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffec00]/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black text-[#ffec00] font-bold font-sans text-xs flex items-center justify-center uppercase shadow-md flex-shrink-0">
            {regionData.iso.slice(0, 3)}
          </div>

          <div className="flex items-center -space-x-2">
            {regionData.flags.map((fIso) => (
              <div
                key={fIso}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-white shadow-xs bg-zinc-100"
              >
                <img src={`/flags/${fIso}.webp`} alt={fIso} className="w-full h-full object-cover" />
              </div>
            ))}
            {regionData.extraCount && (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#ffec00] text-black text-[9px] sm:text-[10px] font-bold font-sans flex items-center justify-center border-2 border-white shadow-xs">
                {regionData.extraCount}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-bold font-sans text-2xl sm:text-3xl text-black mb-0.5 leading-tight">
          {title}
        </h3>
        <p className="text-zinc-800 font-sans text-xs sm:text-sm font-medium mb-2 leading-tight">
          {desc}
        </p>
      </div>

      <div className="flex justify-between items-center pt-2 mt-1 border-t border-zinc-100">
        <span className="text-xs sm:text-sm font-bold tracking-wider text-zinc-900 uppercase font-sans">{badge}</span>
        <span className="text-xs sm:text-sm font-bold text-zinc-700 font-sans">
          {t.fromPrice} <strong className="text-black font-bold font-sans text-xl sm:text-2xl ml-1">{formatCurrency(displayPrice, currency)}</strong>
        </span>
      </div>
    </div>
  );
}
