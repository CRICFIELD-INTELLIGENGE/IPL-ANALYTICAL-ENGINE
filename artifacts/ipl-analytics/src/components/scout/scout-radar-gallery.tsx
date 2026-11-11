import React, { useRef } from "react";
import { Link } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  CheckSquare, 
  Square,
  ExternalLink,
  Activity,
  Flame
} from "lucide-react";
import type { ScoutRating, Discipline } from "@/lib/scout-api";
import { PlayerAvatar } from "@/components/player-avatar";
import { SampleTierBadge, ConfidenceIntervalBadge } from "@/components/scout/scout-metric-badge";

interface ScoutRadarGalleryProps {
  players: ScoutRating[];
  discipline: Discipline;
  onSelectPlayer: (player: ScoutRating) => void;
  selectedPlayerId?: string | null;
  onToggleCompare: (id: string) => void;
  compareTray: string[];
  isLoading?: boolean;
}

export function ScoutRadarGallery({
  players,
  discipline,
  onSelectPlayer,
  selectedPlayerId,
  onToggleCompare,
  compareTray,
  isLoading = false,
}: ScoutRadarGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Take the top standout performers for the curated radar gallery
  const galleryPlayers = players.slice(0, 10);

  return (
    <section className="w-full space-y-4">
      {/* Header with Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-1">
            <Flame className="w-3.5 h-3.5" />
            <span>Spotlight Talent Gallery</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#F5F7F8] tracking-tight uppercase">
            PLAYERS ON THE RADAR
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <p className="font-body text-xs text-[#9BAAB5] hidden sm:block">
            Standout performers across tournament phases and role profiles.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-lg bg-[#14212A] hover:bg-[#1B2932] border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-lg bg-[#14212A] hover:bg-[#1B2932] border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Gallery Container */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-72 sm:w-80 h-64 rounded-2xl bg-[#14212A]/60 border border-white/5 animate-pulse shrink-0 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5" />
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-4 rounded bg-white/10" />
                  <div className="w-16 h-3 rounded bg-white/5" />
                </div>
              </div>
              <div className="h-16 rounded-xl bg-white/5" />
              <div className="h-10 rounded-xl bg-white/5" />
            </div>
          ))}
        </div>
      ) : galleryPlayers.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-[#14212A] border border-white/10 text-sm text-[#9BAAB5]">
          No players currently available on the radar matching current filters.
        </div>
      ) : (
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label="Players on the radar carousel"
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar snap-x snap-mandatory focus:outline-none focus:ring-1 focus:ring-orange-500/40 rounded-2xl"
        >
          {galleryPlayers.map((p, idx) => {
            const primaryKey = discipline === "batting" ? "strike_rate" : "economy";
            const primaryMetric = p.metrics[primaryKey];
            const isComparing = compareTray.includes(p.cricsheet_id);
            const isSelected = selectedPlayerId === p.cricsheet_id;
            const val = primaryMetric?.shrunk ?? primaryMetric?.index;
            const isAbove = val != null && (discipline === "batting" ? val > 100 : val < 100);

            return (
              <div
                key={`${p.player_key}-${idx}`}
                onClick={() => onSelectPlayer(p)}
                className={`w-72 sm:w-80 rounded-2xl bg-[#14212A] border transition-all duration-300 p-5 flex flex-col justify-between shrink-0 snap-start cursor-pointer relative group ${
                  isSelected
                    ? "border-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.3)] bg-[#1B2932]"
                    : "border-white/10 hover:border-orange-500/40 hover:bg-[#1B2932]/80"
                }`}
              >
                {/* Top Badge: League & Role Tag */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      {p.competition.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-semibold">
                      {p.role?.label ? p.role.label.replace(/_/g, " ") : "Specialist"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCompare(p.cricsheet_id);
                    }}
                    className="p-1 rounded text-[#9BAAB5] hover:text-orange-400 transition-colors"
                    title={isComparing ? "Remove from comparison" : "Add to comparison"}
                    aria-label={isComparing ? "Remove from comparison" : "Add to comparison"}
                  >
                    {isComparing ? (
                      <CheckSquare className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Square className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                    )}
                  </button>
                </div>

                {/* Player Identity Row */}
                <div className="flex items-start gap-3 my-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#0B1118] border border-white/10 flex items-center justify-center shadow">
                    <PlayerAvatar
                      name={p.name}
                      teamId={p.teams[0] || null}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover"
                      disableHover
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold text-[#F5F7F8] truncate group-hover:text-orange-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="font-mono text-[10px] text-[#9BAAB5] truncate">
                      {p.teams[0] || "Global Pool"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <SampleTierBadge tier={p.tier} balls={p.balls} />
                    </div>
                  </div>
                </div>

                {/* Performance Metric Scorecard */}
                <div className="rounded-xl bg-[#0B1118]/80 border border-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#9BAAB5]">
                      {discipline === "batting" ? "Batting Impact Rating" : "Bowling Economy Rating"}
                    </span>
                    <span
                      className={`font-mono text-sm font-black flex items-center gap-1 ${
                        isAbove ? "text-orange-400" : "text-rose-400"
                      }`}
                    >
                      {isAbove ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {val != null ? val.toFixed(1) : "—"}
                    </span>
                  </div>

                  {/* Visual Bar Indicator */}
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAbove ? "bg-gradient-to-r from-orange-500 to-amber-400" : "bg-rose-400"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(10, ((val || 100) / 160) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Volume & Matches */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#9BAAB5] pt-1 border-t border-white/5">
                    <span>{p.balls} balls • {p.matches} matches</span>
                    <span className="text-white/40">100 = Par</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPlayer(p);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 text-[#F5F7F8] border border-white/10 hover:border-orange-500/40 text-xs font-bold font-mono transition-all text-center"
                  >
                    View Dossier
                  </button>

                  <Link href={`/scout/player/${p.cricsheet_id}`}>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
                      title="Open full player profile"
                      aria-label="Open full player profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
