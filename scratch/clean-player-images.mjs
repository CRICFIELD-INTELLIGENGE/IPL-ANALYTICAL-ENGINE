// Removes wrong-player entries from player-images.json.
//
// The file was generated with a loose surname/prefix heuristic, so a single
// headshot ended up addressable by names belonging to other people entirely:
// AB de Villiers' photo answered to "Abdur Razzak", "Iqbal Abdulla", "Abdul
// Samad" and "Abdul Basith"; Amit Mishra's answered to "SS Mishra" and
// "MD Mishra"; Abhishek Sharma's answered to the generic "A Sharma".
//
// Rule applied here: an image depicts exactly one player. A key is kept only
// when it is a spelling of THAT player's own name. Bare surnames and generic
// initial+surname keys are dropped, because they cannot identify one player.

import fs from "node:fs";

const [, , IMAGES_FILE, BIO_FILE] = process.argv;
if (!IMAGES_FILE || !BIO_FILE) {
  console.error("usage: node clean-player-images.mjs <player-images.json> <player-bio.json>");
  process.exit(1);
}

const images = JSON.parse(fs.readFileSync(IMAGES_FILE, "utf8"));
const bio = JSON.parse(fs.readFileSync(BIO_FILE, "utf8"));

const norm = (s) => String(s ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Spacing differs between filenames and names ("ab devillers" vs
// "AB de Villiers"), so identity checks compare the space-free form too.
const compact = (s) => norm(s).replace(/ /g, "");
const surnameOf = (s) => { const p = norm(s).split(" "); return p[p.length - 1] || ""; };
const initialKey = (s) => {
  const p = norm(s).split(" ").filter(Boolean);
  return p.length >= 2 ? `${p[0][0]}|${p[p.length - 1]}` : null;
};

/** "/a mishra.jpg" -> "a mishra" */
const stemOf = (url) => norm(String(url).split("/").pop().replace(/\.(jpg|jpeg|png|webp)$/i, ""));

// Group keys by the image they point at.
const byImage = new Map();
for (const [key, url] of Object.entries(images)) {
  if (!byImage.has(url)) byImage.set(url, []);
  byImage.get(url).push(key);
}

const kept = {};
const dropped = [];

for (const [url, keys] of byImage) {
  const stem = stemOf(url);
  const stemSurname = surnameOf(stem);

  // Identify the depicted player: the longest key that shares the stem's
  // surname is the most specific real name present (e.g. "AB de Villiers"
  // rather than "abd"), cross-checked against player-bio.json when possible.
  // Prefer a real multi-word name as the anchor. Single-word fragments share
  // the filename's surname too ("devillers" for "ab devillers.jpg") and would
  // otherwise be chosen, defining the player by a fragment and rejecting the
  // actual name "AB de Villiers".
  const wordCount = (k) => norm(k).split(" ").filter(Boolean).length;
  const namelike = keys
    .filter(k => surnameOf(k) === stemSurname || norm(k) === stem || compact(k) === compact(stem))
    .sort((a, b) => {
      const multi = (wordCount(b) > 1 ? 1 : 0) - (wordCount(a) > 1 ? 1 : 0);
      return multi !== 0 ? multi : norm(b).length - norm(a).length;
    });

  const anchor = namelike.find(k => wordCount(k) > 1)
    ?? keys.find(k => wordCount(k) > 1)
    ?? keys[0];
  const anchorKeys = new Set([norm(anchor), stem]);
  const anchorCompact = new Set([compact(anchor), compact(stem)]);

  // Pull in the bio spellings of the same player so scorecard and full forms
  // both keep working.
  for (const entry of Object.values(bio)) {
    const pn = norm(entry.playerName);
    const fn = norm(entry.fullName);
    const matches = anchorKeys.has(pn) || anchorKeys.has(fn) ||
      anchorCompact.has(compact(pn)) || anchorCompact.has(compact(fn));
    if (matches) {
      if (pn) { anchorKeys.add(pn); anchorCompact.add(compact(pn)); }
      if (fn) { anchorKeys.add(fn); anchorCompact.add(compact(fn)); }
    }
  }

  const anchorInitial = initialKey(anchor) ?? initialKey(stem);

  for (const key of keys) {
    const nk = norm(key);
    const parts = nk.split(" ").filter(Boolean);

    // A single word can never identify a player ("mishra", "villiers", "abd").
    if (parts.length < 2) { dropped.push([key, url, "bare surname / fragment"]); continue; }

    if (anchorKeys.has(nk) || anchorCompact.has(compact(key))) { kept[key] = url; continue; }

    // Accept an abbreviation only when it is an abbreviation of THIS player:
    // same surname and same leading initial as the anchor name.
    if (anchorInitial && initialKey(key) === anchorInitial && surnameOf(key) === stemSurname) {
      // "A Sharma" is a generic form that several players answer to, so it is
      // only safe when no other player in the bio shares that abbreviation.
      const sharers = Object.values(bio).filter(e =>
        initialKey(e.playerName) === anchorInitial || initialKey(e.fullName) === anchorInitial);
      if (sharers.length <= 1) { kept[key] = url; continue; }
      dropped.push([key, url, `ambiguous abbreviation (${sharers.length} players share it)`]);
      continue;
    }

    dropped.push([key, url, "different player"]);
  }
}

fs.writeFileSync(IMAGES_FILE, JSON.stringify(kept, null, 2));

console.log(`kept ${Object.keys(kept).length} / ${Object.keys(images).length} entries`);
console.log(`dropped ${dropped.length}:\n`);
for (const [key, url, why] of dropped) {
  console.log(`  ${key.padEnd(22)} -> ${String(url).split("/").pop().padEnd(24)} (${why})`);
}
