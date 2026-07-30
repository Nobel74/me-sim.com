import { NextResponse } from 'next/server';
import { strongesimFetch } from '../../../lib/strongesim';
import { COUNTRY_NAMES, REGION_NAMES } from '../../../lib/i18n';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get('country') || '').toLowerCase();
  const region = (searchParams.get('region') || '').toLowerCase();

  try {
    let endpoint = '/plans-v2';
    if (country) {
      endpoint += `?country=${encodeURIComponent(country)}`;
    } else if (region) {
      endpoint += `?region=${encodeURIComponent(region)}`;
    }

    const response = await strongesimFetch(endpoint, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const livePlans = data.plans || data.data || (Array.isArray(data) ? data : []);
      if (livePlans && livePlans.length > 0) {
        // Deduplicate live api plans
        const uniqueMap = new Map();
        livePlans.forEach((p) => {
          // Normalize structure if necessary
          const pIso = (p.iso || p.isoCode || '').toLowerCase();
          
          // Sanitize daily plans: set days to 1 and remove the day suffix from the title
          const dataAmt = (p.dataAmount || p.data || '').toLowerCase();
          const titleText = (p.title || '').toLowerCase();
          if (dataAmt.includes('/ día') || dataAmt.includes('/ dia') || dataAmt.includes('/ day') || titleText.includes('/ día') || titleText.includes('/ dia') || titleText.includes('/ day')) {
            p.days = 1;
            if (p.title) {
              p.title = p.title.replace(/\s*\d+\s*(days|días|días de validez|days validity|d|day)$/i, '');
            }
          }

          const key = `${pIso}-${p.dataAmount || p.data}-${p.days}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
          } else {
            const existing = uniqueMap.get(key);
            const pPrice = parseFloat(p.priceEur || p.price || 9999);
            const extPrice = parseFloat(existing.priceEur || existing.price || 9999);
            if (pPrice < extPrice) {
              uniqueMap.set(key, p);
            }
          }
        });
        const finalLive = Array.from(uniqueMap.values());
        return NextResponse.json({ success: true, plans: applyMarkup(finalLive), count: finalLive.length });
      }
    }
  } catch (error) {
    console.error('Error proxying /plans-v2:', error);
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

  const countryMeta = [
    { iso: 'fr', name: 'Francia', region: 'europe', baseEur: 4.90 },
    { iso: 'es', name: 'España', region: 'europe', baseEur: 4.90 },
    { iso: 'us', name: 'Estados Unidos', region: 'north-america', baseEur: 4.90 },
    { iso: 'cn', name: 'China', region: 'asia', baseEur: 4.90 },
    { iso: 'it', name: 'Italia', region: 'europe', baseEur: 4.90 },
    { iso: 'tr', name: 'Turquía', region: 'europe', baseEur: 4.90 },
    { iso: 'mx', name: 'México', region: 'north-america', baseEur: 4.90 },
    { iso: 'th', name: 'Tailandia', region: 'asia', baseEur: 4.90 },
    { iso: 'de', name: 'Alemania', region: 'europe', baseEur: 4.90 },
    { iso: 'gb', name: 'Reino Unido', region: 'europe', baseEur: 4.90 },
    { iso: 'jp', name: 'Japón', region: 'asia', baseEur: 4.90 },
    { iso: 'at', name: 'Austria', region: 'europe', baseEur: 4.90 },
    { iso: 'gr', name: 'Grecia', region: 'europe', baseEur: 4.90 },
    { iso: 'my', name: 'Malasia', region: 'asia', baseEur: 4.90 },
    { iso: 'ae', name: 'Emiratos Árabes Unidos', region: 'middle-east', baseEur: 4.90 },
    { iso: 'sa', name: 'Arabia Saudita', region: 'middle-east', baseEur: 5.90 },
    { iso: 'pt', name: 'Portugal', region: 'europe', baseEur: 4.90 },
    { iso: 'ca', name: 'Canadá', region: 'north-america', baseEur: 4.90 },
    { iso: 'pl', name: 'Polonia', region: 'europe', baseEur: 4.90 },
    { iso: 'nl', name: 'Países Bajos', region: 'europe', baseEur: 4.90 },
    { iso: 'in', name: 'India', region: 'asia', baseEur: 5.90 },
    { iso: 'hr', name: 'Croacia', region: 'europe', baseEur: 4.90 },
    { iso: 'hu', name: 'Hungría', region: 'europe', baseEur: 4.90 },
    { iso: 'kr', name: 'Corea del Sur', region: 'asia', baseEur: 4.90 },
    { iso: 'vn', name: 'Vietnam', region: 'asia', baseEur: 4.90 },
    { iso: 'ma', name: 'Marruecos', region: 'africa', baseEur: 4.90 },
    { iso: 'ch', name: 'Suiza', region: 'europe', baseEur: 4.90 },
    { iso: 'sg', name: 'Singapur', region: 'asia', baseEur: 4.90 },
    { iso: 'id', name: 'Indonesia', region: 'asia', baseEur: 4.90 },
    { iso: 'eg', name: 'Egipto', region: 'africa', baseEur: 5.90 },
    { iso: 'et', name: 'Etiopía', region: 'africa', baseEur: 6.90 },
    { iso: 'ke', name: 'Kenia', region: 'africa', baseEur: 5.90 },
    { iso: 'br', name: 'Brasil', region: 'south-america', baseEur: 5.90 },
    { iso: 'ar', name: 'Argentina', region: 'south-america', baseEur: 5.90 },
    { iso: 'co', name: 'Colombia', region: 'south-america', baseEur: 4.90 },
    { iso: 'cl', name: 'Chile', region: 'south-america', baseEur: 4.90 },
    { iso: 'pe', name: 'Perú', region: 'south-america', baseEur: 4.90 },
    { iso: 'au', name: 'Australia', region: 'oceania', baseEur: 4.90 },
    { iso: 'nz', name: 'Nueva Zelanda', region: 'oceania', baseEur: 4.90 },
    { iso: 'aw', name: 'Aruba', region: 'caribbean', baseEur: 5.90 },
    { iso: 'cw', name: 'Curazao', region: 'caribbean', baseEur: 5.90 },
    { iso: 'jm', name: 'Jamaica', region: 'caribbean', baseEur: 5.90 },
  ];

  // Dynamic regional markup calculations
  const applyMarkup = (plansList) => {
    const REGION_MARKUPS = {
      'europe': 2.10,
      'europe-morocco': 2.05,
      'north-america': 1.95,
      'aukus': 1.95,
      'china-hk-macau': 1.90,
      'east-asia': 1.85,
      'southeast-asia': 1.85,
      'asia': 1.80,
      'middle-east': 1.80,
      'australia-new-zealand': 1.80,
      'africa': 1.65,
      'south-america': 1.60,
      'caribbean': 1.50,
      'oceania': 1.70, // general oceania fallback
    };

    return plansList.map((p) => {
      let planRegion = (p.region || '').toLowerCase();
      const pIso = (p.iso || '').toLowerCase();

      // Detect region by comparing keys
      if (p.is_region && REGION_MARKUPS[pIso]) {
        planRegion = pIso;
      } else {
        const matchingCountry = countryMeta.find((c) => c.iso === pIso);
        if (matchingCountry) {
          planRegion = matchingCountry.region;
        }
      }

      // Special sub-region override rules
      if (pIso === 'jp' || pIso === 'kr' || pIso === 'tw') {
        planRegion = 'east-asia';
      }
      if (pIso === 'th' || pIso === 'vn' || pIso === 'sg' || pIso === 'id' || pIso === 'my') {
        planRegion = 'southeast-asia';
      }
      if (pIso === 'au' || pIso === 'nz') {
        planRegion = 'australia-new-zealand';
      }

      const multiplier = REGION_MARKUPS[planRegion] || 1.8928;
      const rawPrice = parseFloat(p.priceEur || p.price || 0);
      const markedUp = parseFloat((rawPrice * multiplier).toFixed(2));

      return {
        ...p,
        priceEur: markedUp,
        price: markedUp,
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

  const finalFallback = deduplicatePlans(fallbackPlans);
  return NextResponse.json({ success: true, plans: applyMarkup(finalFallback), count: finalFallback.length });
}
