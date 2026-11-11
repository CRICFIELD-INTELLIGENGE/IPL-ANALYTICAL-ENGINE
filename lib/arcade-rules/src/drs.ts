// DRS: You Decide — simulated LBW reviews.
//
// Every scenario is SIMULATED geometry generated from a seed. It is not broadcast ball-tracking.
// The ruling applies the LBW conditions of the Laws of Cricket (Law 36) with a DRS-style "umpire's call"
// using this simulation's own documented thresholds:
//
//   Coordinates are in cm, seen from the bowler, x = 0 at middle stump, positive toward OFF stump.
//   Stumps span x ∈ [-11.43, +11.43] (22.86 cm), height 71.1 cm; bails top out at 72.4 cm. Ball radius 3.6 cm.
//
//   1. Pitched outside leg (ball centre outside the leg-stump line) → NOT OUT. A full toss has no pitching point.
//   2. Impact outside the line of leg stump → NOT OUT.
//      Impact outside off stump → NOT OUT if the batter offered a shot; may be out if no shot was offered.
//      Impact "in line" = ball centre within the stump lines. Centre outside but part of the ball within → UMPIRE'S CALL.
//   3. Wickets: "hitting" = ball centre inside the zone (outer edges of the stumps, up to the top of the bails).
//      Centre outside the zone but any part of the ball would touch the stumps/bails → UMPIRE'S CALL. Otherwise missing.
//   An umpire's-call component means the on-field decision stands on that component.

import { seeded } from "./rng";

export const STUMP_HALF = 11.43, STUMP_TOP = 72.4, BALL_R = 3.6;
export type Call = "OUT" | "NOT OUT";
export type Hand = "R" | "L";

export interface DrsScenario {
  id: string;
  level: number;
  hand: Hand;
  onField: Call;
  fullToss: boolean;
  shotOffered: boolean;
  /** Distance from the batter's stumps (m) where the ball pitched; null for a full toss. */
  pitch: { x: number; distM: number } | null;
  impact: { x: number; y: number; distM: number };
  /** Predicted position when the ball reaches the stumps' plane. */
  stumps: { x: number; y: number };
}

export type Pitching = "in line" | "outside off" | "outside leg" | "full toss";
export type Impact = "in line" | "umpire's call" | "outside off" | "outside leg";
export type Wickets = "hitting" | "umpire's call" | "missing";
export interface DrsRuling { pitching: Pitching; impact: Impact; wickets: Wickets; decision: Call; reason: string; overturned: boolean }

/** Batter-relative off/leg: for a left-hander the off side is the other way, so x is mirrored. */
const offX = (x: number, hand: Hand) => (hand === "R" ? x : -x);

export function rule(s: DrsScenario): DrsRuling {
  const pitching: Pitching = !s.pitch ? "full toss" : offX(s.pitch.x, s.hand) < -STUMP_HALF ? "outside leg" : offX(s.pitch.x, s.hand) > STUMP_HALF ? "outside off" : "in line";
  const ix = offX(s.impact.x, s.hand);
  const impact: Impact = Math.abs(ix) <= STUMP_HALF ? "in line" : Math.abs(ix) - BALL_R <= STUMP_HALF ? "umpire's call" : ix > 0 ? "outside off" : "outside leg";
  const { x, y } = s.stumps;
  const wickets: Wickets = Math.abs(x) <= STUMP_HALF && y <= STUMP_TOP && y >= 0 ? "hitting" : Math.abs(x) - BALL_R <= STUMP_HALF && y - BALL_R <= STUMP_TOP ? "umpire's call" : "missing";
  const stands = s.onField;
  const done = (decision: Call, reason: string): DrsRuling => ({ pitching, impact, wickets, decision, reason, overturned: decision !== s.onField });
  if (pitching === "outside leg") return done("NOT OUT", "Pitched outside leg stump — an LBW is impossible.");
  if (impact === "outside leg") return done("NOT OUT", "Impact outside the line of leg stump.");
  if (impact === "outside off" && s.shotOffered) return done("NOT OUT", "Impact outside off stump while playing a shot.");
  if (wickets === "missing") return done("NOT OUT", "Ball-tracking (simulated) shows it missing the stumps.");
  const ucImpact = impact === "umpire's call";
  const ucWickets = wickets === "umpire's call";
  if (ucImpact || ucWickets) {
    return done(stands, `Umpire's call on ${ucImpact && ucWickets ? "impact and wickets" : ucImpact ? "impact" : "wickets"} — the on-field ${stands} decision stands.`);
  }
  if (impact === "outside off") return done("OUT", "Outside off, but no shot offered and it's hitting the stumps.");
  return done("OUT", "Pitched in line or outside off, impact in line, hitting the stumps.");
}

