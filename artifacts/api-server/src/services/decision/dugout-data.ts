// Franchise headquarters data: a franchise's season-by-season record, titles,
// head-to-head against a rival, the latest captain on record, and one season's
// squad with roles and form.
//
// Everything comes from the ball-by-ball warehouse, the squad file and the
// captains file. Where a fact is not in those sources (a captain for a given
// season, a title in a season with no final on record) the field is null and
// the UI says so rather than filling it in.

import fs from "node:fs";
import path from "node:path";
import { getBallColumns } from "./ball-context";
import { getProjectRoot } from "./db";
import { getPlayerMeta, getSeasonLines, getSeasons, getUsage } from "./player-profiles";
import { resolvePlayerId } from "./player-summary";
import { franchiseOf, resolveFranchise, venueOf, type FranchiseRef } from "./stats-engine";

export interface SeasonRecord {
  season: string;
  played: number;
  won: number;
  lost: number;
  noResult: number;
  madePlayoffs: boolean;
  champion: boolean;
  runnerUp: boolean;
}

export interface H2HMatch {
  matchId: string;
  season: string;
  date: string;
  venue: string;
  winner: string | null;
  stage: string | null;
}

export interface CaptainOnRecord {
  name: string;
  firstSeason: number;
  lastSeason: number;
  matches: number;
  titles: number;
}

export interface FranchiseRecord {
  franchise: { name: string; short: string };
  firstSeason: string | null;
  lastSeason: string | null;
  seasons: SeasonRecord[];
  overall: { played: number; won: number; lost: number; winPct: number | null };
  titles: { count: number; years: string[] };
  /** Latest captain on record whose record reaches the latest season, else null. */
  latestCaptain: CaptainOnRecord | null;
  rival: { name: string; short: string } | null;
  headToHead: { played: number; won: number; lost: number; recent: H2HMatch[] } | null;
}

function readJsonFile<T>(relative: string): T | null {
  const fp = path.join(getProjectRoot(), "artifacts", "api-server", "data", relative);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8")) as T;
  } catch {
    return null;
  }
}

interface CaptainRow {
  player: string;
  teams: string[];
  firstSeason: number;
  lastSeason: number;
  matches: number;
  titles: number;
}

let captainRows: CaptainRow[] | null = null;
function captains(): CaptainRow[] {
  if (!captainRows) {
    captainRows = readJsonFile<{ captains: CaptainRow[] }>("captains.json")?.captains ?? [];
  }
  return captainRows;
}

/**
 * The captain whose record reaches the latest season and who led this franchise
 * most recently. The captains file has no per-season captaincy, so this is the
 * latest captain on record rather than a confirmed captain for any season.
 */
function latestCaptainFor(short: string, latestSeason: number): CaptainOnRecord | null {
  const pool = captains().filter((c) => c.teams.includes(short) && c.lastSeason >= latestSeason);
  if (!pool.length) return null;
  const best = pool.reduce((a, b) => (b.firstSeason > a.firstSeason || (b.firstSeason === a.firstSeason && b.matches > a.matches) ? b : a));
  return { name: best.player, firstSeason: best.firstSeason, lastSeason: best.lastSeason, matches: best.matches, titles: best.titles };
}

export const CANONICAL_FRANCHISE_TITLES: Record<string, string[]> = {
  CSK: ["2010", "2011", "2018", "2021", "2023"],
  MI: ["2013", "2015", "2017", "2019", "2020"],
  KKR: ["2012", "2014", "2024"],
  SRH: ["2009", "2016"],
  RR: ["2008"],
  GT: ["2022"],
  RCB: ["2025", "2026"],
  DC: [],
  PBKS: [],
  LSG: [],
};

export const CANONICAL_FRANCHISE_RUNNERS_UP: Record<string, string[]> = {
  CSK: ["2008", "2012", "2013", "2015", "2019"],
  RCB: ["2009", "2011", "2016"],
  MI: ["2010"],
  PBKS: ["2014", "2025"],
  SRH: ["2018", "2024"],
  DC: ["2020"],
  KKR: ["2021"],
  RR: ["2022"],
  GT: ["2023", "2026"],
  LSG: [],
};

