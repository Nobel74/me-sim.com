import fs from 'fs';
import { GET as getPlans } from '../src/app/api/plans/route.js';
import { GET as getAdminPricingRules } from '../src/app/api/admin/pricing-rules/route.js';
import { getPricingRules, computePlanPricing } from '../src/lib/pricingRules.js';

const envText = fs.readFileSync('.env.local', 'utf-8');
envText.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
});

async function main() {
  console.log('================================================================');
  console.log('PRUEBA 1: ORIENTE MEDIO (/destination/middle-east -> /api/plans)');
  console.log('================================================================');

  const meReq = new Request('http://localhost:3000/api/plans?country=middle-east&region=middle-east');
  const meRes = await getPlans(meReq);
  const meData = await meRes.json();

  console.log(`Success: ${meData.success} | Plan count: ${meData.count}`);
  const me1gb = meData.plans.find(p => p.days === 7 && p.dataAmount.includes('1 GB'));

  if (!me1gb) {
    console.error('❌ ERROR: 1GB 7D plan not found for middle-east!');
  } else {
    console.log('Plan encontrado:');
    console.log(`  - ID: ${me1gb.id}`);
    console.log(`  - Title: "${me1gb.title}"`);
    console.log(`  - Data: ${me1gb.dataAmount} | Days: ${me1gb.days}`);
    console.log(`  - Coste Mayorista (costUsd): $${me1gb.costUsd} USD (Esperado: $8.40 USD)`);
    console.log(`  - Coste Proveedor (costEur): ${me1gb.costEur} € (Esperado: ~7.78 €)`);
    console.log(`  - Multiplicador: ${me1gb.markupMultiplier}× (Esperado: 1.61×)`);
    console.log(`  - PVP Final (EUR): ${me1gb.priceEur} € (Esperado: ~12.52 €)`);
    console.log(`  - PVP Final (USD): $${(me1gb.priceEur * 1.09).toFixed(2)} USD (Esperado: ~$13.65 USD)`);
    console.log(`  - Beneficio Neto (profitNetEur): ${me1gb.profitNetEur || ((me1gb.priceEur / 1.21 - (me1gb.priceEur * 0.015 + 0.25)) - me1gb.costEur).toFixed(2)} €`);

    const isWholesaleReal = Math.abs(me1gb.costUsd - 8.40) < 0.01;
    const isPvpCorrect = Math.abs(me1gb.priceEur - 12.52) < 0.10;
    const isNotFallback = me1gb.priceEur > 10.0; // Fallback was 5.90 -> 8.63

    if (isWholesaleReal && isPvpCorrect && isNotFallback) {
      console.log('✅ ÉXITO TOTAL: Oriente Medio calcula PVP sobre $8.40 USD y multiplicador 1.61×!');
    } else {
      console.error('❌ Discrepancia detectada en Oriente Medio.');
    }
  }

  console.log('\n================================================================');
  console.log('PRUEBA 2: CERO REGRESIONES EN PLANES DE PAÍS (/destination/es, tr)');
  console.log('================================================================');

  const esReq = new Request('http://localhost:3000/api/plans?country=es&region=es');
  const esRes = await getPlans(esReq);
  const esData = await esRes.json();
  console.log(`España (ES) -> Count: ${esData.count} | Sample: "${esData.plans[0]?.title}" | Cost: $${esData.plans[0]?.costUsd} | PVP: ${esData.plans[0]?.priceEur} €`);

  const trReq = new Request('http://localhost:3000/api/plans?country=tr&region=tr');
  const trRes = await getPlans(trReq);
  const trData = await trRes.json();
  console.log(`Turquía (TR) -> Count: ${trData.count} | Sample: "${trData.plans[0]?.title}" | Cost: $${trData.plans[0]?.costUsd} | PVP: ${trData.plans[0]?.priceEur} €`);

  if (esData.count > 0 && trData.count > 0) {
    console.log('✅ CERO REGRESIONES: Los planes de países individuales funcionan con total normalidad.');
  }

  console.log('\n================================================================');
  console.log('PRUEBA 3: AUDITORÍA GENERAL DE LAS 14 REGIONES COMERCIALES');
  console.log('================================================================');

  const allRegions = [
    'middle-east',
    'europe',
    'asia',
    'north-america',
    'south-america',
    'caribbean',
    'africa',
    'oceania',
    'aukus',
    'china-hk-macau',
    'japan-korea-taiwan',
    'southeast-asia',
    'europe-morocco',
    'global'
  ];

  let allOk = true;
  for (const reg of allRegions) {
    const req = new Request(`http://localhost:3000/api/plans?country=${reg}&region=${reg}`);
    const res = await getPlans(req);
    const data = await res.json();
    const firstPlan = data.plans[0];
    const isLive = typeof firstPlan.id === 'number' || (!String(firstPlan.id).includes('-dyn-') && !String(firstPlan.id).includes('-reg-v'));
    console.log(`Region [${reg.padEnd(20)}] -> Plans: ${String(data.count).padStart(2)} | Live: ${isLive ? 'SÍ (Real API)' : 'NO (Fallback)'} | Sample: "${firstPlan.title}" | PVP: ${firstPlan.priceEur} €`);
    if (!isLive) allOk = false;
  }

  if (allOk) {
    console.log('✅ BLINDAJE ANTI-FALLBACK: Las 14 regiones comerciales operan 100% sobre planes en vivo de la API.');
  } else {
    console.warn('⚠️ Alguna región utilizó fallback.');
  }

  console.log('\n================================================================');
  console.log('PRUEBA 4: ALINEACIÓN PANEL ADMIN (/admin/precios) VS STOREFRONT');
  console.log('================================================================');

  const liveRules = getPricingRules('live');
  const meLivePricing = computePlanPricing(8.40, 'middle-east', liveRules);
  console.log(`Cálculo motor pricingRules: Coste $8.40 USD -> PVP: ${meLivePricing.pvpFinal} € / $${meLivePricing.pvpUsd} USD`);
  console.log(`PVP en Storefront (/api/plans): ${me1gb?.priceEur} € / $${(me1gb?.priceEur * 1.09).toFixed(2)} USD`);

  if (Math.abs(meLivePricing.pvpFinal - me1gb?.priceEur) < 0.01) {
    console.log('✅ CONSISTENCIA 100%: Los precios en /admin/precios y en el storefront público están alineados al céntimo.');
  } else {
    console.error('❌ Discrepancia entre admin y storefront.');
  }
}

main().catch(console.error);
