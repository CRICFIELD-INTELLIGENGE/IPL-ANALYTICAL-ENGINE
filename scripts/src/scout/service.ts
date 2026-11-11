// Scouting service — deterministic, read-only queries over global.db.
//
// Every figure is a calculation over stored counts; there is no model or LLM
// output anywhere in this file. Definitions:
//
//  League adjustment  For each player-season, the expected count is the player's balls × the league's rate for the
//                     same competition, season and phase (league totals = sums over agg_batting / agg_bowling).
//                     Index = 100 × actual ÷ expected, so 100 is league average for the balls they actually faced.
//  Shrinkage          shrunk = (balls × index + K × 100) ÷ (balls + K), K = 120 balls. Small samples are pulled
//                     toward 100, so 35 hot balls cannot outrank 600 good ones.
//  Intervals          95%. Strike rate / economy: normal approximation using that league-phase's per-ball variance
//                     (the player's own variance is not observable from aggregates). Proportions (boundary %, dot %,
//                     wicket rate, dismissal rate): Wilson score interval.
//  Percentiles        Mid-rank percentile of the shrunk index within the population (same competition, same phase,
//                     at least `minBalls` balls, optional role filter); direction-aware, so 100 = best.
//  Sample tiers       rankable ≥ 120 balls, low 60–119, insufficient < 60 (metrics.ts).

import type { DatabaseSync } from "node:sqlite";
import { all, one } from "../global/db";
import { type Phase, sampleTier, wilsonInterval } from "../global/metrics";
import {
  type BattingInningsRow, type BowlingInningsRow, battingInputs, battingRole, bowlingInputs, bowlingRole,
} from "./roles";
import { effectiveBowlingType, type EffectiveBowlingType } from "./enrichment";

export const SHRINK_K = 120;
export type Discipline = "batting" | "bowling";
export type PhaseKey = Phase | "all";

export interface MetricDef { id: string; label: string; better: "higher" | "lower"; unit: string }
export const BATTING_METRICS: MetricDef[] = [
  { id: "strike_rate", label: "Strike rate", better: "higher", unit: "runs/100 balls" },
  { id: "boundary_pct", label: "Boundary %", better: "higher", unit: "% of balls faced" },
  { id: "dot_pct", label: "Dot %", better: "lower", unit: "% of balls faced" },
  { id: "balls_per_dismissal", label: "Balls per dismissal", better: "higher", unit: "balls" },
];
export const BOWLING_METRICS: MetricDef[] = [
  { id: "economy", label: "Economy", better: "lower", unit: "runs/6 legal balls" },
  { id: "wicket_rate", label: "Strike rate (balls per wicket)", better: "higher", unit: "wickets per legal ball (index); balls per wicket shown" },
  { id: "dot_pct", label: "Dot %", better: "higher", unit: "% of legal balls" },
  { id: "boundary_pct", label: "Boundary % conceded", better: "lower", unit: "% of legal balls" },
];

export interface MetricValue {
  value: number | null;          // the player's raw rate
  league: number | null;          // league rate for the same balls (expected ÷ balls, in the metric's unit)
  index: number | null;           // 100 = league average for those balls
  shrunk: number | null;
  ci: [number, number] | null;    // 95% interval on the index
  percentile: number | null;      // 100 = best in the population
  population: number;
}

export interface Rating {
  player_key: number;
  cricsheet_id: string;
  name: string;
  competition: string;
  seasons: string[];
  discipline: Discipline;
  phase: PhaseKey;
  balls: number;
  matches: number;
  innings: number;
  tier: "rankable" | "low" | "insufficient";
  counts: Record<string, number>;
  metrics: Record<string, MetricValue>;
  role: { label: string; inputs: Record<string, number> };
  partialSeasons: string[];
  teams: string[];
  /** Share of the player's balls in matches the source labels as a lower division (event group containing "Plate"); null when the window has none. */
  lowerDivisionShare: number | null;
}

