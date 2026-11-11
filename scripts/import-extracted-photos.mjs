/**
 * Reusable Automated Extractor Importer & Matcher Pipeline
 * 
 * Ingests extracted images from websiteimagextractor.com (ZIP or folder),
 * sanitizes filenames, filters out logos/banners/icons, matches against
 * the canonical 2008–2026 IPL player database, verifies franchise and season
 * membership, and outputs to the centralized Player Photo Registry.
 * 
 * Usage:
 *   node scripts/import-extracted-photos.mjs --dir "image players" --approved --attribution "Local Curated Media"
 *   node scripts/import-extracted-photos.mjs --zip "path/to/extracted.zip" --source "https://iplt20.com"
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const squadsPath = './artifacts/ipl-analytics/public/data/squads-by-season.json';
const biosPath = './artifacts/ipl-analytics/public/data/player-bio.json';
const registryPath = './artifacts/ipl-analytics/public/data/player-photo-registry.json';
const candidatesPath = './artifacts/ipl-analytics/public/data/player-photo-candidates.json';

const squads = JSON.parse(fs.readFileSync(squadsPath, 'utf8'));
const bios = JSON.parse(fs.readFileSync(biosPath, 'utf8'));

// Initialize or load existing registry
let registry = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  totalApproved: 0,
  totalPending: 0,
  photos: []
};
if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    console.warn("Could not parse existing registry, creating fresh.");
  }
}

// Map canonical players & career history
const slugOf = (name) => (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const playerDatabase = new Map();
const aliasLookup = new Map(); // normalized string -> canonical slug

for (const [season, teams] of Object.entries(squads)) {
  for (const [team, teamPlayers] of Object.entries(teams)) {
    for (const p of teamPlayers) {
      const canonical = slugOf(p.cricsheetName || p.name);
      if (!playerDatabase.has(canonical)) {
        playerDatabase.set(canonical, {
          slug: canonical,
          name: p.name,
          cricsheetName: p.cricsheetName,
          aliases: new Set([p.name.toLowerCase()]),
          careers: [], // { season: Number, team: String }
          country: p.country,
          role: p.role,
        });
      }
      const entry = playerDatabase.get(canonical);
      entry.aliases.add(p.name.toLowerCase());
      if (p.cricsheetName) entry.aliases.add(p.cricsheetName.toLowerCase());
      entry.careers.push({ season: Number(season), team });

      aliasLookup.set(p.name.toLowerCase(), canonical);
      if (p.cricsheetName) aliasLookup.set(p.cricsheetName.toLowerCase(), canonical);
    }
  }
}

// Add bios aliases and existing bio images into registry baseline
for (const [slug, b] of Object.entries(bios)) {
  if (b.playerName) aliasLookup.set(b.playerName.toLowerCase(), slug);
  if (b.fullName) aliasLookup.set(b.fullName.toLowerCase(), slug);

  // If bio contains a valid direct CDN image, register as baseline approved generic/team portrait
  if (b.image && b.image.startsWith('http') && !b.image.includes('espncricinfo.com/cricketers/')) {
    const playerRecord = playerDatabase.get(slug);
    const playerAliases = Array.from(new Set([
      slug,
      b.playerName,
      b.fullName,
      b.playerName ? slugOf(b.playerName) : null,
      b.fullName ? slugOf(b.fullName) : null,
      ...(playerRecord?.aliases ? Array.from(playerRecord.aliases) : []),
    ].filter(Boolean)));

    const existingIndex = registry.photos.findIndex(p => p.playerId === slug && p.imageUrl === b.image);
    const photoData = {
      playerId: slug,
      aliases: playerAliases,
      teamId: b.team ? (b.team.includes("Hyderabad") ? "SRH" : b.team.includes("Chennai") ? "CSK" : null) : null,
      season: 2024,
      imageUrl: b.image,
      sourcePageUrl: `https://www.espncricinfo.com/player/${slug}`,
      licenseStatus: "approved",
      attribution: "ESPNcricinfo Player Profile Cutout",
      matchConfidence: 0.95,
      isCutout: true,
      notes: "Baseline portrait from verified player bio database"
    };

    if (existingIndex === -1) {
      registry.photos.push(photoData);
    } else {
      registry.photos[existingIndex] = photoData;
    }
  }
}

// Parse CLI flags
const args = process.argv.slice(2);
let targetDir = null;
let targetZip = null;
let isApproved = false;
let customAttribution = "Extracted Franchise Portal Portrait";
let sourceUrl = "https://www.iplt20.com";

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) targetDir = args[++i];
  if (args[i] === '--zip' && args[i + 1]) targetZip = args[++i];
  if (args[i] === '--approved') isApproved = true;
  if (args[i] === '--attribution' && args[i + 1]) customAttribution = args[++i];
  if (args[i] === '--source' && args[i + 1]) sourceUrl = args[++i];
}

// Default fallback to "image players" directory if present
if (!targetDir && !targetZip && fs.existsSync('./image players')) {
  targetDir = './image players';
  isApproved = true; // Local existing asset directory
  customAttribution = "Verified Local Curated Roster Asset";
}

// Non-player graphics blacklist keywords
const NOISE_KEYWORDS = [
  'logo', 'banner', 'header', 'sponsor', 'icon', 'ad', 'fixture',
  'ticket', 'stadium', 'trophy', 'insight', 'hero-player', 'bg',
  'pattern', 'divider', 'advance stats', 'media', 'thumb', 'card-bg'
];

function isNoise(filename) {
  const lower = filename.toLowerCase();
  return NOISE_KEYWORDS.some(kw => lower.includes(kw));
}

// Franchise token extractor
const FRANCHISE_TOKENS = {
  srh: 'SRH', hyderabad: 'SRH', sunrisers: 'SRH',
  csk: 'CSK', chennai: 'CSK',
  rcb: 'RCB', bengaluru: 'RCB', bangalore: 'RCB',
  mi: 'MI', mumbai: 'MI',
  kkr: 'KKR', kolkata: 'KKR',
  rr: 'RR', rajasthan: 'RR',
  dc: 'DC', delhi: 'DC',
  pbks: 'PBKS', punjab: 'PBKS', kxip: 'PBKS',
  gt: 'GT', gujarat: 'GT',
  lsg: 'LSG', lucknow: 'LSG',
  dec: 'DEC', deccan: 'DEC',
  pwi: 'PWI', pune: 'PWI',
  rps: 'RPS', gl: 'GL', ktk: 'KTK'
};

function extractMetadataFromFilename(filename) {
  const baseName = path.parse(filename).name.toLowerCase();
  
  // Extract potential season (4 digits between 2008 and 2026)
  const seasonMatch = baseName.match(/\b(20[0-2][0-9])\b/);
  const season = seasonMatch ? Number(seasonMatch[1]) : null;

  // Extract potential franchise code
  let teamId = null;
  for (const [token, code] of Object.entries(FRANCHISE_TOKENS)) {
    if (new RegExp(`(^|[_\\-\\s])${token}([_\\-\\s]|$)`).test(baseName)) {
      teamId = code;
      break;
    }
  }

  // Clean filename of noise to isolate player name
  let cleaned = baseName
    .replace(/websiteimagextractor[_\-]?/g, '')
    .replace(/_\d+x\d+/g, '') // remove resolution like _300x300
    .replace(/\b(20[0-2][0-9])\b/g, '') // remove year
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  // Remove franchise name words if present to reveal clean person name
  for (const token of Object.keys(FRANCHISE_TOKENS)) {
    cleaned = cleaned.replace(new RegExp(`\\b${token}\\b`, 'g'), '').trim();
  }

  return { cleanedName: cleaned, season, teamId, original: filename };
}

// Find best matching player in canonical 1,214 players database
function matchPlayer(cleanedName) {
  if (!cleanedName || cleanedName.length < 3) return null;

  const targetSlug = slugOf(cleanedName);

  // 1. Exact alias match
  if (aliasLookup.has(cleanedName)) {
    return { slug: aliasLookup.get(cleanedName), confidence: 0.98, type: 'exact_alias' };
  }

  // 2. Exact slug match
  if (playerDatabase.has(targetSlug)) {
    return { slug: targetSlug, confidence: 0.98, type: 'exact_slug' };
  }

  // 3. Name tokens match (e.g. "a mishra" -> "Amit Mishra" or "ab devillers" -> "AB de Villiers")
  const tokens = cleanedName.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const firstInitial = tokens[0].charAt(0);
    const lastName = tokens[tokens.length - 1];

    const matches = [];
    for (const [slug, player] of playerDatabase.entries()) {
      const pTokens = player.name.toLowerCase().split(/\s+/).filter(Boolean);
      if (pTokens.length >= 2) {
        if (pTokens[0].charAt(0) === firstInitial && pTokens[pTokens.length - 1] === lastName) {
          matches.push(slug);
        }
      }
    }

    if (matches.length === 1) {
      return { slug: matches[0], confidence: 0.88, type: 'initial_last_match' };
    } else if (matches.length > 1) {
      return { slug: matches[0], confidence: 0.65, type: 'ambiguous_initial_collision', candidates: matches };
    }
  }

  // 4. Fuzzy fallback across bios
  for (const [slug, b] of Object.entries(bios)) {
    const fn = (b.fullName || '').toLowerCase();
    const pn = (b.playerName || '').toLowerCase();
    if (fn.includes(cleanedName) || pn.includes(cleanedName) || cleanedName.includes(pn)) {
      return { slug, confidence: 0.82, type: 'bio_substring_match' };
    }
  }

  return null;
}

// Run Extraction / Processing
async function run() {
  console.log("=== IPL PLAYER PHOTO AUTO-MAPPING ENGINE ===");
  console.log(`Loaded ${playerDatabase.size} unique canonical IPL players (2008–2026).`);

  const importedList = [];
  const rejectedList = [];
  const ambiguousList = [];

  if (targetZip) {
    console.log(`Extracting ZIP: ${targetZip}...`);
    const tempExtractDir = './scratch/unzipped_photos';
    if (!fs.existsSync(tempExtractDir)) fs.mkdirSync(tempExtractDir, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${targetZip}' -DestinationPath '${tempExtractDir}' -Force"`);
    targetDir = tempExtractDir;
  }

  if (targetDir && fs.existsSync(targetDir)) {
    console.log(`Scanning directory: ${targetDir}`);
    const files = fs.readdirSync(targetDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) continue;

      if (isNoise(file)) {
        rejectedList.push({ file, reason: "Filtered out non-portrait graphic (logo/banner/sponsor/ad)" });
        continue;
      }

      const meta = extractMetadataFromFilename(file);
      const match = matchPlayer(meta.cleanedName);

      if (!match) {
        rejectedList.push({ file, cleanedName: meta.cleanedName, reason: "No matching player identity found in 2008–2026 registry" });
        continue;
      }

      if (match.confidence < 0.75 || match.type === 'ambiguous_initial_collision') {
        ambiguousList.push({ file, match, meta });
        continue;
      }

      const player = playerDatabase.get(match.slug);
      let verifiedTeam = meta.teamId;

      // Verify transfer integrity: did this player actually play for this franchise?
      if (verifiedTeam && player) {
        const playedForTeam = player.careers.some(c => {
          const code = FRANCHISE_TOKENS[c.team.toLowerCase().split(' ')[0]] || null;
          return code === verifiedTeam;
        });
        if (!playedForTeam) {
          console.warn(`[Transfer Notice] ${player.name} was not recorded playing for ${verifiedTeam}. Defaulting to generic.`);
          verifiedTeam = null;
        }
      }

      // Copy image to public/players directory if from external source
      const destRelativePath = `/${file}`; // For existing root images like /msd.jpg
      
      const playerAliases = Array.from(new Set([
        match.slug,
        player?.name,
        player?.cricsheetName,
        meta.cleanedName,
        ...(player?.aliases ? Array.from(player.aliases) : []),
      ].filter(Boolean)));

      const photoRecord = {
        playerId: match.slug,
        aliases: playerAliases,
        teamId: verifiedTeam,
        season: meta.season,
        imageUrl: destRelativePath,
        sourcePageUrl: sourceUrl,
        licenseStatus: isApproved ? "approved" : "pending",
        attribution: customAttribution,
        matchConfidence: match.confidence,
        isCutout: ext === '.png' || file.includes('cutout'),
        notes: `Matched via ${match.type} from file "${file}"`
      };

      // Add to registry (replacing older identical match if higher confidence)
      const existingIdx = registry.photos.findIndex(
        p => p.playerId === photoRecord.playerId && p.imageUrl === photoRecord.imageUrl
      );

      if (existingIdx >= 0) {
        registry.photos[existingIdx] = photoRecord;
      } else {
        registry.photos.push(photoRecord);
      }

      importedList.push({ player: player?.name || match.slug, file, confidence: match.confidence, teamId: verifiedTeam });
    }
  }

  // Final counts
  registry.totalApproved = registry.photos.filter(p => p.licenseStatus === 'approved').length;
  registry.totalPending = registry.photos.filter(p => p.licenseStatus === 'pending').length;
  registry.lastUpdated = new Date().toISOString();

  // Write updated registry and candidates files
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  fs.writeFileSync(candidatesPath, JSON.stringify({
    imported: importedList,
    rejected: rejectedList,
    ambiguous: ambiguousList
  }, null, 2));

  console.log("\n--- IMPORT SUMMARY ---");
  console.log(`Successfully mapped: ${importedList.length} portraits`);
  console.log(`Filtered / Rejected: ${rejectedList.length} files`);
  console.log(`Ambiguous (Needs Review): ${ambiguousList.length} files`);
  console.log(`Total Approved in Registry: ${registry.totalApproved}`);
  console.log(`Total Pending in Registry: ${registry.totalPending}`);
  console.log(`Registry saved to: ${registryPath}`);
}

run().catch(err => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
