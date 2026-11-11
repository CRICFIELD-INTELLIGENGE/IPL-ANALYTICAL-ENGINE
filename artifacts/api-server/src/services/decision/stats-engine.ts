// Decision Intelligence OS — Phase 1: historical stats engine.
//
// A typed `StatQuery` (perspective + metric + grouping + filters) is compiled
// into parameterised SQL over the ball-by-ball warehouse. SQL only returns
// additive raw components (runs, balls, outs…); every ratio is computed here
// after merging groups, so renamed franchises (Delhi Daredevils → Capitals)
// and venue-name variants roll up correctly. Super-over innings are excluded,
// as in official IPL records.
//
// The natural-language parser (nl-parser.ts) only ever produces a StatQuery —
// it never writes SQL — so any future translator (e.g. an LLM) plugs in at
// the same, validated boundary.

import fs from "fs";
import path from "path";
import { getProjectRoot, normalizeSeason, queryAll, seasonToDbLabel, RUNS_CONCEDED_SQL } from "./db";
import { round } from "./impact-model";
import { getPlayerMeta, getSeasons } from "./player-profiles";

/* ─── Query spec ─────────────────────────────────────────────────────────── */

export type Perspective = "batting" | "bowling" | "results" | "team_innings";
export type GroupBy = "player" | "season" | "team" | "opponent" | "venue" | "phase" | "innings";
export type Phase = "powerplay" | "middle" | "death";
export type Stage = "league" | "playoffs" | "final";

export interface StatFilters {
  seasonFrom?: number;
  seasonTo?: number;
  phase?: Phase;
  overFrom?: number; // 1-indexed, inclusive
  overTo?: number;
  teamIds?: number[]; // the subject's team (batting side for batting, bowling side for bowling)
  opponentIds?: number[];
  venueIds?: number[];
  innings?: 1 | 2;
  stage?: Stage;
  playerIds?: number[]; // batters (batting) / bowlers (bowling)
  vsPlayerIds?: number[]; // the opposing bowler (batting) / batter (bowling)
  bowlingType?: "pace" | "spin";
  battingHand?: "L" | "R";
  nationality?: "overseas" | "indian";
}

export type MetricId =
  | "runs" | "balls_faced" | "strike_rate" | "average" | "fours" | "sixes" | "boundaries"
  | "boundary_pct" | "dot_pct_faced" | "innings_batted" | "fifties" | "hundreds" | "highest_score"
  | "ducks" | "run_rate" | "avg_score"
  | "wickets" | "balls_bowled" | "runs_conceded" | "economy" | "bowling_average"
  | "bowling_strike_rate" | "dot_pct" | "dot_balls" | "sixes_conceded" | "innings_bowled"
  | "four_wicket_hauls" | "five_wicket_hauls"
  | "matches" | "wins" | "losses" | "win_pct" | "titles"
  | "total";

export interface StatQuery {
  perspective: Perspective;
  metric: MetricId;
  groupBy: GroupBy;
  order: "asc" | "desc";
  sortBy: "metric" | "key";
  limit: number;
  /** Qualification: balls faced/bowled (matches for results). Auto-chosen when omitted. */
  minVolume?: number;
  filters: StatFilters;
}

interface MetricDef {
  perspective: Perspective;
  label: string;
  short: string;
  better: "high" | "low";
  rate: boolean;
  decimals: number;
  /** Needs per-innings rows (milestones, ducks, hauls). */
  perInnings?: boolean;
}

export const METRICS: Record<MetricId, MetricDef> = {
  runs: { perspective: "batting", label: "runs", short: "Runs", better: "high", rate: false, decimals: 0 },
  balls_faced: { perspective: "batting", label: "balls faced", short: "Balls", better: "high", rate: false, decimals: 0 },
  strike_rate: { perspective: "batting", label: "strike rate", short: "SR", better: "high", rate: true, decimals: 2 },
  average: { perspective: "batting", label: "batting average", short: "Avg", better: "high", rate: true, decimals: 2 },
  fours: { perspective: "batting", label: "fours", short: "4s", better: "high", rate: false, decimals: 0 },
  sixes: { perspective: "batting", label: "sixes", short: "6s", better: "high", rate: false, decimals: 0 },
  boundaries: { perspective: "batting", label: "boundaries", short: "4s+6s", better: "high", rate: false, decimals: 0 },
  boundary_pct: { perspective: "batting", label: "boundary %", short: "Bdry %", better: "high", rate: true, decimals: 1 },
  dot_pct_faced: { perspective: "batting", label: "dot-ball % faced", short: "Dot %", better: "low", rate: true, decimals: 1 },
  innings_batted: { perspective: "batting", label: "innings", short: "Inns", better: "high", rate: false, decimals: 0 },
  fifties: { perspective: "batting", label: "fifties", short: "50s", better: "high", rate: false, decimals: 0, perInnings: true },
  hundreds: { perspective: "batting", label: "hundreds", short: "100s", better: "high", rate: false, decimals: 0, perInnings: true },
  highest_score: { perspective: "batting", label: "highest score", short: "HS", better: "high", rate: false, decimals: 0, perInnings: true },
  ducks: { perspective: "batting", label: "ducks", short: "Ducks", better: "low", rate: false, decimals: 0, perInnings: true },
  run_rate: { perspective: "batting", label: "run rate", short: "RR", better: "high", rate: true, decimals: 2 },
  avg_score: { perspective: "batting", label: "average score", short: "Avg score", better: "high", rate: true, decimals: 1 },
  wickets: { perspective: "bowling", label: "wickets", short: "Wkts", better: "high", rate: false, decimals: 0 },
  balls_bowled: { perspective: "bowling", label: "balls bowled", short: "Balls", better: "high", rate: false, decimals: 0 },
  runs_conceded: { perspective: "bowling", label: "runs conceded", short: "Runs", better: "low", rate: false, decimals: 0 },
  economy: { perspective: "bowling", label: "economy rate", short: "Econ", better: "low", rate: true, decimals: 2 },
  bowling_average: { perspective: "bowling", label: "bowling average", short: "Avg", better: "low", rate: true, decimals: 2 },
  bowling_strike_rate: { perspective: "bowling", label: "bowling strike rate", short: "SR", better: "low", rate: true, decimals: 2 },
  dot_pct: { perspective: "bowling", label: "dot-ball %", short: "Dot %", better: "high", rate: true, decimals: 1 },
  dot_balls: { perspective: "bowling", label: "dot balls", short: "Dots", better: "high", rate: false, decimals: 0 },
  sixes_conceded: { perspective: "bowling", label: "sixes conceded", short: "6s", better: "low", rate: false, decimals: 0 },
  innings_bowled: { perspective: "bowling", label: "innings", short: "Inns", better: "high", rate: false, decimals: 0 },
  four_wicket_hauls: { perspective: "bowling", label: "4-wicket hauls", short: "4w", better: "high", rate: false, decimals: 0, perInnings: true },
  five_wicket_hauls: { perspective: "bowling", label: "5-wicket hauls", short: "5w", better: "high", rate: false, decimals: 0, perInnings: true },
  matches: { perspective: "results", label: "matches", short: "M", better: "high", rate: false, decimals: 0 },
  wins: { perspective: "results", label: "wins", short: "W", better: "high", rate: false, decimals: 0 },
  losses: { perspective: "results", label: "losses", short: "L", better: "low", rate: false, decimals: 0 },
  win_pct: { perspective: "results", label: "win %", short: "Win %", better: "high", rate: true, decimals: 1 },
  titles: { perspective: "results", label: "titles", short: "Titles", better: "high", rate: false, decimals: 0 },
  total: { perspective: "team_innings", label: "team total", short: "Total", better: "high", rate: false, decimals: 0 },
};

/* ─── Result shape ───────────────────────────────────────────────────────── */

export type CellFormat = "int" | "dec1" | "dec2" | "text";

export interface StatColumn {
  key: string;
  label: string;
  format: CellFormat;
  highlight?: boolean;
}

export interface StatRow {
  key: string;
  label: string;
  sub?: string;
  values: Record<string, number | string | null>;
}

export interface Chip {
  field: keyof StatFilters | "minVolume" | "limit";
  label: string;
}

export interface StatResult {
  query: StatQuery;
  title: string;
  answer: string;
  columns: StatColumn[];
  rows: StatRow[];
  chips: Chip[];
  qualification: string | null;
  caveats: string[];
  groupsConsidered: number;
  ms: number;
}

