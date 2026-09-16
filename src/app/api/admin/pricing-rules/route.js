import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminSessionFromRequest } from '../../../../lib/adminAuth';
import {
  getPricingRules,
  getPricingRulesAsync,
  saveDraftPricingRules,
  publishDraftToLive,
  rollbackToBackup,
  hasBackupAvailable,
  writeAtomicJson,
  DRAFT_RULES_FILE,
  computePlanPricing,
  mapIsoToRegion,
} from '../../../../lib/pricingRules';
import { ALL_WORLD_COUNTRIES } from '../../../../lib/i18n';
import { strongesimFetch } from '../../../../lib/strongesim';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'draft';
  const includeSample = searchParams.get('includeSample') === 'true';

  const liveRules = await getPricingRulesAsync('live');
  const draftRules = await getPricingRulesAsync('draft');
  const currentRules = mode === 'live' ? liveRules : draftRules;

  let samplePlans = [];
  if (includeSample) {
    try {
      const countryTiers = [
        { dataAmount: '500 MB / Día', days: 1, mult: 0.59 },
        { dataAmount: '1 GB / Día', days: 1, mult: 0.80 },
        { dataAmount: '2 GB / Día', days: 1, mult: 1.00 },
        { dataAmount: '1 GB Total', days: 7, mult: 1.00 },
        { dataAmount: '2 GB Total', days: 15, mult: 1.60 },
        { dataAmount: '3 GB Total', days: 15, mult: 2.00 },
        { dataAmount: '3 GB Total', days: 30, mult: 2.10 },
        { dataAmount: '5 GB Total', days: 30, mult: 2.80 },
        { dataAmount: '10 GB Total', days: 30, mult: 4.20 },
        { dataAmount: '15 GB Total', days: 30, mult: 5.20 },
        { dataAmount: '20 GB Total', days: 30, mult: 6.20 },
        { dataAmount: '30 GB Total', days: 30, mult: 8.00 },
        { dataAmount: '50 GB Total', days: 30, mult: 10.50 },
        { dataAmount: '100 GB Total', days: 30, mult: 16.00 },
      ];

      // 1. Mapear países individuales de ALL_WORLD_COUNTRIES
      ALL_WORLD_COUNTRIES.filter((c) => c.iso !== 'global').forEach((c) => {
        const pIso = c.iso.toLowerCase();
        const effectiveRegion = mapIsoToRegion(pIso, false, c.region);
        const baseCostEur = c.baseEur || 4.90;

        countryTiers.forEach((tier) => {
          const tierCostEur = parseFloat((baseCostEur * tier.mult).toFixed(2));
          const tierCostUsd = tierCostEur / (liveRules.usdToEurRate || 0.926);

          const livePricing = computePlanPricing(tierCostUsd, effectiveRegion, liveRules);
          const draftPricing = computePlanPricing(tierCostUsd, effectiveRegion, draftRules);
          const selectedPricing = mode === 'live' ? livePricing : draftPricing;

          const variationPct = livePricing.pvpFinal > 0
            ? parseFloat((((draftPricing.pvpFinal - livePricing.pvpFinal) / livePricing.pvpFinal) * 100).toFixed(1))
            : 0;

          samplePlans.push({
            id: `${pIso}-${tier.dataAmount.replace(/ /g, '').toLowerCase()}-${tier.days}d`,
            packageCode: `MS-${pIso.toUpperCase()}-${tier.days}D`,
            slug: `${pIso.toUpperCase()}_${tier.dataAmount.replace(/ /g, '_')}`,
            title: `${c.nameEs} ${tier.dataAmount} ${tier.days}d`,
            iso: pIso,
            countryNameEs: c.nameEs,
            countryNameEn: c.nameEn,
            region: effectiveRegion,
            dataAmount: tier.dataAmount,
            days: tier.days,
            costUsd: parseFloat(tierCostUsd.toFixed(2)),
            costEur: selectedPricing.costEur,
            costGbp: selectedPricing.costGbp,
            costAud: selectedPricing.costAud,
            multiplier: selectedPricing.multiplier,
            pvpFinal: selectedPricing.pvpFinal,
            pvpUsd: selectedPricing.pvpUsd,
            pvpGbp: selectedPricing.pvpGbp,
            pvpAud: selectedPricing.pvpAud,
            isFloorApplied: selectedPricing.isFloorApplied,
            isMinProfitApplied: selectedPricing.isMinProfitApplied,
            vat21: selectedPricing.vat21,
            baseImponible: selectedPricing.baseImponible,
            stripeFee: selectedPricing.stripeFee,
            profitNetEur: selectedPricing.profitNetEur,
            profitNetPct: selectedPricing.profitNetPct,
            livePvpFinal: livePricing.pvpFinal,
            draftPvpFinal: draftPricing.pvpFinal,
            variationPct,
          });
        });
      });

      // 2. Mapear paquetes regionales multi-destino (AUKUS, Europa-Marruecos, Global, Caribe, etc.)
      const regionMeta = [
        { iso: 'europe', nameEs: 'Europa Multidestino (35+ Países)', nameEn: 'Europe Multi-destination', region: 'europe', baseEur: 4.90 },
        { iso: 'asia', nameEs: 'Asia General (18 Países)', nameEn: 'Asia Multi-destination', region: 'asia', baseEur: 5.90 },
        { iso: 'north-america', nameEs: 'Norteamérica (3 Países)', nameEn: 'North America Multi-destination', region: 'north-america', baseEur: 5.90 },
        { iso: 'south-america', nameEs: 'América del Sur (14 Países)', nameEn: 'South America Multi-destination', region: 'south-america', baseEur: 6.90 },
        { iso: 'caribbean', nameEs: 'Caribe Multidestino (16 Islas)', nameEn: 'Caribbean Multi-destination', region: 'caribbean', baseEur: 6.90 },
        { iso: 'africa', nameEs: 'África Multidestino (26 Países)', nameEn: 'Africa Multi-destination', region: 'africa', baseEur: 7.90 },
        { iso: 'middle-east', nameEs: 'Oriente Medio (12 Países)', nameEn: 'Middle East Multi-destination', region: 'middle-east', baseEur: 5.90 },
        { iso: 'oceania', nameEs: 'Oceanía Multidestino (8 Países)', nameEn: 'Oceania Multi-destination', region: 'oceania', baseEur: 6.90 },
        { iso: 'aukus', nameEs: 'Alianza AUKUS (AU, UK, US)', nameEn: 'AUKUS Alliance', region: 'aukus', baseEur: 4.90 },
        { iso: 'china-hk-macau', nameEs: 'China + Hong Kong + Macao', nameEn: 'China + HK + Macau', region: 'china-hk-macau', baseEur: 4.90 },
        { iso: 'japan-korea-taiwan', nameEs: 'Japón, Corea y Taiwán', nameEn: 'Japan, Korea & Taiwan', region: 'japan-korea-taiwan', baseEur: 5.90 },
        { iso: 'southeast-asia', nameEs: 'Sudeste Asiático (SEA 10)', nameEn: 'Southeast Asia (SEA 10)', region: 'southeast-asia', baseEur: 5.90 },
        { iso: 'europe-morocco', nameEs: 'Europa + Marruecos (36+ Países)', nameEn: 'Europe + Morocco', region: 'europe-morocco', baseEur: 4.90 },
        { iso: 'global', nameEs: 'Global Multidestino (130+ Países)', nameEn: 'Global Multi-destination', region: 'global', baseEur: 9.90 },
      ];

      const regionTiers = [
        { dataAmount: '500 MB / Día', days: 1, mult: 0.60 },
        { dataAmount: '1 GB Total', days: 7, mult: 1.00 },
        { dataAmount: '3 GB Total', days: 15, mult: 1.80 },
        { dataAmount: '5 GB Total', days: 30, mult: 2.50 },
        { dataAmount: '10 GB Total', days: 30, mult: 3.80 },
        { dataAmount: '15 GB Total', days: 30, mult: 4.80 },
        { dataAmount: '20 GB Total', days: 30, mult: 5.80, isBestChoice: true },
        { dataAmount: '30 GB Total', days: 30, mult: 7.50 },
        { dataAmount: '50 GB Total', days: 30, mult: 10.00 },
        { dataAmount: '100 GB Total', days: 30, mult: 15.00 },
      ];

      regionMeta.forEach((r) => {
        const pIso = r.iso.toLowerCase();
        const effectiveRegion = r.region;
        const baseCostEur = r.baseEur || 5.90;

        regionTiers.forEach((tier) => {
          const tierCostEur = parseFloat((baseCostEur * tier.mult).toFixed(2));
          const tierCostUsd = tierCostEur / (liveRules.usdToEurRate || 0.926);

          const livePricing = computePlanPricing(tierCostUsd, effectiveRegion, liveRules);
          const draftPricing = computePlanPricing(tierCostUsd, effectiveRegion, draftRules);
          const selectedPricing = mode === 'live' ? livePricing : draftPricing;

          const variationPct = livePricing.pvpFinal > 0
            ? parseFloat((((draftPricing.pvpFinal - livePricing.pvpFinal) / livePricing.pvpFinal) * 100).toFixed(1))
            : 0;

          samplePlans.push({
            id: `reg-${pIso}-${tier.dataAmount.replace(/ /g, '').toLowerCase()}-${tier.days}d`,
            packageCode: `MS-REG-${pIso.toUpperCase()}-${tier.days}D`,
            slug: `REG_${pIso.toUpperCase()}_${tier.dataAmount.replace(/ /g, '_')}`,
            title: `${r.nameEs} ${tier.dataAmount} ${tier.days}d`,
            iso: pIso.toUpperCase(),
            countryNameEs: r.nameEs,
            countryNameEn: r.nameEn,
            region: effectiveRegion,
            dataAmount: tier.dataAmount,
            days: tier.days,
            costUsd: parseFloat(tierCostUsd.toFixed(2)),
            costEur: selectedPricing.costEur,
            costGbp: selectedPricing.costGbp,
            costAud: selectedPricing.costAud,
            multiplier: selectedPricing.multiplier,
            pvpFinal: selectedPricing.pvpFinal,
            pvpUsd: selectedPricing.pvpUsd,
            pvpGbp: selectedPricing.pvpGbp,
            pvpAud: selectedPricing.pvpAud,
            isFloorApplied: selectedPricing.isFloorApplied,
            isMinProfitApplied: selectedPricing.isMinProfitApplied,
            vat21: selectedPricing.vat21,
            baseImponible: selectedPricing.baseImponible,
            stripeFee: selectedPricing.stripeFee,
            profitNetEur: selectedPricing.profitNetEur,
            profitNetPct: selectedPricing.profitNetPct,
            livePvpFinal: livePricing.pvpFinal,
            draftPvpFinal: draftPricing.pvpFinal,
            variationPct,
          });
        });
      });
    } catch (err) {
      console.warn('GET /api/admin/pricing-rules: Error preparando muestra de planes comerciales:', err.message);
    }
  }

  return NextResponse.json({
    success: true,
    mode,
    rules: currentRules,
    liveRules,
    draftRules,
    hasBackup: hasBackupAvailable(),
    samplePlans,
  });
}

