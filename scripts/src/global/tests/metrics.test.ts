import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type Ball, economy, isBattingDot, isBowlerWicket, isBowlingDot, isDismissal, isFaced, isFour, isLegal, isSix, phaseOf, runsConceded,
  sampleTier, strikeRate, wilsonInterval,
} from "../metrics";

const ball = (o: Partial<Ball>): Ball => ({ runsBatter: 0, runsTotal: 0, nonBoundary: false, wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0, ...o });

test("faced and legal deliveries", () => {
  assert.equal(isFaced(ball({ wides: 1, runsTotal: 1 })), false, "a wide is not faced");
  assert.equal(isFaced(ball({ noballs: 1, runsTotal: 1 })), true, "a no-ball is faced");
  assert.equal(isLegal(ball({ noballs: 1 })), false);
  assert.equal(isLegal(ball({ legbyes: 1, runsTotal: 1 })), true, "leg-byes are legal deliveries");
});

test("runs conceded exclude byes, leg-byes and penalties", () => {
  assert.equal(runsConceded(ball({ runsBatter: 4, noballs: 1, runsTotal: 5 })), 5);
  assert.equal(runsConceded(ball({ wides: 5, runsTotal: 5 })), 5, "wides that run to the boundary are all charged");
  assert.equal(runsConceded(ball({ byes: 4, runsTotal: 4 })), 0);
  assert.equal(runsConceded(ball({ legbyes: 1, runsTotal: 1 })), 0);
  assert.equal(runsConceded(ball({ penalty: 5, runsTotal: 5 })), 0);
});

test("boundaries respect non_boundary", () => {
  assert.equal(isFour(ball({ runsBatter: 4 })), true);
  assert.equal(isFour(ball({ runsBatter: 4, nonBoundary: true })), false, "four runs taken by running is not a boundary");
  assert.equal(isSix(ball({ runsBatter: 6 })), true);
});

test("dots", () => {
  assert.equal(isBattingDot(ball({ legbyes: 1, runsTotal: 1 })), true, "no runs off the bat");
  assert.equal(isBowlingDot(ball({ byes: 2, runsTotal: 2 })), true, "byes are a dot for the bowler");
  assert.equal(isBowlingDot(ball({ wides: 1, runsTotal: 1 })), false);
});

test("dismissal kinds", () => {
  assert.equal(isDismissal("retired hurt"), false);
  assert.equal(isDismissal("retired not out"), false);
  assert.equal(isDismissal("retired out"), true);
  assert.equal(isBowlerWicket("run out"), false);
  assert.equal(isBowlerWicket("retired out"), false);
  assert.equal(isBowlerWicket("stumped"), true);
  assert.equal(isBowlerWicket("caught and bowled"), true);
});

test("phases for 6-ball overs and 5-ball sets", () => {
  assert.deepEqual([0, 5, 6, 14, 15, 19].map((o) => phaseOf(o, 6)), ["powerplay", "powerplay", "middle", "middle", "death", "death"]);
  assert.deepEqual([0, 4, 5, 14, 15].map((o) => phaseOf(o, 5)), ["powerplay", "powerplay", "middle", "middle", "death"]);
});

test("rates, tiers and intervals", () => {
  assert.equal(strikeRate(150, 100), 150);
  assert.equal(strikeRate(10, 0), null);
  assert.equal(economy(30, 24), 7.5);
  assert.equal(sampleTier(119), "low");
  assert.equal(sampleTier(120), "rankable");
  assert.equal(sampleTier(59), "insufficient");
  const w = wilsonInterval(30, 100)!;
  assert.ok(w.low < 30 && w.high > 30 && w.low > 20 && w.high < 40);
  assert.equal(wilsonInterval(0, 0), null);
});
