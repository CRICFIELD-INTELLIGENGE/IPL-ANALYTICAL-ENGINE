// Decision Intelligence OS — Slice 1: player data layer.
//
// Builds three cached views on top of the SQLite warehouse:
//   1. Player metadata (country / overseas, keeper, bat hand, pace vs spin),
//      merged from SQLite + the scraped CSV/JSON sources because the
//      `players` table alone has country for <30% of players and no styles.
//   2. Per-player, per-season ball-by-ball aggregates (batting, bowling,
//      appearances by franchise) — the input to every model downstream.
//   3. League baselines per season (runs/ball, balls/wicket) so impact is
//      measured relative to the era, not raw totals.
//
// Everything is computed once on first use (~1–2s) and kept in memory.

import fs from "fs";
import path from "path";
import {
  getDecisionDb,
  getProjectRoot,
  normalizeSeason,
  parseCsv,
  queryAll,
  readTextLoose,
  RUNS_CONCEDED_SQL,
} from "./db";
import { buildBioLookup, normalizeName, type Bio, type BioLookup } from "../player-bio-lookup";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type PlayingRole = "batter" | "wicketkeeper" | "all-rounder" | "bowler";
export type BowlingType = "pace" | "spin" | "none" | "unknown";

export interface PlayerMeta {
  playerId: number;
  name: string;
  fullName: string | null;
  country: string | null;
  overseas: boolean;
  keeper: boolean;
  battingHand: "L" | "R" | null;
  bowlingStyle: string | null;
  bowlingType: BowlingType;
}

export interface SeasonLine {
  season: string;
  matches: number;
  batRuns: number;
  batBalls: number;
  batOuts: number;
  fours: number;
  sixes: number;
  bowlBalls: number;
  bowlRuns: number;
  wickets: number;
}

export interface SeasonBaseline {
  batRunsPerBall: number;
  batBallsPerOut: number;
  bowlRunsPerBall: number;
  bowlBallsPerWicket: number;
}

export interface RosterEntry {
  playerId: number;
  teamId: number;
  matches: number;
}

export interface UsageProfile {
  matchesWeighted: number;
  ballsFacedPerMatch: number;
  oversPerMatch: number;
  role: PlayingRole;
  bowlingCapacity: number; // overs (0–4) the player can realistically bowl in an XI
}

/* ─── Name matching ──────────────────────────────────────────────────────── */

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

// Day 6: the initial+surname fallback is gone. It gave "N Saini" (Nitin, addbde6c) Navdeep Saini's bowling style
// through the auction list, and could hand any player another player's record. Name sources are now matched exactly,
// and only when the written name denotes a single registry id (DAY-06-REPORT.md §A).
class NameIndex<T> {
  // key → (person id → first record added). Several sources may describe the
  // same person; a key is only ambiguous when it maps to different people.
  private exact = new Map<string, Map<string, T>>();

  /** `personId` groups records about the same player (e.g. their normalised full name). */
  add(name: string, rec: T, personId: string = name): void {
    const k = norm(name ?? "");
    if (!k) return;
    const id = norm(personId) || k;
    const people = this.exact.get(k) ?? new Map<string, T>();
    if (!people.has(id)) people.set(id, rec);
    this.exact.set(k, people);
  }

  /** The record for an exact (normalised) name, if that name belongs to exactly one person in this source. */
  findExact(name: string | null | undefined): T | undefined {
    const people = name ? this.exact.get(norm(name)) : undefined;
    return people?.size === 1 ? people.values().next().value : undefined;
  }
}

export function classifyBowlingStyle(style: string | null | undefined): BowlingType {
  if (!style || !style.trim() || style.trim() === "NULL") return "unknown";
  const s = style.toLowerCase();
  if (/(spin|break|orthodox|googly|slow|unorthodox)/.test(s)) return "spin";
  if (/(fast|medium|seam|pace)/.test(s)) return "pace";
  return "unknown";
}

export type BowlingSubtype =
  | "Right-arm pace" | "Left-arm pace" | "Off-spin" | "Leg-spin" | "Left-arm orthodox" | "Left-arm wrist spin"
  | "Pace (arm unknown)" | "Spin (type unknown)";

