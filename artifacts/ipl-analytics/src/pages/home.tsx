import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { Brain, Sparkles, ArrowRight, ArrowUpRight, MapPin, Flame, TrendingUp, ChevronLeft, ChevronRight, Activity, Trophy, Shield, ExternalLink, Play } from "lucide-react";
import { SmartFilters } from "@/components/smart-filters";
import { useTeamTheme } from "@/lib/team-context";
import {
  useLiveIplMatches, useLiveOrangeCap, useLiveTrending,
  getMatchScoreLine, getMatchStateColor, startTime
} from "@/lib/live";
import {
  useOverview, useSeasons, useTeams, useVenues, usePlayerImages,
  teamColor, teamShort, resolvePlayerImage
} from "@/lib/aggregates";
import { TeamLogo } from "@/components/team-logo";
import { AdVessel } from "@/components/ad-vessel";

const SEASON_DATA: Record<string, { stats: { label: string; value: string; sub: string }[]; caps: { label: string; player: string; team: string; value: string; unit: string; color: string; img: string }[] }> = {
  "2026": {
    stats: [
      { label: "Matches", value: "74", sub: "Completed" },
      { label: "Runs", value: "18,542", sub: "This Season" },
      { label: "High Score", value: "277/3", sub: "Sunrisers" },
      { label: "Sixes", value: "1,234", sub: "This Season" },
      { label: "Wickets", value: "1,089", sub: "This Season" },
    ],
    caps: [
      { label: "Orange Cap", player: "Virat Kohli", team: "RCB", value: "890", unit: "Runs", color: "#F9CD05", img: "/virat kohli.jpg" },
      { label: "Purple Cap", player: "Bhuvneshwar Kumar", team: "SRH", value: "32", unit: "Wickets", color: "#8B5CF6", img: "/bhuvaneswar kumar.jpg" },
      { label: "Most Sixes", player: "Abhishek Sharma", team: "SRH", value: "45", unit: "Sixes", color: "#F97316", img: "/abhisek sharma.jpg" },
      { label: "Best Economy", player: "Jasprit Bumrah", team: "MI", value: "6.45", unit: "Economy", color: "#3B82F6", img: "/bumrah.jpg" },
    ],
  },
  "2025": {
    stats: [
      { label: "Matches", value: "70", sub: "Completed" },
      { label: "Runs", value: "17,890", sub: "This Season" },
      { label: "High Score", value: "265/4", sub: "CSK" },
      { label: "Sixes", value: "1,189", sub: "This Season" },
      { label: "Wickets", value: "1,040", sub: "This Season" },
    ],
    caps: [
      { label: "Orange Cap", player: "Virat Kohli", team: "RCB", value: "741", unit: "Runs", color: "#F9CD05", img: "/virat kohli.jpg" },
      { label: "Purple Cap", player: "Bhuvneshwar Kumar", team: "SRH", value: "28", unit: "Wickets", color: "#8B5CF6", img: "/bhuvaneswar kumar.jpg" },
      { label: "Most Sixes", player: "Abhishek Sharma", team: "SRH", value: "38", unit: "Sixes", color: "#F97316", img: "/abhisek sharma.jpg" },
      { label: "Best Economy", player: "Jasprit Bumrah", team: "MI", value: "6.82", unit: "Economy", color: "#3B82F6", img: "/bumrah.jpg" },
    ],
  },
  "2024": {
    stats: [
      { label: "Matches", value: "68", sub: "Completed" },
      { label: "Runs", value: "16,980", sub: "This Season" },
      { label: "High Score", value: "257/6", sub: "MI" },
      { label: "Sixes", value: "1,102", sub: "This Season" },
      { label: "Wickets", value: "980", sub: "This Season" },
    ],
    caps: [
      { label: "Orange Cap", player: "Virat Kohli", team: "RCB", value: "661", unit: "Runs", color: "#F9CD05", img: "/virat kohli.jpg" },
      { label: "Purple Cap", player: "Mayank Yadav", team: "LSG", value: "24", unit: "Wickets", color: "#8B5CF6", img: "/mayank yadav.jpg" },
      { label: "Most Sixes", player: "Abhishek Sharma", team: "SRH", value: "31", unit: "Sixes", color: "#F97316", img: "/abhisek sharma.jpg" },
      { label: "Best Economy", player: "Jasprit Bumrah", team: "MI", value: "6.97", unit: "Economy", color: "#3B82F6", img: "/bumrah.jpg" },
    ],
  },
};

