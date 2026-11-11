// CricField Player Intelligence — context-adjusted player impact (batch only).
//
// Every ball is valued by how much it moved the batting side's expected innings
// total, from a run-expectancy table of legal balls bowled × wickets down:
//
//   run value = runs + RE(next state) − RE(state)
//
// The table for season s uses seasons s−2…s only, so nothing about a later
// season can reach an earlier estimate. Each ball's value is then adjusted for:
//
//   context     mean run value for that season, phase and innings
//   venue       shrunken run-value effect of the ground in that season window
//   opposition  shrunken rating of the bowler (for batters) or batter (for bowlers)
//
// As-of estimates combine seasons ≤ asOf with exponential decay and empirical-Bayes
// shrinkage. Prior variance is estimated from the data by method of moments, so
// a small sample regresses by a measured amount, not a chosen one.
//
// Replacement level is measured from players who were actually fringe: role peers
// who played five or fewer matches in a season. The result is reported as CricField
// Runs Above Replacement. It is not WAR: no wins conversion has been validated.
//
// Fielding has raw counts only. Catches do not say how many runs were saved, so
// fielding impact is reported as unavailable, not estimated.

import { F_BOWLER_WICKET, F_FACED, F_LEGAL, F_STRIKER_OUT, getBallColumns } from "../decision/ball-context";
import { queryAll } from "../decision/db";
import { phaseOf } from "../decision/match-model";
import { getPlayerMeta, getSeasonLines } from "../decision/player-profiles";

const BUCKET = 3; // legal balls per run-expectancy row
const BUCKETS = Math.ceil(120 / BUCKET) + 1;
const RE_WINDOW = 3;

// Chosen on out-of-time rank correlation with next-season output: 0.5 → 0.189, 0.65 → 0.180, 0.8 → 0.175.
export const DECAY = 0.5;
const OPP_SHRINK_BALLS = 300;
const VENUE_SHRINK_BALLS = 1500;

export type Phase = "powerplay" | "middle" | "death";
const PHASES: Phase[] = ["powerplay", "middle", "death"];

interface Split { balls: number; runs: number; outs: number; dots: number; boundaries: number }
const emptySplit = (): Split => ({ balls: 0, runs: 0, outs: 0, dots: 0, boundaries: 0 });

export interface PlayerSeason {
  playerId: number;
  season: number;
  matches: number;
  batBalls: number;
  batValue: number; // adjusted runs above context
  bowlBalls: number;
  bowlValue: number;
  bat: Record<Phase, Split>;
  bowl: Record<Phase, Split>;
  batVsPace: Split;
  batVsSpin: Split;
  batChasing: Split;
  batDefending: Split;
  bowlChasing: Split;
  bowlDefending: Split;
  /** Adjusted run value by phase (powerplay, middle, death). */
  batPhaseValue: number[];
  bowlPhaseValue: number[];
  catches: number;
  stumpings: number;
  runOuts: number;
}

const newSeason = (playerId: number, season: number): PlayerSeason => ({
  playerId, season, matches: 0, batBalls: 0, batValue: 0, bowlBalls: 0, bowlValue: 0,
  bat: { powerplay: emptySplit(), middle: emptySplit(), death: emptySplit() },
  bowl: { powerplay: emptySplit(), middle: emptySplit(), death: emptySplit() },
  batVsPace: emptySplit(), batVsSpin: emptySplit(), batChasing: emptySplit(), batDefending: emptySplit(),
  bowlChasing: emptySplit(), bowlDefending: emptySplit(), batPhaseValue: [0, 0, 0], bowlPhaseValue: [0, 0, 0], catches: 0, stumpings: 0, runOuts: 0,
});

