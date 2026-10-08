import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { Link } from "wouter";
import {
  Swords, GitBranch, Dna, Eye, Map, Gavel, Network,
  HeartPulse, Rewind, Sparkles, ChevronLeft, ChevronRight,
  Maximize2, RotateCw, Layers, Compass, Play, Pause,
  Flame, CheckCircle2, ArrowRight, Zap, Target, Cpu, Activity,
  SlidersHorizontal, Check
} from "lucide-react";
import { GpuMeshShader, type ShaderPreset } from "./gpu-mesh-shader";

export type CarouselMode = "cylinder" | "dna" | "fan" | "depth" | "grid";

export interface DecisionItem {
  id: string;
  num: string;
  title: string;
  badge: string;
  category: "tactics" | "squad" | "discovery";
  tagline: string;
  description: string;
  icon: typeof Swords;
  accent: string;       // e.g. "text-cyan-400"
  accentBg: string;     // e.g. "bg-cyan-500/10"
  borderColor: string;  // e.g. "border-cyan-500/30"
  glowColor: string;    // e.g. "rgba(6, 182, 212, 0.4)"
  gradient: string;     // e.g. "from-cyan-950/60 via-slate-900/80 to-blue-950/60"
  cta: string;
  href?: string;
  phase: number;
  metrics: { label: string; value: string }[];
  tags: string[];
}

