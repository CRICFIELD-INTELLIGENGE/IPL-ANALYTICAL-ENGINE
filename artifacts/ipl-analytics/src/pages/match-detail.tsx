import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { 
  useLiveAllMatches, useLiveWinProbability, useLiveVenueInsights, 
  getMatchScoreLine, getMatchStateColor, startTime, type LiveMatch 
} from "@/lib/live";
import { useMatches, useSeasons, teamShort, useTeams, teamColor,
  useMatchScorecard, useMatchCommentary, venueHref, normalizeVenueName, playerSlug,
  type MatchScorecard, type MatchCommentary } from "@/lib/aggregates";
import { Link, useRoute } from "wouter";
import { 
  ArrowLeft, MapPin, Calendar, Trophy, Activity, Zap, 
  TrendingUp, Info, Shield, Target, Clock, Cpu,
  MessageSquare, Users, LineChart, Cloud, ListOrdered,
  Award, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { TeamLogo } from "@/components/team-logo";
import { MatchIntelPanel } from "@/components/decision/intel-panels";
import { MatchCinematicHero } from "@/components/match/match-cinematic-hero";
import { MatchMomentumPanel } from "@/components/match/match-momentum-panel";
import { InningsScorecardView } from "@/components/match/innings-scorecard-view";
import { MatchGraphConsole } from "@/components/match/match-graph-console";
import { CinematicCommentaryView } from "@/components/match/cinematic-commentary-view";
import { CinematicSquadsView } from "@/components/match/cinematic-squads-view";
import { CinematicOversView } from "@/components/match/cinematic-overs-view";
import { CinematicForecastView } from "@/components/match/cinematic-forecast-view";

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const MOCK_MATCH: any = {
  matchInfo: {
    matchId: 99999,
    seriesName: "IPL Intelligence Showcase",
    matchDesc: "Finals Telemetry Demo",
    state: "In Progress",
    status: "MI vs CSK: High Intensity Phase",
    team1: { teamId: 1, teamName: "Mumbai Indians", teamSName: "MI" },
    team2: { teamId: 2, teamName: "Chennai Super Kings", teamSName: "CSK" },
    startDate: Date.now(),
    venueInfo: { ground: "Wankhede Stadium", city: "Mumbai" },
    currBatTeamId: 1
  },
  matchScore: {
    team1Score: { inngs1: { runs: 184, wickets: 3, overs: 18.4 } },
    team2Score: { inngs1: { runs: 0, wickets: 0, overs: 0 } }
  },
  scorecard: [
    {
      batting: [
        { name: "Rohit Sharma", status: "not out", runs: 74, balls: 42, fours: 6, sixes: 4, sr: 176.2 },
        { name: "Suryakumar Yadav", status: "c Dhoni b Jadeja", runs: 58, balls: 31, fours: 5, sixes: 3, sr: 187.1 },
        { name: "Ishan Kishan", status: "b Pathirana", runs: 42, balls: 24, fours: 4, sixes: 2, sr: 175.0 }
      ],
      bowling: [
        { name: "Deepak Chahar", overs: 4, maidens: 0, runs: 32, wickets: 0, eco: 8.0 },
        { name: "Ravindra Jadeja", overs: 4, maidens: 0, runs: 28, wickets: 1, eco: 7.0 },
        { name: "Matheesha Pathirana", overs: 3.4, maidens: 0, runs: 45, wickets: 1, eco: 12.2 }
      ]
    }
  ]
};

export default function MatchDetailPage() {
  const [, params] = useRoute<{ id: string }>("/match/:id");
  const matchId = params?.id ? parseInt(params.id, 10) : null;
  const q = useLiveAllMatches();
  const archives = useMatches();
  
  // Try to find in live first, then in archives
  let match = matchId === 99999 ? MOCK_MATCH : q.data?.matches.find((m) => m.matchInfo.matchId === matchId);
  
  if (!match && archives.data && matchId) {
    const archMatch = archives.data.find(m => m.id === matchId.toString());
    if (archMatch) {
      match = {
        matchInfo: {
          matchId: parseInt(archMatch.id),
          seriesName: `IPL ${archMatch.season}`,
          matchDesc: archMatch.venue,
          state: "Complete",
          status: archMatch.winner ? `${archMatch.winner} won by ${archMatch.margin}` : "Match Finished",
          team1: { teamId: 101, teamName: archMatch.team1, teamSName: teamShort(archMatch.team1) },
          team2: { teamId: 102, teamName: archMatch.team2, teamSName: teamShort(archMatch.team2) },
          startDate: new Date(archMatch.date).getTime(),
          venueInfo: { ground: archMatch.venue.split(',')[0], city: archMatch.venue.split(',')[1]?.trim() || "India" },
          mom: archMatch.mom,
          winner: archMatch.winner,
          margin: archMatch.margin,
        },
        matchScore: {
          team1Score: { inngs1: { runs: parseInt(archMatch.team1Score?.split('/')[0] || "0"), wickets: parseInt(archMatch.team1Score?.split('/')[1]?.split(' ')[0] || "0"), overs: parseFloat(archMatch.team1Score?.split('(')[1]?.replace(')', '') || "20") } },
          team2Score: { inngs1: { runs: parseInt(archMatch.team2Score?.split('/')[0] || "0"), wickets: parseInt(archMatch.team2Score?.split('/')[1]?.split(' ')[0] || "0"), overs: parseFloat(archMatch.team2Score?.split('(')[1]?.replace(')', '') || "20") } }
        },
        // No scorecard is invented here. The real one comes from
        // /api/ipl/match/:id/scorecard, computed ball by ball. This used to
        // hold a single fictional line — 85 off 45 by "Best Performer", 3
        // wickets by a bowler named "Bowler" — identical for all 1243 matches.
        scorecard: []
      };
    }
  }

  const [activeTab, setActiveTab] = useState("summary");

  const { scrollYProgress } = useScroll();
  const masterScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);

  return (
    <Layout hideRightPanel>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-200">
        {/* TOP NAV BAR */}
        <div className="sticky top-0 z-[100] px-6 py-4 flex items-center justify-between bg-white/80 dark:bg-[#050816]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
          <Link href="/scores">
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-slate-900 dark:hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Global Hub
            </button>
          </Link>

          {/* Tab Navigation */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto hide-scrollbar">
            {["Summary", "Scorecard", "Commentary", "Graph", "Squads", "Overs", "Forecast"].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.toLowerCase() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Match Analytics Stream</span>
              <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight">MATCH_INTEL_v2.0 // {matchId}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <motion.div style={{ scale: masterScale }} className="flex-1 flex flex-col p-6 gap-6">
          {q.isLoading && !match ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-black uppercase tracking-widest text-white/40">Syncing Intelligence...</span>
              </div>
            </div>
          ) : !match ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-white/10 rounded-[32px] bg-white/[0.02]">
              <Info className="w-12 h-12 text-white/20 mb-4" />
              <h2 className="text-xl font-black uppercase tracking-tight mb-2">Intelligence Gap Detected</h2>
              <p className="text-sm text-white/40 max-w-md">The requested match telemetry is no longer available in the active live feed or has been archived.</p>
              <Link href="/on-field">
                <button className="mt-6 px-8 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/80 transition-all">Return to Feed</button>
              </Link>
            </div>
          ) : (
            <MatchIntelligenceView match={match} activeTab={activeTab} />
          )}
        </motion.div>
      </div>
    </Layout>
  );
}

