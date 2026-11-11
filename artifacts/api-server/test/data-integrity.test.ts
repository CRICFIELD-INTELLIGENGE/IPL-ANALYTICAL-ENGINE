// Day 3 — data-integrity regression tests, built on real Cricsheet source files.
//
//   pnpm --filter @workspace/api-server test
//
// Fixtures in test/fixtures/cricsheet are unmodified copies of ipl_csv/*.csv and lib/cricket-data/raw/*.json
// (see the README there). Every expected number below is recounted from the JSON copy of the same match, never
// typed in from the parser's own output. Warehouse checks open global.db read-only and skip when it is absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { CricsheetCSVParser, CricsheetCsvError, parseOverBall, validateParsedMatch } from "../src/services/cricsheet-csv-sync";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const FIX = path.join(HERE, "fixtures", "cricsheet");
const GLOBAL_DB = path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db");

type JsonDelivery = { runs: { batter: number; extras: number; total: number }; wickets?: { kind: string }[] };
type JsonMatch = { innings: { team: string; overs: { over: number; deliveries: JsonDelivery[] }[] }[] };

/** Independent recount from the Cricsheet JSON copy of the same match. */
function recount(matchId: string) {
  const m = JSON.parse(fs.readFileSync(path.join(FIX, `${matchId}.json`), "utf8")) as JsonMatch;
  return m.innings.map((inn) => {
    const ds = inn.overs.flatMap((o) => o.deliveries);
    return {
      team: inn.team,
      deliveries: ds.length,
      runs: ds.reduce((s, d) => s + d.runs.total, 0),
      batRuns: ds.reduce((s, d) => s + d.runs.batter, 0),
      wickets: ds.reduce((s, d) => s + (d.wickets?.length ?? 0), 0),
      longestOver: Math.max(...inn.overs.map((o) => o.deliveries.length)),
    };
  });
}

function parseFixture(matchId: string) {
  return CricsheetCSVParser.parseText(fs.readFileSync(path.join(FIX, `${matchId}.csv`), "utf8"));
}

// ── CSV sync parser ──────────────────────────────────────────────────────────

test("legacy ipl_csv file parses to the same innings totals as the JSON copy of the match (1082591)", () => {
  const parsed = parseFixture("1082591");
  assert.equal(parsed.format, "cricsheet-legacy");
  const truth = recount("1082591");
  truth.forEach((t, i) => {
    const rows = parsed.rows.filter((r) => r.innings === i + 1);
    assert.equal(rows.length, t.deliveries, `innings ${i + 1} deliveries`);
    assert.equal(rows.reduce((s, r) => s + r.runs_off_bat + r.extras, 0), t.runs, `innings ${i + 1} runs`);
    assert.equal(rows.reduce((s, r) => s + r.runs_off_bat, 0), t.batRuns, `innings ${i + 1} runs off the bat`);
    assert.equal(rows.filter((r) => r.wicket_type).length, t.wickets, `innings ${i + 1} wickets`);
    assert.ok(rows.every((r) => r.batting_team === t.team && r.bowling_team && r.bowling_team !== t.team));
  });
  // Cricsheet records target 208 for the chase: first innings 207 + 1.
  assert.equal(truth[0].runs, 207);
  assert.deepEqual(validateParsedMatch(parsed), []);
});

test("an over with 10+ deliveries keeps integer ball numbers (1473469: 19.10 is ball 10, not ball 1)", () => {
  assert.deepEqual(parseOverBall("19.10"), { over: 19, ballInOver: 10 });
  assert.deepEqual(parseOverBall("19.1"), { over: 19, ballInOver: 1 });
  assert.throws(() => parseOverBall("19"), CricsheetCsvError);

  const parsed = parseFixture("1473469");
  const truth = recount("1473469");
  // Within every over of every innings the labels run 1..N with no wrap-around, N = the JSON's delivery count.
  const byOver = new Map<string, number[]>();
  for (const r of parsed.rows) {
    const k = `${r.innings}:${r.over}`;
    (byOver.get(k) ?? byOver.set(k, []).get(k)!).push(r.ballInOver);
  }
  for (const [k, balls] of byOver) assert.deepEqual(balls, balls.map((_, i) => i + 1), `over ${k}`);
  const longest = Math.max(...[...byOver.values()].map((b) => b.length));
  assert.equal(longest, Math.max(...truth.map((t) => t.longestOver)));
  assert.ok(longest >= 10, "fixture must contain an over of 10+ deliveries");
  truth.forEach((t, i) =>
    assert.equal(parsed.rows.filter((r) => r.innings === i + 1).reduce((s, r) => s + r.runs_off_bat + r.extras, 0), t.runs, `innings ${i + 1} runs`));
  assert.deepEqual(validateParsedMatch(parsed), []);
});

test("unknown CSV formats are rejected instead of being imported as zeros", () => {
  assert.throws(() => CricsheetCSVParser.parseText("a,b,c\n1,2,3\n"), /unrecognised CSV format/);
  assert.throws(() => CricsheetCSVParser.parseText(""), /empty file/);
  // CSV2 header without the columns the sync needs.
  assert.throws(() => CricsheetCSVParser.parseText("match_id,innings,ball\n1,1,0.1\n"), /CSV2 header lacks/);
});