/* ─── Reference data: franchises & venues ────────────────────────────────── */

const FRANCHISE_CANON: Record<string, string> = {
  "Delhi Daredevils": "Delhi Capitals",
  "Kings XI Punjab": "Punjab Kings",
  "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
  "Rising Pune Supergiants": "Rising Pune Supergiant",
};

const FRANCHISE_SHORT: Record<string, string> = {
  "Chennai Super Kings": "CSK", "Mumbai Indians": "MI", "Royal Challengers Bengaluru": "RCB",
  "Kolkata Knight Riders": "KKR", "Sunrisers Hyderabad": "SRH", "Delhi Capitals": "DC",
  "Punjab Kings": "PBKS", "Rajasthan Royals": "RR", "Gujarat Titans": "GT",
  "Lucknow Super Giants": "LSG", "Deccan Chargers": "DCG", "Gujarat Lions": "GL",
  "Rising Pune Supergiant": "RPS", "Pune Warriors": "PWI", "Kochi Tuskers Kerala": "KTK",
};

export interface FranchiseRef { name: string; short: string; teamIds: number[] }
export interface VenueRef { key: string; name: string; city: string | null; cities: string[]; venueIds: number[] }

let franchiseCache: FranchiseRef[] | null = null;
let teamToFranchise: Map<number, FranchiseRef> | null = null;

export function getFranchiseRefs(): FranchiseRef[] {
  if (franchiseCache) return franchiseCache;
  const byName = new Map<string, FranchiseRef>();
  teamToFranchise = new Map();
  for (const t of queryAll<{ team_id: number; name: string }>("SELECT team_id, name FROM teams")) {
    const name = FRANCHISE_CANON[t.name] ?? t.name;
    const ref = byName.get(name) ?? { name, short: FRANCHISE_SHORT[name] ?? name, teamIds: [] };
    ref.teamIds.push(t.team_id);
    byName.set(name, ref);
    teamToFranchise.set(t.team_id, ref);
  }
  franchiseCache = [...byName.values()];
  return franchiseCache;
}

/** Franchise by short code ("CSK"), full or former name, slug ("royal-challengers-bengaluru") or team id. */
export function resolveFranchise(key: string | number): FranchiseRef | undefined {
  const refs = getFranchiseRefs();
  if (typeof key === "number" || /^\d+$/.test(String(key))) return franchiseOf(Number(key));
  const k = String(key).toLowerCase().replace(/[-_]+/g, " ").trim();
  const rows = queryAll<{ team_id: number; name: string }>("SELECT team_id, name FROM teams");
  const byOldName = rows.find((t) => t.name.toLowerCase() === k);
  return refs.find((f) => f.short.toLowerCase() === k || f.name.toLowerCase() === k)
    ?? (byOldName ? franchiseOf(byOldName.team_id) : undefined);
}

export function franchiseOf(teamId: number): FranchiseRef | undefined {
  if (!teamToFranchise) getFranchiseRefs();
  return teamToFranchise!.get(teamId);
}

// Grounds that were renamed keep one identity across seasons.
const VENUE_RENAMES: Record<string, string> = {
  "feroz shah kotla": "arun jaitley stadium",
  "feroz shah kotla ground": "arun jaitley stadium",
  "sardar patel stadium": "narendra modi stadium",
  "punjab cricket association stadium": "punjab cricket association is bindra stadium",
  "sheikh zayed stadium": "zayed cricket stadium",
  "subrata roy sahara stadium": "maharashtra cricket association stadium",
};

export function venueKey(name: string): string {
  const base = name.split(",")[0].replace(/\./g, " ").toLowerCase().replace(/\s+/g, " ").trim();
  return VENUE_RENAMES[base] ?? base;
}

let venueCache: VenueRef[] | null = null;
let venueIdToRef: Map<number, VenueRef> | null = null;

export function getVenueRefs(): VenueRef[] {
  if (venueCache) return venueCache;
  // Most recently used name first, so renamed grounds show their current name
  // (Arun Jaitley Stadium, not Feroz Shah Kotla).
  const rows = queryAll<{ venue_id: number; name: string; city: string | null; last: string | null }>(`
    SELECT v.venue_id, v.name, v.city, MAX(m.date) last
    FROM venues v LEFT JOIN matches m ON m.venue_id = v.venue_id
    GROUP BY v.venue_id ORDER BY last DESC`);
  const byKey = new Map<string, VenueRef>();
  venueIdToRef = new Map();
  for (const r of rows) {
    const key = venueKey(r.name);
    let ref = byKey.get(key);
    if (!ref) {
      // Rows are ordered by latest match, so the first variant seen is the current name.
      ref = { key, name: r.name.split(",")[0].trim(), city: r.city || null, cities: [], venueIds: [] };
      byKey.set(key, ref);
    }
    ref.city = ref.city || r.city || null;
    // The same ground is filed under "Bangalore" and "Bengaluru", "Mohali" and "Chandigarh".
    if (r.city && !ref.cities.includes(r.city)) ref.cities.push(r.city);
    ref.venueIds.push(r.venue_id);
    venueIdToRef.set(r.venue_id, ref);
  }
  venueCache = [...byKey.values()];
  return venueCache;
}

// Short display names the web app uses for grounds (aggregates.ts normalizeVenueName).
const VENUE_DISPLAY_ALIASES: Record<string, string> = {
  "mca stadium": "maharashtra cricket association stadium",
  "dy patil stadium": "dr dy patil sports academy",
  "is bindra stadium": "punjab cricket association is bindra stadium",
  "ekana cricket stadium": "bharat ratna shri atal bihari vajpayee ekana cricket stadium",
  "aca vdca cricket stadium": "dr y s rajasekhara reddy aca-vdca cricket stadium",
};

/** Venue by id, canonical key, display name or URL slug ("wankhede-stadium"). */
export function resolveVenue(key: string | number): VenueRef | undefined {
  if (typeof key === "number" || /^\d+$/.test(String(key))) return venueOf(Number(key));
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const words = String(key).toLowerCase().replace(/[-_]+/g, " ").replace(/\bintl\b/g, "international").replace(/\s+/g, " ").trim();
  const k = slug(VENUE_DISPLAY_ALIASES[words] ?? venueKey(words));
  const refs = getVenueRefs();
  return refs.find((v) => slug(v.key) === k || slug(v.name) === k)
    ?? refs.find((v) => k.length >= 4 && (slug(v.name).startsWith(k) || slug(v.key).includes(k)));
}

export function venueOf(venueId: number): VenueRef | undefined {
  if (!venueIdToRef) getVenueRefs();
  return venueIdToRef!.get(venueId);
}

/* ─── SQL building ───────────────────────────────────────────────────────── */

type Param = string | number;

const BOWLER_KINDS = "('bowled','caught','caught and bowled','lbw','stumped','hit wicket')";
const PHASE_DB: Record<Phase, string> = { powerplay: "Powerplay", middle: "Middle", death: "Death" };

/* ─── Match stage (league / playoff / final) ─────────────────────────────── */

// matches.match_type is just "T20" for every row, so the stage comes from the
// raw Cricsheet files: info.event.stage is "Final", "Qualifier 1",
// "Eliminator", "Semi Final"… and absent for league games.
let stageCache: { playoffs: string[]; finals: string[] } | null = null;

export function getMatchStages(): { playoffs: string[]; finals: string[] } {
  if (stageCache) return stageCache;
  const dir = path.join(getProjectRoot(), "lib", "cricket-data", "raw");
  const playoffs: string[] = [];
  const finals: string[] = [];
  if (fs.existsSync(dir)) {
    const buf = Buffer.alloc(6000);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      // `event` sits near the top of `info`; the header is enough.
      const fd = fs.openSync(path.join(dir, file), "r");
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const stage = /"stage"\s*:\s*"([^"]+)"/.exec(buf.toString("utf8", 0, n))?.[1];
      if (!stage) continue;
      const id = file.replace(/\.json$/, "");
      playoffs.push(id);
      if (stage === "Final") finals.push(id);
    }
  }
  stageCache = { playoffs, finals };
  return stageCache;
}