function MatchIntelligenceView({ match, activeTab }: { match: import("@/lib/live").LiveMatch; activeTab: string }) {
  const info = match.matchInfo;
  const score = getMatchScoreLine(match);
  const state = getMatchStateColor(info.state);
  const winProb = useLiveWinProbability(info.matchId);
  const venueIntel = useLiveVenueInsights(info.venueInfo?.id);
  // The real card and commentary for any of the 1243 archived matches. Both are
  // computed from the delivery record, so they are correct for every match
  // rather than for the one the placeholder was written about.
  const card = useMatchScorecard(info.matchId);
  const commentary = useMatchCommentary(info.matchId);

  return (
    <div className="flex flex-col gap-6">
      {/* No exit animations, and no mode="wait". An exiting child stays mounted
          until its exit animation finishes, so a dropped frame leaves the old
          tab on screen and the new one never mounts — the tabs stop switching
          entirely. Entry animations are kept; they have no such dependency. */}
      <AnimatePresence>
        {activeTab === "summary" && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* CINEMATIC MATCH SHOWDOWN HERO */}
            <MatchCinematicHero match={match} card={card.data} />

            
            {/* OFFICIAL VERIFIED MATCH VIDEO HIGHLIGHTS */}
            
            {/* MATCH MOMENTUM TELEMETRY HUD */}
            <MatchMomentumPanel card={card.data} matchId={info.matchId} />

            {/* OFFICIAL BROADCASTER HIGHLIGHT LINK (IF VERIFIED DESTINATION EXISTS) */}
            
            {/* TELEMETRY GRID */}
            <div className="grid grid-cols-12 gap-6">
              {/* WIN PROBABILITY CARD */}
              <motion.div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between gap-5 shadow-md dark:shadow-xl relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 p-4">
                  <TrendingUp className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      Win Probability
                    </h3>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-cyan-500/15 text-sky-800 dark:text-cyan-300 uppercase">
                      {info.winner || card.data?.result?.winner ? "Decisive" : "Live"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-white/40 font-mono font-bold uppercase tracking-wider">
                    Calculated Real-Time Telemetry
                  </p>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4">
                  {(() => {
                    const probPoints = Array.isArray(winProb.data) && winProb.data.length ? winProb.data : null;
                    const last = probPoints ? probPoints[probPoints.length - 1] : null;

                    const winnerName = (info.winner || card.data?.result?.winner || "").toLowerCase();
                    const isT1Winner = winnerName.includes(info.team1.teamSName.toLowerCase()) || winnerName.includes(info.team1.teamName.toLowerCase());
                    const isT2Winner = winnerName.includes(info.team2.teamSName.toLowerCase()) || winnerName.includes(info.team2.teamName.toLowerCase());

                    let t1Prob = 50;
                    let t2Prob = 50;

                    if (last && typeof last.team1 === "number" && typeof last.team2 === "number") {
                      t1Prob = Math.round(last.team1);
                      t2Prob = Math.round(last.team2);
                    } else if (isT1Winner) {
                      t1Prob = 100;
                      t2Prob = 0;
                    } else if (isT2Winner) {
                      t1Prob = 0;
                      t2Prob = 100;
                    }

                    const t1Col = teamColor(info.team1.teamName);
                    const t2Col = teamColor(info.team2.teamName);

                    return (
                      <>
                        {/* Dual Team Percentages with Team Badges */}
                        <div className="w-full flex justify-between items-end px-1">
                          <div className="flex items-center gap-2.5">
                            <TeamLogo team={info.team1.teamSName} size="w-8 h-8" />
                            <div className="text-left">
                              <div className="text-[26px] font-black text-slate-900 dark:text-white leading-none font-mono">
                                {t1Prob}%
                              </div>
                              <div className="text-[10px] font-bold uppercase mt-1 tracking-wider" style={{ color: t1Col }}>
                                {info.team1.teamSName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                            <TeamLogo team={info.team2.teamSName} size="w-8 h-8" />
                            <div className="text-right">
                              <div className="text-[26px] font-black text-slate-900 dark:text-white leading-none font-mono">
                                {t2Prob}%
                              </div>
                              <div className="text-[10px] font-bold uppercase mt-1 tracking-wider" style={{ color: t2Col }}>
                                {info.team2.teamSName}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dual-color split progress bar */}
                        <div className="relative w-full h-3.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 flex">
                          <motion.div
                            className="h-full"
                            style={{ backgroundColor: t1Col }}
                            initial={{ width: "50%" }}
                            animate={{ width: `${t1Prob}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                          <motion.div
                            className="h-full"
                            style={{ backgroundColor: t2Col }}
                            initial={{ width: "50%" }}
                            animate={{ width: `${t2Prob}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </div>

                        {/* Trajectory Sparkline Curve (when over progression exists) */}
                        {probPoints && probPoints.length > 2 && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase font-bold">
                              <span>Chase Win Trajectory</span>
                              <span>Over 0 → {probPoints[probPoints.length - 1].over}</span>
                            </div>
                            <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${(probPoints.length - 1) * 15} 32`} preserveAspectRatio="none">
                              <path
                                d={probPoints.reduce((acc, pt, idx) => {
                                  const x = idx * 15;
                                  const y = 30 - (pt.team2 / 100) * 26;
                                  return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                                }, "")}
                                fill="none"
                                stroke={t2Col}
                                strokeWidth="2.5"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Victory Result Banner */}
                        {(info.winner || card.data?.result?.winner) && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-tight truncate">
                                {info.winner || card.data?.result?.winner} won by {info.margin || card.data?.result?.by || "victory"}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-200/90 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 shrink-0">
                              FINAL
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>

              {/* INNINGS PERFORMANCE MATRIX */}
              <motion.div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 flex flex-col shadow-md dark:shadow-xl overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      Innings Performance Matrix
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/40 uppercase">
                    Phase Scoring · Boundaries · Top Impact
                  </span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailedScorecardRow 
                    team={info.team1} 
                    score={match.matchScore?.team1Score?.inngs2 || match.matchScore?.team1Score?.inngs1}
                    innings={card.data?.innings?.[0]}
                    inningsLabel="1st Innings"
                    isBatting={info.currBatTeamId === info.team1.teamId}
                  />
                  <DetailedScorecardRow 
                    team={info.team2} 
                    score={match.matchScore?.team2Score?.inngs2 || match.matchScore?.team2Score?.inngs1}
                    innings={card.data?.innings?.[1]}
                    inningsLabel="2nd Innings (Chase)"
                    isBatting={info.currBatTeamId === info.team2.teamId}
                  />
                </div>
              </motion.div>
            </div>

            {/* Archived matches: ball-by-ball chase win probability + links into the replay engines */}
            <MatchIntelPanel matchId={info.matchId} />
          </motion.div>
        )}

        {activeTab === "commentary" && (
          <motion.div key="commentary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <CinematicCommentaryView card={card.data} commentary={commentary.data} isLoading={commentary.isLoading} />
          </motion.div>
        )}

        {activeTab === "graph" && (
          <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <MatchGraphConsole match={match} card={card.data} />
          </motion.div>
        )}

        {activeTab === "squads" && (
          <motion.div key="squads" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <CinematicSquadsView match={match} card={card.data} />
          </motion.div>
        )}

        {activeTab === "overs" && (
          <motion.div key="overs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <CinematicOversView match={match} card={card.data} />
          </motion.div>
        )}

        {activeTab === "forecast" && (
          <motion.div key="forecast" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
             <CinematicForecastView match={match} card={card.data} />
          </motion.div>
        )}

        {activeTab === "scorecard" && (
          <motion.div key="scorecard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FullScorecard match={match} card={card.data} isLoading={card.isLoading} />
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-[#0B1020] rounded-[32px] border border-white/10 p-8 flex flex-col gap-8 shadow-xl">
              <h3 className="text-[18px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Venue Intelligence Hub
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: Shield, label: "Defending Trend", value: "HIGH", color: "text-blue-400" },
                  { icon: Target, label: "Boundary Rate", value: "14.2%", color: "text-orange-400" },
                  { icon: Clock, label: "Last 5 Ov Pressure", value: "MODERATE", color: "text-amber-400" },
                  { icon: Activity, label: "Stadium Energy", value: "PEAK", color: "text-red-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    <div>
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{stat.label}</div>
                      <div className="text-[22px] font-black text-white uppercase">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER METADATA */}
      <div className="px-4 py-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 dark:text-white/40">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Cricket Intelligence Operating System v4.2.1</span>
        </div>
        {/* A completed match is not a live sync. The scorecard is computed from
            the archived ball-by-ball record and the commentary is the text
            published for those deliveries; saying "Live Cricbuzz Sync" under a
            2008 scorecard misstates where the numbers came from. */}
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {info.state === "Complete"
              ? "Source: Cricsheet ball-by-ball · ESPN commentary"
              : "Data Source: Live Cricbuzz Sync"}
          </span>
          {info.state !== "Complete" && (
            <span className="text-[10px] font-bold uppercase tracking-widest">Last Synced: {new Date().toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function FullScorecard({ match, card, isLoading }: { match: LiveMatch; card?: MatchScorecard; isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {/* CINEMATIC DUAL / STACKED INNINGS SCORECARD */}
      <InningsScorecardView card={card} isLoading={isLoading} />

      {/* MATCH FACTS & OFFICIALS */}
      {card && (
        <div className="bg-white dark:bg-[#090d16]/95 rounded-[28px] border border-slate-200 dark:border-white/10 p-6 grid grid-cols-1 md:grid-cols-3 gap-5 shadow-xl dark:shadow-2xl">
          {card.toss && (
            <Fact label="Toss" value={`${card.toss.winner} chose to ${card.toss.decision}`} />
          )}
          {card.result?.winner && (
            <Fact label="Result" value={`${card.result.winner} won${card.result.by ? ` by ${card.result.by}` : ""}${card.result.method ? ` (${card.result.method})` : ""}`} />
          )}
          {card.playerOfMatch?.length > 0 && (
            <div className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-2xl flex flex-col justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5 font-mono">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Player of the match
              </div>
              <div className="flex flex-wrap gap-2">
                {card.playerOfMatch.map((p, idx) => (
                  <Link
                    key={idx}
                    href={`/players/${playerSlug(p)}`}
                    className="text-[14px] font-black text-amber-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
                  >
                    <span>{p}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {card.officials?.umpires?.length > 0 && (
            <Fact label="Umpires" value={card.officials.umpires.join(", ")} />
          )}
          {card.officials?.matchReferees?.length > 0 && (
            <Fact label="Match referee" value={card.officials.matchReferees.join(", ")} />
          )}
          {card.venue && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1 flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-cyan-400" /> Venue
              </div>
              <Link
                href={venueHref(card.venue)}
                className="text-[13px] font-bold text-cyan-300 hover:underline flex items-center gap-1"
              >
                <span>{[card.venue, card.city].filter(Boolean).join(", ")}</span>
                <ArrowUpRight className="w-3 h-3 text-cyan-400" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 mb-1">{label}</div>
      <div className="text-[13px] font-bold text-slate-800 dark:text-white/80">{value}</div>
    </div>
  );
}

function DetailedScorecardRow({
  team,
  score,
  innings,
  inningsLabel,
  isBatting
}: {
  team: any;
  score: any;
  innings?: import("@/lib/aggregates").ScorecardInnings;
  inningsLabel: string;
  isBatting: boolean;
}) {
  const runs = innings?.runs ?? score?.runs;
  const wickets = innings?.wickets ?? score?.wickets ?? 0;
  const overs = innings?.overs ?? score?.overs ?? 0;
  const runRate = innings?.runRate
    ? Number(innings.runRate).toFixed(2)
    : runs && overs && Number(overs) > 0
    ? (runs / Number(overs)).toFixed(2)
    : "—";

  const fours = innings?.batting?.reduce((sum, b) => sum + (b.fours || 0), 0) ?? 0;
  const sixes = innings?.batting?.reduce((sum, b) => sum + (b.sixes || 0), 0) ?? 0;
  const boundaryRuns = fours * 4 + sixes * 6;
  const boundaryPct = runs ? Math.round((boundaryRuns / runs) * 100) : 0;

  const topBatter = innings?.batting && innings.batting.length > 0
    ? [...innings.batting].sort((a, b) => b.runs - a.runs)[0]
    : null;

  const bestBowler = innings?.bowling && innings.bowling.length > 0
    ? [...innings.bowling].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0]
    : null;

  const ppOvers = (innings?.overProgression || []).filter(o => o.over <= 6);
  const ppRuns = ppOvers.reduce((sum, o) => sum + o.runs, 0);
  const ppWkts = ppOvers.reduce((sum, o) => sum + o.wickets, 0);

  if (runs == null) {
    return (
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-2 opacity-50 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TeamLogo team={team.teamSName} size="w-6 h-6" />
            <span className="text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">{team.teamSName}</span>
          </div>
          <div className="px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 text-[8px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">INACTIVE</div>
        </div>
        <div className="text-[20px] font-black text-slate-400 dark:text-white/20 italic">Yet to Bat</div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl border flex flex-col gap-3.5 relative overflow-hidden transition-all ${
      isBatting
        ? 'border-primary/50 shadow-md bg-primary/5 dark:bg-primary/10'
        : 'bg-slate-50/80 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
    }`}>
      {isBatting && (
        <div className="absolute top-0 right-0 p-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      {/* Team Header & Score Line */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/teams/${teamSlug(team.teamName)}`} className="hover:scale-105 transition-transform shrink-0">
            <TeamLogo team={team.teamSName} size="w-10 h-10" />
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-white/40 mb-0.5">
              {inningsLabel}
            </span>
            <Link
              href={`/teams/${teamSlug(team.teamName)}`}
              className="text-[15px] sm:text-[17px] font-black text-slate-900 dark:text-white hover:text-primary transition-colors leading-none tracking-tight truncate flex items-center gap-1"
            >
              <span className="truncate">{team.teamName}</span>
              <ArrowUpRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              Run Rate: <strong className="text-slate-800 dark:text-slate-200 font-bold">{runRate}</strong> RPO
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[26px] sm:text-[28px] font-black text-slate-900 dark:text-white tabular-nums leading-none mb-1 font-mono">
            {runs}<span className="text-[17px] sm:text-[18px] text-slate-500 dark:text-white/40 font-bold">/{wickets}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest font-mono">
            ({overs} Overs)
          </div>
        </div>
      </div>

      {/* Innings Matrix Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 dark:border-white/5">
        {/* Boundaries */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">BOUNDARIES</span>
          <span className="text-xs font-black text-slate-900 dark:text-white font-mono mt-0.5">
            {fours} <span className="text-[10px] font-normal text-slate-500">4s</span> · {sixes} <span className="text-[10px] font-normal text-slate-500">6s</span>
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-medium">{boundaryRuns} runs ({boundaryPct}%)</span>
        </div>

        {/* Top Scorer */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col min-w-0">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">TOP SCORER</span>
          <span className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5" title={topBatter?.name}>
            {topBatter ? `${topBatter.name.split(' ').pop()} ${topBatter.runs}` : '—'}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
            {topBatter ? `${topBatter.balls}b · SR ${topBatter.sr}` : '—'}
          </span>
        </div>

        {/* Key Bowler Conceded To */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex flex-col min-w-0 col-span-2 sm:col-span-1">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">KEY BOWLER</span>
          <span className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5" title={bestBowler?.name}>
            {bestBowler ? `${bestBowler.name.split(' ').pop()} ${bestBowler.wickets}/${bestBowler.runs}` : '—'}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
            {bestBowler ? `${bestBowler.overs} ov · ER ${bestBowler.econ != null ? Number(bestBowler.econ).toFixed(1) : (bestBowler.runs / (parseFloat(bestBowler.overs) || 1)).toFixed(1)}` : '—'}
          </span>
        </div>
      </div>

      {/* Powerplay & Extras Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono px-0.5 text-slate-600 dark:text-slate-400">
        <span>
          {ppOvers.length > 0 ? (
            <>PP (1-6): <strong className="text-slate-900 dark:text-white font-bold">{ppRuns}/{ppWkts}</strong> ({Number(ppRuns / 6).toFixed(1)} RPO)</>
          ) : (
            <>Target: <strong className="text-slate-900 dark:text-white font-bold">{runs}</strong></>
          )}
        </span>
        {innings?.extras?.total ? (
          <span className="text-slate-500 dark:text-slate-400">
            {innings.extras.total} Extras ({innings.extras.wides}w, {innings.extras.legbyes}lb)
          </span>
        ) : null}
      </div>
    </div>
  );
}



function CommentaryView({ card, commentary, isLoading }: { card?: MatchScorecard; commentary?: MatchCommentary; isLoading: boolean }) {
  const innings = commentary?.innings ?? [];
  const [activeInnings, setActiveInnings] = useState(0);
  const [limit, setLimit] = useState(60);
  const current = innings[activeInnings];

  if (isLoading) {
    return <div className="p-12 text-center text-white/40 font-mono text-sm">Loading ball-by-ball commentary…</div>;
  }
  if (!current) {
    return (
      <div className="p-12 text-center text-white/40 font-mono text-sm border border-white/10 rounded-[24px] bg-white/[0.02]">
        No ball-by-ball commentary was recorded for this match.
      </div>
    );
  }

  const balls = current.balls.slice(0, limit);

  return (
    <div className="flex flex-col gap-4">
      <div className="p-5 bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="font-black uppercase tracking-widest text-sm text-white/80">Ball-by-ball</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {innings.map((inn, i) => (
            <button
              key={i}
              onClick={() => { setActiveInnings(i); setLimit(60); }}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeInnings === i ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              {inn.team ?? `Innings ${inn.innings}`}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-white/30 font-mono ml-auto">
          {current.balls.length} balls recorded
        </span>
      </div>

      {balls.map((c, i) => (
        <div
          key={i}
          className={`p-5 rounded-[24px] border flex gap-5 items-start transition-all ${
            c.isWicket ? "bg-red-500/5 border-red-500/30"
              : c.isBoundary ? "bg-primary/5 border-primary/30"
              : "bg-[#0B1020] border-white/10"
          }`}
        >
          <div className={`w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center font-black ${
            c.isWicket ? "bg-red-500/20 text-red-400"
              : c.isBoundary ? "bg-primary/20 text-primary"
              : "bg-white/5 text-white/60"
          }`}>
            <span className="text-[13px] leading-none">{c.over}</span>
            <span className="text-[9px] opacity-60 mt-0.5">{c.isWicket ? "W" : `${c.runs}`}</span>
          </div>
          <div className="flex-1 min-w-0">
            {(c.bowler || c.batter) && (
              <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                {c.bowler} to {c.batter}
                {c.isWicket && c.dismissal ? ` — ${c.dismissal}` : ""}
              </div>
            )}
            <p className={`text-[14px] leading-relaxed ${
              c.isWicket ? "text-red-300 font-bold" : c.isBoundary ? "text-primary font-bold" : "text-white/70"
            }`}>
              {c.text}
            </p>
            {/* What the commentary said about the delivery itself. Absent tags
                mean it was not described, not that nothing happened. */}
            {(c.length || c.line || c.variation || c.shot || c.zone || c.speedKph) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[c.variation, c.length, c.line, c.shot, c.zone].filter(Boolean).map((t, n) => (
                  <span key={n} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-wider text-white/50">
                    {t}
                  </span>
                ))}
                {c.speedKph && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-[9px] font-bold uppercase tracking-wider text-amber-400/80">
                    {c.speedKph} kph
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {limit < current.balls.length && (
        <button
          onClick={() => setLimit(l => l + 120)}
          className="py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          Show earlier overs ({current.balls.length - limit} more)
        </button>
      )}
    </div>
  );
}

function GraphView({ match }: { match: any }) {
  const c1 = teamColor(match?.matchInfo?.team1?.teamName ?? "");
  const c2 = teamColor(match?.matchInfo?.team2?.teamName ?? "");
  return (
    <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-8 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3"><LineChart className="w-5 h-5 text-primary"/><span className="font-black uppercase tracking-widest text-sm">Worm Graph Analysis</span></div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: c1, color: c1 }}/> <span className="text-[10px] font-black uppercase tracking-widest">{match?.matchInfo?.team1?.teamSName || 'T1'}</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: c2, color: c2 }}/> <span className="text-[10px] font-black uppercase tracking-widest">{match?.matchInfo?.team2?.teamSName || 'T2'}</span></div>
        </div>
      </div>
      <div className="h-72 relative border-l border-b border-white/10 ml-8 mb-4 flex items-end pt-4 pr-4">
         <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[9px] font-bold text-white/30 py-2">
           <span>250</span><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
         </div>
         <div className="absolute left-0 right-0 -bottom-6 flex justify-between text-[9px] font-bold text-white/30 px-2">
           <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span>
         </div>
         <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" viewBox="0 0 100 100" preserveAspectRatio="none">
           <path d="M0,100 L10,95 L20,80 L30,65 L40,60 L50,45 L60,30 L70,25 L80,20 L90,10 L100,5" fill="none" stroke={c1} strokeWidth="2.5" />
           <path d="M0,100 L10,98 L20,90 L30,88 L40,85 L50,82 L60,80 L70,75 L80,75 L90,72 L100,70" fill="none" stroke={c2} strokeWidth="2.5" />
         </svg>
      </div>
    </div>
  );
}

function SquadsView({ match, card }: { match: any; card?: MatchScorecard }) {
  // The XIs as they were named for this match, from the match record. This used
  // to be the first 11 and next 11 rows of players.json — the same 22 players
  // for every fixture — with a placeholder list of roles ("Top Order Bat 1",
  // "Pacer 3") when even that was unavailable.
  const squads = card?.squads ?? [];

  if (squads.length === 0) {
    return (
      <div className="p-12 text-center text-white/40 font-mono text-sm border border-white/10 rounded-[24px] bg-white/[0.02]">
        No team sheet is held for this match.
      </div>
    );
  }

  // Who batted or bowled, so the XI can show who took part rather than a flat list.
  const played = new Map<string, string>();
  for (const inn of card?.innings ?? []) {
    for (const b of inn.batting) played.set(b.name, `${b.runs}${b.notOut ? "*" : ""} (${b.balls})`);
    for (const b of inn.bowling) {
      const line = `${b.wickets}/${b.runs}`;
      played.set(b.name, played.has(b.name) ? `${played.get(b.name)} · ${line}` : line);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {squads.map((s, i) => (
        <div key={s.team} className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/teams/${teamSlug(s.team)}`} className="hover:scale-105 transition-transform">
              <TeamLogo team={s.team} size="w-8 h-8" />
            </Link>
            <Link
              href={`/teams/${teamSlug(s.team)}`}
              className="text-[13px] font-black uppercase tracking-wider text-white hover:text-primary transition-colors flex items-center gap-1"
            >
              <span>{s.team} XI</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            </Link>
            <span className="text-[10px] font-mono font-bold text-white/30 ml-auto">{s.players.length} named</span>
          </div>
          <div className="flex flex-col gap-2">
            {s.players.map((p, n) => (
              <Link
                key={n}
                href={`/players/${playerSlug(p)}`}
                className="px-5 py-3 rounded-xl bg-white/[0.03] hover:bg-primary/10 border border-white/5 hover:border-primary/30 transition-all flex justify-between items-center gap-3 group/p"
                title={`View ${p}'s Player Dossier`}
              >
                <span className="text-[13px] font-black text-white/80 group-hover/p:text-primary transition-colors flex items-center gap-1.5">
                  {p}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/p:opacity-100 text-primary transition-opacity" />
                </span>
                {played.has(p) && (
                  <span className="text-[10px] font-bold text-amber-300/80 font-mono tabular-nums shrink-0">{played.get(p)}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OversView({ match }: { match: any }) {
  return (
    <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-8 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3"><ListOrdered className="w-5 h-5 text-primary"/><span className="font-black uppercase tracking-widest text-sm">Over By Over Comparison</span></div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-10 gap-3">
        {Array.from({length: 20}).map((_, i) => (
          <div key={i} className="aspect-square rounded-[16px] bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30 transition-all border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
            <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1 group-hover:text-primary/60">Ov {i+1}</span>
            <span className="text-[20px] font-black text-white group-hover:text-primary">{Math.floor(Math.random() * 15) + 3}</span>
            {Math.random() > 0.8 && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Wicket" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastView({ match }: { match: any }) {
  return (
    <div className="bg-[#0B1020] rounded-[32px] border border-white/10 p-12 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
      <Cloud className="w-20 h-20 text-blue-400 mb-6 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
      <h3 className="text-[24px] font-black uppercase tracking-tight mb-4 text-white">Weather & Pitch Forecast</h3>
      <p className="text-[14px] text-white/50 max-w-2xl mb-12 font-medium leading-relaxed">Clear skies expected throughout the match duration. Dew might play a significant role in the second innings. The pitch looks like an absolute belter, expect a high-scoring thriller.</p>
      <div className="flex flex-wrap justify-center gap-12">
         <div className="flex flex-col items-center gap-2">
            <span className="text-[40px] font-black text-white leading-none">28°C</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">Temperature</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <span className="text-[40px] font-black text-white leading-none">65%</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">Humidity</span>
         </div>
         <div className="flex flex-col items-center gap-2">
            <span className="text-[40px] font-black text-white leading-none">0%</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">Precipitation</span>
         </div>
      </div>
    </div>
  );
}


