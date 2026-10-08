// Decision Intelligence OS — Phase 3: the match engine.
//
// 1. Ball-outcome tables. Every legal-or-not delivery is one of
//    dot · 1 · 2 · 3 · 4 · 6 · wicket · wide · no-ball, counted by
//    era × over band × wickets down × required-rate band. Sparse cells are
//    shrunk toward their parent (era × over band × wickets, then era × band).
//
// 2. Player multipliers. A batter's out / boundary / dot rates against pace
//    and spin in each phase, and a bowler's wicket / boundary / dot / extras
//    rates in each phase, relative to the league in the same slot and shrunk
//    toward 1. Profiles are built "as of" a season (recency-weighted, never
//    using later seasons) so historical what-ifs don't see the future.
//
// 3. Win probability. An exact dynamic program over (balls left, runs needed,
//    wickets lost) using the league outcome tables — the chase state-transition
//    model. Monte Carlo handles anything player-specific.
//
// 4. A seeded Monte Carlo innings simulator with pluggable bowling policies.

import { getBallColumns, F_FACED, F_LEGAL, F_WICKET, F_BOWLER_WICKET } from "./ball-context";
import { bowlingSubtype, getPlayerMeta, getSeasonLines, getSeasons } from "./player-profiles";

/* ─── Outcomes & context buckets ─────────────────────────────────────────── */

export const O = { DOT: 0, ONE: 1, TWO: 2, THREE: 3, FOUR: 4, SIX: 5, W: 6, WD: 7, NB: 8 } as const;
export const NO = 9;
export const OUTCOME_RUNS = [0, 1, 2, 3, 4, 6, 0, 1, 1];
export const OUTCOME_LABEL = ["dot", "1", "2", "3", "4", "6", "wicket", "wide", "no-ball"];

const ERAS = [[0, 2012], [2013, 2017], [2018, 2022], [2023, 9999]] as const;
export const eraOf = (season: number) => ERAS.findIndex(([a, b]) => season >= a && season <= b);
const overBand = (over: number) => (over <= 5 ? 0 : over <= 10 ? 1 : over <= 14 ? 2 : over <= 17 ? 3 : 4);
const wicketBand = (w: number) => (w <= 2 ? 0 : w <= 5 ? 1 : 2);
/** Required-rate band for chases; 5 = first innings. */
const rrBand = (rrr: number | null) => (rrr === null ? 5 : rrr < 7.5 ? 0 : rrr < 9.5 ? 1 : rrr < 11.5 ? 2 : rrr < 14 ? 3 : 4);
export const phaseOf = (over: number) => (over <= 5 ? 0 : over <= 14 ? 1 : 2); // PP / middle / death

/** In a shortened innings, map an over onto its 20-over equivalent so the last overs are the death. */
export const effectiveOver = (over: number, totalBalls = 120) => {
  const shift = Math.max(0, 20 - Math.ceil(totalBalls / 6));
  return Math.min(19, over < 6 ? over : over + shift);
};
export const PHASE_LABEL = ["Powerplay", "Middle overs", "Death overs"];

const NE = ERAS.length, NOB = 5, NWB = 3, NRB = 6;
const cellIndex = (e: number, ob: number, wb: number, rb: number) => ((e * NOB + ob) * NWB + wb) * NRB + rb;

function outcomeOf(flags: number, totalRuns: number): number {
  if (!(flags & F_FACED)) return O.WD;
  if (!(flags & F_LEGAL)) return O.NB;
  if (flags & F_WICKET) return O.W;
  if (totalRuns <= 0) return O.DOT;
  if (totalRuns >= 6) return O.SIX;
  if (totalRuns === 5) return O.FOUR;
  return totalRuns; // 1..4 map onto O.ONE..O.FOUR
}

interface Tables {
  probs: Float64Array[]; // per cell, 9 probabilities
  /** Boundary rate of each season relative to its era (2026 out-hit 2023 within the same era). */
  seasonBoundary: Map<number, number>;
}

let tables: Tables | null = null;