function addStage(w: Where, stage: Stage): void {
  const { playoffs, finals } = getMatchStages();
  if (stage === "final") w.inList("m.match_id", finals);
  else if (stage === "playoffs") w.inList("m.match_id", playoffs);
  else if (playoffs.length) w.add(`m.match_id NOT IN (${playoffs.map(() => "?").join(",")})`, ...playoffs);
}

function seasonLabels(f: StatFilters): string[] | null {
  if (f.seasonFrom === undefined && f.seasonTo === undefined) return null;
  const from = f.seasonFrom ?? 0;
  const to = f.seasonTo ?? 9999;
  return getSeasons().filter((s) => Number(s) >= from && Number(s) <= to).map(seasonToDbLabel);
}

function playerIdsWhere(pred: (m: { bowlingType: string; battingHand: string | null; overseas: boolean }) => boolean): number[] {
  const out: number[] = [];
  for (const m of getPlayerMeta().values()) if (pred(m)) out.push(m.playerId);
  return out;
}

class Where {
  parts: string[] = [];
  params: Param[] = [];
  add(sql: string, ...params: Param[]) { this.parts.push(sql); this.params.push(...params); }
  inList(col: string, values: Param[]) {
    if (!values.length) { this.parts.push("1 = 0"); return; }
    this.add(`${col} IN (${values.map(() => "?").join(",")})`, ...values);
  }
  get sql() { return this.parts.length ? `WHERE ${this.parts.join(" AND ")}` : ""; }
}

/** Ball-level filters. `batter`/`bowler` name the SQL columns that identify each side. */
function ballWhere(q: StatQuery, cols: { batter: string; bowler: string }): Where {
  const f = q.filters;
  const w = new Where();
  w.add("i.innings_number IN (1, 2)");
  const seasons = seasonLabels(f);
  if (seasons) w.inList("m.season_id", seasons);
  if (f.phase) w.add("d.phase = ?", PHASE_DB[f.phase]);
  if (f.overFrom !== undefined || f.overTo !== undefined) {
    w.add("d.over_num BETWEEN ? AND ?", (f.overFrom ?? 1) - 1, (f.overTo ?? 20) - 1);
  }
  const bowlingSide = q.perspective === "bowling";
  if (f.teamIds?.length) w.inList(bowlingSide ? "i.bowling_team_id" : "i.batting_team_id", f.teamIds);
  if (f.opponentIds?.length) w.inList(bowlingSide ? "i.batting_team_id" : "i.bowling_team_id", f.opponentIds);
  if (f.venueIds?.length) w.inList("m.venue_id", f.venueIds);
  if (f.innings) w.add("i.innings_number = ?", f.innings);
  if (f.stage) addStage(w, f.stage);
  const subjectCol = bowlingSide ? cols.bowler : cols.batter;
  const otherCol = bowlingSide ? cols.batter : cols.bowler;
  if (f.playerIds?.length) w.inList(subjectCol, f.playerIds);
  if (f.vsPlayerIds?.length) w.inList(otherCol, f.vsPlayerIds);
  if (f.bowlingType) w.inList(cols.bowler, playerIdsWhere((m) => m.bowlingType === f.bowlingType));
  if (f.battingHand) w.inList(cols.batter, playerIdsWhere((m) => m.battingHand === f.battingHand));
  if (f.nationality) {
    const wantOverseas = f.nationality === "overseas";
    w.inList(subjectCol, playerIdsWhere((m) => m.overseas === wantOverseas));
  }
  return w;
}

const FROM_BALLS = `FROM deliveries d
  JOIN innings i ON i.innings_id = d.innings_id
  JOIN matches m ON m.match_id = d.match_id`;

function keyExpr(q: StatQuery, playerCol: string): string {
  const bowling = q.perspective === "bowling";
  switch (q.groupBy) {
    case "player": return playerCol;
    case "season": return "m.season_id";
    case "team": return bowling ? "i.bowling_team_id" : "i.batting_team_id";
    case "opponent": return bowling ? "i.batting_team_id" : "i.bowling_team_id";
    case "venue": return "m.venue_id";
    case "phase": return "d.phase";
    default: return "0";
  }
}

/* ─── Group labels & merging ─────────────────────────────────────────────── */

interface GroupId { id: string; label: string; sub?: string; sortKey: string }

function groupIdentity(q: StatQuery, raw: string | number): GroupId {
  switch (q.groupBy) {
    case "player": {
      const m = getPlayerMeta().get(Number(raw));
      return { id: `p${raw}`, label: m?.name ?? `Player ${raw}`, sub: m?.fullName && m.fullName !== m.name ? m.fullName : undefined, sortKey: m?.name ?? "" };
    }
    case "season": {
      const s = normalizeSeason(String(raw));
      return { id: s, label: s, sortKey: s };
    }
    case "team":
    case "opponent": {
      const f = franchiseOf(Number(raw));
      return { id: f?.name ?? String(raw), label: f?.name ?? `Team ${raw}`, sub: f?.short, sortKey: f?.name ?? "" };
    }
    case "venue": {
      const v = venueOf(Number(raw));
      return { id: v?.key ?? String(raw), label: v?.name ?? `Venue ${raw}`, sub: v?.city ?? undefined, sortKey: v?.name ?? "" };
    }
    case "phase": {
      const order: Record<string, string> = { Powerplay: "1", Middle: "2", Death: "3" };
      const label = String(raw);
      return { id: label, label: label === "Death" ? "Death overs" : label === "Middle" ? "Middle overs" : label, sortKey: order[label] ?? label };
    }
    default:
      return { id: String(raw), label: String(raw), sortKey: String(raw) };
  }
}

interface BatRaw {
  runs: number; balls: number; outs: number; fours: number; sixes: number; dots: number;
  teamRuns: number; legal: number; inns: number;
  fifties: number; hundreds: number; highest: number; highestNotOut: boolean; ducks: number;
}
interface BowlRaw {
  balls: number; runs: number; wkts: number; dots: number; fours: number; sixes: number; inns: number;
  fourW: number; fiveW: number;
}
interface ResultRaw { matches: number; wins: number; losses: number; noResult: number; titles: number }

type Group<T> = GroupId & { raw: T };

function mergeInto<T extends object>(
  groups: Map<string, Group<T>>,
  id: GroupId,
  init: () => T,
  apply: (raw: T) => void,
): void {
  let g = groups.get(id.id);
  if (!g) { g = { ...id, raw: init() }; groups.set(id.id, g); }
  apply(g.raw);
}

const emptyBat = (): BatRaw => ({ runs: 0, balls: 0, outs: 0, fours: 0, sixes: 0, dots: 0, teamRuns: 0, legal: 0, inns: 0, fifties: 0, hundreds: 0, highest: -1, highestNotOut: false, ducks: 0 });
const emptyBowl = (): BowlRaw => ({ balls: 0, runs: 0, wkts: 0, dots: 0, fours: 0, sixes: 0, inns: 0, fourW: 0, fiveW: 0 });
const emptyResult = (): ResultRaw => ({ matches: 0, wins: 0, losses: 0, noResult: 0, titles: 0 });

/** Every (innings, player) pair where the player was dismissed (retired hurt excluded). */
let dismissedCache: Set<string> | null = null;
function dismissedSet(): Set<string> {
  if (dismissedCache) return dismissedCache;
  dismissedCache = new Set(
    queryAll<{ inn: number; pid: number }>(`
      SELECT d.innings_id inn, x.player_out_id pid FROM dismissals x
      JOIN deliveries d ON d.delivery_id = x.delivery_id
      WHERE x.kind <> 'retired hurt' AND x.player_out_id IS NOT NULL`).map((r) => `${r.inn}:${r.pid}`),
  );
  return dismissedCache;
}

/* ─── Metric computation ─────────────────────────────────────────────────── */

const div = (a: number, b: number, mult = 1): number | null => (b > 0 ? (a / b) * mult : null);

function batMetric(id: MetricId, r: BatRaw): number | null {
  switch (id) {
    case "runs": return r.runs;
    case "balls_faced": return r.balls;
    case "strike_rate": return div(r.runs, r.balls, 100);
    case "average": return div(r.runs, r.outs);
    case "fours": return r.fours;
    case "sixes": return r.sixes;
    case "boundaries": return r.fours + r.sixes;
    case "boundary_pct": return div(r.fours + r.sixes, r.balls, 100);
    case "dot_pct_faced": return div(r.dots, r.balls, 100);
    case "innings_batted": return r.inns;
    case "fifties": return r.fifties;
    case "hundreds": return r.hundreds;
    case "highest_score": return r.highest >= 0 ? r.highest : null;
    case "ducks": return r.ducks;
    case "run_rate": return div(r.teamRuns, r.legal, 6);
    case "avg_score": return div(r.teamRuns, r.inns);
    default: return null;
  }
}