/** SQL for the phase of delivery d in match m, matching metrics.phaseOf. */
const PHASE_SQL = `CASE WHEN d.over_no < (CASE WHEN m.balls_per_over = 5 THEN 5 ELSE 6 END) THEN 'powerplay' WHEN d.over_no < 15 THEN 'middle' ELSE 'death' END`;

export interface RatingQuery {
  discipline: Discipline;
  competitions: string[];
  phase?: PhaseKey;
  /** Last N seasons of each competition (default: all seasons). */
  recentSeasons?: number;
  /** Explicit seasons per competition code (overrides recentSeasons). */
  seasons?: Record<string, string[]>;
  minBalls?: number;
  /** Keep only these window roles (e.g. ['middle_specialist', 'multi_phase'] or ['opener']). */
  roles?: string[];
  playerKeys?: number[];
}

// ── helpers ────────────────────────────────────────────────────────────────

export function competitionId(db: DatabaseSync, code: string): number {
  const r = one<{ competition_id: number }>(db, "SELECT competition_id FROM competitions WHERE code = ?", code);
  if (!r) throw new Error(`unknown competition "${code}"`);
  return r.competition_id;
}

export function windowSeasons(db: DatabaseSync, code: string, q: Pick<RatingQuery, "recentSeasons" | "seasons">): string[] {
  if (q.seasons?.[code]) return q.seasons[code];
  const s = all<{ season_label: string }>(db, "SELECT season_label FROM seasons WHERE competition_id = ? ORDER BY season_year, start_date", competitionId(db, code)).map((r) => r.season_label);
  return q.recentSeasons ? s.slice(-q.recentSeasons) : s;
}

const inList = (xs: (string | number)[]) => xs.map(() => "?").join(",");

const Z95 = 1.959964;

/** Mid-rank percentile, direction-aware: 100 = best. */
export function percentileRanks(values: (number | null)[], better: "higher" | "lower"): (number | null)[] {
  const v = values.map((x, i) => ({ x, i })).filter((e): e is { x: number; i: number } => e.x != null);
  const out: (number | null)[] = values.map(() => null);
  const n = v.length;
  if (!n) return out;
  const sorted = [...v].sort((a, b) => (better === "higher" ? a.x - b.x : b.x - a.x));
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].x === sorted[i].x) j++;
    const pct = n === 1 ? 50 : (100 * ((i + j) / 2)) / (n - 1);
    for (let k = i; k <= j; k++) out[sorted[k].i] = Math.round(pct * 10) / 10;
    i = j + 1;
  }
  return out;
}

export const shrink = (index: number | null, balls: number, k = SHRINK_K) => (index == null ? null : (balls * index + k * 100) / (balls + k));

// ── core: league-adjusted ratings ──────────────────────────────────────────

interface SeasonCounts { player_key: number; season_label: string; matches: number; innings: number; balls: number; a: number; b: number; c: number; d: number; e: number }
interface LeagueRates { balls: number; a: number; b: number; c: number; d: number; e: number }

/**
 * Ratings for one competition. Batting counts: a = runs, b = boundaries, c = dots, d = dismissals.
 * Bowling counts: a = runs conceded, b = wickets, c = dots, d = boundaries conceded, e = all deliveries.
 */