function buildReTables(): Map<number, Float64Array> {
  const c = getBallColumns();
  // First innings only: a chase ends at the target, so its remaining runs are not free expectancy.
  const seasons = [...new Set(Array.from(c.season.subarray(0, c.n)))].sort((a, b) => a - b);
  const bySeason = new Map<number, { sum: Float64Array; n: Float64Array }>();
  const ix = (b: number, w: number) => b * 10 + Math.min(9, w);
  for (const s of seasons) bySeason.set(s, { sum: new Float64Array(BUCKETS * 10), n: new Float64Array(BUCKETS * 10) });
  let i = 0;
  while (i < c.n) {
    const inn = c.innings[i];
    let end = i;
    while (end < c.n && c.innings[end] === inn) end++;
    if (c.inningsNumber[i] === 1) {
      const total = c.runsBefore[end - 1] + c.totalRuns[end - 1];
      const t = bySeason.get(c.season[i])!;
      for (let k = i; k < end; k++) {
        const cell = ix(Math.floor(c.legalBefore[k] / BUCKET), c.wicketsBefore[k]);
        t.sum[cell] += total - c.runsBefore[k];
        t.n[cell]++;
      }
    }
    i = end;
  }
  const out = new Map<number, Float64Array>();
  for (const s of seasons) {
    const sum = new Float64Array(BUCKETS * 10), n = new Float64Array(BUCKETS * 10);
    for (const y of seasons) {
      if (y > s || y < s - RE_WINDOW + 1) continue;
      const t = bySeason.get(y)!;
      for (let k = 0; k < sum.length; k++) { sum[k] += t.sum[k]; n[k] += t.n[k]; }
    }
    // Sparse cells borrow from the same over with one fewer wicket, scaled down a little.
    const re = new Float64Array(BUCKETS * 10);
    for (let b = 0; b < BUCKETS; b++) {
      for (let w = 0; w < 10; w++) {
        const k = ix(b, w);
        const prior = w > 0 ? re[ix(b, w - 1)] * 0.9 : Math.max(0, (120 - b * BUCKET) * 1.3);
        re[k] = (sum[k] + 30 * prior) / (n[k] + 30);
      }
    }
    out.set(s, re);
  }
  return out;
}

const reAt = (re: Float64Array, legal: number, wickets: number) =>
  wickets >= 10 || legal >= 120 ? 0 : re[Math.floor(legal / BUCKET) * 10 + wickets];

/** Per-ball run value, charged to batter and bowler separately. */
interface BallValues { bat: Float64Array; bowl: Float64Array }

let valueCache: BallValues | null = null;
function ballValues(): BallValues {
  if (valueCache) return valueCache;
  const c = getBallColumns();
  const tables = buildReTables();
  const bat = new Float64Array(c.n), bowl = new Float64Array(c.n);
  for (let i = 0; i < c.n; i++) {
    const re = tables.get(c.season[i])!;
    const f = c.flags[i];
    const legalNext = c.legalBefore[i] + (f & F_LEGAL ? 1 : 0);
    const before = reAt(re, c.legalBefore[i], c.wicketsBefore[i]);
    // Wicket cost goes to the batter only when the striker is out, and to the bowler only on a bowler's wicket.
    const batAfter = reAt(re, legalNext, c.wicketsBefore[i] + (f & F_STRIKER_OUT ? 1 : 0));
    const bowlAfter = reAt(re, legalNext, c.wicketsBefore[i] + (f & F_BOWLER_WICKET ? 1 : 0));
    bat[i] = c.batterRuns[i] + batAfter - before;
    bowl[i] = c.conceded[i] + bowlAfter - before;
  }
  valueCache = { bat, bowl };
  return valueCache;
}

let cached: { seasons: Map<number, PlayerSeason[]>; byPlayer: Map<number, PlayerSeason[]> } | null = null;

