/**
 * Typed React Query hooks for the pre-aggregated Cricsheet IPL data
 * served as static JSON from /data/*.json.
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

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
}

export interface BowlerRow {
  player: string;
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
  ppEcon: number;
  middleEcon: number;
  deathEcon: number;
  ppWickets: number;
  middleWickets: number;
  deathWickets: number;
  dotPct: number;
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

const dataUrl = (file: string): string => `${import.meta.env.BASE_URL}data/${file}`;

const fetchJson = async <T>(file: string): Promise<T> => {
  const res = await fetch(dataUrl(file));
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
  return (await res.json()) as T;
};

const STALE = 1000 * 60 * 60; // 1 hour — data is static

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

export const useRunDistribution = (): UseQueryResult<RunDistribution> =>
  useQuery({ queryKey: ["agg", "run-distribution"], queryFn: () => fetchJson<RunDistribution>("run-distribution.json"), staleTime: STALE });

// Team color map for charts/badges
export const TEAM_COLORS: Record<string, string> = {
  "Mumbai Indians": "hsl(220 100% 60%)",
  "Chennai Super Kings": "hsl(48 100% 55%)",
  "Royal Challengers Bengaluru": "hsl(0 85% 55%)",
  "Kolkata Knight Riders": "hsl(280 70% 55%)",
  "Delhi Capitals": "hsl(220 80% 50%)",
  "Punjab Kings": "hsl(0 75% 50%)",
  "Rajasthan Royals": "hsl(330 80% 55%)",
  "Sunrisers Hyderabad": "hsl(20 100% 55%)",
  "Gujarat Titans": "hsl(200 60% 30%)",
  "Lucknow Super Giants": "hsl(190 80% 45%)",
  "Deccan Chargers": "hsl(280 60% 40%)",
  "Pune Warriors": "hsl(180 60% 40%)",
  "Rising Pune Supergiant": "hsl(280 90% 50%)",
  "Gujarat Lions": "hsl(35 100% 55%)",
  "Kochi Tuskers Kerala": "hsl(160 70% 40%)",
};

export const teamColor = (team: string): string => TEAM_COLORS[team] ?? "hsl(270 60% 60%)";

export const teamShort = (team: string): string => {
  const map: Record<string, string> = {
    "Mumbai Indians": "MI",
    "Chennai Super Kings": "CSK",
    "Royal Challengers Bengaluru": "RCB",
    "Kolkata Knight Riders": "KKR",
    "Delhi Capitals": "DC",
    "Punjab Kings": "PBKS",
    "Rajasthan Royals": "RR",
    "Sunrisers Hyderabad": "SRH",
    "Gujarat Titans": "GT",
    "Lucknow Super Giants": "LSG",
    "Deccan Chargers": "DCh",
    "Pune Warriors": "PW",
    "Rising Pune Supergiant": "RPS",
    "Gujarat Lions": "GL",
    "Kochi Tuskers Kerala": "KTK",
  };
  return map[team] ?? team.split(" ").map((w) => w[0]).join("").slice(0, 4);
};