const TEAMS = ["All Teams", "MI", "CSK", "RCB", "KKR", "SRH", "DC", "GT", "LSG", "PBKS", "RR"];

const TRENDING = [
  { title: "Dhoni finishes in style again", mentions: "12.4K+" },
  { title: "RCB breaks chase record", mentions: "9.8K+" },
  { title: "Youngsters lighting up IPL 2026", mentions: "8.1K+" },
  { title: "Impact Player rule debate", mentions: "5.3K+" },
];

const VENUES = [
  { name: "Chepauk", pct: 76, color: "bg-yellow-400" },
  { name: "Eden Gardens", pct: 68, color: "bg-yellow-400" },
  { name: "Wankhede", pct: 64, color: "bg-blue-400" },
  { name: "Chinnaswamy", pct: 58, color: "bg-blue-400" },
  { name: "Narendra Modi", pct: 51, color: "bg-green-400" },
];

const INSIGHTS = [
  { img: "/csk insight.jpg", tag: "Business", title: "Why CSK Builds Better Teams", color: "#F9CD05", date: "May 18, 2025", read: "8 min" },
  { img: "/mayank yadav.jpg", tag: "Product", title: "IPL is not Cricket, It's a Product", color: "#8B5CF6", date: "May 15, 2025", read: "6 min" },
  { img: "/ipl media.jpg", tag: "Analytics", title: "The Undervalued XI of IPL 2025", color: "#3B82F6", date: "May 12, 2025", read: "7 min" },
];

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const { selectedTeam } = useTeamTheme();
  const [capIdx, setCapIdx] = useState(0);
  const [selYear, setSelYear] = useState("2026");

  // Live Data Hooks
  const liveMatches = useLiveIplMatches();
  const liveOrangeCap = useLiveOrangeCap();
  const liveTrending = useLiveTrending();
  const venuesData = useVenues();
  const playerImages = usePlayerImages();

  const seasonData = SEASON_DATA[selYear];
  // Sync live orange cap if available and season is 2026
  const CAPS = (selYear === "2026" && liveOrangeCap.data && liveOrangeCap.data.length > 0)
    ? liveOrangeCap.data.map((c: any) => ({
      label: c.type || "Orange Cap",
      player: c.player,
      team: c.team,
      value: String(c.runs || c.wickets || c.value),
      unit: c.runs ? "Runs" : c.wickets ? "Wickets" : "Value",
      color: c.runs ? "#F9CD05" : "#8B5CF6",
      img: playerImages.data ? resolvePlayerImage(c.player, playerImages.data) : (c.image || "/virat kohli.jpg")
    }))
    : seasonData.caps.map(c => ({
      ...c,
      img: playerImages.data ? resolvePlayerImage(c.player, playerImages.data) : c.img
    }));

  const STATS = seasonData.stats;
  const cap = CAPS[Math.min(capIdx, CAPS.length - 1)] || CAPS[0];

  // Live Match for Hero/Next Match Card
  const activeMatch = liveMatches.data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state))
    || liveMatches.data?.matches?.[0];

  const TRENDS = liveTrending.data && liveTrending.data.length > 0
    ? liveTrending.data.slice(0, 4)
    : TRENDING;

  const headerProgress = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  // Diagonal scale: whole canvas compresses proportionally at final scroll
  const masterScale = useTransform(scrollYProgress, [0.6, 1, 1], [1, 0.93, 0.93]);

  const heroH = useTransform(scrollYProgress, [0, 0.35, 1], ["100%", "36%", "36%"]);
  const heroW = useTransform(scrollYProgress, [0, 0.18, 0.4, 1], ["100%", "100%", "calc(100% - 540px)", "calc(100% - 540px)"]);
  // Col2 and Col3 expand from 0 to their final widths — hero (flex-1) naturally yields space
  const col2W = useTransform(scrollYProgress, [0.18, 0.4, 1], ["0px", "240px", "240px"]);
  const col3W = useTransform(scrollYProgress, [0.18, 0.4, 1], ["0px", "300px", "300px"]);
  const titleSz = useTransform(scrollYProgress, [0, 0.3, 1], ["72px", "24px", "24px"]);
  const padTop = useTransform(scrollYProgress, [0, 0.3, 1], ["10%", "5%", "5%"]);
  const padLeft = useTransform(scrollYProgress, [0, 0.3, 1], ["6%", "5%", "5%"]);
  const subtitleOp = useTransform(scrollYProgress, [0, 0.22, 0.8, 1], [1, 0, 0, 0]);
  const ctaOp = useTransform(scrollYProgress, [0, 0.25, 0.8, 1], [1, 0, 0, 0]);
  const titleOp = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0]);
  const bannerOp = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 1]);

  // Dynamic Caption logic
  const [scrollCaption, setScrollCaption] = useState("IPL IS NOT JUST ABOUT CRICKET.");
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.08) setScrollCaption("IPL IS NOT JUST ABOUT CRICKET.");
    else if (v < 0.16) setScrollCaption("IT'S A PRODUCT.");
    else if (v < 0.24) setScrollCaption("A BUSINESS.");
    else if (v < 0.32) setScrollCaption("IPL - A FESTIVAL.");
    else if (v < 0.4) setScrollCaption("AN EMOTION.");
    else if (v < 0.48) setScrollCaption("A CELEBRATION.");
    else setScrollCaption("A BILLION DOLLAR ECOSYSTEM.");
  });

  const r1Op = useTransform(scrollYProgress, [0.2, 0.42, 1], [0, 1, 1]);
  const r1X = useTransform(scrollYProgress, [0.2, 0.42, 1], [20, 0, 0]);
  const r2Op = useTransform(scrollYProgress, [0.35, 0.58, 1], [0, 1, 1]);
  const r2Y = useTransform(scrollYProgress, [0.35, 0.58, 1], [60, 0, 0]);
  const r3Op = useTransform(scrollYProgress, [0.56, 0.8, 1], [0, 1, 1]);
  const r3Y = useTransform(scrollYProgress, [0.56, 0.8, 1], [80, 0, 0]);

  return (
    <Layout hideHeaderProgress={headerProgress} hideRightPanel>
      {/* Top Telemetry / Broadcast Strip — Place directly above Hero Banner */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-3 pb-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.12)]">
          {/* Left: Stream / Match Telemetry */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Official Broadcast
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-white font-medium">Grand Final: GT vs RCB</span>
              <span className="hidden sm:inline text-slate-500 mx-2">|</span>
              <span className="hidden sm:inline text-slate-400">4K Ultra HD · Multi-Cam Telemetry</span>
            </div>
          </div>

          {/* Right: Watch Action Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <a
              href="https://www.hotstar.com/in/sports/cricket/tournaments/indian-premier-league/1271507153"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Watch Live on Hotstar</span>
            </a>
          </div>
        </div>
      </div>

      <div style={{ height: "320vh" }}>
        <motion.div
          style={{ scale: masterScale, transformOrigin: "center top" }}
          className="sticky top-0 w-full h-screen flex flex-col gap-2.5 overflow-hidden bg-[#050816] p-2.5 pb-0"
        >

          {/* ROW 1 */}
          <motion.div style={{ height: heroH }} className="flex gap-2.5 shrink-0 min-h-0">
            {/* HERO */}
            <motion.div style={{ width: heroW }} className="relative bg-[#050816] rounded-[24px] border border-white/10 overflow-hidden shrink-0 group flex">
              {/* IMAGE SIDE (RIGHT) */}
              <div className="absolute inset-0 flex justify-end">
                <motion.div 
                  style={{ opacity: bannerOp }}
                  className="w-[60%] h-full relative"
                >
                  <motion.img 
                    src="/TITLE BANNER.png" 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-[12s]" 
                    alt="IPL" 
                  />
                  {/* Seamless blending gradients */}
                  <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#050816] to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050816]/80 via-transparent to-transparent" />
                </motion.div>
              </div>

              {/* TEXT CONTENT (LEFT) */}
              <motion.div style={{ paddingTop: padTop, paddingLeft: padLeft, opacity: titleOp }} className="relative z-10 h-full flex flex-col w-[45%]">
                <motion.h1 style={{ fontSize: titleSz }} className="font-black leading-[1.05] text-white uppercase tracking-tight mb-4 origin-left">
                  {scrollCaption === "IPL IS NOT JUST ABOUT CRICKET." ? (
                    <><span className="animate-ipl-glow">IPL</span><span className="opacity-15"> IS NOT JUST ABOUT</span> <br /><span className="text-[#F9CD05]">CRICKET.</span></>
                  ) : scrollCaption === "IT'S A PRODUCT." ? (
                    <><span className="opacity-15">IT'S A </span><span className="text-[#06B6D4]">PRODUCT.</span></>
                  ) : scrollCaption === "A BUSINESS." ? (
                    <><span className="opacity-15">A </span><span className="text-[#10B981]">BUSINESS.</span></>
                  ) : scrollCaption === "IPL - A FESTIVAL." ? (
                    <><span className="opacity-15">A </span><span className="text-[#FF0000]">FESTIVAL.</span></>
                  ) : scrollCaption === "AN EMOTION." ? (
                    <><span className="opacity-15">AN </span><span className="text-[#6366F1]">EMOTION.</span></>
                  ) : scrollCaption === "A CELEBRATION." ? (
                    <><span className="opacity-15">A </span><span className="text-[#0077FF]">CELEBRATION.</span></>
                  ) : (
                    <><span className="opacity-15">A </span><span className="text-[#D946EF]">BILLION DOLLAR ECOSYSTEM.</span></>
                  )}
                </motion.h1>
                <motion.p className="text-white/50 text-[13px] max-w-[420px] mb-7">Data-driven insights across sports, business, fans and the IPL economy.</motion.p>
                <motion.div style={{ opacity: ctaOp }} className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={selectedTeam ? `/dugout/${selectedTeam}` : "/dugout"}>
                      <button className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[12px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer">
                        <Shield className="w-4 h-4 text-black fill-black/20" />
                        {selectedTeam ? `My ${selectedTeam} Dugout` : "Enter Fan Dugout"}
                      </button>
                    </Link>
                    <Link href="/intelligence">
                      <button className="flex items-center gap-2 bg-primary text-white font-black text-[12px] uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all hover:scale-105 cursor-pointer">Explore Insights <ArrowRight className="w-4 h-4" /></button>
                    </Link>
                    <Link href="/feed">
                      <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-white font-black text-[12px] uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-white/10 transition-all hover:scale-105 cursor-pointer">Feed <Activity className="w-4 h-4" /></button>
                    </Link>
                    <Link href="/arena">
                      <button className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:text-white hover:bg-amber-400/20 font-black text-[12px] uppercase tracking-wider px-4 py-3 rounded-xl transition-all hover:scale-105 cursor-pointer">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        Beyond XI
                      </button>
                    </Link>
                  </div>
                </motion.div>

              </motion.div>
            </motion.div>

            {/* UPCOMING MATCH — no fake scores */}
            {/* LIVE / UPCOMING MATCH */}
            {(() => {
              const seasonConcluded = !activeMatch && !liveMatches.isLoading;
              return (
            <Link href={activeMatch ? `/match/${activeMatch.matchInfo.matchId}` : seasonConcluded ? "/teams/royal-challengers-bengaluru" : "#"} className="flex-1 min-w-0">
              <motion.div style={{ opacity: r1Op, x: r1X }} className="h-full bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-col overflow-hidden shadow-2xl hover:border-primary/40 transition-all cursor-pointer group/match">
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeMatch && /progress/i.test(activeMatch.matchInfo.state) ? 'bg-red-500 animate-pulse' : seasonConcluded ? 'bg-[#F9CD05]' : 'bg-amber-400'}`} />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover/match:text-primary transition-colors">
                      {activeMatch && /progress/i.test(activeMatch.matchInfo.state) ? 'Live Match' : seasonConcluded ? 'Season Complete' : 'Next Match'}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/40 font-bold uppercase">
                    {activeMatch?.matchInfo.seriesName || 'IPL 2026'} · {seasonConcluded ? 'Final' : (activeMatch?.matchInfo.matchDesc || 'Match')}
                  </span>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-4 justify-center">
                  {activeMatch ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <TeamLogo team={activeMatch.matchInfo.team1.teamSName} />
                          <span className="text-[12px] font-black text-white uppercase tracking-tighter">{activeMatch.matchInfo.team1.teamSName}</span>
                          {/progress/i.test(activeMatch.matchInfo.state) && (
                            <span className="text-[12px] font-black text-primary">{getMatchScoreLine(activeMatch).team1}</span>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[11px] font-black text-white/20">VS</span>
                          <div className={`px-3 py-1 rounded-full ${/progress/i.test(activeMatch.matchInfo.state) ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-400/20 border-amber-400/30'}`}>
                            <span className={`text-[8px] font-black uppercase ${/progress/i.test(activeMatch.matchInfo.state) ? 'text-red-500' : 'text-amber-400'}`}>
                              {/progress/i.test(activeMatch.matchInfo.state) ? 'Live' : 'Upcoming'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <TeamLogo team={activeMatch.matchInfo.team2.teamSName} />
                          <span className="text-[12px] font-black text-white uppercase tracking-tighter">{activeMatch.matchInfo.team2.teamSName}</span>
                          {/progress/i.test(activeMatch.matchInfo.state) && (
                            <span className="text-[12px] font-black text-primary">{getMatchScoreLine(activeMatch).team2}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 text-center group-hover/match:bg-primary/5 transition-colors">
                        {/progress|innings/i.test(activeMatch.matchInfo.state) ? (
                          <div className="space-y-2">
                            <p className="text-[14px] font-black text-white leading-tight">{activeMatch.matchInfo.status}</p>
                            {activeMatch.scorecard && (
                              <div className="flex justify-center gap-4 mt-2">
                                {activeMatch.scorecard[activeMatch.matchInfo.currBatTeamId === activeMatch.matchInfo.team1.teamId ? 0 : 1]?.batting.slice(0, 2).map((b, i) => (
                                  <div key={i} className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">{b.name.split(' ').pop()}</span>
                                    <span className="text-[11px] font-black text-white">{b.runs}({b.balls})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Starts In</p>
                            <p className="text-[20px] font-black text-amber-400 tracking-tight">{startTime(activeMatch.matchInfo.startDate)}</p>
                          </>
                        )}
                        <p className="text-[9px] text-white/30 font-bold mt-1">{activeMatch.matchInfo.venueInfo?.ground || 'Stadium'} · {activeMatch.matchInfo.venueInfo?.city || 'India'}</p>
                      </div>
                    </>
                  ) : seasonConcluded ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <TeamLogo team="RCB" />
                          <span className="text-[12px] font-black text-white uppercase tracking-tighter">RCB</span>
                          <span className="text-[10px] font-black text-[#F9CD05]">Won</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#F9CD05]" />
                          <div className="px-3 py-1 rounded-full bg-[#F9CD05]/20 border border-[#F9CD05]/30">
                            <span className="text-[8px] font-black uppercase text-[#F9CD05]">Champions</span>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1.5">
                          <TeamLogo team="GT" />
                          <span className="text-[12px] font-black text-white uppercase tracking-tighter">GT</span>
                          <span className="text-[10px] font-black text-white/30">Runner-up</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 text-center group-hover/match:bg-primary/5 transition-colors">
                        <p className="text-[14px] font-black text-white leading-tight">Royal Challengers Bengaluru win IPL 2026</p>
                        <p className="text-[9px] text-white/30 font-bold mt-1">Narendra Modi Stadium · Ahmedabad</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-white/30 text-[10px]">Loading live match data...</div>
                  )}
                </div>
              </motion.div>
            </Link>
              );
            })()}

            {/* AI ANALYST */}
            <motion.div style={{ opacity: r1Op, x: r1X }} className="flex-1 bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-col overflow-hidden shadow-2xl min-w-0 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-900/10 pointer-events-none" />
              <div className="p-2.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-10">
                <div className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-primary" /><span className="text-[10px] font-black text-white uppercase tracking-widest">AI Analyst</span></div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[8px] font-bold text-green-400">Online</span></div>
              </div>
              <div className="flex-1 p-2 flex flex-col gap-1 relative z-10 overflow-hidden min-h-0">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0"><p className="text-[9px] text-white font-bold">🔥 Hi! What would you like to analyze today?</p></div>
                {["Why CSK wins more while chasing?", "Show me top death over batsmen", "Which venue is best for spinners?", "Compare MI vs CSK in playoffs"].map((q, i) => (
                  <button key={i} className="text-left px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-primary/10 transition-all text-[9px] text-white/60 hover:text-white shrink-0 leading-tight">{q}</button>
                ))}
                <div className="mt-auto flex gap-1.5 shrink-0">
                  <input placeholder="Ask anything about IPL..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white placeholder:text-white/30 outline-none" />
                  <button className="w-7 h-7 shrink-0 rounded-lg bg-primary flex items-center justify-center"><ArrowRight className="w-3.5 h-3.5 text-white" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ROWS 2+3: Two-column — LEFT stacked, RIGHT = tall venue heatmap */}
          <div className="flex gap-2.5 flex-1 min-h-0">

            {/* LEFT COLUMN: Row2 + Row3 stacked */}
            <div className="flex-1 flex flex-col gap-2.5 min-h-0">

              {/* ROW 2: Stats+Filter | Cap Slider | Trending */}
              <motion.div style={{ opacity: r2Op, y: r2Y }} className="flex gap-2.5 shrink-0">
                <Link href="/stats" className="flex-1 min-w-0">
                  <div className="bg-[#0B1020] rounded-[20px] border border-white/10 p-4 flex flex-col gap-4 h-full shadow-xl relative z-40 hover:border-primary/40 transition-all cursor-pointer group/slice">
                    <SmartFilters onApply={(f) => {
                      if (f.season) setSelYear(f.season);
                    }} />
                    {/* Stats row */}
                    <div className="flex items-center gap-5 pt-1 border-t border-white/5">
                      {STATS.map((s, i) => (
                        <div key={i} className="flex flex-col shrink-0">
                          <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">{s.label}</span>
                          <span className="text-[20px] font-black text-white leading-none tracking-tighter group-hover/slice:text-primary transition-colors">{s.value}</span>
                          <span className="text-[8px] text-white/30 font-bold uppercase">{s.sub}</span>
                        </div>
                      ))}
                      <div className="ml-auto">
                        <ArrowUpRight className="w-3.5 h-3.5 text-white/10 group-hover/slice:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* CAP SLIDER — year-reactive */}
                <Link href="/stats" className="shrink-0">
                  <div className="relative w-[190px] h-full bg-[#0B1020] rounded-[20px] border border-white/10 overflow-hidden shadow-2xl group/cap cursor-pointer hover:border-primary/40 transition-all">
                    <AnimatePresence mode="wait">
                      <motion.div key={`${selYear}-${capIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                        <img src={cap.img} alt={cap.player} className="w-full h-full object-cover object-top" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/30 to-transparent" />
                      </motion.div>
                    </AnimatePresence>
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                      <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: cap.color }}>● {cap.label}</span>
                      <div className="font-black text-white text-[13px] leading-tight group-hover/cap:text-primary transition-colors">{cap.player}</div>
                      <div className="text-[9px] text-white/40 font-bold uppercase mb-0.5">{cap.team} · {selYear}</div>
                      <span className="text-[26px] font-black leading-none tracking-tighter" style={{ color: cap.color }}>{cap.value}</span>
                      <span className="text-[9px] text-white/40 font-bold uppercase ml-1">{cap.unit}</span>
                    </div>
                    {/* Navigation buttons — stopPropagation to allow link clicks elsewhere */}
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCapIdx((capIdx - 1 + CAPS.length) % CAPS.length); }} 
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/90"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCapIdx((capIdx + 1) % CAPS.length); }} 
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/90"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="absolute bottom-2 right-3 flex gap-1 z-20">
                      {CAPS.map((_, i) => <div key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCapIdx(i); }} className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${i === capIdx ? 'bg-white scale-125' : 'bg-white/30'}`} />)}
                    </div>
                  </div>
                </Link>

                {/* TRENDING */}
                <div className="w-[220px] shrink-0 bg-[#0B1020] rounded-[20px] border border-white/10 flex flex-col overflow-hidden shadow-2xl p-3">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-orange-400" /><span className="text-[10px] font-black text-white uppercase tracking-widest">Trending</span></div>
                    <button className="text-[9px] font-bold text-primary">View All</button>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                    {TRENDS.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 shrink-0">
                        <Flame className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                        <div><p className="text-[10px] font-black text-white leading-tight">{t.title || t} 🔥</p><p className="text-[8px] text-white/40 font-bold">{t.mentions || 'Trending'} mentions</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* ROW 3: 3 Insight Cards */}
              <motion.div style={{ opacity: r3Op, y: r3Y }} className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">Insights That Matter</span>
                  </div>
                  <Link href="/shop" className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1 hover:underline">
                    <span>🃏 Shop Intelligence Cards →</span>
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-h-0">
                  {/* Card 1: CSK */}
                  <Link href="/intelligence" className="h-full">
                    <div className="bg-[#0B1020] rounded-[18px] border border-white/10 overflow-hidden flex flex-col group hover:border-primary/30 transition-all cursor-pointer min-w-0 shadow-xl h-full">
                      <div className="relative shrink-0 overflow-hidden" style={{ height: "70%" }}>
                        <img
                          src={INSIGHTS[0].img}
                          alt={INSIGHTS[0].title}
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-1000"
                          style={{ opacity: 0.95 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent" />
                        <div
                          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-black"
                          style={{ backgroundColor: INSIGHTS[0].color }}
                        >{INSIGHTS[0].tag}</div>
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-center border-t border-white/5 bg-white/[0.01]">
                        <p className="font-black text-[10px] leading-tight text-white/90 uppercase group-hover:text-primary transition-colors line-clamp-2 mb-1 tracking-tight">{INSIGHTS[0].title}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] text-white/30 font-bold">{INSIGHTS[0].date}</p>
                          <p className="text-[8px] text-primary font-black uppercase tracking-widest">{INSIGHTS[0].read} READ</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Card 2: Product */}
                  <Link href="/intelligence" className="h-full">
                    <div className="bg-[#0B1020] rounded-[18px] border border-white/10 overflow-hidden flex flex-col group hover:border-primary/30 transition-all cursor-pointer min-w-0 shadow-xl h-full">
                      <div className="relative shrink-0 overflow-hidden" style={{ height: "70%" }}>
                        <img
                          src={INSIGHTS[1].img}
                          alt={INSIGHTS[1].title}
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-1000"
                          style={{ opacity: 0.95 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent" />
                        <div
                          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-black"
                          style={{ backgroundColor: INSIGHTS[1].color }}
                        >{INSIGHTS[1].tag}</div>
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-center border-t border-white/5 bg-white/[0.01]">
                        <p className="font-black text-[10px] leading-tight text-white/90 uppercase group-hover:text-primary transition-colors line-clamp-2 mb-1 tracking-tight">{INSIGHTS[1].title}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] text-white/30 font-bold">{INSIGHTS[1].date}</p>
                          <p className="text-[8px] text-primary font-black uppercase tracking-widest">{INSIGHTS[1].read} READ</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Card 3: In-Feed Native Display Unit (Between editorial cards) */}
                  <div className="h-full">
                    <AdVessel slot="3847561029" format="in-feed" label="SPONSORED" className="h-full" />
                  </div>

                  {/* Card 4: Analytics Undervalued XI */}
                  <Link href="/intelligence" className="h-full">
                    <div className="bg-[#0B1020] rounded-[18px] border border-white/10 overflow-hidden flex flex-col group hover:border-primary/30 transition-all cursor-pointer min-w-0 shadow-xl h-full">
                      <div className="relative shrink-0 overflow-hidden" style={{ height: "70%" }}>
                        <img
                          src={INSIGHTS[2].img}
                          alt={INSIGHTS[2].title}
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-all duration-1000"
                          style={{ opacity: 0.95 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent" />
                        <div
                          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-black"
                          style={{ backgroundColor: INSIGHTS[2].color }}
                        >{INSIGHTS[2].tag}</div>
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-center border-t border-white/5 bg-white/[0.01]">
                        <p className="font-black text-[10px] leading-tight text-white/90 uppercase group-hover:text-primary transition-colors line-clamp-2 mb-1 tracking-tight">{INSIGHTS[2].title}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-[8px] text-white/30 font-bold">{INSIGHTS[2].date}</p>
                          <p className="text-[8px] text-primary font-black uppercase tracking-widest">{INSIGHTS[2].read} READ</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </motion.div>

            </div>{/* end LEFT COLUMN */}

            {/* RIGHT COLUMN: Venue Heatmap — tall, spans both rows */}
            <motion.div style={{ opacity: r2Op, y: r2Y }} className="w-[300px] shrink-0 bg-[#0B1020] rounded-[20px] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
              <div className="p-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Venue Heatmap</span>
                </div>
                <span className="text-[9px] text-white/30 font-bold">Spin vs Pace Dominance · IPL Grounds</span>
              </div>
              {/* Venue heatmap image — filled to fit grid perfectly */}
              <div className="relative mx-1 mt-1 rounded-xl overflow-hidden bg-black/40 flex-1 flex items-center justify-center border border-white/5 shadow-inner">
                <img
                  src="/venue.png"
                  alt="Venue Heatmap"
                  className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
                  style={{
                    filter: 'contrast(1.1) brightness(0.9) saturate(1.2)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1020] via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-white/10 text-[8px] font-bold text-white/60 uppercase tracking-widest">Global Density</div>
              </div>
              {/* Venue bars */}
              <div className="flex-1 px-3 py-2 flex flex-col justify-around overflow-hidden">
                {(() => {
                  const uniqueVenues = new Map();
                  (venuesData.data || VENUES).forEach((v: any) => {
                    const name = v.name || v.venue;
                    if (!uniqueVenues.has(name)) uniqueVenues.set(name, v);
                  });
                  return Array.from(uniqueVenues.values()).slice(0, 5);
                })().map((v: any, i: number) => {
                  const pct = v.pct || Math.round((v.matches / 100) * 100) || 50;
                  const color = v.color || (pct > 70 ? "bg-yellow-400" : pct > 50 ? "bg-blue-400" : "bg-green-400");
                  const name = v.name || v.venue || "Stadium";
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] font-black text-white truncate max-w-[180px]">{name}</span>
                        <span className="text-[9px] font-bold text-white/50">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, delay: i * 0.12 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 pb-2 flex justify-between border-t border-white/5 pt-1.5">
                <span className="text-[8px] text-white/30 font-bold">← Most Spin</span>
                <span className="text-[8px] text-white/30 font-bold">Most Pace →</span>
              </div>
            </motion.div>

          </div>{/* end ROWS 2+3 wrapper */}

        </motion.div>
      </div>
    </Layout>
  );
}

