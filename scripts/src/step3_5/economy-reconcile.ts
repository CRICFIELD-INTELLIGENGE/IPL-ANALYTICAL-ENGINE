// Step 3.5 Task B — reconcile bowler runs conceded in a warehouse copy with the raw Cricsheet JSON.
//
//   tsx src/step3_5/economy-reconcile.ts --db <warehouse copy> [--out report.json]
//
// Truth: for every delivery in the raw IPL JSON (lib/cricket-data/raw), the bowler is charged runs off the
// bat + wides + no-balls (Cricsheet's definition; byes, leg-byes and penalty runs are not the bowler's).
// Compared, per bowler (Cricsheet registry id), with the warehouse under two formulas:
//   current  RUNS_CONCEDED_SQL from Step 3 (batter_runs + extra_runs on wides + 1 per no-ball)
//   exact    batter_runs + wide_runs + noball_runs (needs the proposed per-type columns)
// Regular innings only (super overs excluded), matching the API's ball-context. Read-only.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IPL_RAW_DIR, parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { values } = parseArgs(process.argv.slice(2));
const dbPath = values.get("db");
if (!dbPath) throw new Error("--db <warehouse copy> is required");

const truth = new Map<string, number>();
let truthDeliveries = 0;
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  const reg = m.info.registry.people;
  for (const inn of (m.innings as Any[]).slice(0, 2)) {
    if (inn.super_over) continue;
    for (const o of inn.overs ?? []) for (const d of o.deliveries) {
      const id = reg[d.bowler];
      truth.set(id, (truth.get(id) ?? 0) + d.runs.batter + (d.extras?.wides ?? 0) + (d.extras?.noballs ?? 0));
      truthDeliveries++;
    }
  }
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const cols = new Set((db.prepare("PRAGMA table_info(deliveries)").all() as Any[]).map((c) => c.name));
const formulas: Record<string, string> = {
  current: "d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs ELSE 0 END + CASE WHEN d.is_noball = 1 THEN 1 ELSE 0 END",
};
if (cols.has("wide_runs")) formulas.exact = "d.batter_runs + d.wide_runs + d.noball_runs";
const result: Any = { db: path.resolve(dbPath), truthBowlers: truth.size, truthDeliveries };
for (const [name, f] of Object.entries(formulas)) {
  const t0 = Date.now();
  const rows = db.prepare(`
    SELECT p.cricsheet_id id, p.name, SUM(${f}) runs, COUNT(*) n
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN players p ON p.player_id = d.bowler_id
    WHERE i.innings_number <= 2 GROUP BY d.bowler_id`).all() as Any[];
  const ms = Date.now() - t0;
  const diffs = rows.map((r) => ({ name: r.name, id: r.id, warehouse: r.runs, cricsheet: truth.get(r.id) ?? null, diff: r.runs - (truth.get(r.id) ?? 0) }))
    .filter((r) => r.diff !== 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.name.localeCompare(b.name));
  const missing = [...truth.keys()].filter((id) => !rows.some((r) => r.id === id));
  result[name] = {
    formula: f, bowlers: rows.length, deliveries: rows.reduce((a, r) => a + r.n, 0), queryMs: ms,
    bowlersDiffering: diffs.length, netDifference: diffs.reduce((a, r) => a + r.diff, 0), missingBowlers: missing.length, diffs,
  };
  console.log(`${name.padEnd(8)} bowlers ${rows.length}, deliveries ${result[name].deliveries}, differing ${diffs.length}, net ${result[name].netDifference}, query ${ms} ms`);
}
db.close();
if (values.get("out")) fs.writeFileSync(values.get("out")!, JSON.stringify(result, null, 1));