function competitionRatings(db: DatabaseSync, code: string, q: RatingQuery): Rating[] {
  const cid = competitionId(db, code);
  const phase = q.phase ?? "all";
  const seasons = windowSeasons(db, code, q);
  if (!seasons.length) return [];
  const minBalls = q.minBalls ?? 120;
  const bat = q.discipline === "batting";
  const sql = bat
    ? `SELECT player_key, season_label, matches, innings, balls_faced balls, runs a, fours + sixes b, dots c, dismissals d, 0 e
       FROM agg_batting WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`
    : `SELECT player_key, season_label, matches, innings, legal_balls balls, runs_conceded a, wickets b, dots c, fours + sixes d, balls e
       FROM agg_bowling WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`;
  const rows = all<SeasonCounts>(db, sql, cid, phase, ...seasons);

  // League rates per season = sums over every player in that competition-season-phase.
  const league = new Map<string, LeagueRates>();
  for (const r of rows) {
    const l = league.get(r.season_label) ?? league.set(r.season_label, { balls: 0, a: 0, b: 0, c: 0, d: 0, e: 0 }).get(r.season_label)!;
    l.balls += r.balls; l.a += r.a; l.b += r.b; l.c += r.c; l.d += r.d; l.e += r.e;
  }
  // Per-ball variance for the strike-rate / economy intervals, pooled over the window.
  const v = all<{ n: number; s: number; q: number }>(db, bat
    ? `SELECT SUM(faced_n) n, SUM(faced_sum) s, SUM(faced_sumsq) q FROM scout_phase_variance WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`
    : `SELECT SUM(legal_n) n, SUM(conceded_sum) s, SUM(conceded_sumsq) q FROM scout_phase_variance WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`,
  cid, phase, ...seasons)[0];
  const perBallVar = v && v.n ? v.q / v.n - (v.s / v.n) ** 2 : 0;

  const partial = all<{ season_label: string }>(db, `SELECT season_label FROM scout_coverage WHERE competition_id = ? AND status = 'partial' AND season_label IN (${inList(seasons)})`, cid, ...seasons).map((r) => r.season_label);

  // Pool each player over the window, accumulating expected counts season by season.
  type Pool = { matches: number; innings: number; balls: number; a: number; b: number; c: number; d: number; e: number; ea: number; eb: number; ec: number; ed: number; seasons: string[] };
  const pools = new Map<number, Pool>();
  for (const r of rows) {
    if (q.playerKeys && !q.playerKeys.includes(r.player_key)) continue;
    const l = league.get(r.season_label)!;
    const p = pools.get(r.player_key) ?? pools.set(r.player_key, { matches: 0, innings: 0, balls: 0, a: 0, b: 0, c: 0, d: 0, e: 0, ea: 0, eb: 0, ec: 0, ed: 0, seasons: [] }).get(r.player_key)!;
    p.matches += r.matches; p.innings += r.innings; p.balls += r.balls; p.a += r.a; p.b += r.b; p.c += r.c; p.d += r.d; p.e += r.e;
    if (l.balls > 0) { p.ea += (r.balls * l.a) / l.balls; p.eb += (r.balls * l.b) / l.balls; p.ec += (r.balls * l.c) / l.balls; p.ed += (r.balls * l.d) / l.balls; }
    p.seasons.push(r.season_label);
  }

  // Window roles from per-innings usage.
  const keys = [...pools.keys()];
  if (!keys.length) return [];
  const only = q.playerKeys ? ` AND player_key IN (${inList(q.playerKeys)})` : "";
  const onlyArgs = q.playerKeys ?? [];
  const roleOf = new Map<number, { label: string; inputs: Record<string, number> }>();
  {
    if (bat) {
      const by = new Map<number, BattingInningsRow[]>();
      for (const r of all<BattingInningsRow & { player_key: number }>(db, `SELECT player_key, position, entry_legal_ball, balls_faced, faced_powerplay, faced_death
        FROM scout_batting_innings WHERE competition_id = ? AND season_label IN (${inList(seasons)})${only}`, cid, ...seasons, ...onlyArgs)) {
        (by.get(r.player_key) ?? by.set(r.player_key, []).get(r.player_key)!).push(r);
      }
      for (const k of keys) { const inp = battingInputs(by.get(k) ?? []); roleOf.set(k, { label: battingRole(inp), inputs: { ...inp } }); }
    } else {
      const by = new Map<number, BowlingInningsRow[]>();
      for (const r of all<BowlingInningsRow & { player_key: number }>(db, `SELECT player_key, legal_balls, legal_powerplay, legal_middle, legal_death, new_ball
        FROM scout_bowling_innings WHERE competition_id = ? AND season_label IN (${inList(seasons)})${only}`, cid, ...seasons, ...onlyArgs)) {
        (by.get(r.player_key) ?? by.set(r.player_key, []).get(r.player_key)!).push(r);
      }
      for (const k of keys) { const inp = bowlingInputs(by.get(k) ?? []); roleOf.set(k, { label: bowlingRole(inp), inputs: { ...inp } }); }
    }
  }

  const names = new Map(all<{ player_key: number; cricsheet_id: string; name: string }>(db,
    `SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name FROM players WHERE player_key IN (${inList(keys)})`, ...keys).map((r) => [r.player_key, r]));
  const teams = new Map<number, Set<string>>();
  for (const r of all<{ player_key: number; team: string }>(db, `SELECT DISTINCT a.player_key, t.name team FROM agg_appearances a JOIN teams t USING (team_id)
    WHERE a.competition_id = ? AND a.season_label IN (${inList(seasons)})${only.replace("player_key", "a.player_key")}`, cid, ...seasons, ...onlyArgs)) {
    (teams.get(r.player_key) ?? teams.set(r.player_key, new Set()).get(r.player_key)!).add(r.team);
  }

  // Lower-division exposure (e.g. SMAT Plate Group), only where the source labels it.
  const lower = new Map<number, number>();
  const hasLower = (one<{ n: number }>(db, `SELECT COUNT(*) n FROM matches WHERE competition_id = ? AND season_label IN (${inList(seasons)}) AND event_group LIKE '%Plate%'`, cid, ...seasons)?.n ?? 0) > 0;
  if (hasLower) {
    const who = bat ? "d.batter" : "d.bowler";
    const ball = bat ? "d.wides = 0" : "d.wides = 0 AND d.noballs = 0";
    for (const r of all<{ pk: number; n: number }>(db, `SELECT ${who} pk, SUM(${ball}) n FROM deliveries d JOIN matches m ON m.match_id = d.match_id
      JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
      WHERE m.competition_id = ? AND m.season_label IN (${inList(seasons)}) AND i.super_over = 0 AND m.event_group LIKE '%Plate%'
      ${phase === "all" ? "" : `AND ${PHASE_SQL} = '${phase}'`} GROUP BY ${who}`, cid, ...seasons)) lower.set(r.pk, r.n);
  }

  const zz = Z95;
  const out: Rating[] = [];
  for (const [k, p] of pools) {
    const role = roleOf.get(k) ?? { label: "unknown", inputs: {} };
    if (q.roles && !q.roles.includes(role.label)) continue;
    const n = p.balls;
    const idx = (actual: number, expected: number) => (expected > 0 ? (100 * actual) / expected : null);
    const metrics: Record<string, MetricValue> = {};
    const prop = (count: number, expected: number, scale: number) => {
      const w = wilsonInterval(count, n);
      const ep = n ? expected / n : 0;
      return {
        value: n ? (scale * count) / n : null,
        league: n ? scale * ep : null,
        index: idx(count, expected),
        ci: w && ep > 0 ? [w.low / ep, w.high / ep] as [number, number] : null,
      };
    };
    if (bat) {
      const sd = Math.sqrt(perBallVar * n);
      const sr = { value: n ? (100 * p.a) / n : null, league: n ? (100 * p.ea) / n : null, index: idx(p.a, p.ea),
        ci: p.ea > 0 ? [(100 * (p.a - zz * sd)) / p.ea, (100 * (p.a + zz * sd)) / p.ea] as [number, number] : null };
      const bnd = prop(p.b, p.eb, 100);
      const dot = prop(p.c, p.ec, 100);
      // Balls per dismissal: index = expected dismissals ÷ actual (both +1 to keep 0-dismissal samples finite).
      const wd = wilsonInterval(p.d, n);
      const bpd = {
        value: p.d ? n / p.d : null, league: p.ed ? n / p.ed : null,
        index: (100 * (p.ed + 1)) / (p.d + 1),
        ci: wd && wd.high > 0 && n ? [(100 * p.ed) / ((wd.high / 100) * n), wd.low > 0 ? (100 * p.ed) / ((wd.low / 100) * n) : Infinity] as [number, number] : null,
      };
      for (const [id, m] of [["strike_rate", sr], ["boundary_pct", bnd], ["dot_pct", dot], ["balls_per_dismissal", bpd]] as const) {
        metrics[id] = { ...m, shrunk: shrink(m.index, n), percentile: null, population: 0 };
      }
    } else {
      const sd = Math.sqrt(perBallVar * n);
      const eco = { value: n ? (6 * p.a) / n : null, league: n ? (6 * p.ea) / n : null, index: idx(p.a, p.ea),
        ci: p.ea > 0 ? [(100 * (p.a - zz * sd)) / p.ea, (100 * (p.a + zz * sd)) / p.ea] as [number, number] : null };
      const wk = prop(p.b, p.eb, 1);
      const wkt = { ...wk, value: p.b ? n / p.b : null, league: p.eb ? n / p.eb : null };
      const dot = prop(p.c, p.ec, 100);
      const bnd = prop(p.d, p.ed, 100);
      for (const [id, m] of [["economy", eco], ["wicket_rate", wkt], ["dot_pct", dot], ["boundary_pct", bnd]] as const) {
        metrics[id] = { ...m, shrunk: shrink(m.index, n), percentile: null, population: 0 };
      }
    }
    const nm = names.get(k);
    out.push({
      player_key: k, cricsheet_id: nm?.cricsheet_id ?? "", name: nm?.name ?? String(k), competition: code, seasons: p.seasons,
      discipline: q.discipline, phase, balls: n, matches: p.matches, innings: p.innings, tier: sampleTier(n),
      counts: bat ? { runs: p.a, boundaries: p.b, dots: p.c, dismissals: p.d } : { runs_conceded: p.a, wickets: p.b, dots: p.c, boundaries: p.d, deliveries: p.e },
      metrics, role, partialSeasons: partial.filter((s) => p.seasons.includes(s)), teams: [...(teams.get(k) ?? [])],
      lowerDivisionShare: hasLower && n > 0 ? (lower.get(k) ?? 0) / n : null,
    });
  }

  // Percentiles within the qualifying population of this competition.
  const pop = out.filter((r) => r.balls >= minBalls);
  for (const m of bat ? BATTING_METRICS : BOWLING_METRICS) {
    const ranks = percentileRanks(pop.map((r) => r.metrics[m.id].shrunk), m.better);
    pop.forEach((r, i) => { r.metrics[m.id].percentile = ranks[i]; r.metrics[m.id].population = pop.length; });
  }
  return out;
}