/** Seeded scenario. Higher levels sit closer to the decision boundaries. */
export function drsScenario(seed: string, index: number, level: number): DrsScenario {
  const rng = seeded(`${seed}|drs|${index}`);
  const tight = Math.min(1, level / 4); // 0 = obvious, 1 = marginal
  const near = (edge: number, spread: number) => edge + (rng() * 2 - 1) * spread * (1.15 - tight);
  const hand: Hand = rng() < 0.7 ? "R" : "L";
  const fullToss = rng() < 0.08;
  // Pick which condition this scenario is "about", then generate geometry around that boundary.
  const theme = Math.floor(rng() * 4);
  const side = (v: number) => (hand === "R" ? v : -v); // convert batter-relative → absolute x
  const pitchRel = fullToss ? null : theme === 0 ? near(-STUMP_HALF, 14) : rng() * 30 - 12;
  const impactRel = theme === 1 ? (rng() < 0.5 ? near(STUMP_HALF + BALL_R / 2, 9) : near(-STUMP_HALF - BALL_R / 2, 9)) : rng() * 18 - 9;
  const sx = theme === 2 ? (rng() < 0.5 ? 1 : -1) * near(STUMP_HALF + BALL_R / 2, 9) : impactRel * (0.6 + rng() * 0.6) + (rng() * 8 - 4);
  const sy = theme === 3 ? near(STUMP_TOP + BALL_R / 2, 14) : 15 + rng() * 45;
  return {
    id: `${seed}:${index}`, level, hand, fullToss,
    onField: rng() < 0.5 ? "OUT" : "NOT OUT",
    shotOffered: rng() < 0.55,
    pitch: pitchRel == null ? null : { x: round1(side(pitchRel)), distM: round1(1.5 + rng() * 4.5) },
    impact: { x: round1(side(impactRel)), y: round1(18 + rng() * 40), distM: round1(0.3 + rng() * 1.6) },
    stumps: { x: round1(side(sx)), y: round1(Math.max(4, sy)) },
  };
}
const round1 = (v: number) => Math.round(v * 10) / 10;

export const DRS_ROUNDS = 10;
export const drsLevel = (index: number) => Math.min(4, Math.floor(index / 2));

/** Points: 10 for the right final decision, +5 if the player also named the deciding reason. */
export function scoreDrs(s: DrsScenario, decision: Call, reasonKey: string | null): { correct: boolean; points: number; ruling: DrsRuling } {
  const ruling = rule(s);
  const correct = decision === ruling.decision;
  return { correct, points: correct ? 10 + (reasonKey && reasonKey === reasonKeyOf(ruling) ? 5 : 0) : 0, ruling };
}
export const REASONS = [
  { key: "pitching", label: "Pitched outside leg" },
  { key: "impact", label: "Impact outside the line" },
  { key: "wickets", label: "Missing the stumps" },
  { key: "umpires_call", label: "Umpire's call — on-field decision stands" },
  { key: "out", label: "Everything lines up — out" },
] as const;
export function reasonKeyOf(r: DrsRuling): string {
  if (r.reason.startsWith("Umpire's call")) return "umpires_call";
  if (r.decision === "OUT") return "out";
  if (r.pitching === "outside leg") return "pitching";
  if (r.wickets === "missing") return "wickets";
  return "impact";
}