export function getOutcomeTables(): Tables {
  if (tables) return tables;
  const c = getBallColumns();
  const counts = Array.from({ length: NE * NOB * NWB * NRB }, () => new Float64Array(NO));
  const seasonB = new Map<number, [number, number]>();
  const eraB = Array.from({ length: NE }, () => [0, 0]);
  for (let i = 0; i < c.n; i++) {
    const e = eraOf(c.season[i]);
    if (e < 0) continue;
    if (c.flags[i] & F_LEGAL) {
      const bnd = c.totalRuns[i] >= 4 && !(c.flags[i] & F_WICKET) ? 1 : 0;
      const sb = seasonB.get(c.season[i]) ?? [0, 0];
      sb[0] += bnd; sb[1]++;
      seasonB.set(c.season[i], sb);
      eraB[e][0] += bnd; eraB[e][1]++;
    }
    const rn = c.runsNeeded[i], bl = c.ballsLeft[i];
    const rrr = c.inningsNumber[i] === 2 && bl > 0 && rn > 0 ? (rn / bl) * 6 : null;
    counts[cellIndex(e, overBand(c.over[i]), wicketBand(c.wicketsBefore[i]), c.inningsNumber[i] === 2 ? rrBand(rrr) : 5)][outcomeOf(c.flags[i], c.totalRuns[i])]++;
  }
  // Shrink each cell toward its parents so thin cells borrow strength.
  const sum = (a: Float64Array) => a.reduce((s, x) => s + x, 0);
  const add = (a: Float64Array, b: Float64Array) => { for (let k = 0; k < NO; k++) a[k] += b[k]; };
  const norm = (a: Float64Array) => { const t = sum(a) || 1; return a.map((x) => x / t); };
  const probs: Float64Array[] = new Array(counts.length);
  for (let e = 0; e < NE; e++) for (let ob = 0; ob < NOB; ob++) {
    const band = new Float64Array(NO);
    for (let wb = 0; wb < NWB; wb++) for (let rb = 0; rb < NRB; rb++) add(band, counts[cellIndex(e, ob, wb, rb)]);
    const pBand = norm(band);
    for (let wb = 0; wb < NWB; wb++) {
      const wk = new Float64Array(NO);
      for (let rb = 0; rb < NRB; rb++) add(wk, counts[cellIndex(e, ob, wb, rb)]);
      const nWk = sum(wk);
      const pWk = wk.map((x, k) => (x + 400 * pBand[k]) / (nWk + 400));
      for (let rb = 0; rb < NRB; rb++) {
        const cell = counts[cellIndex(e, ob, wb, rb)];
        const n = sum(cell);
        probs[cellIndex(e, ob, wb, rb)] = cell.map((x, k) => (x + 300 * pWk[k]) / (n + 300));
      }
    }
  }
  const seasonBoundary = new Map<number, number>();
  for (const [s, [b, n]] of seasonB) {
    const [eb, en] = eraB[eraOf(s)];
    seasonBoundary.set(s, en && eb ? (b / n) / (eb / en) : 1);
  }
  tables = { probs, seasonBoundary };
  return tables;
}

export function baseProbs(season: number, over: number, wicketsDown: number, rrr: number | null, chase: boolean): Float64Array {
  const e = Math.max(0, eraOf(season));
  return getOutcomeTables().probs[cellIndex(e, overBand(over), wicketBand(wicketsDown), chase ? rrBand(rrr) : 5)];
}

/** Boundary multiplier for a season within its era (1 for unknown seasons). */
export const seasonBoundaryFactor = (season: number) => getOutcomeTables().seasonBoundary.get(season) ?? 1;

/* ─── Player multipliers ─────────────────────────────────────────────────── */

// Batter: [phase 0..2][type 0=pace 1=spin] × {balls, runs, outs, bnd, dots}
// Bowler: [phase 0..2] × {balls, conceded, wkts, bnd, dots, wides, noballs, deliveries}
const BF = 5, WF = 8;
const bIdx = (ph: number, ty: number, f: number) => (ph * 2 + ty) * BF + f;
const wIdx = (ph: number, f: number) => ph * WF + f;

interface Profiles {
  asOf: number;
  bat: Map<number, Float64Array>;
  bowl: Map<number, Float64Array>;
  leagueBat: Float64Array;
  leagueBowl: Float64Array;
  /** Pooled bowling counts per bowling subtype key ("pace" / "spin" / subtype label). */
  pooledBowl: Map<string, Float64Array>;
  tailBat: Float64Array;
}

const profileCache = new Map<number, Profiles>();
const RECENCY = 0.6;

export function bowlerType(pid: number): 0 | 1 {
  return getPlayerMeta().get(pid)?.bowlingType === "spin" ? 1 : 0;
}

/** Recency-weighted counts using seasons ≤ asOf only. */
export function getProfiles(asOfSeason?: number): Profiles {
  const asOf = asOfSeason ?? Number(getSeasons().at(-1) ?? 2026);
  const hit = profileCache.get(asOf);
  if (hit) return hit;
  const c = getBallColumns();
  const meta = getPlayerMeta();
  const bat = new Map<number, Float64Array>();
  const bowl = new Map<number, Float64Array>();
  const leagueBat = new Float64Array(3 * 2 * BF);
  const leagueBowl = new Float64Array(3 * WF);
  const typeCache = new Map<number, 0 | 1>();
  const typeOf = (pid: number) => { let t = typeCache.get(pid); if (t === undefined) { t = bowlerType(pid); typeCache.set(pid, t); } return t; };
  for (let i = 0; i < c.n; i++) {
    const s = c.season[i];
    if (s > asOf) continue;
    const w = Math.pow(RECENCY, asOf - s);
    const ph = phaseOf(c.over[i]);
    const f = c.flags[i];
    const runs = c.batterRuns[i];
    const bnd = runs === 4 || runs === 6 ? 1 : 0;
    if (f & F_FACED) {
      const ty = typeOf(c.bowler[i]);
      let a = bat.get(c.batter[i]);
      if (!a) { a = new Float64Array(3 * 2 * BF); bat.set(c.batter[i], a); }
      const out = c.outPlayer[i] === c.batter[i] ? 1 : 0;
      for (const arr of [a, leagueBat]) {
        arr[bIdx(ph, ty, 0)] += w;
        arr[bIdx(ph, ty, 1)] += w * runs;
        arr[bIdx(ph, ty, 2)] += w * out;
        arr[bIdx(ph, ty, 3)] += w * bnd;
        arr[bIdx(ph, ty, 4)] += w * (runs === 0 ? 1 : 0);
      }
    }
    let b = bowl.get(c.bowler[i]);
    if (!b) { b = new Float64Array(3 * WF); bowl.set(c.bowler[i], b); }
    const legal = f & F_LEGAL ? 1 : 0;
    for (const arr of [b, leagueBowl]) {
      arr[wIdx(ph, 0)] += w * legal;
      arr[wIdx(ph, 1)] += w * c.conceded[i];
      arr[wIdx(ph, 2)] += w * (f & F_BOWLER_WICKET ? 1 : 0);
      arr[wIdx(ph, 3)] += w * bnd;
      arr[wIdx(ph, 4)] += w * (legal && c.conceded[i] === 0 ? 1 : 0);
      arr[wIdx(ph, 5)] += w * (f & F_FACED ? 0 : 1);
      arr[wIdx(ph, 6)] += w * (f & F_FACED && !legal ? 1 : 0);
      arr[wIdx(ph, 7)] += w;
    }
  }
  // Pooled bowling profiles by type and subtype (for "what if only leg-spin bowled" style questions).
  const pooledBowl = new Map<string, Float64Array>();
  for (const [pid, arr] of bowl) {
    const m = meta.get(pid);
    if (!m || (m.bowlingType !== "pace" && m.bowlingType !== "spin")) continue;
    for (const key of [m.bowlingType, subtypeKey(pid)]) {
      if (!key) continue;
      const p = pooledBowl.get(key) ?? new Float64Array(3 * WF);
      for (let k = 0; k < p.length; k++) p[k] += arr[k];
      pooledBowl.set(key, p);
    }
  }
  // Tail-ender batting: pooled from players who face < 6 balls a match over their career.
  const tailBat = new Float64Array(3 * 2 * BF);
  for (const [pid, arr] of bat) {
    const ls = getSeasonLines().get(pid) ?? [];
    const m = ls.reduce((s, l) => s + l.matches, 0);
    const bf = ls.reduce((s, l) => s + l.batBalls, 0);
    if (m >= 5 && bf / m < 6) for (let k = 0; k < tailBat.length; k++) tailBat[k] += arr[k];
  }
  const p: Profiles = { asOf, bat, bowl, leagueBat, leagueBowl, pooledBowl, tailBat };
  profileCache.set(asOf, p);
  return p;
}

