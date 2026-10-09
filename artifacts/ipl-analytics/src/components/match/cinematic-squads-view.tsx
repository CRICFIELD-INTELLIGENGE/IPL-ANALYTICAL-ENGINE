import React from "react";
import { Link } from "wouter";
import { type MatchScorecard, teamShort, teamColor, playerSlug } from "@/lib/aggregates";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";
import { Users, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";

export interface CinematicSquadsViewProps {
  match: import("@/lib/live").LiveMatch;
  card?: MatchScorecard;
}

const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CinematicSquadsView({ match, card }: CinematicSquadsViewProps) {
  const squads = card?.squads ?? [];

  if (squads.length === 0) {
    return (
      <div className="p-16 text-center text-white/40 font-mono text-sm border border-white/10 rounded-[28px] bg-white/[0.02]">
        No confirmed playing XI team sheet is available for this match.
      </div>
    );
  }

  // Map participation stats for each player in this match
  const participation = new Map<string, { runs?: string; bowling?: string }>();
  for (const inn of card?.innings ?? []) {
    for (const b of inn.batting) {
      participation.set(b.name, {
        runs: `${b.runs}${b.notOut ? "*" : ""} (${b.balls})`,
      });
    }
    for (const b of inn.bowling) {
      const prev = participation.get(b.name) || {};
      participation.set(b.name, {
        ...prev,
        bowling: `${b.wickets}/${b.runs} (${b.overs} ov)`,
      });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {squads.map((s, idx) => {
        const tColor = teamColor(s.team);
        const tCode = teamShort(s.team);

        return (
          <div
            key={s.team}
            className="bg-[#090d16]/95 rounded-[28px] border border-white/10 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden relative"
          >
            {/* Ambient Franchise Rim */}
            <div
              className="absolute top-0 right-0 w-48 h-48 blur-3xl opacity-15 pointer-events-none"
              style={{ backgroundColor: tColor }}
            />

            {/* Header: Team & XI Title */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Link href={`/teams/${teamSlug(s.team)}`} className="shrink-0 hover:scale-105 transition-transform">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center p-2 border shadow-lg"
                    style={{ borderColor: `${tColor}60`, backgroundColor: `${tColor}15` }}
                  >
                    <TeamLogo team={tCode} size="w-8 h-8" />
                  </div>
                </Link>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    CONFIRMED LINEUP
                  </span>
                  <Link
                    href={`/teams/${teamSlug(s.team)}`}
                    className="text-base sm:text-lg font-black uppercase text-white hover:text-cyan-300 transition-colors truncate block"
                  >
                    {s.team} XI
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{s.players.length} PLAYERS</span>
              </div>
            </div>

            {/* Players Grid / Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
              {s.players.map((p, n) => {
                const part = participation.get(p);

                return (
                  <Link
                    key={n}
                    href={`/players/${playerSlug(p)}`}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-3 group/p"
                    title={`View ${p}'s Player Dossier`}
                  >
                    {/* Portrait & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 shadow-sm">
                        <PlayerAvatar name={p} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-bold text-white group-hover/p:text-cyan-300 transition-colors truncate">
                          {p}
                        </span>
                        {/* Batting/Bowling Match Contribution */}
                        {part ? (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                            {part.runs && <span className="text-amber-300 font-semibold">{part.runs}</span>}
                            {part.runs && part.bowling && <span>·</span>}
                            {part.bowling && <span className="text-cyan-300 font-semibold">{part.bowling}</span>}
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-500">In Playing XI</span>
                        )}
                      </div>
                    </div>

                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/p:opacity-100 group-hover/p:text-cyan-400 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
