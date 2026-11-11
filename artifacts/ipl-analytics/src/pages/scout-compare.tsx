import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ArrowLeft,
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  User,
  Info,
} from "lucide-react";
import { Layout } from "@/components/layout";
import {
  fetchScoutCompare,
  type Discipline,
  type MatchPhase,
} from "@/lib/scout-api";
import {
  SampleTierBadge,
  ShrunkIndexBadge,
  ConfidenceIntervalBadge,
  RolePill,
} from "@/components/scout/scout-metric-badge";
import { ScoutRadarComparison } from "@/components/scout/scout-radar-chart";
import { ScoutSearchBar } from "@/components/scout/scout-search-bar";

export default function ScoutComparePage() {
  const [location, setLocation] = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  const idsParam = searchParams.get("ids") || "f1809c03,31ee319e"; // default Tanay & Ajay
  // Default matches the API default (batting); the leaderboard passes its discipline explicitly.
  const initialDiscipline: Discipline = searchParams.get("discipline") === "bowling" ? "bowling" : "batting";
  const initialPhase = (searchParams.get("phase") as MatchPhase) || "all";
  const [competitions] = useState(searchParams.get("competitions") || undefined);
  const [recentSeasons] = useState(Number(searchParams.get("recentSeasons")) || undefined);
  const contextSuffix = new URLSearchParams({ ...(competitions ? { competitions } : {}), ...(recentSeasons ? { recentSeasons: String(recentSeasons) } : {}), ...(searchParams.get("team") ? { team: searchParams.get("team")! } : {}) }).toString();

  const [playerIds, setPlayerIds] = useState<string[]>(
    idsParam.split(",").map((s) => s.trim()).filter(Boolean)
  );
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline);
  const [phase, setPhase] = useState<MatchPhase>(initialPhase);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["scout-compare", playerIds.join(","), discipline, phase, competitions, recentSeasons],
    queryFn: () =>
      fetchScoutCompare({
        ids: playerIds,
        competitions,
        recentSeasons,
        discipline,
        phase,
      }),
    enabled: playerIds.length >= 2,
    staleTime: 5 * 60_000,
  });

  const removePlayer = (id: string) => {
    if (playerIds.length <= 2) return; // Keep at least 2
    const next = playerIds.filter((p) => p !== id);
    setPlayerIds(next);
    setLocation(`/scout/compare?ids=${next.join(",")}&discipline=${discipline}&phase=${phase}&${contextSuffix}`);
  };

  const addPlayer = (newId: string) => {
    if (playerIds.includes(newId) || playerIds.length >= 5) return;
    const next = [...playerIds, newId];
    setPlayerIds(next);
    setShowAddPlayer(false);
    setLocation(`/scout/compare?ids=${next.join(",")}&discipline=${discipline}&phase=${phase}&${contextSuffix}`);
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/scout">
            <button className="text-white/60 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Global Leaderboard</span>
            </button>
          </Link>

          {/* Discipline Toggle */}
          <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => {
                setDiscipline("batting");
                setLocation(`/scout/compare?ids=${playerIds.join(",")}&discipline=batting&phase=${phase}&${contextSuffix}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                discipline === "batting"
                  ? "bg-primary text-[#0B1020]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Batting Metrics
            </button>
            <button
              onClick={() => {
                setDiscipline("bowling");
                setLocation(`/scout/compare?ids=${playerIds.join(",")}&discipline=bowling&phase=${phase}&${contextSuffix}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                discipline === "bowling"
                  ? "bg-primary text-[#0B1020]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Bowling Metrics
            </button>
          </div>
        </div>

        {/* TITLE & PLAYER ROSTER TRAY */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0B1020] via-[#111827] to-[#1E1B4B] border border-white/10 p-6 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-1">
                <Scale className="w-3.5 h-3.5" />
                Side-by-Side Scout Comparison
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Player Head-to-Head Radar
              </h1>
              <p className="text-xs text-white/60 max-w-xl">
                Compare multi-phase metrics normalized across 6 leagues. Identifies statistical strengths,
                sample certainty, and condition suitability.
              </p>
            </div>

            {/* Add Player Control */}
            <div className="flex items-center gap-2">
              {playerIds.length < 5 && (
                <button
                  onClick={() => setShowAddPlayer(!showAddPlayer)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span>Add Player</span>
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Add Player Box */}
          {showAddPlayer && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-white block">
                Select an additional player from global warehouse:
              </span>
              <ScoutSearchBar
                onSearchSubmit={() => {}}
                placeholder="Search player to add (e.g., Harvik, Atkinson, Bumrah)..."
              />
            </div>
          )}

          {/* Active Player Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              Comparing ({playerIds.length}):
            </span>
            {data?.players.map((item) => (
              <div
                key={item.player.cricsheet_id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-bold"
              >
                <span>{item.player.unique_name || item.player.name}</span>
                <span className="text-[10px] font-mono text-white/40">
                  ({item.player.cricsheet_id})
                </span>
                {playerIds.length > 2 && (
                  <button
                    onClick={() => removePlayer(item.player.cricsheet_id)}
                    className="p-0.5 rounded text-white/40 hover:text-rose-400 transition-colors"
                    title="Remove player"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN COMPARISON VIEW */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-white/50">Computing radar indices and delta metrics...</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center space-y-2 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
            <p className="text-sm font-bold text-rose-400">Failed to load comparison data.</p>
            <p className="text-xs text-white/50 font-mono">{(error as any)?.message}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* RADAR CHART CONTAINER */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-6 shadow-2xl">
              <h2 className="text-sm font-black uppercase tracking-wider text-white mb-4">
                Multivariate Radar Profile (0–100 Normalized Scale)
              </h2>
              <ScoutRadarComparison metrics={data.radarMetrics} players={data.players} />
            </div>

            {/* SIDE-BY-SIDE METRICS MATRIX */}
            <div className="rounded-3xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 bg-white/[0.01]">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  Head-to-Head Metric Breakdown
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-white/40">
                      <th className="py-3 px-4 min-w-[160px]">Metric</th>
                      {data.players.map((item) => (
                        <th key={item.player.cricsheet_id} className="py-3 px-4 text-center">
                          <div className="font-bold text-white text-xs">
                            {item.player.unique_name || item.player.name}
                          </div>
                          <div className="text-[10px] font-mono text-white/40">
                            {item.player.cricsheet_id}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {/* Role & Tier */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">Inferred Role</td>
                      {data.players.map((item) => (
                        <td key={item.player.cricsheet_id} className="py-3 px-4 text-center">
                          {item.rating?.role ? <RolePill role={item.rating.role} /> : "—"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">Sample Reliability</td>
                      {data.players.map((item) => (
                        <td key={item.player.cricsheet_id} className="py-3 px-4 text-center">
                          {item.rating?.tier ? (
                            <SampleTierBadge tier={item.rating.tier} balls={item.rating.balls} />
                          ) : (
                            "—"
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">Total Volume</td>
                      {data.players.map((item) => (
                        <td key={item.player.cricsheet_id} className="py-3 px-4 text-center font-mono">
                          <span className="font-bold text-white">{item.rating?.balls ?? 0}b</span>
                          <span className="text-white/40 text-[10px] block">
                            {item.rating?.matches ?? 0}m • {item.rating?.innings ?? 0}i
                          </span>
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70" title="Each player is shown in the league where they have the most balls in the selected window; percentiles are within that league.">
                        League (largest sample)
                      </td>
                      {data.players.map((item) => (
                        <td key={item.player.cricsheet_id} className="py-3 px-4 text-center font-mono text-xs uppercase text-white/80">
                          {item.rating?.competition ?? "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Primary Shrunk Metric */}
                    <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                      <td className="py-3 px-4 font-bold text-primary">
                        {discipline === "batting" ? "Shrunk Strike Rate Index" : "Shrunk Economy Index"}
                      </td>
                      {data.players.map((item) => {
                        const mKey = discipline === "batting" ? "strike_rate" : "economy";
                        return (
                          <td key={item.player.cricsheet_id} className="py-3 px-4 text-center">
                            <ShrunkIndexBadge
                              metric={item.rating?.metrics[mKey]}
                              invertBetter={discipline === "bowling"}
                            />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Raw Metric */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">
                        {discipline === "batting" ? "Raw Strike Rate" : "Raw Economy"}
                      </td>
                      {data.players.map((item) => {
                        const mKey = discipline === "batting" ? "strike_rate" : "economy";
                        const val = item.rating?.metrics[mKey]?.value;
                        return (
                          <td key={item.player.cricsheet_id} className="py-3 px-4 text-center font-mono font-bold text-white">
                            {val != null ? val.toFixed(2) : "—"}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Dot Ball % */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">Dot Ball %</td>
                      {data.players.map((item) => {
                        const val = item.rating?.metrics.dot_pct?.value;
                        return (
                          <td key={item.player.cricsheet_id} className="py-3 px-4 text-center font-mono">
                            <span className="text-white font-bold">{val != null ? `${val.toFixed(1)}%` : "—"}</span>
                            <ConfidenceIntervalBadge ci={item.rating?.metrics.dot_pct?.ci} metricId="dot_pct" />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Boundary % */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white/70">Boundary %</td>
                      {data.players.map((item) => {
                        const val = item.rating?.metrics.boundary_pct?.value;
                        return (
                          <td key={item.player.cricsheet_id} className="py-3 px-4 text-center font-mono">
                            <span className="text-white font-bold">{val != null ? `${val.toFixed(1)}%` : "—"}</span>
                            <ConfidenceIntervalBadge ci={item.rating?.metrics.boundary_pct?.ci} metricId="boundary_pct" />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Detailed Profile Link */}
                    <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                      <td className="py-3 px-4 font-bold text-white/40">Full Dossier</td>
                      {data.players.map((item) => (
                        <td key={item.player.cricsheet_id} className="py-3 px-4 text-center">
                          <Link href={`/scout/player/${item.player.cricsheet_id}`}>
                            <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all inline-flex items-center gap-1">
                              <span>Open Dossier</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
