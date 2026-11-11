import fs from 'fs';

const text = fs.readFileSync('scratch/iplt20_rcb_2024_rsc.txt', 'utf8');

// Find all strings between quotes
const regex = /"([^"\\]{4,50})"/g;
let m;
const found = new Set();
while ((m = regex.exec(text)) !== null) {
  if (!m[1].includes('/') && !m[1].includes('.')) {
    found.add(m[1]);
  }
}

console.log('Sample strings in RSC:');
console.log(Array.from(found).slice(0, 50));
