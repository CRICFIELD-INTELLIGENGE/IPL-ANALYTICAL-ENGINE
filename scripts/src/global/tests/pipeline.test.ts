// End-to-end: fixture Cricsheet JSON → zip → normalize → aggregate → validate, on an in-memory global.db.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { DatabaseSync } from "node:sqlite";
import { openGlobalDb, one, all } from "../db";
import { aggregateCompetition } from "../aggregate";
import { validateCompetition } from "../validate";
import { fixture, load, registry } from "./fixture";

const bat = (db: DatabaseSync, name: string, phase = "all") => one<Record<string, number>>(db,
  `SELECT a.* FROM agg_batting a JOIN player_names n ON n.player_key = a.player_key AND n.origin = 'match' WHERE n.name = ? AND a.phase = ?`, name, phase);
const bowl = (db: DatabaseSync, name: string) => one<Record<string, number>>(db,
  `SELECT a.* FROM agg_bowling a JOIN player_names n ON n.player_key = a.player_key AND n.origin = 'match' WHERE n.name = ? AND a.phase = 'all'`, name);

test("normalizes every structure and keeps unknown keys", () => {
  const db = openGlobalDb(":memory:");
  const s = load(db, "tst", { 9000001: fixture(registry("a")) });
  assert.equal(s.added, 1);
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM deliveries")!.n, 19);
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM innings WHERE super_over = 1")!.n, 1);
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM wicket_fielders WHERE substitute = 1")!.n, 1);
  assert.equal(one<{ reason: string }>(db, "SELECT reason FROM replacements")!.reason, "impact_player");
  assert.equal(one<{ decision: string }>(db, "SELECT decision FROM reviews")!.decision, "upheld");
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM powerplays")!.n, 1);
  assert.equal(one<{ target_runs: number }>(db, "SELECT target_runs FROM innings WHERE innings_no = 2")!.target_runs, 21);
  assert.deepEqual(JSON.parse(one<{ extra: string }>(db, "SELECT extra FROM deliveries WHERE extra IS NOT NULL")!.extra), { "delivery.foo": "kept" });
  assert.equal(one<{ occurrences: number }>(db, "SELECT occurrences FROM schema_drift WHERE path = 'delivery.foo'")!.occurrences, 1);
});

test("aggregates follow the metric definitions exactly", () => {
  const db = openGlobalDb(":memory:");
  load(db, "tst", { 9000001: fixture(registry("a")) });
  aggregateCompetition(db, 1, "tst");
  const a1 = bat(db, "a1")!;
  assert.deepEqual([a1.balls_faced, a1.runs, a1.fours, a1.sixes, a1.dots, a1.dismissals, a1.innings], [4, 11, 0, 1, 1, 1, 1], "super-over six excluded; all-run four is not a boundary");
  const a2 = bat(db, "a2")!;
  assert.deepEqual([a2.balls_faced, a2.runs, a2.fours, a2.dots, a2.dismissals], [2, 4, 1, 1, 1], "wide not faced; no-ball faced; run out as non-striker");
  const a3 = bat(db, "a3")!;
  assert.deepEqual([a3.balls_faced, a3.dismissals], [4, 0], "retired hurt is not a dismissal");
  assert.equal(bat(db, "a5")!.innings, 1, "non-striker only still batted");
  assert.equal(bat(db, "b1")!.dismissals, 1, "retired out is a dismissal");
  const b1 = bowl(db, "b1")!;
  assert.deepEqual([b1.balls, b1.legal_balls, b1.runs_conceded, b1.wickets, b1.dots, b1.fours, b1.sixes, b1.wides, b1.noballs], [8, 6, 17, 1, 3, 1, 1, 1, 1]);
  const b3 = bowl(db, "b3")!;
  assert.deepEqual([b3.legal_balls, b3.runs_conceded, b3.wickets], [4, 0, 1], "stumping credited, run out and retired hurt not");
  assert.equal(bowl(db, "a1")!.wickets, 0, "retired out is not a bowler wicket");
  const pp = bat(db, "a1", "powerplay")!;
  assert.equal(pp.runs, 11, "overs 1–2 are powerplay");
  const f = all<{ name: string; catches: number; stumpings: number; run_outs: number; catches_as_sub: number }>(db,
    "SELECT n.name, f.catches, f.stumpings, f.run_outs, f.catches_as_sub FROM agg_fielding f JOIN player_names n ON n.player_key = f.player_key AND n.origin = 'match' ORDER BY n.name");
  assert.deepEqual(f.map((x) => [x.name, x.catches, x.stumpings, x.run_outs]), [["b2", 1, 0, 0], ["b4", 0, 1, 1]]);
  const base = one<Record<string, number>>(db, "SELECT * FROM competition_baselines WHERE phase = 'all'")!;
  assert.deepEqual([base.runs_total, base.team_wickets, base.bowler_wickets, base.innings], [32, 4, 2, 2]);
});

