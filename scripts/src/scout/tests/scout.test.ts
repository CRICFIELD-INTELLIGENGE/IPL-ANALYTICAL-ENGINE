import { test } from "node:test";
import assert from "node:assert/strict";
import { openGlobalDb, one, all } from "../../global/db";
import { aggregateCompetition } from "../../global/aggregate";
import { fixture, load, registry } from "../../global/tests/fixture";
import { battingRole, bowlingRole, usageProfile, buildCompetitionRoles, type BattingInputs, type BowlingInputs } from "../roles";
import { bowlingType, effectiveBowlingType } from "../enrichment";
import { percentileRanks, ratePlayers, shrink } from "../service";
import { applyScoutSchema } from "../build";

const bat = (o: Partial<BattingInputs>): BattingInputs => ({ innings: 10, openShare: 0, medianPosition: 5, medianEntryBall: 50, ballsFaced: 100, deathShare: 0.2, powerplayShare: 0.1, ...o });
const bowl = (o: Partial<BowlingInputs>): BowlingInputs => ({ innings: 10, legalBalls: 240, oversPerInnings: 4, powerplayShare: 0.3, middleShare: 0.45, deathShare: 0.25, newBallShare: 0, ...o });

test("batting roles follow the documented order", () => {
  assert.equal(battingRole(bat({ innings: 2 })), "insufficient");
  assert.equal(battingRole(bat({ openShare: 0.6, medianPosition: 2, medianEntryBall: 0 })), "opener");
  assert.equal(battingRole(bat({ medianPosition: 9, medianEntryBall: 110 })), "lower_order", "a tail-ender is not a finisher");
  assert.equal(battingRole(bat({ medianPosition: 6, medianEntryBall: 80 })), "finisher");
  assert.equal(battingRole(bat({ medianPosition: 5, medianEntryBall: 60, deathShare: 0.55 })), "finisher", "half the balls at the death from No. 5+");
  assert.equal(battingRole(bat({ medianPosition: 3, medianEntryBall: 20 })), "top_order");
  assert.equal(battingRole(bat({ medianPosition: 4, medianEntryBall: 50 })), "middle_order");
});

test("bowling roles scale with phase length", () => {
  assert.equal(bowlingRole(bowl({ legalBalls: 0 })), "none");
  assert.equal(bowlingRole(bowl({ legalBalls: 50 })), "insufficient");
  assert.equal(bowlingRole(bowl({ oversPerInnings: 1 })), "part_time");
  assert.equal(bowlingRole(bowl({ powerplayShare: 0.55, middleShare: 0.25, deathShare: 0.2 })), "powerplay_specialist");
  assert.equal(bowlingRole(bowl({ powerplayShare: 0.1, middleShare: 0.8, deathShare: 0.1 })), "middle_specialist");
  assert.equal(bowlingRole(bowl({ powerplayShare: 0.3, middleShare: 0.28, deathShare: 0.42 })), "death_specialist", "42% of balls at the death is 1.7× an even spread");
  assert.equal(bowlingRole(bowl({ powerplayShare: 0.55, middleShare: 0.0, deathShare: 0.45 })), "multi_phase", "two concentrated phases");
  assert.equal(bowlingRole(bowl({ powerplayShare: 0.25, middleShare: 0.57, deathShare: 0.18 })), "multi_phase", "57% middle is below the 72% bar");
});

test("usage profiles", () => {
  assert.equal(usageProfile("middle_order", "middle_specialist", 0), "all_rounder");
  assert.equal(usageProfile("opener", "none", 3), "keeper_batter");
  assert.equal(usageProfile("lower_order", "death_specialist", 0), "bowler");
  assert.equal(usageProfile("insufficient", "insufficient", 0), "limited");
});

test("percentiles are mid-rank, tie-aware and direction-aware", () => {
  assert.deepEqual(percentileRanks([10, 20, 30], "higher"), [0, 50, 100]);
  assert.deepEqual(percentileRanks([10, 20, 30], "lower"), [100, 50, 0]);
  assert.deepEqual(percentileRanks([5, 5, 9, null], "higher"), [25, 25, 100, null]);
});

