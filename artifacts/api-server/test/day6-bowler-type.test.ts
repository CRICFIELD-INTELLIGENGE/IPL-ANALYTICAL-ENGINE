// Day 6B — bowler type is Pacer | Spinner | Unknown in the legacy stats engine; unknown is never counted as pace.
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyBowlStyle, bowlerTypeIdSets } from "../src/services/stats-aggregator";
import { resolvePlayerId } from "../src/services/decision/player-summary";

test("classifyBowlStyle: a missing or unrecognised style is Unknown, not Pacer", () => {
  assert.equal(classifyBowlStyle(""), "Unknown");
  assert.equal(classifyBowlStyle(undefined), "Unknown");
  assert.equal(classifyBowlStyle("NULL"), "Unknown");
  assert.equal(classifyBowlStyle("Right arm Bowler"), "Unknown");
  assert.equal(classifyBowlStyle("Right arm Fast medium"), "Pacer");
  assert.equal(classifyBowlStyle("Legbreak Googly"), "Spinner");
  assert.equal(classifyBowlStyle("LEFT ARM Slow Unorthodox"), "Spinner");
  assert.equal(classifyBowlStyle("Right arm Medium, Right arm Offbreak"), "Spinner");
});

test("Bowler Type filter id sets: unknown-type players are in neither list; the two Harmeet Singhs are told apart", async () => {
  const { pacerIds, spinnerIds } = await bowlerTypeIdSets();
  const pace = new Set(pacerIds), spin = new Set(spinnerIds);
  for (const id of pacerIds) assert.ok(!spin.has(id), `player ${id} in both lists`);
  assert.ok(pace.has(761), "Harmeet Singh Bansal (2a72fd4f, verified Right arm Medium) is a pacer");
  assert.ok(!pace.has(930) && !spin.has(930), "Harmeet Singh (2) (0bf15e52) has no recorded style: Unknown");
  assert.ok(!pace.has(912) && !spin.has(912), "Nitin Saini has no recorded style: Unknown");
  assert.ok(pace.has(244), "Navdeep Saini is a pacer");
  assert.ok(spin.has(560), "Shivang Kumar (verified Left arm Slow Unorthodox) is a spinner");
});

test("a profile slug shared by a registered player and his 2026 squad stub resolves to the registered player", () => {
  assert.equal(resolvePlayerId("wanindu-hasaranga"), 331);
  assert.equal(resolvePlayerId("pwh-de-silva"), 331);
});
