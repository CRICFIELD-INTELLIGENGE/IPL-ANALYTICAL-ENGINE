// Corrects garbled player names in players.json against the real name database
// (player-bio.json + squads-by-season.json), and clears the placeholder image
// path that every entry shared.
//
// The registry was authored separately from the match data and drifted:
// "Emanjot Chahal" is Yuzvendra Chahal, "Mayank Agarawal" is Mayank Agarwal,
// "William Orourke" is Will O'Rourke. Not every unmatched name is wrong though
// -- the registry also lists real cricketers who have never played an IPL match
// and so legitimately have no counterpart here. Corrections are therefore only
// applied when a single real player is an unambiguous match; everything else is
// left untouched and reported.

import fs from "node:fs";

const [, , REGISTRY, BIO, SQUADS] = process.argv;
if (!SQUADS) {
  console.error("usage: node fix-registry-names.mjs <players.json> <player-bio.json> <squads-by-season.json>");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
const bio = JSON.parse(fs.readFileSync(BIO, "utf8"));
const squads = JSON.parse(fs.readFileSync(SQUADS, "utf8"));

const norm = (s) => String(s ?? "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const surnameOf = (s) => { const p = norm(s).split(" ").filter(Boolean); return p[p.length - 1] || ""; };
const isSpelledOut = (n) => { const f = String(n).trim().split(/\s+/)[0] ?? ""; return f.length >= 3 && /[aeiou]/i.test(f); };

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Preferred display spelling for every real player, keyed by normalised name.
const realNames = new Map(); // norm -> best display spelling
const addReal = (name) => {
  if (!name) return;
  const k = norm(name);
  if (!k) return;
  const existing = realNames.get(k);
  if (!existing || (isSpelledOut(name) && !isSpelledOut(existing))) realNames.set(k, name);
};
for (const v of Object.values(bio)) { addReal(v.playerName); addReal(v.fullName); }
for (const teams of Object.values(squads)) {
  for (const players of Object.values(teams)) {
    for (const p of players) { addReal(p.name); addReal(p.cricsheetName); }
  }
}

// Group real players by surname so uniqueness can be tested.
const bySurname = new Map();
for (const [k, display] of realNames) {
  const sn = surnameOf(k);
  if (!sn) continue;
  if (!bySurname.has(sn)) bySurname.set(sn, new Set());
  bySurname.get(sn).add(display);
}
/** Distinct people sharing a surname, collapsing spellings of the same person. */
const peopleWithSurname = (sn) => {
  const set = bySurname.get(sn);
  if (!set) return [];
  const byInitialAndLength = new Map();
  for (const name of set) {
    const parts = norm(name).split(" ").filter(Boolean);
    const key = parts.length >= 2 ? parts[0][0] : norm(name);
    const cur = byInitialAndLength.get(key);
    if (!cur || (isSpelledOut(name) && !isSpelledOut(cur))) byInitialAndLength.set(key, name);
  }
  return [...byInitialAndLength.values()];
};

/**
 * Corruptions too far from the true name for any distance measure to reach
 * safely, so they are listed explicitly rather than guessed. Each entry is a
 * confirmed identity, not an inference.
 */
const EXPLICIT_CORRECTIONS = {
  "emanjot chahal": "Yuzvendra Chahal",
};

const arr = Array.isArray(registry) ? registry : Object.values(registry);
const changes = [];
const cleared = [];
const unmatched = [];

for (const p of arr) {
  const explicit = EXPLICIT_CORRECTIONS[norm(p.name)];
  if (explicit) {
    changes.push([p.name, explicit, "explicit correction"]);
    p.name = explicit;
  }
  // Every entry pointed at the same source-tree asset, which cannot load at
  // runtime and would be the wrong face regardless.
  if (p.img && /\/src\/assets\//.test(p.img)) { cleared.push(p.name); p.img = null; }

  const key = norm(p.name);
  if (!p.name || realNames.has(key)) continue;

  // Only genuine misspellings are corrected: the given name must match exactly
  // and the surname differ by at most two characters.
  //
  // Matching on surname alone was tried and produced nonsense -- it turned
  // Mujeeb Rahman into Mustafizur Rahman, Qais Ahmad into Noor Ahmad and Joe
  // Clarke into Michael Clarke, all of whom are separate cricketers who merely
  // share a surname with someone in our data. Requiring the given name to be
  // identical is what separates "Mayank Agarawal" (a typo for Mayank Agarwal)
  // from "Vijay Kumar" vs "Vinay Kumar" (two different people).
  const parts = key.split(" ").filter(Boolean);
  if (parts.length < 2) { unmatched.push(p.name); continue; }
  const given = parts.slice(0, -1).join(" ");
  const surname = parts[parts.length - 1];

  const candidates = [];
  for (const [k, display] of realNames) {
    const kp = k.split(" ").filter(Boolean);
    if (kp.length < 2) continue;
    if (kp.slice(0, -1).join(" ") !== given) continue;
    const d = levenshtein(surname, kp[kp.length - 1]);
    if (d > 0 && d <= 2) candidates.push([display, d]);
  }
  candidates.sort((a, b) => a[1] - b[1]);
  const bestDistance = candidates[0]?.[1];
  const best = candidates.filter(([, d]) => d === bestDistance);

  if (best.length === 1) {
    changes.push([p.name, best[0][0], `surname typo (distance ${best[0][1]})`]);
    p.name = best[0][0];
    continue;
  }

  unmatched.push(p.name);
}

fs.writeFileSync(REGISTRY, JSON.stringify(arr, null, 2));

console.log(`cleared placeholder image on ${cleared.length} entries`);
console.log(`\ncorrected ${changes.length} names:`);
for (const [from, to, why] of changes) console.log(`  ${from.padEnd(28)} -> ${to.padEnd(26)} (${why})`);
console.log(`\nleft unchanged (no confident match, likely real players outside our IPL data): ${unmatched.length}`);
console.log("  " + unmatched.slice(0, 15).join(", ") + (unmatched.length > 15 ? " ..." : ""));
