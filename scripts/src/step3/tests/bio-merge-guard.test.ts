// Day 3 — guards against wrong player merges and duplicate bios.
//
//   pnpm --filter @workspace/scripts run test:step3        (from the repository root)
//
// The 2026 photo import added a second bio per player (e.g. `virat-kohli` beside the verified `v-kohli`), and
// squad-file errors (e.g. "Jayant Yadav" → cricsheetName "UT Yadav") could have merged two different people.
// Unit cases use synthetic shapes taken from those real cases; the last tests run against the shipped bios and
// the raw Cricsheet files. WEB_DATA points the real-data checks at another copy.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { REPO, IPL_RAW_DIR } from "../../global/paths";
import { createRegistryHistory, recordAppearance, identifyBio, loadVerifiedAliases } from "../../../lib/player-identity.mjs";
import { namesCorroborate, planDedupe, applyDedupe } from "../../step3_6/dedupe-photo-bios";

const WEB_DATA = process.env.WEB_DATA ?? path.join(REPO, "artifacts", "ipl-analytics", "public", "data");
const ALIASES = path.join(REPO, "scripts", "data", "player-identity-aliases.json");

test("names: a display name corroborates the canonical bio by surname plus first name or initial", () => {
  assert.equal(namesCorroborate("Jasprit Bumrah", { playerName: "JJ Bumrah", fullName: "Jasprit Jasbirsingh Bumrah" }), true);
  assert.equal(namesCorroborate("Virat Kohli", { playerName: "V Kohli", fullName: "Virat Kohli" }), true);
  // Squad-file error: same surname, different person.
  assert.equal(namesCorroborate("Jayant Yadav", { playerName: "UT Yadav", fullName: "Umeshkumar Tilak Yadav" }), false);
  assert.equal(namesCorroborate("Shreyas Iyer", { playerName: "VR Iyer", fullName: "Venkatesh Rajasekaran Iyer" }), false);
  // Spelling variants are left for a human, never merged automatically.
  assert.equal(namesCorroborate("Abhishek Porel", { playerName: "Abishek Porel", fullName: "Abishek Porel" }), false);
  // A single word is never enough.
  assert.equal(namesCorroborate("Bumrah", { playerName: "JJ Bumrah", fullName: "Jasprit Jasbirsingh Bumrah" }), false);
});

function fixture() {
  const h = createRegistryHistory();
  recordAppearance(h, "id-bumrah", "JJ Bumrah", "Mumbai Indians", "2025");
  recordAppearance(h, "id-umesh", "UT Yadav", "Gujarat Titans", "2024");
  recordAppearance(h, "id-jayant", "J Yadav", "Gujarat Titans", "2024");
  const bios: Record<string, Record<string, unknown>> = {
    "jj-bumrah": { playerId: 625383, playerName: "JJ Bumrah", fullName: "Jasprit Jasbirsingh Bumrah", team: "Mumbai Indians", role: "Bowler" },
    "jasprit-bumrah": { playerName: "Jasprit Bumrah", team: "Mumbai Indians", image: "/photos/jasprit-bumrah.webp", role: "Fast bowler" },
    "ut-yadav": { playerId: 376116, playerName: "UT Yadav", fullName: "Umeshkumar Tilak Yadav", team: "Gujarat Titans" },
    "jayant-yadav": { playerName: "Jayant Yadav", team: "Gujarat Titans", image: "/photos/jayant-yadav.webp" },
    "new-player": { playerName: "New Player", team: "Gujarat Titans" },
  };
  const squads = {
    "2025": { "Mumbai Indians": [{ name: "Jasprit Bumrah", cricsheetName: "JJ Bumrah" }] },
    // The real squad file's error row: Jayant Yadav listed with UT Yadav's written name.
    "2024": { "Gujarat Titans": [{ name: "Jayant Yadav", cricsheetName: "UT Yadav" }] },
  };
  return { h, bios, squads };
}

test("dedupe: folds a photo-import duplicate into the verified bio without overwriting it", () => {
  const { h, bios, squads } = fixture();
  const decisions = planDedupe(bios as never, squads, h, {});
  const bumrah = decisions.find((d) => d.duplicate === "jasprit-bumrah")!;
  assert.equal(bumrah.action, "fold");
  assert.equal(bumrah.canonical, "jj-bumrah");
  assert.equal(bumrah.registryId, "id-bumrah");
  const next = applyDedupe(bios as never, decisions);
  assert.equal(next["jasprit-bumrah"], undefined);
  assert.equal(next["jj-bumrah"].image, "/photos/jasprit-bumrah.webp", "missing field filled from the duplicate");
  assert.equal(next["jj-bumrah"].role, "Bowler", "existing canonical value kept");
  assert.equal(next["jj-bumrah"].playerName, "JJ Bumrah");
  assert.deepEqual(bumrah.differing.map((d) => d.field).sort(), ["playerName", "role"]);
});