/** Adjusted season lines for every player and season. Takes a few seconds; used by the training pipeline only. */
export function getPlayerSeasons() {
  if (cached) return cached;
  const c = getBallColumns();
  const meta = getPlayerMeta();
  const v = ballValues();
  const key = (s: number, ph: number, inn: number) => s * 100 + ph * 10 + inn;
  const ctxSum = new Map<number, number>(), ctxN = new Map<number, number>();
  for (let i = 0; i < c.n; i++) {
    const k = key(c.season[i], phaseOf(c.over[i]), c.inningsNumber[i]);
    ctxSum.set(k, (ctxSum.get(k) ?? 0) + v.bat[i]);
    ctxN.set(k, (ctxN.get(k) ?? 0) + 1);
  }
  const ctx = new Map([...ctxSum].map(([k, s]) => [k, s / ctxN.get(k)!]));
  const venueKey = (s: number, venue: number) => s * 10000 + venue;
  const venueSum = new Map<number, number>(), venueN = new Map<number, number>();
  for (let i = 0; i < c.n; i++) {
    const r = v.bat[i] - ctx.get(key(c.season[i], phaseOf(c.over[i]), c.inningsNumber[i]))!;
    // A ground's effect for season s uses s−1 and s, never later seasons.
    for (const s of [c.season[i], c.season[i] + 1]) {
      const k = venueKey(s, c.venue[i]);
      venueSum.set(k, (venueSum.get(k) ?? 0) + r);
      venueN.set(k, (venueN.get(k) ?? 0) + 1);
    }
  }
  const venueEffect = (s: number, venue: number) => {
    const k = venueKey(s, venue);
    return (venueSum.get(k) ?? 0) / ((venueN.get(k) ?? 0) + VENUE_SHRINK_BALLS);
  };

  // One pass of opposition adjustment: ratings from the context-and-venue residual of s−1 and s.
  const oppKey = (s: number, id: number) => s * 100000 + id;
  const batSum = new Map<number, number>(), batN = new Map<number, number>();
  const bowlSum = new Map<number, number>(), bowlN = new Map<number, number>();
  const resid = new Float64Array(c.n), residBowl = new Float64Array(c.n);
  for (let i = 0; i < c.n; i++) {
    const base = ctx.get(key(c.season[i], phaseOf(c.over[i]), c.inningsNumber[i]))! + venueEffect(c.season[i], c.venue[i]);
    resid[i] = v.bat[i] - base;
    residBowl[i] = v.bowl[i] - base;
    const faced = c.flags[i] & F_FACED;
    for (const s of [c.season[i], c.season[i] + 1]) {
      if (faced) {
        const a = oppKey(s, c.batter[i]);
        batSum.set(a, (batSum.get(a) ?? 0) + resid[i]);
        batN.set(a, (batN.get(a) ?? 0) + 1);
      }
      const b = oppKey(s, c.bowler[i]);
      bowlSum.set(b, (bowlSum.get(b) ?? 0) + residBowl[i]);
      bowlN.set(b, (bowlN.get(b) ?? 0) + 1);
    }
  }
  const rate = (sum: Map<number, number>, n: Map<number, number>, k: number) => (sum.get(k) ?? 0) / ((n.get(k) ?? 0) + OPP_SHRINK_BALLS);

  const table = new Map<number, PlayerSeason>();
  const get = (id: number, s: number) => {
    const k = oppKey(s, id);
    let e = table.get(k);
    if (!e) { e = newSeason(id, s); table.set(k, e); }
    return e;
  };
  const add = (sp: Split, runs: number, out: boolean, legalBall: boolean, boundary: boolean) => {
    if (legalBall) sp.balls++;
    sp.runs += runs;
    if (out) sp.outs++;
    if (legalBall && runs === 0) sp.dots++;
    if (boundary) sp.boundaries++;
  };
  for (let i = 0; i < c.n; i++) {
    const s = c.season[i];
    const f = c.flags[i];
    const ph = PHASES[phaseOf(c.over[i])];
    const boundary = c.batterRuns[i] === 4 || c.batterRuns[i] === 6;
    const chasing = c.inningsNumber[i] === 2;
    if (f & F_FACED) {
      const e = get(c.batter[i], s);
      e.batBalls++;
      const v = resid[i] - rate(bowlSum, bowlN, oppKey(s, c.bowler[i]));
      e.batValue += v;
      e.batPhaseValue[phaseOf(c.over[i])] += v;
      const out = Boolean(f & F_STRIKER_OUT);
      add(e.bat[ph], c.batterRuns[i], out, true, boundary);
      add(chasing ? e.batChasing : e.batDefending, c.batterRuns[i], out, true, boundary);
      const ty = meta.get(c.bowler[i])?.bowlingType;
      if (ty === "pace") add(e.batVsPace, c.batterRuns[i], out, true, boundary);
      else if (ty === "spin") add(e.batVsSpin, c.batterRuns[i], out, true, boundary);
    }
    const e = get(c.bowler[i], s);
    const legalBall = Boolean(f & F_LEGAL);
    if (legalBall) e.bowlBalls++;
    const saved = rate(batSum, batN, oppKey(s, c.batter[i])) - residBowl[i];
    e.bowlValue += saved;
    e.bowlPhaseValue[phaseOf(c.over[i])] += saved;
    const wkt = Boolean(f & F_BOWLER_WICKET);
    add(e.bowl[ph], c.conceded[i], wkt, legalBall, boundary);
    add(chasing ? e.bowlDefending : e.bowlChasing, c.conceded[i], wkt, legalBall, boundary);
  }

  for (const [id, ls] of getSeasonLines()) for (const l of ls) if (l.matches) get(id, Number(l.season)).matches = l.matches;

  const fielders = queryAll<{ fid: number; kind: string; season: string; n: number }>(`
    SELECT x.fielder_id fid, x.kind kind, m.season_id season, COUNT(*) n
    FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id JOIN matches m ON m.match_id = d.match_id
    WHERE x.fielder_id IS NOT NULL GROUP BY 1, 2, 3`);
  for (const r of fielders) {
    const season = Number(r.season.split("/")[0]) + (r.season.includes("/") && r.season !== "2020/21" ? 1 : 0);
    const e = get(r.fid, season);
    if (r.kind === "caught") e.catches += r.n;
    else if (r.kind === "stumped") e.stumpings += r.n;
    else if (r.kind === "run out") e.runOuts += r.n;
  }

  const seasons = new Map<number, PlayerSeason[]>(), byPlayer = new Map<number, PlayerSeason[]>();
  for (const e of table.values()) {
    (seasons.get(e.season) ?? seasons.set(e.season, []).get(e.season)!).push(e);
    (byPlayer.get(e.playerId) ?? byPlayer.set(e.playerId, []).get(e.playerId)!).push(e);
  }
  for (const l of byPlayer.values()) l.sort((a, b) => a.season - b.season);
  cached = { seasons, byPlayer };
  return cached;
}

