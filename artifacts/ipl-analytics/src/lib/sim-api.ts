// Decision Intelligence OS — Phase 3 (Simulation) and Phase 4 (Intelligence)
// client contract, plus the intel panels used on player / team / venue / match
// pages. Mirrors artifacts/api-server/src/routes/decision-intel.ts and the
// services it calls. Every figure comes from the IPL ball-by-ball warehouse.

import { apiGet, apiPost, qs } from "@/lib/discovery-api";

export type Side = "batting" | "bowling";

export interface MatchSummary { matchId: string; season: string; date: string; title: string; stage: string | null; venue: string; result: string }

/* ─── Catalog ─── */

export interface Catalog {
  latestSeason: number;
  seasons: number[];
  franchises: { short: string; name: string; active: boolean }[];
  venues: { key: string; name: string; city: string | null; matches: number; lastSeason: number }[];
}
export const fetchCatalog = () => apiGet<Catalog>("/api/decision/catalog");

/* ─── Strategy Simulator ─── */

export interface StrategySetup {
  season: number;
  batting: { short: string; name: string; likelyOrder: number[]; players: { playerId: number; name: string; avgPosition: number; innings: number }[] };
  bowling: { short: string; name: string; likelyAttack: number[]; players: { playerId: number; name: string; overs: number; matches: number; type: string }[] };
}

export interface StrategyRequest {
  battingTeam: string; bowlingTeam: string; season?: number; venue?: string;
  target: number; runs: number; balls: number; wickets: number;
  striker?: number; nonStriker?: number; battingOrder?: number[]; attack?: number[];
  oversUsed?: Record<string, number>; sims?: number; seed?: number;
}

export interface PlanResult {
  id: "optimal" | "save-death" | "matchup";
  name: string;
  description: string;
  defendProb: number;
  chaseProb: number;
  finalRuns: { p10: number; p50: number; p90: number };
  expectedWickets: number;
  overs: { over: number; bowler: number; bowlerName: string; share: number; expRuns: number; wicketProb: number; bowledProb: number }[];
}

interface Person { playerId: number; name: string; strikeRateThisPhase?: number | null }

export interface StrategyResult {
  context: {
    battingTeam: string; bowlingTeam: string; season: number; venue: string | null; venueFactor: number;
    target: number; runs: number; balls: number; wickets: number; runsNeeded: number; ballsLeft: number;
    requiredRate: number | null; currentRate: number | null;
  };
  batting: { striker: Person; nonStriker: Person; toCome: Person[] };
  attack: (Person & { type: string; oversUsed: number; oversLeft: number; deathEconomy: number | null; economyThisPhase: number | null })[];
  leagueBaseline: { chaseProb: number; note: string };
  plans: PlanResult[];
  nextBowler: { playerId: number; name: string; defendProb: number; expRunsThisOver: number; wicketProbThisOver: number }[];
  histogram: { from: number; to: number; count: number }[];
  parallels: { similar: number; chaseWinRate: number | null; examples: { matchId: string; season: string; date: string; batting: string; bowling: string; state: string; won: boolean }[] };
  sims: number;
  seed: number;
}

export const fetchStrategySetup = (battingTeam: string, bowlingTeam: string, season?: number) =>
  apiGet<StrategySetup>(`/api/strategy/setup${qs({ battingTeam, bowlingTeam, season })}`);
export const runStrategy = (req: StrategyRequest) => apiPost<StrategyResult>("/api/strategy/simulate", req);

/* ─── Alternate Universe ─── */

export interface AltMatchDetail {
  match: MatchSummary;
  innings: {
    innings: 1 | 2; battingTeam: string; bowlingTeam: string; total: string;
    overs: { over: number; bowler: number; bowlerName: string; runs: number; wickets: number; cumulative: number }[];
    bowlers: { playerId: number; name: string; overs: number }[];
    batters: { playerId: number; name: string }[];
  }[];
  bowlingTypes: string[];
}

export type AltChange =
  | { type: "none" }
  | { type: "swap_bowler"; out: number; in: number }
  | { type: "bowling_type"; bowlingType: string };

export interface AltSide {
  label: string; meanRuns: number; finalRuns: { p10: number; p50: number; p90: number };
  winProb: number; winProbFor: string; worm: { over: number; median: number }[];
}

