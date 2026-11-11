// Step 3.5 Task B — PROPOSED warehouse migration (for review; not applied to sqlite.db).
//
//   tsx src/step3_5/migrate-delivery-extras.ts --db <copy of sqlite.db> [--csv <ipl_csv dir>] [--apply] [--out report.json]
//
// Adds five per-type extras columns to `deliveries` — wide_runs, noball_runs, bye_runs, legbye_runs,
// penalty_runs (INTEGER NOT NULL DEFAULT 0) — and fills them from the same Cricsheet CSVs the warehouse was
// built from (ipl_csv/, columns wides, noballs, byes, legbyes, penalty). Nothing else changes: no existing
// column is written, no row is added or removed, and the table is not rebuilt (a rebuild would also re-draw
// the random delivery_type / scoring_area columns of scripts/src/update-ipl-data-v3.ts).
//
// Safety:
//   - Without --apply it only aligns and reports (dry run, read-only).
//   - Refuses the production warehouse (<repo>/sqlite.db) unless --allow-production is given.
//   - Every CSV ball must align with its warehouse row (same innings, over, ball, batter_runs, extra_runs,
//     wide / no-ball flags) and its per-type extras must sum to extra_runs; any mismatch aborts before writing.
//   - All writes happen in one transaction; idempotent (re-running sets the same values).

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REPO, parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { values, flags } = parseArgs(process.argv.slice(2));
const dbPath = values.get("db");
if (!dbPath) throw new Error("--db <path to a copy of sqlite.db> is required");
const production = path.resolve(REPO, "sqlite.db");
if (path.resolve(dbPath).toLowerCase() === production.toLowerCase() && !flags.has("allow-production")) {
  throw new Error(`refusing to touch the production warehouse ${production}; run on a copy (or pass --allow-production after approval)`);
}
const csvDir = values.get("csv") ?? path.join(REPO, "ipl_csv");
const apply = flags.has("apply");
const EXTRA_COLUMNS = ["wide_runs", "noball_runs", "bye_runs", "legbye_runs", "penalty_runs"] as const;

/** Same field splitting as update-ipl-data-v3.ts parseCSVLine. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result.map((v) => v.replace(/^"|"$/g, "").trim());
}
const int = (s: string | undefined) => parseInt(s ?? "") || 0;

const t0 = Date.now();
const db = new DatabaseSync(dbPath, { readOnly: !apply });
const rowsFor = db.prepare(`
  SELECT d.delivery_id id, i.innings_number inn, d.over_num, d.ball_num, d.batter_runs, d.extra_runs, d.is_wide, d.is_noball
  FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
  WHERE d.match_id = ? ORDER BY i.innings_number, d.delivery_id`);

const updates: { id: number; v: number[] }[] = [];
const problems: string[] = [];
let aligned = 0, files = 0;
const totals = Object.fromEntries(EXTRA_COLUMNS.map((c) => [c, 0])) as Record<string, number>;
for (const f of fs.readdirSync(csvDir).filter((x) => x.endsWith(".csv")).sort()) {
  const matchId = path.basename(f, ".csv");
  const balls = fs.readFileSync(path.join(csvDir, f), "utf8").split(/\r?\n/).filter((l) => l.startsWith("ball,")).map(parseCSVLine);
  balls.sort((a, b) => int(a[1]) - int(b[1])); // stable: file order within each innings, as the pipeline inserted them
  const rows = rowsFor.all(matchId) as Any[];
  files++;
  if (rows.length !== balls.length) { problems.push(`${matchId}: ${balls.length} CSV balls vs ${rows.length} warehouse rows`); continue; }
  for (let i = 0; i < rows.length; i++) {
    const b = balls[i], r = rows[i];
    const overBall = parseFloat(b[2]);
    const over = Math.floor(overBall), ball = Math.round((overBall - over) * 10);
    const v = [int(b[9]), int(b[10]), int(b[11]), int(b[12]), int(b[13])];
    const sum = v.reduce((a, x) => a + x, 0);
    const ok = r.inn === int(b[1]) && r.over_num === over && r.ball_num === ball && r.batter_runs === int(b[7]) &&
      r.extra_runs === int(b[8]) && r.is_wide === (v[0] > 0 ? 1 : 0) && r.is_noball === (v[1] > 0 ? 1 : 0) && sum === r.extra_runs;
    if (!ok) { problems.push(`${matchId} inns ${b[1]} ${b[2]}: CSV ${b.slice(7, 14).join(",")} vs row ${JSON.stringify(r)}`); continue; }
    aligned++;
    EXTRA_COLUMNS.forEach((c, k) => { totals[c] += v[k]; });
    if (sum > 0) updates.push({ id: r.id, v });
  }
}
const total = (db.prepare("SELECT COUNT(*) n FROM deliveries").get() as Any).n;
if (aligned !== total) problems.push(`${aligned} of ${total} warehouse rows aligned with a CSV ball`);

const report: Any = {
  db: path.resolve(dbPath), csvDir, files, warehouseRows: total, aligned, rowsWithExtras: updates.length, totals,
  problems: problems.slice(0, 50), problemCount: problems.length, applied: false, alignSeconds: (Date.now() - t0) / 1000,
};
if (problems.length) {
  console.error(`ABORT: ${problems.length} alignment problems (nothing written)\n${problems.slice(0, 20).join("\n")}`);
  process.exitCode = 1;
} else if (apply) {
  const t1 = Date.now();
  const have = new Set((db.prepare("PRAGMA table_info(deliveries)").all() as Any[]).map((c) => c.name));
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const c of EXTRA_COLUMNS) if (!have.has(c)) db.exec(`ALTER TABLE deliveries ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`);
    const upd = db.prepare(`UPDATE deliveries SET ${EXTRA_COLUMNS.map((c) => `${c} = ?`).join(", ")} WHERE delivery_id = ?`);
    for (const u of updates) upd.run(...u.v, u.id);
    const check = db.prepare(`SELECT COUNT(*) n FROM deliveries WHERE ${EXTRA_COLUMNS.join(" + ")} <> extra_runs`).get() as Any;
    if (check.n !== 0) throw new Error(`${check.n} rows whose per-type extras do not sum to extra_runs`);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  report.applied = true;
  report.applySeconds = (Date.now() - t1) / 1000;
}
db.close();
console.log(JSON.stringify(report, null, 1));
if (values.get("out")) fs.writeFileSync(values.get("out")!, JSON.stringify(report, null, 1));
