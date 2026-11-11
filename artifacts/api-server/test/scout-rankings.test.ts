// Day 2 — Scout Lab correctness tests.
//
//   pnpm --filter @workspace/api-server run test
//
// Part A: pure, deterministic unit tests of ranking order and metric direction.
// Part B: HTTP tests against the real global.db (opened read-only by the service).
// Part C: independent recounts — counts, league index, shrinkage and percentile are
//         recomputed here from raw `deliveries` and `competition_baselines` with plain
//         SQL, without using scout-service, and compared with the API.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  sortRatings,
  rankingSortKeys,
  metricDefs,
  BATTING_METRICS,
  BOWLING_METRICS,
  shrink,
  percentileRanks,
  SHRINK_K,
  type Rating,
  type MetricValue,
} from "../src/services/scout/scout-service";
import { LOWER_IS_BETTER, CI_METHOD } from "../../ipl-analytics/src/lib/scout-api";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const GLOBAL_DB = path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db");

// ── fixtures ────────────────────────────────────────────────────────────────

const mv = (shrunk: number | null): MetricValue => ({ value: shrunk, league: 100, index: shrunk, shrunk, ci: null, percentile: null, population: 0 });
function row(name: string, balls: number, metrics: Record<string, number | null>, extra: Partial<Rating> = {}): Rating {
  return {
    player_key: name.length, cricsheet_id: name, name, competition: "ipl", seasons: ["2026"], discipline: "bowling", phase: "all",
    balls, matches: Math.ceil(balls / 24), innings: Math.ceil(balls / 24), tier: balls >= 120 ? "rankable" : balls >= 60 ? "low" : "insufficient",
    counts: {}, metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, mv(v)])),
    role: { label: "multi_phase", inputs: {} }, partialSeasons: [], teams: [], lowerDivisionShare: null, ...extra,
  };
}
const names = (rs: Rating[]) => rs.map((r) => r.name);

// ── Part A: unit tests ──────────────────────────────────────────────────────

test("bowling 'shrunk' sort, desc = best first: LOWEST economy index first", () => {
  const rs = [row("expensive", 200, { economy: 115 }), row("thrifty", 200, { economy: 85 }), row("average", 200, { economy: 100 })];
  assert.deepEqual(names(sortRatings(rs, "shrunk", "desc", "bowling")), ["thrifty", "average", "expensive"]);
  assert.deepEqual(names(sortRatings(rs, "shrunk", "asc", "bowling")), ["expensive", "average", "thrifty"]);
});

test("batting 'shrunk' sort, desc = best first: HIGHEST strike-rate index first", () => {
  const rs = [row("slow", 200, { strike_rate: 90 }, { discipline: "batting" }), row("fast", 200, { strike_rate: 130 }, { discipline: "batting" })];
  assert.deepEqual(names(sortRatings(rs, "shrunk", "desc", "batting")), ["fast", "slow"]);
});

test("every lower-is-better metric sorts ascending when 'best first' is requested", () => {
  for (const d of ["batting", "bowling"] as const) {
    for (const m of metricDefs(d)) {
      const rs = [row("lo", 200, { [m.id]: 80 }), row("hi", 200, { [m.id]: 120 })];
      const best = sortRatings(rs, m.id, "desc", d)[0].name;
      assert.equal(best, m.better === "lower" ? "lo" : "hi", `${d}.${m.id}`);
    }
  }
});

test("rows with no value sort last in both orders; ties break on balls then name", () => {
  const rs = [row("none", 500, { economy: null }), row("b", 150, { economy: 90 }), row("a", 150, { economy: 90 }), row("c", 300, { economy: 90 })];
  assert.deepEqual(names(sortRatings(rs, "shrunk", "desc", "bowling")), ["c", "a", "b", "none"]);
  assert.equal(sortRatings(rs, "shrunk", "asc", "bowling").at(-1)!.name, "none");
});

test("volume sorts: desc = most first", () => {
  const rs = [row("small", 130, { economy: 90 }), row("big", 900, { economy: 110 })];
  assert.deepEqual(names(sortRatings(rs, "balls", "desc", "bowling")), ["big", "small"]);
  assert.deepEqual(names(sortRatings(rs, "balls", "asc", "bowling")), ["small", "big"]);
});

test("sort keys per discipline are exactly shrunk/balls/matches + that discipline's metrics", () => {
  assert.deepEqual(rankingSortKeys("batting"), ["shrunk", "balls", "matches", "strike_rate", "boundary_pct", "dot_pct", "balls_per_dismissal"]);
  assert.deepEqual(rankingSortKeys("bowling"), ["shrunk", "balls", "matches", "economy", "wicket_rate", "dot_pct", "boundary_pct"]);
});

