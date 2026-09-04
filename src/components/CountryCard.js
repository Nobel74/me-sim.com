'use client';

import { useRouter } from 'next/navigation';
import { getCountryName, getTranslation } from '../lib/i18n';
import { convertCurrency, formatCurrency } from '../lib/currency';

export default function CountryCard({ iso, countryName, priceEur, lang = 'es', currency = 'EUR', rates = {} }) {
  const router = useRouter();
  const t = getTranslation(lang);
  const isoCode = (iso || 'gl').toLowerCase();
  const displayName = countryName || getCountryName(isoCode, lang);
  const displayPrice = convertCurrency(priceEur, currency, rates);

  return (
    <div
      onClick={() => router.push(`/destination/${isoCode}`)}
      aria-label={`eSIM ${displayName}`}
      className="bg-white rounded-2xl border border-zinc-200 hover:border-black p-4 flex items-center justify-between cursor-pointer hover:shadow-xl transition-all group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 shadow-sm flex-shrink-0 bg-zinc-50 group-hover:scale-105 transition-transform">
          <img
            src={isoCode === 'global' ? '/flags/global.gif' : `/flags/${isoCode}.webp`}
            alt={`eSIM ${displayName}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/flags/gl.webp';
            }}
          />
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold font-semi text-black text-lg leading-tight truncate group-hover:text-black transition-colors">
            {displayName}
          </h3>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm text-zinc-600 font-medium font-sans">{t.fromPrice}</span>
            <span className="text-black font-semibold font-condensed text-lg">{formatCurrency(displayPrice, currency)}</span>
          </div>
        </div>
      </div>

      <span className="w-7.5 h-7.5 p-1.5 rounded-full bg-[#ffec00] text-black font-bold text-xs flex items-center justify-center group-hover:translate-x-1 transition-transform ml-2 shadow-xs flex-shrink-0">
        ➔
      </span>
    </div>
  );
}
