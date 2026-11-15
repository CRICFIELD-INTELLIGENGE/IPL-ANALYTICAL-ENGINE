// Pressure Reliability: the maths (logistic fit, shrinkage, leverage) and the published snapshot.
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import { anchoredShrink, fitAnchoredEb, fitEb, fitLogistic, leverage, makeMonotone, shrink, sigmoid, winProb } from "../src/services/pressure/model";
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

test("anchored shrinkage: small pressure samples sit near the usual-level forecast", () => {
  const mk = (pB: number, rate: number, oB: number, oRate: number) => ({
    pB, pV: pB * rate, oB, oV: oB * oRate,
    pMatches: Array.from({ length: 10 }, (_, i) => ({ b: pB / 10, v: (pB / 10) * rate * (i % 2 ? 1.3 : 0.7) })),
    oMatches: Array.from({ length: 10 }, (_, i) => ({ b: oB / 10, v: (oB / 10) * oRate * (i % 2 ? 1.2 : 0.8) })),
  });
  const cohort = Array.from({ length: 60 }, (_, i) => mk(200 + i * 10, (i - 30) / 300, 600, (i - 30) / 300));
  const fit = fitAnchoredEb(cohort);
  assert.ok(fit.beta > 0.5, `beta ${fit.beta}`);
  const small = anchoredShrink(fit, { pB: 20, pV: 20 * 0.5, oB: 600, oV: 0 });
  const big = anchoredShrink(fit, { pB: 5000, pV: 5000 * 0.5, oB: 600, oV: 0 });
  assert.ok(Math.abs(small.mean - small.prior) < Math.abs(big.mean - big.prior));
  assert.ok(small.weight < big.weight);
});

const Q = { comps: ["ipl", "t20i"], from: 2022, to: 2026, definition: "rules" as const, minBalls: 120, minMatches: 10, lens: "all" as const };

test("rankings: filters respected, sorted, pressure-only score inside its interval, forecast between usual and raw", () => {
  for (const role of ["batting", "bowling"] as const) {
    const r = pressureReliability({ ...Q, role, limit: 200 });
    assert.ok(r.players.length > 10);
    for (const p of r.players) {
      assert.ok(p.pressureBalls >= 120 && p.pressureMatches >= 10);
      assert.ok(p.competitions.every(c => c === "ipl" || c === "t20i"));
      assert.ok(p.interval90[0] <= p.adjustedPer100 && p.adjustedPer100 <= p.interval90[1]);
      const lo = Math.min(p.expectedFromUsualPer100, p.rawPer100) - 0.02, hi = Math.max(p.expectedFromUsualPer100, p.rawPer100) + 0.02;
      // Forecast mode sits between the usual-level forecast and the raw pressure rate; the official score is pressure-only.
      assert.ok(p.forecastPer100 >= lo && p.forecastPer100 <= hi, p.player);
      assert.equal(p.adjustedPer100, p.pressureOnlyPer100);
      assert.ok(p.evidenceWeight > 0 && p.evidenceWeight < 1);
    }
    for (let i = 1; i < r.players.length; i++) assert.ok(r.players[i - 1].adjustedPer100 >= r.players[i].adjustedPer100);
  }
  const death = pressureReliability({ ...Q, role: "batting", lens: "death" });
  for (const p of death.players) assert.ok(p.phaseShare.death >= 0.4);
});

test("full-member scope excludes associate-only players; 'all' includes more matches", () => {
  const fm = pressureReliability({ ...Q, comps: ["t20i"], role: "batting", minBalls: 0, minMatches: 0 });
  const all = pressureReliability({ ...Q, comps: ["t20i"], role: "batting", minBalls: 0, minMatches: 0, t20iScope: "all" });
  assert.ok(all.matches > fm.matches);
});

test("same delivery, same pressure: batters and bowlers see the same pressure-ball total", () => {
  const bat = pressureReliability({ ...Q, comps: ["ipl"], role: "batting", minBalls: 0, minMatches: 0, limit: 5000 });
  const bowl = pressureReliability({ ...Q, comps: ["ipl"], role: "bowling", minBalls: 0, minMatches: 0, limit: 5000 });
  const sb = bat.players.reduce((s, p) => s + p.pressureBalls, 0), sw = bowl.players.reduce((s, p) => s + p.pressureBalls, 0);
  // Batters count balls faced (no wides), bowlers legal balls (no wides or no-balls): the totals differ only by no-balls.
  assert.ok(sb >= sw && (sb - sw) / sw < 0.01, `${sb} vs ${sw}`);
});

test("stricter leverage definition means fewer pressure balls", () => {
  const q = { ...Q, comps: ["ipl"], role: "bowling" as const, minBalls: 0, minMatches: 0, limit: 5000 };
  const tot = (d: "leverage30" | "leverage10") => pressureReliability({ ...q, definition: d }).players.reduce((s, p) => s + p.pressureBalls, 0);
  assert.ok(tot("leverage10") < tot("leverage30"));
});
