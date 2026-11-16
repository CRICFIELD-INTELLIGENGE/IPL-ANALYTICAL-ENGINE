import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateQueryStats } from "../src/services/stats-aggregator";

const deliveryCount = (result: Awaited<ReturnType<typeof aggregateQueryStats>>) =>
  result.batters.reduce((sum: number, batter: { balls: number }) => sum + batter.balls, 0);

test("match-state thresholds narrow the same team, season, innings and phase slice", async () => {
  const scope = {
    season: "2024",
    team: "CSK",
    phase: "Death",
    innings: "2nd Innings (Chasing)",
  };
  const baseline = deliveryCount(await aggregateQueryStats(scope));
  const underPressure = deliveryCount(await aggregateQueryStats({
    ...scope,
    matchState: { minRequiredRate: 10, minRunsNeeded: 15, minWicketsLeft: 2 },
  }));
  assert.ok(underPressure > 0 && underPressure < baseline, `expected a nonempty subset, got ${underPressure} of ${baseline}`);
});

test("required rate is undefined in a first innings", async () => {
  const result = await aggregateQueryStats({
    season: "2024",
    team: "CSK",
    innings: "1st Innings (Setting)",
    matchState: { minRequiredRate: 1 },
  });
  assert.equal(deliveryCount(result), 0);
  assert.equal(result.bowlers.length, 0);
});
