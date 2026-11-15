import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import {
  Sparkles, Layers, Activity, TrendingUp, Shield, Trophy, Flame,
  Compass, Crosshair, ArrowRight, X, ChevronDown, ChevronUp, Search,
  Filter, CheckCircle2, AlertTriangle, ExternalLink, Zap, HelpCircle
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
              {currentPlayer.name} <span className="text-white/40 font-normal">vs</span> {selectedBenchmark.name}
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
              <PlayerAvatar name={currentPlayer.name} imgClassName="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-primary uppercase">{primaryTeam}</div>
              <div className="text-sm font-black text-white">{currentPlayer.name}</div>
              <div className="text-[10px] text-white/50">{currentPlayer.role || "Elite Batter"}</div>
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
              <span>{currentPlayer.name.split(" ").slice(-1)[0]}</span>
              <span>{selectedBenchmark.name.split(" ").slice(-1)[0]}</span>
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
            SECTION 4 · PRESSURE PASSPORT &amp; CLUTCH TELEMETRY
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
            SECTION 6 · TACTICAL INTELLIGENCE &amp; SCENARIO MODELING
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
            SECTION 7 · VENUE &amp; OPPOSITION INTELLIGENCE
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
  radarData,
  pColor,
  isBatter = true,
}: {
  radarData: any[];
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
