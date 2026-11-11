// Player Intelligence client. Mirrors artifacts/api-server/src/routes/intelligence.ts.
// Pages format these values and never calculate one of their own, so a player
// reads the same on every page.

import { apiGet, apiPost, qs } from "@/lib/discovery-api";

export const INTEL_TEAMS = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"] as const;
export type IntelTeam = (typeof INTEL_TEAMS)[number];

export type DisplayStatus = "verified_data" | "model_prediction" | "provisional_estimate" | "limited_evidence" | "unavailable";
export type Verdict = "Undervalued" | "Fairly priced" | "Overvalued" | "Not assessed";

export interface Envelope {
  canonicalId: string;
  targetSeason: number;
  modelVersion: string;
  predictionTimestamp: string;
  dataCutoff: string;
  value: number | null;
  units: string;
  uncertainty: { low: number; high: number; level: number } | null;
  sampleSize: { value: number; unit: string } | null;
  inputs: { available: string[]; missing: string[] };
  status: DisplayStatus;
  statusReason: string | null;
  factors: { label: string; detail: string }[];
}

export interface FitTeam { team: string; before: number; after: number; increment: number; entersBestSide: boolean; replaces: string[]; squadFull: boolean; overseasBlocked: boolean; gapsClosed: string[]; isCurrentTeam: boolean }
export interface FranchiseFit extends Envelope {
  teams: FitTeam[];
  scarcity: { players: number; aboveReplacement: number; strong: number; medianPredictedLakh: number | null } | null;
  predictedPriceLakh: number;
}
export interface Retention extends Envelope { band: string | null; kind: "probability" | "index" | "decision" | "none" }
export interface ValueCheck { verdict: Verdict; gap: number | null; performancePct: number | null; pricePct: number | null; note: string }
export interface Comparable { id: string; name: string; similarity: number; rar: number | null; predictedLakh: number; betterValue: boolean }
export interface SaleHistory { season: number; team: string; paidLakh: number; predictedLakh: number }

export interface PlayerIntelligence {
  identity: { canonicalId: string; warehouseId: number | null; name: string; identityStatus: string; country: string | null; teamsBySeason: { season: number; team: string }[]; firstSeason: number | null; lastSeason: number | null; matches: number };
  dataStatus: { identity: string; evidence: string; auctionHistory: string; squad: string };
  modelVersion: string;
  dataCutoff: string;
  targetSeason: number;
  inCurrentPool: boolean;
  reason?: string;
  current?: { team: string | null; contractLakh: number | null; acquisition: string | null; role: string; overseas: boolean | null };
  performance: Envelope;
  raw?: Record<string, number | null>;
  market: Envelope;
  soldLikelihood: Envelope;
  value?: ValueCheck;
  franchise?: FranchiseFit;
  retention: Retention;
  comparables?: Comparable[];
  history: SaleHistory[];
  seasonSimulation?: { available: boolean; reason: string | null };
}

export interface PlayerRow {
  id: string; warehouseId: number | null; name: string; role: string; overseas: boolean | null; team: string | null; contractLakh: number | null;
  rar: number | null; rarSd: number | null; sampleMatches: number | null; matchesCareer: number | null;
  priceLakh: number; priceLow: number; priceHigh: number; marketStatus: DisplayStatus;
  verdict: Verdict; gap: number | null; retentionBand: string | null; retentionKind: Retention["kind"];
  retentionIndex: number | null; retentionCategory: string | null;
  bestFit: { team: string; increment: number } | null;
  fit: { team: string; increment: number; entersBestSide: boolean; replaces: string[] } | null;
  phases: Record<"ppSR" | "midSR" | "deathSR" | "ppEcon" | "midEcon" | "deathEcon", number | null>;
}
export interface PlayerList { modelVersion: string; dataCutoff: string; targetSeason: number; predictionTimestamp: string; total: number; rows: PlayerRow[] }
export interface PlayerListQuery { role?: string; team?: string; fitTeam?: string; q?: string; overseas?: "only" | "exclude"; minMatches?: number; minLakh?: number; maxLakh?: number; verdict?: string; sort?: "impact" | "price" | "value" | "fit"; phase?: string; discipline?: string; limit?: number }

interface Composition { overseas: number; keepers: number; bowlingOptions: number; battingOptions: number; spinners: number; pacers: number; oversCapacity: number; battingDepth: number; phaseCoverage: { powerplay: number; middle: number; death: number } }
export interface SideSummary { strength: number; feasible: boolean; composition: Composition; gaps: string[]; squadSize: number; overseasInSquad: number; committedLakh: number; xii: { id: string; name: string; rar: number }[] }
export interface SimulationStatus { available: boolean; reason: string | null }

export interface TeamReport {
  team: string; squadSize: number; overseasInSquad: number; contractLakh: number; strength: number; feasible: boolean; composition: Composition; gaps: string[];
  xii: { id: string; name: string; rar: number | null; overseas: boolean; keeper: boolean; evidence: boolean }[];
  bench: { id: string; name: string; rar: number | null; overseas: boolean; keeper: boolean; evidence: boolean }[];
  modelVersion: string; dataCutoff: string; targetSeason: number; simulation: SimulationStatus; rules: { maxSquad: number; maxOverseasInSquad: number; maxOverseasPlaying: number };
  caveat: string; retentionBoard: PlayerRow[]; squadAsOf: string; roleGroups: { role: string; count: number }[];
}

export type ScenarioMove =
  | { action: "buy" | "release" | "retain"; player: string }
  | { action: "trade" | "replace"; out: string; in: string };

