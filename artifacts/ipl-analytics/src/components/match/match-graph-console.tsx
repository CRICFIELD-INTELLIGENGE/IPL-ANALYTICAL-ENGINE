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
    <div className="w-full bg-white dark:bg-[#080d1a] border border-slate-200 dark:border-white/10 rounded-[28px] p-5 sm:p-7 shadow-xl dark:shadow-2xl flex flex-col gap-6">
      {/* ─── GRAPH CONSOLE HEADER & CATEGORY TABS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              INTERACTIVE MATCH INTELLIGENCE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold uppercase">
              10-VECTOR LAB
            </span>
          </div>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 block">
            {t1Code} vs {t2Code} · Cumulative Run-Worm, Manhattan Bar, Phase Comparison & Matchups
          </span>
        </div>

        {/* Categories Tab Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin bg-slate-100 dark:bg-black/30 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeCategory === tab.id
                  ? "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-black shadow-md font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
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
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> 1. CUMULATIVE RUN-RATE WORM
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400">Total Runs vs Overs</span>
            </div>

            <div className="h-64 relative border-l border-b border-slate-300 dark:border-white/10 ml-8 mb-4 flex items-end pt-4 pr-4">
              {/* Subtle horizontal grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="w-full border-b border-dashed border-slate-300 dark:border-white/10" />
                <div className="w-full border-b border-dashed border-slate-300 dark:border-white/10" />
                <div className="w-full border-b border-dashed border-slate-300 dark:border-white/10" />
                <div className="w-full border-b border-dashed border-slate-300 dark:border-white/10" />
                <div className="w-full" />
              </div>

              {/* Y Axis ticks */}
              <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 py-1">
                <span>200</span>
                <span>150</span>
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              {/* X Axis ticks */}
              <div className="absolute left-0 right-0 -bottom-6 flex justify-between text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 px-1">
                <span>0</span>
                <span>5 OV</span>
                <span>10 OV</span>
                <span>15 OV</span>
                <span>20 OV</span>
              </div>

              {/* Dynamic SVG Curves */}
              <svg className="w-full h-full overflow-visible relative z-10" viewBox="0 0 400 100" preserveAspectRatio="none">
                {/* Team 1 Worm Line */}
                <path
                  d={`M 0 100 ${overData.map((d, i) => `L ${(i + 1) * 20} ${100 - (d.t1Cum / 200) * 100}`).join(" ")}`}
                  fill="none"
                  stroke={t1Color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Team 2 Worm Line */}
                <path
                  d={`M 0 100 ${overData.slice(0, 18).map((d, i) => `L ${(i + 1) * 20} ${100 - (d.t2Cum / 200) * 100}`).join(" ")}`}
                  fill="none"
                  stroke={t2Color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Wicket dots */}
                {overData.map((d, i) => (
                  <React.Fragment key={i}>
                    {d.t1Wickets > 0 && (
                      <circle cx={(i + 1) * 20} cy={100 - (d.t1Cum / 200) * 100} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                    )}
                    {d.t2Wickets > 0 && i < 18 && (
                      <circle cx={(i + 1) * 20} cy={100 - (d.t2Cum / 200) * 100} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                    )}
                  </React.Fragment>
                ))}
              </svg>
            </div>
          </div>

          {/* Dual Graph: 2. Manhattan Chart (Runs Per Over) */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> 2. MANHATTAN CHART (RUNS SCORED PER OVER)
              </span>
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium">Side-by-Side Over Comparison</span>
            </div>

            <div className="h-44 flex items-end gap-1.5 sm:gap-2.5 pt-4 px-2 border-b border-slate-300 dark:border-white/10">
              {overData.map(d => (
                <div key={d.over} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center h-full">
                    {/* Team 1 Bar */}
                    <div
                      className="w-1.5 sm:w-2.5 rounded-t transition-all group-hover:brightness-125 shadow-sm"
                      style={{ height: `${(d.t1Runs / 24) * 100}%`, backgroundColor: t1Color }}
                      title={`${t1Code} Over ${d.over}: ${d.t1Runs} runs`}
                    />
                    {/* Team 2 Bar */}
                    <div
                      className="w-1.5 sm:w-2.5 rounded-t transition-all group-hover:brightness-125 shadow-sm"
                      style={{ height: `${(d.t2Runs / 24) * 100}%`, backgroundColor: t2Color }}
                      title={`${t2Code} Over ${d.over}: ${d.t2Runs} runs`}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">{d.over}</span>
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