export const DECISION_MODULES: DecisionItem[] = [
  {
    id: "strategy-sim",
    num: "01",
    title: "Strategy Simulator",
    badge: "FLAGSHIP",
    category: "tactics",
    tagline: "Live match situation builder with 3 AI bowling plans.",
    description:
      "Build exact chase situations (overs 17–20). Set target, venue, and crease balance. AI computes 3 bowling plans with live over-by-over win probability curves.",
    icon: Swords,
    accent: "text-cyan-400",
    accentBg: "bg-cyan-500/15",
    borderColor: "border-cyan-500/40",
    glowColor: "rgba(6, 182, 212, 0.45)",
    gradient: "from-cyan-950/70 via-slate-900/90 to-blue-950/80",
    cta: "Launch Simulator",
    href: "/ai-analyst/strategy-sim",
    phase: 3,
    metrics: [
      { label: "Target Window", value: "Overs 17–20" },
      { label: "AI Plans", value: "3 Sequences" },
      { label: "Precision", value: "Ball-by-Ball" },
    ],
    tags: ["Yorker Lockdown", "Venue Choke", "Win Delta"],
  },
  {
    id: "alt-universe",
    num: "02",
    title: "Alternate Universe",
    badge: "MONTE CARLO",
    category: "tactics",
    tagline: "Reconstruct iconic IPL turning points across 1,000 parallel runs.",
    description:
      "What if Bumrah bowled overs 16–20 in CSK's chase? What if Kohli faced 100% left-arm pace? AI simulates 1,000 parallel timelines using ball-by-ball distributions.",
    icon: GitBranch,
    accent: "text-violet-400",
    accentBg: "bg-violet-500/15",
    borderColor: "border-violet-500/40",
    glowColor: "rgba(139, 92, 246, 0.45)",
    gradient: "from-violet-950/70 via-slate-900/90 to-purple-950/80",
    cta: "Enter Multiverse",
    href: "/ai-analyst/alt-universe",
    phase: 3,
    metrics: [
      { label: "Simulations", value: "1,000 Iterations" },
      { label: "Divergence", value: "Worm Charts" },
      { label: "Catalysts", value: "Ball 120 Shifts" },
    ],
    tags: ["2023 Bumrah", "2016 Kohli", "2019 Malinga"],
  },
  {
    id: "opposition-map",
    num: "03",
    title: "Opposition Exploit Map",
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
    gradient: "from-rose-950/70 via-slate-900/90 to-pink-950/80",
    cta: "Open Exploit Map",
    href: "/ai-analyst/opposition-map",
    phase: 3,
    metrics: [
      { label: "Coverage", value: "10 Franchises" },
      { label: "Rotation", value: "20-Over Plan" },
      { label: "Format", value: "Export Briefing" },
    ],
    tags: ["Powerplay Traps", "Spin Bottleneck", "Death Targets"],
  },
  {
    id: "decision-replay",
    num: "04",
    title: "Captain's Decision Replay",
    badge: "TACTICAL IQ",
    category: "tactics",
    tagline: "Pause high-stakes IPL finals. Make the call. See history's verdict.",
    description:
      "Step into the captain's boots at pivotal championship turning points. Choose your bowling call or field spread and measure your tactical IQ against historical outcomes.",
    icon: Rewind,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/15",
    borderColor: "border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.45)",
    gradient: "from-amber-950/70 via-slate-900/90 to-orange-950/80",
    cta: "Play Replay Game",
    href: "/ai-analyst/decision-replay",
    phase: 3,
    metrics: [
      { label: "Turn Points", value: "IPL Finals" },
      { label: "IQ Score", value: "0–100 Rating" },
      { label: "Real Call", value: "Actual Reveal" },
    ],
    tags: ["Dhoni 2019", "Rohit 2017", "Cummins 2024"],
  },
  {
    id: "playing-xi",
    num: "05",
    title: "Build Playing XI",
    badge: "OPTIMIZATION",
    category: "squad",
    tagline: "Optimize balance, venue roles & phase depth under salary constraints.",
    description:
      "Interactive 11-player squad builder. Balances left/right batting mix, pace/spin overs distribution, and venue bias for any IPL stadium in seconds.",
    icon: Zap,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/15",
    borderColor: "border-emerald-500/40",
    glowColor: "rgba(16, 185, 129, 0.45)",
    gradient: "from-emerald-950/70 via-slate-900/90 to-teal-950/80",
    cta: "Build Playing XI",
    phase: 1,
    metrics: [
      { label: "Composition", value: "11 + Impact" },
      { label: "Balance", value: "50+ Metrics" },
      { label: "Pace / Spin", value: "Balanced 20 Ov" },
    ],
    tags: ["Impact Player", "Role Harmony", "Death Depth"],
  },
  {
    id: "auction-war-room",
    num: "06",
    title: "Auction War Room",
    badge: "VALUATION",
    category: "squad",
    tagline: "AI bid decisions: Buy · Hold · Avoid with logical bid ceilings.",
    description:
      "Real-time franchise war room intelligence. Calculates max logical bid ceilings in ₹ Crores, comparable replacement targets, and value-over-replacement metrics.",
    icon: Gavel,
    accent: "text-lime-400",
    accentBg: "bg-lime-500/15",
    borderColor: "border-lime-500/40",
    glowColor: "rgba(163, 230, 53, 0.45)",
    gradient: "from-lime-950/70 via-slate-900/90 to-emerald-950/80",
    cta: "Enter War Room",
    href: "/ai-analyst/auction-war-room",
    phase: 4,
    metrics: [
      { label: "Decision", value: "Buy / Hold / Avoid" },
      { label: "Ceiling", value: "₹ Cr Valuation" },
      { label: "Comps", value: "3 Role Matches" },
    ],
    tags: ["Bid Ceilings", "Squad Gaps", "Moneyball"],
  },
  {
    id: "squad-dna",
    num: "07",
    title: "Squad DNA",
    badge: "50+ DIMENSIONS",
    category: "squad",
    tagline: "One radar fingerprint for every franchise across 18 IPL seasons.",
    description:
      "Evaluates complete franchise identity across powerplay aggression, death bowling depth, middle-order spin defense, and clutch historical win curves.",
    icon: Dna,
    accent: "text-teal-400",
    accentBg: "bg-teal-500/15",
    borderColor: "border-teal-500/40",
    glowColor: "rgba(20, 184, 166, 0.45)",
    gradient: "from-teal-950/70 via-slate-900/90 to-cyan-950/80",
    cta: "Explore Squad DNA",
    href: "/ai-analyst/squad-dna",
    phase: 4,
    metrics: [
      { label: "Dimensions", value: "50+ Axes" },
      { label: "History", value: "2008–2026" },
      { label: "Vulnerability", value: "Index 0–100" },
    ],
    tags: ["Franchise Fingerprint", "Depth Radar", "Dynasty Comps"],
  },
  {
    id: "pressure-genome",
    num: "08",
    title: "Pressure Genome",
    badge: "PROFILING",
    category: "squad",
    tagline: "Per-player pressure personality: chase index & eliminator delta.",
    description:
      "Isolates true crunch situations: RRR > 12, death overs, eliminators, and collapse recovery. Calculates a genuine Pressure Index rather than raw averages.",
    icon: HeartPulse,
    accent: "text-fuchsia-400",
    accentBg: "bg-fuchsia-500/15",
    borderColor: "border-fuchsia-500/40",
    glowColor: "rgba(217, 70, 239, 0.45)",
    gradient: "from-fuchsia-950/70 via-slate-900/90 to-purple-950/80",
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
    num: "09",
    title: "Hidden Weakness Detector",
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
    gradient: "from-amber-950/70 via-slate-900/90 to-yellow-950/80",
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
    num: "10",
    title: "AI Daily Insight Feed",
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
    gradient: "from-purple-950/70 via-slate-900/90 to-indigo-950/80",
    cta: "View Today's Feed",
    href: "/ai-analyst/feed",
    phase: 2,
    metrics: [
      { label: "Frequency", value: "5 Per Day" },
      { label: "Algorithms", value: "Delivery Mining" },
      { label: "Visuals", value: "Instant Charts" },
    ],
    tags: ["Tactical Gold", "Record Trackers", "Matchup Signals"],
  },
];

