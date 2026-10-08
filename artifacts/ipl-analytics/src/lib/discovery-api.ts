// Decision Intelligence OS — Phase 2 client contract (Discovery):
// Hidden Weakness Detector, Pressure Genome, AI Insight Feed.
// Mirrors artifacts/api-server/src/services/decision/{weakness-detector,pressure-genome,insight-feed}.ts.

export type Side = "batting" | "bowling";

export interface PlayerSearchHit {
  playerId: number;
  name: string;
  fullName: string | null;
  country: string | null;
  matches: number;
  lastSeason: string | null;
  primary: Side;
}

/* ─── Weakness ─── */

export interface CellStats {
  balls: number;
  runs: number;
  outs: number;
  rate: number | null;
  ballsPerOut: number | null;
  dotPct: number | null;
  boundaryPct: number | null;
}

export interface Anomaly {
  id: string;
  kind: "weakness" | "strength";
  dimensions: string[];
  headline: string;
  cell: CellStats;
  elsewhere: CellStats;
  effectPer100: number;
  z: number;
  confidence: number;
  significant: boolean;
  exploit: string | null;
  evidence: {
    dismissals: { matchId: string; date: string; season: string; opponent: string; counterpart: string; ball: string; kind: string }[];
    counterparts: { name: string; balls: number; runs: number; outs: number; rate: number | null }[];
    distribution: Record<string, number>;
  };
}

export interface HeatCell { row: string; col: string; balls: number; rate: number | null; ballsPerOut: number | null; effectPer100: number | null }

export interface WeaknessReport {
  playerId: number;
  name: string;
  fullName: string | null;
  side: Side;
  sidesAvailable: Side[];
  window: "recent" | "career";
  windowLabel: string;
  overall: CellStats;
  cellsTested: number;
  weaknesses: Anomaly[];
  strengths: Anomaly[];
  watchList: Anomaly[];
  heatmap: { rows: string[]; cols: string[]; cells: HeatCell[]; rowLabel: string };
  summary: string;
  method: string;
}

/* ─── Pressure ─── */

export interface ContextSplit {
  context: string;
  label: string;
  description: string;
  balls: number;
  runs: number;
  outs: number;
  rate: number | null;
  ballsPerOut: number | null;
  boundaryPct: number | null;
  dotPct: number | null;
  leagueRate: number | null;
  leagueBallsPerOut: number | null;
  valuePer100: number;
}

export interface PressureGenome {
  playerId: number;
  name: string;
  fullName: string | null;
  side: Side;
  window: "career" | "recent";
  windowLabel: string;
  sidesAvailable: Side[];
  qualified: boolean;
  confidence: "high" | "medium" | "low";
  pressureBalls: number;
  pressureIndex: number | null;
  liftPer100: number;
  archetype: string;
  summary: string;
  strongest: ContextSplit | null;
  weakest: ContextSplit | null;
  pressure: ContextSplit;
  calm: ContextSplit;
  contexts: ContextSplit[];
  comparables: { playerId: number; name: string; pressureIndex: number; archetype: string; similarity: number }[];
}

export interface PressureLeader { playerId: number; name: string; pressureIndex: number; liftPer100: number; pressureBalls: number; archetype: string }
export interface PressureLeaders { byIndex: PressureLeader[]; byLift: PressureLeader[]; qualifyBalls: number }

/* ─── Feed ─── */

export type InsightCategory = "player_rise" | "venue_pattern" | "matchup_anomaly" | "auction_opportunity" | "tactical_trend";

export type InsightLink =
  | { kind: "ask"; question: string }
  | { kind: "weakness"; playerId: number; window: "recent" | "career" }
  | { kind: "pressure"; playerId: number; window: "recent" | "career" };

export interface Insight {
  id: string;
  category: InsightCategory;
  categoryLabel: string;
  headline: string;
  stat: { value: string; label: string };
  evidence: string[];
  implication: string;
  confidence: "high" | "medium";
  links: { label: string; link: InsightLink }[];
  score: number;
}

export interface DailyFeed {
  date: string;
  dataThrough: string | null;
  latestSeason: string;
  insights: Insight[];
  poolSizes: Record<InsightCategory, number>;
}

/* ─── Fetchers ─── */

/**
 * `code` is set when the API itself answered with an error ("player_not_found").
 * No code means the API is unreachable or too old to have the route — the
 * case where pages fall back to their saved demo data.
 */
export class ApiError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.detail ?? body?.error ?? `HTTP ${res.status}`, body?.error ?? null);
  }
  return res.json() as Promise<T>;
}

/** True when a failed request should show demo data rather than an error message. */
export const isOffline = (err: unknown) => !(err instanceof ApiError) || err.code === null;

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const apiGet = <T>(url: string) => fetch(url).then((r) => json<T>(r));
export const apiPost = <T>(url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => json<T>(r));

/** A readable message for a failed request. */
export function errorText(err: unknown): string {
  if (isOffline(err)) return "Can't reach the analytics API. Start the api-server (it reads the IPL warehouse) and reload.";
  const e = err as ApiError;
  const known: Record<string, string> = {
    unknown_team: "That franchise isn't in the data.",
    same_team: "Pick two different franchises.",
    squad_unavailable: "Not enough players on record for that franchise and season.",
    innings_not_found: "That innings isn't in the ball-by-ball record.",
    innings_already_over: "The innings had already ended before that over.",
    player_not_found: "No player by that name in the IPL record.",
    not_qualified: e.message,
    no_chase: e.message,
    team_season_not_found: "No record of that franchise in that season.",
    player_not_in_board: "That player isn't on this board.",
    match_not_found: "That match isn't in the ball-by-ball record.",
    invalid_request: "Some of the inputs are out of range.",
  };
  return known[e.code ?? ""] ?? e.message;
}

export const searchPlayers = (q: string) => fetch(`/api/players/search${qs({ q })}`).then((r) => json<PlayerSearchHit[]>(r));
// `player` is a player id or an exact Cricsheet name ("RG Sharma"); the API resolves both.
export const fetchWeakness = (player: string | number, window: string, side?: Side) =>
  fetch(`/api/weakness/${encodeURIComponent(String(player))}${qs({ window, side })}`).then((r) => json<WeaknessReport>(r));
export const fetchPressure = (player: string | number, window: string, side?: Side) =>
  fetch(`/api/pressure/${encodeURIComponent(String(player))}${qs({ window, side })}`).then((r) => json<PressureGenome>(r));
export const fetchPressureLeaders = (window: string, side: Side) => fetch(`/api/pressure/leaders${qs({ window, side })}`).then((r) => json<PressureLeaders>(r));
export const fetchDailyFeed = (date: string) => fetch(`/api/insights/daily${qs({ date })}`).then((r) => json<DailyFeed>(r));

/** Where an insight link goes inside the app. */
export function linkHref(link: InsightLink): string {
  if (link.kind === "ask") return `/ai-analyst/ask?q=${encodeURIComponent(link.question)}`;
  return `/ai-analyst/${link.kind}?player=${link.playerId}&window=${link.window}`;
}

/** Read/write the module's state in the URL so views are shareable. */
export function readParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function writeParams(params: Record<string, string | number | undefined | null>): void {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") p.delete(k);
    else p.set(k, String(v));
  }
  const s = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}
