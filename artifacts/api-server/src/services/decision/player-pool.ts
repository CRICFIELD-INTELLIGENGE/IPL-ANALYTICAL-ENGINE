// Decision Intelligence OS — Phase 4: Player Pool Graph (and the shared
// player feature space used by the Auction War Room).
//
// Every qualified batter / bowler becomes a feature vector, each feature
// measured against the league *in the same phases and against the same
// bowling types the player actually faced or bowled in*, so eras and roles
// compare fairly:
//
//   role    — share of balls in powerplay / middle / death (+ pace vs spin for bowlers)
//   output  — strike rate or economy vs expected, dismissal/wicket rate vs
//             expected, boundary % and dot %, each phase's rate, vs pace and
//             vs spin (batters), and pressure value (pressure-genome)
//
// Features are z-scored across the pool. Similarity is exp(−d²) on the
// RMS z-distance: 100% = identical, ~37% = one standard deviation apart on
// every feature. Role match and output match are reported separately.

import { F_BOWLER_WICKET, F_FACED, F_LEGAL, getBallColumns } from "./ball-context";
import { phaseOf } from "./match-model";
import { bowlingSubtype, getPlayerMeta, getSeasons } from "./player-profiles";
import { pressureValuePer100 } from "./pressure-genome";

export type PoolSide = "batting" | "bowling";
export type PoolWindow = "career" | "recent";

interface Feature { key: string; label: string; unit: string; dp: number; better: "high" | "low" | null }

const BAT_ROLE: Feature[] = [
  { key: "ppShare", label: "Powerplay share of balls", unit: "%", dp: 0, better: null },
  { key: "midShare", label: "Middle-overs share", unit: "%", dp: 0, better: null },
  { key: "deathShare", label: "Death share", unit: "%", dp: 0, better: null },
];
const BAT_OUT: Feature[] = [
  { key: "srRel", label: "Strike rate vs expected", unit: "", dp: 1, better: "high" },
  { key: "avgRel", label: "Balls per dismissal vs expected", unit: "×", dp: 2, better: "high" },
  { key: "bndRel", label: "Boundary % vs expected", unit: "pts", dp: 1, better: "high" },
  { key: "dotRel", label: "Dot % vs expected", unit: "pts", dp: 1, better: "low" },
  { key: "ppSR", label: "Powerplay SR vs league", unit: "", dp: 1, better: "high" },
  { key: "midSR", label: "Middle-overs SR vs league", unit: "", dp: 1, better: "high" },
  { key: "deathSR", label: "Death SR vs league", unit: "", dp: 1, better: "high" },
  { key: "spinSR", label: "SR vs spin vs league", unit: "", dp: 1, better: "high" },
  { key: "paceSR", label: "SR vs pace vs league", unit: "", dp: 1, better: "high" },
  { key: "pressure", label: "Pressure value", unit: "runs/100", dp: 1, better: "high" },
];
const BOWL_ROLE: Feature[] = [
  { key: "ppShare", label: "Powerplay share of balls", unit: "%", dp: 0, better: null },
  { key: "midShare", label: "Middle-overs share", unit: "%", dp: 0, better: null },
  { key: "deathShare", label: "Death share", unit: "%", dp: 0, better: null },
  { key: "spin", label: "Pace or spin", unit: "", dp: 0, better: null },
];
const BOWL_OUT: Feature[] = [
  { key: "econRel", label: "Economy vs expected", unit: "", dp: 2, better: "low" },
  { key: "bpwRel", label: "Balls per wicket vs expected", unit: "×", dp: 2, better: "low" },
  { key: "dotRel", label: "Dot % vs expected", unit: "pts", dp: 1, better: "high" },
  { key: "bndRel", label: "Boundary % conceded vs expected", unit: "pts", dp: 1, better: "low" },
  { key: "ppEcon", label: "Powerplay economy vs league", unit: "", dp: 2, better: "low" },
  { key: "midEcon", label: "Middle-overs economy vs league", unit: "", dp: 2, better: "low" },
  { key: "deathEcon", label: "Death economy vs league", unit: "", dp: 2, better: "low" },
  { key: "pressure", label: "Pressure value", unit: "runs/100", dp: 1, better: "high" },
];

