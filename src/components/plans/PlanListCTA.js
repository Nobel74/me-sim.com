'use client';

import { convertCurrency, formatCurrency } from '../../lib/currency';

export default function PlanListCTA({
  activeSelectedPlan,
  handleAddToCartFixed,
  onOpenCompatibility,
  lang = 'es',
  currency = 'EUR',
  rates = {},
}) {
  return (
    <div className="space-y-3">
      {/* Add to Cart CTA Button */}
      <button
        onClick={handleAddToCartFixed}
        disabled={!activeSelectedPlan}
        className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-sans tracking-wide py-3 px-1 sm:px-4 rounded-xl text-base sm:text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 border border-black/10 mt-4"
      >
        {lang === 'en' ? 'Add to Cart' : 'Añadir al Carrito'} •{' '}
        {activeSelectedPlan
          ? formatCurrency(convertCurrency(activeSelectedPlan.priceEur, currency, rates), currency)
          : ''}{' '}
        ➔
      </button>

      {/* Device Compatibility Button */}
      {onOpenCompatibility && (
        <button
          onClick={onOpenCompatibility}
          type="button"
          className="w-full mt-3 text-xs sm:text-sm font-bold text-zinc-900 hover:text-black transition-all flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/90 border border-zinc-300 shadow-2xs hover:shadow-xs group"
        >
          <div className="w-5 h-5 rounded-md bg-black text-[#ffec00] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
            </svg>
          </div>
          <span className="underline underline-offset-2 decoration-zinc-400 group-hover:decoration-black font-sans">
            {lang === 'en' ? 'Is my phone compatible?' : '¿Es mi teléfono compatible?'}
          </span>
        </button>
      )}
    </div>
  );
}
