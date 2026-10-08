// Decision Intelligence OS — Phase 2: Pressure Genome.
//
// A player's pressure personality from IPL high-pressure situations only:
//
//   death          overs 16–20
//   knockout       playoffs & finals
//   close_finish   last 5 overs of a live chase (required rate 6–14, ≤ 8 down)
//   steep_chase    required rate above 12            (batting)
//   rescue         4+ wickets down inside 12 overs    (batting)
//   defending      chase on track (RR ≤ 8.5) from over 11, ≤ 6 down (bowling)
//
// Every context is judged against the league in that same context, so death
// overs don't look "good" just because everyone scores faster there. Value is
// runs per ball above the league, minus the run cost of getting out (a wicket
// is worth 30% of that context's league runs-per-wicket); bowlers are the
// mirror image. Small samples are shrunk toward zero.
//
//   Pressure index = percentile of a player's pooled pressure value among
//                    qualified players (0–100).
//   Pressure lift  = pressure value minus calm value: how much the player
//                    changes when it matters, relative to the league.

import { round } from "./impact-model";
import { forEachBall, type BallState } from "./ball-context";
import { getPlayerMeta, getSeasons } from "./player-profiles";

export type Side = "batting" | "bowling";
export type GenomeWindow = "career" | "recent";
export type PressureContext = "death" | "knockout" | "close_finish" | "steep_chase" | "rescue" | "defending";

const CONTEXT_INFO: Record<PressureContext, { label: string; description: string }> = {
  death: { label: "Death overs", description: "Overs 16–20, either innings" },
  knockout: { label: "Knockouts", description: "Qualifiers, eliminators and finals" },
  close_finish: { label: "Close finishes", description: "Last 5 overs of a live chase (required rate 6–14)" },
  steep_chase: { label: "Steep chases", description: "Required rate above 12" },
  rescue: { label: "Collapse rescue", description: "4+ wickets down inside 12 overs" },
  defending: { label: "Defending a chase", description: "Chase on track (RR ≤ 8.5) from over 11, ≤ 6 down" },
};

export const SIDE_CONTEXTS: Record<Side, PressureContext[]> = {
  batting: ["death", "knockout", "close_finish", "steep_chase", "rescue"],
  bowling: ["death", "knockout", "close_finish", "defending"],
};

// Accumulator layout: [window][slot][field]
const SLOTS = ["death", "knockout", "close_finish", "steep_chase", "rescue", "defending", "pressure", "calm", "all"] as const;
type Slot = (typeof SLOTS)[number];
const F = { balls: 0, runs: 1, outs: 2, dots: 3, boundaries: 4 } as const;
const NF = 5;
const WINDOWS: GenomeWindow[] = ["career", "recent"];
const idx = (w: number, s: number, f: number) => (w * SLOTS.length + s) * NF + f;
const slotIndex = Object.fromEntries(SLOTS.map((s, i) => [s, i])) as Record<Slot, number>;

// Context membership as a bitmask (bit i = SLOTS[i]); the hot loop runs ~295k times.
function contextMask(b: BallState): number {
  let m = 0;
  if (b.over >= 15) m |= 1 << slotIndex.death;
  if (b.knockout) m |= 1 << slotIndex.knockout;
  if (b.inningsNumber === 2 && b.runsNeeded !== null && b.runsNeeded > 0 && b.requiredRate !== null && b.ballsLeft !== null && b.ballsLeft > 0) {
    if (b.ballsLeft <= 30 && b.requiredRate >= 6 && b.requiredRate <= 14 && b.wicketsBefore <= 8) m |= 1 << slotIndex.close_finish;
    if (b.requiredRate > 12) m |= 1 << slotIndex.steep_chase;
    if (b.over >= 10 && b.requiredRate <= 8.5 && b.wicketsBefore <= 6) m |= 1 << slotIndex.defending;
  }
  if (b.wicketsBefore >= 4 && b.over < 12) m |= 1 << slotIndex.rescue;
  return m;
}

/** Slots a ball counts toward for one side: "all", its contexts, and pressure or calm. */
function slotsFor(side: Side): number[][] {
  const sideMask = SIDE_CONTEXTS[side].reduce((m, c) => m | (1 << slotIndex[c]), 0);
  return Array.from({ length: 1 << 6 }, (_, mask) => {
    const own = mask & sideMask;
    const out = [slotIndex.all, own ? slotIndex.pressure : slotIndex.calm];
    for (let i = 0; i < 6; i++) if (own & (1 << i)) out.push(i);
    return out;
  });
}