/* ─── Empirical-Bayes as-of ratings ──────────────────────────────────────── */

export interface Shrinkage { perBallVariance: number; talentVariance: number; k: number; priorRate: number }
export interface Ratings {
  asOf: number;
  bat: Shrinkage;
  bowl: Shrinkage;
  players: Map<number, Rating>;
}
export interface Rating {
  playerId: number;
  matchesWeighted: number;
  batBallsWeighted: number;
  bowlBallsWeighted: number;
  batRate: number; // shrunken adjusted runs per ball
  batRateSd: number;
  bowlRate: number;
  bowlRateSd: number;
  batBallsPerMatch: number;
  bowlBallsPerMatch: number;
}

/**
 * Talent variance from year-to-year persistence. Luck does not repeat, so the covariance of one player's rate in
 * consecutive seasons estimates the variance of true ability. Single-season variance cannot: at IPL sample sizes
 * it is almost entirely noise and the talent term rounds to zero.
 */
function talentFromPersistence(pairs: { a: number; na: number; b: number; nb: number }[]): number {
  const usable = pairs.filter((p) => p.na >= 60 && p.nb >= 60);
  const w = (p: { na: number; nb: number }) => (p.na * p.nb) / (p.na + p.nb);
  const total = usable.reduce((s, p) => s + w(p), 0) || 1;
  const meanA = usable.reduce((s, p) => s + w(p) * p.a, 0) / total;
  const meanB = usable.reduce((s, p) => s + w(p) * p.b, 0) / total;
  const cov = usable.reduce((s, p) => s + w(p) * (p.a - meanA) * (p.b - meanB), 0) / total;
  return Math.max(1e-4, cov);
}
export function ratingsAsOf(asOf: number, decay = DECAY): Ratings {
  const { byPlayer, seasons } = getPlayerSeasons();
  const c = getBallColumns();
  const recent = new Set([asOf, asOf - 1, asOf - 2]);
  // Luck: the per-ball variance of run value in the seasons this rating may see.
  const v = ballValues();
  let batSq = 0, batN = 0, bowlSq = 0, bowlN = 0;
  for (let i = 0; i < c.n; i++) {
    if (!recent.has(c.season[i])) continue;
    if (c.flags[i] & F_FACED) { batSq += v.bat[i] ** 2; batN++; }
    bowlSq += v.bowl[i] ** 2; bowlN++;
  }
  const batVar = batSq / Math.max(1, batN), bowlVar = bowlSq / Math.max(1, bowlN);
  const pool = [...recent].flatMap((s) => seasons.get(s) ?? []);
  const priorOf = (rows: { n: number; value: number }[]) => {
    const usable = rows.filter((r) => r.n >= 30);
    return usable.reduce((s, r) => s + r.value, 0) / Math.max(1, usable.reduce((s, r) => s + r.n, 0));
  };
  const batPairs: { a: number; na: number; b: number; nb: number }[] = [], bowlPairs: typeof batPairs = [];
  for (const ls of byPlayer.values()) {
    for (let i = 1; i < ls.length; i++) {
      const p = ls[i - 1], q = ls[i];
      if (q.season > asOf || q.season - p.season !== 1 || q.season < asOf - 7) continue;
      if (p.batBalls && q.batBalls) batPairs.push({ a: p.batValue / p.batBalls, na: p.batBalls, b: q.batValue / q.batBalls, nb: q.batBalls });
      if (p.bowlBalls && q.bowlBalls) bowlPairs.push({ a: p.bowlValue / p.bowlBalls, na: p.bowlBalls, b: q.bowlValue / q.bowlBalls, nb: q.bowlBalls });
    }
  }
  const batTalent = talentFromPersistence(batPairs), bowlTalent = talentFromPersistence(bowlPairs);
  const bat: Shrinkage = { perBallVariance: batVar, talentVariance: batTalent, k: batVar / batTalent, priorRate: priorOf(pool.map((e) => ({ n: e.batBalls, value: e.batValue }))) };
  const bowl: Shrinkage = { perBallVariance: bowlVar, talentVariance: bowlTalent, k: bowlVar / bowlTalent, priorRate: priorOf(pool.map((e) => ({ n: e.bowlBalls, value: e.bowlValue }))) };

  const players = new Map<number, Rating>();
  for (const [id, ls] of byPlayer) {
    let m = 0, bb = 0, bv = 0, wb = 0, wv = 0;
    for (const l of ls) {
      if (l.season > asOf) continue;
      const wt = decay ** (asOf - l.season);
      m += wt * l.matches; bb += wt * l.batBalls; bv += wt * l.batValue; wb += wt * l.bowlBalls; wv += wt * l.bowlValue;
    }
    if (m === 0 && bb === 0 && wb === 0) continue;
    players.set(id, {
      playerId: id, matchesWeighted: m, batBallsWeighted: bb, bowlBallsWeighted: wb,
      batRate: (bv + bat.k * bat.priorRate) / (bb + bat.k),
      batRateSd: Math.sqrt(1 / (1 / bat.talentVariance + bb / bat.perBallVariance)),
      bowlRate: (wv + bowl.k * bowl.priorRate) / (wb + bowl.k),
      bowlRateSd: Math.sqrt(1 / (1 / bowl.talentVariance + wb / bowl.perBallVariance)),
      batBallsPerMatch: m > 0 ? bb / m : 0,
      bowlBallsPerMatch: m > 0 ? wb / m : 0,
    });
  }
  return { asOf, bat, bowl, players };
}

