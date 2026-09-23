import { NextResponse } from 'next/server.js';
import { revalidatePath } from 'next/cache.js';
import { getAdminSessionFromRequest } from '../../../../lib/adminAuth.js';
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
} from '../../../../lib/pricingRules.js';
import { ALL_WORLD_COUNTRIES } from '../../../../lib/i18n.js';
import { strongesimFetch } from '../../../../lib/strongesim.js';
import { REGION_MAPPING, isPlanInRegion } from '../../../../lib/regionMapping.js';

export const dynamic = 'force-dynamic';

const countryNameMap = new Map();
ALL_WORLD_COUNTRIES.forEach((c) => {
  countryNameMap.set(c.iso.toLowerCase(), { nameEs: c.nameEs, nameEn: c.nameEn, region: c.region });
});

let cachedMasterPlans = null;
let cachedMasterPlansExpiresAt = 0;

async function getMasterLivePlans() {
  const now = Date.now();
  if (cachedMasterPlans && now < cachedMasterPlansExpiresAt) {
    return cachedMasterPlans;
  }

  try {
    let response = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (!response.ok) {
      response = await strongesimFetch('/plans-v2', { cache: 'no-store' });
    }

    if (response && response.ok) {
      const data = await response.json();
      const rawPlans = data.plans || data.data || data.packages || (Array.isArray(data) ? data : []);
      if (rawPlans && rawPlans.length > 0) {
        function mapSinglePlan(p, targetIso = null, targetRegion = null, isRegion = false, countryName = null) {
          const pIso = (p.country_code || p.iso || p.isoCode || p.location || '').toLowerCase().trim();
          const pDays = parseInt(p.validity_days || p.duration || p.days || p.validity || 30, 10);
          let pDataAmount = p.dataAmount || p.data || '';
          if (!pDataAmount && p.data_volume_mb) {
            const mb = parseInt(p.data_volume_mb, 10);
            pDataAmount = mb >= 1024
              ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB Total`
              : `${mb} MB Total`;
          }
          const costUsd = parseFloat(p.price || 0);

          return {
            id: p.id,
            packageCode: p.package_code || p.packageCode || p.code || p.sku,
            title: p.name || p.title,
            country: countryName || (isRegion ? (targetRegion || p.region) : (p.country || p.country_name)),
            iso: targetIso || pIso,
            region: targetRegion || (p.region || 'europe'),
            dataAmount: pDataAmount || (pDays === 1 ? '1 GB / Día' : '1 GB Total'),
            days: pDays,
            costUsd: costUsd,
            is_region: isRegion,
            isUnlimited: (p.name || '').toLowerCase().includes('unlimited') || (p.name || '').toLowerCase().includes('ilimitad'),
          };
        }

        let mappedPlans = rawPlans.map((p) => mapSinglePlan(p, null, null, false));
        for (const [slug, def] of Object.entries(REGION_MAPPING)) {
          const matchedReg = rawPlans.filter((p) => isPlanInRegion(p, slug));
          matchedReg.forEach((p) => {
            mappedPlans.push(mapSinglePlan(p, slug, def.canonicalSlug, true, def.nameEs));
          });
        }

        // Deduplicate keeping best wholesale cost per ISO + dataAmount + days
        const uniqueMap = new Map();
        mappedPlans.forEach((p) => {
          const key = `${p.iso}-${p.dataAmount}-${p.days}`;
          if (!uniqueMap.has(key) || p.costUsd < uniqueMap.get(key).costUsd) {
            uniqueMap.set(key, p);
          }
        });

        cachedMasterPlans = Array.from(uniqueMap.values());
        cachedMasterPlansExpiresAt = now + 5 * 60 * 1000; // 5 min TTL
        return cachedMasterPlans;
      }
    }
  } catch (err) {
    console.warn('getMasterLivePlans: Error conectando con StrongeSIM:', err.message);
  }

  return cachedMasterPlans || [];
}

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
      const masterPlans = await getMasterLivePlans();
      if (masterPlans && masterPlans.length > 0) {
        samplePlans = masterPlans.map((p) => {
          const pIso = (p.iso || '').toLowerCase();
          const countryMeta = countryNameMap.get(pIso);
          const regionDef = REGION_MAPPING[pIso];

          const effectiveRegion = mapIsoToRegion(pIso, p.is_region, p.region || countryMeta?.region);

          const livePricing = computePlanPricing(p.costUsd, effectiveRegion, liveRules);
          const draftPricing = computePlanPricing(p.costUsd, effectiveRegion, draftRules);
          const selectedPricing = mode === 'live' ? livePricing : draftPricing;

          const variationPct = livePricing.pvpFinal > 0
            ? parseFloat((((draftPricing.pvpFinal - livePricing.pvpFinal) / livePricing.pvpFinal) * 100).toFixed(1))
            : 0;

          const countryNameEs = countryMeta?.nameEs || regionDef?.nameEs || p.country || pIso.toUpperCase();
          const countryNameEn = countryMeta?.nameEn || regionDef?.nameEn || p.country || pIso.toUpperCase();

          return {
            id: p.id,
            packageCode: p.packageCode || `MS-${pIso.toUpperCase()}-${p.days}D`,
            slug: `${pIso.toUpperCase()}_${p.dataAmount.replace(/ /g, '_')}`,
            title: p.title,
            iso: pIso.toUpperCase(),
            countryNameEs,
            countryNameEn,
            region: effectiveRegion,
            dataAmount: p.dataAmount,
            days: p.days,
            costUsd: p.costUsd,
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
            isUnlimited: p.isUnlimited,
          };
        });
      } else {
        // Fallback de contingencia técnica si StrongeSIM está inaccesible
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
              iso: pIso.toUpperCase(),
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
      }
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
        cachedMasterPlans = null;
        cachedMasterPlansExpiresAt = 0;
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
      cachedMasterPlans = null;
      cachedMasterPlansExpiresAt = 0;
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
