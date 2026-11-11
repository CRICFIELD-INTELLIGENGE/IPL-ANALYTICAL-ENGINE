// Checks that ESPN commentary lines up ball-for-ball with the deliveries table
// before anything is written. A join that silently drifts by one ball would
// attach every shot to the wrong delivery, which is worse than having no data.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const dir = process.argv[2];
const db = new DatabaseSync("sqlite.db");

// innings_id is global across the whole database, so it has to be reduced to
// an ordinal (1st innings, 2nd innings) within each match before it can be
// compared with ESPN's period.
const inningsOrder = new Map();
for (const r of db.prepare(
  "select match_id, innings_id from innings order by match_id, innings_id",
).all()) {
  const list = inningsOrder.get(r.match_id) ?? [];
  list.push(r.innings_id);
  inningsOrder.set(r.match_id, list);
}

const stmt = db.prepare(
  `select delivery_id, innings_id, over_num, ball_num, total_runs, is_wide, is_noball
     from deliveries where match_id = ? order by delivery_id`,
);

let matches = 0, exact = 0, countMismatch = 0, keyMismatch = 0, runsDiff = 0, balls = 0;
const notes = [];

for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const rows = stmt.all(j.matchId);
  if (rows.length === 0) { notes.push(`${j.matchId}: not in deliveries table`); continue; }
  matches++;

  const order = inningsOrder.get(j.matchId) ?? [];
  const ordinalOf = new Map(order.map((id, i) => [id, i + 1]));

  let ok = true;
  for (const inn of j.innings) {
    const dbInn = rows.filter(r => ordinalOf.get(r.innings_id) === inn.period);
    // Both sequences run oldest-first, so index i is the same ball in each.
    const esp = inn.deliveries.filter(d => d.over != null);
    if (dbInn.length !== esp.length) {
      ok = false;
      if (notes.length < 12) notes.push(`${j.matchId} inn${inn.period}: db ${dbInn.length} vs espn ${esp.length}`);
      countMismatch++;
      continue;
    }
    // ball_num and ESPN's over.actual use different conventions for extras
    // (the table counts them, ESPN does not), so alignment is verified on the
    // over number and on the runs scored — two signals that must both agree if
    // index i really is the same ball in both sequences.
    for (let i = 0; i < dbInn.length; i++) {
      const espOver = Math.floor(esp[i].over);
      if (dbInn[i].over_num !== espOver) {
        ok = false; keyMismatch++;
        if (notes.length < 12) notes.push(`${j.matchId} inn${inn.period} idx${i}: db over ${dbInn[i].over_num} vs espn ${espOver}`);
        break;
      }
      const espRuns = esp[i].runs ?? 0;
      if (dbInn[i].total_runs !== espRuns) runsDiff++;
      balls++;
    }
  }
  if (ok) exact++;
}

console.log(`matches compared: ${matches} | ball-for-ball identical: ${exact}`);
console.log(`count mismatches: ${countMismatch} | over mismatches: ${keyMismatch}`);
console.log(`runs disagree on ${runsDiff} of ${balls} aligned balls (${((runsDiff/balls)*100).toFixed(2)}%)`);
for (const n of notes) console.log("   " + n);
