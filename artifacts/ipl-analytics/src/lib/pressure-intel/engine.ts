// Contextual Pressure Performance (CPP v1) + Reliability-Adjusted Score (RAS v1).
// Pure: runs in the browser (static deploy) and in Node (validation script, tests).
//
// Per ball:  bat  U = (runs − E[runs]) − v·(out − E[out])            (balls faced, wides excluded)
//            bowl U = (E[conceded] − conceded) + v·(wkt − E[wkt])    (every delivery; byes/leg-byes not charged)
// E[·] comes from the same competition-season and context cell (innings × over × wickets 0..6+),
// leaving the evaluated match out. Sparse cells fall back to the competition's cell, then its mean.
// Player:    A = 100·ΣU_H/(n_H+λH)  (H = balls matching the situation)
//            B = 100·ΣU_N/(n_N+λN)  (N = the player's other balls in the same competitions/seasons)
//            Lift = A − B,  SE = match-clustered standard error of the raw H rate (×100),
//            RAS = A + α·Lift − β·SE.
import { FLAG, type Balls } from "./format";
import { CHASE_ONLY, isGroup, type Cond, type Group, type Params, type Query } from "./query";

export interface Meta {
  comp: string; balls: number; seasons: string[];
  matches: [season: number, stage: number, date: string][];
  players: [id: string, name: string, bowlType: string, batHand: string][];
}
export interface Dataset { meta: Meta; b: Balls; seasonYear: number[]; exp: { eRun: Float32Array; eOut: Float32Array; eConc: Float32Array; eWkt: Float32Array } }

const CELLS = 280, MIN_CELL = 30;
const cellOf = (b: Balls, i: number) => (b.inn[i] - 1) * 140 + b.over[i] * 7 + Math.min(6, b.wkts[i]);

/** Prepares a league file: season years and leave-match-out context expectations. */
export function prepare(meta: Meta, b: Balls): Dataset {
  const seasonYear = meta.seasons.map((_, s) => Math.min(...meta.matches.filter(m => m[0] === s).map(m => Number(m[2].slice(0, 4)))));
  const S = meta.seasons.length;
  // [n, x, y] per cell: bat (faced) n, runs, outs; bowl (all deliveries) n, conceded, wickets.
  const sBat = new Float64Array(S * CELLS * 3), sBowl = new Float64Array(S * CELLS * 3);
  const cBat = new Float64Array(CELLS * 3), cBowl = new Float64Array(CELLS * 3);
  const tot = [0, 0, 0, 0, 0, 0];
  const add = (arr: Float64Array, k: number, x: number, y: number) => { arr[k * 3]++; arr[k * 3 + 1] += x; arr[k * 3 + 2] += y; };
  for (let i = 0; i < b.n; i++) {
    const s = meta.matches[b.match[i]][0], c = cellOf(b, i), f = b.flags[i];
    if (f & FLAG.faced) { const o = f & FLAG.strikerOut ? 1 : 0; add(sBat, s * CELLS + c, b.runsBat[i], o); add(cBat, c, b.runsBat[i], o); tot[0]++; tot[1] += b.runsBat[i]; tot[2] += o; }
    const w = f & FLAG.bowlerWkt ? 1 : 0;
    add(sBowl, s * CELLS + c, b.conceded[i], w); add(cBowl, c, b.conceded[i], w); tot[3]++; tot[4] += b.conceded[i]; tot[5] += w;
  }
  const eRun = new Float32Array(b.n), eOut = new Float32Array(b.n), eConc = new Float32Array(b.n), eWkt = new Float32Array(b.n);
  const local = new Map<number, number[]>(); // cell → [batN, runs, outs, bowlN, conc, wkts] within the current match
  const leaveOut = (seasonArr: Float64Array, compArr: Float64Array, sk: number, ck: number, m: number[], off: number, mean: [number, number]): [number, number] => {
    const n1 = seasonArr[sk * 3] - m[off];
    if (n1 >= MIN_CELL) return [(seasonArr[sk * 3 + 1] - m[off + 1]) / n1, (seasonArr[sk * 3 + 2] - m[off + 2]) / n1];
    const n2 = compArr[ck * 3] - m[off];
    if (n2 >= MIN_CELL) return [(compArr[ck * 3 + 1] - m[off + 1]) / n2, (compArr[ck * 3 + 2] - m[off + 2]) / n2];
    return mean;
  };
  const batMean: [number, number] = [tot[1] / tot[0], tot[2] / tot[0]], bowlMean: [number, number] = [tot[4] / tot[3], tot[5] / tot[3]];
  for (let start = 0; start < b.n;) {
    let end = start;
    while (end < b.n && b.match[end] === b.match[start]) end++;
    local.clear();
    for (let i = start; i < end; i++) {
      const c = cellOf(b, i), f = b.flags[i];
      const m = local.get(c) ?? local.set(c, [0, 0, 0, 0, 0, 0]).get(c)!;
      if (f & FLAG.faced) { m[0]++; m[1] += b.runsBat[i]; m[2] += f & FLAG.strikerOut ? 1 : 0; }
      m[3]++; m[4] += b.conceded[i]; m[5] += f & FLAG.bowlerWkt ? 1 : 0;
    }
    const s = meta.matches[b.match[start]][0];
    for (let i = start; i < end; i++) {
      const c = cellOf(b, i), m = local.get(c)!;
      [eRun[i], eOut[i]] = leaveOut(sBat, cBat, s * CELLS + c, c, m, 0, batMean);
      [eConc[i], eWkt[i]] = leaveOut(sBowl, cBowl, s * CELLS + c, c, m, 3, bowlMean);
    }
    start = end;
  }
  return { meta, b, seasonYear, exp: { eRun, eOut, eConc, eWkt } };
}

