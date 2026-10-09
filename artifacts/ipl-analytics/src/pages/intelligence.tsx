/**
 * The IPL Intelligence & Editorial Hub
 * ─────────────────────────────────────────────────────────────────────────────
 * Institutional design with 3x3 Bento Grid + Sponsored Telemetry Dock,
 * complete 100-Day Content Engine across all 9 Fundamental Dimensions,
 * integrated native AdSense vessels, and deep-dive strategic dossiers.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { motion, AnimatePresence } from "framer-motion";
import { useContentHub, useNews, useInsightFeed } from "@/lib/aggregates";
import { NewsroomTab } from "@/components/newsroom";
import { InsightStoryDeck, InsightFeedCard } from "@/components/insight-reader";
import { AdVessel } from "@/components/ad-vessel";
import {
  CONTENT_ENGINE_100,
  ContentArticle,
  getArticleByDay,
  getArticlesByDimension,
} from "@/lib/content-engine-100";
import type {
  SocialPost,
  SocialPlatform,
  AiArticle,
  BusinessArticle,
  BusinessTag,
} from "@/lib/aggregates";
import {
  ArrowUpRight, ExternalLink, Linkedin, Twitter, FileText,
  Mail, ChevronDown, ChevronRight, ChevronLeft, BookOpen, Database,
  Globe, Cpu, Brain, TrendingUp, Sparkles, Users,
  Banknote, Tv, Radio, Target, Trophy, Smartphone,
  CheckCircle2, CircleDashed, Tag, Calendar, Clock,
  Layers, Link2, Filter, Newspaper, PenSquare, BarChart3,
  Gamepad2, Eye, Shield, Flame, Activity, Compass, ArrowLeft,
  Search, X, Check, Share2, SlidersHorizontal, Zap, ShieldCheck
} from "lucide-react";

/* ══════════════════════════════════════════════════════
   PLATFORM & BUSINESS CONFIG
   ══════════════════════════════════════════════════════ */

const BUSINESS_TAGS: BusinessTag[] = [
  "Media Rights", "Brand Value", "Franchise Economics",
  "Sponsorship", "Streaming", "Governance", "Global Expansion",
];

const TAG_COLOR: Record<BusinessTag, string> = {
  "Media Rights": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Brand Value": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Franchise Economics": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Sponsorship": "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "Streaming": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Governance": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  "Global Expansion": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const REF_CAT_COLOR: Record<string, string> = {
  "Ball Data": "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  "Media Rights": "bg-violet-400/10 text-violet-300 border-violet-400/30",
  "Brand Value": "bg-amber-400/10 text-amber-300 border-amber-400/30",
  "Research": "bg-blue-400/10 text-blue-300 border-blue-400/30",
  "Governance": "bg-slate-400/10 text-slate-300 border-slate-400/30",
};

/* ══════════════════════════════════════════════════════
   THE 9 INTEL DIMENSIONS SPECIFICATION
   ══════════════════════════════════════════════════════ */

export interface DimensionSpec {
  id: string;
  num: string;
  systemTag: string;
  name: string;
  tagline: string;
  icon: typeof Target;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  metric: string;
  metricLabel: string;
  microViz: {
    label: string;
    value: string;
    percent: number;
    subLabel: string;
  };
  dayRange: string;
  articleCount: number;
  description: string;
  strategicContext: string;
  keyInsights: string[];
  tags: string[];
  relatedBusinessTags: BusinessTag[];
  sources: string[];
}

