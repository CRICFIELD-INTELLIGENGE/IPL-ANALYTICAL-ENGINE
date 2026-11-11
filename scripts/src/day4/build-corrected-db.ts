// Day 4 — build a CORRECTED COPY of the IPL warehouse. Never writes the source database.
//
//   tsx src/day4/build-corrected-db.ts --out <copy.db> [--source ../sqlite.db] [--log <dir>]
//
// 1. Copies the source with `VACUUM INTO` from a read-only connection (includes committed pages still in the
//    WAL; the source file, its WAL and its hash are untouched).
// 2. Recounts every delivery from the raw Cricsheet JSON (reconcile-evidence.ts) and applies, in ONE
//    transaction, only corrections that the recount proves:
//      C1 fact_bowling_spells.wickets      "retired out" credited to the bowler
//      C2 fact_bowling_spells.runs_conceded penalty runs charged to the bowler
//         (economy_rate / bowling_strike_rate recomputed with the ingest's own formulas)
//      C3 innings.wickets                  "retired hurt" counted as a fall of wicket
//      C4 deliveries.is_bye / is_legbye / is_penalty   never populated by the ingest
//      C5 fact_batting_innings.was_dismissed (+ rows for batters out without facing a ball)
//      C6 dismissals.fielder_id             never populated (source names the fielder)
//      C7 matches.winner_id                 super-over winner (outcome.eliminator) never read
// 3. Writes <log>/corrections.json (every old → new value with its source delivery), <log>/rollback.sql (the
//    inverse statements) and re-runs the recount on the copy, which must then report zero differences.
// Derived analytics tables are NOT touched here; rebuild them on the copy with
//   CRICFIELD_DB_PATH=<copy.db> pnpm --filter @workspace/scripts run compute-analytics
// and compare (see DAY-04-REPORT.md).

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IPL_RAW_DIR, REPO, parseArgs } from "../global/paths";
import { loadTruth, reconcile } from "./reconcile-evidence";

