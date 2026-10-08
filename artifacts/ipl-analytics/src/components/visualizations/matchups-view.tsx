import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  Search, SlidersHorizontal, User, Target, Zap, TrendingUp, CircleDot,
  Shield, X, ChevronRight, Flame, Trophy, Activity, Filter, Layers, Award,
  ArrowRightLeft, Sparkles, Scale
} from "lucide-react";

export interface MatchupPairData {
  id: string;
  batter: string;
  batterTeam: string;
  bowler: string;
  bowlerTeam: string;
  dismissals: number;
  ballsFaced: number;
  runs: number;
  strikeRate: number;
  average: number;
  dotPct: number;
  bowlerEcon: number;
  dominanceScore: number; // Positive = Batter advantage, Negative = Bowler advantage
  dominanceFavors: "batter" | "bowler" | "even";
  phaseSplit: {
    powerplay: { balls: number; runs: number; dismissals: number; sr: number };
    middle: { balls: number; runs: number; dismissals: number; sr: number };
    death: { balls: number; runs: number; dismissals: number; sr: number };
  };
}

const MASTER_MATCHUPS_DATA: MatchupPairData[] = [
  {
    id: "vk-jb",
    batter: "Virat Kohli",
    batterTeam: "RCB",
    bowler: "Jasprit Bumrah",
    bowlerTeam: "MI",
    dismissals: 4,
    ballsFaced: 92,
    runs: 140,
    strikeRate: 152.1,
    average: 35.0,
    dotPct: 38.0,
    bowlerEcon: 9.13,
    dominanceScore: 15,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 32, runs: 48, dismissals: 1, sr: 150.0 },
      middle: { balls: 48, runs: 72, dismissals: 2, sr: 150.0 },
      death: { balls: 12, runs: 20, dismissals: 1, sr: 166.7 },
    }
  },
  {
    id: "vk-sn",
    batter: "Virat Kohli",
    batterTeam: "RCB",
    bowler: "Sunil Narine",
    bowlerTeam: "KKR",
    dismissals: 4,
    ballsFaced: 106,
    runs: 108,
    strikeRate: 101.9,
    average: 27.0,
    dotPct: 46.2,
    bowlerEcon: 6.11,
    dominanceScore: -65,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 18, runs: 22, dismissals: 0, sr: 122.2 },
      middle: { balls: 80, runs: 78, dismissals: 3, sr: 97.5 },
      death: { balls: 8, runs: 8, dismissals: 1, sr: 100.0 },
    }
  },
  {
    id: "vk-yc",
    batter: "Virat Kohli",
    batterTeam: "RCB",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 1,
    ballsFaced: 68,
    runs: 94,
    strikeRate: 138.2,
    average: 94.0,
    dotPct: 34.0,
    bowlerEcon: 8.29,
    dominanceScore: 45,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 10, runs: 14, dismissals: 0, sr: 140.0 },
      middle: { balls: 52, runs: 70, dismissals: 1, sr: 134.6 },
      death: { balls: 6, runs: 10, dismissals: 0, sr: 166.7 },
    }
  },
  {
    id: "msd-sn",
    batter: "MS Dhoni",
    batterTeam: "CSK",
    bowler: "Sunil Narine",
    bowlerTeam: "KKR",
    dismissals: 2,
    ballsFaced: 88,
    runs: 47,
    strikeRate: 53.4,
    average: 23.5,
    dotPct: 58.0,
    bowlerEcon: 3.20,
    dominanceScore: -85,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 0, runs: 0, dismissals: 0, sr: 0.0 },
      middle: { balls: 64, runs: 31, dismissals: 1, sr: 48.4 },
      death: { balls: 24, runs: 16, dismissals: 1, sr: 66.7 },
    }
  },
  {
    id: "msd-jb",
    batter: "MS Dhoni",
    batterTeam: "CSK",
    bowler: "Jasprit Bumrah",
    bowlerTeam: "MI",
    dismissals: 3,
    ballsFaced: 62,
    runs: 60,
    strikeRate: 96.8,
    average: 20.0,
    dotPct: 45.0,
    bowlerEcon: 5.80,
    dominanceScore: -50,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 0, runs: 0, dismissals: 0, sr: 0.0 },
      middle: { balls: 22, runs: 18, dismissals: 1, sr: 81.8 },
      death: { balls: 40, runs: 42, dismissals: 2, sr: 105.0 },
    }
  },
  {
    id: "msd-yc",
    batter: "MS Dhoni",
    batterTeam: "CSK",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 2,
    ballsFaced: 42,
    runs: 48,
    strikeRate: 114.3,
    average: 24.0,
    dotPct: 42.0,
    bowlerEcon: 6.85,
    dominanceScore: -35,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 0, runs: 0, dismissals: 0, sr: 0.0 },
      middle: { balls: 30, runs: 32, dismissals: 1, sr: 106.7 },
      death: { balls: 12, runs: 16, dismissals: 1, sr: 133.3 },
    }
  },
  {
    id: "rs-sn",
    batter: "Rohit Sharma",
    batterTeam: "MI",
    bowler: "Sunil Narine",
    bowlerTeam: "KKR",
    dismissals: 9,
    ballsFaced: 138,
    runs: 141,
    strikeRate: 102.2,
    average: 15.6,
    dotPct: 48.0,
    bowlerEcon: 6.13,
    dominanceScore: -90,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 30, runs: 34, dismissals: 2, sr: 113.3 },
      middle: { balls: 98, runs: 95, dismissals: 6, sr: 96.9 },
      death: { balls: 10, runs: 12, dismissals: 1, sr: 120.0 },
    }
  },
  {
    id: "rs-am",
    batter: "Rohit Sharma",
    batterTeam: "MI",
    bowler: "Amit Mishra",
    bowlerTeam: "DC",
    dismissals: 7,
    ballsFaced: 91,
    runs: 87,
    strikeRate: 95.6,
    average: 12.4,
    dotPct: 51.0,
    bowlerEcon: 5.73,
    dominanceScore: -85,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 20, runs: 24, dismissals: 1, sr: 120.0 },
      middle: { balls: 65, runs: 58, dismissals: 5, sr: 89.2 },
      death: { balls: 6, runs: 5, dismissals: 1, sr: 83.3 },
    }
  },
  {
    id: "rs-yc",
    batter: "Rohit Sharma",
    batterTeam: "MI",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 3,
    ballsFaced: 64,
    runs: 62,
    strikeRate: 96.8,
    average: 20.6,
    dotPct: 45.0,
    bowlerEcon: 5.81,
    dominanceScore: -55,
    dominanceFavors: "bowler",
    phaseSplit: {
      powerplay: { balls: 14, runs: 16, dismissals: 1, sr: 114.3 },
      middle: { balls: 44, runs: 40, dismissals: 2, sr: 90.9 },
      death: { balls: 6, runs: 6, dismissals: 0, sr: 100.0 },
    }
  },
  {
    id: "sky-rk",
    batter: "Suryakumar Yadav",
    batterTeam: "MI",
    bowler: "Rashid Khan",
    bowlerTeam: "GT",
    dismissals: 1,
    ballsFaced: 68,
    runs: 102,
    strikeRate: 150.0,
    average: 102.0,
    dotPct: 28.0,
    bowlerEcon: 9.00,
    dominanceScore: 75,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 12, runs: 18, dismissals: 0, sr: 150.0 },
      middle: { balls: 50, runs: 72, dismissals: 1, sr: 144.0 },
      death: { balls: 6, runs: 12, dismissals: 0, sr: 200.0 },
    }
  },
  {
    id: "sky-yc",
    batter: "Suryakumar Yadav",
    batterTeam: "MI",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 2,
    ballsFaced: 54,
    runs: 82,
    strikeRate: 151.8,
    average: 41.0,
    dotPct: 26.0,
    bowlerEcon: 9.11,
    dominanceScore: 50,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 8, runs: 12, dismissals: 0, sr: 150.0 },
      middle: { balls: 40, runs: 58, dismissals: 2, sr: 145.0 },
      death: { balls: 6, runs: 12, dismissals: 0, sr: 200.0 },
    }
  },
  {
    id: "klr-jb",
    batter: "KL Rahul",
    batterTeam: "LSG",
    bowler: "Jasprit Bumrah",
    bowlerTeam: "MI",
    dismissals: 2,
    ballsFaced: 112,
    runs: 151,
    strikeRate: 134.8,
    average: 75.5,
    dotPct: 36.0,
    bowlerEcon: 8.08,
    dominanceScore: 60,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 45, runs: 58, dismissals: 0, sr: 128.9 },
      middle: { balls: 52, runs: 71, dismissals: 1, sr: 136.5 },
      death: { balls: 15, runs: 22, dismissals: 1, sr: 146.7 },
    }
  },
  {
    id: "klr-yc",
    batter: "KL Rahul",
    batterTeam: "LSG",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 1,
    ballsFaced: 75,
    runs: 105,
    strikeRate: 140.0,
    average: 105.0,
    dotPct: 30.0,
    bowlerEcon: 8.40,
    dominanceScore: 65,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 15, runs: 22, dismissals: 0, sr: 146.7 },
      middle: { balls: 50, runs: 68, dismissals: 1, sr: 136.0 },
      death: { balls: 10, runs: 15, dismissals: 0, sr: 150.0 },
    }
  },
  {
    id: "th-hp",
    batter: "Travis Head",
    batterTeam: "SRH",
    bowler: "Harshal Patel",
    bowlerTeam: "PBKS",
    dismissals: 2,
    ballsFaced: 42,
    runs: 78,
    strikeRate: 185.7,
    average: 39.0,
    dotPct: 22.0,
    bowlerEcon: 11.14,
    dominanceScore: 80,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 24, runs: 48, dismissals: 1, sr: 200.0 },
      middle: { balls: 12, runs: 20, dismissals: 0, sr: 166.7 },
      death: { balls: 6, runs: 10, dismissals: 1, sr: 166.7 },
    }
  },
  {
    id: "th-yc",
    batter: "Travis Head",
    batterTeam: "SRH",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 1,
    ballsFaced: 36,
    runs: 68,
    strikeRate: 188.8,
    average: 68.0,
    dotPct: 20.0,
    bowlerEcon: 11.33,
    dominanceScore: 85,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 16, runs: 32, dismissals: 0, sr: 200.0 },
      middle: { balls: 14, runs: 26, dismissals: 1, sr: 185.7 },
      death: { balls: 6, runs: 10, dismissals: 0, sr: 166.7 },
    }
  },
  {
    id: "ab-hb",
    batter: "AB de Villiers",
    batterTeam: "RCB",
    bowler: "Harbhajan Singh",
    bowlerTeam: "CSK",
    dismissals: 4,
    ballsFaced: 104,
    runs: 145,
    strikeRate: 139.4,
    average: 36.25,
    dotPct: 32.0,
    bowlerEcon: 8.36,
    dominanceScore: 40,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 10, runs: 12, dismissals: 0, sr: 120.0 },
      middle: { balls: 80, runs: 115, dismissals: 3, sr: 143.8 },
      death: { balls: 14, runs: 18, dismissals: 1, sr: 128.6 },
    }
  },
  {
    id: "ab-yc",
    batter: "AB de Villiers",
    batterTeam: "RCB",
    bowler: "Yuzvendra Chahal",
    bowlerTeam: "RR",
    dismissals: 1,
    ballsFaced: 48,
    runs: 76,
    strikeRate: 158.3,
    average: 76.0,
    dotPct: 28.0,
    bowlerEcon: 9.50,
    dominanceScore: 55,
    dominanceFavors: "batter",
    phaseSplit: {
      powerplay: { balls: 6, runs: 8, dismissals: 0, sr: 133.3 },
      middle: { balls: 32, runs: 50, dismissals: 1, sr: 156.3 },
      death: { balls: 10, runs: 18, dismissals: 0, sr: 180.0 },
    }
  }
];

