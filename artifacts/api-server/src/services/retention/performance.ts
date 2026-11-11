// Retention Engine V2 — multi-season performance, phase impact and aging (batch only).
//
// A projection combines up to three seasons. Each season's adjusted run value counts
// in proportion to its season weight times the balls actually faced or bowled, so a
// four-match season cannot dominate, and a missing season simply contributes nothing:
//
//   rate = (Σ w_s · value_s + k · prior) / (Σ w_s · balls_s + k)
//
// k is the empirical-Bayes prior weight measured by impact-engine from year-to-year
// persistence. Weights scale so the latest season is 1. Several weightings are scored
// out of time on next-season output; the published one is chosen on 2016–2023 and
// reported on 2024–2026, which played no part in the choice.
//
// The unit is runs above replacement per match. Not WAR: no wins conversion exists.

import { getPlayerSeasons, ratingsAsOf, replacementRates, type PlayerSeason } from "../intelligence/impact-engine";
import { analyticRole } from "../intelligence/feature-store";

export const PERF_CONFIGS: Record<string, { label: string; weights: number[] | "decay" }> = {
  "brief-3y": { label: "Three seasons, 0.50 / 0.35 / 0.15", weights: [1, 0.7, 0.3] },
  "recent-3y": { label: "Three seasons, 0.60 / 0.30 / 0.10", weights: [1, 0.5, 1 / 6] },
  "even-3y": { label: "Three seasons, equal", weights: [1, 1, 1] },
  "decay-all": { label: "All seasons, halving each year (V1)", weights: "decay" },
  "single": { label: "Latest season only", weights: [1] },
};

const weightFor = (w: number[] | "decay", age: number) => (w === "decay" ? 0.5 ** age : w[age] ?? 0);

export interface Projection {
  rar: number; sd: number; bat: number; bowl: number; batBallsPerMatch: number; bowlBallsPerMatch: number; seasonsUsed: number[];
}

type Bundle = { r: ReturnType<typeof ratingsAsOf>; repl: ReturnType<typeof replacementRates> };
const bundles = new Map<number, Bundle>();
export function bundle(asOf: number): Bundle {
  let b = bundles.get(asOf);
  if (!b) { const r = ratingsAsOf(asOf); b = { r, repl: replacementRates(r, (id) => analyticRole(id, asOf, null)) }; bundles.set(asOf, b); }
  return b;
}

export function project(lines: PlayerSeason[], asOf: number, weights: number[] | "decay", role: string): Projection | null {
  const { r, repl } = bundle(asOf);
  let bb = 0, bv = 0, wb = 0, wv = 0, m = 0;
  const used: number[] = [];
  for (const l of lines) {
    const w = l.season <= asOf ? weightFor(weights, asOf - l.season) : 0;
    if (!w || !l.matches) continue;
    used.push(l.season);
    bb += w * l.batBalls; bv += w * l.batValue; wb += w * l.bowlBalls; wv += w * l.bowlValue; m += w * l.matches;
  }
  if (!m) return null;
  const rr = repl.get(role) ?? { bat: r.bat.priorRate, bowl: r.bowl.priorRate };
  const batRate = (bv + r.bat.k * r.bat.priorRate) / (bb + r.bat.k), bowlRate = (wv + r.bowl.k * r.bowl.priorRate) / (wb + r.bowl.k);
  const batSd = Math.sqrt(1 / (1 / r.bat.talentVariance + bb / r.bat.perBallVariance)), bowlSd = Math.sqrt(1 / (1 / r.bowl.talentVariance + wb / r.bowl.perBallVariance));
  const bpm = bb / m, wpm = wb / m;
  const bowls = wpm >= 3;
  const bat = (batRate - rr.bat) * bpm, bowl = bowls ? (bowlRate - rr.bowl) * wpm : 0;
  return { rar: bat + bowl, sd: Math.sqrt((batSd * bpm) ** 2 + (bowls ? bowlSd * wpm : 0) ** 2), bat, bowl, batBallsPerMatch: bpm, bowlBallsPerMatch: wpm, seasonsUsed: used.sort() };
}

function spearman(a: number[], b: number[]) {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i]).sort((x, y) => x[0] - y[0]); const out = new Array<number>(v.length); idx.forEach(([, i], k) => (out[i] = k)); return out; };
  const ra = rank(a), rb = rank(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { cov += (ra[i] - ma) * (rb[i] - mb); va += (ra[i] - ma) ** 2; vb += (rb[i] - mb) ** 2; }
  return cov / Math.sqrt(va * vb);
}