/** League-adjusted ratings for every player in the given competitions and window. Rows below minBalls carry no percentile. */
export function ratePlayers(db: DatabaseSync, q: RatingQuery): Rating[] {
  return q.competitions.flatMap((c) => competitionRatings(db, c, q));
}

export function metricDefs(d: Discipline) { return d === "batting" ? BATTING_METRICS : BOWLING_METRICS; }

/** Strengths ≥ 75th percentile, weaknesses ≤ 25th, in plain words built from the numbers. */
export function strengthsAndWeaknesses(r: Rating): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [], weaknesses: string[] = [];
  for (const m of metricDefs(r.discipline)) {
    const x = r.metrics[m.id];
    if (x.percentile == null) continue;
    const text = `${m.label} ${fmtMetric(m.id, x.value)} vs league ${fmtMetric(m.id, x.league)} (${Math.round(x.percentile)}th pct of ${x.population})`;
    if (x.percentile >= 75) strengths.push(text);
    else if (x.percentile <= 25) weaknesses.push(text);
  }
  return { strengths, weaknesses };
}

export function fmtMetric(id: string, v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (id.endsWith("_pct")) return `${v.toFixed(1)}%`;
  if (id === "economy") return v.toFixed(2);
  if (id === "wicket_rate" || id === "balls_per_dismissal") return v.toFixed(1);
  return v.toFixed(1);
}

