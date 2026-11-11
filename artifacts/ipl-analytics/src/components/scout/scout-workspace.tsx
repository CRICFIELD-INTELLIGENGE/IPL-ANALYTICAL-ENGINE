import React, { useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
  Square,
  Table as TableIcon,
  Sparkles,
  Brain,
  Star,
  Award,
  Crown,
  Medal,
  X,
  Layers
} from "lucide-react";
import type {
  Discipline,
  MatchPhase,
  ScoutRating,
  ScoutRankingsResponse,
} from "@/lib/scout-api";
import {
  SampleTierBadge,
  ShrunkIndexBadge,
  ConfidenceIntervalBadge,
  RolePill,
} from "@/components/scout/scout-metric-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { ScoutDossierPanel } from "@/components/scout/scout-dossier-panel";
import { ScoutScatterExplorer } from "@/components/scout/scout-scatter-explorer";

interface ScoutWorkspaceProps {
  discipline: Discipline;
  setDiscipline: (d: Discipline) => void;
  selectedComps: string[];
  setSelectedComps: React.Dispatch<React.SetStateAction<string[]>>;
  phase: MatchPhase;
  setPhase: (p: MatchPhase) => void;
  role: string;
  setRole: (r: string) => void;
  minBalls: number;
  setMinBalls: (b: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  data?: ScoutRankingsResponse;
  isLoading: boolean;
  isError: boolean;
  error: any;
  refetch: () => void;
  compareTray: string[];
  onToggleCompare: (id: string) => void;
  selectedPlayer: ScoutRating | null;
  onSelectPlayer: (player: ScoutRating | null) => void;
  viewMode: "table" | "scatter";
  setViewMode: (v: "table" | "scatter") => void;
  shortlist?: ScoutRating[];
  onToggleShortlist?: (player: ScoutRating) => void;
  isShortlisted?: (id: string) => boolean;
}

export function ScoutWorkspace({
  discipline,
  minBalls,
  setMinBalls,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  page,
  setPage,
  data,
  isLoading,
  isError,
  error,
  refetch,
  compareTray,
  onToggleCompare,
  selectedPlayer,
  onSelectPlayer,
  viewMode,
  setViewMode,
  shortlist = [],
  onToggleShortlist,
  isShortlisted,
}: ScoutWorkspaceProps) {
  const [metricDisplayMode, setMetricDisplayMode] = useState<"standard" | "bayesian">("standard");

  return (
    <section id="scout-workspace" className="w-full flex flex-col gap-4 text-[#EFF5F7]">
      {/* ── WORKSPACE CONTROLS & SUBHEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A4050] pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-mono font-black tracking-wider text-[#EFF5F7] uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B6E95C]" />
            <span>{discipline === "batting" ? "Batting Global Rankings" : "Bowling Global Rankings"}</span>
          </h2>
          {data && (
            <span className="text-[11px] text-[#9BAAB5] font-mono">
              Showing {data.data.length} of {data.pagination.total} players
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#101F2D] border border-[#2A4050] rounded-xl px-2.5 py-1">
            <span className="text-[10px] text-[#9BAAB5] font-mono uppercase font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-[11px] font-mono font-bold text-[#EFF5F7] focus:outline-none cursor-pointer"
            >
              <option value="shrunk" className="bg-[#101F2D]">
                {discipline === "batting" ? "Impact Strike Rate" : "Impact Economy"}
              </option>
              <option value="balls" className="bg-[#101F2D]">Volume (Balls)</option>
              <option value="matches" className="bg-[#101F2D]">Matches</option>
              {discipline === "batting" ? (
                <>
                  <option value="boundary_pct" className="bg-[#101F2D]">Boundary %</option>
                  <option value="dot_pct" className="bg-[#101F2D]">Dot %</option>
                </>
              ) : (
                <>
                  <option value="dot_pct" className="bg-[#101F2D]">Dot %</option>
                  <option value="boundary_pct" className="bg-[#101F2D]">Boundary %</option>
                </>
              )}
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="p-1 text-[#9BAAB5] hover:text-[#EFF5F7] transition-colors cursor-pointer"
              title={sortOrder === "desc" ? "Descending" : "Ascending"}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {/* Metric Toggle */}
          <div className="inline-flex p-0.5 rounded-xl bg-[#101F2D] border border-[#2A4050] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setMetricDisplayMode("standard")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                metricDisplayMode === "standard"
                  ? "bg-[#B6E95C] text-[#08131F] shadow-sm font-black"
                  : "text-[#9BAAB5] hover:text-[#EFF5F7]"
              }`}
            >
              Impact Ratings
            </button>
            <button
              type="button"
              onClick={() => setMetricDisplayMode("bayesian")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold ${
                metricDisplayMode === "bayesian"
                  ? "bg-purple-500 text-white shadow-sm font-black"
                  : "text-[#9BAAB5] hover:text-[#EFF5F7]"
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>Skill Model</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex rounded-xl bg-[#101F2D] p-0.5 border border-[#2A4050]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "table"
                  ? "bg-white/15 text-[#EFF5F7] shadow"
                  : "text-[#9BAAB5] hover:text-[#EFF5F7]"
              }`}
            >
              <TableIcon className="w-3 h-3" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("scatter")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "scatter"
                  ? "bg-[#FF982E] text-[#08131F] font-black shadow"
                  : "text-[#9BAAB5] hover:text-[#EFF5F7]"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Scatter</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MASTER-DETAIL 12-COLUMN RESPONSIVE GRID ── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Player Rankings (Desktop ~68% width: 8 cols) */}
        <div
          className={`${
            selectedPlayer ? "lg:col-span-8" : "lg:col-span-12"
          } bg-[#101F2D] border border-[#2A4050] rounded-2xl flex flex-col min-w-0 overflow-hidden shadow-xl`}
        >
          {viewMode === "scatter" && data ? (
            <div className="p-4 bg-[#08131F]">
              <ScoutScatterExplorer
                ratings={data.data}
                discipline={discipline}
                onSelectPlayer={onSelectPlayer}
                selectedPlayerId={selectedPlayer?.cricsheet_id}
              />
            </div>
          ) : (
            <>
              {/* Internal horizontal scrolling for wide columns */}
              <div className="w-full overflow-x-auto custom-scrollbar">
                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center space-y-2">
                    <div className="w-7 h-7 rounded-full border-2 border-[#B6E95C] border-t-transparent animate-spin" />
                    <p className="text-xs font-mono text-[#9BAAB5]">Loading verified scout rankings...</p>
                  </div>
                ) : isError ? (
                  <div className="py-16 text-center space-y-3 p-6 font-mono text-xs">
                    <p className="text-sm font-bold text-rose-400">Failed to load rankings.</p>
                    <p className="text-[#9BAAB5]">{(error as any)?.message}</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EFF5F7] font-bold transition-all cursor-pointer"
                    >
                      Retry Query
                    </button>
                  </div>
                ) : data && data.data.length === 0 ? (
                  <div className="py-20 text-center space-y-2 p-6 font-mono">
                    <p className="text-sm font-bold text-[#EFF5F7]">No players found matching current filters.</p>
                    <p className="text-xs text-[#9BAAB5]">Try clearing search terms or selecting All Leagues.</p>
                  </div>
                ) : data ? (
                  <table className="w-full text-left border-collapse font-mono text-xs min-w-[660px]">
                    <thead>
                      <tr className="border-b border-[#2A4050] bg-[#192D3C]/70 text-[10px] font-bold uppercase tracking-wider text-[#9BAAB5]">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[180px]">Player</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3 text-right">Volume</th>
                        {metricDisplayMode === "standard" ? (
                          <>
                            <th className="py-3 px-3 text-right">
                              {discipline === "batting" ? "Impact SR" : "Impact Econ"}
                            </th>
                            <th className="py-3 px-3 text-right">Raw Rate</th>
                            <th className="py-3 px-3 text-right">95% Range</th>
                          </>
                        ) : (
                          <>
                            <th className="py-3 px-3 text-right text-purple-400">Talent Rating</th>
                            <th className="py-3 px-3 text-right text-[#4AC9D8]">Skill Ratio</th>
                            <th className="py-3 px-3 text-right text-[#FF982E]">Sustainability</th>
                          </>
                        )}
                        <th className="py-3 px-3 text-center w-10">★</th>
                        <th className="py-3 px-3 text-center w-10">Compare</th>
                        <th className="py-3 px-3 text-center w-10">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A4050]/40">
                      {data.data.map((r: ScoutRating, idx: number) => {
                        const rank = (data.pagination.page - 1) * data.pagination.limit + idx + 1;
                        const primaryMetricKey = discipline === "batting" ? "strike_rate" : "economy";
                        const primaryMetric = r.metrics[primaryMetricKey];
                        const isComparing = compareTray.includes(r.cricsheet_id);
                        const isSelected = selectedPlayer?.cricsheet_id === r.cricsheet_id;
                        const shortlisted = isShortlisted ? isShortlisted(r.cricsheet_id) : false;

                        // Visual distinct styling for top 3
                        let rankBadge = (
                          <span className="text-[#9BAAB5] font-mono font-bold">{rank}</span>
                        );
                        if (rank === 1) {
                          rankBadge = (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-[11px] shadow-sm" title="Rank 1 Leader">
                              1
                            </span>
                          );
                        } else if (rank === 2) {
                          rankBadge = (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-300/20 border border-slate-300/40 text-slate-200 font-bold text-[11px]" title="Rank 2">
                              2
                            </span>
                          );
                        } else if (rank === 3) {
                          rankBadge = (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-700/20 border border-amber-600/40 text-amber-500 font-bold text-[11px]" title="Rank 3">
                              3
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={`${r.player_key}-${idx}`}
                            onClick={() => onSelectPlayer(r)}
                            className={`transition-all cursor-pointer group ${
                              isSelected
                                ? "bg-[#B6E95C]/10 hover:bg-[#B6E95C]/15 border-l-4 border-l-[#B6E95C]"
                                : idx % 2 === 0
                                ? "bg-[#101F2D] hover:bg-[#192D3C]"
                                : "bg-[#0E1A26] hover:bg-[#192D3C]"
                            }`}
                          >
                            {/* Rank # */}
                            <td className="py-2.5 px-3 text-center">
                              {rankBadge}
                            </td>

                            {/* Player Identity */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-[#08131F] border border-[#2A4050] group-hover:border-[#B6E95C]/50 transition-colors">
                                  <PlayerAvatar name={r.name} disableHover className="w-full h-full" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-[#EFF5F7] group-hover:text-[#B6E95C] transition-colors block truncate font-sans text-xs">
                                    {r.name}
                                  </span>
                                  <span className="text-[10px] text-[#9BAAB5] uppercase font-mono block truncate">
                                    {r.competition}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-2.5 px-3">
                              <RolePill role={r.role} />
                            </td>

                            {/* Volume */}
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-[#EFF5F7] font-bold block">{r.balls}b</span>
                              <span className="text-[#9BAAB5] text-[10px] block font-mono">
                                {r.matches}m
                              </span>
                            </td>

                            {metricDisplayMode === "standard" ? (
                              <>
                                {/* Shrunk Index */}
                                <td className="py-2.5 px-3 text-right">
                                  <ShrunkIndexBadge
                                    metric={primaryMetric}
                                    invertBetter={discipline === "bowling"}
                                  />
                                </td>

                                {/* Raw Index */}
                                <td className="py-2.5 px-3 text-right">
                                  <span className="text-[#EFF5F7] font-bold block">
                                    {primaryMetric?.index != null ? primaryMetric.index.toFixed(1) : "—"}
                                  </span>
                                  <span className="text-[#9BAAB5] text-[9px] block">
                                    {primaryMetric?.value != null ? primaryMetric.value.toFixed(1) : "—"}
                                  </span>
                                </td>

                                {/* Confidence Range */}
                                <td className="py-2.5 px-3 text-right">
                                  <ConfidenceIntervalBadge ci={primaryMetric?.ci} metricId={primaryMetricKey} />
                                </td>
                              </>
                            ) : (
                              <>
                                {/* Talent Score */}
                                <td className="py-2.5 px-3 text-right">
                                  <span className="text-[#EFF5F7] font-bold block">
                                    {primaryMetric?.trueTalent != null ? primaryMetric.trueTalent.toFixed(1) : "—"}
                                  </span>
                                </td>

                                {/* Skill Share */}
                                <td className="py-2.5 px-3 text-right">
                                  <span className="text-[#4AC9D8] font-bold block">
                                    {primaryMetric?.skillRatio != null ? `${Math.round(primaryMetric.skillRatio * 100)}%` : "—"}
                                  </span>
                                </td>

                                {/* Consistency */}
                                <td className="py-2.5 px-3 text-right">
                                  <span className="text-[#FF982E] font-bold block">
                                    {primaryMetric?.sustainabilityProb != null
                                      ? `${(primaryMetric.sustainabilityProb * 100).toFixed(0)}%`
                                      : "—"}
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Shortlist Star */}
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {onToggleShortlist && (
                                <button
                                  type="button"
                                  onClick={() => onToggleShortlist(r)}
                                  className="text-[#9BAAB5] hover:text-[#B6E95C] transition-colors cursor-pointer"
                                  title={shortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 mx-auto ${
                                      shortlisted ? "fill-[#B6E95C] text-[#B6E95C]" : "text-white/20 hover:text-white/60"
                                    }`}
                                  />
                                </button>
                              )}
                            </td>

                            {/* Compare Checkbox */}
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => onToggleCompare(r.cricsheet_id)}
                                className="text-[#9BAAB5] hover:text-[#4AC9D8] transition-colors cursor-pointer"
                                title={isComparing ? "Remove from comparison" : "Add to comparison"}
                              >
                                {isComparing ? (
                                  <CheckSquare className="w-4 h-4 text-[#4AC9D8] mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 mx-auto text-white/20 group-hover:text-white/50" />
                                )}
                              </button>
                            </td>

                            {/* Profile Link */}
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/scout/player/${r.cricsheet_id}`}>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-lg bg-black/30 hover:bg-[#B6E95C] hover:text-[#08131F] text-[#9BAAB5] transition-all cursor-pointer"
                                  title="Open player profile"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
              </div>

              {/* Pagination Bar */}
              {data && data.pagination.totalPages > 1 && (
                <div className="p-3 bg-[#192D3C]/70 border-t border-[#2A4050] flex items-center justify-between font-mono text-xs">
                  <span className="text-[#9BAAB5]">
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={data.pagination.page <= 1}
                      onClick={() => setPage(Math.max(1, page - 1))}
                      className="px-3 py-1 rounded-xl bg-[#101F2D] hover:bg-[#08131F] border border-[#2A4050] disabled:opacity-25 disabled:pointer-events-none text-[#EFF5F7] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Prev</span>
                    </button>

                    <button
                      type="button"
                      disabled={data.pagination.page >= data.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1 rounded-xl bg-[#101F2D] hover:bg-[#08131F] border border-[#2A4050] disabled:opacity-25 disabled:pointer-events-none text-[#EFF5F7] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Desktop Sticky Player Dossier (Desktop ~32% width: 4 cols) */}
        {selectedPlayer && (
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 min-w-0">
            <ScoutDossierPanel
              player={selectedPlayer}
              discipline={discipline}
              onClose={() => onSelectPlayer(null)}
              onToggleCompare={onToggleCompare}
              isComparing={compareTray.includes(selectedPlayer.cricsheet_id)}
              allPlayers={data?.data}
              onSelectPlayer={onSelectPlayer}
              shortlist={shortlist}
              onToggleShortlist={onToggleShortlist}
              isShortlisted={isShortlisted ? isShortlisted(selectedPlayer.cricsheet_id) : false}
            />
          </aside>
        )}
      </div>

      {/* ── MOBILE DRAWER / BOTTOM SHEET FOR SCOUT DOSSIER (< 1024px) ── */}
      {selectedPlayer && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-h-[85vh] bg-[#101F2D] border-t border-[#2A4050] rounded-t-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Drawer Drag handle */}
            <div className="w-full pt-3 pb-1 flex justify-center items-center cursor-pointer" onClick={() => onSelectPlayer(null)}>
              <div className="w-12 h-1.5 rounded-full bg-[#2A4050]" />
            </div>

            <div className="flex-1 overflow-y-auto">
              <ScoutDossierPanel
                player={selectedPlayer}
                discipline={discipline}
                onClose={() => onSelectPlayer(null)}
                onToggleCompare={onToggleCompare}
                isComparing={compareTray.includes(selectedPlayer.cricsheet_id)}
                allPlayers={data?.data}
                onSelectPlayer={onSelectPlayer}
                shortlist={shortlist}
                onToggleShortlist={onToggleShortlist}
                isShortlisted={isShortlisted ? isShortlisted(selectedPlayer.cricsheet_id) : false}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