interface Store { bat: Map<number, Float64Array>; bowl: Map<number, Float64Array>; recentFrom: number }
let store: Store | null = null;

function getStore(): Store {
  if (store) return store;
  const recentFrom = Number(getSeasons().at(-1) ?? 2026) - 2;
  const bat = new Map<number, Float64Array>();
  const bowl = new Map<number, Float64Array>();
  const acc = (m: Map<number, Float64Array>, pid: number) => {
    let a = m.get(pid);
    if (!a) { a = new Float64Array(WINDOWS.length * SLOTS.length * NF); m.set(pid, a); }
    return a;
  };
  const batSlots = slotsFor("batting");
  const bowlSlots = slotsFor("bowling");
  forEachBall((b) => {
    const mask = contextMask(b);
    const windows = Number(b.season) >= recentFrom ? 2 : 1;
    const boundary = b.batterRuns === 4 || b.batterRuns === 6 ? 1 : 0;

    // Stumped off a wide counts as an out without a ball faced.
    if (b.faced || b.strikerOut) {
      const a = acc(bat, b.batter);
      for (let w = 0; w < windows; w++) for (const si of batSlots[mask]) {
        if (b.faced) {
          a[idx(w, si, F.balls)]++;
          a[idx(w, si, F.runs)] += b.batterRuns;
          if (b.batterRuns === 0) a[idx(w, si, F.dots)]++;
          a[idx(w, si, F.boundaries)] += boundary;
        }
        if (b.strikerOut) a[idx(w, si, F.outs)]++;
      }
    }

    const a = acc(bowl, b.bowler);
    for (let w = 0; w < windows; w++) for (const si of bowlSlots[mask]) {
      if (b.legal) a[idx(w, si, F.balls)]++;
      a[idx(w, si, F.runs)] += b.conceded;
      if (b.bowlerWicket) a[idx(w, si, F.outs)]++;
      if (b.legal && b.conceded === 0) a[idx(w, si, F.dots)]++;
      a[idx(w, si, F.boundaries)] += boundary;
    }
  });
  store = { bat, bowl, recentFrom };
  return store;
}

/* ─── League baselines & value ───────────────────────────────────────────── */

interface Line { balls: number; runs: number; outs: number; dots: number; boundaries: number }

function line(a: Float64Array, w: number, s: Slot): Line {
  const si = slotIndex[s];
  return { balls: a[idx(w, si, F.balls)], runs: a[idx(w, si, F.runs)], outs: a[idx(w, si, F.outs)], dots: a[idx(w, si, F.dots)], boundaries: a[idx(w, si, F.boundaries)] };
}

const leagueCache = new Map<string, Line>();
function league(side: Side, w: number, s: Slot): Line {
  const key = `${side}:${w}:${s}`;
  const hit = leagueCache.get(key);
  if (hit) return hit;
  const m = side === "batting" ? getStore().bat : getStore().bowl;
  const t: Line = { balls: 0, runs: 0, outs: 0, dots: 0, boundaries: 0 };
  for (const a of m.values()) {
    const l = line(a, w, s);
    t.balls += l.balls; t.runs += l.runs; t.outs += l.outs; t.dots += l.dots; t.boundaries += l.boundaries;
  }
  leagueCache.set(key, t);
  return t;
}

/** Runs per ball above the league in this context (positive = good for the player). */
function value(side: Side, l: Line, lg: Line): number | null {
  if (l.balls <= 0 || lg.balls <= 0 || lg.outs <= 0) return null;
  const wicketValue = 0.3 * (lg.runs / lg.outs);
  const runDiff = l.runs / l.balls - lg.runs / lg.balls;
  const outDiff = l.outs / l.balls - lg.outs / lg.balls;
  return side === "batting" ? runDiff - outDiff * wicketValue : -runDiff + outDiff * wicketValue;
}

const SHRINK_BALLS = 40;
const shrink = (v: number | null, balls: number) => (v === null ? 0 : (v * balls) / (balls + SHRINK_BALLS));
const QUALIFY_BALLS = 120;

/* ─── Profiles ───────────────────────────────────────────────────────────── */

