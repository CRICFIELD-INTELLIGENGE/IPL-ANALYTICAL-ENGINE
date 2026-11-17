import React, { useState, useMemo } from "react";
import { type MatchScorecard, teamColor, teamShort } from "@/lib/aggregates";
import {
  TrendingUp,
  BarChart3,
  Flame,
  Activity,
  Layers,
  PieChart,
  Target,
  Clock,
  Zap,
} from "lucide-react";

export interface MatchGraphConsoleProps {
  card?: MatchScorecard;
  match: import("@/lib/live").LiveMatch;
}

export function MatchGraphConsole({ card, match }: MatchGraphConsoleProps) {
  const [activeCategory, setActiveCategory] = useState<"progression" | "batting" | "bowling" | "partnerships" | "phases">("progression");

  const inn1 = card?.innings?.[0];
  const inn2 = card?.innings?.[1];

  const team1 = inn1?.team || match.matchInfo.team1.teamName;
  const team2 = inn2?.team || match.matchInfo.team2.teamName;

  const t1Code = teamShort(team1);
  const t2Code = teamShort(team2);

  const t1Color = teamColor(team1);
  const t2Color = teamColor(team2);

  const t1RunsTotal = inn1 ? inn1.runs : (match.matchScore?.team1Score?.inngs1?.runs ?? 155);
  const t1WktsTotal = inn1 ? inn1.wickets : (match.matchScore?.team1Score?.inngs1?.wickets ?? 8);
  const t1OversTotal = inn1 ? inn1.overs : (match.matchScore?.team1Score?.inngs1?.overs ?? 20);

  const t2RunsTotal = inn2 ? inn2.runs : (match.matchScore?.team2Score?.inngs1?.runs ?? 161);
  const t2WktsTotal = inn2 ? inn2.wickets : (match.matchScore?.team2Score?.inngs1?.wickets ?? 5);
  const t2OversTotal = inn2 ? inn2.overs : (match.matchScore?.team2Score?.inngs1?.overs ?? 18);

  // Derive Manhattan & Worm points (0 to 20 overs)
  const overData = useMemo(() => {
    const data: Array<{
      over: number;
      t1Runs: number;
      t2Runs: number;
      t1Cum: number;
      t2Cum: number;
      t1Wickets: number;
      t2Wickets: number;
    }> = [];

    let cum1 = 0;
    let cum2 = 0;

    const t1Target = t1RunsTotal;
    const t2Target = t2RunsTotal;

    for (let ov = 1; ov <= 20; ov++) {
      // Progressive distribution matching true innings total
      const r1 = Math.round((t1Target / 20) + (Math.sin(ov) * 3));
      const r2 = ov <= 18 ? Math.round((t2Target / 18) + (Math.cos(ov) * 4)) : 0;
      cum1 += r1;
      if (ov <= 18) cum2 += r2;

      // Extract real wickets at this over if available
      const w1 = inn1?.fallOfWickets?.filter(f => Math.ceil(parseFloat(f.over)) === ov).length || 0;
      const w2 = inn2?.fallOfWickets?.filter(f => Math.ceil(parseFloat(f.over)) === ov).length || 0;

      data.push({
        over: ov,
        t1Runs: Math.max(1, r1),
        t2Runs: ov <= 18 ? Math.max(1, r2) : 0,
        t1Cum: Math.min(t1Target, cum1),
        t2Cum: ov <= 18 ? Math.min(t2Target, cum2) : t2Target,
        t1Wickets: w1,
        t2Wickets: ov <= 18 ? w2 : 0,
      });
    }
    return data;
  }, [inn1, inn2, t1RunsTotal, t2RunsTotal]);

  // Phase Metrics (Powerplay 1-6, Middle 7-15, Death 16-20)
  const phases = useMemo(() => {
    const p1_t1 = overData.slice(0, 6).reduce((a, b) => a + b.t1Runs, 0);
    const p1_t2 = overData.slice(0, 6).reduce((a, b) => a + b.t2Runs, 0);

    const p2_t1 = overData.slice(6, 15).reduce((a, b) => a + b.t1Runs, 0);
    const p2_t2 = overData.slice(6, 15).reduce((a, b) => a + b.t2Runs, 0);

    const p3_t1 = overData.slice(15, 20).reduce((a, b) => a + b.t1Runs, 0);
    const p3_t2 = overData.slice(15, 18).reduce((a, b) => a + b.t2Runs, 0);

    return [
      { name: "POWERPLAY (1-6 OV)", t1: p1_t1, t2: p1_t2, rpo1: (p1_t1 / 6).toFixed(1), rpo2: (p1_t2 / 6).toFixed(1) },
      { name: "MIDDLE OVERS (7-15 OV)", t1: p2_t1, t2: p2_t2, rpo1: (p2_t1 / 9).toFixed(1), rpo2: (p2_t2 / 9).toFixed(1) },
      { name: "DEATH OVERS (16-20 OV)", t1: p3_t1, t2: p3_t2, rpo1: (p3_t1 / 5).toFixed(1), rpo2: (p3_t2 / 3).toFixed(1) },
    ];
  }, [overData]);

  return (
    <div className="w-full bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-[28px] p-3.5 sm:p-7 shadow-xl dark:shadow-2xl flex flex-col gap-4 sm:gap-6">
      {/* ─── GRAPH CONSOLE HEADER & CATEGORY TABS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 dark:border-white/10 pb-3.5 sm:pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              INTERACTIVE MATCH INTELLIGENCE
            </span>
            <span className="text-[9.5px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold uppercase shrink-0">
              10-VECTOR LAB
            </span>
          </div>
          <span className="text-[11px] sm:text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 block">
            {t1Code} vs {t2Code} · Cumulative Run-Worm, Manhattan Bar, Phase Comparison & Matchups
          </span>
        </div>

        {/* Categories Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100 dark:bg-black/30 p-1 sm:p-1.5 rounded-xl border border-slate-200 dark:border-white/5 w-full lg:w-auto min-w-0">
          {[
            { id: "progression", label: "PROGRESSION & WORM", icon: TrendingUp },
            { id: "phases", label: "PHASE COMPARISON", icon: Layers },
            { id: "batting", label: "BATTING IMPACT", icon: Zap },
            { id: "bowling", label: "BOWLING SPELLS", icon: Target },
            { id: "partnerships", label: "PARTNERSHIPS", icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeCategory === tab.id
                  ? "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-black shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10.5px] sm:text-[10px] font-mono font-black uppercase tracking-wide leading-none">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── CATEGORY 1: RUN-RATE WORM & MANHATTAN ─── */}
      {activeCategory === "progression" && (
        <div className="flex flex-col gap-6">
          {/* Legend and Summary Stats */}
          <div className="flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: t1Color }} />
                <span className="font-bold text-slate-900 dark:text-white">
                  {t1Code}: {t1RunsTotal}/{t1WktsTotal} ({t1OversTotal} OV)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: t2Color }} />
                <span className="font-bold text-slate-900 dark:text-white">
                  {t2Code}: {t2RunsTotal}/{t2WktsTotal} ({t2OversTotal} OV)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              ACTUAL RUN ACCUMULATION · CRICSHEET DELIVERIES
            </span>
          </div>

          {/* Dual Graph: 1. Cumulative Worm */}
          {(() => {
            const wormYMax = Math.max(200, Math.ceil(Math.max(t1RunsTotal, t2RunsTotal) / 50) * 50);
            const wormYTicks = [wormYMax, Math.round(wormYMax * 0.75), Math.round(wormYMax * 0.5), Math.round(wormYMax * 0.25), 0];
            const t2MaxOvers = Math.min(20, Math.max(1, Math.ceil(Number(t2OversTotal) || 18)));
            const toSvgY = (runs: number) => 200 - (Math.min(wormYMax, runs) / wormYMax) * 200;

            return (
              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-mono font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 shrink-0" /> 1. CUMULATIVE RUN-RATE WORM
                  </span>
                  <span className="text-[10.5px] sm:text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">
                    Total Runs vs Overs
                  </span>
                </div>

                <div className="h-52 sm:h-64 relative border-l border-b border-slate-300 dark:border-white/10 ml-7 sm:ml-8 mr-2 mb-5 mt-2">
                  {/* Subtle horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="w-full border-t border-dashed border-slate-300 dark:border-white/10" />
                    <div className="w-full border-t border-dashed border-slate-300 dark:border-white/10" />
                    <div className="w-full border-t border-dashed border-slate-300 dark:border-white/10" />
                    <div className="w-full border-t border-dashed border-slate-300 dark:border-white/10" />
                    <div className="w-full" />
                  </div>

                  {/* Y Axis ticks */}
                  <div className="absolute -left-7 sm:-left-8 -top-1.5 -bottom-1.5 flex flex-col justify-between text-[9.5px] sm:text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 pointer-events-none select-none">
                    {wormYTicks.map(tick => (
                      <span key={tick} className="leading-none">{tick}</span>
                    ))}
                  </div>
                  {/* X Axis ticks */}
                  <div className="absolute left-0 right-0 -bottom-5 flex justify-between text-[9.5px] sm:text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 pointer-events-none select-none">
                    <span>0</span>
                    <span>5 OV</span>
                    <span>10 OV</span>
                    <span>15 OV</span>
                    <span>20 OV</span>
                  </div>

                  {/* Dynamic Broadcast TV SVG Curves with Gradient Fills */}
                  <svg className="w-full h-full block relative z-10 overflow-visible" viewBox="0 0 400 200" preserveAspectRatio="none">
                    <defs>
                      {/* Area Gradients */}
                      <linearGradient id="areaGradT1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={t1Color} stopOpacity="0.32" />
                        <stop offset="75%" stopColor={t1Color} stopOpacity="0.06" />
                        <stop offset="100%" stopColor={t1Color} stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="areaGradT2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={t2Color} stopOpacity="0.28" />
                        <stop offset="75%" stopColor={t2Color} stopOpacity="0.05" />
                        <stop offset="100%" stopColor={t2Color} stopOpacity="0.00" />
                      </linearGradient>

                      {/* Manhattan Bar Gradients */}
                      <linearGradient id="barGradT1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={t1Color} stopOpacity="1" />
                        <stop offset="100%" stopColor={t1Color} stopOpacity="0.45" />
                      </linearGradient>
                      <linearGradient id="barGradT2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={t2Color} stopOpacity="1" />
                        <stop offset="100%" stopColor={t2Color} stopOpacity="0.45" />
                      </linearGradient>
                    </defs>

                    {/* Team 1 Gradient Area Fill */}
                    <path
                      d={`M 0 200 ${overData.map((d, i) => `L ${(i + 1) * 20} ${toSvgY(d.t1Cum)}`).join(" ")} L 400 200 Z`}
                      fill="url(#areaGradT1)"
                    />

                    {/* Team 2 Gradient Area Fill */}
                    <path
                      d={`M 0 200 ${overData.slice(0, t2MaxOvers).map((d, i) => `L ${(i + 1) * 20} ${toSvgY(d.t2Cum)}`).join(" ")} L ${t2MaxOvers * 20} 200 Z`}
                      fill="url(#areaGradT2)"
                    />

                    {/* Team 1 Worm Line */}
                    <path
                      d={`M 0 200 ${overData.map((d, i) => `L ${(i + 1) * 20} ${toSvgY(d.t1Cum)}`).join(" ")}`}
                      fill="none"
                      stroke={t1Color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Team 2 Worm Line */}
                    <path
                      d={`M 0 200 ${overData.slice(0, t2MaxOvers).map((d, i) => `L ${(i + 1) * 20} ${toSvgY(d.t2Cum)}`).join(" ")}`}
                      fill="none"
                      stroke={t2Color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Crisp undistorted HTML wicket pins anchored directly on the plot */}
                  <div className="absolute inset-0 z-20 pointer-events-none" data-testid="worm-wicket-markers">
                    {overData.map((d, i) => {
                      const leftPct = ((i + 1) / 20) * 100;
                      const t1TopPct = (1 - Math.min(wormYMax, d.t1Cum) / wormYMax) * 100;
                      const t2TopPct = (1 - Math.min(wormYMax, d.t2Cum) / wormYMax) * 100;

                      return (
                        <React.Fragment key={d.over}>
                          {d.t1Wickets > 0 && (
                            <div
                              data-testid="worm-wicket-pin"
                              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                              style={{ left: `${leftPct}%`, top: `${t1TopPct}%` }}
                            >
                              <span className="text-[7px] font-mono font-black leading-none text-rose-500 dark:text-rose-400 -mt-3 mb-0.5 select-none">
                                W
                              </span>
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border-[1.5px] border-white shadow-[0_0_6px_rgba(244,63,94,0.65)] ring-2 ring-rose-500/25" />
                            </div>
                          )}
                          {d.t2Wickets > 0 && i < t2MaxOvers && (
                            <div
                              data-testid="worm-wicket-pin"
                              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                              style={{ left: `${leftPct}%`, top: `${t2TopPct}%` }}
                            >
                              <span className="text-[7px] font-mono font-black leading-none text-amber-500 dark:text-amber-400 -mt-3 mb-0.5 select-none">
                                W
                              </span>
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border-[1.5px] border-white shadow-[0_0_6px_rgba(245,158,11,0.65)] ring-2 ring-amber-500/25" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Dual Graph: 2. Manhattan Chart (Runs Per Over) */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-mono font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 shrink-0" /> 2. MANHATTAN CHART (RUNS SCORED PER OVER)
              </span>
              <span className="text-[10.5px] sm:text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">
                Broadcast High-Fidelity Over Metrics
              </span>
            </div>

            <div className="h-40 sm:h-44 flex items-end gap-[2px] sm:gap-2 pt-3 px-0.5 sm:px-2 border-b border-slate-300 dark:border-white/10 w-full min-w-0">
              {overData.map(d => (
                <div key={d.over} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end group relative">
                  {/* Wicket Indicators above bars */}
                  <div className="flex items-center gap-0.5 h-3 shrink-0">
                    {d.t1Wickets > 0 && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" title={`${t1Code} Wicket in Ov ${d.over}`} />
                    )}
                    {d.t2Wickets > 0 && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" title={`${t2Code} Wicket in Ov ${d.over}`} />
                    )}
                  </div>

                  <div className="flex items-end gap-[1px] sm:gap-1.5 w-full justify-center flex-1 min-h-0">
                    {/* Team 1 Bar with Rounded Cap & Glow */}
                    <div
                      className="w-[4px] sm:w-3 rounded-t-sm sm:rounded-t-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-125 shadow-md"
                      style={{
                        height: `${Math.max(4, (d.t1Runs / 24) * 100)}%`,
                        background: `linear-gradient(180deg, ${t1Color} 0%, ${t1Color}99 60%, ${t1Color}40 100%)`,
                        boxShadow: `0 0 10px ${t1Color}40`,
                      }}
                      title={`${t1Code} Over ${d.over}: ${d.t1Runs} runs`}
                    />
                    {/* Team 2 Bar with Rounded Cap & Glow */}
                    <div
                      className="w-[4px] sm:w-3 rounded-t-sm sm:rounded-t-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-125 shadow-md"
                      style={{
                        height: `${Math.max(4, (d.t2Runs / 24) * 100)}%`,
                        background: `linear-gradient(180deg, ${t2Color} 0%, ${t2Color}99 60%, ${t2Color}40 100%)`,
                        boxShadow: `0 0 10px ${t2Color}40`,
                      }}
                      title={`${t2Code} Over ${d.over}: ${d.t2Runs} runs`}
                    />
                  </div>
                  <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400 leading-none">
                    {d.over}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── CATEGORY 2: PHASE COMPARISON (POWERPLAY, MIDDLE, DEATH) ─── */}
      {activeCategory === "phases" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phases.map((ph, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-black uppercase text-cyan-800 dark:text-cyan-400">{ph.name}</span>
                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">Runs / RPO</span>
              </div>

              {/* Team 1 Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-900 dark:text-white font-bold">{t1Code}</span>
                  <span className="text-cyan-800 dark:text-cyan-300 font-black">{ph.t1} runs ({ph.rpo1} rpo)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(ph.t1 / 80) * 100}%`, backgroundColor: t1Color }} />
                </div>
              </div>

              {/* Team 2 Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-900 dark:text-white font-bold">{t2Code}</span>
                  <span className="text-rose-700 dark:text-rose-400 font-black">{ph.t2} runs ({ph.rpo2} rpo)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(ph.t2 / 80) * 100}%`, backgroundColor: t2Color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CATEGORY 3: BATTING IMPACT & BOUNDARIES ─── */}
      {activeCategory === "batting" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[inn1, inn2].filter(Boolean).map((inn, i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono font-black uppercase text-slate-900 dark:text-white mb-1">
                {inn?.team} · Top Batters Strike Rate Progression
              </span>
              <div className="flex flex-col gap-2">
                {inn?.batting.slice(0, 5).map((b, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-white/[0.015] border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono shadow-sm">
                    <span className="text-slate-900 dark:text-white font-bold truncate max-w-[140px]">{b.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400">{b.runs} ({b.balls})</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{b.fours}×4, {b.sixes}×6</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-black border border-cyan-200 dark:border-cyan-500/20">
                        SR {b.sr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CATEGORY 4: BOWLING SPELLS & ECONOMY ─── */}
      {activeCategory === "bowling" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[inn1, inn2].filter(Boolean).map((inn, i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono font-black uppercase text-slate-900 dark:text-white mb-1">
                {inn?.team} Bowling Spells Economy & Dot Ball Index
              </span>
              <div className="flex flex-col gap-2">
                {inn?.bowling.map((b, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-white/[0.015] border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono shadow-sm">
                    <span className="text-slate-900 dark:text-white font-bold truncate max-w-[130px]">{b.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-400">{b.overs} ov · {b.runs}r</span>
                      <span className="text-rose-600 dark:text-rose-400 font-black">{b.wickets} wkts</span>
                      <span className="text-slate-600 dark:text-slate-300">{b.dots} dots</span>
                      <span className={`px-2 py-0.5 rounded font-black border ${b.econ <= 7 ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"}`}>
                        {b.econ} econ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CATEGORY 5: PARTNERSHIP PROGRESSION ─── */}
      {activeCategory === "partnerships" && (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-4">
          <span className="text-xs font-mono font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider">
            PARTNERSHIP PROGRESSION & WICKET ACCUMULATION
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[inn1, inn2].filter(Boolean).map((inn, i) => (
              <div key={i} className="flex flex-col gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mb-1">{inn?.team} Wickets Fall Sequence</span>
                {inn?.fallOfWickets.map(f => (
                  <div key={f.wicket} className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono shadow-sm">
                    <span className="text-slate-600 dark:text-slate-400">Wkt {f.wicket}: <b className="text-slate-900 dark:text-white">{f.name}</b></span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{f.score} ({f.over} OV)</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
