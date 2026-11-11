import { requireCurrentRetention } from "./retention-version";
// CRICFIELD Retention Room client. Mirrors artifacts/api-server/src/routes/retention.ts.
// Pages format these values and calculate none of their own.

import { apiGet, apiPost } from "@/lib/discovery-api";
import { getSupabase } from "@/lib/supabase";

export type Choice = "retain" | "release";
export type Choices = Record<string, Choice>;
export const CATEGORIES = ["Icons", "Franchise Cornerstone", "Priority Retain", "Strong Retain", "Retain", "Retention Dilemma", "Release / Buyback Review", "Release Candidate", "Insufficient Evidence"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Rules {
  season: number; cycle: "mega" | "mini"; status: string; summary: string; votingLocksAt: string | null; votingOpen: boolean;
  retentionDeadline: { date: string | null; status: string; sourceUrl: string | null };
  auction: { date: string | null; venue: string | null; status: string };
  maxSquad: number; maxOverseas: number; maxRetained: number | null; rtm: boolean; auctionPurseLakh: number | null; purseStatus: string; salaryCapLakh: number | null;
  assumptions: string[]; sources: { label: string; url: string }[];
}
export interface RoomMeta {
  season: number; franchise: string | null; dataCutoff: string; modelVersion: string; indexVersion: string; generatedAt: string; rules: Rules; provenance: string;
  rosterBasis: { season: number; label: string; contractNote: string | null };
}
export interface ForecastGate { available: boolean; message: string | null; reason: string | null }
export interface FranchiseRoom extends RoomMeta { squadSize: number; counts: Record<Category, number>; evidenceCoverage: number; forecastStatus: ForecastGate; ballots: number }
export interface SeasonEntry { season: number; cycle: string; live: boolean; rulesStatus: string; votingOpen: boolean; archive: boolean }

export interface Metric { key: string; label: string; max: number; score: number | null; measured: number; fraction: number | null; evidence: string }
export interface SeasonLine { season: number; matches: number; batBalls: number; bowlBalls: number; batPerMatch: number; bowlPerMatch: number; batPhase: number[]; bowlPhase: number[]; phaseBallsFaced: number[]; phaseBallsBowled: number[] }
export interface DecisionScenario {
  kind: "retain" | "release_buyback" | "release_replace" | "trade"; label: string; available: boolean; detail: string; rarChange: number | null; purseChangeLakh: number | null;
  probability?: { value: number; meaning: string } | null; status?: string; sources?: { publisher: string; url: string; official: boolean }[];
}
export interface PickRow {
  id: string; name: string; aliases: string[]; warehouseId: number | null; team: string; role: string; overseas: boolean | null; contractLakh: number | null; predictedLakh: number;
  strategy?: {baseIndex: number; policyCategory: Category; rationale: string; scoreRange: [number,number]; basis: string} | null;
  strengths?: string | null;
  weaknesses?: string | null;
  inPlayingXI?: boolean;
  impactSub?: boolean;
  index: number; coverage: number; category: Category; cappedFrom: Category | null; confidence: "high" | "medium" | "low"; granularRole: string;
  recommendation: "retain" | "release" | "undecided"; metrics: Metric[]; reason: string; against: string | null;
  fitIncrement: number | null; limitations: string[];
  projection: { rar: number; sd: number; bat: number; bowl: number; seasonsUsed: number[] } | null; seasons: SeasonLine[];
  horizon: { age: number | null; oneYear: number | null; threeYear: number | null; megaNote: string };
  scenarios: DecisionScenario[]; sensitivity: { tierStability: number; range: [number, number]; byWeights: { set: string; index: number; category: Category }[] };
  previous: { version: string; index: number; category: string } | null; acquisition: string | null; tradedIn: boolean;
  editorial: { category: string; rationale: string; recordedAt: string; strengths?: string | null; weaknesses?: string | null; salary?: string | null; inPlayingXI?: boolean; impactSub?: boolean } | null;
  financial: { contractLakh: number | null; predictedLakh: number; predictedRange: { low: number; high: number }; note: string };
}
export interface Method {
  version: string; weights: Record<string, number>; note: string; minCoverage: number; bands: { min: number; category: Category }[]; sensitivitySets: Record<string, Record<string, number>>;
  components: Record<string, string>;
  performance: { chosen: string; chosenLabel: string; rule: string; rows: { key: string; label: string; selection: { n: number; rankCorrelation: number }; holdout: { n: number; rankCorrelation: number } }[] } | null;
  aging: { bat: { band: string; change: number; n: number }[]; bowl: { band: string; change: number; n: number }[]; note: string } | null;
  decisionBacktest: { n: number; seasons: number[]; methods: { key: string; label: string; auc: number | null }[]; forecastModelAuc: number | null; note: string } | null;
}
export interface RRPlanning {
 status: string; coreLocks: {id:string;name:string;contractLakh:number|null}[]; coreCommittedLakh:number|null; recommendedCommittedLakh:number|null; budgetLakh:number|null; remainingPurseLakh:number|null; note:string; externalReviews:{name:string;reason:string}[]; unclassifiedPlayers:string[];
}
export interface TeamPicks extends RoomMeta { planning?: RRPlanning | null; rows: PickRow[]; evidenceCoverage: number; method: Method }

export interface TradeMove { entryId: string; status: string; canonicalId: string | null; player: string; from: string; to: string; feeLakh: number | null; rar: number | null; contractLakh: number | null; crr: { index: number; category: Category } | null }
export interface TradeEntry {
  id: string; kind: string; status: string; announcedOn: string | null; lastChecked: string; changesSquads: boolean; inSnapshot: boolean; label: string; moves: TradeMove[];
  history: { status: string; on: string; sourceUrl: string }[]; sources: { publisher: string; official: boolean; url: string; publishedOn: string; note?: string }[];
}
export interface TradeIntel { updatedAt: string | null; note: string; entries: TradeEntry[]; audit: { entries: number; byStatus: Record<string, number>; unresolvedPlayers: string[] } }

export interface ForecastRow {
  id: string; name: string; role: string; overseas: boolean | null; modelVersion: string; dataCutoff: string; probability: number | null; category: string | null;
  confirmed: { decision: string | null; source: string | null } | null; provisional: { index: number | null; band: string | null } | null; factors: { label: string; detail: string }[];
}
export interface RetentionScore { n: number; accuracy: number; precision: number; recall: number; brier: number; keptShare: number }
export interface TeamForecast extends RoomMeta {
  forecastStatus: ForecastGate; rows: ForecastRow[]; disclaimer: string;
  validation: { scope: string; method: string; holdout: { seasons: number[]; brier: number; baseRateBrier: number; ece: number; logLoss: number }; classification: { holdout: RetentionScore; allFolds: RetentionScore }; bySeason: (RetentionScore & { season: number })[]; byFranchise: (RetentionScore & { team: string })[]; gate: { passed: boolean; rule: string } };
}

export interface FanRow { id: string; name: string; role: string; retainVotes: number; releaseVotes: number; retainPct: number | null; releasePct: number | null; cricfield: string; cricfieldCategory: string | null }
export interface FanResults extends RoomMeta { totalBallots: number; label: string; votingOpen: boolean; rows: FanRow[]; controversial: FanRow[]; disagreements: FanRow[]; consensusSquad: { id: string; name: string }[]; rankingsNote: string | null }

export interface Scenario {
  label: string; note: string | null; retained: number; released: number; releasedPlayers: { id: string; name: string; role: string }[]; overseas: number; overseasSlotsLeft: number; squadSlotsLeft: number;
  committedLakh: number | null; salaryKnownLakh: number; salaryMissing: string[]; remainingPurseLakh: number | null; purseNote: string | null; violations: { code: string; message: string }[];
  strength: number | null; battingValue: number | null; bowlingValue: number | null; strengthNote: string | null; roles: Record<string, number>; gaps: string[]; bestXii: { id: string; name: string }[];
  composition: { phaseCoverage: { powerplay: number; middle: number; death: number }; battingDepth: number } | null;
}
export interface Simulation extends RoomMeta { scenarios: Scenario[]; fanScenario: string; caveat: string }

export interface DilemmaSide { id: string; name: string; role: string; index: number; contractLakh: number | null; predictedLakh: number; rar: number | null; fit: number | null; case: string }
export interface Dilemma { id: string; type: string; title: string; question: string; a: DilemmaSide; b: DilemmaSide; evidence: string[]; opinion: { text: string; recordedAt: string } | null }

interface CallScore { n: number; right: number; accuracy: number | null }
export interface FrozenRow {
  id: string; season: number; frozenAt: string; reason: string; modelVersion: string; hash: string; intact: boolean; beforeDecisions: boolean;
  evaluation: { overall: { picks: CallScore; forecast: CallScore; fans: CallScore }; teams: { team: string; decisions: number; picks: CallScore; fans: CallScore; calls: { player: string; retained: boolean; cricfield: string | null; sourceUrl: string }[] }[] } | null;
}
export interface RetentionHistory {
  frozen: FrozenRow[]; officialDecisions: number; unmatchedDecisions: string[]; livePredictionStatus: string | null;
  leaderboard: { season: number; frozenAt: string; picks: CallScore; forecast: CallScore; fans: CallScore }[];
  retrospective: { label: string; method: string; gate: { passed: boolean; rule: string }; classification: { holdout: RetentionScore; allFolds: RetentionScore }; bySeason: (RetentionScore & { season: number })[]; byFranchise: (RetentionScore & { team: string })[] } | null;
}
export interface PlayerRetention {
  season: number; team: string; modelVersion: string; indexVersion: string; dataCutoff: string;
  pick: { index: number; coverage: number; category: Category; confidence: "high" | "medium" | "low"; granularRole: string; reason: string; against: string | null; fitIncrement: number | null; previous: { index: number; category: string } | null };
  forecast: { status: ForecastGate; band: string | null; kind: string; value: number | null };
  fans: { totalBallots: number; retainPct: number | null; releasePct: number | null; label: string };
}
export interface LeagueSummary extends RoomMeta {
  teams: { team: string; squad: number; priority: string[]; dilemmas: number; releaseCandidates: number; insufficient: number; ballots: number; topPick: { name: string; index: number } | null }[];
  toughest: { team: string; dilemmas: number }[]; forecastStatus: ForecastGate; lastFreeze: { at: string; modelVersion: string } | null;
}
export interface SavedBallot { season: number; team: string; choices: Choices; createdAt: string; updatedAt: string; retained: number; released: number; agreesWithCricfield: number | null; editable: boolean }

const base = (season: number, team: string) => `/api/retention/${season}/franchises/${team}`;
export const fetchSeasons = () => apiGet<{ seasons: SeasonEntry[] }>("/api/retention/seasons");
export const fetchRoom = (s: number, t: string) => apiGet<FranchiseRoom>(base(s, t)).then(requireCurrentRetention);
export const fetchPicks = (s: number, t: string) => apiGet<TeamPicks>(`${base(s, t)}/picks`).then(requireCurrentRetention);
export const fetchForecast = (s: number, t: string) => apiGet<TeamForecast>(`${base(s, t)}/forecast`).then(requireCurrentRetention);
export const fetchFanResults = (s: number, t: string) => apiGet<FanResults>(`${base(s, t)}/fan-results`);
export const fetchDilemmas = (s: number, t: string) => apiGet<{ dilemmas: Dilemma[] }>(`${base(s, t)}/dilemmas`);
export const fetchTrades = (team?: string) => apiGet<TradeIntel>(`/api/retention/trades${team ? `?team=${team}` : ""}`);
export const fetchHistory = () => apiGet<RetentionHistory>("/api/retention/history");
export const fetchSummary = () => apiGet<LeagueSummary>("/api/retention/summary");
export const fetchPlayerRetention = (key: string | number) => apiGet<PlayerRetention>(`/api/retention/2027/players/${encodeURIComponent(String(key))}`);
export const fetchReplacementsFor = (key: string, team: string) => apiGet<{ options: { id: string; name: string; team: string | null; priceLakh: number; increment: number }[] }>(`/api/intelligence/players/${encodeURIComponent(key)}/replacements?team=${team}`);
export const simulateRetention = (season: number, team: string, choices?: Choices) => apiPost<Simulation>("/api/retention/simulate", { season, team, ...(choices ? { choices } : {}) });
export const checkBallot = (season: number, team: string, choices: Choices) => apiPost<{ status: string; violations: { code: string; message: string }[]; notes: string[] }>("/api/retention/ballots/check", { season, team, choices });

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : null;
}

