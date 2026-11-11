import { CricFieldMascot } from "@/components/CricFieldMascot";
import { reactionForDelivery } from "@/lib/mascot-reactions";
import React, { useState } from "react";
import { Link } from "wouter";
import { type MatchScorecard, type MatchCommentary, playerSlug } from "@/lib/aggregates";
import { MessageSquare, Zap, Target, Flame, ArrowUpRight, Filter } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";

export interface CinematicCommentaryViewProps {
  card?: MatchScorecard;
  commentary?: MatchCommentary;
  isLoading: boolean;
}

export function CinematicCommentaryView({
  card,
  commentary,
  isLoading,
}: CinematicCommentaryViewProps) {
  const innings = commentary?.innings ?? [];
  const [activeInnings, setActiveInnings] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "wickets" | "boundaries" | "sixes">("all");
  const [limit, setLimit] = useState(60);

  const current = innings[activeInnings];

  if (isLoading) {
    return (
      <div className="p-16 text-center text-white/40 font-mono text-sm border border-white/10 rounded-[28px] bg-white/[0.02]">
        <CricFieldMascot activity="loading" size={52} className="mr-3 align-middle" />Synchronizing live delivery commentary feed…
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-16 text-center text-white/40 font-mono text-sm border border-white/10 rounded-[28px] bg-white/[0.02]">
        <CricFieldMascot activity="empty" size={52} className="mr-3 align-middle" />No ball-by-ball commentary recorded for this match.
      </div>
    );
  }

  // Filter balls
  const filteredBalls = current.balls.filter(c => {
    if (filterType === "wickets") return c.isWicket;
    if (filterType === "boundaries") return c.isBoundary;
    if (filterType === "sixes") return c.runs === 6;
    return true;
  });

  const displayedBalls = filteredBalls.slice(0, limit);

  return (
    <div className="flex flex-col gap-5">
      {/* ─── COMMENTARY CONTROL HEADER ─── */}
      <div className="p-5 bg-[#080d1a] rounded-[24px] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <CricFieldMascot activity="commentary" size={36} />
          </div>
          <div>
            <span className="font-mono font-black uppercase text-sm text-white tracking-wider block">
              BALL-BY-BALL BROADCAST TELEMETRY
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {current.balls.length} deliveries registered · Line, length, speeds & shots
            </span>
          </div>
        </div>

        {/* Innings Selector & Event Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {innings.map((inn, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveInnings(i);
                  setLimit(60);
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition-all ${
                  activeInnings === i ? "bg-cyan-500 text-black shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                {inn.team ?? `Innings ${inn.innings}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {(["all", "wickets", "boundaries", "sixes"] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterType(st)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                  filterType === st ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BALL FEED STREAM ─── */}
      <div className="flex flex-col gap-3">
        {displayedBalls.map((c, i) => {
          const isSix = c.runs === 6;
          const isFour = c.isBoundary && !isSix;

          return (
            <div
              key={i}
              className={`p-4 sm:p-5 rounded-[22px] border transition-all duration-200 flex gap-4 sm:gap-5 items-start ${
                c.isWicket
                  ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20"
                  : isSix
                  ? "bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20"
                  : isFour
                  ? "bg-cyan-950/15 border-cyan-500/30"
                  : "bg-[#090d16]/90 border-white/5 hover:border-white/15"
              }`}
            >
              {/* Over & Outcome Badge */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center font-mono font-black shadow-md ${
                  c.isWicket
                    ? "bg-rose-500 text-white shadow-rose-500/30"
                    : isSix
                    ? "bg-amber-400 text-black shadow-amber-400/30"
                    : isFour
                    ? "bg-cyan-400 text-black shadow-cyan-400/30"
                    : "bg-white/5 text-white/70"
                }`}
              >
                <span className="text-xs sm:text-sm leading-none">{c.over}</span>
                <span className="text-[10px] uppercase font-bold mt-0.5">
                  {c.isWicket ? "WKT" : isSix ? "SIX" : isFour ? "FOUR" : `${c.runs}r`}
                </span>
              </div>

              <CricFieldMascot activity={reactionForDelivery(c)} size={32} className="hidden sm:inline-flex" />
              {/* Delivery Narrative & Telemetry */}
              <div className="flex-1 min-w-0">
                {(c.bowler || c.batter) && (
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-mono font-bold">
                    <span className="text-cyan-400">{c.bowler}</span>
                    <span className="text-slate-500">to</span>
                    <span className="text-white">{c.batter}</span>
                    {c.isWicket && c.dismissal && (
                      <span className="text-rose-400 font-black ml-1">— {c.dismissal}</span>
                    )}
                  </div>
                )}

                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    c.isWicket
                      ? "text-rose-200 font-semibold"
                      : isSix
                      ? "text-amber-200 font-semibold"
                      : isFour
                      ? "text-cyan-100 font-medium"
                      : "text-slate-300"
                  }`}
                >
                  {c.text}
                </p>

                {/* Technical Ball Sensors (Speed, Length, Variation, Shot) */}
                {(c.length || c.line || c.variation || c.shot || c.zone || c.speedKph) && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 font-mono text-[9px]">
                    {c.speedKph && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 font-bold text-amber-300">
                        ⚡ {c.speedKph} kph
                      </span>
                    )}
                    {[c.length, c.line, c.variation, c.shot, c.zone].filter(Boolean).map((t, n) => (
                      <span
                        key={n}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-medium text-slate-400 uppercase"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {limit < filteredBalls.length && (
        <button
          onClick={() => setLimit(l => l + 60)}
          className="py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:bg-white/10 transition-all text-center"
        >
          Load earlier overs ({filteredBalls.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
