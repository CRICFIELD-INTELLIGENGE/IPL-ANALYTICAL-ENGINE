// Decision Intelligence OS — Phase 1: historical database overview.
//
// What is in the warehouse, season by season, and how far each part of it
// can be trusted. The data-health checks are computed live against the
// tables (not hard-coded), so a bad re-ingest shows up here first.

import { normalizeSeason, queryAll } from "./db";
import { round } from "./impact-model";
import { getPlayerMeta } from "./player-profiles";
import { getFranchiseRefs, getMatchStages, getVenueRefs } from "./stats-engine";

export interface SeasonSummary {
  season: string;
  matches: number;
  runs: number;
  wickets: number;
  sixes: number;
  fours: number;
  runRate: number | null;
  avgFirstInnings: number | null;
  champion: string | null;
  runnerUp: string | null;
  orangeCap: { player: string; runs: number } | null;
  purpleCap: { player: string; wickets: number } | null;
}

export interface HealthCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "info";
  value: string;
  detail: string;
}

export interface HistoryOverview {
  coverage: {
    seasons: number;
    firstSeason: string;
    lastSeason: string;
    matches: number;
    deliveries: number;
    players: number;
    venues: number;
    franchises: number;
    firstMatch: string | null;
    lastMatch: string | null;
  };
  seasons: SeasonSummary[];
  health: HealthCheck[];
  ms: number;
}

const BOWLER_KINDS = "('bowled','caught','caught and bowled','lbw','stumped','hit wicket')";
const pct = (a: number, b: number) => (b > 0 ? round((a / b) * 100, 1) : 0);
const fmt = (n: number) => n.toLocaleString("en-US");

let cache: HistoryOverview | null = null;

