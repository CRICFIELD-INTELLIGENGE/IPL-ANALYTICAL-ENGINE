import React from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Globe2,
  Users,
  Activity,
} from "lucide-react";

interface ScoutHeroBannerProps {
  onStartScouting?: () => void;
  totalMatches?: number;
}

const LEAGUE_TAGS = ["IPL", "BBL", "PSL", "CPL", "SA20", "ILT20", "Hundred", "MLC", "+ more..."];

export function ScoutHeroBanner({
  onStartScouting,
  totalMatches = 3309,
}: ScoutHeroBannerProps) {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#0B1525] via-[#0F1C2E] to-[#080E1A]" style={{ minHeight: 220 }}>
      {/* Layered atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Warm stadium glow — left */}
        <div className="absolute -bottom-16 -left-16 w-96 h-96 bg-orange-600/12 rounded-full blur-3xl" />
        {/* Cool sky glow — center-right */}
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-sky-600/8 rounded-full blur-3xl" />
        {/* Amber accent — top right */}
        <div className="absolute -top-8 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl" />
        {/* Subtle cricket pitch texture lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
      </div>

      <div className="relative z-10 flex items-stretch min-h-[220px]">
        {/* Hero Content — left 70% */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 text-[10px] font-mono font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Global Scout Engine
            </div>

            {/* Headline — styled like the screenshot's bold display type */}
            <div>
              <h1
                className="font-black uppercase leading-none tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontFamily: "inherit",
                  background: "linear-gradient(135deg, #ffffff 0%, #F97316 40%, #F59E0B 70%, #38BDF8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Global<br />Scout Engine
              </h1>
            </div>

            <p className="text-sm text-white/55 font-medium leading-relaxed max-w-sm">
              Compare cricket players from different leagues.<br />
              Find talent. Analyse performance. Discover new players.
            </p>
          </div>

          {/* CTA Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onStartScouting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wide shadow-lg shadow-orange-500/30 transition-all group cursor-pointer"
            >
              Find Players
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <Link href="/scout/compare">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-wide transition-all cursor-pointer">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Compare Players
              </button>
            </Link>

            {/* Stats bar */}
            <div className="hidden sm:flex items-center gap-4 ml-2 pl-4 border-l border-white/10">
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[11px] font-black text-white/70">
                  {totalMatches.toLocaleString()} Matches
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-black text-white/70">
                  6 Leagues
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Tag Column — league list like the screenshot */}
        <div className="hidden sm:flex flex-col items-end justify-center gap-1.5 pr-6 py-6 shrink-0">
          <p className="text-[9px] font-mono font-bold text-white/25 uppercase tracking-widest mb-1 text-right">
            Different Leagues<br />
            <span className="text-orange-400/70">Same Game</span><br />
            <span className="text-white/40">New Stories</span>
          </p>
          {LEAGUE_TAGS.map((tag, i) => (
            <div
              key={tag}
              className={`px-3 py-1 rounded-lg text-[11px] font-black border text-right transition-all ${
                i === 0
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                  : i === 1
                  ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                  : i === 2
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                  : i === LEAGUE_TAGS.length - 1
                  ? "bg-white/5 border-white/10 text-white/30 text-xs italic"
                  : "bg-white/[0.04] border-white/[0.08] text-white/50"
              }`}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
    </div>
  );
}
