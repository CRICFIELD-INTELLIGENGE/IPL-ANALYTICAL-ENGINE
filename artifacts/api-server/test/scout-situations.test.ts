// Scout Lab "Under Pressure" situation buckets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITUATIONS, situationsOf, stageBucket, type BallCtx } from "../src/services/pressure/situations";

const ids = (b: Partial<BallCtx>) => situationsOf({
  over: 0, innings: 1, runsBefore: 0, legalBefore: 0, wktsBefore: 0, target: null, targetBalls: 120,
  bowlerType: null, batterHand: null, stage: null, position: 1, ...b,
}).map(i => SITUATIONS[i].id);

test("first-innings powerplay opener vs spin", () => {
  assert.deepEqual(ids({ bowlerType: "spin", batterHand: "left", stage: 0 }), ["all", "powerplay", "setting", "vs_spin", "vs_left", "stage_early", "pos_open"]);
});

test("tight chase in the last 5 overs is clutch, high pressure and rrr 10-12", () => {
  // 50 needed off 27 balls (11.1 an over), 4 down, over 16
  const r = ids({ over: 15, innings: 2, runsBefore: 130, legalBefore: 93, wktsBefore: 4, target: 180, position: 5, stage: 3 });
  assert.deepEqual(r, ["all", "death", "clutch", "pressure", "rrr_10_12", "stage_ko", "pos_5"]);
});

test("a dead chase (needing 20 an over) is not clutch; won chases get no rrr bucket", () => {
  assert.ok(!ids({ over: 16, innings: 2, runsBefore: 100, legalBefore: 100, target: 167 }).includes("clutch"));
  const won = ids({ over: 18, innings: 2, runsBefore: 180, legalBefore: 110, target: 180 });
  assert.ok(!won.some(i => i.startsWith("rrr")) && !won.includes("clutch"));
});

test("collapse counts as pressure in the middle overs; position 8+ grouped", () => {
  const r = ids({ over: 7, runsBefore: 30, wktsBefore: 3, position: 9 });
  assert.ok(r.includes("pressure") && r.includes("middle") && r.includes("pos_8"));
});

test("knockout stage names", () => {
  for (const s of ["Final", "Qualifier 1", "Eliminator", "Semi-final", "3rd Place Play-Off"]) assert.equal(stageBucket(s), 3, s);
  for (const s of [null, "Super League", "First Round", "Super 10"]) assert.equal(stageBucket(s), null, String(s));
});