test("a structurally valid file whose run columns are all zero fails validation", () => {
  // The real 1082591 file with its run columns blanked: what the old CSV2-only parser produced from ipl_csv.
  const text = fs.readFileSync(path.join(FIX, "1082591.csv"), "utf8").split(/\r?\n/).map((line) => {
    if (!line.startsWith("ball,")) return line;
    const f = line.split(",");
    for (let i = 7; i <= 13; i++) if (f[i] !== undefined) f[i] = "0";
    return f.join(",");
  }).join("\n");
  const issues = validateParsedMatch(CricsheetCSVParser.parseText(text));
  assert.ok(issues.some((s) => /every one scored 0 runs/.test(s)), issues.join("; "));
  assert.ok(issues.some((s) => /target 208/.test(s)), "the target cross-check must also fail");
});

test("a file whose first-innings total disagrees with the recorded target fails validation", () => {
  const lines = fs.readFileSync(path.join(FIX, "1082591.csv"), "utf8").split(/\r?\n/);
  const firstBall = lines.findIndex((l) => l.startsWith("ball,1,"));
  const f = lines[firstBall].split(",");
  f[7] = String(Number(f[7]) + 4); // one extra boundary that the scorecard never had
  lines[firstBall] = f.join(",");
  const issues = validateParsedMatch(CricsheetCSVParser.parseText(lines.join("\n")));
  assert.ok(issues.some((s) => /first-innings total 211/.test(s)), issues.join("; "));
});

test("CricsheetCSVParser.parse throws a typed error (no filesystem path) for a missing file", () => {
  const missing = path.join(FIX, "does-not-exist.csv");
  assert.throws(() => CricsheetCSVParser.parse(missing), (e: unknown) =>
    e instanceof CricsheetCsvError && !e.message.includes(FIX));
});

// ── Player metadata changes since the Step-3 baseline ────────────────────────

// The 23 nationality flips and 2 team back-fills reported by scripts/src/step3/economy-compare.ts between
// docs/global-data-engine/step3/baseline-economy-snapshot.json and the current API output.
const NATIONALITY_CHANGES: [string, boolean][] = [
  ["XC Bartlett", false], ["JG Bethell", false], ["MP Breetzke", false], ["D Brevis", false], ["N Burger", false],
  ["NT Ellis", false], ["D Ferreira", false], ["AM Ghazanfar", false], ["WG Jacks", false], ["PHKD Mendis", false],
  ["Azmatullah Omarzai", false], ["J Overton", false], ["GD Phillips", false], ["R Powell", false], ["RD Rickelton", false],
  ["R Shepherd", false], ["N Thushara", false], ["Umran Malik", true], ["AR Patel", true], ["AS Roy", true],
  ["Rasikh Salam", true], ["Abdul Samad", true], ["Urvil Patel", true],
];
const TEAM_CHANGES: [string, string][] = [["Ashok Sharma", "Gujarat Titans"], ["Brijesh Sharma", "Rajasthan Royals"]];

test("the nationality list covers the 23 distinct players the comparator reported", () => {
  assert.equal(new Set(NATIONALITY_CHANGES.map(([n]) => n)).size, 23);
});

test("legacy metadata changes since the Step-3 baseline are corroborated by warehouse appearances", { skip: !fs.existsSync(GLOBAL_DB) && "global.db not present" }, () => {
  const db = new DatabaseSync(GLOBAL_DB, { readOnly: true });
  try {
    const iplKey = db.prepare(`SELECT DISTINCT mp.player_key AS k FROM match_players mp JOIN matches m ON m.match_id = mp.match_id
      JOIN competitions c ON c.competition_id = m.competition_id WHERE c.code = 'ipl' AND mp.listed_name = ?`);
    const smatApps = db.prepare(`SELECT COUNT(DISTINCT mp.match_id) AS n FROM match_players mp JOIN matches m ON m.match_id = mp.match_id
      JOIN competitions c ON c.competition_id = m.competition_id WHERE c.code = 'smat' AND mp.player_key = ?`);
    const latestIplTeam = db.prepare(`SELECT t.name FROM match_players mp JOIN matches m ON m.match_id = mp.match_id
      JOIN competitions c ON c.competition_id = m.competition_id JOIN teams t ON t.team_id = mp.team_id
      WHERE c.code = 'ipl' AND mp.player_key = ? ORDER BY m.start_date DESC LIMIT 1`);
    const keyOf = (name: string) => {
      const rows = iplKey.all(name) as { k: number }[];
      assert.equal(rows.length, 1, `${name} must resolve to exactly one IPL player`);
      return rows[0].k;
    };
    // Nationality: the Indian domestic T20 (SMAT) is the corroborating evidence. Every player now marked Indian
    // has SMAT appearances; every player now marked overseas has none.
    for (const [name, isIndian] of NATIONALITY_CHANGES) {
      const n = (smatApps.get(keyOf(name)) as { n: number }).n;
      assert.equal(n > 0, isIndian, `${name}: ${n} SMAT appearances, new isIndian=${isIndian}`);
    }
    // Team: the back-filled team is the franchise of the player's latest IPL appearance.
    for (const [name, team] of TEAM_CHANGES) {
      assert.equal((latestIplTeam.get(keyOf(name)) as { name: string }).name, team, name);
    }
  } finally {
    db.close();
  }
});
