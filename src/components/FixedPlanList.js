'use client';

import { useState, useMemo, useEffect } from 'react';
import PlanFilterSidebar from './plans/PlanFilterSidebar';
import PlanCard from './plans/PlanCard';
import PlanListCTA from './plans/PlanListCTA';

export default function FixedPlanList({
  fixedPlans = [],
  selectedPlanId,
  setSelectedPlanId,
  lang = 'es',
  currency = 'EUR',
  rates = {},
  selectedPlan,
  handleAddToCartFixed,
  onOpenCompatibility,
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

  // Auto-reset filters when switching destination or loading new plans
  useEffect(() => {
    setFilterGb(bounds.maxGb);
    setFilterDays(bounds.maxDays);
    setFilterMaxPrice(bounds.maxPrice);
    setPresetGb('all');
  }, [fixedPlans, bounds]);

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
      {/* Sidebar de Filtros Modular */}
      <PlanFilterSidebar
        bounds={bounds}
        filterGb={filterGb}
        setFilterGb={setFilterGb}
        filterDays={filterDays}
        setFilterDays={setFilterDays}
        filterMaxPrice={filterMaxPrice}
        setFilterMaxPrice={setFilterMaxPrice}
        presetGb={presetGb}
        setPresetGb={setPresetGb}
        isFiltered={isFiltered}
        resetFilters={resetFilters}
        isMobileFiltersOpen={isMobileFiltersOpen}
        setIsMobileFiltersOpen={setIsMobileFiltersOpen}
        lang={lang}
        currency={currency}
        rates={rates}
      />

      {/* Right Column: Filtered Plan Cards */}
      <div className="lg:col-span-7 space-y-4">
        <h3 className="text-xs font-semibold font-condensed tracking-widest text-zinc-500 uppercase flex flex-wrap items-center justify-between gap-2">
          <span>{lang === 'en' ? 'CHOOSE YOUR DATA PLAN' : 'ELIGE TU PLAN DE DATOS'}</span>
          <span className="text-black font-bold font-sans flex items-center gap-1.5 bg-[#ffec00] px-2.5 py-1 rounded-full text-[10px] sm:text-xs shadow-xs whitespace-nowrap border border-black/10">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block flex-shrink-0"></span>
            <span>{filteredPlans.length} {lang === 'en' ? 'options' : 'opciones'}</span>
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
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={(selectedPlanId || activeSelectedPlan?.id) === plan.id}
                onSelect={() => setSelectedPlanId(plan.id)}
                lang={lang}
                currency={currency}
                rates={rates}
              />
            ))}
          </div>
        )}

        {/* CTA Component Modular */}
        <PlanListCTA
          activeSelectedPlan={activeSelectedPlan}
          handleAddToCartFixed={handleAddToCartFixed}
          onOpenCompatibility={onOpenCompatibility}
          lang={lang}
          currency={currency}
          rates={rates}
        />
      </div>
    </div>
  );
}
