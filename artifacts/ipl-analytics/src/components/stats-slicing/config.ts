// Which Dimensional Slicing controls each Stats Centre category exposes, and the situation presets.
import type { AnalyticsFilters } from "@/lib/store";
import type { MatchState } from "./match-state";

export const sliceList = (value?: string): string[] =>
  (value ?? "").split("|").map(s => s.trim()).filter(s => s && !/^all\b/i.test(s));

export type FilterId = "season" | "team" | "opponent" | "venue" | "nationality" | "phase" | "situation" | "pressure" | "bowlerType"
  | "handedness" | "innings" | "matchType" | "matchState" | "bowlerFaced" | "batterFaced" | "more" | "analysis" | "search";

const PLAYER: FilterId[] = ["season", "team", "opponent", "venue", "nationality", "phase", "situation", "pressure", "bowlerType", "innings", "matchType", "matchState", "more", "analysis", "search"];

// Venue / team / record summaries are computed from fixtures, so only fixture-level controls are offered there.
export const DESKTOP_FILTERS: Record<string, FilterId[]> = {
  batters: [...PLAYER, "bowlerFaced"],
  bowlers: [...PLAYER, "handedness", "batterFaced"],
  venues: ["season", "team", "venue", "matchType", "search"],
  teams: ["season", "team", "opponent", "venue", "matchType", "search"],
  records: ["season", "team", "opponent", "venue", "matchType"],
  head2head: ["season", "venue", "phase", "innings", "matchType"],
  ask: ["season", "team", "opponent", "venue", "nationality", "phase", "situation", "pressure", "bowlerType", "handedness", "innings", "matchType", "matchState", "more"],
};

/** Ids match the API's bowlStyle values (stats-aggregator DETAILED_BOWL_STYLES). */
export const DETAILED_STYLE_OPTIONS: [string, string][] = [
  ["right-arm-fast", "Right-arm fast"], ["right-arm-fast-medium", "Right-arm fast-medium"], ["right-arm-medium", "Right-arm medium"],
  ["left-arm-fast", "Left-arm fast"], ["left-arm-fast-medium", "Left-arm fast-medium"], ["left-arm-medium", "Left-arm medium"],
  ["right-arm-off-spin", "Right-arm off-spin"], ["leg-spin", "Right-arm leg-spin"], ["left-arm-orthodox", "Left-arm orthodox"],
  ["left-arm-wrist-spin", "Left-arm wrist-spin"],
];

/**
 * Situation presets only set existing filters. Definitions are the ones already documented in the aggregator
 * (passesPressureFilter, phase overs). Collapse Recovery and Difficult Chase have no documented definition yet,
 * so they are not offered.
 */
export const SITUATIONS: { id: string; label: string; scope: Partial<AnalyticsFilters>; ms?: MatchState }[] = [
  { id: "death", label: "Death Overs", scope: { phase: "Death" } },
  { id: "powerplay", label: "Powerplay Fire", scope: { phase: "Powerplay" } },
  { id: "clutch", label: "Clutch Moments", scope: { pressure_state: "Clutch Moment" } },
  { id: "high-pressure", label: "High Pressure", scope: { pressure_state: "High Pressure" } },
  { id: "chasing200plus", label: "Chasing 200+", scope: { innings: "2nd Innings (Chasing)" }, ms: { minTarget: 200 } },
  { id: "playoff", label: "Playoff Matches", scope: { match_context: "Playoffs" } },
  { id: "death-spin", label: "Death vs Spin", scope: { phase: "Death", bowler_type: "Spinner" } },
];

export function situationLabel(id: string, filters: AnalyticsFilters, ms: MatchState): string {
  const preset = SITUATIONS.find(s => s.id === id);
  if (!preset) return "All Situations";
  const same = Object.entries(preset.scope).every(([k, v]) => (filters as any)[k] === v) &&
    Object.entries(preset.ms ?? {}).every(([k, v]) => (ms as any)[k] === v);
  return same ? preset.label : "Custom";
}
