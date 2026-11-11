import React from "react";
import { Link } from "wouter";
import {
  Trophy,
  ChevronRight,
  Zap,
  TrendingUp,
  Star,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import type { ScoutRating, Discipline } from "@/lib/scout-api";

interface ScoutRightPanelProps {
  topPlayers?: ScoutRating[];
  discipline?: Discipline;
  onSelectPlayer?: (p: ScoutRating) => void;
}

const QUICK_INSIGHTS = [
  { text: "Maxwell has highest strike rate.", color: "text-amber-400" },
  { text: "Kohli has most consistent average.", color: "text-sky-400" },
  { text: "Pooran performs well in death overs.", color: "text-orange-400" },
  { text: "Cross-league ratings normalised for conditions.", color: "text-white/50" },
];

const POPULAR_LEAGUES = [
  { code: "ipl", name: "IPL", color: "#F97316", abbr: "IPL" },
  { code: "bbl", name: "BBL", color: "#38BDF8", abbr: "BBL" },
  { code: "smat", name: "PSL", color: "#A78BFA", abbr: "PSL" },
  { code: "cpl", name: "CPL", color: "#F59E0B", abbr: "CPL" },
  { code: "sa20", name: "SA20", color: "#FB7185", abbr: "SA20" },
  { code: "ilt20", name: "ILT20", color: "#34D399", abbr: "ILT" },
  { code: "ilt20b", name: "The Hundred", color: "#F97316", abbr: "100" },
  { code: "mlc", name: "MLC", color: "#38BDF8", abbr: "MLC" },
  { code: "lpl", name: "LPL", color: "#A78BFA", abbr: "LPL" },
  { code: "others", name: "Others", color: "#9BAAB5", abbr: "···" },
];

export function ScoutRightPanel({
  topPlayers = [],
  discipline = "batting",
  onSelectPlayer,
}: ScoutRightPanelProps) {
  return (
    <div className="p-4 space-y-4 text-xs">
      {/* Quick Insights */}
      <div className="rounded-2xl bg-[#131E30] border border-white/[0.07] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <span className="font-black text-xs uppercase tracking-wider text-white/90">
            Quick Insights
          </span>
        </div>
        <ul className="space-y-2">
          {QUICK_INSIGHTS.map((insight, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                i === 0 ? "bg-amber-400" :
                i === 1 ? "bg-sky-400" :
                i === 2 ? "bg-orange-400" : "bg-white/20"
              }`} />
              <span className={`leading-relaxed text-[11px] ${insight.color}`}>
                {insight.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ad Slot — Medium Rectangle */}
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#131E30]/50 flex flex-col items-center justify-center text-center p-5 min-h-[200px]">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-2">
          <Star className="w-4 h-4 text-white/20" />
        </div>
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">AdSense Banner</p>
        <p className="text-[9px] text-white/15 mt-1">Medium Rectangle (300 × 250)</p>
      </div>

      {/* Popular Leagues */}
      <div className="rounded-2xl bg-[#131E30] border border-white/[0.07] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Trophy className="w-3 h-3 text-orange-400" />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-white/90">
              Popular Leagues
            </span>
          </div>
          <Link href="/scout">
            <span className="text-[10px] text-orange-400 hover:underline cursor-pointer flex items-center gap-0.5 font-semibold">
              View All
              <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {POPULAR_LEAGUES.map((league) => (
            <div
              key={league.code}
              className="flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${league.color}22`, border: `1px solid ${league.color}40` }}
              >
                <span style={{ color: league.color }}>{league.abbr}</span>
              </div>
              <span className="text-[9px] text-white/40 group-hover:text-white/70 transition-colors truncate w-full text-center">
                {league.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers (live from API) */}
      {topPlayers.length > 0 && (
        <div className="rounded-2xl bg-[#131E30] border border-white/[0.07] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-sky-400" />
            </div>
            <span className="font-black text-xs uppercase tracking-wider text-white/90">
              Top {discipline === "batting" ? "Batters" : "Bowlers"}
            </span>
          </div>
          <div className="space-y-2">
            {topPlayers.slice(0, 5).map((p, i) => {
              const key = discipline === "batting" ? "strike_rate" : "economy";
              const val = p.metrics[key]?.shrunk;
              return (
                <div
                  key={p.cricsheet_id}
                  onClick={() => onSelectPlayer?.(p)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] cursor-pointer group transition-all"
                >
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                    i === 0 ? "bg-amber-500/20 text-amber-400" :
                    i === 1 ? "bg-white/10 text-white/60" :
                    "bg-white/5 text-white/40"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-white/90 truncate group-hover:text-orange-300 transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[9px] text-white/35 uppercase tracking-wider">
                      {p.competition.toUpperCase()} · {p.role?.label?.replace(/_/g, " ") || "Specialist"}
                    </p>
                  </div>
                  {val != null && (
                    <span className="text-[11px] font-black text-orange-400 shrink-0">
                      {val.toFixed(0)}
                    </span>
                  )}
                  <ArrowUpRight className="w-3 h-3 text-white/20 group-hover:text-orange-400 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Filler — Leaderboard Ad */}
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#131E30]/50 flex flex-col items-center justify-center text-center p-4 min-h-[120px]">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">AdSense Banner</p>
        <p className="text-[9px] text-white/15 mt-1">Leaderboard (728 × 90)</p>
      </div>
    </div>
  );
}
