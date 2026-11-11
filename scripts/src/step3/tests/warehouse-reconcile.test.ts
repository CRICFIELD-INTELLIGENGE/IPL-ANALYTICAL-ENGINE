// Day 4 / 4.5 — warehouse reconciliation against the raw Cricsheet JSON.
//
//   pnpm --filter @workspace/scripts run test:step3
//   CORRECTED_DB=<copy.db> pnpm --filter @workspace/scripts run test:step3     (also checks a candidate copy)
//
// Production is opened read-only. Since the Day 4.5 correction (C1–C7, DAY-04.5-REPORT.md) it must match the
// source exactly; before it, the documented discrepancies were 8 spells, 19 innings, 531 + 55 batting rows,
// 24 bowler-phase rows and a −30 run residual (DAY-04-REPORT.md). Any drift from zero fails.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../../global/paths";
import { loadTruth, reconcile, liveConceded, precomputedConceded, exactConceded, conceded, type TruthBall } from "../../day4/reconcile-evidence";

const ball = (e: Partial<TruthBall["extras"]>, bat = 0): TruthBall => ({
  key: "", match: "", date: "", inn: 1, over: 0, ball: 1, batter: "", bowler: "", bat, total: 0, kinds: [], out: [],
  extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0, ...e },
});
const row = (batter_runs: number, extra_runs: number, is_wide: number, is_noball: number, is_bye = 0, is_legbye = 0, is_penalty = 0) =>
  ({ batter_runs, extra_runs, is_wide, is_noball, is_bye, is_legbye, is_penalty });

test("runs conceded: the expressions on the delivery shapes found in the IPL files", () => {
  // 2018+ no-ball with 4 byes (e.g. 1216500 1:18.5, AJ Tye): bowler is charged 1.
  assert.equal(conceded(ball({ noballs: 1, byes: 4 })), 1);
  assert.equal(liveConceded(row(0, 5, 0, 1)), 1);
  assert.equal(precomputedConceded(row(0, 5, 0, 1)), 5, "the pre-Day-4 compute_analytics expression charged the byes");
  assert.equal(exactConceded(row(0, 5, 0, 1, 1)), 1);
  // Pre-2017 5-run no-ball (e.g. 392196 2:16.2, JA Morkel): runs off a no-ball were no-ball extras.
  assert.equal(conceded(ball({ noballs: 5 })), 5);
  assert.equal(liveConceded(row(0, 5, 0, 1)), 1, "the pre-Day-4.5 expression under-charged by 4");
  assert.equal(exactConceded(row(0, 5, 0, 1)), 5);
  // Wide with 5 penalty runs (729309 2:4.2, SL Malinga).
  assert.equal(conceded(ball({ wides: 2, penalty: 5 })), 2);
  assert.equal(liveConceded(row(0, 7, 1, 0)), 7, "the pre-Day-4.5 expression charged the penalty");
  assert.equal(exactConceded(row(0, 7, 1, 0, 0, 0, 1)), 2);
});

test("runs conceded: one expression in the API constant, stats-aggregator and compute_analytics.ts", () => {
  const api = fs.readFileSync(path.join(REPO, "artifacts", "api-server", "src", "services", "decision", "db.ts"), "utf8");
  const m = /export const RUNS_CONCEDED_SQL =\s*"\((.+)\)";/.exec(api);
  assert.ok(m, "RUNS_CONCEDED_SQL not found");
  const expr = m[1];
  assert.ok(expr.includes("is_penalty") && expr.includes("is_legbye"), "RUNS_CONCEDED_SQL must be the exact (flag-based) expression");
  const agg = fs.readFileSync(path.join(REPO, "artifacts", "api-server", "src", "services", "stats-aggregator.ts"), "utf8");
  assert.equal(agg.split(`(${expr})`).length - 1, 7, "stats-aggregator.ts inline bowler aggregates must use the same expression");
  assert.ok(!agg.includes("case when d.is_noball = true then 1 else 0 end"), "the pre-Day-4.5 inline expression must be gone");
  const analytics = fs.readFileSync(path.join(REPO, "scripts", "src", "compute_analytics.ts"), "utf8");
  assert.equal(analytics.split(`SUM(${expr}) as runs`).length - 1, 4, "compute_analytics.ts must use the same expression in all four bowling aggregates");
});

const truth = loadTruth();

test("production warehouse: matches the source exactly (read-only)", () => {
  const r = reconcile(path.join(REPO, "sqlite.db"), truth);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.deliveries, 295732);
  assert.deepEqual([r.spellDiffs.length, r.inningsDiffs.length, r.battingDiffs.length, r.battingMissing.length, r.phaseDiffs.length], [0, 0, 0, 0, 0]);
  assert.equal(r.totals.truthConceded, 394585);
  assert.equal(r.exactMismatches, 0, "RUNS_CONCEDED_SQL equals the source on every delivery");
  assert.equal(r.totals.exactConceded, 394585);
  // The superseded expressions still differ by the documented amounts (a check on the recount itself).
  assert.equal(r.totals.liveConceded - r.totals.truthConceded, -30);
  assert.equal(r.totals.precomputedConceded - r.totals.truthConceded, 68);
});

const corrected = process.env.CORRECTED_DB;
test("candidate copy: zero differences from the source, totals unchanged", { skip: !corrected && "set CORRECTED_DB to check a candidate copy" }, () => {
  const r = reconcile(corrected!, truth);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.deliveries, 295732);
  assert.deepEqual([r.spellDiffs.length, r.inningsDiffs.length, r.battingDiffs.length, r.battingMissing.length], [0, 0, 0, 0]);
  assert.equal(r.totals.truthConceded, 394585);
  assert.equal(r.exactMismatches, 0);
});
