// Builds the Pressure Reliability snapshot from the multi-league warehouse.
//
//   node --import tsx scripts/pressure/build-pressure-reliability.ts
//
// Steps (every constant is estimated from the data, none is hand-set):
//   1. Rebuild the state before every delivery (runs, legal balls, wickets, target).
//   2. Expected outcome per ball by innings × over × wickets, scaled to each
//      competition-season's scoring rate.
//   3. Expected runs still to come by overs left × wickets → wicket cost.
//   4. Win-probability models for chases and first innings (logistic, fit on
//      matches before 2023, scored on 2023+, then refit on everything).
//   5. Leverage of every ball = E|ΔWP|; pressure tiers are its percentiles.
//   6. Value of every ball against expectation; summed per player per match.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getGlobalDb, getProjectRoot } from "../../src/services/scout/db";
import {
  chaseFeatures, firstFeatures, fitLogistic, leverage, makeMonotone, remainingRuns, scoreProbs, sigmoid, dot, winProb, fitEb,
  type Outcomes, type StateCtx, type WpModel,
} from "../../src/services/pressure/model";

const db = getGlobalDb();
if (!db) throw new Error("global.db not found");

const TEAM_WICKET_EXCLUDED = new Set(["retired hurt", "retired not out"]);
const BOWLER_KINDS = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);
const HOLDOUT_FROM = "2023-01-01";
const TIER_Q = [0.5, 0.7, 0.9]; // medium, high, extreme = top 50 / 30 / 10% of balls by leverage

// ── 1. Load ────────────────────────────────────────────────────────────────
type M = { id: number; comp: string; date: string; year: number; winner: number | null; result: string | null; method: string | null; t1: string; t2: string };
// ICC Full Members. Cricsheet withholds all Afghanistan matches, so that side never appears.
const FULL_MEMBERS = new Set(["Afghanistan", "Australia", "Bangladesh", "England", "India", "Ireland", "New Zealand", "Pakistan", "South Africa", "Sri Lanka", "West Indies", "Zimbabwe"]);
const matches = new Map<number, M>();
for (const r of db.prepare(`SELECT m.match_id id, c.code comp, m.start_date date, m.winner_id winner, m.result, m.method, a.name t1, b.name t2
  FROM matches m JOIN competitions c USING(competition_id) JOIN teams a ON a.team_id = m.team1_id JOIN teams b ON b.team_id = m.team2_id
  WHERE m.scheduled_overs = 20 AND m.balls_per_over = 6`).all() as any[]) {
  matches.set(r.id, { ...r, year: Number(r.date.slice(0, 4)) });
}
const inningsMeta = new Map<string, { bat: number; bowl: number; target: number | null; targetBalls: number | null }>();
for (const r of db.prepare(`SELECT match_id, innings_no, batting_team_id bat, bowling_team_id bowl, target_runs, target_overs
  FROM innings WHERE super_over = 0 AND innings_no IN (1,2)`).all() as any[]) {
  const ov = r.target_overs as number | null;
  inningsMeta.set(`${r.match_id}:${r.innings_no}`, {
    bat: r.bat, bowl: r.bowl, target: r.target_runs,
    targetBalls: ov == null ? null : Math.floor(ov) * 6 + Math.round((ov % 1) * 10),
  });
}
const wicketsBy = new Map<string, { kind: string; out: number }[]>();
for (const r of db.prepare(`SELECT match_id, innings_no, over_no, seq, kind, player_out FROM wickets WHERE innings_no IN (1,2)`).all() as any[]) {
  const k = `${r.match_id}:${r.innings_no}:${r.over_no}:${r.seq}`;
  (wicketsBy.get(k) ?? wicketsBy.set(k, []).get(k)!).push({ kind: r.kind, out: r.player_out });
}