/**
 * Finer bowling type for matchup analysis. Pace vs spin follows bowlingType
 * (ball-speed data first); the style string only refines it, so a listed
 * "medium" bowler whose speeds say spin is never called a pacer.
 */
export function bowlingSubtype(meta: Pick<PlayerMeta, "bowlingStyle" | "bowlingType">): BowlingSubtype | null {
  if (meta.bowlingType !== "pace" && meta.bowlingType !== "spin") return null;
  const s = (meta.bowlingStyle ?? "").split(",")[0].toLowerCase();
  const left = /left/.test(s);
  if (meta.bowlingType === "pace") {
    if (!/(fast|medium|seam)/.test(s)) return "Pace (arm unknown)";
    return left ? "Left-arm pace" : "Right-arm pace";
  }
  if (/(wrist|unorthodox|chinaman)/.test(s)) return "Left-arm wrist spin";
  if (/orthodox/.test(s)) return "Left-arm orthodox";
  if (/(leg ?break|leg ?spin|googly)/.test(s)) return "Leg-spin";
  if (/(off ?break|off ?spin)/.test(s)) return "Off-spin";
  return "Spin (type unknown)";
}

/* ─── Metadata merge ─────────────────────────────────────────────────────── */
//
// Identity first: a player's bio is the one verified for their Cricsheet registry id (players.cricsheet_id) in the
// identity index, or, failing that, the single unverified bio that a squad row of the bio's own franchise maps to
// their written name (the Day 4.6 rules, player-bio-lookup.ts). Sources without ids (the style CSV, squad rows,
// stumpings) are used only by exact written name, and only when that name denotes one registry id: "Harmeet Singh"
// is two people, so neither inherits the other's record. The auction list is matched by exact full name only.
// No fuzzy matching anywhere; an unresolved field stays null / unknown.
//   country : squads-by-season.json (cricsheetName) → players.country → 2026 auction list
//   keeper  : stumpings in raw Cricsheet JSON (last 4 seasons) → keeper labels in
//             squads-by-season / players.role / 2026 auction list
//   styles  : verified player-bio.json → players-data-updated.csv → auction list

interface StyleRec { shortName: string; fullName: string; batStyle: string; bowlStyle: string }
interface AuctionRec { fullName: string; country: string; specialism: string; batHand: string; bowlStyle: string }
interface SquadRec { country: string | null }

function loadStyleCsv(root: string): StyleRec[] {
  const text = readTextLoose(path.join(root, "players-data-updated.csv"));
  if (!text) return [];
  const [header, ...rows] = parseCsv(text);
  const ix = (k: string) => header.indexOf(k);
  return rows.map((r) => ({
    shortName: r[ix("player_name")] ?? "",
    fullName: r[ix("player_full_name")] ?? "",
    batStyle: r[ix("bat_style")] ?? "",
    bowlStyle: r[ix("bowl_style")] ?? "",
  }));
}

