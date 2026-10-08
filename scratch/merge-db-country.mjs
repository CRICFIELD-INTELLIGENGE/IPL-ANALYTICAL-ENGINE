import fs from "fs";

const BIO_PATH = "C:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/artifacts/ipl-analytics/public/data/player-bio.json";
const DB_COUNTRIES_PATH = "C:/Users/KIIT0001/Downloads/Data-Insight-Engine/Data-Insight-Engine/scratch/db-player-countries.json";

const normalize = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function exactMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  return !!na && !!nb && na === nb;
}

function fuzzyMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  const pa = na.split(" "), pb = nb.split(" ");
  if (pa.length && pb.length) {
    return pa[0][0] === pb[0][0] && pa[pa.length - 1] === pb[pb.length - 1];
  }
  return false;
}

const bio = JSON.parse(fs.readFileSync(BIO_PATH, "utf8"));
const dbPlayers = JSON.parse(fs.readFileSync(DB_COUNTRIES_PATH, "utf8"));
const bioEntries = Object.entries(bio);

let updated = 0;
const ambiguous = [];
const noMatch = [];

for (const p of dbPlayers) {
  if (!p.country) continue;

  const exact = bioEntries.find(([, e]) => exactMatch(e.playerName, p.name) || exactMatch(e.fullName, p.name));
  let target = exact;

  if (!target) {
    const candidates = bioEntries.filter(([, e]) => fuzzyMatch(e.playerName, p.name) || fuzzyMatch(e.fullName, p.name));
    if (candidates.length === 1) target = candidates[0];
    else if (candidates.length > 1) {
      ambiguous.push({ db: p.name, candidates: candidates.map(([, e]) => e.playerName) });
      continue;
    } else {
      noMatch.push(p.name);
      continue;
    }
  }

  const [, entry] = target;
  if (!entry.country || !entry.country.trim()) {
    entry.country = p.country;
    updated++;
  }
}

fs.writeFileSync(BIO_PATH, JSON.stringify(bio, null, 2));

console.log(JSON.stringify({
  dbPlayers: dbPlayers.length,
  countryUpdated: updated,
  skippedAmbiguous: ambiguous.length,
  skippedNoMatch: noMatch.length,
}, null, 2));
if (ambiguous.length) {
  console.log("AMBIGUOUS (skipped):");
  console.log(JSON.stringify(ambiguous, null, 2));
}
