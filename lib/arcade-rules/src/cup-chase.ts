// Cup Chase — timing-based batting. Every outcome is a pure function of the delivery (seeded) and the
// player's input (when they swung, where they aimed, whether they went aerial). No dice are rolled after
// the swing, so the animation and the result always agree, and the server can re-judge a submitted innings.

import { seeded } from "./rng";

export type Difficulty = "easy" | "medium" | "hard";
export type Aim = "off" | "straight" | "leg";
export type Line = "off" | "stumps" | "leg" | "wide";
export type Length = "full" | "good" | "short";

export interface CupDelivery {
  n: number;
  kph: number;
  line: Line;
  length: Length;
  /** Lateral drift during flight, -1 (into a right-hander) … 1 (away). Visual + changes the ideal aim. */
  swing: number;
  /** Milliseconds from release to the ideal contact point. */
  travelMs: number;
  /** Zones (off / straight / leg) with a fielder on the rope this ball. */
  deep: Aim[];
  /** Zones with a fielder saving one in the ring. */
  ring: Aim[];
}

export interface CupInput { swingMs: number | null; aim: Aim; loft: boolean }
export type Contact = "perfect" | "good" | "edge" | "early" | "late" | "miss";
export interface CupOutcome { runs: number; wicket: boolean; contact: Contact; errorMs: number | null; aimMatched: boolean; label: string; zone: Aim }

export const DIFFICULTY: Record<Difficulty, { name: string; windows: [number, number, number]; pace: [number, number]; swing: number; targets: [number, number, number]; note: string }> = {
  easy: { name: "Easy", windows: [55, 110, 175], pace: [112, 128], swing: 0.2, targets: [16, 22, 28], note: "Slower bowling, wide timing windows" },
  medium: { name: "Medium", windows: [42, 90, 150], pace: [118, 140], swing: 0.5, targets: [20, 26, 32], note: "Mixed pace, more movement" },
  hard: { name: "Hard", windows: [30, 70, 120], pace: [128, 150], swing: 0.9, targets: [24, 30, 36], note: "Quick, late swing, narrow windows" },
};
export const ROUND_NAMES = ["Quarter-final", "Semi-final", "Final"] as const;
export const BALLS_PER_ROUND = 12;
export const WICKETS_PER_ROUND = 3;

export function cupDelivery(seed: string, difficulty: Difficulty, round: number, n: number): CupDelivery {
  const d = DIFFICULTY[difficulty];
  const rng = seeded(`${seed}|${round}|${n}`);
  // Later rounds and later balls nudge the pace up.
  const kph = Math.round(d.pace[0] + (d.pace[1] - d.pace[0]) * Math.min(1, rng() * 0.8 + round * 0.1 + n * 0.01));
  const lines: Line[] = ["off", "stumps", "stumps", "leg", "wide"];
  const lengths: Length[] = ["full", "good", "good", "short"];
  const line = lines[Math.floor(rng() * lines.length)];
  const length = lengths[Math.floor(rng() * lengths.length)];
  const swing = Math.round((rng() * 2 - 1) * d.swing * 100) / 100;
  // A deceptive (slower) ball arrives late on hard difficulty.
  const slower = difficulty !== "easy" && rng() < (difficulty === "hard" ? 0.18 : 0.1);
  const travelMs = Math.round(900 + (150 - kph) * 22 + (length === "short" ? 120 : length === "full" ? -60 : 0) + (slower ? 260 : 0));
  const zones: Aim[] = ["off", "straight", "leg"];
  const deep = zones.filter(() => rng() < 0.45);
  const ring = zones.filter((z) => !deep.includes(z) && rng() < 0.5);
  return { n, kph: slower ? kph - 25 : kph, line, length, swing, travelMs, deep, ring };
}

/** Where each line is best hit. Swing moves the ideal aim toward the movement. */
export function idealAims(d: CupDelivery): Aim[] {
  const base: Record<Line, Aim[]> = { off: ["off", "straight"], stumps: ["straight", "leg"], leg: ["leg"], wide: ["off"] };
  const out = [...base[d.line]];
  if (d.swing > 0.6 && !out.includes("off")) out.push("off");
  if (d.swing < -0.6 && !out.includes("leg")) out.push("leg");
  return out;
}

