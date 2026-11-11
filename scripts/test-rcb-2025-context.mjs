import fs from 'fs';

const reg = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/player-photo-registry.json', 'utf8'));

// Simulated resolver logic
function resolvePhoto(playerName, teamId, season) {
  const norm = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // 1. Exact match for season + franchise
  const exact = reg.photos.find(p => 
    p.season === season &&
    p.franchiseId === teamId &&
    p.verificationStatus === 'exact_verified' &&
    (p.aliases?.some(a => a.toLowerCase() === playerName.toLowerCase() || a.toLowerCase().replace(/[^a-z0-9]+/g, '-') === norm) ||
     p.playerId === norm ||
     p.playerId?.replace(/^[a-z]-/, '') === norm.replace(/^[a-z]-/, ''))
  );
  if (exact) return { status: 'exact_verified', photo: exact };

  return { status: 'fallback', photo: null };
}

const squads = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/squads-by-season.json', 'utf8'));
const rcb2025 = squads['2025']['Royal Challengers Bengaluru'];

console.log('====================================================');
console.log('CONTEXT: RCB 2025 SQUAD (Target: 2025 RCB Kit Cutout)');
console.log('====================================================');

let verified = 0;
for (const p of rcb2025) {
  const res = resolvePhoto(p.name, 'RCB', 2025);
  if (res.status === 'exact_verified') {
    verified++;
    console.log(`${p.name.padEnd(20)}: EXACT VERIFIED -> ${res.photo.imageUrl} [${res.photo.attribution}]`);
  } else {
    console.log(`${p.name.padEnd(20)}: ${res.status}`);
  }
}

console.log(`\nRCB 2025 Squad exact verified: ${verified} / ${rcb2025.length} (${Math.round(verified/rcb2025.length*100)}%)`);
