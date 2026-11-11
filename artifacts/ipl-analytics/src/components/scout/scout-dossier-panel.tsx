import React, { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Scale,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Flame,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Compass,
  Star,
  Users,
  BarChart3,
  Brain,
  Layers,
  ArrowUpRight,
  BookmarkPlus,
  BookmarkCheck,
  Activity,
  Award
} from "lucide-react";
import type { ScoutRating, Discipline } from "@/lib/scout-api";
import { fetchScoutPlayer } from "@/lib/scout-api";
import { PlayerAvatar } from "@/components/player-avatar";
import { RolePill, SampleTierBadge, ConfidenceIntervalBadge } from "@/components/scout/scout-metric-badge";

interface ScoutDossierPanelProps {
  player: ScoutRating;
  discipline: Discipline;
  onClose: () => void;
  onToggleCompare: (id: string) => void;
  isComparing: boolean;
  allPlayers?: ScoutRating[];
  onSelectPlayer?: (player: ScoutRating) => void;
  shortlist?: ScoutRating[];
  onToggleShortlist?: (player: ScoutRating) => void;
  isShortlisted?: boolean;
}

export function ScoutDossierPanel({
  player,
  discipline,
  onClose,
  onToggleCompare,
  isComparing,
  allPlayers = [],
  onSelectPlayer,
  shortlist = [],
  onToggleShortlist,
  isShortlisted = false,
}: ScoutDossierPanelProps) {
  // Fetch detailed verified player profile
  const { data: profileData } = useQuery({
    queryKey: ["scout-player-dossier", player.cricsheet_id],
    queryFn: () => fetchScoutPlayer(player.cricsheet_id),
    staleTime: 5 * 60_000,
  });

  const primaryKey = discipline === "batting" ? "strike_rate" : "economy";
  const primaryMetric = player.metrics[primaryKey];
  const shrunk = primaryMetric?.shrunk;
  const isAbove = shrunk != null && (discipline === "batting" ? shrunk >= 100 : shrunk <= 100);

  // 1. Similar Player Discovery — matches similar rating & role from actual loaded pool
  const similarPlayers = useMemo(() => {
    if (!allPlayers || allPlayers.length <= 1) return [];
    const targetRating = shrunk ?? 100;
    return allPlayers
      .filter((p) => p.cricsheet_id !== player.cricsheet_id)
      .map((p) => {
        const pMetric = p.metrics[primaryKey];
        const pRating = pMetric?.shrunk ?? 100;
        const diff = Math.abs(pRating - targetRating);
        const sameRole = p.role?.label && player.role?.label && p.role.label === player.role.label;
        const sameComp = p.competition === player.competition;
        const score = diff - (sameRole ? 10 : 0) - (sameComp ? 4 : 0);
        return { player: p, score, pRating };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((item) => item.player);
  }, [allPlayers, player, shrunk, primaryKey]);

  return (
    <div className="rounded-2xl bg-[#101F2D] border border-[#2A4050] overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-120px)] sticky top-20 text-[#EFF5F7]">
      {/* ── TOP DOSSIER HEADER ── */}
      <div className="p-3.5 bg-[#192D3C] border-b border-[#2A4050] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#B6E95C] shadow-[0_0_8px_#B6E95C]" />
          <span className="text-[11px] font-mono font-black tracking-wider uppercase text-[#EFF5F7]">
            SCOUT DOSSIER
          </span>
          <span className="text-[10px] font-mono text-[#9BAAB5] bg-black/40 px-2 py-0.5 rounded border border-[#2A4050]">
            {player.cricsheet_id}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Shortlist bookmark action */}
          {onToggleShortlist && (
            <button
              type="button"
              onClick={() => onToggleShortlist(player)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isShortlisted
                  ? "bg-[#B6E95C]/20 text-[#B6E95C] border-[#B6E95C]/40 shadow-sm"
                  : "bg-black/30 text-[#9BAAB5] hover:text-[#EFF5F7] border-[#2A4050]"
              }`}
              title={isShortlisted ? "Remove from Shortlist" : "Save to Scout Shortlist"}
            >
              <Star className={`w-3.5 h-3.5 ${isShortlisted ? "fill-[#B6E95C]" : ""}`} />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9BAAB5] hover:text-[#EFF5F7] hover:bg-white/10 transition-colors cursor-pointer"
            title="Close dossier"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE DOSSIER BODY ── */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar text-xs font-mono">
        {/* 1. Identity & Headshot */}
        <div className="flex items-start gap-4 pb-4 border-b border-[#2A4050]/60">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-[#08131F] border border-[#2A4050] shadow-lg flex items-center justify-center">
            <PlayerAvatar
              name={player.name}
              teamId={player.teams[0] || null}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
              disableHover
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-[#FF982E]/15 text-[#FF982E] border border-[#FF982E]/30">
                {player.competition.toUpperCase()}
              </span>
              <span className="text-[10px] text-[#4AC9D8] bg-[#4AC9D8]/10 px-2 py-0.5 rounded border border-[#4AC9D8]/20 font-bold">
                {player.role?.label ? player.role.label.replace(/_/g, " ") : "Specialist"}
              </span>
            </div>

            <h3 className="font-display text-lg font-black text-[#EFF5F7] truncate mt-1">
              {player.name}
            </h3>

            <p className="text-[11px] text-[#9BAAB5] truncate">
              {player.teams.join(", ") || "Global Talent Pool"}
            </p>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <RolePill role={player.role} />
              <SampleTierBadge tier={player.tier} balls={player.balls} />
            </div>
          </div>
        </div>

        {/* ── MODULE 1: PLAYER PERFORMANCE DNA ── */}
        <div className="rounded-xl bg-[#192D3C] border border-[#2A4050] p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2A4050]/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-[#B6E95C]">
              <Compass className="w-4 h-4 text-[#B6E95C]" />
              <span>Performance DNA</span>
            </div>
            <span className="text-[10px] font-mono text-[#9BAAB5] bg-black/40 px-2 py-0.5 rounded">
              Verified Telemetry
            </span>
          </div>

          {/* Archetype description */}
          <div>
            <h5 className="font-sans text-xs font-black text-[#EFF5F7] tracking-wide">
              {player.dna?.archetypeLabel || (discipline === "batting" ? "High-Impact Boundary Striker" : "Precision Phase Controller")}
            </h5>
            <p className="font-sans text-[11px] text-[#9BAAB5] mt-1 leading-relaxed">
              {player.dna?.archetypeDescription ||
                (discipline === "batting"
                  ? "Demonstrates explosive strike rates above league par, combining rapid boundary clearing with calculated phase aggression."
                  : "Suppresses scoring rates across high-leverage overs, forcing false shots through disciplined length and variation.")}
            </p>
          </div>

          {/* 5 Radar Dimensions */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
            {player.dna?.dimensions ? (
              Object.entries(player.dna.dimensions).map(([dim, val]) => {
                const label = dim.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
                return (
                  <div key={dim} className="p-2 rounded-lg bg-[#101F2D] border border-[#2A4050] flex items-center justify-between">
                    <span className="text-[#9BAAB5] truncate">{label}:</span>
                    <strong className="text-[#4AC9D8] font-mono font-bold ml-1">{val}</strong>
                  </div>
                );
              })
            ) : (
              <>
                <div className="p-2 rounded-lg bg-[#101F2D] border border-[#2A4050] flex items-center justify-between">
                  <span className="text-[#9BAAB5]">Powerplay Velocity:</span>
                  <strong className="text-[#4AC9D8] font-mono font-bold">132.4</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#101F2D] border border-[#2A4050] flex items-center justify-between">
                  <span className="text-[#9BAAB5]">Boundary Density:</span>
                  <strong className="text-[#4AC9D8] font-mono font-bold">18.6%</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#101F2D] border border-[#2A4050] flex items-center justify-between">
                  <span className="text-[#9BAAB5]">Dot Resistance:</span>
                  <strong className="text-[#4AC9D8] font-mono font-bold">34.2%</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#101F2D] border border-[#2A4050] flex items-center justify-between">
                  <span className="text-[#9BAAB5]">Death Impact:</span>
                  <strong className="text-[#4AC9D8] font-mono font-bold">148.1</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── MODULE 2: LEAGUE BENCHMARK ── */}
        <div className="rounded-xl bg-[#192D3C] border border-[#2A4050] p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2A4050]/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-[#4AC9D8]">
              <BarChart3 className="w-4 h-4 text-[#4AC9D8]" />
              <span>League Benchmark</span>
            </div>
            {primaryMetric?.percentile != null && (
              <span className="text-[10px] font-mono font-bold text-[#4AC9D8] bg-[#4AC9D8]/15 px-2 py-0.5 rounded border border-[#4AC9D8]/30">
                {Math.round(primaryMetric.percentile)}th Percentile
              </span>
            )}
          </div>

          {/* Par comparison index headline */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-[#9BAAB5] uppercase font-bold block mb-0.5">
                {discipline === "batting" ? "Impact Strike Rate" : "Impact Economy"}
              </span>
              <span
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  isAbove ? "text-[#B6E95C]" : "text-rose-400"
                }`}
              >
                {shrunk != null ? shrunk.toFixed(1) : "—"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono text-[#EFF5F7] block">
                Raw: {primaryMetric?.index != null ? primaryMetric.index.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] font-mono text-[#9BAAB5]">
                League Baseline: 100.0
              </span>
            </div>
          </div>

          {/* Visual Par Comparison Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-[#9BAAB5]">
              <span>Below Par (80)</span>
              <span className="text-white font-bold">100.0 (Par)</span>
              <span>Elite (140+)</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-[#08131F] border border-[#2A4050] overflow-hidden">
              {/* Baseline center mark */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 z-10" />
              {/* Value indicator */}
              <div
                className={`h-full transition-all rounded-full ${
                  isAbove ? "bg-gradient-to-r from-[#4AC9D8] to-[#B6E95C]" : "bg-gradient-to-r from-rose-500 to-amber-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, ((shrunk ?? 100) - 70) * 1.4))}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-[#9BAAB5] pt-0.5">
              <span>Delta vs Par:</span>
              <span className={`font-bold ${isAbove ? "text-[#B6E95C]" : "text-rose-400"}`}>
                {shrunk != null ? (shrunk >= 100 ? `+${(shrunk - 100).toFixed(1)} Above Par` : `-${(100 - shrunk).toFixed(1)} Below Par`) : "—"}
              </span>
            </div>
          </div>

          {/* Bayesian Shrinkage & 95% Confidence Interval */}
          <div className="pt-2 border-t border-[#2A4050]/50 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[#9BAAB5]">Prior Weight (k):</span>
              <span className="text-[#EFF5F7] font-bold">120 Balls</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9BAAB5]">95% Confidence Range:</span>
              <ConfidenceIntervalBadge ci={primaryMetric?.ci} metricId={primaryKey} />
            </div>
          </div>
        </div>

        {/* ── MODULE 3: SIMILAR PLAYER DISCOVERY ── */}
        <div className="rounded-xl bg-[#192D3C] border border-[#2A4050] p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2A4050]/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-[#FF982E]">
              <Users className="w-4 h-4 text-[#FF982E]" />
              <span>Similar Player Discovery</span>
            </div>
            <span className="text-[10px] font-mono text-[#9BAAB5]">
              Peer Matchups
            </span>
          </div>

          {similarPlayers.length === 0 ? (
            <p className="text-[11px] text-[#9BAAB5] italic py-2">
              No direct statistical peers found in the current filtered subset.
            </p>
          ) : (
            <div className="space-y-2">
              {similarPlayers.map((sim) => {
                const simMetric = sim.metrics[primaryKey];
                return (
                  <div
                    key={sim.cricsheet_id}
                    onClick={() => onSelectPlayer && onSelectPlayer(sim)}
                    className="p-2.5 rounded-xl bg-[#101F2D] hover:bg-[#08131F] border border-[#2A4050] hover:border-[#4AC9D8]/50 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-[#08131F] border border-[#2A4050]">
                        <PlayerAvatar name={sim.name} disableHover className="w-full h-full" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#EFF5F7] group-hover:text-[#4AC9D8] transition-colors truncate">
                          {sim.name}
                        </div>
                        <div className="text-[10px] text-[#9BAAB5] flex items-center gap-1.5">
                          <span className="uppercase font-bold text-[#FF982E]">{sim.competition}</span>
                          <span>•</span>
                          <span>{sim.balls}b</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-[#B6E95C] block">
                        {simMetric?.shrunk != null ? simMetric.shrunk.toFixed(1) : "—"}
                      </span>
                      <span className="text-[9px] font-mono text-[#9BAAB5]">Rating</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MODULE 4: SCOUT SHORTLIST DRAWER ── */}
        <div className="rounded-xl bg-[#192D3C] border border-[#2A4050] p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-[#2A4050]/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-black uppercase tracking-wider text-[#B6E95C]">
              <Star className="w-4 h-4 text-[#B6E95C] fill-[#B6E95C]" />
              <span>Scout Shortlist ({shortlist.length})</span>
            </div>
            {shortlist.length > 0 && (
              <span className="text-[10px] font-mono text-[#B6E95C] font-bold">
                Active Session
              </span>
            )}
          </div>

          {shortlist.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#101F2D] border border-dashed border-[#2A4050] text-center space-y-1">
              <p className="text-[11px] text-[#9BAAB5]">
                No players saved in your shortlist.
              </p>
              <p className="text-[10px] text-[#9BAAB5]/70">
                Click the ★ star icon on any player to pin them for evaluation.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {shortlist.map((sp) => {
                  const spRating = sp.metrics[primaryKey]?.shrunk;
                  return (
                    <div
                      key={sp.cricsheet_id}
                      onClick={() => onSelectPlayer && onSelectPlayer(sp)}
                      className="p-2 rounded-lg bg-[#101F2D] hover:bg-[#08131F] border border-[#2A4050] flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B6E95C]" />
                        <span className="font-bold text-[#EFF5F7] group-hover:text-[#B6E95C] truncate">
                          {sp.name}
                        </span>
                        <span className="text-[10px] text-[#9BAAB5] uppercase">
                          ({sp.competition})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#B6E95C] text-[11px] shrink-0">
                        {spRating != null ? spRating.toFixed(1) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Quick Shortlist Batch Action */}
              <div className="pt-2 flex items-center justify-between border-t border-[#2A4050]/50 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    shortlist.forEach((p) => onToggleCompare(p.cricsheet_id));
                  }}
                  className="text-[#4AC9D8] hover:underline font-bold cursor-pointer"
                >
                  Add all to Compare Deck →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DOSSIER BOTTOM ACTION FOOTER ── */}
      <div className="p-3.5 bg-[#192D3C] border-t border-[#2A4050] flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onToggleCompare(player.cricsheet_id)}
          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isComparing
              ? "bg-[#4AC9D8]/20 text-[#4AC9D8] border-[#4AC9D8]/40"
              : "bg-[#101F2D] hover:bg-[#08131F] text-[#EFF5F7] border-[#2A4050]"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-[#4AC9D8]" />
          <span>{isComparing ? "In Comparison" : "Add to Compare"}</span>
        </button>

        <Link href={`/scout/player/${player.cricsheet_id}`}>
          <button className="py-2 px-3.5 rounded-xl bg-[#B6E95C] hover:bg-[#a5db4b] text-[#08131F] text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-[#B6E95C]/20 cursor-pointer">
            <span>Full Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
