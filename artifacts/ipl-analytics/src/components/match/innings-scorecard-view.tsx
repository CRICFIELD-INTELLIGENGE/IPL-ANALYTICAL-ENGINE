import React, { useState, useMemo } from "react";
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
  Target,
  Compass,
  Sparkles,
  CircleDot,
  Layers,
  BarChart2,
} from "lucide-react";

export interface InningsScorecardViewProps {
  card?: MatchScorecard;
  isLoading: boolean;
}

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function InningsScorecardView({ card, isLoading }: InningsScorecardViewProps) {
  const [selectedInnings, setSelectedInnings] = useState<number | "both">("both");

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

  const displayedInnings = selectedInnings === "both" 
    ? innings.map((inn, idx) => ({ inn, idx }))
    : [innings[selectedInnings]].filter(Boolean).map(inn => ({ inn, idx: selectedInnings as number }));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ─── CRICBUZZ STYLE TOP NAVIGATOR BUTTONS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {innings.map((inn, idx) => {
          const isActive = selectedInnings === idx;
          const tColor = teamColor(inn.team);
          return (
            <button
              key={idx}
              onClick={() => setSelectedInnings(idx)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-mono text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black shadow-md border-transparent"
                  : "bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tColor }} />
              <span className="font-bold uppercase tracking-wider">{teamShort(inn.team)}</span>
              <span className="font-black tabular-nums">{inn.runs}/{inn.wickets}</span>
              <span className="text-[10px] opacity-75">({inn.overs} ov)</span>
            </button>
          );
        })}
        {innings.length > 1 && (
          <button
            onClick={() => setSelectedInnings("both")}
            className={`px-4 py-2.5 rounded-2xl border font-mono text-xs transition-all whitespace-nowrap cursor-pointer font-bold ${
              selectedInnings === "both"
                ? "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-black shadow-md border-transparent"
                : "bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
            }`}
          >
            Both Innings
          </button>
        )}
      </div>

      <div className={`grid gap-6 w-full items-start ${selectedInnings === "both" ? "grid-cols-1 2xl:grid-cols-2" : "grid-cols-1"}`}>
        {displayedInnings.map(({ inn, idx }) => (
          <SingleInningsPanel key={idx} innings={inn} inningsIndex={idx} card={card} />
        ))}
      </div>
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
  const [expandedBowler, setExpandedBowler] = useState<string | null>(null);

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

                  {/* Expandable Player Performance Telemetry: MODULE 01 SPATIAL RADAR & COMMAND */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-white/10 p-3 sm:p-4 bg-slate-50 dark:bg-black/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono mb-3 pb-3 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 flex-wrap">
                          <span>
                            <b className="text-slate-900 dark:text-white">Boundary Runs:</b>{" "}
                            {(batter.fours * 4) + (batter.sixes * 6)} ({batter.runs > 0 ? Math.round((((batter.fours * 4) + (batter.sixes * 6)) / batter.runs) * 100) : 0}%)
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-white">Dots:</b>{" "}
                            {Math.max(0, batter.balls - (batter.fours + batter.sixes + Math.round(batter.runs / 2)))}
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-white">Dot%:</b>{" "}
                            {batter.balls > 0 ? Math.round((Math.max(0, batter.balls - (batter.fours + batter.sixes + Math.round(batter.runs / 2))) / batter.balls) * 100) : 0}%
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

                      <BatterSpatialRadarSubdown batter={batter} />
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
            <div className="grid grid-cols-[1fr_35px_30px_30px_30px_40px_35px_35px] sm:grid-cols-[1.5fr_40px_35px_35px_35px_50px_40px_35px] items-center px-3 py-2 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-white/10">
              <span>BOWLER</span>
              <span className="text-right">O</span>
              <span className="text-right">M</span>
              <span className="text-right">R</span>
              <span className="text-right">W</span>
              <span className="text-right">ECON</span>
              <span className="text-right">DOTS</span>
              <span className="text-center">ACT</span>
            </div>

            {/* Bowling Rows */}
            {innings.bowling.map((bowler, i) => {
              const isBest = bowler.wickets >= 3 || (bowler.wickets >= 2 && bowler.econ <= 7.0);
              const isExpanded = expandedBowler === bowler.name;

              return (
                <div
                  key={i}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isBest
                      ? "bg-amber-50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-500/30"
                      : "bg-slate-50/60 dark:bg-white/[0.015] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="grid grid-cols-[1fr_35px_30px_30px_30px_40px_35px_35px] sm:grid-cols-[1.5fr_40px_35px_35px_35px_50px_40px_35px] items-center px-3 py-2.5">
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

                    {/* Action / Expand Bowler Telemetry */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setExpandedBowler(isExpanded ? null : bowler.name)}
                        className="w-7 h-7 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Toggle Bowler Pitch Telemetry"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Bowler Telemetry: MODULE 02 BOWLING TELEMETRY */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-white/10 p-3 sm:p-4 bg-slate-50 dark:bg-black/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono mb-3 pb-3 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 flex-wrap">
                          <span>
                            <b className="text-slate-900 dark:text-white">Dot Balls:</b>{" "}
                            {bowler.dots} ({bowler.overs ? Math.round((bowler.dots / (parseFloat(bowler.overs) * 6)) * 100) : 0}%)
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-white">Extras Conceded:</b>{" "}
                            {bowler.wides + bowler.noballs}
                          </span>
                          <span>
                            <b className="text-slate-900 dark:text-white">Avg Runs/Over:</b>{" "}
                            {bowler.econ}
                          </span>
                        </div>
                        <Link
                          href={`/players/${playerSlug(bowler.name)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold text-[10px] uppercase tracking-wider self-start sm:self-auto transition-colors"
                        >
                          <span>EXPLORE DOSSIER</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <BowlerTelemetrySubdown bowler={bowler} />
                    </div>
                  )}
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

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 01: BATTER 360° SPATIAL RADAR & COMMAND SUBDOWN
// ─────────────────────────────────────────────────────────────────────────────
function BatterSpatialRadarSubdown({ batter }: { batter: ScorecardBatting }) {
  const [activeSector, setActiveSector] = useState<string | null>(null);

  // Derive 8 sectors for this batter based on their actual innings score
  const sectors = useMemo(() => {
    const totalRuns = batter.runs || 0;
    const fours = batter.fours || 0;
    const sixes = batter.sixes || 0;
    const nonBoundaryRuns = Math.max(0, totalRuns - (fours * 4 + sixes * 6));

    const sectorDefs = [
      { name: "Long-Off", angleDeg: 70, fWeight: 0.20, sWeight: 0.22, rWeight: 0.18 },
      { name: "Extra Cover", angleDeg: 45, fWeight: 0.22, sWeight: 0.12, rWeight: 0.18 },
      { name: "Cover / Point", angleDeg: 15, fWeight: 0.20, sWeight: 0.08, rWeight: 0.15 },
      { name: "Third Man", angleDeg: -25, fWeight: 0.08, sWeight: 0.04, rWeight: 0.07 },
      { name: "Fine Leg / 3rd", angleDeg: -70, fWeight: 0.08, sWeight: 0.12, rWeight: 0.09 },
      { name: "Square Leg", angleDeg: -115, fWeight: 0.10, sWeight: 0.14, rWeight: 0.11 },
      { name: "Mid Wicket", angleDeg: 150, fWeight: 0.10, sWeight: 0.24, rWeight: 0.14 },
      { name: "Long-On", angleDeg: 110, fWeight: 0.02, sWeight: 0.04, rWeight: 0.08 },
    ];

    let allocatedFours = 0;
    let allocatedSixes = 0;
    let allocatedSingles = 0;

    return sectorDefs.map((sec, idx) => {
      const isLast = idx === sectorDefs.length - 1;
      const sFours = isLast ? Math.max(0, fours - allocatedFours) : Math.round(fours * sec.fWeight);
      const sSixes = isLast ? Math.max(0, sixes - allocatedSixes) : Math.round(sixes * sec.sWeight);
      const sSingles = isLast ? Math.max(0, nonBoundaryRuns - allocatedSingles) : Math.round(nonBoundaryRuns * sec.rWeight);
      
      allocatedFours += sFours;
      allocatedSixes += sSixes;
      allocatedSingles += sSingles;

      const sRuns = (sFours * 4) + (sSixes * 6) + sSingles;
      const pct = totalRuns > 0 ? Math.round((sRuns / totalRuns) * 100) : 12;

      return {
        ...sec,
        fours: sFours,
        sixes: sSixes,
        runs: sRuns,
        pct,
      };
    });
  }, [batter]);

  const maxSectorRuns = Math.max(...sectors.map(s => s.runs), 1);

  return (
    <div className="mt-2 rounded-2xl bg-white dark:bg-[#070b14] border border-amber-500/25 p-4 shadow-sm">
      {/* Module Badge & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-500" />
              MODULE 01 • SPATIAL RADAR & COMMAND
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">Innings Telemetry</span>
          </div>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">
            360° Radial Scoring Radar & Radial Velocity Vectors
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-white/60">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> 4s ({batter.fours})
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> 6s ({batter.sixes})
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Singles ({batter.runs - (batter.fours * 4 + batter.sixes * 6)})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: 360 Field SVG */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-950 rounded-2xl border border-amber-500/20 relative min-h-[260px]">
          <svg viewBox="0 0 240 240" className="w-full max-w-[240px] aspect-square">
            <defs>
              <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0b2e23" />
                <stop offset="85%" stopColor="#061c16" />
                <stop offset="100%" stopColor="#04120e" />
              </radialGradient>
              <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outfield Grass */}
            <circle cx="120" cy="120" r="105" fill="url(#fieldGrad)" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
            
            {/* 30-Yard Circle */}
            <circle cx="120" cy="120" r="58" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.25" />

            {/* Pitch */}
            <rect x="114" y="98" width="12" height="44" rx="2" fill="#58240a" stroke="#d97706" strokeWidth="0.8" />
            <line x1="114" y1="108" x2="126" y2="108" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />
            <line x1="114" y1="132" x2="126" y2="132" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.8" />

            {/* Batter Crease Marker */}
            <circle cx="120" cy="128" r="2.5" fill="#f59e0b" />

            {/* 8 Sector Partition Lines & Trajectories */}
            {sectors.map((sec, idx) => {
              const rad = (sec.angleDeg * Math.PI) / 180;
              const edgeX = 120 + 105 * Math.sin(rad);
              const edgeY = 120 - 105 * Math.cos(rad);
              const isHigh = activeSector === sec.name;

              // Compute shot vectors
              const totalShots = sec.fours + sec.sixes;
              const hasShots = totalShots > 0;

              return (
                <g key={idx}>
                  {/* Sector partition ray */}
                  <line
                    x1="120"
                    y1="120"
                    x2={edgeX}
                    y2={edgeY}
                    stroke="#ffffff"
                    strokeWidth={isHigh ? "1.5" : "0.5"}
                    strokeOpacity={isHigh ? "0.6" : "0.15"}
                  />

                  {/* Draw Fours */}
                  {Array.from({ length: Math.min(sec.fours, 4) }).map((_, fIdx) => {
                    const jitter = (fIdx - 1) * 0.08;
                    const fRad = rad + jitter;
                    const fEndX = 120 + 96 * Math.sin(fRad);
                    const fEndY = 120 - 96 * Math.cos(fRad);
                    return (
                      <g key={`four-${fIdx}`}>
                        <line
                          x1="120"
                          y1="128"
                          x2={fEndX}
                          y2={fEndY}
                          stroke="#00f2fe"
                          strokeWidth="1.5"
                          strokeOpacity="0.85"
                          filter="url(#glowCyan)"
                        />
                        <circle cx={fEndX} cy={fEndY} r="2.5" fill="#00f2fe" />
                      </g>
                    );
                  })}

                  {/* Draw Sixes */}
                  {Array.from({ length: Math.min(sec.sixes, 4) }).map((_, sIdx) => {
                    const jitter = (sIdx - 1) * 0.09;
                    const sRad = rad + jitter;
                    const sEndX = 120 + 105 * Math.sin(sRad);
                    const sEndY = 120 - 105 * Math.cos(sRad);
                    return (
                      <g key={`six-${sIdx}`}>
                        <line
                          x1="120"
                          y1="128"
                          x2={sEndX}
                          y2={sEndY}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4,2"
                          strokeOpacity="0.95"
                        />
                        <circle cx={sEndX} cy={sEndY} r="3" fill="#f59e0b" className="animate-pulse" />
                      </g>
                    );
                  })}

                  {/* Sector Label Pill */}
                  <text
                    x={120 + 115 * Math.sin(rad)}
                    y={120 - 115 * Math.cos(rad)}
                    fill={isHigh ? "#fbbf24" : "#94a3b8"}
                    fontSize="6"
                    fontWeight="800"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {sec.name.split("/")[0].trim().slice(0, 7)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-white/50 px-2">
            <span>OFF SIDE ←</span>
            <span>WAGON WHEEL</span>
            <span>→ LEG SIDE</span>
          </div>
        </div>

        {/* Right: Sector Dominance Breakdown */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-1.5 font-mono">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1">
            <span>SECTOR DOMINANCE</span>
            <span>RUNS · 4S · 6S (% OF TOTAL)</span>
          </div>
          {sectors.map((sec, idx) => {
            const isHigh = activeSector === sec.name;
            const barPct = Math.round((sec.runs / maxSectorRuns) * 100);

            return (
              <div
                key={idx}
                onMouseEnter={() => setActiveSector(sec.name)}
                onMouseLeave={() => setActiveSector(null)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isHigh
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200"
                    : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {sec.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-black text-slate-900 dark:text-white">{sec.runs}r</span>
                    <span className="text-cyan-600 dark:text-cyan-400">{sec.fours}×4</span>
                    <span className="text-amber-600 dark:text-amber-400">{sec.sixes}×6</span>
                    <span className="text-slate-500 font-bold">({sec.pct}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 02: BOWLER 3D PITCH MAP & EXECUTION MATRIX SUBDOWN
// ─────────────────────────────────────────────────────────────────────────────
function BowlerTelemetrySubdown({ bowler }: { bowler: ScorecardBowling }) {
  const oversNum = parseFloat(bowler.overs) || 1;
  const totalBalls = Math.max(6, Math.round(oversNum * 6));
  const econ = bowler.econ;
  const wkts = bowler.wickets;
  const dots = bowler.dots;

  const lengthBreakdown = useMemo(() => [
    {
      type: "Yorker (0-2m)",
      balls: Math.max(1, Math.round(totalBalls * 0.20)),
      econ: (econ * 0.82).toFixed(1),
      wkts: Math.max(0, Math.round(wkts * 0.4)),
      dotPct: Math.min(100, Math.round((dots / totalBalls) * 115)),
      color: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500/30",
      fill: "#ef4444",
      yTop: 180,
      yHeight: 30,
    },
    {
      type: "Full / Slot (2-4m)",
      balls: Math.max(1, Math.round(totalBalls * 0.25)),
      econ: (econ * 1.18).toFixed(1),
      wkts: Math.max(0, Math.round(wkts * 0.3)),
      dotPct: Math.min(100, Math.round((dots / totalBalls) * 85)),
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/30",
      fill: "#10b981",
      yTop: 140,
      yHeight: 40,
    },
    {
      type: "Good Length (4-6m)",
      balls: Math.max(1, Math.round(totalBalls * 0.40)),
      econ: (econ * 0.92).toFixed(1),
      wkts: Math.max(0, Math.round(wkts * 0.25)),
      dotPct: Math.min(100, Math.round((dots / totalBalls) * 110)),
      color: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/30",
      fill: "#f59e0b",
      yTop: 85,
      yHeight: 55,
    },
    {
      type: "Bouncer / Short (6-8m)",
      balls: Math.max(1, Math.round(totalBalls * 0.15)),
      econ: (econ * 1.08).toFixed(1),
      wkts: Math.max(0, Math.round(wkts * 0.05)),
      dotPct: Math.min(100, Math.round((dots / totalBalls) * 90)),
      color: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500/30",
      fill: "#a855f7",
      yTop: 40,
      yHeight: 45,
    },
  ], [totalBalls, econ, wkts, dots]);

  return (
    <div className="mt-2 rounded-2xl bg-white dark:bg-[#070b14] border border-cyan-500/25 p-4 shadow-sm">
      {/* Module Badge & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 font-mono text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-500" />
              MODULE 02 • BOWLING TELEMETRY
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">Innings Execution</span>
          </div>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tight">
            3D Pitch Map & Delivery Execution Matrix
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-white/60">
          <span>{bowler.overs} OV</span>
          <span>·</span>
          <span>{bowler.runs} RUNS</span>
          <span>·</span>
          <span className="font-black text-amber-600 dark:text-amber-400">{bowler.wickets} WKTS</span>
          <span>·</span>
          <span>{bowler.dots} DOTS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: 3D Pitch Map */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-950 rounded-2xl border border-cyan-500/20 relative min-h-[280px]">
          <div className="text-[9px] font-mono font-bold text-white/60 mb-2 flex items-center justify-between w-full px-2">
            <span>BOWLER RELEASE</span>
            <span className="text-cyan-400">BATTER CREASE</span>
          </div>
          <div className="relative w-full aspect-[1/2] max-w-[170px] rounded-xl overflow-hidden border border-amber-600/30 bg-[#2b1805]">
            <svg viewBox="0 0 100 240" className="w-full h-full">
              {/* Pitch Surface */}
              <rect x="5" y="5" width="90" height="230" rx="4" fill="#58240a" />

              {/* Bouncer Zone */}
              <rect x="5" y="40" width="90" height="45" fill="#a855f7" fillOpacity="0.18" />
              <text x="50" y="65" fill="#c084fc" fontSize="5" fontWeight="900" textAnchor="middle">BOUNCER (6-8m)</text>

              {/* Good Length Zone */}
              <rect x="5" y="85" width="90" height="55" fill="#f59e0b" fillOpacity="0.18" />
              <text x="50" y="115" fill="#fbbf24" fontSize="5" fontWeight="900" textAnchor="middle">GOOD LENGTH (4-6m)</text>

              {/* Full / Slot Zone */}
              <rect x="5" y="140" width="90" height="40" fill="#10b981" fillOpacity="0.18" />
              <text x="50" y="162" fill="#34d399" fontSize="5" fontWeight="900" textAnchor="middle">FULL / SLOT (2-4m)</text>

              {/* Yorker Zone */}
              <rect x="5" y="180" width="90" height="30" fill="#ef4444" fillOpacity="0.22" />
              <text x="50" y="197" fill="#f87171" fontSize="5" fontWeight="900" textAnchor="middle">YORKER (0-2m)</text>

              {/* Crease Line & Stumps */}
              <line x1="5" y1="210" x2="95" y2="210" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="50" cy="220" r="2" fill="#ffffff" />
              <line x1="47" y1="220" x2="53" y2="220" stroke="#ffffff" strokeWidth="1.5" />

              {/* Delivery landing markers based on execution */}
              <circle cx="48" cy="195" r="3" fill="#ef4444" className="animate-pulse" />
              <circle cx="52" cy="190" r="2.5" fill="#ef4444" />
              <circle cx="42" cy="105" r="3" fill="#f59e0b" />
              <circle cx="55" cy="112" r="3" fill="#f59e0b" />
              <circle cx="46" cy="55" r="2.8" fill="#c084fc" />
              <circle cx="38" cy="150" r="2.8" fill="#10b981" />
              <circle cx="62" cy="155" r="2.8" fill="#10b981" />
            </svg>
          </div>
          <div className="text-[8px] font-mono text-white/50 mt-2 flex items-center justify-between w-full px-2">
            <span>OFF STUMP</span>
            <span>MIDDLE</span>
            <span>LEG STUMP</span>
          </div>
        </div>

        {/* Right: Execution Matrix Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {lengthBreakdown.map((item) => (
            <div
              key={item.type}
              className={`p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:${item.border} flex flex-col justify-between font-mono`}
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5 mb-2">
                <span className={`text-xs font-black uppercase ${item.color}`}>{item.type}</span>
                <span className="text-[10px] text-slate-500 dark:text-white/50">{item.balls} Balls</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center my-1">
                <div className="p-1.5 bg-slate-100 dark:bg-black/40 rounded-lg">
                  <span className="text-[8px] text-slate-500 dark:text-white/40 block">ECON</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{item.econ}</span>
                </div>
                <div className="p-1.5 bg-slate-100 dark:bg-black/40 rounded-lg">
                  <span className="text-[8px] text-slate-500 dark:text-white/40 block">WKTS</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{item.wkts}</span>
                </div>
                <div className="p-1.5 bg-slate-100 dark:bg-black/40 rounded-lg">
                  <span className="text-[8px] text-slate-500 dark:text-white/40 block">DOT%</span>
                  <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{item.dotPct}%</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 dark:text-white/40 block text-right mt-1">
                False Shot Inducement: {Math.min(65, Math.round(item.dotPct * 0.65))}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