function readJsonLoose<T>(fp: string): T | undefined {
  try {
    return fs.existsSync(fp) ? (JSON.parse(fs.readFileSync(fp, "utf8")) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Bio key → bio, plus the registry-identity lookup over them (Day 4.6 identity index and franchise squad rows). */
function loadBios(root: string): { bios: Record<string, Bio>; lookup: BioLookup } {
  const bios = readJsonLoose<Record<string, Bio>>(path.join(root, "artifacts", "api-server", "data", "player-bio.json")) ?? {};
  const dataDir = path.join(root, "artifacts", "ipl-analytics", "public", "data");
  const identityKeys =
    readJsonLoose<{ keys?: Record<string, [string, number]> }>(path.join(dataDir, "player-recent-matches", "index.json"))?.keys ?? {};
  const squads = readJsonLoose<Parameters<typeof buildBioLookup>[3]>(path.join(dataDir, "squads-by-season.json")) ?? {};
  bioIdentityKeys = identityKeys;
  return { bios, lookup: buildBioLookup(bios, identityKeys, [], squads) };
}

let bioIdentityKeys: Record<string, [string, number]> | null = null;
let bioCache: { bios: Record<string, Bio>; lookup: BioLookup } | null = null;

/**
 * The registry id a profile page's bio stands for: `key` is a bio key ("wanindu-hasaranga") or a bio display name
 * ("PW Hasaranga"), resolved only through the verified identity index (Day 7). Unverified or ambiguous → null.
 */
export function registryIdForBio(key: string): string | null {
  bioCache ??= loadBios(getProjectRoot());
  const { bios, lookup } = bioCache;
  const keys = bios[key] ? [key] : (lookup.exact.get(normalizeName(key)) ?? []);
  const ids = new Set(keys.map((k) => bioIdentityKeys?.[k]?.[0]).filter((x): x is string => Boolean(x)));
  return ids.size === 1 ? [...ids][0] : null;
}

const bioText = (v: unknown): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s !== "NULL" ? s : "";
};

function loadAuctionCsv(root: string): AuctionRec[] {
  const file = fs.readdirSync(root).find((f) => /ipl auction player list.*\.csv$/i.test(f));
  if (!file) return [];
  const text = readTextLoose(path.join(root, file));
  if (!text) return [];
  // Columns: 3 First Name, 4 Surname, 5 Country, 9 Specialism, 10 bat hand, 11 bowl style.
  return parseCsv(text)
    .filter((r) => /^\d+$/.test(r[0] ?? ""))
    .map((r) => ({
      fullName: `${r[3] ?? ""} ${r[4] ?? ""}`.trim(),
      country: (r[5] ?? "").trim(),
      specialism: (r[9] ?? "").trim(),
      batHand: (r[10] ?? "").trim(),
      bowlStyle: (r[11] ?? "").trim(),
    }));
}

/**
 * cricsheetName → latest known country. Its role labels are not used for keepers:
 * 206 of the 246 players it labels "wicketkeeper" have never made an IPL stumping
 * (Warner, Pollard, Gayle, Chawla, Rahane…).
 */
function loadSquadsBySeason(root: string): Map<string, SquadRec> {
  const fp = path.join(root, "artifacts", "api-server", "data", "squads-by-season.json");
  const out = new Map<string, SquadRec>();
  if (!fs.existsSync(fp)) return out;
  try {
    const bySeason = JSON.parse(fs.readFileSync(fp, "utf8")) as Record<
      string,
      Record<string, { cricsheetName?: string; country?: string | null; role?: string | null }[]>
    >;
    for (const season of Object.keys(bySeason).sort()) {
      for (const squad of Object.values(bySeason[season])) {
        for (const p of squad) {
          if (!p.cricsheetName) continue;
          const prev = out.get(p.cricsheetName);
          out.set(p.cricsheetName, { country: p.country || prev?.country || null });
        }
      }
    }
  } catch {
    /* use whatever loaded */
  }
  return out;
}

interface RawMatch {
  info?: { season?: string | number; registry?: { people?: Record<string, string> } };
  innings?: {
    overs?: { deliveries?: { wickets?: { kind: string; fielders?: { name?: string; substitute?: boolean }[] }[] }[] }[];
  }[];
}

/**
 * One pass over the raw Cricsheet JSON:
 *   nameToIds : written name → registry ids it denotes (a name used by two people has two)
 *   stumpings : fielder name → seasons in which they made a stumping. Only keepers stump.
 */
function loadRawIndex(root: string): { nameToIds: Map<string, Set<string>>; stumpings: Map<string, Set<string>> } {
  const dir = path.join(root, "lib", "cricket-data", "raw");
  const nameToIds = new Map<string, Set<string>>();
  const stumpings = new Map<string, Set<string>>();
  if (!fs.existsSync(dir)) return { nameToIds, stumpings };
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const match = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as RawMatch;
      for (const [name, id] of Object.entries(match.info?.registry?.people ?? {})) {
        if (id) (nameToIds.get(name) ?? nameToIds.set(name, new Set()).get(name)!).add(id);
      }
      const season = normalizeSeason(String(match.info?.season ?? ""));
      for (const inn of match.innings ?? [])
        for (const ov of inn.overs ?? [])
          for (const d of ov.deliveries ?? [])
            for (const w of d.wickets ?? []) {
              if (w.kind !== "stumped") continue;
              for (const f of w.fielders ?? []) {
                if (!f.name || f.substitute) continue;
                const s = stumpings.get(f.name) ?? new Set<string>();
                s.add(season);
                stumpings.set(f.name, s);
              }
            }
    } catch {
      /* skip malformed file */
    }
  }
  return { nameToIds, stumpings };
}

