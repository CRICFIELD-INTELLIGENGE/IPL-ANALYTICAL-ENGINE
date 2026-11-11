// CricField Scout Lab — Frontend API Client Contract.
// Connects to /api/scout/* backed by global.db multi-league warehouse.

export type Discipline = "batting" | "bowling";
export type MatchPhase = "all" | "powerplay" | "middle" | "death";

// Mirrors `MetricValue` / `Rating` in artifacts/api-server/src/services/scout/scout-service.ts.
export interface RatingMetric {
  /** Raw rate (e.g. strike rate, economy, %). */
  value: number | null;
  /** League rate for the same balls (competition × season × phase). */
  league: number | null;
  /** 100 × actual ÷ expected; 100 = league average. */
  index: number | null;
  /** Index shrunk toward 100 with k = 120 balls. */
  shrunk: number | null;
  /** 95% interval for the RAW index (Wilson for proportions, normal approx. for rates). */
  ci: [number, number] | null;
  /** 0–100, 100 = best; null below the rankable sample. */
  percentile: number | null;
  population: number;
  /** Bayesian hierarchical posterior talent estimate E[theta | data]. */
  trueTalent?: number | null;
  /** Bayesian 95% highest posterior density credible interval. */
  credibleInterval?: [number, number] | null;
  /** Bayesian variance decomposition: true talent variance / total variance (0..1). */
  skillRatio?: number | null;
  /** Luck/sample variance ratio: 1 - skillRatio. */
  luckRatio?: number | null;
  /** Performance sustainability probability P(theta > 100). */
  sustainabilityProb?: number | null;
  /** Analytical empirical shrinkage prior weight (sigma^2 / tau^2). */
  kBayes?: number;
}

export interface PlayerDnaFingerprint {
  archetypeLabel: string;
  archetypeDescription: string;
  dimensions: {
    powerplayVelocity: number;
    boundaryAggression: number;
    dotResistance: number;
    longevityIndex: number;
    deathImpact: number;
  };
}

export interface WinProbabilityResult {
  winProbability: number;
  requiredRunRate: number;
  equilibriumRunRate: number;
  projectedRuns: number;
  runsNeeded: number;
  ballsRemaining: number;
  wicketsRemaining: number;
  chasePhase: "cruising" | "balanced" | "pressure" | "critical";
  simulatedPathsCount: number;
}

export interface ScoutRole {
  label: string;
  inputs: Record<string, number>;
}

export interface ScoutRating {
  recruitmentAvailability?: {nationality:string|null;nationalitySource:string|null;playingStatus:string;playingStatusSource:string|null;retentionStatus:string;retentionSource:string|null;retentionChance:string;previousTeams:string[];eligibility:string;excluded:boolean;reasons:string[]};
  verifiedAttributes?: { nationality?:{value:string;source:string;confidence:string}|null; declaredRole?:{value:string;source:string;confidence:string}|null; provenance: {attribute:string;value:string;source:string;confidence:string}[] };
  eligibilityStatus?:string;
  player_key: number;
  cricsheet_id: string;
  /** Register unique_name when available, else name. */
  name: string;
  competition: string;
  seasons: string[];
  discipline: Discipline;
  phase: MatchPhase;
  role: ScoutRole;
  dna?: PlayerDnaFingerprint;
  tier: "rankable" | "low" | "insufficient";
  matches: number;
  innings: number;
  balls: number;
  counts: Record<string, number>;
  metrics: Record<string, RatingMetric>;
  partialSeasons: string[];
  teams: string[];
  lowerDivisionShare: number | null;
  strengths?: string[];
  weaknesses?: string[];
}

/** Metrics where a LOWER value/index is better (mirrors BATTING_METRICS / BOWLING_METRICS `better`). */
export const LOWER_IS_BETTER: Record<Discipline, readonly string[]> = {
  batting: ["dot_pct"],
  bowling: ["economy", "boundary_pct"],
};
export const isLowerBetter = (discipline: Discipline, metricId: string) => LOWER_IS_BETTER[discipline].includes(metricId);

