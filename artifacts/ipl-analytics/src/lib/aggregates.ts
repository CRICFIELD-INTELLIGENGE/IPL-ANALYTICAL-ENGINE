/**
 * Typed React Query hooks for the pre-aggregated Cricsheet IPL data
 * served as static JSON from /data/*.json.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { FALLBACK_ACCENT, TEAM_ACCENTS } from "@/lib/team-palette";

export interface Overview {
  totalMatches: number;
  totalRuns: number;
  totalSixes: number;
  totalFours: number;
  totalWickets: number;
  seasons: number;
  firstSeason: string;
  lastSeason: string;
  avg1stInnings: number;
}

export interface SeasonRow {
  season: string;
  matches: number;
  runs: number;
  sixes: number;
  fours: number;
  wickets: number;
  highestTotal: number;
  highestChase: number;
}

export interface TeamRow {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  noResult: number;
  winPct: number;
  runsScored: number;
  runsConceded: number;
  battingSr: number;
  bowlingEcon: number;
  highest: number;
  lowest: number | null;
  titles: number;
}

export interface VenueRow {
  venue: string;
  matches: number;
  avg1stInn: number;
  avg2ndInn: number;
  battingFirstWinPct: number;
  chasingWinPct: number;
  tossDecisionFieldPct: number;
  tossWinPct: number;
}

export interface BatterRow {
  player: string;
  team?: string;
  teamName?: string;
  innings: number;
  runs: number;
  balls: number;
  avg: number;
  sr: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  highest: number;
  ppSr: number;
  middleSr: number;
  deathSr: number;
  boundaryPct: number;
  clutch?: number;
  form?: number;
}

export interface HandednessSplit {
  runs: number;
  balls: number;
  wickets: number;
  strikeRate: number;
}

export interface BowlerRow {
  player: string;
  team?: string;
  teamName?: string;
  innings: number;
  overs: string;
  balls: number;
  runs: number;
  wickets: number;
  econ: number;
  avg: number;
  sr: number;
  fourW: number;
  fiveW: number;
  best: string;
  /** Legacy phase fields remain readable for existing phase visualizations. */
  ppEcon?: number;
  middleEcon?: number;
  deathEcon?: number;
  boundaryPct: number;
  ballsPerBoundary: number;
  trueEconomy: number | null;
  bowlerType?: "Pacer" | "Spinner" | "Unknown";
  vsLhb?: HandednessSplit;
  vsRhb?: HandednessSplit;
  ppWickets: number;
  middleWickets: number;
  deathWickets: number;
  dots: number;
  dotPct: number;
  boundaries?: number;
  fours?: number;
  sixes?: number;
  clutch?: number;
  form?: number;
}

export interface TeamBatterRow extends BatterRow {
  team: string;
  teamName: string;
}

export interface TeamBowlerRow extends BowlerRow {
  team: string;
  teamName: string;
}

export interface SeasonBatterRow extends BatterRow {
  season: string;
}

export interface SeasonBowlerRow extends BowlerRow {
  season: string;
}

export interface SeasonTeamBatterRow extends TeamBatterRow {
  season: string;
}

export interface SeasonTeamBowlerRow extends TeamBowlerRow {
  season: string;
}

export interface PlayerCareerStats {
  batters: BatterRow[];
  bowlers: BowlerRow[];
}

export interface PlayerTeamStats {
  batters: TeamBatterRow[];
  bowlers: TeamBowlerRow[];
}

export interface PlayerSeasonStats {
  batters: SeasonBatterRow[];
  bowlers: SeasonBowlerRow[];
}

export interface PlayerTeamSeasonStats {
  batters: SeasonTeamBatterRow[];
  bowlers: SeasonTeamBowlerRow[];
}

export interface CurrentSquadRow {
  season: string;
  playerName: string;
  currentTeam: string;
}

export interface TopBatters {
  runs: BatterRow[];
  sr: BatterRow[];
  avg: BatterRow[];
  sixes: BatterRow[];
  fours: BatterRow[];
  hundreds: BatterRow[];
}

export interface TopBowlers {
  wickets: BowlerRow[];
  econ: BowlerRow[];
  avg: BowlerRow[];
  death: BowlerRow[];
}

export interface SeasonTops {
  [season: string]: { topBatters: BatterRow[]; topBowlers: BowlerRow[] };
}

export interface MatchSummary {
  id: string;
  season: string;
  date: string;
  venue: string;
  team1: string;
  team2: string;
  winner?: string;
  margin?: string;
  team1Score?: string;
  team2Score?: string;
  mom?: string;
}

export type RunDistribution = Record<string, number>;

export interface PlayerBio {
  playerId: string;
  playerName: string;
  fullName: string;
  batStyle: string;
  bowlStyle: string;
  fieldPos: string;
  image: string;
  birthDate: string;
  birthPlace: string;
  age: number;
  country: string;
  role: string;
  iplDebut: string;
  intDebut: string;
  bio: string;
  team?: string;
  currentTeam?: string;
}

/** One player's place in a franchise's squad for a single season. */
export interface SquadPlayer {
  name: string;
  /** Cricsheet-style name, present only when the player appears in match data. */
  cricsheetName: string | null;
  country: string | null;
  role: string | null;
  /** How the player joined: retained, bought at auction, or unknown. */
  acquisition: "retained" | "auction" | null;
  priceLakh: number | null;
  priceUsd: number | null;
  /** Pre-formatted fee ("₹18.00 Cr" / "$675K"); null when no fee is recorded. */
  priceDisplay: string | null;
  /** True when the player actually took the field for this team that season. */
  played: boolean;
}

/** season -> franchise -> squad list. */
export type SquadsBySeason = Record<string, Record<string, SquadPlayer[]>>;

/** Ground-level analyst aggregates. */
export interface VenueAnalytics {
  venue: string;
  seasonRange: { from: number | null; to: number | null };
  timeOfDay: "all" | "evening" | "afternoon";
  matches: number;
  seasons: number;
  innings: { firstAvg: number; firstWkts: number; secondAvg: number; secondWkts: number };
  phases: PhaseSplit[];
  surface: Array<{
    kind: string; balls: number; wickets: number;
    economy: number; average: number; strikeRate: number; dotPct: number;
  }>;
  /** Second-innings scoring shift by start time — the closest proxy to dew. */
  dew: {
    evening: { first: number; second: number; matches: number };
    afternoon: { first: number; second: number; matches: number };
    eveningSwing: number;
    afternoonSwing: number;
  };
  topBatters: Array<{ player: string; runs: number; balls: number; matches: number; strikeRate: number }>;
  topBowlers: Array<{ player: string; wickets: number; matches: number; economy: number; average: number }>;
  /** Mean first-innings total at the end of each over. */
  parByOver: Array<{ over: number; par: number }>;
}

/** A captain's career record, as published one row per captain. */
export interface CaptainRecord {
  player: string;
  country: string | null;
  firstSeason: number | null;
  lastSeason: number | null;
  matches: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  winPct?: number;
  titles: number;
  /** Franchise codes led, e.g. ["CSK", "RPS"]. */
  teams: string[];
  /** False when they led more than one club, so totals cannot be split. */
  singleTeam: boolean;
}

