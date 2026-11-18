import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildDimensionalPayload,
  defaultAnalyticsFilters,
  useAnalyticsFilterStore,
  type AnalyticsFilters,
} from "@/lib/store";
import { DESKTOP_FILTERS, sliceList, type FilterId } from "@/components/stats-slicing/config";
import type { MatchState } from "@/components/stats-slicing/match-state";
import { sliceFromSearch, sliceToSearch } from "@/components/stats-slicing/slice-url";
import {
  displayPlayerName,
  isMatchingTeam,
  normalizeVenueName,
  teamShort,
  useMatches,
  usePlayerBios,
  usePlayerCareerStats,
  usePlayerDisplayNames,
  usePlayerImages,
  usePlayerLatestTeamResolver,
  usePlayerSeasonStats,
  usePlayerTeamsMap,
  useSeasons,
  useTeams,
  useVenues,
} from "@/lib/aggregates";
import { useTeamTheme } from "@/lib/team-context";
import matchStages from "@/data/ipl-match-stages.json";
import { resolveMobileStatsTab, type StatsTabId } from "./nav-config";

export type BatterSortField =
  | "player"
  | "matches"
  | "innings"
  | "runs"
  | "balls"
  | "highest"
  | "avg"
  | "sr"
  | "boundaryPct"
  | "fours"
  | "sixes"
  | "hundreds"
  | "fifties";

export type BowlerSortField =
  | "player"
  | "matches"
  | "innings"
  | "wickets"
  | "econ"
  | "avg"
  | "sr"
  | "dotPct"
  | "boundaryPct"
  | "ballsPerBoundary"
  | "trueEconomy";

export const fmtInt = (val: unknown): string => {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "—";
};

export const fmtDec = (val: unknown, dp = 1): string => {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n.toFixed(dp) : "—";
};

