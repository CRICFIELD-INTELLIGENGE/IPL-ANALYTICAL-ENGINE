import type { CSSProperties } from "react";
import { HUB_EVENTS } from "@/lib/ipl-2027";
import { teamColor } from "@/lib/aggregates";
import { paletteForCode } from "@/lib/team-palette";
import {
  pulseMoney,
  lotValue,
  type PulseLot,
  type PulseModel,
  type PulseStatus,
  type PulseTab,
  type usePulseAuction,
} from "@/lib/pulse-auction";

export type PulseHookResult = ReturnType<typeof usePulseAuction>;

export const STATUS_LABEL: Record<PulseStatus, string> = {
  registered: "Registered",
  shortlisted: "Shortlisted",
  pending: "Not yet presented",
  "on-block": "On the block",
  sold: "Sold",
  unsold: "Unsold",
  withdrawn: "Withdrawn",
  recorded: "Recorded, no sale",
};

export const STATUS_TONE: Partial<Record<PulseStatus, string>> = {
  sold: "text-emerald-600 dark:text-emerald-400 font-bold",
  unsold: "text-rose-600 dark:text-rose-400 font-bold",
  "on-block": "text-pink-600 dark:text-pink-400 font-bold",
  withdrawn: "text-slate-400 dark:text-white/40",
  pending: "text-amber-600 dark:text-amber-300 font-bold",
};

export function roleBand(role: string): string {
  const r = role.toLowerCase();
  if (/keep|wk/.test(r)) return "Wicketkeeper";
  if (/all/.test(r)) return "All-rounder";
  if (/bowl/.test(r)) return "Bowler";
  if (/bat/.test(r)) return "Batter";
  return "Not recorded";
}

export const BASE_BANDS = [
  "Under ₹50 L",
  "₹50 L – ₹1 Cr",
  "₹1 – 2 Cr",
  "₹2 Cr +",
  "Not recorded",
] as const;

export const baseBand = (lakhs: number | null) =>
  lakhs == null
    ? BASE_BANDS[4]
    : lakhs < 50
      ? BASE_BANDS[0]
      : lakhs < 100
        ? BASE_BANDS[1]
        : lakhs < 200
          ? BASE_BANDS[2]
          : BASE_BANDS[3];

/** Event phase derived from verified timeline in lib/ipl-2027. */
export function auctionPhase() {
  const today = new Date().toLocaleDateString("en-CA");
  const ret = HUB_EVENTS.find((e) => e.id === "retention")?.date;
  const auc = HUB_EVENTS.find((e) => e.id === "auction")?.date;
  if (auc && today > auc) return { id: "after", name: "After auction", tab: "Results" as PulseTab };
  if (auc && today === auc) return { id: "live", name: "Auction day", tab: "Live Auction" as PulseTab };
  if (ret && today >= ret) return { id: "pre", name: "Pre-auction", tab: "Player Pool" as PulseTab };
  return { id: "retain", name: "Before retentions", tab: "Overview" as PulseTab };
}

export const teamHex = (team: string | null | undefined) =>
  paletteForCode(team ?? "")?.accent ?? teamColor(team ?? "");

export const tint = (team: string | null | undefined, alpha: string) => {
  const c = teamHex(team ?? "");
  return /^#[0-9a-f]{6}$/i.test(c) ? c + alpha : `#ffffff${alpha}`;
};

export const teamCardStyle = (team: string | null | undefined): CSSProperties => ({
  borderColor: tint(team, "55"),
  background: `linear-gradient(135deg, ${tint(team, "22")}, ${tint(team, "06")} 60%, transparent)`,
});

export const spendText = (m: { spent: number | null; spentUsd: number | null }) =>
  m.spent == null && m.spentUsd == null ? "Not recorded" : pulseMoney(m.spent, m.spentUsd);

export const unsoldText = (m: PulseModel): string | number =>
  m.historical && !m.unsold ? "Not in archive" : m.unsold;

