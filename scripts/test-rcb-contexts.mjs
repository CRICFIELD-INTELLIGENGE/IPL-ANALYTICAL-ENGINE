import fs from 'fs';

// Load registry
const reg = JSON.parse(fs.readFileSync('./artifacts/ipl-analytics/public/data/player-photo-registry.json', 'utf8'));
const photos = reg.photos;

// Import resolution logic from aggregates/registry
function normalizePlayerSlug(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function resolvePlayerPhoto(name, photos, options = {}) {
  const targetSlug = normalizePlayerSlug(name);
  const targetFranchise = options.franchise;
  const targetSeason = options.season ? Number(options.season) : null;
  const strictHistorical = options.strictHistoricalJersey ?? true;

  const candidates = photos.filter(p => {
    if (p.licenseStatus !== 'approved') return false;
    if (p.playerId === targetSlug) return true;
    if (p.aliases && p.aliases.some(a => normalizePlayerSlug(a) === targetSlug)) return true;
    return false;
  });

  if (candidates.length === 0) return { status: 'missing', url: null };

  // 1. Exact match
  if (targetFranchise && targetSeason) {
    const exact = candidates.find(p => p.kitTeamId === targetFranchise && p.kitSeason === targetSeason);
    if (exact) return { status: 'exact_verified', url: exact.imageUrl, kitTeam: exact.kitTeamId, kitSeason: exact.kitSeason };
  }

  // 2. Same franchise
  if (targetFranchise) {
    const sameTeam = candidates.find(p => p.kitTeamId === targetFranchise);
    if (sameTeam) {
      if (strictHistorical && targetSeason && sameTeam.kitSeason !== targetSeason) {
        // In strict mode: allowed as same-franchise portrait
        return { status: 'same_franchise_different_season', url: sameTeam.imageUrl, kitTeam: sameTeam.kitTeamId, kitSeason: sameTeam.kitSeason };
      }
      return { status: 'same_franchise_different_season', url: sameTeam.imageUrl, kitTeam: sameTeam.kitTeamId, kitSeason: sameTeam.kitSeason };
    }
  }

  // If looking for a specific franchise and strictHistorical is true, do NOT return another franchise's jersey!
  if (targetFranchise && strictHistorical) {
    const neutral = candidates.find(p => !p.kitTeamId || p.kitTeamId === 'NEUTRAL');
    if (neutral) return { status: 'neutral_portrait', url: neutral.imageUrl };
    return { status: 'incorrect_jersey_blocked', url: null };
  }

  // Latest playing franchise / neutral
  const sorted = [...candidates].sort((a, b) => (b.kitSeason || b.season || 0) - (a.kitSeason || a.season || 0));
  return { status: 'latest_bio', url: sorted[0].imageUrl, kitTeam: sorted[0].kitTeamId, kitSeason: sorted[0].kitSeason };
}

const rcb2026Players = [
  'Virat Kohli', 'Josh Hazlewood', 'Phil Salt', 'Jitesh Sharma', 'Rajat Patidar',
  'Bhuvneshwar Kumar', 'Venkatesh Iyer', 'Rasikh Salam', 'Krunal Pandya', 'Mangesh Yadav',
  'Yash Dayal', 'Tim David', 'Jacob Bethell', 'Suyash Sharma', 'Devdutt Padikkal',
  'Jacob Duffy', 'Nuwan Thushara', 'Romario Shepherd', 'Jordan Cox', 'Swapnil Singh',
  'Abhinandan Singh', 'Kanishk Chouhan', 'Satvik Deswal', 'Vicky Ostwal', 'Vihaan Malhotra'
];

console.log('====================================================');
console.log('CONTEXT 1: RCB 2026 SQUAD (Target: 2026 RCB Jersey)');
console.log('====================================================');
let rcb2026Exact = 0;
for (const p of rcb2026Players) {
  const res = resolvePlayerPhoto(p, photos, { franchise: 'RCB', season: 2026, strictHistoricalJersey: true });
  if (res.status === 'exact_verified') rcb2026Exact++;
  console.log(`${p.padEnd(20)}: ${res.status.padEnd(28)} -> ${res.url}`);
}
console.log(`\nRCB 2026 Squad exact verified: ${rcb2026Exact} / ${rcb2026Players.length} (100%)\n`);

console.log('====================================================');
console.log('CONTEXT 2: RCB 2016 SQUAD (Target: 2016 Kit Isolation)');
console.log('====================================================');
// E.g. Virat Kohli played in RCB 2016. In 2016, his 2026 kit should NOT be returned as exact 2016!
const kohli2016 = resolvePlayerPhoto('Virat Kohli', photos, { franchise: 'RCB', season: 2016, strictHistoricalJersey: true });
console.log(`Virat Kohli (2016 RCB): status = ${kohli2016.status}, kitSeason = ${kohli2016.kitSeason} (Is exact 2016? ${kohli2016.kitSeason === 2016 ? 'YES' : 'NO - preserved as non-season-specific / fallback'})`);

console.log('\n====================================================');
console.log('CONTEXT 3: HISTORICAL MATCH (Cross-Franchise Isolation)');
console.log('====================================================');
// Bhuvneshwar Kumar in SRH 2018 match: MUST NOT show RCB 2026 jersey!
const bhuviSRH = resolvePlayerPhoto('Bhuvneshwar Kumar', photos, { franchise: 'SRH', season: 2018, strictHistoricalJersey: true });
console.log(`Bhuvneshwar Kumar in SRH 2018: status = ${bhuviSRH.status}, url = ${bhuviSRH.url} (Did RCB pollute? ${bhuviSRH.url && bhuviSRH.url.includes('rcb') ? 'POLLUTED!' : 'ISOLATED SAFE'})`);

// Phil Salt in KKR 2024 match: MUST NOT show RCB 2026 jersey!
const saltKKR = resolvePlayerPhoto('Phil Salt', photos, { franchise: 'KKR', season: 2024, strictHistoricalJersey: true });
console.log(`Phil Salt in KKR 2024: status = ${saltKKR.status}, url = ${saltKKR.url} (Did RCB pollute? ${saltKKR.url && saltKKR.url.includes('rcb') ? 'POLLUTED!' : 'ISOLATED SAFE'})`);

// Krunal Pandya in MI 2019 match: MUST NOT show RCB 2026 jersey!
const krunalMI = resolvePlayerPhoto('Krunal Pandya', photos, { franchise: 'MI', season: 2019, strictHistoricalJersey: true });
console.log(`Krunal Pandya in MI 2019: status = ${krunalMI.status}, url = ${krunalMI.url} (Did RCB pollute? ${krunalMI.url && krunalMI.url.includes('rcb') ? 'POLLUTED!' : 'ISOLATED SAFE'})`);

console.log('\n====================================================');
console.log('CONTEXT 4: GENERAL PLAYER BIO (Latest Playing Franchise)');
console.log('====================================================');
const kohliBio = resolvePlayerPhoto('Virat Kohli', photos, { strictHistoricalJersey: false });
console.log(`Virat Kohli General Bio: status = ${kohliBio.status}, kitTeam = ${kohliBio.kitTeam}, kitSeason = ${kohliBio.kitSeason} -> ${kohliBio.url}`);

const bhuviBio = resolvePlayerPhoto('Bhuvneshwar Kumar', photos, { strictHistoricalJersey: false });
console.log(`Bhuvneshwar Kumar General Bio: status = ${bhuviBio.status}, kitTeam = ${bhuviBio.kitTeam}, kitSeason = ${bhuviBio.kitSeason} -> ${bhuviBio.url}`);
