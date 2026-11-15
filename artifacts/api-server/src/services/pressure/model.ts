// Pressure Reliability — pure maths shared by the build script and tests.
//
// Nothing here reads data. The build script fits the tables and models on the
// warehouse and publishes a snapshot; serving only reads that snapshot.

/** Logistic regression by Newton–Raphson (IRLS) with a small ridge for stability. */
export function fitLogistic(X: number[][], y: number[], iters = 25, ridge = 1e-6): number[] {
  const p = X[0].length;
  let w = new Array(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(p).fill(0);
    const H = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < X.length; i++) {
      const xi = X[i];
      const pr = sigmoid(dot(w, xi));
      const r = y[i] - pr;
      const s = pr * (1 - pr);
      for (let a = 0; a < p; a++) {
        g[a] += r * xi[a];
        for (let b = a; b < p; b++) H[a][b] += s * xi[a] * xi[b];
      }
    }
    for (let a = 0; a < p; a++) { H[a][a] += ridge; for (let b = 0; b < a; b++) H[a][b] = H[b][a]; }
    const step = solve(H, g);
    w = w.map((v, i) => v + step[i]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  return w;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || M[c][c] === 0) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (row[i] === 0 ? 0 : row[n] / row[i]));
}

/**
 * Expected runs still to come, by overs left (0..20) and wickets down (0..10),
 * interpolated to the exact ball. `table[k][w]` is runs from the start of an
 * over with k overs left.
 */
export function remainingRuns(table: number[][], ballsLeft: number, wickets: number): number {
  if (ballsLeft <= 0 || wickets >= 10) return 0;
  const w = Math.min(9, Math.max(0, wickets));
  const k = Math.min(20, ballsLeft / 6);
  const lo = Math.floor(k), hi = Math.min(20, lo + 1);
  const t = k - lo;
  return table[lo][w] * (1 - t) + table[hi][w] * t;
}

/** Forces the runs table to fall with wickets and rise with overs left. */
export function makeMonotone(table: number[][]): number[][] {
  const out = table.map(r => [...r]);
  for (let k = 0; k <= 20; k++) {
    for (let w = 1; w <= 10; w++) out[k][w] = Math.min(out[k][w], out[k][w - 1]);
  }
  for (let w = 0; w <= 10; w++) {
    for (let k = 1; k <= 20; k++) out[k][w] = Math.max(out[k][w], out[k - 1][w]);
  }
  return out;
}

export interface WpModel {
  chase: number[];  // weights for chaseFeatures
  first: number[];  // weights for firstFeatures
}

/** Chase: how the runs needed compare with what this state usually produces. */
export function chaseFeatures(need: number, ballsLeft: number, wickets: number, expected: number): number[] {
  const z = Math.log((need + 1) / (expected + 1));
  const t = ballsLeft / 120;
  return [1, z, t, z * t, wickets / 10];
}

/** First innings: the projected total against the competition-season par. */
export function firstFeatures(runs: number, ballsLeft: number, wickets: number, expected: number, par: number): number[] {
  const z = Math.log((runs + expected + 1) / (par + 1));
  const t = ballsLeft / 120;
  return [1, z, t, z * t, wickets / 10];
}

export interface StateCtx {
  innings: 1 | 2;
  runs: number;       // team runs before the ball
  ballsLeft: number;  // legal balls left in the innings
  wickets: number;    // wickets down before the ball
  target: number | null; // chase target (innings 2)
  par: number;        // competition-season par first-innings total
  scale: number;      // competition-season scoring factor
}

/** Win probability for the batting side in a given state. */
export function winProb(m: WpModel, table: number[][], s: StateCtx): number {
  if (s.innings === 2 && s.target !== null) {
    const need = s.target - s.runs;
    if (need <= 0) return 1;
    if (s.ballsLeft <= 0 || s.wickets >= 10) return 0;
    return sigmoid(dot(m.chase, chaseFeatures(need, s.ballsLeft, s.wickets, remainingRuns(table, s.ballsLeft, s.wickets) * s.scale)));
  }
  const exp = s.ballsLeft <= 0 || s.wickets >= 10 ? 0 : remainingRuns(table, s.ballsLeft, s.wickets) * s.scale;
  return sigmoid(dot(m.first, firstFeatures(s.runs, s.ballsLeft, s.wickets, exp, s.par)));
}