function bowlMetric(id: MetricId, r: BowlRaw): number | null {
  switch (id) {
    case "wickets": return r.wkts;
    case "balls_bowled": return r.balls;
    case "runs_conceded": return r.runs;
    case "economy": return div(r.runs, r.balls, 6);
    case "bowling_average": return div(r.runs, r.wkts);
    case "bowling_strike_rate": return div(r.balls, r.wkts);
    case "dot_pct": return div(r.dots, r.balls, 100);
    case "dot_balls": return r.dots;
    case "sixes_conceded": return r.sixes;
    case "innings_bowled": return r.inns;
    case "four_wicket_hauls": return r.fourW;
    case "five_wicket_hauls": return r.fiveW;
    default: return null;
  }
}

function resultMetric(id: MetricId, r: ResultRaw): number | null {
  switch (id) {
    case "matches": return r.matches;
    case "wins": return r.wins;
    case "losses": return r.losses;
    case "win_pct": return div(r.wins, r.matches - r.noResult, 100);
    case "titles": return r.titles;
    default: return null;
  }
}

const overs = (balls: number) => `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ""}`;
const fmtNum = (n: number | null, dp: number) => (n === null ? null : round(n, dp));

/* ─── Executors ──────────────────────────────────────────────────────────── */

interface Computed {
  columns: StatColumn[];
  rows: (StatRow & { metric: number | null; volume: number; sortKey: string })[];
  volumeUnit: "balls" | "matches" | null;
  caveats: string[];
}

function runBatting(q: StatQuery): Computed {
  const groups = new Map<string, Group<BatRaw>>();
  const w = ballWhere(q, { batter: "d.batter_id", bowler: "d.bowler_id" });
  const key = keyExpr(q, "d.batter_id");

  for (const r of queryAll<{ k: string | number; runs: number; balls: number; fours: number; sixes: number; dots: number; team_runs: number; legal: number; inns: number }>(`
    SELECT ${key} k, SUM(d.batter_runs) runs, SUM(1 - d.is_wide) balls,
      SUM(CASE WHEN d.batter_runs = 4 THEN 1 ELSE 0 END) fours,
      SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes,
      SUM(CASE WHEN d.is_wide = 0 AND d.batter_runs = 0 THEN 1 ELSE 0 END) dots,
      SUM(d.total_runs) team_runs,
      SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) legal,
      COUNT(DISTINCT d.innings_id) inns
    ${FROM_BALLS} ${w.sql} GROUP BY k`, ...w.params)) {
    mergeInto(groups, groupIdentity(q, r.k), emptyBat, (g) => {
      g.runs += r.runs; g.balls += r.balls; g.fours += r.fours; g.sixes += r.sixes; g.dots += r.dots;
      g.teamRuns += r.team_runs; g.legal += r.legal; g.inns += r.inns;
    });
  }

  // Outs include non-striker run-outs, so they are keyed by the dismissed player.
  const wo = ballWhere(q, { batter: "x.player_out_id", bowler: "d.bowler_id" });
  for (const r of queryAll<{ k: string | number; outs: number }>(`
    SELECT ${keyExpr(q, "x.player_out_id")} k, COUNT(*) outs
    ${FROM_BALLS} JOIN dismissals x ON x.delivery_id = d.delivery_id AND x.kind <> 'retired hurt'
    ${wo.sql} GROUP BY k`, ...wo.params)) {
    const id = groupIdentity(q, r.k);
    const g = groups.get(id.id);
    if (g) g.raw.outs += r.outs;
  }

  if (METRICS[q.metric].perInnings) {
    const dismissed = dismissedSet();
    for (const r of queryAll<{ k: string | number; pid: number; inn: number; runs: number }>(`
      SELECT ${key} k, d.batter_id pid, d.innings_id inn, SUM(d.batter_runs) runs
      ${FROM_BALLS} ${w.sql} GROUP BY k, pid, inn`, ...w.params)) {
      const g = groups.get(groupIdentity(q, r.k).id);
      if (!g) continue;
      const out = dismissed.has(`${r.inn}:${r.pid}`);
      if (r.runs >= 100) g.raw.hundreds++;
      else if (r.runs >= 50) g.raw.fifties++;
      if (r.runs === 0 && out) g.raw.ducks++;
      if (r.runs > g.raw.highest || (r.runs === g.raw.highest && !out)) {
        g.raw.highest = r.runs;
        g.raw.highestNotOut = !out;
      }
    }
  }

  const teamLevel = q.groupBy !== "player";
  const columns: StatColumn[] = teamLevel
    ? [
        { key: "inns", label: "Inns", format: "int" },
        { key: "runs", label: "Runs", format: "int" },
        { key: "rr", label: "RR", format: "dec2" },
        { key: "avg_score", label: "Avg score", format: "dec1" },
        { key: "sr", label: "SR", format: "dec2" },
        { key: "fours", label: "4s", format: "int" },
        { key: "sixes", label: "6s", format: "int" },
      ]
    : [
        { key: "inns", label: "Inns", format: "int" },
        { key: "runs", label: "Runs", format: "int" },
        { key: "balls", label: "Balls", format: "int" },
        { key: "outs", label: "Outs", format: "int" },
        { key: "avg", label: "Avg", format: "dec2" },
        { key: "sr", label: "SR", format: "dec2" },
        { key: "fours", label: "4s", format: "int" },
        { key: "sixes", label: "6s", format: "int" },
      ];
  const metricCol: Partial<Record<MetricId, string>> = {
    runs: "runs", balls_faced: "balls", strike_rate: "sr", average: "avg", fours: "fours", sixes: "sixes",
    innings_batted: "inns", run_rate: "rr", avg_score: "avg_score",
  };
  const highlightKey = addMetricColumn(columns, q.metric, metricCol[q.metric]);

  const rows = [...groups.values()].map((g) => {
    const r = g.raw;
    const values: StatRow["values"] = {
      inns: r.inns, runs: r.runs, balls: r.balls, outs: r.outs,
      avg: fmtNum(batMetric("average", r), 2), sr: fmtNum(batMetric("strike_rate", r), 2),
      fours: r.fours, sixes: r.sixes, rr: fmtNum(batMetric("run_rate", r), 2), avg_score: fmtNum(batMetric("avg_score", r), 1),
    };
    const metric = batMetric(q.metric, r);
    if (metricCol[q.metric] === undefined) {
      values[highlightKey] = q.metric === "highest_score" && metric !== null ? `${metric}${r.highestNotOut ? "*" : ""}` : fmtNum(metric, METRICS[q.metric].decimals);
    }
    return { key: g.id, label: g.label, sub: g.sub, values, metric, volume: r.balls, sortKey: g.sortKey };
  });

  const caveats: string[] = [];
  if (METRICS[q.metric].perInnings && (q.filters.phase || q.filters.overFrom || q.filters.vsPlayerIds?.length || q.filters.bowlingType)) {
    caveats.push(`${METRICS[q.metric].label} are counted from runs scored inside the filtered balls only.`);
  }
  return { columns, rows, volumeUnit: "balls", caveats };
}