/**
 * Pace vs spin from recorded ball speeds (delivery_commentary.speed_kph).
 * Peak speed, not the mean: medium pacers' slower balls drag their average
 * into spin territory, but no spinner on record tops 124 kph.
 */
function loadSpeedTypes(): Map<number, BowlingType> {
  try {
    const rows = queryAll<{ pid: number; n: number; kph: number }>(`
      SELECT d.bowler_id pid, COUNT(*) n, MAX(dc.speed_kph) kph
      FROM delivery_commentary dc JOIN deliveries d ON d.delivery_id = dc.delivery_id
      WHERE dc.speed_kph > 60
      GROUP BY 1 HAVING n >= 6`);
    return new Map(rows.map((r) => [r.pid, r.kph >= 124 ? "pace" : "spin"]));
  } catch {
    return new Map();
  }
}

let metaCache: Map<number, PlayerMeta> | null = null;

export function getPlayerMeta(): Map<number, PlayerMeta> {
  if (metaCache) return metaCache;
  const root = getProjectRoot();

  const { bios, lookup } = loadBios(root);
  const csv = new NameIndex<StyleRec>();
  for (const r of loadStyleCsv(root)) csv.add(r.shortName, r, r.fullName.trim() || r.shortName);
  const speedTypes = loadSpeedTypes();
  const auction = new NameIndex<AuctionRec>();
  for (const r of loadAuctionCsv(root)) auction.add(r.fullName, r);
  const squads = loadSquadsBySeason(root);
  const { nameToIds, stumpings } = loadRawIndex(root);

  const rows = queryAll<{ player_id: number; cricsheet_id: string | null; name: string; role: string | null; country: string | null }>(
    "SELECT player_id, cricsheet_id, name, role, country FROM players",
  );

  const out = new Map<number, PlayerMeta>();
  for (const p of rows) {
    // Registered players: the warehouse name is the Cricsheet written name, except that a second person with the same
    // written name is stored as "Name (2)"; that suffixed name is in no name-keyed source, so it matches nothing.
    // Squad stubs (2026 squad members with no IPL appearance, cricsheet_id "json:N") carry a full display name and no
    // registry id; they are matched by that exact full name, provided it is not a written name shared by several ids.
    const ids = nameToIds.get(p.name);
    const stub = !p.cricsheet_id || p.cricsheet_id.startsWith("json:");
    const nameIsTheirs = stub ? !(ids && ids.size > 1) : Boolean(ids?.size === 1 && ids.has(p.cricsheet_id!));
    let bioKey: string | undefined;
    if (stub) {
      const exact = nameIsTheirs ? (lookup.exact.get(normalizeName(p.name)) ?? []) : [];
      bioKey = exact.length === 1 ? exact[0] : undefined;
    } else {
      const squadBio = nameIsTheirs ? [...(lookup.squadKeys.get(p.name) ?? [])] : [];
      bioKey = lookup.idToKey.get(p.cricsheet_id!) ?? (squadBio.length === 1 ? squadBio[0] : undefined);
    }
    const bio = bioKey ? bios[bioKey] : undefined;
    const csvRec = nameIsTheirs ? csv.findExact(p.name) : undefined;

    const fullName = bioText(bio?.fullName) || csvRec?.fullName.trim() || (stub ? p.name : null);
    const sq = nameIsTheirs ? squads.get(p.name) : undefined;
    const auExact = fullName ? auction.findExact(fullName) : undefined;

    const dbCountry = p.country && p.country !== "Unknown" ? p.country : null;
    const country = sq?.country || dbCountry || auExact?.country || null;

    // Keeper evidence: an IPL stumping (only keepers stump) or the verified bio's
    // field position. Role labels (players.role, squad files, bio.role) are not used:
    // they label batters and pace bowlers as keepers.
    const stumpedIn = nameIsTheirs ? stumpings.get(p.name) : undefined;
    const keeper = (stumpedIn?.size ?? 0) > 0
      || bioText(bio?.fieldPos) === "Wicketkeeper"
      || auExact?.specialism === "WICKETKEEPER";

    const batSrc = (bioText(bio?.batStyle) || bioText(csvRec?.batStyle) || auExact?.batHand || "").toLowerCase();
    const battingHand = batSrc.startsWith("l") ? "L" : batSrc.startsWith("r") ? "R" : null;
    const bowlingStyle = bioText(bio?.bowlStyle) || bioText(csvRec?.bowlStyle) || auExact?.bowlStyle || null;

    out.set(p.player_id, {
      playerId: p.player_id,
      name: p.name,
      fullName,
      country,
      // Unknown country is treated as Indian: overseas players are well
      // documented in the squad lists, the gaps are almost all uncapped Indians.
      overseas: country !== null && country !== "India",
      keeper,
      battingHand,
      bowlingStyle,
      bowlingType: speedTypes.get(p.player_id) ?? classifyBowlingStyle(bowlingStyle),
    });
  }
  metaCache = out;
  return out;
}

