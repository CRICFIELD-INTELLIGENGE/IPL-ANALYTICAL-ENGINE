import React from "react";
import { Layout } from "@/components/layout";
import { Sparkles, Activity } from "lucide-react";
import { LivingGroundDeck } from "@/components/visualizations/living-ground-deck";
import { AdVessel } from "@/components/ad-vessel";
import { useScroll } from "framer-motion";

export default function VisualizationsPage() {
  const { scrollYProgress } = useScroll();

  return (
    <Layout hideHeaderProgress={scrollYProgress}>
      {/* ═════════════════════════════════════════════════════════════════════
          1. TOP HUD: DATA EXPLORER & ENGINE COVERAGE
             - DEEP ANALYTICS LAB (7 Analytical Engines badge)
             - DATA EXPLORER title
             - ENGINE COVERAGE multi-dimensional stats panel
             - Scrolls off naturally as user scrolls past Module 1, allowing
               active module card to be dragged all the way to the top.
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full backdrop-blur-xl border-b border-white/10 bg-[#050816]/95 px-3 md:px-6 py-3 transition-all duration-300 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 items-stretch">
          {/* HERO TITLE CARD (LEFT) */}
          <div className="relative flex-1 bg-[#0B1020] rounded-[22px] border border-white/10 overflow-hidden p-4 md:p-5 group shadow-xl">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-[#050816] to-indigo-950/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/80 to-transparent" />
              <div className="absolute inset-0 opacity-[0.04] bg-grid-40" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    DEEP ANALYTICS LAB
                  </span>
                  <span className="text-[10px] font-mono text-white/40 tracking-wider">7 Analytical Engines</span>
                </div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter scale-x-105 origin-left leading-none">
                  <div className="mb-0.5 text-white/90">DATA</div>
                  <span className="text-purple-400 block">EXPLORER.</span>
                </h1>
              </div>
              <p className="text-[10px] md:text-[11px] font-mono text-white/50 mt-1 hidden sm:block">
                Ball-By-Ball Spatial Graph • Living Ground Stacking Intelligence Deck
              </p>
            </div>
          </div>

          {/* ENGINE COVERAGE PANEL (RIGHT) */}
          <div className="flex-1 bg-[#0B1020] rounded-[22px] border border-white/10 p-4 md:p-5 flex flex-col justify-between hidden md:flex shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Engine Coverage</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold">
                  Multi-Dimensional
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-0.5">
                  Spatial & Telemetry Processing
                </div>
                <div className="text-xs md:text-sm font-black text-white">Ball-By-Ball Spatial Graph</div>
                <div className="text-[10px] font-mono text-white/50 mt-0.5">
                  260,000+ Coordinate Deliveries Indexed
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 mt-1">
              <div>
                <div className="text-[8px] font-black uppercase text-white/30 tracking-widest">Dimensions</div>
                <div className="text-sm md:text-base font-black text-white">8</div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase text-white/30 tracking-widest">Categories</div>
                <div className="text-sm md:text-base font-black text-purple-400">7 Primary</div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase text-white/30 tracking-widest">Matches</div>
                <div className="text-sm md:text-base font-black text-white">1,243</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          2. NEW ARCHITECTURE: "LIVING GROUND STACKING DECK"
             - Container: relative w-full max-w-7xl mx-auto px-4 py-8
             - 6 viewport cards sticking at top: calc(140px + ${index * 20}px)
             - Smooth scale(0.96) and opacity(0.60) stacking physics
         ═════════════════════════════════════════════════════════════════════ */}
      <main className="min-h-screen bg-[#030712] relative z-10">
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="text-center mb-1">
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">ADVERTISEMENT</span>
          </div>
          <AdVessel slot="7293840192" format="horizontal" minHeight={90} className="border-white/10 bg-[#070B18]/90" />
        </div>
        <LivingGroundDeck />
      </main>
    </Layout>
  );
}