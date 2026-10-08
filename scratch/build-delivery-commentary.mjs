// Joins parsed ESPN commentary onto the deliveries table, one row per ball.
//
// The join is positional: for a given match and innings, the Nth ball in the
// commentary is the Nth row in `deliveries`. That is only safe because
// check-join.mjs verified it — over numbers agree on every aligned ball and the
// runs scored agree on 100% of them. Ball numbers deliberately are NOT used as
// a key: the table counts wides and no-balls as balls, ESPN does not.
//
// An innings whose lengths still disagree after de-duplication is skipped
// whole. A partial or shifted innings would attach every shot to the wrong
// delivery, which is worse than leaving the data absent.

import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { parseDelivery } from "./parse-commentary.mjs";

const IN_DIR = process.argv[2];
const DB_PATH = process.argv[3] ?? "sqlite.db";
if (!IN_DIR) {
  console.error("usage: node build-delivery-commentary.mjs <commentaryDir> [sqlite.db]");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS delivery_commentary (
    delivery_id INTEGER PRIMARY KEY REFERENCES deliveries(delivery_id) ON DELETE CASCADE,
    match_id    TEXT NOT NULL,
    length      TEXT,
    line        TEXT,
    variation   TEXT,
    shot        TEXT,
    contact     TEXT,
    zone        TEXT,
    speed_kph   REAL,
    commentary  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_delcomm_match ON delivery_commentary(match_id);
  CREATE INDEX IF NOT EXISTS idx_delcomm_length ON delivery_commentary(length);
  CREATE INDEX IF NOT EXISTS idx_delcomm_zone ON delivery_commentary(zone);
`);

const inningsOrder = new Map();
for (const r of db.prepare("select match_id, innings_id from innings order by match_id, innings_id").all()) {
  const list = inningsOrder.get(r.match_id) ?? [];
  list.push(r.innings_id);
  inningsOrder.set(r.match_id, list);
}

const selDeliveries = db.prepare(
  `select delivery_id, innings_id, over_num from deliveries where match_id = ? order by delivery_id`,
);
const insert = db.prepare(
  `INSERT OR REPLACE INTO delivery_commentary
     (delivery_id, match_id, length, line, variation, shot, contact, zone, speed_kph, commentary)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

/**
 * Cleans ESPN's ball list before it is lined up against the delivery record.
 *
 * Two artefacts show up:
 *   * a ball repeated verbatim, from the paging (same over label, same text);
 *     the repeat is not always adjacent, so the whole innings is tracked.
 *   * a trailing placeholder with no text at all, emitted after the innings
 *     has ended. It carries nothing and has no counterpart in Cricsheet, so
 *     leaving it in put every affected innings one ball out and got the lot
 *     refused by the alignment check.
 */
function dedupe(list) {
  const out = [];
  const seen = new Set();
  for (const d of list) {
    const text = d.text ? String(d.text).trim() : "";
    // Only text-bearing balls are de-duplicated. Several legitimate balls in an
    // innings carry no text at all, and treating them as copies of each other
    // would delete real deliveries and shift the whole innings.
    if (text) {
      const key = `${d.over}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(d);
  }
  // A textless entry at the very end is the placeholder ESPN emits once the
  // innings has closed. It has no counterpart in Cricsheet.
  while (out.length && !(out[out.length - 1].text || "").trim()) out.pop();
  return out;
}

const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith(".json"));
let written = 0, skippedInnings = 0, joinedMatches = 0, noMatchRow = 0, overClash = 0;

db.exec("BEGIN");
// Full rebuild: clear first so rows joined under earlier rules cannot survive.
db.exec("DELETE FROM delivery_commentary");
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(`${IN_DIR}/${f}`, "utf8"));
  const rows = selDeliveries.all(j.matchId);
  if (rows.length === 0) { noMatchRow++; continue; }

  const ordinalOf = new Map((inningsOrder.get(j.matchId) ?? []).map((id, i) => [id, i + 1]));
  let any = false;

  for (const inn of j.innings ?? []) {
    const dbInn = rows.filter(r => ordinalOf.get(r.innings_id) === inn.period);
    const esp = dedupe((inn.deliveries ?? []).filter(d => d.over != null));
    if (dbInn.length === 0 || dbInn.length !== esp.length) { skippedInnings++; continue; }

    // Refuse the innings outright if the over numbers ever disagree.
    let aligned = true;
    for (let i = 0; i < dbInn.length; i++) {
      if (dbInn[i].over_num !== Math.floor(esp[i].over)) { aligned = false; break; }
    }
    if (!aligned) { overClash++; skippedInnings++; continue; }

    for (let i = 0; i < dbInn.length; i++) {
      const text = esp[i].text;
      if (!text) continue;
      const p = parseDelivery(text);
      // A ball the parser read nothing from still earns a row: the commentary
      // itself is worth keeping and its absence of detail is a real fact.
      insert.run(
        dbInn[i].delivery_id, j.matchId,
        p.length, p.line, p.variation, p.shot, p.contact, p.zone, p.speedKph, text,
      );
      written++;
    }
    any = true;
  }
  if (any) joinedMatches++;
}
db.exec("COMMIT");

const q = (s) => db.prepare(s).get();
console.log(`matches joined: ${joinedMatches} of ${files.length} files`);
console.log(`deliveries written: ${written}`);
console.log(`innings skipped (length or over mismatch): ${skippedInnings}  [over clashes: ${overClash}]`);
if (noMatchRow) console.log(`files with no rows in deliveries: ${noMatchRow}`);

const t = q("select count(*) c from delivery_commentary").c;
console.log(`\ndelivery_commentary now holds ${t} rows`);
for (const col of ["length", "line", "variation", "shot", "contact", "zone", "speed_kph"]) {
  const n = q(`select count(${col}) c from delivery_commentary`).c;
  console.log(`   ${col.padEnd(10)} ${String(n).padStart(7)}  ${((n / t) * 100).toFixed(1)}%`);
}
