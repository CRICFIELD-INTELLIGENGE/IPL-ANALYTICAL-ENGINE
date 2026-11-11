import fs from 'fs';
import path from 'path';
import { buildKeyIndex, buildPageIds, createRegistryHistory, loadVerifiedAliases, recordAppearance } from './lib/player-identity.mjs';

// --public-only: write only into public/data (skip an existing dist build), e.g. when validating locally.
const publicOnly = process.argv.includes('--public-only');

const rawDir = './lib/cricket-data/raw';
const matchesPath = './artifacts/ipl-analytics/public/data/matches.json';
const squadsPath = './artifacts/ipl-analytics/public/data/squads-by-season.json';
const biosPath = './artifacts/ipl-analytics/public/data/player-bio.json';
const publicOutputPath = './artifacts/ipl-analytics/public/data/player-recent-matches.json';
const distOutputPath = './artifacts/ipl-analytics/dist/public/data/player-recent-matches.json';

console.log('Loading metadata files...');
const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
const squads = JSON.parse(fs.readFileSync(squadsPath, 'utf8'));
const bios = JSON.parse(fs.readFileSync(biosPath, 'utf8'));

// Build lookup: Cricsheet Name -> Set of keys/slugs
const cricsheetToKeys = new Map();

function addMapping(cName, key) {
  if (!cName || !key) return;
  const cClean = cName.trim();
  const kClean = key.toLowerCase().trim();
  if (!cricsheetToKeys.has(cClean)) {
    cricsheetToKeys.set(cClean, new Set());
  }
  cricsheetToKeys.get(cClean).add(kClean);
}

// 1. From squads-by-season.json
for (const [season, teams] of Object.entries(squads)) {
  for (const [team, players] of Object.entries(teams)) {
    for (const p of players) {
      if (!p.cricsheetName) continue;
      const cSlug = p.cricsheetName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      addMapping(p.cricsheetName, cSlug);
      if (p.name) {
        const fullSlug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        addMapping(p.cricsheetName, fullSlug);
      }
    }
  }
}

// 2. From player-bio.json
for (const [bioKey, b] of Object.entries(bios)) {
  const bKeySlug = bioKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const pName = b.playerName || '';
  const fName = b.fullName || '';
  const pSlug = pName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fSlug = fName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // If pName or fName exactly matches cricsheet entry
  if (pName) {
    addMapping(pName, bioKey);
    addMapping(pName, pSlug);
    addMapping(pName, bKeySlug);
  }
  if (fName) {
    addMapping(fName, bioKey);
    addMapping(fName, fSlug);
    addMapping(fName, bKeySlug);
  }

  // Also check if any existing cricsheet key looks like this bio
  for (const cName of cricsheetToKeys.keys()) {
    const cClean = cName.toLowerCase();
    if (cClean === pName.toLowerCase() || cClean === fName.toLowerCase()) {
      addMapping(cName, bioKey);
      addMapping(cName, pSlug);
      addMapping(cName, fSlug);
    }
  }
}

console.log(`Mapped ${cricsheetToKeys.size} distinct Cricsheet player names to key sets.`);

// Sort matches newest first so each player's match array is chronologically newest first
matches.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

// Map of matchId -> match metadata for O(1) lookup
const matchMetaMap = new Map();
for (const m of matches) {
  matchMetaMap.set(String(m.id), m);
}

// Inverted index accumulator: key/slug -> array of match performance objects
const playerLogs = {};
// The same match records keyed by Cricsheet registry id, for the player page's identity-checked index.
const logsById = {};
const registryHistory = createRegistryHistory();

function pushPlayerMatch(key, matchData) {
  if (!playerLogs[key]) {
    playerLogs[key] = [];
  }
  playerLogs[key].push(matchData);
}

const rawFiles = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
console.log(`Processing all ${rawFiles.length} matches from 2008 to 2026...`);

let processedMatches = 0;
const tStart = Date.now();