/** Out-of-time test of each weighting: rated on seasons up to T−1, scored on season T output. */
export function validateConfigs() {
  const { byPlayer, seasons } = getPlayerSeasons();
  const score = (from: number, to: number, key: string) => {
    const pred: number[] = [], actual: number[] = [];
    for (let t = from; t <= to; t++) {
      for (const l of seasons.get(t) ?? []) {
        if (l.matches < 7) continue;
        const p = project(byPlayer.get(l.playerId) ?? [], t - 1, PERF_CONFIGS[key].weights, analyticRole(l.playerId, t - 1, null));
        if (!p) continue;
        pred.push(p.rar);
        actual.push((l.batValue + l.bowlValue) / l.matches);
      }
    }
    return { n: pred.length, rankCorrelation: Math.round(spearman(pred, actual) * 1000) / 1000 };
  };
  const rows = Object.keys(PERF_CONFIGS).map((key) => ({ key, label: PERF_CONFIGS[key].label, selection: score(2016, 2023, key), holdout: score(2024, 2026, key) }));
  const chosen = [...rows].sort((a, b) => b.selection.rankCorrelation - a.selection.rankCorrelation)[0];
  return { chosen: chosen.key, rows, rule: "Chosen on next-season rank correlation over 2016–2023; 2024–2026 is reported, not used to choose." };
}

/** Probability that a randomly chosen kept player outranks a randomly chosen released one. */
export function auc(score: number[], label: number[]) {
  const pos = score.filter((_, i) => label[i] === 1), neg = score.filter((_, i) => label[i] === 0);
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return Math.round((wins / (pos.length * neg.length)) * 1000) / 1000;
}

/**
 * How well each performance weighting, rated only on seasons before the decision, ranks
 * the players franchises actually kept. This is a ranking check, not a probability.
 */
export function decisionBacktest(rows: { season: number; warehouseId: number | null; retained: number; probability: number }[]) {
  const { byPlayer } = getPlayerSeasons();
  const usable = rows.filter((r) => r.warehouseId !== null);
  const methods = Object.keys(PERF_CONFIGS).map((key) => {
    const s: number[] = [], y: number[] = [];
    for (const r of usable) {
      const p = project(byPlayer.get(r.warehouseId!) ?? [], r.season - 1, PERF_CONFIGS[key].weights, analyticRole(r.warehouseId!, r.season - 1, null));
      s.push(p ? p.rar : -99); // no record ranks last, as it would for a franchise
      y.push(r.retained);
    }
    return { key, label: PERF_CONFIGS[key].label, auc: auc(s, y) };
  });
  return {
    n: usable.length, seasons: [...new Set(usable.map((r) => r.season))].sort(), methods,
    forecastModelAuc: auc(usable.map((r) => r.probability), usable.map((r) => r.retained)),
    note: "Area under the ROC curve for ranking kept players above released ones, on the out-of-time retention decisions. 0.5 is chance.",
  };
}

const ageBand = (age: number) => (age < 25 ? "under-25" : age <= 28 ? "25-28" : age <= 31 ? "29-31" : age <= 34 ? "32-34" : "35+");
export const AGE_BANDS = ["under-25", "25-28", "29-31", "32-34", "35+"];

/** Average change in per-match output from one season to the next, by age and discipline, shrunk to zero. */
export function agingCurves(birthYearOf: (warehouseId: number) => number | null, asOf: number) {
  const { byPlayer } = getPlayerSeasons();
  const acc: Record<string, { sum: number; n: number }> = {};
  for (const [id, ls] of byPlayer) {
    const born = birthYearOf(id);
    if (!born) continue;
    for (let i = 1; i < ls.length; i++) {
      const a = ls[i - 1], b = ls[i];
      if (b.season > asOf || b.season - a.season !== 1 || a.matches < 5 || b.matches < 5) continue;
      const band = ageBand(b.season - born);
      for (const [disc, va, vb, na, nb] of [["bat", a.batValue, b.batValue, a.batBalls, b.batBalls], ["bowl", a.bowlValue, b.bowlValue, a.bowlBalls, b.bowlBalls]] as const) {
        if (na < 60 || nb < 60) continue;
        const k = `${disc}:${band}`;
        acc[k] ??= { sum: 0, n: 0 };
        acc[k].sum += vb / b.matches - va / a.matches;
        acc[k].n++;
      }
    }
  }
  const SHRINK = 30;
  // Every band regresses to the mean (good seasons are followed by worse ones), so the age
  // effect is each band's change relative to the all-age average change.
  const curve = (disc: "bat" | "bowl") => {
    const all = AGE_BANDS.map((band) => acc[`${disc}:${band}`] ?? { sum: 0, n: 0 });
    const pooled = all.reduce((s, e) => s + e.sum, 0) / Math.max(1, all.reduce((s, e) => s + e.n, 0));
    return AGE_BANDS.map((band, i) => {
      const e = all[i];
      return { band, change: e.n ? Math.round(((e.sum - e.n * pooled) / (e.n + SHRINK)) * 100) / 100 : 0, n: e.n };
    });
  };
  return { bat: curve("bat"), bowl: curve("bowl"), shrink: SHRINK, note: "Runs per match change from one season to the next by age at the second season, relative to the average change at all ages (which is regression to the mean). Shrunk toward zero by n/(n+30)." };
}

export const bandOf = ageBand;