interface Ball {
  match: number; inn: 1 | 2; over: number; batter: number; bowler: number;
  rb: number; conceded: number; total: number; legal: boolean; faced: boolean;
  teamWkts: number; strikerOut: boolean; bowlerWkt: boolean;
  runsBefore: number; legalBefore: number; wktsBefore: number;
}
const balls: Ball[] = [];
const inningsTotals = new Map<string, { runs: number; legal: number; wkts: number }>();
{
  const st = { key: "", runs: 0, legal: 0, wkts: 0 };
  for (const d of db.prepare(`SELECT match_id, innings_no, over_no, seq, batter, bowler, runs_batter, runs_total, wides, noballs
    FROM deliveries WHERE innings_no IN (1,2) ORDER BY match_id, innings_no, over_no, seq`).iterate() as Iterable<any>) {
    if (!matches.has(d.match_id) || !inningsMeta.has(`${d.match_id}:${d.innings_no}`)) continue;
    const key = `${d.match_id}:${d.innings_no}`;
    if (st.key !== key) { st.key = key; st.runs = 0; st.legal = 0; st.wkts = 0; }
    const ws = wicketsBy.get(`${key}:${d.over_no}:${d.seq}`) ?? [];
    const legal = d.wides === 0 && d.noballs === 0;
    const teamW = ws.filter(w => !TEAM_WICKET_EXCLUDED.has(w.kind));
    balls.push({
      match: d.match_id, inn: d.innings_no, over: Math.min(19, d.over_no), batter: d.batter, bowler: d.bowler,
      rb: d.runs_batter, conceded: d.runs_batter + d.wides + d.noballs, total: d.runs_total,
      legal, faced: d.wides === 0, teamWkts: teamW.length,
      strikerOut: teamW.some(w => w.out === d.batter), bowlerWkt: ws.some(w => BOWLER_KINDS.has(w.kind)),
      runsBefore: st.runs, legalBefore: st.legal, wktsBefore: st.wkts,
    });
    st.runs += d.runs_total; st.legal += legal ? 1 : 0; st.wkts += teamW.length;
    inningsTotals.set(key, { runs: st.runs, legal: st.legal, wkts: st.wkts });
  }
}
console.log(`balls ${balls.length}, matches ${matches.size}`);

// ── 2. Competition-season scale and par ─────────────────────────────────────
const csKey = (m: M) => `${m.comp}:${m.year}`;
const cs = new Map<string, { runs: number; legal: number; firstTotals: number[] }>();
let poolRuns = 0, poolLegal = 0;
for (const b of balls) {
  const k = csKey(matches.get(b.match)!);
  const e = cs.get(k) ?? cs.set(k, { runs: 0, legal: 0, firstTotals: [] }).get(k)!;
  e.runs += b.total; e.legal += b.legal ? 1 : 0; poolRuns += b.total; poolLegal += b.legal ? 1 : 0;
}
const completeFirst = (mid: number) => {
  const m = matches.get(mid)!;
  const t = inningsTotals.get(`${mid}:1`);
  return !!t && !m.method && m.result !== "no result" && (t.legal >= 120 || t.wkts >= 10);
};
for (const [key, t] of inningsTotals) {
  const [mid, inn] = key.split(":").map(Number);
  if (inn === 1 && completeFirst(mid)) cs.get(csKey(matches.get(mid)!))!.firstTotals.push(t.runs);
}
const poolRate = poolRuns / poolLegal;
const allFirst = [...cs.values()].flatMap(e => e.firstTotals);
const poolPar = allFirst.reduce((s, v) => s + v, 0) / allFirst.length;
const scaleOf = (m: M) => { const e = cs.get(csKey(m))!; return e.legal > 600 ? e.runs / e.legal / poolRate : 1; };
const parOf = (m: M) => { const e = cs.get(csKey(m))!; return e.firstTotals.length >= 5 ? e.firstTotals.reduce((s, v) => s + v, 0) / e.firstTotals.length : poolPar * scaleOf(m); };

