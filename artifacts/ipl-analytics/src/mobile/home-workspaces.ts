import { Gauge, Shield, Swords, type LucideIcon } from "lucide-react";

export interface WorkspaceTile {
  id: "squad-hq" | "pressure-lab" | "match-lab";
  title: string;
  homeSub: string;
  moreSub: string;
  href: string;
  img: string;
  tone: "emerald" | "violet" | "sky";
  icon: LucideIcon;
}

export const WORKSPACE_TILES: readonly WorkspaceTile[] = [
  {
    id: "squad-hq",
    title: "Squad HQ",
    homeSub: "Retention · Squad · XI",
    moreSub: "Retention, squad & playing XI",
    href: "/retention-room",
    img: "/ipl-trophy-cup.jpg",
    tone: "emerald",
    icon: Shield,
  },
  {
    id: "pressure-lab",
    title: "Pressure Lab",
    homeSub: "Clutch · Phase · Pressure",
    moreSub: "Player & situation intelligence",
    href: "/pressurelab",
    img: "/cricket-ball.png",
    tone: "violet",
    icon: Gauge,
  },
  {
    id: "match-lab",
    title: "Match Lab",
    homeSub: "Tactics · Venues · Opp.",
    moreSub: "Tactics, venues & opposition",
    href: "/tactics",
    img: "/venues-stadium.jpg",
    tone: "sky",
    icon: Swords,
  },
] as const;