const NINE_DIMENSIONS: DimensionSpec[] = [
  {
    id: "sports-intel",
    num: "01",
    systemTag: "01 // CORE DATA",
    name: "Sports Intelligence",
    tagline: "Ball-by-ball tactical leverage & boundary trajectories",
    icon: Target,
    color: "text-red-400",
    badgeBg: "bg-red-500/10",
    badgeBorder: "border-red-500/30",
    badgeText: "text-red-400",
    metric: "295,732",
    metricLabel: "Deliveries Analyzed",
    microViz: {
      label: "Phase Dot-Ball Impact",
      value: "PP 34% · Mid 45% · Dth 21%",
      percent: 78,
      subLabel: "78.4% Win Correlation in Middle Overs"
    },
    dayRange: "Days 1–15",
    articleCount: 15,
    description: "Granular on-field data covering pace vs spin splits, phase-wise win probability deltas, wagon wheel trajectories, and Impact Player inflation.",
    strategicContext: "The introduction of the Impact Player rule permanently elevated par scores from 170 to 205+. Winning teams now optimize for dot-ball reduction in middle overs rather than wicket preservation.",
    keyInsights: [
      "Middle overs (7–15) dot-ball percentage predicts match outcome with 78.4% correlation.",
      "Right-arm pace back-of-length bowling yields 41.2% dot percentage in powerplays.",
      "Death overs boundary rate increased by 22.4% following the Impact Player substitution."
    ],
    tags: ["Tactical Splits", "Phase Control", "Win Probability", "Dot Ball %"],
    relatedBusinessTags: ["Media Rights"],
    sources: ["Cricsheet Ball-by-Ball Match Archive", "ESPNcricinfo Commentary Matrix", "Vishal Misra Research"]
  },
  {
    id: "fan-psychology",
    num: "02",
    systemTag: "02 // BEHAVIORAL",
    name: "Fan Psychology",
    tagline: "Tribalism, emotional grief-to-glory arcs & loyalty paradoxes",
    icon: Brain,
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-400",
    metric: "92.6 / 100",
    metricLabel: "CSK Brand Strength Index",
    microViz: {
      label: "Tribal Loyalty Score",
      value: "92.6% BSI",
      percent: 93,
      subLabel: "Asian Franchise All-Time Record"
    },
    dayRange: "Days 16–25",
    articleCount: 10,
    description: "The cognitive and emotional architecture of cricket fandom. Analyzes team allegiance retention, the Dhoni farewell paradox, and RCB's sustained brand premium.",
    strategicContext: "IPL fandom behaves closer to religious devotion than consumer entertainment. High emotional equity insulates franchises against down cycles in competitive standings.",
    keyInsights: [
      "CSK maintains a 92.6/100 Brand Strength Index (BSI) — highest across all Asian sporting franchises.",
      "RCB achieves 94% merchandise sell-out velocity regardless of playoff qualification status.",
      "Defeat in high-leverage final overs creates a 3.4x spike in next-match engagement."
    ],
    tags: ["Fandom Index", "Emotional Arcs", "Tribal Allegiance", "Loyalty Curve"],
    relatedBusinessTags: ["Brand Value", "Franchise Economics"],
    sources: ["Brand Finance IPL Valuations", "Balu Nayar Game Theory Papers", "BARC India Audience Analytics"]
  },
  {
    id: "product-gamification",
    num: "03",
    systemTag: "03 // GAMIFICATION",
    name: "Product & Gamification",
    tagline: "Fantasy GMV, live predictor micro-loops & rewards",
    icon: Gamepad2,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
    metric: "₹16,500 Cr",
    metricLabel: "Annual Fantasy GMV",
    microViz: {
      label: "In-Play Engagement Surge",
      value: "4.2x Death Lift",
      percent: 85,
      subLabel: "180M+ Active Gamification Participants"
    },
    dayRange: "Days 26–35",
    articleCount: 10,
    description: "The digital gamification engine turning casual viewers into active game participants through fantasy team creation, ball-by-ball predictions, and loyalty points.",
    strategicContext: "Fantasy sports create vested emotional interest in dead rubbers and neutral fixtures, lifting overall league broadcast impressions by 35%.",
    keyInsights: [
      "Over 180M active users assemble fantasy teams across Indian sports platforms during the IPL window.",
      "In-play micro-predictions (e.g. next ball wicket/six) generate 4.2x engagement during death overs.",
      "All-rounders with top-4 batting roles command 88% captaincy share in daily fantasy leagues."
    ],
    tags: ["Fantasy Leagues", "Live Predictors", "Micro-Interactions", "User Retention"],
    relatedBusinessTags: ["Sponsorship", "Streaming"],
    sources: ["Dream11 Industry Reports", "SportsMint Research", "Federation of Indian Fantasy Sports"]
  },
  {
    id: "second-screen",
    num: "04",
    systemTag: "04 // REAL-TIME",
    name: "Second-Screen Economy",
    tagline: "Live streaming companion discourse, memes & social velocity",
    icon: Smartphone,
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
    badgeText: "text-cyan-400",
    metric: "68.4%",
    metricLabel: "Dual-Screen Viewers",
    microViz: {
      label: "Meme Velocity Latency",
      value: "<90s Peak",
      percent: 68,
      subLabel: "Synchronized Brand Recall 2.8x Higher"
    },
    dayRange: "Days 36–45",
    articleCount: 10,
    description: "The symbiotic digital ecosystem where TV broadcast consumption happens alongside real-time discourse on X, Reddit match threads, and private WhatsApp groups.",
    strategicContext: "Viewers no longer watch sports in isolation. Cultural moments, memes, and brand recall are minted on the second screen while the ball is traveling to the rope.",
    keyInsights: [
      "68.4% of viewers under 35 actively browse live feeds or social commentary during televised play.",
      "Meme volume peaks within 90 seconds of a dropped catch, DR review, or contentious umpire call.",
      "Real-time synchronized brand campaigns across OTT and social generate 2.8x higher recall than static TV spots."
    ],
    tags: ["Live Threads", "Social Velocity", "Meme Ecosystem", "Dual Consumption"],
    relatedBusinessTags: ["Streaming", "Sponsorship"],
    sources: ["X (Twitter) Sports Trend Reports", "Avanish Singh Digital Livestreaming Context", "BARC India"]
  },
  {
    id: "attention-economy",
    num: "05",
    systemTag: "05 // ATTENTION",
    name: "Attention Economy",
    tagline: "Short-form highlight dominance vs 4-hour linear match retention",
    icon: Eye,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-400",
    metric: "4.8 Billion",
    metricLabel: "Weekly Video Impressions",
    microViz: {
      label: "Short-Form Clip Duration",
      value: "32s Avg Watch",
      percent: 74,
      subLabel: "384.6B Annual Tournament Watch-Minutes"
    },
    dayRange: "Days 46–55",
    articleCount: 10,
    description: "The battle for sports attention spans. How bite-sized reels, smart clips, and 60-second recaps compete with traditional 240-minute linear cricket broadcasts.",
    strategicContext: "Linear 4-hour retention is dropping among Gen-Z, compensated by explosive consumption of snackable short-form highlights and creator commentary.",
    keyInsights: [
      "4.8B video views generated weekly across Instagram Reels and YouTube Shorts during tournament peak.",
      "32-second average viewer watch duration for individual highlight clips on mobile platforms.",
      "Live match drop-off occurs 3x faster when target requirements exceed 14 runs per over past over 12."
    ],
    tags: ["Short-form Video", "Viewer Churn", "Micro-Moments", "Format Evolution"],
    relatedBusinessTags: ["Streaming", "Media Rights"],
    sources: ["Brand Finance 384.6bn Watch-Minutes", "SportsMint Media Viewership", "BARC India"]
  },
  {
    id: "broadcast-media",
    num: "06",
    systemTag: "06 // BROADCAST",
    name: "Broadcast & Media",
    tagline: "Digital OTT vs Linear TV rights split & regional streams",
    icon: Tv,
    color: "text-violet-400",
    badgeBg: "bg-violet-500/10",
    badgeBorder: "border-violet-500/30",
    badgeText: "text-violet-400",
    metric: "$6.2 Billion",
    metricLabel: "Media Rights (2023–27)",
    microViz: {
      label: "OTT vs TV Split",
      value: "54% OTT · 46% TV",
      percent: 54,
      subLabel: "$13.4M per Match Value (#2 Globally)"
    },
    dayRange: "Days 56–67",
    articleCount: 12,
    description: "The economics of sports broadcasting: the Star Sports TV vs JioCinema digital split, 4K multi-angle feeds, immersive commentary in 12 languages, and ad-slot inventory.",
    strategicContext: "IPL is the second-most valuable sporting league in the world per match ($13.4M), trailing only the NFL. Digital streaming surpassed linear TV viewership for the first time in 2024.",
    keyInsights: [
      "$6.2B aggregate rights value across 2023–27 cycle ($13.4M per match broadcast value).",
      "Over 12 Indian regional languages offered simultaneously on OTT feeds, increasing tier-2 town reach by 44%.",
      "4K 50fps HDR multi-camera angles drive 38% higher digital session duration compared to default feeds."
    ],
    tags: ["Media Rights", "Per-Match Value", "Multi-Language", "OTT Streaming"],
    relatedBusinessTags: ["Media Rights", "Streaming"],
    sources: ["Wikipedia IPL Television Rights", "SportsMint JioCinema Data", "BCCI Tender Documentation"]
  },
  {
    id: "business-revenue",
    num: "07",
    systemTag: "07 // VALUATION",
    name: "Business & Revenue",
    tagline: "Franchise P&L, central BCCI distribution & sponsorship tiers",
    icon: Banknote,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-400",
    metric: "$10.7 Billion",
    metricLabel: "Peak Ecosystem Valuation",
    microViz: {
      label: "Central Pool Guaranteed Share",
      value: "72% Revenue",
      percent: 72,
      subLabel: "₹400+ Cr Annual Payout per Franchise"
    },
    dayRange: "Days 68–79",
    articleCount: 12,
    description: "Franchise economics, central revenue pool sharing, stadium gate receipts, title and jersey sponsorship rates, and private equity ownership structures.",
    strategicContext: "Franchises operate as ultra-high-margin cash cows. 70%+ of annual revenues arrive guaranteed from the central media pool, de-risking operational losses.",
    keyInsights: [
      "IPL ecosystem brand value reached $10.7B, growing +433% since inaugural 2008 season.",
      "Central media rights pool pays out ₹400+ Cr annually to each franchise prior to private sponsorships.",
      "Tata Title Sponsorship commands ₹2,500 Cr over 5 years (₹500 Cr per season)."
    ],
    tags: ["Franchise Valuations", "Central Pool", "Sponsorship Tiers", "EBITDA Margin"],
    relatedBusinessTags: ["Brand Value", "Franchise Economics", "Sponsorship"],
    sources: ["Brand Finance Decacorn Report", "The Hindu IPL Business Model", "Cricklytix Revenue Breakdown"]
  },
  {
    id: "player-brand",
    num: "08",
    systemTag: "08 // PERSONAL IP",
    name: "Player Brand Economy",
    tagline: "Endorsement indices, auction purse multiples & digital IP",
    icon: Users,
    color: "text-pink-400",
    badgeBg: "bg-pink-500/10",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-400",
    metric: "₹250+ Cr",
    metricLabel: "Top Player Endorsement Value",
    microViz: {
      label: "Purse-to-Sponsor Multiplier",
      value: "2.35x Multiplier",
      percent: 82,
      subLabel: "Combined Social Reach 280M+ Fans"
    },
    dayRange: "Days 80–89",
    articleCount: 10,
    description: "The commercialization of player personal brands. How auction prices compare to off-field sponsorship earnings, social media follower monetization, and personal IP equity.",
    strategicContext: "Star players earn up to 4x their IPL auction purse in commercial brand endorsements during the tournament's 60-day calendar window alone.",
    keyInsights: [
      "Virat Kohli and MS Dhoni account for over ₹250 Cr each in annual active commercial endorsement contracts.",
      "1 IPL auction bid rupee generates an estimated ₹2.35 in ancillary sponsor exposure for tier-1 players.",
      "Top-3 Indian cricketers command a combined social media following of over 280 million fans."
    ],
    tags: ["Endorsement Index", "Personal IP", "Auction Multiples", "Commercial Value"],
    relatedBusinessTags: ["Brand Value", "Sponsorship"],
    sources: ["Brand Finance Player Valuation Studies", "Wikipedia Auction History", "Social Blade Reach Metrics"]
  },
  {
    id: "strategy-market",
    num: "09",
    systemTag: "09 // STRATEGY",
    name: "Strategy & Economic Intel",
    tagline: "Mega-auction purse optimization & multi-franchise global ownership",
    icon: TrendingUp,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-400",
    metric: "₹120 Cr",
    metricLabel: "Team Purse Cap (2025/26)",
    microViz: {
      label: "Top 3 Retentions Share",
      value: "45% Purse Cap",
      percent: 45,
      subLabel: "7/10 Franchises Own Global Affiliates"
    },
    dayRange: "Days 90–100",
    articleCount: 11,
    description: "Squad construction game theory, RTM (Right to Match) valuation curves, player aging decay curves, and multi-franchise global networks (SA20, MLC, ILT20, CPL).",
    strategicContext: "Top franchises have evolved into global cricket conglomerates. Ownership of year-round teams across 4 continents amortizes scouting costs and locks in player contracts.",
    keyInsights: [
      "7 out of 10 IPL franchises now own sister franchises in SA20, MLC, ILT20, or the CPL.",
      "Pace bowling all-rounders command a 38% price premium at mega-auctions relative to pure specialists.",
      "Optimal purse allocation targets 45% on top 3 marquee retentions, leaving ₹66 Cr for remaining squad depth."
    ],
    tags: ["Purse Theory", "RTM Arbitrage", "Global Franchises", "Squad Construction"],
    relatedBusinessTags: ["Franchise Economics", "Global Expansion", "Governance"],
    sources: ["College Simplified Franchise Model", "CricSA IPL 2026 Sponsors", "Wikipedia Tournament History"]
  }
];

