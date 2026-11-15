// Pressure Reliability: the maths (logistic fit, shrinkage, leverage) and the published snapshot.
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import { fitEb, fitLogistic, leverage, makeMonotone, shrink, sigmoid, winProb } from "../src/services/pressure/model";
import { pressureModelInfo, pressureReliability } from "../src/services/pressure/reliability";

test("logistic fit recovers known weights", () => {
  const X: number[][] = [], y: number[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 20000; i++) {
    const x = rnd() * 4 - 2;
    X.push([1, x]);
    y.push(rnd() < sigmoid(0.5 + 1.5 * x) ? 1 : 0);
  }
  const w = fitLogistic(X, y);
  assert.ok(Math.abs(w[0] - 0.5) < 0.1 && Math.abs(w[1] - 1.5) < 0.1, `got ${w}`);
});

test("shrinkage pulls small samples harder and narrows with balls", () => {
  const eb = { mu: 0, s2: 1, tau2: 0.01, K: 100 };
  const small = shrink(eb, 20, 10), big = shrink(eb, 2000, 1000);
  assert.ok(small.weight < big.weight);
  assert.ok(small.mean < 0.5 && big.mean > 0.45);
  assert.ok(small.sd > big.sd);
});

test("prior strength comes from the data: identical players give a strong prior", () => {
  const same = Array.from({ length: 50 }, () => ({ balls: 100, value: 10, matches: [{ b: 50, v: 6 }, { b: 50, v: 4 }] }));
  const spread = Array.from({ length: 50 }, (_, i) => ({ balls: 100, value: i * 2 - 50, matches: [{ b: 100, v: i * 2 - 50 }] }));
  assert.ok(fitEb(same).K > fitEb(spread).K);
});

test("monotone table: fewer runs with more wickets, more with more overs", () => {
  const t = makeMonotone(Array.from({ length: 21 }, (_, k) => Array.from({ length: 11 }, (_, w) => (w === 10 ? 0 : k * 8 - w + (w === 3 ? 5 : 0)))));
  for (let k = 0; k <= 20; k++) for (let w = 1; w <= 10; w++) assert.ok(t[k][w] <= t[k][w - 1]);
  for (let w = 0; w <= 10; w++) for (let k = 1; k <= 20; k++) assert.ok(t[k][w] >= t[k - 1][w]);
});

test("a won chase has no leverage; a tight finish has more than an easy one", () => {
  const info = pressureModelInfo() as any;
  const m = info.winProbability.weights;
  const table = Array.from({ length: 21 }, (_, k) => Array.from({ length: 11 }, (_, w) => (w === 10 ? 0 : k * 8 * (1 - w / 12))));
  const o = { pOut: 0.06, runs: [[0, 0.35], [1, 0.38], [2, 0.07], [4, 0.13], [6, 0.07]] as [number, number][] };
  const base = { innings: 2 as const, runs: 150, wickets: 5, par: 170, scale: 1 };
  assert.equal(winProb(m, table, { ...base, ballsLeft: 6, target: 150 }), 1);
  const tight = leverage(m, table, { ...base, ballsLeft: 6, target: 162 }, o);
  const easy = leverage(m, table, { ...base, ballsLeft: 60, target: 162 }, o);
  assert.ok(tight > easy, `tight ${tight} easy ${easy}`);
});

test("snapshot: win-probability models beat the base rate on unseen 2023+ matches", () => {
  const v = (pressureModelInfo() as any).winProbability.validation;
  for (const k of ["chase", "firstInnings"]) assert.ok(v[k].model.brier < v[k].baseline.brier, k);
});

test("rankings: filters respected, sorted, intervals contain the estimate", () => {
  const r = pressureReliability({ comps: ["ipl"], from: 2022, to: 2026, role: "batting", tier: "high", minBalls: 120, minMatches: 10, lens: "all" });
  assert.ok(r.players.length > 10);
  for (const p of r.players) {
    assert.ok(p.pressureBalls >= 120 && p.pressureMatches >= 10);
    assert.deepEqual(p.competitions, ["ipl"]);
    assert.ok(p.interval90[0] <= p.adjustedPer100 && p.adjustedPer100 <= p.interval90[1]);
    // Shrunk estimate lies between the cohort mean and the raw rate.
    const lo = Math.min(r.cohort.mean, p.rawPer100) - 0.02, hi = Math.max(r.cohort.mean, p.rawPer100) + 0.02;
    assert.ok(p.adjustedPer100 >= lo && p.adjustedPer100 <= hi, p.player);
  }
  for (let i = 1; i < r.players.length; i++) assert.ok(r.players[i - 1].adjustedPer100 >= r.players[i].adjustedPer100);
  const death = pressureReliability({ comps: ["ipl"], from: 2022, to: 2026, role: "batting", tier: "high", minBalls: 120, minMatches: 10, lens: "death" });
  for (const p of death.players) assert.ok(p.phaseShare.death >= 0.4);
});

test("stricter tier means fewer pressure balls for the same player", () => {
  const q = { comps: ["ipl"], role: "bowling" as const, minBalls: 0, minMatches: 0, lens: "all" as const, limit: 200 };
  const hi = pressureReliability({ ...q, tier: "high" }).players, ex = pressureReliability({ ...q, tier: "extreme" }).players;
  const p = hi[0];
  const e = ex.find(x => x.player === p.player);
  assert.ok(!e || e.pressureBalls <= p.pressureBalls);
});