const inR = (x: number, c: { min?: number; max?: number }) => (c.min === undefined || x >= c.min) && (c.max === undefined || x <= c.max);
const STAGE = { early: 0, mid: 1, late: 2, knockout: 3 } as const;

/** Compiles a condition tree into a per-ball predicate. Uses only state known before the ball. */
export function compile(g: Group, d: Dataset): (i: number) => boolean {
  const { b, meta } = d;
  const leaf = (c: Cond): ((i: number) => boolean) => {
    const chase = (i: number) => b.inn[i] === 2 && b.target[i] > 0;
    const need = (i: number) => b.target[i] - b.runsBefore[i];
    switch (c.k) {
      case "innings": return i => b.inn[i] === c.v;
      case "phase": { const [lo, hi] = c.v === "powerplay" ? [0, 5] : c.v === "middle" ? [6, 14] : [15, 19]; return i => b.over[i] >= lo && b.over[i] <= hi; }
      case "stage": { const v = STAGE[c.v]; return i => meta.matches[b.match[i]][1] === v; }
      case "batHand": return i => meta.players[b.batter[i]][3] === c.v;
      case "bowlType": return i => meta.players[b.bowler[i]][2] === c.v;
      case "over": return i => inR(b.over[i] + 1, c);
      case "wickets": return i => inR(b.wkts[i], c);
      case "ballsLeft": return i => inR(b.ballsLeft[i], c);
      case "score": return i => inR(b.runsBefore[i], c);
      case "position": return i => inR(b.pos[i], c);
      case "target": return i => chase(i) && inR(b.target[i], c);
      case "runsRequired": return i => chase(i) && need(i) > 0 && inR(need(i), c);
      case "rrr": return i => chase(i) && need(i) > 0 && b.ballsLeft[i] > 0 && inR((6 * need(i)) / b.ballsLeft[i], c);
    }
  };
  const node = (n: Cond | Group): ((i: number) => boolean) => {
    if (!isGroup(n)) return leaf(n);
    const fs = n.items.map(node);
    if (!fs.length) return () => true; // an empty group places no restriction (parseQuery also removes them)
    // One predicate per ball, so a ball matching several OR branches is counted once.
    return n.op === "and" ? i => fs.every(f => f(i)) : i => fs.some(f => f(i));
  };
  return node(g);
}

export const usesChaseOnly = (g: Group): boolean => g.items.some(i => (isGroup(i) ? usesChaseOnly(i) : CHASE_ONLY.has(i.k)));

interface Acc { n: number; u: number; runs: number; outs: number; dots: number; bdry: number; legal: number }
const acc = (): Acc => ({ n: 0, u: 0, runs: 0, outs: 0, dots: 0, bdry: 0, legal: 0 });
export interface PlayerRaw {
  id: string; name: string; bowlType: string; batHand: string;
  H: Acc; N: { n: number; u: number };
  matches: Map<string, [n: number, u: number]>;
  comps: Map<string, [n: number, u: number, legal: number]>;
  years: Map<number, [n: number, u: number, legal: number]>;
}
export interface Aggregate {
  players: Map<string, PlayerRaw>;
  situation: { events: number; legal: number; runs: number; outs: number; balls: number };
  comps: { comp: string; events: number; inScope: number }[];
}

