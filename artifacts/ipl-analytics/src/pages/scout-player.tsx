import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  ExternalLink,
  Scale,
  Calendar,
  Globe,
  Award,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Layout } from "@/components/layout";
import {
  fetchScoutPlayer,
  isLowerBetter,
  type ScoutPlayerProfileResponse,
} from "@/lib/scout-api";
import {
  SampleTierBadge,
  ShrunkIndexBadge,
  ConfidenceIntervalBadge,
  RolePill,
} from "@/components/scout/scout-metric-badge";

export default function ScoutPlayerPage() {
  const [, params] = useRoute("/scout/player/:id");
  const rawId = params?.id ? decodeURIComponent(params.id) : "";

  const [activeTab, setActiveTab] = useState<"seasons" | "ratings" | "trends" | "similar">("seasons");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["scout-player", rawId],
    queryFn: () => fetchScoutPlayer(rawId),
    enabled: Boolean(rawId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="w-full max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-white/50">Retrieving cross-league player dossier from global warehouse...</p>
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Scouting Profile Not Found</h2>
          <p className="text-xs text-white/60 max-w-md mx-auto">
            Unable to resolve player identifier "{rawId}" in the global database.
            {(error as any)?.message && (
              <span className="block mt-1 font-mono text-[11px] text-rose-300">
                {(error as any).message}
              </span>
            )}
          </p>
          <div className="pt-2">
            <Link href="/scout">
              <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Scout Lab</span>
              </button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const {
    player,
    verifiedAttributes,
    contextSummary,
    seasonLines,
    ratings,
    trends,
    strengthsAndWeaknesses,
    similarPlayers,
  } = data;

  const displayName = player.unique_name || player.name;

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* BREADCRUMB & TOP ACTIONS */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/scout">
            <button className="text-white/60 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Global Rankings</span>
            </button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href={`/scout/compare?ids=${player.cricsheet_id}`}>
              <button className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-bold transition-all flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Compare Player</span>
              </button>
            </Link>
            <Link href="/ai-analyst">
              <button className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Ask AI Analyst</span>
              </button>
            </Link>
          </div>
        </div>

        {/* HERO PLAYER DOSSIER CARD */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#1E1B4B] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/70 shadow-lg">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    Scouting Dossier
                  </span>
                  <span className="text-[10px] font-mono text-white/50">
                    ID: {player.cricsheet_id}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {displayName}
                </h1>

                {player.unique_name && player.unique_name !== player.name && (
                  <p className="text-xs text-white/50 font-mono">
                    Scorecard name: {player.name}
                  </p>
                )}

                {/* Competition badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {contextSummary.competitionsPlayed.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/80 border border-white/10"
                    >
                      {c}
                    </span>
                  ))}
                  <span className="text-xs text-white/40 ml-1">
                    • {contextSummary.iplAppearances} IPL match appearances
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 min-w-[110px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                  Primary Role
                </span>
                <span className="text-sm font-black text-white capitalize">
                  {contextSummary.primaryDiscipline}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 min-w-[110px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                  Leagues
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {contextSummary.competitionsPlayed.length} of 6
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 min-w-[110px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                  Capped 2026
                </span>
                <span className="text-xs font-bold text-white capitalize">
                  {/* No evidence is not "uncapped" (Day 7: JJ Bumrah showed "Uncapped / Unverified"). */}
                  {verifiedAttributes.cappedStatus2026?.value || "Not recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* VERIFIED ATTRIBUTES VS STATISTICAL ROLES */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ground Truth Verified Attributes */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ground-Truth Attributes (External Source Verified)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-white/40 text-[10px] block">Batting Hand</span>
                  <span className="text-white font-bold capitalize">
                    {verifiedAttributes.battingHand ? `${verifiedAttributes.battingHand} Hand` : "Unrecorded"}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 text-[10px] block">Bowling Style</span>
                  <span className="text-white font-bold capitalize">
                    {verifiedAttributes.bowling.action || verifiedAttributes.bowling.type}
                    {verifiedAttributes.bowling.arm && ` (${verifiedAttributes.bowling.arm}-arm)`}
                  </span>
                </div>
              </div>
              {verifiedAttributes.provenance.length > 0 && (
                <div className="text-[10px] text-white/40 font-mono pt-1">
                  Sources: {verifiedAttributes.provenance.map((p) => p.source).filter(Boolean).join(", ")}
                </div>
              )}
            </div>

            {/* Inferred Statistical Roles */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Activity className="w-4 h-4" />
                <span>Inferred Roles (Algorithmic Qualification)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ratings.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase text-white/50">{r.competition} {r.discipline}:</span>
                    <RolePill role={r.role} />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/40 leading-normal pt-1">
                Derived deterministically from median entry ball, position share, and phase concentration.
              </p>
            </div>
          </div>
        </div>

        {/* STRENGTHS & WEAKNESSES CHIPS */}
        {(strengthsAndWeaknesses.strengths.length > 0 || strengthsAndWeaknesses.weaknesses.length > 0) && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-white block">
              Statistical Evidence & Scouting Assessment
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Strengths (Top Percentile Performance)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {strengthsAndWeaknesses.strengths.length > 0 ? (
                    strengthsAndWeaknesses.strengths.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40 italic">No significant positive statistical outliers.</span>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Weaknesses & Exploit Angles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {strengthsAndWeaknesses.weaknesses.length > 0 ? (
                    strengthsAndWeaknesses.weaknesses.map((w, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium"
                      >
                        {w}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40 italic">No significant vulnerability anomalies.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 border-b border-white/10 pb-1">
          <button
            onClick={() => setActiveTab("seasons")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "seasons"
                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                : "text-white/50 hover:text-white"
            }`}
          >
            Season Record ({seasonLines.length})
          </button>
          <button
            onClick={() => setActiveTab("ratings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ratings"
                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                : "text-white/50 hover:text-white"
            }`}
          >
            League-Adjusted Ratings ({ratings.length})
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "trends"
                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                : "text-white/50 hover:text-white"
            }`}
          >
            Performance Trends ({trends.length})
          </button>
          <button
            onClick={() => setActiveTab("similar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "similar"
                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                : "text-white/50 hover:text-white"
            }`}
          >
            Similar Profiles ({similarPlayers.length})
          </button>
        </div>

        {/* TAB 1: SEASON-BY-SEASON CROSS-LEAGUE RECORD */}
        {activeTab === "seasons" && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-white/40">
                    <th className="py-3 px-4">League</th>
                    <th className="py-3 px-4">Season</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-right">Bat Inngs</th>
                    <th className="py-3 px-4 text-right">Runs (Balls)</th>
                    <th className="py-3 px-4 text-right">SR (Index)</th>
                    <th className="py-3 px-4 text-right">Bowl Legal</th>
                    <th className="py-3 px-4 text-right">Wkts</th>
                    <th className="py-3 px-4 text-right">Econ (Index)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {seasonLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4 font-bold uppercase text-white">
                        {line.competition}
                      </td>
                      <td className="py-3 px-4 font-mono text-white/70">
                        {line.season}
                      </td>
                      <td className="py-3 px-4 text-white/80 font-medium">
                        {line.team || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <RolePill role={line.batting_role !== "insufficient" ? line.batting_role : line.bowling_role} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white/80">
                        {line.bat?.innings ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="font-bold text-white">{line.bat?.runs ?? 0}</span>
                        <span className="text-white/40 text-[10px]"> ({line.bat?.balls ?? 0}b)</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-white">{line.bat?.sr != null ? line.bat.sr.toFixed(1) : "—"}</span>
                        {line.bat?.srIndex != null && (
                          <span className="text-[10px] text-primary block">
                            Idx: {line.bat.srIndex.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white/80">
                        {line.bowl?.legal ?? 0}b
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {line.bowl?.wickets ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-white">{line.bowl?.economy != null ? line.bowl.economy.toFixed(2) : "—"}</span>
                        {line.bowl?.econIndex != null && (
                          <span className="text-[10px] text-emerald-400 block">
                            Idx: {line.bowl.econIndex.toFixed(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED RATINGS */}
        {activeTab === "ratings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratings.map((r, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-white">{r.competition} · {r.discipline}</span>
                    <RolePill role={r.role} />
                  </div>
                  <SampleTierBadge tier={r.tier} balls={r.balls} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  {Object.entries(r.metrics).map(([key, m]) => (
                    <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-white/40 block">
                        {key.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black text-white font-mono">
                          {m.value != null ? m.value.toFixed(1) : "—"}
                        </span>
                        <ShrunkIndexBadge metric={m} invertBetter={isLowerBetter(r.discipline, key)} />
                      </div>
                      <div className="text-[9px] text-white/40">
                        95% CI (raw index): <ConfidenceIntervalBadge ci={m.ci} metricId={key} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: PERFORMANCE TRENDS */}
        {activeTab === "trends" && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 space-y-4">
            <span className="text-xs font-black uppercase tracking-wider text-white block">
              Multi-Season Statistical Trajectory
            </span>
            {trends.length === 0 ? (
              <p className="text-xs text-white/40 italic">
                Insufficient multi-season volume (needs &gt;= 60 balls in both latest and earlier seasons) for regression testing.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trends.map((t, idx) => {
                  const isImproving = t.verdict === "improving";
                  const isDeclining = t.verdict === "declining";
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase text-white">
                          {t.competition} • {t.metric.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isImproving
                              ? "bg-emerald-500/15 text-emerald-400"
                              : isDeclining
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {t.verdict}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70">{t.detail}</p>
                      <div className="flex items-center justify-between font-mono text-[11px] text-white/50 pt-1">
                        <span>Latest: {t.latest != null ? t.latest.toFixed(1) : "—"}</span>
                        <span>Earlier: {t.earlier != null ? t.earlier.toFixed(1) : "—"}</span>
                        {t.change != null && (
                          <span className={t.change > 0 ? "text-emerald-400" : "text-rose-400"}>
                            Δ {t.change > 0 ? `+${t.change.toFixed(1)}` : t.change.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SIMILAR PLAYERS (NEAREST NEIGHBORS) */}
        {activeTab === "similar" && (
          <div className="space-y-4">
            <p className="text-xs text-white/60">
              Discovered via Euclidean vector distance over normalized multi-phase metrics across the global warehouse.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarPlayers.map((sim) => (
                <div
                  key={sim.player_key}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/40">
                        Dist: {sim.distance.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black uppercase text-primary">
                        {sim.competition}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{sim.name}</h3>
                    <RolePill role={sim.role} />
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <Link href={`/scout/player/${sim.cricsheet_id}`}>
                      <button className="text-xs text-white/70 hover:text-white font-bold transition-colors">
                        View Dossier
                      </button>
                    </Link>
                    <Link href={`/scout/compare?ids=${player.cricsheet_id},${sim.cricsheet_id}`}>
                      <button className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-bold transition-all flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        <span>Compare</span>
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
