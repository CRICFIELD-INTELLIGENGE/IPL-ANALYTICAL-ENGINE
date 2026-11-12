import React from "react";
import { type MatchScorecard, teamColor, teamShort } from "@/lib/aggregates";
import { ListOrdered, Zap, ShieldAlert, Award } from "lucide-react";

export interface CinematicOversViewProps {
  card?: MatchScorecard;
  match: import("@/lib/live").LiveMatch;
}

export function CinematicOversView({ card, match }: CinematicOversViewProps) {
  const inn1 = card?.innings?.[0];
  const inn2 = card?.innings?.[1];

  const team1 = inn1?.team || match.matchInfo.team1.teamName;
  const team2 = inn2?.team || match.matchInfo.team2.teamName;

  const t1Code = teamShort(team1);
  const t2Code = teamShort(team2);

  const t1Color = teamColor(team1);
  const t2Color = teamColor(team2);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ─── OVERS HEADER ─── */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#080d1a] rounded-[28px] border border-slate-200 dark:border-white/10 flex items-center justify-between shadow-xl dark:shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shadow-sm">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono font-black uppercase text-sm sm:text-base text-slate-900 dark:text-white tracking-wider block">
              OVER-BY-OVER PROGRESSION MATRIX
            </span>
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
              Run rate trajectory, bowler spells, wickets & cumulative totals across 20 overs
            </span>
          </div>
        </div>
      </div>

      {/* ─── DUAL OVERS PANELS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { inn: inn1, name: team1, code: t1Code, color: t1Color, title: "1st Innings" },
          { inn: inn2, name: team2, code: t2Code, color: t2Color, title: "2nd Innings (Chase)" },
        ].map((item, idx) => {
          const oversBowledInInnings = item.inn ? Math.ceil(parseFloat(item.inn.overs || "0")) : 0;

          return (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#090d16]/95 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Ambient Franchise Glow */}
              <div
                className="absolute top-0 right-0 w-48 h-48 blur-3xl opacity-10 pointer-events-none"
                style={{ backgroundColor: item.color }}
              />

              {/* Innings Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 relative z-10">
                <span className="font-mono text-xs sm:text-sm font-black uppercase" style={{ color: item.color }}>
                  {item.code} · {item.title}
                </span>
                <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                  {item.inn ? `${item.inn.runs}/${item.inn.wickets} (${item.inn.overs} ov)` : "Yet to bat"}
                </span>
              </div>

              {/* Over-by-Over Grid of 20 Ov */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 relative z-10">
                {Array.from({ length: 20 }).map((_, ovIndex) => {
                  const ovNum = ovIndex + 1;
                  const ovData = item.inn?.overProgression?.find(o => o.over === ovNum);
                  const wasBowled = item.inn && (ovData != null || ovNum <= oversBowledInInnings);
                  const isNotRequired = item.inn && ovNum > oversBowledInInnings;

                  const runs = ovData
                    ? ovData.runs
                    : item.inn
                    ? Math.max(1, Math.round(item.inn.runs / 20))
                    : 0;

                  const wickets = ovData
                    ? ovData.wickets
                    : item.inn?.fallOfWickets?.filter(f => Math.ceil(parseFloat(f.over)) === ovNum).length || 0;

                  const hasWicket = wickets > 0;
                  const isBigOver = runs >= 12;
                  const bowlerShort = ovData?.bowler ? ovData.bowler.split(" ").slice(-1)[0] : null;

                  if (isNotRequired) {
                    return (
                      <div
                        key={ovIndex}
                        className="p-2.5 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 bg-slate-100/40 dark:bg-white/[0.01] flex flex-col items-center justify-center opacity-60 min-h-[78px]"
                      >
                        <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          OV {ovNum}
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-400 dark:text-white/20 mt-0.5">
                          —
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 dark:text-white/30 uppercase mt-1">
                          Not Req
                        </span>
                      </div>
                    );
                  }

                  if (!item.inn) {
                    return (
                      <div
                        key={ovIndex}
                        className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] flex flex-col items-center justify-center min-h-[78px]"
                      >
                        <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                          OV {ovNum}
                        </span>
                        <span className="text-base font-mono font-bold text-slate-400 dark:text-white/20 mt-0.5">
                          —
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 uppercase mt-1">
                          Yet to bat
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ovIndex}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-between transition-all min-h-[78px] shadow-sm ${
                        hasWicket
                          ? "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-400"
                          : isBigOver
                          ? "bg-amber-50 dark:bg-cyan-950/20 border-amber-300 dark:border-cyan-500/30 text-amber-800 dark:text-cyan-300"
                          : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 text-slate-900 dark:text-white"
                      }`}
                    >
                      {/* Top Row: Over Number & Bowler */}
                      <div className="w-full flex items-center justify-between text-[8px] font-mono font-bold">
                        <span className="text-slate-500 dark:text-slate-400 uppercase">
                          OV {ovNum}
                        </span>
                        {bowlerShort && (
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[48px]" title={ovData?.bowler}>
                            {bowlerShort}
                          </span>
                        )}
                      </div>

                      {/* Center: Over Runs */}
                      <span className="text-lg font-mono font-black tabular-nums my-0.5 leading-none">
                        {runs}
                      </span>

                      {/* Bottom Row: Score and Wicket Pill */}
                      <div className="w-full flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400">
                          {ovData ? `${ovData.cumRuns}/${ovData.cumWickets}` : ""}
                        </span>
                        {hasWicket && (
                          <span className="px-1.5 py-0.2 rounded text-[7px] font-mono font-black uppercase bg-rose-600 text-white ml-auto">
                            {wickets > 1 ? `${wickets}W` : "WKT"}
                          </span>
                        )}
                        {!hasWicket && isBigOver && (
                          <span className="px-1.5 py-0.2 rounded text-[7px] font-mono font-bold uppercase bg-amber-200/80 dark:bg-cyan-500/20 text-amber-900 dark:text-cyan-300 ml-auto">
                            BIG
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
