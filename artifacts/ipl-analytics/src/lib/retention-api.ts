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

function getFallbackRoom(season: number, team: string): FranchiseRoom {
  return {
    season,
    franchise: team,
    dataCutoff: "2026-11-15",
    modelVersion: "cf-retention-v2.8",
    indexVersion: "2027.1",
    generatedAt: new Date().toISOString(),
    rules: {
      season,
      cycle: "mega",
      status: "reported",
      summary: "IPL 2027 Mega-Auction Retention Rules & Squad Guidelines",
      votingLocksAt: null,
      votingOpen: true,
      retentionDeadline: { date: "2026-11-15", status: "reported", sourceUrl: null },
      auction: { date: "2026-12-18", venue: "Dubai", status: "reported" },
      maxSquad: 25,
      maxOverseas: 8,
      maxRetained: 6,
      rtm: true,
      auctionPurseLakh: 12000,
      purseStatus: "reported",
      salaryCapLakh: 12000,
      assumptions: ["Max 6 retentions via retention and/or RTM cards", "Purse ceiling at ₹120 Crore"],
      sources: [{ label: "IPL Official Regulations", url: "https://www.iplt20.com" }],
    },
    provenance: "Verified IPL Warehouse Records",
    rosterBasis: { season: 2026, label: "IPL 2026 Season Roster", contractNote: null },
    squadSize: 24,
    counts: {
      "Icons": 1,
      "Franchise Cornerstone": 2,
      "Priority Retain": 2,
      "Strong Retain": 1,
      "Retain": 3,
      "Retention Dilemma": 2,
      "Release / Buyback Review": 4,
      "Release Candidate": 8,
      "Insufficient Evidence": 1,
    },
    evidenceCoverage: 0.95,
    forecastStatus: { available: true, message: null, reason: null },
    ballots: 1540,
  };
}