function runBowling(q: StatQuery): Computed {
  const groups = new Map<string, Group<BowlRaw>>();
  const w = ballWhere(q, { batter: "d.batter_id", bowler: "d.bowler_id" });
  const key = keyExpr(q, "d.bowler_id");
  const conceded = RUNS_CONCEDED_SQL;

  for (const r of queryAll<{ k: string | number; balls: number; runs: number; dots: number; fours: number; sixes: number; inns: number }>(`
    SELECT ${key} k,
      SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) balls,
      SUM(${conceded}) runs,
      SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 AND (${conceded}) = 0 THEN 1 ELSE 0 END) dots,
      SUM(CASE WHEN d.batter_runs = 4 THEN 1 ELSE 0 END) fours,
      SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes,
      COUNT(DISTINCT d.innings_id) inns
    ${FROM_BALLS} ${w.sql} GROUP BY k`, ...w.params)) {
    mergeInto(groups, groupIdentity(q, r.k), emptyBowl, (g) => {
      g.balls += r.balls; g.runs += r.runs; g.dots += r.dots; g.fours += r.fours; g.sixes += r.sixes; g.inns += r.inns;
    });
  }

  for (const r of queryAll<{ k: string | number; wkts: number }>(`
    SELECT ${key} k, COUNT(*) wkts
    ${FROM_BALLS} JOIN dismissals x ON x.delivery_id = d.delivery_id AND x.kind IN ${BOWLER_KINDS}
    ${w.sql} GROUP BY k`, ...w.params)) {
    const g = groups.get(groupIdentity(q, r.k).id);
    if (g) g.raw.wkts += r.wkts;
  }

  if (METRICS[q.metric].perInnings) {
    for (const r of queryAll<{ k: string | number; wkts: number }>(`
      SELECT ${key} k, d.bowler_id pid, d.innings_id inn, COUNT(*) wkts
      ${FROM_BALLS} JOIN dismissals x ON x.delivery_id = d.delivery_id AND x.kind IN ${BOWLER_KINDS}
      ${w.sql} GROUP BY k, pid, inn HAVING wkts >= 4`, ...w.params)) {
      const g = groups.get(groupIdentity(q, r.k).id);
      if (!g) continue;
      g.raw.fourW++;
      if (r.wkts >= 5) g.raw.fiveW++;
    }
  }

  const columns: StatColumn[] = [
    { key: "inns", label: "Inns", format: "int" },
    { key: "overs", label: "Overs", format: "text" },
    { key: "wkts", label: "Wkts", format: "int" },
    { key: "runs", label: "Runs", format: "int" },
    { key: "econ", label: "Econ", format: "dec2" },
    { key: "avg", label: "Avg", format: "dec2" },
    { key: "sr", label: "SR", format: "dec2" },
    { key: "dot", label: "Dot %", format: "dec1" },
  ];
  const metricCol: Partial<Record<MetricId, string>> = {
    wickets: "wkts", runs_conceded: "runs", economy: "econ", bowling_average: "avg",
    bowling_strike_rate: "sr", dot_pct: "dot", innings_bowled: "inns",
  };
  const highlightKey = addMetricColumn(columns, q.metric, metricCol[q.metric]);

  const rows = [...groups.values()].map((g) => {
    const r = g.raw;
    const values: StatRow["values"] = {
      inns: r.inns, overs: overs(r.balls), wkts: r.wkts, runs: r.runs,
      econ: fmtNum(bowlMetric("economy", r), 2), avg: fmtNum(bowlMetric("bowling_average", r), 2),
      sr: fmtNum(bowlMetric("bowling_strike_rate", r), 2), dot: fmtNum(bowlMetric("dot_pct", r), 1),
    };
    const metric = bowlMetric(q.metric, r);
    if (metricCol[q.metric] === undefined) values[highlightKey] = fmtNum(metric, METRICS[q.metric].decimals);
    return { key: g.id, label: g.label, sub: g.sub, values, metric, volume: r.balls, sortKey: g.sortKey };
  });
  return { columns, rows, volumeUnit: "balls", caveats: [] };
}

function runResults(q: StatQuery): Computed {
  const f = q.filters;
  const groups = new Map<string, Group<ResultRaw>>();
  const w = new Where();
  const seasons = seasonLabels(f);
  if (seasons) w.inList("m.season_id", seasons);
  if (f.teamIds?.length) w.inList("s.team_id", f.teamIds);
  if (f.opponentIds?.length) w.inList("s.opp_id", f.opponentIds);
  if (f.venueIds?.length) w.inList("m.venue_id", f.venueIds);
  if (f.stage) addStage(w, f.stage);
  if (f.innings === 1) w.add("i1.batting_team_id = s.team_id");
  if (f.innings === 2) w.add("i1.batting_team_id <> s.team_id");

  const keys: Partial<Record<GroupBy, string>> = {
    team: "s.team_id", opponent: "s.opp_id", season: "m.season_id", venue: "m.venue_id",
  };
  const groupBy = keys[q.groupBy]!;

  if (q.metric === "titles") {
    const tw = new Where();
    if (seasons) tw.inList("m.season_id", seasons);
    addStage(tw, "final");
    tw.add("m.winner_id IS NOT NULL");
    if (f.teamIds?.length) tw.inList("m.winner_id", f.teamIds);
    for (const r of queryAll<{ k: number; n: number }>(`SELECT m.winner_id k, COUNT(*) n FROM matches m ${tw.sql} GROUP BY k`, ...tw.params)) {
      mergeInto(groups, groupIdentity({ ...q, groupBy: "team" }, r.k), emptyResult, (g) => { g.titles += r.n; });
    }
  } else {
    for (const r of queryAll<{ k: string | number; matches: number; wins: number; losses: number; nr: number }>(`
      SELECT ${groupBy} k, COUNT(*) matches,
        SUM(CASE WHEN m.winner_id = s.team_id THEN 1 ELSE 0 END) wins,
        SUM(CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> s.team_id THEN 1 ELSE 0 END) losses,
        SUM(CASE WHEN m.winner_id IS NULL THEN 1 ELSE 0 END) nr
      FROM (SELECT match_id, team1_id team_id, team2_id opp_id FROM matches
            UNION ALL SELECT match_id, team2_id, team1_id FROM matches) s
      JOIN matches m ON m.match_id = s.match_id
      LEFT JOIN innings i1 ON i1.match_id = m.match_id AND i1.innings_number = 1
      ${w.sql} GROUP BY k`, ...w.params)) {
      mergeInto(groups, groupIdentity(q, r.k), emptyResult, (g) => {
        g.matches += r.matches; g.wins += r.wins; g.losses += r.losses; g.noResult += r.nr;
      });
    }
  }

  const columns: StatColumn[] = q.metric === "titles"
    ? [{ key: "titles", label: "Titles", format: "int", highlight: true }]
    : [
        { key: "m", label: "M", format: "int", highlight: q.metric === "matches" },
        { key: "w", label: "W", format: "int", highlight: q.metric === "wins" },
        { key: "l", label: "L", format: "int", highlight: q.metric === "losses" },
        { key: "nr", label: "NR", format: "int" },
        { key: "pct", label: "Win %", format: "dec1", highlight: q.metric === "win_pct" },
      ];
  const rows = [...groups.values()].map((g) => {
    const r = g.raw;
    return {
      key: g.id, label: g.label, sub: g.sub,
      values: { m: r.matches, w: r.wins, l: r.losses, nr: r.noResult, pct: fmtNum(resultMetric("win_pct", r), 1), titles: r.titles },
      metric: resultMetric(q.metric, r), volume: r.matches, sortKey: g.sortKey,
    };
  });
  return { columns, rows, volumeUnit: q.metric === "titles" ? null : "matches", caveats: [] };
}

interface InningsInfo { inn: number; season: string; date: string; venue: number; bat: number; bowl: number }

function inningsInfo(ids: number[]): Map<number, InningsInfo> {
  if (!ids.length) return new Map();
  return new Map(
    queryAll<InningsInfo>(`
      SELECT i.innings_id inn, m.season_id season, m.date date, m.venue_id venue,
             i.batting_team_id bat, i.bowling_team_id bowl
      FROM innings i JOIN matches m ON m.match_id = i.match_id
      WHERE i.innings_id IN (${ids.map(() => "?").join(",")})`, ...ids).map((r) => [r.inn, r]),
  );
}

function contextCells(info: InningsInfo | undefined, subjectTeam: "bat" | "bowl") {
  if (!info) return { team: null, opp: null, venue: null, season: null };
  const team = franchiseOf(subjectTeam === "bat" ? info.bat : info.bowl);
  const opp = franchiseOf(subjectTeam === "bat" ? info.bowl : info.bat);
  return {
    team: team?.short ?? null,
    opp: opp?.short ?? null,
    venue: venueOf(info.venue)?.name ?? null,
    season: normalizeSeason(info.season),
  };
}

const CONTEXT_COLUMNS: StatColumn[] = [
  { key: "team", label: "For", format: "text" },
  { key: "opp", label: "Vs", format: "text" },
  { key: "venue", label: "Venue", format: "text" },
  { key: "season", label: "Season", format: "text" },
];