export interface PoolPlayer {
  playerId: number;
  name: string;
  balls: number;
  era: number; // ball-weighted mean season
  firstSeason: number;
  lastSeason: number;
  archetype: string;
  headline: { label: string; value: string }[];
  raw: Record<string, number>;
  z: number[]; // role then output
}

export interface Space { side: PoolSide; window: PoolWindow; asOf: number; roleFeatures: Feature[]; outFeatures: Feature[]; players: PoolPlayer[]; byId: Map<number, PoolPlayer> }

const spaces = new Map<string, Space>();
const QUALIFY = { batting: { career: 300, recent: 150 }, bowling: { career: 240, recent: 120 } };
const SHRINK = 60;

/** `asOf` limits the space to seasons up to and including it (for backtests). */
export function getPoolSpace(side: PoolSide, window: PoolWindow, asOfIn?: number): Space {
  const latest = Number(getSeasons().at(-1) ?? 2026);
  const asOf = Math.min(asOfIn ?? latest, latest);
  const key = `${side}:${window}:${asOf}`;
  const hit = spaces.get(key);
  if (hit) return hit;
  const c = getBallColumns();
  const meta = getPlayerMeta();
  const from = window === "recent" ? asOf - 2 : 0;
  // Pressure value is computed on all seasons, so it is left out of past snapshots.
  const withPressure = asOf === latest;
  // acc[ph][ty]: balls, runs, outs, bnd, dots ; plus season-weighted sums.
  // ty: 0 pace, 1 spin, 2 bowling type unknown (Day 6: unknown is no longer counted as pace).
  const NF = 5;
  const acc = new Map<number, { a: Float64Array; seasonSum: number; first: number; last: number }>();
  const lg = new Float64Array(3 * 3 * NF);
  const ix = (ph: number, ty: number, f: number) => (ph * 3 + ty) * NF + f;
  const typeOf = (b: number) => { const t = meta.get(b)?.bowlingType; return t === "pace" ? 0 : t === "spin" ? 1 : 2; };
  for (let i = 0; i < c.n; i++) {
    const s = c.season[i];
    if (s < from || s > asOf) continue;
    const ph = phaseOf(c.over[i]);
    const f = c.flags[i];
    let pid: number, runs: number, out: number, counts: boolean, ty: number;
    if (side === "batting") {
      if (!(f & F_FACED)) continue;
      pid = c.batter[i]; runs = c.batterRuns[i]; out = c.outPlayer[i] === pid ? 1 : 0; counts = true; ty = typeOf(c.bowler[i]);
    } else {
      pid = c.bowler[i]; runs = c.conceded[i]; out = f & F_BOWLER_WICKET ? 1 : 0; counts = Boolean(f & F_LEGAL); ty = 0;
    }
    let e = acc.get(pid);
    if (!e) { e = { a: new Float64Array(3 * 3 * NF), seasonSum: 0, first: s, last: s }; acc.set(pid, e); }
    const bnd = c.batterRuns[i] === 4 || c.batterRuns[i] === 6 ? 1 : 0;
    for (const arr of [e.a, lg]) {
      if (counts) arr[ix(ph, ty, 0)]++;
      arr[ix(ph, ty, 1)] += runs;
      arr[ix(ph, ty, 2)] += out;
      arr[ix(ph, ty, 3)] += bnd;
      if (counts && runs === 0) arr[ix(ph, ty, 4)]++;
    }
    if (counts) { e.seasonSum += s; e.first = Math.min(e.first, s); e.last = Math.max(e.last, s); }
  }

  const sumPh = (a: Float64Array, ph: number, f: number) => a[ix(ph, 0, f)] + a[ix(ph, 1, f)] + a[ix(ph, 2, f)];
  const sumTy = (a: Float64Array, ty: number, f: number) => a[ix(0, ty, f)] + a[ix(1, ty, f)] + a[ix(2, ty, f)];
  const total = (a: Float64Array, f: number) => [0, 1, 2].reduce((s, ph) => s + sumPh(a, ph, f), 0);
  const rate = (num: number, den: number) => (den > 0 ? num / den : 0);
  const shrunk = (num: number, den: number, lgRate: number) => (num + SHRINK * lgRate) / (den + SHRINK);

  const roleFeatures = side === "batting" ? BAT_ROLE : BOWL_ROLE;
  const outFeatures = side === "batting" ? BAT_OUT : BOWL_OUT;
  const players: PoolPlayer[] = [];
  for (const [pid, e] of acc) {
    const a = e.a;
    const balls = total(a, 0);
    if (balls < QUALIFY[side][window]) continue;
    const m = meta.get(pid);
    const raw: Record<string, number> = {};
    // Expected rates given this player's own mix of phases (and types, for batters).
    let expRuns = 0, expOuts = 0, expBnd = 0, expDots = 0;
    for (let ph = 0; ph < 3; ph++) for (let ty = 0; ty < 3; ty++) {
      const b = a[ix(ph, ty, 0)];
      const lb = lg[ix(ph, ty, 0)];
      if (!b || !lb) continue;
      expRuns += b * rate(lg[ix(ph, ty, 1)], lb);
      expOuts += b * rate(lg[ix(ph, ty, 2)], lb);
      expBnd += b * rate(lg[ix(ph, ty, 3)], lb);
      expDots += b * rate(lg[ix(ph, ty, 4)], lb);
    }
    const runs = total(a, 1), outs = total(a, 2), bnd = total(a, 3), dots = total(a, 4);
    raw.ppShare = (sumPh(a, 0, 0) / balls) * 100;
    raw.midShare = (sumPh(a, 1, 0) / balls) * 100;
    raw.deathShare = (sumPh(a, 2, 0) / balls) * 100;
    raw.bndRel = ((bnd - expBnd) / balls) * 100;
    raw.dotRel = ((dots - expDots) / balls) * 100;
    if (side === "batting") {
      raw.sr = (runs / balls) * 100;
      raw.srRel = ((runs - expRuns) / balls) * 100;
      raw.avgRel = Math.log(rate(balls, Math.max(outs, 0.5)) / Math.max(1, rate(balls, expOuts)));
      const phSR = (ph: number) => {
        const lb = sumPh(lg, ph, 0);
        const l = rate(sumPh(lg, ph, 1), lb);
        return (shrunk(sumPh(a, ph, 1), sumPh(a, ph, 0), l) - l) * 100;
      };
      raw.ppSR = phSR(0); raw.midSR = phSR(1); raw.deathSR = phSR(2);
      const tySR = (ty: number) => {
        // Expected vs this type given the player's phase mix against it.
        let exp = 0;
        for (let ph = 0; ph < 3; ph++) exp += a[ix(ph, ty, 0)] * rate(lg[ix(ph, ty, 1)], lg[ix(ph, ty, 0)]);
        const b = sumTy(a, ty, 0);
        return b ? (((sumTy(a, ty, 1) + SHRINK * (exp / b)) / (b + SHRINK)) - exp / b) * 100 : 0;
      };
      raw.spinSR = tySR(1); raw.paceSR = tySR(0);
      raw.pressure = withPressure ? pressureValuePer100(pid, "batting", window).per100 : 0;
    } else {
      raw.economy = (runs / balls) * 6;
      raw.econRel = ((runs - expRuns) / balls) * 6;
      raw.bpwRel = Math.log(rate(balls, Math.max(outs, 0.5)) / Math.max(1, rate(balls, expOuts)));
      const phEcon = (ph: number) => {
        const lb = sumPh(lg, ph, 0);
        const l = rate(sumPh(lg, ph, 1), lb);
        return (shrunk(sumPh(a, ph, 1), sumPh(a, ph, 0), l) - l) * 6;
      };
      raw.ppEcon = phEcon(0); raw.midEcon = phEcon(1); raw.deathEcon = phEcon(2);
      // 1 spin, 0 pace; 0.5 when the bowling type is unknown, so it sits midway in similarity instead of posing as pace.
      raw.spin = m?.bowlingType === "spin" ? 1 : m?.bowlingType === "pace" ? 0 : 0.5;
      raw.pressure = withPressure ? pressureValuePer100(pid, "bowling", window).per100 : 0;
      raw.ballsPerWicket = outs ? balls / outs : balls;
    }
    players.push({
      playerId: pid, name: m?.name ?? `#${pid}`, balls, era: Math.round(e.seasonSum / balls), firstSeason: e.first, lastSeason: e.last,
      archetype: "", headline: [], raw, z: [],
    });
  }

  // z-score each feature across the pool.
  const feats = [...roleFeatures, ...outFeatures];
  const stats = feats.map((f) => {
    const vals = players.map((p) => p.raw[f.key]);
    const mean = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, vals.length)) || 1;
    return { mean, sd };
  });
  for (const p of players) {
    p.z = feats.map((f, i) => (p.raw[f.key] - stats[i].mean) / stats[i].sd);
    // Pace vs spin must dominate role similarity for bowlers.
    if (side === "bowling") p.z[3] *= 2;
    p.archetype = archetypeOf(side, p.raw, pid2subtype(p.playerId));
    p.headline = side === "batting"
      ? [{ label: "SR", value: p.raw.sr.toFixed(1) }, { label: "vs expected", value: signed(p.raw.srRel) }, { label: "Death SR vs lg", value: signed(p.raw.deathSR) }]
      : [{ label: "Econ", value: p.raw.economy.toFixed(2) }, { label: "vs expected", value: signed(p.raw.econRel, 2) }, { label: "Balls/wkt", value: p.raw.ballsPerWicket.toFixed(1) }];
  }
  const space: Space = { side, window, asOf, roleFeatures, outFeatures, players, byId: new Map(players.map((p) => [p.playerId, p])) };
  spaces.set(key, space);
  return space;
}