export interface CaptainsData {
  captains: CaptainRecord[];
  byFranchise: Record<string, Array<{
    player: string; country: string | null;
    firstSeason: number | null; lastSeason: number | null;
    matches: number; won: number; winPct: number; titles: number;
    exact: boolean; alsoLed: string[];
  }>>;
}

/** Batting or bowling output for one phase of the innings. */
export interface PhaseSplit {
  phase: string;
  balls: number;
  runs: number;
  runRate: number;
  boundaryPct: number;
  dotPct: number;
  wickets: number;
}

/** Franchise analyst dashboard payload. */
export interface TeamAnalytics {
  team: string;
  seasonRange: { from: number | null; to: number | null };
  record: { played: number; wins: number; losses: number; noResult: number; winPct: number };
  toss: {
    tossWon: number; tossWonWinPct: number;
    tossLost: number; tossLostWinPct: number;
    choseBat: number; choseField: number;
  };
  battingOrder: { batFirst: number; batFirstWinPct: number; chased: number; chasedWinPct: number };
  battingPhases: PhaseSplit[];
  bowlingPhases: PhaseSplit[];
  bowlerSplit: Array<{ kind: string; balls: number; wickets: number; economy: number; dotPct: number }>;
  homeAway: { homePlayed: number; homeWinPct: number; awayPlayed: number; awayWinPct: number };
  /** Start times come from Wikipedia; fixtures without one are counted separately. */
  dayNight: {
    nightPlayed: number; nightWinPct: number;
    dayPlayed: number; dayWinPct: number;
    unknownStartTime: number;
  };
  venues: Array<{ venue: string; played: number; wins: number; winPct: number }>;
  captains: Array<{
    player: string;
    country: string | null;
    firstSeason: number | null;
    lastSeason: number | null;
    matches: number;
    won: number;
    winPct: number;
    titles: number;
    /** False when the totals span more than one club and cannot be split. */
    exact: boolean;
    alsoLed: string[];
  }>;
  headToHead: Array<{ opponent: string; played: number; wins: number; losses: number; winPct: number }>;
  collapses: { inningsBatted: number; collapseInnings: number; collapsePct: number };
  /** Dimensions this dataset cannot support, surfaced so the UI can say so. */
  notSupported: Array<{ feature: string; reason: string }>;
}

/** One franchise's final league-stage record for a season. */
export interface PointsRow {
  position: number;
  team: string;
  teamCode: string;
  played: number;
  wins: number;
  losses: number;
  noResult: number;
  points: number;
  /** Net run rate; null only if the source recorded neither NRR nor run totals. */
  nrr: number | null;
  qualified: boolean;
  /** Raw Wikipedia qualification marker (Q / E / C ...). */
  result: string | null;
}

/** season -> final standings, ordered by finishing position. */
export type PointsTables = Record<string, PointsRow[]>;

/** One season's auction/retention record for a single player. */
export interface AuctionRecord {
  season: number;
  player: string;
  team: string | null;
  teamCanonical: string | null;
  country: string | null;
  role: string | null;
  soldPrice: number | null;
  soldUnit: string | null;
  soldLakh: number | null;
  soldUsd: number | null;
  basePrice: number | null;
  baseLakh: number | null;
  baseUsd: number | null;
}

const dataUrl = (file: string): string => {
  const name = file.endsWith(".json") ? file.slice(0, -5) : file;
  return `/api/ipl/${name}`;
};

const fetchJson = async <T>(file: string): Promise<T> => {
  const cleanFile = file.endsWith(".json") ? file : `${file}.json`;
  const apiEndpoint = `${import.meta.env.BASE_URL}api/ipl/${cleanFile.replace(/\.json$/, "")}`;
  try {
    const res = await fetch(apiEndpoint);
    if (res.ok) {
      const data = await res.json();
      if (data !== null && data !== undefined) {
        return data as T;
      }
    }
  } catch {
    // API server or proxy unreachable, seamlessly try static fallback
  }

  // Fallback to static JSON asset in public/data
  const staticEndpoint = `${import.meta.env.BASE_URL}data/${cleanFile}`;
  const staticRes = await fetch(staticEndpoint);
  if (!staticRes.ok) throw new Error(`Failed to load ${file}: ${staticRes.status}`);
  return (await staticRes.json()) as T;
};

const STALE = 0; // always fetch fresh — data is updated by recalculation scripts

export const useOverview = (): UseQueryResult<Overview> =>
  useQuery({ queryKey: ["agg", "overview"], queryFn: () => fetchJson<Overview>("overview.json"), staleTime: STALE });

export const useSeasons = (): UseQueryResult<SeasonRow[]> =>
  useQuery({ queryKey: ["agg", "seasons"], queryFn: () => fetchJson<SeasonRow[]>("seasons.json"), staleTime: STALE });

export const useTeams = (): UseQueryResult<TeamRow[]> =>
  useQuery({ queryKey: ["agg", "teams"], queryFn: () => fetchJson<TeamRow[]>("teams.json"), staleTime: STALE });

export const useVenues = (): UseQueryResult<VenueRow[]> =>
  useQuery({ queryKey: ["agg", "venues"], queryFn: () => fetchJson<VenueRow[]>("venues.json"), staleTime: STALE });

export const useTopBatters = (): UseQueryResult<TopBatters> =>
  useQuery({ queryKey: ["agg", "top-batters"], queryFn: () => fetchJson<TopBatters>("top-batters.json"), staleTime: STALE });

export const useTopBowlers = (): UseQueryResult<TopBowlers> =>
  useQuery({ queryKey: ["agg", "top-bowlers"], queryFn: () => fetchJson<TopBowlers>("top-bowlers.json"), staleTime: STALE });

export const useSeasonTops = (): UseQueryResult<SeasonTops> =>
  useQuery({ queryKey: ["agg", "season-tops"], queryFn: () => fetchJson<SeasonTops>("season-tops.json"), staleTime: STALE });

export const useMatches = (): UseQueryResult<MatchSummary[]> =>
  useQuery({ queryKey: ["agg", "matches"], queryFn: () => fetchJson<MatchSummary[]>("matches.json"), staleTime: STALE });

export const useCurrentSquads = (): UseQueryResult<CurrentSquadRow[]> =>
  useQuery({ queryKey: ["agg", "current-squads"], queryFn: () => fetchJson<CurrentSquadRow[]>("current-squads.json"), staleTime: STALE });

/**
 * Player bios, served as a static asset rather than through /api/ipl.
 * The query key matches the inline copies in player.tsx and stats.tsx on
 * purpose, so all three share a single cache entry and one network request.
 */