/** Individual innings, bowling spells or team innings, ranked. */
function runInningsRecords(q: StatQuery): Computed {
  const asc = q.order === "asc";
  if (q.perspective === "team_innings") {
    const w = ballWhere({ ...q, perspective: "batting" }, { batter: "d.batter_id", bowler: "d.bowler_id" });
    const rows = queryAll<{ inn: number; runs: number; legal: number }>(`
      SELECT d.innings_id inn, SUM(d.total_runs) runs,
        SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) legal
      ${FROM_BALLS} ${w.sql} GROUP BY inn`, ...w.params);
    const wk = new Map(queryAll<{ inn: number; n: number }>(`
      SELECT d.innings_id inn, COUNT(*) n ${FROM_BALLS}
      JOIN dismissals x ON x.delivery_id = d.delivery_id AND x.kind <> 'retired hurt'
      ${w.sql} GROUP BY inn`, ...w.params).map((r) => [r.inn, r.n]));
    let list = rows.map((r) => ({ ...r, wkts: wk.get(r.inn) ?? 0 }));
    // Lowest totals only count completed innings (all out or the full quota), as official records do.
    const fullInningsOnly = asc && !q.filters.phase && q.filters.overFrom === undefined;
    if (fullInningsOnly) list = list.filter((r) => r.wkts >= 10 || r.legal >= 120);
    list.sort((a, b) => (asc ? a.runs - b.runs : b.runs - a.runs) || a.legal - b.legal);
    const top = list.slice(0, q.limit);
    const info = inningsInfo(top.map((r) => r.inn));
    return {
      columns: [
        { key: "score", label: "Score", format: "text", highlight: true },
        { key: "overs", label: "Overs", format: "text" },
        { key: "rr", label: "RR", format: "dec2" },
        ...CONTEXT_COLUMNS.slice(1),
      ],
      rows: top.map((r) => {
        const ctx = contextCells(info.get(r.inn), "bat");
        const team = info.get(r.inn) ? franchiseOf(info.get(r.inn)!.bat) : undefined;
        return {
          key: `i${r.inn}`, label: team?.name ?? "—", sub: team?.short,
          values: { score: `${r.runs}/${r.wkts}`, overs: overs(r.legal), rr: fmtNum(div(r.runs, r.legal, 6), 2), opp: ctx.opp, venue: ctx.venue, season: ctx.season },
          metric: r.runs, volume: r.legal, sortKey: "",
        };
      }),
      volumeUnit: null,
      caveats: fullInningsOnly ? ["Lowest totals only include completed innings (all out or 20 overs)."] : [],
    };
  }

  if (q.perspective === "bowling") {
    const w = ballWhere(q, { batter: "d.batter_id", bowler: "d.bowler_id" });
    const conceded = RUNS_CONCEDED_SQL;
    const spells = queryAll<{ pid: number; inn: number; balls: number; runs: number }>(`
      SELECT d.bowler_id pid, d.innings_id inn,
        SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) balls, SUM(${conceded}) runs
      ${FROM_BALLS} ${w.sql} GROUP BY pid, inn`, ...w.params);
    const wk = new Map(queryAll<{ pid: number; inn: number; n: number }>(`
      SELECT d.bowler_id pid, d.innings_id inn, COUNT(*) n ${FROM_BALLS}
      JOIN dismissals x ON x.delivery_id = d.delivery_id AND x.kind IN ${BOWLER_KINDS}
      ${w.sql} GROUP BY pid, inn`, ...w.params).map((r) => [`${r.pid}:${r.inn}`, r.n]));
    const list = spells.map((s) => ({ ...s, wkts: wk.get(`${s.pid}:${s.inn}`) ?? 0 }));
    list.sort((a, b) => (asc ? a.wkts - b.wkts : b.wkts - a.wkts) || a.runs - b.runs || a.balls - b.balls);
    const top = list.slice(0, q.limit);
    const info = inningsInfo(top.map((r) => r.inn));
    const meta = getPlayerMeta();
    return {
      columns: [
        { key: "fig", label: "Figures", format: "text", highlight: true },
        { key: "overs", label: "Overs", format: "text" },
        { key: "econ", label: "Econ", format: "dec2" },
        ...CONTEXT_COLUMNS,
      ],
      rows: top.map((r) => ({
        key: `s${r.pid}:${r.inn}`, label: meta.get(r.pid)?.name ?? `Player ${r.pid}`,
        values: { fig: `${r.wkts}/${r.runs}`, overs: overs(r.balls), econ: fmtNum(div(r.runs, r.balls, 6), 2), ...contextCells(info.get(r.inn), "bowl") },
        metric: r.wkts, volume: r.balls, sortKey: "",
      })),
      volumeUnit: null,
      caveats: [],
    };
  }

  // Batting: individual innings.
  const w = ballWhere(q, { batter: "d.batter_id", bowler: "d.bowler_id" });
  const list = queryAll<{ pid: number; inn: number; runs: number; balls: number; fours: number; sixes: number }>(`
    SELECT d.batter_id pid, d.innings_id inn, SUM(d.batter_runs) runs, SUM(1 - d.is_wide) balls,
      SUM(CASE WHEN d.batter_runs = 4 THEN 1 ELSE 0 END) fours,
      SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes
    ${FROM_BALLS} ${w.sql} GROUP BY pid, inn`, ...w.params);
  const sortVal = (r: (typeof list)[number]) =>
    q.metric === "strike_rate" ? (r.balls ? r.runs / r.balls : 0) : q.metric === "sixes" ? r.sixes : q.metric === "fours" ? r.fours : r.runs;
  const eligible = q.metric === "strike_rate" ? list.filter((r) => r.runs >= 30) : list;
  eligible.sort((a, b) => (asc ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a)) || a.balls - b.balls);
  const top = eligible.slice(0, q.limit);
  const info = inningsInfo(top.map((r) => r.inn));
  const dismissed = dismissedSet();
  const meta = getPlayerMeta();
  return {
    columns: [
      { key: "score", label: "Runs", format: "text", highlight: q.metric !== "sixes" && q.metric !== "fours" && q.metric !== "strike_rate" },
      { key: "balls", label: "Balls", format: "int" },
      { key: "sr", label: "SR", format: "dec2", highlight: q.metric === "strike_rate" },
      { key: "fours", label: "4s", format: "int", highlight: q.metric === "fours" },
      { key: "sixes", label: "6s", format: "int", highlight: q.metric === "sixes" },
      ...CONTEXT_COLUMNS,
    ],
    rows: top.map((r) => ({
      key: `b${r.pid}:${r.inn}`, label: meta.get(r.pid)?.name ?? `Player ${r.pid}`,
      values: {
        score: `${r.runs}${dismissed.has(`${r.inn}:${r.pid}`) ? "" : "*"}`, balls: r.balls,
        sr: fmtNum(div(r.runs, r.balls, 100), 2), fours: r.fours, sixes: r.sixes, ...contextCells(info.get(r.inn), "bat"),
      },
      metric: sortVal(r), volume: r.balls, sortKey: "",
    })),
    volumeUnit: null,
    caveats: q.metric === "strike_rate" ? ["Innings strike rates only include knocks of 30+ runs."] : [],
  };
}

/** Ensure the asked-for metric has a highlighted column; returns its key. */
function addMetricColumn(columns: StatColumn[], metric: MetricId, existingKey: string | undefined): string {
  if (existingKey) {
    const col = columns.find((c) => c.key === existingKey);
    if (col) { col.highlight = true; return existingKey; }
  }
  const def = METRICS[metric];
  columns.push({ key: "metric", label: def.short, format: def.decimals === 0 ? (metric === "highest_score" ? "text" : "int") : def.decimals === 1 ? "dec1" : "dec2", highlight: true });
  return "metric";
}

/* ─── Describe ───────────────────────────────────────────────────────────── */

function playerNames(ids: number[] | undefined): string {
  const meta = getPlayerMeta();
  return (ids ?? []).map((id) => meta.get(id)?.name ?? `#${id}`).join(" & ");
}

function franchiseNames(ids: number[] | undefined): string {
  const seen = new Set<string>();
  for (const id of ids ?? []) { const f = franchiseOf(id); if (f) seen.add(f.short); }
  return [...seen].join("/");
}

function venueNames(ids: number[] | undefined): string {
  const seen = new Set<string>();
  for (const id of ids ?? []) { const v = venueOf(id); if (v) seen.add(v.name); }
  return [...seen].join(" / ");
}