function subtypeKey(pid: number): string | null {
  const m = getPlayerMeta().get(pid);
  return m ? bowlingSubtype(m) : null;
}

export interface BatMult { out: number; bnd: number; dot: number }
export interface BowlMult { wkt: number; bnd: number; dot: number; extras: number }

const SHRINK = 60;
const ratio = (num: number, den: number, lgNum: number, lgDen: number) => {
  const lg = lgDen > 0 ? lgNum / lgDen : 0;
  if (lg <= 0) return 1;
  return ((num + SHRINK * lg) / (den + SHRINK)) / lg;
};

/**
 * Batter multipliers against a bowler type in a phase. `null` is a league-average
 * batter; a player with no batting record bats like the pooled tail.
 */
export function batterMult(p: Profiles, pid: number | null, phase: number, type: 0 | 1): BatMult {
  if (pid === null) return { out: 1, bnd: 1, dot: 1 };
  const a = p.bat.get(pid) ?? p.tailBat;
  const L = p.leagueBat;
  const balls = a[bIdx(phase, type, 0)], lb = L[bIdx(phase, type, 0)];
  return {
    out: ratio(a[bIdx(phase, type, 2)], balls, L[bIdx(phase, type, 2)], lb),
    bnd: ratio(a[bIdx(phase, type, 3)], balls, L[bIdx(phase, type, 3)], lb),
    dot: ratio(a[bIdx(phase, type, 4)], balls, L[bIdx(phase, type, 4)], lb),
  };
}

/** Bowler multipliers in a phase. Negative ids are pooled profiles (see syntheticBowler). */
export function bowlerMult(p: Profiles, pid: number, phase: number): BowlMult {
  const a = pid < 0 ? p.pooledBowl.get(SYNTHETIC[-pid - 1] ?? "") : p.bowl.get(pid);
  if (!a) return { wkt: 1, bnd: 1, dot: 1, extras: 1 };
  const L = p.leagueBowl;
  const balls = a[wIdx(phase, 0)], lb = L[wIdx(phase, 0)];
  const del = a[wIdx(phase, 7)], ld = L[wIdx(phase, 7)];
  return {
    wkt: ratio(a[wIdx(phase, 2)], balls, L[wIdx(phase, 2)], lb),
    bnd: ratio(a[wIdx(phase, 3)], balls, L[wIdx(phase, 3)], lb),
    dot: ratio(a[wIdx(phase, 4)], balls, L[wIdx(phase, 4)], lb),
    extras: ratio(a[wIdx(phase, 5)] + a[wIdx(phase, 6)], del, L[wIdx(phase, 5)] + L[wIdx(phase, 6)], ld),
  };
}

/** Phase line for display: economy, balls per wicket, balls. */
export function bowlerPhaseLine(p: Profiles, pid: number, phase: number): { balls: number; economy: number | null; ballsPerWicket: number | null } {
  const a = pid < 0 ? p.pooledBowl.get(SYNTHETIC[-pid - 1] ?? "") : p.bowl.get(pid);
  if (!a) return { balls: 0, economy: null, ballsPerWicket: null };
  const balls = a[wIdx(phase, 0)];
  return {
    balls: Math.round(balls),
    economy: balls > 0 ? (a[wIdx(phase, 1)] / balls) * 6 : null,
    ballsPerWicket: a[wIdx(phase, 2)] > 0 ? balls / a[wIdx(phase, 2)] : null,
  };
}

