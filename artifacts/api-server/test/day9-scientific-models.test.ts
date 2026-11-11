// Day 9 — CricField Scientific Models: Bayesian True Talent, Markov Win Probability, and Archetypes
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeBayesianTrueTalent,
  computePlayerDna,
  computeMarkovWinProbability,
  normalCdf,
} from "../src/services/scout/true-talent-model";

test("Bayesian True Talent: null/zero ball input returns null metrics gracefully", () => {
  const result = computeBayesianTrueTalent("strike_rate", null, 0, "batting");
  assert.equal(result.trueTalent, null);
  assert.equal(result.credibleInterval, null);
  assert.equal(result.skillRatio, null);
  assert.ok(result.kBayes > 0);
});

test("Bayesian True Talent: estimates regress toward 100 with skill vs luck decomposition", () => {
  // Raw strike rate index 160 on 60 balls
  const result = computeBayesianTrueTalent("strike_rate", 160, 60, "batting");
  assert.ok(result.trueTalent! > 100 && result.trueTalent! < 160, "True talent must be shrunk toward 100");
  assert.ok(result.skillRatio! > 0 && result.skillRatio! < 1, "Skill ratio is bounded in (0, 1)");
  assert.equal(Math.round((result.skillRatio! + result.luckRatio!) * 100) / 100, 1, "Skill + luck must sum to 1");
  assert.ok(result.credibleInterval![0] < result.trueTalent!, "CI low is below posterior mean");
  assert.ok(result.credibleInterval![1] > result.trueTalent!, "CI high is above posterior mean");
  assert.ok(result.sustainabilityProb! > 0.5, "Index above 100 has > 50% sustainability");
});

test("Bayesian True Talent: more balls increase skill ratio and narrow credible interval", () => {
  const smallSample = computeBayesianTrueTalent("strike_rate", 140, 50, "batting");
  const largeSample = computeBayesianTrueTalent("strike_rate", 140, 500, "batting");

  assert.ok(largeSample.skillRatio! > smallSample.skillRatio!, "Larger sample has higher skill confidence");
  const smallCiWidth = smallSample.credibleInterval![1] - smallSample.credibleInterval![0];
  const largeCiWidth = largeSample.credibleInterval![1] - largeSample.credibleInterval![0];
  assert.ok(largeCiWidth < smallCiWidth, "Larger sample yields narrower credible interval");
});

test("Normal CDF approximation accuracy", () => {
  assert.equal(Math.round(normalCdf(0) * 100) / 100, 0.5);
  assert.equal(Math.round(normalCdf(1.96) * 1000) / 1000, 0.975);
  assert.equal(Math.round(normalCdf(-1.96) * 1000) / 1000, 0.025);
});

test("Markov Win Probability: edge cases and boundary conditions", () => {
  // Runs needed <= 0 -> 100%
  const won = computeMarkovWinProbability(0, 10, 5);
  assert.equal(won.winProbability, 1.0);

  // Balls exhausted with runs needed -> 0%
  const lostBalls = computeMarkovWinProbability(5, 0, 5);
  assert.equal(lostBalls.winProbability, 0.0);

  // All wickets lost -> 0%
  const lostWickets = computeMarkovWinProbability(20, 12, 0);
  assert.equal(lostWickets.winProbability, 0.0);
});

test("Markov Win Probability: 24 required off 12 balls with 5 wickets", () => {
  const chase = computeMarkovWinProbability(24, 12, 5, 165);
  assert.equal(chase.requiredRunRate, 12.0);
  assert.ok(chase.winProbability > 0.05 && chase.winProbability < 0.65, "Prob should reflect realistic T20 chase");
  assert.ok(["pressure", "critical", "balanced"].includes(chase.chasePhase));
  assert.equal(chase.simulatedPathsCount, 1000);
});

test("Player DNA Fingerprint: deterministic archetype mapping", () => {
  const battingMetrics = {
    strike_rate: { value: 165, index: 125, shrunk: 122 },
    boundary_pct: { value: 24, index: 135, shrunk: 130 },
    dot_pct: { value: 30, index: 85, shrunk: 88 },
    balls_per_dismissal: { value: 32, index: 110, shrunk: 108 },
  };

  const dna = computePlayerDna("batting", "finisher", battingMetrics);
  assert.ok(dna.archetypeLabel.length > 0);
  assert.ok(dna.dimensions.powerplayVelocity >= 10 && dna.dimensions.powerplayVelocity <= 100);
  assert.ok(dna.dimensions.deathImpact >= 10 && dna.dimensions.deathImpact <= 100);
});
