import type { OfficialPlayer } from "./retention-official-api";
import { emptyPlan, planKey, readSaved, type AuctionPlan } from "./auction-plan";
import type { TeamCode } from "./team-context";

export type SquadRoleGroup = "batter" | "wicketkeeper" | "all-rounder" | "pace" | "spin" | "bowler" | "unknown";

export interface HypotheticalPlayer {
  id: string;
  name: string;
  role: string;
  group: SquadRoleGroup;
  overseas: boolean;
  country: string | null;
  source: "watchlist" | "shortlist" | "replacement" | "custom";
  addedAt: string;
}

export interface SquadScenario {
  team: TeamCode;
  name: string;
  additions: HypotheticalPlayer[];
  removedOfficialIds: string[];
  captain: string | null;
  savedAt: string;
}

export const scenarioKey = (team: string) => `cf:squad-hq-scenario:v1:${team.toUpperCase()}`;

export function emptyScenario(team: TeamCode): SquadScenario {
  return {
    team,
    name: `${team} My Squad`,
    additions: [],
    removedOfficialIds: [],
    captain: null,
    savedAt: new Date().toISOString(),
  };
}

export function loadScenario(team: TeamCode): SquadScenario {
  const stored = readSaved<Partial<SquadScenario> | null>(scenarioKey(team), null);
  if (!stored || stored.team !== team) return emptyScenario(team);
  return {
    team,
    name: typeof stored.name === "string" && stored.name.trim() ? stored.name : `${team} My Squad`,
    additions: Array.isArray(stored.additions) ? stored.additions : [],
    removedOfficialIds: Array.isArray(stored.removedOfficialIds) ? stored.removedOfficialIds : [],
    captain: typeof stored.captain === "string" ? stored.captain : null,
    savedAt: typeof stored.savedAt === "string" ? stored.savedAt : new Date().toISOString(),
  };
}

export function saveScenario(scenario: SquadScenario): void {
  try {
    localStorage.setItem(
      scenarioKey(scenario.team),
      JSON.stringify({ ...scenario, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* localStorage unavailable */
  }
}

export function loadAuctionTargets(team: string): string[] {
  const plan = readSaved<AuctionPlan>(planKey(team), emptyPlan);
  return Array.from(new Set([...(plan.targets ?? []), ...(plan.watchlist ?? [])])).filter(Boolean);
}

export function classifyRoleGroup(role: string | null | undefined, bowlStyle?: string | null): SquadRoleGroup {
  const r = (role ?? "").toLowerCase();
  if (r.includes("keeper") || r === "wk") return "wicketkeeper";
  if (r.includes("all")) return "all-rounder";
  if (r.includes("bat")) return "batter";
  if (r.includes("spin") || r.includes("slow") || r.includes("orthodox") || r.includes("chinaman") || r.includes("legbreak") || r.includes("offbreak")) return "spin";
  if (r.includes("pace") || r.includes("fast") || r.includes("seam") || r.includes("medium")) return "pace";
  if (r.includes("bowl")) {
    const b = (bowlStyle ?? "").toLowerCase();
    if (b.includes("spin") || b.includes("break") || b.includes("orthodox") || b.includes("slow")) return "spin";
    if (b.includes("fast") || b.includes("medium") || b.includes("seam")) return "pace";
    return "bowler";
  }
  return "unknown";
}

export interface SquadCounts {
  total: number;
  indian: number;
  overseas: number;
  batters: number;
  wicketkeepers: number;
  allRounders: number;
  bowlers: number;
  pace: number;
  spin: number;
  slotsRemaining: number;
  overseasRemaining: number;
}

export function computeScenarioCounts(
  officialActive: OfficialPlayer[],
  scenario: SquadScenario,
): SquadCounts {
  const keptOfficial = officialActive.filter((p) => !scenario.removedOfficialIds.includes(p.id));
  const combined: { group: string; overseas: boolean | null }[] = [
    ...keptOfficial.map((p) => ({ group: p.group, overseas: p.overseas })),
    ...scenario.additions.map((a) => ({ group: a.group, overseas: a.overseas })),
  ];
  const overseas = combined.filter((p) => p.overseas === true).length;
  const indian = combined.filter((p) => p.overseas === false).length;
  const batters = combined.filter((p) => p.group === "batter").length;
  const wicketkeepers = combined.filter((p) => p.group === "wicketkeeper").length;
  const allRounders = combined.filter((p) => p.group === "all-rounder").length;
  const pace = combined.filter((p) => p.group === "pace").length;
  const spin = combined.filter((p) => p.group === "spin").length;
  const bowlers = combined.filter((p) => ["pace", "spin", "bowler"].includes(p.group)).length;

  return {
    total: combined.length,
    indian,
    overseas,
    batters,
    wicketkeepers,
    allRounders,
    bowlers,
    pace,
    spin,
    slotsRemaining: Math.max(0, 25 - combined.length),
    overseasRemaining: Math.max(0, 8 - overseas),
  };
}
