// Picks the CPP/RAS hyperparameters by split-half prediction and records the evidence.
//
//   cd artifacts/api-server && node --import tsx scripts/pressure/validate-pressure-intel.ts
//
// 1. Wicket value v = runs a wicket costs in the rest of the innings (first innings, by overs left ×
//    wickets down), averaged over balls faced. Repeatability cannot set v: it always prefers v = 0
//    because wickets are noisy, which would make bowling ignore wickets.
// 2. λH (shrinkage): minimise the ball-weighted squared error of predicting a player's raw per-ball value
//    on even-numbered matches from their shrunk value on odd-numbered matches (and the reverse). Rank
//    criteria can't set λ: heavy shrinkage ranks by sample size, which repeats whatever the skill.
// 3. α, β (with that λ): maximise how well RAS on one half ranks raw value on the other half (Spearman),
//    averaged over presets with ≥ 30 players in both halves. Rankings were never inspected while choosing.
// Output: ipl-analytics/public/data/pressure-intel/methodology.json.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { getProjectRoot } from "../../src/services/scout/db";
import { FLAG, decodeBalls } from "../../../ipl-analytics/src/lib/pressure-intel/format";
import { aggregate, prepare, score, spearman, type Aggregate, type Dataset, type Meta } from "../../../ipl-analytics/src/lib/pressure-intel/engine";
import { PRESETS, type Group, type Query } from "../../../ipl-analytics/src/lib/pressure-intel/query";

const dir = path.join(getProjectRoot(), "artifacts", "ipl-analytics", "public", "data", "pressure-intel");
const load = (comp: string): Dataset => {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, `${comp}.json`), "utf8")) as Meta;
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(dir, `${comp}.bin.gz`)));
  return prepare(meta, decodeBalls(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), meta.balls));
};
const SCOPE = { comps: ["ipl", "t20i"], years: [2016, 2026] as [number, number] };
const ds = SCOPE.comps.map(load);
const LAMBDA_N = 120;
const GRID = { lambdaH: [0, 15, 30, 60, 120, 240, 480, 960, 1920], alpha: [0, 0.25, 0.5, 1], beta: [0, 0.5, 1, 1.5, 2] };
const MIN_PLAYERS = 30;

// ── 1. Wicket value from the data ──────────────────────────────────────────
const rem = Array.from({ length: 21 }, () => Array.from({ length: 11 }, () => [0, 0])); // [n, runs to come]
for (const d of ds) {
  const { b, meta } = d;
  for (let i = 0; i < b.n;) {
    let j = i; while (j < b.n && b.match[j] === b.match[i] && b.inn[j] === b.inn[i]) j++;
    const last = j - 1, yr = d.seasonYear[meta.matches[b.match[i]][0]];
    const complete = b.ballsLeft[last] <= 1 || b.wkts[last] >= 9;
    if (b.inn[i] === 1 && complete && yr >= SCOPE.years[0]) {
      const total = b.runsBefore[last] + b.conceded[last];
      for (let k = i; k < j; k++) {
        if (!(b.flags[k] & FLAG.legal) || b.ballsLeft[k] % 6 !== 0) continue;
        const c = rem[b.ballsLeft[k] / 6][Math.min(10, b.wkts[k])];
        c[0]++; c[1] += total - b.runsBefore[k];
      }
    }
    i = j;
  }
}
let costSum = 0, costN = 0;
for (const d of ds) {
  const { b, meta } = d;
  for (let i = 0; i < b.n; i++) {
    if (!(b.flags[i] & FLAG.faced) || d.seasonYear[meta.matches[b.match[i]][0]] < SCOPE.years[0]) continue;
    const k = Math.ceil(b.ballsLeft[i] / 6), w = Math.min(9, b.wkts[i]);
    if (k < 1 || k > 20) continue;
    const [n0, r0] = rem[k][w], [n1, r1] = rem[k][w + 1];
    if (n0 < 30 || n1 < 30) continue;
    costSum += Math.max(0, r0 / n0 - r1 / n1); costN++;
  }
}
const WICKET = +(costSum / costN).toFixed(2);
console.log(`wicket value ${WICKET} runs (from ${costN} balls)`);
const HALF = { minBalls: 40, minMatches: 4 };
const FULL = { minBalls: 120, minMatches: 10 };

const cases = [
  ...PRESETS.filter(p => p.id !== "knockout").map(p => ({ id: p.id, discipline: p.discipline, where: p.where })),
  { id: "final-five-bowl", discipline: "bowl" as const, where: PRESETS[0].where },
];
const query = (c: { discipline: "bat" | "bowl"; where: Group }): Query => ({ ...SCOPE, discipline: c.discipline, where: c.where, method: "standard", minBalls: 1, minMatches: 2 });

