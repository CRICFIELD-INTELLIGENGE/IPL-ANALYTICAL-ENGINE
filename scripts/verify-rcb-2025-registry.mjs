import fs from 'fs';

const reg = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/player-photo-registry.json', 'utf8'));

console.log('--- Checking RCB 2025 in Registry ---');
const rcb2025 = reg.photos.filter(p => p.season === 2025 && p.franchiseId === 'RCB');
console.log(`Found ${rcb2025.length} RCB 2025 entries in registry:`);
rcb2025.forEach(p => console.log(`  ${p.key}: ${p.imageUrl} (${p.attribution})`));

console.log('\n--- Checking RCB 2026 in Registry ---');
const rcb2026 = reg.photos.filter(p => p.season === 2026 && p.franchiseId === 'RCB');
console.log(`Found ${rcb2026.length} RCB 2026 entries in registry`);

console.log('\n--- Checking No Collision between 2025 and 2026 keys ---');
const keys = new Set();
let duplicates = 0;
for (const p of reg.photos) {
  if (keys.has(p.key)) {
    console.error('DUPLICATE KEY:', p.key);
    duplicates++;
  }
  keys.add(p.key);
}
console.log(`Total keys: ${keys.size}, Duplicates: ${duplicates}`);
