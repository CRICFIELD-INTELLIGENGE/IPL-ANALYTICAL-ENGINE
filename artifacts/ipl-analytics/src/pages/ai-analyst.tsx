/**
 * CRICFIELD INTELLIGENCE OS
 * ─────────────────────────────────────────────────────────────────────────────
 * Tactical Command Center: Asymmetric Bento Matrix with Live Interactive Spotlight
 * Zero carousel friction. 100% visible, interactive, and high-impact.
 *
 * Engines:
 *   Tactics & Simulation (Phase 3):
 *     - Strategy Simulator
 *     - Alternate Universe Engine
 *     - Opposition Exploit Map
 *     - Captain's Decision Replay
 *   Squad & Market Intelligence (Phase 4):
 *     - Auction War Room
 *     - Squad DNA
 *     - Player Pool Graph
 *     - Build Playing XI
 *   Discovery & Profiling (Phase 2):
 *     - Pressure Genome
 *     - Hidden Weakness Detector
 *     - AI Daily Insight Feed
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { DewImpactModal } from "@/components/decision/dew-impact-modal";
import { MOCK_OVERVIEW } from "@/components/decision/ask-mock";
import { fetchHistoryOverview } from "@/lib/ask-api";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Swords, GitBranch, Dna, Eye, Map, Gavel, Network,
  HeartPulse, Rewind, Sparkles, Trophy, Users, Zap,
  Brain, ArrowRight, Activity, Globe, Search,
  Check, Shield, Target, ChevronRight,
  BarChart3, RotateCcw, CheckCircle2, Flame, Layers, Droplets
} from "lucide-react";
import { GpuMeshShader } from "@/components/scrolltide/gpu-mesh-shader";
import { AdVessel } from "@/components/ad-vessel";

/* ═══════════════════════════════════════════════════════════════════════════
   DATA REGISTRY — 12 DECISION ENGINES
   ═══════════════════════════════════════════════════════════════════════════ */

type EngineCategory = "all" | "tactics" | "squad" | "discovery";

interface DecisionEngine {
  id: string;
  num: string;
  name: string;
  badge: string;
  category: "tactics" | "squad" | "discovery";
  tagline: string;
  description: string;
  icon: typeof Swords;
  accent: string;       // e.g. "text-cyan-400"
  accentBg: string;     // e.g. "bg-cyan-500/10"
  borderColor: string;  // e.g. "border-cyan-500/30"
  glowColor: string;    // e.g. "rgba(6, 182, 212, 0.4)"
  gradient: string;     // e.g. "from-cyan-950/40 via-slate-900/60 to-blue-950/40"
  cta: string;
  href?: string;
  phase: number;
  featured?: boolean;
  metrics: { label: string; value: string }[];
  tags: string[];
  spotlightPreview?: {
    headline: string;
    subtext: string;
    chips: string[];
  };
}

