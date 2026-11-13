import React from "react";
import { Layout } from "@/components/layout";
import { Sparkles, Activity, Compass } from "lucide-react";
import { LivingGroundDeck } from "@/components/visualizations/living-ground-deck";
import { AdVessel } from "@/components/ad-vessel";

export default function VisualizationsPage() {
  return (
    <Layout>
      {/* ═════════════════════════════════════════════════════════════════════
          1. TOP HUD: DATA EXPLORER & ENGINE COVERAGE
             - DEEP ANALYTICS LAB (10 Spatial Data Engines badge)
             - DATA EXPLORER title + Interactive Tour CTA
             - ENGINE COVERAGE multi-dimensional stats panel
             - High-contrast, theme-aware in both Light Mode and Dark Mode
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full backdrop-blur-xl border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#050816]/95 px-3 md:px-6 py-3 transition-all duration-300 shadow-sm dark:shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-stretch">
          {/* HERO TITLE CARD (LEFT) */}
          <div className="relative flex-1 bg-white dark:bg-[#0B1020] rounded-[22px] border border-slate-200 dark:border-white/10 overflow-hidden p-4 md:p-5 group shadow-sm dark:shadow-xl">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br stats-team-overlay" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/80 to-transparent hidden dark:block" />
              <div className="absolute inset-0 opacity-[0.04] bg-grid-40" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/25 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    DEEP ANALYTICS LAB
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 tracking-wider">10 Spatial Engines</span>
                </div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tighter scale-x-105 origin-left leading-none">
                  <div className="mb-0.5 text-slate-900 dark:text-white/90">DATA</div>
                  <span className="text-purple-600 dark:text-purple-400 block">EXPLORER.</span>
                </h1>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <p className="text-[10px] md:text-[11px] font-mono text-slate-500 dark:text-white/50 hidden sm:block">
                  Ball-By-Ball Spatial Graph • Living Ground Stacking Intelligence Deck
                </p>
                <button
                  onClick={() => {
                    document.getElementById("card-scoring-radar")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm hover:shadow-purple-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} /> Explore 10 Living Engines ↓
                </button>
              </div>
            </div>
          </div>

          {/* ENGINE COVERAGE PANEL (RIGHT) */}
          <div className="flex-1 bg-white dark:bg-[#0B1020] rounded-[22px] border border-slate-200 dark:border-white/10 p-4 md:p-5 flex flex-col justify-between hidden md:flex shadow-sm dark:shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Engine Coverage</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[9px] font-bold">
                  Multi-Dimensional
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-0.5">
                  Spatial & Telemetry Processing
                </div>
                <div className="text-xs md:text-sm font-black text-slate-900 dark:text-white">Ball-By-Ball Spatial Graph</div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-white/50 mt-0.5">
                  260,000+ Coordinate Deliveries Indexed
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-white/5 pt-2 mt-1">
              <div>
                <div className="text-[8px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">Dimensions</div>
                <div className="text-sm md:text-base font-black text-slate-900 dark:text-white">8</div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">Categories</div>
                <div className="text-sm md:text-base font-black text-purple-600 dark:text-purple-400">7 Primary</div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase text-slate-400 dark:text-white/30 tracking-widest">Matches</div>
                <div className="text-sm md:text-base font-black text-slate-900 dark:text-white">1,243</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          2. LIVING GROUND STACKING DECK
             - 10 Module cards with smooth natural scrolling & dimensions anchor bar
             - Full Light Mode and Dark Mode support
         ═════════════════════════════════════════════════════════════════════ */}
      <main className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="text-center mb-1">
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-white/30">ADVERTISEMENT</span>
          </div>
          <AdVessel slot="7293840192" format="horizontal" minHeight={90} className="border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#070B18]/90" />
        </div>
        <LivingGroundDeck />
      </main>
    </Layout>
  );
}
