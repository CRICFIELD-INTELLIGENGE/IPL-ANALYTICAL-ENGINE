// Writes the parsed commentary out in the shape the API server's JSON path
// reads: match -> innings -> flat array of six small integers per ball.
//
// Integers rather than strings because there are ~300k balls; the label tables
// live once at the top of the file and every ball is six numbers, with -1
// meaning "the commentary did not say". Speed is left out — it appears on 2% of
// balls and nothing filters on it.
//
// Ball order within an innings is the flattened order of overs[].deliveries[],
// which is exactly the order the aggregator walks and exactly the order the
// deliveries table was built in.

import fs from "node:fs";
import path from "node:path";
import { parseDelivery } from "./parse-commentary.mjs";

const [, , IN_DIR, RAW_DIR, OUT_FILE] = process.argv;
if (!OUT_FILE) {
  console.error("usage: node export-ball-commentary.mjs <commentaryDir> <rawDir> <out.json>");
  process.exit(1);
}

const FIELDS = ["length", "line", "variation", "shot", "contact", "zone"];
const vocab = Object.fromEntries(FIELDS.map(f => [f, []]));
const index = Object.fromEntries(FIELDS.map(f => [f, new Map()]));
const code = (field, value) => {
  if (value == null) return -1;
  const m = index[field];
  if (!m.has(value)) { m.set(value, vocab[field].length); vocab[field].push(value); }
  return m.get(value);
};

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

const matches = {};
let files = 0, kept = 0, skipped = 0, balls = 0;

for (const f of fs.readdirSync(IN_DIR).filter(f => f.endsWith(".json"))) {
  files++;
  const j = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), "utf8"));
  const rawPath = path.join(RAW_DIR, `${j.matchId}.json`);
  if (!fs.existsSync(rawPath)) { skipped++; continue; }
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

  const perInnings = [];
  let usable = false;
  for (let i = 0; i < (raw.innings?.length ?? 0); i++) {
    // Cricsheet's own count of legal + illegal balls in this innings.
    const rawBalls = (raw.innings[i].overs ?? []).reduce((n, o) => n + (o.deliveries?.length ?? 0), 0);
    const esp = dedupe((j.innings?.find(x => x.period === i + 1)?.deliveries ?? []).filter(d => d.over != null));
    // Lengths must agree exactly, or position i is not the same ball in both.
    if (esp.length !== rawBalls || rawBalls === 0) { perInnings.push([]); continue; }
    const flat = [];
    for (const d of esp) {
      const p = parseDelivery(d.text);
      for (const fld of FIELDS) flat.push(code(fld, p[fld]));
      balls++;
    }
    perInnings.push(flat);
    usable = true;
  }
  if (usable) { matches[j.matchId] = perInnings; kept++; } else skipped++;
}

fs.writeFileSync(OUT_FILE, JSON.stringify({ vocab, matches }));
const kb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`commentary files read: ${files} | matches exported: ${kept} | skipped: ${skipped}`);
console.log(`balls encoded: ${balls} | file size: ${kb} MB`);
for (const f of FIELDS) console.log(`   ${f.padEnd(10)} ${vocab[f].length} distinct labels`);
