// My Dugout client contract. Mirrors artifacts/api-server/src/services/decision/dugout-data.ts.

import { apiGet, qs } from "@/lib/discovery-api";

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

export interface FranchiseRecord {
  franchise: { name: string; short: string };
  firstSeason: string | null;
  lastSeason: string | null;
  seasons: SeasonRecord[];
  overall: { played: number; won: number; lost: number; winPct: number | null };
  titles: { count: number; years: string[] };
  /** Latest captain on record whose record reaches the latest season; null when none. */
  latestCaptain: { name: string; firstSeason: number; lastSeason: number; matches: number; titles: number } | null;
  rival: { name: string; short: string } | null;
  headToHead: { played: number; won: number; lost: number; recent: H2HMatch[] } | null;
}

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
  seasons: string[];
  players: RosterPlayer[];
  spend: { lakh: number; usd: number };
}

export const fetchFranchiseRecord = (team: string, rival?: string) =>
  apiGet<FranchiseRecord>(`/api/dugout/franchise${qs({ team, rival })}`);

export const fetchRoster = (team: string, season: string) =>
  apiGet<RosterResult>(`/api/dugout/squad${qs({ team, season })}`);
