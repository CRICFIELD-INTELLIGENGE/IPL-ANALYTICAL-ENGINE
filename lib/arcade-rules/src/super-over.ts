// Super Over Showdown — six legal balls, two wickets, one target.
//
// Each ball: the bowler's delivery and the field are decided first (seeded), the player sees the field and
// the bowler's tendencies, picks a shot, and the outcome is drawn from that shot-vs-delivery table, adjusted
// by the field. The tables are CRICFIELD game balancing (labelled as such in the UI), not measured data.
// Wides and no-balls add a run and are re-bowled; a no-ball also gives a free hit (only a run-out could
// dismiss, which this game does not model, so a free-hit "wicket" outcome scores 0).

import { seeded, weighted } from "./rng";

export type Delivery = "yorker" | "wide_yorker" | "slower_bouncer" | "slower_ball" | "length" | "bouncer";
export type Shot = "block" | "push" | "drive" | "loft" | "ramp" | "slog";
export type Field = "ring" | "balanced" | "boundary";

export const DELIVERIES: Record<Delivery, { name: string; tell: string }> = {
  yorker: { name: "Yorker", tell: "Full and at the toes" },
  wide_yorker: { name: "Wide yorker", tell: "Full, way outside off" },
  slower_bouncer: { name: "Slower bouncer", tell: "Short and off-pace" },
  slower_ball: { name: "Slower ball", tell: "Back of the hand, dipping" },
  length: { name: "Hard length", tell: "Back of a length into the pitch" },
  bouncer: { name: "Bouncer", tell: "Short and quick at the body" },
};
export const SHOTS: Record<Shot, { name: string; risk: string }> = {
  block: { name: "Defend", risk: "Safe, rarely scores" },
  push: { name: "Work for one", risk: "Low risk, ones and twos" },
  drive: { name: "Ground drive", risk: "Fours along the ground" },
  loft: { name: "Lofted hit", risk: "Sixes, or caught in the deep" },
  ramp: { name: "Ramp / scoop", risk: "Fine of the keeper, high risk" },
  slog: { name: "Slog to leg", risk: "Big hit across the line" },
};
export const FIELDS: Record<Field, string> = {
  ring: "Ring field — fielders up to save the single",
  balanced: "Balanced — two out, sweepers square",
  boundary: "Boundary riders — five on the rope",
};

// Outcome order: dot, 1, 2, 4, 6, wicket.
type Row = [number, number, number, number, number, number];
const TABLE: Record<Delivery, Record<Shot, Row>> = {
  yorker: { block: [70, 28, 0, 0, 0, 2], push: [35, 50, 8, 2, 0, 5], drive: [30, 25, 15, 15, 0, 15], loft: [20, 15, 10, 12, 18, 25], ramp: [15, 10, 5, 25, 20, 25], slog: [25, 15, 5, 10, 15, 30] },
  wide_yorker: { block: [75, 23, 0, 0, 0, 2], push: [45, 40, 8, 4, 0, 3], drive: [25, 25, 15, 25, 0, 10], loft: [25, 15, 10, 15, 15, 20], ramp: [40, 15, 5, 15, 5, 20], slog: [40, 15, 5, 8, 8, 24] },
  slower_bouncer: { block: [65, 30, 0, 3, 0, 2], push: [35, 45, 10, 5, 0, 5], drive: [30, 25, 10, 10, 5, 20], loft: [15, 15, 10, 15, 25, 20], ramp: [25, 10, 5, 20, 15, 25], slog: [10, 15, 10, 20, 30, 15] },
  slower_ball: { block: [60, 35, 0, 3, 0, 2], push: [25, 50, 15, 5, 0, 5], drive: [15, 25, 15, 25, 5, 15], loft: [10, 15, 10, 20, 30, 15], ramp: [30, 15, 5, 15, 10, 25], slog: [15, 15, 10, 15, 25, 20] },
  length: { block: [60, 37, 0, 2, 0, 1], push: [20, 55, 15, 5, 0, 5], drive: [10, 25, 20, 30, 5, 10], loft: [10, 15, 10, 20, 30, 15], ramp: [20, 15, 5, 20, 15, 25], slog: [10, 15, 10, 20, 30, 15] },
  bouncer: { block: [70, 25, 0, 3, 0, 2], push: [40, 40, 8, 6, 0, 6], drive: [40, 20, 5, 10, 0, 25], loft: [20, 10, 5, 15, 25, 25], ramp: [15, 10, 5, 30, 20, 20], slog: [15, 15, 10, 20, 25, 15] },
};
const RUNS = [0, 1, 2, 4, 6, -1];
/** Field adjustments (multipliers on dot, 1, 2, 4, 6, W): a ring stops singles, riders stop fours and catch sixes. */
const FIELD_MOD: Record<Field, Row> = { ring: [1.15, 0.7, 0.8, 1.3, 1.1, 0.95], balanced: [1, 1, 1, 1, 1, 1], boundary: [0.9, 1.3, 1.25, 0.7, 0.75, 1.15] };
/** Chance a delivery is a wide (first) or no-ball (second). */
const EXTRA: Record<Delivery, [number, number]> = { yorker: [0.02, 0.04], wide_yorker: [0.1, 0.02], slower_bouncer: [0.06, 0.02], slower_ball: [0.02, 0.01], length: [0.01, 0.01], bouncer: [0.08, 0.03] };

export type Mode = "easy" | "balanced" | "impossible" | "custom";
export const MODE_TARGETS: Record<Exclude<Mode, "custom">, number> = { easy: 12, balanced: 17, impossible: 24 };
/** Bowler plans by mode: weights over the deliveries, in DELIVERIES order. */
const PLANS: Record<Mode, number[]> = { easy: [15, 10, 15, 20, 30, 10], balanced: [30, 15, 15, 20, 12, 8], impossible: [40, 20, 15, 15, 5, 5], custom: [30, 15, 15, 20, 12, 8] };