const signed = (n: number, dp = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(dp)}`;
const pid2subtype = (pid: number) => { const m = getPlayerMeta().get(pid); return m ? bowlingSubtype(m) : null; };

function archetypeOf(side: PoolSide, r: Record<string, number>, subtype: string | null): string {
  if (side === "batting") {
    if (r.ppShare >= 38) return r.srRel >= 8 ? "Powerplay aggressor" : "Top-order anchor";
    if (r.deathShare >= 38) return r.srRel >= 8 ? "Finisher" : "Lower-order batter";
    if (r.midShare >= 50) return r.srRel >= 8 ? "Middle-overs enforcer" : "Middle-order accumulator";
    return r.srRel >= 8 ? "Flexible hitter" : "Flexible batter";
  }
  if (r.spin !== 0 && r.spin !== 1) {
    const t = "bowling type unknown";
    if (r.ppShare >= 40) return `Powerplay bowler (${t})`;
    if (r.deathShare >= 38) return `Death-overs bowler (${t})`;
    return r.bpwRel < -0.1 ? `Wicket-taking bowler (${t})` : `Holding bowler (${t})`;
  }
  const kind = subtype && !/unknown/.test(subtype) ? subtype : r.spin ? "Spinner" : "Pacer";
  if (r.spin) {
    if (r.ppShare >= 30) return `Powerplay spinner (${kind})`;
    if (r.deathShare >= 22) return `Death-overs spinner (${kind})`;
    return r.bpwRel < -0.1 ? `Wicket-taking spinner (${kind})` : `Holding spinner (${kind})`;
  }
  if (r.ppShare >= 40) return `New-ball bowler (${kind})`;
  if (r.deathShare >= 38) return `Death specialist (${kind})`;
  return r.bpwRel < -0.1 ? `Strike bowler (${kind})` : `Workhorse (${kind})`;
}

/* ─── Similarity ─────────────────────────────────────────────────────────── */

export interface Neighbour {
  playerId: number;
  name: string;
  archetype: string;
  similarity: number; // %
  roleMatch: number;
  outputMatch: number;
  crossEra: boolean;
  era: number;
  span: string;
  shared: string[];
  differs: string | null;
  headline: { label: string; value: string }[];
}

function sim(space: Space, a: PoolPlayer, b: PoolPlayer) {
  const nr = space.roleFeatures.length;
  let dr = 0, dout = 0;
  for (let i = 0; i < a.z.length; i++) {
    const d = (a.z[i] - b.z[i]) ** 2;
    if (i < nr) dr += d; else dout += d;
  }
  const role = dr / nr, out = dout / (a.z.length - nr);
  return { role: Math.exp(-role), out: Math.exp(-out), overall: Math.exp(-(0.45 * role + 0.55 * out)) };
}

function fmtRaw(f: Feature, v: number): string {
  if (f.key === "spin") return v === 1 ? "Spin" : v === 0 ? "Pace" : "Unknown";
  if (f.key === "avgRel" || f.key === "bpwRel") return `${Math.exp(v).toFixed(2)}×`;
  if (f.unit === "%") return `${v.toFixed(0)}%`;
  return signed(v, f.dp);
}

function explain(space: Space, a: PoolPlayer, b: PoolPlayer): { shared: string[]; differs: string | null } {
  const nr = space.roleFeatures.length;
  const feats = [...space.roleFeatures, ...space.outFeatures];
  const shared: { s: string; strength: number }[] = [];
  let worst: { s: string; gap: number } | null = null;
  for (let i = nr; i < feats.length; i++) {
    const f = feats[i];
    const za = a.z[i], zb = b.z[i];
    if (Math.sign(za) === Math.sign(zb) && Math.abs(za) >= 0.6 && Math.abs(zb) >= 0.6 && Math.abs(za - zb) < 0.8) {
      shared.push({ s: `${f.label}: ${fmtRaw(f, a.raw[f.key])} / ${fmtRaw(f, b.raw[f.key])}`, strength: Math.min(Math.abs(za), Math.abs(zb)) });
    }
    const gap = Math.abs(za - zb);
    if (!worst || gap > worst.gap) worst = { s: `${f.label}: ${fmtRaw(f, a.raw[f.key])} vs ${fmtRaw(f, b.raw[f.key])}`, gap };
  }
  return { shared: shared.sort((x, y) => y.strength - x.strength).slice(0, 2).map((x) => x.s), differs: worst && worst.gap >= 1 ? worst.s : null };
}

export function similarPlayers(playerId: number, side: PoolSide, window: PoolWindow, k = 12, pool?: Set<number>, asOf?: number): Neighbour[] {
  const space = getPoolSpace(side, window, asOf);
  const me = space.byId.get(playerId);
  if (!me) return [];
  return space.players
    .filter((p) => p.playerId !== playerId && (!pool || pool.has(p.playerId)))
    .map((p) => ({ p, s: sim(space, me, p) }))
    .sort((x, y) => y.s.overall - x.s.overall)
    .slice(0, k)
    .map(({ p, s }) => {
      const ex = explain(space, me, p);
      return {
        playerId: p.playerId, name: p.name, archetype: p.archetype,
        similarity: Math.round(s.overall * 100), roleMatch: Math.round(s.role * 100), outputMatch: Math.round(s.out * 100),
        crossEra: Math.abs(p.era - me.era) >= 6, era: p.era, span: `${p.firstSeason}–${p.lastSeason}`,
        shared: ex.shared, differs: ex.differs, headline: p.headline,
      };
    });
}

export interface PoolGraph {
  center: { playerId: number; name: string; archetype: string; era: number; span: string; balls: number; headline: { label: string; value: string }[]; features: { label: string; value: string; z: number; better: "high" | "low" | null }[] };
  side: PoolSide;
  window: PoolWindow;
  sidesAvailable: PoolSide[];
  neighbours: Neighbour[];
  nodes: { id: number; name: string; archetype: string; similarity: number; crossEra: boolean; center: boolean }[];
  edges: { a: number; b: number; similarity: number }[];
  poolSize: number;
  archetypeCounts: { archetype: string; count: number; examples: string[] }[];
}

export function poolGraph(playerId: number, sideIn: PoolSide | undefined, window: PoolWindow): PoolGraph | null {
  const bat = getPoolSpace("batting", window), bowl = getPoolSpace("bowling", window);
  const sidesAvailable: PoolSide[] = [];
  if (bat.byId.has(playerId)) sidesAvailable.push("batting");
  if (bowl.byId.has(playerId)) sidesAvailable.push("bowling");
  if (!sidesAvailable.length) return null;
  const side = sideIn && sidesAvailable.includes(sideIn) ? sideIn
    : sidesAvailable.length === 2 ? (bowl.byId.get(playerId)!.balls > bat.byId.get(playerId)!.balls ? "bowling" : "batting") : sidesAvailable[0];
  const space = side === "batting" ? bat : bowl;
  const me = space.byId.get(playerId)!;
  const neighbours = similarPlayers(playerId, side, window, 12);
  const ids = [playerId, ...neighbours.map((n) => n.playerId)];
  const edges: PoolGraph["edges"] = neighbours.map((n) => ({ a: playerId, b: n.playerId, similarity: n.similarity }));
  // Each neighbour also links to its two closest fellow neighbours, so clusters show.
  for (const n of neighbours) {
    const np = space.byId.get(n.playerId)!;
    const near = ids.filter((x) => x !== playerId && x !== n.playerId)
      .map((x) => ({ x, s: sim(space, np, space.byId.get(x)!).overall }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 2);
    for (const { x, s } of near) {
      if (!edges.some((e) => (e.a === n.playerId && e.b === x) || (e.a === x && e.b === n.playerId))) edges.push({ a: n.playerId, b: x, similarity: Math.round(s * 100) });
    }
  }
  const feats = [...space.roleFeatures, ...space.outFeatures];
  const counts = new Map<string, PoolPlayer[]>();
  for (const p of space.players) counts.set(p.archetype, [...(counts.get(p.archetype) ?? []), p]);
  return {
    center: {
      playerId, name: me.name, archetype: me.archetype, era: me.era, span: `${me.firstSeason}–${me.lastSeason}`, balls: me.balls, headline: me.headline,
      features: feats.map((f, i) => ({ label: f.label, value: fmtRaw(f, me.raw[f.key]), z: Math.round((f.key === "spin" ? me.z[i] / 2 : me.z[i]) * 100) / 100, better: f.better })),
    },
    side, window, sidesAvailable,
    neighbours,
    nodes: [{ id: playerId, name: me.name, archetype: me.archetype, similarity: 100, crossEra: false, center: true },
      ...neighbours.map((n) => ({ id: n.playerId, name: n.name, archetype: n.archetype, similarity: n.similarity, crossEra: n.crossEra, center: false }))],
    edges,
    poolSize: space.players.length,
    archetypeCounts: [...counts.entries()].map(([archetype, ps]) => ({ archetype, count: ps.length, examples: [...ps].sort((a, b) => b.balls - a.balls).slice(0, 3).map((p) => p.name) })).sort((a, b) => b.count - a.count),
  };
}

/** Archetype of a player on a side, if they qualify. */
export function poolArchetype(playerId: number, side: PoolSide, window: PoolWindow = "career"): string | null {
  return getPoolSpace(side, window).byId.get(playerId)?.archetype ?? null;
}

export function poolPlayer(playerId: number, side: PoolSide, window: PoolWindow): PoolPlayer | undefined {
  return getPoolSpace(side, window).byId.get(playerId);
}

export function warmPlayerPool(): void {
  for (const s of ["batting", "bowling"] as const) for (const w of ["career", "recent"] as const) getPoolSpace(s, w);
}
