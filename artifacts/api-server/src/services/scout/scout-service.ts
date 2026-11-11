// Scout Lab — Deterministic Global Scouting Engine.
//
// Read-only multi-league cricket intelligence over global.db.
// Covers IPL, SMAT, BBL, SA20, CPL, ILT20 across 3,309+ matches.
//
// Every metric is mathematically derived from stored delivery counts:
//  - League adjustment: expected count = player's balls * league rate for same competition/season/phase.
//    Index = 100 * actual / expected.
//  - Empirical Bayes shrinkage: shrunk = (balls * index + 120 * 100) / (balls + 120).
//  - 95% confidence intervals: Wilson score for proportions; pooled normal approximation for rates.
//  - Direction-aware percentiles: 100 = best in qualifying population.

import { getGlobalDb, queryAll, queryOne } from "./db";
import { computeBayesianTrueTalent, computePlayerDna, type PlayerDnaFingerprint } from "./true-talent-model";

export const SHRINK_K = 120;
export const Z95 = 1.959964;

export type Discipline = "batting" | "bowling";
export type PhaseKey = "all" | "powerplay" | "middle" | "death";

export interface MetricDef {
  id: string;
  label: string;
  better: "higher" | "lower";
  unit: string;
}

export const BATTING_METRICS: MetricDef[] = [
  { id: "strike_rate", label: "Strike rate", better: "higher", unit: "runs/100 balls" },
  { id: "boundary_pct", label: "Boundary %", better: "higher", unit: "% of balls faced" },
  { id: "dot_pct", label: "Dot %", better: "lower", unit: "% of balls faced" },
  { id: "balls_per_dismissal", label: "Balls per dismissal", better: "higher", unit: "balls" },
];

export const BOWLING_METRICS: MetricDef[] = [
  { id: "economy", label: "Economy", better: "lower", unit: "runs/6 legal balls" },
  { id: "wicket_rate", label: "Strike rate (balls per wicket)", better: "higher", unit: "balls per wicket" },
  { id: "dot_pct", label: "Dot %", better: "higher", unit: "% of legal balls" },
  { id: "boundary_pct", label: "Boundary % conceded", better: "lower", unit: "% of legal balls" },
];

export interface MetricValue {
  value: number | null;
  league: number | null;
  index: number | null;
  shrunk: number | null;
  ci: [number, number] | null;
  percentile: number | null;
  population: number;
  trueTalent?: number | null;
  credibleInterval?: [number, number] | null;
  skillRatio?: number | null;
  luckRatio?: number | null;
  sustainabilityProb?: number | null;
  kBayes?: number;
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
  dna?: PlayerDnaFingerprint;
  partialSeasons: string[];
  teams: string[];
  lowerDivisionShare: number | null;
}

export interface RatingQuery {
  discipline: Discipline;
  competitions: string[];
  phase?: PhaseKey;
  recentSeasons?: number;
  seasons?: Record<string, string[]>;
  minBalls?: number;
  roles?: string[];
  playerKeys?: number[];
  /**
   * Compute percentiles (default true). Percentiles are always ranked against the full
   * eligible population (same competition, phase, window, roles and minBalls), and only
   * then narrowed to `playerKeys`. Set false for per-player lookups that never show a
   * percentile (season lines, trends): they then skip computing the other players.
   */
  percentiles?: boolean;
}

export const sampleTier = (balls: number): "rankable" | "low" | "insufficient" =>
  balls >= 120 ? "rankable" : balls >= 60 ? "low" : "insufficient";

export function wilsonInterval(k: number, n: number, z = Z95): { low: number; high: number } | null {
  if (n <= 0) return null;
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
  return { low: Math.max(0, 100 * (centre - half)), high: Math.min(100, 100 * (centre + half)) };
}

export function shrink(index: number | null, balls: number, k = SHRINK_K): number | null {
  return index == null ? null : (balls * index + k * 100) / (balls + k);
}

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

// ── Roles logic ────────────────────────────────────────────────────────────

export type BattingRole = "opener" | "top_order" | "middle_order" | "finisher" | "lower_order" | "insufficient";
export type BowlingRole = "powerplay_specialist" | "middle_specialist" | "death_specialist" | "multi_phase" | "part_time" | "insufficient" | "none";

export interface BattingInputs { innings: number; openShare: number; medianPosition: number; medianEntryBall: number; ballsFaced: number; deathShare: number; powerplayShare: number }
export interface BowlingInputs { innings: number; legalBalls: number; oversPerInnings: number; powerplayShare: number; middleShare: number; deathShare: number; newBallShare: number }

export const T20_PHASE_SHARE = { powerplay: 6 / 20, middle: 9 / 20, death: 5 / 20 };
export const SPECIALIST_FACTOR = 1.6;

export function battingRole(x: BattingInputs): BattingRole {
  if (x.innings < 3) return "insufficient";
  if (x.openShare >= 0.5) return "opener";
  if (x.medianPosition >= 8) return "lower_order";
  if (x.medianEntryBall >= 72 || (x.deathShare >= 0.5 && x.medianPosition >= 5)) return "finisher";
  if (x.medianEntryBall < 36) return "top_order";
  return "middle_order";
}

export function bowlingRole(x: BowlingInputs, share = T20_PHASE_SHARE): BowlingRole {
  if (x.legalBalls === 0) return "none";
  if (x.legalBalls < 60) return "insufficient";
  if (x.oversPerInnings < 1.5) return "part_time";
  const qualifying = ([["powerplay", x.powerplayShare], ["middle", x.middleShare], ["death", x.deathShare]] as const)
    .filter(([phase, s]) => s >= SPECIALIST_FACTOR * share[phase]);
  if (qualifying.length === 1) return `${qualifying[0][0]}_specialist` as BowlingRole;
  return "multi_phase";
}