/* ─── Season aggregates ──────────────────────────────────────────────────── */

let linesCache: Map<number, SeasonLine[]> | null = null;
let rosterCache: Map<string, RosterEntry[]> | null = null;

const BOWLER_WICKETS = "('bowled','caught','caught and bowled','lbw','stumped','hit wicket')";

function emptyLine(season: string): SeasonLine {
  return { season, matches: 0, batRuns: 0, batBalls: 0, batOuts: 0, fours: 0, sixes: 0, bowlBalls: 0, bowlRuns: 0, wickets: 0 };
}

function buildSeasonData(): void {
  const lines = new Map<number, Map<string, SeasonLine>>();
  const line = (pid: number, rawSeason: string): SeasonLine => {
    const season = normalizeSeason(rawSeason);
    let byS = lines.get(pid);
    if (!byS) { byS = new Map(); lines.set(pid, byS); }
    let l = byS.get(season);
    if (!l) { l = emptyLine(season); byS.set(season, l); }
    return l;
  };

  for (const r of queryAll<{ pid: number; season: string; runs: number; balls: number; fours: number; sixes: number }>(`
    SELECT d.batter_id pid, m.season_id season, SUM(d.batter_runs) runs, SUM(1 - d.is_wide) balls,
           SUM(CASE WHEN d.batter_runs = 4 THEN 1 ELSE 0 END) fours,
           SUM(CASE WHEN d.batter_runs = 6 THEN 1 ELSE 0 END) sixes
    FROM deliveries d JOIN matches m ON m.match_id = d.match_id
    GROUP BY 1, 2`)) {
    const l = line(r.pid, r.season);
    l.batRuns = r.runs; l.batBalls = r.balls; l.fours = r.fours; l.sixes = r.sixes;
  }

  for (const r of queryAll<{ pid: number; season: string; outs: number }>(`
    SELECT x.player_out_id pid, m.season_id season, COUNT(*) outs
    FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE x.kind NOT IN ('retired hurt') AND x.player_out_id IS NOT NULL
    GROUP BY 1, 2`)) {
    line(r.pid, r.season).batOuts = r.outs;
  }

  for (const r of queryAll<{ pid: number; season: string; balls: number; runs: number }>(`
    SELECT d.bowler_id pid, m.season_id season,
           SUM(CASE WHEN d.is_wide = 0 AND d.is_noball = 0 THEN 1 ELSE 0 END) balls,
           SUM(${RUNS_CONCEDED_SQL}) runs
    FROM deliveries d JOIN matches m ON m.match_id = d.match_id
    GROUP BY 1, 2`)) {
    const l = line(r.pid, r.season);
    l.bowlBalls = r.balls; l.bowlRuns = r.runs;
  }

  for (const r of queryAll<{ pid: number; season: string; wkts: number }>(`
    SELECT d.bowler_id pid, m.season_id season, COUNT(*) wkts
    FROM dismissals x JOIN deliveries d ON d.delivery_id = x.delivery_id
    JOIN matches m ON m.match_id = d.match_id
    WHERE x.kind IN ${BOWLER_WICKETS}
    GROUP BY 1, 2`)) {
    line(r.pid, r.season).wickets = r.wkts;
  }

  // Appearances: anyone who batted, stood at the non-striker's end, or bowled.
  const roster = new Map<string, RosterEntry[]>();
  for (const r of queryAll<{ pid: number; season: string; team: number; matches: number }>(`
    SELECT a.pid, m.season_id season, a.team, COUNT(DISTINCT a.match_id) matches
    FROM (
      SELECT d.batter_id pid, d.match_id, i.batting_team_id team FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
      UNION
      SELECT d.non_striker_id, d.match_id, i.batting_team_id FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
      UNION
      SELECT d.bowler_id, d.match_id, i.bowling_team_id FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id
    ) a JOIN matches m ON m.match_id = a.match_id
    WHERE a.pid IS NOT NULL
    GROUP BY 1, 2, 3`)) {
    const season = normalizeSeason(r.season);
    line(r.pid, r.season).matches += r.matches;
    const arr = roster.get(season) ?? [];
    arr.push({ playerId: r.pid, teamId: r.team, matches: r.matches });
    roster.set(season, arr);
  }

  linesCache = new Map(
    [...lines].map(([pid, byS]) => [pid, [...byS.values()].sort((a, b) => a.season.localeCompare(b.season))]),
  );
  rosterCache = roster;
}

