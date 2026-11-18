import React, { useState, useMemo } from "react";
import {
  Target, Crosshair, Zap, Flame, Shield, Activity, TrendingUp, BarChart2,
  Compass, Layers, ArrowRight, Search, Filter, RotateCcw, Info, CheckCircle2, ChevronRight
} from "lucide-react";
import { useRecordedDeliveries, matchesBowlerName, RecordedDelivery } from "@/lib/delivery-data";
import { usePlayerBios, displayPlayerName, usePlayerDisplayNames, playerSlug } from "@/lib/aggregates";
import { PlayerAvatar } from "@/components/player-avatar";
import { Link } from "wouter";

interface HeadToHeadTacticalLabProps {
  player1: string;
  player2: string;
  p1Role: "Batter" | "Bowler" | "All-rounder";
  p2Role: "Batter" | "Bowler" | "All-rounder";
  p1Stats?: any;
  p2Stats?: any;
  playerImages?: Record<string, string>;
  matchIds?: ReadonlySet<string>;
  initialSubTab?: "tactics" | "pitch" | "wagon" | "ledger";
  initialDeliveryType?: string;
}

// 8 Ground Sectors for the 360° Wagon Wheel
const WAGON_SECTORS = [
  { id: "third-man", name: "Third Man", short: "3M", side: "OFF", angle: 315, cx: 100, cy: 95 },
  { id: "point-cover", name: "Point & Cover", short: "COV", side: "OFF", angle: 270, cx: 65, cy: 190 },
  { id: "extra-cover", name: "Extra Cover", short: "XCOV", side: "OFF", angle: 235, cx: 105, cy: 290 },
  { id: "long-off", name: "Long Off", short: "LO", side: "OFF", angle: 200, cx: 170, cy: 345 },
  { id: "straight", name: "Straight / Down Ground", short: "STR", side: "CENTER", angle: 180, cx: 210, cy: 360 },
  { id: "long-on", name: "Long On", short: "LON", side: "LEG", angle: 160, cx: 255, cy: 345 },
  { id: "mid-wicket", name: "Mid-Wicket & Cow", short: "MW", side: "LEG", angle: 110, cx: 330, cy: 275 },
  { id: "square-leg", name: "Square Leg & Fine", short: "SL/FL", side: "LEG", angle: 45, cx: 335, cy: 110 },
];

const ZONE_TO_SECTOR: Record<string, string> = {
  "Third man": "third-man",
  "Point": "point-cover",
  "Deep point": "point-cover",
  "Cover": "point-cover",
  "Deep cover": "point-cover",
  "Extra cover": "extra-cover",
  "Mid-off": "long-off",
  "Long-off": "long-off",
  "Straight": "straight",
  "Mid-on": "long-on",
  "Long-on": "long-on",
  "Midwicket": "mid-wicket",
  "Deep midwicket": "mid-wicket",
  "Cow corner": "mid-wicket",
  "Square leg": "square-leg",
  "Deep square leg": "square-leg",
  "Fine leg": "square-leg",
};

// 4 Length Categories for BatLens Pitch Map
const PITCH_LENGTHS = [
  { id: "short", label: "Short / Bouncer", range: "8m+ from stumps", color: "#EF4444" },
  { id: "good", label: "Good Length", range: "6m – 8m", color: "#3B82F6" },
  { id: "full", label: "Full / Slot", range: "2m – 6m", color: "#10B981" },
  { id: "yorker", label: "Yorker Blockhole", range: "0m – 2m", color: "#8B5CF6" },
];

// 3 Line Categories
const PITCH_LINES = [
  { id: "off", label: "Outside Off", short: "Wide Off" },
  { id: "stumps", label: "Stumps Line", short: "At Stumps" },
  { id: "leg", label: "Down Leg", short: "On Pads" },
];