/** Ball outcome distribution for a legal ball: P(out) and P(runs = k | not out). */
export interface Outcomes { pOut: number; runs: [number, number][] }

/**
 * Leverage = expected absolute change in win probability from the next legal ball
 * (spec: LI = E|WP_next − WP_now|).
 */
export function leverage(m: WpModel, table: number[][], s: StateCtx, o: Outcomes): number {
  const now = winProb(m, table, s);
  const next = { ...s, ballsLeft: s.ballsLeft - 1 };
  let li = o.pOut * Math.abs(winProb(m, table, { ...next, wickets: s.wickets + 1 }) - now);
  for (const [r, p] of o.runs) li += (1 - o.pOut) * p * Math.abs(winProb(m, table, { ...next, runs: s.runs + r }) - now);
  return li;
}

/** Brier score and log loss for probabilistic predictions. */
export function scoreProbs(p: number[], y: number[]): { brier: number; logLoss: number; n: number } {
  let b = 0, l = 0;
  for (let i = 0; i < p.length; i++) {
    const q = Math.min(1 - 1e-9, Math.max(1e-9, p[i]));
    b += (q - y[i]) ** 2;
    l -= y[i] * Math.log(q) + (1 - y[i]) * Math.log(1 - q);
  }
  return { brier: b / p.length, logLoss: l / p.length, n: p.length };
}

/**
 * Empirical-Bayes normal–normal shrinkage of per-ball value rates.
 * Each player i has match totals V_ij over B_ij balls. Sampling variance uses a
 * match-clustered pooled per-ball variance s², so a single huge innings is not
 * treated as many independent balls. τ² (true spread between players) comes from
 * the method of moments. K = s²/τ² is the prior strength in balls.
 */
export interface EbInput { balls: number; value: number; matches: { b: number; v: number }[] }
export interface EbResult { mu: number; s2: number; tau2: number; K: number }

export function fitEb(players: EbInput[]): EbResult {
  const totB = players.reduce((s, p) => s + p.balls, 0);
  const mu = totB > 0 ? players.reduce((s, p) => s + p.value, 0) / totB : 0;
  // Within-player noise: each match against the player's own rate (n/(n−1) corrects for the fitted rate).
  let ss = 0, sb = 0;
  for (const p of players) {
    const n = p.matches.length;
    if (n < 2 || p.balls <= 0) continue;
    const r = p.value / p.balls;
    let pss = 0;
    for (const m of p.matches) pss += (m.v - r * m.b) ** 2;
    ss += (pss * n) / (n - 1);
    sb += p.balls;
  }
  const s2 = sb > 0 ? ss / sb : 1;
  // Ball-weighted variance of observed rates minus their expected sampling noise.
  let num = 0, noise = 0, wsum = 0;
  for (const p of players) {
    if (p.balls <= 0) continue;
    const r = p.value / p.balls;
    num += p.balls * (r - mu) ** 2;
    noise += p.balls * (s2 / p.balls);
    wsum += p.balls;
  }
  const tau2 = Math.max(1e-6, wsum > 0 ? (num - noise) / wsum : 1e-6);
  return { mu, s2, tau2, K: s2 / tau2 };
}

/**
 * Anchored empirical Bayes: a player's pressure rate is shrunk toward what their
 * USUAL level predicts, not toward the cohort mean.
 *   1. The ordinary rate is itself shrunk (K_O = s²_O/τ²_O) so tail-enders with few
 *      calm balls do not get extreme anchors.
 *   2. prior_i = μP + β(r̃O_i − μO), β from a ball-weighted regression of pressure
 *      rates on shrunk ordinary rates (regression calibration, so no attenuation).
 *   3. Pressure-specific spread τ² (after removing sampling noise) sets how far the
 *      player's own pressure balls may move them: weight = B/(B+K), K = s²/τ².
 */
