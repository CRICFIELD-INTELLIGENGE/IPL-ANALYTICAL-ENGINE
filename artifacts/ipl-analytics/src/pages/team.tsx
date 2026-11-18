import React, { useState, useMemo, useContext, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { MobileChromeContext } from "@/mobile/gate";
import { GlassCard } from "@/components/glass-card";
import { TeamSquad } from "@/components/team-squad";
import {
  ArrowLeft, ArrowRight, Users, Activity, Calendar, Trophy,
  TrendingUp, Shield, Target, Medal, BarChart2, ListFilter, Check, X, Layers
} from "lucide-react";
import {
  useTeams, useMatches, teamColor, teamShort, usePointsTables,
} from "@/lib/aggregates";
import { resolveTeamCode, TEAM_CODE_TO_SLUG } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { TeamAnalyticsDashboard } from "@/components/team-analytics-dashboard";
import { TeamIntelPanel } from "@/components/decision/intel-panels";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, AreaChart, Area
} from "recharts";

const PERF_INDEX_SECTIONS = [
  { id: "1", num: "01", label: "Season Win %", sub: "Win rate trend by year" },
  { id: "2", num: "02", label: "Extremes & Runs", sub: "Highest, lowest & run tally" },
  { id: "3", num: "03", label: "Phase Breakdown", sub: "Powerplay, Middle & Death" },
  { id: "4", num: "04", label: "Phase Profile", sub: "Boundary vs dot % radar" },
  { id: "5", num: "05", label: "Toss Impact", sub: "Won vs lost toss win %" },
  { id: "6", num: "06", label: "Conditions", sub: "Bat 1st, chasing, home/away" },
  { id: "7", num: "07", label: "Pace vs Spin", sub: "Bowling attack returns" },
  { id: "8", num: "08", label: "Clutch & Collapse", sub: "Tight finishes & clusters" },
  { id: "9", num: "09", label: "Venue Record", sub: "Win % across grounds" },
  { id: "10", num: "10", label: "Captaincy", sub: "Skippers record & titles" },
  { id: "11", num: "11", label: "Head to Head", sub: "Rival records & last 5" },
] as const;

