// Fetches every franchise's official IPL squad, season by season, from iplt20.com
// (the squad tab of each team page) and writes public/data/official-squads.json.
//
// Per player it keeps only what the official page states: name, role, wicketkeeper
// flag, overseas flag, country, captain flag and jersey number (null in seasons where
// the site lists none). Nothing is inferred.
//
// Re-running resumes: seasons already in the file are skipped. The site rate-limits,
// so requests are spaced out and a season that keeps failing is reported, not guessed.
//
//   node scripts/data/fetch-official-squads.mjs [--season 2026] [--refresh]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "public", "data", "official-squads.json");
const API = "https://www.iplt20.com/api/bff/cms/teams";

// iplt20.com slug → franchise name used across CricField's data files.
const TEAMS = {
  "chennai-super-kings": "Chennai Super Kings",
  "delhi-capitals": "Delhi Capitals",
  "gujarat-titans": "Gujarat Titans",
  "kolkata-knight-riders": "Kolkata Knight Riders",
  "lucknow-super-giants": "Lucknow Super Giants",
  "mumbai-indians": "Mumbai Indians",
  "punjab-kings": "Punjab Kings",
  "rajasthan-royals": "Rajasthan Royals",
  "royal-challengers-bengaluru": "Royal Challengers Bengaluru",
  "sunrisers-hyderabad": "Sunrisers Hyderabad",
};

const ROLE = { batsman: "batter", batter: "batter", allrounder: "all-rounder", "all-rounder": "all-rounder", bowler: "bowler", wicketkeeper: "batter" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (CricField squad sync)", Accept: "application/json" } });
      if (res.ok) return await res.json();
    } catch { /* network blip: retry */ }
    if (attempt < 4) await sleep(6000 * attempt);
  }
  return null;
}

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const only = arg("--season");
const refresh = process.argv.includes("--refresh");
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
const seasons = existing?.seasons ?? {};
const missing = [];
let requests = 0;

function save() {
  const out = {
    source: "https://www.iplt20.com/teams/<team>/squad?season=<year> (official IPL squad pages)",
    retrievedAt: new Date().toISOString().slice(0, 10),
    note: "Official squad listings. jersey is null where the official page lists no number for that season.",
    seasons: Object.fromEntries(Object.entries(seasons).sort(([a], [b]) => Number(b) - Number(a))),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
}

for (const [slug, franchise] of Object.entries(TEAMS)) {
  const first = await getJson(`${API}/${slug}?tab=squad`);
  requests++;
  if (!first) { missing.push(`${slug} (season list)`); continue; }
  const years = JSON.stringify(first.data).match(/"seasonYears":\[([^\]]*)\]/)?.[1].match(/\d{4}/g) ?? [];
  for (const year of years) {
    if (only && year !== only) continue;
    if (!refresh && seasons[year]?.[franchise]?.length) continue;
    const j = await getJson(`${API}/${slug}?tab=squad&season=${year}`);
    requests++;
    if (!j) { missing.push(`${slug} ${year}`); continue; }
    const players = (j.data?.squad?.players ?? []).map((p) => ({
      name: p.name,
      role: ROLE[String(p.role).toLowerCase()] ?? null,
      keeper: Boolean(p.isWicketKeeper),
      overseas: Boolean(p.isInternational),
      country: p.country || null,
      captain: Boolean(p.isCaptain),
      jersey: p.jerseyNumber ? String(p.jerseyNumber) : null,
    }));
    if (players.length) (seasons[year] ??= {})[franchise] = players;
    process.stdout.write(`${slug} ${year}: ${players.length}\n`);
    await sleep(1500);
  }
  save();
}

save();
console.log(`wrote ${OUT} (${requests} requests); not fetched: ${missing.join(", ") || "none"}`);
