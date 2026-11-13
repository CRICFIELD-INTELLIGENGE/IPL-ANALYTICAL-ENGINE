import React, { useState } from "react";
import { Link } from "wouter";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  type MatchScorecard,
  type ScorecardInnings,
  type ScorecardBatting,
  type ScorecardBowling,
  teamColor,
  teamShort,
  playerSlug,
} from "@/lib/aggregates";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  Shield,
  Activity,
  Play,
  Flame,
} from "lucide-react";

export interface InningsScorecardViewProps {
  card?: MatchScorecard;
  isLoading: boolean;
}

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function InningsScorecardView({ card, isLoading }: InningsScorecardViewProps) {
  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-white/40 font-mono text-sm border border-slate-200 dark:border-white/10 rounded-[32px] bg-white dark:bg-white/[0.02] shadow-sm">
        Synchronizing official ball-by-ball delivery telemetry…
      </div>
    );
  }

  const innings = card?.innings ?? [];

  if (innings.length === 0) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-white/40 font-mono text-sm border border-slate-200 dark:border-white/10 rounded-[32px] bg-white dark:bg-white/[0.02] shadow-sm">
        No delivery record is held for this match, so no scorecard can be shown.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 w-full items-start">
      {innings.map((inn, idx) => (
        <SingleInningsPanel key={idx} innings={inn} inningsIndex={idx} card={card} />
      ))}
    </div>
  );
}