// ── players, attributes, profiles ──────────────────────────────────────────

export interface PlayerRef { player_key: number; cricsheet_id: string; name: string; unique_name: string | null }

/** Resolve by Cricsheet id, or by an exact register/unique/written name. Ambiguous names return every candidate. */
export function resolvePlayer(db: DatabaseSync, ref: string): { player: PlayerRef | null; candidates: PlayerRef[] } {
  const byId = one<PlayerRef>(db, "SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name, unique_name FROM players WHERE cricsheet_id = ?", ref);
  if (byId) return { player: byId, candidates: [byId] };
  const c = all<PlayerRef>(db, `SELECT DISTINCT p.player_key, p.cricsheet_id, COALESCE(p.unique_name, p.name) name, p.unique_name FROM players p
    JOIN player_names n USING (player_key) WHERE n.name = ? AND p.player_key IN (SELECT DISTINCT player_key FROM match_players)`, ref);
  return { player: c.length === 1 ? c[0] : null, candidates: c };
}

export interface PlayerAttributes { bowling: EffectiveBowlingType; battingHand: string | null; cappedStatus2026: { value: string; confidence: string; evidence: string } | null; sources: { attribute: string; value: string; source: string; confidence: string }[] }

export function playerAttributes(db: DatabaseSync, playerKey: number): PlayerAttributes {
  const rows = all<{ attribute: string; value: string; normalized: string | null; source: string; confidence: string; evidence: string }>(db,
    "SELECT attribute, value, normalized, source, confidence, evidence FROM player_attributes WHERE player_key = ?", playerKey);
  const hand = rows.filter((r) => r.attribute === "batting_hand");
  const hands = new Set(hand.map((r) => r.normalized));
  const capped = rows.find((r) => r.attribute === "capped_status_2026");
  return {
    bowling: effectiveBowlingType(rows.filter((r) => r.attribute === "bowling_style")),
    battingHand: hands.size === 1 ? [...hands][0] : hands.size > 1 ? "conflict" : null,
    cappedStatus2026: capped ? { value: capped.value, confidence: capped.confidence, evidence: capped.evidence } : null,
    sources: rows.map((r) => ({ attribute: r.attribute, value: r.value, source: r.source, confidence: r.confidence })),
  };
}

