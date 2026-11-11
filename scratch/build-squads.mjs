// Builds per-season, per-franchise squads by combining two independent sources:
//
//   1. Wikipedia contracts (auction + retention) -- carries the money and the
//      acquisition route, but its retention tables are missing for 2014-2017,
//      so on its own it cannot describe those squads.
//   2. Actual match appearances from our own ball-by-ball data -- complete for
//      every played season, but knows nothing about fees or squad members who
//      never took the field.
//
// The union of the two is the closest thing to a true squad list. Name matching
// is deliberately conservative: exact match first across ALL candidates, then a
// first-initial+surname fallback ONLY when it resolves to exactly one player.
// Anything ambiguous is left unmatched rather than guessed -- an earlier version
// of this heuristic silently pasted Rohit Sharma's identity onto Rahul Sharma.

import fs from "node:fs";
import path from "node:path";

const [, , AUCTIONS, RETAINED, TEAMSEASON, BIO, OUT] = process.argv;
if (!OUT) {
  console.error("usage: node build-squads.mjs <auctions> <retained> <teamSeasonStats> <bio> <out>");
  process.exit(1);
}

const auctions = JSON.parse(fs.readFileSync(AUCTIONS, "utf8"));
const retained = JSON.parse(fs.readFileSync(RETAINED, "utf8"));
const teamSeason = JSON.parse(fs.readFileSync(TEAMSEASON, "utf8"));
const bio = JSON.parse(fs.readFileSync(BIO, "utf8"));

/* ---------------- name matching ---------------- */

