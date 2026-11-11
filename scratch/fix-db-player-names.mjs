// Corrects players.name against the Cricsheet registry.
//
// Cricsheet supplies the ball-by-ball data and the cricsheet_id every player row
// is keyed by, so its own name for an id is authoritative. 154 rows had drifted
// from it, and some had drifted onto a different person entirely: the row for
// KK Nair (Karun Nair) read "Srihari Nair", Sandeep Sharma's read "Shivalik
// Sharma", Swapnil Singh's read "Shiva Singh", and YS Chahal's carried the same
// "Emanjot Chahal" corruption already found in players.json.
//
// Only rows whose cricsheet_id appears in the registry are touched, and only
// when the names actually differ.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const [, , DB_PATH, RAW_DIR, mode] = process.argv;
if (!RAW_DIR) {
  console.error("usage: node fix-db-player-names.mjs <sqlite.db> <rawDir> [--apply]");
  process.exit(1);
}
const apply = mode === "--apply";

// id -> name, from every raw match file's registry
const registry = new Map();
for (const file of fs.readdirSync(RAW_DIR)) {
  if (!file.endsWith(".json")) continue;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
    for (const [name, id] of Object.entries(j.info?.registry?.people ?? {})) {
      if (!registry.has(id)) registry.set(id, name);
    }
  } catch { /* a malformed file should not stop the sweep */ }
}

const db = new DatabaseSync(DB_PATH);
const rows = db.prepare("SELECT player_id, name, cricsheet_id FROM players WHERE cricsheet_id IS NOT NULL").all();

const changes = [];
for (const r of rows) {
  const canonical = registry.get(r.cricsheet_id);
  if (!canonical || canonical === r.name) continue;
  changes.push({ id: r.player_id, from: r.name, to: canonical });
}

// A name must stay unique: two rows collapsing onto one string would make
// name-keyed lookups elsewhere ambiguous.
const existing = new Set(rows.map(r => r.name));
const applied = [];
const skipped = [];
for (const c of changes) {
  const collides = existing.has(c.to) && !changes.some(o => o.id !== c.id && o.from === c.to);
  if (collides) { skipped.push(c); continue; }
  applied.push(c);
}

if (apply) {
  const stmt = db.prepare("UPDATE players SET name = ? WHERE player_id = ?");
  for (const c of applied) stmt.run(c.to, c.id);
}

console.log(`registry ids: ${registry.size}`);
console.log(`rows checked: ${rows.length}`);
console.log(`${apply ? "applied" : "would apply"}: ${applied.length}`);
console.log(`skipped (name already taken by another row): ${skipped.length}`);
for (const c of skipped) console.log(`   SKIP ${c.from}  ->  ${c.to}`);
console.log("\nsample of corrections:");
for (const c of applied.slice(0, 20)) console.log(`   ${c.from.padEnd(26)} -> ${c.to}`);
