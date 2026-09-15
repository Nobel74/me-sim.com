import { NextResponse } from 'next/server';
import { ALL_WORLD_COUNTRIES } from '../../../../lib/i18n';
import { strongesimFetch } from '../../../../lib/strongesim';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache 1 hora

const REGION_MARKUPS = {
  europe: 1.81,
  'europe-morocco': 1.76,
  'north-america': 1.66,
  aukus: 1.66,
  'china-hk-macau': 1.62,
  'east-asia': 1.60,
  'southeast-asia': 1.60,
  'middle-east': 1.61,
  asia: 1.54,
  'australia-new-zealand': 1.54,
  africa: 1.41,
  'south-america': 1.37,
  caribbean: 1.28,
  oceania: 1.48,
};

const DEFAULT_11_TIERS = [
  { dataAmount: '500 MB / Día', days: 1, mult: 0.59 },
  { dataAmount: '1 GB / Día', days: 1, mult: 0.8 },
  { dataAmount: '2 GB / Día', days: 1, mult: 1.0 },
  { dataAmount: '1 GB Total', days: 7, mult: 1.0 },
  { dataAmount: '2 GB Total', days: 15, mult: 1.6 },
  { dataAmount: '3 GB Total', days: 15, mult: 2.0 },
  { dataAmount: '3 GB Total', days: 30, mult: 2.1 },
  { dataAmount: '5 GB Total', days: 30, mult: 2.8 },
  { dataAmount: '10 GB Total', days: 30, mult: 4.2 },
  { dataAmount: '15 GB Total', days: 30, mult: 5.2 },
  { dataAmount: '20 GB Total', days: 30, mult: 6.2 },
];

function escapeXml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request) {
  const baseUrl = 'https://me-sim.com';
  const { searchParams } = new URL(request.url);
  const targetCountry = (searchParams.get('country') || '').toLowerCase().trim();

  let livePlans = [];
  try {
    const res = await strongesimFetch('/plans?limit=10000', { cache: 'no-store' });
    if (res && res.ok) {
      const data = await res.json();
      const rawList = data.plans || data.data || data.packages || (Array.isArray(data) ? data : []);
      if (Array.isArray(rawList)) {
        livePlans = rawList;
      }
    }
  } catch (err) {
    console.error('Error fetching live plans for Google Merchant Feed:', err);
  }

  // Filtrar países según consulta o todos los países del catálogo
  const countriesToExport = targetCountry
    ? ALL_WORLD_COUNTRIES.filter((c) => c.iso === targetCountry)
    : ALL_WORLD_COUNTRIES.filter((c) => c.iso !== 'global');

  const items = [];

  for (const country of countriesToExport) {
    const iso = country.iso.toLowerCase();
    const region = country.region || 'europe';
    const markup = REGION_MARKUPS[region] || 1.8928;
    const baseEur = country.baseEur || 4.90;

    // Buscar planes en vivo de StrongeSIM para este país
    const matchingLive = livePlans.filter((p) => {
      const pIso = (p.country_code || p.iso || p.isoCode || p.location || '').toLowerCase().trim();
      return pIso === iso || pIso.split(',').map((s) => s.trim()).includes(iso);
    });

    if (matchingLive.length > 0) {
      // Usar planes en vivo
      matchingLive.forEach((p, idx) => {
        const pDays = parseInt(p.validity_days || p.duration || p.days || 30, 10);
        let pData = p.dataAmount || p.data || '';
        if (!pData && p.data_volume_mb) {
          const mb = parseInt(p.data_volume_mb, 10);
          pData = mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB Total` : `${mb} MB Total`;
        }
        if (!pData) pData = `${pDays} Días`;

        const rawPrice = parseFloat(p.price || p.priceEur || baseEur);
        const finalPrice = (rawPrice * markup).toFixed(2);
        const itemId = `mesim_${iso}_${p.id || p.package_code || p.sku || `p${idx + 1}`}`;

        items.push({
          id: itemId,
          title: `eSIM ${country.nameEs} - ${pData} (${pDays} Días) | ME-SIM`,
          description: `Conexión a Internet 4G/5G de alta velocidad en ${country.nameEs} con eSIM prepago ME-SIM. Plan de ${pData} válido durante ${pDays} días. Activación inmediata vía código QR, sin roaming y sin contratos.`,
          link: `${baseUrl}/destination/${iso}`,
          imageLink: `${baseUrl}/flags/${iso === 'bq' ? 'bq.gif' : `${iso}.webp`}`,
          price: `${finalPrice} EUR`,
          brand: 'ME-SIM',
          region: country.region,
          countryName: country.nameEs,
        });
      });
    } else {
      // Usar los 11 tiers oficiales para este país
      DEFAULT_11_TIERS.forEach((tier, idx) => {
        const rawBase = baseEur * tier.mult;
        const finalPrice = (rawBase * markup).toFixed(2);
        const itemId = `mesim_${iso}_tier_${idx + 1}_${tier.days}d`;

        items.push({
          id: itemId,
          title: `eSIM ${country.nameEs} - ${tier.dataAmount} (${tier.days} Días) | ME-SIM`,
          description: `Conexión a Internet inmediata en ${country.nameEs} con eSIM prepago ME-SIM. Plan de datos ${tier.dataAmount} válido durante ${tier.days} días. Sin roaming internacional, compatible con smartphones desbloqueados.`,
          link: `${baseUrl}/destination/${iso}`,
          imageLink: `${baseUrl}/flags/${iso === 'bq' ? 'bq.gif' : `${iso}.webp`}`,
          price: `${finalPrice} EUR`,
          brand: 'ME-SIM',
          region: country.region,
          countryName: country.nameEs,
        });
      });
    }
  }

  // Generar XML con especificación Google Shopping RSS 2.0
  const xmlItems = items
    .map((item) => `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${escapeXml(item.price)}</g:price>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:google_product_category>536</g:google_product_category>
      <g:product_type>eSIM &gt; ${escapeXml(item.region)} &gt; ${escapeXml(item.countryName)}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`)
    .join('');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ME-SIM - Catálogo Oficial de Planes eSIM Prepago</title>
    <link>${baseUrl}</link>
    <description>Feed oficial de productos para Google Merchant Center con catálogo global de planes de datos eSIM de ME-SIM.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${xmlItems}
  </channel>
</rss>`;

  return new NextResponse(xmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
