import "./scout-terminal.css";
import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  fetchScoutRankings,
  type Discipline,
  type MatchPhase,
  type ScoutRating,
} from "@/lib/scout-api";
import { Layout } from "@/components/layout";
import type { ScoutingBoardFilters } from "@/components/scout/scout-board";
import { ScoutCinematicRoom } from "@/components/scout/scout-cinematic-room";
import { useScoutShortlist } from "@/lib/scout-shortlist";
import { useTeamTheme, resolveTeamCode, type TeamCode } from "@/lib/team-context";

export default function ScoutHomePage() {
  const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [discipline, setDiscipline] = useState<Discipline>(
    (sp.get("discipline") as Discipline) || "batting"
  );
  const [selectedComps, setSelectedComps] = useState<string[]>(
    sp.get("competitions")?.split(",").filter(Boolean) ?? []
  );
  const [phase, setPhase] = useState<MatchPhase>(
    (sp.get("phase") as MatchPhase) || "all"
  );
  const [role, setRole] = useState<string>(sp.get("role") || "");
  const [minBalls, setMinBalls] = useState<number>(Math.max(0, Number(sp.get("minBalls")) || 120));
  const [recentSeasons] = useState<number | undefined>(Number(sp.get("recentSeasons")) > 0 ? Number(sp.get("recentSeasons")) : undefined);
  const [franchiseContext, setFranchiseContext] = useState(sp.get("team") ?? "");
  const { selectedTeam } = useTeamTheme();
  const [searchQuery, setSearchQuery] = useState<string>(sp.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(timer); }, [searchQuery]);
  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>("shrunk");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"table" | "scatter">("table");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [aiCandidates, setAiCandidates] = useState<ScoutRating[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutRating | null>(null);
  const [compareTray, setCompareTray] = useState<string[]>([]);

  // Shortlist Hook (Module 4)
  const { shortlist, toggleShortlist, isShortlisted, clearShortlist } = useScoutShortlist();

  const compsParam = selectedComps.length > 0 ? selectedComps.join(",") : undefined;

  // React Query fetching verified rankings
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "scout-rankings",
      discipline,
      compsParam,
      phase,
      role,
      minBalls,
      page,
      25,
      sortBy,
      sortOrder,
      debouncedSearch,
      recentSeasons,
    ],
    queryFn: () =>
      fetchScoutRankings({
        discipline,
        competitions: compsParam,
        phase,
        role: role || undefined,
        minBalls,
        recentSeasons,
        page,
        limit: 25,
        sortBy,
        sortOrder,
        search: debouncedSearch || undefined,
      }),
    staleTime: 5 * 60_000,
  });

  // Reset page when core filters change
  useEffect(() => {
    setPage(1);
  }, [discipline, compsParam, phase, role, minBalls, searchQuery]);

  // Sync URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (discipline !== "batting") params.set("discipline", discipline);
    if (selectedComps.length > 0) params.set("competitions", selectedComps.join(","));
    if (phase !== "all") params.set("phase", phase);
    if (role) params.set("role", role);
    params.set("minBalls", String(minBalls));
    if (recentSeasons) params.set("recentSeasons", String(recentSeasons));
    if (searchQuery) params.set("search", searchQuery);
    if (selectedTeam) {
      params.set("team", selectedTeam.toLowerCase());
    } else if (franchiseContext) {
      params.set("team", franchiseContext);
    }
    const str = params.toString();
    const newUrl = str ? `${window.location.pathname}?${str}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [discipline, selectedComps, phase, role, minBalls, recentSeasons, searchQuery, franchiseContext, selectedTeam]);

  const toggleCompare = useCallback(
    (id: string) =>
      setCompareTray((p) =>
        p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p
      ),
    []
  );

  const resetAll = useCallback(() => {
    setDiscipline("batting");
    setSelectedPlayer(null);
    setSelectedComps([]);
    setPhase("all");
    setRole("");
    setMinBalls(120);
    setSearchQuery("");
    setPage(1);
    setSortBy("shrunk");
    setSortOrder("desc");
    setActivePresetId(null);
    setViewMode("table");
  }, []);

  // Connected Discovery Stream Presets
  const applyPreset = useCallback((preset: ScoutingBoardFilters, targetId?: string) => {
    if (preset.phase) setPhase(preset.phase);
    if (preset.minBalls !== undefined) setMinBalls(preset.minBalls);
    if (preset.discipline) setDiscipline(preset.discipline);
    if (preset.role !== undefined) setRole(preset.role);
    if (preset.sortBy) setSortBy(preset.sortBy);
    if (preset.viewMode) setViewMode(preset.viewMode);
    if (preset.competitions !== undefined) setSelectedComps(preset.competitions);
    setPage(1);

    if (preset.viewMode === "scatter") setActivePresetId("hidden_gems");
    else if (preset.phase === "powerplay") setActivePresetId("powerplay");
    else if (preset.phase === "death") setActivePresetId("death");
    else if (preset.competitions && preset.competitions.length === 0) setActivePresetId("crossovers");

    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <Layout>
      <div className="scout-terminal scout-notebook w-full max-w-full min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-[#050B11] text-slate-900 dark:text-[#EFF5F7] transition-colors">
        {/* CINEMATIC SCOUT COMMAND ROOM (Matches Lovable Format 1:1 with Dynamic Team Dugout Palette) */}
        <ScoutCinematicRoom
          discipline={discipline}
          setDiscipline={setDiscipline}
          role={role}
          setRole={setRole}
          selectedComps={selectedComps}
          setSelectedComps={setSelectedComps}
          phase={phase}
          setPhase={setPhase}
          minBalls={minBalls}
          setMinBalls={setMinBalls}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedPlayer={selectedPlayer}
          onSelectPlayer={setSelectedPlayer}
          onAiCandidates={setAiCandidates}
          results={data?.data ?? []}
          searching={isFetching || searchQuery !== debouncedSearch}
          searchFailed={isError}
          shortlist={shortlist}
          onToggleShortlist={(id) => { const player = selectedPlayer?.cricsheet_id === id ? selectedPlayer : aiCandidates.find(p => p.cricsheet_id === id) ?? data?.data.find(p => p.cricsheet_id === id) ?? shortlist.find(p => p.cricsheet_id === id); if (player) toggleShortlist(player); }}
          isShortlisted={isShortlisted}
          onApplyPreset={applyPreset}
        />
      </div>
    </Layout>
  );
}