// Halves: alternate matches within each league (by date order).
const half = (h: number) => (_c: string, m: number) => m % 2 === h;
const runs = new Map<string, [Aggregate, Aggregate]>();
const V_SENS = [0, WICKET / 2, WICKET, WICKET * 2];
for (const c of cases) for (const v of V_SENS) runs.set(`${c.id}|${v}`, [aggregate(ds, query(c), v, half(0)), aggregate(ds, query(c), v, half(1))]);

const repeat = (pair: [Aggregate, Aggregate], p: Parameters<typeof score>[1], bat: boolean, key: "ras" | "lift" | "A" = "ras") => {
  const [x, y] = pair.map(a => new Map(score(a, p, HALF.minBalls, HALF.minMatches, bat).rows.map(r => [r.id, r[key]])));
  const ids = [...x.keys()].filter(id => y.has(id));
  return { r: spearman(ids.map(i => x.get(i)!), ids.map(i => y.get(i)!)), n: ids.length };
};

const RAW = { lambdaH: 0, lambdaN: 0, alpha: 0, beta: 0 };
// Score from one half predicts the other half's raw per-ball value (A with no shrinkage); both directions.
const predict = (pair: [Aggregate, Aggregate], p: Parameters<typeof score>[1], bat: boolean) => {
  const ras = pair.map(a => new Map(score(a, p, HALF.minBalls, HALF.minMatches, bat).rows.map(r => [r.id, r.ras])));
  const raw = pair.map(a => new Map(score(a, { ...RAW, wicket: p.wicket }, HALF.minBalls, HALF.minMatches, bat).rows.map(r => [r.id, r.A])));
  const one = (x: Map<string, number>, y: Map<string, number>) => { const ids = [...x.keys()].filter(i => y.has(i)); return spearman(ids.map(i => x.get(i)!), ids.map(i => y.get(i)!)); };
  return (one(ras[0], raw[1]) + one(ras[1], raw[0])) / 2;
};
const counted = cases.filter(c => repeat(runs.get(`${c.id}|${WICKET}`)!, { wicket: WICKET, lambdaH: 0, lambdaN: LAMBDA_N, alpha: 0, beta: 0 }, c.discipline === "bat").n >= MIN_PLAYERS);
console.log("presets in the objective:", counted.map(c => c.id).join(", "));
// Ball-weighted squared error: shrunk A on one half vs raw A on the other, both directions.
const mse = (pair: [Aggregate, Aggregate], lambdaH: number, bat: boolean) => {
  let se = 0, w = 0;
  for (const [a, b] of [[0, 1], [1, 0]]) {
    const pred = new Map(score(pair[a], { ...RAW, wicket: WICKET, lambdaH }, HALF.minBalls, HALF.minMatches, bat).rows.map(r => [r.id, r.A]));
    for (const r of score(pair[b], { ...RAW, wicket: WICKET }, HALF.minBalls, HALF.minMatches, bat).rows) {
      const p = pred.get(r.id);
      if (p === undefined) continue;
      se += r.events * (p - r.A) ** 2; w += r.events;
    }
  }
  return se / w;
};
const lambdaFit = GRID.lambdaH.map(lambdaH => ({ lambdaH, byCase: Object.fromEntries(counted.map(c => [c.id, +mse(runs.get(`${c.id}|${WICKET}`)!, lambdaH, c.discipline === "bat").toFixed(1)])) }))
  .map(x => ({ ...x, mean: +(Object.values(x.byCase).reduce((s, v) => s + v, 0) / counted.length).toFixed(1) }));
console.table(lambdaFit.map(x => ({ lambdaH: x.lambdaH, mean: x.mean, ...x.byCase })));
const LAMBDA_H = [...lambdaFit].sort((a, b) => a.mean - b.mean)[0].lambdaH;
const results: { wicket: number; lambdaH: number; alpha: number; beta: number; mean: number; byCase: Record<string, number> }[] = [];
for (const lambdaH of [LAMBDA_H]) for (const alpha of GRID.alpha) for (const beta of GRID.beta) {
  const p = { wicket: WICKET, lambdaH, lambdaN: LAMBDA_N, alpha, beta };
  const byCase: Record<string, number> = {};
  for (const c of counted) byCase[c.id] = +predict(runs.get(`${c.id}|${WICKET}`)!, p, c.discipline === "bat").toFixed(3);
  results.push({ wicket: WICKET, lambdaH, alpha, beta, mean: +(Object.values(byCase).reduce((s, v) => s + v, 0) / counted.length).toFixed(4), byCase });
}
results.sort((a, b) => b.mean - a.mean);
const best = results[0];
const params = { wicket: best.wicket, lambdaH: best.lambdaH, lambdaN: LAMBDA_N, alpha: best.alpha, beta: best.beta };
console.log("best", JSON.stringify(best));
console.log("next", results.slice(1, 6).map(r => `${r.wicket}/${r.lambdaH}/${r.alpha}/${r.beta}=${r.mean}`).join("  "));