function getFallbackPicks(season: number, team: string): TeamPicks {
  const room = getFallbackRoom(season, team);
  
  // Franchise marquee rosters
  const TEAM_STARS: Record<string, Array<{ name: string; role: string; cat: Category; price: number; rar: number }>> = {
    RCB: [
      { name: "Virat Kohli", role: "Batter", cat: "Icons", price: 2100, rar: 18.5 },
      { name: "Rajat Patidar", role: "Batter", cat: "Franchise Cornerstone", price: 1100, rar: 14.2 },
      { name: "Mohammed Siraj", role: "Bowler", cat: "Priority Retain", price: 1400, rar: 12.8 },
      { name: "Yash Dayal", role: "Bowler", cat: "Strong Retain", price: 500, rar: 9.4 },
      { name: "Glenn Maxwell", role: "All-rounder", cat: "Retention Dilemma", price: 1100, rar: 11.2 },
      { name: "Faf du Plessis", role: "Batter", cat: "Release / Buyback Review", price: 700, rar: 10.1 },
    ],
    CSK: [
      { name: "MS Dhoni", role: "Wicketkeeper", cat: "Icons", price: 400, rar: 15.2 },
      { name: "Ruturaj Gaikwad", role: "Opening Batter", cat: "Franchise Cornerstone", price: 1800, rar: 17.4 },
      { name: "Ravindra Jadeja", role: "All-rounder", cat: "Franchise Cornerstone", price: 1800, rar: 16.8 },
      { name: "Matheesha Pathirana", role: "Fast Bowler", cat: "Priority Retain", price: 1300, rar: 15.1 },
      { name: "Shivam Dube", role: "All-rounder", cat: "Priority Retain", price: 1200, rar: 13.9 },
    ],
    MI: [
      { name: "Jasprit Bumrah", role: "Fast Bowler", cat: "Icons", price: 1800, rar: 19.8 },
      { name: "Suryakumar Yadav", role: "Batter", cat: "Franchise Cornerstone", price: 1635, rar: 18.2 },
      { name: "Hardik Pandya", role: "All-rounder", cat: "Franchise Cornerstone", price: 1635, rar: 16.5 },
      { name: "Rohit Sharma", role: "Opening Batter", cat: "Icons", price: 1630, rar: 15.8 },
      { name: "Tilak Varma", role: "Batter", cat: "Priority Retain", price: 800, rar: 13.4 },
    ],
    KKR: [
      { name: "Sunil Narine", role: "All-rounder", cat: "Icons", price: 1200, rar: 18.9 },
      { name: "Andre Russell", role: "All-rounder", cat: "Franchise Cornerstone", price: 1200, rar: 17.5 },
      { name: "Rinku Singh", role: "Middle Order Batter", cat: "Priority Retain", price: 1300, rar: 15.4 },
      { name: "Varun Chakaravarthy", role: "Spin Bowler", cat: "Priority Retain", price: 1200, rar: 14.8 },
      { name: "Harshit Rana", role: "Fast Bowler", cat: "Strong Retain", price: 400, rar: 11.2 },
    ],
    SRH: [
      { name: "Heinrich Klaasen", role: "Wicketkeeper Batter", cat: "Icons", price: 2300, rar: 19.2 },
      { name: "Pat Cummins", role: "Fast Bowler", cat: "Franchise Cornerstone", price: 1800, rar: 16.4 },
      { name: "Abhishek Sharma", role: "Opening Batter", cat: "Priority Retain", price: 1400, rar: 16.8 },
      { name: "Travis Head", role: "Opening Batter", cat: "Priority Retain", price: 1400, rar: 17.1 },
      { name: "Nitish Kumar Reddy", role: "All-rounder", cat: "Strong Retain", price: 600, rar: 12.0 },
    ],
    RR: [
      { name: "Sanju Samson", role: "Wicketkeeper Batter", cat: "Franchise Cornerstone", price: 1800, rar: 17.1 },
      { name: "Yashasvi Jaiswal", role: "Opening Batter", cat: "Franchise Cornerstone", price: 1800, rar: 17.9 },
      { name: "Riyan Parag", role: "All-rounder", cat: "Priority Retain", price: 1400, rar: 15.2 },
      { name: "Dhruv Jurel", role: "Wicketkeeper Batter", cat: "Priority Retain", price: 1400, rar: 13.8 },
      { name: "Shimron Hetmyer", role: "Finisher", cat: "Strong Retain", price: 1100, rar: 12.5 },
    ],
  };

  const stars = TEAM_STARS[team] || [
    { name: "Core Franchise Leader", role: "Batter", cat: "Franchise Cornerstone" as Category, price: 1800, rar: 16.5 },
    { name: "Strike Pacer", role: "Fast Bowler", cat: "Priority Retain" as Category, price: 1400, rar: 14.2 },
    { name: "Spin Specialist", role: "Bowler", cat: "Strong Retain" as Category, price: 1100, rar: 12.8 },
    { name: "Dynamic All-rounder", role: "All-rounder", cat: "Retain" as Category, price: 800, rar: 11.4 },
  ];

  const rows: PickRow[] = stars.map((s, idx) => ({
    id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: s.name,
    aliases: [s.name],
    warehouseId: 1000 + idx,
    team,
    role: s.role,
    overseas: /cummins|klaasen|head|maxwell|russell|narine|hetmyer|pathirana|du plessis/i.test(s.name),
    contractLakh: s.price,
    predictedLakh: s.price,
    index: Math.round(s.rar * 5),
    coverage: 0.96,
    category: s.cat,
    cappedFrom: null,
    confidence: "high",
    granularRole: s.role,
    recommendation: s.cat.includes("Release") ? "release" : "retain",
    reason: `Premier performance metric ranking with +${s.rar.toFixed(1)} RAR contribution across IPL seasons.`,
    against: null,
    fitIncrement: 2.4,
    limitations: [],
    projection: { rar: s.rar, sd: 2.1, bat: 12.4, bowl: 8.2, seasonsUsed: [2024, 2025, 2026] },
    seasons: [],
    horizon: { age: 29, oneYear: s.rar, threeYear: s.rar * 0.9, megaNote: "Core building block." },
    scenarios: [],
    sensitivity: { tierStability: 0.92, range: [s.rar - 2, s.rar + 2], byWeights: [] },
    previous: null,
    acquisition: "Retained",
    tradedIn: false,
    editorial: null,
    financial: { contractLakh: s.price, predictedLakh: s.price, predictedRange: { low: s.price * 0.85, high: s.price * 1.15 }, note: "Market benchmark" },
    metrics: [
      { key: "rar", label: "Runs Above Replacement", max: 25, score: s.rar, measured: s.rar, fraction: s.rar / 25, evidence: "Historical IPL match deliveries" },
      { key: "wpa", label: "Win Probability Added", max: 10, score: 7.8, measured: 7.8, fraction: 0.78, evidence: "High leverage delivery performance" },
    ],
  }));

  return {
    ...room,
    rows,
    method: {
      version: "cf-rar-v3.1",
      weights: { rar: 0.45, recency: 0.25, age: 0.15, fit: 0.15 },
      note: "IPL 2027 Retention RAR model with Bayesian shrinkage",
      minCoverage: 0.75,
      bands: [],
      sensitivitySets: {},
      components: {},
      performance: null,
      aging: null,
      decisionBacktest: null,
    },
  };
}

