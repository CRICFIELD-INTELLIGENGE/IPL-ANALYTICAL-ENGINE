// Decision Intelligence OS — Phase 1 client contract: "Ask the IPL database"
// and the historical database overview. Mirrors
// artifacts/api-server/src/services/decision/{stats-engine,nl-parser,history}.ts.

export type Perspective = "batting" | "bowling" | "results" | "team_innings";
export type GroupBy = "player" | "season" | "team" | "opponent" | "venue" | "phase" | "innings";

export interface StatFilters {
  seasonFrom?: number;
  seasonTo?: number;
  phase?: "powerplay" | "middle" | "death";
  overFrom?: number;
  overTo?: number;
  teamIds?: number[];
  opponentIds?: number[];
  venueIds?: number[];
  innings?: 1 | 2;
  stage?: "league" | "playoffs" | "final";
  playerIds?: number[];
  vsPlayerIds?: number[];
  bowlingType?: "pace" | "spin";
  battingHand?: "L" | "R";
  nationality?: "overseas" | "indian";
}

export interface StatQuery {
  perspective: Perspective;
  metric: string;
  groupBy: GroupBy;
  order: "asc" | "desc";
  sortBy: "metric" | "key";
  limit: number;
  minVolume?: number;
  filters: StatFilters;
}

export interface StatColumn {
  key: string;
  label: string;
  format: "int" | "dec1" | "dec2" | "text";
  highlight?: boolean;
}

export interface StatRow {
  key: string;
  label: string;
  sub?: string;
  values: Record<string, number | string | null>;
}

export interface Chip {
  field: keyof StatFilters | "minVolume" | "limit";
  label: string;
}

export interface StatResult {
  query: StatQuery;
  title: string;
  answer: string;
  columns: StatColumn[];
  rows: StatRow[];
  chips: Chip[];
  qualification: string | null;
  caveats: string[];
  groupsConsidered: number;
  ms: number;
}

export type AskResponse =
  | { understood: true; question?: string; notes: string[]; result: StatResult }
  | { understood: false; question: string; notes: string[]; suggestions: string[] };

export interface SeasonSummary {
  season: string;
  matches: number;
  runs: number;
  wickets: number;
  sixes: number;
  fours: number;
  runRate: number | null;
  avgFirstInnings: number | null;
  champion: string | null;
  runnerUp: string | null;
  orangeCap: { player: string; runs: number } | null;
  purpleCap: { player: string; wickets: number } | null;
}

export interface HealthCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "info";
  value: string;
  detail: string;
}

export interface HistoryOverview {
  coverage: {
    seasons: number;
    firstSeason: string;
    lastSeason: string;
    matches: number;
    deliveries: number;
    players: number;
    venues: number;
    franchises: number;
    firstMatch: string | null;
    lastMatch: string | null;
  };
  seasons: SeasonSummary[];
  health: HealthCheck[];
  ms: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function askQuestion(question: string): Promise<AskResponse> {
  return fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  }).then((r) => json<AskResponse>(r));
}

export function runQuery(query: StatQuery): Promise<AskResponse> {
  return fetch("/api/ask/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then((r) => json<AskResponse>(r));
}

export function fetchHistoryOverview(): Promise<HistoryOverview> {
  return fetch("/api/history/overview").then((r) => json<HistoryOverview>(r));
}

/** Remove one chip's filter from a query (the UI's "×" on an interpretation chip). */
export function withoutChip(query: StatQuery, field: Chip["field"]): StatQuery {
  const filters = { ...query.filters };
  if (field === "seasonFrom" || field === "seasonTo") { delete filters.seasonFrom; delete filters.seasonTo; }
  else if (field === "overFrom" || field === "overTo") { delete filters.overFrom; delete filters.overTo; }
  else if (field === "minVolume") return { ...query, minVolume: 0 };
  else if (field !== "limit") delete filters[field];
  return { ...query, filters };
}