/** Rate of fringe role peers: played at most five matches in a season within the last three. */
export function replacementRates(r: Ratings, roleOf: (id: number) => string): Map<string, { bat: number; bowl: number; n: number }> {
  const { seasons } = getPlayerSeasons();
  const fringe = new Map<string, { bat: number[]; bowl: number[] }>();
  for (let s = r.asOf; s > r.asOf - 3; s--) {
    for (const l of seasons.get(s) ?? []) {
      if (l.matches === 0 || l.matches > 5) continue;
      const rating = r.players.get(l.playerId);
      if (!rating) continue;
      const role = roleOf(l.playerId);
      const e = fringe.get(role) ?? { bat: [], bowl: [] };
      if (l.batBalls > 0) e.bat.push(rating.batRate);
      if (l.bowlBalls > 0) e.bowl.push(rating.bowlRate);
      fringe.set(role, e);
    }
  }
  const median = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
  return new Map([...fringe].map(([role, e]) => [role, { bat: median(e.bat), bowl: median(e.bowl), n: e.bat.length + e.bowl.length }]));
}

export interface RunsAboveReplacement {
  perMatch: number;
  sd: number;
  batting: number;
  bowling: number;
}

export function runsAboveReplacement(rt: Rating, repl: { bat: number; bowl: number }): RunsAboveReplacement {
  const batting = (rt.batRate - repl.bat) * rt.batBallsPerMatch;
  // Occasional bowlers are neither credited nor penalised for overs they will not bowl in an XII.
  const bowling = rt.bowlBallsPerMatch >= 3 ? (rt.bowlRate - repl.bowl) * rt.bowlBallsPerMatch : 0;
  const sd = Math.sqrt((rt.batRateSd * rt.batBallsPerMatch) ** 2 + (rt.bowlBallsPerMatch >= 3 ? rt.bowlRateSd * rt.bowlBallsPerMatch : 0) ** 2);
  return { perMatch: batting + bowling, sd, batting, bowling };
}

export const PHASE_LIST = PHASES;