export function batterPhaseLine(p: Profiles, pid: number, phase: number, type?: 0 | 1): { balls: number; strikeRate: number | null; ballsPerOut: number | null } {
  const a = p.bat.get(pid);
  if (!a) return { balls: 0, strikeRate: null, ballsPerOut: null };
  const types = type === undefined ? [0, 1] : [type];
  let balls = 0, runs = 0, outs = 0;
  for (const t of types) { balls += a[bIdx(phase, t, 0)]; runs += a[bIdx(phase, t, 1)]; outs += a[bIdx(phase, t, 2)]; }
  return { balls: Math.round(balls), strikeRate: balls > 0 ? (runs / balls) * 100 : null, ballsPerOut: outs > 0 ? balls / outs : null };
}

// Synthetic bowlers: negative ids map to pooled profiles.
export const SYNTHETIC = ["pace", "spin", "Right-arm pace", "Left-arm pace", "Off-spin", "Leg-spin", "Left-arm orthodox", "Left-arm wrist spin"];
export const syntheticBowler = (key: string) => -(SYNTHETIC.indexOf(key) + 1);
export const syntheticType = (pid: number): 0 | 1 => (/spin|Off|Leg|orthodox/i.test(SYNTHETIC[-pid - 1] ?? "") ? 1 : 0);

/* ─── Venue factor ───────────────────────────────────────────────────────── */

const venueCache = new Map<string, number>();
/** Boundary-rate multiplier at a set of venue ids over the last 5 seasons (shrunk to 1). */
export function venueBoundaryFactor(venueIds: number[], asOf: number): number {
  const key = `${venueIds.join(",")}:${asOf}`;
  const hit = venueCache.get(key);
  if (hit !== undefined) return hit;
  const c = getBallColumns();
  const set = new Set(venueIds);
  let vb = 0, vn = 0, lb = 0, ln = 0;
  for (let i = 0; i < c.n; i++) {
    const s = c.season[i];
    if (s > asOf || s < asOf - 4 || !(c.flags[i] & F_FACED)) continue;
    const b = c.batterRuns[i] === 4 || c.batterRuns[i] === 6 ? 1 : 0;
    lb += b; ln++;
    if (set.has(c.venue[i])) { vb += b; vn++; }
  }
  const lg = ln ? lb / ln : 0.15;
  const f = lg > 0 ? ((vb + 3000 * lg) / (vn + 3000)) / lg : 1;
  venueCache.set(key, f);
  return f;
}

/* ─── Ball probabilities with matchups ──────────────────────────────────── */

export interface BallContext {
  season: number;
  over: number;
  wicketsDown: number;
  rrr: number | null;
  chase: boolean;
  venueFactor: number;
}

export function ballProbs(p: Profiles, ctx: BallContext, batter: number | null, bowler: number): Float64Array {
  const base = baseProbs(ctx.season, ctx.over, ctx.wicketsDown, ctx.rrr, ctx.chase);
  const ph = phaseOf(ctx.over);
  const type = bowler < 0 ? syntheticType(bowler) : bowlerType(bowler);
  const bm = batterMult(p, batter, ph, type);
  const wm = bowlerMult(p, bowler, ph);
  const q = new Float64Array(base);
  q[O.W] = Math.min(0.25, base[O.W] * bm.out * wm.wkt);
  const bf = bm.bnd * wm.bnd * ctx.venueFactor * seasonBoundaryFactor(ctx.season);
  q[O.FOUR] = base[O.FOUR] * bf;
  q[O.SIX] = base[O.SIX] * bf;
  q[O.DOT] = base[O.DOT] * bm.dot * wm.dot;
  q[O.WD] = base[O.WD] * wm.extras;
  q[O.NB] = base[O.NB] * wm.extras;
  // Singles/twos/threes absorb whatever probability is left.
  let fixed = q[O.W] + q[O.FOUR] + q[O.SIX] + q[O.DOT] + q[O.WD] + q[O.NB];
  if (fixed > 0.92) {
    const s = 0.92 / fixed;
    for (const k of [O.W, O.FOUR, O.SIX, O.DOT, O.WD, O.NB]) q[k] *= s;
    fixed = 0.92;
  }
  const rest = base[O.ONE] + base[O.TWO] + base[O.THREE];
  const left = 1 - fixed;
  for (const k of [O.ONE, O.TWO, O.THREE]) q[k] = rest > 0 ? (base[k] / rest) * left : left / 3;
  return q;
}

/* ─── Win probability (exact, league average) ───────────────────────────── */

const MAX_RUNS = 400;
const dpCache = new Map<string, Float64Array>();

/**
 * P(chasing side wins) for every (balls left, runs needed, wickets lost)
 * state of a chase of `totalBalls` balls, under the league outcome tables
 * of that era. Wides and no-balls add a run and the ball is re-bowled.
 */
