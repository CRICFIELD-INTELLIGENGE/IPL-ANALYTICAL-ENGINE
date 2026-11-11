import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

const pos = 300813;
console.log(html.substring(pos - 1500, pos + 500));