export interface SeasonLine {
  competition: string; season: string; coverage: string; team: string;
  batting_role: string; bowling_role: string; usage: string;
  bat: { innings: number; runs: number; balls: number; sr: number | null; avg: number | null; srIndex: number | null; tier: string } | null;
  bowl: { innings: number; legal: number; wickets: number; economy: number | null; econIndex: number | null; tier: string } | null;
}

/** Season-by-season lines with roles and league-relative indices (all phases). */
export function seasonLines(db: DatabaseSync, playerKey: number): SeasonLine[] {
  const comps = all<{ code: string; competition_id: number }>(db, `SELECT DISTINCT c.code, c.competition_id FROM agg_appearances a JOIN competitions c USING (competition_id)
    WHERE a.player_key = ? ORDER BY c.competition_id`, playerKey);
  const out: SeasonLine[] = [];
  for (const c of comps) {
    const seasons = all<{ season_label: string; status: string }>(db, `SELECT s.season_label, COALESCE(sc.status, 'complete') status FROM seasons s
      LEFT JOIN scout_coverage sc ON sc.competition_id = s.competition_id AND sc.season_label = s.season_label
      WHERE s.competition_id = ? AND s.season_label IN (SELECT season_label FROM agg_appearances WHERE player_key = ? AND competition_id = ?) ORDER BY s.season_year`, c.competition_id, playerKey, c.competition_id);
    for (const s of seasons) {
      const one1 = (d: Discipline) => ratePlayers(db, { discipline: d, competitions: [c.code], seasons: { [c.code]: [s.season_label] }, playerKeys: [playerKey], minBalls: 1e9 })[0];
      const b = one1("batting"), w = one1("bowling");
      const role = one<{ batting_role: string; bowling_role: string; usage_profile: string }>(db,
        "SELECT batting_role, bowling_role, usage_profile FROM scout_roles WHERE player_key = ? AND competition_id = ? AND season_label = ?", playerKey, c.competition_id, s.season_label);
      const team = all<{ name: string }>(db, `SELECT t.name FROM agg_appearances a JOIN teams t USING (team_id) WHERE a.player_key = ? AND a.competition_id = ? AND a.season_label = ?`,
        playerKey, c.competition_id, s.season_label).map((r) => r.name).join(" / ");
      out.push({
        competition: c.code, season: s.season_label, coverage: s.status, team,
        batting_role: role?.batting_role ?? "—", bowling_role: role?.bowling_role ?? "—", usage: role?.usage_profile ?? "—",
        bat: b ? { innings: b.innings, runs: b.counts.runs, balls: b.balls, sr: b.metrics.strike_rate.value, avg: b.counts.dismissals ? b.counts.runs / b.counts.dismissals : null, srIndex: b.metrics.strike_rate.index, tier: b.tier } : null,
        bowl: w ? { innings: w.innings, legal: w.balls, wickets: w.counts.wickets, economy: w.metrics.economy.value, econIndex: w.metrics.economy.index, tier: w.tier } : null,
      });
    }
  }
  return out;
}

