import type { HubTeam } from "./ipl-2027";

export interface RetentionSnapshot {
  team: HubTeam;
  savedAt: string;
  players: { name: string; role: string; overseas: boolean }[];
}
export interface AuctionPlan {
  budget: number;
  watchlist: string[];
  targets: string[];
  notes: string;
}
export const planKey = (team: string) => `cf:auction-plan:v1:${team}`;
export const retentionKey = (team: string) => `cf:retention-snapshot:v1:${team}`;
export function readSaved<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
export const emptyPlan: AuctionPlan = { budget: 0, watchlist: [], targets: [], notes: "" };