export const usePlayerBios = (): UseQueryResult<Record<string, PlayerBio>> =>
  useQuery({
    queryKey: ["player-bios"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/player-bio.json`);
      if (!res.ok) throw new Error("Failed to load player bios");
      return (await res.json()) as Record<string, PlayerBio>;
    },
    staleTime: STALE,
  });

export const usePlayerLatestTeams = (): UseQueryResult<Record<string, string>> =>
  useQuery({
    queryKey: ["player-latest-teams"],
    queryFn: async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/player-latest-teams.json`);
        if (!res.ok) return {};
        return (await res.json()) as Record<string, string>;
      } catch {
        return {};
      }
    },
    staleTime: STALE,
  });

/** URL-safe slug for a player name, matching player profile routes. */
export const playerSlug = (name?: string | null): string =>
  (name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Hook returning a resolver function that maps any player name variant
 * (cricsheet name, full name, or display name) to the LAST team the player played for.
 */
export const usePlayerLatestTeamResolver = (): ((playerName?: string | null) => string | null) => {
  const latestTeams = usePlayerLatestTeams();
  const bios = usePlayerBios();
  const squads = useSquadsBySeason();

  return useMemo(() => {
    const lookup = new Map<string, string>();
    const lt = latestTeams.data || {};
    for (const [k, v] of Object.entries(lt)) {
      if (k && v) lookup.set(k.toLowerCase().trim(), v);
    }
    for (const season of Object.values(squads.data || {})) {
      for (const teamPlayers of Object.values(season)) {
        for (const p of teamPlayers) {
          if (p.cricsheetName && p.name) {
            const team = lookup.get(p.cricsheetName.toLowerCase().trim());
            if (team) {
              lookup.set(p.name.toLowerCase().trim(), team);
            }
          }
        }
      }
    }
    for (const bio of Object.values(bios.data || {})) {
      const team =
        lookup.get(bio.playerName?.toLowerCase().trim()) ||
        lookup.get(bio.fullName?.toLowerCase().trim()) ||
        bio.currentTeam ||
        bio.team;
      if (team) {
        if (bio.playerName) lookup.set(bio.playerName.toLowerCase().trim(), team);
        if (bio.fullName) lookup.set(bio.fullName.toLowerCase().trim(), team);
      }
    }

    return (playerName?: string | null): string | null => {
      if (!playerName) return null;
      const clean = playerName.toLowerCase().trim();
      if (lookup.has(clean)) return lookup.get(clean)!;
      const firstPart = clean.split("&")[0].trim();
      if (lookup.has(firstPart)) return lookup.get(firstPart)!;
      return null;
    };
  }, [latestTeams.data, bios.data, squads.data]);
};

export const usePlayerTeamsMap = () => {
  const teamStats = usePlayerTeamStats();
  const squadsBySeason = useSquadsBySeason();
  const latestTeams = usePlayerLatestTeams();

  return useMemo(() => {
    const map = new Map<string, Set<string>>();

    const add = (player: string, team: string) => {
      if (!player || !team) return;
      const key = player.toLowerCase().trim();
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(team);
      const short = teamShort(team);
      if (short) map.get(key)!.add(short);
    };

    if (latestTeams.data) {
      for (const [p, t] of Object.entries(latestTeams.data)) {
        add(p, t as string);
      }
    }

    if (teamStats.data) {
      for (const b of teamStats.data.batters || []) add(b.player, b.team);
      for (const b of teamStats.data.bowlers || []) add(b.player, b.team);
    }

    if (squadsBySeason.data) {
      for (const seasonObj of Object.values(squadsBySeason.data)) {
        for (const [teamName, players] of Object.entries(seasonObj as Record<string, any[]>)) {
          for (const p of players) {
            add(p.name, teamName);
            if (p.cricsheetName) add(p.cricsheetName, teamName);
          }
        }
      }
    }

    return map;
  }, [teamStats.data, squadsBySeason.data, latestTeams.data]);
};

export const useSquadsBySeason = (): UseQueryResult<SquadsBySeason> =>
  useQuery({ queryKey: ["agg", "squads-by-season"], queryFn: () => fetchJson<SquadsBySeason>("squads-by-season.json"), staleTime: STALE });

/**
 * Maps scorecard names onto the readable names people actually use
 * ("SA Yadav" -> "Suryakumar Yadav"), so lists and profile cards agree.
 *
 * Built from squads-by-season.json, where each entry already pairs a
 * Wikipedia name with the scorecard name it was safely resolved to.
 */
export const usePlayerDisplayNames = (): Map<string, string> => {
  const squads = useSquadsBySeason();
  return useMemo(() => buildPlayerDisplayNames(squads.data), [squads.data]);
};

/** Scorecard name → the name people use, from the squad lists (usePlayerDisplayNames). */
export const buildPlayerDisplayNames = (
  squadsData: Record<string, Record<string, { name?: string; cricsheetName?: string | null }[]>> | undefined,
): Map<string, string> => {
  // Count every spelling a player is listed under, then keep the most common.
  // Taking the first spelling that merely DIFFERED from the scorecard name
  // let a one-off variant win: Ankit Sharma is listed as "Ankit Nagendra
  // Sharma" in a single season and as "Ankit Sharma" in six others.
  const counts = new Map<string, Map<string, number>>();
  for (const teams of Object.values(squadsData ?? {})) {
    for (const players of Object.values(teams)) {
      for (const p of players) {
        if (!p.cricsheetName || !p.name) continue;
        let inner = counts.get(p.cricsheetName);
        if (!inner) { inner = new Map(); counts.set(p.cricsheetName, inner); }
        inner.set(p.name, (inner.get(p.name) ?? 0) + 1);
      }
    }
  }

  /** "Shikhar" reads as a name; "S", "SK" and "AB" are initials. */
  const isSpelledOut = (name: string) => {
    const first = name.trim().split(/\s+/)[0] ?? "";
    return first.length >= 3 && /[aeiou]/i.test(first);
  };

  const map = new Map<string, string>();
  for (const [cricsheet, spellings] of counts) {
    const total = [...spellings.values()].reduce((a, b) => a + b, 0);
    const pick = (entries: [string, number][]) =>
      entries.sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];

    const spelledOut = pick([...spellings].filter(([s]) => isSpelledOut(s)));
    const overall = pick([...spellings]);

    // Prefer the spelled-out name, since that is how people refer to players.
    // The exception is someone the sources overwhelmingly abbreviate — MS
    // Dhoni, AB de Villiers, KL Rahul are known by their initials, and
    // "Mahendra Singh Dhoni" would read as a mistake.
    let best = overall?.[0] ?? cricsheet;
    if (spelledOut && spelledOut[1] / total > 0.2) best = spelledOut[0];

    if (best && best !== cricsheet) map.set(cricsheet, best);
  }
  return map;
};

