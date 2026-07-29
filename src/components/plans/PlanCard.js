'use client';

import { convertCurrency, formatCurrency } from '../../lib/currency';

export default function PlanCard({
  plan,
  isSelected,
  onSelect,
  lang = 'es',
  currency = 'EUR',
  rates = {},
}) {
  const displayPrice = convertCurrency(plan.priceEur, currency, rates);
  const isBestChoice = plan.isBestChoice;

  const numVal = parseFloat(plan.dataAmount);
  let perUnitLabel = '';
  if (!isNaN(numVal) && numVal > 0) {
    if (plan.dataAmount.toLowerCase().includes('mb')) {
      perUnitLabel = `${formatCurrency((displayPrice / (numVal / 1000)).toFixed(2), currency)} / GB`;
    } else {
      perUnitLabel = `${formatCurrency((displayPrice / numVal).toFixed(2), currency)} / GB`;
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between relative bg-white ${
        isSelected
          ? 'border-black shadow-md ring-2 ring-black/10'
          : 'border-zinc-200 hover:border-zinc-400'
      }`}
    >
      {isBestChoice && (
        <div className="absolute -top-3 left-5 bg-black text-[#ffec00] text-[11px] font-bold font-sans px-3 py-0.5 rounded-full uppercase tracking-wide shadow-md border border-[#ffec00]/30 flex items-center gap-1.5 z-10">
          <svg className="w-3 h-3 text-[#ffec00] fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>{lang === 'en' ? 'BEST CHOICE' : 'MEJOR OPCIÓN'}</span>
        </div>
      )}

      <div className="flex items-center gap-3.5">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected ? 'border-black bg-black' : 'border-zinc-300'
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-[#ffec00]"></div>}
        </div>

        <div>
          <strong className="text-xl font-semibold font-semi text-black block leading-tight">
            {plan.dataAmount}
          </strong>
          <span className="text-xs text-zinc-500 font-medium font-sans">
            {plan.days} {lang === 'en' ? 'days validity' : 'días de validez'}
          </span>
        </div>
      </div>

      <div className="text-right">
        <span className="text-2xl font-semibold font-condensed text-black block">
          {formatCurrency(displayPrice, currency)}
        </span>
        {perUnitLabel && (
          <span className="text-[11px] text-zinc-400 font-condensed font-semibold">
            {perUnitLabel}
          </span>
        )}
      </div>
    </div>
  );
}
