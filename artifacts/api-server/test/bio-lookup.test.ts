// Day 4.6 — stats-aggregator's player-bio lookup resolves written names by Cricsheet registry identity.
//
//   pnpm --filter @workspace/api-server test
//
// Unit cases use shapes from real collisions; the real-data test checks every IPL written name against the shipped
// bios, identity index and raw files: the lookup never returns another player's bio.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBioLookup, lookupBioKey } from "../src/services/player-bio-lookup";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const DATA = path.join(REPO, "artifacts", "ipl-analytics", "public", "data");
const RAW = path.join(REPO, "lib", "cricket-data", "raw");

test("lookup: registry identity, never initial + surname", () => {
  const bios = {
    "k-yadav": { playerId: "1", playerName: "K Yadav", bowlStyle: "Right arm Medium" },
    "kuldeep-yadav": { playerId: "2", playerName: "Kuldeep Yadav", bowlStyle: "Left arm Wrist spin" },
    "n-saini": { playerId: "3", playerName: "N Saini", fullName: "Nitin Saini" },
    "navdeep-saini": { playerId: "4", playerName: "Navdeep Saini" },
    "harmeet-singh": { playerId: "5", playerName: "Harmeet Singh" },
    "cooper-connolly": { playerName: "Cooper Connolly", team: "Punjab Kings" },
  };
  const keys = { "k-yadav": ["id-k", 1], "kuldeep-yadav": ["id-kuldeep", 1], "n-saini": ["id-nitin", 1], "navdeep-saini": ["id-navdeep", 1], "harmeet-singh": ["id-h1", 1] } as Record<string, [string, number]>;
  const registries = [
    { "K Yadav": "id-k", "Kuldeep Yadav": "id-kuldeep", "N Saini": "id-nitin" },
    { "Navdeep Saini": "id-navdeep", "NA Saini": "id-navdeep" },
    { "Harmeet Singh": "id-h1" }, { "Harmeet Singh": "id-h2" }, // a written name shared by two players
    { "C Connolly": "id-connolly" },                             // a 2026 player with no verified bio
  ];
  const squads = { "2026": { "Punjab Kings": [{ name: "Cooper Connolly", cricsheetName: "C Connolly" }] } };
  const idx = buildBioLookup(bios, keys, registries, squads);
  assert.equal(lookupBioKey("Kuldeep Yadav", idx).key, "kuldeep-yadav");   // old lookup: k-yadav (K + Yadav)
  assert.equal(lookupBioKey("N Saini", idx).key, "n-saini");
  assert.equal(lookupBioKey("NA Saini", idx).key, "navdeep-saini");         // old lookup: n-saini
  assert.equal(lookupBioKey("Harmeet Singh", idx).key, undefined);          // shared: unknown, not a guess
  assert.equal(lookupBioKey("C Connolly", idx).key, "cooper-connolly");     // squad row of the bio's own franchise
  assert.equal(lookupBioKey("C Connolly", buildBioLookup(bios, keys, registries, {})).key, undefined);
  assert.equal(lookupBioKey("Nitin Saini", idx).key, "n-saini");            // not a written name: exact fullName
  assert.equal(lookupBioKey("Saini", idx).key, undefined);
});

test("lookup on the shipped data: no IPL written name resolves to another player's bio", () => {
  const bios = JSON.parse(fs.readFileSync(path.join(DATA, "player-bio.json"), "utf8"));
  const keys = JSON.parse(fs.readFileSync(path.join(DATA, "player-recent-matches", "index.json"), "utf8")).keys as Record<string, [string, number]>;
  const squads = JSON.parse(fs.readFileSync(path.join(DATA, "squads-by-season.json"), "utf8"));
  const registries: Record<string, string>[] = [];
  for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith(".json"))) registries.push(JSON.parse(fs.readFileSync(path.join(RAW, f), "utf8")).info.registry.people);
  const idx = buildBioLookup(bios, keys, registries, squads);
  const wrong: string[] = [];
  let resolved = 0, unknown = 0;
  for (const [name, ids] of idx.nameToIds) {
    const { key, method } = lookupBioKey(name, idx);
    if (!key) { unknown++; continue; }
    resolved++;
    if (method === "registry" && keys[key]?.[0] !== [...ids][0]) wrong.push(`${name} → ${key}`);
    if (method === "squad mapping (unverified bio)" && keys[key]) wrong.push(`${name} → ${key} (verified elsewhere)`);
  }
  assert.deepEqual(wrong, []);
  // Every registry id with a verified bio is reached; unknowns are only shared names or players with no bio.
  assert.ok(resolved >= 790, `resolved ${resolved}`);
  for (const [name, ids] of idx.nameToIds) if (ids.size === 1 && idx.idToKey.has([...ids][0])) assert.ok(lookupBioKey(name, idx).key, name);
  // The cases fixed on Day 4.6.
  const at = (n: string) => lookupBioKey(n, idx).key;
  assert.equal(at("Kuldeep Yadav"), "kuldeep-yadav");
  assert.equal(at("RK Singh"), "rk-singh");
  assert.equal(at("Navdeep Saini"), "navdeep-saini");
  assert.equal(at("N Saini"), "n-saini");
  assert.equal(at("PWH de Silva"), "wanindu-hasaranga");
  assert.equal(at("Harmeet Singh"), undefined);
  assert.equal(bios["wanindu-hasaranga"].bowlStyle, "Legbreak");
});