/** Interval method behind each metric's `ci` (all intervals are on the raw-index scale). */
export const CI_METHOD: Record<string, "wilson" | "normal"> = {
  strike_rate: "normal",
  economy: "normal",
  boundary_pct: "wilson",
  dot_pct: "wilson",
  balls_per_dismissal: "wilson",
  wicket_rate: "wilson",
};

export interface ScoutRankingsFilters {
  discipline?: Discipline;
  competitions?: string; // e.g. "ipl,smat,bbl"
  phase?: MatchPhase;
  role?: string;
  minBalls?: number;
  recentSeasons?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface ScoutRankingsResponse {
  filters: {
    discipline: Discipline;
    competitions: string[];
    phase: MatchPhase;
    role: string | null;
    minBalls: number;
    recentSeasons: number | null;
    sortBy: string;
    sortOrder: "asc" | "desc";
    search: string | null;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  data: ScoutRating[];
}

export interface VerifiedBowlingStyle {
  type: "pace" | "spin" | "unknown";
  subtypes: string[];
  arm: "right" | "left" | null;
  action: string | null;
  sources: { source: string; confidence: string; raw: string }[];
}

export interface PlayerVerifiedAttributes {
  bowling: VerifiedBowlingStyle;
  battingHand: string | null;
  cappedStatus2026: { value: string; confidence: string; evidence: string } | null;
  provenance: { attribute: string; value: string; source: string; confidence: string }[];
}

export interface SeasonLine {
  competition: string;
  season: string;
  coverage: string;
  team: string;
  batting_role: string;
  bowling_role: string;
  usage: string;
  bat: {
    innings: number;
    runs: number;
    balls: number;
    sr: number | null;
    avg: number | null;
    srIndex: number | null;
    tier: string;
  } | null;
  bowl: {
    innings: number;
    legal: number;
    wickets: number;
    economy: number | null;
    econIndex: number | null;
    tier: string;
  } | null;
}

export interface PlayerTrend {
  competition: string;
  discipline: Discipline;
  metric: string;
  latestSeason: string;
  latest: number | null;
  earlier: number | null;
  change: number | null;
  verdict: "improving" | "declining" | "stable" | "insufficient sample";
  detail: string;
}

export interface SimilarPlayer {
  player_key: number;
  cricsheet_id: string;
  name: string;
  competition: string;
  distance: number;
  role: ScoutRole;
  tier: string;
  balls: number;
  metrics: Record<string, RatingMetric>;
}

export interface ScoutPlayerProfileResponse {
  player: {
    player_key: number;
    cricsheet_id: string;
    name: string;
    unique_name: string | null;
  };
  verifiedAttributes: PlayerVerifiedAttributes;
  contextSummary: {
    iplAppearances: number;
    debutSeasons: Record<string, string | null>;
    primaryDiscipline: Discipline;
    competitionsPlayed: string[];
  };
  seasonLines: SeasonLine[];
  ratings: ScoutRating[];
  trends: PlayerTrend[];
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
  };
  similarPlayers: SimilarPlayer[];
}

export interface ScoutComparePlayer {
  player: {
    player_key: number;
    cricsheet_id: string;
    name: string;
    unique_name: string | null;
  };
  rating: ScoutRating | null;
  attributes: PlayerVerifiedAttributes;
  strengths: string[];
  weaknesses: string[];
}

export interface RadarMetric {
  metric: string;
  label: string;
  better: "higher" | "lower";
  unit: string;
  values: Record<string, number | null>;
}

export interface ScoutCompareResponse {
  discipline: Discipline;
  phase: string;
  competitions: string[];
  players: ScoutComparePlayer[];
  radarMetrics: RadarMetric[];
}

export interface RoleCatalogItem {
  id: string;
  label: string;
  category: "batting" | "bowling" | "usage";
  definition: string;
  minUsage: string;
  activeCount: number;
}

export interface ScoutRoleCatalogResponse {
  battingRoles: RoleCatalogItem[];
  bowlingRoles: RoleCatalogItem[];
  usageProfiles: RoleCatalogItem[];
  methodology: Record<string, string>;
}

export interface ScoutSearchResult {
  player_key: number;
  cricsheet_id: string;
  name: string;
  unique_name: string | null;
}

// ── HTTP Fetchers ──────────────────────────────────────────────────────────

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) errMessage = `${body.error}: ${body.detail ?? body.message ?? ""}`;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }
  return res.json() as Promise<T>;
}