export const COMMON_PLAYER_NAME_MAP: Record<string, string> = {
  "RG Sharma": "Rohit Sharma",
  "V Kohli": "Virat Kohli",
  "MS Dhoni": "MS Dhoni",
  "AB de Villiers": "AB de Villiers",
  "SA Yadav": "Suryakumar Yadav",
  "KD Karthik": "Dinesh Karthik",
  "CH Gayle": "Chris Gayle",
  "DJ Bravo": "Dwayne Bravo",
  "SP Narine": "Sunil Narine",
  "Y Chahal": "Yuzvendra Chahal",
  "JJ Bumrah": "Jasprit Bumrah",
  "KA Pollard": "Kieron Pollard",
  "KL Rahul": "KL Rahul",
  "DA Warner": "David Warner",
  "SV Samson": "Sanju Samson",
  "RA Jadeja": "Ravindra Jadeja",
  "HH Pandya": "Hardik Pandya",
  "RR Pant": "Rishabh Pant",
  "SS Iyer": "Shreyas Iyer",
  "S Dhawan": "Shikhar Dhawan",
  "PA Patel": "Parthiv Patel",
  "AM Rahane": "Ajinkya Rahane",
  "MK Pandey": "Manish Pandey",
  "RV Uthappa": "Robin Uthappa",
  "SR Watson": "Shane Watson",
  "AT Rayudu": "Ambati Rayudu",
  "WP Saha": "Wriddhiman Saha",
  "G Gambhir": "Gautam Gambhir",
  "SK Raina": "Suresh Raina",
  "B Kumar": "Bhuvneshwar Kumar",
  "R Ashwin": "Ravichandran Ashwin",
  "A Mishra": "Amit Mishra",
  "PP Chawla": "Piyush Chawla",
  "SL Malinga": "Lasith Malinga",
  "AR Patel": "Axar Patel",
  "UT Yadav": "Umesh Yadav",
  "MM Sharma": "Mohit Sharma",
  "Z Khan": "Zaheer Khan",
  "JH Kallis": "Jacques Kallis",
  "IK Pathan": "Irfan Pathan",
  "JC Buttler": "Jos Buttler",
  "N Pooran": "Nicholas Pooran",
  "SO Hetmyer": "Shimron Hetmyer",
  "LS Livingstone": "Liam Livingstone",
  "Q de Kock": "Quinton de Kock",
  "SM Curran": "Sam Curran",
  "TA Boult": "Trent Boult",
  "K Rabada": "Kagiso Rabada",
  "MA Starc": "Mitchell Starc",
  "PJ Cummins": "Pat Cummins",
};

/** Readable name for display, falling back to common map or scorecard name. */
export const displayPlayerName = (
  name: string,
  map?: Map<string, string> | null,
): string => map?.get(name) ?? COMMON_PLAYER_NAME_MAP[name] ?? name;

/**
 * Franchise analyst aggregates for a season range. Unlike the other hooks here
 * this one is computed per request from the ball-by-ball tables, so the season
 * bounds are part of the query key.
 */
export const useTeamAnalytics = (
  team: string | null | undefined,
  from?: number | null,
  to?: number | null,
): UseQueryResult<TeamAnalytics> =>
  useQuery({
    queryKey: ["agg", "team-analytics", team, from ?? null, to ?? null],
    enabled: !!team,
    staleTime: STALE,
    queryFn: async () => {
      const params = new URLSearchParams({ team: team! });
      if (from != null) params.set("from", String(from));
      if (to != null) params.set("to", String(to));
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/team-analytics?${params}`);
      if (!res.ok) throw new Error(`Failed to load team analytics: ${res.status}`);
      return (await res.json()) as TeamAnalytics;
    },
  });

/** Ground analytics for a season range and time-of-day slot. */
export const useVenueAnalytics = (
  venue: string | null | undefined,
  opts?: { from?: number | null; to?: number | null; timeOfDay?: "all" | "evening" | "afternoon" },
): UseQueryResult<VenueAnalytics> =>
  useQuery({
    queryKey: ["agg", "venue-analytics", venue, opts?.from ?? null, opts?.to ?? null, opts?.timeOfDay ?? "all"],
    enabled: !!venue,
    staleTime: STALE,
    queryFn: async () => {
      const params = new URLSearchParams({ venue: venue! });
      if (opts?.from != null) params.set("from", String(opts.from));
      if (opts?.to != null) params.set("to", String(opts.to));
      if (opts?.timeOfDay && opts.timeOfDay !== "all") params.set("timeOfDay", opts.timeOfDay);
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/venue-analytics?${params}`);
      if (!res.ok) throw new Error(`Failed to load venue analytics: ${res.status}`);
      return (await res.json()) as VenueAnalytics;
    },
  });

/* ── Match scorecard and ball-by-ball commentary ─────────────────────────── */

export interface ScorecardBatting {
  name: string; dismissal: string; runs: number; balls: number;
  fours: number; sixes: number; sr: number; notOut: boolean; out: boolean;
}
export interface ScorecardBowling {
  name: string; overs: string; maidens: number; runs: number; wickets: number;
  econ: number; dots: number; wides: number; noballs: number;
}
export interface ScorecardInnings {
  team: string; runs: number; wickets: number; overs: string; runRate: number;
  extras: { total: number; wides: number; noballs: number; byes: number; legbyes: number; penalty: number };
  batting: ScorecardBatting[];
  bowling: ScorecardBowling[];
  fallOfWickets: { wicket: number; name: string; score: string; over: string }[];
  didNotBat: string[];
  superOver: boolean;
}
export interface MatchScorecard {
  matchId: string; season: string | null; date: string | null;
  venue: string | null; city: string | null; teams: string[];
  event: { name: string | null; matchNumber: number | null; stage: string | null };
  toss: { winner: string; decision: string } | null;
  result: { winner: string | null; by: string | null; method: string | null; result?: string | null };
  playerOfMatch: string[];
  officials: { umpires: string[]; tvUmpires: string[]; matchReferees: string[] };
  squads: { team: string; players: string[] }[];
  innings: ScorecardInnings[];
}

export interface CommentaryBall {
  innings: number; over: string; batter: string | null; bowler: string | null;
  runs: number; text: string; isWicket: boolean; isBoundary: boolean;
  dismissal: string | null;
  length: string | null; line: string | null; variation: string | null;
  shot: string | null; zone: string | null; speedKph: number | null;
}
export interface MatchCommentary {
  matchId: string;
  innings: { innings: number; team: string | null; balls: CommentaryBall[] }[];
}

/** Real scorecard for an archived match, computed from the delivery record. */
export const useMatchScorecard = (matchId: string | number | null | undefined): UseQueryResult<MatchScorecard> =>
  useQuery({
    queryKey: ["agg", "match-scorecard", String(matchId ?? "")],
    enabled: matchId != null && matchId !== "",
    staleTime: STALE,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/match/${matchId}/scorecard`);
      if (!res.ok) throw new Error(`Failed to load scorecard: ${res.status}`);
      return (await res.json()) as MatchScorecard;
    },
  });

/** Ball-by-ball commentary. Empty innings list means none was recorded. */
export const useMatchCommentary = (matchId: string | number | null | undefined): UseQueryResult<MatchCommentary> =>
  useQuery({
    queryKey: ["agg", "match-commentary", String(matchId ?? "")],
    enabled: matchId != null && matchId !== "",
    staleTime: STALE,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/match/${matchId}/commentary`);
      if (!res.ok) throw new Error(`Failed to load commentary: ${res.status}`);
      return (await res.json()) as MatchCommentary;
    },
  });