function SingleInningsPanel({
  innings,
  inningsIndex,
  card,
}: {
  innings: ScorecardInnings;
  inningsIndex: number;
  card?: MatchScorecard;
}) {
  const [activeTab, setActiveTab] = useState<"batting" | "bowling" | "fow" | "key">("batting");
  const [expandedBatter, setExpandedBatter] = useState<string | null>(null);

  const team = innings.team;
  const teamCode = teamShort(team);
  const tColor = teamColor(team);
  const bowlingTeam = card?.teams?.find(t => t !== team) || null;

  const extras = innings.extras;
  const extrasBreakdown = [
    extras.wides ? `${extras.wides}w` : null,
    extras.noballs ? `${extras.noballs}nb` : null,
    extras.byes ? `${extras.byes}b` : null,
    extras.legbyes ? `${extras.legbyes}lb` : null,
  ].filter(Boolean).join(", ");

  // Identify top scorer for row emphasis
  const topScorer = [...innings.batting].sort((a, b) => b.runs - a.runs)[0]?.name;

  return (
    <div className="w-full rounded-[28px] bg-white dark:bg-[#090d16]/95 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col">
      {/* ─── INNINGS HEADER: LOGO, TEAM, SCORE & ACCENT COLOR ─── */}
      <div className="p-5 md:p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 dark:from-white/[0.03] to-transparent">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link href={`/teams/${teamSlug(team)}`} className="shrink-0 hover:scale-105 transition-transform">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center p-2 border shadow-lg"
              style={{ borderColor: `${tColor}60`, backgroundColor: `${tColor}15` }}
            >
              <TeamLogo team={teamCode} size="w-8 h-8" />
            </div>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                INNINGS {inningsIndex + 1}
              </span>
              {innings.superOver && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-400/30">
                  SUPER OVER
                </span>
              )}
            </div>
            <Link
              href={`/teams/${teamSlug(team)}`}
              className="text-base sm:text-lg font-black text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors uppercase tracking-tight truncate block"
            >
              {team}
            </Link>
          </div>
        </div>

        {/* Score & Rate */}
        <div className="flex items-baseline sm:items-end flex-col shrink-0">
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
              {innings.runs}/{innings.wickets}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">({innings.overs} OV)</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 mt-1">
            <span>CRR {innings.runRate}</span>
            <span>·</span>
            <span>EXTRAS {extras.total} {extrasBreakdown ? `(${extrasBreakdown})` : ""}</span>
          </div>
        </div>
      </div>

      {/* ─── INNINGS SUB-NAVIGATION CONTROLS ─── */}
      <div className="px-5 pt-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-thin bg-slate-100 dark:bg-black/20">
        {[
          { id: "batting", label: "BATTING" },
          { id: "bowling", label: "BOWLING" },
          { id: "fow", label: "FALL OF WICKETS" },
          { id: "key", label: "KEY MOMENTS" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3.5 py-2 text-[10px] font-mono font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "text-cyan-700 dark:text-cyan-300 border-cyan-500 dark:border-cyan-400 bg-white dark:bg-white/5 font-black shadow-sm"
                : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.02]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="p-4 sm:p-5">
        {/* 1. BATTING TABLE */}
        {activeTab === "batting" && (
          <div className="flex flex-col gap-1.5">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_40px_35px_30px_30px_45px_35px] sm:grid-cols-[1.5fr_50px_40px_35px_35px_60px_40px] items-center px-3 py-2 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
              <span>BATTER</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
              <span className="text-right">4S</span>
              <span className="text-right">6S</span>
              <span className="text-right">SR</span>
              <span className="text-center">ACT</span>
            </div>

            {/* Batter Rows */}
            {innings.batting.map((batter, i) => {
              const isExpanded = expandedBatter === batter.name;
              const isTop = batter.name === topScorer;
              const sr = batter.sr;

              return (
                <div
                  key={i}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    batter.notOut
                      ? "bg-emerald-50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-500/30"
                      : isTop
                      ? "bg-cyan-50 dark:bg-cyan-950/15 border-cyan-200 dark:border-cyan-500/25"
                      : "bg-slate-50/60 dark:bg-white/[0.015] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="grid grid-cols-[1fr_40px_35px_30px_30px_45px_35px] sm:grid-cols-[1.5fr_50px_40px_35px_35px_60px_40px] items-center px-3 py-2.5">
                    {/* Batter Identity & Portrait */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shrink-0 shadow-sm">
                        <PlayerAvatar 
                          name={batter.name} 
                          teamId={team}
                          season={card?.season}
                          strictHistoricalJersey={true}
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/players/${playerSlug(batter.name)}`}
                            className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-300 truncate transition-colors"
                            title={`View ${batter.name}'s profile`}
                          >
                            {batter.name}
                          </Link>
                          {batter.notOut && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                              NOT OUT
                            </span>
                          )}
                          {isTop && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-black uppercase bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                              TOP
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          {batter.dismissal}
                        </span>
                      </div>
                    </div>

                    {/* Runs */}
                    <span className="text-right font-mono text-sm sm:text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {batter.runs}{batter.notOut ? "*" : ""}
                    </span>

                    {/* Balls */}
                    <span className="text-right font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                      {batter.balls}
                    </span>

                    {/* 4s */}
                    <span className="text-right font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                      {batter.fours}
                    </span>

                    {/* 6s */}
                    <span className="text-right font-mono text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-bold tabular-nums">
                      {batter.sixes}
                    </span>

                    {/* Strike Rate */}
                    <span
                      className={`text-right font-mono text-xs sm:text-sm font-black tabular-nums ${
                        sr >= 170
                          ? "text-rose-700 dark:text-rose-400"
                          : sr >= 140
                          ? "text-cyan-700 dark:text-cyan-400"
                          : sr >= 110
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {sr}
                    </span>

                    {/* Action / Expand */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setExpandedBatter(isExpanded ? null : batter.name)}
                        className="w-7 h-7 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Toggle Batter Telemetry"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Player Performance Telemetry */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-100 dark:bg-black/40 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 flex-wrap">
                        <span>
                          <b className="text-slate-900 dark:text-white">Boundary Runs:</b>{" "}
                          {(batter.fours * 4) + (batter.sixes * 6)} ({batter.runs > 0 ? Math.round((((batter.fours * 4) + (batter.sixes * 6)) / batter.runs) * 100) : 0}%)
                        </span>
                        <span>
                          <b className="text-slate-900 dark:text-white">Dots:</b>{" "}
                          {Math.max(0, batter.balls - (batter.fours + batter.sixes + Math.round(batter.runs / 2)))}
                        </span>
                      </div>
                      <Link
                        href={`/players/${playerSlug(batter.name)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold text-[10px] uppercase tracking-wider self-start sm:self-auto transition-colors"
                      >
                        <span>EXPLORE DOSSIER</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Did Not Bat */}
            {innings.didNotBat.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 mt-2 flex items-center gap-2 flex-wrap text-xs">
                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  DID NOT BAT:
                </span>
                {innings.didNotBat.map((p, idx) => (
                  <Link
                    key={idx}
                    href={`/players/${playerSlug(p)}`}
                    className="text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors font-medium text-xs"
                  >
                    {p}{idx < innings.didNotBat.length - 1 ? "," : ""}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. BOWLING TABLE */}
        {activeTab === "bowling" && (
          <div className="flex flex-col gap-1.5">
            {/* Bowling Header */}
            <div className="grid grid-cols-[1.5fr_40px_35px_35px_35px_50px_40px] items-center px-3 py-2 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
              <span>BOWLER</span>
              <span className="text-right">O</span>
              <span className="text-right">M</span>
              <span className="text-right">R</span>
              <span className="text-right">W</span>
              <span className="text-right">ECON</span>
              <span className="text-right">DOTS</span>
            </div>

            {/* Bowling Rows */}
            {innings.bowling.map((bowler, i) => {
              const isBest = bowler.wickets >= 3 || (bowler.wickets >= 2 && bowler.econ <= 7.0);

              return (
                <div
                  key={i}
                  className={`rounded-xl border grid grid-cols-[1.5fr_40px_35px_35px_35px_50px_40px] items-center px-3 py-2.5 transition-all ${
                    isBest
                      ? "bg-amber-50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-500/30"
                      : "bg-slate-50/60 dark:bg-white/[0.015] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shrink-0 shadow-sm">
                      <PlayerAvatar 
                        name={bowler.name} 
                        teamId={bowlingTeam}
                        season={card?.season}
                        strictHistoricalJersey={true}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <Link
                        href={`/players/${playerSlug(bowler.name)}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-300 truncate transition-colors"
                        title={`View ${bowler.name}'s profile`}
                      >
                        {bowler.name}
                      </Link>
                      {(bowler.wides > 0 || bowler.noballs > 0) && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {[bowler.wides ? `${bowler.wides}w` : null, bowler.noballs ? `${bowler.noballs}nb` : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-right font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {bowler.overs}
                  </span>

                  <span className="text-right font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                    {bowler.maidens}
                  </span>

                  <span className="text-right font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {bowler.runs}
                  </span>

                  <span className={`text-right font-mono text-sm sm:text-base font-black tabular-nums ${bowler.wickets >= 2 ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                    {bowler.wickets}
                  </span>

                  <span
                    className={`text-right font-mono text-xs sm:text-sm font-black tabular-nums ${
                      bowler.econ <= 6.5
                        ? "text-emerald-700 dark:text-emerald-400"
                        : bowler.econ <= 8.5
                        ? "text-cyan-700 dark:text-cyan-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {bowler.econ}
                  </span>

                  <span className="text-right font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                    {bowler.dots}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. FALL OF WICKETS */}
        {activeTab === "fow" && (
          <div className="flex flex-col gap-2">
            {innings.fallOfWickets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {innings.fallOfWickets.map(f => (
                  <div
                    key={f.wicket}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 flex items-center justify-center font-black">
                        {f.wicket}
                      </span>
                      <Link
                        href={`/players/${playerSlug(f.name)}`}
                        className="font-bold text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-300 truncate transition-colors"
                      >
                        {f.name}
                      </Link>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-rose-600 dark:text-rose-400">{f.score}</span>
                      <span className="text-slate-500 text-[10px] ml-1">({f.over} OV)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-600 dark:text-slate-400 text-xs font-mono">
                No wickets fell during this innings.
              </div>
            )}
          </div>
        )}

        {/* 4. KEY MOMENTS */}
        {activeTab === "key" && (
          <div className="flex flex-col gap-2.5 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-3">
              <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white uppercase block">POWERPLAY ANALYSIS (1-6 OV)</span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Aggressive phase execution resulted in foundational run rate momentum.
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-start gap-3">
              <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white uppercase block">DEATH OVERS CHARGE (16-20 OV)</span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Rapid boundary accumulation and boundary strike rate acceleration.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