export interface Trend { competition: string; discipline: Discipline; metric: string; latestSeason: string; latest: number | null; earlier: number | null; change: number | null; verdict: "improving" | "declining" | "stable" | "insufficient sample"; detail: string }

/**
 * Latest season vs the player's earlier seasons in the same competition, on the league-adjusted index.
 * A change counts only when the 95% interval of the difference excludes zero.
 */
export function trends(db: DatabaseSync, playerKey: number): Trend[] {
  const out: Trend[] = [];
  const comps = all<{ code: string }>(db, `SELECT DISTINCT c.code FROM agg_appearances a JOIN competitions c USING (competition_id) WHERE a.player_key = ?`, playerKey).map((r) => r.code);
  for (const code of comps) {
    for (const [d, metric] of [["batting", "strike_rate"], ["bowling", "economy"]] as const) {
      const played = all<{ season_label: string }>(db, `SELECT DISTINCT a.season_label FROM ${d === "batting" ? "agg_batting" : "agg_bowling"} a JOIN seasons s USING (competition_id, season_label)
        WHERE a.player_key = ? AND a.competition_id = ? AND a.phase = 'all' AND ${d === "batting" ? "a.balls_faced" : "a.legal_balls"} > 0 ORDER BY s.season_year`, playerKey, competitionId(db, code)).map((r) => r.season_label);
      if (played.length < 2) continue;
      const latestSeason = played[played.length - 1];
      const latest = ratePlayers(db, { discipline: d, competitions: [code], seasons: { [code]: [latestSeason] }, playerKeys: [playerKey], minBalls: 1e9 })[0];
      const earlier = ratePlayers(db, { discipline: d, competitions: [code], seasons: { [code]: played.slice(0, -1) }, playerKeys: [playerKey], minBalls: 1e9 })[0];
      const L = latest?.metrics[metric], E = earlier?.metrics[metric];
      if (!latest || !earlier || !L?.index || !E?.index || !L.ci || !E.ci || latest.balls < 60 || earlier.balls < 60) {
        out.push({ competition: code, discipline: d, metric, latestSeason, latest: L?.index ?? null, earlier: E?.index ?? null, change: null, verdict: "insufficient sample",
          detail: `latest ${latest?.balls ?? 0} balls, earlier ${earlier?.balls ?? 0} balls (need 60 each)` });
        continue;
      }
      const se = (ci: [number, number]) => (ci[1] - ci[0]) / (2 * Z95);
      const diff = L.index - E.index;
      const seDiff = Math.sqrt(se(L.ci) ** 2 + se(E.ci) ** 2);
      const better = metric === "economy" ? diff < 0 : diff > 0;
      const significant = Math.abs(diff) > Z95 * seDiff;
      out.push({
        competition: code, discipline: d, metric, latestSeason, latest: L.index, earlier: E.index, change: diff,
        verdict: !significant ? "stable" : better ? "improving" : "declining",
        detail: `${metric} index ${E.index.toFixed(0)} → ${L.index.toFixed(0)} (±${(Z95 * seDiff).toFixed(0)} at 95%); ${earlier.balls} → ${latest.balls} balls`,
      });
    }
  }
  return out;
}