export function judgeCupBall(d: CupDelivery, input: CupInput, difficulty: Difficulty): CupOutcome {
  const [perfect, good, ok] = DIFFICULTY[difficulty].windows;
  const onStumps = d.line === "stumps" || (d.line === "off" && d.swing < -0.3) || (d.line === "leg" && d.swing > 0.3);
  const zone = input.aim;
  if (input.swingMs == null) {
    return onStumps && d.length !== "short"
      ? { runs: 0, wicket: true, contact: "miss", errorMs: null, aimMatched: false, label: "Left it — and it crashes into the stumps. Bowled!", zone }
      : { runs: 0, wicket: false, contact: "miss", errorMs: null, aimMatched: false, label: "Left alone. Dot ball.", zone };
  }
  const error = Math.round(input.swingMs - d.travelMs);
  const abs = Math.abs(error);
  const aimMatched = idealAims(d).includes(input.aim);
  // Mis-aiming costs one timing tier.
  let tier = abs <= perfect ? 0 : abs <= good ? 1 : abs <= ok ? 2 : 3;
  if (!aimMatched && tier < 3) tier++;
  const deep = d.deep.includes(zone), ring = d.ring.includes(zone);
  if (tier === 3) {
    if (error < 0) {
      // Through the shot early: an aerial shot is skied, a ground shot is a leading edge.
      return input.loft || d.length === "short"
        ? { runs: 0, wicket: true, contact: "early", errorMs: error, aimMatched, label: "Too early — skied, and it's taken. Caught!", zone }
        : { runs: 0, wicket: false, contact: "early", errorMs: error, aimMatched, label: "Too early. Inside edge onto the pad. Dot.", zone };
    }
    return onStumps
      ? { runs: 0, wicket: true, contact: "late", errorMs: error, aimMatched, label: "Too late — through the gate. Bowled!", zone }
      : { runs: 0, wicket: false, contact: "late", errorMs: error, aimMatched, label: "Too late. Beaten outside off. Dot.", zone };
  }
  if (input.loft) {
    if (tier === 0) return { runs: 6, wicket: false, contact: "perfect", errorMs: error, aimMatched, label: "SIX! Right out of the middle.", zone };
    if (tier === 1) return deep ? { runs: 0, wicket: true, contact: "good", errorMs: error, aimMatched, label: "Hit well, but straight to the man on the rope. Caught!", zone } : { runs: 4, wicket: false, contact: "good", errorMs: error, aimMatched, label: "FOUR! One bounce over the rope.", zone };
    return deep || ring ? { runs: 0, wicket: true, contact: "edge", errorMs: error, aimMatched, label: "Mistimed in the air — caught!", zone } : { runs: 2, wicket: false, contact: "edge", errorMs: error, aimMatched, label: "Off the edge, lands safe. Two.", zone };
  }
  if (tier === 0) return ring ? { runs: 2, wicket: false, contact: "perfect", errorMs: error, aimMatched, label: "Pierced the ring, cut off in the deep. Two.", zone } : { runs: 4, wicket: false, contact: "perfect", errorMs: error, aimMatched, label: "FOUR! Timed along the carpet.", zone };
  if (tier === 1) return ring ? { runs: 1, wicket: false, contact: "good", errorMs: error, aimMatched, label: "Good contact, the ring fielder stops it. One.", zone } : { runs: deep ? 1 : 2, wicket: false, contact: "good", errorMs: error, aimMatched, label: deep ? "Into the deep. One." : "Into the gap. Two.", zone };
  return { runs: ring ? 0 : 1, wicket: false, contact: "edge", errorMs: error, aimMatched, label: ring ? "Off the edge, straight to the ring. Dot." : "Thick edge, they scamper one.", zone };
}

export interface CupRound { round: number; runs: number; wickets: number; balls: number; outcomes: CupOutcome[]; status: "playing" | "won" | "lost" }

export function cupRoundStatus(r: Pick<CupRound, "runs" | "wickets" | "balls">, target: number): CupRound["status"] {
  return r.runs >= target ? "won" : r.wickets >= WICKETS_PER_ROUND || r.balls >= BALLS_PER_ROUND ? "lost" : "playing";
}

/** Re-judge a whole cup from inputs (server validation). Returns rounds won and total runs. */
export function replayCup(seed: string, difficulty: Difficulty, rounds: CupInput[][]): { roundsWon: number; runs: number; lastBallWin: boolean; rounds: CupRound[] } {
  const out: CupRound[] = [];
  let lastBallWin = false;
  for (let r = 0; r < Math.min(3, rounds.length); r++) {
    const target = DIFFICULTY[difficulty].targets[r];
    const cur: CupRound = { round: r, runs: 0, wickets: 0, balls: 0, outcomes: [], status: "playing" };
    for (const input of rounds[r]) {
      if (cur.status !== "playing") break;
      const o = judgeCupBall(cupDelivery(seed, difficulty, r, cur.balls), input, difficulty);
      cur.outcomes.push(o);
      cur.runs += o.runs;
      cur.wickets += Number(o.wicket);
      cur.balls += 1;
      cur.status = cupRoundStatus(cur, target);
      if (cur.status === "won" && cur.balls === BALLS_PER_ROUND) lastBallWin = true;
    }
    out.push(cur);
    if (cur.status !== "won") break;
  }
  return { roundsWon: out.filter((r) => r.status === "won").length, runs: out.reduce((s, r) => s + r.runs, 0), lastBallWin, rounds: out };
}

// One-button garden mode. Every ball is automatic; the first wicket ends the innings.
export const CLASSIC_LIMIT = 1000;
export function classicDelivery(seed: string, n: number) {
  const rng = seeded(`${seed}|garden|${n}`);
  return { travelMs: Math.round(1550 - Math.min(n, 80) * 6 + rng() * 300), bounce: 0.48 + rng() * 0.18 };
}
export function judgeClassicBall(seed: string, n: number, swingMs: number | null) {
  const delivery = classicDelivery(seed, n);
  const error = swingMs == null ? null : Math.round(swingMs - delivery.travelMs);
  const distance = error == null ? Infinity : Math.abs(error);
  const runs = distance <= 48 ? 6 : distance <= 100 ? 4 : distance <= 160 ? 2 : distance <= 215 ? 1 : 0;
  return { runs, wicket: runs === 0, errorMs: error, label: runs === 6 ? "SIX!" : runs === 4 ? "FOUR!" : runs ? `${runs} run${runs === 1 ? "" : "s"}` : "BOWLED!" };
}
export function replayClassic(seed: string, swings: (number | null)[]) {
  let runs = 0, balls = 0, wicket = false;
  for (const swing of swings.slice(0, CLASSIC_LIMIT)) {
    if (wicket) break;
    const outcome = judgeClassicBall(seed, balls, swing);
    runs += outcome.runs; balls++; wicket = outcome.wicket;
  }
  return { runs, balls, wicket, finished: wicket || balls === CLASSIC_LIMIT };
}
