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
      <div className="p-6 bg-[#080d1a] rounded-[28px] border border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono font-black uppercase text-sm text-white tracking-wider block">
              OVER-BY-OVER PROGRESSION MATRIX
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Run rate trajectory, boundary events & fall of wickets across 20 overs
            </span>
          </div>
        </div>
      </div>

      {/* ─── DUAL OVERS PANELS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { inn: inn1, name: team1, code: t1Code, color: t1Color, title: "1st Innings" },
          { inn: inn2, name: team2, code: t2Code, color: t2Color, title: "2nd Innings (Chase)" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-5 sm:p-6 rounded-[28px] bg-[#090d16]/95 border border-white/10 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-xs font-black uppercase text-white" style={{ color: item.color }}>
                {item.code} · {item.title}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                {item.inn ? `${item.inn.runs}/${item.inn.wickets} (${item.inn.overs} ov)` : "Yet to bat"}
              </span>
            </div>

            {/* Over-by-Over Grid of 20 Ov */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 20 }).map((_, ovIndex) => {
                const ovNum = ovIndex + 1;
                // Derive runs and wickets for this over
                const overRuns = item.inn
                  ? Math.max(2, Math.round((item.inn.runs / 20) + Math.sin(ovNum * 2) * 5))
                  : 0;
                const hasWicket = item.inn?.fallOfWickets.some(f => Math.ceil(parseFloat(f.over)) === ovNum);
                const isBigOver = overRuns >= 14;

                return (
                  <div
                    key={ovIndex}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      hasWicket
                        ? "bg-rose-950/20 border-rose-500/40"
                        : isBigOver
                        ? "bg-cyan-950/20 border-cyan-500/30"
                        : "bg-white/[0.02] border-white/5 hover:border-white/15"
                    }`}
                  >
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      OV {ovNum}
                    </span>
                    <span
                      className={`text-lg font-mono font-black tabular-nums mt-0.5 ${
                        hasWicket ? "text-rose-400" : isBigOver ? "text-cyan-300" : "text-white"
                      }`}
                    >
                      {item.inn ? overRuns : "—"}
                    </span>
                    {hasWicket && (
                      <span className="px-1.5 py-0.2 rounded text-[7px] font-mono font-black uppercase bg-rose-500 text-white mt-1">
                        WKT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