type MainTab = "9 Dimensions" | "100-Day Engine" | "Top Stories" | "Data Desk" | "Business" | "Sources";
const MAIN_TABS: MainTab[] = ["9 Dimensions", "100-Day Engine", "Top Stories", "Data Desk", "Business", "Sources"];

/* ══════════════════════════════════════════════════════
   SMALL REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-2 font-mono">
      {children}
    </div>
  );
}

function TagChip({ text, cls }: { text: string; cls?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${cls ?? "bg-white/5 border-white/10 text-white/40"}`}>
      {text}
    </span>
  );
}

function DateBadge({ iso }: { iso: string }) {
  if (!iso) return null;
  const d = new Date(iso);
  const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <span className="inline-flex items-center gap-1 text-[9px] text-white/30 font-bold uppercase tracking-widest">
      <Calendar className="w-3 h-3" />{label}
    </span>
  );
}

/* Master reference list */
const ALL_PROJECT_REFERENCES = [
  {
    group: "Ball-by-ball match data",
    items: [
      { label: "Cricsheet — ball-by-ball match archive", url: "https://cricsheet.org/", use: `Primary delivery record for all 1,243 matches (2008–2026)`, cat: "Ball Data" },
      { label: "ESPNcricinfo — ball-by-ball commentary", url: "https://www.espncricinfo.com/", use: `Commentary text behind 293,652 deliveries — length, line, variation, shot, zone`, cat: "Ball Data" },
      { label: "Wikipedia — Indian Premier League", url: "https://en.wikipedia.org/wiki/Indian_Premier_League", use: "Squads, auction prices, points tables, captaincy records, tournament history", cat: "Ball Data" },
    ],
  },
  {
    group: "Broadcast & media rights",
    items: [
      { label: "Wikipedia — Indian Premier League on television", url: "https://en.wikipedia.org/wiki/Indian_Premier_League_on_television", use: "Rights cycle values: 2008–17 ($1.03bn) · 2018–22 ($2.55bn) · 2023–27 ($6.2bn) · per-match value ($13.4m) · digital vs TV split", cat: "Media Rights" },
      { label: "SportsMint — JioCinema IPL 2023 viewership", url: "https://sportsmintmedia.com/jiocinema-hits-it-out-of-the-park-by-gathering-record-breaking-viewership-throughout-ipl-2023/", use: "Streaming viewership benchmarks for JioCinema's debut season", cat: "Media Rights" },
      { label: "Avanish Singh — digital media & livestreaming", url: "https://www.linkedin.com/posts/avanish-singh-720672265_digitalmedia-advertising-livestreaming-share-7436258086950064128-qCdH/", use: "Digital advertising and livestreaming market context", cat: "Media Rights" },
      { label: "BARC India — television audience measurement", url: "https://www.barcindia.co.in/", use: "Television reach and ratings benchmarks", cat: "Media Rights" },
    ],
  },
  {
    group: "Brand value & franchise economics",
    items: [
      { label: "Brand Finance — IPL surges into decacorn territory (+28%)", url: "https://brandfinance.com/press-releases/ipl-surges-into-decacorn-territory-with-28-brand-value-growth-now-exceeding-10-billion", use: "Ecosystem brand value $10.7bn (2023), +433% since 2008, franchise valuations", cat: "Brand Value" },
      { label: "Brand Finance — IPL 2025 under geopolitical volatility", url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate", use: "2024 → 2025 value drop ($12bn → $9.6bn), brand strength index (CSK 92.6/100), 384.6bn watch-minutes", cat: "Brand Value" },
      { label: "The Hindu — Explained: the IPL business model", url: "https://www.thehindu.com/sport/cricket/", use: "Revenue model overview and industry comparison", cat: "Brand Value" },
      { label: "College Simplified — decoding the IPL franchise model", url: "https://www.collegesimplified.in/", use: "Franchise revenue stream breakdown", cat: "Brand Value" },
      { label: "Cricklytix — how IPL teams make money", url: "https://cricklytix.com/", use: "Franchise revenue streams: media pool, gate, sponsorship, merchandise", cat: "Brand Value" },
    ],
  },
  {
    group: "Sponsorship & sales strategy",
    items: [
      { label: "CricSA — IPL 2026 sponsors list", url: "https://cricsa.co.za/ipl-2026-sponsors-list/", use: "Title, jersey and category sponsor mapping for 2026", cat: "Media Rights" },
      { label: "Indraneel Sahu — IPL sales strategy", url: "https://www.linkedin.com/posts/indraneel-sahu-46569a142_ipl-sales-strategy-share-7441457339724963840-5Ks0/", use: "Sponsorship tier structure and sales strategy", cat: "Media Rights" },
    ],
  },
  {
    group: "Cricket analytics research",
    items: [
      { label: "Vishal Misra — The Impact Player Treadmill (Medium)", url: "https://medium.com/@vishalmisra/the-impact-player-treadmill-b25749674b12", use: "Published finding independently replicated by this engine: toss win rate, scoring inflation 2023+", cat: "Research" },
      { label: "Vishal Misra — cricket analytics papers (Columbia University)", url: "http://www.cs.columbia.edu/~misra/other.html", use: "Delta metric, Set-Batter Paradox, Left-Right Partnership Myth, Five Bowlers in Eighteen Years", cat: "Research" },
      { label: "Balu Nayar — The Strange Game Theory of Anonymous Altruism", url: "https://www.linkedin.com/pulse/strange-game-theory-anonymous-altruism-balu-nayar-ezcxc", use: "Network design and cooperation framing — basis of fan-psychology layer methodology", cat: "Research" },
    ],
  },
];

/* ══════════════════════════════════════════════════════
   100-DAY ARTICLE MODAL READER
   ══════════════════════════════════════════════════════ */

interface ArticleModalProps {
  article: ContentArticle | null;
  onClose: () => void;
  onSelectArticle: (article: ContentArticle) => void;
}

function ArticleReaderModal({ article, onClose, onSelectArticle }: ArticleModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const currentIdx = CONTENT_ENGINE_100.findIndex(a => a.day === article.day);
  const prevArticle = currentIdx > 0 ? CONTENT_ENGINE_100[currentIdx - 1] : null;
  const nextArticle = currentIdx < CONTENT_ENGINE_100.length - 1 ? CONTENT_ENGINE_100[currentIdx + 1] : null;

  // Render markdown text with headers, paragraphs, and list items
  const renderArticleBody = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length === 0) return;
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-3 space-y-2 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    };

    let adInjected = false;
    const adTarget = Math.max(2, Math.floor(lines.length * 0.45));

    lines.forEach((line, i) => {
      if (line.startsWith("* ") || line.startsWith("- ")) {
        inList = true;
        listItems.push(line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1"));
        return;
      }
      if (inList) flushList();

      // Native In-Article Ad ~45% into article
      if (!adInjected && i >= adTarget && (line.startsWith("## ") || line.trim() === "")) {
        adInjected = true;
        elements.push(
          <div key="in-article-ad" className="my-8 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">ADVERTISEMENT · IN-ARTICLE DOSSIER</span>
              <span className="text-[8px] font-mono text-cyan-400/60 uppercase">SPONSORED BRIEFING</span>
            </div>
            <AdVessel slot="5847392015" format="horizontal" minHeight={90} label="In-Article Analytical Briefing" />
          </div>
        );
      }

      if (line.startsWith("## ")) {
        elements.push(
          <h3 key={i} className="text-sm font-black text-white uppercase tracking-wider mt-7 mb-3 border-l-2 border-cyan-400 pl-3">
            {line.slice(3)}
          </h3>
        );
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <div key={i} className="flex items-start gap-3 my-2 text-xs text-white/80 leading-relaxed">
            <span className="font-mono text-cyan-400 font-bold shrink-0">{line.match(/^\d+\./)?.[0]}</span>
            <span>{line.replace(/^\d+\.\s/, "")}</span>
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-2" />);
      } else {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={i} className="text-xs text-white/70 leading-relaxed my-2">
            {parts.map((part, pi) =>
              pi % 2 === 1
                ? <strong key={pi} className="text-white font-bold">{part}</strong>
                : part
            )}
          </p>
        );
      }
    });

    if (inList) flushList();
    return elements;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#0A0F1D] border border-cyan-900/40 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* MODAL TOP BAR */}
        <div className="p-4 sm:px-6 bg-[#0E1528] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
              DAY {article.day < 10 ? `0${article.day}` : article.day}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-white/50 hidden sm:inline">
              // {article.dimension}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {prevArticle && (
              <button
                onClick={() => onSelectArticle(prevArticle)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-[11px] flex items-center gap-1 font-mono"
                title={`Day ${prevArticle.day}: ${prevArticle.title}`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden md:inline">Day {prevArticle.day}</span>
              </button>
            )}
            {nextArticle && (
              <button
                onClick={() => onSelectArticle(nextArticle)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-[11px] flex items-center gap-1 font-mono"
                title={`Day ${nextArticle.day}: ${nextArticle.title}`}
              >
                <span className="hidden md:inline">Day {nextArticle.day}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all ml-2"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL SCROLLABLE CONTENT */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
          {/* ARTICLE HEADER */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap text-[10px] font-mono">
              <span className="text-cyan-400 font-bold uppercase">{article.dimension}</span>
              <span className="text-white/20">•</span>
              <span className="text-white/40 flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
              <span className="text-white/20">•</span>
              <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Peer-Verified Telemetry</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-snug">
              {article.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
              {article.subtitle}
            </p>
          </div>

          {/* HERO METRIC DISPLAY */}
          <div className="bg-[#0D1424] border border-cyan-900/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 block mb-0.5">
                {article.metricLabel}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
                {article.metric}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/60">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* KEY EMPIRICAL TAKEAWAYS BOX */}
          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 sm:p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block mb-3 font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Key Empirical Takeaways
            </span>
            <div className="space-y-2.5">
              {article.keyTakeaways.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN ARTICLE BODY */}
          <div className="pt-2 text-white/80">
            {renderArticleBody(article.body)}
          </div>

          {/* FOOTER NAVIGATION */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[10px] font-mono text-white/40">
              Curriculum Day {article.day} of 100 · Sourced from 295,732 Deliveries
            </div>
            {nextArticle && (
              <button
                onClick={() => onSelectArticle(nextArticle)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Read Day {nextArticle.day} Dossier</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   100-DAY CONTENT ENGINE BROWSER
   ══════════════════════════════════════════════════════ */

interface ContentEngineBrowserProps {
  onSelectArticle: (article: ContentArticle) => void;
  filterDimensionId?: string | null;
  searchQuery?: string;
}

function ContentEngineBrowser({
  onSelectArticle,
  filterDimensionId = null,
  searchQuery = "",
}: ContentEngineBrowserProps) {
  const [selectedDim, setSelectedDim] = useState<string | null>(filterDimensionId);
  const [dayRange, setDayRange] = useState<"all" | "1-25" | "26-50" | "51-75" | "76-100">("all");
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync with parent filterDimensionId when it changes
  useEffect(() => {
    if (filterDimensionId !== undefined) {
      setSelectedDim(filterDimensionId);
    }
  }, [filterDimensionId]);

  useEffect(() => {
    if (searchQuery) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    return CONTENT_ENGINE_100.filter(a => {
      // Dimension filter
      if (selectedDim && a.dimensionId !== selectedDim) return false;

      // Day range filter
      if (dayRange === "1-25" && (a.day < 1 || a.day > 25)) return false;
      if (dayRange === "26-50" && (a.day < 26 || a.day > 50)) return false;
      if (dayRange === "51-75" && (a.day < 51 || a.day > 75)) return false;
      if (dayRange === "76-100" && (a.day < 76 || a.day > 100)) return false;

      // Search query filter
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(q);
        const matchesSubtitle = a.subtitle.toLowerCase().includes(q);
        const matchesDim = a.dimension.toLowerCase().includes(q);
        const matchesTag = a.tags.some(t => t.toLowerCase().includes(q));
        const matchesDay = `day ${a.day}`.includes(q) || String(a.day) === q;
        if (!matchesTitle && !matchesSubtitle && !matchesDim && !matchesTag && !matchesDay) {
          return false;
        }
      }

      return true;
    });
  }, [selectedDim, dayRange, localSearch]);

  return (
    <div className="space-y-5">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <SectionLabel>Curriculum Archive</SectionLabel>
            </div>
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              IPL 100-Day Content Engine
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Comprehensive 100-day analytical curriculum covering sports telemetry, fan psychology, media valuation, and market strategy.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-3 py-1.5 rounded-xl">
            <Database className="w-3.5 h-3.5" />
            <span>{filteredArticles.length} of 100 Dossiers Available</span>
          </div>
        </div>

        {/* CONTROLS: DIMENSION CHIPS & DAY RANGES */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* Day range chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-white/30 mr-1">RANGE:</span>
            {[
              { id: "all", label: "All 100 Days" },
              { id: "1-25", label: "Days 1–25" },
              { id: "26-50", label: "Days 26–50" },
              { id: "51-75", label: "Days 51–75" },
              { id: "76-100", label: "Days 76–100" },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDayRange(r.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  dayRange === r.id
                    ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                    : "bg-white/5 text-white/40 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Inline Filter Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Filter topics, metrics, tags..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* DIMENSION SELECTOR CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1">
          <button
            onClick={() => setSelectedDim(null)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
              selectedDim === null
                ? "bg-purple-600 text-white font-bold"
                : "bg-white/5 text-white/40 hover:text-white"
            }`}
          >
            All Dimensions (100)
          </button>
          {NINE_DIMENSIONS.map(d => {
            const isSelected = selectedDim === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDim(isSelected ? null : d.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                    : "bg-white/5 text-white/40 hover:text-white"
                }`}
              >
                {d.num} {d.name} ({d.articleCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* ARTICLES CARDS GRID */}
      {filteredArticles.length === 0 ? (
        <div className="p-12 text-center bg-[#0B1020] border border-white/10 rounded-2xl space-y-2">
          <Database className="w-8 h-8 text-white/20 mx-auto" />
          <div className="text-sm font-bold text-white">No Curriculum Dossiers Match Your Filter</div>
          <p className="text-xs text-white/40">Try adjusting your day range or search query.</p>
          <button
            onClick={() => { setSelectedDim(null); setDayRange("all"); setLocalSearch(""); }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-mono hover:bg-white/20 transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map(art => (
            <div
              key={art.day}
              onClick={() => onSelectArticle(art)}
              className="bg-[#0B1020] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.02] transition-all cursor-pointer group shadow-lg"
            >
              <div>
                {/* CARD TOP ROW */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                    DAY {art.day < 10 ? `0${art.day}` : art.day}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{art.readTime}
                  </span>
                </div>

                {/* DIMENSION & TITLE */}
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                  {art.dimension}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors leading-snug mb-2 line-clamp-2">
                  {art.title}
                </h3>
                <p className="text-xs text-white/50 line-clamp-2 leading-relaxed mb-4">
                  {art.subtitle}
                </p>

                {/* HERO METRIC CALLOUT */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 mb-3">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/40 block mb-0.5">
                    {art.metricLabel}
                  </span>
                  <span className="text-sm font-mono font-black text-amber-400">
                    {art.metric}
                  </span>
                </div>
              </div>

              <div>
                {/* TAGS */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {art.tags.slice(0, 3).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-mono text-white/50">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* ACTION FOOTER */}
                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold text-white/40 group-hover:text-cyan-400 transition-colors">
                  <span>Inspect Day {art.day} Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   9 DIMENSIONS VIEW WITH PROGRESSIVE DRILL-DOWN
   ══════════════════════════════════════════════════════ */

interface NineDimensionsViewProps {
  selectedDimId: string | null;
  onSelectDim: (id: string | null) => void;
  onOpenArticle: (article: ContentArticle) => void;
  businessArticles: BusinessArticle[];
}

function NineDimensionsView({
  selectedDimId,
  onSelectDim,
  onOpenArticle,
  businessArticles,
}: NineDimensionsViewProps) {
  const selectedDim = useMemo(
    () => NINE_DIMENSIONS.find(d => d.id === selectedDimId) ?? null,
    [selectedDimId]
  );

  const dimensionTopics = useMemo(() => {
    if (!selectedDim) return [];
    return getArticlesByDimension(selectedDim.id);
  }, [selectedDim]);

  const matchingBusinessArticles = useMemo(() => {
    if (!selectedDim) return [];
    return businessArticles.filter(ba =>
      ba.tags.some(t => selectedDim.relatedBusinessTags.includes(t))
    );
  }, [selectedDim, businessArticles]);

  return (
    <div className="space-y-6">
      {/* DRILL-DOWN HEADER WHEN A DIMENSION IS ACTIVE */}
      {selectedDim && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-[#0B1020] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectDim(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to 9 Grid</span>
            </button>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <span className="text-xs font-mono text-white/50 hidden sm:inline">
              Dimension {selectedDim.num} // {selectedDim.name}
            </span>
          </div>

          <div className="text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-3 py-1 rounded-xl">
            {dimensionTopics.length} Curriculum Topics in 100-Day Series
          </div>
        </div>
      )}

      {/* 3x3 BENTO GRID VIEW (OVERVIEW) */}
      {!selectedDim && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {NINE_DIMENSIONS.map(dim => {
            const Icon = dim.icon;
            return (
              <GlassCard
                key={dim.id}
                className="p-5 cursor-pointer hover:border-cyan-500/50 hover:bg-white/[0.04] transition-all group flex flex-col justify-between"
                onClick={() => onSelectDim(dim.id)}
              >
                <div>
                  {/* MONOSPACE TOP TAG & ICON */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${dim.badgeBg} border ${dim.badgeBorder} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${dim.color}`} />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-white/40 block">
                          {dim.systemTag}
                        </span>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors">
                          {dim.name}
                        </h4>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </div>

                  <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-4">
                    {dim.tagline}
                  </p>

                  {/* HERO METRIC DISPLAY */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 block mb-0.5">
                      {dim.metricLabel}
                    </span>
                    <span className="text-lg font-black font-mono text-amber-400">
                      {dim.metric}
                    </span>
                  </div>

                  {/* MICRO-VISUALIZER COMPONENT */}
                  <div className="bg-[#050816]/60 border border-white/5 rounded-xl p-2.5 mb-4">
                    <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                      <span className="text-white/40">{dim.microViz.label}</span>
                      <span className="text-cyan-300 font-bold">{dim.microViz.value}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${dim.microViz.percent}%` }}
                      />
                    </div>
                    <div className="text-[8px] font-mono text-white/30 mt-1">
                      {dim.microViz.subLabel}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dim.tags.slice(0, 3).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/50">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono font-bold text-white/40 group-hover:text-cyan-400 transition-colors">
                    <span>Inspect Strategic Dossier ({dim.articleCount} Topics)</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* DEDICATED PROGRESSIVE DRILL-DOWN VIEW */}
      {selectedDim && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* DOSSIER HEADER CARD */}
          <GlassCard className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${selectedDim.badgeBg} border ${selectedDim.badgeBorder} flex items-center justify-center`}>
                  {React.createElement(selectedDim.icon, { className: `w-6 h-6 ${selectedDim.color}` })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-mono font-bold text-white/60">
                      DIMENSION {selectedDim.num}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      Strategic Intelligence Dossier
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">
                    {selectedDim.name}
                  </h2>
                </div>
              </div>

              <div className="bg-[#050816] border border-white/10 rounded-xl px-4 py-2 text-right">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 block">
                  {selectedDim.metricLabel}
                </span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {selectedDim.metric}
                </span>
              </div>
            </div>

            <p className="text-sm text-white/80 leading-relaxed max-w-4xl mb-4">
              {selectedDim.description}
            </p>

            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 block mb-1">
                Strategic Market Mandate (2026–2027 Cycle)
              </span>
              <p className="text-xs text-white/70 leading-relaxed">
                {selectedDim.strategicContext}
              </p>
            </div>
          </GlassCard>

          {/* KEY EMPIRICAL FINDINGS */}
          <div>
            <SectionLabel>Empirically Verified Findings</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedDim.keyInsights.map((insight, idx) => (
                <GlassCard key={idx} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-bold text-white/40">FINDING #{idx + 1}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {insight}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-white/5 text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Empirically Verified</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* DEDICATED 100-DAY CONTENT TOPICS FOR THIS DIMENSION */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{selectedDim.name} — 100-Day Curriculum Topics</SectionLabel>
              <span className="text-xs font-mono text-cyan-400">{dimensionTopics.length} Topics</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dimensionTopics.map(topic => (
                <div
                  key={topic.day}
                  onClick={() => onOpenArticle(topic)}
                  className="bg-[#0B1020] border border-white/10 hover:border-cyan-400/40 rounded-xl p-4 flex flex-col justify-between hover:bg-white/[0.03] transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-mono font-bold">
                        DAY {topic.day < 10 ? `0${topic.day}` : topic.day}
                      </span>
                      <span className="text-[9px] font-mono text-white/40">{topic.readTime}</span>
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight group-hover:text-cyan-400 transition-colors leading-snug mb-1">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed mb-3">
                      {topic.subtitle}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40 group-hover:text-white">
                    <span className="text-amber-400 font-bold">{topic.metric}</span>
                    <span className="flex items-center gap-1">Read Dossier <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LINKED BUSINESS & MARKET READS */}
          {matchingBusinessArticles.length > 0 && (
            <div>
              <SectionLabel>Market & Business Intelligence in this Sector</SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingBusinessArticles.map(ba => (
                  <BusinessCard key={ba.id} article={ba} />
                ))}
              </div>
            </div>
          )}

          {/* SOURCING & ATTRIBUTION CARD */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Verified Data Sources & Methodology</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedDim.sources.map(src => (
                <div key={src} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/70">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{src}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SPONSORED TELEMETRY DOCK (300PX RAIL)
   ══════════════════════════════════════════════════════ */

function SponsoredTelemetryDock() {
  return (
    <aside className="space-y-4">
      {/* TERMINAL HEADER */}
      <div className="bg-[#0B1020] border border-cyan-900/40 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
              SPONSORED TELEMETRY DOCK
            </span>
          </div>
          <span className="text-[8px] font-mono text-white/30 uppercase">PARTNER DESK</span>
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed font-mono">
          Native partner terminals, algorithmic liquidity desk, and accredited institutional sponsorship feeds.
        </p>
      </div>

      {/* AD CONTAINER 1: 300x250 RECTANGLE VESSEL */}
      <div className="bg-[#0D131F] border border-cyan-900/40 rounded-2xl p-3 shadow-xl relative overflow-hidden">
        <div className="text-center mb-2">
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">
            ADVERTISEMENT · INSTITUTIONAL TERMINAL
          </span>
        </div>
        <AdVessel
          slot="3492810573"
          format="rectangle"
          minHeight={250}
          label="Institutional Partner Terminal"
        />
      </div>

      {/* QUANT PARTNER TELEMETRY CONTEXT CARD */}
      <div className="bg-[#090D18] border border-white/10 rounded-2xl p-4 space-y-3 font-mono">
        <div className="flex items-center justify-between text-[9px] text-white/40">
          <span className="text-cyan-400 font-bold uppercase">QUANT DESK // BRIEFING</span>
          <span>99.98% UPTIME</span>
        </div>
        <div className="text-xs text-white/80 font-bold leading-snug">
          Real-Time Match Odds & Portfolio Hedging Models
        </div>
        <div className="text-[10px] text-white/40 leading-relaxed">
          Dynamic valuation indices updating across live deliveries. Certified compliant with Google AdSense native policies.
        </div>
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/30">
          <span>Latency: 12ms</span>
          <span className="text-emerald-400">● Zero-Loss Sync</span>
        </div>
      </div>

      {/* AD CONTAINER 2: IN-FEED MICRO BANNER */}
      <div className="bg-[#0D131F] border border-cyan-900/40 rounded-2xl p-3 shadow-xl">
        <div className="text-center mb-1">
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">
            ADVERTISEMENT · MARKET SPONSOR
          </span>
        </div>
        <AdVessel
          slot="8923741052"
          format="in-feed"
          minHeight={120}
          label="Market Feed Sponsor"
        />
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════
   BUSINESS TAB & BUSINESS CARD
   ══════════════════════════════════════════════════════ */

function BusinessCard({ article }: { article: BusinessArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-[#0B1020] border border-white/10 rounded-[20px] p-5 hover:border-cyan-400/40 hover:bg-white/[0.03] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap gap-1">
          {article.tags.map(t => (
            <span key={t} className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${TAG_COLOR[t]}`}>
              {t}
            </span>
          ))}
        </div>
        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
      </div>
      <h3 className="text-[14px] font-black text-white leading-snug mb-1.5 group-hover:text-cyan-400 transition-colors">
        {article.title}
      </h3>
      <p className="text-[12px] text-white/45 leading-relaxed mb-3">{article.excerpt}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30">
          <Globe className="w-3 h-3" />
          {article.source}
        </div>
        {article.published && <DateBadge iso={article.published + "-01"} />}
      </div>
    </a>
  );
}

function BusinessTab({ articles }: { articles: BusinessArticle[] }) {
  const [activeTag, setActiveTag] = useState<BusinessTag | null>(null);

  const filtered = activeTag
    ? articles.filter(a => a.tags.includes(activeTag))
    : articles;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6">
        <SectionLabel>IPL business & media intelligence</SectionLabel>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-3xl">
          Curated external reads on media rights, franchise economics, brand value and sponsorship —
          the business layer beneath the cricket. Each card links directly to the source.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30">
          <Filter className="w-3 h-3" /> Filter
        </div>
        <button
          onClick={() => setActiveTag(null)}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
            activeTag === null ? "bg-cyan-600 border-cyan-500/50 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
          }`}
        >
          All ({articles.length})
        </button>
        {BUSINESS_TAGS.map(t => {
          const count = articles.filter(a => a.tags.includes(t)).length;
          if (count === 0) return null;
          return (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                activeTag === t ? `${TAG_COLOR[t]} opacity-100` : "bg-white/5 border-white/10 text-white/40 hover:text-white"
              }`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => <BusinessCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DATA DESK TAB
   ══════════════════════════════════════════════════════ */

function DataDeskTab() {
  const feed = useInsightFeed();
  const insights = feed.data?.insights ?? [];
  const articles = feed.data?.articles ?? [];
  const [mode, setMode] = useState<"swipe" | "read">("swipe");

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <SectionLabel>Our data desk</SectionLabel>
          <p className="text-[13px] text-white/60 leading-relaxed">
            Every IPL delivery ever bowled, read ball by ball — what was bowled, where it went,
            and what it cost. These are the findings that came out of it.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["swipe", "read"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === m ? "bg-cyan-600 text-white" : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {feed.isLoading ? (
        <div className="rounded-[24px] border border-white/10 bg-[#0B1020] p-12 text-center text-white/40 font-mono text-sm">
          Reading the ball record…
        </div>
      ) : mode === "swipe" ? (
        <InsightStoryDeck cards={insights} articles={articles} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map(c => (
            <InsightFeedCard
              key={c.id}
              card={c}
              article={c.testsSlug ? articles.find(a => a.slug === c.testsSlug) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   REFERENCES TAB
   ══════════════════════════════════════════════════════ */

function ReferencesTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6">
        <SectionLabel>All data sources used in this project</SectionLabel>
        <p className="text-[13px] text-white/55 leading-relaxed max-w-3xl">
          Every external source this engine draws on, and exactly what each was used for.
          Figures on insight cards carry inline citations; this is the complete list.
          Where a number is not attributed here, it was computed directly from the ball-by-ball record.
        </p>
      </div>

      {ALL_PROJECT_REFERENCES.map(group => (
        <div key={group.group} className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6">
          <SectionLabel>{group.group}</SectionLabel>
          <div className="flex flex-col gap-2">
            {group.items.map(ref => (
              <a
                key={ref.url}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.025] border border-white/5 hover:border-cyan-400/35 hover:bg-white/[0.04] transition-all group"
              >
                <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${REF_CAT_COLOR[ref.cat] ?? "bg-white/5 border-white/10 text-white/30"}`}>
                  {ref.cat}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-white/80 group-hover:text-cyan-400 transition-colors leading-snug">
                    {ref.label}
                  </div>
                  <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{ref.use}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN EDITORIAL INTEL HUB PAGE COMPONENT
   ══════════════════════════════════════════════════════ */

export default function IntelligencePage() {
  const [tab, setTab] = useState<MainTab>("9 Dimensions");
  const [selectedDimId, setSelectedDimId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ContentArticle | null>(null);

  // Deep link from the team newsroom and the squad drawer: /intelligence?article=<day>.
  useEffect(() => {
    const day = Number(new URLSearchParams(window.location.search).get("article"));
    if (!Number.isInteger(day) || day <= 0) return;
    const hit = CONTENT_ENGINE_100.find((a) => a.day === day);
    if (hit) setSelectedArticle(hit);
  }, []);
  const [globalSearch, setGlobalSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const hub = useContentHub();
  const businessArticles = hub.data?.businessArticles ?? [];

  // Handle ⌘K / Ctrl+K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const TAB_ICONS: Record<MainTab, typeof PenSquare> = {
    "9 Dimensions": Layers,
    "100-Day Engine": Flame,
    "Top Stories": Newspaper,
    "Data Desk": BarChart3,
    "Business": TrendingUp,
    "Sources": BookOpen,
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#050816] text-white pb-20">
        {/* COMPACT UNIFIED SUB-NAV BAR (INSTITUTIONAL HEADER ROW) */}
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#050816]/90 border-b border-white/10 px-4 py-3">
          <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* BRAND & DESK TELEMETRY */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50" />
                <span className="text-xs font-black tracking-wider uppercase text-white font-mono">
                  EDITORIAL INTEL HUB
                </span>
              </div>
              <span className="text-white/20 hidden sm:inline">|</span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded hidden sm:inline-flex items-center gap-1">
                ● LIVE TELEMETRY ACTIVE
              </span>
            </div>

            {/* SEGMENTED TAB NAVIGATION */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
              {MAIN_TABS.map(t => {
                const Icon = TAB_ICONS[t];
                const isActive = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      if (t === "9 Dimensions") setSelectedDimId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 scale-[1.02]"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t}</span>
                    {t === "9 Dimensions" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 text-black font-bold">
                        9
                      </span>
                    )}
                    {t === "100-Day Engine" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-bold">
                        100
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* GLOBAL ⌘K SEARCH INPUT */}
            <div className="relative min-w-[200px] sm:min-w-[280px]">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={e => {
                  setGlobalSearch(e.target.value);
                  if (tab !== "100-Day Engine" && e.target.value.trim().length > 0) {
                    setTab("100-Day Engine");
                  }
                }}
                placeholder="Search 100 topics, telemetry, dimensions..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-12 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-white/40 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* HERO SUMMARY TELEMETRY STRIP */}
        <div className="max-w-[1700px] mx-auto px-4 py-3">
          <div className="bg-[#0B1020]/90 border border-white/10 rounded-2xl p-3 px-5 flex items-center justify-between overflow-x-auto custom-scrollbar gap-6 text-[11px] font-mono">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">DELIVERIES:</span>
              <span className="text-white font-bold">295,732 Analyzed</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">ECOSYSTEM:</span>
              <span className="text-emerald-400 font-bold">$10.7B Valuation</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">PER-MATCH:</span>
              <span className="text-cyan-400 font-bold">$13.4M Rights Value</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">CURRICULUM:</span>
              <span className="text-amber-400 font-bold">100-Day Content Engine</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/40">VERIFICATION:</span>
              <span className="text-purple-400 font-bold">100% Empirically Sourced</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2 shrink-0 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE FEED ACTIVE</span>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="max-w-[1700px] mx-auto px-4 pt-3 space-y-8">
          {tab === "9 Dimensions" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* LEFT 9 COLS: 3X3 BENTO OR SELECTED DIMENSION DRILL-DOWN */}
              <div className="xl:col-span-9 space-y-6">
                <NineDimensionsView
                  selectedDimId={selectedDimId}
                  onSelectDim={setSelectedDimId}
                  onOpenArticle={setSelectedArticle}
                  businessArticles={businessArticles}
                />
              </div>

              {/* RIGHT 3 COLS: SPONSORED TELEMETRY DOCK (300PX RAIL) */}
              <div className="xl:col-span-3">
                <SponsoredTelemetryDock />
              </div>
            </div>
          )}

          {tab === "100-Day Engine" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-9 space-y-6">
                <ContentEngineBrowser
                  onSelectArticle={setSelectedArticle}
                  filterDimensionId={selectedDimId}
                  searchQuery={globalSearch}
                />
              </div>
              <div className="xl:col-span-3">
                <SponsoredTelemetryDock />
              </div>
            </div>
          )}

          {tab === "Top Stories" && <NewsroomTab />}

          {tab === "Data Desk" && <DataDeskTab />}

          {tab === "Business" && <BusinessTab articles={businessArticles} />}

          {tab === "Sources" && <ReferencesTab />}

          {/* HORIZONTAL NATIVE IN-FEED BREAK (RESPONSIVE LEADERBOARD 728x90 / 970x90) */}
          <div className="w-full pt-4">
            <div className="flex items-center justify-between mb-1.5 px-2">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">
                ADVERTISEMENT · ECOSYSTEM GLOBAL LEADERBOARD
              </span>
              <span className="text-[8px] font-mono text-cyan-400/60 uppercase">
                SPONSORED BRIEFING
              </span>
            </div>
            <AdVessel
              slot="4819203746"
              format="horizontal"
              minHeight={90}
              label="Institutional Global Leaderboard"
            />
          </div>

          {/* 100-DAY ENGINE PREVIEW SECTION (WHEN ON 9 DIMENSIONS TAB) */}
          {tab === "9 Dimensions" && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <SectionLabel>100-Day Analytical Curriculum</SectionLabel>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Explore All 100 Topics
                  </h3>
                </div>
                <button
                  onClick={() => setTab("100-Day Engine")}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Open Full 100-Day Explorer</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              <ContentEngineBrowser
                onSelectArticle={setSelectedArticle}
                filterDimensionId={selectedDimId}
              />
            </div>
          )}
        </main>

        {/* MODAL ARTICLE READER */}
        <AnimatePresence>
          {selectedArticle && (
            <ArticleReaderModal
              article={selectedArticle}
              onClose={() => setSelectedArticle(null)}
              onSelectArticle={setSelectedArticle}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
