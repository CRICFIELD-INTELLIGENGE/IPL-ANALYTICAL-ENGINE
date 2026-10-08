// Propagates the Cricsheet name corrections into the pre-aggregated JSON.
//
// The database rows were fixed first; these files were generated from it and
// carry the same drifted names, which breaks every join that keys on a player
// name (stats tables, matchups, venue leaders).
//
// The replacement is deliberately NOT global. Some files quote a player's
// published name and are correct as they stand:
//
//   player-auctions.json  auction records use the name the auction published
//   captains.json         the captains list is a published table
//   players.json          an auction-pool roster of readable names
//   squads-by-season.json  `name` is the Wikipedia spelling; only the
//                          `cricsheetName` field must match the match data
//
// Rewriting those would turn readable names into scorecard abbreviations. So
// each file below names the exact fields to touch.

import fs from "node:fs";
import path from "node:path";

const [, , DATA_DIR, CORRECTIONS_FILE, mode] = process.argv;
if (!CORRECTIONS_FILE) {
  console.error("usage: node sync-player-names.mjs <dataDir> <corrections.json> [--apply]");
  process.exit(1);
}
const apply = mode === "--apply";

const corrections = new Map(
  JSON.parse(fs.readFileSync(CORRECTIONS_FILE, "utf8")).map((c) => [c.from, c.to]),
);

/** file -> the field names whose value is a scorecard player name. */
const TARGETS = {
  "player-career-stats.json": ["player"],
  "player-season-stats.json": ["player"],
  "player-team-stats.json": ["player"],
  "player-team-season-stats.json": ["player"],
  "top-batters.json": ["player"],
  "top-bowlers.json": ["player"],
  "season-tops.json": ["player"],
  "current-squads.json": ["playerName"],
  "matches.json": ["mom"],
  "player-bio.json": ["playerName"],
  "squads-by-season.json": ["cricsheetName"],
};

/** Object keys that are themselves player names. */
const KEYED_BY_PLAYER = new Set(["player-latest-teams.json"]);

let totalChanged = 0;
const report = [];

for (const [file, fields] of Object.entries(TARGETS)) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) continue;
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  let changed = 0;

  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    for (const f of fields) {
      const v = node[f];
      if (typeof v === "string" && corrections.has(v)) {
        node[f] = corrections.get(v);
        changed++;
      }
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(data);

  if (changed > 0 && apply) fs.writeFileSync(full, JSON.stringify(data, null, 2));
  if (changed > 0) report.push([file, changed]);
  totalChanged += changed;
}

for (const file of KEYED_BY_PLAYER) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) continue;
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  let changed = 0;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    const fixed = corrections.get(k) ?? k;
    if (fixed !== k) changed++;
    // A corrected key may already exist; the existing value wins so the
    // rename cannot silently drop a real entry.
    out[fixed] = out[fixed] ?? v;
  }
  if (changed > 0 && apply) fs.writeFileSync(full, JSON.stringify(out, null, 2));
  if (changed > 0) report.push([file, changed]);
  totalChanged += changed;
}

console.log(`${apply ? "applied" : "would apply"} ${totalChanged} field updates\n`);
for (const [file, n] of report) console.log(`   ${file.padEnd(34)} ${n}`);
console.log("\nleft untouched by design: player-auctions.json, captains.json, players.json,");
console.log("and squads-by-season.json's `name` field — those hold published names.");
