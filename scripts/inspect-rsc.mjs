import fs from 'fs';

const rsc = fs.readFileSync('scripts/iplt20_rcb_squad_rsc.txt', 'utf8');

// Find all occurrences of "name":"..."
const names = [...new Set([...rsc.matchAll(/"name":"([^"]+)"/g)].map(m => m[1]))];
console.log('Names found in RSC flight data:');
console.log(names);

// Find all imageUrls
const urls = [...new Set([...rsc.matchAll(/https:\/\/[^"\\]+/g)].map(m => m[0]))];
console.log('URLs found in RSC flight data:');
urls.filter(u => u.includes('player') || u.includes('team-assets')).forEach(u => console.log(u));