export function buildInsightSummary(lot: PulseLot, model: PulseModel) {
  const band = roleBand(lot.role);
  const value = lotValue(lot);
  const usd = lot.price == null;
  const money = (v: number) => (usd ? pulseMoney(null, v) : pulseMoney(v));
  const peers = model.purchases
    .filter((p) => roleBand(p.role) === band && (usd ? p.price == null && p.usd != null : p.price != null))
    .map(lotValue)
    .sort((a, b) => a! - b!) as number[];
  const median = peers.length
    ? peers.length % 2
      ? peers[(peers.length - 1) / 2]
      : (peers[peers.length / 2 - 1] + peers[peers.length / 2]) / 2
    : null;
  const rank = value != null ? peers.filter((p) => p > value).length + 1 : null;
  const similar =
    value != null
      ? model.purchases
          .filter(
            (p) =>
              p.id !== lot.id &&
              roleBand(p.role) === band &&
              (p.price == null) === usd &&
              lotValue(p) != null &&
              Math.abs(lotValue(p)! - value) <= value * 0.3,
          )
          .slice(0, 4)
      : [];
  const statsParam = encodeURIComponent(lot.statsName ?? lot.player);
  const links: [string, string][] = [
    ["Squad DNA", `/ai-analyst/squad-dna?team=${lot.team}&season=${lot.season}`],
    ["Auction War Room", `/ai-analyst/auction-war-room?team=${lot.team}&player=${encodeURIComponent(lot.player)}`],
    ["Player Pool Graph", `/ai-analyst/player-pool?player=${statsParam}`],
    ["Pressure Genome", `/ai-analyst/pressure?player=${statsParam}`],
    ["Build Playing XI", `/ai-analyst/playing-xi?team=${lot.team}`],
    ["Opposition Map", `/ai-analyst/opposition-map?team=${lot.team}`],
  ];
  return { band, value, money, peersCount: peers.length, median, rank, similar, links };
}

export const FAN_PULSE_QUESTIONS = [
  {
    id: "q1",
    kicker: "Franchise Rebuilding",
    question: "Which franchise faces the biggest squad overhaul heading into 2027?",
    options: [
      { id: "pbks", label: "PBKS (Complete Core Rebuild)", pct: 44 },
      { id: "dc", label: "DC (Middle-Order Reset)", pct: 26 },
      { id: "lsg", label: "LSG (Pace Department Overhaul)", pct: 18 },
      { id: "gt", label: "GT (Power Hitting Rebalance)", pct: 12 },
    ],
  },
  {
    id: "q3",
    kicker: "Marquee Retentions",
    question: "Which superstar should command the highest retention fee for 2027?",
    options: [
      { id: "bumrah", label: "Jasprit Bumrah (MI)", pct: 41 },
      { id: "kohli", label: "Virat Kohli (RCB)", pct: 34 },
      { id: "klaasen", label: "Heinrich Klaasen (SRH)", pct: 15 },
      { id: "rashid", label: "Rashid Khan (GT)", pct: 10 },
    ],
  },
  {
    id: "q4",
    kicker: "Auction Economics",
    question: "Should franchises exhaust all 6 retention slots or save purse?",
    options: [
      { id: "max", label: "Retain 5–6 (Lock core strength)", pct: 52 },
      { id: "rtm", label: "Retain 3–4 + use RTM cards", pct: 36 },
      { id: "reset", label: "Heavy purse reset (Retain ≤2)", pct: 12 },
    ],
  },
  {
    id: "q5",
    kicker: "Breakout Talent",
    question: "Who is the top young domestic talent to lock in before auction?",
    options: [
      { id: "mayank", label: "Mayank Yadav (LSG Pace)", pct: 45 },
      { id: "abhishek", label: "Abhishek Sharma (SRH Firepower)", pct: 32 },
      { id: "shashank", label: "Shashank Singh (PBKS Finisher)", pct: 14 },
      { id: "harshit", label: "Harshit Rana (KKR Death Overs)", pct: 9 },
    ],
  },
] as const;
