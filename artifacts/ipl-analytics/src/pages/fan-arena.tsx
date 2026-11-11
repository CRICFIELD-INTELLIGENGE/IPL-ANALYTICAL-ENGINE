import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useTeamTheme } from "@/lib/team-context";
import {
  Shield, Trophy, Users, MessageSquare, Gavel, BarChart2,
  Sparkles, Flame, Clock, Radio, Award, Heart, CheckCircle2,
  ChevronRight, ArrowRight, Share2, Compass, Search, Filter,
  Send, ThumbsUp, Star, Layers, Zap, Crosshair, BookOpen, AlertCircle,
  Play, ExternalLink, X, TrendingUp, Cpu, Activity, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & CATALOGUES
// ─────────────────────────────────────────────────────────────────────────────

type ToolCategory = "all" | "belong" | "discover" | "play";

interface ToolItem {
  id: string;
  name: string;
  category: "belong" | "discover" | "play";
  badge: "LIVE" | "BETA";
  subtitle: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  bgGlow: string;
  href: string;
  metric: string;
  evidence: string;
}

const TOOLS_CATALOGUE: ToolItem[] = [
  {
    id: "dugout",
    name: "My Dugout",
    category: "belong",
    badge: "LIVE",
    subtitle: "Fan Identity",
    description: "Franchise-personalized sanctuary with home feed, era timeline (2008–2026), loyalty milestones, and rival intelligence tracker.",
    icon: Shield,
    iconColor: "text-rose-400",
    bgGlow: "group-hover:border-rose-500/40 bg-rose-500/5",
    href: "/dugout",
    metric: "10 Franchises Live",
    evidence: "Full roster timelines & personalized themes"
  },
  {
    id: "parliament",
    name: "Fan Parliament",
    category: "belong",
    badge: "LIVE",
    subtitle: "Polls & Governance",
    description: "Tactical fan voting on retentions, captaincy, and batting order — calibrated against 280,000+ balls of data evidence.",
    icon: BarChart2,
    iconColor: "text-cyan-400",
    bgGlow: "group-hover:border-cyan-500/40 bg-cyan-500/5",
    href: "/dugout#parliament",
    metric: "48.2k Votes Logged",
    evidence: "Delta comparison with ML prediction engines"
  },
  {
    id: "clubs",
    name: "Fan Clubs",
    category: "belong",
    badge: "BETA",
    subtitle: "Community",
    description: "Regional and global supporter circles (Whistle Podu, 12th Man Army, Paltan Network) with private tactical debate forums.",
    icon: Users,
    iconColor: "text-purple-400",
    bgGlow: "group-hover:border-purple-500/40 bg-purple-500/5",
    href: "/dugout",
    metric: "10 Official Hubs",
    evidence: "Reputation score verification for contributors"
  },
  {
    id: "story-vault",
    name: "Story Vault",
    category: "belong",
    badge: "LIVE",
    subtitle: "Memories",
    description: "A living museum of Indian cricket: ticket stubs, stadium memories, historic heartbreaks, and championship celebrations.",
    icon: BookOpen,
    iconColor: "text-amber-400",
    bgGlow: "group-hover:border-amber-500/40 bg-amber-500/5",
    href: "/insights",
    metric: "1,200+ Fan Stories",
    evidence: "Peer-moderated stadium lore & broadcast archives"
  },
  {
    id: "scout-lab",
    name: "Scout Lab",
    category: "discover",
    badge: "BETA",
    subtitle: "Player Discovery",
    description: "Crowdsourced scouting network surfacing domestic stars and high-leverage prodigies with verifiable ball telemetry.",
    icon: Crosshair,
    iconColor: "text-cyan-400",
    bgGlow: "group-hover:border-cyan-500/40 bg-cyan-500/5",
    href: "/stats",
    metric: "700+ Player Profiles",
    evidence: "Ball-by-ball release speed & split metrics"
  },
  {
    id: "second-screen",
    name: "Second Screen",
    category: "play",
    badge: "LIVE",
    subtitle: "Live Match Companion",
    description: "Real-time companion for live matches: live win probability curves, wagon wheels, and ball-by-ball win probability impact.",
    icon: Radio,
    iconColor: "text-emerald-400",
    bgGlow: "group-hover:border-emerald-500/40 bg-emerald-500/5",
    href: "/pulse",
    metric: "Sub-Second Latency",
    evidence: "Dynamic match telemetry & pressure charts"
  },
  {
    id: "community-intel",
    name: "Community Intel",
    category: "discover",
    badge: "LIVE",
    subtitle: "Fan vs Data",
    description: "Aggregated fan predictions contrasted directly against machine learning odds to highlight fan optimism bias.",
    icon: TrendingUp,
    iconColor: "text-amber-400",
    bgGlow: "group-hover:border-amber-500/40 bg-amber-500/5",
    href: "/ai-analyst/feed",
    metric: "43.5% Sentiment Delta",
    evidence: "Monte Carlo 1,000 runs calibration baseline"
  },
  {
    id: "rivalry-arena",
    name: "Rivalry Arena",
    category: "belong",
    badge: "LIVE",
    subtitle: "Head-to-Head",
    description: "The ultimate clash center: CSK vs MI, RCB vs KKR, Rohit vs Dhoni with historic head-to-head metrics and fan debates.",
    icon: Flame,
    iconColor: "text-purple-400",
    bgGlow: "group-hover:border-purple-500/40 bg-purple-500/5",
    href: "/dugout#rivalry",
    metric: "45 Classic Encounters",
    evidence: "Head-to-head win % & finals record analytics"
  },
  {
    id: "auction-war-room",
    name: "Auction War Room",
    category: "play",
    badge: "LIVE",
    subtitle: "Squad Building",
    description: "Command a ₹120.00 Cr purse against 9 franchise AI bots. Formulate bid ceilings and draft championship rosters.",
    icon: Gavel,
    iconColor: "text-yellow-400",
    bgGlow: "group-hover:border-yellow-500/40 bg-yellow-500/5",
    href: "/auction",
    metric: "₹120.00 Cr Cap Engine",
    evidence: "9 Autonomous bot bidding strategies"
  },
  {
    id: "time-machine",
    name: "Time Machine",
    category: "discover",
    badge: "BETA",
    subtitle: "What-If Simulations",
    description: "Replay historic IPL finals and critical overs under alternate scenarios using 1,000 Monte Carlo divergence runs.",
    icon: Clock,
    iconColor: "text-indigo-400",
    bgGlow: "group-hover:border-indigo-500/40 bg-indigo-500/5",
    href: "/ai-analyst/alt-universe",
    metric: "1,240+ Match Archives",
    evidence: "Isolates decision causality with worm tracking"
  },
  {
    id: "fan-reputation",
    name: "Fan Reputation",
    category: "belong",
    badge: "BETA",
    subtitle: "Earn Credibility",
    description: "Merit-based reputation protocol rewarding analytical accuracy and constructive discourse rather than spam.",
    icon: Award,
    iconColor: "text-amber-300",
    bgGlow: "group-hover:border-amber-400/40 bg-amber-500/5",
    href: "/dugout",
    metric: "5 Merit Tiers",
    evidence: "Brier-score weighted prediction IQ verification"
  }
];

export default function FanArenaPage() {
  const { selectedTeam } = useTeamTheme();
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToolModal, setSelectedToolModal] = useState<ToolItem | null>(null);

  // Filtered tools
  const filteredTools = useMemo(() => {
    return TOOLS_CATALOGUE.filter((tool) => {
      const matchesCategory = activeCategory === "all" || tool.category === activeCategory;
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#030712] text-white selection:bg-[#00D9FF]/30 selection:text-white">
        
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 01: CINEMATIC FLOODLIT HERO
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative w-full overflow-hidden border-b border-white/[0.08] bg-gradient-to-b from-[#050B18] via-[#040814] to-[#02050E]">
          {/* Panoramic Stadium Lights Ambient Layer */}
          <div 
            className="absolute inset-0 opacity-25 mix-blend-screen pointer-events-none bg-cover bg-center"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 20%, rgba(0, 217, 255, 0.25), transparent 60%),
                                radial-gradient(circle at 80% 40%, rgba(255, 23, 100, 0.2), transparent 50%),
                                url('/match-pulse-bg.jpg')`
            }}
          />
          <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-gradient-to-b from-[#00D9FF]/15 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Hero Typography & 3 Mode Pills */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 backdrop-blur-md shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D9FF] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
                    BEYOND XI OPERATING SYSTEM
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] uppercase">
                  Beyond the scoreboard. <br />
                  <span className="text-[#00D9FF] drop-shadow-[0_0_25px_rgba(0,217,255,0.4)]">
                    Inside the game.
                  </span>
                </h1>

                {/* Supporting Description */}
                <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
                  One cricket universe. Three ways to participate. Belong to a franchise, challenge the numbers, and change the game.
                </p>

                {/* 3 Pill Action Cards in a horizontal row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl">
                  
                  {/* Pill 1: Choose Your Dugout (Be a Fan) */}
                  <Link href="/dugout">
                    <div className="group relative p-3.5 rounded-2xl bg-[#0B132B]/80 hover:bg-[#121E3F] border border-[#FF1764]/30 hover:border-[#FF1764] transition-all duration-300 shadow-lg cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FF1764]/20 border border-[#FF1764]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5 text-[#FF1764]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#FF1764] transition-colors truncate">
                          Choose Your Dugout
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Be a Fan
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Pill 2: Explore Intelligence (Be an Analyst) */}
                  <Link href="/ai-analyst">
                    <div className="group relative p-3.5 rounded-2xl bg-[#0B132B]/80 hover:bg-[#121E3F] border border-[#00D9FF]/30 hover:border-[#00D9FF] transition-all duration-300 shadow-lg cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#00D9FF]/20 border border-[#00D9FF]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BarChart2 className="w-5 h-5 text-[#00D9FF]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#00D9FF] transition-colors truncate">
                          Explore Intelligence
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Be an Analyst
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Pill 3: Enter War Room (Be a Selector) */}
                  <Link href="/auction">
                    <div className="group relative p-3.5 rounded-2xl bg-[#0B132B]/80 hover:bg-[#121E3F] border border-[#9B35FF]/30 hover:border-[#9B35FF] transition-all duration-300 shadow-lg cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#9B35FF]/20 border border-[#9B35FF]/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Gavel className="w-5 h-5 text-[#9B35FF]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white group-hover:text-[#9B35FF] transition-colors truncate">
                          Enter War Room
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Be a Selector
                        </div>
                      </div>
                    </div>
                  </Link>

                </div>
              </div>

              {/* Right Column: 3 Live Dynamic Preview Cards */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 1. FAN POLL Card */}
                <div className="relative rounded-2xl bg-[#0B1328]/90 border border-white/10 hover:border-[#00D9FF]/30 transition-all p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wider text-slate-400">
                        FAN POLL
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        LIVE
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-[#00D9FF]" />
                      48.2k votes
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white mb-3">
                    Will RCB retain their core 11 in 2027?
                  </div>

                  {/* Gradient Poll Progress Bar */}
                  <div className="space-y-1.5 mb-3">
                    <div className="h-4 rounded-full bg-slate-800/80 p-0.5 overflow-hidden flex border border-white/5">
                      <div 
                        className="h-full rounded-l-full bg-gradient-to-r from-[#FF1764] to-[#FF5E89] text-[9px] font-mono font-bold text-white flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: "68%" }}
                      >
                        68%
                      </div>
                      <div 
                        className="h-full rounded-r-full bg-slate-700/60 text-[9px] font-mono font-bold text-slate-300 flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: "32%" }}
                      >
                        32%
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#FF1764] font-bold">68% Yes</span>
                      <span className="text-slate-400">32% No</span>
                    </div>
                  </div>

                  <Link href="/dugout#parliament">
                    <button className="w-full py-2 px-3 rounded-xl bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 hover:border-[#00D9FF]/60 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                      <span>View Evidence</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>

                {/* Bottom Row: Key Insight + Auction War Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Left: Key Insight Card */}
                  <div className="rounded-2xl bg-[#0B1328]/90 border border-white/10 hover:border-[#00D9FF]/30 transition-all p-3.5 shadow-xl backdrop-blur-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-[#00D9FF] uppercase tracking-wider mb-2">
                        <Sparkles className="w-3 h-3 text-[#00D9FF]" />
                        KEY INSIGHT
                      </div>
                      <div className="text-xs text-slate-200 leading-snug">
                        RCB's death over strike rate improved by <span className="text-[#00D9FF] font-bold">18%</span> in 2025 vs 2023.
                      </div>
                    </div>
                    <Link href="/stats" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00D9FF] hover:underline pt-3">
                      <BarChart2 className="w-3.5 h-3.5 text-[#00D9FF]" />
                      <span>View Stats →</span>
                    </Link>
                  </div>

                  {/* Right: Auction War Room Card */}
                  <div className="rounded-2xl bg-[#0B1328]/90 border border-white/10 hover:border-[#FFB703]/30 transition-all p-3.5 shadow-xl backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider mb-1">
                        AUCTION WAR ROOM
                      </div>
                      <div className="text-lg font-black text-white tracking-tight">
                        ₹ 120.00 Cr
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Purse Remaining
                      </div>
                    </div>

                    {/* IPL Trophy subtle visual icon */}
                    <div className="absolute right-2 top-2 w-14 h-14 opacity-20 pointer-events-none">
                      <Trophy className="w-full h-full text-amber-400" />
                    </div>

                    <Link href="/auction" className="pt-3 relative z-10">
                      <button className="w-full py-1.5 px-2.5 rounded-lg bg-[#00D9FF] hover:bg-[#00B4D8] text-slate-950 text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-[#00D9FF]/20">
                        <span>Open War Room</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 03: THREE PARTICIPATORY IDENTITIES ("Three Modes")
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono font-bold text-[#00D9FF] tracking-widest uppercase mb-1">
                03 CHOOSE YOUR CRICKET IDENTITY
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Three Modes. One Cricket Community.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Switch between Fan, Analyst and Selector — your journey, your rules.
              </p>
            </div>

            <Link href="/about" className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00D9FF] hover:underline">
              <span>Why Three Identities?</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3 Identity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: THE FAN (Pink) */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#140815] to-[#0A0612] border border-[#FF1764]/30 hover:border-[#FF1764]/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF1764]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF1764]/20 border border-[#FF1764]/40 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-[#FF1764]" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white uppercase tracking-tight">
                      THE FAN
                    </div>
                    <div className="text-[10px] text-[#FF1764] font-mono">
                      Belong. Debate. Remember.
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2.5 pt-2">
                  {[
                    "My Dugout & Franchise Loyalty",
                    "Fan Parliament Polls",
                    "Story Vault & Memories"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-[#FF1764]/20 border border-[#FF1764]/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#FF1764]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Visual Accent Container */}
                <div className="relative h-24 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: `url('/TITLE BANNER.png')` }}
                  />
                  <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-[#FF1764]/30 backdrop-blur-md">
                    <Shield className="w-3.5 h-3.5 text-[#FF1764]" />
                    <span className="text-[10px] font-mono font-bold text-white">RCB & Franchise Hubs</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative z-10">
                <Link href="/dugout">
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF1764] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FF1764]/20 cursor-pointer">
                    <span>Enter Fan Mode</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Card 2: THE ANALYST (Cyan) */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#051421] to-[#040C16] border border-[#00D9FF]/30 hover:border-[#00D9FF]/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#00D9FF]/20 border border-[#00D9FF]/40 flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-[#00D9FF]" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white uppercase tracking-tight">
                      THE ANALYST
                    </div>
                    <div className="text-[10px] text-[#00D9FF] font-mono">
                      Question. Measure. Discover.
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2.5 pt-2">
                  {[
                    "Advanced Stats & Visualizations",
                    "Community Intelligence",
                    "Scout Lab & Player Dossiers"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-[#00D9FF]/20 border border-[#00D9FF]/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#00D9FF]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Visual Accent Container */}
                <div className="relative h-24 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: `url('/venue heatmap.png')` }}
                  />
                  <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-[#00D9FF]/30 backdrop-blur-md">
                    <Cpu className="w-3.5 h-3.5 text-[#00D9FF]" />
                    <span className="text-[10px] font-mono font-bold text-white">280,000+ Ball Engine</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative z-10">
                <Link href="/ai-analyst">
                  <button className="w-full py-3 rounded-xl bg-transparent hover:bg-[#00D9FF]/10 border border-[#00D9FF] text-[#00D9FF] hover:text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00D9FF]/10 cursor-pointer">
                    <span>Enter Analyst Mode</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Card 3: THE SELECTOR (Purple) */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#130822] to-[#090514] border border-[#9B35FF]/30 hover:border-[#9B35FF]/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#9B35FF]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                {/* Header Badge */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#9B35FF]/20 border border-[#9B35FF]/40 flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-[#9B35FF]" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white uppercase tracking-tight">
                      THE SELECTOR
                    </div>
                    <div className="text-[10px] text-[#9B35FF] font-mono">
                      Build. Simulate. Compete.
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2.5 pt-2">
                  {[
                    "Auction War Room",
                    "Time Machine & Simulations",
                    "Strategy Games"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-[#9B35FF]/20 border border-[#9B35FF]/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#9B35FF]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Visual Accent Container */}
                <div className="relative h-24 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center"
                    style={{ backgroundImage: `url('/tactics-board.jpg')` }}
                  />
                  <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-[#9B35FF]/30 backdrop-blur-md">
                    <Gavel className="w-3.5 h-3.5 text-[#9B35FF]" />
                    <span className="text-[10px] font-mono font-bold text-white">₹120 Cr Cap Simulator</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative z-10">
                <Link href="/auction">
                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#9B35FF] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer">
                    <span>Enter Selector Mode</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 04: THE BEYOND XI LOOP ("From Opinion to Impact.")
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="relative rounded-3xl bg-gradient-to-r from-[#060D1E] via-[#08122A] to-[#060D1E] border border-white/10 p-6 sm:p-10 shadow-2xl overflow-hidden">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#00D9FF] tracking-widest uppercase mb-1">
                  03 THE BEYOND XI LOOP
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  From Opinion to Impact.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Your voice powers the loop. Every action connects to deeper insights, smarter decisions and bigger rewards.
                </p>
              </div>

              <Link href="/dugout">
                <button className="px-5 py-2.5 rounded-full bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 text-xs font-bold transition-all flex items-center gap-2 self-start cursor-pointer">
                  <span>Explore the Loop</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {/* Connected Circular Nodes Row */}
            <div className="relative overflow-x-auto pb-4">
              <div className="min-w-[700px] flex items-center justify-between gap-4">
                {[
                  {
                    num: "01",
                    title: "Identity",
                    subtitle: "Choose your Dugout",
                    color: "border-[#FF1764] text-[#FF1764] bg-[#FF1764]/10 shadow-[#FF1764]/20",
                    icon: Shield,
                    href: "/dugout"
                  },
                  {
                    num: "02",
                    title: "Opinion",
                    subtitle: "Vote in Parliament",
                    color: "border-[#F97316] text-[#F97316] bg-[#F97316]/10 shadow-[#F97316]/20",
                    icon: MessageSquare,
                    href: "/dugout#parliament"
                  },
                  {
                    num: "03",
                    title: "Evidence",
                    subtitle: "Inspect data",
                    color: "border-[#00D9FF] text-[#00D9FF] bg-[#00D9FF]/10 shadow-[#00D9FF]/20",
                    icon: BarChart2,
                    href: "/ai-analyst"
                  },
                  {
                    num: "04",
                    title: "Simulation",
                    subtitle: "Test strategies",
                    color: "border-[#9B35FF] text-[#9B35FF] bg-[#9B35FF]/10 shadow-[#9B35FF]/20",
                    icon: Cpu,
                    href: "/ai-analyst/alt-universe"
                  },
                  {
                    num: "05",
                    title: "Competition",
                    subtitle: "Challenge others",
                    color: "border-[#10B981] text-[#10B981] bg-[#10B981]/10 shadow-[#10B981]/20",
                    icon: Trophy,
                    href: "/auction"
                  }
                ].map((step, idx, arr) => (
                  <React.Fragment key={step.num}>
                    <Link href={step.href}>
                      <div className="flex flex-col items-center text-center group cursor-pointer">
                        {/* Circle Node */}
                        <div className={`w-16 h-16 rounded-full border-2 ${step.color} shadow-lg flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-110 mb-3`}>
                          <step.icon className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-mono font-bold leading-none">{step.num}</span>
                        </div>
                        {/* Text */}
                        <div className="text-xs font-bold text-white group-hover:text-[#00D9FF] transition-colors">
                          {step.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                          {step.subtitle}
                        </div>
                      </div>
                    </Link>

                    {/* Connecting Arrow */}
                    {idx < arr.length - 1 && (
                      <div className="flex-1 flex items-center justify-center px-2">
                        <div className="h-0.5 w-full bg-gradient-to-r from-white/10 via-[#00D9FF]/40 to-white/10 relative">
                          <ChevronRight className="w-4 h-4 text-[#00D9FF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 05: 12-TOOL EXPLORER WITH VERTICAL SKYSCRAPER AD
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 80%: 12 Tools Explorer */}
            <div className="lg:col-span-9 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono font-bold text-[#00D9FF] tracking-widest uppercase mb-1">
                    03 EXPLORE THE 12 ENGINES
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    12 Tools. Endless Possibilities.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Click any tool to see a live preview and explore.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tools, features..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#071329] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D9FF]"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: "all", label: "All (12)" },
                  { id: "belong", label: "Belong (4)" },
                  { id: "discover", label: "Discover (4)" },
                  { id: "play", label: "Play (4)" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id as ToolCategory)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCategory === tab.id
                        ? "bg-[#00D9FF] text-slate-950 font-black shadow-md shadow-[#00D9FF]/20"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 12 Tools Compact 4-Column Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      onClick={() => setSelectedToolModal(tool)}
                      className={`group relative p-3.5 rounded-2xl bg-[#071224]/80 hover:bg-[#0C1E3C] border border-white/10 ${tool.bgGlow} transition-all duration-300 cursor-pointer flex flex-col justify-between h-[120px] shadow-lg`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-xl bg-white/5 ${tool.iconColor} group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                          tool.badge === "LIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}>
                          {tool.badge}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-black text-white group-hover:text-[#00D9FF] transition-colors truncate">
                          {tool.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {tool.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right 20%: Vertical Skyscraper Ad Banner */}
            <div className="lg:col-span-3">
              <div className="relative rounded-3xl bg-gradient-to-b from-[#0B1528] via-[#091122] to-[#040814] border border-white/10 p-5 shadow-2xl flex flex-col justify-between min-h-[440px] overflow-hidden">
                
                {/* Background stadium lights accent */}
                <div 
                  className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/match-pulse-bg.jpg')` }}
                />

                <div className="relative z-10 space-y-3">
                  <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest px-2 py-0.5 rounded border border-white/5 bg-black/40 inline-block">
                    ADVERTISEMENT
                  </div>

                  <h3 className="text-lg font-black text-white leading-tight">
                    Think Bigger <br />
                    with Google Ads
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Reach cricket fans where it matters across live games and stats.
                  </p>
                </div>

                {/* Google Ads Visual Element */}
                <div className="relative z-10 my-6 flex items-center justify-center">
                  <div className="w-20 h-20 relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-blue-500 opacity-90 blur-sm absolute" />
                    <div className="w-14 h-14 rounded-2xl bg-[#091122] border border-white/20 flex items-center justify-center relative z-10">
                      <Sparkles className="w-7 h-7 text-[#00D9FF]" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10">
                  <a
                    href="https://ads.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#00D9FF] hover:bg-[#00B4D8] text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#00D9FF]/20 cursor-pointer"
                  >
                    <span>Start Advertising</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 06: SIGNATURE EXPERIENCES ("See It. Feel It. Play It.")
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono font-bold text-[#00D9FF] tracking-widest uppercase mb-1">
                03 SIGNATURE EXPERIENCES
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                See It. Feel It. Play It.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Try live previews of what makes Beyond XI different.
              </p>
            </div>

            <Link href="/ai-analyst" className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00D9FF] hover:underline">
              <span>Explore All Features</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3 Large Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: COMMUNITY INTELLIGENCE */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#0A162B] to-[#040B18] border border-white/10 hover:border-[#00D9FF]/40 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      COMMUNITY INTELLIGENCE
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Fan sentiment vs statistical reality
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    LIVE
                  </span>
                </div>

                {/* Question & Comparison UI */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="text-amber-400">👤</span>
                    <span>Will RCB defend their title in 2027?</span>
                  </div>

                  {/* Fan Consensus Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#FF1764] font-bold">68% Fan Consensus</span>
                      <span className="text-slate-400">Optimism</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FF1764] to-[#FF5E89] rounded-full" style={{ width: "68%" }} />
                    </div>
                  </div>

                  {/* Model Probability Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#00D9FF] font-bold">24.5% Model Probability</span>
                      <span className="text-slate-400">Historical Base</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00D9FF] to-[#38BDF8] rounded-full" style={{ width: "24.5%" }} />
                    </div>
                  </div>
                </div>

                {/* Virat Kohli subtle portrait card */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <img
                    src="/virat-kohli.png"
                    alt="Virat Kohli"
                    className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Virat Kohli</div>
                    <div className="text-[10px] font-mono text-slate-400">RCB Anchor · 2008–2026</div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/ai-analyst/feed">
                  <button className="w-full py-2.5 rounded-xl bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>View Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Card 2: SCOUT LAB */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#0A162B] to-[#040B18] border border-white/10 hover:border-[#F97316]/40 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      SCOUT LAB
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Peer-nominated underrated gems
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    BETA
                  </span>
                </div>

                {/* Mayank Yadav Profile */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center gap-3">
                  <img
                    src="/mayank yadav.jpg"
                    alt="Mayank Yadav"
                    className="w-12 h-12 rounded-full object-cover border border-cyan-400/40"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="text-sm font-black text-white">Mayank Yadav</div>
                    <div className="text-[10px] font-mono text-cyan-400">LSG · Right-Arm Fast</div>
                  </div>
                </div>

                {/* Speed Telemetry Spec */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-2xl font-black text-white tracking-tight">
                    156.7 <span className="text-xs font-mono text-[#00D9FF] font-normal">km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Top Speed Recorded in 2024
                  </div>

                  {/* Mini release curve graphic */}
                  <div className="h-10 pt-2 flex items-end gap-1">
                    {[35, 45, 60, 80, 95, 100, 90, 75, 55, 40].map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-t bg-gradient-to-t from-[#00D9FF]/20 to-[#00D9FF]"
                        style={{ height: `${val}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/stats">
                  <button className="w-full py-2.5 rounded-xl bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>Explore Scout Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Card 3: CRICKET STORY VAULT */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#0A162B] to-[#040B18] border border-white/10 hover:border-[#9B35FF]/40 transition-all duration-300 p-6 flex flex-col justify-between shadow-2xl group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      CRICKET STORY VAULT
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Real fans. Real memories.
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    LIVE
                  </span>
                </div>

                {/* Match Ticket Scrapbook Card */}
                <div className="relative p-4 rounded-2xl bg-[#D4A373]/10 border border-[#D4A373]/30 text-amber-100 space-y-2 overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#D4A373]/20 pb-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-300 tracking-wider">
                      RCB vs CSK
                    </span>
                    <span className="text-[9px] font-mono text-amber-200/60">
                      May 28, 2016
                    </span>
                  </div>

                  <p className="text-xs italic text-amber-100/90 leading-relaxed pt-1">
                    "I was there in the D-stand... ten years later, it felt like life coming full circle."
                  </p>

                  <div className="flex items-center justify-between text-[9px] font-mono text-amber-300/60 pt-2 border-t border-[#D4A373]/10">
                    <span>M. Chinnaswamy Stadium</span>
                    <span>Admit One · Stand D</span>
                  </div>
                </div>

                {/* Stadium photo badge */}
                <div className="relative h-16 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: `url('/venues-stadium.jpg')` }}
                  />
                  <div className="relative z-10 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
                    Chinnaswamy Stadium Fan Lore
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link href="/insights">
                  <button className="w-full py-2.5 rounded-xl bg-[#00D9FF]/10 hover:bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>Explore Story Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 07: CINEMATIC CLOSING BANNER
           ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative w-full overflow-hidden border-t border-white/[0.08] bg-gradient-to-b from-[#02050E] via-[#050B18] to-[#010308] py-16">
          {/* Panoramic Crowd Silhouette & Floodlight */}
          <div 
            className="absolute inset-0 opacity-25 mix-blend-screen pointer-events-none bg-cover bg-center"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 100%, rgba(255, 23, 100, 0.25), transparent 70%),
                                url('/match-pulse-bg.jpg')`
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase">
              Your Cricket Identity Starts Here.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Choose your franchise, enter your dugout and become part of something bigger.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link href={selectedTeam ? `/dugout/${selectedTeam}` : "/dugout"}>
                <button className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#FF1764] via-[#E11D48] to-[#BE123C] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#FF1764]/25 flex items-center gap-2 cursor-pointer">
                  <span>Choose Your Franchise</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <Link href="/ai-analyst">
                <button className="px-6 py-3.5 rounded-xl bg-[#0B1528] hover:bg-[#101F3C] text-slate-200 border border-white/15 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer">
                  <span>Explore Intelligence</span>
                </button>
              </Link>

              <Link href="/auction">
                <button className="px-6 py-3.5 rounded-xl bg-[#0B1528] hover:bg-[#101F3C] text-slate-200 border border-white/15 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer">
                  <span>Enter War Room</span>
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            INTERACTIVE TOOL PREVIEW MODAL
           ═══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {selectedToolModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md rounded-3xl bg-[#071329] border border-white/15 p-6 shadow-2xl space-y-5"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedToolModal(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl bg-white/5 ${selectedToolModal.iconColor}`}>
                    <selectedToolModal.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        {selectedToolModal.name}
                      </h3>
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                        selectedToolModal.badge === "LIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      }`}>
                        {selectedToolModal.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {selectedToolModal.subtitle}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedToolModal.description}
                </p>

                {/* Live Telemetry Specs */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Live Telemetry:</span>
                    <span className="font-mono font-bold text-white">{selectedToolModal.metric}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Underlying Model:</span>
                    <span className="font-mono text-[#00D9FF] text-right truncate max-w-[200px]">{selectedToolModal.evidence}</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 flex items-center gap-3">
                  <Link href={selectedToolModal.href} className="flex-1">
                    <button
                      onClick={() => setSelectedToolModal(null)}
                      className="w-full py-3 rounded-xl bg-[#00D9FF] hover:bg-[#00B4D8] text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00D9FF]/20 cursor-pointer"
                    >
                      <span>Launch Engine</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => setSelectedToolModal(null)}
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </Layout>
  );
}