const ENGINES: DecisionEngine[] = [
  {
    id: "strategy-sim",
    num: "01",
    name: "Strategy Simulator",
    badge: "FLAGSHIP",
    category: "tactics",
    tagline: "Build any match situation. Simulate 3 AI bowling plans with live win-probability deltas.",
    description:
      "Configure target runs, balls remaining, venue bias, and crease balance. The engine runs 2,000 simulated finishes per plan from each bowler's IPL record, calibrated against real historical chases from the same spot.",
    icon: Swords,
    accent: "text-cyan-400",
    accentBg: "bg-cyan-500/15",
    borderColor: "border-cyan-500/40",
    glowColor: "rgba(6, 182, 212, 0.45)",
    gradient: "from-cyan-950/60 via-slate-900/80 to-blue-950/60",
    cta: "Launch Strategy Simulator",
    href: "/ai-analyst/strategy-sim",
    phase: 3,
    featured: true,
    metrics: [
      { label: "Overs", value: "17–20 Death" },
      { label: "Plans", value: "3 Sequences" },
      { label: "Sim Finishes", value: "2,000 / Plan" },
    ],
    tags: ["Yorker Lockdown", "Venue Choke", "Matchup Rotation"],
    spotlightPreview: {
      headline: "RCB Defending 201 vs GT (120/3 after 14 overs)",
      subtext: "Plan A (Yorker Lockdown): 68% Win | Plan B (Hard Length): 54% Win | Plan C (Phase Spin): 47% Win",
      chips: ["Defend 18 off 12 at Chepauk", "Bumrah Over 18 vs Russell", "Dew Factor Calibrated"],
    },
  },
  {
    id: "alt-universe",
    num: "02",
    name: "Alternate Universe Engine",
    badge: "MONTE CARLO",
    category: "tactics",
    tagline: "Reconstruct iconic IPL turning points across 1,000 parallel runs with divergence worms.",
    description:
      "What if Bumrah bowled Mohit's death overs in the 2023 final? What if Kohli faced only left-arm pace? Replays real innings with one parameter changed, holding random variables constant to isolate true strategic causality.",
    icon: GitBranch,
    accent: "text-violet-400",
    accentBg: "bg-violet-500/15",
    borderColor: "border-violet-500/40",
    glowColor: "rgba(139, 92, 246, 0.45)",
    gradient: "from-violet-950/60 via-slate-900/80 to-purple-950/60",
    cta: "Enter Multiverse Engine",
    href: "/ai-analyst/alt-universe",
    phase: 3,
    featured: true,
    metrics: [
      { label: "Iterations", value: "1,000 Runs" },
      { label: "Divergence", value: "Ball-by-Ball" },
      { label: "Matches", value: "1,240+ Covered" },
    ],
    tags: ["2023 Bumrah", "2016 Kohli", "2019 Malinga Ball 120"],
    spotlightPreview: {
      headline: "2023 Final: Bumrah Over 16–20 in CSK Chase",
      subtext: "Real Timeline: CSK won by 5 wickets | Multiverse Timeline: GT Win probability surges to 74.2%",
      chips: ["1,000 Run Histogram", "Butterfly Effect Moments", "Worm Comparison"],
    },
  },
  {
    id: "opposition-map",
    num: "03",
    name: "Opposition Exploit Map",
    badge: "TACTICAL BRIEF",
    category: "tactics",
    tagline: "Pre-match franchise intelligence against any opponent & venue.",
    description:
      "Select your team, the opponent, and venue. AI generates an executive scouting dossier: powerplay swing traps, middle-overs spin bottlenecks, and 20-over bowling blueprint.",
    icon: Map,
    accent: "text-rose-400",
    accentBg: "bg-rose-500/15",
    borderColor: "border-rose-500/40",
    glowColor: "rgba(244, 63, 94, 0.45)",
    gradient: "from-rose-950/60 via-slate-900/80 to-pink-950/60",
    cta: "Generate Exploit Map",
    href: "/ai-analyst/opposition-map",
    phase: 3,
    metrics: [
      { label: "Coverage", value: "10 Franchises" },
      { label: "Blueprint", value: "20 Overs" },
      { label: "Dossier", value: "Executive PDF" },
    ],
    tags: ["Powerplay Traps", "Spin Bottleneck", "Death Targets"],
  },
  {
    id: "decision-replay",
    num: "04",
    name: "Captain's Decision Replay",
    badge: "TACTICAL IQ",
    category: "tactics",
    tagline: "Pause high-stakes IPL finals. Make the call. See what history says.",
    description:
      "Step into the captain's boots at pivotal championship turning points. Choose your bowling call or field spread and measure your tactical IQ against historical outcomes.",
    icon: Rewind,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/15",
    borderColor: "border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.45)",
    gradient: "from-amber-950/60 via-slate-900/80 to-orange-950/60",
    cta: "Play Decision Replay",
    href: "/ai-analyst/decision-replay",
    phase: 3,
    metrics: [
      { label: "Turning Points", value: "IPL Finals" },
      { label: "Scoring", value: "0–100 IQ Rating" },
      { label: "Historical Verdict", value: "Real Reveal" },
    ],
    tags: ["Dhoni 2019", "Rohit 2017", "Cummins 2024"],
  },
  {
    id: "auction-war-room",
    num: "05",
    name: "Auction War Room",
    badge: "BUSINESS VALUE",
    category: "squad",
    tagline: "Data-driven bid decisions: Buy · Hold · Avoid with maximum logical bid ceilings.",
    description:
      "Every active player valued on output and priced off comparable sales, with max logical bid ceilings in ₹ Crores, comparable replacement targets, and backtested results on the 2026 auction.",
    icon: Gavel,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/15",
    borderColor: "border-emerald-500/40",
    glowColor: "rgba(16, 185, 129, 0.45)",
    gradient: "from-emerald-950/60 via-slate-900/80 to-teal-950/60",
    cta: "Enter War Room",
    href: "/ai-analyst/auction-war-room",
    phase: 4,
    metrics: [
      { label: "Decision", value: "Buy / Hold / Avoid" },
      { label: "Bid Ceiling", value: "₹ Cr Valuation" },
      { label: "Comps", value: "3 Role Matches" },
    ],
    tags: ["Bid Ceilings", "Squad Gaps", "2026 Backtest"],
  },
  {
    id: "playing-xi",
    num: "06",
    name: "Build Playing XI",
    badge: "OPTIMIZATION",
    category: "squad",
    tagline: "Optimize balance, venue roles & phase depth under salary constraints.",
    description:
      "Interactive 11-player squad builder. Balances left/right batting mix, pace/spin overs distribution, overseas caps, and venue bias for any IPL stadium in seconds.",
    icon: Zap,
    accent: "text-blue-400",
    accentBg: "bg-blue-500/15",
    borderColor: "border-blue-500/40",
    glowColor: "rgba(59, 130, 246, 0.45)",
    gradient: "from-blue-950/60 via-slate-900/80 to-indigo-950/60",
    cta: "Open Squad Builder",
    href: "/ai-analyst/playing-xi",
    phase: 1,
    metrics: [
      { label: "Composition", value: "11 + Impact" },
      { label: "Balance", value: "50+ Metrics" },
      { label: "Pace / Spin", value: "Balanced 20 Ov" },
    ],
    tags: ["Impact Player", "Role Harmony", "Death Depth"],
  },
  {
    id: "squad-dna",
    num: "07",
    name: "Squad DNA",
    badge: "50+ DIMENSIONS",
    category: "squad",
    tagline: "One radar fingerprint for every franchise across 18 IPL seasons.",
    description:
      "Any franchise-season judged on 38 dimensions against its own era: radar fingerprint, winning-linked vulnerability scores, historical twins, and head-to-head tactical comparisons.",
    icon: Dna,
    accent: "text-teal-400",
    accentBg: "bg-teal-500/15",
    borderColor: "border-teal-500/40",
    glowColor: "rgba(20, 184, 166, 0.45)",
    gradient: "from-teal-950/60 via-slate-900/80 to-cyan-950/60",
    cta: "View Squad DNA",
    href: "/ai-analyst/squad-dna",
    phase: 4,
    metrics: [
      { label: "Dimensions", value: "38+ Axes" },
      { label: "Coverage", value: "2008–2026" },
      { label: "Twins", value: "Historical Comps" },
    ],
    tags: ["Radar Fingerprint", "Depth Index", "Era Adjusted"],
  },
  {
    id: "player-pool",
    num: "08",
    name: "Player Pool Graph",
    badge: "NETWORK",
    category: "squad",
    tagline: "Every qualified batter and bowler as a feature vector connected by similarity.",
    description:
      "Click Bumrah or Starc to see nearest historical archetypes across eras based on role, phase, economy, and wicket profile. Navigation by analogy, not simple filters.",
    icon: Network,
    accent: "text-sky-400",
    accentBg: "bg-sky-500/15",
    borderColor: "border-sky-500/40",
    glowColor: "rgba(56, 189, 248, 0.45)",
    gradient: "from-sky-950/60 via-slate-900/80 to-blue-950/60",
    cta: "Explore Network",
    href: "/ai-analyst/player-pool",
    phase: 4,
    metrics: [
      { label: "Vectors", value: "All Players" },
      { label: "Similarity", value: "Cosine Role Fit" },
      { label: "Archetypes", value: "Cross-Era" },
    ],
    tags: ["Bumrah Comps", "Cross-Era Matches", "Role Vectors"],
  },
  {
    id: "pressure-genome",
    num: "09",
    name: "Pressure Genome",
    badge: "PROFILING",
    category: "discovery",
    tagline: "Per-player pressure personality: chase index & eliminator delta.",
    description:
      "Isolates true crunch situations: RRR > 12, death overs, eliminators, and collapse recovery. Calculates a genuine Pressure Index rather than raw averages.",
    icon: HeartPulse,
    accent: "text-fuchsia-400",
    accentBg: "bg-fuchsia-500/15",
    borderColor: "border-fuchsia-500/40",
    glowColor: "rgba(217, 70, 239, 0.45)",
    gradient: "from-fuchsia-950/60 via-slate-900/80 to-purple-950/60",
    cta: "Profile Player",
    href: "/ai-analyst/pressure",
    phase: 2,
    metrics: [
      { label: "Situations", value: "RRR > 12 & Death" },
      { label: "Metric", value: "Pressure Index" },
      { label: "Database", value: "All IPL Players" },
    ],
    tags: ["Clutch Gene", "Eliminator Delta", "Death Economy"],
  },
  {
    id: "hidden-weakness",
    num: "10",
    name: "Hidden Weakness Detector",
    badge: "ANOMALY DISCOVERY",
    category: "discovery",
    tagline: "Autonomous anomaly discovery: finds blind spots humans overlook.",
    description:
      "Detects covert technical vulnerabilities: batters averaging 170+ overall who collapse to wrist spin in overs 7–11. Automatic pattern recognition with full ball evidence.",
    icon: Eye,
    accent: "text-amber-300",
    accentBg: "bg-amber-400/15",
    borderColor: "border-amber-400/40",
    glowColor: "rgba(251, 191, 36, 0.45)",
    gradient: "from-amber-950/60 via-slate-900/80 to-yellow-950/60",
    cta: "Hunt Anomalies",
    href: "/ai-analyst/weakness",
    phase: 2,
    metrics: [
      { label: "Detection", value: "Autonomous" },
      { label: "Confidence", value: "95% Stat Sig" },
      { label: "Evidence", value: "Ball-by-Ball Logs" },
    ],
    tags: ["Phase Choke", "Bowler Type Trap", "Release Point"],
  },
  {
    id: "insight-feed",
    num: "11",
    name: "AI Daily Insight Feed",
    badge: "5 DAILY STORIES",
    category: "discovery",
    tagline: "Five high-impact IPL discoveries every morning. Zero search needed.",
    description:
      "Autonomous daily discovery pipeline. Scans millions of IPL deliveries and surfaces the 5 most statistically significant insights across active squads.",
    icon: Sparkles,
    accent: "text-purple-400",
    accentBg: "bg-purple-500/15",
    borderColor: "border-purple-500/40",
    glowColor: "rgba(168, 85, 247, 0.45)",
    gradient: "from-purple-950/60 via-slate-900/80 to-indigo-950/60",
    cta: "View Daily Feed",
    href: "/ai-analyst/feed",
    phase: 2,
    metrics: [
      { label: "Frequency", value: "5 Per Day" },
      { label: "Algorithms", value: "Delivery Mining" },
      { label: "Visuals", value: "Instant Charts" },
    ],
    tags: ["Tactical Gold", "Record Trackers", "Matchup Signals"],
  },
  {
    id: "dew-impact-matrix",
    num: "12",
    name: "Dew & Ball Wear Impact Matrix",
    badge: "VENUE & BALL DECAY",
    category: "tactics",
    tagline: "Simulate pitch degradation, seam wear, and dew boundary risk across innings phases to optimize toss decisions and over splits.",
    description:
      "Simulate pitch degradation, seam wear, and dew boundary risk across innings phases to optimize toss decisions and over splits.",
    icon: Droplets,
    accent: "text-sky-400",
    accentBg: "bg-sky-500/15",
    borderColor: "border-sky-500/40",
    glowColor: "rgba(56, 189, 248, 0.45)",
    gradient: "from-sky-950/60 via-slate-900/80 to-teal-950/60",
    cta: "Simulate Dew Impact",
    href: "/ai-analyst/strategy-sim",
    phase: 4,
    metrics: [
      { label: "DEW PROBABILITY", value: "Live Humidity Sync" },
      { label: "INNINGS DELTA", value: "+14.8 Par Chasing" },
      { label: "GRIP INDEX", value: "Overs 14–20 Wet Seam" },
    ],
    tags: ["#DewFactor", "#TossOptimization", "#GripIndex"],
    spotlightPreview: {
      headline: "Wankhede & Chepauk Dew Decay Telemetry",
      subtext: "Overs 14–20 seam wetness increases boundary risk by 28.4%. Second innings par shifts +14.8 runs.",
      chips: ["Relative Humidity 78%", "Toss to Chase Optimum", "Grip Decay Curve"],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StatsBar() {
  const { data } = useQuery({
    queryKey: ["history-overview"],
    queryFn: fetchHistoryOverview,
    retry: 1,
    staleTime: 30 * 60_000,
  });
  const c = (data ?? MOCK_OVERVIEW).coverage;
  const stats = [
    { icon: Activity, label: "Ball-by-ball deliveries", value: c.deliveries.toLocaleString("en-US"), glow: "text-cyan-400", border: "border-cyan-500/20" },
    { icon: Globe,    label: "IPL seasons covered",     value: `${c.firstSeason}–${c.lastSeason}`, glow: "text-violet-400", border: "border-violet-500/20" },
    { icon: Users,    label: "Players with ball data",  value: c.players.toLocaleString("en-US"), glow: "text-emerald-400", border: "border-emerald-500/20" },
    { icon: Zap,      label: "AI decision modules",     value: "12 Live", glow: "text-amber-400", border: "border-amber-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-6">
      {stats.map((s, i) => (
        <GlassCard key={s.label} className={`p-4 bg-white/[0.02] border ${s.border} hover:border-white/30 transition-all`} delay={i * 0.05}>
          <s.icon className={`w-4 h-4 ${s.glow} mb-2`} />
          <div className="font-display font-black text-xl text-white tracking-tight">{s.value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{s.label}</div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AIAnalystPage() {
  const [activeCategory, setActiveCategory] = useState<EngineCategory>("all");
  const [activeModal, setActiveModal] = useState<"dew-impact" | null>(null);

  const [, navigate] = useLocation();

  const filteredEngines = ENGINES.filter((e) => {
    if (activeCategory === "all") return true;
    return e.category === activeCategory;
  });

  function handleAction(id: string) {
    if (id === "dew-impact-matrix") {
      setActiveModal("dew-impact");
      return;
    }
    const target = ENGINES.find((m) => m.id === id);
    if (target?.href) {
      navigate(target.href);
      return;
    }
  }

  return (
    <Layout hideRightPanel>
      {/* overflow-x-clip: the backdrop bleeds 40px past each side, which
          otherwise scrolls the page sideways at every width */}
      <div className="relative space-y-8 pb-24 overflow-x-clip">

        {/* ── Atmospheric Ambient Shader Background ── */}
        <div className="absolute -top-10 -left-10 -right-10 h-[640px] pointer-events-none overflow-hidden z-0 opacity-40">
          <GpuMeshShader preset="tide-swirl" intensity={0.7} className="w-full h-full" />
        </div>

        {/* ── 1. Hero Cockpit Header ── */}
        <section className="relative z-10 pt-4 pb-2 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300">
              CRICFIELD · QUANT COMMAND CENTER
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-black text-3xl sm:text-5xl leading-tight mb-3 text-white tracking-tight"
          >
            What do you want to{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(6,182,212,0.55)]">
              decide?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-white/70 leading-relaxed max-w-2xl mx-auto"
          >
            Don't type a search query. Choose a decision. AI simulates, optimizes, discovers and challenges
            IPL matchplay and auction strategy across 280,000+ real deliveries.
          </motion.p>
        </section>

        {/* ── 2. Quant Warehouse Stats Bar ── */}
        <div className="relative z-10">
          <StatsBar />
        </div>

        {/* ── 3. Asymmetric Bento Matrix (All 12 Decision Engines) ── */}
        <section className="relative z-10 space-y-6">
          {/* Header & Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  TACTICAL MATRIX
                </span>
                <span className="text-xs text-white/50">· All Products Live</span>
              </div>
              <h2 className="font-display font-black text-2xl text-white tracking-tight">
                Decision Engines Cockpit
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
              {[
                { id: "all", label: "All Engines (12)" },
                { id: "tactics", label: "Tactics & Sim (5)" },
                { id: "squad", label: "Squad & Market (4)" },
                { id: "discovery", label: "Profiling (3)" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveCategory(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeCategory === f.id
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asymmetric Bento Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEngines.map((engine) => {
              const Icon = engine.icon;
              return (
                <motion.div
                  key={engine.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col"
                >
                  <GlassCard
                    className={`flex-1 flex flex-col justify-between p-6 bg-gradient-to-br ${engine.gradient} border ${engine.borderColor} hover:border-cyan-400/50 transition-all duration-300 group shadow-lg`}
                  >
                    <div>
                      {/* Top Row: Icon + Badge + Phase */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${engine.accentBg} ${engine.borderColor} group-hover:scale-105 transition-transform`}
                        >
                          <Icon className={`w-5 h-5 ${engine.accent}`} />
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${engine.accentBg} ${engine.accent} ${engine.borderColor}`}
                          >
                            {engine.badge}
                          </span>
                          <span className="font-mono text-[9px] text-white/40">
                            PHASE {engine.phase} · {engine.num}
                          </span>
                        </div>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="font-display font-black text-lg text-white group-hover:text-cyan-300 transition-colors">
                        {engine.name}
                      </h3>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {engine.tagline}
                      </p>

                      {/* Quant Metrics Grid */}
                      <div className="grid grid-cols-3 gap-1.5 mt-4 py-2 px-2.5 rounded-xl bg-black/40 border border-white/10">
                        {engine.metrics.map((m) => (
                          <div key={m.label} className="text-center">
                            <div className="text-[8px] uppercase tracking-wider text-white/40 font-mono truncate">
                              {m.label}
                            </div>
                            <div className="text-[10px] font-black text-white mt-0.5 truncate">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {engine.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60"
                          >
                            {t.startsWith("#") ? t : `#${t}`}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                      <button
                        onClick={() => handleAction(engine.id)}
                        className="w-full py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-300 border border-white/15 hover:border-cyan-400/40 transition-all shadow-sm"
                      >
                        <span>{engine.cta}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Sponsored Intelligence Partner Vessel ── */}
        <section className="relative z-10 max-w-5xl mx-auto w-full">
          <AdVessel
            slot="1029384756"
            format="horizontal"
            label="Sponsored Intelligence · Quant Terminal Partner"
          />
        </section>

        {/* ── 5. The X-Factor Quant Philosophy Callout ── */}
        <section className="relative z-10 pt-4">
          <GlassCard className="p-8 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-violet-950/40 border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.1)]">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-3xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                <Brain className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    PHILOSOPHY
                  </span>
                  <span className="text-xs text-white/50">· Quant Decision Intelligence</span>
                </div>
                <h3 className="font-display font-black text-xl text-white">
                  The X-Factor: AI that thinks in scenarios, not searches
                </h3>
                <p className="text-sm text-white/70 mt-2 leading-relaxed max-w-3xl">
                  Instead of typing plain text queries into a conversational chatbot, you interact directly with decision levers.
                  The engine simulates, optimizes, discovers and challenges tactical choices using 280,000+ ball-by-ball deliveries
                  and real auction mechanics.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 mt-6">
                  {[
                    { icon: Search,   label: "Search  →  Decision Engine" },
                    { icon: Trophy,   label: "Raw Stats  →  Calibrated Strategy" },
                    { icon: Sparkles, label: "Simple Query  →  1,000 Monte Carlo Runs" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 text-xs text-cyan-300 font-semibold p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                      <item.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Playing XI Modal Drawer */}

        {/* Dew & Ball Wear Impact Matrix Modal */}
        <DewImpactModal open={activeModal === "dew-impact"} onOpenChange={(o) => setActiveModal(o ? "dew-impact" : null)} />

      </div>
    </Layout>
  );
}