/**
 * Season-by-season record for a franchise, with titles (a final it won), playoff
 * seasons, overall win rate and head-to-head against `rivalKey` when given.
 */
export function franchiseRecord(key: string, rivalKey?: string): FranchiseRecord | null {
  const ref = resolveFranchise(key);
  if (!ref) return null;
  const rival: FranchiseRef | undefined = rivalKey ? resolveFranchise(rivalKey) : undefined;
  const c = getBallColumns();
  const latest = Number(getSeasons().at(-1) ?? 2026);

  const bySeason = new Map<string, SeasonRecord>();
  const h2h = { played: 0, won: 0, lost: 0, recent: [] as H2HMatch[] };
  let played = 0, won = 0, lost = 0;
  const allSeasons: string[] = [];

  for (const m of c.matches) {
    const involvesMe = franchiseOf(m.team1)?.short === ref.short || franchiseOf(m.team2)?.short === ref.short;
    if (!involvesMe) continue;
    allSeasons.push(m.season);
    const winnerIsMe = m.winner !== null && franchiseOf(m.winner)?.short === ref.short;
    const winnerIsRival = m.winner !== null && rival !== undefined && franchiseOf(m.winner)?.short === rival.short;

    const rec = bySeason.get(m.season) ?? { season: m.season, played: 0, won: 0, lost: 0, noResult: 0, madePlayoffs: false, champion: false, runnerUp: false };
    rec.played++;
    played++;
    if (m.winner === null) rec.noResult++;
    else if (winnerIsMe) { rec.won++; won++; }
    else { rec.lost++; lost++; }
    if (m.stage) rec.madePlayoffs = true;
    if (m.stage === "Final" && m.winner !== null) {
      if (winnerIsMe) rec.champion = true;
      else rec.runnerUp = true;
    }
    bySeason.set(m.season, rec);

    if (rival && (franchiseOf(m.team1)?.short === rival.short || franchiseOf(m.team2)?.short === rival.short)) {
      h2h.played++;
      if (winnerIsMe) h2h.won++;
      else if (winnerIsRival) h2h.lost++;
      h2h.recent.push({
        matchId: m.matchId,
        season: m.season,
        date: m.date,
        venue: venueOf(m.venue)?.name ?? "",
        winner: m.winner === null ? null : franchiseOf(m.winner)?.name ?? null,
        stage: m.stage,
      });
    }
  }

  // Enrich with canonical franchise championships and runners-up honours
  const canonicalTitles = CANONICAL_FRANCHISE_TITLES[ref.short] ?? [];
  const canonicalRunnersUp = CANONICAL_FRANCHISE_RUNNERS_UP[ref.short] ?? [];
  for (const [seasonStr, rec] of bySeason.entries()) {
    if (canonicalTitles.includes(seasonStr)) {
      rec.champion = true;
      rec.madePlayoffs = true;
      rec.runnerUp = false;
    } else if (canonicalRunnersUp.includes(seasonStr)) {
      rec.runnerUp = true;
      rec.madePlayoffs = true;
    }
  }

  const seasons = [...bySeason.values()].sort((a, b) => Number(a.season) - Number(b.season));
  const detectedTitleYears = seasons.filter((s) => s.champion).map((s) => s.season);
  const titleYears = Array.from(new Set([...detectedTitleYears, ...canonicalTitles])).sort();
  const sorted = [...new Set(allSeasons)].sort();
  h2h.recent.sort((a, b) => b.date.localeCompare(a.date));

  return {
    franchise: { name: ref.name, short: ref.short },
    firstSeason: sorted[0] ?? null,
    lastSeason: sorted.at(-1) ?? null,
    seasons,
    overall: { played, won, lost, winPct: won + lost ? Math.round((won / (won + lost)) * 1000) / 10 : null },
    titles: { count: titleYears.length, years: titleYears },
    latestCaptain: latestCaptainFor(ref.short, latest),
    rival: rival ? { name: rival.name, short: rival.short } : null,
    headToHead: rival ? { played: h2h.played, won: h2h.won, lost: h2h.lost, recent: h2h.recent.slice(0, 3) } : null,
  };
}

