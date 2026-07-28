'use client';

import { useState, useMemo } from 'react';
import { convertCurrency, formatCurrency } from '../lib/currency';

export default function FixedPlanList({
  fixedPlans = [],
  selectedPlanId,
  setSelectedPlanId,
  lang = 'es',
  currency = 'EUR',
  rates = {},
  selectedPlan,
  handleAddToCartFixed,
}) {
  // Calculate bounds dynamically from fixedPlans
  const bounds = useMemo(() => {
    if (!fixedPlans || fixedPlans.length === 0) {
      return { minGb: 1, maxGb: 50, minDays: 1, maxDays: 90, minPrice: 1, maxPrice: 100 };
    }

    let minGb = 999, maxGb = 1;
    let minDays = 999, maxDays = 1;
    let minPrice = 999, maxPrice = 1;

    fixedPlans.forEach((p) => {
      const gbMatch = p.dataAmount.match(/([\d.]+)\s*(GB|MB)/i);
      let gbVal = 1;
      if (gbMatch) {
        gbVal = parseFloat(gbMatch[1]);
        if (gbMatch[2].toUpperCase() === 'MB') gbVal = gbVal / 1000;
      }
      if (gbVal < minGb) minGb = gbVal;
      if (gbVal > maxGb) maxGb = gbVal;

      const daysVal = parseInt(p.days) || 1;
      if (daysVal < minDays) minDays = daysVal;
      if (daysVal > maxDays) maxDays = daysVal;

      const priceVal = parseFloat(p.priceEur) || 1;
      if (priceVal < minPrice) minPrice = priceVal;
      if (priceVal > maxPrice) maxPrice = priceVal;
    });

    return {
      minGb: Math.max(1, Math.floor(minGb)),
      maxGb: Math.ceil(maxGb),
      minDays: Math.max(1, Math.floor(minDays)),
      maxDays: Math.ceil(maxDays),
      minPrice: Math.max(1, Math.floor(minPrice)),
      maxPrice: Math.ceil(maxPrice),
    };
  }, [fixedPlans]);

  // Filter States
  const [filterGb, setFilterGb] = useState(bounds.maxGb);
  const [filterDays, setFilterDays] = useState(bounds.maxDays);
  const [filterMaxPrice, setFilterMaxPrice] = useState(bounds.maxPrice);
  const [presetGb, setPresetGb] = useState('all');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const isFiltered =
    filterGb < bounds.maxGb ||
    filterDays < bounds.maxDays ||
    filterMaxPrice < bounds.maxPrice ||
    presetGb !== 'all';

  const resetFilters = () => {
    setFilterGb(bounds.maxGb);
    setFilterDays(bounds.maxDays);
    setFilterMaxPrice(bounds.maxPrice);
    setPresetGb('all');
  };

  // Filtered Plans Logic
  const filteredPlans = useMemo(() => {
    return fixedPlans.filter((p) => {
      const gbMatch = p.dataAmount.match(/([\d.]+)\s*(GB|MB)/i);
      let gbVal = 1;
      if (gbMatch) {
        gbVal = parseFloat(gbMatch[1]);
        if (gbMatch[2].toUpperCase() === 'MB') gbVal = gbVal / 1000;
      }

      const daysVal = parseInt(p.days) || 1;
      const priceVal = parseFloat(p.priceEur) || 1;

      // Check sliders
      const matchesGb = gbVal <= filterGb;
      const matchesDays = daysVal <= filterDays;
      const matchesPrice = priceVal <= filterMaxPrice;

      // Preset check
      let matchesPreset = true;
      if (presetGb === '1-3') matchesPreset = gbVal >= 1 && gbVal <= 3;
      if (presetGb === '5-10') matchesPreset = gbVal >= 5 && gbVal <= 10;
      if (presetGb === '20+') matchesPreset = gbVal >= 20;

      return matchesGb && matchesDays && matchesPrice && matchesPreset;
    });
  }, [fixedPlans, filterGb, filterDays, filterMaxPrice, presetGb]);

  const activeSelectedPlan =
    filteredPlans.find((p) => p.id === selectedPlanId) || filteredPlans[0] || selectedPlan;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      {/* Mobile Accordion Toggle Button (Hidden on Desktop) */}
      <div className="lg:hidden w-full">
        <button
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full bg-white border border-zinc-300 hover:border-black p-4 rounded-2xl flex items-center justify-between shadow-xs transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-black fill-current" viewBox="0 0 24 24">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
            <span className="font-bold text-black text-sm">
              {lang === 'en' ? 'Find Your Ideal Plan' : 'Encuentra tu Plan Ideal'}
            </span>
            {isFiltered && (
              <span className="bg-[#ffec00] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Activo
              </span>
            )}
          </div>
          <span className="text-zinc-500 font-bold text-xs">
            {isMobileFiltersOpen ? (lang === 'en' ? 'Hide ▲' : 'Ocultar ▲') : (lang === 'en' ? 'Filter ▼' : 'Filtrar ▼')}
          </span>
        </button>
      </div>

      {/* Left Sidebar: Collapsible on Mobile, Permanent 5-cols on Desktop */}
      <div
        className={`lg:col-span-5 bg-white text-black rounded-2xl p-6 border border-zinc-200 shadow-md space-y-6 ${
          isMobileFiltersOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffec00] border border-black/10"></span>
            <h4 className="text-base font-bold font-sans tracking-tight text-black flex items-center gap-2">
              <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
              </svg>
              <span>{lang === 'en' ? 'Find Your Ideal Plan' : 'Encuentra tu Plan Ideal'}</span>
            </h4>
          </div>
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-zinc-600 hover:text-black underline font-sans"
            >
              {lang === 'en' ? 'Reset' : 'Restablecer'}
            </button>
          )}
        </div>

        {/* Preset Pills */}
        <div>
          <label className="block text-xs font-bold font-sans tracking-wide text-zinc-600 uppercase mb-2.5">
            {lang === 'en' ? 'Quick Data Preset' : 'Atajo Rápido de Datos'}
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs font-bold font-sans">
            {[
              { id: 'all', label: 'Todos' },
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

      {/* Right Column: Filtered Plan Cards */}
      <div className="lg:col-span-7 space-y-4">
        <h3 className="text-xs font-semibold font-condensed tracking-widest text-zinc-500 uppercase flex justify-between items-center">
          <span>{lang === 'en' ? 'CHOOSE YOUR DATA PLAN' : 'ELIGE TU PLAN DE DATOS'}</span>
          <span className="text-black font-semibold font-condensed flex items-center gap-1.5 bg-[#ffec00] px-2.5 py-0.5 rounded-full text-[11px] shadow-xs">
            🟢 {filteredPlans.length} {lang === 'en' ? 'matching plans' : 'opciones filtradas'}
          </span>
        </h3>

        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
            <p className="text-zinc-600 font-semibold text-base mb-3 font-sans">
              {lang === 'en' ? 'No plans match your current sliders.' : 'Ningún plan coincide con los filtros aplicados.'}
            </p>
            <button
              onClick={resetFilters}
              className="bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed uppercase px-4 py-2 rounded-xl text-xs shadow-sm border border-black/10"
            >
              {lang === 'en' ? 'Reset Filters' : 'Restablecer Filtros'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const isSelected = (selectedPlanId || activeSelectedPlan?.id) === plan.id;
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
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
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
            })}
          </div>
        )}

        {/* Add to Cart CTA Button */}
        <button
          onClick={handleAddToCartFixed}
          disabled={!activeSelectedPlan}
          className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase py-3.5 px-6 rounded-xl text-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border border-black/10 mt-4"
        >
          {lang === 'en' ? 'Add to Cart' : 'Añadir al Carrito'} • {activeSelectedPlan ? formatCurrency(convertCurrency(activeSelectedPlan.priceEur, currency, rates), currency) : ''} ➔
        </button>
      </div>
    </div>
  );
}