export async function POST(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Permiso denegado. Se requieren privilegios de administrador.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action || 'save_draft';

    if (action === 'rollback') {
      const rollbackResult = await rollbackToBackup(session.email || 'admin');
      if (rollbackResult.success) {
        try {
          revalidatePath('/api/plans');
        } catch (e) {}
        return NextResponse.json({
          success: true,
          message: 'Versión anterior restablecida con éxito mediante Rollback.',
          rules: rollbackResult.rules,
        });
      }
      return NextResponse.json({ success: false, message: rollbackResult.error }, { status: 400 });
    }

    if (action === 'reset_draft') {
      const live = await getPricingRulesAsync('live');
      const resetPayload = {
        ...live,
        updatedAt: new Date().toISOString(),
        updatedBy: `${session.email}_reset`,
      };
      writeAtomicJson(DRAFT_RULES_FILE, resetPayload);
      return NextResponse.json({
        success: true,
        message: 'Borrador restablecido a partir de la configuración En Vivo.',
        rules: resetPayload,
      });
    }

    // Por defecto: guardar borrador
    const rulesToSave = body.rules || body;
    const saveResult = await saveDraftPricingRules(rulesToSave, session.email || 'admin');
    if (saveResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Borrador de reglas de precios guardado con éxito.',
        rules: saveResult.rules,
      });
    }

    return NextResponse.json({ success: false, message: saveResult.error }, { status: 400 });
  } catch (err) {
    console.error('POST /api/admin/pricing-rules error:', err);
    return NextResponse.json({ success: false, message: 'Error procesando solicitud', error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = getAdminSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Permiso denegado. Se requieren privilegios de administrador.' }, { status: 403 });
  }

  try {
    const publishResult = await publishDraftToLive(session.email || 'admin');
    if (publishResult.success) {
      // Forzar invalidación de caché en toda la plataforma
      try {
        revalidatePath('/api/plans');
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: 'Reglas de precios publicadas en Producción exitosamente. Copia de seguridad guardada.',
        rules: publishResult.rules,
      });
    }

    return NextResponse.json({ success: false, message: publishResult.error }, { status: 400 });
  } catch (err) {
    console.error('PUT /api/admin/pricing-rules error:', err);
    return NextResponse.json({ success: false, message: 'Error publicando reglas a producción', error: err.message }, { status: 500 });
  }
}