// Does lift (pressure minus own ordinary) repeat on its own? Does A say anything ordinary form doesn't?
const diagnostics = cases.map(c => {
  const pair = runs.get(`${c.id}|${params.wicket}`)!, bat = c.discipline === "bat";
  const full = score(aggregate(ds, query(c), params.wicket), params, FULL.minBalls, FULL.minMatches, bat).rows;
  return {
    id: c.id, discipline: c.discipline,
    rasPredictsOtherHalf: +predict(pair, params, bat).toFixed(3), rasRepeat: repeat(pair, params, bat).r, pressureRepeat: repeat(pair, params, bat, "A").r, liftRepeat: repeat(pair, params, bat, "lift").r,
    playersBothHalves: repeat(pair, params, bat).n,
    pressureVsOrdinary: +spearman(full.map(r => r.A), full.map(r => r.B)).toFixed(3), qualified: full.length,
  };
}).map(d => ({ ...d, rasRepeat: +d.rasRepeat.toFixed(3), pressureRepeat: +d.pressureRepeat.toFixed(3), liftRepeat: +d.liftRepeat.toFixed(3) }));
console.table(diagnostics);

// Are rule thresholds load-bearing? Top-20 overlap when a threshold moves one step.
const top = (where: Group, discipline: "bat" | "bowl") => score(aggregate(ds, query({ discipline, where }), params.wicket), params, FULL.minBalls, FULL.minMatches, discipline === "bat").rows.slice(0, 20).map(r => r.id);
const overlap = (a: string[], b: string[]) => a.filter(x => b.includes(x)).length;
const base = { rrr: top({ op: "and", items: [{ k: "innings", v: 2 }, { k: "rrr", min: 10 }] }, "bat"), death: top({ op: "and", items: [{ k: "over", min: 16, max: 20 }] }, "bat") };
const sensitivity = [
  { rule: "High required rate: 10 → 9", overlapTop20: overlap(base.rrr, top({ op: "and", items: [{ k: "innings", v: 2 }, { k: "rrr", min: 9 }] }, "bat")) },
  { rule: "High required rate: 10 → 11", overlapTop20: overlap(base.rrr, top({ op: "and", items: [{ k: "innings", v: 2 }, { k: "rrr", min: 11 }] }, "bat")) },
  { rule: "Final overs: 16–20 → 15–20", overlapTop20: overlap(base.death, top({ op: "and", items: [{ k: "over", min: 15, max: 20 }] }, "bat")) },
  { rule: "Final overs: 16–20 → 17–20", overlapTop20: overlap(base.death, top({ op: "and", items: [{ k: "over", min: 17, max: 20 }] }, "bat")) },
];
console.table(sensitivity);
// How much does the wicket value move repeatability? (Information only; v is not chosen this way.)
const wicketSensitivity = V_SENS.map(v => ({ wicket: +v.toFixed(2), byCase: Object.fromEntries(counted.map(c => [c.id, +predict(runs.get(`${c.id}|${v}`)!, { ...params, wicket: v }, c.discipline === "bat").toFixed(3)])) }));
console.log("wicket sensitivity", JSON.stringify(wicketSensitivity));

fs.writeFileSync(path.join(dir, "methodology.json"), JSON.stringify({
  model: "contextual_pressure_performance_v1", score: "reliability_adjusted_score_v1", validatedAt: new Date().toISOString(),
  params,
  selection: {
    method: "Split-half prediction (odd vs even matches). λ minimises the ball-weighted error of predicting the other half's raw per-ball value; α and β maximise how well RAS ranks the other half's raw value (Spearman). Presets with enough players only. Rankings were not inspected while choosing.",
    scope: SCOPE, halfThresholds: HALF, grid: GRID, minPlayersBothHalves: MIN_PLAYERS, objectivePresets: counted.map(c => c.id),
    lambdaFit, candidates: results.length, best, runnersUp: results.slice(1, 6),
    wicket: "Mean over balls faced of the drop in expected first-innings runs still to come when one more wicket is down (same overs left), IPL + T20I 2016+.",
  },
  diagnostics, sensitivity, wicketSensitivity, fullThresholds: FULL,
}, null, 1));
console.log("wrote methodology.json");
