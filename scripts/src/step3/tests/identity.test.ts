// Step 3.5 Task A — player identity regression tests.
//
//   pnpm --filter @workspace/scripts run test:step3        (from the repository root)
//
// Unit cases for scripts/lib/player-identity.mjs and the page's recent-matches lookup (ambiguous names,
// franchise evidence, surname-only near misses, missing data), then the real data: named pages and links
// that were wrong before Step 3.5. WEB_DATA points the real-data checks at another copy.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { REPO } from "../../global/paths";
import {
  createRegistryHistory, recordAppearance, identifyBio, buildKeyIndex, buildPageIds, pageSlug, type RegistryHistory,
} from "../../../lib/player-identity.mjs";

const WEB = path.join(REPO, "artifacts", "ipl-analytics");
const WEB_DATA = process.env.WEB_DATA ?? path.join(WEB, "public", "data");
const TSX = path.join(REPO, "scripts", "node_modules", ".bin", process.platform === "win32" ? "tsx.CMD" : "tsx");
const HERE = path.join(REPO, "scripts", "src", "step3");

// Synthetic registry: shapes taken from the real cases.
function history(): RegistryHistory {
  const h = createRegistryHistory();
  recordAppearance(h, "rb-rajesh", "R Bishnoi", "Royal Challengers Bangalore", "2009");      // Rajesh Bishnoi
  recordAppearance(h, "rb-ravi", "Ravi Bishnoi", "Lucknow Super Giants", "2025");          // Ravi Bishnoi
  recordAppearance(h, "hs-a", "Harmeet Singh", "Kings XI Punjab", "2014");                  // two people, one written name
  recordAppearance(h, "hs-b", "Harmeet Singh", "Rajasthan Royals", "2013");
  recordAppearance(h, "md-mukul", "MD Choudhary", "Lucknow Super Giants", "2026");
  recordAppearance(h, "mc-mukesh", "Mukesh Choudhary", "Chennai Super Kings", "2022");
  recordAppearance(h, "ak", "Arshad Khan", "Mumbai Indians", "2022");                      // one person, two written names
  recordAppearance(h, "ak", "Arshad Khan (2)", "Lucknow Super Giants", "2024");
  return h;
}

test("identity: a written name used by one registry id identifies the bio", () => {
  const r = identifyBio("mukesh-choudhary", { playerName: "Mukesh Choudhary", fullName: "Mukesh Choudhary" }, history());
  assert.equal(r.id, "mc-mukesh");
});

test("identity: a surname match is never enough (Prince Choudhary is not MD or Mukesh Choudhary)", () => {
  const r = identifyBio("prince-choudhary", { playerName: "Prince Choudhary", fullName: "Prince Choudhary" }, history());
  assert.equal(r.id, null);
  assert.deepEqual(r.candidates, []);
});

test("identity: a mislabelled playerName is settled by the franchise only when exactly one candidate played there", () => {
  const h = history();
  // Ravi Bishnoi's bio carries Rajesh Bishnoi's written name "R Bishnoi" as playerName.
  assert.equal(identifyBio("ravi-bishnoi", { playerName: "R Bishnoi", fullName: "Ravi Bishnoi", currentTeam: "Lucknow Super Giants" }, h).id, "rb-ravi");
  // Same names, no team: ambiguous, so no identity rather than a guess.
  assert.equal(identifyBio("ravi-bishnoi", { playerName: "R Bishnoi", fullName: "Ravi Bishnoi" }, h).id, null);
  // A team neither played for: still ambiguous.
  assert.equal(identifyBio("ravi-bishnoi", { playerName: "R Bishnoi", fullName: "Ravi Bishnoi", currentTeam: "Gujarat Titans" }, h).id, null);
});

test("identity: a written name shared by two people needs franchise evidence, after renames", () => {
  const h = history();
  // "Kings XI Punjab" in the raw files is "Punjab Kings" in the bios.
  assert.equal(identifyBio("harmeet-singh", { playerName: "Harmeet Singh", currentTeam: "Punjab Kings" }, h).id, "hs-a");
  assert.equal(identifyBio("harmeet-singh", { playerName: "Harmeet Singh" }, h).id, null);
});

test("identity: a reviewed alias wins, and nothing else is inferred from register-style names", () => {
  const h = history();
  const aliases = { "some-bio": { cricsheetId: "ak", evidence: "test" } };
  assert.equal(identifyBio("some-bio", { playerName: "Unrelated Name" }, h, aliases).id, "ak");
  assert.equal(identifyBio("some-bio", { playerName: "Unrelated Name" }, h).id, null);
});

