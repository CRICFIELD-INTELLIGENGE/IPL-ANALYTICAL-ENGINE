import React, { useState, useEffect, useRef, useMemo } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gavel, Users, DollarSign, Timer, TrendingUp, 
  ChevronRight, Zap, AlertCircle, History, Trophy,
  Shield, Target, Activity, Cpu, Sparkles, Brain, Crosshair,
  Pause, Play, RotateCcw, ListChecks, Search, MessageSquare,
  Info, ArrowUpRight, BarChart3, Lightbulb, UserPlus, Eye,
  CheckCircle2, XCircle, ChevronDown, Filter, Sparkle,
  Copy, Globe, User, FastForward, SlidersHorizontal, Flame,
  Radio, Check, SparkleIcon, ArrowRight
} from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";
import { 
  useLiveAuctionState, useAuctionBid, useAuctionStart, 
  useAuctionPause, useAuctionResume, useAuctionReset, useAuctionSelectTeam, useAuctionChat,
  useAuctionCreateRoom, useAuctionJoinRoom, useAuctionSetSpeed
} from "@/lib/live";
import { displayPlayerName, usePlayerDisplayNames } from "@/lib/aggregates";
import { useTeamTheme } from "@/lib/team-context";
import { CricFieldMascot } from "@/components/CricFieldMascot";
import { FALLBACK_ACCENT, paletteForCode, withAlpha } from "@/lib/team-palette";

function formatMoney(amountInLakhs: number): { value: string; unit: string } {
  if (!amountInLakhs || isNaN(amountInLakhs)) return { value: "0.00", unit: "Cr" };
  if (amountInLakhs >= 100) {
    return { value: (amountInLakhs / 100).toFixed(2), unit: "Cr" };
  }
  return { value: amountInLakhs.toFixed(0), unit: "Lakh" };
}

// Team Theme Colors
/** Card colours for a franchise code, from the shared palette (lib/team-palette.ts). */
function franchiseCardStyle(code: string): { background: string; borderColor: string; color: string } {
  const accent = paletteForCode(code)?.accent ?? FALLBACK_ACCENT;
  return {
    background: `linear-gradient(to bottom, ${withAlpha(accent, 0.22)}, #0B1020 60%, #000000)`,
    borderColor: withAlpha(accent, 0.45),
    color: accent,
  };
}