/** Live news wire. `statuses` reports each feed so a dead source stays visible. */
export interface NewsItem {
  id: string; title: string; summary: string; url: string;
  source: string; sourceId: string; section: string;
  publisher: string | null; publishedAt: string | null;
  image: string | null; isIpl: boolean;
}
export interface NewsFeed {
  items: NewsItem[];
  statuses: { id: string; name: string; section: string; ok: boolean; count: number; error?: string }[];
  fetchedAt: string;
}

export const useNews = (): UseQueryResult<NewsFeed> =>
  useQuery({
    queryKey: ["agg", "news"],
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/news`);
      if (!res.ok) throw new Error(`Failed to load news: ${res.status}`);
      return (await res.json()) as NewsFeed;
    },
  });

/** Public insight feed: cards computed from the ball record, plus the article registry. */
export interface InsightFeed {
  insights: {
    id: string; kind: "computed" | "sourced"; category: string; headline: string;
    stat: string; statLabel: string; body: string; sample: string;
    compare?: { stat: string; statLabel: string };
    testsSlug?: string; source?: string;
  }[];
  articles: {
    slug: string; title: string; deck: string; author: string; platform: string;
    url: string; own: boolean; tags: string[]; published?: string;
  }[];
}

export const useInsightFeed = (): UseQueryResult<InsightFeed> =>
  useQuery({
    queryKey: ["agg", "insight-feed"],
    staleTime: STALE,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/insights`);
      if (!res.ok) throw new Error(`Failed to load insights: ${res.status}`);
      return (await res.json()) as InsightFeed;
    },
  });

/* ── Content Hub — social posts, AI articles, business articles ─────────── */

export type SocialPlatform = "LinkedIn" | "X" | "Medium" | "Substack";

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  title: string;
  blurb: string;
  url: string;
  published: string;
  tags: string[];
  isLongform?: boolean;
  readMins?: number;
}

export interface AiArticleRef {
  label: string;
  url: string;
  use: string;
  category: "Ball Data" | "Media Rights" | "Brand Value" | "Research" | "Governance";
}

export interface AiArticle {
  id: string;
  title: string;
  subtitle: string;
  published: string;
  tags: string[];
  body: string;
  references: AiArticleRef[];
}

export type BusinessTag = "Media Rights" | "Brand Value" | "Franchise Economics" | "Sponsorship" | "Streaming" | "Governance" | "Global Expansion";

export interface BusinessArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  url: string;
  published?: string;
  tags: BusinessTag[];
}

export interface ContentHub {
  socialPosts: SocialPost[];
  socialByPlatform: Record<SocialPlatform, SocialPost[]>;
  aiArticles: AiArticle[];
  businessArticles: BusinessArticle[];
}

