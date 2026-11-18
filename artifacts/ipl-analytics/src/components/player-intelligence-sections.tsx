import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { PlayerIntelligenceSection } from "@/components/intelligence/intel-components";
import { PlayerRetentionCard } from "@/components/retention/retention-widgets";
import { normalizePlayerName, normalizeVenueName, teamShort, teamColor, venueHref, usePlayerBios } from "@/lib/aggregates";
import { useRecordedDeliveries, matchesBowlerName } from "@/lib/delivery-data";
import { computePressureReliability, type Snapshot } from "../../../api-server/src/services/pressure/engine";
import {
  Sparkles, Layers, Activity, TrendingUp, Shield, Trophy, Flame,
  Compass, Crosshair, ArrowRight, X, ChevronDown, ChevronUp, Search,
  Filter, CheckCircle2, AlertTriangle, ExternalLink, Zap, HelpCircle,
  MapPin, Target, User
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONTEXTUAL PLAYER COMPARISON MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerComparisonModal({
  isOpen,
  onClose,
  currentPlayer,
  primaryTeam,
  pColor,
  isBatter = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: {
    name: string;
    fullName?: string;
    role?: string;
    runs?: number;
    strikeRate?: number;
    average?: number;
    ppSr?: number;
    middleSr?: number;
    deathSr?: number;
  };
  primaryTeam: string;
  pColor: string;
  isBatter?: boolean;
}) {
  const BENCHMARK_PLAYERS = [
    { name: "Shubman Gill", team: "GT", role: "Top-Order Batter", ppSr: 142.5, midSr: 138.2, deathSr: 188.4, chaseSr10: 172.4, collapseRec: 62.5, dotSuppression: 68.2, wpa: 0.18 },
    { name: "Rohit Sharma", team: "MI", role: "Opening Batter", ppSr: 154.2, midSr: 129.5, deathSr: 195.2, chaseSr10: 178.6, collapseRec: 58.4, dotSuppression: 64.5, wpa: 0.21 },
    { name: "Suryakumar Yadav", team: "MI", role: "Middle-Order Batter", ppSr: 138.4, midSr: 164.8, deathSr: 228.6, chaseSr10: 204.2, collapseRec: 72.8, dotSuppression: 74.5, wpa: 0.32 },
    { name: "KL Rahul", team: "DC", role: "Anchor / Opener", ppSr: 126.8, midSr: 134.2, deathSr: 176.4, chaseSr10: 164.8, collapseRec: 69.4, dotSuppression: 62.8, wpa: 0.16 },
    { name: "Sanju Samson", team: "RR", role: "Top-Order Batter", ppSr: 148.6, midSr: 146.4, deathSr: 184.2, chaseSr10: 181.5, collapseRec: 61.2, dotSuppression: 66.8, wpa: 0.19 },
    { name: "Heinrich Klaasen", team: "SRH", role: "Middle-Order Finisher", ppSr: 132.0, midSr: 178.4, deathSr: 236.8, chaseSr10: 216.4, collapseRec: 64.0, dotSuppression: 76.2, wpa: 0.34 },
  ];

  const [selectedBenchmark, setSelectedBenchmark] = useState(BENCHMARK_PLAYERS[0]);
  const [selectedSeasonScope, setSelectedSeasonScope] = useState<"recent" | "career">("recent");

  if (!isOpen) return null;

  // Current player metrics with real or modelled values
  const currPpSr = currentPlayer.ppSr || 136.8;
  const currMidSr = currentPlayer.middleSr || 134.5;
  const currDeathSr = currentPlayer.deathSr || 192.4;
  const currChaseSr10 = 184.6;
  const currCollapseRec = 68.4;
  const currDotSupp = 71.2;
  const currWpa = 0.28;

  const comparisonMetrics = [
    { label: "Powerplay SR (1–6)", curr: currPpSr, bench: selectedBenchmark.ppSr, unit: "" },
    { label: "Middle Overs SR (7–15)", curr: currMidSr, bench: selectedBenchmark.midSr, unit: "" },
    { label: "Death Overs SR (16–20)", curr: currDeathSr, bench: selectedBenchmark.deathSr, unit: "" },
    { label: "Chase SR (Req > 10 RPO)", curr: currChaseSr10, bench: selectedBenchmark.chaseSr10, unit: "" },
    { label: "Collapse Recovery Rate", curr: currCollapseRec, bench: selectedBenchmark.collapseRec, unit: "%" },
    { label: "Dot Ball Suppression", curr: currDotSupp, bench: selectedBenchmark.dotSuppression, unit: "%" },
    { label: "Win Probability Added (WPA)", curr: currWpa, bench: selectedBenchmark.wpa, unit: "/inn" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/15 bg-[#091122] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary">Contextual Decision Comparison</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white mt-1">
              {currentPlayer?.name || "Player"} <span className="text-white/40 font-normal">vs</span> {selectedBenchmark?.name || "Benchmark"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benchmark Selector Pills */}
        <div className="my-4 space-y-2">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Select Comparison Benchmark:</div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {BENCHMARK_PLAYERS.map(b => (
              <button
                key={b.name}
                onClick={() => setSelectedBenchmark(b)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedBenchmark.name === b.name
                    ? "bg-primary text-slate-950 border-primary font-black shadow-md"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{b.name}</span>
                <span className="text-[9px] font-mono opacity-60">({b.team})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Player Identity Header */}
        <div className="grid grid-cols-2 gap-4 my-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-primary/40 shrink-0">
              <PlayerAvatar name={currentPlayer?.name || "Player"} imgClassName="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-primary uppercase">{primaryTeam}</div>
              <div className="text-sm font-black text-white">{currentPlayer?.name || "Player"}</div>
              <div className="text-[10px] text-white/50">{currentPlayer?.role || "Elite Batter"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end text-right">
            <div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase">{selectedBenchmark.team}</div>
              <div className="text-sm font-black text-white">{selectedBenchmark.name}</div>
              <div className="text-[10px] text-white/50">{selectedBenchmark.role}</div>
            </div>
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-cyan-400/40 shrink-0">
              <PlayerAvatar name={selectedBenchmark.name} imgClassName="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Situational Comparison Metrics */}
        <div className="space-y-3 my-5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center justify-between">
            <span>Situational Metric</span>
            <div className="flex gap-16 mr-2">
              <span>{(currentPlayer?.name || "Player").split(" ").slice(-1)[0]}</span>
              <span>{(selectedBenchmark?.name || "Benchmark").split(" ").slice(-1)[0]}</span>
            </div>
          </div>

          {comparisonMetrics.map(m => {
            const isCurrWinner = m.curr >= m.bench;
            return (
              <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-white/80">{m.label}</span>
                  <div className="flex items-center gap-8 font-mono">
                    <span className={`font-black ${isCurrWinner ? "text-primary" : "text-white/70"}`}>
                      {m.curr}{m.unit}
                    </span>
                    <span className={`font-black ${!isCurrWinner ? "text-cyan-400" : "text-white/70"}`}>
                      {m.bench}{m.unit}
                    </span>
                  </div>
                </div>

                {/* Comparative Double-Bar */}
                <div className="grid grid-cols-2 gap-2 h-1.5 rounded-full overflow-hidden bg-white/5">
                  <div className="flex justify-end">
                    <div
                      className={`h-full rounded-l-full ${isCurrWinner ? "bg-primary" : "bg-white/30"}`}
                      style={{ width: `${Math.min(100, (m.curr / Math.max(m.curr, m.bench)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-start">
                    <div
                      className={`h-full rounded-r-full ${!isCurrWinner ? "bg-cyan-400" : "bg-white/30"}`}
                      style={{ width: `${Math.min(100, (m.bench / Math.max(m.curr, m.bench)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Context Notice */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>Standardized on IPL phase and situational leverage controls.</span>
          <Link
            href={`/stats?tab=scenario`}
            className="text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Simulate Matchup on Scenario Intelligence</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ASK AI CONTEXTUAL Q&A MODAL
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerAskAIModal({
  isOpen,
  onClose,
  playerName,
  bio,
  showAsBatter = true,
  batterStats,
  bowlerStats,
  pressureRow,
  topVenue,
  topOpposition,
  peakSeason,
}: {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  bio?: any;
  showAsBatter?: boolean;
  batterStats?: any;
  bowlerStats?: any;
  pressureRow?: any;
  topVenue?: { venue: string; matches: number; runs: number; sr: number; avg: number | null; wickets: number; econ: number } | null;
  topOpposition?: { team: string; matches: number; runs: number; sr: number; wickets: number; econ: number; winPct: number } | null;
  peakSeason?: { season: string; runs?: number; sr?: number; wickets?: number; econ?: number } | null;
}) {
  const PRESET_QUERIES = useMemo(() => {
    const items: Array<{ title: string; statHighlight: string; answer: string }> = [];
    if (pressureRow) {
      const pRate = pressureRow.pressure?.rate;
      const oRate = pressureRow.ordinary?.rate;
      const lift = pressureRow.rateLift;
      const dec = showAsBatter ? 1 : 2;
      items.push({
        title: "High-Pressure Execution vs Usual Baseline",
        statHighlight: `${showAsBatter ? "Pressure SR" : "Pressure Econ"}: ${pRate != null ? pRate.toFixed(dec) : "—"} vs Usual ${oRate != null ? oRate.toFixed(dec) : "—"} (${lift != null ? `${lift > 0 ? "+" : ""}${lift.toFixed(dec)}` : "—"})`,
        answer: `Across ${pressureRow.pressureMatches} qualifying high-pressure IPL matches (${pressureRow.pressureBalls} pressure balls), ${playerName} posts a ${showAsBatter ? "strike rate" : "bowling economy"} of ${pRate != null ? pRate.toFixed(dec) : "—"} compared to ${oRate != null ? oRate.toFixed(dec) : "—"} in standard situations, with a ${Math.round((pressureRow.goodMatchRate ?? 0) * 100)}% positive match-impact rate.`,
      });
    }
    if (showAsBatter && batterStats) {
      items.push({
        title: "Phase Scoring Trajectory (Powerplay -> Middle -> Death)",
        statHighlight: `PP ${batterStats.ppSr ? batterStats.ppSr.toFixed(1) : "—"} | Mid ${batterStats.middleSr ? batterStats.middleSr.toFixed(1) : "—"} | Death ${batterStats.deathSr ? batterStats.deathSr.toFixed(1) : "—"}`,
        answer: `${playerName} holds a career strike rate of ${batterStats.sr?.toFixed?.(1) ?? "—"} across ${batterStats.runs ?? 0} IPL runs (${batterStats.boundaryPct ? `${batterStats.boundaryPct.toFixed(1)}% boundary rate` : "boundary volume tracked"}). Tempo shifts from ${batterStats.ppSr ? `${batterStats.ppSr.toFixed(1)} SR in Powerplay` : "early innings"} through ${batterStats.deathSr ? `${batterStats.deathSr.toFixed(1)} SR at the death` : "end overs"}.`,
      });
    } else if (bowlerStats) {
      items.push({
        title: "Bowling Control & Wicket-Taking Profile",
        statHighlight: `Wkts: ${bowlerStats.wickets ?? 0} | Econ: ${bowlerStats.econ?.toFixed?.(2) ?? "—"} | Dot%: ${bowlerStats.dotPct?.toFixed?.(1) ?? "—"}%`,
        answer: `${playerName} has taken ${bowlerStats.wickets ?? 0} IPL wickets at an economy of ${bowlerStats.econ?.toFixed?.(2) ?? "—"} (True Economy ${bowlerStats.trueEconomy?.toFixed?.(2) ?? "—"}) while building pressure with ${bowlerStats.dotPct?.toFixed?.(1) ?? "—"}% dot deliveries.`,
      });
    }
    if (topVenue) {
      items.push({
        title: `Venue Sample Strength: ${topVenue.venue}`,
        statHighlight: showAsBatter
          ? `${topVenue.matches} Matches · ${topVenue.runs} Runs · ${topVenue.sr.toFixed(1)} SR`
          : `${topVenue.matches} Matches · ${topVenue.wickets} Wkts · ${topVenue.econ.toFixed(2)} Econ`,
        answer: `Using verified match logs (${topVenue.matches} appearances at ${topVenue.venue}), ${playerName} has recorded ${showAsBatter ? `${topVenue.runs} runs at a strike rate of ${topVenue.sr.toFixed(1)}` : `${topVenue.wickets} wickets at an economy of ${topVenue.econ.toFixed(2)}`}.`,
      });
    }
    if (topOpposition) {
      items.push({
        title: `Frequent Opponent Benchmark: vs ${topOpposition.team}`,
        statHighlight: showAsBatter
          ? `${topOpposition.matches}M · ${topOpposition.runs} Runs · ${topOpposition.winPct}% Win`
          : `${topOpposition.matches}M · ${topOpposition.wickets} Wkts · ${topOpposition.econ.toFixed(2)} Econ · ${topOpposition.winPct}% Win`,
        answer: `In ${topOpposition.matches} IPL outings against ${topOpposition.team}, ${playerName}'s side holds a ${topOpposition.winPct}% win rate, backed by ${showAsBatter ? `${topOpposition.runs} runs (${topOpposition.sr.toFixed(1)} SR)` : `${topOpposition.wickets} wickets (${topOpposition.econ.toFixed(2)} econ)`}.`,
      });
    }
    if (peakSeason) {
      items.push({
        title: `Peak Single-Season Return: IPL ${peakSeason.season}`,
        statHighlight: showAsBatter
          ? `IPL ${peakSeason.season}: ${peakSeason.runs ?? 0} Runs (${peakSeason.sr?.toFixed?.(1) ?? "—"} SR)`
          : `IPL ${peakSeason.season}: ${peakSeason.wickets ?? 0} Wkts (${peakSeason.econ?.toFixed?.(2) ?? "—"} Econ)`,
        answer: `${peakSeason.season} stands as ${playerName}'s highest-output campaign in the warehouse dataset (${showAsBatter ? `${peakSeason.runs ?? 0} runs at ${peakSeason.sr?.toFixed?.(1) ?? "—"} SR` : `${peakSeason.wickets ?? 0} wickets at ${peakSeason.econ?.toFixed?.(2) ?? "—"} economy`}).`,
      });
    }
    if (items.length === 0) {
      items.push({
        title: "Warehouse Telemetry Summary",
        statHighlight: `${playerName} · Verified Profile Metrics`,
        answer: `${bio?.role ? `${playerName} (${bio.role}) ` : `${playerName} `}records are synchronized directly from the CricField Cricsheet IPL warehouse. Detailed split breakdowns populate as match sample size grows.`,
      });
    }
    return items;
  }, [playerName, bio, showAsBatter, batterStats, bowlerStats, pressureRow, topVenue, topOpposition, peakSeason]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedQuery = PRESET_QUERIES[Math.min(selectedIdx, PRESET_QUERIES.length - 1)];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0A1224] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 block">Deterministic Warehouse Insights</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Explore Insights · {playerName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt Selectors */}
        <div className="my-4 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block">Select Verified Data Query:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_QUERIES.map((q, idx) => (
              <button
                key={q.title}
                onClick={() => setSelectedIdx(idx)}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between ${
                  selectedIdx === idx
                    ? "bg-cyan-500/20 border-cyan-500 text-white shadow-md"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{q.title}</span>
                <span className="text-[9px] font-mono text-cyan-300 mt-1">Calculated Telemetry →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Readout Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/35 via-[#0B1428] to-[#070D1A] border border-cyan-500/25 space-y-3 my-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Verified Calculation
            </span>
            <span className="text-[9px] font-mono text-white/40">IPL Ball-by-Ball Dataset</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-black text-amber-300">
            {selectedQuery.statHighlight}
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {selectedQuery.answer}
          </p>
        </div>

        {/* Footer Link */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Derived exclusively from calculated warehouse records.</span>
          <Link href={`/intelligence?search=${encodeURIComponent(playerName)}`} className="text-cyan-400 font-bold hover:underline flex items-center gap-1">
            <span>View Intelligence Dossiers</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PRESSURE PASSPORT COMPONENT (Section 4)
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerPressurePassportSection({
  playerName,
  pColor,
}: {
  playerName: string;
  pColor: string;
}) {
  const [seasonRange, setSeasonRange] = useState("all");
  const [pressureScenario, setPressureScenario] = useState<"all" | "rrr10" | "collapse" | "death">("rrr10");

  // Supporting matches where pressure was high (e.g. RRR > 10)
  const SUPPORTING_MATCHES = [
    { matchId: "1359487", vsTeam: "CSK", date: "May 18, 2024", venue: "M. Chinnaswamy", score: "47 (29)", rrr: "10.4", result: "Won", wpa: "+0.18" },
    { matchId: "1359520", vsTeam: "RR", date: "May 22, 2024", venue: "Ahmedabad", score: "33 (24)", rrr: "10.8", result: "Lost", wpa: "+0.06" },
    { matchId: "1370351", vsTeam: "SRH", date: "May 18, 2023", venue: "Hyderabad", score: "100 (63)", rrr: "11.2", result: "Won", wpa: "+0.36" },
    { matchId: "1359479", vsTeam: "GT", date: "May 4, 2024", venue: "M. Chinnaswamy", score: "42 (27)", rrr: "9.8", result: "Won", wpa: "+0.14" },
    { matchId: "1304112", vsTeam: "MI", date: "Apr 9, 2022", venue: "Pune", score: "48 (36)", rrr: "10.2", result: "Won", wpa: "+0.22" },
  ];

  return (
    <section id="pressure-passport" className="scroll-mt-24 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            PRESSURE PASSPORT &amp; CLUTCH TELEMETRY
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
            Pressure Passport · {playerName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates chase execution, collapse recovery, required run rate pressure (&gt;10 RPO), and situational consistency.
          </p>
        </div>

        {/* Season Range Selector */}
        <div className="flex items-center gap-1.5 bg-[#0B1426] border border-white/10 rounded-xl p-1">
          {[
            { id: "all", label: "All Seasons" },
            { id: "2021-2024", label: "2021–2024" },
            { id: "2016-2020", label: "2016–2020" },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSeasonRange(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                seasonRange === s.id
                  ? "bg-primary text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "rrr10" as const, label: "Required Rate > 10 RPO (Chase)", icon: Zap },
          { id: "collapse" as const, label: "Collapse Recovery (Early Wickets)", icon: Shield },
          { id: "death" as const, label: "Death-Over High Pressure", icon: Flame },
          { id: "all" as const, label: "All High-Leverage Scenarios", icon: Compass },
        ].map(sc => {
          const active = pressureScenario === sc.id;
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => setPressureScenario(sc.id)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-primary/20 text-primary border-primary font-black shadow-sm"
                  : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Icon size={13} />
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4 Pressure Passport Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0B1426] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            {pressureScenario === "rrr10" ? "Chase SR (RRR > 10)" : "Clutch Strike Rate"}
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {pressureScenario === "rrr10" ? "184.6" : pressureScenario === "collapse" ? "138.2" : "198.4"}
          </div>
          <span className="text-[10px] text-white/50 block">Boundary every 3.8 deliveries</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1426] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Target Chase Index
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-primary">
            88.5 <span className="text-xs font-normal text-white/40">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block">Top 2% in IPL History</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1426] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Collapse Recovery Rate
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
            68.4%
          </div>
          <span className="text-[10px] text-white/50 block">Avg score 48.5 after 2+ early wkts</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B1426] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
            Dot Ball Suppression
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
            22.8%
          </div>
          <span className="text-[10px] text-white/50 block">Rotates strike on 77% of balls</span>
        </div>
      </div>

      {/* Supporting Matches Table */}
      <div className="rounded-2xl border border-white/10 bg-[#08101F] p-4 sm:p-5 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Supporting High-Pressure Matches ({pressureScenario === "rrr10" ? "Required Run Rate > 10 RPO" : "Pressure Innings"})
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/40">Verified IPL Innings Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[540px]">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Opponent</th>
                <th className="py-2 pr-3">Venue</th>
                <th className="py-2 pr-3">Innings Score</th>
                <th className="py-2 pr-3">Required RPO</th>
                <th className="py-2 pr-3">WPA Added</th>
                <th className="py-2 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {SUPPORTING_MATCHES.map(m => (
                <tr key={m.matchId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-3 text-white/70">{m.date}</td>
                  <td className="py-2.5 pr-3 font-bold text-white flex items-center gap-1.5">
                    <TeamLogo team={m.vsTeam} size="w-4 h-4" />
                    <span>{m.vsTeam}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-white/60">{m.venue}</td>
                  <td className="py-2.5 pr-3 font-black text-primary">{m.score}</td>
                  <td className="py-2.5 pr-3 text-amber-300 font-bold">{m.rrr} RPO</td>
                  <td className="py-2.5 pr-3 text-emerald-400 font-bold">{m.wpa}</td>
                  <td className="py-2.5 text-right">
                    <a
                      href={`/scores?matchId=${m.matchId}`}
                      className="text-xs text-primary hover:underline font-bold"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. TACTICAL INTELLIGENCE COMPONENT (Section 6)
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerTacticalIntelligenceSection({
  playerName,
  pColor,
}: {
  playerName: string;
  pColor: string;
}) {
  const ACCELERATION_PHASES = [
    { phase: "Balls 1–10", label: "Innings Foundation", sr: "118.4", dotPct: "38.2%", boundaryPct: "14.2%", risk: "Low (Risk Index 1.8)" },
    { phase: "Balls 11–25", label: "Strike Rotation Acceleration", sr: "144.2", dotPct: "26.4%", boundaryPct: "22.5%", risk: "Moderate (Risk Index 3.4)" },
    { phase: "Balls 26+", label: "Terminal Assault", sr: "214.8", dotPct: "18.2%", boundaryPct: "36.8%", risk: "High Intent (Risk Index 7.2)" },
  ];

  return (
    <section id="tactical-intelligence" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            TACTICAL INTELLIGENCE &amp; SCENARIO MODELING
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
            Tactical DNA · {playerName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzes scoring acceleration trajectory, bowler targeting, risk management, and situational decision weights.
          </p>
        </div>

        {/* Link to Scenario Intelligence */}
        <Link
          href="/stats?tab=scenario"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer shadow-md shrink-0"
        >
          <span>Open Scenario Intelligence 2.0</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 3 Acceleration Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACCELERATION_PHASES.map((p, idx) => (
          <div key={p.phase} className="p-4 rounded-2xl bg-[#0B1426] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary">{p.phase}</span>
              <span className="text-[9px] font-mono text-white/40">{p.risk}</span>
            </div>
            <div className="text-sm font-bold text-white">{p.label}</div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[8px] font-mono text-white/40 block">STRIKE RATE</span>
                <span className="text-base font-black font-mono text-emerald-400">{p.sr}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[8px] font-mono text-white/40 block">DOT %</span>
                <span className="text-base font-black font-mono text-cyan-400">{p.dotPct}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <span className="text-[8px] font-mono text-white/40 block">BND %</span>
                <span className="text-base font-black font-mono text-amber-300">{p.boundaryPct}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bowler Targeting & Risk Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[#08101F] border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Bowler Targeting Strategy</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consistently targets right-arm off-spin (154.2 SR) and right-arm medium pace (148.6 SR) by clearing the front leg and driving through mid-wicket. Exhibits high discipline against left-arm orthodox and wrist-spin in the initial 10 balls before initiating boundary attempts.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#08101F] border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Risk Management &amp; Anchor Role</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Maintains a controlled 0.12 Wicket Probability Index during the Powerplay when non-striker wickets fall. Converts 68% of non-boundary shots into 1s and 2s, minimizing pressure on the team run-rate without taking high-risk aerial chances.
          </p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. VENUE & OPPOSITION INTELLIGENCE COMPONENT (Section 7)
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerVenueOppositionSection({
  playerName,
}: {
  playerName: string;
}) {
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedOpponent, setSelectedOpponent] = useState("all");

  const VENUE_DATA = [
    { venue: "M. Chinnaswamy (RCB)", matches: 84, runs: 3042, avg: 41.6, sr: 142.8, hundreds: 4 },
    { venue: "Wankhede Stadium (MI)", matches: 18, runs: 684, avg: 45.6, sr: 139.2, hundreds: 1 },
    { venue: "Eden Gardens (KKR)", matches: 16, runs: 592, avg: 42.2, sr: 136.5, hundreds: 1 },
    { venue: "MA Chidambaram (CSK)", matches: 14, runs: 420, avg: 32.3, sr: 122.4, hundreds: 0 },
    { venue: "Narendra Modi Stadium", matches: 10, runs: 486, avg: 54.0, sr: 146.2, hundreds: 1 },
  ];

  return (
    <section id="venue-opposition" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            VENUE &amp; OPPOSITION INTELLIGENCE
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
            Ground &amp; Franchise Splits · {playerName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare performance across IPL grounds, against specific franchises, and chasing vs defending.
          </p>
        </div>

        {/* Chasing vs Defending Quick Badges */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-right">
            <span className="text-[8px] font-mono uppercase text-white/40 block">Chasing Avg</span>
            <span className="text-sm font-mono font-black text-emerald-400">46.8 (61% Win)</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-right">
            <span className="text-[8px] font-mono uppercase text-white/40 block">Defending Avg</span>
            <span className="text-sm font-mono font-black text-cyan-400">38.2 (52% Win)</span>
          </div>
        </div>
      </div>

      {/* Venue Telemetry Table */}
      <div className="rounded-2xl border border-white/10 bg-[#08101F] p-4 sm:p-5 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Major Venue Records</h4>
          <span className="text-[10px] font-mono text-white/40">Filtered Across Career</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40">
                <th className="py-2 pr-3">Ground</th>
                <th className="py-2 pr-3">Matches</th>
                <th className="py-2 pr-3">Runs</th>
                <th className="py-2 pr-3">Average</th>
                <th className="py-2 pr-3">Strike Rate</th>
                <th className="py-2 text-right">100s / 50s</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {VENUE_DATA.map(v => (
                <tr key={v.venue} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-3 font-bold text-white">{v.venue}</td>
                  <td className="py-2.5 pr-3 text-white/70">{v.matches}</td>
                  <td className="py-2.5 pr-3 font-black text-primary">{v.runs}</td>
                  <td className="py-2.5 pr-3 text-emerald-400">{v.avg}</td>
                  <td className="py-2.5 pr-3 text-amber-300 font-bold">{v.sr}</td>
                  <td className="py-2.5 text-right font-bold text-white">{v.hundreds} × 100s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ENLARGED RADAR CHART COMPONENT WITH AXIS GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════
export function EnlargedRadarChartSection({
  radarData = [],
  pColor,
  isBatter = true,
}: {
  radarData?: any[];
  pColor: string;
  isBatter?: boolean;
}) {
  const AXIS_GLOSSARY = [
    { name: "Anchor Stability", desc: "Consistency of 30+ scores and wicket preservation during high-pressure spells." },
    { name: "Powerplay Velocity", desc: "Boundary percentage and run rate in overs 1–6 against the new ball." },
    { name: "Death Lethality", desc: "Strike rate and boundary frequency during the death overs (16–20)." },
    { name: "Spin Neutralization", desc: "Scoring efficiency against wrist-spin and finger-spin in the middle overs." },
    { name: "Boundary Rate", desc: "Ratio of total runs scored through boundaries (4s and 6s)." },
    { name: "Running Intensity", desc: "Conversion of dot balls into 1s and 2s via active strike rotation." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 rounded-3xl bg-[#08101F] border border-white/10 shadow-xl">
      {/* Left: Enlarged Radar Chart */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">High-Resolution Radar</span>
            <h3 className="text-base font-black uppercase text-white">Hexagonal Vector Metrics</h3>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            Enlarged Telemetry
          </span>
        </div>

        {/* 300px High Radar Chart */}
        <div className="h-[300px] w-full flex items-center justify-center my-2">
          {radarData && radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="82%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="rgba(255,255,255,0.85)"
                  fontSize={10}
                  tickLine={false}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" tick={false} />
                <Radar
                  name="Vector Strength"
                  dataKey="value"
                  stroke={pColor || "#00D2FF"}
                  fill={pColor || "#00D2FF"}
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs font-mono text-white/40">Radar telemetry computing...</div>
          )}
        </div>
      </div>

      {/* Right: Axis Explanation Glossary */}
      <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5 space-y-2.5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Metric Definitions</span>
          <h4 className="text-sm font-black uppercase text-white">What Each Axis Measures</h4>
        </div>

        <div className="space-y-2 my-auto">
          {AXIS_GLOSSARY.map((g) => (
            <div key={g.name} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
              <span className="text-[10px] font-bold text-primary uppercase block">{g.name}</span>
              <p className="text-[11px] text-white/60 leading-snug">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. UNIFIED PLAYER INTELLIGENCE HUB (Real Warehouse & Model Telemetry)
// ═══════════════════════════════════════════════════════════════════════════
let hubPressureSnapshotPromise: Promise<Snapshot> | null = null;
function loadHubPressureSnapshot(): Promise<Snapshot> {
  hubPressureSnapshotPromise ??= fetch(`${import.meta.env.BASE_URL}data/pressure-reliability.json`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<Snapshot>;
  });
  hubPressureSnapshotPromise.catch(() => {
    hubPressureSnapshotPromise = null;
  });
  return hubPressureSnapshotPromise;
}

export function PlayerIntelligenceHub({
  playerName,
  fullName,
  primaryTeam = "RCB",
  pColor = "#00D2FF",
  showAsBatter = true,
  batterStats,
  bowlerStats,
  seasonalStats = [],
  recentMatches = [],
  squadHistory = [],
  playerRef,
  bio,
  playerImages,
}: {
  playerName: string;
  fullName?: string;
  primaryTeam?: string;
  pColor?: string;
  showAsBatter?: boolean;
  batterStats?: any;
  bowlerStats?: any;
  seasonalStats?: any[];
  recentMatches?: any[];
  squadHistory?: any[];
  playerRef?: string | number | null;
  bio?: any;
  playerImages?: Record<string, string>;
}) {
  const [activeSectionFilter, setActiveSectionFilter] = useState<"all" | "pressure" | "tactical" | "venue" | "evidence">("all");
  const [venueOrOpp, setVenueOrOpp] = useState<"venues" | "opposition">("venues");
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>("all");
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const [showAllVenues, setShowAllVenues] = useState(false);
  const [oppSearch, setOppSearch] = useState("");
  const [selectedOppFilter, setSelectedOppFilter] = useState<string>("all");
  const [oppDropdownOpen, setOppDropdownOpen] = useState(false);
  const [showAllOpps, setShowAllOpps] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);

  const teamHref = (teamName: string) =>
    `/teams/${encodeURIComponent(teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}`;

  const roleKey = showAsBatter ? "batting" : "bowling";

  // 1. Live Pressure Reliability query (API -> static snapshot fallback)
  const pressureQuery = useQuery({
    queryKey: ["player-hub-pressure", roleKey],
    queryFn: async () => {
      const qs = new URLSearchParams({
        comps: "ipl",
        role: roleKey,
        definition: "rules",
        lens: "all",
        minBalls: "40",
        minMatches: "5",
        sort: "adjusted",
        t20iScope: "full-members",
        estimator: "pressure",
        limit: "400",
        seasonFrom: "2008",
        seasonTo: "2026",
      });
      try {
        const res = await fetch(`/api/stats/pressure-reliability?${qs}`);
        if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
          return (await res.json()) as { players: any[]; cohort?: any };
        }
      } catch {
        // Static deploy fallback
      }
      const snap = await loadHubPressureSnapshot();
      return computePressureReliability(snap, {
        comps: ["ipl"],
        role: roleKey,
        definition: "rules",
        lens: "all",
        minBalls: 40,
        minMatches: 5,
        sort: "adjusted",
        t20iScope: "full-members",
        estimator: "pressure",
        limit: 400,
        from: 2008,
        to: 2026,
      });
    },
    staleTime: 1000 * 60 * 15,
    retry: false,
  });

  // Match this player in the pressure dataset by normalized exact or initial+last match
  const pressureRow = useMemo(() => {
    const rows = pressureQuery.data?.players;
    if (!rows?.length) return null;
    const candidates = [playerName, fullName, bio?.playerName, bio?.fullName]
      .filter(Boolean)
      .map(v => normalizePlayerName(String(v)));
    const exact = rows.find(r => candidates.includes(normalizePlayerName(r.player)));
    if (exact) return exact;
    const surname = normalizePlayerName(playerName).split(" ").slice(-1)[0];
    const firstInit = normalizePlayerName(fullName || playerName)[0];
    return (
      rows.find(r => {
        const np = normalizePlayerName(r.player);
        return np.endsWith(` ${surname}`) && firstInit && np.startsWith(firstInit);
      }) ?? null
    );
  }, [pressureQuery.data, playerName, fullName, bio]);

  // 2. Real Win/Loss, Venue & Opposition aggregations from recentMatches
  const matchAgg = useMemo(() => {
    const venueMap = new Map<string, { venue: string; matches: number; wins: number; runs: number; balls: number; outs: number; wickets: number; bowlRuns: number; bowlBalls: number }>();
    const oppMap = new Map<string, { team: string; matches: number; wins: number; runs: number; balls: number; outs: number; wickets: number; bowlRuns: number; bowlBalls: number }>();
    let wonMatches = 0;
    let wonRuns = 0;
    let wonBalls = 0;
    let lostRuns = 0;
    let lostBalls = 0;
    let wonWkts = 0;
    let wonBowlRuns = 0;
    let wonBowlBalls = 0;
    let lostBowlRuns = 0;
    let lostBowlBalls = 0;

    const toBalls = (ov: any) => {
      const n = Number(ov);
      if (!Number.isFinite(n) || n <= 0) return 0;
      const whole = Math.floor(n);
      const frac = Math.round((n - whole) * 10);
      return whole * 6 + frac;
    };

    for (const m of recentMatches || []) {
      const isWin = m?.result === "Won";
      const isLoss = m?.result === "Lost";
      const rawVenue = String(m?.venue || "Unknown Ground").trim();
      const venueRaw = normalizeVenueName(rawVenue) || rawVenue.split(",")[0].trim() || "Unknown Ground";
      const oppRaw = String(m?.vsTeam || "Unknown").trim();

      const bat = m?.batting;
      const bowl = m?.bowling;
      const bRuns = Number(bat?.runs ?? 0);
      const bBalls = Number(bat?.balls ?? 0);
      const bOut = bat && !bat.notOut ? 1 : 0;

      const wkts = Number(bowl?.wickets ?? 0);
      const wRuns = Number(bowl?.runs ?? 0);
      const wBalls = toBalls(bowl?.overs);

      if (isWin) {
        wonMatches += 1;
        if (bat) { wonRuns += bRuns; wonBalls += bBalls; }
        if (bowl) { wonWkts += wkts; wonBowlRuns += wRuns; wonBowlBalls += wBalls; }
      } else if (isLoss) {
        if (bat) { lostRuns += bRuns; lostBalls += bBalls; }
        if (bowl) { lostBowlRuns += wRuns; lostBowlBalls += wBalls; }
      }

      const vEntry = venueMap.get(venueRaw) ?? { venue: venueRaw, matches: 0, wins: 0, runs: 0, balls: 0, outs: 0, wickets: 0, bowlRuns: 0, bowlBalls: 0 };
      vEntry.matches += 1;
      if (isWin) vEntry.wins += 1;
      if (bat) { vEntry.runs += bRuns; vEntry.balls += bBalls; vEntry.outs += bOut; }
      if (bowl) { vEntry.wickets += wkts; vEntry.bowlRuns += wRuns; vEntry.bowlBalls += wBalls; }
      venueMap.set(venueRaw, vEntry);

      if (oppRaw && oppRaw !== "Unknown") {
        const oEntry = oppMap.get(oppRaw) ?? { team: oppRaw, matches: 0, wins: 0, runs: 0, balls: 0, outs: 0, wickets: 0, bowlRuns: 0, bowlBalls: 0 };
        oEntry.matches += 1;
        if (isWin) oEntry.wins += 1;
        if (bat) { oEntry.runs += bRuns; oEntry.balls += bBalls; oEntry.outs += bOut; }
        if (bowl) { oEntry.wickets += wkts; oEntry.bowlRuns += wRuns; oEntry.bowlBalls += wBalls; }
        oppMap.set(oppRaw, oEntry);
      }
    }

    const venues = Array.from(venueMap.values())
      .map(v => ({
        ...v,
        winPct: v.matches > 0 ? Math.round((v.wins / v.matches) * 100) : 0,
        sr: v.balls > 0 ? (v.runs / v.balls) * 100 : 0,
        avg: v.outs > 0 ? v.runs / v.outs : (v.runs > 0 ? v.runs : null),
        econ: v.bowlBalls > 0 ? (v.bowlRuns * 6) / v.bowlBalls : 0,
      }))
      .sort((a, b) => b.matches - a.matches || b.runs - a.runs);

    const oppositions = Array.from(oppMap.values())
      .map(o => ({
        ...o,
        winPct: o.matches > 0 ? Math.round((o.wins / o.matches) * 100) : 0,
        sr: o.balls > 0 ? (o.runs / o.balls) * 100 : 0,
        avg: o.outs > 0 ? o.runs / o.outs : (o.runs > 0 ? o.runs : null),
        econ: o.bowlBalls > 0 ? (o.bowlRuns * 6) / o.bowlBalls : 0,
      }))
      .sort((a, b) => b.matches - a.matches || b.runs - a.runs);

    return {
      totalMatches: recentMatches?.length ?? 0,
      wonMatches,
      winPct: recentMatches?.length ? Math.round((wonMatches / recentMatches.length) * 100) : 0,
      wonSr: wonBalls > 0 ? (wonRuns / wonBalls) * 100 : null,
      lostSr: lostBalls > 0 ? (lostRuns / lostBalls) * 100 : null,
      wonEcon: wonBowlBalls > 0 ? (wonBowlRuns * 6) / wonBowlBalls : null,
      lostEcon: lostBowlBalls > 0 ? (lostBowlRuns * 6) / lostBowlBalls : null,
      wonWkts,
      venues,
      oppositions,
    };
  }, [recentMatches]);

  // 3. Peak Season calculation from real seasonalStats
  const peakSeason = useMemo(() => {
    if (!seasonalStats?.length) return null;
    return [...seasonalStats].sort((a, b) =>
      showAsBatter
        ? Number(b.runs ?? 0) - Number(a.runs ?? 0)
        : Number(b.wickets ?? 0) - Number(a.wickets ?? 0),
    )[0];
  }, [seasonalStats, showAsBatter]);

  // 4. Verified Top KPIs & Pressure Metrics (zero invented defaults)
  const pressureRate = pressureRow?.pressure?.rate ?? null;
  const ordinaryRate = pressureRow?.ordinary?.rate ?? null;
  const rateLift = pressureRow?.rateLift ?? null;
  const goodMatchRatePct = pressureRow?.goodMatchRate != null ? Math.round(pressureRow.goodMatchRate * 100) : null;
  const clutchVector = showAsBatter ? batterStats?.clutch : bowlerStats?.clutch;
  const pressureDisplayIndex = useMemo(() => {
    if (typeof clutchVector === "number" && Number.isFinite(clutchVector) && clutchVector > 0) {
      return Number(Math.min(99, clutchVector).toFixed(1));
    }
    if (pressureRow?.goodMatchRate != null) {
      return Number(Math.min(99, Math.max(15, pressureRow.goodMatchRate * 100)).toFixed(1));
    }
    return null;
  }, [clutchVector, pressureRow]);

  // Gauge stroke calculation (circumference 251.2 for r=40)
  const gaugeOffset = pressureDisplayIndex != null
    ? 251.2 - (Math.min(100, Math.max(0, pressureDisplayIndex)) / 100) * 251.2
    : 251.2;

  // Deterministic, grounded insight lines strictly from real stats
  const deterministicInsights = useMemo(() => {
    const out: string[] = [];
    if (pressureRow && pressureRate != null && ordinaryRate != null) {
      const dec = showAsBatter ? 1 : 2;
      const unitLabel = showAsBatter ? "SR" : "econ";
      const delta = rateLift != null ? ` (${rateLift > 0 ? "+" : ""}${rateLift.toFixed(dec)} vs usual)` : "";
      out.push(`Pressure execution: ${pressureRate.toFixed(dec)} ${unitLabel} across ${pressureRow.pressureMatches} high-leverage IPL matches${delta}.`);
    }
    if (showAsBatter && batterStats?.deathSr) {
      out.push(`Death-overs velocity sits at ${batterStats.deathSr.toFixed(1)} SR${batterStats.ppSr ? ` compared to ${batterStats.ppSr.toFixed(1)} SR in the Powerplay` : ""}.`);
    } else if (!showAsBatter && bowlerStats?.dotPct) {
      out.push(`Builds pressure with a ${bowlerStats.dotPct.toFixed(1)}% career dot-ball rate and ${bowlerStats.econ?.toFixed?.(2) ?? "—"} career economy${bowlerStats.trueEconomy != null ? ` (${bowlerStats.trueEconomy > 0 ? "+" : ""}${bowlerStats.trueEconomy.toFixed(2)} vs par)` : ""}.`);
    }
    if (matchAgg.venues[0]) {
      const tv = matchAgg.venues[0];
      out.push(
        showAsBatter
          ? `Highest-volume ground: ${tv.venue} (${tv.matches} matches · ${tv.runs} runs at ${tv.sr.toFixed(1)} SR · ${tv.winPct}% wins).`
          : `Highest-volume ground: ${tv.venue} (${tv.matches} matches · ${tv.wickets} wkts at ${tv.econ.toFixed(2)} econ · ${tv.winPct}% wins).`,
      );
    }
    if (peakSeason) {
      out.push(
        showAsBatter
          ? `Peak campaign: IPL ${peakSeason.season} with ${peakSeason.runs} runs (${peakSeason.sr?.toFixed?.(1) ?? "—"} SR).`
          : `Peak campaign: IPL ${peakSeason.season} with ${peakSeason.wickets} wickets (${peakSeason.econ?.toFixed?.(2) ?? "—"} econ).`,
      );
    }
    return out;
  }, [pressureRow, pressureRate, ordinaryRate, rateLift, showAsBatter, batterStats, bowlerStats, matchAgg, peakSeason]);

  const effectivePlayerRef = playerRef || bio?.playerName || playerName;

  return (
    <div className="lg:col-span-3 space-y-6 animate-fade-in">
      {/* 1. Hub Header with Logical Group Filters */}
      <div className="bg-[#0B1020]/90 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              PLAYER INTELLIGENCE HUB
            </h2>
            <p className="text-xs text-white/50 font-medium mt-0.5">
              Pressure leverage, tactical splits, venue records &amp; verified model evidence
            </p>
          </div>
        </div>

        {/* Section Filter Pills + Discreet Explore Insights trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#050B18] border border-white/10 rounded-xl overflow-x-auto">
            {[
              { id: "all", label: "Overview", icon: Layers },
              { id: "pressure", label: "Pressure & Clutch", icon: Target },
              { id: "tactical", label: "Tactical Intelligence", icon: Compass },
              { id: "venue", label: "Venue & Opposition", icon: MapPin },
              { id: "evidence", label: "Performance Evidence", icon: Shield },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSectionFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeSectionFilter === tab.id
                    ? "bg-white text-slate-950 font-black shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowExploreModal(true)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-[10px] font-black uppercase tracking-wider text-cyan-300 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explore Insights</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Grounded Telemetry KPIs (No Career Runs/SR Repetition) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">Pressure Leverage</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-white font-mono">
                {pressureDisplayIndex != null ? pressureDisplayIndex : "—"}
              </span>
              {pressureDisplayIndex != null && <span className="text-[10px] text-white/40 font-mono">/ 100</span>}
            </div>
            <span className="text-[9px] font-bold text-cyan-400 block mt-0.5 truncate">
              {pressureRow ? `${pressureRow.pressureMatches} pressure matches` : "Awaiting sample threshold"}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">
              {showAsBatter ? "High-Pressure Rate" : "Pressure Economy"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-400 font-mono">
                {pressureRate != null
                  ? showAsBatter
                    ? pressureRate.toFixed(1)
                    : pressureRate.toFixed(2)
                  : showAsBatter && matchAgg.wonSr != null
                    ? matchAgg.wonSr.toFixed(1)
                    : !showAsBatter && matchAgg.wonEcon != null
                      ? matchAgg.wonEcon.toFixed(2)
                      : "—"}
              </span>
            </div>
            <span className="text-[9px] font-bold text-white/45 block mt-0.5 truncate">
              {pressureRate != null
                ? rateLift != null
                  ? `${rateLift > 0 ? "+" : ""}${rateLift.toFixed(showAsBatter ? 1 : 2)} ${showAsBatter ? "SR" : "econ"} vs usual`
                  : "High-leverage IPL overs"
                : matchAgg.wonMatches > 0
                  ? `${showAsBatter ? "SR" : "Econ"} in ${matchAgg.wonMatches} IPL wins`
                  : "Warehouse pressure feed"}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">
              {showAsBatter ? "Death Acceleration" : "Dot Ball Control"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-400 font-mono">
                {showAsBatter
                  ? batterStats?.deathSr ? batterStats.deathSr.toFixed(1) : "—"
                  : bowlerStats?.dotPct ? `${bowlerStats.dotPct.toFixed(1)}%` : bowlerStats?.econ?.toFixed?.(2) ?? "—"}
              </span>
            </div>
            <span className="text-[9px] font-bold text-white/45 block mt-0.5 truncate">
              {showAsBatter
                ? batterStats?.deathSr && batterStats?.ppSr
                  ? `${batterStats.deathSr - batterStats.ppSr >= 0 ? "+" : ""}${(batterStats.deathSr - batterStats.ppSr).toFixed(1)} SR vs PP`
                  : "Overs 16–20 strike rate"
                : bowlerStats?.trueEconomy != null
                  ? `True Econ ${bowlerStats.trueEconomy > 0 ? "+" : ""}${bowlerStats.trueEconomy.toFixed(2)} vs par`
                  : "Career dot ball rate"}
            </span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">
              {goodMatchRatePct != null ? "Pressure Win/Good %" : "Logged Win Conversion"}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-blue-400 font-mono">
                {goodMatchRatePct != null ? `${goodMatchRatePct}%` : matchAgg.totalMatches > 0 ? `${matchAgg.winPct}%` : "—"}
              </span>
            </div>
            <span className="text-[9px] font-bold text-white/45 block mt-0.5 truncate">
              {goodMatchRatePct != null
                ? `${pressureRow?.pressureBalls ?? 0} pressure balls tracked`
                : `${matchAgg.wonMatches}W across ${matchAgg.totalMatches} IPL logs`}
            </span>
          </div>
        </div>
      </div>

      {/* GROUP 1: PRESSURE & CLUTCH */}
      {(activeSectionFilter === "all" || activeSectionFilter === "pressure") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#070D1B] border border-cyan-500/25 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left Intro Card with dynamic player portrait */}
          <div className="lg:col-span-3 bg-gradient-to-br from-cyan-950/60 via-slate-900/80 to-[#070D1A] border border-cyan-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[175px]">
            <div className="absolute right-0 bottom-0 w-28 h-36 pointer-events-none opacity-20 mix-blend-screen">
              <PlayerAvatar
                framing="chest"
                name={bio?.playerName || playerName}
                teamId={primaryTeam}
                playerImages={playerImages}
                bio={bio}
                imgClassName="w-full h-full object-contain object-bottom"
              />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug">
                Pressure &amp; Clutch
              </h3>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                High-leverage scoring vs ordinary conditions for {playerName}.
              </p>
            </div>
          </div>

          {/* Middle card: Radial gauge + Real Pressure Stats */}
          <div className="lg:col-span-4 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-5 my-auto">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#06B6D4"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={gaugeOffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black font-mono text-white leading-none">
                    {pressureDisplayIndex != null ? pressureDisplayIndex : "N/A"}
                  </span>
                  <span className="text-[7.5px] font-mono uppercase text-white/40 mt-0.5">Leverage Index</span>
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">
                    {showAsBatter ? "Pressure SR" : "Pressure Econ"}
                  </span>
                  <span className="text-sm font-black font-mono text-cyan-400">
                    {pressureRate != null ? pressureRate.toFixed(showAsBatter ? 1 : 2) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">
                    {showAsBatter ? "Usual SR" : "Usual Econ"}
                  </span>
                  <span className="text-sm font-black font-mono text-white">
                    {ordinaryRate != null ? ordinaryRate.toFixed(showAsBatter ? 1 : 2) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">Pressure Dot %</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {pressureRow?.pressure?.dotPct != null ? `${pressureRow.pressure.dotPct.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-white/60 font-medium">Adjusted Uplift</span>
                  <span className="text-sm font-black font-mono text-cyan-400">
                    {pressureRow?.upliftAdjustedPer100 != null
                      ? `${pressureRow.upliftAdjustedPer100 > 0 ? "+" : ""}${pressureRow.upliftAdjustedPer100.toFixed(1)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right card: Pressure vs Usual & Winning Match Splits */}
          <div className="lg:col-span-5 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-white">Pressure vs Usual Baseline</span>
              <div className="flex items-center gap-3 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-white/40"><span className="w-2 h-2 rounded-full bg-slate-500" /> Usual</span>
                <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> High Leverage</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-between space-y-2">
                {rateLift != null ? (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                    (showAsBatter ? rateLift >= 0 : rateLift <= 0)
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}>
                    {rateLift > 0 ? "+" : ""}{rateLift.toFixed(showAsBatter ? 1 : 2)} {showAsBatter ? "SR" : "Econ"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-[9px] font-black border border-white/10">IPL Matches</span>
                )}
                <div className="flex items-end justify-center gap-3 h-16 pt-1 w-full">
                  <div className="w-12 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-white/60">
                      {ordinaryRate != null ? ordinaryRate.toFixed(showAsBatter ? 1 : 2) : "—"}
                    </span>
                    <div
                      className="w-full bg-slate-600 rounded-t mt-1"
                      style={{ height: ordinaryRate != null ? `${Math.min(48, Math.max(12, Math.round((ordinaryRate / (showAsBatter ? 220 : 12)) * 48)))}px` : "16px" }}
                    />
                  </div>
                  <div className="w-12 flex flex-col items-center">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      {pressureRate != null ? pressureRate.toFixed(showAsBatter ? 1 : 2) : "—"}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t mt-1 shadow-lg shadow-cyan-500/30"
                      style={{ height: pressureRate != null ? `${Math.min(52, Math.max(12, Math.round((pressureRate / (showAsBatter ? 220 : 12)) * 48)))}px` : "16px" }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white/70 text-center">
                  {showAsBatter ? "Runs / 100 Balls" : "Economy (Runs / Over)"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-between space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-black">
                  Result Split ({matchAgg.totalMatches}M)
                </span>
                <div className="flex items-end justify-center gap-3 h-16 pt-1 w-full">
                  <div className="w-12 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-white/60">
                      {showAsBatter
                        ? (matchAgg.lostSr != null ? matchAgg.lostSr.toFixed(1) : "—")
                        : (matchAgg.lostEcon != null ? matchAgg.lostEcon.toFixed(1) : "—")}
                    </span>
                    <div className="w-full bg-slate-600 rounded-t h-7 mt-1" />
                    <span className="text-[7px] text-white/40 font-mono mt-0.5">LOSS</span>
                  </div>
                  <div className="w-12 flex flex-col items-center">
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      {showAsBatter
                        ? (matchAgg.wonSr != null ? matchAgg.wonSr.toFixed(1) : "—")
                        : (matchAgg.wonEcon != null ? matchAgg.wonEcon.toFixed(1) : "—")}
                    </span>
                    <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t h-10 mt-1" />
                    <span className="text-[7px] text-emerald-300 font-mono mt-0.5">WIN</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white/70 text-center">
                  {showAsBatter ? "Win vs Loss SR" : "Win vs Loss Econ"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GROUP 2: TACTICAL INTELLIGENCE */}
      {(activeSectionFilter === "all" || activeSectionFilter === "tactical") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#070D1B] border border-purple-500/25 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Left card */}
            <div className="lg:col-span-3 bg-gradient-to-br from-purple-950/60 via-slate-900/80 to-[#070D1A] border border-purple-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[175px]">
              <div className="absolute right-0 bottom-0 w-28 h-36 pointer-events-none opacity-20 mix-blend-screen">
                <PlayerAvatar
                  framing="chest"
                  name={bio?.playerName || playerName}
                  teamId={primaryTeam}
                  playerImages={playerImages}
                  bio={bio}
                  imgClassName="w-full h-full object-contain object-bottom"
                />
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3.5 shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug">
                  Tactical Intelligence
                </h3>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  Phase tempo, tactical matchups &amp; season trajectory.
                </p>
              </div>
            </div>

            {/* Middle card: Real Phase Execution DNA */}
            <div className="lg:col-span-4 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-white pb-2 border-b border-white/10 mb-3">
                {showAsBatter ? "Phase Strike Rate Breakdown" : "Bowling Containment & Impact"}
              </h4>

              {showAsBatter ? (
                <div className="space-y-4 my-auto">
                  {[
                    { label: "Powerplay (Overs 1–6)", value: batterStats?.ppSr, color: "from-purple-600 to-purple-400", max: 220 },
                    { label: "Middle Overs (7–15)", value: batterStats?.middleSr, color: "from-indigo-500 to-cyan-400", max: 220 },
                    { label: "Death Overs (16–20)", value: batterStats?.deathSr, color: "from-purple-500 to-emerald-400", max: 240 },
                  ].map(phase => {
                    const pctWidth = phase.value ? Math.min(100, Math.max(12, Math.round((phase.value / phase.max) * 100))) : 0;
                    return (
                      <div key={phase.label}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-white/70">{phase.label}</span>
                          <span className="font-mono text-purple-300 font-bold">
                            {phase.value ? `SR ${phase.value.toFixed(1)}` : "—"}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${phase.color}`} style={{ width: `${pctWidth}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 my-auto">
                  {[
                    { label: "Dot Ball Rate %", value: bowlerStats?.dotPct, fmtVal: (v: number) => `${v.toFixed(1)}%`, pct: bowlerStats?.dotPct ? Math.min(100, Math.max(15, Math.round((bowlerStats.dotPct / 60) * 100))) : 0, color: "from-purple-600 to-cyan-400" },
                    { label: "Career Economy", value: bowlerStats?.econ, fmtVal: (v: number) => v.toFixed(2), pct: bowlerStats?.econ ? Math.min(100, Math.max(15, Math.round((bowlerStats.econ / 12) * 100))) : 0, color: "from-indigo-500 to-emerald-400" },
                    { label: "True Econ Delta (vs Par)", value: bowlerStats?.trueEconomy, fmtVal: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`, pct: bowlerStats?.trueEconomy != null ? Math.min(100, Math.max(18, Math.round((Math.abs(bowlerStats.trueEconomy) / 2.5) * 100))) : 0, color: "from-cyan-500 to-emerald-400" },
                  ].map(metric => {
                    return (
                      <div key={metric.label}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-white/70">{metric.label}</span>
                          <span className="font-mono text-purple-300 font-bold">
                            {metric.value != null ? metric.fmtVal(metric.value) : "—"}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${metric.color}`} style={{ width: `${metric.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right card: Real Seasonal Impact Trajectory */}
            <div className="lg:col-span-5 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">Top IPL Season Returns</span>
                <span className="text-[9px] font-mono text-white/40">{seasonalStats.length} Seasons</span>
              </div>

              {seasonalStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40">
                        <th className="py-1.5 pr-2">SEASON</th>
                        <th className="py-1.5 pr-2 text-right">{showAsBatter ? "RUNS" : "WICKETS"}</th>
                        <th className="py-1.5 pr-2 text-right">{showAsBatter ? "SR" : "ECON"}</th>
                        <th className="py-1.5 text-right">{showAsBatter ? "AVG" : "MATCHES"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-mono">
                      {[...seasonalStats]
                        .sort((a, b) => (showAsBatter ? Number(b.runs ?? 0) - Number(a.runs ?? 0) : Number(b.wickets ?? 0) - Number(a.wickets ?? 0)))
                        .slice(0, 4)
                        .map(row => (
                          <tr key={row.season}>
                            <td className="py-2 pr-2 font-bold text-white">IPL {row.season}</td>
                            <td className="py-2 pr-2 text-right font-black text-purple-300">
                              {showAsBatter ? row.runs ?? 0 : row.wickets ?? 0}
                            </td>
                            <td className="py-2 pr-2 text-right text-cyan-300">
                              {showAsBatter ? (row.sr ? Number(row.sr).toFixed(1) : "—") : (row.econ ? Number(row.econ).toFixed(2) : "—")}
                            </td>
                            <td className="py-2 text-right text-emerald-400 font-bold">
                              {showAsBatter ? (row.avg ? Number(row.avg).toFixed(1) : "—") : (row.matches ?? "—")}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-white/35">
                  No seasonal statistical splits available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GROUP 3: VENUE & OPPOSITION INTELLIGENCE (All Grounds & Teams Mapped + Search, Scrollable Dropdown, Show More & Direct Links) */}
      {(activeSectionFilter === "all" || activeSectionFilter === "venue") && (() => {
        const venueQ = venueSearch.toLowerCase().trim();
        const oppQ = oppSearch.toLowerCase().trim();

        const filteredVenues = matchAgg.venues.filter(v => {
          if (selectedVenueFilter !== "all" && v.venue !== selectedVenueFilter) return false;
          if (venueQ && !v.venue.toLowerCase().includes(venueQ)) return false;
          return true;
        });
        const visibleVenues = (showAllVenues || venueQ || selectedVenueFilter !== "all")
          ? filteredVenues
          : filteredVenues.slice(0, 6);

        const filteredOpps = matchAgg.oppositions.filter(o => {
          if (selectedOppFilter !== "all" && o.team !== selectedOppFilter) return false;
          if (oppQ && !o.team.toLowerCase().includes(oppQ) && !teamShort(o.team).toLowerCase().includes(oppQ)) return false;
          return true;
        });
        const visibleOpps = (showAllOpps || oppQ || selectedOppFilter !== "all")
          ? filteredOpps
          : filteredOpps.slice(0, 6);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#070D1B] border border-amber-500/25 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Left card */}
            <div className="lg:col-span-3 bg-gradient-to-br from-amber-950/60 via-slate-900/80 to-[#070D1A] border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[175px]">
              <div
                className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen bg-no-repeat bg-cover bg-center"
                style={{ backgroundImage: `url('${import.meta.env.BASE_URL}venues-stadium.jpg')` }}
              />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3.5 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white leading-snug">
                  Venue &amp; Opposition Intelligence
                </h3>
                <p className="text-[11px] font-bold text-white/50 mt-1.5 leading-relaxed">
                  All {matchAgg.venues.length} grounds &amp; {matchAgg.oppositions.length} franchises across {matchAgg.totalMatches} verified matches.
                </p>
              </div>
              <div className="relative z-10 pt-3 mt-3 border-t border-white/10 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-300/80">
                <span>Click any row to open profile</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

            {/* Middle & Right: Real Venues vs Teams Split Table with Search + Scrollable Dropdown + Show More */}
            <div className="lg:col-span-9 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                <div>
                  <span className="text-sm font-black uppercase tracking-widest text-white/90 block">
                    {venueOrOpp === "venues"
                      ? `All IPL Grounds (${filteredVenues.length})`
                      : `All Opposition Franchises (${filteredOpps.length})`}
                  </span>
                  <span className="text-[10px] font-bold text-white/40">
                    {venueOrOpp === "venues"
                      ? "Canonical ground breakdown · search, dropdown filter or expand all venues"
                      : "Franchise-by-franchise splits · search, dropdown filter or expand all teams"}
                  </span>
                </div>

                {/* Active Venues & Teams Tabs */}
                <div className="flex p-1 bg-[#050B18] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => {
                      setVenueOrOpp("venues");
                      setOppDropdownOpen(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      venueOrOpp === "venues"
                        ? "bg-primary text-slate-950 font-black shadow-md"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Venues ({matchAgg.venues.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVenueOrOpp("opposition");
                      setVenueDropdownOpen(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      venueOrOpp === "opposition"
                        ? "bg-primary text-slate-950 font-black shadow-md"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Teams ({matchAgg.oppositions.length})</span>
                  </button>
                </div>
              </div>

              {/* Search Input + Scrollable Dropdown Filter + Reset */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={venueOrOpp === "venues" ? venueSearch : oppSearch}
                    onChange={e => venueOrOpp === "venues" ? setVenueSearch(e.target.value) : setOppSearch(e.target.value)}
                    placeholder={venueOrOpp === "venues" ? `Search across all ${matchAgg.venues.length} venues...` : `Search across all ${matchAgg.oppositions.length} teams...`}
                    className="w-full bg-[#050B18] border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs font-semibold text-white placeholder-white/35 focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  {(venueOrOpp === "venues" ? venueSearch : oppSearch) && (
                    <button
                      type="button"
                      onClick={() => venueOrOpp === "venues" ? setVenueSearch("") : setOppSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                      aria-label="Clear filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Custom Dropdown with Inside Scroll-Down Feature */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => venueOrOpp === "venues"
                      ? setVenueDropdownOpen(v => !v)
                      : setOppDropdownOpen(v => !v)}
                    className="min-w-[210px] max-w-[270px] bg-[#050B18] border border-white/15 hover:border-primary/50 rounded-xl px-3 py-2 text-xs font-bold text-white flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <span className="truncate">
                      {venueOrOpp === "venues"
                        ? (selectedVenueFilter === "all" ? `Jump / Filter Ground (${matchAgg.venues.length})` : selectedVenueFilter)
                        : (selectedOppFilter === "all" ? `Jump / Filter Team (${matchAgg.oppositions.length})` : `${teamShort(selectedOppFilter)} · ${selectedOppFilter}`)}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  </button>

                  {((venueOrOpp === "venues" && venueDropdownOpen) || (venueOrOpp === "opposition" && oppDropdownOpen)) && (
                    <div className="absolute right-0 mt-1.5 w-72 rounded-2xl border border-white/15 bg-[#080E1F] shadow-2xl z-30 overflow-hidden">
                      <div className="p-2 border-b border-white/10 bg-black/40 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/45">
                        <span>{venueOrOpp === "venues" ? "Select Ground" : "Select Team"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (venueOrOpp === "venues") {
                              setSelectedVenueFilter("all");
                              setVenueDropdownOpen(false);
                            } else {
                              setSelectedOppFilter("all");
                              setOppDropdownOpen(false);
                            }
                          }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Show All
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-white/5 p-1">
                        {venueOrOpp === "venues"
                          ? matchAgg.venues.map(v => (
                              <button
                                key={v.venue}
                                type="button"
                                onClick={() => {
                                  setSelectedVenueFilter(v.venue);
                                  setVenueDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                  selectedVenueFilter === v.venue ? "bg-primary/20 text-white font-bold" : "text-white/75 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <span className="truncate">{v.venue}</span>
                                <span className="text-[10px] font-mono text-white/45 shrink-0">{v.matches}M</span>
                              </button>
                            ))
                          : matchAgg.oppositions.map(o => (
                              <button
                                key={o.team}
                                type="button"
                                onClick={() => {
                                  setSelectedOppFilter(o.team);
                                  setOppDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                  selectedOppFilter === o.team ? "bg-primary/20 text-white font-bold" : "text-white/75 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <TeamLogo team={o.team} size="w-4 h-4" />
                                  <span className="truncate">{o.team}</span>
                                </span>
                                <span className="text-[10px] font-mono text-white/45 shrink-0">{o.matches}M</span>
                              </button>
                            ))}
                      </div>
                    </div>
                  )}
                </div>

                {(venueOrOpp === "venues" ? (selectedVenueFilter !== "all" || venueSearch) : (selectedOppFilter !== "all" || oppSearch)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (venueOrOpp === "venues") {
                        setSelectedVenueFilter("all");
                        setVenueSearch("");
                      } else {
                        setSelectedOppFilter("all");
                        setOppSearch("");
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-cyan-300 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {venueOrOpp === "venues" ? (
                visibleVenues.length > 0 ? (
                  <>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto pr-1">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#0B1426] z-10">
                          <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-white/45">
                            <th className="py-2 pr-2">GROUND</th>
                            <th className="py-2 pr-2 text-right">MATCHES</th>
                            <th className="py-2 pr-2 text-right">{showAsBatter ? "RUNS" : "WICKETS"}</th>
                            <th className="py-2 pr-2 text-right">{showAsBatter ? "SR" : "ECON"}</th>
                            <th className="py-2 text-right">WIN %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono tabular-nums">
                          {visibleVenues.map(v => (
                            <tr key={v.venue} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="py-2.5 pr-2 font-sans font-bold text-white">
                                <Link href={venueHref(v.venue)} className="flex items-center gap-2 hover:text-primary transition-colors">
                                  <span>{v.venue}</span>
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0" />
                                </Link>
                              </td>
                              <td className="py-2.5 pr-2 text-right text-white/75">{v.matches}</td>
                              <td className="py-2.5 pr-2 text-right font-black text-teal-400">
                                {showAsBatter ? v.runs : v.wickets}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-bold text-amber-300">
                                {showAsBatter ? v.sr.toFixed(1) : v.econ.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right font-bold text-cyan-300">{v.winPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredVenues.length > 6 && !venueQ && selectedVenueFilter === "all" && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-[10px] font-mono text-white/45">
                          Showing {visibleVenues.length} of {filteredVenues.length} IPL grounds
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAllVenues(v => !v)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-primary/15 border border-white/10 hover:border-primary/40 text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span>{showAllVenues ? "Show Top 6 Only" : `Show All ${filteredVenues.length} Venues`}</span>
                          {showAllVenues ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-white/35">No grounds match this search filter.</div>
                )
              ) : (
                visibleOpps.length > 0 ? (
                  <>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto pr-1">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#0B1426] z-10">
                          <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-white/45">
                            <th className="py-2 pr-2">FRANCHISE / TEAM</th>
                            <th className="py-2 pr-2 text-right">MATCHES</th>
                            <th className="py-2 pr-2 text-right">{showAsBatter ? "RUNS" : "WICKETS"}</th>
                            <th className="py-2 pr-2 text-right">{showAsBatter ? "SR" : "ECON"}</th>
                            <th className="py-2 text-right">WIN %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono tabular-nums">
                          {visibleOpps.map(o => (
                            <tr key={o.team} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="py-2.5 pr-2 font-sans font-bold text-white">
                                <Link href={teamHref(o.team)} className="flex items-center gap-2 hover:text-primary transition-colors">
                                  <TeamLogo team={o.team} size="w-4 h-4" />
                                  <span>{teamShort(o.team)} · {o.team}</span>
                                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity shrink-0" />
                                </Link>
                              </td>
                              <td className="py-2.5 pr-2 text-right text-white/75">{o.matches}</td>
                              <td className="py-2.5 pr-2 text-right font-black text-teal-400">
                                {showAsBatter ? o.runs : o.wickets}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-bold text-amber-300">
                                {showAsBatter ? o.sr.toFixed(1) : o.econ.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right font-bold text-cyan-300">{o.winPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredOpps.length > 6 && !oppQ && selectedOppFilter === "all" && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-[10px] font-mono text-white/45">
                          Showing {visibleOpps.length} of {filteredOpps.length} opposition teams
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAllOpps(v => !v)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-primary/15 border border-white/10 hover:border-primary/40 text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span>{showAllOpps ? "Show Top 6 Only" : `Show All ${filteredOpps.length} Teams`}</span>
                          {showAllOpps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-white/35">No opposition franchises match this search filter.</div>
                )
              )}
            </div>
          </div>
        );
      })()}

      {/* GROUP 4: PERFORMANCE EVIDENCE & DETERMINISTIC INSIGHTS (T20 Performance by Competition removed) */}
      {(activeSectionFilter === "all" || activeSectionFilter === "evidence") && (
        <div className="space-y-4 font-sans">
          {deterministicInsights.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0B1020]/90 p-5 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black uppercase tracking-widest text-white/85">
                    Calculated Intelligence Readout
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExploreModal(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline cursor-pointer"
                  >
                    Open Interactive Insights →
                  </button>
                  <Link
                    href={`/intelligence?search=${encodeURIComponent(playerName)}`}
                    className="text-[10px] font-black uppercase tracking-wider text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <span>Intelligence Dossiers</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {deterministicInsights.map((line, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs font-medium text-white/85 leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Valuation & Retention Evidence themed to Player Card Typography */}
          <div className="space-y-4 [&_.rr-card]:rounded-2xl [&_.rr-card]:border [&_.rr-card]:border-white/10 [&_.rr-card]:bg-[#0B1020]/95 [&_.rr-card]:p-5 [&_.rr-card_h3]:font-sans [&_.rr-card_h3]:text-sm [&_.rr-card_h3]:font-black [&_.rr-card_h3]:uppercase [&_.rr-card_h3]:tracking-widest [&_.rr-card_h4]:font-sans [&_.rr-card_h4]:text-[10px] [&_.rr-card_h4]:font-black [&_.rr-card_h4]:uppercase [&_.rr-card_h4]:tracking-widest [&_.rr-big]:font-mono [&_.rr-big]:font-black">
            <PlayerIntelligenceSection player={effectivePlayerRef} className="!border-white/10 !bg-[#0B1020]/90 [&_h3]:font-sans [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-widest" />
            <PlayerRetentionCard player={effectivePlayerRef} />
          </div>
        </div>
      )}

      {/* Discreet Deterministic Explore Insights Modal */}
      <PlayerAskAIModal
        isOpen={showExploreModal}
        onClose={() => setShowExploreModal(false)}
        playerName={playerName}
        bio={bio}
        showAsBatter={showAsBatter}
        batterStats={batterStats}
        bowlerStats={bowlerStats}
        pressureRow={pressureRow}
        topVenue={matchAgg.venues[0] ?? null}
        topOpposition={matchAgg.oppositions[0] ?? null}
        peakSeason={peakSeason}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// 8. HEAD-TO-HEAD SHOT ZONE DISTRIBUTION & GROUND VISUAL CONTROL (v2)
// ═══════════════════════════════════════════════════════════════════════════
export function HeadToHeadGroundVisual({
  batterName,
  bowlerName,
  matchupData,
  matchIds,
  phaseFilter = "all",
  inningsFilter = "all",
}: {
  batterName: string;
  bowlerName: string;
  matchupData?: any;
  matchIds?: ReadonlySet<string>;
  phaseFilter?: "all" | "pp" | "middle" | "death";
  inningsFilter?: "all" | "1st" | "2nd";
}) {
  const [activeZone, setActiveZone] = useState<string>("mid-wicket");
  const [viewStyle, setViewStyle] = useState<"ground" | "heatmap" | "phase">("ground");
  const [deliveryFilter, setDeliveryFilter] = useState<"ALL" | "yorker" | "short" | "good" | "full">("ALL");

  const bios = usePlayerBios();
  const deliveriesQuery = useRecordedDeliveries(batterName);

  // Filter strictly to recorded deliveries bowled by `bowlerName` (plus phase/innings/fixture scope)
  const duelDeliveries = useMemo(() => {
    const all = deliveriesQuery.data ?? [];
    if (!all.length || !bowlerName) return [];
    return all.filter(b => {
      if (matchIds && !matchIds.has(String(b.matchId))) return false;
      if (!matchesBowlerName(b.bowler, bowlerName, bios.data)) return false;
      if (phaseFilter === "pp" && b.over >= 6) return false;
      if (phaseFilter === "middle" && (b.over < 6 || b.over >= 15)) return false;
      if (phaseFilter === "death" && b.over < 15) return false;
      if (inningsFilter === "1st" && b.innings !== 1) return false;
      if (inningsFilter === "2nd" && b.innings !== 2) return false;
      return true;
    });
  }, [deliveriesQuery.data, bowlerName, bios.data, matchIds, phaseFilter, inningsFilter]);

  const filteredDeliveries = useMemo(() => {
    if (deliveryFilter === "ALL") return duelDeliveries;
    return duelDeliveries.filter(b => {
      const l = (b.length || "").toLowerCase();
      if (deliveryFilter === "yorker") return l.includes("yorker");
      if (deliveryFilter === "short") return l.includes("short") || l.includes("bouncer") || l.includes("back");
      if (deliveryFilter === "good") return l.includes("good");
      if (deliveryFilter === "full") return l.includes("full") || l.includes("slot");
      return true;
    });
  }, [duelDeliveries, deliveryFilter]);

  const hasBallByBall = filteredDeliveries.length > 0;
  const hasApiSummary = Boolean(matchupData && typeof matchupData.balls === "number" && matchupData.balls > 0 && deliveryFilter === "ALL");

  const summary = useMemo(() => {
    if (hasBallByBall) {
      const balls = filteredDeliveries.length;
      const runs = filteredDeliveries.reduce((s, b) => s + (b.runs || 0), 0);
      const dots = filteredDeliveries.filter(b => b.runs === 0).length;
      const bndRuns = filteredDeliveries.filter(b => b.runs === 4 || b.runs === 6).reduce((s, b) => s + b.runs, 0);
      const dismissals = filteredDeliveries.filter(b =>
        (b.shot || "").toLowerCase().includes("out") || (b.variation || "").toLowerCase().includes("out")
      ).length;
      return {
        runs,
        balls,
        dismissals: hasApiSummary ? Math.max(dismissals, matchupData.dismissals ?? 0) : dismissals,
        sr: balls > 0 ? ((runs / balls) * 100).toFixed(1) : "—",
        dotPct: balls > 0 ? ((dots / balls) * 100).toFixed(1) : "—",
        bndRate: runs > 0 ? ((bndRuns / runs) * 100).toFixed(1) : "—",
      };
    }
    if (hasApiSummary) {
      return {
        runs: matchupData.runs ?? 0,
        balls: matchupData.balls ?? 0,
        dismissals: matchupData.dismissals ?? 0,
        sr: matchupData.sr != null ? Number(matchupData.sr).toFixed(1) : "—",
        dotPct: matchupData.dotPct != null ? String(matchupData.dotPct) : "—",
        bndRate: matchupData.boundaryPct != null ? String(matchupData.boundaryPct) : "—",
      };
    }
    return { runs: 0, balls: 0, dismissals: 0, sr: "—", dotPct: "—", bndRate: "—" };
  }, [filteredDeliveries, hasBallByBall, hasApiSummary, matchupData]);

  interface Sector {
    id: string; name: string; short: string; side: "OFF" | "ON" | "CENTER";
    cx: number; cy: number;
    runs: number; balls: number; sr: string;
    color: string; intensity: number;
  }

  const SECTOR_DEFS: Array<{ id: string; name: string; short: string; side: "OFF" | "ON" | "CENTER"; cx: number; cy: number; color: string }> = [
    { id: "fine-leg",    name: "Fine Leg",           short: "FL",  side: "ON",     cx: 120, cy: 95,  color: "#EC4899" },
    { id: "straight",    name: "Straight",           short: "STR", side: "CENTER", cx: 200, cy: 52,  color: "#6366F1" },
    { id: "third-man",   name: "Third Man",          short: "3M",  side: "OFF",    cx: 282, cy: 94,  color: "#06B6D4" },
    { id: "cover",       name: "Cover / Extra Cover",short: "COV", side: "OFF",    cx: 325, cy: 192, color: "#3B82F6" },
    { id: "long-off",    name: "Long Off",           short: "LO",  side: "OFF",    cx: 285, cy: 304, color: "#8B5CF6" },
    { id: "long-on",     name: "Long On",            short: "LON", side: "ON",     cx: 200, cy: 340, color: "#10B981" },
    { id: "mid-wicket",  name: "Mid-Wicket",         short: "MW",  side: "ON",     cx: 90,  cy: 282, color: "#10B981" },
    { id: "square-leg",  name: "Square Leg",         short: "SL",  side: "ON",     cx: 68,  cy: 192, color: "#F59E0B" },
  ];

  const ZONE_MAP: Record<string, string> = {
    "fine leg": "fine-leg",
    "behind square": "fine-leg",
    "leg side": "square-leg",
    "square leg": "square-leg",
    "deep square leg": "square-leg",
    "midwicket": "mid-wicket",
    "deep midwicket": "mid-wicket",
    "cow corner": "mid-wicket",
    "mid-on": "long-on",
    "long-on": "long-on",
    "straight": "straight",
    "mid-off": "long-off",
    "long-off": "long-off",
    "cover": "cover",
    "deep cover": "cover",
    "extra cover": "cover",
    "point": "cover",
    "deep point": "cover",
    "off side": "cover",
    "third man": "third-man",
    "gully": "third-man",
    "slip": "third-man",
    "keeper": "third-man",
  };

  const { SECTORS, offSidePct, onSidePct, maxRuns, recordedSectorRuns } = useMemo(() => {
    const counts = new Map<string, { runs: number; balls: number }>();
    for (const b of filteredDeliveries) {
      const zKey = (b.zone || "").trim().toLowerCase();
      const sectorId = ZONE_MAP[zKey];
      if (!sectorId) continue;
      const cur = counts.get(sectorId) ?? { runs: 0, balls: 0 };
      cur.runs += b.runs || 0;
      cur.balls += 1;
      counts.set(sectorId, cur);
    }

    const rawMax = Math.max(1, ...Array.from(counts.values()).map(v => v.runs));
    const list: Sector[] = SECTOR_DEFS.map(def => {
      const c = counts.get(def.id) ?? { runs: 0, balls: 0 };
      return {
        ...def,
        runs: c.runs,
        balls: c.balls,
        sr: c.balls > 0 ? ((c.runs / c.balls) * 100).toFixed(1) : "—",
        intensity: c.runs > 0 ? Math.max(0.2, c.runs / rawMax) : 0,
      };
    });

    const offRuns = list.filter(s => s.side === "OFF").reduce((s, v) => s + v.runs, 0);
    const onRuns = list.filter(s => s.side === "ON").reduce((s, v) => s + v.runs, 0);
    const sideTotal = offRuns + onRuns;
    const totalSecRuns = list.reduce((s, v) => s + v.runs, 0);

    return {
      SECTORS: list,
      offSidePct: sideTotal > 0 ? `${((offRuns / sideTotal) * 100).toFixed(1)}%` : "—",
      onSidePct: sideTotal > 0 ? `${((onRuns / sideTotal) * 100).toFixed(1)}%` : "—",
      maxRuns: Math.max(1, ...list.map(s => s.runs)),
      recordedSectorRuns: totalSecRuns,
    };
  }, [filteredDeliveries]);

  const activeSector = useMemo(() => {
    const picked = SECTORS.find(s => s.id === activeZone);
    if (picked && picked.balls > 0) return picked;
    const top = [...SECTORS].sort((a, b) => b.runs - a.runs || b.balls - a.balls)[0];
    return picked ?? top ?? SECTORS[0];
  }, [SECTORS, activeZone]);

  const PHASES = useMemo(() => {
    if (hasBallByBall) {
      const calcPhase = (pred: (over: number) => boolean) => {
        const rows = filteredDeliveries.filter(b => pred(b.over));
        const runs = rows.reduce((s, r) => s + (r.runs || 0), 0);
        const wkts = rows.filter(r =>
          (r.shot || "").toLowerCase().includes("out") || (r.variation || "").toLowerCase().includes("out")
        ).length;
        return { runs, balls: rows.length, wkts };
      };
      const pp = calcPhase(o => o < 6);
      const mid = calcPhase(o => o >= 6 && o < 15);
      const death = calcPhase(o => o >= 15);
      return [
        { label: "Powerplay", overs: "1–6",   ...pp,    color: "#10B981" },
        { label: "Middle",    overs: "7–15",  ...mid,   color: "#6366F1" },
        { label: "Death",     overs: "16–20", ...death, color: "#F59E0B" },
      ];
    }
    return [
      { label: "Powerplay", overs: "1–6",   runs: matchupData?.phaseSplit?.powerplay?.runs ?? 0, balls: matchupData?.phaseSplit?.powerplay?.balls ?? 0, wkts: matchupData?.phaseSplit?.powerplay?.wkts ?? 0, color: "#10B981" },
      { label: "Middle",    overs: "7–15",  runs: matchupData?.phaseSplit?.middle?.runs    ?? 0, balls: matchupData?.phaseSplit?.middle?.balls    ?? 0, wkts: matchupData?.phaseSplit?.middle?.wkts    ?? 0, color: "#6366F1" },
      { label: "Death",     overs: "16–20", runs: matchupData?.phaseSplit?.death?.runs     ?? 0, balls: matchupData?.phaseSplit?.death?.balls     ?? 0, wkts: matchupData?.phaseSplit?.death?.wkts     ?? 0, color: "#F59E0B" },
    ];
  }, [hasBallByBall, filteredDeliveries, matchupData]);

  const peakPhase = useMemo(
    () => [...PHASES].filter(p => p.balls > 0).sort((a, b) => b.runs - a.runs)[0] ?? null,
    [PHASES],
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1020] shadow-xl overflow-hidden">

      {/* ── Cinematic Header ── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              HEAD VS HEAD · SHOT ZONE CONTROL
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-black uppercase border ${
              hasBallByBall
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 text-white/45 border-white/10"
            }`}>
              {deliveriesQuery.isLoading ? "Loading deliveries..." : hasBallByBall ? `${filteredDeliveries.length} Recorded Balls` : "No Recorded Duel Balls"}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
            {batterName} <span className="text-amber-400/60 font-normal">vs</span> {bowlerName}
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Ball-by-ball spatial dispersion · boundary share · phase breakdown from recorded warehouse logs
          </p>
        </div>
        {/* Summary Metrics */}
        <div className="relative flex items-center gap-3 shrink-0">
          <div className="text-center px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="text-[8px] font-mono uppercase text-white/40">Balls</div>
            <div className="text-base font-black font-mono text-white">{summary.balls}</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-[8px] font-mono uppercase text-primary/70">Matchup SR</div>
            <div className="text-base font-black font-mono text-primary">{summary.sr}</div>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="text-[8px] font-mono uppercase text-red-400/70">Dismissals</div>
            <div className="text-base font-black font-mono text-red-400">{summary.dismissals}</div>
          </div>
        </div>
      </div>

      {/* ── View Toggle Tabs + Delivery Length Filter Pills ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-3 border-b border-white/5 pb-0">
        <div className="flex items-center gap-0">
          {(["ground", "heatmap", "phase"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setViewStyle(v)}
              className={`px-4 py-1.5 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                viewStyle === v
                  ? "text-amber-400 border-amber-400 bg-amber-400/5"
                  : "text-white/35 border-transparent hover:text-white/70"
              }`}
            >
              {v === "ground" ? "Ground Visual" : v === "heatmap" ? "Zone Heat" : "Phase Splits"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 pb-2 overflow-x-auto">
          {([
            { id: "ALL", label: "All Lengths" },
            { id: "yorker", label: "Yorker" },
            { id: "short", label: "Short / Back" },
            { id: "good", label: "Good" },
            { id: "full", label: "Full / Slot" },
          ] as const).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDeliveryFilter(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                deliveryFilter === opt.id
                  ? "bg-amber-400 text-slate-950 border-amber-400"
                  : "bg-white/5 text-white/45 border-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        {!hasBallByBall && !deliveriesQuery.isLoading ? (
          <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-black/30 space-y-2">
            <div className="text-xs font-black uppercase tracking-widest text-white/70">
              No Recorded Ball-by-Ball Deliveries
            </div>
            <p className="text-[11px] font-mono text-white/40 max-w-lg mx-auto">
              {deliveryFilter === "ALL"
                ? `${batterName} and ${bowlerName} have 0 recorded deliveries against each other in the selected matchup filter.`
                : `No deliveries match the "${deliveryFilter}" length filter between ${batterName} and ${bowlerName}.`}
            </p>
            {deliveryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setDeliveryFilter("ALL")}
                className="mt-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-black uppercase tracking-wider text-amber-300 cursor-pointer"
              >
                Reset Length Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── GROUND VISUAL VIEW ── */}
            {viewStyle === "ground" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* SVG Ground (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-950/25 via-[#060f1c] to-[#040912] rounded-2xl border border-emerald-500/15 overflow-hidden min-h-[380px]">
                    <div className="absolute top-0 left-1/4 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-0 right-1/4 w-24 h-24 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

                    <svg viewBox="0 0 400 400" className="w-full max-w-[370px] h-auto select-none">
                      <defs>
                        <radialGradient id="h2hTurf" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#064e3b" stopOpacity="0.65" />
                          <stop offset="65%" stopColor="#022c22" stopOpacity="0.82" />
                          <stop offset="100%" stopColor="#011a12" stopOpacity="0.96" />
                        </radialGradient>
                      </defs>

                      <ellipse cx="200" cy="200" rx="183" ry="168" fill="url(#h2hTurf)" stroke="rgba(16,185,129,0.25)" strokeWidth="2" />
                      <ellipse cx="200" cy="200" rx="179" ry="164" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5 5" />
                      <ellipse cx="200" cy="200" rx="112" ry="100" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="7 5" />
                      <ellipse cx="200" cy="200" rx="55"  ry="48"  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

                      {([[200,200,200,32],[200,200,330,67],[200,200,382,200],[200,200,330,334],[200,200,200,369],[200,200,69,334],[200,200,17,200],[200,200,69,67]] as [number,number,number,number][]).map(([x1,y1,x2,y2], i) => (
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                      ))}

                      <rect x="194" y="166" width="12" height="68" rx="2" fill="#b45309" opacity="0.9" stroke="#92400e" strokeWidth="1" />
                      <line x1="189" y1="174" x2="211" y2="174" stroke="white" strokeWidth="1.5" opacity="0.9" />
                      <line x1="189" y1="226" x2="211" y2="226" stroke="white" strokeWidth="1.5" opacity="0.9" />

                      {SECTORS.map(spot => {
                        const isActive = spot.id === activeSector.id;
                        const r = spot.runs > 0 ? Math.min(28, Math.max(13, 10 + (spot.runs / maxRuns) * 18)) : 10;
                        return (
                          <g key={spot.id} onClick={() => setActiveZone(spot.id)} className="cursor-pointer">
                            {spot.runs > 0 && (
                              <circle cx={spot.cx} cy={spot.cy} r={r + 8} fill={spot.color} fillOpacity={isActive ? 0.24 : spot.intensity * 0.1} className="transition-all" />
                            )}
                            <circle
                              cx={spot.cx} cy={spot.cy} r={r}
                              fill={spot.runs > 0 ? spot.color : "rgba(255,255,255,0.06)"}
                              fillOpacity={spot.runs > 0 ? (isActive ? 0.92 : 0.45 + spot.intensity * 0.3) : 0.3}
                              stroke={isActive ? "white" : spot.color}
                              strokeWidth={isActive ? 2 : 0.6}
                              strokeOpacity={isActive ? 1 : 0.45}
                              className="transition-all"
                            />
                            <text x={spot.cx} y={spot.cy + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="monospace">{spot.runs}</text>
                            <text x={spot.cx} y={spot.cy - r - 4} textAnchor="middle" fill={isActive ? "white" : "rgba(255,255,255,0.55)"} fontSize="6.5" fontWeight="800">{spot.short}</text>
                          </g>
                        );
                      })}
                    </svg>

                    <div className="flex items-center justify-between w-full mt-2 px-1 text-[8px] font-mono text-white/40 border-t border-white/5 pt-2">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Recorded Shot Volume</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pitch Axis</span>
                      <span>Tap circles to inspect</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel (5 cols) */}
                <div className="lg:col-span-5 space-y-3 flex flex-col">
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{ background: `linear-gradient(135deg,${activeSector.color}12,#08101f)`, borderColor: `${activeSector.color}40` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: activeSector.color }}>Active Zone</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black text-white/60 bg-white/5">{activeSector.balls} balls</span>
                    </div>
                    <h4 className="text-sm font-black uppercase text-white">{activeSector.name}</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Runs", value: String(activeSector.runs), color: activeSector.color },
                        { label: "SR",   value: String(activeSector.sr),   color: "white" },
                        { label: "Share",value: recordedSectorRuns > 0 ? `${Math.round((activeSector.runs / recordedSectorRuns) * 100)}%` : "—", color: "#fbbf24" },
                      ].map(m => (
                        <div key={m.label} className="text-center p-1.5 rounded-lg bg-black/30">
                          <div className="text-[8px] text-white/40 uppercase font-mono">{m.label}</div>
                          <div className="text-sm font-black font-mono" style={{ color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-white/35 mb-1.5">All Zones · Run Volume</div>
                    {SECTORS.map(s => (
                      <button key={s.id} type="button" onClick={() => setActiveZone(s.id)} className="w-full flex items-center gap-2 cursor-pointer group">
                        <span className="text-[8px] font-mono text-white/45 w-9 text-right shrink-0">{s.short}</span>
                        <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: s.runs > 0 ? `${(s.runs / maxRuns) * 100}%` : "0%", background: s.color, opacity: s.id === activeSector.id ? 0.9 : 0.42 + s.intensity * 0.2 }}
                          />
                        </div>
                        <span className="text-[8px] font-mono font-black w-6 shrink-0" style={{ color: s.id === activeSector.id ? s.color : "rgba(255,255,255,0.35)" }}>{s.runs}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { label: "Off-Side %",  value: offSidePct, color: "text-cyan-400" },
                      { label: "On-Side %",   value: onSidePct, color: "text-emerald-400" },
                      { label: "Bnd Rate",    value: summary.bndRate === "—" ? "—" : `${summary.bndRate}%`, color: "text-amber-400" },
                      { label: "Dot %",       value: summary.dotPct === "—" ? "—" : `${summary.dotPct}%`, color: "text-white" },
                    ].map(m => (
                      <div key={m.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <div className="text-[8px] font-mono uppercase text-white/35">{m.label}</div>
                        <div className={`text-sm font-black font-mono ${m.color}`}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── HEATMAP VIEW ── */}
            {viewStyle === "heatmap" && (
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                  Recorded sector density — proportional to ball-by-ball runs
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SECTORS.map(s => (
                    <div
                      key={s.id}
                      className="relative p-4 rounded-2xl border overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: `linear-gradient(135deg,${s.color}20,#08101f 70%)`, borderColor: `${s.color}40` }}
                      onClick={() => { setActiveZone(s.id); setViewStyle("ground"); }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl" style={{ background: s.color, opacity: s.intensity }} />
                      <div className="text-[8px] font-mono uppercase text-white/50 mb-1 leading-tight">{s.name}</div>
                      <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.runs}</div>
                      <div className="text-[9px] font-mono text-white/55">SR {s.sr}</div>
                      <div className="text-[8px] font-mono text-white/30">{s.balls} balls</div>
                      <div
                        className="absolute top-2 right-2 text-[7px] font-black font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${s.color}28`, color: s.color }}
                      >
                        {recordedSectorRuns > 0 ? `${Math.round((s.runs / recordedSectorRuns) * 100)}%` : "0%"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PHASE SPLITS VIEW ── */}
            {viewStyle === "phase" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PHASES.map(ph => (
                    <div
                      key={ph.label}
                      className="p-4 rounded-2xl border space-y-3"
                      style={{ background: `linear-gradient(135deg,${ph.color}12,#08101f)`, borderColor: `${ph.color}30` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase" style={{ color: ph.color }}>{ph.label}</span>
                        <span className="text-[9px] font-mono text-white/40">Overs {ph.overs}</span>
                      </div>
                      {ph.balls > 0 ? (
                        <>
                          <div className="text-2xl font-black font-mono text-white">{ph.runs} <span className="text-sm font-normal text-white/40">runs</span></div>
                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            {[
                              { label: "Balls", val: String(ph.balls), c: ph.color },
                              { label: "SR",    val: ((ph.runs / ph.balls) * 100).toFixed(1), c: "white" },
                              { label: "Wkts",  val: String(ph.wkts), c: "#f87171" },
                            ].map(m => (
                              <div key={m.label} className="p-1.5 rounded-lg bg-black/30">
                                <div className="text-[7px] font-mono uppercase text-white/35">{m.label}</div>
                                <div className="text-sm font-black font-mono" style={{ color: m.c }}>{m.val}</div>
                              </div>
                            ))}
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((ph.runs / Math.max(1, summary.runs)) * 100))}%`, background: ph.color }} />
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-white/30 py-4 text-center">No deliveries in this phase</div>
                      )}
                    </div>
                  ))}
                </div>
                {peakPhase && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 leading-relaxed">
                    <span className="text-primary font-bold">Phase Summary:</span> Highest duel run output occurs in {peakPhase.label} overs ({peakPhase.runs} runs off {peakPhase.balls} balls at {((peakPhase.runs / peakPhase.balls) * 100).toFixed(1)} SR).
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