export interface ContextSplit {
  context: PressureContext | "calm" | "pressure";
  label: string;
  description: string;
  balls: number;
  runs: number;
  outs: number;
  rate: number | null; // SR (batting) or economy (bowling)
  ballsPerOut: number | null; // balls per dismissal / per wicket
  boundaryPct: number | null;
  dotPct: number | null;
  leagueRate: number | null;
  leagueBallsPerOut: number | null;
  /** Runs per 100 balls better (+) or worse (−) than the league, shrunk for sample size. */
  valuePer100: number;
}

export interface Comparable { playerId: number; name: string; pressureIndex: number; archetype: string; similarity: number }

export interface PressureGenome {
  playerId: number;
  name: string;
  fullName: string | null;
  side: Side;
  window: GenomeWindow;
  windowLabel: string;
  sidesAvailable: Side[];
  qualified: boolean;
  confidence: "high" | "medium" | "low";
  pressureBalls: number;
  pressureIndex: number | null;
  liftPer100: number;
  archetype: string;
  summary: string;
  strongest: ContextSplit | null;
  weakest: ContextSplit | null;
  pressure: ContextSplit;
  calm: ContextSplit;
  contexts: ContextSplit[];
  comparables: Comparable[];
}

const r1 = (n: number | null) => (n === null ? null : round(n, 1));

function split(side: Side, a: Float64Array, w: number, s: Slot): ContextSplit {
  const l = line(a, w, s);
  const lg = league(side, w, s);
  const info = s === "pressure"
    ? { label: "All pressure", description: "Any of the pressure contexts" }
    : s === "calm" ? { label: "Calm", description: "Every other ball" } : CONTEXT_INFO[s as PressureContext];
  const rate = (x: Line) => (x.balls > 0 ? (side === "batting" ? (x.runs / x.balls) * 100 : (x.runs / x.balls) * 6) : null);
  return {
    context: s as ContextSplit["context"],
    label: info.label,
    description: info.description,
    balls: l.balls,
    runs: l.runs,
    outs: l.outs,
    rate: r1(rate(l)),
    ballsPerOut: l.outs > 0 ? r1(l.balls / l.outs) : null,
    boundaryPct: l.balls > 0 ? r1((l.boundaries / l.balls) * 100) : null,
    dotPct: l.balls > 0 ? r1((l.dots / l.balls) * 100) : null,
    leagueRate: r1(rate(lg)),
    leagueBallsPerOut: lg.outs > 0 ? r1(lg.balls / lg.outs) : null,
    valuePer100: round(shrink(value(side, l, lg), l.balls) * 100, 1),
  };
}

interface Scored { pid: number; pressureValue: number; lift: number; vector: number[]; balls: number }

const scoredCache = new Map<string, Scored[]>();
function scoredPlayers(side: Side, w: number): Scored[] {
  const key = `${side}:${w}`;
  const hit = scoredCache.get(key);
  if (hit) return hit;
  const m = side === "batting" ? getStore().bat : getStore().bowl;
  const out: Scored[] = [];
  for (const [pid, a] of m) {
    const p = line(a, w, "pressure");
    if (p.balls < QUALIFY_BALLS) continue;
    const c = line(a, w, "calm");
    const pv = shrink(value(side, p, league(side, w, "pressure")), p.balls);
    const cv = shrink(value(side, c, league(side, w, "calm")), c.balls);
    const vector = SIDE_CONTEXTS[side].map((ctx) => shrink(value(side, line(a, w, ctx), league(side, w, ctx)), line(a, w, ctx).balls));
    out.push({ pid, pressureValue: pv, lift: pv - cv, vector, balls: p.balls });
  }
  scoredCache.set(key, out);
  return out;
}

/** Shrunk pressure value (runs per 100 balls vs the league) — cheap, for feature vectors. */
export function pressureValuePer100(playerId: number, side: Side, window: GenomeWindow): { per100: number; balls: number } {
  const a = (side === "batting" ? getStore().bat : getStore().bowl).get(playerId);
  const w = WINDOWS.indexOf(window);
  if (!a) return { per100: 0, balls: 0 };
  const p = line(a, w, "pressure");
  return { per100: shrink(value(side, p, league(side, w, "pressure")), p.balls) * 100, balls: p.balls };
}

function percentile(values: number[], v: number): number {
  if (!values.length) return 50;
  const below = values.filter((x) => x < v).length;
  const equal = values.filter((x) => x === v).length;
  return Math.round(((below + equal / 2) / values.length) * 100);
}