function chaseTable(season: number, totalBalls = 120): Float64Array {
  const e = Math.max(0, eraOf(season));
  const key = `${e}:${totalBalls}`;
  const hit = dpCache.get(key);
  if (hit) return hit;
  const R = MAX_RUNS + 1;
  const W = 11;
  const T = new Float64Array((totalBalls + 1) * R * W);
  const at = (b: number, r: number, w: number) => (b * R + Math.min(r, MAX_RUNS)) * W + w;
  const get = (b: number, r: number, w: number) => {
    if (r <= 0) return 1;
    if (w >= 10) return r === 1 ? 0.5 : 0; // all out level = tie
    if (b <= 0) return r === 1 ? 0.5 : 0; // scores level after last ball = tie → super over
    return T[at(b, r, w)];
  };
  const eraSeason = [2010, 2015, 2020, 2025][e];
  for (let b = 1; b <= totalBalls; b++) {
    const over = Math.min(19, Math.floor((totalBalls - b) / 6) + (120 - totalBalls) / 6);
    for (let w = 9; w >= 0; w--) {
      for (let r = 1; r <= MAX_RUNS; r++) {
        const rrr = (r / b) * 6;
        const pr = baseProbs(eraSeason, Math.floor(over), w, rrr, true);
        // Extras re-bowl the ball: v = pX·v(b, r−1) + Σ legal outcomes.
        const legal =
          pr[O.DOT] * get(b - 1, r, w) +
          pr[O.ONE] * get(b - 1, r - 1, w) +
          pr[O.TWO] * get(b - 1, r - 2, w) +
          pr[O.THREE] * get(b - 1, r - 3, w) +
          pr[O.FOUR] * get(b - 1, r - 4, w) +
          pr[O.SIX] * get(b - 1, r - 6, w) +
          pr[O.W] * get(b - 1, r, w + 1);
        T[at(b, r, w)] = legal + (pr[O.WD] + pr[O.NB]) * get(b, r - 1, w);
      }
    }
  }
  dpCache.set(key, T);
  return T;
}

function rawChaseWinProb(season: number, ballsLeft: number, runsNeeded: number, wicketsLost: number, totalBalls = 120): number {
  if (runsNeeded <= 0) return 1;
  if (wicketsLost >= 10 || ballsLeft <= 0) return runsNeeded === 1 ? 0.5 : 0;
  const tb = Math.max(totalBalls, ballsLeft);
  const T = chaseTable(season, tb);
  return T[(Math.min(ballsLeft, tb) * (MAX_RUNS + 1) + Math.min(runsNeeded, MAX_RUNS)) * 11 + wicketsLost];
}

/*
 * The pure state model is too pessimistic for chases that are behind (real
 * batting is streakier than independent balls): a raw 15% wins ~31% of the
 * time. A two-parameter logistic recalibration (Platt scaling), fitted on
 * the start of every over of every 20-over chase, fixes that.
 */
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
let platt: { a: number; b: number; n: number } | null = null;

interface ChaseState { season: number; ballsLeft: number; runsNeeded: number; wickets: number; won: boolean }
let chaseStates: ChaseState[] | null = null;
function historicalChaseStates(): ChaseState[] {
  if (chaseStates) return chaseStates;
  const c = getBallColumns();
  const out: ChaseState[] = [];
  for (let i = 0; i < c.n; i++) {
    if (c.inningsNumber[i] !== 2 || c.legalBefore[i] % 6 !== 0) continue;
    if (i > 0 && c.innings[i - 1] === c.innings[i] && c.legalBefore[i - 1] === c.legalBefore[i]) continue; // first ball of the over only
    const m = c.matches[c.match[i]];
    if (!m?.target || m.target.balls !== 120 || m.winner === null) continue;
    out.push({ season: c.season[i], ballsLeft: c.ballsLeft[i], runsNeeded: c.runsNeeded[i], wickets: c.wicketsBefore[i], won: m.winner === c.battingTeam[i] });
  }
  chaseStates = out;
  return out;
}

function getPlatt(): { a: number; b: number; n: number } {
  if (platt) return platt;
  const xs: number[] = [], ys: number[] = [];
  for (const s of historicalChaseStates()) {
    const raw = rawChaseWinProb(s.season, s.ballsLeft, s.runsNeeded, s.wickets);
    if (raw <= 0 || raw >= 1) continue;
    xs.push(logit(Math.min(0.995, Math.max(0.005, raw))));
    ys.push(s.won ? 1 : 0);
  }
  // Newton–Raphson for logistic regression y ~ σ(a + b·x).
  let a = 0, b = 1;
  for (let it = 0; it < 30; it++) {
    let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (let i = 0; i < xs.length; i++) {
      const p = sigmoid(a + b * xs[i]);
      const w = p * (1 - p);
      ga += ys[i] - p; gb += (ys[i] - p) * xs[i];
      haa += w; hab += w * xs[i]; hbb += w * xs[i] * xs[i];
    }
    const det = haa * hbb - hab * hab;
    if (Math.abs(det) < 1e-9) break;
    const da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det;
    a += da; b += db;
    if (Math.abs(da) + Math.abs(db) < 1e-7) break;
  }
  platt = { a, b, n: xs.length };
  return platt;
}

/** Calibrated probability that the chasing side wins from this state (league-average sides). */
export function chaseWinProb(season: number, ballsLeft: number, runsNeeded: number, wicketsLost: number, totalBalls = 120): number {
  const raw = rawChaseWinProb(season, ballsLeft, runsNeeded, wicketsLost, totalBalls);
  if (raw <= 0 || raw >= 1) return raw;
  const { a, b } = getPlatt();
  return sigmoid(a + b * logit(Math.min(0.995, Math.max(0.005, raw))));
}

/** Predicted vs actual chase win rate by decile, for showing the model's calibration. */
export function winProbCalibration(): { states: number; bins: { predicted: number; actual: number; n: number }[] } {
  const bins = Array.from({ length: 10 }, () => ({ pred: 0, wins: 0, n: 0 }));
  const states = historicalChaseStates();
  for (const s of states) {
    const wp = chaseWinProb(s.season, s.ballsLeft, s.runsNeeded, s.wickets);
    const k = Math.min(9, Math.floor(wp * 10));
    bins[k].n++; bins[k].pred += wp; bins[k].wins += s.won ? 1 : 0;
  }
  return {
    states: states.length,
    bins: bins.filter((b) => b.n).map((b) => ({ predicted: Math.round((b.pred / b.n) * 1000) / 10, actual: Math.round((b.wins / b.n) * 1000) / 10, n: b.n })),
  };
}

