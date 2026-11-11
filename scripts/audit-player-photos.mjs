import fs from 'fs';
import path from 'path';

const squadsPath = './artifacts/ipl-analytics/public/data/squads-by-season.json';
const biosPath = './artifacts/ipl-analytics/public/data/player-bio.json';
const playerImagesPath = './artifacts/ipl-analytics/public/data/player-images.json';
const playersListPath = './artifacts/ipl-analytics/public/data/players.json';

const squads = JSON.parse(fs.readFileSync(squadsPath, 'utf8'));
const bios = JSON.parse(fs.readFileSync(biosPath, 'utf8'));
const localImages = JSON.parse(fs.readFileSync(playerImagesPath, 'utf8'));
const playersList = JSON.parse(fs.readFileSync(playersListPath, 'utf8'));

const slugOf = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const playerMap = new Map();

// Populate from squads
for (const [season, teams] of Object.entries(squads)) {
  for (const [team, teamPlayers] of Object.entries(teams)) {
    for (const p of teamPlayers) {
      const slug = slugOf(p.cricsheetName || p.name);
      if (!playerMap.has(slug)) {
        playerMap.set(slug, {
          slug,
          name: p.name,
          cricsheetName: p.cricsheetName,
          aliases: new Set([p.name]),
          seasons: new Map(), // season -> Set of teams
          country: p.country,
          role: p.role,
        });
      }
      const entry = playerMap.get(slug);
      entry.aliases.add(p.name);
      if (p.cricsheetName) entry.aliases.add(p.cricsheetName);
      if (!entry.seasons.has(season)) entry.seasons.set(season, new Set());
      entry.seasons.get(season).add(team);
      if (!entry.country && p.country) entry.country = p.country;
      if (!entry.role && p.role) entry.role = p.role;
    }
  }
}

// Correlate with player-bio.json
const biosKeys = Object.keys(bios);
let matchedBios = 0;
let hasDirectImage = 0;
let hasBrokenOrHtmlLink = 0;

for (const [slug, entry] of playerMap.entries()) {
  let matchedBio = bios[slug] || null;
  if (!matchedBio && entry.cricsheetName) matchedBio = bios[slugOf(entry.cricsheetName)];
  if (!matchedBio) {
    for (const alias of entry.aliases) {
      if (bios[slugOf(alias)]) {
        matchedBio = bios[slugOf(alias)];
        break;
      }
    }
  }

  entry.bio = matchedBio;
  if (matchedBio) {
    matchedBios++;
    if (matchedBio.image) {
      if (matchedBio.image.startsWith('http') && !matchedBio.image.includes('espncricinfo.com/cricketers/')) {
        hasDirectImage++;
        entry.bioImageUrl = matchedBio.image;
      } else {
        hasBrokenOrHtmlLink++;
        entry.brokenImageUrl = matchedBio.image;
      }
    }
  }

  // Check local images
  for (const alias of entry.aliases) {
    if (localImages[alias]) {
      entry.localImage = localImages[alias];
      break;
    }
  }
}

// Summary stats
const totalUniquePlayers = playerMap.size;
let playersWithAnyImage = 0;
let playersWithLocalCurated = 0;
let playersWithBioCdn = 0;
let playersMissingAllPhotos = 0;

// Era-based coverage
const eraStats = {
  '2008-2012 (Early Era)': { totalRosters: 0, coveredRosters: 0 },
  '2013-2018 (Middle Era)': { totalRosters: 0, coveredRosters: 0 },
  '2019-2023 (Modern Era)': { totalRosters: 0, coveredRosters: 0 },
  '2024-2026 (Current Era)': { totalRosters: 0, coveredRosters: 0 },
};

const franchiseStats = {};

for (const entry of playerMap.values()) {
  const hasImage = Boolean(entry.localImage || entry.bioImageUrl);
  if (hasImage) playersWithAnyImage++;
  else playersMissingAllPhotos++;

  if (entry.localImage) playersWithLocalCurated++;
  if (entry.bioImageUrl) playersWithBioCdn++;

  for (const [s, teams] of entry.seasons.entries()) {
    const year = Number(s);
    let eraKey = '2008-2012 (Early Era)';
    if (year >= 2024) eraKey = '2024-2026 (Current Era)';
    else if (year >= 2019) eraKey = '2019-2023 (Modern Era)';
    else if (year >= 2013) eraKey = '2013-2018 (Middle Era)';

    for (const t of teams) {
      eraStats[eraKey].totalRosters++;
      if (hasImage) eraStats[eraKey].coveredRosters++;

      if (!franchiseStats[t]) franchiseStats[t] = { total: 0, covered: 0, missing: 0 };
      franchiseStats[t].total++;
      if (hasImage) franchiseStats[t].covered++;
      else franchiseStats[t].missing++;
    }
  }
}

const auditResult = {
  totalUniquePlayers,
  matchedBios,
  hasDirectImage,
  hasBrokenOrHtmlLink,
  playersWithAnyImage,
  playersWithLocalCurated,
  playersWithBioCdn,
  playersMissingAllPhotos,
  coveragePercent: ((playersWithAnyImage / totalUniquePlayers) * 100).toFixed(1),
  eraStats,
  franchiseStats,
  sampleMissingStarPlayers: Array.from(playerMap.values())
    .filter(p => !p.localImage && !p.bioImageUrl && p.seasons.size >= 4)
    .slice(0, 25)
    .map(p => ({
      name: p.name,
      country: p.country,
      seasonsCount: p.seasons.size,
      seasons: Array.from(p.seasons.keys()).sort().join(', '),
      teams: Array.from(new Set(Array.from(p.seasons.values()).flatMap(t => Array.from(t)))).join(', ')
    }))
};

fs.writeFileSync('./artifacts/player-audit-data.json', JSON.stringify(auditResult, null, 2));
console.log('AUDIT COMPLETED');
console.log(JSON.stringify({
  totalUniquePlayers,
  playersWithAnyImage,
  playersMissingAllPhotos,
  coveragePercent: auditResult.coveragePercent,
}, null, 2));