/** One pass over the selected balls. `keep` filters matches (split-half validation). */
export function aggregate(ds: Dataset[], q: Query, wicket: number, keep?: (comp: string, match: number) => boolean): Aggregate {
  const players = new Map<string, PlayerRaw>();
  const situation = { events: 0, legal: 0, runs: 0, outs: 0, balls: 0 };
  const comps: Aggregate["comps"] = [];
  const bat = q.discipline === "bat";
  for (const d of ds) {
    if (!q.comps.includes(d.meta.comp)) continue;
    const { b, meta, exp } = d;
    const inH = compile(q.where, d);
    const yearOk = meta.seasons.map((_, s) => !q.years || (d.seasonYear[s] >= q.years[0] && d.seasonYear[s] <= q.years[1]));
    let compEvents = 0, compScope = 0;
    for (let i = 0; i < b.n; i++) {
      const mi = b.match[i];
      const s = meta.matches[mi][0];
      if (!yearOk[s] || (keep && !keep(meta.comp, mi))) continue;
      const f = b.flags[i];
      if (bat && !(f & FLAG.faced)) continue;
      compScope++;
      const p = bat ? b.batter[i] : b.bowler[i];
      const [id, name, bowlType, batHand] = meta.players[p];
      let r = players.get(id);
      if (!r) players.set(id, r = { id, name, bowlType, batHand, H: acc(), N: { n: 0, u: 0 }, matches: new Map(), comps: new Map(), years: new Map() });
      const runs = bat ? b.runsBat[i] : b.conceded[i];
      const out = bat ? (f & FLAG.strikerOut ? 1 : 0) : (f & FLAG.bowlerWkt ? 1 : 0);
      const u = bat ? (runs - exp.eRun[i]) - wicket * (out - exp.eOut[i]) : (exp.eConc[i] - runs) + wicket * (out - exp.eWkt[i]);
      if (!inH(i)) { r.N.n++; r.N.u += u; continue; }
      const legal = f & FLAG.legal ? 1 : 0;
      const H = r.H;
      H.n++; H.u += u; H.runs += runs; H.outs += out; H.legal += legal;
      if (runs === 0 && (bat || legal)) H.dots++;
      if (b.runsBat[i] === 4 || b.runsBat[i] === 6) H.bdry++;
      const mk = `${meta.comp}:${mi}`;
      const m = r.matches.get(mk) ?? r.matches.set(mk, [0, 0]).get(mk)!; m[0]++; m[1] += u;
      const c = r.comps.get(meta.comp) ?? r.comps.set(meta.comp, [0, 0, 0]).get(meta.comp)!; c[0]++; c[1] += u; c[2] += legal;
      const y = r.years.get(d.seasonYear[s]) ?? r.years.set(d.seasonYear[s], [0, 0, 0]).get(d.seasonYear[s])!; y[0]++; y[1] += u; y[2] += legal;
      situation.events++; situation.legal += legal; situation.runs += runs; situation.outs += out;
      compEvents++;
    }
    situation.balls += compScope;
    comps.push({ comp: meta.comp, events: compEvents, inScope: compScope });
  }
  return { players, situation, comps };
}

export type Evidence = "strong" | "adequate";
export interface ScoredRow {
  id: string; name: string; bowlType: string; batHand: string;
  balls: number; events: number; runs: number; outs: number; dots: number; boundaries: number; matches: number;
  A: number; B: number; lift: number; se: number; ras: number; ci: [number, number]; positiveShare: number; evidence: Evidence;
  comps: { comp: string; balls: number; per100: number }[];
  years: { year: number; balls: number; per100: number }[];
}

/** Turns raw sums into CPP/RAS rows. Players under the evidence thresholds are left out (and counted). */
export function score(a: Aggregate, p: Params, minBalls: number, minMatches: number, bat: boolean): { rows: ScoredRow[]; excluded: number } {
  const rows: ScoredRow[] = [];
  let excluded = 0;
  for (const r of a.players.values()) {
    const H = r.H;
    if (!H.n) continue;
    const balls = bat ? H.n : H.legal, M = r.matches.size;
    if (balls < minBalls || M < minMatches) { excluded++; continue; }
    const A = (100 * H.u) / (H.n + p.lambdaH);
    const B = (100 * r.N.u) / (r.N.n + p.lambdaN);
    // Match-clustered variance of the raw per-ball rate (the sandwich estimator a match bootstrap approximates).
    const rate = H.u / H.n;
    let ss = 0, pos = 0;
    for (const [n, u] of r.matches.values()) { ss += (u - rate * n) ** 2; if (u > 0) pos++; }
    const se = (100 * Math.sqrt((M / (M - 1)) * ss)) / H.n;
    const lift = A - B;
    rows.push({
      id: r.id, name: r.name, bowlType: r.bowlType, batHand: r.batHand,
      balls, events: H.n, runs: H.runs, outs: H.outs, dots: H.dots, boundaries: H.bdry, matches: M,
      A, B, lift, se, ras: A + p.alpha * lift - p.beta * se,
      ci: [100 * rate - 1.96 * se, 100 * rate + 1.96 * se], positiveShare: pos / M,
      evidence: balls >= 2 * minBalls && M >= 2 * minMatches ? "strong" : "adequate",
      comps: [...r.comps].map(([comp, [n, u, l]]) => ({ comp, balls: bat ? n : l, per100: (100 * u) / n })).sort((x, y) => y.balls - x.balls),
      years: [...r.years].map(([year, [n, u, l]]) => ({ year, balls: bat ? n : l, per100: (100 * u) / n })).sort((x, y) => x.year - y.year),
    });
  }
  rows.sort((x, y) => y.ras - x.ras || x.id.localeCompare(y.id));
  return { rows, excluded };
}

/** Spearman rank correlation (average ranks for ties). */
export function spearman(x: number[], y: number[]): number {
  const rank = (v: number[]) => {
    const idx = v.map((_, i) => i).sort((a, b) => v[a] - v[b]);
    const r = new Array(v.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && v[idx[j + 1]] === v[idx[i]]) j++;
      for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(x), ry = rank(y), n = x.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n, my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