export default function AuctionPage() {
  const { data: state, isLoading } = useLiveAuctionState();
  const placeBid = useAuctionBid();
  const startAuction = useAuctionStart();
  const pauseAuction = useAuctionPause();
  const resumeAuction = useAuctionResume();
  const resetAuction = useAuctionReset();
  const selectTeam = useAuctionSelectTeam();
  const sendChat = useAuctionChat();
  const createRoom = useAuctionCreateRoom();
  const joinRoom = useAuctionJoinRoom();
  const setSpeed = useAuctionSetSpeed();
  const displayNames = usePlayerDisplayNames();
  
  const [activeTab, setActiveTab] = useState<"activity" | "squad" | "community" | "players">("activity");
  const [chatMsg, setChatMsg] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Lobby state
  const [selectedMode, setSelectedMode] = useState<"SINGLEPLAYER" | "MULTIPLAYER">("SINGLEPLAYER");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [roomCopied, setRoomCopied] = useState(false);

  const { selectedTeam: preferredTeam } = useTeamTheme();

  // Auto-preselect franchise if user has an active Dugout preference
  useEffect(() => {
    if (preferredTeam && state?.teams && selectedTeamId === null) {
      const match = state.teams.find((t: any) => t.name === preferredTeam);
      if (match) {
        setSelectedTeamId(match.id);
      }
    }
  }, [preferredTeam, state?.teams, selectedTeamId]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [state?.logs, state?.chat]);

  if (isLoading || !state) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center bg-[#030612] h-screen">
          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
             <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Initializing Mega Auction OS...</span>
          </div>
        </div>
      </Layout>
    );
  }

  const handleCreateRoom = async () => {
    await createRoom();
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;
    await joinRoom(joinCodeInput.trim(), selectedTeamId || undefined);
  };

  const handleCopyRoomCode = () => {
    if (state.roomCode) {
      navigator.clipboard.writeText(state.roomCode);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 2000);
    }
  };

  const handleConfirmFranchiseSelection = () => {
    if (!selectedTeamId) return;
    selectTeam(selectedTeamId);
  };

  // --- REDESIGNED LOBBY & FRANCHISE SELECTION SCREEN ---
  if (state.status === "WAITING" && !state.userTeamId) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[#060A1B] via-[#040714] to-[#02030A] text-white p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden">
           
           {/* BACKGROUND STADIUM LIGHT GLOW EFFECTS */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-amber-500/15 via-primary/5 to-transparent blur-3xl pointer-events-none rounded-full" />

           <div className="max-w-6xl w-full flex flex-col gap-10 relative z-10">
              
              {/* LOBBY HEADER HERO */}
              <div className="text-center flex flex-col items-center">
                 <CricFieldMascot team={preferredTeam || "default"} mood="cool" size={64} interactive className="mb-3 hover:scale-110 transition-transform" />
                 <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-full mb-4 shadow-xl shadow-amber-500/10">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-[0.3em]">Official IPL Mega Auction 2026 Command Center</span>
                 </div>
                 <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 italic leading-tight">
                   IPL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300">AUCTION</span>
                 </h1>
                 <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
                   Pick your official IPL team, set your gameplay mode, and command a ₹120.00 Cr purse against 9 strategic AI bidding algorithms or real friends.
                 </p>
              </div>

              {/* GAMEPLAY MODE SELECTION CARDS (HIGH-IMPACT DESIGN) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* MODE CARD 1: SINGLE-PLAYER AI ARENA */}
                 <motion.div 
                   whileHover={{ y: -4 }}
                   onClick={() => setSelectedMode("SINGLEPLAYER")}
                   className={`p-6 rounded-[30px] bg-gradient-to-br from-[#0D1429] via-[#090E1F] to-[#050814] border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-2xl ${
                     selectedMode === "SINGLEPLAYER" 
                       ? "border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.2)]" 
                       : "border-white/10 hover:border-white/20"
                   }`}
                 >
                    <div className="flex items-start justify-between mb-4">
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/30">
                          <Cpu className="w-7 h-7" />
                       </div>
                       <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         selectedMode === "SINGLEPLAYER" ? "bg-amber-400 text-black font-bold" : "bg-white/5 text-white/40"
                       }`}>
                          {selectedMode === "SINGLEPLAYER" ? "SELECTED MODE" : "SELECT SINGLEPLAYER"}
                       </div>
                    </div>

                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Single-Player Arena</h3>
                       <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">
                         Compete against 9 advanced AI Strategic Bots equipped with real-time valuation models and official IPL bidding slabs.
                       </p>
                    </div>

                    {/* AI PACE SELECTOR */}
                    <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between">
                       <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                          <FastForward className="w-3.5 h-3.5 text-amber-400" />
                          AI Pace Speed:
                       </span>
                       <div className="flex items-center gap-1.5">
                          {[
                            { label: "1x Normal", speed: 1 },
                            { label: "2x Fast", speed: 2 },
                            { label: "3x Turbo", speed: 3 },
                          ].map(s => (
                            <button
                              key={s.speed}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSpeed(s.speed);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                state.aiSpeed === s.speed ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/30' : 'bg-white/5 text-white/50 hover:text-white'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                       </div>
                    </div>
                 </motion.div>

                 {/* MODE CARD 2: MULTIPLAYER WAR ROOM */}
                 <motion.div 
                   whileHover={{ y: -4 }}
                   onClick={() => setSelectedMode("MULTIPLAYER")}
                   className={`p-6 rounded-[30px] bg-gradient-to-br from-[#0D1429] via-[#090E1F] to-[#050814] border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-2xl ${
                     selectedMode === "MULTIPLAYER" 
                       ? "border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_35px_rgba(6,182,212,0.2)]" 
                       : "border-white/10 hover:border-white/20"
                   }`}
                 >
                    <div className="flex items-start justify-between mb-4">
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black shadow-lg shadow-cyan-500/30">
                          <Globe className="w-7 h-7" />
                       </div>
                       <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         selectedMode === "MULTIPLAYER" ? "bg-cyan-400 text-black font-bold" : "bg-white/5 text-white/40"
                       }`}>
                          {selectedMode === "MULTIPLAYER" ? "SELECTED MODE" : "SELECT MULTIPLAYER"}
                       </div>
                    </div>

                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Multiplayer War Room</h3>
                       <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">
                         Host or join a custom auction room with your friends using room codes for real-time live player bidding.
                       </p>
                    </div>

                    {/* MULTIPLAYER ROOM ACTIONS */}
                    <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                       {state.roomCode ? (
                         <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-xl">
                            <span className="text-[10px] font-black text-white/50 uppercase">Room:</span>
                            <span className="text-base font-black text-cyan-400 font-mono tracking-widest">{state.roomCode}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyRoomCode();
                              }}
                              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-all"
                            >
                               <Copy className="w-3.5 h-3.5" />
                            </button>
                            {roomCopied && <span className="text-[9px] font-black text-emerald-400 uppercase">Copied!</span>}
                         </div>
                       ) : (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleCreateRoom();
                           }}
                           className="px-4 py-2 bg-cyan-400 text-black font-black text-[11px] uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-md shadow-cyan-400/20 cursor-pointer"
                         >
                            Create Room
                         </button>
                       )}

                       <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                          <input 
                            type="text" 
                            placeholder="Enter Code (e.g. IPL-1234)" 
                            value={joinCodeInput}
                            onChange={(e) => setJoinCodeInput(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-cyan-400"
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinRoom();
                            }}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer shrink-0"
                          >
                             Join
                          </button>
                       </div>
                    </div>
                 </motion.div>

              </div>

              {/* FRANCHISE SELECTION SECTION */}
              <div className="flex flex-col gap-6 pt-4">
                 <div className="text-center">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Select Your IPL Franchise</h2>
                    <p className="text-xs text-white/40 font-medium">Choose from 10 official IPL franchises. Unselected teams will be operated by strategic AI bots.</p>
                 </div>

                 {/* 10 FRANCHISE CARDS GRID */}
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {state.teams.map((team: any) => {
                       const cardStyle = franchiseCardStyle(team.name);
                       const isSelected = selectedTeamId === team.id;

                       return (
                          <motion.button 
                            key={team.id}
                            whileHover={{ scale: 1.04, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTeamId(team.id)}
                            style={{ background: cardStyle.background, borderColor: isSelected ? undefined : cardStyle.borderColor }}
                            className={`group relative aspect-[4/5] rounded-[26px] border-2 p-4 flex flex-col items-center justify-between transition-all shadow-xl overflow-hidden cursor-pointer ${
                              isSelected ? 'border-amber-400 ring-4 ring-amber-400/50 scale-105 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : ''
                            }`}
                          >
                             {/* SELECTED CHECKMARK BADGE */}
                             {isSelected && (
                               <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg">
                                  <Check className="w-4 h-4 stroke-[3]" />
                               </div>
                             )}

                             <div className="flex items-center justify-between w-full self-start">
                               <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Franchise #{team.id}</span>
                               {preferredTeam === team.name && (
                                 <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[8px] font-black text-amber-300 tracking-wider">
                                   MY DUGOUT
                                 </span>
                               )}
                             </div>
                             
                             <TeamLogo team={team.name} size="w-20 h-20" />
                             
                             <div className="text-center w-full z-10">
                               <div className="text-lg font-black uppercase tracking-widest mb-1 group-hover:scale-105 transition-transform" style={{ color: cardStyle.color }}>{team.name}</div>
                               <div className="text-[10px] font-bold text-emerald-400 font-mono bg-black/40 py-1 px-2 rounded-lg border border-white/10">₹{team.purse.toFixed(1)} Cr Purse</div>
                             </div>
                          </motion.button>
                       );
                    })}
                 </div>
              </div>

              {/* LAUNCH STAGE CTA BUTTON */}
              <div className="flex justify-center pt-4">
                 <button 
                   disabled={!selectedTeamId}
                   onClick={handleConfirmFranchiseSelection}
                   className={`px-12 py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_35px_rgba(245,158,11,0.4)] flex items-center gap-3 cursor-pointer border-2 border-amber-300 ${
                     !selectedTeamId ? 'opacity-30 pointer-events-none grayscale' : 'hover:scale-105 active:scale-95 animate-pulse'
                   }`}
                 >
                    <span>ENTER AUCTION STAGE</span>
                    <ArrowRight className="w-5 h-5" />
                 </button>
              </div>

           </div>
        </div>
      </Layout>
    );
  }

  const player = state.currentPlayer;
  const userTeam = state.teams.find((t: any) => t.id === state.userTeamId);
  const highestBidder = state.teams.find((t: any) => t.id === state.highestBidderId);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim() || !userTeam) return;
    sendChat("Owner", userTeam.name, chatMsg);
    setChatMsg("");
  };

  // Squad counters
  const squadCount = userTeam?.squad?.length || 0;
  const overseasCount = userTeam?.squad?.filter((p: any) => p.country && p.country.toLowerCase() !== "india" && p.country.toLowerCase() !== "ind")?.length || 0;

  // Filtered player pool for pool tab
  const filteredPool = state.playerPool.filter((p: any) => {
    const matchesSearch = !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase());
    const matchesRole = roleFilter === "ALL" || (p.role && p.role.toLowerCase() === roleFilter.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Layout>
      <div className="flex flex-col h-screen bg-[#050816] text-white p-4 gap-3 overflow-hidden">
        
        {/* TOP STATUS CONTROL BAR */}
        <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#0B1020] border border-white/10 rounded-2xl shrink-0 shadow-xl gap-3">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                 <Gavel className="w-5 h-5 text-amber-400" />
                 <div>
                   <span className="text-xs font-black uppercase tracking-wider text-white">
                     <span className="inline-flex items-center gap-1.5"><CricFieldMascot team={userTeam?.name || preferredTeam || "default"} mood="cool" size={20} /> IPL Mega Auction Arena</span>
                   </span>
                   {userTeam && (
                     <div className="text-[10px] text-white/50 font-bold flex items-center gap-1.5">
                       <span>Commanding:</span>
                       <span className="text-amber-400 font-black uppercase">{userTeam.name}</span>
                       {state.roomCode && (
                         <span className="px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded text-[9px] font-mono">
                           Room: {state.roomCode}
                         </span>
                       )}
                     </div>
                   )}
                 </div>
              </div>
              <div className="h-5 w-px bg-white/10 hidden md:block" />
              <div className="flex items-center gap-2">
                 <div className={`w-2.5 h-2.5 rounded-full ${state.status === 'ACTIVE' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-amber-400'}`} />
                 <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{state.status}</span>
              </div>
           </div>

           {/* AI SPEED CONTROL ACCELERATOR SWITCHER */}
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl px-2 py-1">
                 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mr-1">AI Speed:</span>
                 {[
                   { label: "1x", speed: 1 },
                   { label: "2x Fast", speed: 2 },
                   { label: "3x Turbo", speed: 3 },
                 ].map(s => (
                   <button
                     key={s.speed}
                     onClick={() => setSpeed(s.speed)}
                     className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                       state.aiSpeed === s.speed ? 'bg-amber-400 text-black' : 'text-white/40 hover:text-white'
                     }`}
                   >
                     {s.label}
                   </button>
                 ))}
              </div>

              <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-1">
                 <button 
                   onClick={() => pauseAuction()} 
                   title="Pause Auction"
                   className={`p-1.5 rounded-lg transition-all ${state.status === 'PAUSED' ? 'bg-amber-500 text-white' : 'text-white/40 hover:text-white'}`}
                 >
                    <Pause className="w-3.5 h-3.5" />
                 </button>
                 <button 
                   onClick={() => resumeAuction()} 
                   title="Resume Auction"
                   className={`p-1.5 rounded-lg transition-all ${state.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}
                 >
                    <Play className="w-3.5 h-3.5" />
                 </button>
                 <button 
                   onClick={() => resetAuction()} 
                   title="Reset Simulation"
                   className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                 >
                    <RotateCcw className="w-3.5 h-3.5" />
                 </button>
              </div>

              {state.status === "WAITING" && (
                <button 
                  onClick={() => startAuction()} 
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                   Start Auction Stage
                </button>
              )}
           </div>
        </div>

        {/* MAIN GRID ARENA */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
           
           {/* LEFT COLUMN: PLAYER HUD & PROMINENT BIDDING ARENA */}
           <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar">
              
              {/* MAIN PLAYER HUD CARD */}
              <div className="relative rounded-[24px] bg-[#0B1020] border border-white/10 p-4 flex flex-col gap-3 overflow-hidden shadow-2xl shrink-0">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 opacity-60" />
                 
                 {player ? (
                   <>
                     {/* PLAYER HEADER TAGS & CURRENT BID DISPLAY */}
                     <div className="flex items-start justify-between relative z-10">
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="px-2.5 py-0.5 bg-primary/20 border border-primary/40 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                             {player.role}
                           </span>
                           <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-white/70 uppercase tracking-widest">
                             {player.country}
                           </span>
                           <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                             player.rarity === 'Legend' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                             player.rarity === 'Elite' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' :
                             'bg-blue-500/20 border-blue-500/40 text-blue-300'
                           }`}>
                             {player.rarity} Tier
                           </span>
                        </div>

                        {/* LIVE HIGHEST BID BADGE */}
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-0.5">Current Highest Bid</span>
                           <div className="flex items-center gap-2">
                              {highestBidder ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg border border-white/20 shadow-md">
                                   <TeamLogo team={highestBidder.name} size="w-4 h-4" />
                                   <span className="text-xs font-black text-white uppercase">{highestBidder.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-white/40 italic">No Bids Yet</span>
                              )}
                              <div className="text-3xl font-black text-amber-400 font-mono italic">
                                ₹{formatMoney(state.currentBid || player.basePrice).value} <span className="text-base">{formatMoney(state.currentBid || player.basePrice).unit}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* PLAYER CARD CONTENT */}
                     <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
                        {/* PORTRAIT */}
                        <div className="w-28 h-36 rounded-2xl border border-white/15 overflow-hidden shadow-2xl group relative shrink-0 bg-black/40">
                           <PlayerAvatar name={player.name} className="w-full h-full" imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        </div>

                        {/* INFO & STAT METRICS */}
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                           <h2 className="text-2xl lg:text-3xl font-black tracking-tighter text-white uppercase italic leading-none mb-2.5 truncate">
                             {displayPlayerName(player.name, displayNames)}
                           </h2>
                           
                           <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                              <div>
                                 <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Base Price</span>
                                 <span className="text-sm font-black text-amber-400 font-mono">₹{formatMoney(player.basePrice).value} {formatMoney(player.basePrice).unit}</span>
                              </div>
                              <div className="border-l border-white/10 pl-2">
                                 <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Expected Mkt</span>
                                 <span className="text-sm font-black text-emerald-400 font-mono">₹{player.expectedValue} Cr</span>
                              </div>
                              <div className="border-l border-white/10 pl-2">
                                 <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Clutch Rating</span>
                                 <span className="text-sm font-black text-primary">{player.clutch || 80}/100</span>
                              </div>
                           </div>
                        </div>
                        
                        {/* CIRCULAR TIMER HUD */}
                        <div className="w-20 flex flex-col items-center justify-center shrink-0">
                           <div className="relative w-16 h-16">
                              <svg className="w-full h-full -rotate-90">
                                 <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-none" strokeWidth="4" />
                                 <motion.circle 
                                   cx="32" cy="32" r="28" 
                                   className={`fill-none ${state.timeLeft <= 3 ? 'stroke-red-500' : state.timeLeft <= 6 ? 'stroke-amber-400' : 'stroke-primary'}`}
                                   strokeWidth="4" 
                                   strokeDasharray="176"
                                   animate={{ strokeDashoffset: 176 - (176 * state.timeLeft / 12) }}
                                   transition={{ duration: 1, ease: "linear" }}
                                 />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                 <span className={`text-xl font-black leading-none font-mono ${state.timeLeft <= 3 ? 'text-red-500 animate-bounce' : 'text-white'}`}>
                                   {state.timeLeft}
                                 </span>
                                 <span className="text-[6px] font-black text-white/40 uppercase tracking-wider">SEC</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="h-32 flex flex-col items-center justify-center text-center py-4">
                      <Gavel className="w-8 h-8 text-white/10 mb-2 animate-pulse" />
                      <span className="text-xs font-black text-white/30 uppercase tracking-[0.3em]">Press "Start Auction Stage" to begin bidding</span>
                   </div>
                 )}
              </div>

              {/* HIGH-VISIBILITY PRIMARY BIDDING COMMAND CENTER */}
              {userTeam && (
                <div className="relative bg-gradient-to-r from-[#0E172A] via-[#0B1020] to-[#121B30] border-2 border-amber-400/60 rounded-[24px] p-4 flex flex-col gap-3 shadow-[0_0_30px_rgba(245,158,11,0.2)] shrink-0">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-center justify-center">
                            <TeamLogo team={userTeam.name} size="w-7 h-7" />
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-amber-400/90 uppercase tracking-widest block">Your Remaining Purse</span>
                            <span className="text-2xl font-black text-emerald-400 font-mono italic">₹{userTeam.purse.toFixed(2)} Cr</span>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold text-white/60">
                         <div>Squad: <span className="text-white font-black">{squadCount}/25</span></div>
                         <div>Overseas: <span className="text-white font-black">{overseasCount}/8</span></div>
                      </div>
                   </div>

                   {/* VIVID HIGH-CONTRAST BIDDING BUTTON & QUICK INCREMENT PILLS */}
                   <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-white/10">
                      {/* MAIN PROMINENT BID BUTTON */}
                      <button 
                        disabled={state.status !== "ACTIVE"}
                        onClick={() => placeBid(userTeam.id)}
                        className={`w-full sm:flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-400 via-amber-300 to-orange-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer border-2 border-amber-300
                           ${state.status !== "ACTIVE" ? 'opacity-40 grayscale pointer-events-none' : 'animate-pulse'}
                        `}
                      >
                         <Zap className="w-5 h-5 fill-current" />
                         <span>PLACE BID (+₹{formatMoney(state.currentBid || player?.basePrice || 200).unit})</span>
                      </button>

                      {/* QUICK INCREMENT PILLS */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                         {[
                           { label: "+20L", inc: 20 },
                           { label: "+50L", inc: 50 },
                           { label: "+1Cr", inc: 100 },
                           { label: "+2Cr", inc: 200 },
                         ].map(b => (
                           <button
                             key={b.label}
                             disabled={state.status !== "ACTIVE" || userTeam.purse < ((state.currentBid + b.inc) / 100)}
                             onClick={() => placeBid(userTeam.id, b.inc)}
                             className="flex-1 sm:flex-initial px-3 py-3 bg-white/10 hover:bg-amber-400/20 border border-white/20 hover:border-amber-400 text-white hover:text-amber-300 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-center"
                           >
                             {b.label}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {/* REDESIGNED AI MARKET VALUATION ADVISOR CARD */}
              <div className="bg-[#0B1020] border border-primary/25 rounded-[20px] p-3 flex items-center justify-between shrink-0 shadow-lg gap-3">
                 <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                       <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Market Valuation Advisor</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-[8px] font-black uppercase">
                            {player && player.clutch > 85 ? 'HIGH PRIORITY' : 'VALUABLE TARGET'}
                          </span>
                       </div>
                       <p className="text-[11px] text-white/90 font-medium leading-snug truncate">
                         {player 
                           ? `${player.name}: Projected Market Value ₹${player.expectedValue} Cr (+₹${(player.expectedValue - (player.basePrice/100)).toFixed(2)} Cr over base)`
                           : 'Awaiting next player on stage...'
                         }
                       </p>
                    </div>
                 </div>

                 {player && (
                   <div className="text-right shrink-0 border-l border-white/10 pl-3">
                      <span className="text-[8px] font-black text-white/40 uppercase block">Valuation Cap</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">₹{player.expectedValue} Cr</span>
                   </div>
                 )}
              </div>

              {/* OFFICIAL IPL RULES & REGULATIONS CHECKLIST */}
              {userTeam && (
                <div className="bg-[#0B1020] border border-amber-500/20 rounded-[20px] p-3 flex flex-col gap-2 shadow-xl shrink-0">
                   <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <div className="flex items-center gap-2">
                         <Shield className="w-3.5 h-3.5 text-amber-400" />
                         <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Official IPL Roster Compliance</span>
                      </div>
                      <div className="text-[8px] font-mono text-white/40">
                         Slabs: &lt;1Cr (+10L) • &lt;2Cr (+20L) • &lt;5Cr (+25L) • &lt;10Cr (+50L) • &gt;10Cr (+1Cr)
                      </div>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${
                        squadCount >= 18 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/70'
                      }`}>
                         <div>
                            <span className="text-[7px] font-black uppercase text-white/40 block">Squad (18-25)</span>
                            <span className="text-xs font-black">{squadCount} / 25</span>
                         </div>
                         {squadCount >= 18 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>

                      <div className={`p-2 rounded-xl border flex items-center justify-between ${
                        overseasCount >= 8 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/70'
                      }`}>
                         <div>
                            <span className="text-[7px] font-black uppercase text-white/40 block">Overseas (Max 8)</span>
                            <span className="text-xs font-black">{overseasCount} / 8</span>
                         </div>
                         {overseasCount < 8 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      </div>

                      <div className="p-2 rounded-xl border bg-white/5 border-white/10 text-white/70 flex items-center justify-between">
                         <div>
                            <span className="text-[7px] font-black uppercase text-white/40 block">RTM Cards</span>
                            <span className="text-xs font-black text-amber-400">{userTeam.rtmCards || 6} Left</span>
                         </div>
                         <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      </div>

                      <div className="p-2 rounded-xl border bg-white/5 border-white/10 text-white/70 flex items-center justify-between">
                         <div>
                            <span className="text-[7px] font-black uppercase text-white/40 block">Purse Reserve</span>
                            <span className="text-xs font-black text-emerald-400">₹{((Math.max(0, 18 - squadCount - 1) * 20) / 100).toFixed(2)} Cr</span>
                         </div>
                         <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                   </div>
                </div>
              )}

           </div>
           
           {/* RIGHT COLUMN: COMMAND CENTER TABS */}
           <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0 bg-[#0B1020] rounded-[28px] border border-white/10 overflow-hidden shadow-2xl">
              
              {/* TAB BAR (Unified with Website Architecture) */}
              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit shrink-0 m-3 mb-0">
                 {[
                    { id: "activity", icon: History, label: "Live Log", count: state.logs.length },
                    { id: "squad", icon: Trophy, label: "My Squad", count: userTeam?.squad.length || 0 },
                    { id: "players", icon: Users, label: "Player Pool", count: state.playerPool.length },
                    { id: "community", icon: MessageSquare, label: "Chat", count: state.chat.length }
                 ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        activeTab === tab.id 
                          ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                       <tab.icon className="w-3.5 h-3.5" />
                       <span>{tab.label}</span>
                       {tab.count > 0 && (
                         <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-mono ${
                           activeTab === tab.id ? 'bg-white text-black font-bold' : 'bg-white/10 text-white/40'
                         }`}>
                            {tab.count}
                         </span>
                       )}
                    </button>
                 ))}
              </div>

              {/* TAB CONTENT CONTAINER */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                 {/* LIVE ACTIVITY LOG */}
                 {activeTab === "activity" && (
                    <div className="flex flex-col gap-2.5">
                       {state.logs.map((log: any) => (
                          <div key={log.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                             log.type === 'sold' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                             log.type === 'unsold' ? 'bg-red-500/10 border-red-500/30' : 
                             'bg-white/5 border-white/10'
                          }`}>
                             <div className="flex items-center gap-2.5 min-w-0">
                                {log.type === 'sold' && <Gavel className="w-4 h-4 text-emerald-400 shrink-0" />}
                                {log.type === 'unsold' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                {log.type === 'bid' && <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
                                <p className="text-[11px] font-bold text-white leading-snug truncate">{log.msg}</p>
                             </div>
                             <span className="text-[9px] font-mono text-white/30 shrink-0">{log.time}</span>
                          </div>
                       ))}
                       {state.logs.length === 0 && (
                         <div className="text-center py-20 text-xs font-black text-white/20 uppercase tracking-widest">No auction logs yet</div>
                       )}
                    </div>
                 )}

                 {/* SQUAD TAB */}
                 {activeTab === "squad" && (
                    <div className="flex flex-col gap-2.5">
                       {userTeam?.squad.length > 0 ? (
                         userTeam.squad.map((p: any) => (
                           <div key={p.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-amber-400/40 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden shrink-0">
                                    <PlayerAvatar name={p.name} className="w-full h-full" imgClassName="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase">{displayPlayerName(p.name, displayNames)}</span>
                                    <span className="text-[9px] font-bold text-white/40 uppercase">{p.role} • {p.country}</span>
                                 </div>
                              </div>
                              <span className="text-xs font-black text-amber-400 font-mono italic">₹{p.salePrice.toFixed(2)} Cr</span>
                           </div>
                         ))
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                            <UserPlus className="w-10 h-10 mb-2" />
                            <span className="text-xs font-black uppercase tracking-widest">No Recruits in Squad Yet</span>
                         </div>
                       )}
                    </div>
                 )}

                 {/* PLAYER POOL TAB */}
                 {activeTab === "players" && (
                    <div className="flex flex-col gap-3">
                       {/* FILTER CONTROLS */}
                       <div className="flex flex-wrap gap-2">
                          <div className="relative flex-1 min-w-[140px]">
                             <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-white/40" />
                             <input 
                               type="text" 
                               placeholder="Search player..." 
                               value={playerSearch}
                               onChange={(e) => setPlayerSearch(e.target.value)}
                               className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                             />
                          </div>
                          <select 
                            value={roleFilter} 
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-[#080B16] text-white border border-white/10 rounded-xl px-2 py-1.5 text-xs font-bold"
                          >
                             <option value="ALL" className="bg-[#080B16]">All Roles</option>
                             <option value="Batsman" className="bg-[#080B16]">Batsmen</option>
                             <option value="Bowler" className="bg-[#080B16]">Bowlers</option>
                             <option value="All-rounder" className="bg-[#080B16]">All-rounders</option>
                             <option value="Wicketkeeper" className="bg-[#080B16]">Keepers</option>
                          </select>
                          <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-[#080B16] text-white border border-white/10 rounded-xl px-2 py-1.5 text-xs font-bold"
                          >
                             <option value="ALL" className="bg-[#080B16]">All Status</option>
                             <option value="POOL" className="bg-[#080B16]">In Pool</option>
                             <option value="SOLD" className="bg-[#080B16]">Sold</option>
                             <option value="UNSOLD" className="bg-[#080B16]">Unsold</option>
                          </select>
                       </div>

                       {/* LIST */}
                       <div className="flex flex-col gap-2">
                          {filteredPool.slice(0, 50).map((p: any) => (
                             <div key={p.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-black/40 overflow-hidden shrink-0">
                                      <PlayerAvatar name={p.name} className="w-full h-full" imgClassName="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[11px] font-black text-white uppercase leading-tight">{displayPlayerName(p.name, displayNames)}</span>
                                      <span className="text-[8px] font-bold text-white/30 uppercase">{p.role} • ₹{formatMoney(p.basePrice).value} {formatMoney(p.basePrice).unit} Base</span>
                                   </div>
                                </div>
                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                   p.status === 'SOLD' ? 'bg-emerald-500/20 text-emerald-400' :
                                   p.status === 'UNSOLD' ? 'bg-red-500/20 text-red-400' :
                                   'bg-amber-400/20 text-amber-300'
                                }`}>
                                   {p.status === 'SOLD' && p.boughtBy ? `${p.boughtBy} (₹${p.salePrice?.toFixed(2)}Cr)` : p.status}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* CHAT TAB */}
                 {activeTab === "community" && (
                    <div className="flex flex-col h-full">
                       <div className="flex-1 flex flex-col gap-3 mb-4">
                          {state.chat.map((c: any) => (
                             <div key={c.id} className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                   <TeamLogo team={c.team} size="w-4 h-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                   <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-amber-400 uppercase">{c.team} <span className="text-white/40 ml-1">@{c.user}</span></span>
                                      <span className="text-[8px] text-white/30">{c.time}</span>
                                   </div>
                                   <p className="text-xs text-white/80 leading-snug">{c.msg}</p>
                                </div>
                             </div>
                          ))}
                          {state.chat.length === 0 && (
                            <div className="text-center py-20 text-xs font-black text-white/20 uppercase tracking-widest">No chat messages yet</div>
                          )}
                       </div>
                    </div>
                 )}
              </div>

              {/* CHAT INPUT FORM */}
              {activeTab === "community" && (
                 <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 bg-white/[0.01] flex gap-2 shrink-0">
                    <input 
                      type="text" 
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      placeholder="Discuss strategy with franchise owners..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-400 transition-all text-white"
                    />
                    <button className="p-2.5 bg-amber-400 text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                       <ArrowUpRight className="w-4 h-4" />
                    </button>
                 </form>
              )}

           </div>

        </div>

      </div>
    </Layout>
  );
}
