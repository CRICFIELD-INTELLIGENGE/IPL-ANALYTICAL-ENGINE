// Decision Intelligence OS — expected match impact.
//
// Impact is measured in runs above an average IPL player, per match:
//
//   batting  = runs − balls × leagueRPB − (outs − balls / leagueBallsPerOut) × W
//   bowling  = balls × leagueRPB − runsConceded + (wickets − balls / leagueBallsPerWkt) × W
//
// W (the run value of a wicket) is a quarter of that season's runs per
// wicket (~6.5 runs). Seasons are recency-weighted (×0.55 per year back) and
// the per-match rate is shrunk toward a slightly-below-average prior so a
// player with three good games does not outrank a proven performer.

import {
  getBaselines,
  getSeasonLines,
  getUsage,
  recencyWeight,
  type UsageProfile,
} from "./player-profiles";

const SHRINK_MATCHES = 4;
const PRIOR_RUNS_PER_MATCH = -1.5;

export type Confidence = "high" | "medium" | "low";

export interface ImpactEstimate {
  batting: number;
  bowling: number;
  total: number;
  sampleMatches: number;
  confidence: Confidence;
  usage: UsageProfile;
}

export function estimateImpact(playerId: number, targetSeason: string): ImpactEstimate {
  const usage = getUsage(playerId, targetSeason);
  const baselines = getBaselines();
  const lines = getSeasonLines().get(playerId) ?? [];

  let bat = 0, bowl = 0, m = 0;
  for (const l of lines) {
    const w = recencyWeight(l.season, targetSeason);
    const b = baselines.get(l.season);
    if (w === 0 || !b) continue;
    const wicketValue = 0.25 * b.batRunsPerBall * b.batBallsPerOut;
    bat += w * (l.batRuns - l.batBalls * b.batRunsPerBall - (l.batOuts - l.batBalls / b.batBallsPerOut) * wicketValue);
    bowl += w * (l.bowlBalls * b.bowlRunsPerBall - l.bowlRuns + (l.wickets - l.bowlBalls / b.bowlBallsPerWicket) * wicketValue);
    m += w * l.matches;
  }

  const batting = (bat + SHRINK_MATCHES * PRIOR_RUNS_PER_MATCH) / (m + SHRINK_MATCHES);
  // Part-timers who almost never bowl get no bowling credit or penalty.
  const bowling = usage.bowlingCapacity > 0
    ? (bowl + SHRINK_MATCHES * PRIOR_RUNS_PER_MATCH) / (m + SHRINK_MATCHES)
    : 0;

  const confidence: Confidence = m >= 10 ? "high" : m >= 4 ? "medium" : "low";
  return {
    batting: round(batting),
    bowling: round(bowling),
    total: round(batting + bowling),
    sampleMatches: round(m),
    confidence,
    usage,
  };
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