export interface SquadSimulation {
  team: string; modelVersion: string; before: SideSummary; after: SideSummary; delta: number; steps: { move: ScenarioMove; strength: number; delta: number }[];
  messages: string[]; warnings: string[]; redundancy: string[]; simulation: SimulationStatus; caveat: string;
  budget: { committedBeforeLakh: number; committedAfterLakh: number; estimatedSpendLakh: number; remainingPurseLakh: number | null; note: string | null };
}

export interface ReplacementOptions { player: string; team: string; withoutPlayer: number; withPlayer: number; options: (PlayerRow & { increment: number })[]; modelVersion: string; caveat: string }

export interface ModelStatus {
  modelVersion: string; generatedAt: string; dataCutoff: string; ratedThrough: number; targetSeason: number;
  models: {
    performance: { name: string; status: DisplayStatus; validation: { rankCorrelationWithNextSeason: number; previousModelRankCorrelation: number; intervalCoverage: { nominal: number; measured: number; n: number }; label: string; n: number } };
    auction: { name: string; method: string; status: DisplayStatus; validation: { holdout: { seasons: number[]; n: number; maeCr: number; medianAeCr: number; typicalMultiple: number; rankCorrelation: number }; benchmarks: Record<string, { maeCr: number; medianAeCr: number }>; intervalCoverage: { nominal: number; measured: number }; byRole: { role: string; n: number; maeCr: number; medianAeCr: number }[]; byBand: { band: string; n: number; maeCr: number; medianAeCr: number }[]; bySeason: { season: number; n: number; maeCr: number; medianAeCr: number }[] } };
    soldLikelihood: { name: string; status: DisplayStatus; validation: { rows: number; note: string; sameAuctionCv: { auc: number; brier: number } } };
    retention: { name: string; method: string; status: DisplayStatus; validation: { scope: string; holdout: { seasons: number[]; n: number; brier: number; baseRateBrier: number; logLoss: number; auc: number; ece: number; calibration: { from: number; to: number; n: number; predicted: number; observed: number }[] }; probabilityGate: { passed: boolean; rule: string } } };
    franchiseFit: { name: string; status: DisplayStatus; validation: { testBrier: number; coinFlipBrier: number; teamSeasonRankCorrelationWithWins: number; teamSeasons: number; seasonSimulationGate: { passed: boolean; rule: string } } };
    seasonSimulation: { name: string; status: DisplayStatus; available: boolean; reason: string | null };
    fairValue: { name: string; status: DisplayStatus; reason: string };
  };
}

export interface Diagnostics {
  modelVersion: string; generatedAt: string; dataCutoff: string; stale: string | null; missingMetrics: string[];
  identity: { totalPlayers: number; verifiedIdentities: number; nameOnlyIdentities: number; ambiguousAliases: number; withBirthDate: number; rupeeSales: number; salesBySquadRow: number; salesByUniqueAlias: number; salesAmbiguous: number; salesUnresolved: number };
  coverage: { players: number; withEvidence: number; withAuctionRecord: number; withPrediction: number; withoutIplRecord: number; withContract: number; byRole: { key: string; count: number }[]; byMarketStatus: { key: string; count: number }[]; byPerformanceStatus: { key: string; count: number }[]; byRetentionStatus: { key: string; count: number }[] };
}

export interface LeagueInsights {
  modelVersion: string; dataCutoff: string; targetSeason: number; generatedAt: string; kind: "model_output"; disclaimer: string;
  undervalued: PlayerRow[]; overvalued: PlayerRow[]; risers: (PlayerRow & { change: number })[]; fallers: (PlayerRow & { change: number })[];
  scarcity: Record<string, { players: number; aboveReplacement: number; strong: number; medianPredictedLakh: number | null }>;
  spending: { team: string; lots: number; paidLakh: number; predictedLakh: number }[];
  scatter: { id: string; name: string; role: string; rar: number | null; priceLakh: number; contractLakh: number | null; team: string | null }[];
  teams: { team: string; strength: number; contractLakh: number; gaps: string[]; battingDepth: number; phaseCoverage: { powerplay: number; middle: number; death: number } }[];
}

export interface Citation { canonicalId: string; name: string; modelVersion: string; dataCutoff: string; generatedAt: string; targetSeason: number; provenance: string; text: string }

const enc = encodeURIComponent;
export const fetchPlayerIntelligence = (key: string | number) => apiGet<PlayerIntelligence>(`/api/intelligence/players/${enc(String(key))}`);
export const fetchPlayerList = (q: PlayerListQuery) => apiGet<PlayerList>(`/api/intelligence/players${qs(q as Record<string, string | number | undefined>)}`);
export const fetchTeamReport = (team: string) => apiGet<TeamReport>(`/api/intelligence/teams/${enc(team)}`);
export const fetchReplacements = (key: string, team: string) => apiGet<ReplacementOptions>(`/api/intelligence/players/${enc(key)}/replacements${qs({ team })}`);
export const fetchModelStatus = () => apiGet<ModelStatus>("/api/intelligence/models/status");
export const fetchDiagnostics = () => apiGet<Diagnostics>("/api/intelligence/diagnostics");
export const fetchInsights = () => apiGet<LeagueInsights>("/api/intelligence/insights");
export const fetchCitation = (key: string) => apiGet<Citation>(`/api/intelligence/players/${enc(key)}/citation`);
export const simulateSquad = (team: string, moves: ScenarioMove[]) => apiPost<SquadSimulation>("/api/intelligence/squad/simulate", { team, moves });
