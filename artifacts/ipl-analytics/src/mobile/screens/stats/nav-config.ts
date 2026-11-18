import { Compass, Crosshair, Shield, Users } from "lucide-react";

export type StatsTabId =
  | "batters"
  | "bowlers"
  | "batter-lens"
  | "teams"
  | "head2head"
  | "venues"
  | "records"
  | "tactics";

export type StatsCategoryId = "players" | "teams" | "explore" | "intelligence";

export interface StatsCategoryDef {
  id: StatsCategoryId;
  label: string;
  icon: typeof Users;
  tabs: readonly { id: StatsTabId; label: string }[];
}

export const STATS_CATEGORIES: readonly StatsCategoryDef[] = [
  {
    id: "players",
    label: "Players",
    icon: Users,
    tabs: [
      { id: "batters", label: "Batters" },
      { id: "bowlers", label: "Bowlers" },
      { id: "batter-lens", label: "Batter Lens" },
    ],
  },
  {
    id: "teams",
    label: "Teams",
    icon: Shield,
    tabs: [
      { id: "teams", label: "Teams" },
      { id: "head2head", label: "Head to Head" },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    icon: Compass,
    tabs: [
      { id: "venues", label: "Venues" },
      { id: "records", label: "Record Book" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Crosshair,
    tabs: [{ id: "tactics", label: "Tactics & Length" }],
  },
] as const;

export function categoryForStatsTab(tab: StatsTabId): StatsCategoryDef {
  return (
    STATS_CATEGORIES.find((c) => c.tabs.some((t) => t.id === tab)) ??
    STATS_CATEGORIES[0]
  );
}

/** Map URL/deep-link tab strings onto the 8 visible mobile subtabs (never showing Stat Builder or Scenario Intelligence). */
export function resolveMobileStatsTab(raw: string | null | undefined): StatsTabId {
  const v = (raw ?? "").toLowerCase().trim();
  if (v === "bowlers") return "bowlers";
  if (v === "batter-lens") return "batter-lens";
  if (v === "teams") return "teams";
  if (v === "head2head") return "head2head";
  if (v === "venues") return "venues";
  if (v === "records") return "records";
  if (v === "tactics") return "tactics";
  return "batters";
}