for (const m of matches) {
  const fp = path.join(rawDir, `${m.id}.json`);
  if (!fs.existsSync(fp)) continue;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (err) {
    continue;
  }

  processedMatches++;

  const teamsObj = raw.info?.players || {};
  const teamEntries = Object.entries(teamsObj);
  const allPlayersInMatch = teamEntries.flatMap(([, pl]) => pl);
  if (allPlayersInMatch.length === 0) continue;

  // Pre-calculate batting and bowling stats for all participating players in this match
  const playerStatsMap = new Map();

  for (const inn of raw.innings || []) {
    for (const over of inn.overs || []) {
      for (const d of over.deliveries || []) {
        // Batting
        if (d.batter) {
          let bs = playerStatsMap.get(d.batter);
          if (!bs) {
            bs = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissal: 'not out', bBalls: 0, bRuns: 0, bWkts: 0, bDots: 0 };
            playerStatsMap.set(d.batter, bs);
          }
          const isWide = Boolean(d.extras?.wides);
          if (!isWide) bs.balls++;
          bs.runs += d.runs?.batter || 0;
          if (d.runs?.batter === 4 && (!d.extras || !d.extras.byes)) bs.fours++;
          if (d.runs?.batter === 6) bs.sixes++;
          if (d.wickets) {
            for (const w of d.wickets) {
              if (w.player_out === d.batter) {
                bs.dismissed = true;
                bs.dismissal = w.kind || 'out';
              }
            }
          }
        }

        // Bowling
        if (d.bowler) {
          let bws = playerStatsMap.get(d.bowler);
          if (!bws) {
            bws = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissal: 'not out', bBalls: 0, bRuns: 0, bWkts: 0, bDots: 0 };
            playerStatsMap.set(d.bowler, bws);
          }
          const isWide = Boolean(d.extras?.wides);
          const isNoBall = Boolean(d.extras?.noballs);
          if (!isWide && !isNoBall) bws.bBalls++;
          const concede = (d.runs?.batter || 0) + (d.extras?.wides || 0) + (d.extras?.noballs || 0);
          bws.bRuns += concede;
          if ((d.runs?.batter || 0) === 0 && !d.extras) bws.bDots++;
          if (d.wickets) {
            for (const w of d.wickets) {
              if (w.kind && !['run out', 'retired hurt', 'obstructing the field'].includes(w.kind)) {
                bws.bWkts++;
              }
            }
          }
        }
      }
    }
  }

  // Determine team for each player in match
  for (const [teamName, playerList] of teamEntries) {
    const vsTeamName = teamEntries.find(([t]) => t !== teamName)?.[0] || (teamName === m.team1 ? m.team2 : m.team1);

    for (const cName of playerList) {
      // Find key set for this cName
      let keys = cricsheetToKeys.get(cName);
      if (!keys) {
        // Fallback key: slugify cName
        const autoSlug = cName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        keys = new Set([autoSlug]);
      }

      const st = playerStatsMap.get(cName);

      let batting = null;
      if (st && (st.balls > 0 || st.dismissed)) {
        batting = {
          runs: st.runs,
          balls: st.balls,
          fours: st.fours,
          sixes: st.sixes,
          sr: st.balls > 0 ? Math.round((st.runs / st.balls) * 1000) / 10 : 0,
          dismissal: st.dismissal,
          notOut: !st.dismissed
        };
      }

      let bowling = null;
      if (st && st.bBalls > 0) {
        const oversStr = `${Math.floor(st.bBalls / 6)}.${st.bBalls % 6}`;
        bowling = {
          overs: oversStr,
          runs: st.bRuns,
          wickets: st.bWkts,
          econ: st.bBalls > 0 ? Math.round((st.bRuns / (st.bBalls / 6)) * 10) / 10 : 0,
          dots: st.bDots
        };
      }

      const isWon = m.winner === teamName;
      const isLost = m.winner && m.winner !== teamName;

      const matchRecord = {
        matchId: m.id,
        date: m.date,
        season: m.season,
        team: teamName,
        vsTeam: vsTeamName,
        venue: m.venue,
        result: isWon ? 'Won' : isLost ? 'Lost' : 'Tie/NR',
        margin: m.margin || '',
        batting,
        bowling
      };

      for (const key of keys) {
        pushPlayerMatch(key, matchRecord);
      }

      const registryId = raw.info?.registry?.people?.[cName];
      recordAppearance(registryHistory, registryId, cName, teamName, m.season);
      if (registryId) (logsById[registryId] ||= []).push(matchRecord);
    }
  }
}

const elapsedMs = Date.now() - tStart;
console.log(`Successfully indexed ${processedMatches} matches in ${elapsedMs}ms across ${Object.keys(playerLogs).length} unique player keys.`);

