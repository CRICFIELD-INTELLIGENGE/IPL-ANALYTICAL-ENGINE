import fs from 'fs';

const html = fs.readFileSync('./scripts/rcb_official_squad.html', 'utf8');

// Find a views-row snippet
const row = html.split('<div class="views-row">')[1];
console.log('=== ROW SNIPPET ===');
console.log(row.slice(0, 1000));