function archetype(side: Side, qualified: boolean, liftPer100: number, strongest: ContextSplit | null, weakest: ContextSplit | null, index: number | null): string {
  if (!qualified) return "Not enough pressure data";
  const best = strongest?.context;
  if (liftPer100 >= 12) {
    if (best === "knockout") return side === "batting" ? "Big-match player" : "Big-match bowler";
    if (best === "close_finish" || best === "death") return side === "batting" ? "Ice-cold finisher" : "Death-overs enforcer";
    if (best === "rescue") return "Rescue specialist";
    if (best === "steep_chase") return "Chase hunter";
    if (best === "defending") return "Clutch defender";
    return "Clutch riser";
  }
  if (liftPer100 <= -12) {
    // Negative lift with no context below the league means the calm phase is simply exceptional.
    return weakest && weakest.valuePer100 < 0 ? `Pressure-sensitive (${weakest.label.toLowerCase()})` : "Calm-phase specialist";
  }
  if ((index ?? 50) >= 70) return "Steady under fire";
  return "Pressure-neutral";
}

export function getPressureGenome(playerId: number, window: GenomeWindow = "career", sideIn?: Side): PressureGenome | null {
  const meta = getPlayerMeta().get(playerId);
  if (!meta) return null;
  const st = getStore();
  const w = WINDOWS.indexOf(window);
  const batA = st.bat.get(playerId);
  const bowlA = st.bowl.get(playerId);
  const batBalls = batA ? line(batA, w, "all").balls : 0;
  const bowlBalls = bowlA ? line(bowlA, w, "all").balls : 0;
  const sidesAvailable: Side[] = [];
  if (batBalls > 0) sidesAvailable.push("batting");
  if (bowlBalls > 0) sidesAvailable.push("bowling");
  if (!sidesAvailable.length) return null;
  const side: Side = sideIn && sidesAvailable.includes(sideIn) ? sideIn : bowlBalls > batBalls ? "bowling" : "batting";
  const a = (side === "batting" ? batA : bowlA)!;

  const contexts = SIDE_CONTEXTS[side].map((c) => split(side, a, w, c));
  const pressure = split(side, a, w, "pressure");
  const calm = split(side, a, w, "calm");
  const pressureBalls = pressure.balls;
  const qualified = pressureBalls >= QUALIFY_BALLS;

  const scored = scoredPlayers(side, w);
  const pv = shrink(value(side, line(a, w, "pressure"), league(side, w, "pressure")), pressureBalls);
  const cv = shrink(value(side, line(a, w, "calm"), league(side, w, "calm")), calm.balls);
  const liftPer100 = round((pv - cv) * 100, 1);
  const pressureIndex = pressureBalls > 0 ? percentile(scored.map((s) => s.pressureValue), pv) : null;

  const usable = contexts.filter((c) => c.balls >= 30);
  const strongest = usable.length ? usable.reduce((x, y) => (y.valuePer100 > x.valuePer100 ? y : x)) : null;
  const weakest = usable.length ? usable.reduce((x, y) => (y.valuePer100 < x.valuePer100 ? y : x)) : null;
  const arch = archetype(side, qualified, liftPer100, strongest, weakest, pressureIndex);

  // Comparables: cosine similarity of z-scored context vectors among qualified players.
  let comparables: Comparable[] = [];
  const me = scored.find((s) => s.pid === playerId);
  if (me && scored.length > 5) {
    const dims = me.vector.length;
    const mean = Array.from({ length: dims }, (_, d) => scored.reduce((s, p) => s + p.vector[d], 0) / scored.length);
    const sd = Array.from({ length: dims }, (_, d) => Math.sqrt(scored.reduce((s, p) => s + (p.vector[d] - mean[d]) ** 2, 0) / scored.length) || 1);
    const z = (v: number[]) => v.map((x, d) => (x - mean[d]) / sd[d]);
    const mz = z(me.vector);
    const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    const meta2 = getPlayerMeta();
    const values = scored.map((s) => s.pressureValue);
    comparables = scored
      .filter((s) => s.pid !== playerId)
      .map((s) => {
        const oz = z(s.vector);
        const cos = mz.reduce((acc, x, d) => acc + x * oz[d], 0) / (norm(mz) * norm(oz));
        return { s, cos };
      })
      .sort((x, y) => y.cos - x.cos)
      .slice(0, 3)
      // Raw cosine (not (cos+1)/2), so unrelated profiles score near 0 rather than 50.
      .map(({ s, cos }) => {
        const g = getPlayerMeta().get(s.pid);
        const ctx = SIDE_CONTEXTS[side].map((c, i) => ({ c, v: s.vector[i] }));
        const best = ctx.reduce((x, y) => (y.v > x.v ? y : x));
        const worst = ctx.reduce((x, y) => (y.v < x.v ? y : x));
        const fakeSplit = (c: PressureContext, v: number) => ({ context: c, label: CONTEXT_INFO[c].label, valuePer100: v * 100 } as ContextSplit);
        return {
          playerId: s.pid,
          name: meta2.get(s.pid)?.name ?? g?.name ?? `#${s.pid}`,
          pressureIndex: percentile(values, s.pressureValue),
          archetype: archetype(side, true, s.lift * 100, fakeSplit(best.c, best.v), fakeSplit(worst.c, worst.v), percentile(values, s.pressureValue)),
          similarity: Math.max(0, Math.round(cos * 100)),
        };
      });
  }

  const windowLabel = window === "career" ? "IPL career" : `IPL ${st.recentFrom}–${st.recentFrom + 2}`;
  const rateWord = side === "batting" ? "strikes at" : "concedes";
  const rateUnit = side === "batting" ? "" : " an over";
  const outWord = side === "batting" ? "falls every" : "strikes every";
  const summary = !pressureBalls
    ? `${meta.name} has no ${side === "batting" ? "batting" : "bowling"} balls in pressure situations in this window.`
    : `Under pressure ${meta.name} ${rateWord} ${pressure.rate ?? "—"}${rateUnit} (league ${pressure.leagueRate ?? "—"})` +
      `${pressure.ballsPerOut ? ` and ${outWord} ${pressure.ballsPerOut} balls (league ${pressure.leagueBallsPerOut})` : ""}. ` +
      `That is ${Math.abs(liftPer100)} runs per 100 balls ${liftPer100 >= 0 ? "better" : "worse"}, relative to the league, than in calm phases` +
      (strongest && strongest.valuePer100 > 0
        ? `; best in ${strongest.label.toLowerCase()} (+${strongest.valuePer100} per 100 balls vs the league)`
        : weakest && weakest.valuePer100 < 0
          ? `; weakest in ${weakest.label.toLowerCase()} (${weakest.valuePer100} per 100 balls vs the league)`
          : "") + ".";

  return {
    playerId,
    name: meta.name,
    fullName: meta.fullName,
    side,
    window,
    windowLabel,
    sidesAvailable,
    qualified,
    confidence: pressureBalls >= 400 ? "high" : pressureBalls >= QUALIFY_BALLS ? "medium" : "low",
    pressureBalls,
    pressureIndex,
    liftPer100,
    archetype: arch,
    summary,
    strongest,
    weakest,
    pressure,
    calm,
    contexts,
    comparables,
  };
}