// Verify key players
console.log('--- VERIFICATION ---');
console.log('Abhishek Sharma matches:', playerLogs['abhishek-sharma']?.length || 0);
if (playerLogs['abhishek-sharma']) {
  const seasons = Array.from(new Set(playerLogs['abhishek-sharma'].map(m => m.season))).sort();
  console.log('Abhishek Sharma seasons:', seasons);
}

console.log('Virat Kohli matches (virat-kohli):', playerLogs['virat-kohli']?.length || 0);
console.log('Virat Kohli matches (v-kohli):', playerLogs['v-kohli']?.length || 0);
if (playerLogs['virat-kohli']) {
  const seasons = Array.from(new Set(playerLogs['virat-kohli'].map(m => m.season))).sort();
  console.log('Virat Kohli seasons:', seasons);
}

console.log('Heinrich Klaasen matches (heinrich-klaasen):', playerLogs['heinrich-klaasen']?.length || 0);
console.log('Heinrich Klaasen matches (h-klaasen):', playerLogs['h-klaasen']?.length || 0);
if (playerLogs['heinrich-klaasen']) {
  const seasons = Array.from(new Set(playerLogs['heinrich-klaasen'].map(m => m.season))).sort();
  console.log('Heinrich Klaasen seasons:', seasons);
}

console.log('MS Dhoni matches (ms-dhoni):', playerLogs['ms-dhoni']?.length || 0);
console.log('Rohit Sharma matches (rohit-sharma):', playerLogs['rohit-sharma']?.length || 0);
console.log('Rohit Sharma matches (rg-sharma):', playerLogs['rg-sharma']?.length || 0);

// Write to public data
fs.writeFileSync(publicOutputPath, JSON.stringify(playerLogs, null, 2));
console.log(`Wrote player match database to ${publicOutputPath}`);

// Write to dist public data if directory exists
if (!publicOnly && fs.existsSync('./artifacts/ipl-analytics/dist/public/data')) {
  fs.writeFileSync(distOutputPath, JSON.stringify(playerLogs, null, 2));
  console.log(`Wrote player match database to ${distOutputPath}`);
}

// Identity-checked per-player index for the player page (it no longer reads the full file).
// One shard per Cricsheet registry id; the index maps each bio key with a verified identity to its id, and
// `pages` maps /players/<slug> links that are not bio keys to the registry id they name (see buildPageIds).
const { keys: pageKeys, bioIdentity } = buildKeyIndex({
  bios, history: registryHistory, aliases: loadVerifiedAliases('./scripts/data/player-identity-aliases.json'),
});
const { pages, conflicts } = buildPageIds({ bios, squads, history: registryHistory });
const indexKeys = {};
for (const [key, id] of pageKeys) if (logsById[id]) indexKeys[key] = [id, logsById[id].length];
const usedIds = new Set(Object.values(indexKeys).map(([id]) => id));
const unresolved = Object.entries(bioIdentity).filter(([, v]) => !v.id).map(([k]) => k);
for (const dir of ['./artifacts/ipl-analytics/public/data', './artifacts/ipl-analytics/dist/public/data']) {
  if (publicOnly && dir.includes('/dist/')) continue;
  if (!fs.existsSync(dir)) continue;
  const outDir = path.join(dir, 'player-recent-matches');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.json')) fs.rmSync(path.join(outDir, f)); // generated files only
  for (const id of usedIds) fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(logsById[id]));
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
    source: 'lib/cricket-data/raw (Cricsheet registry ids)', generatedAt: new Date().toISOString(), keys: indexKeys, pages,
  }));
  console.log(`Wrote ${usedIds.size} identity-checked shards, ${Object.keys(indexKeys).length} bio keys and ${Object.keys(pages).length} verified link slugs to ${outDir}`);
}
console.log(`Bios without a verified identity (empty state): ${unresolved.length}${unresolved.length ? ` — ${unresolved.join(', ')}` : ''}`);
const unsettled = conflicts.filter((c) => !c.written);
const squadErrors = conflicts.filter((c) => c.written);
console.log(`Link slugs left to the page's name rules (claimed for several ids): ${unsettled.length}${unsettled.length ? ` — ${unsettled.map((c) => c.slug).join(', ')}` : ''}`);
console.log(`Squad names that contradict the written name (written name kept): ${squadErrors.length}${squadErrors.length ? ` — ${squadErrors.map((c) => c.slug).join(', ')}` : ''}`);
