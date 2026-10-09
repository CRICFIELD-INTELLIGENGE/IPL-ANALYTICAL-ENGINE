import React, { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { TeamSquad } from "@/components/team-squad";
import {
  ArrowLeft, ArrowRight, Users, Activity, Calendar, Trophy,
  TrendingUp, Shield, Target, Medal, BarChart2
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

export default function TeamProfilePage() {
  const [, params] = useRoute("/teams/:slug");
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();

  const teams = useTeams();
  const matches = useMatches();
  const pointsTables = usePointsTables();

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "squad" | "history">("overview");

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

  const pColor = teamColor(teamData.team);
  const pShort = teamShort(teamData.team);

  return (
    <Layout>
      <div className="space-y-6 pb-12 px-4 max-w-7xl mx-auto animate-fade-in">
        
        {/* HEADER NAVIGATION */}
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

        {/* HERO CINEMATIC HEADER */}
        <div className="rounded-[16px] overflow-hidden" style={{ borderLeft: `4px solid ${pColor}` }}>
          <GlassCard className="p-6 relative overflow-hidden group">
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-1000" style={{ backgroundColor: pColor }} />
            
            <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
              {/* Franchise crest — the real logo rather than a generic shield. */}
              <div className="w-36 h-36 md:w-40 md:h-40 rounded-[28px] border-2 shrink-0 shadow-2xl flex flex-col items-center justify-center gap-2 relative overflow-hidden" style={{ borderColor: `${pColor}40`, background: `linear-gradient(135deg, ${pColor}20, transparent)` }}>
                <TeamLogo team={teamData.team} size="w-20 h-20 md:w-24 md:h-24" />
                <span className="text-xl font-black uppercase tracking-widest relative z-10" style={{ color: pColor }}>{pShort}</span>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              </div>

              {/* Profile Summary Column */}
              <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/80 flex items-center gap-1.5">
                    <Medal className="w-3 h-3" style={{ color: pColor }} />
                    IPL Franchise
                  </span>
                  {teamData.titles > 0 && (
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {teamData.titles}x Champions
                    </span>
                  )}
                </div>

                <div>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">{teamData.team}</h1>
                  <p className="text-sm font-bold text-white/50 tracking-wide flex items-center justify-center md:justify-start gap-2 uppercase">
                    All-Time Win Rate: {teamData.winPct.toFixed(1)}%
                  </p>
                </div>

                {/* Direct Dugout Navigation Action */}
                <div className="pt-1 flex items-center justify-center md:justify-start gap-3">
                  <Link href={`/dugout/${dugoutSlug}`}>
                    <button 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-lg hover:scale-105 cursor-pointer"
                      style={{ backgroundColor: `${pColor}20`, borderColor: `${pColor}50`, color: pColor }}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Enter {pShort} Dugout Headquarters</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* High-fidelity Highlights Banner */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 w-full md:w-[320px] shrink-0">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Matches</span>
                  <span className="text-2xl font-black text-white mt-1">{teamData.matches}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Wins</span>
                  <span className="text-2xl font-black mt-1" style={{ color: pColor }}>{teamData.wins}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Batting SR</span>
                  <span className="text-2xl font-black text-white/80 mt-1">{teamData.battingSr.toFixed(1)}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/[0.04] transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Bowling Econ</span>
                  <span className="text-2xl font-black text-white/80 mt-1">{teamData.bowlingEcon.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* SQUAD DNA (Decision Intelligence) — latest season on record */}
        <TeamIntelPanel team={teamData.team} />

        {/* SUB TAB BAR */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeSubTab === "overview"
                ? "text-white bg-white/10"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
            style={activeSubTab === "overview" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}40, transparent)` } : {}}
          >
            <Activity className="w-4 h-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveSubTab("squad")}
            className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeSubTab === "squad"
                ? "text-white bg-white/10"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
            style={activeSubTab === "squad" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}40, transparent)` } : {}}
          >
            <Users className="w-4 h-4" />
            Current Squad
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeSubTab === "history"
                ? "text-white bg-white/10"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
            style={activeSubTab === "history" ? { boxShadow: `0 0 16px -4px ${pColor}80`, backgroundImage: `linear-gradient(to right, ${pColor}40, transparent)` } : {}}
          >
            <Calendar className="w-4 h-4" />
            Match History
          </button>
          <Link href={`/dugout/${dugoutSlug}`}>
            <button className="px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all text-white/50 hover:text-white hover:bg-white/10 cursor-pointer">
              <Shield className="w-4 h-4" style={{ color: pColor }} />
              Dugout HQ
              <ArrowRight className="w-3 h-3 text-white/40" />
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
            
            {activeSubTab === "overview" && (
              <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Win Rate Trend Chart */}
                <GlassCard className="lg:col-span-2 p-6">
                  <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" style={{ color: pColor }} />
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
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seasonTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

                {/* Extremes & Records */}
                <div className="space-y-6">
                  <GlassCard className="p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: pColor }} />
                      Record Extremes
                    </h3>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl mb-3 border border-white/5">
                      <span className="text-xs font-bold text-white/60">Highest Total</span>
                      <span className="text-xl font-black text-white">{teamData.highest}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-white/60">Lowest Total</span>
                      <span className="text-xl font-black text-white/50">{teamData.lowest || "-"}</span>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" style={{ color: pColor }} />
                      Net Run Accumulation
                    </h3>
                    <div className="space-y-4">
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
              </div>
                {/* Analyst dashboard: phase, toss, venue, rivalry and clutch
                    breakdowns computed from the ball-by-ball tables. */}
                <TeamAnalyticsDashboard
                  team={teamData.team}
                  accent={pColor}
                  matches={matches.data ?? []}
                />
              </div>
            )}

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
                        
                        <div className="flex items-center gap-6 flex-1 mb-4 md:mb-0 pl-3">
                          {/* Date Block */}
                          <div className="flex flex-col text-center w-16 shrink-0 border-r border-white/10 pr-4">
                            <span className="text-[10px] font-black uppercase text-white/40">{new Date(match.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-xl font-black text-white">{new Date(match.date).getDate()}</span>
                            <span className="text-[10px] font-bold text-white/40">{new Date(match.date).getFullYear()}</span>
                          </div>
                          
                          {/* Teams */}
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex flex-col items-end flex-1">
                              <span className={`text-xs md:text-sm font-bold line-clamp-1 text-right ${isTeam1 ? "text-white" : "text-white/60"}`}>{match.team1}</span>
                              <span className="text-[10px] font-black text-white/40">{match.team1Score || "-"}</span>
                            </div>
                            
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-black text-white/50">VS</span>
                            </div>
                            
                            <div className="flex flex-col items-start flex-1">
                              <span className={`text-xs md:text-sm font-bold line-clamp-1 ${!isTeam1 ? "text-white" : "text-white/60"}`}>{match.team2}</span>
                              <span className="text-[10px] font-black text-white/40">{match.team2Score || "-"}</span>
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
    </Layout>
  );
}
