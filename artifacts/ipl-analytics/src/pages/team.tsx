import React, { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  ArrowLeft, ArrowRight, Users, Activity, Calendar, Trophy,
  TrendingUp, Shield, Target, Medal, BarChart2
} from "lucide-react";
import {
  useTeams, useMatches, teamColor, teamShort, usePlayerImages,
  useSquadsBySeason, usePlayerBios, usePointsTables,
  type SquadPlayer, type PlayerBio,
} from "@/lib/aggregates";
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
  const squadsBySeason = useSquadsBySeason();
  const pointsTables = usePointsTables();
  const playerBios = usePlayerBios();
  const playerImages = usePlayerImages();

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
   * The franchise's squad for the most recent season it fielded a side.
   *
   * Sourced from squads-by-season.json rather than current-squads.json. The
   * latter stores the franchise as a short code ("CSK") while this page holds
   * the full name, so the comparison never matched and every team reported
   * "Squad data not available" — and it carries only names, no fee, nationality
   * or whether the player actually played.
   */
  const squadSeason = useMemo(() => {
    if (!squadsBySeason.data || !teamData) return null;
    const seasons = Object.keys(squadsBySeason.data)
      .filter(s => (squadsBySeason.data![s]?.[teamData.team]?.length ?? 0) > 0)
      .sort((a, b) => Number(b) - Number(a));
    return seasons[0] ?? null;
  }, [squadsBySeason.data, teamData]);

  const teamSquad = useMemo(() => {
    if (!squadsBySeason.data || !teamData || !squadSeason) return [];
    return squadsBySeason.data[squadSeason]?.[teamData.team] ?? [];
  }, [squadsBySeason.data, teamData, squadSeason]);

  // Fees were quoted in US dollars before 2014 and in rupees after, and the two
  // cannot be added without a historical rate — so the total is shown in
  // whichever currency that season actually used.
  const squadSpendLabel = useMemo(() => {
    const lakh = teamSquad.reduce((sum, p) => sum + (p.priceLakh ?? 0), 0);
    if (lakh > 0) return `₹${(lakh / 100).toFixed(2)} Cr`;
    const usd = teamSquad.reduce((sum, p) => sum + (p.priceUsd ?? 0), 0);
    return usd > 0 ? `$${(usd / 1_000_000).toFixed(2)}M` : "—";
  }, [teamSquad]);

  // Bios are keyed by slug, so index them by the names a squad row can carry.
  const bioIndex = useMemo(() => {
    const map = new Map<string, PlayerBio>();
    for (const bio of Object.values(playerBios.data ?? {})) {
      for (const key of [bio.playerName, bio.fullName]) {
        const k = key?.trim().toLowerCase();
        if (k && !map.has(k)) map.set(k, bio);
      }
    }
    return map;
  }, [playerBios.data]);

  const bioFor = (p: SquadPlayer) =>
    bioIndex.get((p.cricsheetName ?? "").toLowerCase()) ??
    bioIndex.get(p.name.toLowerCase()) ??
    null;

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

  const pColor = teamColor(teamData.team);
  const pShort = teamShort(teamData.team);

  return (
    <Layout>
      <div className="space-y-6 pb-12 px-4 max-w-7xl mx-auto animate-fade-in">
        
        {/* HEADER NAVIGATION */}
        <div className="flex items-center justify-between shrink-0">
          <Link href="/stats">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white transition-all">
              <ArrowLeft className="w-4 h-4 text-primary" />
              Back to stats center
            </button>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Franchise Intelligence</span>
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

            {activeSubTab === "squad" && (
              <GlassCard className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: pColor }} />
                    {squadSeason ? `${squadSeason} Squad` : "Squad"}
                    <span className="text-white/30 font-bold normal-case tracking-normal">
                      · {teamSquad.length} players
                    </span>
                  </h3>
                  {squadSeason && (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Known Spend</div>
                        <div className="text-[15px] font-black" style={{ color: pColor }}>{squadSpendLabel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Overseas</div>
                        <div className="text-[15px] font-black text-white/80">
                          {teamSquad.filter(p => p.country && p.country !== "India").length}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {teamSquad.length > 0 ? (
                    teamSquad.map(player => {
                      const linkName = player.cricsheetName ?? player.name;
                      return (
                      <div
                        key={linkName}
                        onClick={() => {
                          const pSlug = linkName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          setLocation(`/players/${pSlug}`);
                        }}
                        className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer group relative"
                      >
                        {/* Squad members who never took the field still belong
                            to the roster, so they are marked rather than hidden. */}
                        {!player.played && (
                          <span className="absolute top-2 right-2 text-[7px] font-black uppercase tracking-widest text-white/25 border border-white/10 rounded px-1 py-0.5">
                            Bench
                          </span>
                        )}
                        {player.acquisition === "retained" && (
                          <span className="absolute top-2 left-2 text-[7px] font-black uppercase tracking-widest text-emerald-300/70 border border-emerald-400/20 bg-emerald-400/5 rounded px-1 py-0.5">
                            Ret
                          </span>
                        )}
                        <div className="w-16 h-16 rounded-full bg-black/40 border-2 mb-3 overflow-hidden" style={{ borderColor: `${pColor}40` }}>
                           <PlayerAvatar
                              name={linkName}
                              playerImages={playerImages.data}
                              bio={bioFor(player)}
                              imgClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                        <span className="text-xs font-bold text-white line-clamp-1 w-full">{player.name}</span>
                        <span className="text-[9px] font-bold text-white/35 uppercase tracking-wider line-clamp-1 w-full mt-0.5">
                          {player.country || "—"}
                        </span>
                        <span className={`text-[11px] font-black tabular-nums mt-1 ${player.priceDisplay ? "" : "text-white/20"}`}
                              style={player.priceDisplay ? { color: pColor } : undefined}>
                          {player.priceDisplay ?? "—"}
                        </span>
                      </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <span className="text-sm font-bold text-white/40">Squad data not available.</span>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

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
