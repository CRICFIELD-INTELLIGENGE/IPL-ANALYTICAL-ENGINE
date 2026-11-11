// Day 6C — metric definitions checked against independent recounts from the warehouse (read-only).
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { queryAll } from "../src/services/decision/db";
import { getOverview, aggregateQueryStats } from "../src/services/stats-aggregator";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("team economy (compute_analytics team_intelligence.avg_economy) converts cricket-notation overs to balls", () => {
  const src = fs.readFileSync(path.join(REPO, "scripts", "src", "compute_analytics.ts"), "utf8");
  const m = src.match(/team_econ AS \(\s*SELECT\s+i\.bowling_team_id as team_id,[\s\S]*?(ROUND\([^\n]*?\) as avg_economy)/);
  assert.ok(m, "team_econ expression not found");
  const expr = m[1].replace(/ as avg_economy$/, "");
  assert.doesNotMatch(expr, /\/ NULLIF\(SUM\(i\.overs\), 0\)/, "overs used as a decimal");
  const fromInnings = new Map(queryAll<{ t: number; e: number }>(`SELECT i.bowling_team_id t, ${expr} e FROM innings i GROUP BY 1`).map((r) => [r.t, r.e]));
  const recount = queryAll<{ t: number; e: number }>(`
    SELECT i.bowling_team_id t, ROUND(SUM(d.total_runs) * 6.0 / SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END), 2) e
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id GROUP BY 1`);
  assert.equal(recount.length, fromInnings.size);
  for (const r of recount) assert.equal(fromInnings.get(r.t), r.e, `team ${r.t}`);
});

test("/api/ipl/overview: every rate and count is computed from the warehouse (no literals)", async () => {
  const o: any = await getOverview();
  const [x] = queryAll<any>(`
    SELECT (SELECT ROUND(AVG(runs)) FROM innings WHERE innings_number = 2) avg2,
      (SELECT SUM(is_wide = 0 AND is_noball = 0) FROM deliveries) legal,
      (SELECT SUM(is_wide = 0 AND is_noball = 0 AND is_dot_ball = 1) FROM deliveries) dots,
      (SELECT SUM(is_boundary) FROM deliveries) bnd,
      (SELECT COUNT(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id IS NOT NULL) decided,
      (SELECT COUNT(*) FROM matches m JOIN innings i ON i.match_id = m.match_id AND i.innings_number = 1 WHERE m.winner_id = i.batting_team_id) bf,
      (SELECT COUNT(*) FROM venues) venues, (SELECT COUNT(DISTINCT batter_id) FROM deliveries) batters, (SELECT COUNT(DISTINCT bowler_id) FROM deliveries) bowlers`);
  assert.equal(o.avgSecondInningsScore, x.avg2);
  assert.equal(o.dotBallPct, Math.round((x.dots / x.legal) * 10000) / 100);
  assert.equal(o.boundaryPct, Math.round((x.bnd / x.legal) * 10000) / 100);
  assert.equal(o.battingFirstWinPct, Math.round((x.bf / x.decided) * 1000) / 10);
  assert.equal(Math.round((o.battingFirstWinPct + o.chasingWinPct) * 10) / 10, 100);
  assert.equal(o.totalVenues, x.venues);
  assert.equal(o.totalBatsmen, x.batters);
  assert.equal(o.totalBowlers, x.bowlers);
  assert.ok(o.totalFours > o.totalSixes, "fours outnumber sixes in the IPL record");
});

test("legacy stats query: a batter's boundaryPct is the share of runs in boundaries, exposed as boundaryRunPct", async () => {
  const r: any = await aggregateQueryStats({ season: "2025" } as any);
  assert.ok(r.batters.length > 50);
  for (const b of r.batters) {
    const expected = b.runs > 0 ? Math.round(((b.fours * 4 + b.sixes * 6) / b.runs) * 100) : 0;
    assert.equal(b.boundaryRunPct, expected, b.player);
    assert.equal(b.boundaryPct, b.boundaryRunPct, b.player);
  }
});

test("six-ball overs: every match in the global warehouse has balls_per_over = 6 (the /6 economy and SR maths rely on it)", () => {
  const db = new DatabaseSync(path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db"), { readOnly: true });
  try {
    const rows = db.prepare("SELECT balls_per_over b, COUNT(*) n FROM matches GROUP BY 1").all() as { b: number; n: number }[];
    assert.deepEqual(rows.map((r) => r.b), [6], `non-6-ball overs present: ${JSON.stringify(rows)}`);
  } finally { db.close(); }
});

test("/api/ipl/phase-analysis and /api/ipl/toss-analysis are computed from the warehouse, not literals", async () => {
  const { getPhaseAnalysis, getTossAnalysis } = await import("../src/services/stats-aggregator");
  const ph: any = await getPhaseAnalysis();
  const [pp] = queryAll<{ dot: number; rr: number }>(`
    SELECT ROUND(100.0 * SUM(d.is_wide = 0 AND d.is_noball = 0 AND d.is_dot_ball = 1) / SUM(d.is_wide = 0 AND d.is_noball = 0), 1) dot,
      ROUND(SUM(d.total_runs) * 6.0 / SUM(d.is_wide = 0 AND d.is_noball = 0), 2) rr
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id WHERE i.innings_number IN (1, 2) AND d.over_num < 6`);
  assert.equal(ph.powerplay.dotBallPct, pp.dot);
  assert.equal(ph.powerplay.avgRunRate, pp.rr);
  assert.notEqual(ph.powerplay.dotBallPct, 31.8, "old literal");
  const t: any = await getTossAnalysis();
  const [x] = queryAll<{ bat: number; n: number }>("SELECT SUM(toss_decision = 'bat') bat, SUM(toss_decision IS NOT NULL) n FROM matches");
  assert.equal(t.tossBatDecisionPct, Math.round((x.bat / x.n) * 1000) / 10);
  assert.equal(Math.round((t.tossBatDecisionPct + t.tossFieldDecisionPct) * 10) / 10, 100);
  assert.ok(t.venueBreakdown.length > 0 && t.venueBreakdown.every((v: any) => v.matches >= 20));
});