export interface PressureLeader { playerId: number; name: string; pressureIndex: number; liftPer100: number; pressureBalls: number; archetype: string }

/** Top players by pressure index and by lift, for the module's landing view. */
export function getPressureLeaders(side: Side, window: GenomeWindow, limit = 10): { byIndex: PressureLeader[]; byLift: PressureLeader[]; qualifyBalls: number } {
  const w = WINDOWS.indexOf(window);
  const scored = scoredPlayers(side, w);
  const values = scored.map((s) => s.pressureValue);
  const meta = getPlayerMeta();
  const toLeader = (s: Scored): PressureLeader => {
    const g = getPressureGenome(s.pid, window, side)!;
    return { playerId: s.pid, name: meta.get(s.pid)?.name ?? `#${s.pid}`, pressureIndex: percentile(values, s.pressureValue), liftPer100: round(s.lift * 100, 1), pressureBalls: s.balls, archetype: g.archetype };
  };
  return {
    byIndex: [...scored].sort((a, b) => b.pressureValue - a.pressureValue).slice(0, limit).map(toLeader),
    byLift: [...scored].sort((a, b) => b.lift - a.lift).slice(0, limit).map(toLeader),
    qualifyBalls: QUALIFY_BALLS,
  };
}

export function warmPressureGenome(): void {
  getStore();
}