// ── 3. Expected outcome cells (innings × over × wickets 0..6+) ─────────────
const cellOf = (b: Ball) => ((b.inn - 1) * 20 + b.over) * 7 + Math.min(6, b.wktsBefore);
const NC = 2 * 20 * 7;
const faced = Array.from({ length: NC }, () => ({ n: 0, runs: 0, outs: 0, k: new Array(7).fill(0) }));
const deliv = Array.from({ length: NC }, () => ({ n: 0, conceded: 0, bw: 0 }));
for (const b of balls) {
  const s = scaleOf(matches.get(b.match)!);
  const c = cellOf(b);
  deliv[c].n++; deliv[c].conceded += b.conceded / s; deliv[c].bw += b.bowlerWkt ? 1 : 0;
  if (b.faced) {
    faced[c].n++; faced[c].runs += b.rb / s; faced[c].outs += b.strikerOut ? 1 : 0;
    if (!b.strikerOut) faced[c].k[Math.min(6, b.rb)]++;
  }
}
const outcomesOf: Outcomes[] = faced.map(f => {
  const notOut = f.k.reduce((s, v) => s + v, 0) || 1;
  return { pOut: f.n ? f.outs / f.n : 0.05, runs: f.k.map((v, r) => [r, v / notOut] as [number, number]).filter(([, p]) => p > 0) };
});

