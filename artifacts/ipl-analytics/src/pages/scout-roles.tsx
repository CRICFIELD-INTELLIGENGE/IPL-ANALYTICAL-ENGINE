import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Info,
  CheckCircle2,
  Users,
  Sparkles,
} from "lucide-react";
import { Layout } from "@/components/layout";
import {
  fetchScoutRoles,
  type RoleCatalogItem,
} from "@/lib/scout-api";
import { RolePill } from "@/components/scout/scout-metric-badge";

export default function ScoutRolesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scout-roles"],
    queryFn: fetchScoutRoles,
    staleTime: 10 * 60_000,
  });

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <Link href="/scout">
            <button className="text-white/60 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Global Leaderboard</span>
            </button>
          </Link>
        </div>

        {/* HERO TITLE */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#1E1B4B] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" />
            Deterministic Role Taxonomy
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Cricket Role Intelligence & Taxonomy
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-2xl leading-relaxed">
            In modern T20 cricket, generic positions like "batsman" or "bowler" fail to capture tactical utility.
            CricField’s deterministic engine classifies roles mathematically using empirical crease arrival,
            phase concentration, and boundary profiles across 6 global leagues.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-white/50">Loading role taxonomy and active counts from global warehouse...</p>
          </div>
        ) : isError || !data ? (
          <div className="py-16 text-center text-rose-400 text-xs">
            Failed to load role catalog: {(error as any)?.message}
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. BATTING ROLES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Batting Role Classifications
                  </h2>
                  <p className="text-xs text-white/50">
                    Determined by entry ball distribution, opening share, and death concentration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.battingRoles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <RolePill role={role.id} />
                        <span className="text-[10px] font-mono font-bold text-white/40">
                          {role.activeCount} active players
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {role.label}
                      </h3>
                      <p className="text-xs text-white/70 leading-normal">
                        {role.definition}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40">
                        Min: {role.minUsage}
                      </span>
                      <Link href={`/scout?discipline=batting&role=${role.id}`}>
                        <button className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                          <span>View Rankings</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. BOWLING ROLES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    Bowling Role Classifications
                  </h2>
                  <p className="text-xs text-white/50">
                    Defined by phase specialization factors (1.6x expected baseline volume).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.bowlingRoles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <RolePill role={role.id} />
                        <span className="text-[10px] font-mono font-bold text-white/40">
                          {role.activeCount} active players
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {role.label}
                      </h3>
                      <p className="text-xs text-white/70 leading-normal">
                        {role.definition}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40">
                        Min: {role.minUsage}
                      </span>
                      <Link href={`/scout?discipline=bowling&role=${role.id}`}>
                        <button className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                          <span>View Rankings</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. USAGE PROFILES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Squad Usage & Functional Profiles
                  </h2>
                  <p className="text-xs text-white/50">
                    Categorizes two-way utility: All-Rounders, Wicketkeeper-Batters, Pure Specialists.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.usageProfiles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <RolePill role={role.id} />
                        <span className="text-[10px] font-mono font-bold text-white/40">
                          {role.activeCount} players
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {role.label}
                      </h3>
                      <p className="text-xs text-white/70 leading-normal">
                        {role.definition}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <span className="text-[10px] font-mono text-white/40">
                        Criteria: {role.minUsage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. METHODOLOGY & SPECIFICATIONS */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Mathematical Formulas & Confidence Calibration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {Object.entries(data.methodology).map(([k, text]) => (
                  <div key={k} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-primary text-[10px] block">
                      {k.replace(/([A-Z])/g, " $1")}
                    </span>
                    <p className="text-white/70 leading-relaxed text-[11px] font-mono">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
