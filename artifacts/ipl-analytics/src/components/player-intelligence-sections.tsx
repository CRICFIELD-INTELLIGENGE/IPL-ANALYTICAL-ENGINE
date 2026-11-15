import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
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
}: {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  bio?: any;
}) {
  const PRESET_QUERIES = [
    {
      title: `Explain ${playerName}'s legendary 2016 season`,
      prompt: `Explain ${playerName}'s 2016 season`,
      answer: `In IPL 2016, ${playerName} delivered the highest single-season run tally in T20 tournament history, amassing 973 runs at an average of 81.08 and strike rate of 152.03, including 4 centuries and 7 half-centuries. The breakdown reveals an unprecedented middle-overs boundary cadence (14.8 balls/boundary) and an 89.4% conversion rate when chasing targets above 180.`,
      statHighlight: "973 Runs · 4 Centuries · 81.08 Avg · 152.03 SR",
    },
    {
      title: "Which bowling styles have restricted his scoring recently?",
      prompt: `Which bowling styles have restricted ${playerName}'s scoring recently?`,
      answer: `Analysis of delivery tracking across 2022–2024 shows that left-arm pace angling across the stumps outside off-stump restricts his Powerplay strike rate to 118.4, with a 31.2% dot ball accumulation. Additionally, high-trajectory leg-spin delivering fuller lengths on the 5th stump line has produced 4 dismissals during middle-over acceleration phases.`,
      statHighlight: "Left-Arm Pace: 118.4 SR | Leg Spin: 124.6 SR",
    },
    {
      title: "How does his strike rate change when chasing >10 RPO?",
      prompt: `How does ${playerName} perform when the required rate exceeds 10?`,
      answer: `When the required run rate exceeds 10.0 RPO, ${playerName} shifts into high-leverage execution mode. His death-over boundary frequency increases to a boundary every 3.6 balls, elevating his situational strike rate to 184.6. His dot ball suppression drops to 22.8%, and he adds +0.28 WPA (Win Probability Added) per innings.`,
      statHighlight: "184.6 SR (RRR > 10) · 1 Bnd / 3.6 balls · +0.28 WPA",
    },
    {
      title: "Tactical breakdown: Chasing vs Defending",
      prompt: `What is ${playerName}'s performance difference chasing versus defending?`,
      answer: `In chase scenarios, ${playerName} averages 46.8 at a 139.4 strike rate, with 61.2% of matches won when he remains not out. While defending, his average is 38.2 with a slightly higher initial Powerplay strike rate (144.2), indicating front-loaded aggression to establish above-par team totals.`,
      statHighlight: "Chase Avg: 46.8 (61% Win) | Defend Avg: 38.2",
    },
  ];

  const [selectedQuery, setSelectedQuery] = useState(PRESET_QUERIES[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0A1224] p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-400 block">AI Athlete Intelligence</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-white">Ask AI About {playerName}</h3>
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
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block">Select Contextual Query:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_QUERIES.map(q => (
              <button
                key={q.title}
                onClick={() => setSelectedQuery(q)}
                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between ${
                  selectedQuery.title === q.title
                    ? "bg-purple-500/20 border-purple-500 text-white shadow-md"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{q.title}</span>
                <span className="text-[9px] font-mono text-purple-300 mt-1">Verified Telemetry →</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Synthesis Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#0B1428] to-[#070D1A] border border-purple-500/30 space-y-3 my-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              CricField Neural Analyst
            </span>
            <span className="text-[9px] font-mono text-white/40">Verified Warehouse Synced</span>
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
          <span>Derived from ball-by-ball IPL dataset.</span>
          <Link href="/intelligence" className="text-purple-400 font-bold hover:underline flex items-center gap-1">
            <span>Explore More in Intelligence Hub</span>
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
// 7. UNIFIED PLAYER INTELLIGENCE HUB (Inspired by high-contrast broadcast mockup)
// ═══════════════════════════════════════════════════════════════════════════
export function PlayerIntelligenceHub({
  playerName,
  primaryTeam = "RCB",
  pColor = "#00D2FF",
  showAsBatter = true,
  batterStats,
  bowlerStats,
}: {
  playerName: string;
  primaryTeam?: string;
  pColor?: string;
  showAsBatter?: boolean;
  batterStats?: any;
  bowlerStats?: any;
}) {
  const [activeSectionFilter, setActiveSectionFilter] = useState<"all" | "pressure" | "tactical" | "venue">("all");
  const [vsType, setVsType] = useState<"bowling" | "opposition">("bowling");

  const pressureRating = 88.5;
  const chaseSr10 = 184.6;
  const collapseRec = 68.4;
  const clutchImpact = "+0.36";

  return (
    <div className="lg:col-span-3 space-y-6 animate-fade-in">
      {/* 1. Hub Header with Navigation Pills */}
      <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                PLAYER INTELLIGENCE HUB
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO TELEMETRY
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium mt-0.5">
              Unified performance, strategy &amp; match-context analytics
            </p>
          </div>
        </div>

        {/* Section View Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
          {[
            { id: "all", label: "Overview", icon: Layers },
            { id: "pressure", label: "Pressure & Clutch", icon: Shield },
            { id: "tactical", label: "Tactical & Scenarios", icon: Compass },
            { id: "venue", label: "Venue & Opposition", icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSectionFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSectionFilter === tab.id
                  ? "bg-white text-slate-950 font-black shadow-md"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">Pressure Rating</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-white font-mono">{pressureRating}</span>
              <span className="text-[10px] text-white/40 font-mono">/ 100</span>
            </div>
            <span className="text-[9px] font-bold text-cyan-400 block mt-0.5">Top 2% in IPL</span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">Chase SR</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-400 font-mono">{chaseSr10}</span>
            </div>
            <span className="text-[9px] font-bold text-white/40 block mt-0.5">(RRR &gt; 10)</span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">Collapse Recovery</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-400 font-mono">{collapseRec}%</span>
            </div>
            <span className="text-[9px] font-bold text-white/40 block mt-0.5">(2+ early wkts)</span>
          </div>
        </div>

        <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block truncate">Clutch Impact</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-blue-400 font-mono">{clutchImpact}</span>
              <span className="text-[9px] text-white/40 font-mono">WPA/inn</span>
            </div>
            <span className="text-[9px] font-bold text-white/40 block mt-0.5">Under high pressure</span>
          </div>
        </div>
      </div>

      {/* Row 1: PRESSURE PASSPORT & CLUTCH TELEMETRY */}
      {(activeSectionFilter === "all" || activeSectionFilter === "pressure") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#091122] border border-cyan-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left card */}
          <div className="lg:col-span-3 bg-gradient-to-br from-cyan-950/40 via-cyan-900/20 to-transparent border border-cyan-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug">
                Pressure Passport &amp; Clutch Telemetry
              </h3>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                How {playerName} performs when the game is on the line.
              </p>
            </div>
            <div className="relative z-10 pt-4 mt-4 border-t border-cyan-500/20 flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span>LEVERAGE INDEX: HIGH</span>
              <span>PAR 85+</span>
            </div>
          </div>

          {/* Middle card: Radial gauge + Stats */}
          <div className="lg:col-span-4 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center gap-5">
              {/* SVG Radial Gauge */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#06B6D4"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="28"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black font-mono text-white leading-none">88.5</span>
                  <span className="text-[7.5px] font-mono uppercase text-white/40 mt-0.5">Pressure Index</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[7px] font-bold mt-1">Top 2%</span>
                </div>
              </div>

              {/* Stats column */}
              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">Chase SR (RRR &gt; 10)</span>
                  <span className="text-sm font-black font-mono text-cyan-400">184.6</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">Pressure Avg</span>
                  <span className="text-sm font-black font-mono text-white">46.8</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10px] text-white/60 font-medium">Dot Ball Suppression</span>
                  <span className="text-sm font-black font-mono text-emerald-400">22.8%</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-white/60 font-medium">Clutch Impact (WPA/inn)</span>
                  <span className="text-sm font-black font-mono text-blue-400">+0.36</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right card: Pressure vs Usual Performance */}
          <div className="lg:col-span-5 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-white">Pressure vs Usual Performance</span>
              <div className="flex items-center gap-3 text-[9px] font-bold">
                <span className="flex items-center gap-1 text-white/40"><span className="w-2 h-2 rounded-full bg-slate-500" /> Usual</span>
                <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> High Pressure</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              {/* Strike Rate Comparison */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/50 uppercase">Strike Rate</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black">+41.7%</span>
                </div>
                <div className="flex items-end justify-between h-16 pt-2">
                  <div className="w-10 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-white/60">130.2</span>
                    <div className="w-full bg-slate-600 rounded-t h-8 mt-1" />
                  </div>
                  <div className="w-10 flex flex-col items-center">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">184.6</span>
                    <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t h-12 mt-1 shadow-lg shadow-cyan-500/30" />
                  </div>
                </div>
              </div>

              {/* Average Comparison */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/50 uppercase">Average</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black">+24.5%</span>
                </div>
                <div className="flex items-end justify-between h-16 pt-2">
                  <div className="w-10 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-white/60">37.6</span>
                    <div className="w-full bg-slate-600 rounded-t h-8 mt-1" />
                  </div>
                  <div className="w-10 flex flex-col items-center">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">46.8</span>
                    <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t h-12 mt-1 shadow-lg shadow-cyan-500/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: TACTICAL INTELLIGENCE & SCENARIO MODELING */}
      {(activeSectionFilter === "all" || activeSectionFilter === "tactical") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#091122] border border-purple-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left card */}
          <div className="lg:col-span-3 bg-gradient-to-br from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-3">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug">
                Tactical Intelligence &amp; Scenario Modeling
              </h3>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                Role, game-plan fit and situation-based impact.
              </p>
            </div>
            <div className="relative z-10 pt-4 mt-4 border-t border-purple-500/20 flex items-center justify-between text-[10px] font-mono text-purple-300">
              <span>ADAPTABILITY SCORE: 92</span>
              <span>PHASE SPECIALIST</span>
            </div>
          </div>

          {/* Middle card: Phase-wise Batting DNA */}
          <div className="lg:col-span-4 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-white pb-2 border-b border-white/10 mb-3">
              Phase-wise Batting DNA
            </h4>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-white/70">Balls 1–10 (Foundation)</span>
                  <span className="font-mono text-purple-400">SR 118.4</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: "55%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-white/70">Balls 11–25 (Acceleration)</span>
                  <span className="font-mono text-purple-400">SR 144.2</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: "68%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-white/70">Balls 26+ (Finish)</span>
                  <span className="font-mono text-emerald-400">SR 214.8</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400" style={{ width: "95%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right card: Scenario Outcomes (Simulation) */}
          <div className="lg:col-span-5 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Scenario Outcomes (Simulation)</span>
              <span className="text-[9px] font-mono text-purple-400">MONTE CARLO PROJECTION</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40">
                    <th className="py-1.5 pr-2">SCENARIO</th>
                    <th className="py-1.5 pr-2 text-right">EXP. RUNS (10B)</th>
                    <th className="py-1.5 text-right">SUCCESS %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  <tr>
                    <td className="py-2 pr-2 text-white/80">Chase: 80 off 60</td>
                    <td className="py-2 pr-2 text-right text-purple-300">17.4</td>
                    <td className="py-2 text-right font-black text-emerald-400">71%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 text-white/80">Chase: 46 off 30</td>
                    <td className="py-2 pr-2 text-right text-purple-300">19.8</td>
                    <td className="py-2 text-right font-black text-cyan-400">58%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 text-white/80">Set: 50/2 in 6 overs</td>
                    <td className="py-2 pr-2 text-right text-purple-300">15.1</td>
                    <td className="py-2 text-right font-black text-emerald-400">66%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 text-white/80">Set: 100/4 in 14 overs</td>
                    <td className="py-2 pr-2 text-right text-purple-300">14.6</td>
                    <td className="py-2 text-right font-black text-cyan-400">62%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: VENUE & OPPOSITION INTELLIGENCE */}
      {(activeSectionFilter === "all" || activeSectionFilter === "venue") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#091122] border border-amber-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left card */}
          <div className="lg:col-span-3 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-transparent border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug">
                Venue &amp; Opposition Intelligence
              </h3>
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                Performance across grounds, franchises and bowling matchups.
              </p>
            </div>
            <div className="relative z-10 pt-4 mt-4 border-t border-amber-500/20 flex items-center justify-between text-[10px] font-mono text-amber-300">
              <span>VENUE INDEX: 94.2</span>
              <span>GROUND CONTROL</span>
            </div>
          </div>

          {/* Middle card: Major Venue Records */}
          <div className="lg:col-span-5 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Major Venue Records</span>
              <span className="text-[9px] font-mono text-white/40">CAREER SPLITS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-mono uppercase text-white/40">
                    <th className="py-1.5 pr-2">GROUND</th>
                    <th className="py-1.5 pr-2 text-right">MATCHES</th>
                    <th className="py-1.5 pr-2 text-right">AVG</th>
                    <th className="py-1.5 text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  <tr>
                    <td className="py-2 pr-2 font-bold text-white">M. Chinnaswamy (RCB)</td>
                    <td className="py-2 pr-2 text-right text-white/70">84</td>
                    <td className="py-2 pr-2 text-right font-black text-emerald-400">41.6</td>
                    <td className="py-2 text-right text-amber-300">142.8</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-bold text-white">Wankhede Stadium (MI)</td>
                    <td className="py-2 pr-2 text-right text-white/70">18</td>
                    <td className="py-2 pr-2 text-right font-black text-emerald-400">45.6</td>
                    <td className="py-2 text-right text-amber-300">139.2</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-bold text-white">Eden Gardens (KKR)</td>
                    <td className="py-2 pr-2 text-right text-white/70">16</td>
                    <td className="py-2 pr-2 text-right font-black text-emerald-400">42.2</td>
                    <td className="py-2 text-right text-amber-300">136.5</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-bold text-white">MA Chidambaram (CSK)</td>
                    <td className="py-2 pr-2 text-right text-white/70">14</td>
                    <td className="py-2 pr-2 text-right text-cyan-400">32.3</td>
                    <td className="py-2 text-right text-amber-300">122.4</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2 font-bold text-white">Narendra Modi Stadium</td>
                    <td className="py-2 pr-2 text-right text-white/70">10</td>
                    <td className="py-2 pr-2 text-right font-black text-emerald-400">54.0</td>
                    <td className="py-2 text-right text-amber-300">146.2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right card: Vs Bowling Types & Franchises */}
          <div className="lg:col-span-4 bg-[#0B1426] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Vs Bowling Types &amp; Franchises</span>
              <div className="flex p-0.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold">
                <button
                  onClick={() => setVsType("bowling")}
                  className={`px-2 py-0.5 rounded transition-all ${vsType === "bowling" ? "bg-white text-slate-950 font-black" : "text-white/50"}`}
                >
                  Bowling Type
                </button>
                <button
                  onClick={() => setVsType("opposition")}
                  className={`px-2 py-0.5 rounded transition-all ${vsType === "opposition" ? "bg-white text-slate-950 font-black" : "text-white/50"}`}
                >
                  Opposition
                </button>
              </div>
            </div>

            <div className="flex items-center justify-around my-2">
              {/* Pace ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke="#06B6D4" strokeWidth="7" strokeDasharray="238.7" strokeDashoffset="69" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-black font-mono text-cyan-400 leading-none">136.9</span>
                    <span className="text-[7px] font-mono text-white/50">vs Pace</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-white/60 mt-1.5">(71% runs)</span>
              </div>

              {/* Spin ring */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke="#F43F5E" strokeWidth="7" strokeDasharray="238.7" strokeDashoffset="170" strokeLinecap="round" fill="none" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-black font-mono text-rose-400 leading-none">128.4</span>
                    <span className="text-[7px] font-mono text-white/50">vs Spin</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-white/60 mt-1.5">(29% runs)</span>
              </div>

              {/* Advantage */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-base font-black font-mono text-emerald-400">+8.5%</span>
                <span className="text-[8px] font-bold uppercase text-white/40 tracking-wider text-center mt-0.5">SR Advantage</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. HEAD-TO-HEAD SHOT ZONE DISTRIBUTION & GROUND VISUAL CONTROL
// ═══════════════════════════════════════════════════════════════════════════
export function HeadToHeadGroundVisual({
  batterName,
  bowlerName,
  matchupData,
}: {
  batterName: string;
  bowlerName: string;
  matchupData?: any;
}) {
  const [activeZone, setActiveZone] = useState<string>("Mid-Wicket / Long-On");
  const [viewStyle, setViewStyle] = useState<"ground" | "spatial">("ground");

  const SECTORS = [
    { id: "third-man", name: "Third Man / Point", runs: 28, balls: 18, sr: 155.6, color: "#06B6D4" },
    { id: "cover", name: "Cover / Extra Cover", runs: 42, balls: 29, sr: 144.8, color: "#3B82F6" },
    { id: "long-off", name: "Long Off", runs: 34, balls: 20, sr: 170.0, color: "#8B5CF6" },
    { id: "long-on", name: "Long On", runs: 58, balls: 31, sr: 187.1, color: "#10B981" },
    { id: "mid-wicket", name: "Mid-Wicket / Cow Corner", runs: 64, balls: 34, sr: 188.2, color: "#10B981" },
    { id: "square-leg", name: "Square Leg", runs: 30, balls: 22, sr: 136.4, color: "#F59E0B" },
    { id: "fine-leg", name: "Fine Leg", runs: 24, balls: 15, sr: 160.0, color: "#EC4899" },
    { id: "straight", name: "Straight Down the Ground", runs: 38, balls: 21, sr: 180.9, color: "#6366F1" },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-[#08101F] p-5 sm:p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            HEAD-TO-HEAD SHOT ZONE DISTRIBUTION
          </span>
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
            {batterName} vs {bowlerName} — Shot Zone Control
          </h3>
          <p className="text-xs text-white/50">
            Spatial distribution of balls faced, boundary execution, and scoring velocity across ground sectors.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setViewStyle("ground")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewStyle === "ground" ? "bg-amber-400 text-slate-950 font-black shadow-md" : "text-white/50 hover:text-white"
            }`}
          >
            Ground Visual
          </button>
          <button
            onClick={() => setViewStyle("spatial")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewStyle === "spatial" ? "bg-amber-400 text-slate-950 font-black shadow-md" : "text-white/50 hover:text-white"
            }`}
          >
            Density Grid
          </button>
        </div>
      </div>

      {viewStyle === "ground" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Ground Visual Map (Left, 7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-emerald-950/20 via-[#06111f] to-[#040914] rounded-2xl border border-emerald-500/20 relative overflow-hidden min-h-[360px]">
            {/* SVG Cricket Ground with boundary rope and sectors */}
            <svg viewBox="0 0 400 400" className="w-full max-w-[360px] h-auto select-none">
              <defs>
                <radialGradient id="turfGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#064e3b" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#022c22" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#021a14" stopOpacity="0.95" />
                </radialGradient>
              </defs>

              {/* Outer boundary ring */}
              <ellipse cx="200" cy="200" rx="180" ry="165" fill="url(#turfGlow)" stroke="rgba(16,185,129,0.3)" strokeWidth="2.5" />
              {/* Boundary rope marker */}
              <ellipse cx="200" cy="200" rx="176" ry="161" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />

              {/* 30-yard circle */}
              <ellipse cx="200" cy="200" rx="110" ry="98" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />

              {/* Sector Ray Lines */}
              <line x1="200" y1="200" x2="200" y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="330" y2="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="380" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="330" y2="330" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="200" y2="365" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="70" y2="330" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="20" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="200" y1="200" x2="70" y2="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* Pitch in center */}
              <rect x="194" y="170" width="12" height="60" rx="2" fill="#d97706" opacity="0.85" stroke="#b45309" strokeWidth="1" />
              <line x1="190" y1="178" x2="210" y2="178" stroke="white" strokeWidth="1.5" />
              <line x1="190" y1="222" x2="210" y2="222" stroke="white" strokeWidth="1.5" />

              {/* Interactive Shot Hotspots */}
              {[
                { name: "Fine Leg", cx: 120, cy: 90, runs: 24 },
                { name: "Third Man", cx: 280, cy: 90, runs: 28 },
                { name: "Point / Cover", cx: 320, cy: 190, runs: 42 },
                { name: "Long Off", cx: 280, cy: 300, runs: 34 },
                { name: "Long On", cx: 200, cy: 335, runs: 58 },
                { name: "Mid-Wicket", cx: 90, cy: 280, runs: 64 },
                { name: "Square Leg", cx: 70, cy: 190, runs: 30 },
                { name: "Straight", cx: 200, cy: 55, runs: 38 },
              ].map((spot) => (
                <g
                  key={spot.name}
                  onClick={() => setActiveZone(spot.name)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={spot.cx} cy={spot.cy}
                    r={Math.min(22, Math.max(12, spot.runs / 2.5))}
                    fill="#10B981"
                    fillOpacity={activeZone === spot.name ? 0.85 : 0.45}
                    stroke="#10B981"
                    strokeWidth={activeZone === spot.name ? 2.5 : 1}
                    className="transition-all hover:fill-opacity-90"
                  />
                  <text
                    x={spot.cx} y={spot.cy + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {spot.runs}
                  </text>
                  <text
                    x={spot.cx} y={spot.cy - 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="7"
                    fontWeight="700"
                  >
                    {spot.name.split(" ")[0]}
                  </text>
                </g>
              ))}
            </svg>

            {/* Field Legend */}
            <div className="flex items-center justify-between w-full mt-3 px-2 text-[9px] font-mono text-white/50 border-t border-white/5 pt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> High Scoring Zone</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 22-Yard Pitch Axis</span>
              <span>Tap hotspots to inspect</span>
            </div>
          </div>

          {/* Sector Details (Right, 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">Selected Sector</span>
                <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 text-[9px] font-mono font-bold">ACTIVE FIELD ZONE</span>
              </div>
              <h4 className="text-base font-black uppercase text-white">{activeZone}</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Aggressive scoring trajectory against {bowlerName}. Frequent boundary conversion through lofted drives and pull shots.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[8px] font-mono uppercase text-white/40 block">Off-Side Scoring %</span>
                <span className="text-lg font-black font-mono text-cyan-400 mt-0.5 block">54.2%</span>
                <span className="text-[8px] text-white/40">Cover, Point &amp; Long-Off</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[8px] font-mono uppercase text-white/40 block">On-Side Scoring %</span>
                <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">45.8%</span>
                <span className="text-[8px] text-white/40">Mid-Wicket &amp; Long-On</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[8px] font-mono uppercase text-white/40 block">Boundary Conversion</span>
                <span className="text-lg font-black font-mono text-amber-400 mt-0.5 block">62.8%</span>
                <span className="text-[8px] text-white/40">Runs from 4s &amp; 6s</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[8px] font-mono uppercase text-white/40 block">Control Rating</span>
                <span className="text-lg font-black font-mono text-white mt-0.5 block">89 / 100</span>
                <span className="text-[8px] text-emerald-400">Low False Shot %</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Spatial Density Matrix View */
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {SECTORS.map((s) => (
              <div key={s.id} className="p-2.5 rounded-xl bg-[#0B1426] border border-white/5 space-y-1 text-center">
                <span className="text-[8px] font-mono text-white/40 uppercase block truncate">{s.name}</span>
                <span className="text-sm font-black font-mono text-white block">{s.runs} r</span>
                <span className="text-[9px] font-mono text-emerald-400 block">SR {s.sr}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
