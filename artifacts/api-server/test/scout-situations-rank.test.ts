// Scout Lab "Under Pressure" ranking (the browser module, run here on a hand-made snapshot).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSituation, type SituationData } from "../../ipl-analytics/src/lib/scout-situations";

const d: SituationData = {
  comp: "x", seasons: ["2024", "2025"],
  players: [["a", "A", "pace", "right"], ["b", "B", "spin", "left"], ["c", "C", "", ""]],
  rows: [
    // player, season, role, situation, balls, runs, outs, dots, boundaries
    [0, 0, 0, 5, 100, 160, 2, 30, 15],
    [1, 0, 0, 5, 100, 120, 5, 40, 10],
    [1, 1, 0, 5, 100, 140, 4, 35, 12],
    [2, 0, 0, 5, 10, 30, 0, 2, 3],   // below min balls
    [0, 0, 1, 5, 100, 999, 9, 0, 0], // bowling row, ignored for batting
    [0, 0, 0, 1, 100, 999, 0, 0, 0], // other situation, ignored
  ],
};

test("ranks by shrunk runs above situation average, honours seasons and min balls", () => {
  const { rows, baseline } = rankSituation(d, 0, 5, new Set([0]), 20);
  assert.deepEqual(baseline, { balls: 210, runs: 310, outs: 7 });
  assert.deepEqual(rows.map(r => r.name), ["A", "B"]);
  // A: rpb 310/210, opb 7/210, wicket = (310/7)/2; raw = 100*((160-100*rpb) - w*(2-100*opb))/100
  const rpb = 310 / 210, opb = 7 / 210, w = 310 / 7 / 2;
  const raw = (160 - 100 * rpb) - w * (2 - 100 * opb);
  assert.ok(Math.abs(rows[0].impact - raw * (100 / 160)) < 1e-9);
  assert.ok(rows[1].impact < 0);
  const both = rankSituation(d, 0, 5, new Set([0, 1]), 20).rows.find(r => r.name === "B")!;
  assert.equal(both.balls, 200);
});

test("each season is compared with its own average", () => {
  // Same player output in a low-scoring and a high-scoring season: only the low-scoring one is above par.
  const s: SituationData = { ...d, rows: [[0, 0, 0, 0, 100, 150, 3, 0, 0], [1, 0, 0, 0, 100, 100, 3, 0, 0], [1, 1, 0, 0, 100, 150, 3, 0, 0], [2, 1, 0, 0, 100, 200, 3, 0, 0]] };
  const r = rankSituation(s, 0, 0, new Set([0, 1]), 1).rows;
  assert.ok(r.find(x => x.name === "A")!.impact > 0);
  assert.ok(r.find(x => x.name === "B")!.impact < 0);
});

test("bowling flips the sign: fewer runs and more wickets rank higher", () => {
  const b: SituationData = { ...d, rows: [[0, 0, 1, 0, 120, 140, 6, 50, 10], [1, 0, 1, 0, 120, 200, 2, 30, 20]] };
  assert.deepEqual(rankSituation(b, 1, 0, new Set([0]), 1).rows.map(r => r.name), ["A", "B"]);
});