const norm = (s) => String(s ?? "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

/** "SK Raina" -> {initial:"s", surname:"raina"}; "Suresh Raina" -> same. */
function nameKey(name) {
  const n = norm(name);
  if (!n) return null;
  const parts = n.split(" ");
  if (parts.length < 2) return null;
  return `${parts[0][0]}|${parts[parts.length - 1]}`;
}

/**
 * Resolves a Wikipedia full name ("Rohit Sharma") to the cricsheet-style name
 * used by match data ("RG Sharma"), searching only the players who actually
 * turned out for that franchise that season.
 *
 * Scoping to the team-season is what makes the surname heuristic safe: league
 * wide, "R Sharma" is hopelessly ambiguous (Rohit and Rahul both exist), but
 * within one squad in one season it almost always resolves to exactly one
 * player. When it still does not, we return null and never guess.
 */
function resolveIn(candidates, wikiName, bridge) {
  if (!candidates || candidates.size === 0) return null;
  const n = norm(wikiName);
  for (const cn of candidates) if (norm(cn) === n) return cn;

  // player-bio.json carries both spellings ("RG Sharma" <-> "Rohit Gurunath
  // Sharma"), so a full given-name + surname match resolves abbreviations that
  // the initial-only heuristic must refuse: Rohit vs Raghu Sharma both key to
  // "r|sharma", but only one has a bio full name starting with "rohit".
  const viaBio = bridge.get(fullNameKey(wikiName));
  if (viaBio && candidates.has(viaBio)) return viaBio;

  // Mononyms ("Sreesanth") have no initial to key on, so they skip straight to
  // the surname tier rather than failing here.
  const k = nameKey(wikiName);
  if (k) {
    const hits = [];
    for (const cn of candidates) if (nameKey(cn) === k) hits.push(cn);
    if (hits.length === 1) return hits[0];
  }

  // Last resort: surname alone, and only when exactly one player in this squad
  // carries it. Cricketers are routinely listed under a name that shares no
  // initial with their scorecard form (Albie = JA Morkel, Dinesh = KD Karthik,
  // Chaminda = WPUJC Vaas), which every initial-based rule above must miss.
  // Confining the match to a single franchise-season is what keeps it honest:
  // when two same-surname players share a squad (Hardik and Krunal Pandya),
  // this finds two hits and correctly declines.
  const sn = surnameOf(wikiName);
  if (!sn) return null;
  const bySurname = [];
  for (const cn of candidates) if (surnameOf(cn) === sn) bySurname.push(cn);
  if (bySurname.length !== 1) return null;

  // The surname tier exists for players whose scorecard name is pure initials
  // ("JA Morkel" = Albie Morkel, "DPMD Jayawardene" = Mahela Jayawardene).
  // When BOTH names spell out a given name and those given names differ, they
  // are two different people who merely share a surname and a squad -- that is
  // how Ishant Sharma's fee landed on Ashok Sharma.
  const wikiGiven = givenNameOf(wikiName);
  const candGiven = givenNameOf(bySurname[0]);
  if (wikiGiven && candGiven && wikiGiven !== candGiven) return null;
  return bySurname[0];
}

/** First spelled-out given name ("JA Morkel" -> null, "Ashok Sharma" -> "ashok"). */
function givenNameOf(name) {
  const parts = norm(name).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  for (const token of parts.slice(0, -1)) {
    if (token.length >= 3 && /[aeiou]/.test(token)) return token;
  }
  return null;
}

function surnameOf(name) {
  const n = norm(name);
  if (!n) return null;
  const parts = n.split(" ");
  return parts.length ? parts[parts.length - 1] : null;
}

/** "Rohit Gurunath Sharma" -> "rohit|sharma" (given name + surname, in full). */
function fullNameKey(name) {
  const n = norm(name);
  if (!n) return null;
  const parts = n.split(" ");
  if (parts.length < 2) return null;
  return `${parts[0]}|${parts[parts.length - 1]}`;
}

/* ---------------- appearance roster ---------------- */

// season -> teamName -> Map(cricsheetName -> {batted, bowled})
const appearances = new Map();
const allCricsheetNames = new Set();

function addAppearance(row, kind) {
  const season = String(row.season);
  const team = row.teamName || row.team;
  if (!season || !team || !row.player) return;
  allCricsheetNames.add(row.player);
  if (!appearances.has(season)) appearances.set(season, new Map());
  const teams = appearances.get(season);
  if (!teams.has(team)) teams.set(team, new Map());
  const roster = teams.get(team);
  const cur = roster.get(row.player) || { batted: false, bowled: false, runs: 0, wickets: 0 };
  if (kind === "bat") { cur.batted = true; cur.runs = row.runs ?? 0; }
  else { cur.bowled = true; cur.wickets = row.wickets ?? 0; }
  roster.set(row.player, cur);
}

for (const r of teamSeason.batters || []) addAppearance(r, "bat");
for (const r of teamSeason.bowlers || []) addAppearance(r, "bowl");

/** Cricsheet names that played for a given franchise in a given season. */
function rosterFor(season, team) {
  return appearances.get(String(season))?.get(team) ?? null;
}

// "rohit|sharma" -> "RG Sharma", built from player-bio.json which stores the
// cricsheet spelling and the expanded full name side by side. Keys that map to
// more than one player are dropped rather than resolved arbitrarily.
const nameBridge = (() => {
  const acc = new Map();
  for (const entry of Object.values(bio)) {
    const cric = entry.playerName;
    if (!cric) continue;
    for (const variant of [entry.fullName, entry.playerName]) {
      const k = fullNameKey(variant);
      if (!k) continue;
      if (acc.has(k) && acc.get(k) !== cric) acc.set(k, null);
      else if (!acc.has(k)) acc.set(k, cric);
    }
  }
  const out = new Map();
  for (const [k, v] of acc) if (v) out.set(k, v);
  return out;
})();

/* ---------------- country backfill ---------------- */

// A player's nationality does not change between seasons, so a country recorded
// in any season can fill the early tables that had no country column at all.
const countryByPlayer = new Map();
for (const r of [...auctions, ...retained]) {
  if (r.country && !countryByPlayer.has(r.player)) countryByPlayer.set(r.player, r.country);
}
// player-bio.json is the secondary source, matched on the same safe rules.
const bioByNorm = new Map();
const bioByKey = new Map();
for (const entry of Object.values(bio)) {
  for (const cand of [entry.playerName, entry.fullName]) {
    if (!cand) continue;
    const n = norm(cand);
    if (n && !bioByNorm.has(n)) bioByNorm.set(n, entry);
    const k = nameKey(cand);
    if (k) {
      if (!bioByKey.has(k)) bioByKey.set(k, new Set());
      bioByKey.get(k).add(entry);
    }
  }
}
function bioCountryFor(name) {
  const n = norm(name);
  const direct = bioByNorm.get(n);
  if (direct?.country) return direct.country;
  const k = nameKey(name);
  const cands = k ? bioByKey.get(k) : null;
  if (cands && cands.size === 1) {
    const only = [...cands][0];
    if (only.country) return only.country;
  }
  return null;
}

// Third source: the player registry, keyed on the same conservative rules.
const registryByNorm = new Map();
const registryByKey = new Map();
try {
  const regRaw = JSON.parse(fs.readFileSync(
    path.resolve("artifacts/api-server/data/players.json"), "utf8"));
  for (const p of (Array.isArray(regRaw) ? regRaw : Object.values(regRaw))) {
    if (!p?.name || !p.country) continue;
    const n = norm(p.name);
    if (n && !registryByNorm.has(n)) registryByNorm.set(n, p.country);
    const k = nameKey(p.name);
    if (k) {
      if (registryByKey.has(k) && registryByKey.get(k) !== p.country) registryByKey.set(k, null);
      else if (!registryByKey.has(k)) registryByKey.set(k, p.country);
    }
  }
} catch { /* registry is optional */ }

function registryCountryFor(name) {
  const direct = registryByNorm.get(norm(name));
  if (direct) return direct;
  const k = nameKey(name);
  return k ? (registryByKey.get(k) || null) : null;
}

let filledFromPeer = 0, filledFromBio = 0, filledFromRegistry = 0;
for (const r of [...auctions, ...retained]) {
  if (r.country) continue;
  const peer = countryByPlayer.get(r.player);
  if (peer) { r.country = peer; r.countrySource = "peer-season"; filledFromPeer++; continue; }
  const fromBio = bioCountryFor(r.player);
  if (fromBio) { r.country = fromBio; r.countrySource = "player-bio"; filledFromBio++; continue; }
  const fromReg = registryCountryFor(r.player);
  if (fromReg) { r.country = fromReg; r.countrySource = "registry"; filledFromRegistry++; }
}

/* ---------------- squad assembly ---------------- */

const money = (r) => {
  if (r.soldLakh != null) {
    return r.soldLakh >= 100
      ? { lakh: r.soldLakh, usd: null, display: `₹${(r.soldLakh / 100).toFixed(2)} Cr` }
      : { lakh: r.soldLakh, usd: null, display: `₹${r.soldLakh.toFixed(0)} L` };
  }
  if (r.soldUsd != null) {
    return r.soldUsd >= 1_000_000
      ? { lakh: null, usd: r.soldUsd, display: `$${(r.soldUsd / 1_000_000).toFixed(2)}M` }
      : { lakh: null, usd: r.soldUsd, display: `$${Math.round(r.soldUsd / 1000)}K` };
  }
  return { lakh: null, usd: null, display: null };
};

// season -> team -> Map(key -> player record)
const squads = new Map();
function slot(season, team) {
  const s = String(season);
  if (!squads.has(s)) squads.set(s, new Map());
  const teams = squads.get(s);
  if (!teams.has(team)) teams.set(team, new Map());
  return teams.get(team);
}

const unmatched = [];

// Pass 1: contracted players (money + acquisition route).
for (const r of [...retained, ...auctions]) {
  const team = r.teamCanonical || r.team;
  if (!team) continue;
  const roster = slot(r.season, team);
  const played = rosterFor(r.season, team);
  const cricsheet = resolveIn(played ? new Set(played.keys()) : null, r.player, nameBridge);
  // Not matching is normal and expected: contracted players who never took the
  // field have no match-data counterpart at all.
  if (!cricsheet && played) unmatched.push({ season: r.season, player: r.player, team });
  const key = cricsheet || `wiki:${norm(r.player)}`;
  const m = money(r);
  const existing = roster.get(key);
  if (existing) {
    // Retained is processed first; an auction row for the same player is a
    // later, more specific fact only if the retained row had no price.
    if (existing.priceDisplay == null && m.display != null) {
      Object.assign(existing, { priceLakh: m.lakh, priceUsd: m.usd, priceDisplay: m.display });
    }
    continue;
  }
  roster.set(key, {
    name: r.player,
    cricsheetName: cricsheet,
    country: r.country ?? null,
    role: r.role ?? null,
    acquisition: r.acquisition === "retained" ? "retained" : "auction",
    priceLakh: m.lakh,
    priceUsd: m.usd,
    priceDisplay: m.display,
    played: false,
  });
}

// Pass 2: players who actually appeared. Fills the seasons Wikipedia omits and
// marks who took the field.
for (const [season, teams] of appearances) {
  for (const [team, roster] of teams) {
    const target = slot(season, team);
    for (const [cricsheetName, info] of roster) {
      const existing = target.get(cricsheetName);
      if (existing) { existing.played = true; continue; }
      target.set(cricsheetName, {
        name: cricsheetName,
        cricsheetName,
        country: bioCountryFor(cricsheetName),
        role: null,
        acquisition: null,
        priceLakh: null,
        priceUsd: null,
        priceDisplay: null,
        played: true,
      });
    }
  }
}

/* ---------------- emit ---------------- */

const outObj = {};
let totalPlayers = 0;
for (const [season, teams] of [...squads.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  outObj[season] = {};
  for (const [team, roster] of [...teams.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const list = [...roster.values()].sort((a, b) => {
      const pa = a.priceLakh ?? (a.priceUsd != null ? a.priceUsd / 1000 : -1);
      const pb = b.priceLakh ?? (b.priceUsd != null ? b.priceUsd / 1000 : -1);
      if (pb !== pa) return pb - pa;
      return a.name.localeCompare(b.name);
    });
    outObj[season][team] = list;
    totalPlayers += list.length;
  }
}

fs.writeFileSync(OUT, JSON.stringify(outObj, null, 2));
// Persist the country-enriched source rows too.
fs.writeFileSync(AUCTIONS, JSON.stringify(auctions, null, 2));

console.log("country backfill: peer-season =", filledFromPeer,
  ", player-bio =", filledFromBio, ", registry =", filledFromRegistry);
console.log("still missing country:", [...auctions, ...retained].filter(r => !r.country).length);
console.log("unmatched wiki->cricsheet names:", unmatched.length);
console.log("\nseason  teams  players  withPrice  played");
for (const [season, teams] of Object.entries(outObj)) {
  const all = Object.values(teams).flat();
  console.log(
    season.padEnd(7),
    String(Object.keys(teams).length).padEnd(6),
    String(all.length).padEnd(8),
    String(all.filter(p => p.priceDisplay).length).padEnd(10),
    String(all.filter(p => p.played).length),
  );
}
console.log("\ntotal squad entries:", totalPlayers);
