// Decision Intelligence OS — client contract for the /ai-analyst modules.
// Mirrors artifacts/api-server/src/services/decision/*.ts; keep in sync.

export type PitchType = "balanced" | "batting" | "pace" | "spin";
export type PlayingRole = "batter" | "wicketkeeper" | "all-rounder" | "bowler";
export type BowlingType = "pace" | "spin" | "none" | "unknown";
export type Confidence = "high" | "medium" | "low";

export interface Franchise {
  teamId: number;
  name: string;
  shortName: string;
  squadSize: number;
}

export interface FranchisesResponse {
  season: string;
  seasons: string[];
  franchises: Franchise[];
}

export interface PlayerOverride {
  playerId: number;
  overseas?: boolean;
  keeper?: boolean;
}

export interface PlayingXiRequest {
  teamId: number;
  season?: string;
  pitch: PitchType;
  maxOverseas?: number;
  minBowlingOvers?: number;
  minBowlingOptions?: number;
  minBattingOptions?: number;
  lockedIds: number[];
  excludedIds: number[];
  overrides: PlayerOverride[];
}

export interface XiCandidate {
  playerId: number;
  name: string;
  fullName: string | null;
  country: string | null;
  overseas: boolean;
  keeper: boolean;
  role: PlayingRole;
  bowlingType: BowlingType;
  bowlingStyle: string | null;
  battingHand: "L" | "R" | null;
  bowlingCapacity: number;
  ballsFacedPerMatch: number;
  matchesThisSeason: number;
  impact: { batting: number; bowling: number; total: number; pitchAdjustment: number; adjusted: number };
  confidence: Confidence;
  locked: boolean;
  marginalValue: number | null;
}

export interface XiComposition {
  overseas: number;
  keepers: number;
  bowlingOvers: number;
  bowlingOptions: number;
  battingOptions: number;
  spinners: number;
  pacers: number;
}

export interface PlayingXiResult {
  feasible: boolean;
  message: string | null;
  season: string;
  teamId: number;
  teamName: string;
  pitch: PitchType;
  objective: number;
  xi: XiCandidate[];
  bench: XiCandidate[];
  impactPlayer: { batting: XiCandidate | null; bowling: XiCandidate | null };
  composition: XiComposition;
  constraints: {
    maxOverseas: number;
    minBowlingOvers: number;
    minBowlingOptions: number;
    minBattingOptions: number;
    minSpinners: number;
    minPacers: number;
    requireKeeper: boolean;
  };
  warnings: string[];
  solver: { variables: number; solves: number; ms: number };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchFranchises(season?: string): Promise<FranchisesResponse> {
  const qs = season ? `?season=${encodeURIComponent(season)}` : "";
  return fetch(`/api/optimizer/franchises${qs}`).then((r) => json<FranchisesResponse>(r));
}

export function optimizePlayingXi(req: PlayingXiRequest): Promise<PlayingXiResult> {
  return fetch("/api/optimizer/playing-xi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  }).then((r) => json<PlayingXiResult>(r));
}
