'use client';

import { getCountryName } from '../lib/i18n';

// Utility to normalize string (removes accents/diacritics and converts to lowercase)
export function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchesCountryQuery(iso, query, lang = 'es', customAliases = {}) {
  if (!query) return true;
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return true;

  const isoCode = (iso || '').toLowerCase();
  const nameEs = normalizeText(getCountryName(isoCode, 'es'));
  const nameEn = normalizeText(getCountryName(isoCode, 'en'));
  const currentLangName = normalizeText(getCountryName(isoCode, lang));
  const aliases = (customAliases[isoCode] || []).map(normalizeText);

  return (
    isoCode.includes(cleanQuery) ||
    nameEs.includes(cleanQuery) ||
    nameEn.includes(cleanQuery) ||
    currentLangName.includes(cleanQuery) ||
    aliases.some((alias) => alias.includes(cleanQuery))
  );
}
