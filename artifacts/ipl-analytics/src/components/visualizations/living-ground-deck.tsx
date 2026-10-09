import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Target, Compass, CircleDot, Activity, Zap, Play, Pause,
  Sliders, Shield, Flame, Search, ChevronRight, Eye, FastForward,
  RotateCcw, ArrowUpRight, CheckCircle2, Award, Clock, ArrowDownRight,
  TrendingUp, BarChart2, Layers, Maximize2, X, Filter, Shuffle,
  Network, ArrowLeft, ExternalLink, ChevronDown
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

import { TransferFlowSankey, RunFlowSankey, ShotFlowSankey } from "./sankey-diagram";
import { MomentumStream, WinProbabilityStream } from "./telemetry-timeline";
import { KnowledgeGraphSimple } from "./knowledge-graph";

// ─────────────────────────────────────────────────────────────────────────────
// 10 DECK CARD METADATA DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export interface DeckCardMeta {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

export const DECK_CARDS: DeckCardMeta[] = [
  {
    id: "card-scoring-radar",
    badge: "MODULE 01 • SPATIAL RADAR",
    title: "360° Scoring Radar & Radial Velocity Vectors",
    subtitle: "3D Ground Angles, AI Command & Sector Dominance",
    icon: Compass,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/20",
  },
  {
    id: "card-bowler-telemetry",
    badge: "MODULE 02 • BOWLING TELEMETRY",
    title: "3D Pitch Map & Delivery Execution Matrix",
    subtitle: "Length Zones, Bounce Vectors & Release Clusters",
    icon: Target,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/20",
  },
  {
    id: "card-the-duel",
    badge: "MODULE 03 • HEAD-TO-HEAD",
    title: "The Duel: Batter × Bowler Faceoff Matrix",
    subtitle: "Isolated Encounters & Spatial Dismissal Analysis",
    icon: Flame,
    color: "text-rose-400 border-rose-500/30 bg-rose-500/20",
  },
  {
    id: "card-length-to-shot",
    badge: "MODULE 04 • LENGTH MATRIX",
    title: "Delivery Length to Shot Type Analysis (2008 – 2026)",
    subtitle: "Interactive 5×5 Heatmap & Batter Stance Splits",
    icon: BarChart2,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/20",
  },
  {
    id: "card-shot-execution-flow",
    badge: "MODULE 05 • EXECUTION FLOW",
    title: "Delivery Type to Shot Execution Flow (2008 – 2026)",
    subtitle: "Multi-Level Sunburst Hierarchy Analysis",
    icon: Zap,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/20",
  },
  {
    id: "card-player-transfers",
    badge: "MODULE 06 • AUCTION DYNAMICS",
    title: "3D Holographic Player Transfers (2008 – 2026)",
    subtitle: "Multi-Dimensional Transfer Constellation — All 832 Movements",
    icon: Shuffle,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/20",
  },
  {
    id: "card-momentum-stream",
    badge: "MODULE 07 • TELEMETRY ENGINE",
    title: "Continuous Ball-by-Ball Momentum Stream & Live Telemetry",
    subtitle: "Database: 1,243 Total IPL Matches (2008 – 2026)",
    icon: Activity,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/20",
  },
  {
    id: "card-win-probability",
    badge: "MODULE 08 • WIN ENGINE",
    title: "Win Probability Dynamic Stream & Live Shift Engine",
    subtitle: "Database: 1,243 Total IPL Matches (2008 – 2026)",
    icon: TrendingUp,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/20",
  },
  {
    id: "card-venue-dna",
    badge: "MODULE 09 • VENUE GEOMETRY",
    title: "Venue Geometry Dimensions & Tactical AI",
    subtitle: "Boundary Clearance In Meters, Dew Factor & Pitch Conditions",
    icon: Layers,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/20",
  },
  {
    id: "card-knowledge-graph",
    badge: "MODULE 10 • KNOWLEDGE GRAPH",
    title: "Knowledge Graph Entity Map",
    subtitle: "Physics-Based Force-Simulated Relationship Engine",
    icon: Network,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/20",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STACKING DECK CARD CONTAINER
// Header with module title at top, next module's header peeking at bottom,
// and whole module info visible at one glance in between.
// ─────────────────────────────────────────────────────────────────────────────
export function StackingDeckCard({
  index,
  id,
  title,
  badge,
  Icon,
  onExpand,
  children,
}: {
  index: number;
  id: string;
  title: string;
  badge: string;
  Icon: React.ElementType;
  onExpand?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        top: "8px",
        zIndex: 10 + index * 5,
      }}
      className="sticky h-[calc(100vh-66px)] min-h-[580px] rounded-[24px] border border-slate-800/80 bg-[#070B16]/98 backdrop-blur-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden transition-all duration-300 will-change-transform"
    >
      {/* 1. MODULE HEADER STRIP (AT TOP OF MODULE) */}
      <div className="h-[54px] px-4 md:px-6 border-b border-white/10 flex items-center justify-between bg-[#080D1F]/90 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-mono text-purple-400 font-black uppercase tracking-widest block leading-none">
              {badge}
            </span>
            <h2 className="text-xs md:text-sm font-black uppercase text-white tracking-wide truncate leading-tight mt-0.5">
              {title}
            </h2>
          </div>
        </div>

        {onExpand && (
          <button
            onClick={onExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-md hover:scale-105"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Analysis</span>
            <span>↗</span>
          </button>
        )}
      </div>

      {/* 2. WHOLE MODULE INFO IN BETWEEN (VISIBLE AT ONE GLANCE) */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-5 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 01: 360° SCORING RADAR & 3D SPATIAL COMMAND (MERGED)
// ─────────────────────────────────────────────────────────────────────────────
const PLAYER_RADAR_DATA: Record<string, {
  runs: number; sr: number; fours: number; sixes: number; team: string;
  sectors: { name: string; runs: number; sr: number; fours: number; sixes: number; pct: number }[];
}> = {
  "Virat Kohli": {
    runs: 741, sr: 154.2, fours: 62, sixes: 38, team: "RCB",
    sectors: [
      { name: "Long-Off", runs: 170, sr: 173.4, fours: 14, sixes: 9, pct: 23 },
      { name: "Extra Cover", runs: 156, sr: 160.8, fours: 16, sixes: 6, pct: 21 },
      { name: "Mid Wicket", runs: 133, sr: 182.2, fours: 10, sixes: 10, pct: 18 },
      { name: "Cover / Point", runs: 118, sr: 140.5, fours: 11, sixes: 3, pct: 16 },
      { name: "Square Leg", runs: 89, sr: 157.4, fours: 6, sixes: 5, pct: 12 },
      { name: "Fine Leg / 3rd", runs: 75, sr: 128.9, fours: 5, sixes: 5, pct: 10 },
    ],
  },
  "Rohit Sharma": {
    runs: 417, sr: 150.0, fours: 45, sixes: 23, team: "MI",
    sectors: [
      { name: "Mid Wicket", runs: 122, sr: 172.5, fours: 12, sixes: 8, pct: 29 },
      { name: "Square Leg", runs: 98, sr: 165.2, fours: 10, sixes: 6, pct: 24 },
      { name: "Cover / Point", runs: 82, sr: 138.4, fours: 11, sixes: 2, pct: 20 },
      { name: "Long-Off", runs: 58, sr: 142.1, fours: 6, sixes: 3, pct: 14 },
      { name: "Extra Cover", runs: 35, sr: 125.0, fours: 4, sixes: 2, pct: 8 },
      { name: "Fine Leg / 3rd", runs: 22, sr: 118.0, fours: 2, sixes: 2, pct: 5 },
    ],
  },
  "MS Dhoni": {
    runs: 280, sr: 185.6, fours: 18, sixes: 24, team: "CSK",
    sectors: [
      { name: "Long-Off", runs: 84, sr: 210.0, fours: 5, sixes: 8, pct: 30 },
      { name: "Mid Wicket", runs: 76, sr: 195.4, fours: 4, sixes: 7, pct: 27 },
      { name: "Extra Cover", runs: 52, sr: 178.2, fours: 4, sixes: 4, pct: 19 },
      { name: "Square Leg", runs: 38, sr: 168.0, fours: 3, sixes: 3, pct: 14 },
      { name: "Fine Leg / 3rd", runs: 18, sr: 145.0, fours: 1, sixes: 1, pct: 6 },
      { name: "Cover / Point", runs: 12, sr: 130.0, fours: 1, sixes: 1, pct: 4 },
    ],
  },
  "Suryakumar Yadav": {
    runs: 540, sr: 181.2, fours: 52, sixes: 36, team: "MI",
    sectors: [
      { name: "Fine Leg / 3rd", runs: 145, sr: 225.4, fours: 14, sixes: 12, pct: 27 },
      { name: "Square Leg", runs: 120, sr: 192.0, fours: 12, sixes: 8, pct: 22 },
      { name: "Extra Cover", runs: 105, sr: 168.5, fours: 11, sixes: 6, pct: 19 },
      { name: "Mid Wicket", runs: 85, sr: 162.0, fours: 7, sixes: 5, pct: 16 },
      { name: "Long-Off", runs: 50, sr: 145.0, fours: 5, sixes: 3, pct: 9 },
      { name: "Cover / Point", runs: 35, sr: 138.0, fours: 3, sixes: 2, pct: 7 },
    ],
  },
  "KL Rahul": {
    runs: 520, sr: 136.5, fours: 48, sixes: 19, team: "DC",
    sectors: [
      { name: "Extra Cover", runs: 140, sr: 148.2, fours: 15, sixes: 5, pct: 27 },
      { name: "Long-Off", runs: 125, sr: 144.0, fours: 12, sixes: 6, pct: 24 },
      { name: "Cover / Point", runs: 95, sr: 132.5, fours: 9, sixes: 2, pct: 18 },
      { name: "Mid Wicket", runs: 80, sr: 138.0, fours: 6, sixes: 3, pct: 15 },
      { name: "Square Leg", runs: 50, sr: 125.0, fours: 4, sixes: 2, pct: 10 },
      { name: "Fine Leg / 3rd", runs: 30, sr: 115.0, fours: 2, sixes: 1, pct: 6 },
    ],
  },
  "Heinrich Klaasen": {
    runs: 479, sr: 171.1, fours: 26, sixes: 38, team: "SRH",
    sectors: [
      { name: "Mid Wicket", runs: 165, sr: 205.0, fours: 8, sixes: 16, pct: 34 },
      { name: "Long-Off", runs: 130, sr: 188.4, fours: 7, sixes: 11, pct: 27 },
      { name: "Extra Cover", runs: 78, sr: 152.0, fours: 5, sixes: 5, pct: 16 },
      { name: "Square Leg", runs: 56, sr: 148.0, fours: 3, sixes: 4, pct: 12 },
      { name: "Cover / Point", runs: 30, sr: 128.0, fours: 2, sixes: 1, pct: 6 },
      { name: "Fine Leg / 3rd", runs: 20, sr: 120.0, fours: 1, sixes: 1, pct: 5 },
    ],
  },
  "Sunil Narine": {
    runs: 485, sr: 182.4, fours: 50, sixes: 33, team: "KKR",
    sectors: [
      { name: "Mid Wicket", runs: 155, sr: 215.0, fours: 16, sixes: 12, pct: 32 },
      { name: "Long-Off", runs: 120, sr: 195.0, fours: 12, sixes: 9, pct: 25 },
      { name: "Cover / Point", runs: 85, sr: 172.0, fours: 9, sixes: 5, pct: 18 },
      { name: "Extra Cover", runs: 65, sr: 160.0, fours: 7, sixes: 4, pct: 13 },
      { name: "Square Leg", runs: 40, sr: 145.0, fours: 4, sixes: 2, pct: 8 },
      { name: "Fine Leg / 3rd", runs: 20, sr: 130.0, fours: 2, sixes: 1, pct: 4 },
    ],
  },
  "Travis Head": {
    runs: 567, sr: 191.6, fours: 64, sixes: 32, team: "SRH",
    sectors: [
      { name: "Cover / Point", runs: 175, sr: 220.0, fours: 22, sixes: 10, pct: 31 },
      { name: "Mid Wicket", runs: 140, sr: 205.0, fours: 15, sixes: 9, pct: 25 },
      { name: "Extra Cover", runs: 110, sr: 185.0, fours: 13, sixes: 6, pct: 19 },
      { name: "Long-Off", runs: 72, sr: 165.0, fours: 7, sixes: 4, pct: 13 },
      { name: "Square Leg", runs: 45, sr: 150.0, fours: 4, sixes: 2, pct: 8 },
      { name: "Fine Leg / 3rd", runs: 25, sr: 135.0, fours: 3, sixes: 1, pct: 4 },
    ],
  },
};

// Universal Sector Angular Ranges (in radians, where 0 is Straight Down Ground)
export const CRICKET_SECTORS_MAP: Record<string, { start: number; end: number }> = {
  "LONG-OFF":        { start: (65 * Math.PI) / 180,  end: (85 * Math.PI) / 180 },
  "EXTRA COVER":     { start: (35 * Math.PI) / 180,  end: (65 * Math.PI) / 180 },
  "COVER / POINT":   { start: (5 * Math.PI) / 180,   end: (35 * Math.PI) / 180 },
  "THIRD MAN":       { start: (-40 * Math.PI) / 180, end: (0 * Math.PI) / 180 },
  "FINE LEG / 3RD":  { start: (-85 * Math.PI) / 180, end: (-40 * Math.PI) / 180 },
  "SQUARE LEG":      { start: (-135 * Math.PI) / 180,end: (-90 * Math.PI) / 180 },
  "MID WICKET":      { start: (135 * Math.PI) / 180, end: (175 * Math.PI) / 180 },
  "LONG-ON":         { start: (95 * Math.PI) / 180,  end: (125 * Math.PI) / 180 },
};

// Sector name resolver to match both casing & punctuation styles
export function resolveSectorKey(name: string): string {
  const upper = name.trim().toUpperCase();
  if (upper.includes("LONG-OFF") || upper.includes("LONG OFF")) return "LONG-OFF";
  if (upper.includes("EXTRA COVER")) return "EXTRA COVER";
  if (upper.includes("COVER") || upper.includes("POINT")) return "COVER / POINT";
  if (upper.includes("FINE LEG") || upper.includes("3RD")) return "FINE LEG / 3RD";
  if (upper.includes("THIRD MAN")) return "THIRD MAN";
  if (upper.includes("SQUARE LEG")) return "SQUARE LEG";
  if (upper.includes("MID WICKET") || upper.includes("MID-WICKET")) return "MID WICKET";
  if (upper.includes("LONG-ON") || upper.includes("LONG ON")) return "LONG-ON";
  return "LONG-OFF";
}

export interface UnpackedShot {
  id: string;
  sector: string;
  type: "SIX" | "FOUR";
  runs: number;
  angle: number;
  distance: number;
  apex: number;
  launchSpeed: number;
  destination: string;
  color: string;
}

export function unpackSectorDeliveries(sectorName: string, foursCount: number, sixesCount: number): UnpackedShot[] {
  const range = CRICKET_SECTORS_MAP[sectorName] || { start: -Math.PI * 0.5, end: -Math.PI * 0.3 };
  const totalShots = foursCount + sixesCount;
  const deliveries: UnpackedShot[] = [];
  const span = range.end - range.start;
  const angleStep = span / Math.max(totalShots - 1, 1);

  // 1. Unpack all FOURS (Skimming turf, boundary rope impact at 68m - 74m)
  for (let i = 0; i < foursCount; i++) {
    const angle = range.start + i * angleStep + (Math.sin(i * 1.5) * 0.02);
    const distance = 68 + ((i % 5) * 1.2);
    deliveries.push({
      id: `${sectorName}-four-${i + 1}`,
      sector: sectorName,
      type: "FOUR",
      runs: 4,
      angle,
      distance,
      apex: 1.2 + ((i % 3) * 0.6), // Low skimming tracer
      launchSpeed: 126 + (i % 8) * 2,
      destination: "Boundary Rope / LED Board",
      color: "#00f2fe", // Electric Cyan
    });
  }

  // 2. Unpack all SIXES (Towering parabolic arc deep into tiered stands at 78m - 108m)
  for (let j = 0; j < sixesCount; j++) {
    const angle = range.start + (j + 0.4) * angleStep + (Math.cos(j * 1.7) * 0.025);
    const distance = 82 + ((j % 7) * 3.8);
    deliveries.push({
      id: `${sectorName}-six-${j + 1}`,
      sector: sectorName,
      type: "SIX",
      runs: 6,
      angle,
      distance,
      apex: 22 + ((j % 4) * 2.8), // Towering arc up into stands
      launchSpeed: 138 + (j % 9) * 2.5,
      destination: distance > 92 ? "Upper Stand Tier 2" : "Pavilion Stand Tier 1",
      color: "#f59e0b", // Broadcast Gold
    });
  }

  return deliveries;
}

export function Card01MergedScoringRadar() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("Virat Kohli");
  const [selectedSeason, setSelectedSeason] = useState<string>("2026");
  const [cameraMode, setCameraMode] = useState<"broadcast" | "overhead" | "pov">("broadcast");
  const [floodlightsOn, setFloodlightsOn] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>("");
  
  // Interactive Simulation State
  const [activeSector, setActiveSector] = useState<string>("Long-Off");
  const [activeShot, setActiveShot] = useState<UnpackedShot | null>(null);
  const [flightProgress, setFlightProgress] = useState<number>(1.0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [crowdExcitement, setCrowdExcitement] = useState<number>(0.2); // 0.0 to 1.0 cheer wave

  const activeData = PLAYER_RADAR_DATA[selectedPlayer] || PLAYER_RADAR_DATA["Virat Kohli"];
  const currentSectorData = activeData.sectors.find(s => s.name === activeSector) || activeData.sectors[0];

  // Unpack all actual Fours and Sixes for the active sector into fan-out trajectory paths
  const currentDeliveries = useMemo(() => {
    return unpackSectorDeliveries(currentSectorData.name, currentSectorData.fours, currentSectorData.sixes);
  }, [currentSectorData]);

  // Set default active shot on sector change
  useEffect(() => {
    if (currentDeliveries.length > 0) {
      setActiveShot(currentDeliveries[0]);
    }
  }, [currentDeliveries]);

  // Trigger flight simulation for a specific shot or whole sector
  const triggerSimulation = (shot?: UnpackedShot) => {
    if (shot) {
      setActiveShot(shot);
    }
    setIsSimulating(true);
    setFlightProgress(0);
    setCrowdExcitement(1.0); // Trigger stadium crowd cheer reaction
  };

  // Flight progress animation loop & crowd cheer decay
  useEffect(() => {
    let animId: number;
    if (isSimulating) {
      const startTime = performance.now();
      const duration = 1200; // 1.2s rapid broadcast flight

      const step = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1.0);
        setFlightProgress(p);
        if (p < 1.0) {
          animId = requestAnimationFrame(step);
        } else {
          setIsSimulating(false);
          // Gently ease crowd cheer back down after hit
          setTimeout(() => setCrowdExcitement(0.35), 600);
        }
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  // 3D Holistic Stadium & Crowd Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height * 0.52;
    const groundRadius = width * 0.36; // Grass field radius
    const stadiumOuterRadius = width * 0.48; // Outer stadium rim radius

    // Camera perspective vertical squash
    const pitchScaleY = cameraMode === "overhead" ? 1.0 : cameraMode === "broadcast" ? 0.60 : 0.38;

    ctx.save();
    ctx.translate(centerX, centerY);

    // ─── 1. TIERED STADIUM STANDS (VECTEEZY & DREAMSTIME STYLE) ──────
    // Outer stadium architectural ring
    ctx.save();
    ctx.scale(1, pitchScaleY);

    // Upper Stand Tier (Tier 2 - Deep Seating)
    ctx.beginPath();
    ctx.arc(0, 0, stadiumOuterRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0c1b33";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1e3a5f";
    ctx.stroke();

    // Stadium Canopy / Roof Arch
    ctx.beginPath();
    ctx.arc(0, -stadiumOuterRadius * 0.15, stadiumOuterRadius * 1.02, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Lower Stand Tier (Tier 1 - Club & Pavilion)
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius * 1.18, 0, Math.PI * 2);
    ctx.fillStyle = "#0f2342";
    ctx.fill();
    ctx.strokeStyle = "#254877";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ─── 2. DYNAMIC CHEERING CROWD SILHOUETTES & COLORFUL FLAGS ───
    const numCrowdBars = 60;
    for (let i = 0; i < numCrowdBars; i++) {
      const angle = (i / numCrowdBars) * Math.PI * 2;
      const r = groundRadius * 1.15;
      const cx = Math.cos(angle) * r;
      const cy = Math.sin(angle) * r;

      // Crowd excitement waving height
      const bounce = Math.sin(i * 3 + (crowdExcitement > 0.5 ? Date.now() * 0.015 : 0)) * 6 * crowdExcitement;
      const personH = 8 + (i % 3) * 3 + bounce;

      ctx.fillStyle = (i % 4 === 0) ? "rgba(56, 189, 248, 0.45)" : (i % 3 === 0) ? "rgba(245, 158, 11, 0.45)" : "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(cx, cy - personH, 2.5, 0, Math.PI * 2); // Head
      ctx.fill();

      // Cheering arms & team flags raised during excitement
      if (crowdExcitement > 0.5 && i % 5 === 0) {
        ctx.strokeStyle = (i % 2 === 0) ? "#ef4444" : "#eab308";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 4, cy - personH - 7);
        ctx.lineTo(cx + 10, cy - personH - 5);
        ctx.stroke();
      }
    }

    // ─── 3. DIGITAL LED ADVERTISING BOARDS ─────────────────────────
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius * 1.04, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#0ea5e9";
    ctx.shadowColor = "#0ea5e9";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // ─── 4. LUSH MOWED CRICKET TURF FIELD ──────────────────────────
    const turfGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, groundRadius);
    turfGrad.addColorStop(0, "#16a34a");
    turfGrad.addColorStop(0.55, "#15803d");
    turfGrad.addColorStop(0.85, "#14532d");
    turfGrad.addColorStop(1, "#052e16");
    ctx.fillStyle = turfGrad;
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius, 0, Math.PI * 2);
    ctx.fill();

    // Mower Crosshatch / Concentric Radial Cut Patterns
    for (let r = 30; r < groundRadius; r += 24) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // White Boundary Rope Ring
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    // 30-Yard Infield White Oval Ring
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius * 0.52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Central Pitch Clay Strip with Stumps
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(-6, -26, 12, 52);
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1;
    ctx.strokeRect(-6, -26, 12, 52);

    // Wickets Stumps (Top & Bottom ends)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, -27, 6, 2);
    ctx.fillRect(-3, 25, 6, 2);

    ctx.restore(); // restore ground transform

    // ─── 5. EIGHT BROADCAST VOLUMETRIC FLOODLIGHT TOWERS ──────────
    if (floodlightsOn) {
      const numTowers = 8;
      for (let t = 0; t < numTowers; t++) {
        const tAngle = (t / numTowers) * Math.PI * 2;
        const towerX = Math.cos(tAngle) * (stadiumOuterRadius * 1.04);
        const towerY = Math.sin(tAngle) * (stadiumOuterRadius * 1.04 * pitchScaleY);

        // Tower Lattice Mast
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(towerX, towerY);
        ctx.lineTo(towerX, towerY - 26);
        ctx.stroke();

        // Tower Lamp Bank
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(towerX - 6, towerY - 30, 12, 5);

        // Volumetric Cone Light Inward toward Pitch
        const beamGrad = ctx.createRadialGradient(towerX, towerY - 28, 4, 0, 0, groundRadius * 0.85);
        beamGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
        beamGrad.addColorStop(0.3, "rgba(56, 189, 248, 0.08)");
        beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(towerX, towerY - 28);
        ctx.lineTo(-40, -10);
        ctx.lineTo(40, 10);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ─── 6. FAN-OUT TRAJECTORY RAYS FOR ALL FOURS & SIXES ─────────
    currentDeliveries.forEach((shot) => {
      const isSelected = activeShot?.id === shot.id;
      const angle = shot.angle;
      // Scale reach: 4s reach rope (~0.96R), 6s scale up into stands (1.05R to 1.22R)
      const reachR = groundRadius * (shot.type === "SIX" ? (shot.distance / 70) * 0.95 : 0.96);
      const targetX = Math.cos(angle) * reachR;
      const targetY = Math.sin(angle) * reachR * pitchScaleY;

      // Draw subtle stationary trajectory beam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(targetX, targetY);
      ctx.strokeStyle = isSelected
        ? (shot.type === "SIX" ? "#f59e0b" : "#00f2fe")
        : (shot.type === "SIX" ? "rgba(245, 158, 11, 0.35)" : "rgba(0, 242, 254, 0.28)");
      ctx.lineWidth = isSelected ? 3 : 1.2;
      ctx.stroke();

      // Landing Beacon in the stands or on the rope
      ctx.beginPath();
      ctx.arc(targetX, targetY, isSelected ? 4.5 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = shot.color;
      ctx.shadowColor = shot.color;
      ctx.shadowBlur = isSelected ? 12 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // ─── 7. ANIMATED HAWKEYE BALL TRACER & PARABOLIC STAND HIT ────
    if (activeShot) {
      const angle = activeShot.angle;
      const reachR = groundRadius * (activeShot.type === "SIX" ? (activeShot.distance / 70) * 0.95 : 0.96);
      const targetX = Math.cos(angle) * reachR;
      const targetY = Math.sin(angle) * reachR * pitchScaleY;

      const maxApex = activeShot.type === "SIX" ? 95 : 22;
      const totalSteps = 45;
      const currentSteps = Math.floor(totalSteps * (isSimulating ? flightProgress : 1.0));

      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= currentSteps; i++) {
        const t = i / totalSteps;
        const curX = targetX * t;
        const baseY = targetY * t;
        // 3D Parabolic flight elevation
        const curApex = 4 * maxApex * t * (1 - t);
        points.push({ x: curX, y: baseY - curApex });
      }

      if (points.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = activeShot.type === "SIX" ? "#f59e0b" : "#00f2fe";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = activeShot.type === "SIX" ? "rgba(245, 158, 11, 0.9)" : "rgba(0, 242, 254, 0.9)";
        ctx.shadowBlur = 14;
        ctx.stroke();

        // White Glowing Ball Head
        const head = points[points.length - 1];
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(head.x, head.y, activeShot.type === "SIX" ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Energy Shockwave when hitting stand seating / boundary boards
        if (!isSimulating && points.length >= totalSteps) {
          ctx.strokeStyle = activeShot.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.restore(); // Restore root translation
  }, [activeSector, activeShot, currentDeliveries, cameraMode, flightProgress, isSimulating, floodlightsOn, crowdExcitement]);

  return (
    <div className="flex flex-col gap-3 h-full justify-between">
      {/* 1. TOP BROADCAST TELEMETRY STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#040817] border border-cyan-500/20 rounded-xl p-2 shrink-0 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.08)]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Hawkeye 3D Stadium
          </div>

          <span className="text-[10px] font-mono font-bold text-white/50 uppercase pl-1">Batter:</span>
          <select
            value={selectedPlayer}
            onChange={(e) => {
              setSelectedPlayer(e.target.value);
              setActiveSector("Long-Off");
            }}
            className="bg-slate-900 border border-cyan-500/40 text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-cyan-400"
          >
            {Object.keys(PLAYER_RADAR_DATA).map((p) => (
              <option key={p} value={p} className="bg-slate-950 text-white font-mono">
                {p} ({PLAYER_RADAR_DATA[p].team} • {PLAYER_RADAR_DATA[p].runs} Runs)
              </option>
            ))}
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-slate-900 border border-white/10 text-white font-mono text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            {["2026", "2025", "2024", "2023", "2022", "All Seasons"].map((s) => (
              <option key={s} value={s} className="bg-slate-950 text-white">
                {s} Season
              </option>
            ))}
          </select>
        </div>

        {/* Camera Views & Floodlight Switch */}
        <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
          {[
            { id: "broadcast", label: "45° Orbit" },
            { id: "overhead", label: "Overhead" },
            { id: "pov", label: "Pitch POV" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setCameraMode(mode.id as any)}
              className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                cameraMode === mode.id
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/25 font-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
          <button
            onClick={() => setFloodlightsOn(!floodlightsOn)}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ml-1 cursor-pointer ${
              floodlightsOn ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-white/40 border border-transparent"
            }`}
          >
            Lights: {floodlightsOn ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* 2. MAIN STAGE: 3D STADIUM CANVAS (LEFT) + EXPANDED FAN-OUT ROWS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center flex-1 min-h-0">
        {/* LEFT: 3D STADIUM WITH SEATING TIERS & CHEERING CROWD */}
        <div className="lg:col-span-6 flex flex-col items-center justify-between p-3 bg-[#030611] border border-cyan-500/20 rounded-2xl relative h-full min-h-[330px] overflow-hidden shadow-[inset_0_0_30px_rgba(6,182,212,0.06)]">
          {/* Top Live Legend with Crowd Intensity */}
          <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold px-2 z-10">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Sixes ({currentSectorData.sixes} Fan-Out)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Fours ({currentSectorData.fours} Fan-Out)
            </span>
            <span className="text-purple-300 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${crowdExcitement > 0.5 ? "bg-green-400 animate-ping" : "bg-slate-400"}`} />
              Crowd: {crowdExcitement > 0.5 ? "ROARING" : "ACTIVE"}
            </span>
          </div>

          {/* 3D Canvas Stage */}
          <div className="relative w-full aspect-square max-w-[290px] md:max-w-[320px] flex items-center justify-center my-auto">
            <canvas
              ref={canvasRef}
              width={540}
              height={450}
              className="w-full h-full object-contain drop-shadow-2xl cursor-crosshair"
            />
          </div>

          {/* Live Flight Telemetry Floating Lower-Third */}
          {activeShot && (
            <div className="w-full bg-[#070e1c]/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono z-10 shadow-lg">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                  <span>Hawkeye Flight Track</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-white">{activeShot.destination}</span>
                </div>
                <div className="text-white font-extrabold text-xs mt-0.5 flex items-center gap-2">
                  <span className={activeShot.type === "SIX" ? "text-amber-400" : "text-cyan-300"}>
                    {activeShot.type === "SIX" ? "AERIAL MAXIMUM (6)" : "GROUND BOUNDARY (4)"}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400 font-mono">{activeShot.distance.toFixed(1)}m Distance</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <span className="text-[8px] text-slate-400 block uppercase">Speed</span>
                  <span className="text-cyan-300 font-bold text-xs">{activeShot.launchSpeed} km/h</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 block uppercase">Apex</span>
                  <span className="text-amber-300 font-bold text-xs">{activeShot.apex.toFixed(1)}m</span>
                </div>
                <button
                  onClick={() => triggerSimulation(activeShot)}
                  className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition-all font-bold cursor-pointer"
                  title="Replay Trajectory"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: SECTOR SELECTORS & ALL UNPACKED SHOT RAYS */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full gap-2">
          {/* 6 Macro Sector Selector Buttons */}
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <span>{selectedPlayer}</span>
              <span className="text-cyan-400 font-mono text-[10px]">({currentSectorData.name} • {currentDeliveries.length} Exploded Shots)</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              {currentSectorData.runs} Runs • {currentSectorData.sr} SR
            </span>
          </div>

          {/* Quick Sector Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            {activeData.sectors.map((sec) => (
              <button
                key={sec.name}
                onClick={() => {
                  setActiveSector(sec.name);
                  setCrowdExcitement(0.8);
                }}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer font-mono text-[10px] ${
                  activeSector === sec.name
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-md shadow-cyan-500/10"
                    : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="truncate font-sans font-bold">{sec.name}</div>
                <div className="text-[9px] text-amber-400">{sec.fours + sec.sixes} Hits ({sec.pct}%)</div>
              </button>
            ))}
          </div>

          {/* Unpacked Individual Shot Ray Cards (Scrollable Fan-Out) */}
          <div className="flex-1 max-h-[145px] overflow-y-auto no-scrollbar border border-white/5 rounded-xl p-1.5 bg-black/40 flex flex-col gap-1">
            <div className="text-[9px] font-mono uppercase text-slate-400 px-1 pb-0.5 flex items-center justify-between">
              <span>Click individual shot ray to simulate:</span>
              <span className="text-cyan-400">{currentDeliveries.length} trajectory lines</span>
            </div>
            {currentDeliveries.map((shot, idx) => {
              const isSelected = activeShot?.id === shot.id;
              return (
                <button
                  key={shot.id}
                  onClick={() => triggerSimulation(shot)}
                  className={`px-2 py-1 rounded-md text-left transition-all cursor-pointer flex items-center justify-between font-mono text-[10px] border ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400 text-white font-bold"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${shot.type === "SIX" ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"}`}>
                      {shot.type}
                    </span>
                    <span className="truncate max-w-[130px]">{shot.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="text-slate-400">{shot.launchSpeed} km/h</span>
                    <span className={shot.type === "SIX" ? "text-amber-400" : "text-cyan-400"}>
                      {shot.distance.toFixed(0)}m
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI Command Input Bar */}
          <div className="w-full bg-[#0B1226]/90 border border-cyan-500/25 rounded-xl p-1.5 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask Hawkeye Radar for ${selectedPlayer}...`}
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/40 font-mono"
            />
            <button
              onClick={() => {
                setPrompt("Zone trajectories synced");
                triggerSimulation();
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-[10px] uppercase rounded-lg cursor-pointer transition-all"
            >
              Scan
            </button>
          </div>

          {/* Telemetry Summary Banner */}
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#0a0f1d] to-cyan-950/30 border border-cyan-500/20 text-[10px] text-white/70 flex items-center justify-between">
            <span>
              <strong className="text-cyan-300">Hawkeye Analysis:</strong> Fanned out <strong>{currentDeliveries.length}</strong> shots in {currentSectorData.name} ({currentSectorData.fours} Fours, {currentSectorData.sixes} Sixes).
            </span>
            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 02: 3D PITCH MAP & BOWLER EXECUTION MATRIX
// ─────────────────────────────────────────────────────────────────────────────
export function Card02BowlerTelemetry() {
  const executionDeliveries = [
    { type: "Yorker", balls: 412, econ: 6.23, wkts: 38, dotPct: 52.4, color: "text-red-400", border: "border-red-500/40" },
    { type: "Bouncer", balls: 580, econ: 8.19, wkts: 45, dotPct: 41.2, color: "text-purple-400", border: "border-purple-500/40" },
    { type: "Good Length", balls: 1240, econ: 6.87, wkts: 88, dotPct: 48.6, color: "text-amber-400", border: "border-amber-400/40" },
    { type: "Cutter / Spinner", balls: 840, econ: 6.85, wkts: 54, dotPct: 46.8, color: "text-emerald-400", border: "border-emerald-400/40" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center h-full">
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-[#050814] border border-white/10 rounded-2xl h-full min-h-[300px]">
        <div className="text-[10px] font-mono font-bold text-white/60 mb-2 flex items-center justify-between w-full px-1">
          <span>BOWLER RELEASE</span>
          <span className="text-cyan-400">BATTER CREASE</span>
        </div>
        <div className="relative w-full aspect-[1/2] max-w-[170px] rounded-xl overflow-hidden border border-amber-600/30 bg-[#2b1805]">
          <svg viewBox="0 0 100 240" className="w-full h-full">
            <rect x="5" y="5" width="90" height="230" rx="4" fill="#58240a" />
            <rect x="5" y="40" width="90" height="45" fill="#a855f7" fillOpacity="0.18" />
            <text x="50" y="65" fill="#c084fc" fontSize="5" fontWeight="900" textAnchor="middle">BOUNCER (6-8m)</text>
            <rect x="5" y="85" width="90" height="55" fill="#f59e0b" fillOpacity="0.18" />
            <text x="50" y="115" fill="#fbbf24" fontSize="5" fontWeight="900" textAnchor="middle">GOOD LENGTH (4-6m)</text>
            <rect x="5" y="140" width="90" height="40" fill="#10b981" fillOpacity="0.18" />
            <text x="50" y="162" fill="#34d399" fontSize="5" fontWeight="900" textAnchor="middle">FULL / SLOT (2-4m)</text>
            <rect x="5" y="180" width="90" height="30" fill="#ef4444" fillOpacity="0.22" />
            <text x="50" y="197" fill="#f87171" fontSize="5" fontWeight="900" textAnchor="middle">YORKER (0-2m)</text>
            <line x1="5" y1="210" x2="95" y2="210" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="50" cy="220" r="2" fill="#ffffff" />
            <circle cx="48" cy="195" r="2.5" fill="#ef4444" className="animate-pulse" />
            <circle cx="42" cy="105" r="2.5" fill="#f59e0b" />
            <circle cx="55" cy="112" r="2.5" fill="#f59e0b" />
            <circle cx="46" cy="55" r="2.5" fill="#c084fc" />
            <circle cx="34" cy="148" r="2.5" fill="#34d399" />
          </svg>
        </div>
      </div>

      <div className="lg:col-span-7 grid grid-cols-2 gap-3 h-full flex flex-col justify-center">
        {executionDeliveries.map((item) => (
          <div
            key={item.type}
            className={`p-3.5 rounded-xl bg-[#090e1c] border ${item.border} flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className={`text-xs font-black uppercase ${item.color}`}>{item.type}</span>
              <span className="text-[10px] font-mono text-white/50">{item.balls} Balls</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono my-2">
              <div className="p-1.5 bg-black/40 rounded-lg"><span className="text-[7px] text-white/40 block">ECON</span><span className="text-xs font-black text-white">{item.econ}</span></div>
              <div className="p-1.5 bg-black/40 rounded-lg"><span className="text-[7px] text-white/40 block">WKTS</span><span className="text-xs font-black text-emerald-400">{item.wkts}</span></div>
              <div className="p-1.5 bg-black/40 rounded-lg"><span className="text-[7px] text-white/40 block">DOT%</span><span className="text-xs font-black text-cyan-400">{item.dotPct}%</span></div>
            </div>
            <span className="text-[9px] font-mono text-white/50 block text-right">False Shot Pressure: 38.4%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD 03: THE DUEL (Batter × Bowler Matchup Combat Arena)
// ─────────────────────────────────────────────────────────────────────────────
export interface DuelDismissal {
  id: string;
  mode: string;
  overBall: string;
  phase: "Powerplay" | "Middle" | "Death";
  lengthLine: string;
  speed: string;
  shotAttempted: string;
  trajectory: {
    bounceY: number; // Pitch bounce distance from bowling crease (m)
    stumpX: number;  // Lateral line (-3 = outside off, 0 = middle, 2 = leg)
    stumpY: number;  // Height at crease
    isWicket: boolean;
  };
}

export const KOHLI_BUMRAH_DISMISSALS: DuelDismissal[] = [
  {
    id: "dis-1",
    mode: "Caught Behind (Edge)",
    overBall: "Over 3.2",
    phase: "Powerplay",
    lengthLine: "Good Length (5.4m), 5th Stump Corridor",
    speed: "143.2 km/h",
    shotAttempted: "Defensive push away from body",
    trajectory: { bounceY: 14.8, stumpX: -2.8, stumpY: 1.1, isWicket: true }
  },
  {
    id: "dis-2",
    mode: "Clean Bowled",
    overBall: "Over 18.4",
    phase: "Death",
    lengthLine: "Yorker (1.2m), Base of Leg Stump",
    speed: "146.8 km/h",
    shotAttempted: "Attempted leg-side flick",
    trajectory: { bounceY: 19.2, stumpX: 1.4, stumpY: 0.3, isWicket: true }
  },
  {
    id: "dis-3",
    mode: "Caught at Mid-Off",
    overBall: "Over 16.1",
    phase: "Death",
    lengthLine: "Hard Back of Length (7.8m), 4th Stump",
    speed: "139.5 km/h",
    shotAttempted: "Flat lofted slap over mid-off",
    trajectory: { bounceY: 12.4, stumpX: -1.6, stumpY: 1.4, isWicket: true }
  },
  {
    id: "dis-4",
    mode: "LBW (Seam-In)",
    overBall: "Over 4.5",
    phase: "Powerplay",
    lengthLine: "Full in the slot (3.1m), Middle Stump",
    speed: "141.6 km/h",
    shotAttempted: "Closed bat face working to midwicket",
    trajectory: { bounceY: 17.1, stumpX: 0.1, stumpY: 0.75, isWicket: true }
  }
];

export function Card03TheDuel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedBallIndex, setSelectedBallIndex] = useState<number>(96);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [selectedDismissal, setSelectedDismissal] = useState<DuelDismissal | null>(null);
  const [activePhaseFilter, setActivePhaseFilter] = useState<"All" | "Powerplay" | "Death">("All");

  // Auto-play timeline loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingTimeline) {
      timer = setInterval(() => {
        setSelectedBallIndex((prev) => {
          if (prev >= 96) return 1;
          return prev + 1;
        });
      }, 120);
    }
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // 3D Duel Pitch Hologram Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Perspective pitch dimensions (isometric angled view)
    const topX = width * 0.5;
    const topY = height * 0.15;
    const topPitchW = width * 0.22; // Bowler release crease (narrower in distance)

    const botX = width * 0.5;
    const botY = height * 0.88;
    const botPitchW = width * 0.58; // Batter crease (wider up front)

    // 1. Perspective Pitch Mat
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topX - topPitchW / 2, topY);
    ctx.lineTo(topX + topPitchW / 2, topY);
    ctx.lineTo(botX + botPitchW / 2, botY);
    ctx.lineTo(botX - botPitchW / 2, botY);
    ctx.closePath();

    const pitchMatGrad = ctx.createLinearGradient(0, topY, 0, botY);
    pitchMatGrad.addColorStop(0, "#2c1507");
    pitchMatGrad.addColorStop(0.5, "#45220c");
    pitchMatGrad.addColorStop(1, "#5a2d10");
    ctx.fillStyle = pitchMatGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crease Markings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    // Bowler popping crease
    ctx.beginPath();
    ctx.moveTo(topX - topPitchW * 0.7, topY + 6);
    ctx.lineTo(topX + topPitchW * 0.7, topY + 6);
    ctx.stroke();
    // Batter batting crease
    ctx.beginPath();
    ctx.moveTo(botX - botPitchW * 0.7, botY - 18);
    ctx.lineTo(botX + botPitchW * 0.7, botY - 18);
    ctx.stroke();

    // Wickets Stumps (Bowler end vs Batter end)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(topX - 3, topY - 5, 6, 4); // bowler stumps
    ctx.fillStyle = "#facc15";
    ctx.fillRect(botX - 6, botY - 24, 12, 6); // batter 3 stumps
    ctx.restore();

    // 2. Render Historical 96 Deliveries up to selectedBallIndex
    const totalRenderBalls = Math.min(selectedBallIndex, 96);
    for (let b = 1; b <= totalRenderBalls; b++) {
      // Procedural deterministic trajectory data for each ball
      const isDot = b % 2 === 0 && b % 7 !== 0; // 42 dots
      const isBoundary = b % 5 === 0; // boundaries
      const isWicketBall = b === 18 || b === 42 || b === 74 || b === 92; // 4 dismissals

      const lateralDrift = Math.sin(b * 1.8) * (botPitchW * 0.38);
      const bounceT = 0.55 + Math.sin(b * 0.9) * 0.18; // length of pitch bounce

      const startPt = { x: topX + Math.sin(b * 2) * (topPitchW * 0.2), y: topY };
      const bouncePt = {
        x: topX + lateralDrift * 0.4,
        y: topY + (botY - topY) * bounceT,
      };
      const endPt = {
        x: botX + lateralDrift,
        y: botY - 18,
      };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.quadraticCurveTo(bouncePt.x, bouncePt.y - 14, bouncePt.x, bouncePt.y);
      ctx.quadraticCurveTo(endPt.x, endPt.y - 8, endPt.x, endPt.y);

      if (isWicketBall) {
        ctx.strokeStyle = "#ef4444"; // Fiery Crimson Dismissal
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Stumps impact explosion ring
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();

        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("W", endPt.x, endPt.y + 3);
      } else if (isBoundary) {
        ctx.strokeStyle = "#00f2fe"; // Electric Cyan Boundary
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "rgba(0, 242, 254, 0.4)";
        ctx.shadowBlur = 6;
        ctx.stroke();
      } else if (isDot) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)"; // Muted Slate Dot
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)"; // Singles/Twos
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Highlighted Replay for Selected Dismissal Card
    if (selectedDismissal) {
      const traj = selectedDismissal.trajectory;
      const bounceY = topY + (botY - topY) * (traj.bounceY / 22);
      const targetX = botX + (traj.stumpX * 18);
      const targetY = botY - 18 - (traj.stumpY * 12);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + traj.stumpX * 6, bounceY - 26, topX + traj.stumpX * 8, bounceY);
      ctx.quadraticCurveTo(targetX, targetY - 12, targetX, targetY);
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 16;
      ctx.stroke();

      // Glowing ball head impact
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [selectedBallIndex, selectedDismissal]);

  return (
    <div className="flex flex-col gap-4 h-full justify-between">
      {/* 1. COMBAT CLASH VERSUS ENERGY HEADER */}
      <div className="relative flex flex-col md:flex-row items-center justify-between p-5 md:p-6 bg-gradient-to-r from-red-950/40 via-slate-900/90 to-blue-950/40 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl shrink-0 gap-4">
        {/* Left: Batter (Kohli / RCB Crimson Glow) */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-red-500 bg-red-950/60 flex items-center justify-center font-black text-xl text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              VK
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-red-600 text-[10px] font-mono font-bold rounded text-white">
              RCB
            </span>
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-widest text-red-400 uppercase">Primary Target</div>
            <h3 className="text-2xl font-black tracking-tight text-white uppercase">VIRAT KOHLI</h3>
            <div className="text-xs text-slate-400 font-mono">142 Runs • 96 Balls • 147.9 SR</div>
          </div>
        </div>

        {/* Center: Duel Badge & Tug-of-War Pressure Meter */}
        <div className="flex flex-col items-center justify-center px-4 md:px-6 w-full md:w-auto">
          <div className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] uppercase mb-1">Faceoff Index</div>
          <div className="px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 font-black text-sm tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            96 DELIVERIES • 4 DISMISSALS
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Avg: 35.5 • Dot%: 43.7%</div>

          {/* Bidirectional Pressure Tug-of-War Gauge */}
          <div className="w-full max-w-[220px] mt-2">
            <div className="flex justify-between text-[8px] font-mono text-slate-400 mb-0.5 font-bold">
              <span className="text-red-400">KOHLI (174.5 SR)</span>
              <span className="text-cyan-400">BUMRAH (58% DOTS)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div className="bg-gradient-to-r from-red-600 to-red-400 h-full w-[46%]" />
              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full w-[54%]" />
            </div>
          </div>
        </div>

        {/* Right: Bowler (Bumrah / MI Electric Blue Glow) */}
        <div className="flex items-center gap-4 flex-row-reverse text-right">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-blue-950/60 flex items-center justify-center font-black text-xl text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              JB
            </div>
            <span className="absolute -bottom-1 -left-1 px-1.5 py-0.5 bg-cyan-600 text-[10px] font-mono font-bold rounded text-white">
              MI
            </span>
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase">Apex Enforcer</div>
            <h3 className="text-2xl font-black tracking-tight text-white uppercase">JASPRIT BUMRAH</h3>
            <div className="text-xs text-slate-400 font-mono">4 Wkts • 8.87 Econ • 78/100 Threat</div>
          </div>
        </div>
      </div>

      {/* 2. MAIN STAGE: 3D DUEL PITCH HOLOGRAM (LEFT) + DISMISSAL ANATOMY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center flex-1 min-h-0">
        {/* LEFT: 3D DUEL PITCH HOLOGRAPHIC CAGE */}
        <div className="lg:col-span-6 flex flex-col items-center justify-between p-3.5 bg-[#030611] border border-cyan-500/20 rounded-2xl relative h-full min-h-[320px] shadow-[inset_0_0_30px_rgba(6,182,212,0.06)]">
          {/* Top Hologram Indicators */}
          <div className="flex items-center justify-between w-full text-[9px] font-mono font-bold px-2 z-10">
            <span className="text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Dots (42) / Runs (40)
            </span>
            <span className="text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Dismissals (4)
            </span>
            <span className="text-slate-400">3D Pitch Perspective</span>
          </div>

          {/* 3D Duel Hologram Canvas */}
          <div className="relative w-full aspect-[4/3] max-w-[340px] flex items-center justify-center my-auto">
            <canvas
              ref={canvasRef}
              width={500}
              height={380}
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* Timeline Scrubber across bottom of Pitch */}
          <div className="w-full bg-[#070e1c]/95 backdrop-blur-md border border-white/10 rounded-xl p-2.5 z-10 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-cyan-400" />
                Delivery {selectedBallIndex} of 96
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                  className="px-2 py-0.5 rounded bg-cyan-500 text-black font-extrabold text-[9px] uppercase cursor-pointer hover:bg-cyan-400"
                >
                  {isPlayingTimeline ? "Pause" : "Play History"}
                </button>
                <button
                  onClick={() => { setSelectedBallIndex(96); setSelectedDismissal(null); }}
                  className="text-slate-400 hover:text-white"
                  title="Reset to Ball 96"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="96"
              value={selectedBallIndex}
              onChange={(e) => setSelectedBallIndex(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* RIGHT: DISMISSAL ANATOMY CARDS & MATCH PHASE SELECTOR */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full gap-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              <span>Dismissal Anatomy</span>
              <span className="text-rose-400 font-mono text-[10px]">(Click to Replay Ball Track)</span>
            </span>
            <div className="flex items-center gap-1">
              {(["All", "Powerplay", "Death"] as const).map((ph) => (
                <button
                  key={ph}
                  onClick={() => setActivePhaseFilter(ph)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    activePhaseFilter === ph ? "bg-rose-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Dismissal Breakdown Cards */}
          <div className="grid grid-cols-1 gap-2 flex-1 max-h-[220px] overflow-y-auto no-scrollbar">
            {KOHLI_BUMRAH_DISMISSALS
              .filter((d) => activePhaseFilter === "All" || d.phase === activePhaseFilter)
              .map((d) => {
                const isSelected = selectedDismissal?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDismissal(d);
                      setSelectedBallIndex(96);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-mono text-[9px] font-black">
                          {d.overBall}
                        </span>
                        <span>{d.mode}</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{d.speed}</span>
                    </div>

                    <div className="text-[10px] text-slate-300 font-mono mt-1">
                      Length: <strong className="text-amber-300">{d.lengthLine}</strong>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Execution: {d.shotAttempted}
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Tactical Readout */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/40 via-[#0a0f1d] to-cyan-950/30 border border-white/10 text-[10px] text-slate-300 flex items-center justify-between font-mono">
            <span>
              <strong>Bumrah Weaponry:</strong> 50% dismissals off Good Length corridor; 50% base yorker/slap setups in death.
            </span>
            <Flame className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// CARD 09: VENUE GEOMETRY DIMENSIONS & TACTICAL AI
// ─────────────────────────────────────────────────────────────────────────────
export function Card09VenueDna() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center h-full">
      <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 bg-[#050814] border border-white/10 rounded-2xl h-full">
        <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest mb-1">BOUNDARY CLEARANCE (METERS)</span>
        <div className="relative w-full aspect-square max-w-[240px] rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 p-2">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <circle cx="200" cy="200" r="190" fill="#062211" stroke="#14532d" strokeWidth="2" />
            <circle cx="200" cy="200" r="180" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
            <rect x="194" y="175" width="12" height="50" rx="2" fill="#ca8a04" />
            <line x1="200" y1="175" x2="200" y2="25" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
            <text x="200" y="43" fill="#38bdf8" fontSize="9" fontWeight="900" textAnchor="middle">Straight 74m</text>
            <line x1="206" y1="200" x2="375" y2="200" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
            <text x="340" y="195" fill="#f59e0b" fontSize="9" fontWeight="900" textAnchor="middle">Square Off 66m</text>
            <line x1="194" y1="200" x2="25" y2="200" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
            <text x="60" y="195" fill="#f59e0b" fontSize="9" fontWeight="900" textAnchor="middle">Square Leg 64m</text>
          </svg>
        </div>
      </div>

      <div className="lg:col-span-6 space-y-3 flex flex-col justify-center h-full">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-cyan-500/20">
            <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold block">PACE EFFICIENCY</span>
            <div className="text-lg font-black text-white font-mono">7.82 <span className="text-[10px] text-white/40">ECON</span></div>
            <span className="text-[9px] text-white/60 font-mono">19.2 SR • 68% Wkts</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-purple-500/20">
            <span className="text-[9px] font-mono uppercase text-purple-400 font-bold block">SPIN CONTROL</span>
            <div className="text-lg font-black text-white font-mono">7.21 <span className="text-[10px] text-white/40">ECON</span></div>
            <span className="text-[9px] text-white/60 font-mono">24.5 SR • 32% Wkts</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#0e1628] border border-white/10 text-xs text-white/80 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-[10px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI TACTICAL BLUEPRINT</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Shorter square boundaries (64m-66m) favor cross-batted shots. Dew surges post 8:45 PM (+14% skid rate), favoring chase teams (62.5% win rate).
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL-PAGE SUB-PAGE EXPANSION MODAL (FULL SCREEN + COMEBACK OPTION)
// ─────────────────────────────────────────────────────────────────────────────
export function FullAnalysisModal({
  cardId,
  onClose,
}: {
  cardId: string;
  onClose: () => void;
}) {
  const cardMeta = DECK_CARDS.find((c) => c.id === cardId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!cardMeta) return null;

  const Icon = cardMeta.icon;

  return (
    <div className="fixed inset-0 z-[999999] w-screen h-screen bg-[#020510] text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* 1. FIXED TOP ACTION BAR WITH PROMINENT "BACK TO DECK" BUTTON */}
      <div className="h-16 border-b border-white/10 bg-[#070B18]/95 backdrop-blur-2xl px-4 md:px-8 flex items-center justify-between shrink-0 shadow-2xl z-20">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/40 cursor-pointer hover:scale-105 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Deck</span>
          </button>

          <div className="h-6 w-px bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl border ${cardMeta.color} shrink-0 hidden sm:flex`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest block leading-none">
                {cardMeta.badge} • FULL DOSSIER
              </span>
              <h1 className="text-sm md:text-base font-black uppercase text-white tracking-wide truncate mt-0.5">
                {cardMeta.title}
              </h1>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all cursor-pointer border border-white/10 shrink-0"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* 2. EXPANSIVE FULL-SCREEN UNCUT DOSSIER BODY */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="bg-[#070B16] border border-white/10 rounded-2xl p-4 md:p-8 shadow-2xl min-h-[600px]">
          {cardId === "card-scoring-radar" && <Card01MergedScoringRadar />}
          {cardId === "card-bowler-telemetry" && <Card02BowlerTelemetry />}
          {cardId === "card-the-duel" && <Card03TheDuel />}
          {cardId === "card-length-to-shot" && <RunFlowSankey />}
          {cardId === "card-shot-execution-flow" && <ShotFlowSankey />}
          {cardId === "card-player-transfers" && <TransferFlowSankey />}
          {cardId === "card-momentum-stream" && <MomentumStream title="Database: 1,243 Total IPL Matches (2008 – 2026)" />}
          {cardId === "card-win-probability" && <WinProbabilityStream team1="RCB" team2="CSK" />}
          {cardId === "card-venue-dna" && <Card09VenueDna />}
          {cardId === "card-knowledge-graph" && <KnowledgeGraphSimple />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT: LIVING GROUND DECK
// Renders the 10 stacked cards with peeking headers and full in-between views
// ─────────────────────────────────────────────────────────────────────────────
export function LivingGroundDeck() {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const scrollToCard = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 10;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-2 md:px-4 pb-24 space-y-4">
      {/* QUICK FILTER DIMENSION BAR (JUMP DIRECTLY TO ANY MODULE) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 px-3 bg-[#060A18]/90 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-purple-400 shrink-0 flex items-center gap-1.5 pr-2 border-r border-white/10">
          <Filter className="w-3.5 h-3.5" /> Dimensions
        </span>
        {DECK_CARDS.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => scrollToCard(card.id)}
            className="shrink-0 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-purple-600/30 border border-white/10 hover:border-purple-500/40 text-white/70 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <span className="text-purple-400 font-black">0{idx + 1}</span>
            <span className="truncate max-w-[130px]">{card.badge.split("•")[1]?.trim() || card.title}</span>
          </button>
        ))}
      </div>

      {/* 10 STACKING MODULE CARDS */}
      {/* CARD 01 */}
      <StackingDeckCard
        index={0}
        id="card-scoring-radar"
        badge="MODULE 01 • SPATIAL RADAR & COMMAND"
        title="360° Scoring Radar & Radial Velocity Vectors"
        Icon={Compass}
        onExpand={() => setExpandedCardId("card-scoring-radar")}
      >
        <Card01MergedScoringRadar />
      </StackingDeckCard>

      {/* CARD 02 */}
      <StackingDeckCard
        index={1}
        id="card-bowler-telemetry"
        badge="MODULE 02 • BOWLING TELEMETRY"
        title="3D Pitch Map & Delivery Execution Matrix"
        Icon={Target}
        onExpand={() => setExpandedCardId("card-bowler-telemetry")}
      >
        <Card02BowlerTelemetry />
      </StackingDeckCard>

      {/* CARD 03 */}
      <StackingDeckCard
        index={2}
        id="card-the-duel"
        badge="MODULE 03 • HEAD-TO-HEAD"
        title="The Duel: Batter × Bowler Faceoff Matrix"
        Icon={Flame}
        onExpand={() => setExpandedCardId("card-the-duel")}
      >
        <Card03TheDuel />
      </StackingDeckCard>

      {/* CARD 04 */}
      <StackingDeckCard
        index={3}
        id="card-length-to-shot"
        badge="MODULE 04 • LENGTH MATRIX"
        title="Delivery Length to Shot Type Analysis (2008 – 2026)"
        Icon={BarChart2}
        onExpand={() => setExpandedCardId("card-length-to-shot")}
      >
        <RunFlowSankey />
      </StackingDeckCard>

      {/* CARD 05 */}
      <StackingDeckCard
        index={4}
        id="card-shot-execution-flow"
        badge="MODULE 05 • EXECUTION FLOW"
        title="Delivery Type to Shot Execution Flow (2008 – 2026)"
        Icon={Zap}
        onExpand={() => setExpandedCardId("card-shot-execution-flow")}
      >
        <ShotFlowSankey />
      </StackingDeckCard>

      {/* CARD 06 */}
      <StackingDeckCard
        index={5}
        id="card-player-transfers"
        badge="MODULE 06 • AUCTION DYNAMICS"
        title="3D Holographic Player Transfers (2008 – 2026) — Multi-Dimensional Transfer Constellation"
        Icon={Shuffle}
        onExpand={() => setExpandedCardId("card-player-transfers")}
      >
        <TransferFlowSankey />
      </StackingDeckCard>

      {/* CARD 07 */}
      <StackingDeckCard
        index={6}
        id="card-momentum-stream"
        badge="MODULE 07 • TELEMETRY ENGINE"
        title="Continuous Ball-by-Ball Momentum Stream & Live Telemetry"
        Icon={Activity}
        onExpand={() => setExpandedCardId("card-momentum-stream")}
      >
        <MomentumStream title="Database: 1,243 Total IPL Matches (2008 – 2026)" />
      </StackingDeckCard>

      {/* CARD 08 */}
      <StackingDeckCard
        index={7}
        id="card-win-probability"
        badge="MODULE 08 • WIN ENGINE"
        title="Win Probability Dynamic Stream & Live Shift Engine"
        Icon={TrendingUp}
        onExpand={() => setExpandedCardId("card-win-probability")}
      >
        <WinProbabilityStream team1="RCB" team2="CSK" />
      </StackingDeckCard>

      {/* CARD 09 */}
      <StackingDeckCard
        index={8}
        id="card-venue-dna"
        badge="MODULE 09 • VENUE GEOMETRY"
        title="Venue Geometry Dimensions & Tactical AI"
        Icon={Layers}
        onExpand={() => setExpandedCardId("card-venue-dna")}
      >
        <Card09VenueDna />
      </StackingDeckCard>

      {/* CARD 10 */}
      <StackingDeckCard
        index={9}
        id="card-knowledge-graph"
        badge="MODULE 10 • KNOWLEDGE GRAPH"
        title="Knowledge Graph Entity Map"
        Icon={Network}
        onExpand={() => setExpandedCardId("card-knowledge-graph")}
      >
        <KnowledgeGraphSimple />
      </StackingDeckCard>

      {/* FULL-SCREEN SUB-PAGE DOSSIER VIEW (ESC / BACK TO DECK) */}
      {expandedCardId && (
        <FullAnalysisModal
          cardId={expandedCardId}
          onClose={() => setExpandedCardId(null)}
        />
      )}
    </div>
  );
}
