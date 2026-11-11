// Global data engine — the single definition of every cricket metric.
//
// aggregate.ts counts with these predicates, the v_* views in schema.sql turn
// the counts into rates with the same formulas, and tests/metrics.test.ts pins
// both. Change a definition here and in schema.sql together.

export type Phase = "powerplay" | "middle" | "death";
export const PHASES: Phase[] = ["powerplay", "middle", "death"];

/** Dismissal kinds credited to the bowler. Run outs, retirements and obstruction are not. */
export const BOWLER_WICKET_KINDS = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);

/** Kinds that end a batter's innings without counting as a dismissal or a team wicket. */
export const NOT_A_DISMISSAL = new Set(["retired hurt", "retired not out"]);

export const isDismissal = (kind: string) => !NOT_A_DISMISSAL.has(kind);
export const isBowlerWicket = (kind: string) => BOWLER_WICKET_KINDS.has(kind);

/**
 * Phase of an over (0-based over number, as stored).
 * T20 (6-ball overs): powerplay overs 1–6, middle 7–15, death 16–20 — the site's existing convention.
 * 100-ball (5-ball sets): powerplay balls 1–25 (sets 1–5), middle 26–75, death 76–100.
 * Shortened matches keep the same over boundaries.
 */
export function phaseOf(overNo: number, ballsPerOver: number): Phase {
  const powerplayEnd = ballsPerOver === 5 ? 5 : 6;
  if (overNo < powerplayEnd) return "powerplay";
  if (overNo < 15) return "middle";
  return "death";
}

export interface Ball {
  runsBatter: number;
  runsTotal: number;
  nonBoundary: boolean;
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  penalty: number;
}

/** A ball faced by the batter: every delivery except a wide (no-balls are faced). */
export const isFaced = (b: Ball) => b.wides === 0;
/** A legal delivery for the bowler: neither a wide nor a no-ball. */
export const isLegal = (b: Ball) => b.wides === 0 && b.noballs === 0;
/** Runs charged to the bowler: off the bat plus wides and no-balls (byes, leg-byes and penalties are not). */
export const runsConceded = (b: Ball) => b.runsBatter + b.wides + b.noballs;
export const isFour = (b: Ball) => b.runsBatter === 4 && !b.nonBoundary;
export const isSix = (b: Ball) => b.runsBatter === 6 && !b.nonBoundary;
/** Batting dot: a ball faced with no runs off the bat. */
export const isBattingDot = (b: Ball) => isFaced(b) && b.runsBatter === 0;
/** Bowling dot: a legal ball with nothing charged to the bowler (byes and leg-byes still count as dots). */
export const isBowlingDot = (b: Ball) => isLegal(b) && runsConceded(b) === 0;

const ratio = (num: number, den: number, scale = 1) => (den > 0 ? (scale * num) / den : null);

export const strikeRate = (runs: number, ballsFaced: number) => ratio(runs, ballsFaced, 100);
export const battingAverage = (runs: number, dismissals: number) => ratio(runs, dismissals);
export const economy = (conceded: number, legalBalls: number) => ratio(conceded, legalBalls, 6);
export const bowlingAverage = (conceded: number, wickets: number) => ratio(conceded, wickets);
export const bowlingStrikeRate = (legalBalls: number, wickets: number) => ratio(legalBalls, wickets);
export const percentage = (part: number, whole: number) => ratio(part, whole, 100);

/** Sample tiers used for ranking (balls faced for batters, legal balls for bowlers). */
export const RANKABLE_BALLS = 120;
export const LOW_CONFIDENCE_BALLS = 60;
export function sampleTier(balls: number): "rankable" | "low" | "insufficient" {
  return balls >= RANKABLE_BALLS ? "rankable" : balls >= LOW_CONFIDENCE_BALLS ? "low" : "insufficient";
}

/** Wilson score interval for a proportion (e.g. dot % or boundary %), as percentages. */
export function wilsonInterval(successes: number, n: number, z = 1.96): { low: number; high: number } | null {
  if (n <= 0) return null;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: 100 * Math.max(0, centre - half), high: 100 * Math.min(1, centre + half) };
}