test("index: bios without a verified identity get no key (empty state), duplicates share one id", () => {
  const bios = {
    "prince-choudhary": { playerName: "Prince Choudhary", fullName: "Prince Choudhary" },
    "arshad-khan": { playerName: "Arshad Khan" },
    "arshad-khan-(2)": { playerName: "Arshad Khan (2)", fullName: "Mohd Arshad Khan" },
  };
  const { keys, bioIdentity } = buildKeyIndex({ bios, history: history(), aliases: {} });
  assert.equal(keys.has("prince-choudhary"), false);
  assert.equal(bioIdentity["prince-choudhary"].id, null);
  assert.equal(keys.get("arshad-khan"), "ak");
  assert.equal(keys.get("arshad-khan-(2)"), "ak");
});

test("links: written names map to their id, a squad name may not contradict one, shared names are left out", () => {
  const bios = { "mukesh-choudhary": { playerName: "Mukesh Choudhary" } };
  const squads = {
    "2026": {
      "Lucknow Super Giants": [{ name: "Mukul Choudhary", cricsheetName: "MD Choudhary" }],
      "Chennai Super Kings": [{ name: "MD Choudhary", cricsheetName: "Mukesh Choudhary" }], // a bad squad row
    },
  };
  const { pages, conflicts } = buildPageIds({ bios, squads, history: history() });
  assert.equal(pages["md-choudhary"], "md-mukul");       // registry fact, not the bad squad row
  assert.equal(pages["mukul-choudhary"], "md-mukul");    // squad display name, verified through its cricsheetName
  assert.equal(pages["mukesh-choudhary"], undefined);    // a bio key opens its own bio
  assert.equal(pages["harmeet-singh"], undefined);       // two people: no verified target
  assert.ok(conflicts.some((c) => c.slug === "harmeet-singh"));
  assert.ok(conflicts.some((c) => c.slug === "md-choudhary" && c.written));
  assert.equal(pageSlug(" Arshad Khan (2) "), "arshad-khan-2");
});

test("recent matches: lookup is by the bio key alone; missing or empty data gives the empty state", async () => {
  const { resolveRecentMatchesKey } = await import(pathToFileURL(path.join(WEB, "src", "lib", "player-recent-matches.ts")).href);
  const lengths = { "md-choudhary": 10, "virat-kohli": 282, "zero-matches": 0 };
  assert.equal(resolveRecentMatchesKey(lengths, "virat-kohli"), "virat-kohli");
  assert.equal(resolveRecentMatchesKey(lengths, "prince-choudhary"), null); // no surname or name fallback
  assert.equal(resolveRecentMatchesKey(lengths, "zero-matches"), null);
  assert.equal(resolveRecentMatchesKey(lengths, null), null);
  assert.equal(resolveRecentMatchesKey({}, "virat-kohli"), null);
});

// ── Real data ──

function audit(): Record<string, { status: string; shown: number; id: string | null }> {
  const json = path.join(os.tmpdir(), `step35-identity-${process.pid}.json`);
  execFileSync(TSX, [path.join(HERE, "identity-audit.ts"), "--data", WEB_DATA, "--json", json, "--out", path.join(os.tmpdir(), `step35-identity-${process.pid}.md`)],
    { cwd: REPO, stdio: "pipe", shell: process.platform === "win32" });
  return Object.fromEntries(JSON.parse(fs.readFileSync(json, "utf8")).map((r: { slug: string }) => [r.slug, r]));
}

test("real data: pages that were wrong before Step 3.5 show exactly their own matches", () => {
  const rows = audit();
  const expect: Record<string, number> = {
    "ravi-bishnoi": 86, "r-bishnoi": 3, "navdeep-saini": 34, "n-saini": 10, "pankaj-singh": 17, "harmeet-singh": 27,
    "arshad-khan": 27, "wanindu-hasaranga": 37, "v-kohli": 282,
  };
  for (const [slug, n] of Object.entries(expect)) {
    assert.equal(rows[slug]?.status, "correct", slug);
    assert.equal(rows[slug].shown, n, slug);
  }
  // Day 4.5 / 4.6: duplicate bios merged into the pages above (same registry id): arshad-khan-(2), na-saini,
  // pwh-de-silva (scraped duplicates) and jayant-yadav, keshav-maharaj, richard-gleeson (photo-import duplicates).
  for (const merged of ["arshad-khan-(2)", "na-saini", "pwh-de-silva", "jayant-yadav", "keshav-maharaj", "richard-gleeson"]) assert.equal(rows[merged], undefined, merged);
  for (const [slug, n] of Object.entries({ "j-yadav": 20, "ka-maharaj": 2, "rj-gleeson": 3 })) { assert.equal(rows[slug]?.status, "correct", slug); assert.equal(rows[slug].shown, n, slug); }
  assert.equal(rows["prince-choudhary"].status, "no verified identity (empty)");
  assert.equal(rows["prince-choudhary"].shown, 0);
});

