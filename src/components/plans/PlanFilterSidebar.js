'use client';

import { convertCurrency, formatCurrency } from '../../lib/currency';

export default function PlanFilterSidebar({
  bounds,
  filterGb,
  setFilterGb,
  filterDays,
  setFilterDays,
  filterMaxPrice,
  setFilterMaxPrice,
  presetGb,
  setPresetGb,
  isFiltered,
  resetFilters,
  isMobileFiltersOpen,
  setIsMobileFiltersOpen,
  lang = 'es',
  currency = 'EUR',
  rates = {},
}) {
  return (
    <>
      {/* Mobile Accordion Toggle Button (Hidden on Desktop) */}
      <div className="lg:hidden w-full">
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full bg-white border border-zinc-300 hover:border-black p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-xs transition-all text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
            <span className="font-bold text-black text-xs sm:text-sm whitespace-nowrap">
              {lang === 'en' ? 'Filter Plans' : 'Filtrar Planes'}
            </span>
            {isFiltered && (
              <span className="bg-[#ffec00] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0">
                Activo
              </span>
            )}
          </div>
          <span className="text-zinc-500 font-bold text-xs flex-shrink-0 whitespace-nowrap">
            {isMobileFiltersOpen ? (lang === 'en' ? 'Hide ▲' : 'Ocultar ▲') : (lang === 'en' ? 'Filter ▼' : 'Filtrar ▼')}
          </span>
        </button>
      </div>

      {/* Left Sidebar: Collapsible on Mobile, Permanent 5-cols on Desktop */}
      <div
        className={`lg:col-span-5 bg-white text-black rounded-2xl p-6 border border-zinc-200 shadow-md space-y-6 ${
          isMobileFiltersOpen ? 'block animate-slide-down' : 'hidden lg:block'
        }`}
      >
        <div className="pb-3 border-b border-zinc-100">
          <h4 className="text-base font-bold font-sans tracking-tight text-black flex items-center gap-2">
            <svg className="w-4 h-4 text-black fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
            <span>{lang === 'en' ? 'Find Your Ideal Plan' : 'Encuentra tu Plan Ideal'}</span>
          </h4>

          {isFiltered && (
            <div className="mt-2.5">
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-black bg-zinc-100 hover:bg-[#ffec00] border border-zinc-300 px-3 py-1 rounded-full inline-flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>✕</span>
                <span>{lang === 'en' ? 'Reset Filters' : 'Borrar Filtros'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Preset Pills */}
        <div>
          <label className="block text-xs font-bold font-sans tracking-wide text-zinc-600 uppercase mb-2.5">
            {lang === 'en' ? 'Quick Data Preset' : 'Atajo Rápido de Datos'}
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs font-bold font-sans">
            {[
              { id: 'all', label: lang === 'en' ? 'All' : 'Todos' },
              { id: '1-3', label: '1-3 GB' },
              { id: '5-10', label: '5-10 GB' },
              { id: '20+', label: '20+ GB' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setPresetGb(preset.id)}
                className={`py-2 rounded-xl border transition-all ${
                  presetGb === preset.id
                    ? 'bg-[#ffec00] text-black border-black/20 font-bold shadow-xs'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slider 1: Data (GB) */}
        <div>
          <div className="flex justify-between items-center mb-1.5 text-sm font-sans">
            <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14I7 12h3V8h4v4h3l-5 5z" />
              </svg>
              {lang === 'en' ? 'Max Data:' : 'Máximo Datos:'}
            </span>
            <span className="font-bold text-black text-base">≤ {filterGb} GB</span>
          </div>
          <input
            type="range"
            min={bounds.minGb}
            max={bounds.maxGb}
            value={filterGb}
            onChange={(e) => setFilterGb(parseFloat(e.target.value))}
            className="w-full accent-black cursor-pointer bg-zinc-200 rounded-lg h-2.5"
          />
          <div className="flex justify-between text-xs text-zinc-500 font-medium font-sans mt-1">
            <span>{bounds.minGb} GB</span>
            <span>{bounds.maxGb} GB</span>
          </div>
        </div>

        {/* Slider 2: Days */}
        <div>
          <div className="flex justify-between items-center mb-1.5 text-sm font-sans">
            <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
              </svg>
              {lang === 'en' ? 'Max Validity:' : 'Máximo Días:'}
            </span>
            <span className="font-bold text-black text-base">≤ {filterDays} {lang === 'en' ? 'Days' : 'Días'}</span>
          </div>
          <input
            type="range"
            min={bounds.minDays}
            max={bounds.maxDays}
            value={filterDays}
            onChange={(e) => setFilterDays(parseInt(e.target.value))}
            className="w-full accent-black cursor-pointer bg-zinc-200 rounded-lg h-2.5"
          />
          <div className="flex justify-between text-xs text-zinc-500 font-medium font-sans mt-1">
            <span>{bounds.minDays} d</span>
            <span>{bounds.maxDays} d</span>
          </div>
        </div>

        {/* Slider 3: Max Price */}
        <div>
          <div className="flex justify-between items-center mb-1.5 text-sm font-sans">
            <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
              {lang === 'en' ? 'Max Price:' : 'Precio Máximo:'}
            </span>
            <span className="font-bold text-black text-base">≤ {formatCurrency(convertCurrency(filterMaxPrice, currency, rates), currency)}</span>
          </div>
          <input
            type="range"
            min={bounds.minPrice}
            max={bounds.maxPrice}
            value={filterMaxPrice}
            onChange={(e) => setFilterMaxPrice(parseFloat(e.target.value))}
            className="w-full accent-black cursor-pointer bg-zinc-200 rounded-lg h-2.5"
          />
          <div className="flex justify-between text-xs text-zinc-500 font-medium font-sans mt-1">
            <span>{formatCurrency(convertCurrency(bounds.minPrice, currency, rates), currency)}</span>
            <span>{formatCurrency(convertCurrency(bounds.maxPrice, currency, rates), currency)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
