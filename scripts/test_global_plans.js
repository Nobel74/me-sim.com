import fs from 'fs';
import { REGION_MAPPING, isPlanInRegion } from '../src/lib/regionMapping.js';

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
  const rawPlans = data.plans || data.data || [];

  const regionalItems = [];
  for (const [slug, def] of Object.entries(REGION_MAPPING)) {
    const matched = rawPlans.filter((p) => isPlanInRegion(p, slug));
    matched.forEach((p) => {
      regionalItems.push({
        id: p.id,
        title: p.name,
        iso: slug,
        region: def.canonicalSlug,
        is_region: true,
        costUsd: parseFloat(p.price || 0),
      });
    });
  }

  console.log('Total regional plans extracted:', regionalItems.length);
  const bySlug = {};
  regionalItems.forEach((p) => {
    bySlug[p.iso] = (bySlug[p.iso] || 0) + 1;
  });
  console.log('Plans per region in global catalog:', bySlug);
}

main().catch(console.error);