export function getHistoryOverview(): HistoryOverview {
  if (cache) return cache;
  const t0 = Date.now();
  const meta = getPlayerMeta();
  const franchises = getFranchiseRefs();
  const teamName = new Map<number, string>();
  for (const fr of franchises) for (const id of fr.teamIds) teamName.set(id, fr.name);

  /* Coverage */
  const m0 = queryAll<{ n: number; first: string; last: string }>("SELECT COUNT(*) n, MIN(date) first, MAX(date) last FROM matches")[0];
  const deliveries = queryAll<{ n: number }>("SELECT COUNT(*) n FROM deliveries")[0]?.n ?? 0;
  const players = queryAll<{ n: number }>(`
    SELECT COUNT(*) n FROM (SELECT batter_id p FROM deliveries UNION SELECT bowler_id FROM deliveries UNION SELECT non_striker_id FROM deliveries)`)[0]?.n ?? 0;
  const franchisesPlayed = new Set(queryAll<{ t: number }>("SELECT team1_id t FROM matches UNION SELECT team2_id FROM matches").map((r) => teamName.get(r.t)));

  /* Season lines */
  const bySeason = new Map<string, SeasonSummary>();
  const season = (raw: string): SeasonSummary => {
    const s = normalizeSeason(raw);
    let row = bySeason.get(s);
    if (!row) {
      row = { season: s, matches: 0, runs: 0, wickets: 0, sixes: 0, fours: 0, runRate: null, avgFirstInnings: null, champion: null, runnerUp: null, orangeCap: null, purpleCap: null };
      bySeason.set(s, row);
    }
    return row;
  };
  for (const r of queryAll<{ s: string; n: number }>("SELECT season_id s, COUNT(*) n FROM matches GROUP BY s")) season(r.s).matches = r.n;
  for (const r of queryAll<{ s: string; runs: number; legal: number; sixes: number; fours: number }>(`
    SELECT m.season_id s, SUM(d.total_runs) runs,
      SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) legal,
      SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes,
      SUM(CASE WHEN d.batter_runs = 4 THEN 1 ELSE 0 END) fours
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE i.innings_number IN (1, 2) GROUP BY s`)) {
    const row = season(r.s);
    row.runs = r.runs; row.sixes = r.sixes; row.fours = r.fours;
    row.runRate = r.legal ? round((r.runs / r.legal) * 6, 2) : null;
  }
  for (const r of queryAll<{ s: string; n: number }>(`
    SELECT m.season_id s, COUNT(*) n FROM dismissals x
    JOIN deliveries d ON d.delivery_id = x.delivery_id JOIN innings i ON i.innings_id = d.innings_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE x.kind <> 'retired hurt' AND i.innings_number IN (1, 2) GROUP BY s`)) season(r.s).wickets = r.n;
  for (const r of queryAll<{ s: string; avg: number }>(`
    SELECT s, AVG(runs) avg FROM (
      SELECT m.season_id s, d.innings_id, SUM(d.total_runs) runs
      FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
      WHERE i.innings_number = 1 GROUP BY d.innings_id) GROUP BY s`)) season(r.s).avgFirstInnings = round(r.avg, 1);

  // Champion = winner of that season's final; runner-up = the other finalist.
  const { finals } = getMatchStages();
  for (const r of queryAll<{ s: string; winner: number | null; t1: number; t2: number }>(`
    SELECT season_id s, winner_id winner, team1_id t1, team2_id t2 FROM matches
    WHERE match_id IN (${finals.map(() => "?").join(",") || "NULL"})`, ...finals)) {
    const row = season(r.s);
    if (r.winner === null) continue;
    row.champion = teamName.get(r.winner) ?? null;
    row.runnerUp = teamName.get(r.winner === r.t1 ? r.t2 : r.t1) ?? null;
  }

  const capLeader = <T extends { s: string; pid: number; n: number }>(rows: T[]) => {
    const best = new Map<string, T>();
    for (const r of rows) {
      const s = normalizeSeason(r.s);
      const cur = best.get(s);
      if (!cur || r.n > cur.n) best.set(s, r);
    }
    return best;
  };
  for (const [s, r] of capLeader(queryAll<{ s: string; pid: number; n: number }>(`
    SELECT m.season_id s, d.batter_id pid, SUM(d.batter_runs) n
    FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE i.innings_number IN (1, 2) GROUP BY s, pid`))) {
    season(s).orangeCap = { player: meta.get(r.pid)?.name ?? `#${r.pid}`, runs: r.n };
  }
  for (const [s, r] of capLeader(queryAll<{ s: string; pid: number; n: number }>(`
    SELECT m.season_id s, d.bowler_id pid, COUNT(*) n
    FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id
    JOIN innings i ON i.innings_id = d.innings_id JOIN matches m ON m.match_id = d.match_id
    WHERE x.kind IN ${BOWLER_KINDS} AND i.innings_number IN (1, 2) GROUP BY s, pid`))) {
    season(s).purpleCap = { player: meta.get(r.pid)?.name ?? `#${r.pid}`, wickets: r.n };
  }

  const seasons = [...bySeason.values()].sort((a, b) => b.season.localeCompare(a.season));

  /* Data health */
  const health: HealthCheck[] = [];
  const withBalls = queryAll<{ n: number }>("SELECT COUNT(DISTINCT match_id) n FROM deliveries")[0]?.n ?? 0;
  health.push({
    id: "coverage", label: "Ball-by-ball coverage",
    status: withBalls === m0.n ? "ok" : "warn",
    value: `${fmt(withBalls)} / ${fmt(m0.n)} matches`,
    detail: withBalls === m0.n ? "Every match in the database has full ball-by-ball data." : "Some matches have no deliveries; they are missing from player stats.",
  });

  const batDeliveries = queryAll<{ n: number }>("SELECT SUM(batter_runs) n FROM deliveries")[0]?.n ?? 0;
  const batScorecard = queryAll<{ n: number }>("SELECT SUM(runs) n FROM fact_batting_innings")[0]?.n ?? 0;
  health.push({
    id: "batting-reconcile", label: "Batting scorecards reconcile",
    status: batDeliveries === batScorecard ? "ok" : "warn",
    value: batDeliveries === batScorecard ? "Exact match" : `${fmt(Math.abs(batDeliveries - batScorecard))} runs apart`,
    detail: `${fmt(batDeliveries)} runs summed ball by ball vs ${fmt(batScorecard)} on the batting scorecards.`,
  });

  const wktDeliveries = queryAll<{ n: number }>(`SELECT COUNT(*) n FROM dismissals WHERE kind IN ${BOWLER_KINDS}`)[0]?.n ?? 0;
  const wktScorecard = queryAll<{ n: number }>("SELECT SUM(wickets) n FROM fact_bowling_spells")[0]?.n ?? 0;
  const retiredOut = queryAll<{ n: number }>("SELECT COUNT(*) n FROM dismissals WHERE kind = 'retired out'")[0]?.n ?? 0;
  const wktGap = wktScorecard - wktDeliveries;
  health.push({
    id: "bowling-reconcile", label: "Bowling scorecards reconcile",
    status: wktGap === 0 ? "ok" : wktGap === retiredOut ? "info" : "warn",
    value: wktGap === 0 ? "Exact match" : `${fmt(Math.abs(wktGap))} wickets apart`,
    detail: wktGap !== 0 && wktGap === retiredOut
      ? `The fact_bowling_spells table credits ${retiredOut} "retired out" dismissals to the bowler. They are not bowler wickets, so stats here use the dismissals table (${fmt(wktDeliveries)} wickets).`
      : `${fmt(wktDeliveries)} bowler wickets in the dismissals table vs ${fmt(wktScorecard)} on the bowling scorecards.`,
  });

  const badInnings = queryAll<{ n: number }>(`
    SELECT COUNT(*) n FROM innings i
    JOIN (SELECT innings_id, SUM(total_runs) r FROM deliveries GROUP BY innings_id) d ON d.innings_id = i.innings_id
    WHERE i.runs <> d.r`)[0]?.n ?? 0;
  health.push({
    id: "innings-totals", label: "Innings totals match deliveries",
    status: badInnings === 0 ? "ok" : "warn",
    value: badInnings === 0 ? "All innings" : `${fmt(badInnings)} innings differ`,
    detail: "Team totals stored on each innings are checked against the sum of its deliveries. Stats here always use the deliveries.",
  });

  const superOvers = queryAll<{ n: number }>("SELECT COUNT(*) n FROM innings WHERE innings_number > 2")[0]?.n ?? 0;
  health.push({
    id: "super-overs", label: "Super overs", status: "info",
    value: `${fmt(superOvers)} innings excluded`,
    detail: "Super-over innings are kept in the database but left out of every stat, as in official IPL records.",
  });

  const fielded = queryAll<{ total: number; known: number }>(`
    SELECT COUNT(*) total, SUM(CASE WHEN fielder_id IS NOT NULL THEN 1 ELSE 0 END) known
    FROM dismissals WHERE kind IN ('caught', 'stumped', 'run out')`)[0];
  const fielderPct = pct(fielded?.known ?? 0, fielded?.total ?? 0);
  health.push({
    id: "fielders", label: "Fielder on catches & stumpings",
    status: fielderPct >= 90 ? "ok" : "warn",
    value: `${fielderPct}% recorded`,
    detail: fielderPct >= 90 ? "Fielding stats are available." : "Fielders are missing from the dismissals table, so catches can't be credited yet. Wicketkeepers are identified from stumpings in the raw Cricsheet files instead.",
  });

  const speed = queryAll<{ n: number }>("SELECT COUNT(*) n FROM delivery_commentary WHERE speed_kph > 60")[0]?.n ?? 0;
  health.push({
    id: "ball-speed", label: "Ball speed recorded", status: "info",
    value: `${pct(speed, deliveries)}% of balls`,
    detail: `${fmt(speed)} deliveries carry a speed reading — enough to tell pace from spin for most current bowlers, not for speed analysis.`,
  });

  // Metadata coverage weighted by balls, so a missing 2008 fringe player counts for little.
  const faced = queryAll<{ pid: number; n: number }>("SELECT batter_id pid, COUNT(*) n FROM deliveries GROUP BY pid");
  const bowled = queryAll<{ pid: number; n: number }>("SELECT bowler_id pid, COUNT(*) n FROM deliveries GROUP BY pid");
  const weighted = (rows: { pid: number; n: number }[], known: (id: number) => boolean) => {
    const total = rows.reduce((s, r) => s + r.n, 0);
    return pct(rows.filter((r) => known(r.pid)).reduce((s, r) => s + r.n, 0), total);
  };
  const countryPct = weighted(faced, (id) => meta.get(id)?.country != null);
  const handPct = weighted(faced, (id) => meta.get(id)?.battingHand != null);
  const typePct = weighted(bowled, (id) => {
    const t = meta.get(id)?.bowlingType;
    return t === "pace" || t === "spin";
  });
  health.push({
    id: "nationality", label: "Player nationality known", status: countryPct >= 90 ? "ok" : "warn",
    value: `${countryPct}% of balls faced`,
    detail: "Drives overseas / Indian filters and the 4-overseas rule. Unknown players are treated as Indian.",
  });
  health.push({
    id: "bowling-type", label: "Pace / spin known", status: typePct >= 90 ? "ok" : "warn",
    value: `${typePct}% of balls bowled`,
    detail: "From recorded ball speeds first, then listed bowling styles. Bowlers of unknown type are left out of pace/spin filters.",
  });
  health.push({
    id: "batting-hand", label: "Batting hand known", status: handPct >= 90 ? "ok" : "warn",
    value: `${handPct}% of balls faced`,
    detail: "Left/right-hander filters only include batters whose hand is listed in the bio or style sources.",
  });

  const venues = getVenueRefs().filter((v) => v.venueIds.length);
  cache = {
    coverage: {
      seasons: seasons.length,
      firstSeason: seasons.at(-1)?.season ?? "",
      lastSeason: seasons[0]?.season ?? "",
      matches: m0.n,
      deliveries,
      players,
      venues: venues.length,
      franchises: franchisesPlayed.size,
      firstMatch: m0.first,
      lastMatch: m0.last,
    },
    seasons,
    health,
    ms: Date.now() - t0,
  };
  return cache;
}