export function seasonText(f: StatFilters): string {
  const { seasonFrom: a, seasonTo: b } = f;
  if (a === undefined && b === undefined) return "";
  if (a !== undefined && a === b) return `IPL ${a}`;
  if (a !== undefined && b !== undefined) return `${a}–${b}`;
  if (a !== undefined) return `since ${a}`;
  return `up to ${b}`;
}

export function buildChips(q: StatQuery): Chip[] {
  const f = q.filters;
  const chips: Chip[] = [];
  const bowling = q.perspective === "bowling";
  const s = seasonText(f);
  if (s) chips.push({ field: "seasonFrom", label: s });
  if (f.phase) chips.push({ field: "phase", label: { powerplay: "Powerplay (1–6)", middle: "Middle overs (7–15)", death: "Death overs (16–20)" }[f.phase] });
  if (f.overFrom !== undefined || f.overTo !== undefined) {
    chips.push({ field: "overFrom", label: f.overFrom === f.overTo ? `Over ${f.overFrom}` : `Overs ${f.overFrom ?? 1}–${f.overTo ?? 20}` });
  }
  if (f.playerIds?.length) chips.push({ field: "playerIds", label: playerNames(f.playerIds) });
  if (f.vsPlayerIds?.length) chips.push({ field: "vsPlayerIds", label: `vs ${playerNames(f.vsPlayerIds)}` });
  if (f.teamIds?.length) chips.push({ field: "teamIds", label: q.perspective === "results" ? franchiseNames(f.teamIds) : `For ${franchiseNames(f.teamIds)}` });
  if (f.opponentIds?.length) chips.push({ field: "opponentIds", label: `vs ${franchiseNames(f.opponentIds)}` });
  if (f.venueIds?.length) chips.push({ field: "venueIds", label: `At ${venueNames(f.venueIds)}` });
  if (f.innings) {
    const label = q.perspective === "results"
      ? (f.innings === 1 ? "Batting first" : "Chasing")
      : bowling ? (f.innings === 1 ? "Bowling first" : "Bowling second") : (f.innings === 1 ? "Batting first" : "Chasing");
    chips.push({ field: "innings", label });
  }
  if (f.stage) chips.push({ field: "stage", label: { league: "League games", playoffs: "Playoffs", final: "Finals" }[f.stage] });
  if (f.bowlingType) chips.push({ field: "bowlingType", label: bowling ? (f.bowlingType === "spin" ? "Spinners" : "Pacers") : `vs ${f.bowlingType}` });
  if (f.battingHand) chips.push({ field: "battingHand", label: bowling ? `vs ${f.battingHand === "L" ? "left" : "right"}-handers` : `${f.battingHand === "L" ? "Left" : "Right"}-handers` });
  if (f.nationality) chips.push({ field: "nationality", label: f.nationality === "overseas" ? "Overseas players" : "Indian players" });
  return chips;
}

function scopeText(q: StatQuery, opts: { skipOpponent?: boolean } = {}): string {
  const f = q.filters;
  const bowling = q.perspective === "bowling";
  const parts: string[] = [];
  if (f.phase) parts.push({ powerplay: "in the powerplay", middle: "in the middle overs", death: "at the death" }[f.phase]);
  if (f.overFrom !== undefined || f.overTo !== undefined) parts.push(f.overFrom === f.overTo ? `in over ${f.overFrom}` : `in overs ${f.overFrom ?? 1}–${f.overTo ?? 20}`);
  if (f.bowlingType && !bowling) parts.push(`against ${f.bowlingType}`);
  if (f.battingHand && bowling) parts.push(`against ${f.battingHand === "L" ? "left" : "right"}-handers`);
  if (f.vsPlayerIds?.length) parts.push(`against ${playerNames(f.vsPlayerIds)}`);
  if (f.teamIds?.length && q.perspective !== "results") parts.push(`for ${franchiseNames(f.teamIds)}`);
  if (f.opponentIds?.length && !opts.skipOpponent) parts.push(`against ${franchiseNames(f.opponentIds)}`);
  if (f.venueIds?.length) parts.push(`at ${venueNames(f.venueIds)}`);
  if (f.innings) {
    parts.push(q.perspective === "results" || !bowling
      ? (f.innings === 1 ? "batting first" : "while chasing")
      : (f.innings === 1 ? "bowling first" : "bowling second"));
  }
  if (f.stage) parts.push({ league: "in league games", playoffs: "in the playoffs", final: "in finals" }[f.stage]);
  const s = seasonText(f);
  parts.push(s ? (s.startsWith("IPL") ? `in ${s}` : s.startsWith("since") || s.startsWith("up to") ? s : `in ${s}`) : "in IPL history");
  return parts.join(" ");
}

function subjectNoun(q: StatQuery): string {
  const f = q.filters;
  const nat = f.nationality === "overseas" ? "overseas " : f.nationality === "indian" ? "Indian " : "";
  if (q.perspective === "bowling") return `${nat}${f.bowlingType === "spin" ? "spinner" : f.bowlingType === "pace" ? "pacer" : "bowler"}`;
  if (q.perspective === "batting") return `${nat}${f.battingHand === "L" ? "left-hander" : f.battingHand === "R" ? "right-hander" : "batter"}`;
  return "team";
}

const fmtVal = (n: number | null, dp: number) => (n === null ? "—" : dp === 0 ? Math.round(n).toLocaleString("en-US") : n.toFixed(dp));

function superlative(q: StatQuery): string {
  const def = METRICS[q.metric];
  const desc = q.order === "desc";
  if (def.rate) return desc ? "Highest" : "Lowest";
  return desc ? "Most" : "Fewest";
}

function rowSummary(q: StatQuery, row: StatRow): string {
  const v = row.values;
  switch (q.perspective) {
    case "batting":
      return q.groupBy === "player"
        ? `${fmtVal(v.runs as number, 0)} runs off ${fmtVal(v.balls as number, 0)} balls, avg ${v.avg ?? "—"}, SR ${v.sr ?? "—"}`
        : `${fmtVal(v.runs as number, 0)} runs at ${v.rr ?? "—"} an over`;
    case "bowling":
      return `${v.wkts} wickets in ${v.overs} overs, econ ${v.econ ?? "—"}, avg ${v.avg ?? "—"}`;
    case "results":
      return `played ${v.m}, won ${v.w}, lost ${v.l}${v.pct !== null ? ` (${v.pct}% win rate)` : ""}`;
    default:
      return "";
  }
}