// ── 4. Runs still to come, by overs left × wickets (first innings, complete) ─
const sum = Array.from({ length: 21 }, () => new Array(11).fill(0));
const cnt = Array.from({ length: 21 }, () => new Array(11).fill(0));
{
  const seen = new Set<string>();
  for (const b of balls) {
    if (b.inn !== 1 || !b.legal || b.legalBefore % 6 !== 0 || !completeFirst(b.match)) continue;
    const key = `${b.match}:${b.legalBefore}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const k = 20 - b.legalBefore / 6, w = Math.min(10, b.wktsBefore);
    sum[k][w] += (inningsTotals.get(`${b.match}:1`)!.runs - b.runsBefore) / scaleOf(matches.get(b.match)!);
    cnt[k][w]++;
  }
}
const rawTable = sum.map((row, k) => row.map((s, w) => (k === 0 || w === 10 ? 0 : cnt[k][w] >= 20 ? s / cnt[k][w] : Infinity)));
// Sparse cells: carry the wicket gap from one over fewer (k−1), where those states are common.
// k = 20 with wickets down only happens mid-over, so the start-of-over cell is always sparse.
for (let k = 1; k <= 20; k++) {
  // No wickets down late is rare: borrow the nearest observed wickets cell in the same row.
  if (!isFinite(rawTable[k][0])) rawTable[k][0] = rawTable[k].find(v => isFinite(v) && v > 0) ?? rawTable[k - 1][0] + poolRate * 6;
  for (let w = 1; w <= 9; w++) {
    if (isFinite(rawTable[k][w])) continue;
    const prev = rawTable[k - 1];
    rawTable[k][w] = k > 1 && isFinite(prev[w]) && isFinite(prev[w - 1])
      ? rawTable[k][w - 1] + (prev[w] - prev[w - 1])
      : rawTable[k][w - 1];
  }
}
const table = makeMonotone(rawTable);
const wicketCost = (ballsLeft: number, w: number, s: number) =>
  Math.max(0, remainingRuns(table, ballsLeft, w) - remainingRuns(table, ballsLeft, w + 1)) * s;

// ── 5. Win-probability models ───────────────────────────────────────────────
function stateOf(b: Ball): StateCtx | null {
  const m = matches.get(b.match)!;
  const meta = inningsMeta.get(`${b.match}:${b.inn}`)!;
  const scale = scaleOf(m), par = parOf(m);
  if (b.inn === 1) {
    if (m.method) return null; // reduced first innings: overs not recorded
    return { innings: 1, runs: b.runsBefore, ballsLeft: 120 - b.legalBefore, wickets: b.wktsBefore, target: null, par, scale };
  }
  let target = meta.target, tb = meta.targetBalls ?? 120;
  if (target == null) {
    if (m.method) return null;
    const first = inningsTotals.get(`${b.match}:1`);
    if (!first) return null;
    target = first.runs + 1; tb = 120;
  }
  return { innings: 2, runs: b.runsBefore, ballsLeft: Math.max(0, tb - b.legalBefore), wickets: b.wktsBefore, target, par, scale };
}
const states: (StateCtx | null)[] = balls.map(stateOf);
const outcomeY = (b: Ball): number | null => {
  const m = matches.get(b.match)!;
  if (m.result === "tie" || m.result === "no result" || m.winner == null) return null;
  return inningsMeta.get(`${b.match}:${b.inn}`)!.bat === m.winner ? 1 : 0;
};
function featuresOf(s: StateCtx): number[] | null {
  if (s.ballsLeft <= 0 || s.wickets >= 10) return null;
  const exp = remainingRuns(table, s.ballsLeft, s.wickets) * s.scale;
  if (s.innings === 2) { const need = s.target! - s.runs; return need > 0 ? chaseFeatures(need, s.ballsLeft, s.wickets, exp) : null; }
  return firstFeatures(s.runs, s.ballsLeft, s.wickets, exp, s.par);
}
function fitWp(filter: (b: Ball) => boolean): WpModel {
  const X: Record<1 | 2, number[][]> = { 1: [], 2: [] }, Y: Record<1 | 2, number[]> = { 1: [], 2: [] };
  balls.forEach((b, i) => {
    const s = states[i], y = outcomeY(b);
    if (!s || y === null || !b.legal || !filter(b)) return;
    const f = featuresOf(s);
    if (f) { X[s.innings].push(f); Y[s.innings].push(y); }
  });
  return { first: fitLogistic(X[1], Y[1]), chase: fitLogistic(X[2], Y[2]) };
}
const isHoldout = (b: Ball) => matches.get(b.match)!.date >= HOLDOUT_FROM;
const trainModel = fitWp(b => !isHoldout(b));
const validation: Record<string, unknown> = {};
for (const inn of [1, 2] as const) {
  const p: number[] = [], y: number[] = [], base: number[] = [];
  const trainY: number[] = [];
  balls.forEach((b, i) => {
    const s = states[i], yy = outcomeY(b);
    if (!s || yy === null || !b.legal || s.innings !== inn) return;
    const f = featuresOf(s);
    if (!f) return;
    if (!isHoldout(b)) { trainY.push(yy); return; }
    p.push(sigmoid(dot(inn === 1 ? trainModel.first : trainModel.chase, f))); y.push(yy);
  });
  const rate = trainY.reduce((s, v) => s + v, 0) / trainY.length;
  for (let i = 0; i < y.length; i++) base.push(rate);
  const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }));
  p.forEach((q, i) => { const k = Math.min(9, Math.floor(q * 10)); bins[k].n++; bins[k].p += q; bins[k].y += y[i]; });
  validation[inn === 1 ? "firstInnings" : "chase"] = {
    holdoutFrom: HOLDOUT_FROM, model: round(scoreProbs(p, y)), baseline: round(scoreProbs(base, y)),
    calibration: bins.filter(b => b.n > 0).map(b => ({ n: b.n, predicted: +(b.p / b.n).toFixed(3), observed: +(b.y / b.n).toFixed(3) })),
  };
}
const wp = fitWp(() => true);
console.log("validation", JSON.stringify(validation, null, 1).slice(0, 600));

// ── 6. Leverage → pressure tiers ────────────────────────────────────────────
const li = new Float64Array(balls.length).fill(NaN);
balls.forEach((b, i) => { const s = states[i]; if (s && s.ballsLeft > 0 && s.wickets < 10) li[i] = leverage(wp, table, s, outcomesOf[cellOf(b)]); });
const sorted = [...li].filter(v => !isNaN(v)).sort((a, b) => a - b);
const thresholds = TIER_Q.map(q => sorted[Math.floor(q * (sorted.length - 1))]);

// ── 6b. Which pressure definition is worth using? ───────────────────────────
// A definition is useful if (1) player value under it is repeatable — odd-numbered vs
// even-numbered matches, Spearman–Brown corrected — and (2) it says something the
// player's ordinary value does not (correlation with ordinary value well below 1).
// Scope = the challenge scope: IPL + T20I from 2022.
const ballValues = new Float64Array(balls.length * 2).fill(NaN); // [batter v, bowler v]
const wpNow = new Float64Array(balls.length).fill(NaN);
balls.forEach((b, i) => {
  const s = states[i];
  if (!s || isNaN(li[i])) return;
  const c = cellOf(b), cost = wicketCost(s.ballsLeft, s.wickets, s.scale);
  if (b.faced) ballValues[i * 2] = (b.rb - (faced[c].n ? faced[c].runs / faced[c].n : 1) * s.scale) - cost * ((b.strikerOut ? 1 : 0) - outcomesOf[c].pOut);
  const d = deliv[c];
  ballValues[i * 2 + 1] = ((d.n ? d.conceded / d.n : 1.3) * s.scale - b.conceded) + cost * ((b.bowlerWkt ? 1 : 0) - (d.n ? d.bw / d.n : 0.05));
  wpNow[i] = winProb(wp, table, s);
});

// ── 6a. Opposition strength ─────────────────────────────────────────────────
// Feasting on weak attacks (or weak line-ups) should not count as pressure skill.
// For each team-year, the mean value every batter got against its bowling (and every
// bowler against its batting) is an opposition effect; it is shrunk toward 0 by
// empirical Bayes (K from the data) and subtracted from the opponent's ball values.
// Two alternating passes so a strong attack's effect is not diluted by weak batters.
const oppEffect: Record<"bowlingSide" | "battingSide", Map<string, number>> = { bowlingSide: new Map(), battingSide: new Map() };
const oppStats: Record<string, { teamYears: number; K: number; sdPer100: number }> = {};
{
  const keyOf = (b: Ball, side: "bat" | "bowl") => `${inningsMeta.get(`${b.match}:${b.inn}`)![side]}:${matches.get(b.match)!.year}`;
  for (let pass = 0; pass < 6; pass++) {
    for (const [role, side, name] of [[0, "bowl", "bowlingSide"], [1, "bat", "battingSide"]] as const) {
      const other = role === 0 ? oppEffect.battingSide : oppEffect.bowlingSide;
      const otherSide = role === 0 ? "bat" : "bowl";
      const sums = new Map<string, { n: number; v: number; vv: number }>();
      balls.forEach((b, i) => {
        const v = ballValues[i * 2 + role];
        if (isNaN(v)) return;
        // Remove the player's own side's effect estimated in the previous pass.
        const own = other.get(keyOf(b, otherSide)) ?? 0;
        // own > 0 means that side is weak (opponents do well against it), so add it back.
        const x = v + own;
        const k = keyOf(b, side);
        const e = sums.get(k) ?? sums.set(k, { n: 0, v: 0, vv: 0 }).get(k)!;
        e.n++; e.v += x; e.vv += x * x;
      });
      let tot = 0, totN = 0, within = 0;
      for (const e of sums.values()) { tot += e.v; totN += e.n; within += e.vv - (e.v * e.v) / e.n; }
      const mu = tot / totN, s2 = within / totN;
      let num = 0, noise = 0, w = 0;
      for (const e of sums.values()) { num += e.n * (e.v / e.n - mu) ** 2; noise += s2; w += e.n; }
      const tau2 = Math.max(1e-9, (num - noise) / w);
      const K = s2 / tau2;
      const map = oppEffect[name];
      map.clear();
      for (const [k, e] of sums) map.set(k, (e.n / (e.n + K)) * (e.v / e.n - mu));
      oppStats[name] = { teamYears: sums.size, K: Math.round(K), sdPer100: +(Math.sqrt(tau2) * 100).toFixed(2) };
    }
  }
  balls.forEach((b, i) => {
    if (!isNaN(ballValues[i * 2])) ballValues[i * 2] -= oppEffect.bowlingSide.get(keyOf(b, "bowl")) ?? 0;
    if (!isNaN(ballValues[i * 2 + 1])) ballValues[i * 2 + 1] -= oppEffect.battingSide.get(keyOf(b, "bat")) ?? 0;
  });
  console.log("opposition", JSON.stringify(oppStats));
}
const liSorted = sorted;
const lev40 = liSorted[Math.floor(0.6 * (liSorted.length - 1))];
const rulesTest = (b: Ball, i: number) => {
  const s = states[i]!;
  const rrr = s.innings === 2 && s.target !== null && s.ballsLeft > 0 ? ((s.target - s.runs) / s.ballsLeft) * 6 : 0;
  return b.over >= 15 || rrr >= 9 || (b.wktsBefore >= 3 && b.runsBefore <= 35);
};
const DEFINITIONS: { id: string; label: string; test: (b: Ball, i: number) => boolean }[] = [
  { id: "rules", label: "A. Rules: death overs, or chase needing ≥9 an over, or collapse (≥3 down for ≤35)", test: rulesTest },
  { id: "rulesLive", label: "C. Rules, but only while the match is live (batting side's win probability 2–98%)", test: (b, i) => rulesTest(b, i) && wpNow[i] >= 0.02 && wpNow[i] <= 0.98 },
  { id: "leverage40", label: "B. Leverage, top 40% of balls (same share as the rules)", test: (_b, i) => li[i] >= lev40 },
  { id: "leverage30", label: "Leverage, top 30% of balls", test: (_b, i) => li[i] >= thresholds[1] },
  { id: "leverage10", label: "Leverage, top 10% of balls", test: (_b, i) => li[i] >= thresholds[2] },
  { id: "difficulty", label: "Difficulty: batting side's win probability 5–35% (behind but alive)", test: (_b, i) => wpNow[i] >= 0.05 && wpNow[i] <= 0.35 },
];
function pearson(x: number[], y: number[]) {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
}
const inScope = (b: Ball) => { const m = matches.get(b.match)!; return m.date >= "2022-01-01" && (m.comp === "ipl" || (m.comp === "t20i" && FULL_MEMBERS.has(m.t1) && FULL_MEMBERS.has(m.t2))); };
const definitionComparison = DEFINITIONS.map(def => {
  const out: Record<string, unknown> = { id: def.id, label: def.label };
  let flagged = 0, total = 0;
  const phase = [0, 0, 0];
  for (const role of [0, 1] as const) {
    // per player: [oddBalls, oddV, evenBalls, evenV, ordBalls, ordV]
    const acc = new Map<number, number[]>();
    const perMatch = new Map<number, Map<number, { b: number; v: number }>>();
    balls.forEach((b, i) => {
      if (!inScope(b) || isNaN(li[i])) return;
      const v = ballValues[i * 2 + role];
      if (isNaN(v)) return;
      const counts = role === 0 ? b.faced : b.legal;
      const p = role === 0 ? b.batter : b.bowler;
      const a = acc.get(p) ?? acc.set(p, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).get(p)!;
      const isP = def.test(b, i);
      if (role === 1 && b.legal) { total++; if (isP) { flagged++; phase[b.over < 6 ? 0 : b.over < 15 ? 1 : 2]++; } }
      const k = isP ? (b.match % 2 ? 0 : 2) : 4;
      a[k] += counts ? 1 : 0; a[k + 1] += v;
      if (!isP) { const o = b.match % 2 ? 6 : 8; a[o] += counts ? 1 : 0; a[o + 1] += v; }
      if (isP) {
        const pm = perMatch.get(p) ?? perMatch.set(p, new Map()).get(p)!;
        const e = pm.get(b.match) ?? pm.set(b.match, { b: 0, v: 0 }).get(b.match)!;
        e.b += counts ? 1 : 0; e.v += v;
      }
    });
    const MIN = 60;
    const odd: number[] = [], even: number[] = [], pres: number[] = [], ord: number[] = [];
    const upOdd: number[] = [], upEven: number[] = [];
    for (const a of acc.values()) {
      if (a[0] >= MIN && a[2] >= MIN && a[6] >= MIN && a[8] >= MIN) {
        upOdd.push(a[1] / a[0] - a[7] / a[6]); upEven.push(a[3] / a[2] - a[9] / a[8]);
      }
      if (a[0] >= MIN && a[2] >= MIN) { odd.push(a[1] / a[0]); even.push(a[3] / a[2]); }
      if (a[0] + a[2] >= 2 * MIN && a[4] >= 2 * MIN) { pres.push((a[1] + a[3]) / (a[0] + a[2])); ord.push(a[5] / a[4]); }
    }
    const r = pearson(odd, even);
    const ebPlayers = [...perMatch.values()].map(m => { const ms = [...m.values()]; return { balls: ms.reduce((x, y) => x + y.b, 0), value: ms.reduce((x, y) => x + y.v, 0), matches: ms }; }).filter(p => p.balls >= 30);
    const eb = fitEb(ebPlayers);
    out[role === 0 ? "batting" : "bowling"] = {
      // K = balls needed before half a player's score is their own signal (smaller = more repeatable per ball).
      priorStrengthBalls: Math.round(eb.K),
      // Does "better/worse than usual under pressure" repeat? (odd vs even matches)
      upliftSplitHalf: +pearson(upOdd, upEven).toFixed(3), upliftPlayers: upOdd.length, trueSpreadPer100: +(Math.sqrt(eb.tau2) * 100).toFixed(2),
      players: odd.length, splitHalf: +r.toFixed(3), reliability: +((2 * r) / (1 + r)).toFixed(3),
      vsOrdinary: +pearson(pres, ord).toFixed(3), playersVsOrdinary: pres.length,
    };
  }
  out.shareOfBalls = +(flagged / total).toFixed(3);
  out.phaseShare = phase.map(v => +(v / Math.max(1, flagged)).toFixed(3));
  return out;
});
console.log("definitions", JSON.stringify(definitionComparison, null, 1));

// ── 7. Ball values → player-match rows ──────────────────────────────────────
// Groups (overlapping): 0 all balls, 1 rules pressure (A, the selected definition),
// 2 leverage top 30%, 3 leverage top 10%. Fields: balls, runs, outs, value×100, dots, boundaries.
// "Ordinary" for any definition = group 0 minus that group. phase = all balls by PP/middle/death
// (where the player usually bats/bowls, used by the role lens).
// Rows start in ROW_FROM to keep the snapshot small; the models above use every season.
const ROW_FROM = "2016-01-01";
const NG = 4, NFLD = 6;
const rows = new Map<string, { match: number; player: number; role: 0 | 1; team: number; bins: number[]; phase: number[] }>();
const rowFor = (match: number, player: number, role: 0 | 1, team: number) => {
  const k = `${match}:${player}:${role}`;
  return rows.get(k) ?? rows.set(k, { match, player, role, team, bins: new Array(NG * NFLD).fill(0), phase: [0, 0, 0] }).get(k)!;
};
const share = { innings: [0, 0], phase: [0, 0, 0], total: 0 };
const add = (r: { bins: number[] }, groups: number[], f: number[]) => { for (const g of groups) for (let k = 0; k < NFLD; k++) r.bins[g * NFLD + k] += f[k]; };
balls.forEach((b, i) => {
  const s = states[i];
  if (!s || isNaN(li[i]) || matches.get(b.match)!.date < ROW_FROM) return;
  const meta = inningsMeta.get(`${b.match}:${b.inn}`)!;
  const phase = b.over < 6 ? 0 : b.over < 15 ? 1 : 2;
  const groups = [0];
  if (rulesTest(b, i)) groups.push(1);
  if (li[i] >= thresholds[1]) groups.push(2);
  if (li[i] >= thresholds[2]) groups.push(3);
  if (groups.includes(1) && b.legal) { share.innings[b.inn - 1]++; share.phase[phase]++; share.total++; }
  const boundary = b.rb === 4 || b.rb === 6 ? 1 : 0;
  if (b.faced) {
    const r = rowFor(b.match, b.batter, 0, meta.bat);
    add(r, groups, [1, b.rb, b.strikerOut ? 1 : 0, ballValues[i * 2] * 100, b.rb === 0 ? 1 : 0, boundary]);
    r.phase[phase]++;
  }
  const r = rowFor(b.match, b.bowler, 1, meta.bowl);
  add(r, groups, [b.legal ? 1 : 0, b.conceded, b.bowlerWkt ? 1 : 0, ballValues[i * 2 + 1] * 100, b.legal && b.conceded === 0 ? 1 : 0, boundary]);
  if (b.legal) r.phase[phase]++;
});

// ── 8. Publish ──────────────────────────────────────────────────────────────
const matchIds = [...new Set([...rows.values()].map(r => r.match))].sort((a, b) => a - b);
const mIndex = new Map(matchIds.map((id, i) => [id, i]));
const playerIds = [...new Set([...rows.values()].map(r => r.player))].sort((a, b) => a - b);
const pIndex = new Map(playerIds.map((id, i) => [id, i]));
const names = new Map((db.prepare("SELECT player_key, name FROM players").all() as any[]).map(r => [r.player_key, r.name]));
const teamNames = new Map((db.prepare("SELECT team_id, name FROM teams").all() as any[]).map(r => [r.team_id, r.name]));
const teamIds = [...new Set([...rows.values()].map(r => r.team))];
const tIndex = new Map(teamIds.map((id, i) => [id, i]));
const comps = (db.prepare("SELECT code, name FROM competitions ORDER BY competition_id").all() as any[]);
const compIndex = new Map(comps.map((c, i) => [c.code, i]));
const rowList = [...rows.values()].sort((a, b) => a.match - b.match || a.player - b.player || a.role - b.role);

const data = {
  matches: {
    date: matchIds.map(id => matches.get(id)!.date), comp: matchIds.map(id => compIndex.get(matches.get(id)!.comp)!),
    // 1 = both sides are ICC Full Members (always 1 for franchise leagues).
    fullMember: matchIds.map(id => { const m = matches.get(id)!; return m.comp !== "t20i" || (FULL_MEMBERS.has(m.t1) && FULL_MEMBERS.has(m.t2)) ? 1 : 0; }),
  },
  players: playerIds.map(id => names.get(id) ?? `player ${id}`),
  teams: teamIds.map(id => teamNames.get(id) ?? `team ${id}`),
  rows: {
    match: rowList.map(r => mIndex.get(r.match)!), player: rowList.map(r => pIndex.get(r.player)!),
    role: rowList.map(r => r.role), team: rowList.map(r => tIndex.get(r.team)!),
    bins: rowList.flatMap(r => r.bins.map(v => Math.round(v))), phase: rowList.flatMap(r => r.phase),
  },
};
const model = {
  method: "Pressure (selected, A) = death overs, or a chase needing ≥9 an over, or a collapse (≥3 down for ≤35); chosen over leverage definitions because player value under it repeats more across matches (definitionComparison). Leverage = E|ΔWP| of the next ball from calibrated logistic win-probability models. Value = runs vs context expectation (innings × over × wickets, competition-season scaled) minus wicket cost (drop in expected remaining runs).",
  groups: ["all", "rules", "leverage30", "leverage10"], fields: ["balls", "runs", "outs", "value100", "dots", "boundaries"], rowsFrom: ROW_FROM,
  tierPercentiles: TIER_Q, tierLeverage: thresholds.map(v => +v.toFixed(5)),
  definitionComparison,
  opposition: oppStats,
  winProbability: { weights: { chase: wp.chase, first: wp.first }, validation },
  pressureShare: {
    definition: "rules", pressureBalls: share.total,
    innings: { first: +(share.innings[0] / share.total).toFixed(4), chase: +(share.innings[1] / share.total).toFixed(4) },
    phase: { powerplay: +(share.phase[0] / share.total).toFixed(4), middle: +(share.phase[1] / share.total).toFixed(4), death: +(share.phase[2] / share.total).toFixed(4) },
  },
  leverageByOver: [1, 2].map(inn => Array.from({ length: 20 }, (_, o) => {
    let s = 0, n = 0;
    balls.forEach((b, i) => { if (b.inn === inn && b.over === o && !isNaN(li[i])) { s += li[i]; n++; } });
    return n ? +(s / n).toFixed(5) : null;
  })),
  remainingRunsTable: table.map(r => r.map(v => +v.toFixed(2))),
  coverage: Object.fromEntries(comps.map(c => {
    const ms = [...matches.values()].filter(m => m.comp === c.code);
    return [c.code, { name: c.name, matches: ms.length, from: ms.map(m => m.date).sort()[0] ?? null, to: ms.map(m => m.date).sort().at(-1) ?? null }];
  })),
  deliveries: balls.length,
};
const body = JSON.stringify({ data, model });
const version = `cf-pressure.${crypto.createHash("sha256").update(body).digest("hex").slice(0, 10)}`;
const out = path.join(getProjectRoot(), "artifacts", "api-server", "data", "pressure", "pressure-reliability.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version, builtAt: new Date().toISOString(), source: "Cricsheet via global.db (ODC-BY 1.0)", competitions: comps, model, data }));
console.log(`wrote ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB), ${rowList.length} rows, version ${version}`);
console.log("thresholds", thresholds, "share", JSON.stringify(model.pressureShare));

function round(o: { brier: number; logLoss: number; n: number }) {
  return { brier: +o.brier.toFixed(4), logLoss: +o.logLoss.toFixed(4), n: o.n };
}