export interface AltResult {
  match: MatchSummary; innings: 1 | 2; battingTeam: string; bowlingTeam: string; fromOver: number;
  state: { runs: number; wickets: number; legal: number; striker: string; nonStriker: string; target: number | null };
  description: string;
  actual: { runs: number; wickets: number; result: string; worm: { over: number; cumulative: number; bowler: string; runs: number; wickets: number }[] };
  baseline: AltSide; alternate: AltSide;
  histogram: { from: number; to: number; baseline: number; alternate: number }[];
  divergence: { over: number; actualBowler: string; alternateBowler: string; baselineRuns: number; alternateRuns: number; baselineWicketProb: number; alternateWicketProb: number }[];
  dossier: string[]; modelCheck: string; sims: number;
}

export const fetchAltMatches = (q?: string, season?: string) => apiGet<{ matches: MatchSummary[] }>(`/api/alt-universe/matches${qs({ q, season })}`);
export const fetchAltMatch = (id: string) => apiGet<AltMatchDetail>(`/api/alt-universe/match/${encodeURIComponent(id)}`);
export const runAlternate = (req: { matchId: string; innings: 1 | 2; fromOver: number; change: AltChange; sims?: number }) => apiPost<AltResult>("/api/alt-universe/simulate", req);

/* ─── Decision Replay ─── */

export interface WinProbPoint { ball: string; legal: number; winProb: number; event: string | null }

export interface ReplayOption {
  playerId: number; name: string; type: string;
  phaseEconomy: number | null; phaseBallsPerWicket: number | null;
  vsStriker: { balls: number; runs: number; outs: number } | null;
  expRunsThisOver: number; wicketProbThisOver: number; defendProb: number;
  verdict: "Best call" | "Reasonable" | "Costly"; actual: boolean;
}

export interface DecisionPoint {
  over: number; situation: string; striker: string; nonStriker: string;
  runsNeeded: number; ballsLeft: number; wickets: number;
  winProbBefore: number; winProbAfter: number;
  options: ReplayOption[]; actualChoice: string; actualOutcome: string; swing: number;
}

export interface ReplayResult {
  match: MatchSummary; chasingTeam: string; bowlingTeam: string; target: number; firstInnings: string;
  decisionPoints: DecisionPoint[]; curve: WinProbPoint[]; sims: number;
}

export const fetchReplayMatches = (q?: string) => apiGet<{ matches: (MatchSummary & { maxSwing: number })[] }>(`/api/replay/matches${qs({ q })}`);
export const fetchReplay = (matchId: string) => apiGet<ReplayResult>(`/api/replay/${encodeURIComponent(matchId)}`);

/* ─── Opposition Exploit Map ─── */

type Vuln = "High" | "Med" | "Low" | "—";
export interface BatterBrief {
  playerId: number; name: string; position: number; balls: number; strikeRate: number | null;
  trap: string | null; trapConfidence: number; trapSignificant: boolean; srInTrap: number | null;
  dismissalWindow: string | null; exploit: string | null; vulnerabilityIndex: number;
  spin: Record<"Leg-spin" | "Left-arm orthodox" | "Off-spin", { balls: number; sr: number | null; ballsPerOut: number | null; vulnerability: Vuln }>;
}

export interface OppositionReport {
  team: string; teamName: string; opponent: string; opponentName: string; season: number; venue: string | null;
  winProbability: { overall: number; battingFirst: number; chasing: number; toss: string; medianTotalBattingFirst: number; medianOppTotalBattingFirst: number; sims: number };
  tacticalOverview: string[];
  batters: BatterBrief[];
  deathThreats: { playerId: number; name: string; deathSR: number; deathBalls: number; boundaryPct: number; vsPaceSR: number | null; vsSpinSR: number | null; counter: string }[];
  rotation: { phase: string; overs: string; bowlers: { playerId: number; name: string; overs: number; type: string }[]; expectedEconomy: number; mission: string }[];
  headToHead: { played: number; won: number; lost: number; recentPlayed: number; recentWon: number };
  venueProfile: VenueProfile | null;
}

export interface VenueProfile { matches: number; avgFirstInnings: number | null; chasingWinPct: number | null; paceEconomy: number | null; spinEconomy: number | null }