test("frontend direction map and CI-method map agree with the backend metric definitions", () => {
  for (const [d, defs] of [["batting", BATTING_METRICS], ["bowling", BOWLING_METRICS]] as const) {
    assert.deepEqual([...LOWER_IS_BETTER[d]].sort(), defs.filter((m) => m.better === "lower").map((m) => m.id).sort(), d);
    for (const m of defs) assert.ok(CI_METHOD[m.id], `CI method for ${m.id}`);
  }
  // Statistical definitions unchanged.
  assert.equal(SHRINK_K, 120);
  assert.equal(shrink(150, 40), (40 * 150 + 120 * 100) / 160);
});

// ── Part B: HTTP tests on the real warehouse ────────────────────────────────

let server: Server;
let base = "";
before(async () => {
  const { default: app } = await import("../src/app");
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/scout`;
});
after(() => server?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = async (p: string): Promise<{ status: number; body: any }> => {
  const res = await fetch(base + p);
  return { status: res.status, body: await res.json() };
};

test("bowling default ranking: best economy first, percentiles non-increasing, all rows eligible", async () => {
  const { status, body } = await get("/rankings?discipline=bowling&competitions=ipl&recentSeasons=1&limit=100");
  assert.equal(status, 200);
  const rows = body.data;
  assert.ok(rows.length > 10);
  for (const r of rows) assert.ok(r.balls >= 120, `${r.name} has ${r.balls} balls`);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].metrics.economy.shrunk <= rows[i].metrics.economy.shrunk, `order at ${i}`);
    assert.ok(rows[i - 1].metrics.economy.percentile >= rows[i].metrics.economy.percentile, `percentile at ${i}`);
  }
  assert.equal(rows[0].metrics.economy.percentile, 100, "rank 1 is the best bowler in the population");
  assert.ok(rows[0].metrics.economy.value < rows[0].metrics.economy.league, "rank 1 concedes less than league rate");
  assert.equal(body.pagination.total, rows[0].metrics.economy.population, "listed rows = percentile population");
});

test("batting default ranking: highest strike-rate index first; every row rankable", async () => {
  const { body } = await get("/rankings?discipline=batting&competitions=ipl&recentSeasons=1&limit=100");
  for (let i = 1; i < body.data.length; i++) {
    assert.ok(body.data[i - 1].metrics.strike_rate.shrunk >= body.data[i].metrics.strike_rate.shrunk);
  }
  for (const r of body.data) {
    assert.equal(r.tier, "rankable");
    assert.notEqual(r.metrics.strike_rate.percentile, null);
  }
});

test("minBalls is enforced before pagination, and zero-ball rows are never listed", async () => {
  const totals: number[] = [];
  for (const mb of [0, 60, 120, 250, 500]) {
    const { body } = await get(`/rankings?discipline=batting&competitions=ipl&minBalls=${mb}&limit=100&sortBy=balls&sortOrder=asc`);
    totals.push(body.pagination.total);
    const smallest = body.data[0];
    assert.ok(smallest.balls >= Math.max(1, mb), `minBalls=${mb}: smallest row has ${smallest.balls} balls`);
  }
  for (let i = 1; i < totals.length; i++) assert.ok(totals[i] <= totals[i - 1], `totals shrink as minBalls grows: ${totals}`);
});

test("pagination continues the same order without overlap", async () => {
  const q = "/rankings?discipline=bowling&competitions=ipl&limit=10";
  const p1 = (await get(q + "&page=1")).body.data;
  const p2 = (await get(q + "&page=2")).body.data;
  const ids1 = new Set(p1.map((r: Rating) => r.player_key));
  assert.ok(p2.every((r: Rating) => !ids1.has(r.player_key)));
  assert.ok(p1.at(-1).metrics.economy.shrunk <= p2[0].metrics.economy.shrunk);
});

test("role filter returns only that role (as an object with label + inputs)", async () => {
  for (const [d, role] of [["batting", "finisher"], ["batting", "opener"], ["bowling", "death_specialist"], ["bowling", "powerplay_specialist"]] as const) {
    const { status, body } = await get(`/rankings?discipline=${d}&competitions=ipl&role=${role}&limit=50`);
    assert.equal(status, 200);
    assert.ok(body.data.length > 0, `${d}/${role} has rows`);
    for (const r of body.data) {
      assert.equal(typeof r.role, "object");
      assert.equal(r.role.label, role);
      assert.equal(typeof r.role.inputs, "object");
    }
  }
});

test("invalid filters are rejected instead of silently returning nothing or unsorted data", async () => {
  assert.equal((await get("/rankings?discipline=bowling&role=opener")).status, 400, "batting role on bowling");
  assert.equal((await get("/rankings?discipline=batting&sortBy=economy")).status, 400, "bowling metric on batting");
  assert.equal((await get("/rankings?discipline=batting&sortBy=nonsense")).status, 400);
  assert.equal((await get("/rankings?minBalls=-5")).status, 400);
  assert.equal((await get("/rankings?minBalls=abc")).status, 400);
});

test("player profile: percentiles are ranked against the league population, not the player alone", async () => {
  const { body } = await get("/player/f29185a1"); // Abhishek Sharma
  const iplBat = body.ratings.find((r: Rating) => r.competition === "ipl" && r.discipline === "batting");
  assert.ok(iplBat.metrics.strike_rate.population > 50, `population ${iplBat.metrics.strike_rate.population}`);
  // Same window and threshold as the leaderboard → identical percentile.
  const lb = (await get("/rankings?discipline=batting&competitions=ipl&search=Abhishek%20Sharma&limit=5")).body.data
    .find((r: Rating) => r.cricsheet_id === "f29185a1");
  assert.equal(iplBat.metrics.strike_rate.percentile, lb.metrics.strike_rate.percentile);
  for (const r of body.ratings) assert.ok(r.balls > 0, "no zero-ball rating cards");
  assert.ok(body.strengthsAndWeaknesses.strengths.length + body.strengthsAndWeaknesses.weaknesses.length > 0,
    "with real percentiles a player with 1,000+ balls has at least one strength or weakness");
});

test("compare: percentiles use the full population; radar holds percentiles only (null when unranked)", async () => {
  const { body } = await get("/compare?ids=f29185a1,0a509d6b&competitions=ipl&recentSeasons=1");
  for (const p of body.players) assert.ok(p.rating.metrics.strike_rate.population > 2);
  for (const m of body.radarMetrics) {
    for (const p of body.players) {
      const v = m.values[p.player.cricsheet_id];
      assert.equal(v, p.rating.metrics[m.metric].percentile === null ? null : Math.round(p.rating.metrics[m.metric].percentile * 10) / 10);
    }
  }
});

test("compare picks each player's largest-sample league", async () => {
  const { body } = await get("/compare?ids=bbd41817,f29185a1"); // AD Russell (5 leagues), Abhishek
  const russell = body.players.find((p: { player: { cricsheet_id: string } }) => p.player.cricsheet_id === "bbd41817");
  const all = (await get("/player/bbd41817")).body.ratings.filter((r: Rating) => r.discipline === "batting");
  const maxBalls = Math.max(...all.map((r: Rating) => r.balls));
  assert.equal(russell.rating.balls, maxBalls);
});

// ── Part C: independent recounts from raw warehouse tables ──────────────────

const raw = new DatabaseSync(GLOBAL_DB, { readOnly: true });
const one = <T>(sql: string, ...p: (string | number)[]) => raw.prepare(sql).get(...p) as T;

/** Batting runs and balls faced from raw deliveries (super overs and dropped matches excluded). */
function recountBatting(cricsheetId: string, comp: string, season: string) {
  return one<{ runs: number; balls: number }>(
    `SELECT COALESCE(SUM(d.runs_batter),0) runs, COALESCE(SUM(d.wides = 0),0) balls
     FROM deliveries d
     JOIN matches m ON m.match_id = d.match_id
     JOIN competitions c ON c.competition_id = m.competition_id
     JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
     JOIN players p ON p.player_key = d.batter
     WHERE p.cricsheet_id = ? AND c.code = ? AND m.season_label = ? AND i.super_over = 0 AND m.in_latest_source = 1`,
    cricsheetId, comp, season);
}
/** Bowling runs conceded (bat + wides + no-balls) and legal balls from raw deliveries. */
function recountBowling(cricsheetId: string, comp: string, season: string) {
  return one<{ conceded: number; legal: number }>(
    `SELECT COALESCE(SUM(d.runs_batter + d.wides + d.noballs),0) conceded, COALESCE(SUM(d.wides = 0 AND d.noballs = 0),0) legal
     FROM deliveries d
     JOIN matches m ON m.match_id = d.match_id
     JOIN competitions c ON c.competition_id = m.competition_id
     JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
     JOIN players p ON p.player_key = d.bowler
     WHERE p.cricsheet_id = ? AND c.code = ? AND m.season_label = ? AND i.super_over = 0 AND m.in_latest_source = 1`,
    cricsheetId, comp, season);
}
function leagueRate(comp: string, season: string, kind: "bat" | "bowl") {
  const b = one<{ runs_batter: number; balls_faced: number; runs_conceded: number; legal_balls: number }>(
    `SELECT b.runs_batter, b.balls_faced, b.runs_conceded, b.legal_balls FROM competition_baselines b
     JOIN competitions c USING (competition_id) WHERE c.code = ? AND b.season_label = ? AND b.phase = 'all'`, comp, season);
  return kind === "bat" ? b.runs_batter / b.balls_faced : b.runs_conceded / b.legal_balls;
}

const SAMPLES = [
  { id: "f29185a1", name: "Abhishek Sharma", d: "batting" as const },
  { id: "0a509d6b", name: "RK Singh", d: "batting" as const },
  { id: "bbd41817", name: "AD Russell", d: "batting" as const },
  { id: "462411b3", name: "JJ Bumrah", d: "bowling" as const },
  { id: "9d430b40", name: "SP Narine", d: "bowling" as const },
];

test("independent recount: counts, league index and shrinkage for five players (last two IPL seasons)", async () => {
  let checked = 0;
  for (const s of SAMPLES) {
    // Last two IPL seasons via rankings (search by name narrows to the player).
    const lb = (await get(`/rankings?discipline=${s.d}&competitions=ipl&recentSeasons=2&minBalls=1&limit=100&search=${encodeURIComponent(s.name)}`)).body.data
      .find((r: Rating) => r.cricsheet_id === s.id);
    if (!lb) continue; // player absent from the last two IPL seasons
    let actual = 0, expected = 0, balls = 0;
    for (const season of lb.seasons) {
      if (s.d === "batting") {
        const c = recountBatting(s.id, "ipl", season);
        actual += c.runs; balls += c.balls; expected += c.balls * leagueRate("ipl", season, "bat");
      } else {
        const c = recountBowling(s.id, "ipl", season);
        actual += c.conceded; balls += c.legal; expected += c.legal * leagueRate("ipl", season, "bowl");
      }
    }
    const metric = s.d === "batting" ? lb.metrics.strike_rate : lb.metrics.economy;
    assert.equal(lb.balls, balls, `${s.name}: balls`);
    assert.equal(s.d === "batting" ? lb.counts.runs : lb.counts.runs_conceded, actual, `${s.name}: runs`);
    const index = (100 * actual) / expected;
    assert.ok(Math.abs(metric.index - index) < 1e-6, `${s.name}: index ${metric.index} vs ${index}`);
    assert.ok(Math.abs(metric.shrunk - (balls * index + 120 * 100) / (balls + 120)) < 1e-6, `${s.name}: shrunk`);
    checked++;
  }
  assert.ok(checked >= 4, `recounted ${checked} players`);
});

test("independent recount: IPL 2026 strike-rate percentile rebuilt from raw tables", async () => {
  const season = "2026";
  const rate = leagueRate("ipl", season, "bat");
  const rows = raw.prepare(
    `SELECT p.cricsheet_id id, SUM(d.runs_batter) runs, SUM(d.wides = 0) balls
     FROM deliveries d JOIN matches m ON m.match_id = d.match_id JOIN competitions c ON c.competition_id = m.competition_id
     JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no JOIN players p ON p.player_key = d.batter
     WHERE c.code = 'ipl' AND m.season_label = ? AND i.super_over = 0 AND m.in_latest_source = 1
     GROUP BY d.batter HAVING balls >= 120`).all(season) as { id: string; runs: number; balls: number }[];
  const shrunk = rows.map((r) => shrink((100 * r.runs) / (r.balls * rate), r.balls));
  const pct = percentileRanks(shrunk, "higher");
  const mine = rows.findIndex((r) => r.id === "f29185a1");
  assert.ok(mine >= 0);
  const api = (await get(`/rankings?discipline=batting&competitions=ipl&recentSeasons=1&limit=100&search=Abhishek%20Sharma`)).body.data
    .find((r: Rating) => r.cricsheet_id === "f29185a1");
  assert.equal(api.metrics.strike_rate.population, rows.length, "population size");
  assert.equal(api.metrics.strike_rate.percentile, pct[mine], "percentile");
});

test("edge cases: insufficient samples get no percentile; a zero-ball rating has no value", async () => {
  const { ratePlayers } = await import("../src/services/scout/scout-service");
  const rs = ratePlayers({ discipline: "batting", competitions: ["ipl"], seasons: { ipl: ["2026"] }, minBalls: 120 });
  const small = rs.filter((r) => r.balls > 0 && r.balls < 120);
  assert.ok(small.length > 0);
  for (const r of small) {
    assert.equal(r.metrics.strike_rate.percentile, null, `${r.name} (${r.balls} balls)`);
    assert.notEqual(r.tier, "rankable");
  }
  const zero = rs.find((r) => r.balls === 0);
  if (zero) {
    assert.equal(zero.metrics.strike_rate.value, null);
    assert.equal(zero.metrics.strike_rate.percentile, null);
  }
  // Subset requests rank against the same population as the full list.
  const full = rs.find((r) => r.balls >= 120)!;
  const subset = ratePlayers({ discipline: "batting", competitions: ["ipl"], seasons: { ipl: ["2026"] }, minBalls: 120, playerKeys: [full.player_key] })[0];
  assert.equal(subset.metrics.strike_rate.percentile, full.metrics.strike_rate.percentile);
  assert.equal(subset.metrics.strike_rate.population, full.metrics.strike_rate.population);
});