const { values, flags } = parseArgs(process.argv.slice(2));
const source = path.resolve(values.get("source") ?? path.join(REPO, "sqlite.db"));
const outArg = values.get("out");
if (!outArg) { console.error("--out <copy.db> is required"); process.exit(1); }
const out = path.resolve(outArg);
const PROTECTED = [path.join(REPO, "sqlite.db"), path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db")].map((p) => path.resolve(p));
if (PROTECTED.includes(out) || out === source) { console.error(`Refusing to write ${out}: production databases are never written by this script.`); process.exit(1); }
if (fs.existsSync(out) && !flags.has("force")) { console.error(`${out} exists; pass --force to replace the copy.`); process.exit(1); }
const logDir = path.resolve(values.get("log") ?? path.join(path.dirname(out), "day4-corrections"));

// 1. Copy.
for (const f of [out, `${out}-wal`, `${out}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
const src = new DatabaseSync(source, { readOnly: true });
src.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
src.close();

// 2. Evidence and corrections.
const truth = loadTruth();
const before = reconcile(out, truth);
const db = new DatabaseSync(out);
type Change = { id: string; table: string; key: Record<string, number | string>; column: string; old: unknown; new: unknown; evidence: string };
const changes: Change[] = [];
const rollback: string[] = [];
const ev = (t: { match: string; date: string; inn: number; over: number; ball: number; bowler: string }) =>
  `match ${t.match} (${t.date}) innings ${t.inn} ball ${t.over}.${t.ball}, bowler ${t.bowler}`;

db.exec("BEGIN");
try {
  // C1 + C2: bowling spells.
  for (const s of before.spellDiffs) {
    const wicketEv = before.wicketEvidence.filter((w) => w.innings_id === s.innings_id && w.bowler_id === s.bowler_id && w.kind === "retired out");
    const penaltyEv = before.penaltyBalls.filter((p) => p.innings_id === s.innings_id && p.bowler_id === s.bowler_id);
    const row = db.prepare("SELECT balls, economy_rate, bowling_strike_rate FROM fact_bowling_spells WHERE spell_id = ?").get(s.spell_id) as { balls: number; economy_rate: number; bowling_strike_rate: number };
    const econ = row.balls > 0 ? s.truth.runs / (row.balls / 6) : 0;          // update-ipl-data-v3.ts formula
    const bsr = s.truth.wickets > 0 ? row.balls / s.truth.wickets : 0;
    db.prepare("UPDATE fact_bowling_spells SET wickets = ?, runs_conceded = ?, economy_rate = ?, bowling_strike_rate = ? WHERE spell_id = ?")
      .run(s.truth.wickets, s.truth.runs, econ, bsr, s.spell_id);
    rollback.push(`UPDATE fact_bowling_spells SET wickets = ${s.wickets}, runs_conceded = ${s.runs_conceded}, economy_rate = ${row.economy_rate}, bowling_strike_rate = ${row.bowling_strike_rate} WHERE spell_id = ${s.spell_id};`);
    const evidence = [...wicketEv.map((w) => `retired out: ${w.t.out.join(", ")} at ${ev(w.t)} (delivery ${w.delivery_id})`),
      ...penaltyEv.map((p) => `5 penalty runs at ${ev(p)} (delivery ${p.delivery_id}) ${JSON.stringify(p.extras)}`)].join("; ");
    if (s.wickets !== s.truth.wickets) changes.push({ id: "C1", table: "fact_bowling_spells", key: { spell_id: s.spell_id, match_id: s.match_id, bowler: s.name }, column: "wickets", old: s.wickets, new: s.truth.wickets, evidence });
    if (s.runs_conceded !== s.truth.runs) changes.push({ id: "C2", table: "fact_bowling_spells", key: { spell_id: s.spell_id, match_id: s.match_id, bowler: s.name }, column: "runs_conceded", old: s.runs_conceded, new: s.truth.runs, evidence });
  }

  // C3: innings wickets (is_completed recomputed with the ingest's rule; none of these reach 10 wickets).
  for (const i of before.inningsDiffs) {
    if (i.runs !== i.truth.runs) throw new Error(`innings ${i.innings_id}: runs differ from the source (${i.runs} vs ${i.truth.runs}); not a planned correction`);
    db.prepare("UPDATE innings SET wickets = ? WHERE innings_id = ?").run(i.truth.wickets, i.innings_id);
    rollback.push(`UPDATE innings SET wickets = ${i.wickets} WHERE innings_id = ${i.innings_id};`);
    changes.push({ id: "C3", table: "innings", key: { innings_id: i.innings_id, match_id: i.match_id, innings_number: i.innings_number, team: i.team }, column: "wickets", old: i.wickets, new: i.truth.wickets, evidence: `retired hurt (not a wicket): ${i.truth.retiredHurt.join(", ")}` });
  }

  // C4: extras-type flags on every delivery, from the source extras.
  const flagRows = db.prepare(`SELECT d.delivery_id, d.match_id, i.innings_number inn, d.over_num, d.ball_num, d.is_bye, d.is_legbye, d.is_penalty
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id`).all() as { delivery_id: number; match_id: string; inn: number; over_num: number; ball_num: number; is_bye: number; is_legbye: number; is_penalty: number }[];
  const setFlags = db.prepare("UPDATE deliveries SET is_bye = ?, is_legbye = ?, is_penalty = ? WHERE delivery_id = ?");
  let flagCount = 0;
  const flagTotals = { is_bye: 0, is_legbye: 0, is_penalty: 0 };
  for (const r of flagRows) {
    const t = truth.get(`${r.match_id}:${r.inn}:${r.over_num}:${r.ball_num}`)!;
    const f = { is_bye: t.extras.byes > 0 ? 1 : 0, is_legbye: t.extras.legbyes > 0 ? 1 : 0, is_penalty: t.extras.penalty > 0 ? 1 : 0 };
    if (f.is_bye !== r.is_bye || f.is_legbye !== r.is_legbye || f.is_penalty !== r.is_penalty) {
      setFlags.run(f.is_bye, f.is_legbye, f.is_penalty, r.delivery_id);
      flagCount++;
      flagTotals.is_bye += f.is_bye; flagTotals.is_legbye += f.is_legbye; flagTotals.is_penalty += f.is_penalty;
    }
  }
  rollback.push("UPDATE deliveries SET is_bye = 0, is_legbye = 0, is_penalty = 0;  -- every flag was 0 before C4");
  changes.push({ id: "C4", table: "deliveries", key: { rows: flagCount }, column: "is_bye / is_legbye / is_penalty", old: "0 on every row", new: flagTotals, evidence: "Cricsheet extras.byes / legbyes / penalty per delivery (lib/cricket-data/raw)" });

  // C5: batting dismissals.
  for (const b of before.battingDiffs) {
    if (!b.truth || b.truth.runs !== b.runs || b.truth.balls !== b.balls_faced) throw new Error(`batting row ${b.batting_id}: runs/balls differ from the source; not a planned correction`);
    db.prepare("UPDATE fact_batting_innings SET was_dismissed = ? WHERE batting_id = ?").run(b.truth.out, b.batting_id);
    rollback.push(`UPDATE fact_batting_innings SET was_dismissed = ${b.was_dismissed} WHERE batting_id = ${b.batting_id};`);
    changes.push({ id: "C5", table: "fact_batting_innings", key: { batting_id: b.batting_id, match_id: b.match_id, innings_id: b.innings_id, batter: b.truth.name }, column: "was_dismissed", old: b.was_dismissed, new: b.truth.out, evidence: b.truth.out ? "dismissed (not retired hurt) in this innings, possibly at the non-striker end" : "retired hurt only: not out" });
  }
  const registryCache = new Map<string, Record<string, string>>();
  const registry = (match: string) => registryCache.get(match) ?? (registryCache.set(match, JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, `${match}.json`), "utf8")).info.registry.people).get(match)!);
  const insertBat = db.prepare("INSERT INTO fact_batting_innings (match_id, innings_id, striker_id, runs, balls_faced, fours, sixes, was_dismissed, strike_rate) VALUES (?, ?, ?, 0, 0, 0, 0, 1, 0) RETURNING batting_id");
  for (const m of before.battingMissing) {
    const inningsId = Number(m.key.split(":")[0]);
    const { match_id } = db.prepare("SELECT match_id FROM innings WHERE innings_id = ?").get(inningsId) as { match_id: string };
    const reg = registry(match_id)[m.name];
    const p = reg ? db.prepare("SELECT player_id FROM players WHERE cricsheet_id = ?").get(reg) as { player_id: number } | undefined : undefined;
    if (!p) throw new Error(`no player row for ${m.name} (${reg}) in match ${match_id}`);
    const { batting_id } = insertBat.get(match_id, inningsId, p.player_id) as { batting_id: number };
    rollback.push(`DELETE FROM fact_batting_innings WHERE batting_id = ${batting_id};`);
    changes.push({ id: "C5", table: "fact_batting_innings", key: { batting_id, match_id, innings_id: inningsId, batter: m.name }, column: "(new row)", old: null, new: "0 (0), out", evidence: "dismissed without facing a ball (non-striker); the ingest created rows only for strikers" });
  }
  // C6: fielder of caught / stumped / run out, from the source wickets[].fielders[0] (never set by the ingest).
  const raw = new Map<string, { info: { registry: { people: Record<string, string> }; outcome: { winner?: string; eliminator?: string; result?: string } }; innings: { overs?: { deliveries: { wickets?: { kind: string; player_out: string; fielders?: { name: string }[] }[] }[] }[] }[] }>();
  const rawMatch = (id: string) => raw.get(id) ?? raw.set(id, JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, `${id}.json`), "utf8"))).get(id)!;
  const playerByReg = db.prepare("SELECT player_id FROM players WHERE cricsheet_id = ?");
  const fielded = db.prepare(`SELECT x.dismissal_id, x.kind, x.fielder_id, d.match_id, i.innings_number inn, d.over_num, d.ball_num, po.cricsheet_id out_reg
    FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id JOIN innings i ON i.innings_id = d.innings_id
    LEFT JOIN players po ON po.player_id = x.player_out_id WHERE x.kind IN ('caught', 'stumped', 'run out')`).all() as
    { dismissal_id: number; kind: string; fielder_id: number | null; match_id: string; inn: number; over_num: number; ball_num: number; out_reg: string | null }[];
  const setFielder = db.prepare("UPDATE dismissals SET fielder_id = ? WHERE dismissal_id = ?");
  let fieldersSet = 0, noFielderInSource = 0;
  for (const x of fielded) {
    const m = rawMatch(x.match_id);
    const over = m.innings[x.inn - 1].overs!.find((o) => (o as unknown as { over: number }).over === x.over_num)!;
    const w = over.deliveries[x.ball_num - 1].wickets?.find((k) => k.kind === x.kind && m.info.registry.people[k.player_out] === x.out_reg);
    const name = w?.fielders?.[0]?.name;
    if (!name) { noFielderInSource++; continue; }
    const p = playerByReg.get(m.info.registry.people[name] ?? "") as { player_id: number } | undefined;
    if (!p) throw new Error(`fielder ${name} in match ${x.match_id} has no player row`);
    if (x.fielder_id !== p.player_id) { setFielder.run(p.player_id, x.dismissal_id); fieldersSet++; }
  }
  rollback.push("UPDATE dismissals SET fielder_id = NULL;  -- every fielder_id was NULL before C6");
  changes.push({ id: "C6", table: "dismissals", key: { rows: fieldersSet }, column: "fielder_id", old: "NULL on every row", new: `${fieldersSet} set; ${noFielderInSource} left NULL (no fielder named in the source)`, evidence: "Cricsheet wickets[].fielders[0].name resolved through the registry (players.cricsheet_id)" });

  // C7: winner of a tie decided by a super over (Cricsheet outcome.eliminator; the ingest read only outcome.winner).
  for (const r of db.prepare("SELECT match_id FROM matches WHERE winner_id IS NULL").all() as { match_id: string }[]) {
    const o = rawMatch(r.match_id).info.outcome;
    if (!o.eliminator) continue; // "no result": genuinely no winner
    const t = db.prepare("SELECT team_id FROM teams WHERE name = ?").get(o.eliminator) as { team_id: number } | undefined;
    if (!t) throw new Error(`team ${o.eliminator} not in teams`);
    db.prepare("UPDATE matches SET winner_id = ? WHERE match_id = ?").run(t.team_id, r.match_id);
    rollback.push(`UPDATE matches SET winner_id = NULL WHERE match_id = '${r.match_id}';`);
    changes.push({ id: "C7", table: "matches", key: { match_id: r.match_id }, column: "winner_id", old: null, new: `${t.team_id} (${o.eliminator})`, evidence: `outcome: ${o.result ?? "tie"}, eliminator ${o.eliminator} (super over)` });
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  db.close();
  throw e;
}
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
db.close();

// 3. Verify and log.
const after = reconcile(out, truth);
const residualAfterExact = (() => {
  const d = new DatabaseSync(out, { readOnly: true });
  try {
    const rows = d.prepare(`SELECT d.match_id, i.innings_number inn, d.over_num, d.ball_num,
        (d.batter_runs + CASE WHEN d.is_wide = 1 THEN d.extra_runs - 5 * d.is_penalty WHEN d.is_noball = 1 THEN (CASE WHEN d.is_bye = 1 OR d.is_legbye = 1 THEN 1 ELSE d.extra_runs - 5 * d.is_penalty END) ELSE 0 END) c
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id`).all() as { match_id: string; inn: number; over_num: number; ball_num: number; c: number }[];
    return rows.filter((r) => { const t = truth.get(`${r.match_id}:${r.inn}:${r.over_num}:${r.ball_num}`)!; return t.bat + t.extras.wides + t.extras.noballs !== r.c; }).length;
  } finally { d.close(); }
})();
const summary = {
  source, out, builtAt: new Date().toISOString(),
  corrections: Object.fromEntries(["C1", "C2", "C3", "C4", "C5", "C6", "C7"].map((id) => [id, changes.filter((c) => c.id === id).length])),
  before: { spellDiffs: before.spellDiffs.length, inningsDiffs: before.inningsDiffs.length, battingDiffs: before.battingDiffs.length, battingMissing: before.battingMissing.length, liveResidualDeliveries: before.residual.filter((r) => r.live !== r.truth).length },
  after: { spellDiffs: after.spellDiffs.length, inningsDiffs: after.inningsDiffs.length, battingDiffs: after.battingDiffs.length, battingMissing: after.battingMissing.length, exactExpressionMismatches: residualAfterExact, deliveries: after.deliveries, totals: after.totals },
};
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(path.join(logDir, "corrections.json"), JSON.stringify({ summary, changes }, null, 2));
fs.writeFileSync(path.join(logDir, "rollback.sql"), ["-- Inverse of build-corrected-db.ts on " + path.basename(out), "BEGIN;", ...rollback, "COMMIT;", ""].join("\n"));
console.log(JSON.stringify(summary, null, 2));
const clean = summary.after.spellDiffs === 0 && summary.after.inningsDiffs === 0 && summary.after.battingDiffs === 0 && summary.after.battingMissing === 0 && residualAfterExact === 0;
if (!clean) { console.error("Corrected copy still differs from the source recount"); process.exit(2); }
