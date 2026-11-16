import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateQueryStats, detailedBowlStyle } from "../src/services/stats-aggregator";

type Result = Awaited<ReturnType<typeof aggregateQueryStats>>;
const balls = (r: Result) => r.batters.reduce((s: number, b: { balls: number }) => s + b.balls, 0);
const runs = (r: Result) => r.batters.reduce((s: number, b: { runs: number }) => s + b.runs, 0);
// dateFrom forces the delivery-level path, so every side of a comparison is computed the same way.
const json = { dateFrom: "2008-01-01" };

test("season range equals the same calendar span as a date range", async () => {
  const range = await aggregateQueryStats({ seasonFrom: "2023", seasonTo: "2024", team: "RR" });
  const dates = await aggregateQueryStats({ dateFrom: "2023-01-01", dateTo: "2024-12-31", team: "RR" });
  assert.ok(balls(range) > 0);
  assert.equal(balls(range), balls(dates));
});

test("multi-team selection is the union of single teams", async () => {
  const both = await aggregateQueryStats({ ...json, season: "2024", team: "CSK|MI" });
  const csk = await aggregateQueryStats({ ...json, season: "2024", team: "CSK" });
  const mi = await aggregateQueryStats({ ...json, season: "2024", team: "MI" });
  assert.equal(runs(both), runs(csk) + runs(mi));
});

test("batting positions partition the batting balls", async () => {
  const scope = { ...json, season: "2024" };
  const total = balls(await aggregateQueryStats(scope));
  let sum = 0;
  for (const p of ["openers", "3", "4", "5", "6", "7+"]) sum += balls(await aggregateQueryStats({ ...scope, battingPosition: p }));
  assert.equal(sum, total);
});

test("match results partition the batting runs", async () => {
  const scope = { ...json, season: "2023" };
  const total = runs(await aggregateQueryStats(scope));
  let sum = 0;
  for (const r of ["won", "lost", "no result"]) sum += runs(await aggregateQueryStats({ ...scope, matchResult: r }));
  assert.equal(sum, total);
});

test("a detailed spin style is a subset of all spin", async () => {
  const scope = { ...json, season: "2024", phase: "Middle" };
  const spin = balls(await aggregateQueryStats({ ...scope, bowlerType: "Spinner" }));
  const leg = balls(await aggregateQueryStats({ ...scope, bowlStyle: "leg-spin" }));
  assert.ok(leg > 0 && leg < spin, `leg-spin ${leg} of spin ${spin}`);
});

test("max bounds narrow a chase; target bounds exclude first innings", async () => {
  const scope = { ...json, season: "2024" };
  const chase = balls(await aggregateQueryStats({ ...scope, innings: "2nd Innings (Chasing)" }));
  const easy = balls(await aggregateQueryStats({ ...scope, matchState: { maxRequiredRate: 8 } }));
  const big = balls(await aggregateQueryStats({ ...scope, matchState: { minTarget: 200 } }));
  assert.ok(easy > 0 && easy < chase);
  assert.ok(big > 0 && big < chase);
});

test("delivery-level and SQL paths agree on balls faced (no-balls count, wides don't)", async () => {
  const pick = (r: Result) => r.batters.find((b: { player: string }) => b.player === "SV Samson");
  const sql = pick(await aggregateQueryStats({ season: "2025", batter: "SV Samson" }));
  const deliveries = pick(await aggregateQueryStats({ ...json, season: "2025", batter: "SV Samson" }));
  assert.ok(sql && deliveries);
  assert.equal(deliveries.runs, sql.runs);
  assert.equal(deliveries.balls, sql.balls);
});

test("detailed style parsing refuses multi-style bios", () => {
  assert.equal(detailedBowlStyle("Legbreak Googly"), "leg-spin");
  assert.equal(detailedBowlStyle("Slow Left arm Orthodox"), "left-arm-orthodox");
  assert.equal(detailedBowlStyle("Right arm Medium fast"), "right-arm-fast-medium");
  assert.equal(detailedBowlStyle("Right arm Medium, Right arm Offbreak"), null);
  assert.equal(detailedBowlStyle(""), null);
});
