import { Gavel, Shield, Network, Newspaper } from "lucide-react";
import type { PulseTab } from "@/lib/pulse-auction";

export type PulseCategoryId = "auction" | "teams" | "intel" | "coverage";

export interface PulseCategoryDef {
  id: PulseCategoryId;
  label: string;
  shortLabel: string;
  icon: typeof Gavel;
  tabs: readonly PulseTab[];
}

export const PULSE_CATEGORIES: readonly PulseCategoryDef[] = [
  {
    id: "auction",
    label: "Auction",
    shortLabel: "Auction",
    icon: Gavel,
    tabs: ["Overview", "Live Auction", "Player Pool"],
  },
  {
    id: "teams",
    label: "Teams",
    shortLabel: "Teams",
    icon: Shield,
    tabs: ["Franchises", "Retentions", "Results"],
  },
  {
    id: "intel",
    label: "Intelligence",
    shortLabel: "Intel",
    icon: Network,
    tabs: ["Transfers", "Knowledge Graph"],
  },
  {
    id: "coverage",
    label: "Coverage",
    shortLabel: "Coverage",
    icon: Newspaper,
    tabs: ["Live Blog", "Archive"],
  },
] as const;

export function categoryForTab(tab: PulseTab): PulseCategoryDef {
  return (
    PULSE_CATEGORIES.find((cat) => cat.tabs.includes(tab)) ?? PULSE_CATEGORIES[0]
  );
}
