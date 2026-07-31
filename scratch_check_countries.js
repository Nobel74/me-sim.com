const fs = require('fs');
const path = require('path');

// Read i18n file to get ALL_WORLD_COUNTRIES content
const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.js');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Simple regex extraction of ISO codes from i18n.js
const isoMatches = [...i18nContent.matchAll(/iso:\s*'([^']+)'/g)].map(m => m[1]);
const uniqueIsos = new Set(isoMatches.map(iso => iso.toLowerCase()));

// Read flag directory
const flagsDir = path.join(__dirname, 'public', 'flags');
const flagFiles = fs.readdirSync(flagsDir);

console.log('Comparing flags with i18n.js...\n');
console.log(`Total unique ISOs in i18n.js: ${uniqueIsos.size}`);

const missingInI18n = [];
flagFiles.forEach(file => {
  if (file.endsWith('.webp')) {
    const iso = path.basename(file, '.webp').toLowerCase();
    
    // Ignore regional multi-country flag files
    const ignores = ['africa', 'asia', 'australia-new-zealand', 'balkans', 'caribbean', 'central-asia', 'europe-morocco', 'europe', 'gcc', 'gulf-region', 'ireland-slovenia', 'ireland-uk', 'japan-south-korea', 'middle-east-north-africa', 'middle-east', 'north-america', 'oceania-orange', 'singapore-malaysia-thailand', 'singapore-malaysia-vietnam-thailand-indonesia', 'singapore-malaysia', 'south-america', 'usa-canada'];
    if (ignores.includes(iso)) return;

    if (!uniqueIsos.has(iso)) {
      missingInI18n.push(iso);
    }
  }
});

console.log(`Flags with NO entry in i18n.js (${missingInI18n.length}):`);
console.log(missingInI18n.join(', '));