export default function TeamProfilePage() {
  const [, params] = useRoute("/teams/:slug");
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();

  const teams = useTeams();
  const matches = useMatches();
  const pointsTables = usePointsTables();

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "squad" | "history">("overview");
  const [mobileSection, setMobileSection] = useState<string>("all");
  const [indexOpen, setIndexOpen] = useState(false);
  const perfTopRef = useRef<HTMLDivElement>(null);

  const selectMobileSection = (id: string) => {
    setMobileSection(id);
    setIndexOpen(false);
    requestAnimationFrame(() => {
      const el = perfTopRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 64;
      if (window.scrollY > top) {
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    });
  };

  // Find the exact matching team from the slug
  /**
   * Resolves the URL slug to a franchise.
   *
   * Every step must identify one team. The previous version ended with
   * `|| teams.data[0]`, so an unrecognised slug silently rendered whichever
   * franchise happened to be first in the file — complete with its record —
   * instead of reporting that the team was not found. It also matched on the
   * first word alone, which cannot separate the two Gujarat or two Pune sides.
   */
  const teamData = useMemo(() => {
    if (!teams.data || !slug) return null;
    const wanted = slug.toLowerCase().replace(/-/g, " ").trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

    const exact = teams.data.find(t => norm(t.team) === wanted);
    if (exact) return exact;

    const bySlug = teams.data.filter(t => norm(t.team).replace(/ /g, "-") === slug.toLowerCase());
    if (bySlug.length === 1) return bySlug[0];

    const contains = teams.data.filter(t => norm(t.team).includes(wanted));
    return contains.length === 1 ? contains[0] : null;
  }, [teams.data, slug]);

  const teamMatches = useMemo(() => {
    if (!matches.data || !teamData) return [];
    return matches.data
      .filter(m => m.team1 === teamData.team || m.team2 === teamData.team)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20); // Last 20 matches
  }, [matches.data, teamData]);


  /**
   * Season-by-season record, computed from every match the side played.
   *
   * This chart previously plotted `winPct + Math.sin(i) * 15` over six
   * hard-coded years — an invented curve, not the franchise's results.
   *
   * Matches are the basis rather than the league table because the headline
   * "all-time win rate" counts playoffs and finals, and a league-stage-only
   * chart would quietly disagree with it. Summing these seasons reproduces the
   * header exactly (Chennai: 266 played, 148 won, 55.6%).
   *
   * League position still comes from the standings, since a finishing place
   * only exists there.
   */
  const seasonTrendData = useMemo(() => {
    if (!matches.data || !teamData) return [];
    const bySeason = new Map<string, { played: number; wins: number }>();
    for (const m of matches.data) {
      if (m.team1 !== teamData.team && m.team2 !== teamData.team) continue;
      const key = String(m.season);
      const rec = bySeason.get(key) ?? { played: 0, wins: 0 };
      rec.played += 1;
      if (m.winner === teamData.team) rec.wins += 1;
      bySeason.set(key, rec);
    }
    return Array.from(bySeason.entries())
      .map(([season, rec]) => ({
        season: Number(season),
        played: rec.played,
        wins: rec.wins,
        winPct: rec.played ? Math.round((rec.wins / rec.played) * 1000) / 10 : 0,
        position: pointsTables.data?.[season]?.find(r => r.team === teamData.team)?.position ?? null,
      }))
      .sort((a, b) => a.season - b.season);
  }, [matches.data, pointsTables.data, teamData]);

  const bestFinish = useMemo(() => {
    const places = seasonTrendData.map(s => s.position).filter((p): p is number => p != null);
    return places.length ? Math.min(...places) : null;
  }, [seasonTrendData]);

  if (teams.isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-primary">Loading Franchise Intelligence...</span>
        </div>
      </Layout>
    );
  }

  // An unresolvable slug is reported rather than silently rendering whichever
  // franchise happened to be first in the file.
  if (!teamData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white/60">Franchise not found.</span>
          <button
            onClick={() => setLocation("/stats")}
            className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Back to Stats Center
          </button>
        </div>
      </Layout>
    );
  }

  const teamCode = resolveTeamCode(slug) ?? (teamData ? resolveTeamCode(teamData.team) : null);
  const dugoutSlug = (teamCode && TEAM_CODE_TO_SLUG[teamCode]) ? TEAM_CODE_TO_SLUG[teamCode] : slug;
  const mobileShell = useContext(MobileChromeContext);

  const pColor = teamColor(teamData.team);
  const pShort = teamShort(teamData.team);

  return (
    <Layout>
      <div className={`max-w-7xl mx-auto animate-fade-in overflow-x-clip ${mobileShell ? "space-y-4 pb-8 px-3 pt-2" : "space-y-6 pb-12 px-4"}`}>
        
        {/* HEADER NAVIGATION */}
        {!mobileShell && (
          <div className="flex items-center justify-between shrink-0">
            <Link href="/stats">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4 text-primary" />
                Back to stats center
              </button>
            </Link>

            <div className="flex items-center gap-3">
              <Link href={`/dugout/${dugoutSlug}`}>
                <button 
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all hover:scale-105 cursor-pointer shadow-md"
                  style={{ backgroundColor: `${pColor}15`, borderColor: `${pColor}40`, color: pColor }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>My {pShort} Dugout</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: pColor }} />
            </div>
          </div>
        )}

        {/* HERO CINEMATIC HEADER */}
        <div className="rounded-[16px] overflow-hidden" style={{ borderLeft: `4px solid ${pColor}` }}>
          <GlassCard className="p-3.5 sm:p-6 relative overflow-hidden group">
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-1000" style={{ backgroundColor: pColor }} />
            
            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 md:items-center relative z-10">
              <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                {/* Franchise crest — compact on mobile, full card on desktop */}
                <div
                  className="w-16 h-16 sm:w-28 sm:h-28 md:w-40 md:h-40 rounded-2xl sm:rounded-[28px] border-2 shrink-0 shadow-xl flex flex-col items-center justify-center gap-0.5 sm:gap-2 relative overflow-hidden"
                  style={{ borderColor: `${pColor}40`, background: `linear-gradient(135deg, ${pColor}20, transparent)` }}
                >
                  <TeamLogo team={teamData.team} size="w-9 h-9 sm:w-16 sm:h-16 md:w-24 md:h-24" />
                  <span className="text-[10px] sm:text-base md:text-xl font-black uppercase tracking-widest relative z-10 leading-none" style={{ color: pColor }}>
                    {pShort}
                  </span>
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                </div>

                {/* Profile Summary Column */}
                <div className="flex-1 min-w-0 text-left space-y-1.5 sm:space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/80 flex items-center gap-1">
                      <Medal className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: pColor }} />
                      IPL Franchise
                    </span>
                    {teamData.titles > 0 && (
                      <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {teamData.titles}x Champ
                      </span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight text-white leading-tight truncate">
                      {teamData.team}
                    </h1>
                    <p className="text-[11px] sm:text-sm font-bold text-white/50 tracking-wide uppercase mt-0.5">
                      All-Time Win Rate: {teamData.winPct.toFixed(1)}%
                    </p>
                  </div>

                  {/* Direct Dugout Navigation Action (desktop inline; mobile below) */}
                  <div className="hidden md:flex pt-1 items-center gap-3">
                    <Link href={`/dugout/${dugoutSlug}`}>
                      <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all border shadow-lg hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: `${pColor}20`, borderColor: `${pColor}50`, color: pColor }}
                      >
                        <Shield className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider leading-none">
                          Enter {pShort} Dugout Headquarters
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Mobile Dugout CTA bar */}
              <Link href={`/dugout/${dugoutSlug}`} className="md:hidden w-full">
                <button
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all border shadow-md cursor-pointer"
                  style={{ backgroundColor: `${pColor}18`, borderColor: `${pColor}45`, color: pColor }}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10.5px] font-black uppercase tracking-wider leading-none">
                    Enter {pShort} Dugout HQ
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </Link>

              {/* High-fidelity Highlights Banner */}
              <div className="grid grid-cols-4 md:grid-cols-2 gap-1.5 sm:gap-3 w-full md:w-[320px] shrink-0">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 leading-tight">Matches</span>
                  <span className="text-sm sm:text-2xl font-black text-white mt-0.5 sm:mt-1 tabular-nums">{teamData.matches}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 leading-tight">Wins</span>
                  <span className="text-sm sm:text-2xl font-black mt-0.5 sm:mt-1 tabular-nums" style={{ color: pColor }}>{teamData.wins}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 leading-tight">Bat SR</span>
                  <span className="text-sm sm:text-2xl font-black text-white/80 mt-0.5 sm:mt-1 tabular-nums">{teamData.battingSr.toFixed(1)}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 leading-tight">Econ</span>
                  <span className="text-sm sm:text-2xl font-black text-white/80 mt-0.5 sm:mt-1 tabular-nums">{teamData.bowlingEcon.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* SQUAD DNA (Decision Intelligence) — latest season on record */}
        <TeamIntelPanel team={teamData.team} />

        {/* SUB TAB BAR */}
        <div
          ref={perfTopRef}
          data-testid="team-profile-subtabs"
          className="grid grid-cols-4 sm:flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 w-full sm:w-fit shadow-sm dark:shadow-none"
        >
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              activeSubTab === "overview"
                ? "text-slate-900 dark:text-white bg-white dark:bg-white/10 shadow-sm dark:shadow-none"
                : "text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
            }`}
            style={activeSubTab === "overview" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}25, transparent)` } : {}}
          >
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-widest leading-none truncate">
              Perf<span className="hidden sm:inline">ormance</span>
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab("squad")}
            className={`px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              activeSubTab === "squad"
                ? "text-slate-900 dark:text-white bg-white dark:bg-white/10 shadow-sm dark:shadow-none"
                : "text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
            }`}
            style={activeSubTab === "squad" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}25, transparent)` } : {}}
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-widest leading-none truncate">
              <span className="hidden sm:inline">Current </span>Squad
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              activeSubTab === "history"
                ? "text-slate-900 dark:text-white bg-white dark:bg-white/10 shadow-sm dark:shadow-none"
                : "text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
            }`}
            style={activeSubTab === "history" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}25, transparent)` } : {}}
          >
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-widest leading-none truncate">
              <span className="hidden sm:inline">Match </span>History
            </span>
          </button>
          <Link href={`/dugout/${dugoutSlug}`} className="min-w-0 flex">
            <button className="w-full px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer whitespace-nowrap min-w-0">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color: pColor }} />
              <span className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-widest leading-none truncate">
                Dugout<span className="hidden sm:inline"> HQ</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 dark:text-white/40 shrink-0 hidden sm:inline" />
            </button>
          </Link>
        </div>

        {/* PROFILE CONTENT AREA */}
        {/* No AnimatePresence/exit: an exiting child stays mounted until its
            exit animation finishes, so when frames stall the previous tab never
            unmounts and two tabs render at once — clicking Current Squad left
            the Performance panel on screen. Keying the div still animates in. */}
        <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            
            {activeSubTab === "overview" && (() => {
              const showAllMobile = !mobileShell || mobileSection === "all";
              const showOverview1 = showAllMobile || mobileSection === "1";
              const showOverview2 = showAllMobile || mobileSection === "2";

              return (
              <div className="space-y-3.5 sm:space-y-6">
              {(showOverview1 || showOverview2) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Win Rate Trend Chart */}
                {showOverview1 && (
                <GlassCard className="lg:col-span-2 p-4 sm:p-6">
                  <div className="mb-4 sm:mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 shrink-0" style={{ color: pColor }} />
                        Season-by-Season Win Percentage
                      </h3>
                      <p className="text-[10px] text-white/40 font-bold mt-0.5">All matches including playoffs — same basis as the all-time rate above</p>
                    </div>
                    {seasonTrendData.length > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Seasons</div>
                          <div className="text-[15px] font-black text-white">{seasonTrendData.length}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Best Finish</div>
                          <div className="text-[15px] font-black" style={{ color: pColor }}>
                            {bestFinish ? `#${bestFinish}` : "—"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="h-[190px] sm:h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seasonTrendData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="teamChartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={pColor} stopOpacity={0.6}/>
                            <stop offset="95%" stopColor={pColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="season" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0A0D1A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="winPct" 
                          name="Win %" 
                          stroke={pColor} 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#teamChartGlow)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                )}

                {/* Extremes & Records */}
                {showOverview2 && (
                <div className="space-y-3.5 sm:space-y-6">
                  <GlassCard className="p-3.5 sm:p-6">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/80 mb-2.5 sm:mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 shrink-0" style={{ color: pColor }} />
                      Record Extremes
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3">
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2.5 sm:p-4 rounded-xl border border-white/5">
                        <span className="text-[11px] sm:text-xs font-bold text-white/60">Highest Total</span>
                        <span className="text-base sm:text-xl font-black text-white tabular-nums">{teamData.highest}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2.5 sm:p-4 rounded-xl border border-white/5">
                        <span className="text-[11px] sm:text-xs font-bold text-white/60">Lowest Total</span>
                        <span className="text-base sm:text-xl font-black text-white/50 tabular-nums">{teamData.lowest || "-"}</span>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-3.5 sm:p-6">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/80 mb-2.5 sm:mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 shrink-0" style={{ color: pColor }} />
                      Net Run Accumulation
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-white/50 mb-1 uppercase">
                          <span>Runs Scored</span>
                          <span>{teamData.runsScored.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: '85%', backgroundColor: pColor }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-white/50 mb-1 uppercase">
                          <span>Runs Conceded</span>
                          <span>{teamData.runsConceded.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-white/20" style={{ width: '78%' }} />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
                )}
              </div>
              )}
                {/* Analyst dashboard: phase, toss, venue, rivalry and clutch
                    breakdowns computed from the ball-by-ball tables. */}
                {(showAllMobile || Number(mobileSection) >= 3) && (
                  <TeamAnalyticsDashboard
                    team={teamData.team}
                    accent={pColor}
                    matches={matches.data ?? []}
                  />
                )}
              </div>
              );
            })()}

            {activeSubTab === "squad" && <TeamSquad franchise={teamData.team} accent={pColor} />}

            {activeSubTab === "history" && (
              <GlassCard className="p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-6 flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: pColor }} />
                  Recent Franchise Matches
                </h3>
                
                <div className="space-y-3">
                  {teamMatches.length > 0 ? (
                    teamMatches.map(match => {
                      const isTeam1 = match.team1 === teamData.team;
                      const isWinner = match.winner === teamData.team;
                      const hasResult = !!match.winner;
                      
                      return (
                      /* Each row opens that match's scorecard. */
                      <div
                        key={match.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => setLocation(`/match/${match.id}`)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setLocation(`/match/${match.id}`);
                          }
                        }}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] transition-all group relative overflow-hidden cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30"
                      >
                        {/* Result Indicator border */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasResult ? (isWinner ? "bg-emerald-500" : "bg-red-500") : "bg-white/20"}`} />
                        
                        <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0 mb-3 md:mb-0 pl-2 sm:pl-3">
                          {/* Date Block */}
                          <div className="flex flex-col text-center w-12 sm:w-16 shrink-0 border-r border-white/10 pr-2.5 sm:pr-4">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-white/40">{new Date(match.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-lg sm:text-xl font-black text-white">{new Date(match.date).getDate()}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-white/40">{new Date(match.date).getFullYear()}</span>
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                            <div className="flex flex-col items-end flex-1 min-w-0">
                              <span className={`text-[11px] sm:text-xs md:text-sm font-bold line-clamp-1 text-right w-full truncate ${isTeam1 ? "text-white" : "text-white/60"}`}>{match.team1}</span>
                              <span className="text-[9.5px] sm:text-[10px] font-black text-white/40 truncate">{match.team1Score || "-"}</span>
                            </div>
                            
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <span className="text-[8px] sm:text-[9px] font-black text-white/50">VS</span>
                            </div>
                            
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className={`text-[11px] sm:text-xs md:text-sm font-bold line-clamp-1 w-full truncate ${!isTeam1 ? "text-white" : "text-white/60"}`}>{match.team2}</span>
                              <span className="text-[9.5px] sm:text-[10px] font-black text-white/40 truncate">{match.team2Score || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Result Block */}
                        <div className="flex flex-col items-end pl-0 md:pl-6 shrink-0 w-full md:w-48">
                          {hasResult ? (
                            <>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isWinner ? "text-emerald-500" : "text-red-500"}`}>
                                {isWinner ? "Victory" : "Defeat"}
                              </span>
                              <span className="text-xs font-bold text-white text-right line-clamp-1">by {match.margin}</span>
                              <span className="text-[10px] font-medium text-white/40 text-right mt-1">{match.venue}</span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-white/60">No Result</span>
                          )}
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/25 group-hover:text-primary transition-colors mt-1 flex items-center gap-1">
                            Scorecard <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    )})
                  ) : (
                    <div className="text-center py-12">
                      <span className="text-sm font-bold text-white/40">No match history available for this team.</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

          </motion.div>
      </div>

      {/* Floating Assistive Index FAB & Fanned Circle Menu (Mobile Performance Tab) */}
      {mobileShell && activeSubTab === "overview" && (
        <>
          <AnimatePresence>
            {indexOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onClick={() => setIndexOpen(false)}
                className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-[58]"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {indexOpen && (
              <motion.div
                data-testid="perf-index-menu"
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="fixed right-3.5 bottom-[158px] z-[60] max-h-[62vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col items-end gap-2 py-1 pr-0.5 max-w-[calc(100vw-28px)]"
              >
                {PERF_INDEX_SECTIONS.map((sec, idx) => {
                  const selected = mobileSection === sec.id;
                  const arcOffset = Math.round(Math.sin((idx / Math.max(1, PERF_INDEX_SECTIONS.length - 1)) * Math.PI) * 14);
                  return (
                    <motion.button
                      key={sec.id}
                      type="button"
                      data-testid={`perf-index-option-${sec.id}`}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.14, delay: Math.min(0.16, (PERF_INDEX_SECTIONS.length - idx) * 0.012) }}
                      onClick={() => selectMobileSection(sec.id)}
                      style={{ marginRight: `${arcOffset}px` }}
                      className="flex items-center gap-2.5 cursor-pointer group shrink-0"
                    >
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-lg border transition-all whitespace-nowrap ${
                          selected
                            ? "bg-white text-slate-950 border-white"
                            : "bg-[#0B1222]/95 text-white border-white/15 group-hover:border-white/35"
                        }`}
                      >
                        {sec.label}
                      </span>
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xl border-2 transition-transform group-active:scale-95"
                        style={
                          selected
                            ? { backgroundColor: pColor, borderColor: "#ffffff", color: "#050816" }
                            : { backgroundColor: "#ffffff", borderColor: "rgba(255,255,255,0.85)", color: "#0f172a" }
                        }
                      >
                        {selected ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] font-mono font-black leading-none">{sec.num}</span>
                        )}
                      </span>
                    </motion.button>
                  );
                })}

                {/* Show All 11 option anchored nearest the floating button */}
                <button
                  type="button"
                  data-testid="perf-index-option-all"
                  onClick={() => selectMobileSection("all")}
                  className="flex items-center gap-2.5 cursor-pointer group shrink-0 mt-0.5"
                >
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg border whitespace-nowrap ${
                      mobileSection === "all"
                        ? "bg-white text-slate-950 border-white"
                        : "bg-[#0B1222]/95 text-white border-white/20"
                    }`}
                  >
                    All 11 Sections
                  </span>
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xl border-2 transition-transform group-active:scale-95"
                    style={
                      mobileSection === "all"
                        ? { backgroundColor: pColor, borderColor: "#ffffff", color: "#050816" }
                        : { backgroundColor: "#ffffff", borderColor: "rgba(255,255,255,0.85)", color: "#0f172a" }
                    }
                  >
                    <Layers className="w-4 h-4" />
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Circular Floating Trigger Button */}
          <button
            type="button"
            aria-label="Open section index menu"
            aria-expanded={indexOpen}
            data-testid="perf-index-toggle"
            onClick={() => setIndexOpen(o => !o)}
            className="fixed right-3.5 bottom-[98px] z-[60] w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border-2 transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: indexOpen ? "#ffffff" : pColor,
              borderColor: indexOpen ? pColor : "rgba(255,255,255,0.9)",
              color: "#050816",
              boxShadow: `0 10px 28px -4px ${pColor}80, 0 4px 14px rgba(0,0,0,0.45)`,
            }}
          >
            {indexOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <ListFilter className="w-5 h-5 stroke-[2.5]" />}
            <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full bg-[#050816] text-white border border-white/25 text-[8px] font-mono font-black leading-none shadow-md">
              {mobileSection === "all" ? "ALL" : mobileSection.padStart(2, "0")}
            </span>
          </button>
        </>
      )}
    </Layout>
  );
}