export interface AnchoredInput { pB: number; pV: number; pMatches: { b: number; v: number }[]; oB: number; oV: number; oMatches: { b: number; v: number }[] }
export interface AnchoredFit { muP: number; muO: number; beta: number; s2: number; s2O: number; tau2: number; tau2O: number; K: number; KO: number; players: number }

function withinNoise(groups: { b: number; v: number }[][], totals: { b: number; v: number }[]): number {
  let ss = 0, sb = 0;
  groups.forEach((ms, i) => {
    const n = ms.length, t = totals[i];
    if (n < 2 || t.b <= 0) return;
    const r = t.v / t.b;
    let pss = 0;
    for (const m of ms) pss += (m.v - r * m.b) ** 2;
    ss += (pss * n) / (n - 1); sb += t.b;
  });
  return sb > 0 ? ss / sb : 1;
}

function spread(rates: { b: number; r: number }[], mu: number, s2: number): number {
  let num = 0, w = 0;
  for (const x of rates) { num += x.b * (x.r - mu) ** 2 - s2; w += x.b; }
  return Math.max(1e-6, num / w);
}

export function fitAnchoredEb(all: AnchoredInput[], minBalls = 30): AnchoredFit {
  const ps = all.filter(p => p.pB >= minBalls && p.oB >= minBalls);
  const sum = (f: (p: AnchoredInput) => number) => ps.reduce((s, p) => s + f(p), 0);
  const W = sum(p => p.pB);
  const muP = sum(p => p.pV) / W;
  const muO = sum(p => p.oV) / sum(p => p.oB);
  const s2 = withinNoise(ps.map(p => p.pMatches), ps.map(p => ({ b: p.pB, v: p.pV })));
  const s2O = withinNoise(ps.map(p => p.oMatches), ps.map(p => ({ b: p.oB, v: p.oV })));
  const tau2O = spread(ps.map(p => ({ b: p.oB, r: p.oV / p.oB })), muO, s2O);
  const KO = s2O / tau2O;
  const shrunkO = (p: AnchoredInput) => muO + (p.oB / (p.oB + KO)) * (p.oV / p.oB - muO);
  let sxy = 0, sxx = 0;
  for (const p of ps) {
    const x = shrunkO(p) - muO, y = p.pV / p.pB - muP;
    sxy += p.pB * x * y; sxx += p.pB * x * x;
  }
  const beta = sxx > 0 ? sxy / sxx : 0;
  const resid = ps.map(p => ({ b: p.pB, r: p.pV / p.pB - beta * (shrunkO(p) - muO) }));
  const tau2 = spread(resid, muP, s2);
  return { muP, muO, beta, s2, s2O, tau2, tau2O, K: s2 / tau2, KO, players: ps.length };
}

export function anchoredShrink(fit: AnchoredFit, p: { pB: number; pV: number; oB: number; oV: number }) {
  const rO = p.oB > 0 ? p.oV / p.oB : fit.muO;
  const usual = fit.muO + (p.oB / (p.oB + fit.KO)) * (rO - fit.muO);
  const prior = fit.muP + fit.beta * (usual - fit.muO);
  const rP = p.pB > 0 ? p.pV / p.pB : prior;
  const weight = p.pB / (p.pB + fit.K);
  const mean = prior + weight * (rP - prior);
  const sd = Math.sqrt(1 / (1 / fit.tau2 + p.pB / fit.s2));
  return { mean, sd, weight, prior, rP, rO, usual };
}

export function shrink(eb: EbResult, balls: number, value: number): { mean: number; sd: number; weight: number } {
  const r = balls > 0 ? value / balls : eb.mu;
  const weight = balls / (balls + eb.K);
  const mean = eb.mu + weight * (r - eb.mu);
  const sd = Math.sqrt(1 / (1 / eb.tau2 + balls / eb.s2));
  return { mean, sd, weight };
}
