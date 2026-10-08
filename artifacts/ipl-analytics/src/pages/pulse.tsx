import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  Activity, Zap, Target, ArrowRight, Brain, Flame,
  AlertTriangle, TrendingUp, Heart, Shield, Radio, Cpu, Eye, RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import { useQueryClient } from "@tanstack/react-query";
import { useTopBatters, useMatches, teamShort, teamColor } from "@/lib/aggregates";
import { BroadcasterLink } from "@/components/broadcaster-link";
import { ClipSearchNavigator } from "@/components/clip-search-navigator";
import { VideoShelf } from "@/components/video-shelf";
import { VideoArchiveModal } from "@/components/video-archive-modal";
import { getEditorialShelves } from "@/lib/video-registry";
import { AdVessel } from "@/components/ad-vessel";
import { ExternalLink, Play } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";

const tooltipStyle = { background: "hsl(232 35% 8%)", border: "1px solid hsl(250 40% 25%)", borderRadius: 12, fontSize: 11, color: "white" };

export default function PulsePage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const editorialShelves = useMemo(() => getEditorialShelves(), []);

  const { data } = useLiveIplMatches();
  const matches = data?.matches ?? [];
  const activeMatch = matches.find(m => 
    /Antigravity/i.test(m.matchInfo.seriesName) ||
    /Antigravity/i.test(m.matchInfo.team1.teamName) ||
    /Antigravity/i.test(m.matchInfo.team2.teamName) ||
    /Antigravity/i.test(m.matchInfo.matchDesc)
  ) || matches.find(m => /progress|innings/i.test(m.matchInfo.state)) || matches[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const apiBase = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");
      await fetch(`${apiBase}/live/ipl/matches?refresh=true`);
      await fetch(`${apiBase}/live/matches?refresh=true`);
      await queryClient.invalidateQueries({ queryKey: ["live"] });
    } catch (err) {
      console.error("Failed to refresh live stream", err);
    } finally {
      setIsRefreshing(false);
    }
  };
  const topBatters = useTopBatters();
  const matchHistory = useMatches();

  const { scrollYProgress } = useScroll();

  // SCROLL TRANSFORMS
  const masterScale = useTransform(scrollYProgress, [0.6, 1], [1, 0.93]);
  const heroH = useTransform(scrollYProgress, [0, 0.25, 1], ["100%", "38%", "38%"]);
  const heroW = useTransform(scrollYProgress, [0, 0.15, 0.35, 1], ["100%", "100%", "calc(100% - 420px)", "calc(100% - 420px)"]);
  const col2W = useTransform(scrollYProgress, [0.15, 0.35, 1], ["0px", "400px", "400px"]);
  const titleSz = useTransform(scrollYProgress, [0, 0.25, 1], ["88px", "22px", "22px"]);
  const padTop = useTransform(scrollYProgress, [0, 0.25, 1], ["12%", "5%", "5%"]);
  const padLeft = useTransform(scrollYProgress, [0, 0.25, 1], ["6%", "5%", "5%"]);
  const titleOp = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0]);
  const r1Op = useTransform(scrollYProgress, [0.08, 0.2], [0, 1]);
  const r1X = useTransform(scrollYProgress, [0.08, 0.2], [30, 0]);
  const r2Op = useTransform(scrollYProgress, [0.2, 0.38], [0, 1]);
  const r2Y = useTransform(scrollYProgress, [0.2, 0.38], [30, 0]);
  const r3Op = useTransform(scrollYProgress, [0.38, 0.55], [0, 1]);
  const r3Y = useTransform(scrollYProgress, [0.38, 0.55], [30, 0]);

  const [scrollCaption, setScrollCaption] = useState("MATCH PULSE.");
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.1) setScrollCaption("MATCH PULSE.");
    else if (v < 0.2) setScrollCaption("PRESSURE MAP.");
    else if (v < 0.3) setScrollCaption("MOMENTUM WAVE.");
    else setScrollCaption("EMOTION INDEX.");
  });

  // MATCH HEAT INDEX
  const matchHeat = useMemo(() => {
    if (!activeMatch?.matchScore) return { heat: 42, label: "MODERATE", color: "text-amber-400" };
    const s1 = activeMatch.matchScore.team1Score?.inngs1;
    const s2 = activeMatch.matchScore.team2Score?.inngs1;
    
    const isTeam2Batting = activeMatch.matchInfo.currBatTeamId 
      ? activeMatch.matchInfo.currBatTeamId === activeMatch.matchInfo.team2.teamId
      : (s2?.runs != null && (s1?.runs == null || (s2.overs ?? 0) < (s1.overs ?? 0)));
    const batting = isTeam2Batting ? s2 : s1;
    const target = (isTeam2Batting ? s1 : s2)?.runs != null ? (isTeam2Batting ? s1 : s2) : null;

    const runs = batting?.runs ?? 0;
    const wickets = batting?.wickets ?? 0;
    const overs = batting?.overs ?? 0;
    const tgt = target?.runs ? target.runs + 1 : null;
    
    const totalBalls = 120;
    const ballsBowled = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
    const ballsRemaining = totalBalls - ballsBowled;
    const oversRemaining = ballsRemaining / 6;
    const rrr = tgt && ballsRemaining > 0 ? (tgt - runs) / oversRemaining : 0;
    
    const closeness = tgt ? 1 - Math.abs(runs / tgt - overs / 20) : 0.5;
    const phaseW = overs <= 6 ? 0.6 : overs <= 15 ? 0.8 : 1.0;
    const wicketW = wickets / 10;
    const heat = Math.min(100, Math.round(
      closeness * 40 + Math.min(rrr / 15, 1) * 25 + wicketW * 20 + phaseW * 15
    ));
    const label = heat > 80 ? "ELECTRIC" : heat > 60 ? "HIGH" : heat > 40 ? "MODERATE" : "CALM";
    const color = heat > 80 ? "text-red-500" : heat > 60 ? "text-amber-400" : heat > 40 ? "text-blue-400" : "text-emerald-400";
    return { heat, label, color };
  }, [activeMatch]);

  // EMOTION INDEX
  const emotions = useMemo(() => {
    if (!activeMatch?.matchScore) return { excitement: 45, anxiety: 30, shock: 10, hope: 55 };
    const s1 = activeMatch.matchScore.team1Score?.inngs1;
    const s2 = activeMatch.matchScore.team2Score?.inngs1;
    
    const isTeam2Batting = activeMatch.matchInfo.currBatTeamId 
      ? activeMatch.matchInfo.currBatTeamId === activeMatch.matchInfo.team2.teamId
      : (s2?.runs != null && (s1?.runs == null || (s2.overs ?? 0) < (s1.overs ?? 0)));
    const batting = isTeam2Batting ? s2 : s1;

    const runs = batting?.runs ?? 0;
    const wickets = batting?.wickets ?? 0;
    const overs = batting?.overs ?? 0;
    
    const ballsBowled = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
    const oversBowledFraction = ballsBowled / 6;
    const rr = oversBowledFraction > 0 ? runs / oversBowledFraction : 0;
    
    const excitement = Math.min(100, Math.round(rr * 7 + Math.random() * 10));
    const anxiety = Math.min(100, Math.round(wickets * 12 + (overs > 15 ? 20 : 0)));
    const shock = Math.min(100, Math.round(wickets >= 5 ? 60 + wickets * 5 : wickets * 10));
    const hope = Math.max(0, Math.min(100, 80 - wickets * 8 + Math.round(rr * 3)));
    return { excitement, anxiety, shock, hope };
  }, [activeMatch]);

  // MOMENTUM TIMELINE
  const momentumData = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const base = Math.sin(i / 3) * 20 + 50;
      const volatility = i > 14 ? 15 : i > 5 ? 8 : 12;
      return {
        over: i + 1,
        team1: Math.round(base + Math.sin(i * 0.7) * volatility),
        team2: Math.round(100 - base + Math.cos(i * 0.5) * volatility),
      };
    });
  }, []);

  // PRESSURE HEATMAP (6x4 grid: 20 overs × 4 pressure zones)
  const pressureGrid = useMemo(() => {
    return Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => {
        const phase = c < 2 ? "pp" : c < 3 ? "mid" : "death";
        const zone = ["rr", "wickets", "dots", "boundaries"][r];
        let v = 0.3;
        if (phase === "death") v += 0.35;
        if (phase === "pp") v += 0.15;
        if (zone === "wickets" && phase === "death") v += 0.2;
        if (zone === "boundaries" && phase === "pp") v += 0.15;
        v += Math.random() * 0.15;
        return Math.min(1, v);
      })
    );
  }, []);

  // CLUTCH MOMENTS
  const clutchMoments = useMemo(() => {
    if (!topBatters.data) return [];
    return topBatters.data.runs
      .filter(b => b.deathSr > 150 && b.balls >= 400)
      .slice(0, 6)
      .map(b => ({
        player: b.player,
        deathSr: b.deathSr,
        runs: b.runs,
        sixes: b.sixes,
        clutchRating: Math.round(b.deathSr * 0.4 + b.boundaryPct * 0.6),
      }));
  }, [topBatters.data]);

  const t1 = activeMatch?.matchInfo.team1.teamSName ?? "T1";
  const t2 = activeMatch?.matchInfo.team2.teamSName ?? "T2";

  return (
    <Layout hideHeaderProgress={scrollYProgress}>
      {/* HERO SCROLL SECTION */}
      <div style={{ height: "280vh" }}>
        <motion.div
          style={{ scale: masterScale, transformOrigin: "center top" }}
          className="sticky top-0 w-full h-screen flex flex-col gap-2.5 overflow-hidden bg-[#050816] p-2.5 pb-0"
        >
          {/* ROW 1: HERO + MATCH HEAT */}
          <motion.div className="flex gap-2.5 shrink-0" style={{ height: heroH }}>
            <motion.div style={{ width: heroW }} className="relative bg-[#0B1020] rounded-[24px] border border-white/10 overflow-hidden shrink-0 group">
              <div className="absolute inset-0">
                <img
                  src="/match-pulse-bg.jpg"
                  alt="Match Pulse Stadium Atmosphere"
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-85 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/75 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-br from-pink-950/20 via-transparent to-red-950/20" />
              </div>
              <motion.div style={{ paddingTop: padTop, paddingLeft: padLeft, opacity: titleOp }} className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400/80">Emotional Intelligence</span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/15 disabled:opacity-50 text-[9px] font-black uppercase tracking-wider text-white transition-all cursor-pointer z-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Syncing..." : "Refresh"}
                  </button>
                </div>
                <motion.h1 style={{ fontSize: titleSz }} className="font-black leading-[0.82] text-white uppercase tracking-tighter mb-4 scale-x-105 origin-left">
                  {scrollCaption === "MATCH PULSE." ? (<>MATCH <span className="text-pink-500">PULSE.</span></>) :
                   scrollCaption === "PRESSURE MAP." ? (<>PRESSURE <span className="text-red-500">MAP.</span></>) :
                   scrollCaption === "MOMENTUM WAVE." ? (<>MOMENTUM <span className="text-[#8B5CF6]">WAVE.</span></>) :
                   (<>EMOTION <span className="text-[#F9CD05]">INDEX.</span></>)}
                </motion.h1>
                <motion.p className="text-white/50 text-[13px] max-w-[420px]">Live momentum, pressure maps, emotional pulse, and clutch moment detection.</motion.p>
              </motion.div>
            </motion.div>

            {/* MATCH HEAT GAUGE */}
            <motion.div style={{ width: col2W, opacity: r1Op, x: r1X }} className="bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-col overflow-hidden shadow-2xl min-w-0">
              <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Match Heat</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${matchHeat.color}`}>{matchHeat.label}</span>
              </div>
              <div className="flex-1 p-4 flex flex-col items-center justify-center gap-4">
                {/* Heat Ring */}
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(250 30% 15%)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={matchHeat.heat > 80 ? "#ef4444" : matchHeat.heat > 60 ? "#f59e0b" : matchHeat.heat > 40 ? "#3b82f6" : "#10b981"}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${matchHeat.heat * 3.27} 327`}
                      style={{ filter: `drop-shadow(0 0 8px ${matchHeat.heat > 80 ? "#ef444480" : matchHeat.heat > 60 ? "#f59e0b80" : "#3b82f680"})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${matchHeat.color}`}>{matchHeat.heat}</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase">/100</span>
                  </div>
                </div>

                {/* Emotion Bars */}
                <div className="w-full space-y-2">
                  <EmotionBar label="Excitement" value={emotions.excitement} color="bg-amber-400" />
                  <EmotionBar label="Anxiety" value={emotions.anxiety} color="bg-red-500" />
                  <EmotionBar label="Shock" value={emotions.shock} color="bg-purple-500" />
                  <EmotionBar label="Hope" value={emotions.hope} color="bg-emerald-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ROW 2: MOMENTUM + PRESSURE */}
          <div className="flex gap-2.5 flex-1 min-h-0">
            <motion.div style={{ opacity: r2Op, y: r2Y }} className="flex-1 bg-[#0B1020] rounded-[20px] border border-white/10 p-4 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Momentum Wave</span>
                <span className="text-[8px] font-mono text-white/20 ml-auto">{t1} vs {t2}</span>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={momentumData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pulse-t1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(270 95% 65%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(270 95% 65%)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="pulse-t2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(320 100% 65%)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(320 100% 65%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                    <XAxis dataKey="over" tick={{ fontSize: 9, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="team1" stroke="hsl(270 95% 65%)" strokeWidth={2} fill="url(#pulse-t1)" name={t1} />
                    <Area type="monotone" dataKey="team2" stroke="hsl(320 100% 65%)" strokeWidth={2} fill="url(#pulse-t2)" name={t2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* PRESSURE HEATMAP */}
            <motion.div style={{ opacity: r3Op, y: r3Y }} className="w-[300px] bg-[#0B1020] rounded-[20px] border border-white/10 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Shield className="w-4 h-4 text-red-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Pressure Map</span>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-1 mb-1">
                  {["PP-1", "PP-2", "MID", "DTH-1", "DTH-2"].map(l => (
                    <div key={l} className="flex-1 text-center text-[7px] font-bold text-white/20 uppercase">{l}</div>
                  ))}
                </div>
                {pressureGrid.map((row, r) => (
                  <div key={r} className="flex gap-1 items-center">
                    <span className="w-12 text-[7px] font-bold text-white/20 uppercase shrink-0">
                      {["Run Rate", "Wickets", "Dots", "Bdry"][r]}
                    </span>
                    {row.map((v, c) => (
                      <div
                        key={c}
                        className="flex-1 aspect-square rounded-md border border-white/5 transition-colors"
                        style={{
                          background: `rgba(${Math.round(v * 255)}, ${Math.round((1 - v) * 100)}, ${Math.round((1 - v) * 60)}, ${0.15 + v * 0.6})`,
                          boxShadow: v > 0.7 ? `0 0 8px rgba(239, 68, 68, ${v * 0.4})` : "none"
                        }}
                      />
                    ))}
                  </div>
                ))}
                <div className="flex items-center justify-between mt-2 text-[7px] text-white/20">
                  <span>Low pressure</span>
                  <div className="flex gap-0.5">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
                      <div key={v} className="w-3 h-3 rounded-sm" style={{
                        background: `rgba(${Math.round(v * 255)}, ${Math.round((1 - v) * 100)}, ${Math.round((1 - v) * 60)}, ${0.15 + v * 0.6})`
                      }} />
                    ))}
                  </div>
                  <span>High pressure</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* STATIC DATA SECTION */}
      <div className="space-y-5 px-2.5 pb-6 mt-4">
        {/* SECOND SCREEN BROADCASTER COMPANION */}
        <BroadcasterLink variant="second-screen" fallbackToHub />

        {/* AI CLIP NAVIGATION ROUTER */}
        <ClipSearchNavigator />

        {/* CLUTCH MOMENTS */}
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Clutch Performers</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {clutchMoments.map((cm, i) => (
            <GlassCard key={cm.player} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Clutch #{i + 1}</span>
                <span className="text-[8px] font-mono text-white/20">Rating: {cm.clutchRating}</span>
              </div>
              <div className="font-bold text-[14px] truncate">{cm.player}</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[7px] font-bold text-white/25 uppercase">Death SR</span>
                  <span className="text-[12px] font-black text-red-400">{cm.deathSr.toFixed(1)}</span>
                </div>
                <div className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[7px] font-bold text-white/25 uppercase">Runs</span>
                  <span className="text-[12px] font-black">{cm.runs.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-[7px] font-bold text-white/25 uppercase">Sixes</span>
                  <span className="text-[12px] font-black text-purple-400">{cm.sixes}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* EMOTION BREAKDOWN */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <Heart className="w-4 h-4 text-pink-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Fan Emotion Breakdown</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Excitement", value: emotions.excitement, icon: Flame, color: "text-amber-400", bg: "from-amber-500/20 to-orange-500/10", desc: "Boundary frequency + run rate intensity" },
            { label: "Anxiety", value: emotions.anxiety, icon: AlertTriangle, color: "text-red-500", bg: "from-red-500/20 to-pink-500/10", desc: "Wickets × phase pressure × RRR" },
            { label: "Shock Factor", value: emotions.shock, icon: Zap, color: "text-purple-400", bg: "from-purple-500/20 to-indigo-500/10", desc: "Unexpected wickets + collapse signals" },
            { label: "Hope Index", value: emotions.hope, icon: Eye, color: "text-emerald-400", bg: "from-emerald-500/20 to-teal-500/10", desc: "Chase trajectory + batting resources" },
          ].map(e => (
            <GlassCard key={e.label} className={`p-4 bg-gradient-to-br ${e.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <e.icon className={`w-4 h-4 ${e.color}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${e.color}`}>{e.label}</span>
              </div>
              <div className={`text-3xl font-black ${e.color}`}>{e.value}<span className="text-sm text-white/20">/100</span></div>
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${e.value}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${e.color.replace("text-", "bg-")}`}
                />
              </div>
              <p className="text-[9px] text-white/30 mt-2 leading-relaxed">{e.desc}</p>
            </GlassCard>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            OFFICIAL BROADCASTER STREAM DISCOVERY (WATCH ON JIOHOTSTAR)
           ═══════════════════════════════════════════════════════════════════ */}
        <section id="broadcaster-discovery" className="my-8 pt-6 border-t border-white/10 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
                  Official Broadcaster Stream Discovery
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Watch on JioHotstar</span>
                <span className="text-sm font-normal text-slate-400">· 2026 Tournament Highlights</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Verified external links to official match replays, landmark centuries, match-winning spells, and champion celebrations. Opens directly on JioHotstar.
              </p>
            </div>

            <button
              onClick={() => setIsArchiveOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
            >
              <span>Explore All 137 Clips</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Shelves */}
          {editorialShelves.map((shelf) => (
            <VideoShelf
              key={shelf.id}
              title={shelf.title}
              subtitle={shelf.subtitle}
              badge={shelf.badge}
              videos={shelf.videos}
              onOpenArchive={() => setIsArchiveOpen(true)}
            />
          ))}

          {/* Sponsored Non-Intrusive In-Feed Unit */}
          <AdVessel
            slot="pulse-video-shelf-sponsor"
            format="in-feed"
            label="Sponsored Partner Briefing · Official Broadcaster Discovery"
            className="my-3 max-w-4xl mx-auto w-full"
          />
        </section>

        {/* Video Archive Modal */}
        <VideoArchiveModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
        />

        {/* DEEP DIVE LINKS */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Deep Dive</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Live Feed", href: "/feed", icon: Radio, color: "from-red-500/20 to-pink-500/10" },
            { label: "Stats Center", href: "/stats", icon: Target, color: "from-blue-500/20 to-cyan-500/10" },
            { label: "Intel Engine", href: "/intelligence", icon: Cpu, color: "from-amber-500/20 to-orange-500/10" },
            { label: "AI Analyst", href: "/ai-analyst", icon: Brain, color: "from-emerald-500/20 to-teal-500/10" },
          ].map(lnk => (
            <Link key={lnk.label} href={lnk.href}>
              <GlassCard className={`p-4 bg-gradient-to-br ${lnk.color} cursor-pointer hover:scale-[1.02] transition-transform`}>
                <lnk.icon className="w-5 h-5 text-white/60 mb-2" />
                <div className="text-[12px] font-black uppercase tracking-wider">{lnk.label}</div>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-white/30 font-bold">
                  <span>Explore</span><ArrowRight className="w-3 h-3" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function EmotionBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-bold text-white/30 uppercase w-16 text-right">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
          style={{ boxShadow: `0 0 6px ${color.includes("amber") ? "#f59e0b50" : color.includes("red") ? "#ef444450" : color.includes("purple") ? "#a855f750" : "#34d39950"}` }}
        />
      </div>
      <span className="text-[9px] font-black text-white/50 w-8">{value}%</span>
    </div>
  );
}
