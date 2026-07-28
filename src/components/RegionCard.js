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
      className="bg-white rounded-3xl border border-zinc-200 hover:border-black p-6 flex flex-col justify-between cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffec00]/15 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-black text-[#ffec00] font-semibold font-condensed text-xs flex items-center justify-center uppercase shadow-md">
            {regionData.iso.slice(0, 3)}
          </div>

          <div className="flex items-center -space-x-2">
            {regionData.flags.map((fIso) => (
              <div
                key={fIso}
                className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-zinc-100"
              >
                <img src={`/flags/${fIso}.webp`} alt={fIso} className="w-full h-full object-cover" />
              </div>
            ))}
            {regionData.extraCount && (
              <div className="w-7 h-7 rounded-full bg-[#ffec00] text-black text-[10px] font-semibold font-condensed flex items-center justify-center border-2 border-white shadow-sm">
                {regionData.extraCount}
              </div>
            )}
          </div>
        </div>

        <h3 className="font-semibold font-semi text-2xl text-black mb-1 leading-tight group-hover:text-black transition-colors">
          {title}
        </h3>
        <p className="text-zinc-500 font-sans text-xs font-medium mb-6 leading-relaxed">
          {desc}
        </p>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
        <span className="text-xs font-semibold font-condensed tracking-wider text-zinc-500 uppercase">{badge}</span>
        <span className="text-xs font-semibold font-condensed tracking-wide text-zinc-400">
          {t.fromPrice} <strong className="text-black font-semibold font-condensed text-2xl ml-1">{formatCurrency(displayPrice, currency)}</strong>
        </span>
      </div>
    </div>
  );
}