export const TACTICAL_DELIVERY_TYPES = [
  { id: "ALL", label: "All Deliveries", short: "All" },
  { id: "Yorker Length", label: "Yorker Length", short: "Yorker", lengthCategory: "yorker" },
  { id: "Bouncer / Short", label: "Bouncer / Short", short: "Bouncer", lengthCategory: "short" },
  { id: "Good Length", label: "Good Length", short: "Good", lengthCategory: "good" },
  { id: "Slower Change-up", label: "Slower Change-up", short: "Slower", lengthCategory: "full" },
  { id: "Full Toss", label: "Full Toss", short: "Full Toss", lengthCategory: "full" },
  { id: "Off Cutter / Spinner", label: "Off Cutter / Spinner", short: "Cutter / Spin", lengthCategory: "good" },
];

export function HeadToHeadTacticalLab({
  player1,
  player2,
  p1Role,
  p2Role,
  p1Stats,
  p2Stats,
  playerImages = {},
  matchIds,
  initialSubTab,
  initialDeliveryType,
}: HeadToHeadTacticalLabProps) {
  const displayNames = usePlayerDisplayNames();
  const bios = usePlayerBios();

  // Determine Primary Roles: who is batting and who is bowling
  const isP1Bowler = p1Role === "Bowler";
  const isP2Batter = p2Role === "Batter" || p2Role === "All-rounder";
  
  // Choose Batter vs Bowler context
  const batterName = isP1Bowler && isP2Batter ? player2 : player1;
  const bowlerName = isP1Bowler && isP2Batter ? player1 : player2;

  // Active Tab within the Tactical Lab (Ground Shot Visual handles the 360 wagon wheel)
  const [activeSubTab, setActiveSubTab] = useState<"tactics" | "pitch" | "ledger">(
    initialSubTab === "pitch" || initialSubTab === "ledger" ? initialSubTab : "tactics"
  );
  const [selectedPitchCell, setSelectedPitchCell] = useState<{ length: string; line: string } | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Query actual delivery records for the batter (resolves full & scorecard names)
  const deliveriesQuery = useRecordedDeliveries(batterName);
  const allBatterDeliveries = deliveriesQuery.data ?? [];

  // Filter deliveries bowled by this specific bowler using bio-aware alias resolution
  const matchupDeliveries = useMemo(() => {
    if (!bowlerName || !allBatterDeliveries.length) return [];
    return allBatterDeliveries.filter(b => {
      if (!b.bowler || (matchIds && !matchIds.has(String(b.matchId)))) return false;
      return matchesBowlerName(b.bowler, bowlerName, bios.data);
    });
  }, [allBatterDeliveries, bowlerName, matchIds, bios.data]);

  const hasRecordedMatchup = matchupDeliveries.length > 0;

  // Aggregate Key Matchup Metrics strictly from recorded deliveries
  const matchupSummary = useMemo(() => {
    if (!hasRecordedMatchup) {
      return {
        balls: 0,
        runs: 0,
        dots: 0,
        fours: 0,
        sixes: 0,
        dismissals: 0,
        sr: "—",
        dotPct: "—",
        boundaryPct: "—",
        isProjected: false,
      };
    }

    const balls = matchupDeliveries.length;
    const runs = matchupDeliveries.reduce((sum, b) => sum + (b.runs || 0), 0);
    const dots = matchupDeliveries.filter(b => b.runs === 0).length;
    const fours = matchupDeliveries.filter(b => b.runs === 4).length;
    const sixes = matchupDeliveries.filter(b => b.runs === 6).length;
    const dismissals = matchupDeliveries.filter(b => b.shot?.toLowerCase().includes("out") || b.variation?.toLowerCase().includes("out")).length;
    const sr = balls > 0 ? (runs / balls) * 100 : 0;
    const dotPct = balls > 0 ? (dots / balls) * 100 : 0;
    const boundaryPct = runs > 0 ? ((fours * 4 + sixes * 6) / runs) * 100 : 0;

    return {
      balls,
      runs,
      dots,
      fours,
      sixes,
      dismissals: matchIds ? dismissals : Math.max(dismissals, p1Stats?.dismissals ?? 0),
      sr: sr.toFixed(1),
      dotPct: dotPct.toFixed(1),
      boundaryPct: boundaryPct.toFixed(1),
      isProjected: false,
    };
  }, [matchupDeliveries, hasRecordedMatchup, p1Stats, matchIds]);

  // Aggregate Tactical Length Breakdown
  const tacticalLengths = useMemo(() => {
    const categories = [
      {
        id: "yorker",
        name: "Yorker Blockhole",
        range: "0m – 2m",
        desc: "Pinpoint toe-crushers and blockhole darts. Maximum boundary suppression.",
        icon: Zap,
        accent: "#8B5CF6",
      },
      {
        id: "full",
        name: "Full / In the Slot",
        range: "2m – 6m",
        desc: "Batter launchpad for straight lofts, drives, and over-pitch punishes.",
        icon: Flame,
        accent: "#10B981",
      },
      {
        id: "good",
        name: "Good Length Corridor",
        range: "6m – 8m",
        desc: "Classic seam and wobble zone. Forcing indecision on the front and back foot.",
        icon: Shield,
        accent: "#3B82F6",
      },
      {
        id: "back-of-length",
        name: "Back of a Length",
        range: "8m – 10m",
        desc: "Heavy ball into the ribs. Restricts driving; invites cut and pull responses.",
        icon: Target,
        accent: "#F59E0B",
      },
      {
        id: "short",
        name: "Short / Bouncer",
        range: "10m+",
        desc: "Surprise steep bounce targeting the helmet. High-risk aerial shots.",
        icon: Activity,
        accent: "#EF4444",
      },
    ];

    return categories.map(cat => {
      if (!hasRecordedMatchup) {
        return {
          ...cat,
          balls: 0,
          runs: 0,
          dots: 0,
          sr: 0,
          dotPct: 0,
          boundaryCount: 0,
          wickets: 0,
          verdict: "No Recorded Balls",
        };
      }

      const rows = matchupDeliveries.filter(b => {
        const l = (b.length || "").toLowerCase();
        if (cat.id === "yorker") return l.includes("yorker");
        if (cat.id === "full") return l.includes("full") || l.includes("slot");
        if (cat.id === "good") return l.includes("good");
        if (cat.id === "back-of-length") return l.includes("back") || l.includes("length");
        if (cat.id === "short") return l.includes("short") || l.includes("bouncer");
        return false;
      });

      const balls = rows.length;
      const runs = rows.reduce((s, r) => s + (r.runs || 0), 0);
      const dots = rows.filter(r => r.runs === 0).length;
      const bndCount = rows.filter(r => r.runs === 4 || r.runs === 6).length;
      const sr = balls > 0 ? (runs / balls) * 100 : 0;
      const dotPct = balls > 0 ? (dots / balls) * 100 : 0;
      const wkts = rows.filter(r => r.shot?.toLowerCase().includes("out") || r.variation?.toLowerCase().includes("out")).length;

      return {
        ...cat,
        balls,
        runs,
        dots,
        sr: Math.round(sr),
        dotPct: Math.round(dotPct),
        boundaryCount: bndCount,
        wickets: wkts,
        verdict:
          balls === 0
            ? "No Recorded Balls"
            : wkts > 0
              ? `Bowler Edge (${wkts} Wkt${wkts > 1 ? "s" : ""})`
              : sr >= 170
                ? "Batter Launch Zone"
                : dotPct >= 45
                  ? "Bowler Choke Point"
                  : "Even Matchup Contest",
      };
    });
  }, [matchupDeliveries, hasRecordedMatchup]);

  // Aggregate Pitch Grid Matrix (Length × Line) strictly from recorded balls
  const pitchGrid = useMemo(() => {
    return PITCH_LENGTHS.map(len => {
      const lineCells = PITCH_LINES.map(line => {
        let balls = 0;
        let runs = 0;
        let dots = 0;
        let dismissals = 0;

        if (hasRecordedMatchup) {
          const matching = matchupDeliveries.filter(b => {
            const bl = (b.length || "").toLowerCase();
            const bn = (b.line || "").toLowerCase();
            const matchLen =
              (len.id === "short" && (bl.includes("short") || bl.includes("bouncer"))) ||
              (len.id === "good" && bl.includes("good")) ||
              (len.id === "full" && (bl.includes("full") || bl.includes("slot"))) ||
              (len.id === "yorker" && bl.includes("yorker"));
            const matchLine =
              (line.id === "off" && (bn.includes("off") || bn.includes("wide"))) ||
              (line.id === "stumps" && (bn.includes("stump") || bn.includes("straight") || bn.includes("middle"))) ||
              (line.id === "leg" && (bn.includes("leg") || bn.includes("pad")));
            return matchLen && matchLine;
          });

          balls = matching.length;
          runs = matching.reduce((sum, b) => sum + (b.runs || 0), 0);
          dots = matching.filter(b => b.runs === 0).length;
          dismissals = matching.filter(b => b.shot?.toLowerCase().includes("out") || b.variation?.toLowerCase().includes("out")).length;
        }

        const sr = balls > 0 ? (runs / balls) * 100 : 0;
        return {
          lengthId: len.id,
          lineId: line.id,
          lengthLabel: len.label,
          lineLabel: line.label,
          balls,
          runs,
          dots,
          dismissals,
          sr: Math.round(sr),
        };
      });

      return {
        ...len,
        cells: lineCells,
      };
    });
  }, [matchupDeliveries, hasRecordedMatchup]);

  if (matchIds && !hasRecordedMatchup) {
    return <p role="status" className="stats-tool-panel p-4 text-sm">{deliveriesQuery.isLoading ? "Loading recorded deliveries…" : "No recorded deliveries for this matchup in the selected fixtures."}</p>;
  }

  return (
    <div className="w-full bg-[#080B16] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col gap-0 animate-fade-in mt-6">
      {/* ── CINEMATIC TELEMETRY HEADER ── */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-white/[0.02] to-accent/10 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center -space-x-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary shadow-lg bg-black/40">
              <PlayerAvatar name={batterName} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
            </div>
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-accent shadow-lg bg-black/40">
              <PlayerAvatar name={bowlerName} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                TACTICAL LAB &amp; SPATIAL MATRIX
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-black uppercase ${
                hasRecordedMatchup
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/5 text-white/50 border border-white/10"
              }`}>
                {hasRecordedMatchup ? `${matchupDeliveries.length} Recorded Deliveries` : "No Recorded Deliveries"}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              {displayPlayerName(batterName, displayNames)} <span className="text-white/40 font-normal">vs</span> {displayPlayerName(bowlerName, displayNames)}
            </h3>
            <p className="text-[11px] text-white/50 font-mono mt-0.5">
              BatLens-inspired pitch grid · 360° wagon wheel · delivery length choke points &amp; release analysis
            </p>
          </div>
        </div>

        {/* Real-time Matchup KPI Quick Strip */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center">
            <span className="text-[8px] font-mono uppercase text-white/40">Deliveries</span>
            <span className="text-sm sm:text-base font-black font-mono text-white">{matchupSummary.balls}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center">
            <span className="text-[8px] font-mono uppercase text-primary/70">Strike Rate</span>
            <span className="text-sm sm:text-base font-black font-mono text-primary">{matchupSummary.sr}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
            <span className="text-[8px] font-mono uppercase text-amber-400/70">Dot Ball %</span>
            <span className="text-sm sm:text-base font-black font-mono text-amber-400">{matchupSummary.dotPct}%</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center">
            <span className="text-[8px] font-mono uppercase text-red-400/70">Dismissals</span>
            <span className="text-sm sm:text-base font-black font-mono text-red-400">{matchupSummary.dismissals}</span>
          </div>
        </div>
      </div>

      {/* ── SUB-NAVIGATION ENGINE TOGGLE ── */}
      <div className="flex items-center gap-1 p-2 bg-white/[0.02] border-b border-white/10 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("tactics")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "tactics"
              ? "bg-primary text-white shadow-lg font-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Tactical Length Matrix
        </button>
        <button
          onClick={() => setActiveSubTab("pitch")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "pitch"
              ? "bg-primary text-white shadow-lg font-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          BatLens Pitch Map
        </button>
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "ledger"
              ? "bg-primary text-white shadow-lg font-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Ball-by-Ball Ledger
        </button>
      </div>

      {/* ── TAB 1: TACTICAL LENGTH MATRIX (NEWLY REDESIGNED) ── */}
      {activeSubTab === "tactics" && (
        <div className="p-5 sm:p-6 flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-primary">
                DELIVERY LENGTH PROFILE &amp; VELOCITY CHOKE POINTS
              </span>
              <h4 className="text-base font-black text-white mt-0.5">
                Length-Wise Scoring vs Execution Matrix
              </h4>
              <p className="text-xs text-white/50 mt-0.5">
                Evaluating strike acceleration, boundary extraction, and dot ball suppression across every release zone
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Batter Launch</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Neutral</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Bowler Choke</span>
            </div>
          </div>

          {/* Tactical Length Modern Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tacticalLengths.map(len => {
              const IconComp = len.icon;
              return (
                <div
                  key={len.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 flex flex-col justify-between gap-4 hover:border-primary/40 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                        style={{ backgroundColor: `${len.accent}20`, color: len.accent }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white group-hover:text-primary transition-colors">
                          {len.name}
                        </div>
                        <div className="text-[9px] font-mono text-white/40 font-bold">{len.range}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-black uppercase ${
                      len.verdict.includes("Batter")
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : len.verdict.includes("Bowler")
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {len.verdict}
                    </span>
                  </div>

                  <p className="text-[10px] text-white/60 leading-relaxed font-sans">{len.desc}</p>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-white/5 bg-white/[0.01] rounded-xl px-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[7.5px] font-mono text-white/40 uppercase">Balls</span>
                      <span className="text-xs font-black font-mono text-white">{len.balls}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7.5px] font-mono text-white/40 uppercase">SR</span>
                      <span className="text-xs font-black font-mono text-primary">{len.sr}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7.5px] font-mono text-white/40 uppercase">Dot %</span>
                      <span className="text-xs font-black font-mono text-amber-400">{len.dotPct}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7.5px] font-mono text-white/40 uppercase">Wickets</span>
                      <span className="text-xs font-black font-mono text-red-400">{len.wickets}</span>
                    </div>
                  </div>

                  {/* Strike Velocity Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[8px] font-mono text-white/40 mb-1">
                      <span>Strike Velocity</span>
                      <span className="text-white font-bold">{len.sr} SR</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (len.sr / 240) * 100)}%`,
                          backgroundColor: len.accent,
                        }}
                      />
                    </div>
                  </div>

                  {/* Inspect in BatLens Pitch Map Button */}
                  <button
                    onClick={() => {
                      const pitchLenMap: Record<string, string> = {
                        yorker: "yorker",
                        full: "full",
                        good: "good",
                        "back-of-length": "short",
                        short: "short",
                      };
                      setSelectedPitchCell({ length: pitchLenMap[len.id] || "good", line: "off" });
                      setActiveSubTab("pitch");
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono font-bold text-cyan-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-cyan-400/40"
                  >
                    <span>Inspect Length in BatLens Pitch Map</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: BATLENS PITCH MAP (PITCH GRID & 2D COORDINATES) ── */}
      {activeSubTab === "pitch" && (
        <div className="p-5 sm:p-6 flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-primary">
                BATLENS MATRIX · LENGTH × LINE INTERACTION GRID
              </span>
              <h4 className="text-base font-black text-white mt-0.5">
                Precision Pitch Landing Zones
              </h4>
              <p className="text-xs text-white/50 mt-0.5">
                Interactive cell inspection: Click any length × line intersection to evaluate runs above/below average and dot pressure
              </p>
            </div>
            {selectedPitchCell && (
              <button
                onClick={() => setSelectedPitchCell(null)}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white transition-all cursor-pointer flex items-center gap-1 w-fit"
              >
                <RotateCcw className="w-3 h-3" /> Reset Cell Focus
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Length × Line Grid (BatterLens PitchGrid Heatmap Styling, 8 Cols) */}
            <div className="lg:col-span-8 overflow-x-auto">
              {(() => {
                const maxCellBalls = Math.max(
                  1,
                  ...pitchGrid.flatMap(r => r.cells.map(c => c.balls)),
                );
                return (
                  <table className="w-full text-left border-separate border-spacing-1">
                    <thead>
                      <tr>
                        <th className="p-2 text-[9px] font-mono font-bold text-white/35 uppercase">Length / Line</th>
                        {PITCH_LINES.map(line => (
                          <th key={line.id} className="p-2 text-center text-[10px] font-mono font-black text-white/60 uppercase">
                            {line.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pitchGrid.map(row => (
                        <tr key={row.id}>
                          <td className="p-2 text-right font-mono text-[10px] font-black text-white/75 whitespace-nowrap pr-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                              {row.label}
                            </span>
                          </td>
                          {row.cells.map(cell => {
                            const isSelected = selectedPitchCell?.length === cell.lengthId && selectedPitchCell?.line === cell.lineId;
                            const bg =
                              cell.balls === 0
                                ? "rgba(255,255,255,0.03)"
                                : cell.sr >= 160
                                  ? `rgba(16,185,129,${0.2 + Math.min(0.6, (cell.sr - 120) / 140)})`
                                  : cell.sr <= 110
                                    ? `rgba(244,63,94,${0.2 + Math.min(0.6, (130 - cell.sr) / 130)})`
                                    : `rgba(56,189,248,${0.18 + Math.min(0.45, cell.balls / (maxCellBalls * 1.4))})`;
                            const opacity = cell.balls > 0 ? 0.5 + 0.5 * (cell.balls / maxCellBalls) : 1;

                            return (
                              <td
                                key={cell.lineId}
                                onClick={() => setSelectedPitchCell(isSelected ? null : { length: cell.lengthId, line: cell.lineId })}
                                style={{ background: bg, opacity }}
                                title={cell.balls > 0 ? `${cell.lengthLabel}, ${cell.lineLabel}: ${cell.balls} balls, ${cell.runs} runs, SR ${cell.sr}` : "No balls recorded"}
                                className={`h-12 px-2 rounded text-center align-middle transition-all cursor-pointer border border-white/10 ${
                                  isSelected ? "ring-2 ring-white scale-[1.03] shadow-xl" : "hover:border-white/30"
                                }`}
                              >
                                {cell.balls > 0 ? (
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-xs font-black font-mono text-white">{cell.sr} <span className="text-[8px] font-normal text-white/70">SR</span></span>
                                    <span className="text-[9px] font-mono text-white/70 mt-0.5">
                                      {cell.balls}b · {cell.runs}r{cell.dismissals > 0 ? ` · ${cell.dismissals}W` : ""}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-mono text-white/20">·</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}

              <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-white/40 mt-3 px-2">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: "rgba(16,185,129,0.5)" }} /> SR &ge; 160 (Batter Advantage)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: "rgba(56,189,248,0.45)" }} /> SR 111–159 (Par Scoring)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded inline-block" style={{ background: "rgba(244,63,94,0.5)" }} /> SR &le; 110 (Bowler Dominant)</span>
              </div>
            </div>

            {/* BatterLens-style Cell Inspector + Outcomes by Length (4 Cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-4">
              <span className="text-[9px] font-mono font-black uppercase text-primary tracking-wider">
                TACTICAL CELL DOSSIER
              </span>

              {selectedPitchCell ? (() => {
                const row = pitchGrid.find(r => r.id === selectedPitchCell.length);
                const cell = row?.cells.find(c => c.lineId === selectedPitchCell.line);
                if (!cell) return null;
                return (
                  <div className="flex flex-col gap-3">
                    <div className="text-base font-black text-white">
                      {cell.lengthLabel} <span className="text-primary">×</span> {cell.lineLabel}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase">Deliveries</span>
                        <span className="text-base font-black text-white">{cell.balls}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase">Runs Scored</span>
                        <span className="text-base font-black text-white">{cell.runs}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase">Strike Rate</span>
                        <span className="text-base font-black text-primary">{cell.sr}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase">Wickets</span>
                        <span className="text-base font-black text-red-400">{cell.dismissals}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-white/70 leading-relaxed mt-1 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                      {cell.sr >= 160
                        ? `${displayPlayerName(batterName, displayNames)} aggressively punishes this zone with high strike velocity and minimal dot accumulation.`
                        : cell.dismissals > 0
                        ? `${displayPlayerName(bowlerName, displayNames)} generates extreme edge threat here, having dismissed the batter ${cell.dismissals} time(s).`
                        : `${displayPlayerName(bowlerName, displayNames)} maintains tight containment in this channel with high dot percentage.`}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-4 text-white/40 text-xs font-mono flex flex-col items-center gap-2">
                  <Target className="w-6 h-6 text-white/20" />
                  <span>Click any pitch grid cell on the left to inspect ball metrics &amp; tactical execution.</span>
                </div>
              )}

              {/* BatterLens-style 0 / 1-3 / 4 / 6 / W by Length distribution */}
              <div className="mt-auto pt-3 border-t border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider text-white/50">
                    0 / 1–3 / 4 / 6 / W by Length
                  </span>
                  <span className="text-[9px] font-mono text-white/35">Pitch Outcome Mix</span>
                </div>
                {(() => {
                  const parts = [
                    { k: "Dot", c: "rgba(255,255,255,0.22)" },
                    { k: "1–3", c: "rgba(56,189,248,0.65)" },
                    { k: "4", c: "rgba(52,211,153,0.78)" },
                    { k: "6", c: "rgba(250,204,21,0.85)" },
                    { k: "W", c: "rgba(244,63,94,0.88)" },
                  ];
                  const activeRows = PITCH_LENGTHS.map(len => {
                    const sub = matchupDeliveries.filter(d => {
                      const bl = (d.length || "").toLowerCase();
                      return (
                        (len.id === "short" && (bl.includes("short") || bl.includes("bouncer"))) ||
                        (len.id === "good" && bl.includes("good")) ||
                        (len.id === "full" && (bl.includes("full") || bl.includes("slot"))) ||
                        (len.id === "yorker" && bl.includes("yorker"))
                      );
                    });
                    const counts = [
                      sub.filter(d => (d.runs || 0) === 0 && !d.shot?.toLowerCase().includes("out")).length,
                      sub.filter(d => (d.runs || 0) >= 1 && (d.runs || 0) <= 3).length,
                      sub.filter(d => d.runs === 4).length,
                      sub.filter(d => d.runs === 6).length,
                      sub.filter(d => d.shot?.toLowerCase().includes("out") || d.variation?.toLowerCase().includes("out")).length,
                    ];
                    return { len, sub, counts };
                  }).filter(r => r.sub.length > 0);

                  if (activeRows.length === 0) {
                    return <p className="text-[10px] text-white/35 font-mono">No length-tagged deliveries in this matchup.</p>;
                  }
                  return (
                    <div className="space-y-1.5">
                      {activeRows.map(({ len, sub, counts }) => (
                        <div key={len.id} className="grid grid-cols-[96px_1fr_32px] items-center gap-2 text-[10px]">
                          <span className="text-white/75 font-mono truncate">{len.label}</span>
                          <div className="flex h-3 rounded overflow-hidden bg-white/5">
                            {counts.map((n, k) =>
                              n > 0 ? (
                                <div
                                  key={parts[k].k}
                                  style={{ width: `${(n / sub.length) * 100}%`, background: parts[k].c }}
                                  title={`${parts[k].k}: ${n} (${Math.round((n / sub.length) * 100)}%)`}
                                />
                              ) : null,
                            )}
                          </div>
                          <span className="text-right font-mono text-white/45">{sub.length}b</span>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-3 text-[9px] text-white/50 pt-1">
                        {parts.map(p => (
                          <span key={p.k} className="flex items-center gap-1">
                            <i className="w-2 h-2 rounded-sm inline-block" style={{ background: p.c }} />
                            {p.k}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: BALL-BY-BALL LEDGER ── */}
      {activeSubTab === "ledger" && (
        <div className="p-5 sm:p-6 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-primary">
                HISTORICAL SCOREBOOK ARCHIVE
              </span>
              <h4 className="text-base font-black text-white mt-0.5">
                Ball-by-Ball Matchup Ledger
              </h4>
              <p className="text-xs text-white/50 mt-0.5">
                Every verified delivery exchanged between {displayPlayerName(batterName, displayNames)} and {displayPlayerName(bowlerName, displayNames)}
              </p>
            </div>
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                placeholder="Filter by season, runs, zone..."
                className="w-full bg-[#080B16] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {matchupDeliveries.length > 0 ? (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/5 border-b border-white/10 text-[9px] font-mono font-black text-white/40 uppercase sticky top-0 bg-[#080B16]">
                    <tr>
                      <th className="px-3 py-2.5">Date / Season</th>
                      <th className="px-3 py-2.5 text-center">Over.Ball</th>
                      <th className="px-3 py-2.5 text-center">Runs</th>
                      <th className="px-3 py-2.5">Length</th>
                      <th className="px-3 py-2.5">Line</th>
                      <th className="px-3 py-2.5">Zone</th>
                      <th className="px-3 py-2.5">Shot Execution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {matchupDeliveries
                      .filter(b => {
                        if (!ledgerSearch) return true;
                        const q = ledgerSearch.toLowerCase();
                        return (
                          (b.season || "").includes(q) ||
                          (b.date || "").includes(q) ||
                          (b.length || "").toLowerCase().includes(q) ||
                          (b.line || "").toLowerCase().includes(q) ||
                          (b.zone || "").toLowerCase().includes(q) ||
                          String(b.runs) === q
                        );
                      })
                      .map((b, idx) => (
                        <tr key={b.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-2 text-white/70">{b.date || b.season}</td>
                          <td className="px-3 py-2 text-center text-white/40">{b.over}.{b.ball}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded font-black ${
                              b.runs === 6
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : b.runs === 4
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : b.runs === 0
                                ? "text-white/30"
                                : "text-white"
                            }`}>
                              {b.runs}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-white/80">{b.length || "—"}</td>
                          <td className="px-3 py-2 text-white/60">{b.line || "—"}</td>
                          <td className="px-3 py-2 text-primary">{b.zone || "—"}</td>
                          <td className="px-3 py-2 text-white/40 truncate max-w-[140px]">{b.shot || "Standard Drive"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-white/40 text-xs font-mono flex flex-col items-center gap-2">
              <Info className="w-6 h-6 text-white/20" />
              <span>No direct delivery-by-delivery ledger available in the archive for this athlete pairing.</span>
              <span className="text-[10px] text-white/30">Select a pairing with recorded IPL deliveries to view ball-by-ball breakdown.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