export const fetchOpposition = (team: string, opponent: string, venue?: string, season?: number) =>
  apiGet<OppositionReport>(`/api/opposition${qs({ team, opponent, venue, season })}`);

/* ─── Player Pool Graph ─── */

export interface Neighbour {
  playerId: number; name: string; archetype: string; similarity: number; roleMatch: number; outputMatch: number;
  crossEra: boolean; era: number; span: string; shared: string[]; differs: string | null; headline: { label: string; value: string }[];
}

export interface PoolGraph {
  center: { playerId: number; name: string; archetype: string; era: number; span: string; balls: number; headline: { label: string; value: string }[]; features: { label: string; value: string; z: number; better: "high" | "low" | null }[] };
  side: Side; window: "career" | "recent"; sidesAvailable: Side[];
  neighbours: Neighbour[];
  nodes: { id: number; name: string; archetype: string; similarity: number; crossEra: boolean; center: boolean }[];
  edges: { a: number; b: number; similarity: number }[];
  poolSize: number;
  archetypeCounts: { archetype: string; count: number; examples: string[] }[];
}

export const fetchPool = (player: string | number, window: string, side?: Side) =>
  apiGet<PoolGraph>(`/api/pool/${encodeURIComponent(String(player))}${qs({ window, side })}`);

/* ─── Squad DNA ─── */

export interface DimensionView {
  key: string; label: string; group: string; unit: string; direction: "high" | "low" | "style";
  value: number | null; display: string; percentile: number | null; score: number | null; importance: number | null;
  best: { team: string; season: number; display: string } | null;
}

export interface SquadProfile {
  franchise: string; short: string; season: number; matches: number;
  fingerprint: { group: string; score: number | null }[];
  dimensions: DimensionView[];
  vulnerability: { score: number; exposures: { label: string; score: number; importance: number }[] };
  strengths: { label: string; score: number }[];
  twins: { franchise: string; short: string; season: number; similarity: number; winPct: number | null }[];
  roster: { playerId: number; name: string; matches: number }[];
}

export interface SquadCompare {
  a: SquadProfile; b: SquadProfile; correlation: number;
  biggestGaps: { label: string; a: number | null; b: number | null; aDisplay: string; bDisplay: string; direction: string }[];
}

export const fetchSquadTeams = () => apiGet<{ teams: { franchise: string; short: string; seasons: number[] }[] }>("/api/squad-dna/teams");
export const fetchSquadProfile = (team: string, season?: number) => apiGet<SquadProfile>(`/api/squad-dna/profile${qs({ team, season })}`);
export const fetchSquadCompare = (a: string, aSeason: number | undefined, b: string, bSeason: number | undefined) =>
  apiGet<SquadCompare>(`/api/squad-dna/compare${qs({ a, aSeason, b, bSeason })}`);

/* ─── Auction War Room ─── */

export type AuctionView = "backtest" | "live";
export type Signal = "BUY" | "HOLD" | "AVOID" | "SCOUT";
export type AuctionRole = "Batter" | "Bowler" | "All-rounder" | "Wicketkeeper";

export interface AuctionRow {
  key: string; playerId: number | null; name: string; country: string; overseas: boolean; role: AuctionRole;
  age: number | null; reserve: number | null; capped: boolean | null; iplMatches: number;
  impact: number | null; iar: number | null; confidence: string; archetype: string | null;
  market: number; marketBasis: number; value: number | null; signal: Signal; maxBid: number | null; team: string | null;
  marketRange?: { low: number; high: number } | null; valueGap?: number | null; verdict?: string | null; retentionPick?: { index: number; category: string } | null;
  actual?: { soldTo: string | null; price: number | null; matches: number; impact: number | null; valueDelivered: number | null; verdict: string };
  lastSale?: { season: number; team: string; price: number } | null;
  contract?: string | null;
  fit?: { score: number; reasons: string[] } | null;
}

export interface BacktestSummary {
  sold: number; matched: number; priceRankCorrelation: number; typicalMiss: number;
  projection: { n: number; correlation: number };
  groups: { signal: Signal; listed: number; sold: number; played: number; avgPrice: number | null; avgImpact: number | null; deliveredShare: number | null }[];
  hits: { name: string; signal: Signal; price: number; impact: number; note: string }[];
  misses: { name: string; signal: Signal; price: number; impact: number; note: string }[];
}