export function getSeasonLines(): Map<number, SeasonLine[]> {
  if (!linesCache) buildSeasonData();
  return linesCache!;
}

export function getRoster(season: string): RosterEntry[] {
  if (!rosterCache) buildSeasonData();
  return rosterCache!.get(season) ?? [];
}

export function getSeasons(): string[] {
  if (!rosterCache) buildSeasonData();
  return [...rosterCache!.keys()].sort();
}

let baselineCache: Map<string, SeasonBaseline> | null = null;

export function getBaselines(): Map<string, SeasonBaseline> {
  if (baselineCache) return baselineCache;
  const totals = new Map<string, SeasonLine>();
  for (const ls of getSeasonLines().values()) {
    for (const l of ls) {
      const t = totals.get(l.season) ?? emptyLine(l.season);
      t.batRuns += l.batRuns; t.batBalls += l.batBalls; t.batOuts += l.batOuts;
      t.bowlRuns += l.bowlRuns; t.bowlBalls += l.bowlBalls; t.wickets += l.wickets;
      totals.set(l.season, t);
    }
  }
  baselineCache = new Map(
    [...totals].map(([s, t]) => [s, {
      batRunsPerBall: t.batRuns / Math.max(1, t.batBalls),
      batBallsPerOut: t.batBalls / Math.max(1, t.batOuts),
      bowlRunsPerBall: t.bowlRuns / Math.max(1, t.bowlBalls),
      bowlBallsPerWicket: t.bowlBalls / Math.max(1, t.wickets),
    }]),
  );
  return baselineCache;
}

/* ─── Usage / role inference ─────────────────────────────────────────────── */

/** Recency weight: the target season counts 1, the one before 0.55, etc. */
export const RECENCY_DECAY = 0.55;

export function recencyWeight(season: string, target: string): number {
  const gap = Number(target) - Number(season);
  return gap < 0 ? 0 : Math.pow(RECENCY_DECAY, gap);
}

export function getUsage(playerId: number, targetSeason: string): UsageProfile {
  const meta = getPlayerMeta().get(playerId);
  const ls = getSeasonLines().get(playerId) ?? [];
  let m = 0, bf = 0, bb = 0;
  for (const l of ls) {
    const w = recencyWeight(l.season, targetSeason);
    m += w * l.matches; bf += w * l.batBalls; bb += w * l.bowlBalls;
  }
  const ballsFacedPerMatch = m > 0 ? bf / m : 0;
  const oversPerMatch = m > 0 ? bb / 6 / m : 0;

  const bowlingCapacity =
    oversPerMatch >= 2.5 ? 4 : oversPerMatch >= 1.75 ? 3 : oversPerMatch >= 1 ? 2 : oversPerMatch >= 0.4 ? 1 : 0;

  let role: PlayingRole;
  if (meta?.keeper) role = "wicketkeeper";
  else if (oversPerMatch >= 1.5 && ballsFacedPerMatch >= 9) role = "all-rounder";
  else if (oversPerMatch >= 1.5) role = "bowler";
  else role = "batter";

  return { matchesWeighted: m, ballsFacedPerMatch, oversPerMatch, role, bowlingCapacity };
}

export function isWarehouseReady(): boolean {
  return getDecisionDb() !== null;
}

/** Build every cache up front (~5s) so the first /ai-analyst request is instant. */
export function warmDecisionCaches(): void {
  if (!isWarehouseReady()) return;
  getPlayerMeta();
  getBaselines();
}
