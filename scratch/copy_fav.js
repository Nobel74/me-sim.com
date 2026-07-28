const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'assets', 'favicon', 'favicon.png');
const destPublic = path.join(__dirname, '..', 'public', 'favicon.png');
const destApp = path.join(__dirname, '..', 'src', 'app', 'icon.png');

fs.copyFileSync(src, destPublic);
fs.copyFileSync(src, destApp);
console.log('Favicon copied to public/favicon.png and src/app/icon.png');
