// Checks every scorecard against facts held elsewhere, so "it works" is not
// based on one match looking right.
//
// Three independent reconciliations per innings:
//   1. batting runs + extras must equal the innings total
//   2. runs conceded by the bowlers + byes + leg-byes must equal the total
//   3. wickets in the batting column must equal the fall-of-wickets count
// and across the match, the innings totals must agree with the archived
// scoreline in matches.json.

import fs from "node:fs";
import path from "node:path";
import { getMatchScorecard } from "../artifacts/api-server/src/services/match-card.ts";

const RAW = "lib/cricket-data/raw";
const ids = fs.readdirSync(RAW).filter(f => /^\d+\.json$/.test(f)).map(f => f.replace(".json", ""));

const archived = new Map();
try {
  const list = JSON.parse(fs.readFileSync("artifacts/ipl-analytics/public/data/matches.json", "utf8"));
  for (const m of list) archived.set(String(m.id), m);
} catch { /* the cross-check against matches.json is optional */ }

let cards = 0, innings = 0;
const fails = { batting: [], bowling: [], wickets: [], archive: [] };
const note = (bucket, msg) => { if (fails[bucket].length < 6) fails[bucket].push(msg); };

for (const id of ids) {
  const card = getMatchScorecard(id);
  if (!card) continue;
  cards++;

  for (const inn of card.innings) {
    innings++;
    const ex = inn.extras;

    const batRuns = inn.batting.reduce((n, b) => n + b.runs, 0);
    if (batRuns + ex.total !== inn.runs) {
      note("batting", `${id} ${inn.team}: bat ${batRuns} + extras ${ex.total} != total ${inn.runs}`);
    }

    // Bowlers are charged everything except byes and leg-byes.
    const bowlRuns = inn.bowling.reduce((n, b) => n + b.runs, 0);
    if (bowlRuns + ex.byes + ex.legbyes + ex.penalty !== inn.runs) {
      note("bowling", `${id} ${inn.team}: bowl ${bowlRuns} + b/lb/p ${ex.byes + ex.legbyes + ex.penalty} != total ${inn.runs}`);
    }

    const outCount = inn.batting.filter(b => b.out).length;
    if (outCount !== inn.wickets || inn.fallOfWickets.length !== inn.wickets) {
      note("wickets", `${id} ${inn.team}: out ${outCount}, fow ${inn.fallOfWickets.length}, wickets ${inn.wickets}`);
    }
  }

  // Cross-check the first two innings against the archived scoreline.
  const arch = archived.get(id);
  if (arch) {
    const scoreOf = (s) => (s ? Number(String(s).split("/")[0]) : null);
    for (const [team, raw] of [[arch.team1, arch.team1Score], [arch.team2, arch.team2Score]]) {
      const want = scoreOf(raw);
      if (want == null || Number.isNaN(want)) continue;
      const inn = card.innings.find(i => i.team === team && !i.superOver);
      if (inn && inn.runs !== want) {
        note("archive", `${id} ${team}: computed ${inn.runs} vs archived ${want}`);
      }
    }
  }
}

console.log(`scorecards built: ${cards} of ${ids.length} | innings checked: ${innings}\n`);
for (const [k, list] of Object.entries(fails)) {
  console.log(`${k.padEnd(9)} mismatches: ${list.length === 0 ? "none" : list.length + "+"}`);
  for (const m of list) console.log("     " + m);
}