function resolveLinks(slugs: string[]): Record<string, { bio: string | null; heading: string | null }> {
  const out = execFileSync(TSX, [path.join(HERE, "resolve-links.ts"), "--data", WEB_DATA, "--slugs", slugs.join(",")],
    { cwd: REPO, encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, TSX_TSCONFIG_PATH: path.join(WEB, "tsconfig.json") } });
  return JSON.parse(out.trim().split("\n").pop()!);
}

test("real data: links resolve by registry identity, not initial + surname", () => {
  const got = Object.fromEntries(Object.entries(resolveLinks(["md-choudhary", "mukul-choudhary", "finn-allen", "fh-allen", "shahrukh-khan",
    "rohit-sharma", "rinku-singh", "virat-kohli", "shreyas-iyer", "prince-choudhary"])).map(([k, v]) => [k, v.bio]));
  // Day 3 (2026-10-14): the 2026 photo import added bios for Finn Allen (KKR) and Mukul Choudhary (LSG). Before
  // that neither had a bio, so these links resolved to null. They now open each player's OWN bio — never Fabian
  // Allen's or Mukesh Choudhary's, which is what this test guards. The bio identities are asserted below.
  const bios = JSON.parse(fs.readFileSync(path.join(WEB_DATA, "player-bio.json"), "utf8"));
  assert.equal(bios["finn-allen"].fullName, "Finn Allen");
  assert.equal(bios["mukul-choudhary"].fullName, "Mukul Choudhary");
  assert.notEqual(got["finn-allen"], "fa-allen");             // Fabian Allen
  assert.notEqual(got["mukul-choudhary"], "mukesh-choudhary"); // Mukesh Choudhary
  assert.notEqual(got["md-choudhary"], "mukesh-choudhary");
  assert.deepEqual(got, {
    "md-choudhary": null,               // was Mukesh Choudhary's page
    "mukul-choudhary": "mukul-choudhary", // Mukul's own bio (added 2026-10-12); was null (no bio)
    "finn-allen": "finn-allen",         // Finn Allen's own bio (added 2026-10-12); was Fabian Allen's page, then null
    "fh-allen": null,
    "shahrukh-khan": "m-shahrukh-khan", // was Sarfaraz Khan's page
    "rohit-sharma": "rg-sharma",        // was "Player not found"
    "rinku-singh": "rk-singh",
    "virat-kohli": "v-kohli",
    "shreyas-iyer": "ss-iyer",          // claimed for two ids by the squad file: unchanged name rule
    "prince-choudhary": "prince-choudhary",
  });
});

test("real data: a heading never shows another player's name (scorecard names shared through the squad file)", () => {
  const got = resolveLinks(["r-bishnoi", "ravi-bishnoi", "n-saini", "navdeep-saini", "v-kohli"]);
  assert.equal(got["r-bishnoi"].heading, "Rajesh Bishnoi"); // was "Ravi Bishnoi"
  assert.equal(got["n-saini"].heading, "Nitin Saini");       // was "Navdeep Saini"
  assert.equal(got["ravi-bishnoi"].heading, "Ravi Bishnoi");
  assert.equal(got["navdeep-saini"].heading, "Navdeep Saini");
  assert.equal(got["v-kohli"].heading, "Virat Kohli");
});

test("real data: TigZig verified aliases resolve to correct registry IDs, unverified remain empty", () => {
  const aliases = JSON.parse(fs.readFileSync(path.join(REPO, "scripts", "data", "player-identity-aliases.json"), "utf8")).aliases;
  const verifiedMap: Record<string, string> = {
    "tanay-thyagarajan": "f1809c03",
    "ajay-mandal": "31ee319e",
    "jhathavedh-subramanyan": "eb19d010",
    "harvik-desai": "9c86350f",
    "abid-mushtaq": "b10e8c85",
    "gus-atkinson": "70d57519",
  };
  for (const [bioKey, expectedId] of Object.entries(verifiedMap)) {
    assert.equal(aliases[bioKey]?.cricsheetId, expectedId, `Verified alias ${bioKey} should point to ${expectedId}`);
  }

  const unverified = ["prince-choudhary", "aravelly-avanish", "swastik-chikara", "vicky-ostwal"];
  for (const bioKey of unverified) {
    assert.equal(aliases[bioKey], undefined, `Unverified bio ${bioKey} must NOT have an alias`);
  }
});

