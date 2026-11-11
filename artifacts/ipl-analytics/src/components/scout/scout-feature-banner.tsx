import React from "react";
import { Link } from "wouter";
import { Compass, Scale, Layers, ArrowRight, ShieldCheck, Sparkles, Database } from "lucide-react";

export function ScoutFeatureBanner() {
  return (
    <div className="rounded-3xl bg-[#0B1118] border border-white/10 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
      {/* Stadium Ambient Flares */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-br from-orange-500/15 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-orange-500/30 text-orange-400 text-[10px] font-mono font-bold uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5" />
            <span>GLOBAL SCOUTING INTELLIGENCE</span>
          </div>

          <h2 className="font-display text-xl sm:text-3xl font-black text-[#F5F7F8] tracking-tight uppercase">
            Discover Cricket Talent in CricField Scout Lab
          </h2>

          <p className="font-body text-xs sm:text-sm text-[#9BAAB5] leading-relaxed">
            Move beyond raw franchise statistics. Our multi-league intelligence engine evaluates players across
            <strong> 6 premier competitions</strong> (IPL, SMAT, BBL, SA20, CPL, ILT20) with normalized phase ratings,
            multi-league form comparisons, and head-to-head radar analysis.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-[#9BAAB5]">
            <span className="flex items-center gap-1 text-orange-400 font-bold">
              <Database className="w-3.5 h-3.5" /> 3,309 Matches
            </span>
            <span>•</span>
            <span>6 Leagues</span>
            <span>•</span>
            <span>Deterministic Roles</span>
            <span>•</span>
            <span>Performance Profiles</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <Link href="/scout">
            <button className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-mono font-black tracking-wide uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer">
              <span>Enter Scout Lab</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/scout/roles">
              <button className="flex-1 px-3.5 py-2 rounded-xl bg-[#14212A] hover:bg-[#1B2932] text-[#F5F7F8] border border-white/10 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#4CC9C0]" />
                <span>Role Catalog</span>
              </button>
            </Link>
            <Link href="/scout/compare?ids=f1809c03,31ee319e">
              <button className="flex-1 px-3.5 py-2 rounded-xl bg-[#14212A] hover:bg-[#1B2932] text-[#F5F7F8] border border-white/10 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#F4B96C]" />
                <span>Compare Radar</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