test("shrinkage pulls small samples toward league average", () => {
  assert.equal(shrink(150, 0), 100);
  assert.equal(shrink(150, 120), 125);
  assert.ok(Math.abs(shrink(150, 600)! - 141.67) < 0.01);
  assert.ok(shrink(190, 35)! < shrink(155, 600)!, "a 35-ball hot streak does not outrank a sustained 600-ball record");
});

test("bowling style classification never guesses", () => {
  assert.equal(bowlingType("Legbreak Googly"), "spin");
  assert.equal(bowlingType("LEFT ARM Slow Orthodox"), "spin");
  assert.equal(bowlingType("Left arm Wrist spin"), "spin");
  assert.equal(bowlingType("RIGHT ARM Fast Medium"), "pace");
  assert.equal(bowlingType("Right arm Medium, Right arm Offbreak"), "mixed");
  assert.equal(bowlingType("Right arm Bowler"), "unknown");
  const exact = { value: "Legbreak", normalized: "spin", source: "ipl_player_bio", confidence: "exact" };
  const corr = { value: "RIGHT ARM Leg Spin", normalized: "spin", source: "ipl_auction_2026", confidence: "corroborated_unreviewed" };
  assert.equal(effectiveBowlingType([corr, exact]).confidence, "exact");
  assert.equal(effectiveBowlingType([exact, { ...corr, normalized: "pace" }]).type, "conflict");
  assert.equal(effectiveBowlingType([]).type, "unknown");
});

test("roles and league-adjusted ratings on the fixture match", () => {
  const db = openGlobalDb(":memory:");
  load(db, "tst", { 9000001: fixture(registry("a")) });
  aggregateCompetition(db, 1, "tst");
  applyScoutSchema(db);
  buildCompetitionRoles(db, 1);
  const pos = (n: string) => ({ ...one<{ position: number; entry_legal_ball: number }>(db, `SELECT position, entry_legal_ball FROM scout_batting_innings b
    JOIN player_names pn ON pn.player_key = b.player_key AND pn.origin = 'match' WHERE pn.name = ?`, n)! });
  assert.deepEqual(pos("a1"), { position: 1, entry_legal_ball: 0 });
  assert.deepEqual(pos("a2"), { position: 2, entry_legal_ball: 0 });
  assert.deepEqual(pos("a3"), { position: 3, entry_legal_ball: 5 }, "arrived after five legal balls (wide and no-ball not counted)");
  assert.equal(one<{ n: number }>(db, "SELECT new_ball n FROM scout_bowling_innings b JOIN player_names pn ON pn.player_key = b.player_key AND pn.origin = 'match' WHERE pn.name = 'b1'")!.n, 1);

  // League adjustment is unbiased: summed over every player, expected equals actual.
  for (const d of ["batting", "bowling"] as const) {
    const rs = ratePlayers(db, { discipline: d, competitions: ["tst"], minBalls: 0 });
    const main = d === "batting" ? "strike_rate" : "economy";
    const actual = rs.reduce((s, r) => s + (d === "batting" ? r.counts.runs : r.counts.runs_conceded), 0);
    const expected = rs.reduce((s, r) => s + (r.metrics[main].league ?? 0) * r.balls / (d === "batting" ? 100 : 6), 0);
    assert.ok(Math.abs(actual - expected) < 1e-9, `${d}: expected ${expected} vs actual ${actual}`);
  }
  const b1 = ratePlayers(db, { discipline: "bowling", competitions: ["tst"], minBalls: 0 }).find((r) => r.name === "b1")!;
  assert.equal(b1.balls, 6);
  assert.equal(b1.counts.runs_conceded, 17);
  assert.equal(b1.tier, "insufficient");
  assert.ok(b1.metrics.economy.ci && b1.metrics.economy.ci[0] < b1.metrics.economy.index! && b1.metrics.economy.index! < b1.metrics.economy.ci[1]);
  const coverage = all<{ status: string }>(db, "SELECT status FROM scout_coverage");
  assert.deepEqual(coverage.map((c) => c.status), ["complete"]);
});
