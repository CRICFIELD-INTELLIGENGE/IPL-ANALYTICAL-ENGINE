import fs from 'fs';

const html = fs.readFileSync('scripts/rcb_official_men.html', 'utf8');
const regex = /<img[^>]+alt=["']([^"']+)["'][^>]+data-src=["']([^"']+)["']/gi;
let match;
const players = [];
while ((match = regex.exec(html)) !== null) {
  players.push({ alt: match[1], src: match[2] });
}

console.log('Total players/staff extracted:', players.length);
console.log(JSON.stringify(players, null, 2));