function buildAnswer(q: StatQuery, rows: (StatRow & { metric: number | null; volume: number })[]): { title: string; answer: string } {
  const def = METRICS[q.metric];
  const scope = scopeText(q);
  const noun = subjectNoun(q);
  const f = q.filters;

  if (!rows.length) {
    return { title: "No matching data", answer: `No ${q.perspective === "results" ? "matches" : "balls"} match that question ${scope}.` };
  }
  const [top, second] = rows;

  if (q.groupBy === "innings") {
    const what = q.perspective === "team_innings"
      ? (q.order === "desc" ? "Highest team total" : "Lowest team total")
      : q.perspective === "bowling" ? "Best bowling figures"
      : q.metric === "sixes" ? "Most sixes in an innings" : q.metric === "strike_rate" ? "Fastest innings (30+ runs)" : "Highest individual score";
    const v = top.values;
    const detail = q.perspective === "team_innings"
      ? `${v.score} in ${v.overs} overs vs ${v.opp}, ${v.season}`
      : q.perspective === "bowling"
        ? `${v.fig} in ${v.overs} overs for ${v.team} vs ${v.opp}, ${v.season}`
        : `${v.score} off ${v.balls} balls (${v.sixes} sixes) for ${v.team} vs ${v.opp}, ${v.season}`;
    return { title: `${what} ${scope}`, answer: `${what} ${scope}: ${top.label} — ${detail}.` };
  }

  if (q.sortBy === "key") {
    const who = f.playerIds?.length ? playerNames(f.playerIds) : f.teamIds?.length ? franchiseNames(f.teamIds) : "All teams";
    // For rates, a 15-ball season shouldn't be called the best one.
    const maxVolume = Math.max(...rows.map((r) => r.volume));
    const best = [...rows]
      .filter((r) => r.metric !== null && (!def.rate || r.volume >= maxVolume * 0.3))
      .sort((a, b) => (def.better === "high" ? b.metric! - a.metric! : a.metric! - b.metric!))[0];
    const by = { season: "season by season", phase: "by phase", team: "by team", opponent: "by opponent", venue: "by venue", player: "", innings: "" }[q.groupBy];
    return {
      title: `${who} — ${def.label} ${by}`,
      answer: best
        ? `${who} ${by} ${scope}: the best ${q.groupBy} for ${def.label} was ${best.label} with ${fmtVal(best.metric, def.decimals)}.`
        : `${who} ${by} ${scope}.`,
    };
  }

  // Single subject or explicit comparison.
  if (q.groupBy === "player" && f.playerIds?.length) {
    if (rows.length === 1 || f.playerIds.length === 1) {
      const vs = f.vsPlayerIds?.length && q.perspective === "batting"
        ? `${fmtVal(top.values.runs as number, 0)} runs off ${top.values.balls} balls (SR ${top.values.sr ?? "—"}), dismissed ${top.values.outs} time${top.values.outs === 1 ? "" : "s"}`
        : null;
      // Lead with the stat that was asked for unless the summary already states it.
      const asked = ["runs", "wickets"].includes(q.metric) || top.metric === null
        ? ""
        : `${fmtVal(top.metric, def.decimals)} ${def.label} — `;
      return { title: `${top.label} ${scope}`, answer: `${top.label} ${scope}: ${asked}${vs ?? rowSummary(q, top)}.` };
    }
    const lead = rows[0];
    return {
      title: `${rows.map((r) => r.label).join(" vs ")} — ${def.label}`,
      answer: `${rows.map((r) => `${r.label}: ${fmtVal(r.metric, def.decimals)}`).join(" · ")} ${def.label} ${scope}. ${lead.label} leads.`,
    };
  }

  if (q.perspective === "results" && q.metric !== "titles" && rows.length === 1) {
    if (q.groupBy === "team" && f.teamIds?.length) {
      const who = `${top.label}${f.opponentIds?.length ? ` vs ${franchiseNames(f.opponentIds)}` : ""}`;
      return { title: `${who} ${scope}`, answer: `${who} ${scopeText(q, { skipOpponent: true })}: ${rowSummary(q, top)}.` };
    }
    if (q.groupBy === "venue") {
      const side = f.innings === 2 ? "Teams chasing" : f.innings === 1 ? "Teams batting first" : "Teams";
      const where = `at ${top.label}`;
      const rest = scopeText({ ...q, filters: { ...f, venueIds: undefined, innings: undefined } });
      return { title: `${side} ${where} ${rest}`, answer: `${side} ${where} ${rest}: ${rowSummary(q, top)}.` };
    }
  }

  // One group that is itself the filter ("how many sixes in IPL 2024").
  if (rows.length === 1 && q.groupBy === "season" && f.seasonFrom !== undefined && f.seasonFrom === f.seasonTo) {
    const s = scopeText(q).replace(/^in /, "");
    const sentence = `${s.charAt(0).toUpperCase()}${s.slice(1)}: ${fmtVal(top.metric, def.decimals)} ${def.label}`;
    return { title: sentence, answer: `${sentence}.` };
  }

  // Leaderboard.
  const groupPhrase: Record<GroupBy, string> = {
    player: `by ${article(noun)} ${noun}`, season: "in a season", team: "by a team", opponent: "against an opponent",
    venue: "at a venue", phase: "in a phase", innings: "in an innings",
  };
  const forWhom = q.groupBy !== "player" && noun !== "batter" && noun !== "bowler" && noun !== "team" ? ` for ${noun}s` : "";
  const head = `${superlative(q)} ${def.label}${forWhom} ${groupPhrase[q.groupBy]} ${scope}`;
  const val = (r: { metric: number | null }) => fmtVal(r.metric, def.decimals);
  // When the summary already states the metric (runs, wickets…) don't repeat the number.
  const summaryHasMetric = (q.groupBy === "player" && ["runs", "wickets"].includes(q.metric)) || (q.groupBy === "team" && q.metric === "runs");
  const withSummary = q.groupBy === "player" || (q.groupBy === "team" && q.perspective !== "results");
  const lead = withSummary
    ? summaryHasMetric ? `${top.label} — ${rowSummary(q, top)}` : `${top.label} — ${val(top)} (${rowSummary(q, top)})`
    : `${top.label} — ${val(top)}`;

  // Ties at the top are common for counts ("most titles": MI and CSK, 5 each).
  const tied = rows.filter((r) => r.metric === top.metric);
  if (tied.length > 1 && !def.rate) {
    const names = tied.length === 2 ? `${tied[0].label} and ${tied[1].label}` : `${tied.slice(0, -1).map((r) => r.label).join(", ")} and ${tied.at(-1)!.label}`;
    return { title: capitalize(head), answer: `${capitalize(head)}: ${names} — ${val(top)} each.` };
  }
  const next = second && second.metric !== null ? ` Next: ${second.label} (${val(second)}).` : "";
  return { title: capitalize(head), answer: `${capitalize(head)}: ${lead}.${next}` };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/* ─── Entry point ────────────────────────────────────────────────────────── */

export function runStatQuery(input: StatQuery): StatResult {
  const t0 = Date.now();
  const q: StatQuery = { ...input, filters: { ...input.filters }, limit: Math.min(Math.max(input.limit, 1), 50) };
  if (METRICS[q.metric].perspective !== q.perspective && !(q.perspective === "team_innings" && q.groupBy === "innings")) {
    q.perspective = METRICS[q.metric].perspective;
  }
  if (q.perspective === "team_innings") q.groupBy = "innings";
  if (q.metric === "titles") q.groupBy = "team";
  if (q.perspective === "results" && !["team", "opponent", "season", "venue"].includes(q.groupBy)) q.groupBy = "team";

  const computed =
    q.groupBy === "innings" ? runInningsRecords(q)
    : q.perspective === "batting" ? runBatting(q)
    : q.perspective === "bowling" ? runBowling(q)
    : runResults(q);

  let rows = computed.rows;
  const groupsConsidered = rows.length;
  let qualification: string | null = null;

  // Rates are meaningless on tiny samples: require a minimum volume, chosen
  // relative to the busiest groups unless the question set one.
  const def = METRICS[q.metric];
  // A named player's own numbers (overall or season by season) are never filtered by volume.
  const singleSubject = (q.filters.playerIds?.length ?? 0) > 0;
  if (q.groupBy !== "innings" && def.rate && computed.volumeUnit && !singleSubject && rows.length > 3) {
    let min = q.minVolume;
    if (min === undefined) {
      const vols = rows.map((r) => r.volume).sort((a, b) => b - a);
      const ref = vols[Math.min(9, vols.length - 1)];
      const step = computed.volumeUnit === "balls" ? 10 : 1;
      min = Math.max(computed.volumeUnit === "balls" ? 30 : 5, Math.round((ref * 0.3) / step) * step);
    }
    // The auto threshold is not written back into the query: it must be
    // recomputed when the scope changes (e.g. a season chip is removed).
    // minVolume 0 means the user removed the qualification chip.
    if (min > 0) {
      rows = rows.filter((r) => r.volume >= min!);
      qualification = `min ${min} ${computed.volumeUnit === "balls" ? (q.perspective === "bowling" ? "balls bowled" : "balls faced") : "matches"}`;
    }
  } else if (q.minVolume && computed.volumeUnit) {
    rows = rows.filter((r) => r.volume >= q.minVolume!);
    qualification = `min ${q.minVolume} ${computed.volumeUnit === "balls" ? "balls" : "matches"}`;
  }

  if (q.groupBy !== "innings") {
    rows = rows.filter((r) => r.metric !== null || q.sortBy === "key");
    if (q.sortBy === "key") rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    else rows.sort((a, b) => (q.order === "desc" ? b.metric! - a.metric! : a.metric! - b.metric!) || b.volume - a.volume);
    if (q.sortBy !== "key") rows = rows.slice(0, q.limit);
  }

  const { title, answer } = buildAnswer(q, rows);
  const chips = buildChips(q);
  if (qualification) chips.push({ field: "minVolume", label: qualification });

  return {
    query: q,
    title,
    answer,
    columns: computed.columns,
    rows: rows.map(({ key, label, sub, values }) => ({ key, label, sub, values })),
    chips,
    qualification,
    caveats: computed.caveats,
    groupsConsidered,
    ms: Date.now() - t0,
  };
}