/* ─── Monte Carlo ────────────────────────────────────────────────────────── */

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface InningsState {
  season: number;
  chase: boolean;
  target: number | null; // runs to win (chase only)
  totalBalls: number;
  legalBowled: number;
  runs: number;
  wickets: number;
  striker: number;
  nonStriker: number;
  /** Remaining batters, in order. */
  queue: number[];
  /** Overs already bowled by each bowler this innings. */
  oversBowled: Map<number, number>;
  lastBowler: number | null;
  venueFactor: number;
}

export interface PolicyView {
  over: number; // 0-indexed over about to start
  state: InningsState;
  available: number[]; // bowlers allowed to bowl this over
  quota: number;
  bowlers: number[]; // the whole attack
}

export type BowlingPolicy = (v: PolicyView) => number;

export interface InningsResult {
  runs: number;
  wickets: number;
  legal: number;
  won: boolean | null; // chase only
  overRuns: number[];
  overWickets: number[];
  overBowler: number[];
}

const pick = (q: Float64Array, u: number) => {
  let acc = 0;
  for (let k = 0; k < NO; k++) { acc += q[k]; if (u < acc) return k; }
  return O.DOT;
};

/**
 * Simulate the rest of an innings. `forcedOvers` pins the bowler for given
 * over numbers (e.g. a what-if swap or a user's decision); everything else
 * is chosen by `policy` within the 4-over quota and no-consecutive-overs rule.
 */