/** Nearest players on league-adjusted indices and phase usage, within the same discipline (rankable samples only). */
export function similarPlayers(db: DatabaseSync, playerKey: number, q: { discipline: Discipline; competitions: string[]; recentSeasons?: number; limit?: number }): { player: Rating | null; similar: (Rating & { distance: number })[] } {
  const pool = ratePlayers(db, { discipline: q.discipline, competitions: q.competitions, recentSeasons: q.recentSeasons, minBalls: 120 }).filter((r) => r.balls >= 120);
  const defs = metricDefs(q.discipline);
  const feat = (r: Rating) => [
    ...defs.map((m) => r.metrics[m.id].shrunk ?? 100),
    100 * (r.role.inputs.powerplayShare ?? 0), 100 * (r.role.inputs.deathShare ?? 0), 100 * (r.role.inputs.middleShare ?? 1 - (r.role.inputs.powerplayShare ?? 0) - (r.role.inputs.deathShare ?? 0)),
  ];
  const X = pool.map(feat);
  const dims = X[0]?.length ?? 0;
  const mean = Array.from({ length: dims }, (_, j) => X.reduce((s, x) => s + x[j], 0) / X.length);
  const sd = Array.from({ length: dims }, (_, j) => Math.sqrt(X.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / X.length) || 1);
  const zf = (x: number[]) => x.map((v, j) => (v - mean[j]) / sd[j]);
  // The target's own row: the competition where they faced/bowled the most in the window.
  const own = pool.filter((r) => r.player_key === playerKey).sort((a, b) => b.balls - a.balls)[0] ?? null;
  if (!own) return { player: null, similar: [] };
  const t = zf(feat(own));
  // Bowlers: when the target's type is verified, compare only with bowlers of the same verified type.
  const ownType = q.discipline === "bowling" ? playerAttributes(db, playerKey).bowling.type : "unknown";
  const sameType = (r: Rating) => ownType !== "spin" && ownType !== "pace" ? true : playerAttributes(db, r.player_key).bowling.type === ownType;
  const similar = pool.filter((r) => r.player_key !== playerKey && sameType(r))
    .map((r) => ({ ...r, distance: Math.sqrt(zf(feat(r)).reduce((s, v, j) => s + (v - t[j]) ** 2, 0)) }))
    .sort((a, b) => a.distance - b.distance).slice(0, q.limit ?? 8);
  return { player: own, similar };
}

/** IPL appearances in the loaded IPL data (fact from match squads). */
export function iplAppearances(db: DatabaseSync, playerKey: number): number {
  return one<{ n: number }>(db, `SELECT COALESCE(SUM(a.matches), 0) n FROM agg_appearances a JOIN competitions c USING (competition_id) WHERE c.code = 'ipl' AND a.player_key = ?`, playerKey)?.n ?? 0;
}

export function debutSeason(db: DatabaseSync, playerKey: number, code: string): string | null {
  return one<{ s: string }>(db, `SELECT a.season_label s FROM agg_appearances a JOIN seasons se USING (competition_id, season_label)
    WHERE a.player_key = ? AND a.competition_id = ? ORDER BY se.season_year, se.start_date LIMIT 1`, playerKey, competitionId(db, code))?.s ?? null;
}