export async function fetchScoutRankings(filters: ScoutRankingsFilters = {}): Promise<ScoutRankingsResponse> {
  const params = new URLSearchParams();
  if (filters.discipline) params.set("discipline", filters.discipline);
  if (filters.competitions) params.set("competitions", filters.competitions);
  if (filters.phase) params.set("phase", filters.phase);
  if (filters.role) params.set("role", filters.role);
  if (filters.minBalls != null) params.set("minBalls", String(filters.minBalls));
  if (filters.recentSeasons != null) params.set("recentSeasons", String(filters.recentSeasons));
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters.search) params.set("search", filters.search);

  const query = params.toString();
  return getJson<ScoutRankingsResponse>(`/api/scout/rankings${query ? `?${query}` : ""}`);
}

export async function fetchScoutPlayer(id: string): Promise<ScoutPlayerProfileResponse> {
  return getJson<ScoutPlayerProfileResponse>(`/api/scout/player/${encodeURIComponent(id)}`);
}

export async function fetchScoutCompare(params: {
  ids: string[];
  discipline?: Discipline;
  competitions?: string;
  phase?: MatchPhase;
  recentSeasons?: number;
}): Promise<ScoutCompareResponse> {
  const query = new URLSearchParams();
  query.set("ids", params.ids.join(","));
  if (params.discipline) query.set("discipline", params.discipline);
  if (params.competitions) query.set("competitions", params.competitions);
  if (params.phase) query.set("phase", params.phase);
  if (params.recentSeasons) query.set("recentSeasons", String(params.recentSeasons));

  return getJson<ScoutCompareResponse>(`/api/scout/compare?${query.toString()}`);
}

export async function fetchScoutRoles(): Promise<ScoutRoleCatalogResponse> {
  return getJson<ScoutRoleCatalogResponse>("/api/scout/roles");
}

export async function searchScoutPlayers(q: string): Promise<ScoutSearchResult[]> {
  if (!q.trim()) return [];
  const res = await getJson<{ results: ScoutSearchResult[] }>(`/api/scout/search?q=${encodeURIComponent(q.trim())}`);
  return res.results ?? [];
}

export async function fetchWinProbability(params: {
  runsNeeded: number;
  ballsRemaining: number;
  wicketsRemaining: number;
  venuePar?: number;
}): Promise<WinProbabilityResult> {
  const query = new URLSearchParams({
    runsNeeded: String(params.runsNeeded),
    ballsRemaining: String(params.ballsRemaining),
    wicketsRemaining: String(params.wicketsRemaining),
    ...(params.venuePar ? { venuePar: String(params.venuePar) } : {}),
  });
  return getJson<WinProbabilityResult>(`/api/scout/win-probability?${query.toString()}`);
}

export async function fetchBayesCalculator(params: {
  metricId?: string;
  rawIndex?: number;
  balls?: number;
  discipline?: Discipline;
}) {
  const query = new URLSearchParams({
    metricId: params.metricId ?? "strike_rate",
    rawIndex: String(params.rawIndex ?? 132),
    balls: String(params.balls ?? 120),
    discipline: params.discipline ?? "batting",
  });
  return getJson<{
    trueTalent: number | null;
    credibleInterval: [number, number] | null;
    skillRatio: number | null;
    luckRatio: number | null;
    sustainabilityProb: number | null;
    kBayes: number;
  }>(`/api/scout/bayes-calculator?${query.toString()}`);
}
