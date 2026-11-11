import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPulseModel } from "./pulse-auction";
import type { AuctionRecord } from "./aggregates";

test("2016 archive preserves defunct franchises and reconciles all purchases", () => {
  const records = JSON.parse(fs.readFileSync(new URL("../../public/data/player-auctions.json", import.meta.url), "utf8")) as AuctionRecord[];
  const model = buildPulseModel(2016, records, {}, {});
  for (const name of ["Gujarat Lions", "Rising Pune Supergiant"]) {
    const team = model.teams.find(t => t.code === name);
    assert.ok(team && team.purchases.length > 0, name);
    assert.ok(team.purchases.every(p => p.team === name));
  }
  assert.equal(model.teams.reduce((sum, t) => sum + t.purchases.length, 0), model.sold);
  assert.equal(model.teams.reduce((sum, t) => sum + (t.spent ?? 0), 0), model.spent);
  assert.ok(!model.teams.some(t => t.code === "GT" || t.code === "LSG"));
});

test("USD archive spending is conserved across historical franchise boards", () => {
  const records = JSON.parse(fs.readFileSync(new URL("../../public/data/player-auctions.json", import.meta.url), "utf8")) as AuctionRecord[];
  const model = buildPulseModel(2008, records, {}, {});
  assert.ok(model.teams.some(t => t.code === "Deccan Chargers"));
  assert.equal(model.teams.reduce((sum, t) => sum + (t.spentUsd ?? 0), 0), model.spentUsd);
});
