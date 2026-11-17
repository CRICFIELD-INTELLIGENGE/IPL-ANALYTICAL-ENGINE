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

  if (squads.length === 0 || squads.every(s => s.players.length === 0)) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-white/40 font-mono text-sm border border-slate-200 dark:border-white/10 rounded-[28px] bg-white dark:bg-white/[0.02] shadow-sm">
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

  const renderParticipation = (p: string, compact = false) => {
    const part = participation.get(p);
    if (!part) {
      return (
        <span className={compact ? "text-[8.5px] font-mono text-slate-500 truncate leading-tight" : "text-[9px] font-mono text-slate-500"}>
          {compact ? "Playing XI" : "In Playing XI"}
        </span>
      );
    }

    const compactBowling = compact && part.bowling ? part.bowling.replace(" ov", "") : part.bowling;

    return (
      <div
        className={
          compact
            ? "flex items-center gap-1 text-[8.5px] leading-tight font-mono text-slate-600 dark:text-slate-400 mt-0.5 truncate min-w-0"
            : "flex items-center gap-1 text-[9px] font-mono text-slate-600 dark:text-slate-400 mt-0.5 truncate"
        }
      >
        {part.runs && <span className="text-amber-700 dark:text-amber-300 font-bold shrink-0">{part.runs}</span>}
        {part.runs && compactBowling && <span className="shrink-0">·</span>}
        {compactBowling && <span className="text-cyan-700 dark:text-cyan-300 font-bold truncate">{compactBowling}</span>}
      </div>
    );
  };

  const maxMobilePlayers = squads.length >= 2 ? Math.max(squads[0].players.length, squads[1].players.length) : 0;

  return (
    <>
      {/* Mobile Side-by-Side Comparison View (< lg) */}
      {squads.length >= 2 && (
        <div className="lg:hidden bg-white dark:bg-[#090d16]/95 rounded-[18px] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl overflow-hidden relative w-full">
          {/* Headers Row */}
          <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] w-full border-b border-slate-200 dark:border-white/10">
            {[squads[0], squads[1]].map((s, idx) => {
              const tColor = teamColor(s.team);
              const tCode = teamShort(s.team);

              return (
                <React.Fragment key={s.team}>
                  {idx === 1 && (
                    <div
                      data-testid="mobile-squads-divider"
                      className="w-px bg-slate-200 dark:bg-white/15 self-stretch shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    data-testid={`mobile-squad-col-${idx}`}
                    className="min-w-0 flex items-center justify-between gap-1.5 px-2.5 py-2 relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{ background: `radial-gradient(circle at top left, ${tColor}, transparent 75%)` }}
                    />
                    <Link
                      href={`/teams/${teamSlug(s.team)}`}
                      className="flex items-center gap-1.5 min-w-0 flex-1 relative z-10"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center p-1 border shrink-0 shadow-sm"
                        style={{ borderColor: `${tColor}60`, backgroundColor: `${tColor}15` }}
                      >
                        <TeamLogo team={tCode} size="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-wide block truncate leading-tight">
                          {tCode} XI
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 block truncate leading-tight">
                          {s.team}
                        </span>
                      </div>
                    </Link>

                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 relative z-10">
                      {s.players.length}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Synchronized Side-by-Side Player Rows */}
          <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] w-full py-1">
            {Array.from({ length: maxMobilePlayers }).map((_, rowIdx) => (
              <React.Fragment key={rowIdx}>
                {[squads[0].players[rowIdx], squads[1].players[rowIdx]].map((playerName, sideIdx) => (
                  <React.Fragment key={sideIdx}>
                    {sideIdx === 1 && (
                      <div className="w-px bg-slate-200 dark:bg-white/15 self-stretch shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0 px-1.5 py-0.5">
                      {playerName ? (
                        <Link
                          href={`/players/${playerSlug(playerName)}`}
                          className="h-full px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.025] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/5 transition-all flex items-center gap-1.5 min-w-0"
                          title={`View ${playerName}'s Player Dossier`}
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shrink-0 shadow-sm">
                            <PlayerAvatar name={playerName} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <span className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                              {playerName}
                            </span>
                            {renderParticipation(playerName, true)}
                          </div>
                        </Link>
                      ) : null}
                    </div>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Desktop View (or single-squad fallback) */}
      <div className={`${squads.length >= 2 ? "hidden lg:grid" : "grid grid-cols-1"} lg:grid-cols-2 gap-6 w-full`}>
        {squads.map((s) => {
          const tColor = teamColor(s.team);
          const tCode = teamShort(s.team);

          return (
            <div
              key={s.team}
              className="bg-white dark:bg-[#090d16]/95 rounded-[28px] border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-xl dark:shadow-2xl flex flex-col gap-4 overflow-hidden relative"
            >
              {/* Ambient Franchise Rim */}
              <div
                className="absolute top-0 right-0 w-48 h-48 blur-3xl opacity-15 pointer-events-none"
                style={{ backgroundColor: tColor }}
              />

              {/* Header: Team & XI Title */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 relative z-10">
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
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                      CONFIRMED LINEUP
                    </span>
                    <Link
                      href={`/teams/${teamSlug(s.team)}`}
                      className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors truncate block"
                    >
                      {s.team} XI
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{s.players.length} PLAYERS</span>
                </div>
              </div>

              {/* Players Grid / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                {s.players.map((p, n) => (
                  <Link
                    key={n}
                    href={`/players/${playerSlug(p)}`}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 transition-all flex items-center justify-between gap-3 group/p shadow-sm"
                    title={`View ${p}'s Player Dossier`}
                  >
                    {/* Portrait & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shrink-0 shadow-sm">
                        <PlayerAvatar name={p} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/p:text-cyan-700 dark:group-hover/p:text-cyan-300 transition-colors truncate">
                          {p}
                        </span>
                        {renderParticipation(p, false)}
                      </div>
                    </div>

                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/p:opacity-100 group-hover/p:text-cyan-600 dark:group-hover/p:text-cyan-400 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