export interface Ball { n: number; legal: boolean; delivery: Delivery; field: Field; shot: Shot | null; runs: number; wicket: boolean; extra: "wide" | "noball" | null; freeHit: boolean; text: string }
export interface SuperOver { seed: string; mode: Mode; target: number; runs: number; wickets: number; legal: number; freeHit: boolean; balls: Ball[]; result: null | "won" | "lost" | "tied" }

export function newSuperOver(seed: string, mode: Mode, customTarget?: number): SuperOver {
  const target = mode === "custom" ? Math.max(1, Math.min(36, Math.round(customTarget ?? 15))) : MODE_TARGETS[mode];
  return { seed, mode, target, runs: 0, wickets: 0, legal: 0, freeHit: false, balls: [], result: null };
}

/** The next delivery and field, decided before the player chooses a shot. */
export function nextBall(s: SuperOver): { delivery: Delivery; field: Field; extra: "wide" | "noball" | null } {
  const rng = seeded(`${s.seed}|plan|${s.balls.length}`);
  const order = Object.keys(DELIVERIES) as Delivery[];
  const delivery = order[weighted(rng, PLANS[s.mode])];
  // Captains set more riders as the target tightens.
  const need = s.target - s.runs, left = 6 - s.legal;
  const field: Field = need / Math.max(1, left) >= 3 ? (rng() < 0.6 ? "boundary" : "balanced") : need <= left ? (rng() < 0.6 ? "ring" : "balanced") : (["ring", "balanced", "boundary"] as Field[])[Math.floor(rng() * 3)];
  const [w, nb] = EXTRA[delivery];
  const r = rng();
  return { delivery, field, extra: r < w ? "wide" : r < w + nb ? "noball" : null };
}

/** Outcome probabilities for a shot against the coming ball (shown to players as a risk read-out). */
export function shotOdds(delivery: Delivery, field: Field, shot: Shot): number[] {
  const row = TABLE[delivery][shot].map((v, i) => v * FIELD_MOD[field][i]);
  const total = row.reduce((a, b) => a + b, 0);
  return row.map((v) => v / total);
}

const TEXT: Record<number, string[]> = {
  0: ["Beaten. Dot ball.", "Straight to the fielder. No run."],
  1: ["Pushed into the gap for one.", "Quick single."],
  2: ["Driven into the deep, they come back for two.", "Two, hard running."],
  4: ["FOUR! Picks the gap and beats the rider.", "FOUR! Too fast for the sweeper."],
  6: ["SIX! Out of the middle and into the stands.", "SIX! That's huge."],
  [-1]: ["OUT! Taken in the deep.", "OUT! Bowled through the gate."],
};

export function playSuperBall(s: SuperOver, shot: Shot): SuperOver {
  if (s.result) return s;
  const { delivery, field, extra } = nextBall(s);
  const rng = seeded(`${s.seed}|bat|${s.balls.length}`);
  const freeHit = s.freeHit;
  if (extra === "wide") {
    const ball: Ball = { n: s.balls.length + 1, legal: false, delivery, field, shot: null, runs: 1, wicket: false, extra, freeHit, text: "Wide called. One extra and the ball is bowled again." };
    return settle({ ...s, runs: s.runs + 1, balls: [...s.balls, ball] });
  }
  const i = weighted(rng, shotOdds(delivery, field, shot));
  let runs = RUNS[i], wicket = runs === -1;
  let text = TEXT[runs][Math.floor(rng() * 2)];
  if (wicket && freeHit) { wicket = false; text = "Would have been out, but it's a free hit. No run."; }
  if (wicket) runs = 0;
  const nbRun = extra === "noball" ? 1 : 0;
  if (extra === "noball") text = `No-ball! ${text} Free hit next ball.`;
  const ball: Ball = { n: s.balls.length + 1, legal: extra !== "noball", delivery, field, shot, runs: runs + nbRun, wicket, extra, freeHit, text };
  return settle({ ...s, runs: s.runs + runs + nbRun, wickets: s.wickets + Number(wicket), legal: s.legal + Number(ball.legal), freeHit: extra === "noball", balls: [...s.balls, ball] });
}

function settle(s: SuperOver): SuperOver {
  if (s.runs >= s.target) return { ...s, result: "won" };
  if (s.wickets >= 2 || s.legal >= 6) return { ...s, result: s.runs === s.target - 1 ? "tied" : "lost" };
  return s;
}

/** The last legal ball with the match still open: the moment the UI slows down for. */
export const isFinalBall = (s: SuperOver) => !s.result && s.legal === 5;

export function replaySuperOver(seed: string, mode: Mode, target: number | undefined, shots: Shot[]): SuperOver {
  let s = newSuperOver(seed, mode, target);
  for (const shot of shots) {
    if (s.result) break;
    // A wide consumes no shot choice on screen, but the client still records the shot it had selected.
    s = playSuperBall(s, shot);
  }
  return s;
}

/** Odds a batter can know before the ball: the shot against the bowler's plan mix, not the actual delivery. */
export function expectedOdds(mode: Mode, field: Field, shot: Shot): number[] {
  const order = Object.keys(DELIVERIES) as Delivery[];
  const w = PLANS[mode], total = w.reduce((a, b) => a + b, 0);
  const out = [0, 0, 0, 0, 0, 0];
  order.forEach((d, i) => shotOdds(d, field, shot).forEach((p, k) => { out[k] += (p * w[i]) / total; }));
  return out;
}