export function useMobileStats() {
  const [activeTab, setActiveTabState] = useState<StatsTabId>(() => {
    if (typeof window === "undefined") return "batters";
    const params = new URLSearchParams(window.location.search);
    if (params.get("deliveryType")) return "tactics";
    if (params.get("subTab")) return "tactics";
    return resolveMobileStatsTab(params.get("tab"));
  });

  const [batterSortField, setBatterSortField] = useState<BatterSortField>("runs");
  const [batterSortOrder, setBatterSortOrder] = useState<"asc" | "desc">("desc");
  const [bowlerSortField, setBowlerSortField] = useState<BowlerSortField>("wickets");
  const [bowlerSortOrder, setBowlerSortOrder] = useState<"asc" | "desc">("desc");

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDeferredValue(searchQuery);

  const [minSliceBalls, setMinSliceBalls] = useState(0);
  const [minInnings, setMinInnings] = useState(0);
  const [minMatches, setMinMatches] = useState(0);
  const [matchState, setMatchState] = useState<MatchState>({});

  const [tacticalSubTab, setTacticalSubTab] = useState<"tactics" | "pitch" | "wagon" | "ledger" | undefined>(undefined);
  const [tacticalDeliveryType, setTacticalDeliveryType] = useState<string | undefined>(undefined);
  const [tacticalPlayer, setTacticalPlayer] = useState<string | undefined>(undefined);

  const filters = useAnalyticsFilterStore((s) => s.filters);
  const setFilter = useAnalyticsFilterStore((s) => s.setFilter);
  const setFilters = useAnalyticsFilterStore((s) => s.setFilters);
  const clearFilter = useAnalyticsFilterStore((s) => s.clearFilter);
  const resetFilters = useAnalyticsFilterStore((s) => s.resetFilters);
  const filterChain = useAnalyticsFilterStore((s) => s.chain);

  const seasons = useSeasons();
  const teams = useTeams();
  const venues = useVenues();
  const matchesQuery = useMatches();
  const playerImages = usePlayerImages();
  const playerBios = usePlayerBios();
  const displayNames = usePlayerDisplayNames();
  const playerSeasonStats = usePlayerSeasonStats();
  const playerCareerStats = usePlayerCareerStats();
  const latestTeamResolver = usePlayerLatestTeamResolver();
  const playerTeamsMap = usePlayerTeamsMap();
  const { selectedTeam: themeTeam } = useTeamTheme();

  // Hydrate filters + deep links on initial mount & popstate
  const urlHydrated = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const { filters: fromUrl, extras } = sliceFromSearch(window.location.search);
      if (Object.keys(fromUrl).length) setFilters(fromUrl);
      setMinSliceBalls(extras.minBalls || 0);
      setMinInnings(extras.minInnings || 0);
      setMinMatches(extras.minMatches || 0);
      setMatchState(extras.matchState && Object.keys(extras.matchState).length ? extras.matchState : {});

      const queryTeam = params.get("team");
      if (queryTeam) setFilter("team", queryTeam);
      const qDelivery = params.get("deliveryType");
      const qSubTab = params.get("subTab");
      const qPlayer = params.get("player") || params.get("p1");
      if (qDelivery) setTacticalDeliveryType(qDelivery);
      if (qSubTab === "tactics" || qSubTab === "pitch" || qSubTab === "wagon" || qSubTab === "ledger") {
        setTacticalSubTab(qSubTab);
      }
      if (qPlayer) setTacticalPlayer(qPlayer);

      if (qDelivery || qSubTab) setActiveTabState("tactics");
      else if (extras.tab) setActiveTabState(resolveMobileStatsTab(extras.tab));
      else if (params.get("tab")) setActiveTabState(resolveMobileStatsTab(params.get("tab")));
    };

    applyFromUrl();
    urlHydrated.current = true;

    const onPop = () => applyFromUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setFilter, setFilters]);

  // Keep shareable URL synced cleanly via replaceState
  useEffect(() => {
    if (typeof window === "undefined" || !urlHydrated.current) return;
    const search = sliceToSearch(filters, {
      tab: activeTab,
      minBalls: minSliceBalls,
      minInnings,
      minMatches,
      matchState,
    });
    const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    const curr = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== curr) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [filters, activeTab, minSliceBalls, minInnings, minMatches, matchState]);

  const setActiveTab = useCallback((tab: StatsTabId) => {
    setActiveTabState(tab);
  }, []);

  const matches = matchesQuery.data ?? [];

  const activeMatches = useMemo(() => {
    const dim = buildDimensionalPayload(filters);
    const teamSel = sliceList(filters.team);
    const oppSel = sliceList(filters.opposition);
    const venueSel = sliceList(filters.venue).map((v) => normalizeVenueName(v).toLowerCase());

    return matches.filter((m: any) => {
      const day = String(m.date || "");
      if ((filters.seasonFrom && day.slice(0, 4) < filters.seasonFrom) || (filters.seasonTo && day.slice(0, 4) > filters.seasonTo)) return false;
      if ((filters.dateFrom && day < filters.dateFrom) || (filters.dateTo && day.slice(0, 10) > filters.dateTo)) return false;
      if (teamSel.length && !teamSel.some((t) => isMatchingTeam(m.team1, t) || isMatchingTeam(m.team2, t))) return false;
      if (oppSel.length && !oppSel.some((t) => isMatchingTeam(m.team1, t) || isMatchingTeam(m.team2, t))) return false;
      if (venueSel.length && !venueSel.includes(normalizeVenueName(m.venue || "").toLowerCase())) return false;
      const s = dim.season;
      if (s && s !== "All Seasons" && s !== "All" && s !== "all" && s !== "") {
        const cleanS = String(s).replace(/[^0-9]/g, "");
        const cleanM = String(m.season || "").replace(/[^0-9]/g, "");
        if (cleanM !== cleanS && String(m.season) !== String(s)) return false;
      }
      const stage = (matchStages as Record<string, string>)[m.id];
      if (filters.match_context === "Final") return stage === "Final";
      if (filters.match_context === "Playoffs") return !!stage;
      if (filters.match_context === "League Stage") return !stage;
      return true;
    });
  }, [
    matches,
    filters.season,
    filters.team,
    filters.opposition,
    filters.venue,
    filters.match_context,
    filters.seasonFrom,
    filters.seasonTo,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const slicedMatchIds = useMemo(
    () => new Set(activeMatches.map((m: any) => String(m.id))),
    [activeMatches],
  );

  const slicedTeams = useMemo(() => {
    const records = new Map<string, { team: string; matches: number; wins: number; noResult: number; winPct: number }>();
    activeMatches.forEach((m: any) => {
      [m.team1, m.team2].forEach((team) => {
        if (!team) return;
        const short = teamShort(team);
        const rec = records.get(short) || { team: short, matches: 0, wins: 0, noResult: 0, winPct: 0 };
        rec.matches += 1;
        if (!m.winner) rec.noResult += 1;
        else if (teamShort(m.winner) === short) rec.wins += 1;
        rec.winPct = rec.matches ? Math.round((rec.wins / rec.matches) * 1000) / 10 : 0;
        records.set(short, rec);
      });
    });
    return Array.from(records.values()).sort((a, b) => b.winPct - a.winPct || b.matches - a.matches);
  }, [activeMatches]);

  const teamCards = useMemo(() => {
    const byShort = new Map<string, any>();
    for (const row of teams.data ?? []) {
      const short = teamShort(row.team);
      const prev = byShort.get(short);
      if (!prev || (row.matches ?? 0) > (prev.matches ?? 0)) byShort.set(short, row);
    }
    return slicedTeams.map((s) => {
      const full = byShort.get(s.team);
      return {
        short: s.team,
        name: full?.team ?? s.team,
        matches: s.matches,
        wins: s.wins,
        losses: Math.max(0, s.matches - s.wins - s.noResult),
        noResult: s.noResult,
        winPct: s.winPct,
        titles: full?.titles ?? 0,
        allTimeMatches: full?.matches ?? 0,
      };
    });
  }, [slicedTeams, teams.data]);

  const slicedVenues = useMemo(() => {
    const records = new Map<string, { venue: string; matches: number; runs: number; balls: number; avgRunRate: number | null }>();
    activeMatches.forEach((match: any) => {
      if (!match.venue) return;
      const venue = normalizeVenueName(match.venue);
      const record = records.get(venue) ?? { venue, matches: 0, runs: 0, balls: 0, avgRunRate: null };
      record.matches += 1;
      for (const score of [match.team1Score, match.team2Score]) {
        const innings = /^(\d+)(?:\/\d+)?\s+\((\d+)(?:\.([0-5]))?\)$/.exec(score ?? "");
        if (!innings) continue;
        const balls = Number(innings[2]) * 6 + Number(innings[3] ?? 0);
        if (!balls) continue;
        record.runs += Number(innings[1]);
        record.balls += balls;
      }
      record.avgRunRate = record.balls ? (record.runs * 6) / record.balls : null;
      records.set(venue, record);
    });
    return Array.from(records.values()).sort((a, b) => b.matches - a.matches || a.venue.localeCompare(b.venue));
  }, [activeMatches]);

  const isVenueFiltered = useMemo(
    () =>
      filters.season !== "All Seasons" ||
      filters.team !== "All Teams" ||
      filters.opposition !== "All Opponents" ||
      filters.venue !== "All Venues" ||
      filters.match_context !== "All Matches" ||
      !!(filters.seasonFrom || filters.seasonTo || filters.dateFrom || filters.dateTo),
    [filters],
  );

  const venueCards = useMemo(() => {
    const byVenueName = new Map<string, any>();
    for (const v of venues.data ?? []) {
      byVenueName.set(normalizeVenueName(v.venue).toLowerCase(), v);
    }
    let filtered = slicedVenues;
    if (filters.venue !== "All Venues") {
      const targets = sliceList(filters.venue).map((v) => normalizeVenueName(v).toLowerCase());
      filtered = slicedVenues.filter((sv) =>
        targets.some((t) => sv.venue.toLowerCase().includes(t) || t.includes(sv.venue.toLowerCase())),
      );
    }
    return filtered.map((sv) => {
      const meta = byVenueName.get(sv.venue.toLowerCase()) || {};
      const cityName = String(meta.city || (meta.venue || "").split(",")[1]?.trim() || "IPL Venue");
      return {
        venueName: sv.venue,
        cityName,
        matches: sv.matches,
        avgRunRate: sv.avgRunRate,
        isSliced: isVenueFiltered,
      };
    });
  }, [venues.data, slicedVenues, filters.venue, isVenueFiltered]);

  // Dimensional query construction (exact desktop parity!)
  const sliceKeys = (Object.keys(defaultAnalyticsFilters) as (keyof AnalyticsFilters)[]).filter(
    (k) => filters[k] !== defaultAnalyticsFilters[k],
  );
  const hasMatchState = Object.keys(matchState).length > 0;
  const fixtureViews = activeTab === "venues" || activeTab === "teams";
  const fixtureKeys = new Set([
    "season",
    "team",
    "opposition",
    "venue",
    "match_context",
    "seasonFrom",
    "seasonTo",
    "dateFrom",
    "dateTo",
  ]);
  const deliveryScopeActive = hasMatchState || sliceKeys.some((k) => !fixtureKeys.has(k));
  const isDefaultCareerView = sliceKeys.length === 0 && !hasMatchState;
  const cachedSeasonSlice =
    !hasMatchState &&
    filters.season !== "All Seasons" &&
    sliceKeys.every((k) => k === "season" || k === "team");

  const statsParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.season) params.append("season", filters.season);
    if (filters.team) params.append("team", filters.team);
    if (filters.opposition) params.append("opponent", filters.opposition);
    if (filters.venue) params.append("venue", filters.venue);
    if (filters.phase) params.append("phase", filters.phase);
    if (filters.bowler_type) params.append("bowlerType", filters.bowler_type);
    if (filters.pressure_state) params.append("pressure", filters.pressure_state);
    if (filters.nationality) params.append("nationality", filters.nationality);
    if (filters.representation) params.append("representation", filters.representation);
    if (filters.innings) params.append("innings", filters.innings);
    if (filters.match_context && filters.match_context !== "All Matches") params.append("matchContext", filters.match_context);
    if (filters.batterHandedness && filters.batterHandedness !== "All Batters") params.append("battingHand", filters.batterHandedness);
    if (filters.batter !== "All Batters") params.set("batter", filters.batter);
    if (filters.bowler !== "All Bowlers") params.set("bowler", filters.bowler);
    for (const [key, value] of Object.entries(matchState)) params.set(key, String(value));
    const extra: [string, string, string][] = [
      ["seasonFrom", filters.seasonFrom, ""],
      ["seasonTo", filters.seasonTo, ""],
      ["dateFrom", filters.dateFrom, ""],
      ["dateTo", filters.dateTo, ""],
      ["battingPosition", filters.battingPosition, "all"],
      ["matchResult", filters.matchResult, "all"],
      ["bowlStyle", filters.bowlStyle, "all"],
      ["overRange", filters.overRange, "All"],
    ];
    for (const [k, v, unset] of extra) if (v && v !== unset) params.set(k, v);
    return params.toString();
  }, [filters, matchState]);

  const dynamicStatsQuery = useQuery({
    queryKey: ["mobile-stats-query", statsParams],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/stats/query?${statsParams}`, { signal });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/json")) {
        throw new Error("Dimensional telemetry query backend is unavailable");
      }
      const result = await res.json();
      if (!Array.isArray(result?.batters) || !Array.isArray(result?.bowlers)) {
        throw new Error("Invalid telemetry payload");
      }
      return result as { batters: any[]; bowlers: any[] };
    },
    enabled: !isDefaultCareerView && !fixtureViews,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    placeholderData: (prev: any) => prev,
  });

  const activeData = useMemo(() => {
    const dim = buildDimensionalPayload(filters);
    const data = dynamicStatsQuery.data;
    let batters: any[] = [];
    let bowlers: any[] = [];

    if (isDefaultCareerView && playerCareerStats.data?.batters?.length) {
      batters = playerCareerStats.data.batters;
      bowlers = playerCareerStats.data.bowlers;
    } else if (Array.isArray(data?.batters) && (data.batters.length > 0 || Array.isArray(data?.bowlers))) {
      batters = data.batters || [];
      bowlers = data.bowlers || [];
    } else if (cachedSeasonSlice) {
      const cleanS = String(dim.season).replace(/[^0-9]/g, "");
      const sBatters = playerSeasonStats.data?.batters ?? [];
      const sBowlers = playerSeasonStats.data?.bowlers ?? [];
      batters = sBatters.filter((b: any) => String(b.season) === String(dim.season) || String(b.season) === cleanS);
      bowlers = sBowlers.filter((b: any) => String(b.season) === String(dim.season) || String(b.season) === cleanS);
      if (dim.team && dim.team !== "All") {
        const selected = sliceList(filters.team);
        batters = batters.filter((b: any) => b.team && selected.some((t) => isMatchingTeam(b.team, t) || teamShort(b.team) === t));
        bowlers = bowlers.filter((b: any) => b.team && selected.some((t) => isMatchingTeam(b.team, t) || teamShort(b.team) === t));
      }
    }

    const normalizeName = (arr: any[]) =>
      arr.map((b: any) => ({
        ...b,
        player: b.player || b.player_name || b.name || "",
      }));
    batters = normalizeName(batters);
    bowlers = normalizeName(bowlers);

    const q = debouncedSearch.trim().toLowerCase();
    const playerMatch = (name: string, query: string) => {
      if (!query) return true;
      const n = (name || "").toLowerCase().trim();
      if (n.includes(query) || query.includes(n)) return true;
      const nParts = n.split(" ").filter(Boolean);
      const qParts = query.split(" ").filter(Boolean);
      if (nParts.length > 0 && qParts.length > 0) {
        if (qParts.length === 1 && nParts.some((p) => p === qParts[0])) return true;
        if (nParts[0][0] === qParts[0][0] && nParts[nParts.length - 1] === qParts[qParts.length - 1]) return true;
      }
      return false;
    };

    const passesSample = (row: { balls?: number; innings?: number; matches?: number }) =>
      (row.balls ?? 0) >= minSliceBalls &&
      (row.innings ?? 0) >= minInnings &&
      (row.matches ?? 0) >= minMatches;

    const filteredBatters = batters.filter((r) => passesSample(r) && playerMatch(r.player, q));
    const filteredBowlers = bowlers.filter((r) => passesSample(r) && playerMatch(r.player, q));

    const sortBatters = [...filteredBatters].sort((a: any, b: any) => {
      let c = 0;
      if (batterSortField === "player") c = a.player.localeCompare(b.player);
      else if (batterSortField === "matches") c = (b.matches || 0) - (a.matches || 0);
      else if (batterSortField === "innings") c = (b.innings || 0) - (a.innings || 0);
      else if (batterSortField === "highest") c = (b.highest || 0) - (a.highest || 0);
      else if (batterSortField === "balls") c = (b.balls || 0) - (a.balls || 0);
      else if (batterSortField === "avg") c = (b.avg || 0) - (a.avg || 0);
      else if (batterSortField === "sr") c = (b.sr || 0) - (a.sr || 0);
      else if (batterSortField === "boundaryPct") c = (b.boundaryPct || 0) - (a.boundaryPct || 0);
      else if (batterSortField === "fours") c = (b.fours || 0) - (a.fours || 0);
      else if (batterSortField === "sixes") c = (b.sixes || 0) - (a.sixes || 0);
      else if (batterSortField === "hundreds") c = (b.hundreds || 0) - (a.hundreds || 0);
      else if (batterSortField === "fifties") c = (b.fifties || 0) - (a.fifties || 0);
      else c = (b.runs || 0) - (a.runs || 0);
      return batterSortOrder === "desc" ? c : -c;
    });

    const sortBowlers = [...filteredBowlers].sort((a: any, b: any) => {
      let c = 0;
      if (bowlerSortField === "player") c = a.player.localeCompare(b.player);
      else if (bowlerSortField === "matches") c = (b.matches || 0) - (a.matches || 0);
      else if (bowlerSortField === "innings") c = (b.innings || 0) - (a.innings || 0);
      else if (bowlerSortField === "econ") c = (a.econ ?? 999) - (b.econ ?? 999);
      else if (bowlerSortField === "avg") c = (a.avg ?? 999) - (b.avg ?? 999);
      else if (bowlerSortField === "sr") c = (a.sr ?? 999) - (b.sr ?? 999);
      else if (bowlerSortField === "dotPct") c = (b.dotPct || 0) - (a.dotPct || 0);
      else if (bowlerSortField === "boundaryPct") c = (a.boundaryPct ?? Number.POSITIVE_INFINITY) - (b.boundaryPct ?? Number.POSITIVE_INFINITY);
      else if (bowlerSortField === "ballsPerBoundary") c = (a.ballsPerBoundary ?? Number.POSITIVE_INFINITY) - (b.ballsPerBoundary ?? Number.POSITIVE_INFINITY);
      else if (bowlerSortField === "trueEconomy") c = (a.trueEconomy ?? Number.POSITIVE_INFINITY) - (b.trueEconomy ?? Number.POSITIVE_INFINITY);
      else c = (b.wickets || 0) - (a.wickets || 0);
      return bowlerSortOrder === "desc" ? c : -c;
    });

    return { batters: sortBatters, bowlers: sortBowlers };
  }, [
    isDefaultCareerView,
    cachedSeasonSlice,
    dynamicStatsQuery.data,
    playerCareerStats.data,
    playerSeasonStats.data,
    filters,
    debouncedSearch,
    minSliceBalls,
    minInnings,
    minMatches,
    batterSortField,
    batterSortOrder,
    bowlerSortField,
    bowlerSortOrder,
  ]);

  const seasonList = useMemo(
    () => [...new Set((seasons.data ?? []).map((s: any) => String(s.season)).filter((y) => /^\d{4}$/.test(y)))].sort().reverse(),
    [seasons.data],
  );

  const teamOptions = useMemo(() => {
    const raw = teams.data ?? [];
    return [...new Set(raw.map((t: any) => teamShort(t.team)).filter(Boolean))].sort();
  }, [teams.data]);

  const venueOptions = useMemo(() => {
    const raw = venues.data ?? [];
    return [...new Set(raw.map((v: any) => normalizeVenueName(v.venue)).filter(Boolean))].sort();
  }, [venues.data]);

  const batterOptionNames = useMemo(
    () =>
      [...(playerCareerStats.data?.batters ?? [])]
        .filter((r: any) => r.player)
        .sort((a: any, b: any) => (b.balls ?? 0) - (a.balls ?? 0))
        .map((r: any) => String(r.player)),
    [playerCareerStats.data],
  );

  const bowlerOptionNames = useMemo(
    () =>
      [...(playerCareerStats.data?.bowlers ?? [])]
        .filter((r: any) => r.player)
        .sort((a: any, b: any) => (b.balls ?? 0) - (a.balls ?? 0))
        .map((r: any) => String(r.player)),
    [playerCareerStats.data],
  );

  // Category-aware supported FilterIds from config.ts (plus tactics -> head2head mapping)
  const supportedFilters = useMemo(() => {
    const key = activeTab === "tactics" ? "head2head" : activeTab === "batter-lens" ? "ask" : activeTab;
    return new Set<FilterId>(DESKTOP_FILTERS[key] ?? DESKTOP_FILTERS.batters);
  }, [activeTab]);

  const resetAllFilters = useCallback(() => {
    resetFilters();
    setMinSliceBalls(0);
    setMinInnings(0);
    setMinMatches(0);
    setMatchState({});
    setSearchQuery("");
  }, [resetFilters]);

  const getPlayerTeam = useCallback(
    (name: string, row?: any) => latestTeamResolver(name) || row?.team || "IPL",
    [latestTeamResolver],
  );

  const getBioFor = useCallback(
    (name: string) => {
      const bios = playerBios.data;
      if (!bios) return undefined;
      return bios[name] ?? bios[name.toLowerCase()];
    },
    [playerBios.data],
  );

  const formatName = useCallback(
    (name: string) => displayPlayerName(name, displayNames),
    [displayNames],
  );

  const handleBatterSort = useCallback(
    (field: BatterSortField) => {
      if (batterSortField === field) {
        setBatterSortOrder((o) => (o === "desc" ? "asc" : "desc"));
      } else {
        setBatterSortField(field);
        setBatterSortOrder("desc");
      }
    },
    [batterSortField],
  );

  const handleBowlerSort = useCallback(
    (field: BowlerSortField) => {
      if (bowlerSortField === field) {
        setBowlerSortOrder((o) => (o === "desc" ? "asc" : "desc"));
      } else {
        setBowlerSortField(field);
        setBowlerSortOrder("desc");
      }
    },
    [bowlerSortField],
  );

  const slicedApiUnavailable =
    !isDefaultCareerView &&
    !fixtureViews &&
    !cachedSeasonSlice &&
    dynamicStatsQuery.isError;

  const loadingLeaderboard = isDefaultCareerView
    ? playerCareerStats.isLoading
    : cachedSeasonSlice && !dynamicStatsQuery.data
      ? playerSeasonStats.isLoading
      : dynamicStatsQuery.isFetching && !dynamicStatsQuery.data;

  return {
    activeTab,
    setActiveTab,
    filters,
    setFilter,
    setFilters,
    clearFilter,
    resetAllFilters,
    filterChain,
    matchState,
    setMatchState,
    minSliceBalls,
    setMinSliceBalls,
    minInnings,
    setMinInnings,
    minMatches,
    setMinMatches,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    batterSortField,
    batterSortOrder,
    handleBatterSort,
    bowlerSortField,
    bowlerSortOrder,
    handleBowlerSort,
    supportedFilters,
    isDefaultCareerView,
    cachedSeasonSlice,
    deliveryScopeActive,
    isVenueFiltered,
    slicedApiUnavailable,
    loadingLeaderboard,
    activeData,
    matches,
    activeMatches,
    slicedMatchIds,
    teamCards,
    venueCards,
    seasonList,
    teamOptions,
    venueOptions,
    batterOptionNames,
    bowlerOptionNames,
    playerImages: playerImages.data ?? {},
    teamsData: teams.data ?? [],
    venuesData: venues.data ?? [],
    playerTeamsMap,
    getPlayerTeam,
    getBioFor,
    formatName,
    themeTeam,
    tacticalSubTab,
    tacticalDeliveryType,
    tacticalPlayer,
    refetchDynamic: () => void dynamicStatsQuery.refetch(),
  };
}

export type MobileStatsHook = ReturnType<typeof useMobileStats>;