export function usageProfile(bat: BattingRole, bowl: BowlingRole, stumpings = 0): string {
  const bats = bat !== "insufficient" && bat !== "lower_order";
  const bowls = bowl !== "none" && bowl !== "insufficient" && bowl !== "part_time";
  if (stumpings > 0 && bats) return "keeper_batter";
  if (bats && bowls) return "all_rounder";
  if (bowls) return "bowler";
  if (bats) return "batter";
  return "limited";
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface BattingInningsRow { position: number; entry_legal_ball: number; balls_faced: number; faced_powerplay: number; faced_death: number }
export interface BowlingInningsRow { legal_balls: number; legal_powerplay: number; legal_middle: number; legal_death: number; new_ball: number }

export function battingInputs(rows: BattingInningsRow[]): BattingInputs {
  const faced = rows.reduce((s, r) => s + r.balls_faced, 0);
  return {
    innings: rows.length,
    openShare: rows.length ? rows.filter((r) => r.position <= 2).length / rows.length : 0,
    medianPosition: median(rows.map((r) => r.position)),
    medianEntryBall: median(rows.map((r) => r.entry_legal_ball)),
    ballsFaced: faced,
    deathShare: faced ? rows.reduce((s, r) => s + r.faced_death, 0) / faced : 0,
    powerplayShare: faced ? rows.reduce((s, r) => s + r.faced_powerplay, 0) / faced : 0,
  };
}

export function bowlingInputs(rows: BowlingInningsRow[]): BowlingInputs {
  const legal = rows.reduce((s, r) => s + r.legal_balls, 0);
  return {
    innings: rows.length,
    legalBalls: legal,
    oversPerInnings: rows.length ? legal / 6 / rows.length : 0,
    powerplayShare: legal ? rows.reduce((s, r) => s + r.legal_powerplay, 0) / legal : 0,
    middleShare: legal ? rows.reduce((s, r) => s + r.legal_middle, 0) / legal : 0,
    deathShare: legal ? rows.reduce((s, r) => s + r.legal_death, 0) / legal : 0,
    newBallShare: rows.length ? rows.filter((r) => r.new_ball).length / rows.length : 0,
  };
}

// ── Bowling style enrichment ───────────────────────────────────────────────

export interface EffectiveBowlingType {
  type: "pace" | "spin" | "unknown";
  subtypes: string[];
  arm: "right" | "left" | null;
  action: string | null;
  sources: { source: string; confidence: string; raw: string }[];
}

export function effectiveBowlingType(styles: { value: string; source: string; confidence: string }[]): EffectiveBowlingType {
  const norm = styles.map((s) => s.value.toLowerCase().trim());
  const arms = new Set(norm.map((s) => (s.includes("left") ? "left" : s.includes("right") ? "right" : null)).filter(Boolean));
  const paces = norm.filter((s) => /fast|medium|seam|pace/.test(s));
  const spins = norm.filter((s) => /spin|break|orthodox|googly|chinaman/.test(s));
  const type: "pace" | "spin" | "unknown" = paces.length && !spins.length ? "pace" : spins.length && !paces.length ? "spin" : "unknown";
  const arm = arms.size === 1 ? [...arms][0] as "left" | "right" : null;
  const action = norm.find((s) => /orthodox|chinaman|off-break|leg-break/.test(s)) ?? null;
  return {
    type,
    subtypes: [...new Set(norm)],
    arm,
    action,
    sources: styles.map((s) => ({ source: s.source, confidence: s.confidence, raw: s.value })),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const inList = (xs: (string | number)[]) => xs.map(() => "?").join(",");

export function competitionId(code: string): number {
  const r = queryOne<{ competition_id: number }>("SELECT competition_id FROM competitions WHERE code = ?", code);
  if (!r) throw new Error(`unknown competition "${code}"`);
  return r.competition_id;
}

export function windowSeasons(code: string, q: Pick<RatingQuery, "recentSeasons" | "seasons">): string[] {
  if (q.seasons?.[code]) return q.seasons[code];
  const cid = competitionId(code);
  const s = queryAll<{ season_label: string }>(
    "SELECT season_label FROM seasons WHERE competition_id = ? ORDER BY season_year, start_date", cid
  ).map((r) => r.season_label);
  return q.recentSeasons ? s.slice(-q.recentSeasons) : s;
}

export function listCompetitions(): { code: string; name: string }[] {
  return queryAll<{ code: string; name: string }>("SELECT code, name FROM competitions ORDER BY competition_id");
}

// ── Ratings core ───────────────────────────────────────────────────────────

interface SeasonCounts {
  player_key: number;
  season_label: string;
  matches: number;
  innings: number;
  balls: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

interface LeagueRates {
  balls: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

const PHASE_SQL = `CASE WHEN d.over_no < (CASE WHEN m.balls_per_over = 5 THEN 5 ELSE 6 END) THEN 'powerplay' WHEN d.over_no < 15 THEN 'middle' ELSE 'death' END`;

/**
 * Day 8: percentiles need the whole eligible population, so every player lookup (and every rankings page) used to
 * re-rate the full competition from global.db: /api/scout/player/:id took ~690 ms warm. global.db is read-only while
 * the server runs, so the full population is computed once per (competition, discipline, phase, seasons, minBalls,
 * roles) and narrowed per request. Callers receive top-level copies. Bounded: POP_CACHE_MAX populations.
 */
const POP_CACHE_MAX = 64;
const populationCache = new Map<string, Rating[]>();

function competitionRatings(code: string, q: RatingQuery): Rating[] {
  if (q.percentiles === false) return competitionRatingsUncached(code, q);
  const key = JSON.stringify([code, q.discipline, q.phase ?? "all", windowSeasons(code, q), q.minBalls ?? 120, q.roles ? [...q.roles].sort() : null]);
  let all = populationCache.get(key);
  if (all) {
    populationCache.delete(key); // refresh recency
  } else {
    all = competitionRatingsUncached(code, { ...q, playerKeys: undefined });
  }
  populationCache.set(key, all);
  while (populationCache.size > POP_CACHE_MAX) populationCache.delete(populationCache.keys().next().value!);
  const rows = q.playerKeys ? all.filter((r) => q.playerKeys!.includes(r.player_key)) : all;
  return rows.map((r) => ({ ...r }));
}

function competitionRatingsUncached(code: string, q: RatingQuery): Rating[] {
  const cid = competitionId(code);
  const phase = q.phase ?? "all";
  const seasons = windowSeasons(code, q);
  if (!seasons.length) return [];
  const minBalls = q.minBalls ?? 120;
  const bat = q.discipline === "batting";
  const wantPercentiles = q.percentiles !== false;
  // With percentiles, rate everyone first so ranks use the full population; narrow at the end.
  const subsetKeys = wantPercentiles ? undefined : q.playerKeys;

  const sql = bat
    ? `SELECT player_key, season_label, matches, innings, balls_faced balls, runs a, fours + sixes b, dots c, dismissals d, 0 e
       FROM agg_batting WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`
    : `SELECT player_key, season_label, matches, innings, legal_balls balls, runs_conceded a, wickets b, dots c, fours + sixes d, balls e
       FROM agg_bowling WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`;

  const rows = queryAll<SeasonCounts>(sql, cid, phase, ...seasons);

  const league = new Map<string, LeagueRates>();
  for (const r of rows) {
    const l = league.get(r.season_label) ?? league.set(r.season_label, { balls: 0, a: 0, b: 0, c: 0, d: 0, e: 0 }).get(r.season_label)!;
    l.balls += r.balls; l.a += r.a; l.b += r.b; l.c += r.c; l.d += r.d; l.e += r.e;
  }

  const v = queryAll<{ n: number; s: number; q: number }>(bat
    ? `SELECT SUM(faced_n) n, SUM(faced_sum) s, SUM(faced_sumsq) q FROM scout_phase_variance WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`
    : `SELECT SUM(legal_n) n, SUM(conceded_sum) s, SUM(conceded_sumsq) q FROM scout_phase_variance WHERE competition_id = ? AND phase = ? AND season_label IN (${inList(seasons)})`,
    cid, phase, ...seasons)[0];
  const perBallVar = v && v.n ? v.q / v.n - (v.s / v.n) ** 2 : 0;

  const partial = queryAll<{ season_label: string }>(
    `SELECT season_label FROM scout_coverage WHERE competition_id = ? AND status = 'partial' AND season_label IN (${inList(seasons)})`,
    cid, ...seasons
  ).map((r) => r.season_label);

  type Pool = {
    matches: number; innings: number; balls: number;
    a: number; b: number; c: number; d: number; e: number;
    ea: number; eb: number; ec: number; ed: number;
    seasons: string[];
  };
  const pools = new Map<number, Pool>();
  for (const r of rows) {
    if (subsetKeys && !subsetKeys.includes(r.player_key)) continue;
    const l = league.get(r.season_label)!;
    const p = pools.get(r.player_key) ?? pools.set(r.player_key, {
      matches: 0, innings: 0, balls: 0,
      a: 0, b: 0, c: 0, d: 0, e: 0,
      ea: 0, eb: 0, ec: 0, ed: 0,
      seasons: [],
    }).get(r.player_key)!;
    p.matches += r.matches; p.innings += r.innings; p.balls += r.balls;
    p.a += r.a; p.b += r.b; p.c += r.c; p.d += r.d; p.e += r.e;
    if (l.balls > 0) {
      p.ea += (r.balls * l.a) / l.balls;
      p.eb += (r.balls * l.b) / l.balls;
      p.ec += (r.balls * l.c) / l.balls;
      p.ed += (r.balls * l.d) / l.balls;
    }
    p.seasons.push(r.season_label);
  }

  const keys = [...pools.keys()];
  if (!keys.length) return [];

  const only = subsetKeys ? ` AND player_key IN (${inList(subsetKeys)})` : "";
  const onlyArgs = subsetKeys ?? [];
  const roleOf = new Map<number, { label: string; inputs: Record<string, number> }>();
  {
    if (bat) {
      const by = new Map<number, BattingInningsRow[]>();
      for (const r of queryAll<BattingInningsRow & { player_key: number }>(
        `SELECT player_key, position, entry_legal_ball, balls_faced, faced_powerplay, faced_death
         FROM scout_batting_innings WHERE competition_id = ? AND season_label IN (${inList(seasons)})${only}`,
        cid, ...seasons, ...onlyArgs
      )) {
        (by.get(r.player_key) ?? by.set(r.player_key, []).get(r.player_key)!).push(r);
      }
      for (const k of keys) {
        const inp = battingInputs(by.get(k) ?? []);
        roleOf.set(k, { label: battingRole(inp), inputs: { ...inp } });
      }
    } else {
      const by = new Map<number, BowlingInningsRow[]>();
      for (const r of queryAll<BowlingInningsRow & { player_key: number }>(
        `SELECT player_key, legal_balls, legal_powerplay, legal_middle, legal_death, new_ball
         FROM scout_bowling_innings WHERE competition_id = ? AND season_label IN (${inList(seasons)})${only}`,
        cid, ...seasons, ...onlyArgs
      )) {
        (by.get(r.player_key) ?? by.set(r.player_key, []).get(r.player_key)!).push(r);
      }
      for (const k of keys) {
        const inp = bowlingInputs(by.get(k) ?? []);
        roleOf.set(k, { label: bowlingRole(inp), inputs: { ...inp } });
      }
    }
  }

  const names = new Map(queryAll<{ player_key: number; cricsheet_id: string; name: string }>(
    `SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name FROM players WHERE player_key IN (${inList(keys)})`, ...keys
  ).map((r) => [r.player_key, r]));

  const teams = new Map<number, Set<string>>();
  for (const r of queryAll<{ player_key: number; team: string }>(
    `SELECT DISTINCT a.player_key, t.name team FROM agg_appearances a JOIN teams t USING (team_id)
     WHERE a.competition_id = ? AND a.season_label IN (${inList(seasons)})${only.replace("player_key", "a.player_key")}`,
    cid, ...seasons, ...onlyArgs
  )) {
    (teams.get(r.player_key) ?? teams.set(r.player_key, new Set()).get(r.player_key)!).add(r.team);
  }

  const lower = new Map<number, number>();
  const hasLower = (queryOne<{ n: number }>(
    `SELECT COUNT(*) n FROM matches WHERE competition_id = ? AND season_label IN (${inList(seasons)}) AND event_group LIKE '%Plate%'`,
    cid, ...seasons
  )?.n ?? 0) > 0;
  if (hasLower) {
    const who = bat ? "d.batter" : "d.bowler";
    const ball = bat ? "d.wides = 0" : "d.wides = 0 AND d.noballs = 0";
    for (const r of queryAll<{ pk: number; n: number }>(
      `SELECT ${who} pk, SUM(${ball}) n FROM deliveries d JOIN matches m ON m.match_id = d.match_id
       JOIN innings i ON i.match_id = d.match_id AND i.innings_no = d.innings_no
       WHERE m.competition_id = ? AND m.season_label IN (${inList(seasons)}) AND i.super_over = 0 AND m.event_group LIKE '%Plate%'
       ${phase === "all" ? "" : `AND ${PHASE_SQL} = '${phase}'`} GROUP BY ${who}`,
      cid, ...seasons
    )) lower.set(r.pk, r.n);
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
      const sr = {
        value: n ? (100 * p.a) / n : null,
        league: n ? (100 * p.ea) / n : null,
        index: idx(p.a, p.ea),
        ci: p.ea > 0 ? [(100 * (p.a - zz * sd)) / p.ea, (100 * (p.a + zz * sd)) / p.ea] as [number, number] : null,
      };
      const bnd = prop(p.b, p.eb, 100);
      const dot = prop(p.c, p.ec, 100);
      const wd = wilsonInterval(p.d, n);
      const bpd = {
        value: p.d ? n / p.d : null,
        league: p.ed ? n / p.ed : null,
        index: (100 * (p.ed + 1)) / (p.d + 1),
        ci: wd && wd.high > 0 && n ? [(100 * p.ed) / ((wd.high / 100) * n), wd.low > 0 ? (100 * p.ed) / ((wd.low / 100) * n) : Infinity] as [number, number] : null,
      };
      for (const [id, m] of [["strike_rate", sr], ["boundary_pct", bnd], ["dot_pct", dot], ["balls_per_dismissal", bpd]] as const) {
        const bayes = computeBayesianTrueTalent(id, m.index, n, "batting");
        metrics[id] = {
          ...m,
          shrunk: shrink(m.index, n),
          percentile: null,
          population: 0,
          trueTalent: bayes.trueTalent,
          credibleInterval: bayes.credibleInterval,
          skillRatio: bayes.skillRatio,
          luckRatio: bayes.luckRatio,
          sustainabilityProb: bayes.sustainabilityProb,
          kBayes: bayes.kBayes,
        };
      }
    } else {
      const sd = Math.sqrt(perBallVar * n);
      const eco = {
        value: n ? (6 * p.a) / n : null,
        league: n ? (6 * p.ea) / n : null,
        index: idx(p.a, p.ea),
        ci: p.ea > 0 ? [(100 * (p.a - zz * sd)) / p.ea, (100 * (p.a + zz * sd)) / p.ea] as [number, number] : null,
      };
      const wk = prop(p.b, p.eb, 1);
      const wkt = { ...wk, value: p.b ? n / p.b : null, league: p.eb ? n / p.eb : null };
      const dot = prop(p.c, p.ec, 100);
      const bnd = prop(p.d, p.ed, 100);
      for (const [id, m] of [["economy", eco], ["wicket_rate", wkt], ["dot_pct", dot], ["boundary_pct", bnd]] as const) {
        const bayes = computeBayesianTrueTalent(id, m.index, n, "bowling");
        metrics[id] = {
          ...m,
          shrunk: shrink(m.index, n),
          percentile: null,
          population: 0,
          trueTalent: bayes.trueTalent,
          credibleInterval: bayes.credibleInterval,
          skillRatio: bayes.skillRatio,
          luckRatio: bayes.luckRatio,
          sustainabilityProb: bayes.sustainabilityProb,
          kBayes: bayes.kBayes,
        };
      }
    }

    const nm = names.get(k);
    out.push({
      player_key: k,
      cricsheet_id: nm?.cricsheet_id ?? "",
      name: nm?.name ?? String(k),
      competition: code,
      seasons: p.seasons,
      discipline: q.discipline,
      phase,
      balls: n,
      matches: p.matches,
      innings: p.innings,
      tier: sampleTier(n),
      counts: bat
        ? { runs: p.a, boundaries: p.b, dots: p.c, dismissals: p.d }
        : { runs_conceded: p.a, wickets: p.b, dots: p.c, boundaries: p.d, deliveries: p.e },
      metrics,
      role,
      dna: computePlayerDna(q.discipline, role.label, metrics),
      partialSeasons: partial.filter((s) => p.seasons.includes(s)),
      teams: [...(teams.get(k) ?? [])],
      lowerDivisionShare: hasLower && n > 0 ? (lower.get(k) ?? 0) / n : null,
    });
  }

  // Percentile population: every eligible player in this competition/phase/window
  // (and role filter), never just the requested subset.
  const pop = wantPercentiles ? out.filter((r) => r.balls >= minBalls) : [];
  for (const m of bat ? BATTING_METRICS : BOWLING_METRICS) {
    const ranks = percentileRanks(pop.map((r) => r.metrics[m.id].shrunk), m.better);
    pop.forEach((r, i) => {
      r.metrics[m.id].percentile = ranks[i];
      r.metrics[m.id].population = pop.length;
    });
  }

  return q.playerKeys ? out.filter((r) => q.playerKeys!.includes(r.player_key)) : out;
}

export function ratePlayers(q: RatingQuery): Rating[] {
  return q.competitions.flatMap((c) => competitionRatings(c, q));
}

export function metricDefs(d: Discipline): MetricDef[] {
  return d === "batting" ? BATTING_METRICS : BOWLING_METRICS;
}

/** The headline metric of a leaderboard: strike rate for batting, economy for bowling. */
export const primaryMetricId = (d: Discipline): string => (d === "batting" ? "strike_rate" : "economy");

/** Sort keys a leaderboard accepts for a discipline. "shrunk" = the primary metric's shrunk index. */
export function rankingSortKeys(d: Discipline): string[] {
  return ["shrunk", "balls", "matches", ...metricDefs(d).map((m) => m.id)];
}

/**
 * Order leaderboard rows.
 * - Metric sorts use the metric's direction: order "desc" means BEST first ("lower is
 *   better" metrics such as economy or dot % are compared on the negated shrunk index).
 * - "balls" / "matches": "desc" means most first.
 * - Rows with no value sort last in either order; ties break on balls (desc), then name.
 */
export function sortRatings(rows: Rating[], sortBy: string, order: "asc" | "desc", d: Discipline): Rating[] {
  const metricId = sortBy === "shrunk" ? primaryMetricId(d) : sortBy;
  const def = metricDefs(d).find((m) => m.id === metricId);
  const key = (r: Rating): number | null => {
    if (sortBy === "balls") return r.balls;
    if (sortBy === "matches") return r.matches;
    if (!def) return null;
    const v = r.metrics[def.id]?.shrunk;
    if (v == null || !Number.isFinite(v)) return null;
    return def.better === "lower" ? -v : v; // larger = better
  };
  const sign = order === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const ka = key(a), kb = key(b);
    if (ka === null && kb !== null) return 1;
    if (kb === null && ka !== null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return sign * (ka - kb);
    if (a.balls !== b.balls) return b.balls - a.balls;
    return a.name.localeCompare(b.name) || a.competition.localeCompare(b.competition);
  });
}

export function fmtMetric(id: string, v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (id.endsWith("_pct")) return `${v.toFixed(1)}%`;
  if (id === "economy") return v.toFixed(2);
  if (id === "wicket_rate" || id === "balls_per_dismissal") return v.toFixed(1);
  return v.toFixed(1);
}

export function strengthsAndWeaknesses(r: Rating): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [], weaknesses: string[] = [];
  for (const m of metricDefs(r.discipline)) {
    const x = r.metrics[m.id];
    if (x?.percentile == null) continue;
    const text = `${m.label} ${fmtMetric(m.id, x.value)} vs league ${fmtMetric(m.id, x.league)} (${Math.round(x.percentile)}th pct of ${x.population})`;
    if (x.percentile >= 75) strengths.push(text);
    else if (x.percentile <= 25) weaknesses.push(text);
  }
  return { strengths, weaknesses };
}

// ── Profile, attributes, lines, trends ─────────────────────────────────────

export interface PlayerRef {
  player_key: number;
  cricsheet_id: string;
  name: string;
  unique_name: string | null;
}

export function resolvePlayer(ref: string): { player: PlayerRef | null; candidates: PlayerRef[] } {
  const numId = parseInt(ref, 10);
  if (!Number.isNaN(numId) && String(numId) === ref.trim()) {
    const byKey = queryOne<PlayerRef>(
      "SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name, unique_name FROM players WHERE player_key = ?",
      numId
    );
    if (byKey) return { player: byKey, candidates: [byKey] };
  }

  const byId = queryOne<PlayerRef>(
    "SELECT player_key, cricsheet_id, COALESCE(unique_name, name) name, unique_name FROM players WHERE cricsheet_id = ?",
    ref
  );
  if (byId) return { player: byId, candidates: [byId] };

  const c = queryAll<PlayerRef>(
    `SELECT DISTINCT p.player_key, p.cricsheet_id, COALESCE(p.unique_name, p.name) name, p.unique_name FROM players p
     JOIN player_names n USING (player_key) WHERE n.name = ? AND p.player_key IN (SELECT DISTINCT player_key FROM match_players)`,
    ref
  );
  return { player: c.length === 1 ? c[0] : null, candidates: c };
}

export function searchPlayers(q: string, limit = 10): PlayerRef[] {
  const term = `%${q.trim()}%`;
  return queryAll<PlayerRef>(
    `SELECT DISTINCT p.player_key, p.cricsheet_id, COALESCE(p.unique_name, p.name) as name, p.unique_name
     FROM players p
     LEFT JOIN player_names n USING (player_key)
     WHERE p.name LIKE ? OR p.unique_name LIKE ? OR n.name LIKE ?
     LIMIT ?`,
    term, term, term, limit
  );
}

export interface PlayerAttributes {
  nationality: { value:string; source:string; confidence:string } | null;
  declaredRole: { value:string; source:string; confidence:string } | null;
  bowling: EffectiveBowlingType;
  battingHand: string | null;
  cappedStatus2026: { value: string; confidence: string; evidence: string } | null;
  provenance: { attribute: string; value: string; source: string; confidence: string }[];
}

export function playerAttributes(playerKey: number): PlayerAttributes {
  const rows = queryAll<{ attribute: string; value: string; normalized: string | null; source: string; confidence: string; evidence: string }>(
    "SELECT attribute, value, normalized, source, confidence, evidence FROM player_attributes WHERE player_key = ?",
    playerKey
  );
  const hand = rows.filter((r) => r.attribute === "batting_hand");
  const hands = new Set(hand.map((r) => r.normalized));
  const capped = rows.find((r) => r.attribute === "capped_status_2026");
  const countryRows = rows.filter(r => r.attribute === "nationality" || r.attribute === "auction_country");
  const country = new Set(countryRows.map(r=>r.value)).size === 1 ? countryRows[0] : undefined;
  const declared = rows.find(r=>r.attribute === "declared_role" || r.attribute === "auction_specialism");
  return {
    nationality: country ? {value:country.value,source:country.source,confidence:country.confidence} : null,
    declaredRole: declared ? {value:declared.value,source:declared.source,confidence:declared.confidence} : null,
    bowling: effectiveBowlingType(rows.filter((r) => r.attribute === "bowling_style")),
    battingHand: hands.size === 1 ? [...hands][0] : hands.size > 1 ? "conflict" : null,
    cappedStatus2026: capped ? { value: capped.value, confidence: capped.confidence, evidence: capped.evidence } : null,
    provenance: rows.map((r) => ({ attribute: r.attribute, value: r.value, source: r.source, confidence: r.confidence })),
  };
}

export interface SeasonLine {
  competition: string;
  season: string;
  coverage: string;
  team: string;
  batting_role: string;
  bowling_role: string;
  usage: string;
  bat: { innings: number; runs: number; balls: number; sr: number | null; avg: number | null; srIndex: number | null; tier: string } | null;
  bowl: { innings: number; legal: number; wickets: number; economy: number | null; econIndex: number | null; tier: string } | null;
}

export function seasonLines(playerKey: number): SeasonLine[] {
  const comps = queryAll<{ code: string; competition_id: number }>(
    `SELECT DISTINCT c.code, c.competition_id FROM agg_appearances a JOIN competitions c USING (competition_id)
     WHERE a.player_key = ? ORDER BY c.competition_id`,
    playerKey
  );
  const out: SeasonLine[] = [];
  for (const c of comps) {
    const seasons = queryAll<{ season_label: string; status: string }>(
      `SELECT s.season_label, COALESCE(sc.status, 'complete') status FROM seasons s
       LEFT JOIN scout_coverage sc ON sc.competition_id = s.competition_id AND sc.season_label = s.season_label
       WHERE s.competition_id = ? AND s.season_label IN (SELECT season_label FROM agg_appearances WHERE player_key = ? AND competition_id = ?) ORDER BY s.season_year`,
      c.competition_id, playerKey, c.competition_id
    );
    for (const s of seasons) {
      const one1 = (d: Discipline) =>
        ratePlayers({
          discipline: d,
          competitions: [c.code],
          seasons: { [c.code]: [s.season_label] },
          playerKeys: [playerKey],
          minBalls: 1e9, percentiles: false,
        })[0];
      const b = one1("batting"), w = one1("bowling");
      const role = queryOne<{ batting_role: string; bowling_role: string; usage_profile: string }>(
        "SELECT batting_role, bowling_role, usage_profile FROM scout_roles WHERE player_key = ? AND competition_id = ? AND season_label = ?",
        playerKey, c.competition_id, s.season_label
      );
      const team = queryAll<{ name: string }>(
        `SELECT t.name FROM agg_appearances a JOIN teams t USING (team_id) WHERE a.player_key = ? AND a.competition_id = ? AND a.season_label = ?`,
        playerKey, c.competition_id, s.season_label
      ).map((r) => r.name).join(" / ");

      out.push({
        competition: c.code,
        season: s.season_label,
        coverage: s.status,
        team,
        batting_role: role?.batting_role ?? "—",
        bowling_role: role?.bowling_role ?? "—",
        usage: role?.usage_profile ?? "—",
        bat: b ? { innings: b.innings, runs: b.counts.runs, balls: b.balls, sr: b.metrics.strike_rate.value, avg: b.counts.dismissals ? b.counts.runs / b.counts.dismissals : null, srIndex: b.metrics.strike_rate.index, tier: b.tier } : null,
        bowl: w ? { innings: w.innings, legal: w.balls, wickets: w.counts.wickets, economy: w.metrics.economy.value, econIndex: w.metrics.economy.index, tier: w.tier } : null,
      });
    }
  }
  return out;
}

export interface Trend {
  competition: string;
  discipline: Discipline;
  metric: string;
  latestSeason: string;
  latest: number | null;
  earlier: number | null;
  change: number | null;
  verdict: "improving" | "declining" | "stable" | "insufficient sample";
  detail: string;
}

export function trends(playerKey: number): Trend[] {
  const out: Trend[] = [];
  const comps = queryAll<{ code: string }>(
    `SELECT DISTINCT c.code FROM agg_appearances a JOIN competitions c USING (competition_id) WHERE a.player_key = ?`,
    playerKey
  ).map((r) => r.code);

  for (const code of comps) {
    for (const [d, metric] of [["batting", "strike_rate"], ["bowling", "economy"]] as const) {
      const played = queryAll<{ season_label: string }>(
        `SELECT DISTINCT a.season_label FROM ${d === "batting" ? "agg_batting" : "agg_bowling"} a JOIN seasons s USING (competition_id, season_label)
         WHERE a.player_key = ? AND a.competition_id = ? AND a.phase = 'all' AND ${d === "batting" ? "a.balls_faced" : "a.legal_balls"} > 0 ORDER BY s.season_year`,
        playerKey, competitionId(code)
      ).map((r) => r.season_label);

      if (played.length < 2) continue;
      const latestSeason = played[played.length - 1];
      const latest = ratePlayers({ discipline: d, competitions: [code], seasons: { [code]: [latestSeason] }, playerKeys: [playerKey], minBalls: 1e9, percentiles: false })[0];
      const earlier = ratePlayers({ discipline: d, competitions: [code], seasons: { [code]: played.slice(0, -1) }, playerKeys: [playerKey], minBalls: 1e9, percentiles: false })[0];
      const L = latest?.metrics[metric], E = earlier?.metrics[metric];

      if (!latest || !earlier || !L?.index || !E?.index || !L.ci || !E.ci || latest.balls < 60 || earlier.balls < 60) {
        out.push({
          competition: code, discipline: d, metric, latestSeason, latest: L?.index ?? null, earlier: E?.index ?? null, change: null, verdict: "insufficient sample",
          detail: `latest ${latest?.balls ?? 0} balls, earlier ${earlier?.balls ?? 0} balls (need 60 each)`
        });
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

export function similarPlayers(
  playerKey: number,
  q: { discipline: Discipline; competitions: string[]; recentSeasons?: number; limit?: number }
): { player: Rating | null; similar: (Rating & { distance: number })[] } {
  const pool = ratePlayers({ discipline: q.discipline, competitions: q.competitions, recentSeasons: q.recentSeasons, minBalls: 120 })
    .filter((r) => r.balls >= 120);
  const defs = metricDefs(q.discipline);
  const feat = (r: Rating) => [
    ...defs.map((m) => r.metrics[m.id]?.shrunk ?? 100),
    100 * (r.role.inputs.powerplayShare ?? 0),
    100 * (r.role.inputs.deathShare ?? 0),
    100 * (r.role.inputs.middleShare ?? 1 - (r.role.inputs.powerplayShare ?? 0) - (r.role.inputs.deathShare ?? 0)),
  ];

  const X = pool.map(feat);
  const dims = X[0]?.length ?? 0;
  if (!dims || !pool.length) return { player: null, similar: [] };

  const mean = Array.from({ length: dims }, (_, j) => X.reduce((s, x) => s + x[j], 0) / X.length);
  const sd = Array.from({ length: dims }, (_, j) => Math.sqrt(X.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / X.length) || 1);
  const zf = (x: number[]) => x.map((v, j) => (v - mean[j]) / sd[j]);

  const own = pool.filter((r) => r.player_key === playerKey).sort((a, b) => b.balls - a.balls)[0] ?? null;
  if (!own) return { player: null, similar: [] };

  const t = zf(feat(own));
  const ownType = q.discipline === "bowling" ? playerAttributes(playerKey).bowling.type : "unknown";
  const sameType = (r: Rating) => (ownType !== "spin" && ownType !== "pace" ? true : playerAttributes(r.player_key).bowling.type === ownType);

  const similar = pool
    .filter((r) => r.player_key !== playerKey && sameType(r))
    .map((r) => ({
      ...r,
      distance: Math.sqrt(zf(feat(r)).reduce((s, v, j) => s + (v - t[j]) ** 2, 0)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, q.limit ?? 8);

  return { player: own, similar };
}

export function iplAppearances(playerKey: number): number {
  return queryOne<{ n: number }>(
    `SELECT COALESCE(SUM(a.matches), 0) n FROM agg_appearances a JOIN competitions c USING (competition_id) WHERE c.code = 'ipl' AND a.player_key = ?`,
    playerKey
  )?.n ?? 0;
}

export function debutSeason(playerKey: number, code: string): string | null {
  return queryOne<{ s: string }>(
    `SELECT a.season_label s FROM agg_appearances a JOIN seasons se USING (competition_id, season_label)
     WHERE a.player_key = ? AND a.competition_id = ? ORDER BY se.season_year, se.start_date LIMIT 1`,
    playerKey, competitionId(code)
  )?.s ?? null;
}

// ── Role Catalog & Counts ──────────────────────────────────────────────────

export interface RoleCatalogItem {
  id: string;
  label: string;
  category: "batting" | "bowling" | "usage";
  definition: string;
  minUsage: string;
  activeCount: number;
}

export function getRoleCatalog(): {
  battingRoles: RoleCatalogItem[];
  bowlingRoles: RoleCatalogItem[];
  usageProfiles: RoleCatalogItem[];
  methodology: Record<string, string>;
} {
  const batCounts = new Map(
    queryAll<{ role: string; cnt: number }>(
      "SELECT batting_role role, COUNT(DISTINCT player_key) cnt FROM scout_roles GROUP BY batting_role"
    ).map((r) => [r.role, r.cnt])
  );
  const bowlCounts = new Map(
    queryAll<{ role: string; cnt: number }>(
      "SELECT bowling_role role, COUNT(DISTINCT player_key) cnt FROM scout_roles GROUP BY bowling_role"
    ).map((r) => [r.role, r.cnt])
  );
  const usageCounts = new Map(
    queryAll<{ role: string; cnt: number }>(
      "SELECT usage_profile role, COUNT(DISTINCT player_key) cnt FROM scout_roles GROUP BY usage_profile"
    ).map((r) => [r.role, r.cnt])
  );

  const battingRoles: RoleCatalogItem[] = [
    {
      id: "opener",
      label: "Opener",
      category: "batting",
      definition: "Opened the batting (positions 1–2) in at least 50% of qualifying innings.",
      minUsage: ">= 3 innings",
      activeCount: batCounts.get("opener") ?? 0,
    },
    {
      id: "top_order",
      label: "Top Order",
      category: "batting",
      definition: "Median crease arrival inside the powerplay (< 36 legal balls).",
      minUsage: ">= 3 innings",
      activeCount: batCounts.get("top_order") ?? 0,
    },
    {
      id: "middle_order",
      label: "Middle Order",
      category: "batting",
      definition: "Entered after powerplay but before over 13, and not classified as finisher.",
      minUsage: ">= 3 innings",
      activeCount: batCounts.get("middle_order") ?? 0,
    },
    {
      id: "finisher",
      label: "Finisher",
      category: "batting",
      definition: "Median arrival after 72 legal balls (over 13+), or >= 50% balls faced in death with median position >= 5.",
      minUsage: ">= 3 innings",
      activeCount: batCounts.get("finisher") ?? 0,
    },
    {
      id: "lower_order",
      label: "Lower Order",
      category: "batting",
      definition: "Median batting order position 8 or lower.",
      minUsage: ">= 3 innings",
      activeCount: batCounts.get("lower_order") ?? 0,
    },
    {
      id: "insufficient",
      label: "Insufficient Data",
      category: "batting",
      definition: "Fewer than 3 innings at the crease in the evaluated window.",
      minUsage: "< 3 innings",
      activeCount: batCounts.get("insufficient") ?? 0,
    },
  ];

  const bowlingRoles: RoleCatalogItem[] = [
    {
      id: "powerplay_specialist",
      label: "Powerplay Specialist",
      category: "bowling",
      definition: "Bowled in powerplay at least 1.6x natural share (>= 48% of legal balls).",
      minUsage: ">= 60 legal balls, >= 1.5 overs/inn",
      activeCount: bowlCounts.get("powerplay_specialist") ?? 0,
    },
    {
      id: "middle_specialist",
      label: "Middle Overs Specialist",
      category: "bowling",
      definition: "Bowled in middle phase at least 1.6x natural share (>= 72% of legal balls).",
      minUsage: ">= 60 legal balls, >= 1.5 overs/inn",
      activeCount: bowlCounts.get("middle_specialist") ?? 0,
    },
    {
      id: "death_specialist",
      label: "Death Specialist",
      category: "bowling",
      definition: "Bowled in death phase at least 1.6x natural share (>= 40% of legal balls).",
      minUsage: ">= 60 legal balls, >= 1.5 overs/inn",
      activeCount: bowlCounts.get("death_specialist") ?? 0,
    },
    {
      id: "multi_phase",
      label: "Multi-Phase Bowler",
      category: "bowling",
      definition: "Bowls across multiple match phases without a single phase exceeding the 1.6x threshold.",
      minUsage: ">= 60 legal balls, >= 1.5 overs/inn",
      activeCount: bowlCounts.get("multi_phase") ?? 0,
    },
    {
      id: "part_time",
      label: "Part-Time Bowler",
      category: "bowling",
      definition: "Averages fewer than 1.5 overs per bowling innings.",
      minUsage: "< 1.5 overs/inn",
      activeCount: bowlCounts.get("part_time") ?? 0,
    },
    {
      id: "insufficient",
      label: "Insufficient Overs",
      category: "bowling",
      definition: "Fewer than 60 legal balls bowled in the evaluated window.",
      minUsage: "< 60 legal balls",
      activeCount: bowlCounts.get("insufficient") ?? 0,
    },
    {
      id: "none",
      label: "Did Not Bowl",
      category: "bowling",
      definition: "No bowling deliveries recorded in the evaluated window.",
      minUsage: "0 balls",
      activeCount: bowlCounts.get("none") ?? 0,
    },
  ];

  const usageProfiles: RoleCatalogItem[] = [
    {
      id: "batter",
      label: "Batter",
      category: "usage",
      definition: "Regular batter who does not regularly bowl.",
      minUsage: "Batting qualified, non-bowler",
      activeCount: usageCounts.get("batter") ?? 0,
    },
    {
      id: "bowler",
      label: "Bowler",
      category: "usage",
      definition: "Regular bowler who bats in lower order or infrequently.",
      minUsage: "Bowling qualified, lower order",
      activeCount: usageCounts.get("bowler") ?? 0,
    },
    {
      id: "all_rounder",
      label: "All-Rounder",
      category: "usage",
      definition: "Both batting role (top/middle/finisher) and bowling role (specialist/multi-phase) qualified.",
      minUsage: "Dual qualification",
      activeCount: usageCounts.get("all_rounder") ?? 0,
    },
    {
      id: "keeper_batter",
      label: "Wicketkeeper-Batter",
      category: "usage",
      definition: "Bats in top 7 and has recorded stumpings as wicketkeeper.",
      minUsage: "Stumpings > 0 and bats",
      activeCount: usageCounts.get("keeper_batter") ?? 0,
    },
    {
      id: "limited",
      label: "Limited Usage",
      category: "usage",
      definition: "Sample too small or usage too sporadic for full role classification.",
      minUsage: "Below thresholds",
      activeCount: usageCounts.get("limited") ?? 0,
    },
  ];

  return {
    battingRoles,
    bowlingRoles,
    usageProfiles,
    methodology: {
      version: "roles-v1",
      leagueAdjustment: "Index = 100 * actual / expected against same competition, season, and phase baselines.",
      shrinkage: `Empirical Bayes shrinkage: shrunk = (balls * index + ${SHRINK_K} * 100) / (balls + ${SHRINK_K}). Small samples shrink toward 100.`,
      intervals: "95% Wilson score intervals for proportions; pooled phase variance normal approximation for rates.",
      percentiles: "Mid-rank tie-aware percentiles within qualifying competition population (>= 120 balls). 100 = best.",
    },
  };
}
