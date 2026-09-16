import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';
import { ALL_WORLD_COUNTRIES, COUNTRY_NAMES, REGION_NAMES } from '../../../lib/i18n';
import { getPricingRules, computePlanPricing, mapIsoToRegion } from '../../../lib/pricingRules';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get('country') || '').toLowerCase();
  const region = (searchParams.get('region') || '').toLowerCase();

  try {
    let response = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (!response.ok) {
      let v2Endpoint = '/plans-v2';
      if (country) v2Endpoint += `?country=${encodeURIComponent(country)}`;
      else if (region) v2Endpoint += `?region=${encodeURIComponent(region)}`;
      response = await strongesimFetch(v2Endpoint, { cache: 'no-store' });
    }

    if (response && response.ok) {
      const data = await response.json();
      const rawPlans = data.plans || data.data || data.packages || (Array.isArray(data) ? data : []);
      if (rawPlans && rawPlans.length > 0) {
        // Map live plans to our schema
        const mappedPlans = rawPlans.map((p) => {
          const pIso = (p.country_code || p.iso || p.isoCode || p.location || '').toLowerCase().trim();
          const pDays = parseInt(p.validity_days || p.duration || p.days || p.validity || 30, 10);
          let pDataAmount = p.dataAmount || p.data || '';
          if (!pDataAmount && p.data_volume_mb) {
            const mb = parseInt(p.data_volume_mb, 10);
            pDataAmount = mb >= 1024
              ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB Total`
              : `${mb} MB Total`;
          }
          return {
            id: p.id,
            packageCode: p.package_code || p.packageCode || p.code || p.sku,
            title: p.name || p.title,
            country: p.country || p.country_name,
            iso: pIso,
            region: p.region || 'europe',
            dataAmount: pDataAmount || (pDays === 1 ? '1 GB / Día' : '1 GB Total'),
            days: pDays,
            costUsd: parseFloat(p.price || 0),
            priceEur: parseFloat(p.price || p.priceEur || 0),
            is_region: p.is_region || false,
            isUnlimited: (p.name || '').toLowerCase().includes('unlimited') || (p.name || '').toLowerCase().includes('ilimitad'),
          };
        });

        let filtered = mappedPlans;
        if (country || region) {
          const target = (country || region).toLowerCase();
          filtered = mappedPlans.filter(p => p.iso === target || (p.region && p.region.toLowerCase() === target));
        }

        if (filtered.length > 0) {
          // Deduplicate live api plans
          const uniqueMap = new Map();
          filtered.forEach((p) => {
            const key = `${p.iso}-${p.dataAmount}-${p.days}`;
            if (!uniqueMap.has(key) || p.priceEur < uniqueMap.get(key).priceEur) {
              uniqueMap.set(key, p);
            }
          });
          const finalLive = Array.from(uniqueMap.values());
          return NextResponse.json({ success: true, plans: applyMarkup(finalLive), count: finalLive.length });
        }
      }
    }
  } catch (error) {
    console.error('Error proxying StrongESIM plans:', error);
  }

  // Complete Tiered Options for Individual Countries
  const countryTiers = [
    { dataAmount: '500 MB / Día', days: 1, mult: 0.59 }, // 2.90 € starting price!
    { dataAmount: '1 GB / Día', days: 1, mult: 0.8 },
    { dataAmount: '2 GB / Día', days: 1, mult: 1.0 },
    { dataAmount: '1 GB Total', days: 7, mult: 1.0 },
    { dataAmount: '2 GB Total', days: 15, mult: 1.6 },
    { dataAmount: '3 GB Total', days: 15, mult: 2.0 },
    { dataAmount: '3 GB Total', days: 30, mult: 2.1 },
    { dataAmount: '5 GB Total', days: 30, mult: 2.8 },
    { dataAmount: '10 GB Total', days: 30, mult: 4.2 },
    { dataAmount: '15 GB Total', days: 30, mult: 5.2 },
    { dataAmount: '20 GB Total', days: 30, mult: 6.2, isBestChoice: true },
    { dataAmount: '30 GB Total', days: 30, mult: 8.0 },
    { dataAmount: '50 GB Total', days: 30, mult: 10.5 },
    { dataAmount: '100 GB Total', days: 30, mult: 16.0 },
  ];

  // Complete Tiered Options for Regional Multi-Country Packages
  const regionTiers = [
    { dataAmount: '500 MB / Día', days: 1, mult: 0.6 },
    { dataAmount: '1 GB Total', days: 7, mult: 1.0 },
    { dataAmount: '3 GB Total', days: 15, mult: 1.8 },
    { dataAmount: '5 GB Total', days: 30, mult: 2.5 },
    { dataAmount: '10 GB Total', days: 30, mult: 3.8 },
    { dataAmount: '15 GB Total', days: 30, mult: 4.8 },
    { dataAmount: '20 GB Total', days: 30, mult: 5.8, isBestChoice: true },
    { dataAmount: '30 GB Total', days: 30, mult: 7.5 },
    { dataAmount: '50 GB Total', days: 30, mult: 10.0 },
    { dataAmount: '100 GB Total', days: 30, mult: 15.0 },
  ];

  const regionMeta = [
    { iso: 'europe', name: 'Europa (35+ Países)', region: 'europe', baseEur: 4.90 },
    { iso: 'asia', name: 'Asia (18 Países)', region: 'asia', baseEur: 5.90 },
    { iso: 'north-america', name: 'Norteamérica (3 Países)', region: 'north-america', baseEur: 5.90 },
    { iso: 'south-america', name: 'América del Sur (14 Países)', region: 'south-america', baseEur: 6.90 },
    { iso: 'caribbean', name: 'Caribe (16 Islas)', region: 'caribbean', baseEur: 6.90 },
    { iso: 'africa', name: 'África (26 Países)', region: 'africa', baseEur: 7.90 },
    { iso: 'middle-east', name: 'Oriente Medio (12 Países)', region: 'middle-east', baseEur: 5.90 },
    { iso: 'australia-new-zealand', name: 'Australia y Nueva Zelanda', region: 'oceania', baseEur: 5.90 },
    { iso: 'oceania', name: 'Oceanía (8 Países)', region: 'oceania', baseEur: 6.90 },
    { iso: 'aukus', name: 'Alianza AUKUS (AU, UK, US)', region: 'oceania', baseEur: 4.90 },
    { iso: 'china-hk-macau', name: 'China + Hong Kong + Macao', region: 'asia', baseEur: 4.90 },
    { iso: 'east-asia', name: 'Japón, Corea y Taiwán', region: 'asia', baseEur: 5.90 },
    { iso: 'southeast-asia', name: 'Sudeste Asiático (SEA 10 Países)', region: 'asia', baseEur: 5.90 },
    { iso: 'europe-morocco', name: 'Europa + Marruecos (36+ Países)', region: 'europe', baseEur: 4.90 },
  ];

  const countryMeta = ALL_WORLD_COUNTRIES
    .filter((c) => c.iso !== 'global')
    .map((c) => ({
      iso: c.iso,
      name: c.nameEs,
      region: c.region,
      baseEur: c.baseEur || 4.90,
    }));

  // Dynamic regional markup calculations powered by active pricing rules
  const applyMarkup = (plansList) => {
    const liveRules = getPricingRules('live');

    return plansList.map((p) => {
      const pIso = (p.iso || '').toLowerCase();
      let effectiveRegion = mapIsoToRegion(pIso, p.is_region || false);

      if (!effectiveRegion || effectiveRegion === pIso) {
        const matchingCountry = countryMeta.find((c) => c.iso === pIso);
        if (matchingCountry) {
          effectiveRegion = mapIsoToRegion(matchingCountry.region, false) || matchingCountry.region;
        } else if (p.region) {
          effectiveRegion = mapIsoToRegion(p.region, p.is_region || false);
        }
      }

      // Si el coste viene de la API en vivo de StrongeSIM ($ USD)
      const costUsd = p.costUsd !== undefined ? p.costUsd : (p.priceEur ? p.priceEur / (liveRules.usdToEurRate || 0.926) : 0);
      const pricing = computePlanPricing(costUsd, effectiveRegion, liveRules);

      return {
        ...p,
        costUsd: pricing.rawCostUsd,
        costEur: pricing.costEur,
        costGbp: pricing.costGbp,
        costAud: pricing.costAud,
        priceEur: pricing.pvpFinal,
        price: pricing.pvpFinal,
        priceGbp: pricing.pvpGbp,
        priceAud: pricing.pvpAud,
        isFloorApplied: pricing.isFloorApplied,
        isMinProfitApplied: pricing.isMinProfitApplied,
        markupMultiplier: pricing.multiplier,
      };
    });
  };

  const targetCode = country || region;

  // Helper to deduplicate plans
  const deduplicatePlans = (plansList) => {
    const uniqueMap = new Map();
    plansList.forEach((p) => {
      const key = `${p.iso}-${p.dataAmount}-${p.days}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      } else {
        const existing = uniqueMap.get(key);
        if (p.priceEur < existing.priceEur) {
          uniqueMap.set(key, p);
        }
      }
    });
    return Array.from(uniqueMap.values());
  };

  // Dynamic fallback generator if a specific unlisted ISO code is requested
  if (targetCode && !countryMeta.some((c) => c.iso === targetCode) && !regionMeta.some((r) => r.iso === targetCode)) {
    const isRegionQuery = [
      'europe', 'asia', 'north-america', 'south-america', 'caribbean',
      'africa', 'middle-east', 'oceania', 'aukus', 'china-hk-macau',
      'east-asia', 'southeast-asia', 'europe-morocco'
    ].includes(targetCode);
    const displayName = COUNTRY_NAMES[targetCode]?.es || REGION_NAMES[targetCode]?.es || targetCode.toUpperCase();
    const dynamicBaseEur = 4.90;
    const dynamicPlans = [];

    const selectedTiers = isRegionQuery ? regionTiers : countryTiers;

    selectedTiers.forEach((t, idx) => {
      dynamicPlans.push({
        id: `${targetCode}-dyn-v${idx + 1}-${t.dataAmount.replace(/ /g, '').toLowerCase()}`,
        title: t.days === 1
          ? `${displayName} ${t.dataAmount}`
          : `${displayName} ${t.dataAmount} ${t.days}Days`,
        country: displayName,
        iso: targetCode,
        region: isRegionQuery ? targetCode : 'europe',
        dataAmount: t.dataAmount,
        days: t.days,
        priceEur: parseFloat((dynamicBaseEur * t.mult).toFixed(2)),
        is_region: isRegionQuery,
        isUnlimited: false,
        isBestChoice: !!t.isBestChoice,
      });
    });

    dynamicPlans.push({
      id: `${targetCode}-unlimited-7d`,
      title: `${displayName} Datos Ilimitados 7 Días`,
      country: displayName,
      iso: targetCode,
      region: isRegionQuery ? targetCode : 'europe',
      dataAmount: 'Ilimitados',
      days: 7,
      priceEur: parseFloat((dynamicBaseEur * 4.0).toFixed(2)),
      is_region: isRegionQuery,
      isUnlimited: true,
    });

    const finalDyn = deduplicatePlans(dynamicPlans);
    return NextResponse.json({ success: true, plans: applyMarkup(finalDyn), count: finalDyn.length });
  }

  const fallbackPlans = [];

  // Generate complete regional plans for each region
  regionMeta.forEach((r) => {
    regionTiers.forEach((t, idx) => {
      fallbackPlans.push({
        id: `${r.iso}-reg-v${idx + 1}-${t.dataAmount.replace(/ /g, '').toLowerCase()}`,
        title: t.days === 1
          ? `${r.name} ${t.dataAmount}`
          : `${r.name} ${t.dataAmount} ${t.days}Days`,
        country: r.name,
        iso: r.iso,
        region: r.region,
        dataAmount: t.dataAmount,
        days: t.days,
        priceEur: parseFloat((r.baseEur * t.mult).toFixed(2)),
        is_region: true,
        isUnlimited: false,
        isBestChoice: !!t.isBestChoice,
      });
    });

    fallbackPlans.push({
      id: `${r.iso}-unlimited-7d`,
      title: `${r.name} Datos Ilimitados 7 Días`,
      country: r.name,
      iso: r.iso,
      region: r.region,
      dataAmount: 'Ilimitados',
      days: 7,
      priceEur: parseFloat((r.baseEur * 4.0).toFixed(2)),
      is_region: true,
      isUnlimited: true,
    });
  });

  // Generate complete plan variants for each individual country
  countryMeta.forEach((c) => {
    countryTiers.forEach((t, idx) => {
      fallbackPlans.push({
        id: `${c.iso}-v${idx + 1}-${t.dataAmount.replace(/ /g, '').toLowerCase()}-${t.days}d`,
        title: t.days === 1
          ? `${c.name} ${t.dataAmount}`
          : `${c.name} ${t.dataAmount} ${t.days}Days`,
        country: c.name,
        iso: c.iso,
        region: c.region,
        dataAmount: t.dataAmount,
        days: t.days,
        priceEur: parseFloat((c.baseEur * t.mult).toFixed(2)),
        is_region: false,
        isUnlimited: false,
        isBestChoice: !!t.isBestChoice,
      });
    });

    fallbackPlans.push({
      id: `${c.iso}-unlimited-7d`,
      title: `${c.name} Datos Ilimitados 7 Días`,
      country: c.name,
      iso: c.iso,
      region: c.region,
      dataAmount: 'Ilimitados',
      days: 7,
      priceEur: parseFloat((c.baseEur * 4.0).toFixed(2)),
      is_region: false,
      isUnlimited: true,
    });
  });

  let finalFallback = deduplicatePlans(fallbackPlans);
  if (targetCode) {
    finalFallback = finalFallback.filter(
      (p) => p.iso === targetCode || (p.region && p.region.toLowerCase() === targetCode)
    );
  }
  return NextResponse.json({ success: true, plans: applyMarkup(finalFallback), count: finalFallback.length });
}