export function MatchupsView() {
  const [batterSearch, setBatterSearch] = useState<string>("");
  const [bowlerSearch, setBowlerSearch] = useState<string>("");
  const [minBallsFilter, setMinBallsFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"dismissals" | "strikeRate" | "dominance">("dismissals");

  const [hoveredBatter, setHoveredBatter] = useState<string | null>(null);
  const [hoveredBowler, setHoveredBowler] = useState<string | null>(null);
  const [selectedMatchup, setSelectedMatchup] = useState<MatchupPairData | null>(null);

  // Filter Matchups
  const filteredMatchups = useMemo(() => {
    return MASTER_MATCHUPS_DATA.filter(m => {
      const matchBatter = m.batter.toLowerCase().includes(batterSearch.toLowerCase());
      const matchBowler = m.bowler.toLowerCase().includes(bowlerSearch.toLowerCase());
      const matchMinBalls = m.ballsFaced >= minBallsFilter;
      return matchBatter && matchBowler && matchMinBalls;
    }).sort((a, b) => {
      if (sortBy === "dismissals") return b.dismissals - a.dismissals;
      if (sortBy === "strikeRate") return b.strikeRate - a.strikeRate;
      if (sortBy === "dominance") return Math.abs(b.dominanceScore) - Math.abs(a.dominanceScore);
      return 0;
    });
  }, [batterSearch, bowlerSearch, minBallsFilter, sortBy]);

  // Distinct Batters List
  const distinctBatters = useMemo(() => {
    const map = new Map<string, { name: string; team: string; totalMatchups: number; avgSR: number }>();
    filteredMatchups.forEach(m => {
      if (!map.has(m.batter)) {
        const playerMatchups = filteredMatchups.filter(x => x.batter === m.batter);
        const avgSR = playerMatchups.reduce((acc, x) => acc + x.strikeRate, 0) / playerMatchups.length;
        map.set(m.batter, { name: m.batter, team: m.batterTeam, totalMatchups: playerMatchups.length, avgSR: Math.round(avgSR) });
      }
    });
    return Array.from(map.values());
  }, [filteredMatchups]);

  // Distinct Bowlers List
  const distinctBowlers = useMemo(() => {
    const map = new Map<string, { name: string; team: string; totalMatchups: number; avgEcon: number }>();
    filteredMatchups.forEach(m => {
      if (!map.has(m.bowler)) {
        const playerMatchups = filteredMatchups.filter(x => x.bowler === m.bowler);
        const avgEcon = playerMatchups.reduce((acc, x) => acc + x.bowlerEcon, 0) / playerMatchups.length;
        map.set(m.bowler, { name: m.bowler, team: m.bowlerTeam, totalMatchups: playerMatchups.length, avgEcon: Number(avgEcon.toFixed(2)) });
      }
    });
    return Array.from(map.values());
  }, [filteredMatchups]);

  // Active Linked Opponents based on hover
  const activeLinkedBowlers = useMemo(() => {
    if (!hoveredBatter) return new Set<string>();
    return new Set(filteredMatchups.filter(m => m.batter === hoveredBatter).map(m => m.bowler));
  }, [hoveredBatter, filteredMatchups]);

  const activeLinkedBatters = useMemo(() => {
    if (!hoveredBowler) return new Set<string>();
    return new Set(filteredMatchups.filter(m => m.bowler === hoveredBowler).map(m => m.batter));
  }, [hoveredBowler, filteredMatchups]);

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* 1. CONTROL & FILTER HEADER */}
      <div className="sticky top-4 z-[90] bg-[#0B1020]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Batter Search Input */}
          <div className="relative flex-1 sm:w-56">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              type="text"
              placeholder="Search Batter (e.g. Kohli)..."
              value={batterSearch}
              onChange={(e) => setBatterSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-all"
            />
            {batterSearch && (
              <button onClick={() => setBatterSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bowler Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              placeholder="Search Bowler (e.g. Bumrah)..."
              value={bowlerSearch}
              onChange={(e) => setBowlerSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 transition-all"
            />
            {bowlerSearch && (
              <button onClick={() => setBowlerSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Minimum Balls Faced Filter */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-white/50 uppercase">Min Balls:</span>
            <select
              value={minBallsFilter}
              onChange={(e) => setMinBallsFilter(Number(e.target.value))}
              className="bg-transparent text-amber-400 text-xs font-black outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-900 text-white">All Balls</option>
              <option value={10} className="bg-slate-900 text-white">10+ Balls</option>
              <option value={20} className="bg-slate-900 text-white">20+ Balls</option>
              <option value={30} className="bg-slate-900 text-white">30+ Balls</option>
            </select>
          </div>
        </div>

        {/* Sort Buttons */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 w-full lg:w-auto justify-end">
          <span className="text-[9px] font-black uppercase text-white/40 px-2">Sort:</span>
          <button
            onClick={() => setSortBy("dismissals")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              sortBy === "dismissals" ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105' : 'text-white/40 hover:text-white'
            }`}
          >
            By Dismissals
          </button>
          <button
            onClick={() => setSortBy("strikeRate")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              sortBy === "strikeRate" ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105' : 'text-white/40 hover:text-white'
            }`}
          >
            By Strike Rate
          </button>
          <button
            onClick={() => setSortBy("dominance")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
              sortBy === "dominance" ? 'bg-amber-400 text-black font-black shadow-lg shadow-amber-400/20 scale-105' : 'text-white/40 hover:text-white'
            }`}
          >
            By Dominance
          </button>
        </div>
      </div>

      {/* 2. DUAL-COLUMN SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        
        {/* LEFT COLUMN: BATTERS CARDS */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Batters ({distinctBatters.length})
            </span>
            <span className="text-[10px] text-white/40 font-mono">Hover to view linked bowlers</span>
          </div>

          <div className="flex flex-col gap-3">
            {distinctBatters.map(batter => {
              const isHovered = hoveredBatter === batter.name;
              const isLinked = activeLinkedBatters.has(batter.name);
              const isDimmed = (hoveredBowler && !isLinked) || (hoveredBatter && !isHovered);
              const batterMatchups = filteredMatchups.filter(m => m.batter === batter.name);

              return (
                <div
                  key={batter.name}
                  onMouseEnter={() => setHoveredBatter(batter.name)}
                  onMouseLeave={() => setHoveredBatter(null)}
                  className={`relative transition-all duration-300 rounded-2xl border p-4 cursor-pointer backdrop-blur-md ${
                    isHovered
                      ? 'bg-purple-900/40 border-purple-500/80 shadow-xl shadow-purple-500/20 scale-[1.02] z-20'
                      : isLinked
                      ? 'bg-purple-950/30 border-purple-400/60 shadow-lg z-10'
                      : isDimmed
                      ? 'bg-white/[0.01] border-white/5 opacity-35 scale-98'
                      : 'bg-white/[0.03] border-white/10 hover:border-purple-500/50 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full border-2 border-purple-500/50 overflow-hidden shrink-0 shadow-md">
                        <PlayerAvatar name={batter.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{batter.name}</h4>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300">
                            {batter.team}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 font-medium mt-0.5">
                          {batter.totalMatchups} Rivalry Duels Recorded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-right">
                        <span className="text-[8px] font-bold text-white/40 block uppercase">Overall SR</span>
                        <span className="text-xs font-black font-mono text-purple-400">{batter.avgSR} SR</span>
                      </div>
                    </div>
                  </div>

                  {/* DUEL PAIRS LIST FOR THIS BATTER */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    {batterMatchups.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMatchup(m)}
                        className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 hover:border-amber-400 text-[10px] font-bold text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        <span>vs {m.bowler}</span>
                        <span className="text-red-400 font-mono font-black">{m.dismissals}W</span>
                        <span className="text-cyan-400 font-mono">SR {m.strikeRate}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: BOWLERS CARDS */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Target className="w-4 h-4" /> Bowlers ({distinctBowlers.length})
            </span>
            <span className="text-[10px] text-white/40 font-mono">Hover to view linked batters</span>
          </div>

          <div className="flex flex-col gap-3">
            {distinctBowlers.map(bowler => {
              const isHovered = hoveredBowler === bowler.name;
              const isLinked = activeLinkedBowlers.has(bowler.name);
              const isDimmed = (hoveredBatter && !isLinked) || (hoveredBowler && !isHovered);
              const bowlerMatchups = filteredMatchups.filter(m => m.bowler === bowler.name);

              return (
                <div
                  key={bowler.name}
                  onMouseEnter={() => setHoveredBowler(bowler.name)}
                  onMouseLeave={() => setHoveredBowler(null)}
                  className={`relative transition-all duration-300 rounded-2xl border p-4 cursor-pointer backdrop-blur-md ${
                    isHovered
                      ? 'bg-cyan-900/40 border-cyan-500/80 shadow-xl shadow-cyan-500/20 scale-[1.02] z-20'
                      : isLinked
                      ? 'bg-cyan-950/30 border-cyan-400/60 shadow-lg z-10'
                      : isDimmed
                      ? 'bg-white/[0.01] border-white/5 opacity-35 scale-98'
                      : 'bg-white/[0.03] border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full border-2 border-cyan-500/50 overflow-hidden shrink-0 shadow-md">
                        <PlayerAvatar name={bowler.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{bowler.name}</h4>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                            {bowler.team}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 font-medium mt-0.5">
                          {bowler.totalMatchups} Rivalry Duels Recorded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-right">
                        <span className="text-[8px] font-bold text-white/40 block uppercase">Avg Econ</span>
                        <span className="text-xs font-black font-mono text-cyan-400">{bowler.avgEcon} Econ</span>
                      </div>
                    </div>
                  </div>

                  {/* DUEL PAIRS LIST FOR THIS BOWLER */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                    {bowlerMatchups.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMatchup(m)}
                        className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 hover:border-amber-400 text-[10px] font-bold text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        <span>vs {m.batter}</span>
                        <span className="text-red-400 font-mono font-black">{m.dismissals}W</span>
                        <span className="text-cyan-400 font-mono">Econ {m.bowlerEcon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. DETAILED HEAD-TO-HEAD TELEMETRY DRAWER */}
      <AnimatePresence>
        {selectedMatchup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.98 }}
            className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[680px] z-[150]"
          >
            <div className="bg-[#0B1020]/95 backdrop-blur-2xl border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl shadow-purple-950/80 relative text-white">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedMatchup(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Drawer Title Header */}
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden shadow-lg">
                    <PlayerAvatar name={selectedMatchup.batter} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedMatchup.batter}</h3>
                    <span className="text-[9px] font-bold text-purple-400 uppercase">{selectedMatchup.batterTeam} Batter</span>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> VS
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500 overflow-hidden shadow-lg">
                    <PlayerAvatar name={selectedMatchup.bowler} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedMatchup.bowler}</h3>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase">{selectedMatchup.bowlerTeam} Bowler</span>
                  </div>
                </div>
              </div>

              {/* METRIC PILLS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                
                {/* Dismissals Pill */}
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-red-300 uppercase block flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3 text-red-400" /> Wickets
                  </span>
                  <span className="text-lg font-black text-red-400 font-mono mt-1 block">
                    {selectedMatchup.dismissals}
                  </span>
                </div>

                {/* Balls Faced Pill */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-blue-300 uppercase block flex items-center justify-center gap-1">
                    <Target className="w-3 h-3 text-blue-400" /> Balls
                  </span>
                  <span className="text-lg font-black text-blue-400 font-mono mt-1 block">
                    {selectedMatchup.ballsFaced}
                  </span>
                </div>

                {/* Strike Rate Pill */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-purple-300 uppercase block flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" /> SR
                  </span>
                  <span className="text-lg font-black text-purple-300 font-mono mt-1 block">
                    {selectedMatchup.strikeRate}
                  </span>
                </div>

                {/* Average Pill */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-emerald-300 uppercase block flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" /> Average
                  </span>
                  <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                    {selectedMatchup.average}
                  </span>
                </div>

                {/* Dot Ball % Pill */}
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-cyan-300 uppercase block flex items-center justify-center gap-1">
                    <CircleDot className="w-3 h-3 text-cyan-400" /> Dot %
                  </span>
                  <span className="text-lg font-black text-cyan-300 font-mono mt-1 block">
                    {selectedMatchup.dotPct}%
                  </span>
                </div>

              </div>

              {/* PHASE DISTRIBUTION PROGRESS BARS */}
              <div className="mb-6 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
                  <span>Phase Breakdown Telemetry</span>
                  <span className="text-[10px] text-white/40 font-mono">Real Ball-by-Ball Split</span>
                </h4>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  
                  {/* Powerplay */}
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white">
                      <span>Powerplay (1-6)</span>
                      <span className="text-amber-400 font-mono">SR {selectedMatchup.phaseSplit.powerplay.sr}</span>
                    </div>
                    <p className="text-[9px] text-white/50 font-medium">
                      {selectedMatchup.phaseSplit.powerplay.runs} runs off {selectedMatchup.phaseSplit.powerplay.balls}b · {selectedMatchup.phaseSplit.powerplay.dismissals}W
                    </p>
                  </div>

                  {/* Middle */}
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white">
                      <span>Middle (7-15)</span>
                      <span className="text-amber-400 font-mono">SR {selectedMatchup.phaseSplit.middle.sr}</span>
                    </div>
                    <p className="text-[9px] text-white/50 font-medium">
                      {selectedMatchup.phaseSplit.middle.runs} runs off {selectedMatchup.phaseSplit.middle.balls}b · {selectedMatchup.phaseSplit.middle.dismissals}W
                    </p>
                  </div>

                  {/* Death */}
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white">
                      <span>Death (16-20)</span>
                      <span className="text-amber-400 font-mono">SR {selectedMatchup.phaseSplit.death.sr}</span>
                    </div>
                    <p className="text-[9px] text-white/50 font-medium">
                      {selectedMatchup.phaseSplit.death.runs} runs off {selectedMatchup.phaseSplit.death.balls}b · {selectedMatchup.phaseSplit.death.dismissals}W
                    </p>
                  </div>

                </div>
              </div>

              {/* DOMINANCE INDICATOR BAR */}
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-purple-400 uppercase">Batter Dominance</span>
                  <span className="text-amber-400 font-mono uppercase">
                    {selectedMatchup.dominanceScore > 0 ? `+${selectedMatchup.dominanceScore}% BATTER ADVANTAGE` : `${selectedMatchup.dominanceScore}% BOWLER LOCKOUT`}
                  </span>
                  <span className="text-cyan-400 uppercase">Bowler Dominance</span>
                </div>

                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative flex">
                  {/* Batter Bar */}
                  <div
                    style={{ width: `${Math.max(10, Math.min(90, 50 + selectedMatchup.dominanceScore / 2))}%` }}
                    className="h-full bg-gradient-to-r from-purple-600 via-emerald-500 to-amber-400 transition-all duration-500"
                  />
                  {/* Bowler Bar */}
                  <div
                    style={{ width: `${100 - Math.max(10, Math.min(90, 50 + selectedMatchup.dominanceScore / 2))}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-600 to-red-600 transition-all duration-500"
                  />
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