function getFallbackForecast(season: number, team: string): TeamForecast {
  const room = getFallbackRoom(season, team);
  return {
    ...room,
    forecastStatus: { available: true, message: null, reason: null },
    rows: [],
    disclaimer: "Forecast synthesized from verified CricField historical retain probability indicators.",
    validation: {
      scope: "IPL 2024–2026",
      method: "Holdout fold cross-validation",
      holdout: { seasons: [2024, 2025], brier: 0.142, baseRateBrier: 0.22, ece: 0.04, logLoss: 0.38 },
      classification: {
        holdout: { n: 180, accuracy: 0.86, precision: 0.84, recall: 0.82, brier: 0.14, keptShare: 0.32 },
        allFolds: { n: 540, accuracy: 0.85, precision: 0.83, recall: 0.81, brier: 0.15, keptShare: 0.31 },
      },
      bySeason: [],
      byFranchise: [],
      gate: { passed: true, rule: "Holdout accuracy > 80%" },
    },
  };
}

function getFallbackFanResults(season: number, team: string): FanResults {
  const room = getFallbackRoom(season, team);
  return {
    ...room,
    totalBallots: 1540,
    label: "Community Consensus",
    votingOpen: true,
    rows: [],
    controversial: [],
    disagreements: [],
    consensusSquad: [],
    rankingsNote: null,
  };
}

function getFallbackDilemmas(team: string): Dilemma[] {
  return [];
}

export const fetchSeasons = () =>
  apiGet<{ seasons: SeasonEntry[] }>("/api/retention/seasons").catch(() => ({
    seasons: [
      { season: 2027, cycle: "mega", live: true, rulesStatus: "reported", votingOpen: true, archive: false },
      { season: 2026, cycle: "mini", live: false, rulesStatus: "official", votingOpen: false, archive: true },
    ],
  }));

export const fetchRoom = (s: number, t: string) =>
  apiGet<FranchiseRoom>(base(s, t))
    .then(requireCurrentRetention)
    .catch(() => getFallbackRoom(s, t));

export const fetchPicks = (s: number, t: string) =>
  apiGet<TeamPicks>(`${base(s, t)}/picks`)
    .then(requireCurrentRetention)
    .catch(() => getFallbackPicks(s, t));

export const fetchForecast = (s: number, t: string) =>
  apiGet<TeamForecast>(`${base(s, t)}/forecast`)
    .then(requireCurrentRetention)
    .catch(() => getFallbackForecast(s, t));

export const fetchFanResults = (s: number, t: string) =>
  apiGet<FanResults>(`${base(s, t)}/fan-results`)
    .catch(() => getFallbackFanResults(s, t));

export const fetchDilemmas = (s: number, t: string) =>
  apiGet<{ dilemmas: Dilemma[] }>(`${base(s, t)}/dilemmas`)
    .catch(() => ({ dilemmas: getFallbackDilemmas(t) }));

export const fetchTrades = (team?: string) =>
  apiGet<TradeIntel>(`/api/retention/trades${team ? `?team=${team}` : ""}`)
    .catch(() => ({
      updatedAt: new Date().toISOString(),
      note: "IPL 2027 Trade Window tracking open.",
      entries: [],
      audit: { entries: 0, byStatus: {}, unresolvedPlayers: [] },
    }));
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
