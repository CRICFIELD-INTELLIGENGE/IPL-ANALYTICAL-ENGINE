import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

// Find all occurrences of 2138
const re = /player(?:%2F|\/)8903(?:%2F|\/)2138(?:%2F|\/)([0-9]+)\.png/g;
let m;
const playerIds = new Set();
while ((m = re.exec(html)) !== null) {
  playerIds.add(m[1]);
}

console.log('Player IDs found in HTML with 2138:', [...playerIds]);

// Also search for any api calls or json endpoints in HTML
const apiMatches = [...new Set(html.match(/\/api\/[a-zA-Z0-9_\-\/?&=%]+/g) || [])];
console.log('API endpoints mentioned in HTML:');
apiMatches.forEach(a => console.log(a));