test("dedupe: a squad-file error never merges two different people", () => {
  const { h, bios, squads } = fixture();
  const decisions = planDedupe(bios as never, squads, h, {});
  const jayant = decisions.find((d) => d.duplicate === "jayant-yadav")!;
  assert.equal(jayant.action, "keep");
  assert.match(jayant.reason, /names disagree/);
  const next = applyDedupe(bios as never, decisions);
  assert.ok(next["jayant-yadav"] && next["ut-yadav"], "both bios survive");
  assert.equal(next["ut-yadav"].image, undefined, "UT Yadav's bio does not receive Jayant Yadav's photo");
  assert.equal(decisions.find((d) => d.duplicate === "new-player")!.action, "keep");
});

// ── Real data ────────────────────────────────────────────────────────────────

function realHistory() {
  const h = createRegistryHistory();
  for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
    const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
    for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
      const id = m.info.registry.people[n];
      if (id) recordAppearance(h, id, n, team, m.info.season);
    }
  }
  return h;
}

// The three pre-existing scraped pairs found by this guard on 2026-10-14 are all resolved: arshad-khan-(2) and
// na-saini were merged on Day 4.5, pwh-de-silva on Day 4.6 after getPlayerBio() was moved to registry identity
// (DAY-04.6-REPORT.md). No collision is tolerated any more.
const KNOWN_SCRAPED_COLLISIONS: string[] = [];

test("real bios: no two scraped bios are verified to the same registry id (beyond the pinned review list)", () => {
  const bios = JSON.parse(fs.readFileSync(path.join(WEB_DATA, "player-bio.json"), "utf8")) as Record<string, Record<string, unknown>>;
  const h = realHistory();
  const aliases = loadVerifiedAliases(ALIASES);
  const byId = new Map<string, string[]>();
  for (const [k, b] of Object.entries(bios)) {
    if (b.playerId === undefined) continue;
    const id = identifyBio(k, b, h, aliases).id;
    if (id) byId.set(id, [...(byId.get(id) ?? []), k]);
  }
  const shared = [...byId].filter(([, ks]) => ks.length > 1).map(([id, ks]) => `${id}: ${ks.join(", ")}`).sort();
  assert.deepEqual(shared.filter((s) => !KNOWN_SCRAPED_COLLISIONS.includes(s)), [], "new registry-id collision between bios");
  assert.deepEqual(KNOWN_SCRAPED_COLLISIONS.filter((s) => !shared.includes(s)), [], "a pinned collision was resolved: remove it from the list");
});

test("real bios: no photo-import duplicate of a verified bio remains (dedupe plan has nothing to fold)", () => {
  const bios = JSON.parse(fs.readFileSync(path.join(WEB_DATA, "player-bio.json"), "utf8"));
  const squads = JSON.parse(fs.readFileSync(path.join(WEB_DATA, "squads-by-season.json"), "utf8"));
  const decisions = planDedupe(bios, squads, realHistory(), loadVerifiedAliases(ALIASES));
  const fold = decisions.filter((d) => d.action === "fold").map((d) => `${d.duplicate} → ${d.canonical}`);
  assert.deepEqual(fold, [], "run scripts/src/step3_6/dedupe-photo-bios.ts (dry run first) and review the report");
  // The known wrong-merge candidate stays separate: Jayant Yadav was never merged into Umesh Yadav (ut-yadav). On
  // Day 4.6 the photo-import bio jayant-yadav was merged, with approval, into Jayant's own verified bio j-yadav.
  assert.equal(bios["ut-yadav"]?.playerName, "UT Yadav");
  assert.equal(bios["ut-yadav"].fullName, "Umeshkumar Tilak Yadav");
  assert.ok(!String(bios["ut-yadav"].image ?? "").includes("jayant"), "ut-yadav must not carry Jayant Yadav's photo");
  assert.equal(bios["j-yadav"]?.fullName, "Jayant Yadav");
});

test("real bios: the API and web copies of player-bio.json are identical", () => {
  const api = path.join(REPO, "artifacts", "api-server", "data", "player-bio.json");
  if (!fs.existsSync(api) || process.env.WEB_DATA) return;
  assert.equal(fs.readFileSync(api, "utf8"), fs.readFileSync(path.join(WEB_DATA, "player-bio.json"), "utf8"));
});
