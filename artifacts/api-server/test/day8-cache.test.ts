// Day 8 — the result caches change latency, never values, and a caller cannot corrupt them.
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateQueryStats } from "../src/services/stats-aggregator";
import { ratePlayers, listCompetitions } from "../src/services/scout/scout-service";

test("aggregateQueryStats: a repeated query returns equal results, and reassigning a returned field does not leak into the cache", async () => {
  const a: any = await aggregateQueryStats({ season: "2023" } as any);
  const b: any = await aggregateQueryStats({ season: "2023" } as any);
  assert.notEqual(a, b, "each caller gets its own top-level object");
  assert.deepEqual(a, b);
  const nBatters = b.batters.length;
  a.batters = [];               // what aggregateScenarioStats does (result.batters = …)
  a.bowlers = a.bowlers.filter(() => false);
  const c: any = await aggregateQueryStats({ season: "2023" } as any);
  assert.equal(c.batters.length, nBatters);
  assert.ok(c.bowlers.length > 0);
});

test("aggregateQueryStats: filter order does not matter for the cache key, different filters do", async () => {
  const x: any = await aggregateQueryStats({ season: "2023", phase: "Death Overs" } as any);
  const y: any = await aggregateQueryStats({ phase: "Death Overs", season: "2023" } as any);
  const z: any = await aggregateQueryStats({ season: "2023" } as any);
  assert.deepEqual(x, y);
  assert.notDeepEqual(x.batters.map((r: any) => r.runs), z.batters.map((r: any) => r.runs));
});

test("scout ratings: a one-player lookup equals that player's row in the full population (same percentiles), on every call", () => {
  const comps = listCompetitions().map((c) => c.code);
  const full = ratePlayers({ discipline: "batting", competitions: comps, minBalls: 120 });
  const target = full.find((r) => r.competition === "ipl" && r.balls > 500)!;
  assert.ok(target);
  for (let i = 0; i < 2; i++) {
    const one = ratePlayers({ discipline: "batting", competitions: comps, minBalls: 120, playerKeys: [target.player_key] })
      .find((r) => r.competition === "ipl")!;
    assert.deepEqual(one.metrics, target.metrics);
    assert.equal(one.balls, target.balls);
  }
  // a caller reassigning a returned row's field does not change later results
  const again = ratePlayers({ discipline: "batting", competitions: ["ipl"], minBalls: 120, playerKeys: [target.player_key] })[0];
  (again as any).balls = -1;
  const fresh = ratePlayers({ discipline: "batting", competitions: ["ipl"], minBalls: 120, playerKeys: [target.player_key] })[0];
  assert.equal(fresh.balls, target.balls);
});