export function simulateInnings(
  p: Profiles,
  start: InningsState,
  bowlers: number[],
  policy: BowlingPolicy,
  random: () => number,
  forcedOvers: Map<number, number> = new Map(),
  /** Share one cache across many simulations of the same matchup set. */
  probCache: Map<string, Float64Array> = new Map(),
): InningsResult {
  const s: InningsState = { ...start, queue: [...start.queue], oversBowled: new Map(start.oversBowled) };
  const totalOvers = Math.ceil(s.totalBalls / 6);
  const quota = Math.max(1, Math.ceil(totalOvers / 5));
  const res: InningsResult = { runs: s.runs, wickets: s.wickets, legal: s.legalBowled, won: null, overRuns: [], overWickets: [], overBowler: [] };
  const done = () => s.wickets >= 10 || s.legalBowled >= s.totalBalls || (s.chase && s.target !== null && s.runs >= s.target);

  // In a shortened innings the last overs are still the death: align the
  // final over with over 20 so phase tables and player profiles match.
  const effOver = (o: number) => effectiveOver(o, s.totalBalls);

  while (!done()) {
    const over = Math.floor(s.legalBowled / 6);
    let bowler = forcedOvers.get(over);
    if (bowler === undefined) {
      let avail = bowlers.filter((b) => (s.oversBowled.get(b) ?? 0) < quota && b !== s.lastBowler);
      if (!avail.length) avail = bowlers.filter((b) => b !== s.lastBowler);
      if (!avail.length) avail = bowlers;
      bowler = policy({ over, state: s, available: avail, quota, bowlers });
    }
    let overRuns = 0, overWkts = 0;
    let legalInOver = s.legalBowled % 6;
    while (legalInOver < 6 && !done()) {
      const rrr = s.chase && s.target !== null ? ((s.target - s.runs) / Math.max(1, s.totalBalls - s.legalBowled)) * 6 : null;
      const eo = effOver(over);
      const key = `${s.striker}:${bowler}:${eo}:${Math.min(s.wickets, 9)}:${rrr === null ? 5 : rrBand(rrr)}`;
      let q = probCache.get(key);
      if (!q) {
        q = ballProbs(p, { season: s.season, over: eo, wicketsDown: s.wickets, rrr, chase: s.chase, venueFactor: s.venueFactor }, s.striker, bowler);
        probCache.set(key, q);
      }
      const o = pick(q, random());
      const r = OUTCOME_RUNS[o];
      s.runs += r;
      overRuns += r;
      if (o === O.WD || o === O.NB) continue; // re-bowled
      s.legalBowled++;
      legalInOver++;
      if (o === O.W) {
        s.wickets++;
        overWkts++;
        const next = s.queue.shift();
        if (next === undefined) { s.wickets = 10; break; }
        s.striker = next;
      } else if (r % 2 === 1) {
        [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
      }
    }
    if (legalInOver >= 6) [s.striker, s.nonStriker] = [s.nonStriker, s.striker];
    s.oversBowled.set(bowler, (s.oversBowled.get(bowler) ?? 0) + 1);
    s.lastBowler = bowler;
    res.overRuns[over] = (res.overRuns[over] ?? 0) + overRuns;
    res.overWickets[over] = (res.overWickets[over] ?? 0) + overWkts;
    res.overBowler[over] = bowler;
  }
  res.runs = s.runs;
  res.wickets = s.wickets;
  res.legal = s.legalBowled;
  if (s.chase && s.target !== null) res.won = s.runs >= s.target;
  return res;
}

/* ─── Bowling policies ───────────────────────────────────────────────────── */

/** Expected cost of one over (runs minus wicket value) for a bowler in a phase vs an average batter. */
export function overCost(p: Profiles, season: number, over: number, bowler: number, wicketsDown = 3, batter: number | null = null): number {
  const ctx: BallContext = { season, over, wicketsDown, rrr: null, chase: false, venueFactor: 1 };
  const q = ballProbs(p, ctx, batter, bowler);
  let runs = 0;
  for (let k = 0; k < NO; k++) runs += q[k] * OUTCOME_RUNS[k];
  const legalShare = 1 - q[O.WD] - q[O.NB];
  const perLegal = runs / Math.max(0.5, legalShare);
  const wkt = q[O.W] / Math.max(0.5, legalShare);
  return 6 * (perLegal - wkt * 6.5);
}

/**
 * Plan the remaining overs: assign each over to the bowler whose
 * phase-specific cost is lowest, highest-regret overs first, respecting
 * quotas and no consecutive overs. Returns over → bowler.
 */
export function planOvers(
  p: Profiles, season: number, fromOver: number, totalOvers: number, bowlers: number[], used: Map<number, number>,
  lastBowler: number | null, quota = 4,
  /** Optional cost of a bowler bowling an over (default: vs a league-average batter). */
  costFn?: (bowler: number, over: number) => number,
): Map<number, number> {
  const overs = Array.from({ length: totalOvers - fromOver }, (_, i) => fromOver + i);
  const left = new Map(bowlers.map((b) => [b, Math.max(0, quota - (used.get(b) ?? 0))]));
  const cost = new Map<string, number>();
  const c = (b: number, o: number) => {
    const k = `${b}:${o}`;
    let v = cost.get(k);
    if (v === undefined) { v = costFn ? costFn(b, Math.min(o, 19)) : overCost(p, season, Math.min(o, 19), b); cost.set(k, v); }
    return v;
  };
  const plan = new Map<number, number>();
  const ok = (b: number, o: number) => (left.get(b) ?? 0) > 0 && plan.get(o - 1) !== b && plan.get(o + 1) !== b && !(o === fromOver && b === lastBowler);
  const remaining = new Set(overs);
  while (remaining.size) {
    let bestO = -1, bestB = -1, bestRegret = -Infinity;
    for (const o of remaining) {
      const cands = bowlers.filter((b) => ok(b, o)).sort((x, y) => c(x, o) - c(y, o));
      if (!cands.length) continue;
      const regret = cands.length > 1 ? c(cands[1], o) - c(cands[0], o) : 99;
      if (regret > bestRegret) { bestRegret = regret; bestO = o; bestB = cands[0]; }
    }
    if (bestO < 0) {
      // Constraints can't all be met (tiny attack): fill the rest greedily.
      for (const o of remaining) plan.set(o, bowlers.find((b) => plan.get(o - 1) !== b) ?? bowlers[0]);
      break;
    }
    plan.set(bestO, bestB);
    left.set(bestB, (left.get(bestB) ?? 0) - 1);
    remaining.delete(bestO);
  }
  return plan;
}

/** Memoised overCost for one policy instance (the same few dozen values are asked for thousands of times). */
function costMemo(p: Profiles, season: number) {
  const memo = new Map<string, number>();
  return (over: number, bowler: number, wickets = 3, batter: number | null = null) => {
    const k = `${over}:${bowler}:${wickets}:${batter}`;
    let v = memo.get(k);
    if (v === undefined) { v = overCost(p, season, Math.min(over, 19), bowler, wickets, batter); memo.set(k, v); }
    return v;
  };
}

/**
 * "Data-optimal": re-plan the remaining overs at the start of each over.
 * The plan depends only on quotas used and the last bowler, so it is cached
 * by that signature — after the first simulation almost every lookup hits.
 */
export function optimalPolicy(p: Profiles, season: number): BowlingPolicy {
  const plans = new Map<string, number>();
  return ({ over, state, available, quota, bowlers }) => {
    const sig = `${over}|${state.lastBowler}|${bowlers.map((b) => state.oversBowled.get(b) ?? 0).join(",")}`;
    let b = plans.get(sig);
    if (b === undefined) {
      b = planOvers(p, season, over, Math.ceil(state.totalBalls / 6), bowlers, state.oversBowled, state.lastBowler, quota).get(over) ?? available[0];
      plans.set(sig, b);
    }
    return available.includes(b) ? b : available[0];
  };
}

/** "Save the best for last": the two best death bowlers keep their overs for the death. */
export function saveDeathPolicy(p: Profiles, season: number): BowlingPolicy {
  const cost = costMemo(p, season);
  let stars: Set<number> | null = null;
  return ({ over, state, available, quota, bowlers }) => {
    const totalOvers = Math.ceil(state.totalBalls / 6);
    const deathStart = Math.max(0, totalOvers - 4);
    if (!stars) stars = new Set([...bowlers].sort((a, b) => cost(18, a) - cost(18, b)).slice(0, 2));
    const reserve = Math.ceil((totalOvers - deathStart) / 2);
    const pool = over >= deathStart ? available : available.filter((b) => !stars!.has(b) || (state.oversBowled.get(b) ?? 0) < quota - reserve);
    const choices = pool.length ? pool : available;
    return choices.reduce((best, b) => (cost(over, b) < cost(over, best) ? b : best), choices[0]);
  };
}

/** "Matchup": each over, the bowler with the lowest cost against the batter on strike. */
export function matchupPolicy(p: Profiles, season: number): BowlingPolicy {
  const cost = costMemo(p, season);
  return ({ over, state, available }) => {
    const w = Math.min(9, state.wickets);
    return available.reduce((best, b) => (cost(over, b, w, state.striker) < cost(over, best, w, state.striker) ? b : best), available[0]);
  };
}

/**
 * Replay the bowlers actually used where the rules still allow it (a what-if
 * can use up someone's quota early); otherwise fall back to the optimal plan.
 */
export function scriptedPolicy(p: Profiles, season: number, script: Map<number, number>): BowlingPolicy {
  const fallback = optimalPolicy(p, season);
  return (v) => {
    const b = script.get(v.over);
    return b !== undefined && v.available.includes(b) ? b : fallback(v);
  };
}

/** Cost of a bowler's over against a specific set of batters (mean over them). */
export function lineupCost(p: Profiles, season: number, batters: number[]) {
  const memo = new Map<string, number>();
  return (bowler: number, over: number) => {
    const k = `${bowler}:${over}`;
    let v = memo.get(k);
    if (v === undefined) {
      v = batters.length ? batters.reduce((s, b) => s + overCost(p, season, over, bowler, 3, b), 0) / batters.length : overCost(p, season, over, bowler);
      memo.set(k, v);
    }
    return v;
  };
}

/** Expected runs conceded and wicket chance in one over (league context, optional batter). */
export function overExpectation(p: Profiles, season: number, over: number, bowler: number, batter: number | null = null, venueFactor = 1): { runs: number; wicketProb: number } {
  const q = ballProbs(p, { season, over: Math.min(over, 19), wicketsDown: 3, rrr: null, chase: false, venueFactor }, batter, bowler);
  let runs = 0;
  for (let k = 0; k < NO; k++) runs += q[k] * OUTCOME_RUNS[k];
  const legal = 1 - q[O.WD] - q[O.NB];
  const perLegal = runs / Math.max(0.5, legal);
  const w = q[O.W] / Math.max(0.5, legal);
  return { runs: perLegal * 6, wicketProb: 1 - Math.pow(1 - w, 6) };
}

/* ─── Squads, batting order & histograms ────────────────────────────────── */

export interface TeamSeasonSquad {
  battingOrder: { playerId: number; avgPosition: number; innings: number }[];
  bowlers: { playerId: number; overs: number; matches: number }[];
}

const squadCache = new Map<string, TeamSeasonSquad>();

/** Batting order (by average position of entry) and bowling attack of a team-season. */
export function teamSeasonSquad(teamIds: number[], season: number): TeamSeasonSquad {
  const key = `${[...teamIds].sort().join(",")}:${season}`;
  const hit = squadCache.get(key);
  if (hit) return hit;
  const c = getBallColumns();
  const ids = new Set(teamIds);
  const pos = new Map<number, { sum: number; n: number }>();
  const bowl = new Map<number, { balls: number; matches: Set<number> }>();
  let curInn = -1;
  let seen: number[] = [];
  for (let i = 0; i < c.n; i++) {
    if (c.season[i] !== season) continue;
    if (ids.has(c.battingTeam[i])) {
      if (c.innings[i] !== curInn) {
        curInn = c.innings[i];
        seen = [];
      }
      for (const pl of [c.batter[i], c.nonStriker[i]]) {
        if (!seen.includes(pl)) {
          seen.push(pl);
          const e = pos.get(pl) ?? { sum: 0, n: 0 };
          e.sum += seen.length;
          e.n++;
          pos.set(pl, e);
        }
      }
    }
    if (ids.has(c.bowlingTeam[i])) {
      const e = bowl.get(c.bowler[i]) ?? { balls: 0, matches: new Set<number>() };
      if (c.flags[i] & F_LEGAL) e.balls++;
      e.matches.add(c.match[i]);
      bowl.set(c.bowler[i], e);
    }
  }
  const squad: TeamSeasonSquad = {
    battingOrder: [...pos.entries()].map(([playerId, e]) => ({ playerId, avgPosition: e.sum / e.n, innings: e.n }))
      .sort((a, b) => a.avgPosition - b.avgPosition),
    bowlers: [...bowl.entries()].map(([playerId, e]) => ({ playerId, overs: Math.round((e.balls / 6) * 10) / 10, matches: e.matches.size }))
      .sort((a, b) => b.overs - a.overs),
  };
  squadCache.set(key, squad);
  return squad;
}

/** A likely XI's batting order: regulars first (by innings played), then ordered by position. */
export function likelyBattingOrder(squad: TeamSeasonSquad, size = 11): number[] {
  const regulars = [...squad.battingOrder].sort((a, b) => b.innings - a.innings).slice(0, size);
  return regulars.sort((a, b) => a.avgPosition - b.avgPosition).map((r) => r.playerId);
}

/** The attack: bowlers with the most overs, enough to cover an innings. */
export function likelyAttack(squad: TeamSeasonSquad, size = 6): number[] {
  return squad.bowlers.filter((b) => b.overs >= 2).slice(0, size).map((b) => b.playerId);
}

export function histogram(values: number[], bin: number): { from: number; to: number; count: number }[] {
  if (!values.length) return [];
  const lo = Math.floor(Math.min(...values) / bin) * bin;
  const hi = Math.floor(Math.max(...values) / bin) * bin;
  const out: { from: number; to: number; count: number }[] = [];
  for (let x = lo; x <= hi; x += bin) out.push({ from: x, to: x + bin - 1, count: 0 });
  for (const v of values) out[Math.floor((v - lo) / bin)].count++;
  return out;
}

export const quantile = (sorted: number[], q: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] : 0;

export function warmMatchModel(): void {
  getOutcomeTables();
  getProfiles();
  chaseTable(2025, 120);
}
