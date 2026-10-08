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

export function Card01MergedScoringRadar() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("Virat Kohli");
  const [selectedSeason, setSelectedSeason] = useState<string>("2026");
  const [cameraMode, setCameraMode] = useState<"broadcast" | "overhead" | "pov">("broadcast");
  const [floodlightsOn, setFloodlightsOn] = useState<boolean>(true);
  const [prompt, setPrompt] = useState<string>("");

  const activeData = PLAYER_RADAR_DATA[selectedPlayer] || PLAYER_RADAR_DATA["Virat Kohli"];

  return (
    <div className="flex flex-col gap-3 h-full justify-between">
      {/* 1. TOP STRIP: PLAYER DROPDOWN + SEASON + CAMERA ANGLES */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#040817] border border-white/10 rounded-xl p-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold text-white/50 uppercase pl-1">Player:</span>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="bg-slate-900 border border-purple-500/40 text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-purple-400"
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

        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          {[
            { id: "broadcast", label: "45° Orbit" },
            { id: "overhead", label: "Overhead" },
            { id: "pov", label: "Pitch POV" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setCameraMode(mode.id as any)}
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                cameraMode === mode.id ? "bg-purple-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
          <button
            onClick={() => setFloodlightsOn(!floodlightsOn)}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ml-1 cursor-pointer ${
              floodlightsOn ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-white/40"
            }`}
          >
            Lights: {floodlightsOn ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* 2. MAIN STAGE: 3D GROUND (LEFT) + 6 SECTOR TILES (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center flex-1 min-h-0">
        {/* LEFT: 3D GROUND RADAR WITH SHOT VECTORS */}
        <div className="lg:col-span-6 flex flex-col items-center justify-between p-3 bg-[#030611] border border-white/10 rounded-2xl relative h-full min-h-[310px]">
          {/* Legend */}
          <div className="flex items-center justify-between w-full text-[10px] font-mono font-bold px-2">
            <span className="flex items-center gap-1 text-amber-400">● Sixes ({activeData.sixes})</span>
            <span className="flex items-center gap-1 text-cyan-400">● Fours ({activeData.fours})</span>
            <span className="flex items-center gap-1 text-white/60">● 1s / 2s</span>
          </div>

          {/* SVG 3D Stadium Ground */}
          <div
            className="relative w-full aspect-square max-w-[260px] md:max-w-[290px] rounded-full overflow-hidden border-2 border-slate-700 shadow-2xl bg-[#091122] transition-transform duration-700"
            style={{
              transform:
                cameraMode === "broadcast"
                  ? "rotateX(46deg) scale(0.96)"
                  : cameraMode === "pov"
                  ? "rotateX(72deg) translateY(70px) scale(1.15)"
                  : "rotateX(0deg) scale(0.92)",
            }}
          >
            <svg viewBox="0 0 500 500" className="w-full h-full">
              <defs>
                <radialGradient id="cardTurf" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="60%" stopColor="#14532d" />
                  <stop offset="100%" stopColor="#052e16" />
                </radialGradient>
              </defs>
              <circle cx="250" cy="250" r="240" fill="url(#cardTurf)" />
              <circle cx="250" cy="250" r="225" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="8 4" opacity="0.85" />
              <circle cx="250" cy="250" r="120" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.5" />
              <rect x="241" y="215" width="18" height="70" rx="2" fill="#a16207" stroke="#eab308" strokeWidth="1" />
              <text x="250" y="36" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">LONG OFF</text>
              <text x="420" y="110" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">EXTRA COVER</text>
              <text x="455" y="255" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">POINT</text>
              <text x="390" y="420" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">THIRD MAN</text>
              <text x="90" y="420" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">FINE LEG</text>
              <text x="45" y="255" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">SQUARE LEG</text>
              <text x="85" y="110" fill="#ffffff" opacity="0.6" fontSize="10" fontWeight="900" textAnchor="middle">MID WICKET</text>
              <line x1="250" y1="250" x2="250" y2="40" stroke="#f59e0b" strokeWidth="3" />
              <line x1="250" y1="250" x2="380" y2="85" stroke="#f59e0b" strokeWidth="3" />
              <line x1="250" y1="250" x2="395" y2="105" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="250" y1="250" x2="110" y2="90" stroke="#f59e0b" strokeWidth="3" />
              <line x1="250" y1="250" x2="430" y2="230" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="250" y1="250" x2="50" y2="250" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="250" y1="250" x2="115" y2="395" stroke="#38bdf8" strokeWidth="2" />
            </svg>
          </div>

          {/* Floated AI Command Input */}
          <div className="w-full bg-[#0B1226]/90 border border-purple-500/30 rounded-xl p-1.5 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask the Ground for ${selectedPlayer}...`}
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/40"
            />
            <button
              onClick={() => setPrompt("Telemetry updated")}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase rounded-lg cursor-pointer"
            >
              Scan
            </button>
          </div>
        </div>

        {/* RIGHT: 6 SECTOR BREAKDOWN TILES */}
        <div className="lg:col-span-6 flex flex-col justify-between h-full gap-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-black uppercase text-white tracking-wider">
              {selectedPlayer} ({selectedSeason})
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              {activeData.runs} Runs • {activeData.sr} SR
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1">
            {activeData.sectors.map((sec) => (
              <div
                key={sec.name}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase truncate">{sec.name}</span>
                  <span className="text-[10px] font-mono font-black text-amber-400">{sec.pct}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center bg-black/40 p-1 rounded font-mono text-[9px] mt-1">
                  <div><span className="text-[7px] text-white/40 block">RUNS</span><span className="font-bold text-white">{sec.runs}</span></div>
                  <div><span className="text-[7px] text-white/40 block">SR</span><span className="font-bold text-amber-300">{sec.sr}</span></div>
                  <div><span className="text-[7px] text-white/40 block">4s/6s</span><span className="font-bold text-cyan-300">{sec.fours}/{sec.sixes}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-950/30 via-[#0a0f1d] to-indigo-950/30 border border-purple-500/20 text-[10px] text-white/70 flex items-center justify-between">
            <span><strong>Radar Readout:</strong> Primary boundary yield focused in V-arc with {activeData.sectors[0].name} dominance.</span>
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
// CARD 03: THE DUEL (Batter × Bowler Matchup)
// ─────────────────────────────────────────────────────────────────────────────
export function Card03TheDuel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center h-full">
      <div className="lg:col-span-4 p-4 rounded-2xl bg-gradient-to-br from-[#120815] to-[#0a0f1d] border border-rose-500/30 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center font-black text-white text-sm">
            VK
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest block">BATTER • RCB</span>
            <h3 className="text-sm font-black text-white uppercase">Virat Kohli</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">BALLS</span><span className="font-black text-white">96</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">RUNS</span><span className="font-black text-amber-400">142</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">SR</span><span className="font-black text-cyan-400">147.9</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">BOUNDARY %</span><span className="font-black text-emerald-400">18.8%</span></div>
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 bg-black/60 rounded-2xl border border-white/10 h-full">
        <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest mb-2">96 FACE-OFF DELIVERIES</span>
        <div className="relative w-36 h-36 rounded-full overflow-hidden border border-slate-700 bg-slate-950">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="95" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <circle cx="100" cy="100" r="50" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="96" y="80" width="8" height="40" rx="1" fill="#78350f" />
            <circle cx="94" cy="84" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            <circle cx="104" cy="82" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            <line x1="100" y1="100" x2="160" y2="40" stroke="#f59e0b" strokeWidth="2" />
            <line x1="100" y1="100" x2="170" y2="100" stroke="#38bdf8" strokeWidth="2" />
          </svg>
        </div>
        <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 mt-2">
          4 Dismissals • 35.5 Avg
        </span>
      </div>

      <div className="lg:col-span-4 p-4 rounded-2xl bg-gradient-to-bl from-[#08121f] to-[#0a0f1d] border border-cyan-500/30 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center font-black text-white text-sm">
            JB
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">BOWLER • MI</span>
            <h3 className="text-sm font-black text-white uppercase">Jasprit Bumrah</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">WICKETS</span><span className="font-black text-rose-400">4</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">ECONOMY</span><span className="font-black text-white">8.87</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">DOTS</span><span className="font-black text-cyan-400">42</span></div>
          <div className="p-2 bg-black/40 rounded-xl"><span className="text-[8px] text-white/40 block">PRESSURE</span><span className="font-black text-amber-400">78/100</span></div>
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
