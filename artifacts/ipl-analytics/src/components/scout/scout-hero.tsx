import React from "react";
import { Link } from "wouter";
import { 
  ArrowRight, 
  Layers, 
  Scale, 
  Database,
  Crosshair,
  Flame,
  Sparkles
} from "lucide-react";

interface ScoutHeroProps {
  onStartScouting?: () => void;
  selectedComp?: string;
  onSelectComp?: (compCode: string) => void;
  totalMatches?: number;
}

const COMPETITIONS = [
  { code: "ipl", name: "IPL", label: "Indian Premier League", country: "India" },
  { code: "smat", name: "SMAT", label: "Syed Mushtaq Ali Trophy", country: "India Domestic" },
  { code: "bbl", name: "BBL", label: "Big Bash League", country: "Australia" },
  { code: "sa20", name: "SA20", label: "SA20 Tournament", country: "South Africa" },
  { code: "cpl", name: "CPL", label: "Caribbean Premier League", country: "West Indies" },
  { code: "ilt20", name: "ILT20", label: "International League T20", country: "UAE" },
];

export function ScoutHero({
  onStartScouting,
  selectedComp,
  onSelectComp,
  totalMatches = 3309,
}: ScoutHeroProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative w-full rounded-3xl bg-[#0B1118] border border-white/10 overflow-hidden shadow-2xl">
      {/* Stadium Ambient Floodlights & Abstract Grid */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-right warm stadium light flare */}
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent rounded-full blur-3xl opacity-70" />
        {/* Pitch light beam */}
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-orange-500/5 rounded-full blur-3xl" />
        {/* Subtle coordinate overlay */}
        <div className="absolute inset-0 pitch-strip-pattern opacity-40" />
      </div>

      <div className="relative z-10 px-5 sm:px-8 lg:px-10 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT COLUMN: Presentation */}
          <div className="lg:col-span-7 space-y-6">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-mono tracking-wider uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>CRICFIELD / GLOBAL TALENT SCOUT</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-[#F5F7F8] tracking-tight leading-[1.05] uppercase">
              TALENT IS EVERYWHERE.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400">
                DISCOVER THE BEST.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="font-body text-sm sm:text-base text-[#9BAAB5] leading-relaxed max-w-xl">
              Discover breakout performers and elite specialists across six premier T20 leagues.
              Track batting acceleration, death bowling mastery, and head-to-head match impact.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartScouting || (() => scrollTo("scout-workspace"))}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black tracking-wide uppercase transition-all shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:shadow-[0_0_32px_rgba(249,115,22,0.5)] flex items-center gap-2 group cursor-pointer"
              >
                <span>Start Scouting</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link href="/scout/compare?ids=f1809c03,31ee319e">
                <button
                  type="button"
                  className="px-5 py-3 rounded-xl bg-[#14212A] hover:bg-[#1B2932] text-[#F5F7F8] border border-white/10 hover:border-orange-500/40 text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compare Players</span>
                </button>
              </Link>

              <div className="flex items-center gap-2 ml-0 sm:ml-2">
                <Link href="/scout/roles">
                  <button className="px-3.5 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-[#9BAAB5] hover:text-[#F5F7F8] border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Role Taxonomy</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Cricket Visualizer & Pitch Crease Graphic */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm rounded-2xl bg-[#14212A]/90 border border-white/10 p-5 shadow-2xl backdrop-blur-sm overflow-hidden">
              {/* Pitch Visualizer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#F5F7F8]">
                    MATCH IMPACT RADAR
                  </span>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 font-semibold">
                  GLOBAL T20 POOL
                </span>
              </div>

              {/* Pitch Crease & Trajectory SVG Graphic */}
              <div className="relative my-4 h-48 rounded-xl bg-[#0B1118] border border-white/5 overflow-hidden flex items-center justify-center">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 320 180"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1B2932" stopOpacity="0.8" />
                      <stop stopColor="#0B1118" stopOpacity="0.95" />
                    </linearGradient>
                    <linearGradient id="beamGrad" x1="160" y1="10" x2="160" y2="160" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F97316" stopOpacity="0.4" />
                      <stop stopColor="#38BDF8" stopOpacity="0.05" />
                    </linearGradient>
                    <radialGradient id="impactPoint" cx="160" cy="120" r="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F97316" stopOpacity="0.5" />
                      <stop stopColor="#F97316" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 22-Yard Pitch Strip */}
                  <rect x="90" y="15" width="140" height="150" rx="4" fill="url(#pitchGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  
                  {/* Crease Lines */}
                  <line x1="100" y1="35" x2="220" y2="35" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <line x1="95" y1="48" x2="225" y2="48" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.8" />
                  <line x1="100" y1="145" x2="220" y2="145" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <line x1="95" y1="132" x2="225" y2="132" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.8" />

                  {/* Return Creases */}
                  <line x1="110" y1="30" x2="110" y2="55" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1="210" y1="30" x2="210" y2="55" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1="110" y1="125" x2="110" y2="150" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                  <line x1="210" y1="125" x2="210" y2="150" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

                  {/* Stumps */}
                  <circle cx="156" cy="35" r="1.5" fill="#F59E0B" />
                  <circle cx="160" cy="35" r="1.5" fill="#F59E0B" />
                  <circle cx="164" cy="35" r="1.5" fill="#F59E0B" />

                  <circle cx="156" cy="145" r="1.5" fill="#F59E0B" />
                  <circle cx="160" cy="145" r="1.5" fill="#F59E0B" />
                  <circle cx="164" cy="145" r="1.5" fill="#F59E0B" />

                  {/* Delivery Trajectory Arc */}
                  <path
                    d="M 160 35 Q 185 85 160 120"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    fill="none"
                  />
                  <path
                    d="M 160 120 L 140 145"
                    stroke="#F97316"
                    strokeWidth="2.5"
                    fill="none"
                  />

                  {/* Pitch Impact Hotspot */}
                  <circle cx="160" cy="120" r="14" fill="url(#impactPoint)" />
                  <circle cx="160" cy="120" r="3.5" fill="#F97316" />

                  {/* Target Length Overlay Markers */}
                  <text x="32" y="45" fill="#9BAAB5" fontSize="8" fontFamily="JetBrains Mono" opacity="0.6">FULL TOSS</text>
                  <line x1="80" y1="42" x2="90" y2="42" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                  
                  <text x="36" y="85" fill="#38BDF8" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">YORKER</text>
                  <line x1="75" y1="82" x2="90" y2="82" stroke="#38BDF8" strokeWidth="0.5" />

                  <text x="32" y="123" fill="#F97316" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">GOOD LEN</text>
                  <line x1="80" y1="120" x2="90" y2="120" stroke="#F97316" strokeWidth="0.5" />

                  {/* Analytical Coordinates Tag */}
                  <rect x="235" y="112" width="75" height="18" rx="3" fill="#1B2932" stroke="#38BDF8" strokeWidth="0.5" strokeOpacity="0.4" />
                  <text x="240" y="124" fill="#F5F7F8" fontSize="8" fontFamily="JetBrains Mono">SWING: +3.8°</text>
                </svg>

                {/* Overlaid Telemetry Pill */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-orange-400">
                  <Crosshair className="w-2.5 h-2.5 text-orange-400" />
                  <span>ACTIVE TRACKER</span>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="p-2 rounded-lg bg-[#0B1118]/80 border border-white/5">
                  <span className="text-[9px] font-mono text-[#9BAAB5] uppercase block">Coverage</span>
                  <span className="text-xs font-mono font-bold text-[#F5F7F8]">6 Leagues</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0B1118]/80 border border-white/5">
                  <span className="text-[9px] font-mono text-[#9BAAB5] uppercase block">Benchmark</span>
                  <span className="text-xs font-mono font-bold text-sky-400">League Par</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0B1118]/80 border border-white/5">
                  <span className="text-[9px] font-mono text-[#9BAAB5] uppercase block">Ratings</span>
                  <span className="text-xs font-mono font-bold text-orange-400">Top 1% Pool</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMPETITION STRIP: 6-League Quick Filter */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7F8]">
                Global Tournament Coverage:
              </span>
              <span className="text-xs font-mono text-orange-400 font-bold">
                {totalMatches.toLocaleString()} Matches
              </span>
            </div>

            {/* League Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BAAB5] mr-1">
                Leagues:
              </span>
              {COMPETITIONS.map((c) => {
                const isActive = selectedComp === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onSelectComp?.(c.code)}
                    title={`${c.label} (${c.country})`}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                        : "bg-[#14212A] text-[#9BAAB5] hover:text-[#F5F7F8] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