export async function submitBallot(season: number, team: string, choices: Choices) {
  const headers = await authHeaders();
  if (!headers) return { ok: false as const, status: 401, message: "Sign in to save your picks." };
  const res = await fetch("/api/retention/ballots", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ season, team, choices }) });
  const body = await res.json() as { message?: string; violations?: { message: string }[]; updatedAt?: string };
  if (res.ok) return { ok: true as const, status: res.status, updatedAt: body.updatedAt };
  return { ok: false as const, status: res.status, message: body.violations?.[0]?.message ?? body.message ?? "Your picks could not be saved. Please try again." };
}

export async function fetchMyBallot(season: number, team: string): Promise<SavedBallot | null> {
  const headers = await authHeaders();
  if (!headers) return null;
  const res = await fetch(`/api/retention/ballots/mine?season=${season}&team=${team}`, { headers });
  return res.ok ? ((await res.json()) as { ballot: SavedBallot | null }).ballot : null;
}

export async function fetchMyBallots(): Promise<SavedBallot[]> {
  const headers = await authHeaders();
  if (!headers) return [];
  const res = await fetch("/api/retention/ballots/mine", { headers });
  return res.ok ? ((await res.json()) as { ballots: SavedBallot[] }).ballots : [];
}

/** The desk's token is typed by an editor and held only for the request. */
export async function postEditorial(season: number, token: string, body: Record<string, string>) {
  const res = await fetch(`/api/retention/${season}/editorial`, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify(body) });
  return res.ok;
}
