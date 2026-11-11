// Day 6 — the decision layer's player metadata (player-profiles.ts getPlayerMeta) resolves people by Cricsheet
// registry identity. The initial+surname fallback is gone; ambiguous names leave fields unknown.
//
//   pnpm --filter @workspace/api-server test
//
// Real-data cases are the collisions found on Day 4.6 / Day 6 (DAY-06-REPORT.md §A).

import { test } from "node:test";
import assert from "node:assert/strict";
import { getPlayerMeta } from "../src/services/decision/player-profiles";
import { queryAll } from "../src/services/decision/db";

const meta = getPlayerMeta();
const byId = (id: number) => {
  const m = meta.get(id);
  assert.ok(m, `player ${id} missing`);
  return m!;
};

test("Nitin Saini (N Saini, addbde6c) no longer inherits Navdeep Saini's bowling style", () => {
  const nitin = byId(912);
  assert.equal(nitin.name, "N Saini");
  assert.equal(nitin.fullName, "Nitin Saini");
  assert.equal(nitin.bowlingStyle, null); // his own records carry no bowling style; the auction "Navdeep Saini" row is not his
  assert.equal(nitin.bowlingType, "unknown");
  const navdeep = byId(244);
  assert.equal(navdeep.bowlingStyle, "Right arm Fast");
  assert.equal(navdeep.bowlingType, "pace");
});

test("the two Harmeet Singhs keep separate identities: only Bansal (2a72fd4f) has the verified bio", () => {
  const rows = queryAll<{ player_id: number; cricsheet_id: string }>(
    "SELECT player_id, cricsheet_id FROM players WHERE player_id IN (761, 930) ORDER BY player_id",
  );
  assert.deepEqual(rows.map((r) => r.cricsheet_id), ["2a72fd4f", "0bf15e52"]);
  const bansal = byId(761);
  assert.equal(bansal.fullName, "Harmeet Singh Bansal");
  assert.equal(bansal.bowlingStyle, "Right arm Medium");
  const rr2013 = byId(930); // Rajasthan Royals 2013, Cricinfo 422847: no record of his own in the repository
  assert.equal(rr2013.fullName, null);
  assert.equal(rr2013.bowlingStyle, null);
  assert.equal(rr2013.battingHand, null);
  assert.equal(rr2013.bowlingType, "unknown");
});

test("R Bishnoi (4d5a1617) is Rajesh Bishnoi, not Ravi Bishnoi", () => {
  const r = byId(762);
  assert.equal(r.fullName, "Rajesh Bishnoi");
  assert.equal(r.bowlingStyle, "Right arm Medium fast");
});

test("a verified bio supplies nationality: PWH de Silva is Sri Lankan and overseas", () => {
  const h = byId(331);
  assert.equal(h.country, "Sri Lanka");
  assert.equal(h.overseas, true);
  assert.equal(h.bowlingType, "spin");
});

test("no two registered players share a full name (no record is applied to two people)", () => {
  const ids = new Map(
    queryAll<{ player_id: number; cricsheet_id: string | null }>("SELECT player_id, cricsheet_id FROM players").map((r) => [r.player_id, r.cricsheet_id]),
  );
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const m of meta.values()) {
    const cid = ids.get(m.playerId);
    if (!m.fullName || !cid || cid.startsWith("json:")) continue; // squad stubs may duplicate a registered player (reported, not merged)
    const prev = seen.get(m.fullName);
    if (prev !== undefined) dupes.push(`${m.fullName}: ${prev} & ${m.playerId}`);
    seen.set(m.fullName, m.playerId);
  }
  assert.deepEqual(dupes, []);
});

test("bowling type is pace, spin, none or unknown — an unresolved style is never counted as pace", () => {
  for (const m of meta.values()) {
    assert.ok(["pace", "spin", "none", "unknown"].includes(m.bowlingType), `${m.name}: ${m.bowlingType}`);
    if (m.bowlingType === "pace" && !m.bowlingStyle) {
      // pace without a style string is allowed only from recorded ball speeds (delivery_commentary)
      const [row] = queryAll<{ n: number }>(
        "SELECT COUNT(*) n FROM delivery_commentary dc JOIN deliveries d ON d.delivery_id = dc.delivery_id WHERE d.bowler_id = ? AND dc.speed_kph > 60",
        m.playerId,
      );
      assert.ok(row.n >= 6, `${m.name} is pace with no style and no speed evidence`);
    }
  }
});
