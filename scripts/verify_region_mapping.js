import fs from 'fs';
import { REGION_MAPPING, getRegionDefinition, isRegionalSlug, isPlanInRegion, normalizeRegionSlug } from '../src/lib/regionMapping.js';

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
  const { strongesimFetch } = await import('../src/lib/strongesim.js');
  const res = await strongesimFetch('/plans?limit=10000');
  const data = await res.json();
  const plans = data.plans || data.data || data.packages || [];

  console.log(`Fetched ${plans.length} total plans.`);

  const testCases = [
    'middle-east',
    'europe',
    'asia',
    'north-america',
    'south-america',
    'latin-america',
    'caribbean',
    'africa',
    'oceania',
    'australia-new-zealand',
    'aukus',
    'china-hk-macau',
    'japan-korea-taiwan',
    'east-asia',
    'southeast-asia',
    'europe-morocco',
    'global',
  ];

  console.log('\n--- REGIONAL AUDIT ---');
  for (const slug of testCases) {
    const canonical = normalizeRegionSlug(slug);
    const matched = plans.filter((p) => isPlanInRegion(p, slug));
    console.log(`Slug: "${slug}" -> Canonical: "${canonical}" | Matched: ${matched.length} live plans`);
    if (matched.length === 0) {
      console.error(`  ❌ ERROR: 0 plans matched for ${slug}!`);
    } else {
      const p1gb7d = matched.find((p) => {
        const d = parseInt(p.duration || p.validity_days || 0, 10);
        const mb = parseInt(p.data_volume_mb || 0, 10);
        return d === 7 && (mb === 1024 || (p.name || '').includes('1GB'));
      });
      if (p1gb7d) {
        console.log(`  -> 1GB 7D: "${p1gb7d.name}" | RC: ${p1gb7d.regionCode} | Wholesale: $${p1gb7d.price} USD`);
      } else {
        console.log(`  -> Sample: "${matched[0].name}" | RC: ${matched[0].regionCode} | Wholesale: $${matched[0].price} USD`);
      }
    }
  }

  console.log('\n--- COUNTRY PLANS REGRESSION CHECK ---');
  const countryChecks = ['es', 'tr', 'us', 'fr', 'jp'];
  for (const iso of countryChecks) {
    const isReg = isRegionalSlug(iso);
    const countryPlans = plans.filter((p) => (p.country_code || '').toLowerCase() === iso);
    console.log(`Country "${iso}": isRegionalSlug = ${isReg} (expected false) | Found ${countryPlans.length} live plans`);
  }
}

main().catch(console.error);