export const useContentHub = (): UseQueryResult<ContentHub> =>
  useQuery({
    queryKey: ["content", "hub"],
    staleTime: 5 * 60 * 1000, // 5 minutes — content changes less often than match data
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/content/hub`);
      if (!res.ok) throw new Error(`Failed to load content hub: ${res.status}`);
      return (res.json()) as Promise<ContentHub>;
    },
  });

export const useCaptains = (): UseQueryResult<CaptainsData> =>
  useQuery({ queryKey: ["agg", "captains"], queryFn: () => fetchJson<CaptainsData>("captains.json"), staleTime: STALE });

export const usePointsTables = (): UseQueryResult<PointsTables> =>
  useQuery({ queryKey: ["agg", "points-tables"], queryFn: () => fetchJson<PointsTables>("points-tables.json"), staleTime: STALE });

export const usePlayerAuctions = (): UseQueryResult<AuctionRecord[]> =>
  useQuery({ queryKey: ["agg", "player-auctions"], queryFn: () => fetchJson<AuctionRecord[]>("player-auctions.json"), staleTime: STALE });

export const usePlayerCareerStats = (): UseQueryResult<PlayerCareerStats> =>
  useQuery({ queryKey: ["agg", "player-career-stats"], queryFn: () => fetchJson<PlayerCareerStats>("player-career-stats.json"), staleTime: STALE });

export const usePlayerTeamStats = (): UseQueryResult<PlayerTeamStats> =>
  useQuery({ queryKey: ["agg", "player-team-stats"], queryFn: () => fetchJson<PlayerTeamStats>("player-team-stats.json"), staleTime: STALE });

export const usePlayerSeasonStats = (): UseQueryResult<PlayerSeasonStats> =>
  useQuery({ queryKey: ["agg", "player-season-stats"], queryFn: () => fetchJson<PlayerSeasonStats>("player-season-stats.json"), staleTime: STALE });

export const usePlayerTeamSeasonStats = (): UseQueryResult<PlayerTeamSeasonStats> =>
  useQuery({ queryKey: ["agg", "player-team-season-stats"], queryFn: () => fetchJson<PlayerTeamSeasonStats>("player-team-season-stats.json"), staleTime: STALE });

export const useRunDistribution = (): UseQueryResult<RunDistribution> =>
  useQuery({ queryKey: ["agg", "run-distribution"], queryFn: () => fetchJson<RunDistribution>("run-distribution.json"), staleTime: STALE });

export const usePlayerImages = (): UseQueryResult<Record<string, string>> =>
  useQuery({ queryKey: ["agg", "player-images"], queryFn: () => fetchJson<Record<string, string>>("player-images.json"), staleTime: STALE });

export const usePlayerPhotoRegistry = (): UseQueryResult<{ totalApproved: number; totalPending: number; photos: any[] }> =>
  useQuery({ queryKey: ["agg", "player-photo-registry"], queryFn: () => fetchJson<{ totalApproved: number; totalPending: number; photos: any[] }>("player-photo-registry.json"), staleTime: STALE });

/**
 * Canonical venue name — collapses the many spellings one physical ground
 * appears under (city suffixes, renames, punctuation variants) onto a single
 * label, so "Maharashtra Cricket Association Stadium", "…Stadium, Pune" and
 * "Subrata Roy Sahara Stadium" all resolve to the same venue.
 *
 * Keep the rule ORDER and GROUPING in sync with the backend copy in
 * artifacts/api-server/src/services/stats-aggregator.ts (normalizeVenueName).
 * The label text may differ (this copy favours shorter display names), but
 * which raw strings collapse together must match, or the client-side counters
 * disagree with what the backend actually aggregated for the same selection.
 */
export const normalizeVenueName = (v: string): string => {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const name = raw.toLowerCase();
  if (name.includes("wankhede")) return "Wankhede Stadium";
  if (name.includes("eden garden")) return "Eden Gardens";
  if (name.includes("chidambaram") || name.includes("chepauk")) return "MA Chidambaram Stadium";
  if (name.includes("chinnaswamy")) return "M Chinnaswamy Stadium";
  if (name.includes("jaitley") || name.includes("feroz shah kotla")) return "Arun Jaitley Stadium";
  if (name.includes("rajiv gandhi")) return "Rajiv Gandhi Intl Stadium";
  if (name.includes("bindra") || name.includes("punjab cricket association") || name.includes("mohali")) return "IS Bindra Stadium";
  if (name.includes("maharashtra cricket association") || name.includes("subrata roy") || name.includes("mca")) return "MCA Stadium";
  if (name.includes("dy patil")) return "DY Patil Stadium";
  if (name.includes("narendra modi") || name.includes("motera") || name.includes("sardar patel")) return "Narendra Modi Stadium";
  if (name.includes("sawai")) return "Sawai Mansingh Stadium";
  if (name.includes("ekana")) return "Ekana Cricket Stadium";
  if (name.includes("brabourne")) return "Brabourne Stadium";
  if (name.includes("rajasekhara reddy") || name.includes("aca-vdca")) return "ACA-VDCA Cricket Stadium";
  if (name.includes("maharaja yadavindra")) return "Maharaja Yadavindra Singh Intl Cricket Stadium";
  if (name.includes("zayed")) return "Sheikh Zayed Stadium";
  if (name.includes("scg") || name.includes("sydney")) return "Sydney Cricket Ground";
  return raw.split(",")[0].trim();
};

/** URL-safe slug for a venue, always derived from its canonical name. */
export const venueSlug = (v: string): string =>
  normalizeVenueName(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every venue entry point uses the same dedicated profile and Feed context. */
export const venueHref = (venue?: string | null): string =>
  venue?.trim() ? `/venues/${venueSlug(venue)}` : "/feed/venues";
export const venueHubHref = (venue: string): string =>
  `/feed/venues?venue=${encodeURIComponent(venueSlug(venue))}`;

// Curated local headshots for a small hand-picked set of marquee players —
// kept as the highest-priority source since these are pre-verified good
// crops, but this list can never cover hundreds of players across 20
// seasons. Everyone else is resolved programmatically below.
// Keyed by EXACT player name (scorecard form and full form both listed), never
// by surname. An earlier version matched on bare surnames -- /sharma/ handed
// Rohit Sharma's face to all 17 Sharmas in the database, /mishra/ gave Amit
// Mishra's to every Mishra, and Taruwar Kohli wore Virat's. A curated crop is
// only ever correct for the one player it depicts.
const CURATED_LOCAL_IMAGES: Record<string, string> = {
  "sl malinga": "/lasith malinga.jpg",
  "lasith malinga": "/lasith malinga.jpg",
  "yb chahal": "/y chahal.jpg",
  "ys chahal": "/y chahal.jpg",
  "yuzvendra chahal": "/y chahal.jpg",
  "v kohli": "/virat kohli.jpg",
  "virat kohli": "/virat kohli.jpg",
  "js bumrah": "/bumrah.jpg",
  "jasprit bumrah": "/bumrah.jpg",
  "ms dhoni": "/msd.jpg",
  "msd": "/msd.jpg",
  "mahendra singh dhoni": "/msd.jpg",
  "rg sharma": "/rohit sharma.jpg",
  "rohit sharma": "/rohit sharma.jpg",
  "abhishek sharma": "/abhisek sharma.jpg",
  "abhisek sharma": "/abhisek sharma.jpg",
  "b kumar": "/bhuvaneswar kumar.jpg",
  "bhuvneshwar kumar": "/bhuvaneswar kumar.jpg",
  "mayank yadav": "/mayank yadav.jpg",
  "sk raina": "/suresh raina.jpg",
  "suresh raina": "/suresh raina.jpg",
  "ab de villiers": "/ab devillers.jpg",
  "sv samson": "/sanju samson.jpg",
  "sanju samson": "/sanju samson.jpg",
  "ch gayle": "/c gayle.jpg",
  "chris gayle": "/c gayle.jpg",
  "da warner": "/d warner.jpg",
  "david warner": "/d warner.jpg",
  "dj bravo": "/dj bravo.jpg",
  "dwayne bravo": "/dj bravo.jpg",
  "kl rahul": "/kl rahul.jpg",
  "a mishra": "/a mishra.jpg",
  "amit mishra": "/a mishra.jpg",
  "am rahane": "/a rahane.jpg",
  "ajinkya rahane": "/a rahane.jpg",
  "pp chawla": "/p chawla.jpg",
  "piyush chawla": "/p chawla.jpg",
  "r ashwin": "/r ashwin.jpg",
  "ravichandran ashwin": "/r ashwin.jpg",
  "ra jadeja": "/r jadeja.jpg",
  "ravindra jadeja": "/r jadeja.jpg",
  "rashid khan": "/rashid khan.jpg",
  "sp narine": "/s narine.jpg",
  "sunil narine": "/s narine.jpg",
  "s dhawan": "/shikhar dhawan.jpg",
  "shikhar dhawan": "/shikhar dhawan.jpg",
};

/** Lowercased, punctuation-stripped key for exact name comparison. */
function curatedKey(name?: string | null): string {
  return (name || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------------- venue imagery ---------------- */

/**
 * Ground photographs, keyed by the canonical venue name that normalizeVenueName
 * produces — not by the file's own name, which follows the city in several
 * cases ("mullanpur stadium" is the Maharaja Yadavindra Singh ground, "capetown
 * stadium" is Newlands). Mapping on the canonical name keeps the pairing
 * explicit and survives the many spellings each ground appears under.
 *
 * Ten grounds have no photograph; those fall back to a generated gradient
 * rather than borrowing another stadium's picture.
 */
const VENUE_IMAGES: Record<string, string> = {
  "Wankhede Stadium": "wankhede stadium.webp",
  "Eden Gardens": "eden gardens stadium.webp",
  "Arun Jaitley Stadium": "arun jaitely stadium.webp",
  "M Chinnaswamy Stadium": "chinnaswamy stadium.webp",
  "MA Chidambaram Stadium": "ma chidambaram stadium.webp",
  // Keyed by the CANONICAL name normalizeVenueName produces, which shortens
  // "International" to "Intl" — keying these two by the API's full spelling
  // meant the lookup never matched and Hyderabad and Mullanpur showed no photo.
  "Rajiv Gandhi Intl Stadium": "rajiv gandhi hyderabad stadium.webp",
  "Sawai Mansingh Stadium": "sawai mansingh jaipur stadium.webp",
  "Narendra Modi Stadium": "narendra modi stadium.webp",
  "MCA Stadium": "pune stadium.webp",
  "Dubai International Cricket Stadium": "dubai stadium.webp",
  "DY Patil Stadium": "dy patil stadium.webp",
  "Sheikh Zayed Stadium": "abu dhabi stadium.webp",
  "Ekana Cricket Stadium": "lucknow stadium.webp",
  "Sharjah Cricket Stadium": "sharjah stadium.webp",
  "Himachal Pradesh Cricket Association Stadium": "hpca dharmashala stadium.webp",
  "ACA-VDCA Cricket Stadium": "vizag stadium.webp",
  "Maharaja Yadavindra Singh Intl Cricket Stadium": "mullanpur stadium.webp",
  "Barsapara Cricket Stadium": "baraspara guwhati stadium.webp",
  "New Wanderers Stadium": "johannesburg stadium.webp",
  "Shaheed Veer Narayan Singh International Stadium": "raipur stadium.webp",
  "Barabati Stadium": "cuttack stadium.webp",
  "JSCA International Stadium Complex": "ranchi stadium.webp",
  "Newlands": "capetown stadium.webp",
  "Nehru Stadium": "nehru stadium kochi.webp",
  "Green Park": "kanpur stadium.webp",
  "Vidarbha Cricket Association Stadium": "nagpur stadium.webp",
  "IS Bindra Stadium": "is bindra stadium.jpg",
  "Kingsmead": "durban stadium.webp",
  "SuperSport Park": "centurion stadium.webp",
  "Saurashtra Cricket Association Stadium": "rajkot stadium.jpg",
  "St George's Park": "st george park port elizabeth stadium.jpg",
  "Buffalo Park": "buffalo park east london stadium.jpg",
  "De Beers Diamond Oval": "diamond oval kimberley stadium.jpg",
  "OUTsurance Oval": "bloemfontein stadium.webp",
  "Brabourne Stadium": "brabourne stadium.jpg",
  "Holkar Cricket Stadium": "holkar indore stadium.jpg",
};

/**
 * Loose key so a lookup survives punctuation and the Intl/International
 * shortening: "Rajiv Gandhi Intl Stadium" and "Rajiv Gandhi International
 * Stadium" both reduce to the same thing.
 */
const venueKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\bintl\b/g, "international")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Built once so both the canonical and raw spellings resolve. */
const VENUE_IMAGE_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(VENUE_IMAGES).map(([name, file]) => [venueKey(name), file]),
);

/** Photograph URL for a ground, or null when none is held. */
export const venueImage = (venue?: string | null): string | null => {
  if (!venue) return null;
  // Try the canonical name first, then the string as given — a raw API name
  // that normalisation would rewrite still finds its picture.
  const file =
    VENUE_IMAGE_INDEX[venueKey(normalizeVenueName(venue))] ??
    VENUE_IMAGE_INDEX[venueKey(venue)];
  return file ? `${import.meta.env.BASE_URL}venue-images/${encodeURIComponent(file)}` : null;
};

/** Stable per-ground hue, so image-less venues still read as distinct. */
export const venueHue = (venue?: string | null): number => {
  let h = 0;
  const s = venue ?? "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

/* ---------------- player name resolution ---------------- */

/** Normalised form used for all name comparisons. */
export const normalizePlayerName = (name?: string | null): string =>
  (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "RG Sharma" and "Rohit Sharma" both key to "r|sharma". */
const initialSurnameKey = (name?: string | null): string | null => {
  const parts = normalizePlayerName(name).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0][0]}|${parts[parts.length - 1]}`;
};

/**
 * Selects the rows belonging to one player, given the name variants we know
 * them by (scorecard name, full name).
 *
 * Exact matches win outright. The initial+surname heuristic is only consulted
 * when nothing matched exactly, and only accepted when it resolves to a single
 * distinct player — otherwise it is discarded.
 *
 * This guard is the whole point: "RG Sharma" and "R Sharma" share the key
 * "r|sharma" but are Rohit and Rahul Sharma, so an unguarded heuristic merged
 * their careers and plotted two different scores for the same season. The same
 * collision made "M Shahrukh Khan" register as Mohsin Khan's IPL debut.
 */
export function selectPlayerRows<T extends { player: string }>(
  rows: T[] | undefined | null,
  ...nameVariants: Array<string | null | undefined>
): T[] {
  if (!rows || rows.length === 0) return [];
  const wanted = nameVariants.map(normalizePlayerName).filter(Boolean);
  if (wanted.length === 0) return [];

  const exact = rows.filter(r => wanted.includes(normalizePlayerName(r.player)));
  if (exact.length > 0) return exact;

  const keys = new Set(nameVariants.map(initialSurnameKey).filter(Boolean) as string[]);
  if (keys.size === 0) return [];
  const near = rows.filter(r => {
    const k = initialSurnameKey(r.player);
    return k != null && keys.has(k);
  });
  const distinct = new Set(near.map(r => normalizePlayerName(r.player)));
  return distinct.size === 1 ? near : [];
}

/** True when two names refer to the same player under the safe rules above. */
export function isSamePlayerName(a?: string | null, b?: string | null): boolean {
  const na = normalizePlayerName(a);
  const nb = normalizePlayerName(b);
  return !!na && na === nb;
}

/** Deterministic, no-network placeholder — initials on a themed background. */
export function playerInitialsAvatarUrl(playerName: string): string {
  const name = (playerName || "IPL Player").trim();
  const params = new URLSearchParams({
    name,
    background: "0f172a",
    color: "38bdf8",
    bold: "true",
    size: "128",
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
}

/**
 * player-bio.json's own `image` field is populated for ~17% of players from
 * two real sources: an S3 bucket of direct PNGs (usable as-is) and
 * ESPNcricinfo profile *page* URLs (not images — espncricinfo blocks
 * hotlinking/scraping their CDN, confirmed by testing, so those can't be
 * turned into a usable <img src>). Only the direct-image kind is usable.
 */
function usableBioImage(bioImage?: string | null): string | null {
  if (!bioImage) return null;
  if (bioImage.includes("espncricinfo.com/cricketers/")) return null; // profile page, not an image
  if (/^https?:\/\//.test(bioImage)) return bioImage;
  return null;
}

/**
 * Guesses at the "common name" IPL Stats' player-image bucket uses — it's
 * usually close to the scorecard name expanded to a full first+last name,
 * not the full legal name. These are *candidates* to attempt, not
 * guaranteed hits; callers must fall back on load failure.
 */
function s3ImageCandidates(playerName: string, fullName?: string | null): string[] {
  const base = "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/";
  const tried = new Set<string>();
  const urls: string[] = [];
  const add = (name?: string | null) => {
    const clean = (name || "").trim();
    if (!clean || tried.has(clean.toLowerCase())) return;
    tried.add(clean.toLowerCase());
    urls.push(`${base}${encodeURIComponent(clean)}.png`);
  };
  add(playerName);
  if (fullName) {
    const words = fullName.trim().split(/\s+/);
    if (words.length >= 2) add(`${words[0]} ${words[words.length - 1]}`); // first + last, drop middle names
  }
  return urls;
}

/**
 * Full ordered list of image URLs worth trying for a player, most reliable
 * first, ending in a placeholder that always renders. Callers that can
 * cascade through failures (e.g. an <img onError> chain) should try each in
 * order; callers that just need one value can take candidates[0].
 */
export function getPlayerImageCandidates(
  playerName: string,
  playerImages?: Record<string, string>,
  bio?: { image?: string; fullName?: string; playerName?: string } | null,
): string[] {
  const name = (playerName || "").trim();
  if (!name) return [playerInitialsAvatarUrl("IPL Player")];
  const candidates: string[] = [];

  const addUrl = (url?: string | null) => {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      candidates.push(`${base}${trimmed}`);
    } else {
      candidates.push(trimmed);
    }
  };

  const checkDict = (n?: string | null) => {
    if (!n || !playerImages) return;
    const clean = n.trim();
    if (playerImages[clean]) addUrl(playerImages[clean]);
    else {
      const exact = Object.keys(playerImages).find(k => k.toLowerCase() === clean.toLowerCase());
      if (exact) addUrl(playerImages[exact]);
    }
  };

  // 1. Curated dictionary & bio full name / player name lookup
  if (playerImages) {
    checkDict(name);
    if (bio?.fullName) checkDict(bio.fullName);
    if (bio?.playerName) checkDict(bio.playerName);
    if (COMMON_PLAYER_NAME_MAP[name]) checkDict(COMMON_PLAYER_NAME_MAP[name]);

    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0].charAt(0).toLowerCase();
      const lastName = parts[parts.length - 1].toLowerCase();
      const hits = Object.keys(playerImages).filter(k => {
        const kp = k.toLowerCase().split(/\s+/);
        return kp.length >= 2 && kp[0].charAt(0) === firstInitial && kp[kp.length - 1] === lastName;
      });
      for (const h of hits) {
        if (playerImages[h]) addUrl(playerImages[h]);
      }
    }
  }

  // 2. Small hand-picked marquee set
  const curated =
    CURATED_LOCAL_IMAGES[curatedKey(name)] ??
    CURATED_LOCAL_IMAGES[curatedKey(bio?.fullName)] ??
    CURATED_LOCAL_IMAGES[curatedKey(bio?.playerName)] ??
    (COMMON_PLAYER_NAME_MAP[name] ? CURATED_LOCAL_IMAGES[curatedKey(COMMON_PLAYER_NAME_MAP[name])] : undefined);
  if (curated) addUrl(curated);

  // 3. Real image already recorded in player-bio.json
  const bioImg = usableBioImage(bio?.image);
  if (bioImg) addUrl(bioImg);

  // 4. Programmatic CDN guesses
  candidates.push(...s3ImageCandidates(name, bio?.fullName));
  if (bio?.playerName && bio.playerName !== name) {
    candidates.push(...s3ImageCandidates(bio.playerName, bio?.fullName));
  }
  if (COMMON_PLAYER_NAME_MAP[name]) {
    candidates.push(...s3ImageCandidates(COMMON_PLAYER_NAME_MAP[name]));
  }

  // 5. Guaranteed-to-render placeholder — always last
  candidates.push(playerInitialsAvatarUrl(name));

  return Array.from(new Set(candidates));
}

export function resolvePlayerImage(
  playerName: string,
  playerImages?: Record<string, string>,
  bio?: { image?: string; fullName?: string } | null,
): string {
  return getPlayerImageCandidates(playerName, playerImages, bio)[0];
}


// Team colours for charts, badges and team identity. Sourced from the shared
// franchise palette (lib/team-palette.ts), which the Dugout also uses.
export const TEAM_COLORS: Record<string, string> = TEAM_ACCENTS;

export const teamColor = (team: string): string => TEAM_COLORS[team] ?? FALLBACK_ACCENT;

export const teamShort = (team?: string): string => {
  if (!team) return "IND";
  const map: Record<string, string> = {
    "Mumbai Indians": "MI",
    "Chennai Super Kings": "CSK",
    "Royal Challengers Bengaluru": "RCB",
    "Royal Challengers Bangalore": "RCB",
    "Kolkata Knight Riders": "KKR",
    "Delhi Capitals": "DC",
    "Delhi Daredevils": "DC",
    "Punjab Kings": "PBKS",
    "Kings XI Punjab": "PBKS",
    "Rajasthan Royals": "RR",
    "Sunrisers Hyderabad": "SRH",
    // Deccan Chargers was a separate franchise that was sold and dissolved in
    // 2012 — Sunrisers is a different team, not a rename — so it keeps its own
    // badge rather than being labelled SRH in historical tables.
    "Deccan Chargers": "DEC",
    "Gujarat Titans": "GT",
    "Lucknow Super Giants": "LSG",
    "Pune Warriors": "PW",
    "Rising Pune Supergiant": "RPS",
    "Gujarat Lions": "GL",
    "Kochi Tuskers Kerala": "KTK",
  };
  if (Object.values(map).includes(team)) return team;
  return map[team] ?? team.split(" ").map((w) => w[0]).join("").slice(0, 4);
};

export const TEAM_ALIAS_MAP: Record<string, string[]> = {
  "Sunrisers Hyderabad": ["Sunrisers Hyderabad", "Deccan Chargers", "SRH", "DCh"],
  "Deccan Chargers": ["Deccan Chargers", "Sunrisers Hyderabad", "DCh", "SRH"],
  "SRH": ["Sunrisers Hyderabad", "Deccan Chargers", "SRH", "DCh"],
  "DCh": ["Deccan Chargers", "Sunrisers Hyderabad", "DCh", "SRH"],
  "Delhi Capitals": ["Delhi Capitals", "Delhi Daredevils", "DC", "DD"],
  "Delhi Daredevils": ["Delhi Daredevils", "Delhi Capitals", "DD", "DC"],
  "DC": ["Delhi Capitals", "Delhi Daredevils", "DC", "DD"],
  "DD": ["Delhi Daredevils", "Delhi Capitals", "DD", "DC"],
  "Punjab Kings": ["Punjab Kings", "Kings XI Punjab", "PBKS", "KXIP"],
  "Kings XI Punjab": ["Kings XI Punjab", "Punjab Kings", "KXIP", "PBKS"],
  "PBKS": ["Punjab Kings", "Kings XI Punjab", "PBKS", "KXIP"],
  "KXIP": ["Kings XI Punjab", "Punjab Kings", "KXIP", "PBKS"],
  "Royal Challengers Bengaluru": ["Royal Challengers Bengaluru", "Royal Challengers Bangalore", "RCB"],
  "Royal Challengers Bangalore": ["Royal Challengers Bangalore", "Royal Challengers Bengaluru", "RCB"],
  "RCB": ["Royal Challengers Bengaluru", "Royal Challengers Bangalore", "RCB"],
};

export function isMatchingTeam(teamA?: string, teamB?: string): boolean {
  if (!teamA || !teamB) return false;
  if (teamA === "All" || teamB === "All" || teamA.startsWith("All") || teamB.startsWith("All")) return true;
  if (teamA.toLowerCase().trim() === teamB.toLowerCase().trim()) return true;
  const tA = teamShort(teamA);
  const tB = teamShort(teamB);
  if (tA === tB) return true;
  const aliasesA = TEAM_ALIAS_MAP[teamA] || [teamA, tA];
  const aliasesB = TEAM_ALIAS_MAP[teamB] || [teamB, tB];
  return aliasesA.some(a => aliasesB.some(b => a.toLowerCase() === b.toLowerCase()));
}