interface ScrolltideDecisionCarouselProps {
  onSelectAction: (id: string) => void;
  defaultMode?: CarouselMode;
}

export function ScrolltideDecisionCarousel({
  onSelectAction,
  defaultMode = "cylinder",
}: ScrolltideDecisionCarouselProps) {
  const [mode, setMode] = useState<CarouselMode>(defaultMode);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotation, setRotation] = useState(0); // in degrees
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartRotation, setDragStartRotation] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [shaderPreset, setShaderPreset] = useState<ShaderPreset>("tide-swirl");
  const [filterCategory, setFilterCategory] = useState<"all" | "tactics" | "squad">("all");

  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredItems = useMemo(() => {
    if (filterCategory === "all") return DECISION_MODULES;
    return DECISION_MODULES.filter((m) => m.category === filterCategory);
  }, [filterCategory]);

  const count = filteredItems.length;
  const stepAngle = 360 / Math.max(count, 1);

  // Normalize rotation to activeIndex
  useEffect(() => {
    if (mode === "cylinder") {
      const normalized = ((-rotation % 360) + 360) % 360;
      const nearestIdx = Math.round(normalized / stepAngle) % count;
      setActiveIndex(nearestIdx);
    }
  }, [rotation, stepAngle, count, mode]);

  // Autoplay slow rotisserie drift
  useEffect(() => {
    if (!autoplay || isDragging) return;
    const interval = setInterval(() => {
      setRotation((prev) => prev - 0.35);
    }, 30);
    return () => clearInterval(interval);
  }, [autoplay, isDragging]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        rotateToPrev();
      } else if (e.key === "ArrowRight") {
        rotateToNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [count, mode, activeIndex]);

  const rotateToNext = useCallback(() => {
    if (mode === "cylinder") {
      setRotation((prev) => prev - stepAngle);
    } else {
      setActiveIndex((prev) => (prev + 1) % count);
    }
  }, [mode, stepAngle, count]);

  const rotateToPrev = useCallback(() => {
    if (mode === "cylinder") {
      setRotation((prev) => prev + stepAngle);
    } else {
      setActiveIndex((prev) => (prev - 1 + count) % count);
    }
  }, [mode, stepAngle, count]);

  const snapToIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (mode === "cylinder") {
        setRotation(-index * stepAngle);
      }
    },
    [mode, stepAngle]
  );

  // Drag handlers for 3D track
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartRotation(rotation);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    if (mode === "cylinder") {
      setRotation(dragStartRotation + deltaX * 0.45);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (mode === "cylinder") {
      // Snap to nearest integer card
      const targetAngle = Math.round(rotation / stepAngle) * stepAngle;
      setRotation(targetAngle);
    }
  };

  const currentActiveItem = filteredItems[activeIndex] || filteredItems[0];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-[#070B18]/95 shadow-[0_0_80px_rgba(6,182,212,0.12)] my-8">
      {/* ── 5. GPU Background Shader (Scrolltide Swirl / Mesh) ── */}
      <div className="absolute inset-0 z-0">
        <GpuMeshShader
          preset={shaderPreset}
          intensity={0.88}
          className="w-full h-full"
        />
      </div>

      {/* Decorative Cyber Top Ambient Glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent z-10 pointer-events-none" />

      {/* ── Top HUD Control Bar ── */}
      <div className="relative z-10 px-6 pt-6 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 backdrop-blur-md bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                SCROLLTIDE 3D STAGE
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                GPU V3.8
              </span>
            </div>
            <h2 className="font-display font-black text-xl text-white tracking-tight">
              Interactive Decision Rotisserie
            </h2>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
          {[
            { id: "cylinder", label: "3D Cylinder", icon: RotateCw },
            { id: "dna", label: "DNA Helix", icon: Dna },
            { id: "fan", label: "Fan Deck", icon: Layers },
            { id: "depth", label: "Depth Cascade", icon: Maximize2 },
            { id: "grid", label: "Matrix", icon: SlidersHorizontal },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as CarouselMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-cyan-400" : ""}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category Filters + Autoplay + Shader Presets */}
        <div className="flex items-center gap-2">
          {/* Category Pill */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold">
            {[
              { id: "all", label: "All (10)" },
              { id: "tactics", label: "Tactics (4)" },
              { id: "squad", label: "Squad (4)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterCategory === f.id
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Autoplay button */}
          <button
            onClick={() => setAutoplay(!autoplay)}
            className={`p-2 rounded-xl border transition-all ${
              autoplay
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white"
            }`}
            title={autoplay ? "Pause 3D rotation" : "Enable slow auto-rotisserie"}
          >
            {autoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Shader picker */}
          <button
            onClick={() => {
              const presets: ShaderPreset[] = ["tide-swirl", "neon-mesh", "aurora-noir"];
              const next = presets[(presets.indexOf(shaderPreset) + 1) % presets.length];
              setShaderPreset(next);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-300 hover:bg-white/10 transition-colors"
            title="Cycle GPU Shader Background"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="capitalize">{shaderPreset.replace("-", " ")}</span>
          </button>
        </div>
      </div>

      {/* ── Main Stage Area ── */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative z-10 w-full min-h-[520px] sm:min-h-[580px] flex items-center justify-center overflow-hidden select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ perspective: "1300px" }}
      >
        {/* Stage Center Ambient Horizon Ring */}
        <div className="absolute w-[700px] h-[700px] rounded-full border border-cyan-500/15 pointer-events-none -translate-y-10 scale-y-50 blur-[1px] animate-pulse" />

        {/* Render Pattern Modes */}
        {mode === "cylinder" && (
          <CylinderStage
            items={filteredItems}
            rotation={rotation}
            activeIndex={activeIndex}
            onSelectCard={snapToIndex}
            onAction={onSelectAction}
          />
        )}

        {mode === "dna" && (
          <DnaHelixStage
            items={filteredItems}
            activeIndex={activeIndex}
            onSelectCard={snapToIndex}
            onAction={onSelectAction}
          />
        )}

        {mode === "fan" && (
          <FanArcStage
            items={filteredItems}
            activeIndex={activeIndex}
            onSelectCard={snapToIndex}
            onAction={onSelectAction}
          />
        )}

        {mode === "depth" && (
          <DepthCascadeStage
            items={filteredItems}
            activeIndex={activeIndex}
            onSelectCard={snapToIndex}
            onAction={onSelectAction}
          />
        )}

        {mode === "grid" && (
          <MatrixGridStage
            items={filteredItems}
            onAction={onSelectAction}
          />
        )}

        {/* Floating Left/Right Controls for 3D modes */}
        {mode !== "grid" && (
          <>
            <button
              onClick={rotateToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white hover:border-cyan-400/60 hover:scale-110 active:scale-95 transition-all shadow-xl z-30"
              aria-label="Previous card"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={rotateToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white hover:border-cyan-400/60 hover:scale-110 active:scale-95 transition-all shadow-xl z-30"
              aria-label="Next card"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ── Bottom HUD Status Bar ── */}
      <div className="relative z-10 px-6 py-3 border-t border-white/10 backdrop-blur-md bg-white/[0.02] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-cyan-300 font-bold uppercase tracking-wider">
              {currentActiveItem.title}
            </span>
          </div>
          <span className="text-white/30">|</span>
          <span className="text-white/60 truncate max-w-sm">
            {currentActiveItem.tagline}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-white/50 font-mono">
          <span>
            CARD {activeIndex + 1} OF {count}
          </span>
          <span>•</span>
          <span>DRAG / SWIPE TO ROTATE</span>
          <span>•</span>
          <button
            onClick={() => onSelectAction(currentActiveItem.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.25)]"
          >
            <span>{currentActiveItem.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATTERN 1: 3D CYLINDER / CAROUSEL RING
   ═══════════════════════════════════════════════════════════════════════════ */

function CylinderStage({
  items,
  rotation,
  activeIndex,
  onSelectCard,
  onAction,
}: {
  items: DecisionItem[];
  rotation: number;
  activeIndex: number;
  onSelectCard: (idx: number) => void;
  onAction: (id: string) => void;
}) {
  const count = items.length;
  const step = 360 / Math.max(count, 1);
  const radius = typeof window !== "undefined" && window.innerWidth < 640 ? 320 : 440;

  return (
    <div
      className="relative w-full h-[500px] flex items-center justify-center"
      style={{
        transformStyle: "preserve-3d",
        transform: `translateZ(-${radius * 0.45}px) rotateY(${rotation}deg)`,
        transition: "transform 0.15s ease-out",
      }}
    >
      {items.map((item, idx) => {
        const baseAngle = idx * step;
        const currentAngle = ((baseAngle + rotation) % 360 + 360) % 360;
        const normalizedAngle = currentAngle > 180 ? currentAngle - 360 : currentAngle;
        const isFacing = Math.abs(normalizedAngle) < 32;
        const isBack = Math.abs(normalizedAngle) > 95;

        // Dynamic depth properties
        const blurAmount = Math.min(5, (Math.abs(normalizedAngle) / 180) * 8);
        const opacity = isBack ? 0.25 : Math.max(0.35, Math.cos((normalizedAngle * Math.PI) / 180));
        const scale = isFacing ? 1.05 : Math.max(0.82, Math.cos((normalizedAngle * Math.PI) / 180));

        return (
          <div
            key={item.id}
            onClick={() => {
              if (isFacing) onAction(item.id);
              else onSelectCard(idx);
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] sm:w-[320px] transition-all duration-300 cursor-pointer"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(${baseAngle}deg) translateZ(${radius}px) scale(${scale})`,
              opacity,
              filter: isFacing ? "none" : `blur(${blurAmount}px)`,
              zIndex: Math.round(100 - Math.abs(normalizedAngle)),
            }}
          >
            <InteractiveCard
              item={item}
              isActive={isFacing}
              onAction={() => onAction(item.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATTERN 2: DNA CAROUSEL (3D DOUBLE HELIX / DUAL TRACK ARC)
   ═══════════════════════════════════════════════════════════════════════════ */

function DnaHelixStage({
  items,
  activeIndex,
  onSelectCard,
  onAction,
}: {
  items: DecisionItem[];
  activeIndex: number;
  onSelectCard: (idx: number) => void;
  onAction: (id: string) => void;
}) {
  const [helixOffset, setHelixOffset] = useState(0);

  // Divide into two intertwining tracks: Tactics (Top) and Squad (Bottom)
  const trackTactics = items.filter((x) => x.category === "tactics");
  const trackSquad = items.filter((x) => x.category !== "tactics");

  return (
    <div className="relative w-full h-[520px] flex items-center justify-center overflow-hidden">
      {/* Central glowing DNA axis beam */}
      <div className="absolute w-[80%] h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-[2px]" />

      {/* Track 1: Matchplay & Tactics (Upper Arc) */}
      <div className="absolute top-[22%] w-full flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-mono tracking-widest text-cyan-400/70 uppercase px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20">
          STRAND A · MATCHPLAY & TACTICAL ENGINES
        </span>
      </div>

      <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
        {items.map((item, idx) => {
          const isTopStrand = item.category === "tactics";
          const diff = idx - activeIndex;
          const angle = diff * 0.75;
          const x = Math.sin(angle) * 360;
          const z = Math.cos(angle) * 180;
          const y = isTopStrand
            ? -110 + Math.sin(angle * 2) * 25
            : 110 - Math.sin(angle * 2) * 25;

          const isActive = idx === activeIndex;
          const scale = Math.max(0.78, (z + 200) / 380);
          const opacity = Math.max(0.3, (z + 180) / 360);

          return (
            <motion.div
              key={item.id}
              onClick={() => (isActive ? onAction(item.id) : onSelectCard(idx))}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[270px] sm:w-[300px] cursor-pointer"
              animate={{
                x,
                y,
                z,
                scale: isActive ? 1.05 : scale,
                opacity,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              style={{
                zIndex: Math.round(z + 200),
                filter: isActive ? "none" : `blur(${Math.max(0, (180 - z) * 0.02)}px)`,
              }}
            >
              <InteractiveCard
                item={item}
                isActive={isActive}
                onAction={() => onAction(item.id)}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Track 2: Lower Arc Label */}
      <div className="absolute bottom-[8%] w-full flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-mono tracking-widest text-violet-400/70 uppercase px-3 py-1 rounded-full bg-violet-950/40 border border-violet-500/20">
          STRAND B · SQUAD & VALUATION INTELLIGENCE
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATTERN 3: FAN CAROUSEL / RADIAL ARC
   ═══════════════════════════════════════════════════════════════════════════ */

function FanArcStage({
  items,
  activeIndex,
  onSelectCard,
  onAction,
}: {
  items: DecisionItem[];
  activeIndex: number;
  onSelectCard: (idx: number) => void;
  onAction: (id: string) => void;
}) {
  return (
    <div className="relative w-full h-[520px] flex items-center justify-center">
      {items.map((item, idx) => {
        const delta = idx - activeIndex;
        const isCenter = delta === 0;
        const rotateZ = delta * 6.5;
        const translateX = delta * 125;
        const translateY = Math.pow(Math.abs(delta), 1.5) * 16;
        const scale = isCenter ? 1.06 : Math.max(0.75, 1 - Math.abs(delta) * 0.07);
        const opacity = Math.max(0.25, 1 - Math.abs(delta) * 0.22);
        const zIndex = 60 - Math.abs(delta);

        return (
          <motion.div
            key={item.id}
            onClick={() => (isCenter ? onAction(item.id) : onSelectCard(idx))}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[315px] cursor-pointer"
            animate={{
              x: translateX,
              y: translateY - 20,
              rotateZ,
              scale,
              opacity,
            }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            style={{
              zIndex,
              filter: isCenter ? "none" : `blur(${Math.min(4, Math.abs(delta) * 1.2)}px)`,
            }}
          >
            <InteractiveCard
              item={item}
              isActive={isCenter}
              onAction={() => onAction(item.id)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATTERN 4: DEPTH CAROUSEL / LIQUID Z-AXIS SLIDER
   ═══════════════════════════════════════════════════════════════════════════ */

function DepthCascadeStage({
  items,
  activeIndex,
  onSelectCard,
  onAction,
}: {
  items: DecisionItem[];
  activeIndex: number;
  onSelectCard: (idx: number) => void;
  onAction: (id: string) => void;
}) {
  const count = items.length;

  return (
    <div className="relative w-full h-[520px] flex items-center justify-center" style={{ perspective: "1000px" }}>
      {items.map((item, idx) => {
        // Calculate offset relative to activeIndex (circular forward window)
        const offset = (idx - activeIndex + count) % count;
        if (offset > 4 && offset < count - 1) return null; // Only render top 4 in depth

        const isFront = offset === 0;
        const translateZ = -offset * 120;
        const translateY = -offset * 24;
        const scale = 1 - offset * 0.08;
        const opacity = Math.max(0.15, 1 - offset * 0.28);
        const zIndex = 50 - offset;

        return (
          <motion.div
            key={item.id}
            onClick={() => (isFront ? onAction(item.id) : onSelectCard(idx))}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[310px] sm:w-[340px] cursor-pointer"
            animate={{
              y: translateY,
              z: translateZ,
              scale,
              opacity,
            }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            style={{
              zIndex,
              filter: isFront ? "none" : `blur(${offset * 1.8}px)`,
            }}
          >
            <InteractiveCard
              item={item}
              isActive={isFront}
              onAction={() => onAction(item.id)}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PATTERN 5: MATRIX QUANTUM GRID
   ═══════════════════════════════════════════════════════════════════════════ */

function MatrixGridStage({
  items,
  onAction,
}: {
  items: DecisionItem[];
  onAction: (id: string) => void;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <InteractiveCard
          key={item.id}
          item={item}
          isActive={false}
          onAction={() => onAction(item.id)}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REUSABLE INTERACTIVE DECISION CARD COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

function InteractiveCard({
  item,
  isActive,
  onAction,
}: {
  item: DecisionItem;
  isActive: boolean;
  onAction: () => void;
}) {
  const Icon = item.icon;

  return (
    <div
      className={`relative rounded-3xl p-5 backdrop-blur-2xl transition-all duration-300 border flex flex-col justify-between overflow-hidden group ${
        isActive
          ? `bg-gradient-to-br ${item.gradient} border-white/30 shadow-[0_0_35px_${item.glowColor}] ring-1 ring-white/20`
          : "bg-black/60 border-white/10 hover:border-white/25 hover:bg-black/75 shadow-lg"
      }`}
      style={{
        minHeight: "360px",
      }}
    >
      {/* Holographic corner shine */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none group-hover:bg-white/10 transition-colors" />

      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isActive
                ? `${item.accentBg} ${item.borderColor} shadow-[0_0_15px_${item.glowColor}]`
                : "bg-white/5 border-white/10"
            }`}
          >
            <Icon className={`w-5 h-5 ${item.accent}`} />
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${
                isActive
                  ? `${item.accentBg} ${item.accent} ${item.borderColor}`
                  : "bg-white/5 text-white/50 border-white/10"
              }`}
            >
              {item.badge}
            </span>
            <span className="font-mono text-[9px] text-white/40">
              PHASE {item.phase} · {item.num}
            </span>
          </div>
        </div>

        {/* Title & Tagline */}
        <h3 className="font-display font-black text-lg text-white tracking-tight group-hover:text-cyan-300 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-white/70 mt-1 line-clamp-2 leading-relaxed">
          {item.tagline}
        </p>

        {/* Key Quant Metrics Bar */}
        <div className="grid grid-cols-3 gap-1.5 mt-4 py-2 px-2.5 rounded-xl bg-black/40 border border-white/10">
          {item.metrics.map((m) => (
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
          {item.tags.map((t) => (
            <span
              key={t}
              className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom CTA Action Button */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md ${
            isActive
              ? `bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.4)]`
              : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
          }`}
        >
          <span>{item.cta}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