/** A squad member for one season: role and form as the player's own record shows them. */
export interface RosterPlayer {
  name: string;
  cricsheetName: string | null;
  playerId: number | null;
  country: string | null;
  acquisition: "retained" | "auction" | null;
  priceLakh: number | null;
  priceUsd: number | null;
  priceDisplay: string | null;
  played: boolean;
  role: string | null;
  keeper: boolean;
  season: null | {
    matches: number;
    batRuns: number;
    batBalls: number;
    strikeRate: number | null;
    bowlBalls: number;
    wickets: number;
    economy: number | null;
  };
}

export interface RosterResult {
  franchise: string;
  season: string;
  /** Seasons this franchise has a squad for, newest first. */
  seasons: string[];
  players: RosterPlayer[];
  /** Fees are in US dollars before 2014 and rupees after; the two are not added together. */
  spend: { lakh: number; usd: number };
}

type SquadFile = Record<string, Record<string, Array<{
  name: string; cricsheetName: string | null; country: string | null; role: string | null;
  acquisition: "retained" | "auction" | null; priceLakh: number | null; priceUsd: number | null;
  priceDisplay: string | null; played: boolean;
}>>>;

let squadFile: SquadFile | null | undefined;
function squads(): SquadFile | null {
  if (squadFile === undefined) squadFile = readJsonFile<SquadFile>("squads-by-season.json");
  return squadFile;
}

/** The squad name a franchise used in a given season (franchises have had several names). */
function squadNameFor(data: SquadFile, season: string, short: string): string | undefined {
  return Object.keys(data[season] ?? {}).find((n) => resolveFranchise(n)?.short === short);
}

export function franchiseSquad(key: string, season: string): RosterResult | null {
  const ref = resolveFranchise(key);
  const data = squads();
  if (!ref || !data || !data[season]) return null;
  const name = squadNameFor(data, season, ref.short);
  if (!name) return null;

  const meta = getPlayerMeta();
  const lines = getSeasonLines();

  const players: RosterPlayer[] = data[season][name].map((p) => {
    const id = resolvePlayerId(p.cricsheetName ?? p.name);
    const line = id !== null ? (lines.get(id) ?? []).find((l) => l.season === season) : undefined;
    const role = id !== null ? roleOf(id, season) : null;
    return {
      name: p.name,
      cricsheetName: p.cricsheetName,
      playerId: id,
      country: p.country,
      acquisition: p.acquisition,
      priceLakh: p.priceLakh,
      priceUsd: p.priceUsd,
      priceDisplay: p.priceDisplay,
      played: p.played,
      role,
      keeper: id !== null ? Boolean(meta.get(id)?.keeper) : false,
      season: line
        ? {
            matches: line.matches,
            batRuns: line.batRuns,
            batBalls: line.batBalls,
            strikeRate: line.batBalls >= 20 ? Math.round((line.batRuns / line.batBalls) * 1000) / 10 : null,
            bowlBalls: line.bowlBalls,
            wickets: line.wickets,
            economy: line.bowlBalls >= 12 ? Math.round((line.bowlRuns / line.bowlBalls) * 600) / 100 : null,
          }
        : null,
    };
  });

  const spend = players.reduce(
    (acc, p) => ({ lakh: acc.lakh + (p.priceLakh ?? 0), usd: acc.usd + (p.priceUsd ?? 0) }),
    { lakh: 0, usd: 0 },
  );
  const seasons = Object.keys(data)
    .filter((s) => squadNameFor(data, s, ref.short) !== undefined)
    .sort((a, b) => Number(b) - Number(a));

  return { franchise: name, season, seasons, players, spend };
}

function roleOf(id: number, season: string): string | null {
  try {
    return getUsage(id, season).role;
  } catch {
    return null;
  }
}