export interface AuctionBoard {
  view: AuctionView; asOf: number; target: number;
  model: { replacement: number; n: number; looR2: number; typicalMiss: number; rate: { overseas: number; domestic: number }; curve: { iar: number; domestic: number; overseas: number }[]; cap: number; trainedOn: string };
  team: { short: string; name: string; season: number; gaps: { label: string; score: number; importance: number }[] } | null;
  counts: Record<Signal, number>;
  total: number;
  rows: AuctionRow[];
  backtest: BacktestSummary | null;
  teams: { short: string; name: string }[];
}

export interface AuctionPlayerDetail {
  row: AuctionRow; view: AuctionView; asOf: number;
  comparables: { playerId: number; name: string; similarity: number; archetype: string; sale: { season: number; team: string; price: number }; nextSeason: { matches: number; impact: number } | null }[];
  bestFits: { short: string; name: string; score: number; reasons: string[] }[];
  history: { season: number; matches: number; impact: number | null }[];
  sales: { season: number; team: string; price: number }[];
}

export interface BoardQuery { view: AuctionView; team?: string; role?: AuctionRole; overseas?: "only" | "exclude"; maxPrice?: number; signal?: Signal; q?: string; sort?: "edge" | "fit" | "market" | "impact" }

export const fetchBoard = (q: BoardQuery) => apiGet<AuctionBoard>(`/api/war-room/board${qs({ ...q })}`);
export const fetchAuctionPlayer = (key: string, view: AuctionView) => apiGet<AuctionPlayerDetail>(`/api/war-room/player/${encodeURIComponent(key)}${qs({ view })}`);

/** ₹ lakh → "₹7.25 Cr" / "₹75 L". */
export const money = (lakh: number | null | undefined) =>
  lakh === null || lakh === undefined ? "—" : lakh >= 100 ? `₹${(lakh / 100).toFixed(lakh >= 1000 ? 1 : 2)} Cr` : `₹${Math.round(lakh)} L`;

/* ─── Page intel ─── */

export interface PlayerIntelSide {
  pressure: { index: number | null; archetype: string; balls: number; liftPer100: number } | null;
  weakness: { label: string; headline: string; confidence: number } | null;
  strength: { label: string; headline: string; confidence: number } | null;
  pool: { archetype: string; neighbours: { playerId: number; name: string; similarity: number; archetype: string }[] } | null;
}

export interface PlayerIntel {
  playerId: number; name: string;
  batting: PlayerIntelSide | null; bowling: PlayerIntelSide | null;
  auction: {
    asOf: number; signal: Signal; market: number; marketRange?: { low: number; high: number } | null; verdict?: string | null; value: number | null; maxBid: number | null; iar: number | null; archetype: string | null;
    contract: string | null; lastSale: { season: number; team: string; price: number } | null;
    comparables: AuctionPlayerDetail["comparables"]; bestFits: AuctionPlayerDetail["bestFits"];
  } | null;
}

export interface TeamIntel {
  short: string; franchise: string; season: number; matches: number;
  fingerprint: SquadProfile["fingerprint"]; vulnerability: SquadProfile["vulnerability"]; strengths: SquadProfile["strengths"]; twins: SquadProfile["twins"];
  seasons: number[];
}

export interface VenueIntel { key: string; name: string; city: string | null; season: number; recent: VenueProfile; allTime: VenueProfile }

export interface MatchIntel {
  match: MatchSummary; chasing: string | null; defending: string | null; target: number | null;
  curve: WinProbPoint[]; turningPoints: (WinProbPoint & { swing: number })[]; replayable: boolean;
}

export const fetchPlayerIntel = (key: string | number) => apiGet<PlayerIntel>(`/api/intel/player/${encodeURIComponent(String(key))}`);
export const fetchTeamIntel = (key: string, season?: number) => apiGet<TeamIntel>(`/api/intel/team/${encodeURIComponent(key)}${qs({ season })}`);
export const fetchVenueIntel = (key: string) => apiGet<VenueIntel>(`/api/intel/venue/${encodeURIComponent(key)}`);
export const fetchMatchIntel = (id: string | number) => apiGet<MatchIntel>(`/api/intel/match/${encodeURIComponent(String(id))}`);
