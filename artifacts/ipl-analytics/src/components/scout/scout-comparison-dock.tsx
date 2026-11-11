import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Scale, 
  X, 
  ArrowRight, 
  Trash2, 
  Maximize2, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ExternalLink,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { fetchScoutCompare, type Discipline, type MatchPhase } from "@/lib/scout-api";
import { PlayerAvatar } from "@/components/player-avatar";
import { ScoutRadarComparison } from "@/components/scout/scout-radar-chart";
import { ConfidenceIntervalBadge, RolePill, SampleTierBadge } from "@/components/scout/scout-metric-badge";

interface ScoutComparisonDockProps {
  compareTray: string[];
  onRemovePlayer: (id: string) => void;
  onClearTray: () => void;
  discipline: Discipline;
  phase: MatchPhase;
}

export function ScoutComparisonDock({
  compareTray,
  onRemovePlayer,
  onClearTray,
  discipline,
  phase,
}: ScoutComparisonDockProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);

  // Fetch comparison data when at least 2 players are in the tray and modal is opened
  const { data: compareData, isLoading, isError } = useQuery({
    queryKey: ["scout-compare-dock", compareTray.join(","), discipline, phase],
    queryFn: () =>
      fetchScoutCompare({
        ids: compareTray,
        discipline,
        phase,
      }),
    enabled: isOpenModal && compareTray.length >= 2,
    staleTime: 5 * 60_000,
  });

  if (compareTray.length === 0) return null;

  return (
    <>
      {/* PERSISTENT FLOATING COMPARISON DOCK */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-2xl z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="rounded-2xl bg-[#0B1118]/95 border border-[#4CC9C0]/30 p-3 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          {/* Left: Tray Counter & Player Avatars */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#4CC9C0]/15 text-[#4CC9C0] border border-[#4CC9C0]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F5F7F8] block">
                  Compare Deck ({compareTray.length}/5)
                </span>
                <span className="text-[9px] font-mono text-[#9BAAB5]">
                  Select 2–5 players
                </span>
              </div>
            </div>

            {/* Micro Avatars */}
            <div className="flex items-center -space-x-2 overflow-hidden py-1">
              {compareTray.map((id) => (
                <div
                  key={id}
                  className="relative group w-8 h-8 rounded-full border-2 border-[#0B1118] bg-[#14212A] flex items-center justify-center text-[10px] font-mono font-bold text-[#F5F7F8] shrink-0"
                  title={`ID: ${id}`}
                >
                  <PlayerAvatar name={id} className="w-full h-full rounded-full" disableHover />
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove player"
                    aria-label="Remove player"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClearTray}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-mono transition-colors"
            >
              Clear
            </button>

            {compareTray.length >= 2 ? (
              <button
                type="button"
                onClick={() => setIsOpenModal(true)}
                className="px-4 py-2 rounded-xl bg-[#4CC9C0] hover:bg-[#3bb5ac] text-[#0B1118] text-xs font-mono font-bold tracking-wide transition-all shadow-[0_0_16px_rgba(76,201,192,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Launch Compare</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-[#9BAAB5] px-2 py-1 rounded bg-white/5">
                Pick 1 more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FULL COMPARISON MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-3xl bg-[#0B1118] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-[#14212A] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#4CC9C0]/15 text-[#4CC9C0] border border-[#4CC9C0]/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-[#F5F7F8] uppercase tracking-wide">
                    HEAD-TO-HEAD SCOUT RADAR COMPARISON
                  </h3>
                  <p className="font-body text-xs text-[#9BAAB5]">
                    Comparing {compareTray.length} players across {discipline} metrics in {phase} phase.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/scout/compare?ids=${compareTray.join(",")}&discipline=${discipline}&phase=${phase}`}>
                  <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-mono font-bold transition-all">
                    <span>Full Screen Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {isLoading ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#4CC9C0] border-t-transparent animate-spin" />
                  <p className="text-xs font-mono text-[#9BAAB5]">Retrieving cross-league delta metrics...</p>
                </div>
              ) : isError || !compareData ? (
                <div className="py-16 text-center space-y-2">
                  <p className="text-sm font-bold text-rose-400">Failed to load comparison data.</p>
                  <p className="text-xs font-mono text-[#9BAAB5]">Ensure at least 2 valid player IDs are selected.</p>
                </div>
              ) : (
                <>
                  {/* Side-by-Side Player Profiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {compareData.players.map((cp, idx) => {
                      const rating = cp.rating;
                      const primaryKey = discipline === "batting" ? "strike_rate" : "economy";
                      const primaryMetric = rating?.metrics?.[primaryKey];

                      return (
                        <div
                          key={cp.player.cricsheet_id}
                          className="rounded-2xl bg-[#14212A] border border-white/10 p-4 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#9BAAB5] uppercase">
                                Player #{idx + 1}
                              </span>
                              {rating && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white/5 text-[#F5F7F8] border border-white/10">
                                  {rating.competition.toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#0B1118] border border-white/10">
                                <PlayerAvatar name={cp.player.name} disableHover className="w-full h-full" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-display text-sm font-bold text-[#F5F7F8] truncate">
                                  {cp.player.unique_name || cp.player.name}
                                </h4>
                                <span className="text-[10px] font-mono text-[#9BAAB5] block truncate">
                                  ID: {cp.player.cricsheet_id}
                                </span>
                              </div>
                            </div>

                            {rating && (
                              <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
                                <span className="text-[#9BAAB5]">Role:</span>
                                <RolePill role={rating.role} />
                              </div>
                            )}

                            {rating && (
                              <div className="p-2.5 rounded-xl bg-[#0B1118] border border-white/5 space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-[#9BAAB5]">
                                  <span>Rating Index:</span>
                                  <strong className="text-orange-400 font-mono text-xs">
                                    {primaryMetric?.shrunk != null ? primaryMetric.shrunk.toFixed(1) : "—"}
                                  </strong>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-[#9BAAB5]">
                                  <span>Volume:</span>
                                  <span className="text-[#F5F7F8]">{rating.balls}b ({rating.matches}m)</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-[#9BAAB5]">
                                  <span>95% CI:</span>
                                  <ConfidenceIntervalBadge ci={primaryMetric?.ci} metricId={primaryKey} />
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemovePlayer(cp.player.cricsheet_id)}
                            className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-[10px] font-mono transition-colors"
                          >
                            Remove from Comparison
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Multi-Dimensional Normalized Radar Chart */}
                  <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-display text-sm font-bold text-[#F5F7F8] uppercase tracking-wide">
                        NORMALIZED RADAR PERCENTILE COMPARISON
                      </span>
                      <span className="text-[10px] font-mono text-[#4CC9C0]">
                        0–100 Scale · 100 = League Best
                      </span>
                    </div>

                    <ScoutRadarComparison
                      metrics={compareData.radarMetrics}
                      players={compareData.players}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#14212A] border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-[#9BAAB5]">
                Only players with 120+ balls are plotted on radar percentiles.
              </span>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#F5F7F8] border border-white/10 font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