test("validation passes a consistent match and fails a tampered one", () => {
  const db = openGlobalDb(":memory:");
  load(db, "tst", { 9000001: fixture(registry("a")) });
  const ok = new Map(validateCompetition(db, 1).checks.map((c) => [c.id, c.severity]));
  for (const id of ["delivery_arithmetic", "margin_runs", "innings_wickets", "targets", "references", "innings_length", "over_structure"]) {
    assert.equal(ok.get(id), "pass", id);
  }
  const bad = openGlobalDb(":memory:");
  load(bad, "tst", { 9000001: fixture(registry("a"), 1, true) });
  const sev = new Map(validateCompetition(bad, 1).checks.map((c) => [c.id, c.severity]));
  assert.equal(sev.get("delivery_arithmetic"), "fail");
});

test("incremental: unchanged files are skipped, revised files replace the old rows", () => {
  const db = openGlobalDb(":memory:");
  load(db, "tst", { 9000001: fixture(registry("a")) });
  const again = load(db, "tst", { 9000001: fixture(registry("a")) });
  assert.deepEqual([again.added, again.updated, again.unchanged], [0, 0, 1]);
  const revised = load(db, "tst", { 9000001: fixture(registry("a"), 2) });
  assert.deepEqual([revised.added, revised.updated], [0, 1]);
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM deliveries")!.n, 19, "no duplicate deliveries after an update");
  assert.equal(one<{ revision: number }>(db, "SELECT revision FROM matches")!.revision, 2);
  const gone = load(db, "tst", {});
  assert.equal(gone.missingFromLatest, 1, "a match missing from the newest archive is flagged, not deleted");
  assert.equal(one<{ n: number }>(db, "SELECT COUNT(*) n FROM matches WHERE in_latest_source = 0")!.n, 1);
});

test("identity: the same written name with different registry ids stays two people; the same id joins across competitions", () => {
  const db = openGlobalDb(":memory:");
  load(db, "one", { 9000001: fixture(registry("a")) });
  load(db, "two", { 9000002: fixture(registry("c")) }); // same names, different ids
  const sameName = one<{ n: number }>(db, "SELECT COUNT(DISTINCT player_key) n FROM player_names WHERE name = 'a1' AND origin = 'match'")!.n;
  assert.equal(sameName, 2);
  load(db, "three", { 9000003: fixture(registry("a")) }); // same ids as competition one
  const shared = one<{ n: number }>(db, `SELECT COUNT(DISTINCT m.competition_id) n FROM match_players mp JOIN matches m USING (match_id)
    JOIN players p USING (player_key) WHERE p.cricsheet_id = ?`, registry("a").a1)!.n;
  assert.equal(shared, 2);
  const conflict = load(db, "two", { 9000001: fixture(registry("a")) });
  assert.equal(conflict.conflicts.length, 1, "a match id already owned by another competition is reported, not overwritten");
});
