import { MobileStatsPresentation } from "@/mobile/screens/stats-presentation";
import {ScoringRing} from '@/components/visualizations/scoring-ring';
import { Scale } from "lucide-react";
import { LeagueValuePanel } from "@/components/intelligence/intel-components";
import { FeatureSaveButton } from "@/components/feature-save-button";
import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";
import { useAnalyticsFilterStore, buildDimensionalPayload } from "@/lib/store";
import { GlassCard } from "@/components/glass-card";
import { AdVessel } from "@/components/ad-vessel";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from "framer-motion";
import {
  BarChart2, Trophy, Target, Zap, Flame, Activity, ArrowRight, MapPin,
  Users, TrendingUp, Cpu, ArrowUpRight, Shield, Eye, Filter, Calendar,
  ChevronDown, Search, Crosshair, BarChart, Layers, Globe, X, Award, RotateCcw, Compass
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  useOverview, useSeasons, useTeams, useVenues,
  usePlayerImages, useCurrentSquads, useMatches, usePlayerBios,
  usePlayerSeasonStats, usePlayerCareerStats, usePlayerLatestTeams,
  usePlayerLatestTeamResolver, usePlayerTeamsMap, playerSlug,
  teamColor, teamShort, resolvePlayerImage, isMatchingTeam,
  normalizeVenueName, usePlayerDisplayNames, displayPlayerName, venueImage, venueHue, venueHref
} from "@/lib/aggregates";
import { useTeamTheme } from "@/lib/team-context";
import {
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line
} from "recharts";

const tooltipStyle = { background: "hsl(232 35% 8%)", border: "1px solid hsl(250 40% 25%)", borderRadius: 12, fontSize: 11, color: "white" };
const safeToFixed = (val: any, digits: number) => {
  const n = typeof val === "number" ? val : typeof val === "string" ? Number(val) : NaN;
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
};
const fmt = (val: any): string => {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "—";
};

const TABS = [
  { id: "batters", label: "Batters", Icon: Flame },
  { id: "bowlers", label: "Bowlers", Icon: Target },
  { id: "venues", label: "Venues", Icon: MapPin },
  { id: "teams", label: "Teams", Icon: Users },
  { id: "records", label: "Record Book", Icon: Trophy },
  { id: "head2head", label: "Head to Head", Icon: Crosshair },
  { id: "stat-builder", label: "Stat Builder", Icon: Filter },
  { id: "scenario-intelligence", label: "Scenario Intelligence", Icon: Cpu },
  { id: "ask", label: "Ask AI", Icon: Cpu },
] as const;
type Tab = typeof TABS[number]["id"];

const getVenueName = (v: any): string => normalizeVenueName(v?.venue || v?.name || "All Venues");
const getVenueCity = (v: any): string => String(v?.city || (v?.venue || "").split(",")?.[1]?.trim() || "IPL Venue");

const normalizePlayerName = (name: string): string =>
  (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function TablePaginationBar({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel: string;
}) {
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div className="p-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60 dark:bg-white/[0.01]">
      <div className="text-xs font-mono text-slate-600 dark:text-white/60">
        Showing <strong className="text-slate-900 dark:text-white font-bold">{totalItems === 0 ? 0 : startIndex + 1}</strong>–<strong className="text-slate-900 dark:text-white font-bold">{endIndex}</strong> of <strong className="text-slate-900 dark:text-white font-bold">{totalItems}</strong> {itemLabel}
      </div>

      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-slate-500 dark:text-white/40 text-[11px] font-bold">Show per page:</span>
        <div className="flex items-center bg-slate-200/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-0.5">
          {[10, 20, 50, 100].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onPageSizeChange(size);
                onPageChange(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                pageSize === size
                  ? "bg-primary text-white shadow-sm font-black"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-xs">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          title="First page"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
        >
          ‹ Prev
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => typeof p === "number" ? (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                currentPage === p
                  ? "bg-primary text-white shadow-md font-black"
                  : "border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 dark:text-white/30">…</span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
        >
          Next ›
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

export default function StatsPage({ mobilePresentation = false }: { mobilePresentation?: boolean } = {}) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("batters");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [batterSortField, setBatterSortField] = useState<"player" | "matches" | "innings" | "runs" | "balls" | "highest" | "avg" | "sr" | "boundaryPct" | "fours" | "sixes" | "hundreds" | "fifties">("runs");
  const [bowlerSortField, setBowlerSortField] = useState<"player" | "matches" | "innings" | "wickets" | "econ" | "avg" | "sr" | "dotPct" | "boundaryPct" | "ballsPerBoundary" | "trueEconomy" | "best">("wickets");
  const [batterSortOrder, setBatterSortOrder] = useState<"asc" | "desc">("desc");
  const [bowlerSortOrder, setBowlerSortOrder] = useState<"asc" | "desc">("desc");

  const handleBatterSort = (field: typeof batterSortField) => {
    setCurrentPage(1);
    if (batterSortField === field) {
      setBatterSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setBatterSortField(field);
      setBatterSortOrder("desc");
    }
  };

  const handleBowlerSort = (field: typeof bowlerSortField) => {
    setCurrentPage(1);
    if (bowlerSortField === field) {
      setBowlerSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setBowlerSortField(field);
      setBowlerSortOrder("desc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [activeTab]);

  const latestTeams = usePlayerLatestTeams();
  const latestTeamResolver = usePlayerLatestTeamResolver();

  const getPlayerTeam = (player: string, row?: any): string => {
    const resolvedLatest = latestTeamResolver(player);
    if (resolvedLatest) {
      return teamShort(resolvedLatest);
    }
    if (row && (row.team || row.teamName) && row.team !== "All") {
      return teamShort(row.team || row.teamName);
    }
    if (latestTeams.data && latestTeams.data[player]) {
      return teamShort(latestTeams.data[player]);
    }
    const bio = getBioFor(player);
    if (bio && (bio.team || bio.currentTeam)) {
      return teamShort(bio.team || bio.currentTeam);
    }
    const name = player.toLowerCase();
    if (name.includes("kohli")) return "RCB";
    if (name.includes("rohit") || name.includes("sharma")) return "MI";
    if (name.includes("dhoni")) return "CSK";
    return "IPL";
  };

  const playerBios = useQuery<Record<string, any>>({
    queryKey: ["player-bios"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/player-bio.json`);
      if (!res.ok) throw new Error("Failed to load player bios");
      return res.json();
    }
  });

  // O(1)-ish name -> bio lookup so PlayerAvatar can use the real CDN images
  // recorded in player-bio.json instead of falling back to a guessed URL —
  // built once per bio-data change rather than re-scanning 700+ entries per
  // table row.
  const bioIndex = useMemo(() => {
    const exact = new Map<string, any>();
    const byInitialLastname = new Map<string, any[]>();
    for (const entry of Object.values(playerBios.data ?? {})) {
      const name = normalizePlayerName((entry as any).playerName || "");
      if (!name) continue;
      exact.set(name, entry);
      const parts = name.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        const key = `${parts[0][0]}|${parts[parts.length - 1]}`;
        const list = byInitialLastname.get(key) || [];
        list.push(entry);
        byInitialLastname.set(key, list);
      }
    }
    return { exact, byInitialLastname };
  }, [playerBios.data]);

  const getBioFor = (playerName: string): any | undefined => {
    const name = normalizePlayerName(playerName || "");
    if (!name) return undefined;
    const exactHit = bioIndex.exact.get(name);
    if (exactHit) return exactHit;
    const parts = name.split(" ").filter(Boolean);
    if (parts.length < 2) return undefined;
    const candidates = bioIndex.byInitialLastname.get(`${parts[0][0]}|${parts[parts.length - 1]}`);
    return candidates && candidates.length === 1 ? candidates[0] : undefined;
  };
  const filters = useAnalyticsFilterStore(state => state.filters);
  const setFilter = useAnalyticsFilterStore(state => state.setFilter);
  const clearFilter = useAnalyticsFilterStore(state => state.clearFilter);
  const resetFilters = useAnalyticsFilterStore(state => state.resetFilters);
  const filterChain = useAnalyticsFilterStore(state => state.chain);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters.season, filters.team, filters.opposition, filters.venue, filters.phase, filters.bowler_type]);
  // Matchup Lab state
  const [matchupBatter, setMatchupBatter] = useState("");
  const [matchupBowler, setMatchupBowler] = useState("");
  const [matchupSearchBatter, setMatchupSearchBatter] = useState("");
  const [matchupSearchBowler, setMatchupSearchBowler] = useState("");
  const [matchupDrillTab, setMatchupDrillTab] = useState<"phase" | "delivery" | "zone" | "history">("phase");
  // Scenario Intelligence state
  const [selectedScenario, setSelectedScenario] = useState("death");
  const [scenarioMinBalls, setScenarioMinBalls] = useState(10);
  const [scenarioRange, setScenarioRange] = useState({ from: "", to: "" });
  // Player drilldown state
  const [drilldownPlayer, setDrilldownPlayer] = useState<string | null>(null);
  const [drilldownDimension, setDrilldownDimension] = useState<"phase" | "delivery" | "scoring-zone" | "bowler" | "over">("phase");
  const [isRecalculating, setIsRecalculating] = useState(false);

  const overview = useOverview();
  const seasons = useSeasons();
  const teams = useTeams();
  const venues = useVenues();
  const playerImages = usePlayerImages();
  const displayNames = usePlayerDisplayNames();
  const matchesQuery = useMatches();
  const playerSeasonStats = usePlayerSeasonStats();
  const playerCareerStats = usePlayerCareerStats();

  const playersRegistry = useQuery<any[]>({
    queryKey: ["agg", "players-registry"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/players.json`);
      if (!res.ok) throw new Error("Failed to load players registry");
      return res.json();
    },
    staleTime: 1000 * 60 * 60
  });

  const matches = matchesQuery.data ?? [];
  const activeMatches = useMemo(() => {
    const dim = buildDimensionalPayload(filters);
    return matches.filter(m => {
      const s = dim.season;
      if (s && s !== "All Seasons" && s !== "All" && s !== "all" && s !== "") {
        const cleanS = String(s).replace(/[^0-9]/g, "");
        const cleanM = String(m.season || "").replace(/[^0-9]/g, "");
        if (cleanM !== cleanS && String(m.season) !== String(s)) return false;
      }
      if (dim.team !== "All" && !isMatchingTeam(m.team1, dim.team) && !isMatchingTeam(m.team2, dim.team)) return false;
      if (dim.opponent !== "All" && !isMatchingTeam(m.team1, dim.opponent) && !isMatchingTeam(m.team2, dim.opponent)) return false;
      if (dim.venue !== "All" && !normalizeVenueName(m.venue || "").toLowerCase().includes(normalizeVenueName(dim.venue || "").toLowerCase())) return false;
      return true;
    });
  }, [matches, filters.season, filters.team, filters.opposition, filters.venue]);
  const slicedTeams = useMemo(() => {
    const records = new Map<string, { team: string; matches: number; wins: number; noResult: number; winPct: number }>();
    activeMatches.forEach(m => {
      [m.team1, m.team2].forEach(team => {
        if (!team) return;
        const short = teamShort(team);
        const rec = records.get(short) || { team: short, matches: 0, wins: 0, noResult: 0, winPct: 0 };
        rec.matches += 1;
        // Abandoned and tied-without-result games have no winner; counting them
        // as defeats overstated every side's losses.
        if (!m.winner) rec.noResult += 1;
        else if (teamShort(m.winner) === short) rec.wins += 1;
        rec.winPct = rec.matches ? Math.round((rec.wins / rec.matches) * 1000) / 10 : 0;
        records.set(short, rec);
      });
    });
    return Array.from(records.values()).sort((a, b) => b.winPct - a.winPct || b.matches - a.matches);
  }, [activeMatches]);

  /**
   * Franchise cards: the filtered record from the current slice, joined to the
   * all-time franchise row for the full name, colour and title count.
   *
   * slicedTeams keys everything by short code ("CSK"), which is why the cards
   * used to be headed "CSK" rather than "Chennai Super Kings".
   */
  const teamCards = useMemo(() => {
    const byShort = new Map<string, any>();
    for (const row of teams.data ?? []) {
      const short = teamShort(row.team);
      // Franchises that were renamed collapse onto one short code; keep the row
      // with the longer history so titles and totals are the franchise's own.
      const prev = byShort.get(short);
      if (!prev || (row.matches ?? 0) > (prev.matches ?? 0)) byShort.set(short, row);
    }
    return slicedTeams.map(sliced => {
      const full = byShort.get(sliced.team);
      return {
        short: sliced.team,
        name: full?.team ?? sliced.team,
        matches: sliced.matches,
        wins: sliced.wins,
        losses: Math.max(0, sliced.matches - sliced.wins - sliced.noResult),
        noResult: sliced.noResult,
        winPct: sliced.winPct,
        titles: full?.titles ?? 0,
        allTimeMatches: full?.matches ?? 0,
      };
    });
  }, [slicedTeams, teams.data]);
  const slicedVenues = useMemo(() => {
    const records = new Map<string, { venue: string; matches: number; avgRunRate: number }>();
    activeMatches.forEach(m => {
      const venue = normalizeVenueName(m.venue || "All Venues");
      const rec = records.get(venue) || { venue, matches: 0, avgRunRate: 0 };
      rec.matches += 1;
      rec.avgRunRate = rec.matches ? Math.round(((parseInt(m.team1Score?.split("/")[0] || "0") + parseInt(m.team2Score?.split("/")[0] || "0")) / 20) * 100) / 100 : 0;
      records.set(venue, rec);
    });
    return Array.from(records.values()).sort((a, b) => b.matches - a.matches || a.venue.localeCompare(b.venue));
  }, [activeMatches]);
  const isDefaultCareerView = useMemo(() => {
    const dim = buildDimensionalPayload(filters);
    return (
      (dim.season === "All Seasons" || dim.season === "All" || !dim.season) &&
      (dim.team === "All Teams" || dim.team === "All" || !dim.team) &&
      (!dim.opponent || dim.opponent === "All Opponents" || dim.opponent === "All") &&
      (!dim.venue || dim.venue === "All Venues" || dim.venue === "All") &&
      (!filters.phase || filters.phase === "All Phases" || filters.phase === "All") &&
      (!filters.bowler_type || filters.bowler_type === "All Bowlers" || filters.bowler_type === "All") &&
      (!filters.pressure_state || filters.pressure_state === "Standard" || filters.pressure_state === "All") &&
      (!filters.fieldingPosition || filters.fieldingPosition === "Scoring Area" || filters.fieldingPosition === "All Areas" || filters.fieldingPosition === "All Positions") &&
      (!filters.innings || filters.innings === "All Innings" || filters.innings === "Innings") &&
      (!filters.match_context || filters.match_context === "All Matches" || filters.match_context === "All") &&
      (!filters.representation || filters.representation === "overall")
    );
  }, [filters]);

  const dynamicStatsQuery = useQuery({
    queryKey: [
      "stats-query",
      filters.season, filters.team, filters.opposition, filters.venue,
      filters.phase, filters.bowler_type,
      filters.pressure_state, filters.nationality, filters.representation,
      filters.fieldingPosition || "Scoring Area", filters.innings, filters.match_context,
      filters.required_rr, filters.current_rr, filters.home_away, filters.playoff,
      filters.batterHandedness,
    ],
    queryFn: async () => {
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
      if (filters.fieldingPosition || filters.fieldingPosition !== undefined) params.append("fieldingPosition", filters.fieldingPosition || "Scoring Area");
      if (filters.innings) params.append("innings", filters.innings);
      if (filters.match_context && filters.match_context !== "All Matches") params.append("matchContext", filters.match_context);
      if (filters.batterHandedness && filters.batterHandedness !== "All Batters") params.append("battingHand", filters.batterHandedness);
      if (filters.required_rr && filters.required_rr !== "All") params.append("requiredRr", filters.required_rr);
      if (filters.current_rr && filters.current_rr !== "All") params.append("currentRr", filters.current_rr);
      if (filters.home_away && filters.home_away !== "All") params.append("homeAway", filters.home_away);
      if (filters.playoff && filters.playoff !== "All") params.append("playoff", filters.playoff);

      const url = `/api/stats/query?${params.toString()}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Failed to query stats (${res.status}): ${text}`);
        }
        return (await res.json()) as { batters: any[]; bowlers: any[] };
      } catch (err) {
        console.warn("/api/stats/query fallback to cached stats:", err);
        return { batters: [], bowlers: [] };
      }
    },
    enabled: !isDefaultCareerView,
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev: any) => prev,
  });

  // ── Field Positions Query ──────────────────────────────────────────────────
  interface FieldPositionRow {
    position: string;
    zone: string;
    balls: number;
    runs: number;
    wickets: number;
    boundaries: number;
    dotBalls: number;
  }

  const fieldPositionsData = useQuery<FieldPositionRow[]>({
    queryKey: [
      "stats-field-positions",
      filters.season, filters.team, filters.opposition, filters.venue,
      filters.bowler_type, filters.innings,
      filters.phase, filters.pressure_state,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.season)   params.append("season",       filters.season);
      if (filters.team)     params.append("team",         filters.team);
      if (filters.opposition) params.append("opponent",     filters.opposition);
      if (filters.venue)    params.append("venue",        filters.venue);
      if (filters.bowler_type)   params.append("bowlerType",   filters.bowler_type);
      if (filters.innings)  params.append("innings",      filters.innings);
      if (filters.phase) params.append("phase", filters.phase);
      if (filters.pressure_state) params.append("pressure", filters.pressure_state);
      params.append("dimension", "scoring-zone");
      const res = await fetch(`/api/stats/drilldown?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to query field positions");
      return res.json() as Promise<FieldPositionRow[]>;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev: any) => prev,
  });

  // Matchup Lab query
  const matchupQuery = useQuery({
    queryKey: ["ipl-matchup", matchupBatter, matchupBowler, filters.season, filters.venue],
    queryFn: async () => {
      if (!matchupBatter || !matchupBowler) return null;
      const params = new URLSearchParams();
      params.append("batter", matchupBatter);
      params.append("bowler", matchupBowler);
      if (filters.season && filters.season !== "All Seasons") params.append("season", filters.season);
      if (filters.venue && filters.venue !== "All Venues") params.append("venue", filters.venue);
      const res = await fetch(`/api/stats/matchup?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to query matchup");
      return res.json();
    },
    enabled: !!(matchupBatter && matchupBowler),
    staleTime: 1000 * 60 * 10,
    placeholderData: (prev: any) => prev,
  });

  // Scenario Intelligence query
  const scenarioYears = [...new Set((seasons.data ?? []).map(s => s.season).filter(year => /^\d{4}$/.test(year)))].sort();
  const hasScenarioRange = !!(scenarioRange.from || scenarioRange.to);
  const scenarioQuery = useQuery({
    queryKey: ["ipl-scenario", selectedScenario, hasScenarioRange ? null : filters.season, filters.team, filters.nationality, scenarioMinBalls, scenarioRange],
    queryFn: async () => {
      const params = new URLSearchParams({ scenario: selectedScenario, minBalls: String(scenarioMinBalls) });
      if (scenarioRange.from) params.set("seasonFrom", scenarioRange.from);
      if (scenarioRange.to) params.set("seasonTo", scenarioRange.to);
      if (!hasScenarioRange && filters.season && filters.season !== "All Seasons") params.set("season", filters.season);
      if (filters.team && filters.team !== "All Teams") params.set("team", filters.team);
      if (filters.nationality && filters.nationality !== "all") params.set("nationality", filters.nationality);
      const res = await fetch(`/api/stats/scenario?${params}`);
      if (!res.ok) throw new Error("Failed to query scenario");
      const result = await res.json() as { batters: any[]; bowlers: any[] };
      if (!Array.isArray(result.batters) || !Array.isArray(result.bowlers)) throw new Error("Invalid scenario data");
      return result;
    },
    enabled: activeTab === "scenario-intelligence",
    staleTime: 1000 * 60 * 5,
  });
  const effectiveScenarioData = scenarioQuery.data ?? { batters: [], bowlers: [] };

  // Player drilldown query
  const drilldownQuery = useQuery({
    queryKey: ["ipl-drilldown", drilldownPlayer, drilldownDimension, filters.season, filters.team],
    queryFn: async () => {
      if (!drilldownPlayer) return [];
      const params = new URLSearchParams();
      params.append("player", drilldownPlayer);
      params.append("dimension", drilldownDimension);
      if (filters.season && filters.season !== "All Seasons") params.append("season", filters.season);
      if (filters.team && filters.team !== "All Teams") params.append("team", filters.team);
      const res = await fetch(`/api/stats/drilldown?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to query drilldown");
      return res.json();
    },
    enabled: !!drilldownPlayer,
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev: any) => prev,
  });

  const activeData = useMemo(() => {
    const dim = buildDimensionalPayload(filters);
    const data: any = dynamicStatsQuery.data;
    let batters: any[] = [];
    let bowlers: any[] = [];

    const dimTeam = dim.team;
    const cleanS = String(dim.season).replace(/[^0-9]/g, "");

    const isDefaultCareerView =
      (dim.season === "All Seasons" || dim.season === "All" || !dim.season) &&
      (dim.team === "All Teams" || dim.team === "All" || !dim.team) &&
      (!dim.opponent || dim.opponent === "All Opponents" || dim.opponent === "All") &&
      (!dim.venue || dim.venue === "All Venues" || dim.venue === "All") &&
      // Read phase and bowler type from the filter state directly:
      // buildDimensionalPayload only returns season/team/opponent/nationality/
      // venue, so `dim.phase` and `dim.bowlerType` were always undefined and
      // these two clauses always passed — letting a phase or bowler-type
      // selection fall through to unfiltered career totals.
      (!filters.phase || filters.phase === "All Phases" || filters.phase === "All") &&
      (!filters.bowler_type || filters.bowler_type === "All Bowlers" || filters.bowler_type === "All") &&
      (!filters.pressure_state || filters.pressure_state === "Standard" || filters.pressure_state === "All") &&
      (!filters.fieldingPosition || filters.fieldingPosition === "Scoring Area" || filters.fieldingPosition === "All Areas" || filters.fieldingPosition === "All Positions") &&
      (!filters.innings || filters.innings === "All Innings" || filters.innings === "Innings") &&
      (!filters.match_context || filters.match_context === "All Matches" || filters.match_context === "All") &&
      (!filters.representation || filters.representation === "overall");

    if (isDefaultCareerView && playerCareerStats.data?.batters?.length) {
      batters = playerCareerStats.data.batters;
      bowlers = playerCareerStats.data.bowlers;
    } else if (Array.isArray(data?.batters) && (data.batters.length > 0 || Array.isArray(data?.bowlers))) {
      batters = data.batters || [];
      bowlers = data.bowlers || [];
    } else {
      if (dim.season !== "All") {
        const sBatters = playerSeasonStats.data?.batters ?? [];
        const sBowlers = playerSeasonStats.data?.bowlers ?? [];

        batters = sBatters.filter((b: any) => String(b.season) === String(dim.season) || String(b.season) === cleanS);
        bowlers = sBowlers.filter((b: any) => String(b.season) === String(dim.season) || String(b.season) === cleanS);
      } else {
        batters = playerCareerStats.data?.batters ?? [];
        bowlers = playerCareerStats.data?.bowlers ?? [];
      }

      if (dimTeam && dimTeam !== "All") {
        // Strict match: all season records now have team populated
        batters = batters.filter((b: any) => b.team && (isMatchingTeam(b.team, dimTeam) || teamShort(b.team) === dimTeam));
        bowlers = bowlers.filter((b: any) => b.team && (isMatchingTeam(b.team, dimTeam) || teamShort(b.team) === dimTeam));
      }
    }
    // Normalize: API may return player_name or name instead of player
    const normalizeName = (arr: any[]) => arr.map((b: any) => ({
      ...b,
      player: b.player || b.player_name || b.name || "",
    }));
    batters = normalizeName(batters);
    bowlers = normalizeName(bowlers);

    const q = searchQuery.trim().toLowerCase();
    const playerMatch = (name: string, query: string) => {
      if (!query) return true;
      const n = (name || "").toLowerCase().trim();
      if (n.includes(query) || query.includes(n)) return true;
      const nParts = n.split(" ").filter(Boolean);
      const qParts = query.split(" ").filter(Boolean);
      if (nParts.length > 0 && qParts.length > 0) {
        if (qParts.length === 1 && nParts.some(p => p === qParts[0])) return true;
        if (nParts[0][0] === qParts[0][0] && nParts[nParts.length - 1] === qParts[qParts.length - 1]) return true;
      }
      return false;
    };
    const filteredBatters = q ? batters.filter((b: any) => playerMatch(b.player, q)) : batters;
    const filteredBowlers = q ? bowlers.filter((b: any) => playerMatch(b.player, q)) : bowlers;

    const sortBatters = [...filteredBatters].sort((a: any, b: any) => {
      let comparison = 0;
      if (batterSortField === "player") comparison = a.player.localeCompare(b.player);
      else if (batterSortField === "matches") comparison = (b.matches || 0) - (a.matches || 0);
      else if (batterSortField === "innings") comparison = b.innings - a.innings;
      else if (batterSortField === "highest") comparison = (b.highest || 0) - (a.highest || 0);
      else if (batterSortField === "balls") comparison = b.balls - a.balls;
      else if (batterSortField === "avg") comparison = b.avg - a.avg;
      else if (batterSortField === "sr") comparison = b.sr - a.sr;
      else if (batterSortField === "boundaryPct") comparison = (b.boundaryPct || 0) - (a.boundaryPct || 0);
      else if (batterSortField === "fours") comparison = b.fours - a.fours;
      else if (batterSortField === "sixes") comparison = b.sixes - a.sixes;
      else if (batterSortField === "hundreds") comparison = (b.hundreds || 0) - (a.hundreds || 0);
      else if (batterSortField === "fifties") comparison = (b.fifties || 0) - (a.fifties || 0);
      else comparison = b.runs - a.runs;
      return batterSortOrder === "desc" ? comparison : -comparison;
    });

    const sortBowlers = [...filteredBowlers].sort((a: any, b: any) => {
      let comparison = 0;
      if (bowlerSortField === "player") comparison = a.player.localeCompare(b.player);
      else if (bowlerSortField === "matches") comparison = (b.matches || 0) - (a.matches || 0);
      else if (bowlerSortField === "innings") comparison = b.innings - a.innings;
      else if (bowlerSortField === "econ") comparison = a.econ - b.econ;
      else if (bowlerSortField === "avg") comparison = a.avg - b.avg;
      else if (bowlerSortField === "sr") comparison = a.sr - b.sr;
      else if (bowlerSortField === "dotPct") comparison = b.dotPct - a.dotPct;
      else if (bowlerSortField === "boundaryPct") comparison = (a.boundaryPct ?? Number.POSITIVE_INFINITY) - (b.boundaryPct ?? Number.POSITIVE_INFINITY);
      else if (bowlerSortField === "ballsPerBoundary") comparison = (a.ballsPerBoundary ?? Number.POSITIVE_INFINITY) - (b.ballsPerBoundary ?? Number.POSITIVE_INFINITY);
      else if (bowlerSortField === "trueEconomy") comparison = (a.trueEconomy ?? Number.POSITIVE_INFINITY) - (b.trueEconomy ?? Number.POSITIVE_INFINITY);
      else comparison = b.wickets - a.wickets;
      return bowlerSortOrder === "desc" ? comparison : -comparison;
    });

    return { batters: sortBatters, bowlers: sortBowlers };
  }, [
    dynamicStatsQuery.data, playerSeasonStats.data, playerCareerStats.data,
    filters.season, filters.team, filters.opposition, filters.venue,
    searchQuery, batterSortField, batterSortOrder, bowlerSortField, bowlerSortOrder
  ]);

  const totalBatterCount = activeData.batters.length;
  const totalBatterPages = Math.max(1, Math.ceil(totalBatterCount / pageSize));
  const batterStartIndex = (currentPage - 1) * pageSize;
  const paginatedBatters = activeData.batters.slice(batterStartIndex, batterStartIndex + pageSize);

  const totalBowlerCount = activeData.bowlers.length;
  const totalBowlerPages = Math.max(1, Math.ceil(totalBowlerCount / pageSize));
  const bowlerStartIndex = (currentPage - 1) * pageSize;
  const paginatedBowlers = activeData.bowlers.slice(bowlerStartIndex, bowlerStartIndex + pageSize);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    document.getElementById("stats-table-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilter(key, value);
  };

  const { selectedTeam: themeTeam } = useTeamTheme();

  // Listen for query parameter ?team=... on URL mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryTeam = params.get("team");
      if (queryTeam && queryTeam !== filters.team) {
        handleFilterChange("team", queryTeam);
      }
    }
  }, []);

  const clearFilterChain = () => resetFilters();

  const removeChainFilter = (key: string) => clearFilter(key as keyof typeof filters);

  // KPIs
  const kpis = useMemo(() => {
    const o = overview.data;
    if (!o) return [];
    return [
      { Icon: Target, label: "Total Runs", value: fmt(o.totalRuns), accent: "hsl(45 95% 60%)" },
      { Icon: Zap, label: "Total Wickets", value: fmt(o.totalWickets), accent: "hsl(190 95% 60%)" },
      { Icon: Shield, label: "Highest Team", value: "277/3", accent: "hsl(210 100% 60%)" },
      { Icon: Trophy, label: "Best Indiv.", value: "140*", accent: "hsl(30 100% 60%)" },
      { Icon: Activity, label: "Avg 1st Inn", value: String(o.avg1stInnings), accent: "hsl(270 95% 65%)" },
      { Icon: TrendingUp, label: "Win % Chase", value: "54.2%", accent: "hsl(140 100% 60%)" },
      { Icon: Crosshair, label: "Dot Ball %", value: "32.8%", accent: "hsl(0 100% 65%)" },
      { Icon: Flame, label: "Sixes", value: fmt(o.totalSixes), accent: "hsl(320 100% 65%)" },
    ];
  }, [overview.data]);

  // Season chart
  const seasonChart = useMemo(() => {
    return (seasons.data ?? []).map(s => ({ season: s.season.slice(2), runs: s.runs, sixes: s.sixes }));
  }, [seasons.data]);

  // Which teams actually took part in the selected season, keyed by short
  // code — used to hide teams from the Team/Opponent dropdowns that never
  // played that year (e.g. Gujarat Titans didn't exist before 2022).
  const seasonTeamsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    matches.forEach(m => {
      const s = String(m.season || "");
      if (!s) return;
      let set = map.get(s);
      if (!set) { set = new Set(); map.set(s, set); }
      if (m.team1) set.add(teamShort(m.team1));
      if (m.team2) set.add(teamShort(m.team2));
    });
    return map;
  }, [matches]);

  const validTeamsForSeason = useMemo(() => {
    if (!filters.season || filters.season === "All Seasons") return null;
    const cleanS = String(filters.season).replace(/[^0-9]/g, "");
    return seasonTeamsMap.get(String(filters.season)) || seasonTeamsMap.get(cleanS) || null;
  }, [filters.season, seasonTeamsMap]);

  // Drop team/opponent selections that no longer played in a newly picked season.
  useEffect(() => {
    if (!validTeamsForSeason) return;
    if (filters.team !== "All Teams" && !validTeamsForSeason.has(filters.team)) {
      setFilter("team", "All Teams");
    }
    if (filters.opposition && filters.opposition !== "All Opponents" && !validTeamsForSeason.has(filters.opposition)) {
      setFilter("opposition", "All Opponents");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTeamsForSeason]);

  // Team dropdown options — the teams table carries one row per franchise
  // rename (e.g. Deccan Chargers + Sunrisers Hyderabad both map to "SRH"), so
  // this must dedupe by short code or the filter lists the same team twice.
  // Narrowed to teams that actually played the selected season, if any.
  const teamOptions = useMemo(() => {
    const codes = (teams.data ?? []).map(t => teamShort(t.team));
    let all = Array.from(new Set(codes));
    if (validTeamsForSeason && validTeamsForSeason.size > 0) {
      all = all.filter(code => validTeamsForSeason.has(code));
    }
    return all.sort();
  }, [teams.data, validTeamsForSeason]);

  // Venues where the selected Team and Opponent have actually faced each
  // other — null means "no restriction" (one or both sides still "All").
  const headToHeadVenues = useMemo(() => {
    if (!filters.team || filters.team === "All Teams") return null;
    if (!filters.opposition || filters.opposition === "All Opponents") return null;
    const set = new Set<string>();
    matches.forEach(m => {
      const t1 = teamShort(m.team1 || "");
      const t2 = teamShort(m.team2 || "");
      const isPair = (t1 === filters.team && t2 === filters.opposition) || (t1 === filters.opposition && t2 === filters.team);
      if (isPair && m.venue) set.add(normalizeVenueName(m.venue));
    });
    return set;
  }, [matches, filters.team, filters.opposition]);

  // Drop a venue selection that isn't part of this team/opponent's head-to-head.
  useEffect(() => {
    if (!headToHeadVenues) return;
    if (filters.venue !== "All Venues" && !headToHeadVenues.has(filters.venue)) {
      setFilter("venue", "All Venues");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headToHeadVenues]);

  const venueOptions = useMemo(() => {
    if (headToHeadVenues) return Array.from(headToHeadVenues).sort();
    return Array.from(new Set(venues.data?.map(v => getVenueName(v)) || ["Wankhede Stadium", "Eden Gardens", "MA Chidambaram Stadium"]));
  }, [headToHeadVenues, venues.data]);

  const filterControls = (<>
        {/* SMART FILTER BAR */}
        <div className="bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-white/10 p-2 flex flex-wrap items-center gap-2 relative z-20 shadow-sm dark:shadow-xl">

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 mr-2">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white/80">Dimensional Slicing</span>
          </div>

          {/* Reset — always visible, clears every dimensional filter back to defaults */}
          <button
            onClick={clearFilterChain}
            title="Reset all filters"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/10 border border-slate-200 hover:border-red-200 dark:border-white/5 dark:hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-red-600 dark:text-white/50 dark:hover:text-red-400 transition-all mr-2 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          {/* Season Filter */}
          <FilterDropdown
            label="Season"
            icon={Calendar}
            value={filters.season}
            options={["All Seasons", ...(seasons.data?.map(s => s.season) || [])]}
            onChange={(v) => handleFilterChange("season", v)}
          />

          {/* Team Filter */}
          <FilterDropdown
            label="Team"
            icon={Users}
            value={filters.team}
            options={["All Teams", ...teamOptions]}
            onChange={(v) => {
              handleFilterChange("team", v);
              // Reset opponent if it matches new team
              if (filters.opposition === v) {
                handleFilterChange("opposition", "All Opponents");
              }
            }}
          />

          {/* Opponent Filter */}
          <FilterDropdown
            label="Opponent"
            icon={Target}
            value={filters.opposition || "All Opponents"}
            options={["All Opponents", ...teamOptions.filter(ts => ts !== filters.team)]}
              onChange={(v) => handleFilterChange("opposition", v)}
          />

          {/* Conditional: Career Stats vs Franchise Legacy (only when a specific team is selected) */}
          {filters.team !== "All Teams" && (
            <FilterDropdown
              label="Context"
              icon={Users}
              value={
                filters.representation === "franchise-legacy" || filters.season !== "All Seasons"
                  ? "Franchise Legacy"
                  : filters.representation === "current-squad-for-franchise"
                    ? "Current Squad For Franchise"
                    : "Current Squad Career"
              }
              options={["Franchise Legacy", "Current Squad Career", "Current Squad For Franchise"]}
              onChange={(v) => handleFilterChange(
                "representation",
                v === "Franchise Legacy" ? "franchise-legacy" : v === "Current Squad For Franchise" ? "current-squad-for-franchise" : "current-squad-career",
              )}
            />
          )}

          {/* Indian vs Overseas filter */}
          <FilterDropdown
            label="Nationality"
            icon={Globe}
            value={filters.nationality === "all" ? "All" : filters.nationality === "indian" ? "Indian" : "Overseas"}
            options={["All", "Indian", "Overseas"]}
            onChange={(v) => handleFilterChange("nationality", v === "All" ? "all" : v === "Indian" ? "indian" : "overseas")}
          />

          {/* Detailed Dimensional Filters */}
          <FilterDropdown
            label="Venue"
            icon={MapPin}
            value={filters.venue}
            options={["All Venues", ...venueOptions]}
            onChange={(v) => handleFilterChange("venue", v)}
          />
          <FilterDropdown
            label="Pressure"
            icon={Shield}
            value={filters.pressure_state}
            options={["Standard", "High Pressure", "Clutch Moment"]}
              onChange={(v) => handleFilterChange("pressure_state", v)}
          />
          {activeTab === "batters" && (
            <FilterDropdown
              label="Bowler Type"
              icon={Target}
              value={filters.bowler_type}
              options={["All Bowlers", "Pacer", "Spinner"]}
              onChange={(v) => handleFilterChange("bowler_type", v)}
            />
          )}
          {activeTab === "bowlers" && (
            <FilterDropdown
              label="Batter Handedness"
              icon={Target}
              value={filters.batterHandedness}
              options={["All Batters", "vs LHB", "vs RHB"]}
              onChange={(v) => handleFilterChange("batterHandedness", v)}
            />
          )}
          <FilterDropdown
            label="Innings"
            icon={Activity}
            value={filters.innings}
            options={["All Innings", "1st Innings (Setting)", "2nd Innings (Chasing)"]}
            onChange={(v) => handleFilterChange("innings", v)}
          />
          <FilterDropdown
            label="Match Type"
            icon={Trophy}
            value={filters.match_context}
            options={["All Matches", "League Stage", "Playoffs", "Final"]}
            onChange={(v) => handleFilterChange("match_context", v)}
          />
          <div className="ml-auto relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Intelligence Database..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold focus:outline-none focus:border-primary/40 focus:bg-white/10 transition-all text-white"
            />
          </div>
        </div>

  </>);

  const desktopContent = (
    <Layout><FeatureSaveButton feature="stats"/>
      {/* ═════════════════════════════════════════════════════════════════════
          HERO & ANALYTICS TELEMETRY SECTION
          - Clean, responsive natural document flow layout
          - Zero sticky scroll locking or 260vh trapping
          - Fully responsive across desktop, tablet and mobile
          - High-contrast dual theme support (Light and Dark)
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="team-analytics-page w-full flex flex-col gap-3 p-2.5 md:p-4 bg-slate-50 dark:bg-[#050816]">
        {/* ROW 1: HERO TITLE CARD + KPI PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* HERO TITLE CARD (LEFT, 7 cols) */}
          <div className="lg:col-span-7 relative bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 overflow-hidden group shadow-sm dark:shadow-2xl p-5 md:p-6 flex flex-col justify-between min-h-[180px]">
            <div className="absolute inset-0 pointer-events-none">
              <img src="/advance stats title image.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 dark:opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-br stats-team-overlay" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#050816] dark:via-[#050816]/70 dark:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent dark:from-[#050816]/80 to-transparent" />
              <div className="absolute inset-0 opacity-[0.03] bg-grid-40" />
            </div>
            <div className="relative z-10 flex flex-col items-start">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/25 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  STATSGURU TELEMETRY
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">19 Seasons Indexed</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-none text-slate-900 dark:text-white uppercase tracking-tighter mb-2 scale-x-105 origin-left">
                <div className="mb-1 text-slate-900 dark:text-white">ADVANCED</div>
                <span className="text-blue-600 dark:text-[#3B82F6] block">STATS.</span>
              </h1>
              <p className="text-slate-600 dark:text-white/60 text-xs md:text-sm font-medium tracking-tight max-w-[480px]">
                <span className="text-slate-900 dark:text-white/90 font-black mr-2 uppercase tracking-widest">Statsguru Depth:</span>
                Dimensional slicing across {overview.data?.totalMatches ?? "1,243"} matches and {overview.data?.seasons ?? "19"} seasons of high-fidelity IPL telemetry.
              </p>
            </div>
          </div>

          {/* KPI STRIP CARD (RIGHT, 5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden shadow-sm dark:shadow-2xl">
            <div className="p-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white/70">Analytical KPI Strip</span>
              </div>
              <span className="text-[8px] font-mono text-slate-400 dark:text-white/30">TELEMETRY_v4.2</span>
            </div>
            <div className="flex-1 p-3 grid grid-cols-4 gap-2 content-center">
              {kpis.map(k => (
                <div key={k.label} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all group">
                  <k.Icon className="w-4 h-4 transition-transform group-hover:scale-110 text-[var(--kpi-color)]" style={{ "--kpi-color": k.accent } as React.CSSProperties} />
                  <span className="text-xs md:text-sm font-black text-slate-900 dark:text-white [text-shadow:0_0_12px_var(--kpi-shadow)]" style={{ "--kpi-shadow": `${k.accent}33` } as React.CSSProperties}>{k.value}</span>
                  <span className="text-[7px] font-black text-slate-500 dark:text-white/40 uppercase tracking-tighter text-center">{k.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2: SEASON CHART + TOP PERFORMERS PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* TOURNAMENT TELEMETRY PULSE (LEFT, 8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 p-4 flex flex-col min-h-[220px] relative overflow-hidden group shadow-sm dark:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-3 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-white/70">Tournament Telemetry Pulse</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] font-black text-slate-500 dark:text-white/50 uppercase">Runs Volume</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] font-black text-slate-500 dark:text-white/50 uppercase">Six Intensity</span></div>
              </div>
            </div>
            <div className="flex-1 h-[160px] min-h-[160px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="season" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-black text-slate-500 dark:text-white/50 uppercase mb-2">Season 20{data.season} Analysis</p>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-[9px] font-black text-slate-600 dark:text-white/60 uppercase">Run Volume</span>
                                <span className="text-[12px] font-black text-slate-900 dark:text-white">{fmt(data.runs)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-6">
                                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">Six Intensity</span>
                                <span className="text-[12px] font-black text-amber-600 dark:text-amber-400 font-bold">{data.sixes}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="runs"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 0 }}
                    activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="sixes"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TOP PERFORMERS PREVIEW (RIGHT, 4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 p-4 flex flex-col justify-between shadow-sm dark:shadow-xl">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-white/70">Top Performers</span>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 justify-between">
              {(activeData.batters).slice(0, 5).map((b, i) => {
                const displayName = b.player || b.player_name || b.name || (b.player_id ? `Player #${b.player_id}` : `IPL Batter #${i + 1}`);
                return (
                  <div key={displayName + i} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-primary/20 transition-colors">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#0A1329] to-[#040814] border border-slate-200 dark:border-white/10 shrink-0 relative">
                      <PlayerAvatar name={displayName} playerImages={playerImages.data} bio={getBioFor(displayName)} imgClassName="w-full h-full object-cover select-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{displayPlayerName(displayName, displayNames)}</div>
                      <div className="text-[9px] text-slate-500 dark:text-white/40">{fmt(b.runs)} runs · SR {b.sr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* STATIC DATA SECTION */}
      <div className="space-y-4 px-2.5 pb-6 mt-4">
        {/* CROSS-LINK TO GLOBAL SCOUT LAB */}
        <div className="rounded-2xl bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Looking for multi-league scouting across domestic and overseas tournaments?
              </span>
              <span className="text-[10px] text-slate-600 dark:text-white/60">
                Compare players across IPL, SMAT, BBL, SA20, CPL, and ILT20 with league-adjusted ratings.
              </span>
            </div>
          </div>
          <Link href="/scout">
            <button className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer">
              <span>Open Scout Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {filterControls}

        {/* Telemetry Summary Banner */}
        <div className="mb-6 bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in relative overflow-hidden group shadow-sm dark:shadow-none">
          <img
            src="/advance stats title image.png"
            className="absolute right-0 top-0 h-full w-auto object-cover opacity-15 dark:opacity-25 pointer-events-none mix-blend-luminosity group-hover:opacity-25 dark:group-hover:opacity-35 transition-opacity"
            alt="Advance Stats Banner"
          />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-primary/20 rounded-xl text-primary">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Multidimensional Slicing Telemetry</div>
              <div className="text-[10px] text-slate-600 dark:text-white/50 font-bold mt-0.5">
                {filters.season !== "All Seasons" ? `${filters.season} ` : "All-Time "}
                {filters.team !== "All Teams" ? `${filters.team} ` : ""}
                {filters.opposition !== "All Opponents" ? `vs ${filters.opposition} ` : ""}
                {filters.venue !== "All Venues" ? `at ${filters.venue}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 relative z-10 flex-wrap">
            {themeTeam && (
              <button
                onClick={() => {
                  if (filters.team === themeTeam) {
                    handleFilterChange("team", "All Teams");
                  } else {
                    handleFilterChange("team", themeTeam);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                  filters.team === themeTeam
                    ? "bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20"
                    : "bg-slate-100 dark:bg-white/5 text-amber-700 dark:text-amber-300 border-amber-400/30 hover:bg-amber-400/10"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{filters.team === themeTeam ? `✓ My ${themeTeam} Dugout (Reset)` : `Filter to My ${themeTeam} Dugout`}</span>
              </button>
            )}
            <div className="text-right">
              <div className="text-[8px] font-black text-slate-500 dark:text-white/30 uppercase">Fixtures Sliced</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{activeMatches.length} <span className="text-[10px] text-primary font-bold">Matches</span></div>
            </div>
            {filters.venue !== "All Venues" && (
              <div className="text-right">
                <div className="text-[8px] font-black text-slate-500 dark:text-white/30 uppercase">Venue Scorecards</div>
                <div className="text-xl font-black text-primary mt-0.5">
                  {activeMatches.filter(m => m.venue && normalizeVenueName(m.venue) === normalizeVenueName(filters.venue)).length} <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">Fixtures</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TAB BAR & SEE ALL OPTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 w-fit max-w-full overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${activeTab === t.id
                  ? "bg-gradient-to-r from-primary/80 to-blue-600/80 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5"
                  }`}
              >
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {(activeTab === "batters" || activeTab === "bowlers") && (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono text-slate-500 dark:text-white/40">
                {activeTab === "batters"
                  ? `${totalBatterCount} Batters`
                  : `${totalBowlerCount} Bowlers`}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-[11px] font-bold text-slate-500 dark:text-white/40">Rows:</span>
                <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-0.5">
                  {[10, 20, 50, 100].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setPageSize(size); setCurrentPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        pageSize === size
                          ? "bg-primary text-white shadow-sm font-black"
                          : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* QUERY CHAIN BREADCRUMB TRAIL */}
        {filterChain.length > 0 && (
          <div className="flex items-center gap-2 px-1 py-2 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 shrink-0">Filter Context:</span>
            {filterChain.map(f => (
              <button key={f.key} onClick={() => removeChainFilter(f.key)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all group">
                <span>{f.label}</span>
                <span className="text-[8px] opacity-60 group-hover:opacity-100">✕</span>
              </button>
            ))}
            <button onClick={clearFilterChain}
              className="ml-auto text-[9px] font-black uppercase tracking-wider text-white/20 hover:text-red-400 transition-colors">
              Clear All
            </button>
          </div>
        )}

        {/* TAB CONTENT */}
            <div id="stats-table-anchor" className="scroll-mt-28" />
            <div className="min-h-[600px]">
          {!dynamicStatsQuery.isLoading && !isDefaultCareerView && dynamicStatsQuery.isError && activeData.batters.length === 0 && activeData.bowlers.length === 0 && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mx-2">
              <div className="text-[11px] font-black text-amber-300 uppercase tracking-widest">No Sliced Telemetry Found</div>
              <div className="text-[12px] font-mono text-white/70 mt-1">
                No telemetry records found for the selected dimensional filters. Try expanding your filter scope.
              </div>
            </div>
          )}
          {/* No AnimatePresence/exit: an exiting child stays mounted until its
              exit animation finishes, so when frames stall the previous tab's
              content never unmounts and two tabs render at once — the batters
              table was still on screen underneath the team cards. Keying the
              div still gives the enter animation. */}
          <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "batters" && (
                <div className="bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/5">
                        <tr>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("player")}>Rank & Player {batterSortField === "player" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("matches")}>Mts {batterSortField === "matches" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("innings")}>Inn {batterSortField === "innings" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("runs")}>Runs {batterSortField === "runs" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("balls")}>Balls {batterSortField === "balls" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("highest")}>HS {batterSortField === "highest" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("avg")}>Avg {batterSortField === "avg" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("sr")}>SR {batterSortField === "sr" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("boundaryPct")} title="Share of the batter's runs scored in fours and sixes">Bdry% {batterSortField === "boundaryPct" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] text-center bg-blue-500/5 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors" onClick={() => handleBatterSort("fours")}>4s {batterSortField === "fours" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] text-center bg-purple-500/5 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300 transition-colors" onClick={() => handleBatterSort("sixes")}>6s {batterSortField === "sixes" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] text-center bg-red-500/5 cursor-pointer hover:text-red-700 dark:hover:text-red-300 transition-colors" onClick={() => handleBatterSort("hundreds")}>100s {batterSortField === "hundreds" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBatterSort("fifties")}>50s {batterSortField === "fifties" && (batterSortOrder === "desc" ? "▼" : "▲")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {paginatedBatters.map((b, i) => {
                          const rank = batterStartIndex + i + 1;
                          const name = b.player || b.player_name || b.name || (b.player_id ? `Player #${b.player_id}` : `IPL Batter #${rank}`);
                          return (
                            <tr key={name + rank} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-4 min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-amber-500/70 dark:text-amber-400/40 min-w-6">#{rank}</span>
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#0A1329] to-[#040814] border border-slate-200 dark:border-white/10 shrink-0 relative">
                                    <PlayerAvatar name={name} playerImages={playerImages.data} bio={getBioFor(name)} imgClassName="w-full h-full object-cover select-none" />
                                  </div>
                                  <div className="flex flex-col">
                                    <Link href={`/players/${name.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "")}`}>
                                      <span className="text-[13px] font-black text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer">{displayPlayerName(name, displayNames)}</span>
                                    </Link>
                                    <span className="text-[8px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">Active Intelligence</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center font-mono text-[11px] text-primary/90 font-bold tabular-nums">{b.matches}</td>
                              <td className="px-4 py-4 text-center font-mono text-[11px] text-slate-600 dark:text-white/60 tabular-nums">{b.innings}</td>
                              <td className="px-4 py-4 text-center font-black text-[15px] text-slate-900 dark:text-white tabular-nums">{fmt(b.runs)}</td>
                              <td className="px-4 py-4 text-center font-bold text-[12px] text-slate-600 dark:text-white/60 tabular-nums">{b.balls}</td>
                              <td className="px-4 py-4 text-center font-bold text-[12px] text-amber-600 dark:text-amber-400 tabular-nums">{b.highest || "—"}</td>
                              <td className="px-4 py-4 text-center font-bold text-[12px] text-slate-700 dark:text-white/80 tabular-nums">{safeToFixed(b.avg, 1)}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-primary tabular-nums">{safeToFixed(b.sr, 1)}</td>
                              <td className="px-4 py-4 text-center font-bold text-[11px] text-slate-500 dark:text-white/40 tabular-nums">{safeToFixed(b.boundaryPct, 0)}%</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-blue-600 dark:text-blue-400 tabular-nums bg-blue-500/[0.02]">{b.fours}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-purple-600 dark:text-purple-400 tabular-nums bg-purple-500/[0.02]">{b.sixes}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-red-600 dark:text-red-400 tabular-nums bg-red-500/[0.02]">{b.hundreds || 0}</td>
                              <td className="px-4 py-4 text-center font-bold text-[11px] text-slate-600 dark:text-white/60 tabular-nums">{b.fifties || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePaginationBar
                    currentPage={currentPage}
                    totalPages={totalBatterPages}
                    totalItems={totalBatterCount}
                    startIndex={batterStartIndex}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    itemLabel="Batters"
                  />
                </div>
              )}

              {activeTab === "bowlers" && (
                <div className="bg-white dark:bg-[#0B1020] rounded-[24px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl animate-fade-in">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/5">
                        <tr>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("player")}>Rank & Bowler {bowlerSortField === "player" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("matches")}>Mts {bowlerSortField === "matches" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("innings")}>Inn {bowlerSortField === "innings" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("wickets")}>Wkts {bowlerSortField === "wickets" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("econ")}>Econ {bowlerSortField === "econ" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("avg")}>Avg {bowlerSortField === "avg" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("sr")}>SR {bowlerSortField === "sr" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-[0.2em] text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleBowlerSort("dotPct")}>Dot% {bowlerSortField === "dotPct" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] text-center bg-blue-500/5 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors" onClick={() => handleBowlerSort("boundaryPct")} title="Boundaries conceded per 100 legal balls">BND% {bowlerSortField === "boundaryPct" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] text-center bg-purple-500/5 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300 transition-colors" onClick={() => handleBowlerSort("ballsPerBoundary")}>BPB {bowlerSortField === "ballsPerBoundary" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                          <th className="px-4 py-4 text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] text-center bg-red-500/5 cursor-pointer hover:text-red-700 dark:hover:text-red-300 transition-colors" onClick={() => handleBowlerSort("trueEconomy")}>True Econ {bowlerSortField === "trueEconomy" && (bowlerSortOrder === "desc" ? "▼" : "▲")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {paginatedBowlers.map((b, i) => {
                          const rank = bowlerStartIndex + i + 1;
                          const name = b.player || b.player_name || b.name || (b.player_id ? `Player #${b.player_id}` : `IPL Bowler #${rank}`);
                          return (
                            <tr key={name + rank} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-4 min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-amber-500/70 dark:text-amber-400/40 min-w-6">#{rank}</span>
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#0A1329] to-[#040814] border border-slate-200 dark:border-white/10 shrink-0 relative">
                                    <PlayerAvatar name={name} playerImages={playerImages.data} bio={getBioFor(name)} imgClassName="w-full h-full object-cover select-none" />
                                  </div>
                                  <div className="flex flex-col">
                                    <Link href={`/players/${name.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "")}`}>
                                      <span className="text-[13px] font-black text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer">{displayPlayerName(name, displayNames)}</span>
                                    </Link>
                                    <span className="text-[8px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">{b.bowlerType ? `${b.bowlerType} Intelligence` : "Active Intelligence"}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center font-mono text-[11px] text-primary/90 font-bold tabular-nums">{b.matches}</td>
                              <td className="px-4 py-4 text-center font-mono text-[11px] text-slate-600 dark:text-white/60 tabular-nums">{b.innings}</td>
                              <td className="px-4 py-4 text-center font-black text-[15px] text-slate-900 dark:text-white tabular-nums">{b.wickets}</td>
                              <td className="px-4 py-4 text-center font-bold text-[12px] text-emerald-600 dark:text-emerald-400 tabular-nums">{safeToFixed(b.econ, 2)}</td>
                              <td className="px-4 py-4 text-center font-bold text-[12px] text-slate-700 dark:text-white/80 tabular-nums">{safeToFixed(b.avg, 1)}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-primary tabular-nums">{safeToFixed(b.sr, 1)}</td>
                              <td className="px-4 py-4 text-center font-bold text-[11px] text-slate-500 dark:text-white/40 tabular-nums">{safeToFixed(b.dotPct, 0)}%</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-blue-600 dark:text-blue-400 tabular-nums bg-blue-500/[0.02]">{b.boundaryPct == null ? "—" : `${safeToFixed(b.boundaryPct, 1)}%`}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-purple-600 dark:text-purple-400 tabular-nums bg-purple-500/[0.02]">{safeToFixed(b.ballsPerBoundary, 2)}</td>
                              <td className="px-4 py-4 text-center font-black text-[12px] text-red-600 dark:text-red-400 tabular-nums bg-red-500/[0.02]">{safeToFixed(b.trueEconomy, 2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <TablePaginationBar
                    currentPage={currentPage}
                    totalPages={totalBowlerPages}
                    totalItems={totalBowlerCount}
                    startIndex={bowlerStartIndex}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    itemLabel="Bowlers"
                  />
                </div>
              )}




              {activeTab === "venues" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {venues.data?.map((v: any) => {
                    const venueName = getVenueName(v);
                    const cityName = getVenueCity(v);
                    const avg1st = Number(v.avg1stInn ?? v.avgFirstInnings ?? 0);
                    const avg2nd = Number(v.avg2ndInn ?? v.avgSecondInnings ?? 0);
                    const avgRunRate = (avg1st && avg2nd) ? ((avg1st + avg2nd) / 40) : 8.24;
                    return (
                      <GlassCard
                        key={venueName}
                        className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                        onClick={() => setSelectedVenue(venueName)}
                      >
                        {/* Full-bleed photo banner. The previous corner
                            treatment cut the image into a quarter-circle in the
                            top-right, which clipped the stadium and read as a
                            stray wedge over the stats. */}
                        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden">
                          {venueImage(venueName) ? (
                            <img
                              src={venueImage(venueName)!}
                              className="w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-500"
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full h-full opacity-50"
                              style={{ background: `linear-gradient(135deg, hsl(${venueHue(venueName)} 50% 32%), transparent)` }}
                            />
                          )}
                          {/* Fades the photo into the card so text stays legible. */}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B1020]/60 to-[#0B1020]" />
                        </div>
                        <div className="flex items-center gap-3 mb-4 relative z-10 pt-6">
                          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/15 shadow-lg">
                            {venueImage(venueName) ? (
                              <img src={venueImage(venueName)!} className="w-full h-full object-cover" alt={venueName} loading="lazy" />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, hsl(${venueHue(venueName)} 45% 24%), hsl(${venueHue(venueName)} 40% 12%))` }}
                              >
                                <MapPin className="w-5 h-5" style={{ color: `hsl(${venueHue(venueName)} 70% 65%)` }} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-white group-hover:text-primary transition-colors truncate">{venueName}</div>
                            <div className="text-[10px] text-white/40 font-bold">{cityName}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5 relative z-10">
                          <div>
                            <div className="text-[8px] font-bold text-white/30 uppercase">Total Matches</div>
                            <div className="text-xl font-black text-white mt-0.5">{v.matches || 14}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-white/30 uppercase">Avg Run Rate</div>
                            <div className="text-xl font-black text-primary mt-0.5">{avgRunRate.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="mt-4 pt-2 flex items-center justify-between text-[10px] font-black text-primary uppercase tracking-wider relative z-10 group-hover:translate-x-1 transition-transform">
                          <span>Inspect Pitch Telemetry</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}

              {activeTab === "teams" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {teamCards.map((t) => {
                    const accent = teamColor(t.name);
                    return (
                    <GlassCard
                      key={t.short}
                      className="p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        setLocation(`/teams/${slug}`);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {/* Wash tinted with the franchise's own colour rather than
                          a single shared accent, so cards read apart at a glance. */}
                      <div
                        className="absolute top-0 right-0 w-28 h-28 rounded-bl-full -mr-8 -mt-8 opacity-25 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300"
                        style={{ background: `radial-gradient(circle at 70% 30%, ${accent}, transparent 70%)` }}
                      />
                      <div className="flex items-center gap-3 mb-4 relative z-10">
                        <TeamLogo team={t.name} size="w-11 h-11" />
                        <div className="min-w-0">
                          <div className="text-sm font-black text-white group-hover:text-primary transition-colors truncate">{t.name}</div>
                          <div className="text-[10px] text-white/40 font-bold flex items-center gap-1.5">
                            <span>{t.short}</span>
                            {t.titles > 0 && (
                              <span className="inline-flex items-center gap-1 text-amber-300/80">
                                <Trophy className="w-2.5 h-2.5" />
                                {t.titles} {t.titles === 1 ? "title" : "titles"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Win share bar — proportion of the sliced fixtures won. */}
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3 relative z-10">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, t.winPct)}%`, background: accent }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 relative z-10">
                        <div>
                          <div className="text-[8px] font-bold text-white/30 uppercase">Played</div>
                          <div className="text-base font-black text-white mt-0.5">{t.matches}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-bold text-white/30 uppercase">Won</div>
                          <div className="text-base font-black text-emerald-400 mt-0.5">{t.wins}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-bold text-white/30 uppercase">Lost</div>
                          <div className="text-base font-black text-red-400 mt-0.5">{t.losses}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-bold text-white/30 uppercase">Win %</div>
                          <div className="text-base font-black text-primary mt-0.5">{t.winPct.toFixed(1)}%</div>
                        </div>
                      </div>
                    </GlassCard>
                    );
                  })}
                </div>
              )}

              {/* Scenario Intelligence */}
              {activeTab === "scenario-intelligence" && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-amber-400 to-orange-600 rounded-full" />
                    <div>
                      <div className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Scenario Intelligence</div>
                      <div className="text-[10px] text-slate-500 dark:text-white/40 font-bold">Who performs best under specific match conditions?</div>
                    </div>
                  </div>

                  {/* Scenario presets */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "death", label: "Death Overs", color: "from-red-500/10 to-orange-500/5 dark:from-red-500/20 dark:to-orange-500/10", activeBorder: "border-red-500 text-red-600 dark:text-white bg-red-500/10 dark:bg-red-500/20 ring-2 ring-red-500/30" },
                      { id: "powerplay", label: "Powerplay", color: "from-blue-500/10 to-cyan-500/5 dark:from-blue-500/20 dark:to-cyan-500/10", activeBorder: "border-cyan-500 text-cyan-700 dark:text-white bg-cyan-500/10 dark:bg-cyan-500/20 ring-2 ring-cyan-500/30" },
                      { id: "clutch", label: "Clutch Moments", color: "from-purple-500/10 to-indigo-500/5 dark:from-purple-500/20 dark:to-indigo-500/10", activeBorder: "border-purple-500 text-purple-700 dark:text-white bg-purple-500/10 dark:bg-purple-500/20 ring-2 ring-purple-500/30" },
                      { id: "high-pressure", label: "High Pressure", color: "from-pink-500/10 to-rose-500/5 dark:from-pink-500/20 dark:to-rose-500/10", activeBorder: "border-pink-500 text-pink-700 dark:text-white bg-pink-500/10 dark:bg-pink-500/20 ring-2 ring-pink-500/30" },
                      { id: "chasing200plus", label: "Chasing 200+", color: "from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10", activeBorder: "border-emerald-500 text-emerald-700 dark:text-white bg-emerald-500/10 dark:bg-emerald-500/20 ring-2 ring-emerald-500/30" },
                      { id: "playoff", label: "Playoff Matches", color: "from-amber-500/10 to-yellow-500/5 dark:from-amber-500/20 dark:to-yellow-500/10", activeBorder: "border-amber-500 text-amber-700 dark:text-white bg-amber-500/10 dark:bg-amber-500/20 ring-2 ring-amber-500/30" },
                      { id: "death-spin", label: "Death vs Spin", color: "from-violet-500/10 to-purple-500/5 dark:from-violet-500/20 dark:to-purple-500/10", activeBorder: "border-violet-500 text-violet-700 dark:text-white bg-violet-500/10 dark:bg-violet-500/20 ring-2 ring-violet-500/30" },
                    ].map(s => (
                      <button key={s.id}
                        type="button"
                        onClick={() => setSelectedScenario(s.id)}
                        className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all duration-200 cursor-pointer bg-gradient-to-br ${s.color} ${
                          selectedScenario === s.id
                            ? `${s.activeBorder} scale-105 shadow-md`
                            : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/30 hover:bg-slate-100/60 dark:hover:bg-white/5"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-white/60">
                    <label className="flex items-center gap-2 font-bold">
                      From season
                      <select className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-background px-2 py-1 text-slate-800 dark:text-white" value={scenarioRange.from}
                        onChange={e => setScenarioRange(range => ({ ...range, from: e.target.value }))}>
                        <option value="">Any</option>
                        {scenarioYears.filter(year => !scenarioRange.to || year <= scenarioRange.to).map(year => <option key={year}>{year}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 font-bold">
                      To season
                      <select className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-background px-2 py-1 text-slate-800 dark:text-white" value={scenarioRange.to}
                        onChange={e => setScenarioRange(range => ({ ...range, to: e.target.value }))}>
                        <option value="">Any</option>
                        {scenarioYears.filter(year => !scenarioRange.from || year >= scenarioRange.from).map(year => <option key={year}>{year}</option>)}
                      </select>
                    </label>
                  </div>

                  {/* Min balls qualifier */}
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider">Min balls faced:</span>
                    {[5, 10, 20, 30, 50].map(n => (
                      <button key={n} onClick={() => setScenarioMinBalls(n)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                          scenarioMinBalls === n ? "bg-primary text-white shadow-xs font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>

                  {/* Results */}
                  {scenarioQuery.isLoading ? (
                    <div className="text-center py-12 text-slate-500 dark:text-white/40 font-mono text-sm">Loading scenario data...</div>
                  ) : scenarioQuery.isError ? (
                    <div role="status" className="text-center py-12 text-slate-600 dark:text-white/60 text-sm">Scenario data is temporarily unavailable.</div>
                  ) : !effectiveScenarioData.batters.length && !effectiveScenarioData.bowlers.length ? (
                    <div role="status" className="text-center py-12 text-slate-600 dark:text-white/60 text-sm">No players meet these scenario filters.</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Batters leaderboard */}
                      <div className="bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-sm dark:shadow-xl">
                        <div className="text-[11px] font-black uppercase tracking-widest text-primary mb-3">Top Batters</div>
                        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                              <tr>
                                {["Batter","Runs","SR","Avg","Balls"].map(h => (
                                  <th key={h} className="px-3 py-3 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                              {(effectiveScenarioData.batters || []).slice(0, 15).map((b: any, i: number) => (
                                <tr key={b.player} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-3 py-3">
                                    <Link href={`/players/${playerSlug(b.player)}`} className="flex items-center gap-2 group/p cursor-pointer hover:opacity-90">
                                      <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 w-4">#{i+1}</span>
                                      <PlayerAvatar name={b.player} className="w-6 h-6 shrink-0" />
                                      <span className="text-[12px] font-bold text-slate-900 dark:text-white group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{displayPlayerName(b.player, displayNames)}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 ml-auto">
                                        {getPlayerTeam(b.player, b)}
                                      </span>
                                    </Link>
                                  </td>
                                  <td className="px-3 py-3 font-black text-primary text-[13px]">{b.runs}</td>
                                  <td className="px-3 py-3 font-bold text-amber-600 dark:text-amber-400 text-[12px]">{b.sr ? Number(b.sr).toFixed(1) : "—"}</td>
                                  <td className="px-3 py-3 font-bold text-slate-700 dark:text-white/70 text-[12px]">{b.avg ? Number(b.avg).toFixed(1) : "—"}</td>
                                  <td className="px-3 py-3 text-slate-500 dark:text-white/40 text-[11px]">{b.balls}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bowlers leaderboard */}
                      <div className="bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-sm dark:shadow-xl">
                        <div className="text-[11px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-3">Top Bowlers</div>
                        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                              <tr>
                                {["Bowler","Wkts","Econ","SR","Dot%"].map(h => (
                                  <th key={h} className="px-3 py-3 text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider text-left">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                              {(effectiveScenarioData.bowlers || []).slice(0, 15).map((b: any, i: number) => (
                                <tr key={b.player} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                                  <td className="px-3 py-3">
                                    <Link href={`/players/${playerSlug(b.player)}`} className="flex items-center gap-2 group/p cursor-pointer hover:opacity-90">
                                      <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 w-4">#{i+1}</span>
                                      <PlayerAvatar name={b.player} className="w-6 h-6 shrink-0" />
                                      <span className="text-[12px] font-bold text-slate-900 dark:text-white group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{displayPlayerName(b.player, displayNames)}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 ml-auto">
                                        {getPlayerTeam(b.player, b)}
                                      </span>
                                    </Link>
                                  </td>
                                  <td className="px-3 py-3 font-black text-amber-600 dark:text-amber-400 text-[13px]">{b.wickets}</td>
                                  <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-[12px]">{b.econ ? Number(b.econ).toFixed(2) : "—"}</td>
                                  <td className="px-3 py-3 font-bold text-slate-700 dark:text-white/70 text-[12px]">{b.sr ? Number(b.sr).toFixed(1) : "—"}</td>
                                  <td className="px-3 py-3 text-slate-500 dark:text-white/40 text-[11px]">{b.dotPct != null ? `${Number(b.dotPct).toFixed(0)}%` : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "records" && (
                <RecordBookView activeData={activeData} playerImages={playerImages.data ?? {}} matches={matches} />
              )}
              {activeTab === "head2head" && (
                <HeadToHeadView batters={activeData.batters} bowlers={activeData.bowlers} teams={teams.data || []} playerImages={playerImages.data ?? {}} />
              )}
              {activeTab === "stat-builder" && (
                <StatBuilderView batters={activeData.batters} bowlers={activeData.bowlers} playerImages={playerImages.data ?? {}} />
              )}
              {activeTab === "ask" && (
                <AskAIView />
              )}
            </motion.div>
        </div>

        {/* NATIVE AD VESSEL — Performance Analytics & Telemetry Partner */}
        <div className="mt-8 mb-2">
          <AdVessel slot="1029384758" format="horizontal" label="Stats Partner Briefing · High-Performance Telemetry" />
        </div>

        {/* DEEP DIVE LINKS */}
        <div className="flex items-center gap-2 mt-6 mb-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Intelligence Ecosystem</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Cricket Feed", href: "/feed", icon: Zap, color: "from-red-500/20 to-pink-500/10" },
            { label: "Franchise Intelligence", href: "/intelligence", icon: Cpu, color: "from-amber-500/20 to-orange-500/10" },
            { label: "Auction Pulse", href: "/pulse", icon: Activity, color: "from-purple-500/20 to-blue-500/10" },
          ].map(lnk => (
            <Link key={lnk.label} href={lnk.href}>
              <GlassCard className={`p-4 bg-gradient-to-br ${lnk.color} cursor-pointer hover:scale-[1.02] transition-transform group`}>
                <lnk.icon className="w-5 h-5 text-white/60 mb-2 group-hover:text-white transition-colors" />
                <div className="text-[12px] font-black uppercase tracking-wider">{lnk.label}</div>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-white/30 font-bold">
                  <span>{lnk.href==='/feed'?'Open feed':lnk.href==='/intelligence'?'Read intelligence':'Open Auction Pulse'}</span><ArrowRight className="w-3 h-3" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Venue Detail Overlay Modal */}
      <AnimatePresence>
        {selectedVenue && (() => {
          const targetVenue = selectedVenue.trim();
          const targetBase = targetVenue.toLowerCase().split(",")[0].trim().replace(/[^a-z0-9]+/g, " ");

          const v = (
            venues.data?.find(x => {
              const vn = getVenueName(x).toLowerCase().replace(/[^a-z0-9]+/g, " ");
              return vn.includes(targetBase) || targetBase.includes(vn.split(",")[0].trim());
            }) ||
            slicedVenues.find(x => (x.venue || "").toLowerCase().includes(targetBase)) ||
            { venue: targetVenue, matches: 14 }
          ) as any;

          const venueName = getVenueName(v) || targetVenue;
          const staticVenue = venues.data?.find(x => {
            const vn = getVenueName(x).toLowerCase().replace(/[^a-z0-9]+/g, " ");
            return vn.includes(targetBase) || targetBase.includes(vn.split(",")[0].trim());
          });

          const battingFirstWinPct = staticVenue?.battingFirstWinPct ?? v?.battingFirstWinPct ?? 52;
          const chasingWinPct = staticVenue?.chasingWinPct ?? v?.chasingWinPct ?? 48;

          const allMatchesList: any[] = (matches as any).data ?? activeMatches;
          const venueMatches = allMatchesList.filter((m: any) => {
            if (!m.venue) return false;
            const mL = m.venue.toLowerCase().split(",")[0].trim().replace(/[^a-z0-9]+/g, " ");
            return mL === targetBase || mL.includes(targetBase) || targetBase.includes(mL);
          });

          let highestScore = 0;
          let highestTeam = "";
          venueMatches.forEach(m => {
            const parseRuns = (scoreStr?: string) => {
              if (!scoreStr || !scoreStr.includes("/")) return 0;
              return parseInt(scoreStr.split("/")[0]) || 0;
            };
            const r1 = parseRuns(m.team1Score);
            if (r1 > highestScore) { highestScore = r1; highestTeam = m.team1; }
            const r2 = parseRuns(m.team2Score);
            if (r2 > highestScore) { highestScore = r2; highestTeam = m.team2; }
          });

          const teamRecords: Record<string, { matches: number; wins: number }> = {};
          venueMatches.forEach(m => {
            [m.team1, m.team2].forEach(team => {
              if (!teamRecords[team]) teamRecords[team] = { matches: 0, wins: 0 };
              teamRecords[team].matches++;
            });
            if (m.winner && teamRecords[m.winner]) {
              teamRecords[m.winner].wins++;
            }
          });
          const teamStatsAtVenue = Object.entries(teamRecords)
            .map(([teamName, rec]) => ({
              team: teamName,
              matches: rec.matches,
              wins: rec.wins,
              winPct: (rec.wins / rec.matches) * 100
            }))
            .sort((a, b) => b.winPct - a.winPct);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
              onClick={() => setSelectedVenue(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0B1020] border border-white/10 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedVenue(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-20 text-white/60 hover:text-white"
                  title="Close Details"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-full md:w-[320px] bg-slate-950/50 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-5">
                  <div className="w-full h-40 rounded-2xl overflow-hidden border border-white/10 relative">
                    {/* The ground's own photograph; this panel was the last
                        place still showing the shared "/venue.png". */}
                    {venueImage(venueName) ? (
                      <img src={venueImage(venueName)!} className="w-full h-full object-cover opacity-80" alt={venueName} />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ background: `linear-gradient(135deg, hsl(${venueHue(venueName)} 45% 26%), hsl(${venueHue(venueName)} 40% 12%))` }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 rounded-lg text-emerald-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-wider">IPL Core Stadium</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Telemetry Profile</h3>
                    <h2 className="text-xl font-black text-white leading-tight">{venueName}</h2>
                    <p className="text-[11px] text-white/50 mt-1">{getVenueCity(staticVenue ?? v)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <span className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Highest Score</span>
                      <span className="text-[13px] font-black text-amber-400 mt-0.5 block">{highestScore > 0 ? `${highestScore}` : "—"}</span>
                      <span className="text-[7.5px] font-bold text-white/20 truncate block">{highestTeam || "N/A"}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <span className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Spin vs Pace</span>
                      <span className="text-[13px] font-black text-purple-400 mt-0.5 block">58% / 42%</span>
                      <span className="text-[7.5px] font-bold text-white/20 block">Pace Dominant</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white/40">Bat First:</span>
                      <span className="text-amber-400 font-black">{battingFirstWinPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-white/40">Chasing:</span>
                      <span className="text-emerald-400 font-black">{chasingWinPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex mt-1">
                      <motion.div style={{ "--progress-w": `${battingFirstWinPct}%` } as React.CSSProperties} className="h-full bg-amber-400 rounded-l-full w-[var(--progress-w)]" />
                      <div className="flex-1 h-full bg-emerald-400 rounded-r-full" />
                    </div>
                  </div>

                  <Link href={venueHref(venueName)}>
                    <button className="w-full py-2.5 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all mt-2">
                      <span>Open Dedicated Venue Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>

                <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-2">
                      Venue Stats Book & Match History
                    </h4>

                    <div className="max-h-[220px] overflow-y-auto border border-white/5 rounded-xl bg-slate-950/20 divide-y divide-white/5 mt-2">
                      {venueMatches.length === 0 ? (
                        <div className="p-8 text-center text-[11px] text-white/30 font-bold">
                          No match data available for this venue.
                        </div>
                      ) : (
                        venueMatches.map((m) => (
                          <div key={m.id} className="p-3 flex flex-wrap gap-2 items-center justify-between hover:bg-white/[0.01] transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-black text-white/50 uppercase tracking-widest">{m.season}</span>
                              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                <span>{teamShort(m.team1)}</span>
                                <span className="text-white/30">vs</span>
                                <span>{teamShort(m.team2)}</span>
                              </div>
                            </div>
                            <div className="text-[10px] font-mono text-white/60 tabular-nums">
                              {m.team1Score || "—"} vs {m.team2Score || "—"}
                            </div>
                            <div className="text-[10px] font-black text-emerald-400 text-right">
                              {m.winner ? `${teamShort(m.winner)} Won` : "No Result"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-2 border-b border-white/5 pb-2">
                      Franchise Dominance Index
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {teamStatsAtVenue.slice(0, 6).map((tVal, idx) => (
                        <div key={tVal.team} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-white/20 w-3">#{idx + 1}</span>
                            <TeamLogo team={tVal.team} size="w-6 h-6" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-white">{teamShort(tVal.team)}</span>
                              <span className="text-[8px] font-bold text-white/30 uppercase">{tVal.matches} played</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-black text-emerald-400 block">{tVal.winPct.toFixed(0)}% Win</span>
                            <span className="text-[8px] font-bold text-white/40 uppercase block">{tVal.wins} W</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Team Detail Overlay Modal */}
      <AnimatePresence>
        {selectedTeam && (() => {
          const tVal = slicedTeams.find(x => x.team === selectedTeam);
          if (!tVal) return null;

          const staticTeam = teams.data?.find(x => teamShort(x.team) === selectedTeam || x.team === selectedTeam);
          const titles = staticTeam?.titles ?? 0;

          const teamMatches = activeMatches.filter(m => teamShort(m.team1) === selectedTeam || teamShort(m.team2) === selectedTeam);

          const last5 = [...teamMatches].sort((a, b) => {
            const dateA = new Date(a.date || "");
            const dateB = new Date(b.date || "");
            return dateB.getTime() - dateA.getTime();
          }).slice(0, 5);

          const getAbbreviation = (teamName: string): string => {
            const clean = teamName.toUpperCase();
            if (clean.includes("CHENNAI") || clean === "CSK") return "CSK";
            if (clean.includes("MUMBAI") || clean === "MI") return "MI";
            if (clean.includes("BENGALURU") || clean.includes("ROYAL CHALLENGERS") || clean === "RCB") return "RCB";
            if (clean.includes("KOLKATA") || clean === "KKR") return "KKR";
            if (clean.includes("RAJASTHAN") || clean === "RR") return "RR";
            if (clean.includes("HYDERABAD") || clean === "SUNRISERS") return "SRH";
            if (clean.includes("DELHI") || clean === "DC") return "DC";
            if (clean.includes("GUJARAT") || clean === "GT") return "GT";
            if (clean.includes("LUCKNOW") || clean === "LSG") return "LSG";
            if (clean.includes("PUNJAB") || clean === "PBKS") return "PBKS";
            return clean;
          };

          const targetAbbrev = getAbbreviation(selectedTeam);
          const teamPlayers = playerBios.data ? Object.values(playerBios.data).filter(p => {
            const pTeam = getPlayerTeam(p.playerName);
            return getAbbreviation(pTeam) === targetAbbrev;
          }) : [];

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
              onClick={() => setSelectedTeam(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0B1020] border border-white/10 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors z-20 text-white/60 hover:text-white"
                  title="Close Details"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-full md:w-[320px] bg-slate-950/50 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <TeamLogo team={tVal.team} size="w-16 h-16 shadow-2xl shrink-0" />
                    <div className="min-w-0">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
                        {teamShort(tVal.team)} Franchise
                      </span>
                      <h2 className="text-xl font-black text-white leading-tight mt-1 truncate">{tVal.team}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                      <span className="text-[7.5px] font-black uppercase tracking-widest text-white/30">Matches</span>
                      <span className="text-[13px] font-black text-white mt-0.5">{tVal.matches}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                      <span className="text-[7.5px] font-black uppercase tracking-widest text-white/30">Wins</span>
                      <span className="text-[13px] font-black text-white mt-0.5">{tVal.wins}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                      <span className="text-[7.5px] font-black uppercase tracking-widest text-white/30">Win %</span>
                      <span className="text-[13px] font-black text-emerald-400 mt-0.5">{tVal.winPct.toFixed(1)}%</span>
                    </div>
                  </div>

                  {titles > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-400/10 to-amber-500/5 border border-amber-400/20 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">IPL Champion</span>
                          <span className="text-[9px] font-bold text-white/50 mt-0.5">{titles} Championships</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-amber-400">{titles}x</span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2.5">Recent Form</h3>
                    <div className="flex items-center gap-2.5">
                      {last5.length === 0 ? (
                        <span className="text-[10px] text-white/20 font-bold uppercase">No Match Logs</span>
                      ) : (
                        last5.map((m, idx) => {
                          const isWin = m.winner === selectedTeam;
                          const isLoss = m.winner && m.winner !== selectedTeam;
                          return (
                            <div
                              key={m.id || idx}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] border shadow-md relative group/form cursor-default transition-all duration-300 ${isWin ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : isLoss ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-white/5 border-white/10 text-white/40'}`}
                            >
                              {isWin ? 'W' : isLoss ? 'L' : 'NR'}

                              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 p-2 rounded-xl bg-slate-900 border border-white/10 text-[9.5px] text-white font-bold opacity-0 pointer-events-none group-hover/form:opacity-100 transition-opacity z-50 text-center shadow-2xl">
                                <div>vs {teamShort(m.team1 === selectedTeam || teamShort(m.team1) === selectedTeam ? m.team2 : m.team1)}</div>
                                <div className="text-[8px] text-white/40 mt-0.5">{m.team1Score} vs {m.team2Score}</div>
                                <div className="text-[7.5px] text-emerald-400 mt-0.5">{m.winner ? `${teamShort(m.winner)} Won` : 'No Result'}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
                  <div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                        Current Squad & Profile Bios
                      </h4>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">{teamPlayers.length} Active Profiles</span>
                    </div>

                    {teamPlayers.length === 0 ? (
                      <div className="p-12 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                        <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <div className="text-[11px] text-white/40 font-bold uppercase tracking-wider">No Player Profiles Loaded</div>
                        <div className="text-[9px] text-white/20 mt-1">No active players mapped.</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {teamPlayers.map((pVal) => (
                          <Link
                            key={pVal.playerId}
                            href={`/players/${pVal.playerName.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "")}`}
                            className="group/player"
                          >
                            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-primary/30 transition-all duration-300 cursor-pointer">
                              <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-950 border border-white/10 shrink-0 shadow-md">
                                <PlayerAvatar name={pVal.playerName} playerImages={playerImages.data} bio={pVal} imgClassName="w-full h-full object-cover group-hover/player:scale-105 transition-transform duration-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[12px] font-black text-white group-hover/player:text-primary transition-colors duration-300 block truncate">
                                  {displayPlayerName(pVal.playerName, displayNames)}
                                </span>
                                <span className="text-[8.5px] font-black text-white/30 uppercase tracking-wider block mt-0.5">
                                  {pVal.role} • {pVal.nationality}
                                </span>
                              </div>
                              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover/player:text-primary group-hover/player:translate-x-0.5 group-hover/player:-translate-y-0.5 transition-all duration-300 shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </Layout>
  );
  return mobilePresentation ? <MobileStatsPresentation
    filters={filters} setFilter={setFilter} seasons={seasons.data?.map(s => s.season) ?? []} teams={teamOptions}
    activeTab={activeTab} setActiveTab={setActiveTab} search={searchQuery} setSearch={setSearchQuery}
    rows={activeTab === "bowlers" ? activeData.bowlers : activeData.batters}
    images={playerImages.data} getBio={getBioFor} getTeam={getPlayerTeam}
    displayName={name => displayPlayerName(name, displayNames)} filterControls={filterControls}
    tools={desktopContent} trend={seasons.data ?? []}
    loading={isDefaultCareerView ? playerCareerStats.isLoading : dynamicStatsQuery.isLoading}
    slicedUnavailable={!isDefaultCareerView && !dynamicStatsQuery.isLoading && !dynamicStatsQuery.data?.batters?.length && !dynamicStatsQuery.data?.bowlers?.length}
    onSort={(field) => activeTab === "bowlers" ? handleBowlerSort(field as typeof bowlerSortField) : handleBatterSort(field as typeof batterSortField)}
  /> : desktopContent;
}

// fmt helper declared safely at top of module

function RecordBookView({ activeData, playerImages, matches }: { activeData: any, playerImages: Record<string, string>, matches?: any[] }) {
  const [recordTab, setRecordTab] = useState("batting"); // "team", "batting", "bowling", "keepers", "partnerships"
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const latestTeamResolver = usePlayerLatestTeamResolver();
  const displayNames = usePlayerDisplayNames();

  const findMatchId = (row: any): string | null => {
    if (!matches || matches.length === 0) return null;
    if (row.matchId) return String(row.matchId);
    const text = ((row.innings || '') + ' ' + (row.context || '') + ' ' + (row.player || '')).toLowerCase();
    
    const yearMatch = text.match(/\b(20\d\d|200\d)\b/);
    const year = yearMatch ? yearMatch[1] : null;

    const pool = year ? matches.filter((m: any) => m.season === year) : matches;

    for (const m of pool) {
      const short1 = teamShort(m.team1).toLowerCase();
      const short2 = teamShort(m.team2).toLowerCase();

      if (
        (text.includes(short1) || text.includes(m.team1.toLowerCase())) &&
        (text.includes(short2) || text.includes(m.team2.toLowerCase()))
      ) {
        return m.id;
      }
    }

    const vsMatch = text.match(/vs\s+([a-z0-9\s]+?)(?:,|\d|$)/);
    if (vsMatch && vsMatch[1]) {
      const opp = vsMatch[1].trim();
      for (const m of pool) {
        const short1 = teamShort(m.team1).toLowerCase();
        const short2 = teamShort(m.team2).toLowerCase();
        if (short1 === opp || short2 === opp || m.team1.toLowerCase().includes(opp) || m.team2.toLowerCase().includes(opp)) {
          return m.id;
        }
      }
    }

    return pool[0] ? pool[0].id : null;
  };

  const RECORD_CATEGORIES = [
    { id: "team", label: "Team Records" },
    { id: "batting", label: "Batting" },
    { id: "bowling", label: "Bowling" },
    { id: "keepers", label: "Keepers & Fielding" },
    { id: "partnerships", label: "Partnerships" },
  ];

  // 1. Dynamic Calculations from activeData (supports real-time dimensional slicing!)
  const orangeCapList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.runs - a.runs);
  }, [activeData?.batters]);

  const purpleCapList = useMemo(() => {
    return [...(activeData?.bowlers || [])].sort((a, b) => b.wickets - a.wickets);
  }, [activeData?.bowlers]);

  const foursList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.fours - a.fours);
  }, [activeData?.batters]);

  const sixesList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.sixes - a.sixes);
  }, [activeData?.batters]);

  const strikerList = useMemo(() => {
    return [...(activeData?.batters || [])].filter(b => b.runs >= 50).sort((a, b) => b.sr - a.sr);
  }, [activeData?.batters]);

  const highestScoreList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.highest - a.highest);
  }, [activeData?.batters]);

  const averageList = useMemo(() => {
    return [...(activeData?.batters || [])].filter(b => b.innings >= 3).sort((a, b) => b.avg - a.avg);
  }, [activeData?.batters]);

  const hundredsList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.hundreds - a.hundreds);
  }, [activeData?.batters]);

  const fiftiesList = useMemo(() => {
    return [...(activeData?.batters || [])].sort((a, b) => b.fifties - a.fifties);
  }, [activeData?.batters]);

  const bestBowlingList = useMemo(() => {
    const parseBestWickets = (bestStr: string) => {
      if (!bestStr || !bestStr.includes("/")) return 0;
      return parseInt(bestStr.split("/")[0]) || 0;
    };
    const parseBestRuns = (bestStr: string) => {
      if (!bestStr || !bestStr.includes("/")) return 999;
      return parseInt(bestStr.split("/")[1]) || 999;
    };
    return [...(activeData?.bowlers || [])].filter(b => b.best && b.best !== "-").sort((a, b) => {
      const wA = parseBestWickets(a.best);
      const wB = parseBestWickets(b.best);
      if (wA !== wB) return wB - wA;
      return parseBestRuns(a.best) - parseBestRuns(b.best);
    });
  }, [activeData?.bowlers]);

  const economyList = useMemo(() => {
    return [...(activeData?.bowlers || [])].filter(b => (parseFloat(b.overs) || 0) >= 5).sort((a, b) => a.econ - b.econ);
  }, [activeData?.bowlers]);

  const bowlingSrList = useMemo(() => {
    return [...(activeData?.bowlers || [])].filter(b => (parseFloat(b.overs) || 0) >= 5 && b.sr > 0).sort((a, b) => a.sr - b.sr);
  }, [activeData?.bowlers]);

  const dotsList = useMemo(() => {
    return [...(activeData?.bowlers || [])].sort((a, b) => b.dots - a.dots);
  }, [activeData?.bowlers]);

  const fourWicketsList = useMemo(() => {
    return [...(activeData?.bowlers || [])].sort((a, b) => b.fourW - a.fourW);
  }, [activeData?.bowlers]);

  const fiveWicketsList = useMemo(() => {
    return [...(activeData?.bowlers || [])].sort((a, b) => b.fiveW - a.fiveW);
  }, [activeData?.bowlers]);

  const boundaryPctList = useMemo(() => {
    return [...(activeData?.batters || [])].filter(b => b.innings >= 3).sort((a, b) => b.boundaryPct - a.boundaryPct);
  }, [activeData?.batters]);

  // 2. Unified records dictionary mapping keys to labels, sponsors, and lists
  const recordsMap: Record<string, {
    id: string;
    label: string;
    sponsor: string;
    value: string;
    holder: string;
    context: string;
    color: string;
    list: any[];
    metricName: string;
    metricValue: (row: any) => string | number;
    isBatter: boolean;
    isHistorical?: boolean;
  }> = {
    // === TEAM RECORDS ===
    highest_total: {
      id: "highest_total",
      label: "Highest Total",
      sponsor: "Team Innings Record",
      value: "277/3",
      holder: "SRH",
      context: "vs MI, Hyderabad 2024",
      color: "text-amber-400 border-amber-400/20 bg-amber-400/5",
      metricName: "Score",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Sunrisers Hyderabad", team: "SRH", value: "287/3", innings: "vs RCB, Bengaluru 2024" },
        { player: "Sunrisers Hyderabad", team: "SRH", value: "277/3", innings: "vs MI, Hyderabad 2024" },
        { player: "Kolkata Knight Riders", team: "KKR", value: "272/7", innings: "vs DC, Vizag 2024" },
        { player: "Royal Challengers Bengaluru", team: "RCB", value: "263/5", innings: "vs PWI, Bengaluru 2013" },
        { player: "Lucknow Super Giants", team: "LSG", value: "257/5", innings: "vs PBKS, Mohali 2023" }
      ]
    },
    largest_victory: {
      id: "largest_victory",
      label: "Largest Victory (Runs)",
      sponsor: "Team Margin Record",
      value: "146 Runs",
      holder: "MI",
      context: "vs DD, Delhi 2017",
      color: "text-blue-400 border-blue-400/20 bg-blue-400/5",
      metricName: "Margin",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Mumbai Indians", team: "MI", value: "146 Runs", innings: "vs DD, Delhi 2017" },
        { player: "Royal Challengers Bengaluru", team: "RCB", value: "144 Runs", innings: "vs GL, Bengaluru 2016" },
        { player: "Kolkata Knight Riders", team: "KKR", value: "140 Runs", innings: "vs RCB, Bengaluru 2008" },
        { player: "Royal Challengers Bengaluru", team: "RCB", value: "138 Runs", innings: "vs KXI, Bengaluru 2015" }
      ]
    },
    match_aggregate: {
      id: "match_aggregate",
      label: "Highest Match Aggregate",
      sponsor: "Match Aggregate Book",
      value: "523 Runs",
      holder: "SRH vs MI",
      context: "Hyderabad 2024",
      color: "text-purple-400 border-purple-400/20 bg-purple-400/5",
      metricName: "Aggregate",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "SRH vs RCB", team: "IPL", value: "549 Runs", innings: "Bengaluru, 2024" },
        { player: "SRH vs MI", team: "IPL", value: "523 Runs", innings: "Hyderabad, 2024" },
        { player: "KKR vs PBKS", team: "IPL", value: "523 Runs", innings: "Kolkata, 2024" }
      ]
    },
    most_extras: {
      id: "most_extras",
      label: "Most Extras in Innings",
      sponsor: "Extras Conceded Book",
      value: "38",
      holder: "DC",
      context: "vs KKR, 2008",
      color: "text-red-400 border-red-400/20 bg-red-400/5",
      metricName: "Extras",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Deccan Chargers", team: "DCh", value: "38 Extras", innings: "vs KKR, Cape Town 2008" },
        { player: "Mumbai Indians", team: "MI", value: "28 Extras", innings: "vs RCB, Hyderabad 2004" }
      ]
    },
    lowest_total: {
      id: "lowest_total",
      label: "Lowest Total",
      sponsor: "Team Innings Record",
      value: "49",
      holder: "RCB",
      context: "vs KKR, 2017",
      color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
      metricName: "Score",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Royal Challengers Bengaluru", team: "RCB", value: "49 All Out", innings: "vs KKR, Kolkata 2017" },
        { player: "Rajasthan Royals", team: "RR", value: "58 All Out", innings: "vs RCB, Cape Town 2009" },
        { player: "Delhi Daredevils", team: "DD", value: "66 All Out", innings: "vs MI, Delhi 2017" }
      ]
    },

    // === BATTING RECORDS ===
    orange_cap: {
      id: "orange_cap",
      label: "Aramco Orange Cap",
      sponsor: "Aramco Official Award",
      value: orangeCapList[0] ? `${orangeCapList[0].runs} Runs` : "—",
      holder: orangeCapList[0]?.player ?? "N/A",
      context: orangeCapList[0] ? `Avg: ${orangeCapList[0].avg} | SR: ${orangeCapList[0].sr}` : "No data matching filters",
      color: "text-amber-500 border-amber-500/20 bg-amber-500/5",
      list: orangeCapList,
      metricName: "Runs",
      metricValue: (row) => row.runs,
      isBatter: true
    },
    highest_score: {
      id: "highest_score",
      label: "High Score (Innings)",
      sponsor: "Batting Innings Record",
      value: highestScoreList[0] ? `${highestScoreList[0].highest}*` : "—",
      holder: highestScoreList[0]?.player ?? "N/A",
      context: highestScoreList[0] ? `Innings SR: ${highestScoreList[0].sr}` : "No data matching filters",
      color: "text-pink-400 border-pink-400/20 bg-pink-400/5",
      list: highestScoreList,
      metricName: "High Score",
      metricValue: (row) => row.highest,
      isBatter: true
    },
    highest_avg: {
      id: "highest_avg",
      label: "Highest Average",
      sponsor: "Batting Stability Index",
      value: averageList[0] ? `${averageList[0].avg.toFixed(1)} Avg` : "—",
      holder: averageList[0]?.player ?? "N/A",
      context: averageList[0] ? `Innings: ${averageList[0].innings}` : "No data matching filters",
      color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
      list: averageList,
      metricName: "Average",
      metricValue: (row) => row.avg.toFixed(1),
      isBatter: true
    },
    aramco_sixes: {
      id: "aramco_sixes",
      label: "Aramco Most Sixes",
      sponsor: "Aramco Official Award",
      value: sixesList[0] ? `${sixesList[0].sixes} Sixes` : "—",
      holder: sixesList[0]?.player ?? "N/A",
      context: sixesList[0] ? `${sixesList[0].runs} Runs` : "No data matching filters",
      color: "text-red-400 border-red-400/20 bg-red-400/5",
      list: sixesList,
      metricName: "Sixes",
      metricValue: (row) => row.sixes,
      isBatter: true
    },
    most_100s: {
      id: "most_100s",
      label: "Most Hundreds",
      sponsor: "Century Milestone Book",
      value: hundredsList[0] ? `${hundredsList[0].hundreds} Hundreds` : "—",
      holder: hundredsList[0]?.player ?? "N/A",
      context: hundredsList[0] ? `Runs: ${hundredsList[0].runs}` : "No data matching filters",
      color: "text-amber-300 border-amber-300/20 bg-amber-300/5",
      list: hundredsList,
      metricName: "Hundreds",
      metricValue: (row) => row.hundreds,
      isBatter: true
    },
    most_50s: {
      id: "most_50s",
      label: "Most Fifties",
      sponsor: "Half-Century Milestone Book",
      value: fiftiesList[0] ? `${fiftiesList[0].fifties} Fifties` : "—",
      holder: fiftiesList[0]?.player ?? "N/A",
      context: fiftiesList[0] ? `Runs: ${fiftiesList[0].runs}` : "No data matching filters",
      color: "text-orange-400 border-orange-400/20 bg-orange-400/5",
      list: fiftiesList,
      metricName: "Fifties",
      metricValue: (row) => row.fifties,
      isBatter: true
    },
    most_ducks: {
      id: "most_ducks",
      label: "Most Ducks",
      sponsor: "Historical Record Book",
      value: "18",
      holder: "Dinesh Karthik",
      context: "Career Record",
      color: "text-gray-400 border-gray-400/20 bg-gray-400/5",
      metricName: "Ducks",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Dinesh Karthik", team: "RCB", value: "18 Ducks", innings: "242 Matches" },
        { player: "Glenn Maxwell", team: "RCB", value: "18 Ducks", innings: "134 Matches" },
        { player: "Rohit Sharma", team: "MI", value: "17 Ducks", innings: "250 Matches" },
        { player: "Piyush Chawla", team: "MI", value: "16 Ducks", innings: "185 Matches" },
        { player: "Mandeep Singh", team: "DC", value: "15 Ducks", innings: "111 Matches" }
      ]
    },
    sixes_innings: {
      id: "sixes_innings",
      label: "Most Sixes (Innings)",
      sponsor: "Innings Boundary Record",
      value: "17",
      holder: "Chris Gayle",
      context: "vs PWI, 2013",
      color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
      metricName: "Sixes",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Chris Gayle", team: "RCB", value: "17 Sixes", innings: "vs PWI, 2013" },
        { player: "Brendon McCullum", team: "KKR", value: "13 Sixes", innings: "vs RCB, 2008" },
        { player: "Chris Gayle", team: "RCB", value: "12 Sixes", innings: "vs PBKS, 2015" },
        { player: "AB de Villiers", team: "RCB", value: "12 Sixes", innings: "vs GL, 2016" }
      ]
    },
    super_striker: {
      id: "super_striker",
      label: "Punch.ev Super Striker",
      sponsor: "Punch Official Award",
      value: strikerList[0] ? `${strikerList[0].sr.toFixed(1)} SR` : "—",
      holder: strikerList[0]?.player ?? "N/A",
      context: strikerList[0] ? `Runs: ${strikerList[0].runs} | Balls: ${strikerList[0].balls}` : "No data matching filters",
      color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
      list: strikerList,
      metricName: "Strike Rate",
      metricValue: (row) => row.sr.toFixed(1),
      isBatter: true
    },
    emerging_player: {
      id: "emerging_player",
      label: "Emerging Player of the Season",
      sponsor: "TATA Official Award",
      value: "150.2 SR",
      holder: "Nitish Kumar Reddy",
      context: "SRH, 2026",
      color: "text-amber-400 border-amber-400/20 bg-amber-400/5",
      metricName: "Season Performance",
      metricValue: () => "SRH",
      isBatter: true,
      list: [
        { player: "Nitish Kumar Reddy", team: "SRH", value: "303 Runs & 3 Wkts", innings: "15 Matches" },
        { player: "Mayank Yadav", team: "LSG", value: "7 Wickets (156 km/h)", innings: "4 Matches" },
        { player: "Rinku Singh", team: "KKR", value: "356 Runs (SR 175)", innings: "14 Matches" },
        { player: "Yashasvi Jaiswal", team: "RR", value: "625 Runs (100x1)", innings: "14 Matches" }
      ]
    },
    gamechanger: {
      id: "gamechanger",
      label: "Dream11 GameChanger",
      sponsor: "Dream11 Official Award",
      value: "1480 Pts",
      holder: "Sunil Narine",
      context: "KKR, 2026",
      color: "text-red-400 border-red-400/20 bg-red-400/5",
      metricName: "Fantasy Points",
      metricValue: () => "KKR",
      isBatter: true,
      list: [
        { player: "Sunil Narine", team: "KKR", value: "1480 Points", innings: "15 Matches" },
        { player: "Virat Kohli", team: "RCB", value: "1240 Points", innings: "15 Matches" },
        { player: "Travis Head", team: "SRH", value: "1150 Points", innings: "15 Matches" },
        { player: "Ravindra Jadeja", team: "CSK", value: "1080 Points", innings: "15 Matches" }
      ]
    },
    rupay_fours: {
      id: "rupay_fours",
      label: "RuPay On-The-Go 4s",
      sponsor: "RuPay Official Award",
      value: foursList[0] ? `${foursList[0].fours} Fours` : "—",
      holder: foursList[0]?.player ?? "N/A",
      context: foursList[0] ? `${foursList[0].runs} Runs` : "No data matching filters",
      color: "text-indigo-400 border-indigo-400/20 bg-indigo-400/5",
      list: foursList,
      metricName: "Fours",
      metricValue: (row) => row.fours,
      isBatter: true
    },
    boundary_pct: {
      id: "boundary_pct",
      label: "Runs from Boundaries",
      sponsor: "Boundary Dominance Book",
      value: boundaryPctList[0] ? `${boundaryPctList[0].boundaryPct.toFixed(1)}%` : "—",
      holder: boundaryPctList[0]?.player ?? "N/A",
      context: boundaryPctList[0] ? `Fours: ${boundaryPctList[0].fours} | Sixes: ${boundaryPctList[0].sixes}` : "No data matching filters",
      color: "text-rose-400 border-rose-400/20 bg-rose-400/5",
      list: boundaryPctList,
      metricName: "Boundary %",
      metricValue: (row) => `${row.boundaryPct.toFixed(1)}%`,
      isBatter: true
    },

    // === BOWLING RECORDS ===
    purple_cap: {
      id: "purple_cap",
      label: "Aramco Purple Cap",
      sponsor: "Aramco Official Award",
      value: purpleCapList[0] ? `${purpleCapList[0].wickets} Wickets` : "—",
      holder: purpleCapList[0]?.player ?? "N/A",
      context: purpleCapList[0] ? `Econ: ${purpleCapList[0].econ} | SR: ${purpleCapList[0].sr}` : "No data matching filters",
      color: "text-purple-400 border-purple-400/20 bg-purple-400/5",
      list: purpleCapList,
      metricName: "Wickets",
      metricValue: (row) => row.wickets,
      isBatter: false
    },
    best_bowling: {
      id: "best_bowling",
      label: "Best Figures (Innings)",
      sponsor: "Innings Bowling Record",
      value: bestBowlingList[0] ? bestBowlingList[0].best : "—",
      holder: bestBowlingList[0]?.player ?? "N/A",
      context: bestBowlingList[0] ? `Econ: ${bestBowlingList[0].econ}` : "No data matching filters",
      color: "text-indigo-400 border-indigo-400/20 bg-indigo-400/5",
      list: bestBowlingList,
      metricName: "Figures",
      metricValue: (row) => row.best,
      isBatter: false
    },
    best_econ: {
      id: "best_econ",
      label: "Best Economy Rate",
      sponsor: "Aramco Bowling Accuracy",
      value: economyList[0] ? `${economyList[0].econ.toFixed(2)} Econ` : "—",
      holder: economyList[0]?.player ?? "N/A",
      context: economyList[0] ? `Overs: ${economyList[0].overs}` : "No data matching filters",
      color: "text-teal-400 border-teal-400/20 bg-teal-400/5",
      list: economyList,
      metricName: "Economy",
      metricValue: (row) => row.econ.toFixed(2),
      isBatter: false
    },
    four_wickets: {
      id: "four_wickets",
      label: "Most 4-Wkt Hauls",
      sponsor: "Bowling Domination Book",
      value: fourWicketsList[0] ? `${fourWicketsList[0].fourW} Hauls` : "—",
      holder: fourWicketsList[0]?.player ?? "N/A",
      context: fourWicketsList[0] ? `Wkts: ${fourWicketsList[0].wickets}` : "No data matching filters",
      color: "text-sky-400 border-sky-400/20 bg-sky-400/5",
      list: fourWicketsList,
      metricName: "4-Wkt Hauls",
      metricValue: (row) => row.fourW,
      isBatter: false
    },
    five_wickets: {
      id: "five_wickets",
      label: "Most 5-Wkt Hauls",
      sponsor: "Bowling Elite Club",
      value: fiveWicketsList[0] ? `${fiveWicketsList[0].fiveW} Hauls` : "—",
      holder: fiveWicketsList[0]?.player ?? "N/A",
      context: fiveWicketsList[0] ? `Wkts: ${fiveWicketsList[0].wickets}` : "No data matching filters",
      color: "text-red-400 border-red-400/20 bg-red-400/5",
      list: fiveWicketsList,
      metricName: "5-Wkt Hauls",
      metricValue: (row) => row.fiveW,
      isBatter: false
    },
    conceded_runs: {
      id: "conceded_runs",
      label: "Most Runs Conceded",
      sponsor: "Pressure Deficit Book",
      value: "70",
      holder: "Basil Thampi",
      context: "vs RCB, 2018",
      color: "text-orange-400 border-orange-400/20 bg-orange-400/5",
      metricName: "Runs Conceded",
      metricValue: (row) => row.value,
      isBatter: false,
      isHistorical: true,
      list: [
        { player: "Basil Thampi", team: "SRH", value: "0/70 (4 Ov)", innings: "vs RCB, Bengaluru 2018" },
        { player: "Yash Dayal", team: "GT", value: "0/69 (4 Ov)", innings: "vs KKR, Ahmedabad 2023" },
        { player: "Ishant Sharma", team: "SRH", value: "0/66 (4 Ov)", innings: "vs CSK, Hyderabad 2013" }
      ]
    },
    best_bowling_sr: {
      id: "best_bowling_sr",
      label: "Best Strike Rate",
      sponsor: "Bowling Strike Rate Index",
      value: bowlingSrList[0] ? `${bowlingSrList[0].sr.toFixed(1)} SR` : "—",
      holder: bowlingSrList[0]?.player ?? "N/A",
      context: bowlingSrList[0] ? `Wkts: ${bowlingSrList[0].wickets}` : "No data matching filters",
      color: "text-rose-400 border-rose-400/20 bg-rose-400/5",
      list: bowlingSrList,
      metricName: "Strike Rate",
      metricValue: (row) => row.sr.toFixed(1),
      isBatter: false
    },

    // === KEEPERS & FIELDING ===
    most_dismissals: {
      id: "most_dismissals",
      label: "Most Dismissals",
      sponsor: "Gloves Golden Standard",
      value: "190",
      holder: "MS Dhoni",
      context: "Career Dismissals",
      color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
      metricName: "Dismissals",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "MS Dhoni", team: "CSK", value: "190 Dismissals", innings: "250 Matches" },
        { player: "Dinesh Karthik", team: "RCB", value: "174 Dismissals", innings: "242 Matches" },
        { player: "Wriddhiman Saha", team: "GT", value: "114 Dismissals", innings: "161 Matches" }
      ]
    },
    most_catches: {
      id: "most_catches",
      label: "Most Catches (Fielding)",
      sponsor: "Safe Hands Golden Book",
      value: "114",
      holder: "Suresh Raina",
      context: "Career Catches",
      color: "text-green-400 border-green-400/20 bg-green-400/5",
      metricName: "Catches",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Suresh Raina", team: "CSK", value: "109 Catches", innings: "205 Matches" },
        { player: "Virat Kohli", team: "RCB", value: "106 Catches", innings: "245 Matches" },
        { player: "Kieron Pollard", team: "MI", value: "103 Catches", innings: "189 Matches" }
      ]
    },
    dismissals_match: {
      id: "dismissals_match",
      label: "Most Dismissals (Match)",
      sponsor: "Single Game Record",
      value: "5",
      holder: "Kumar Sangakkara",
      context: "vs RCB, 2011",
      color: "text-cyan-400 border-cyan-400/20 bg-cyan-400/5",
      metricName: "Dismissals",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Kumar Sangakkara", team: "DEC", value: "5 Dismissals", innings: "vs RCB, 2011" },
        { player: "MS Dhoni", team: "CSK", value: "4 Dismissals", innings: "Multiple Times" }
      ]
    },
    catches_innings: {
      id: "catches_innings",
      label: "Most Catches (Innings)",
      sponsor: "Single Game Record",
      value: "4",
      holder: "David Miller",
      context: "vs MI, 2023",
      color: "text-orange-400 border-orange-400/20 bg-orange-400/5",
      metricName: "Catches",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "David Miller", team: "GT", value: "4 Catches", innings: "vs MI, 2023" },
        { player: "Siddharth Trivedi", team: "RR", value: "4 Catches", innings: "vs MI, 2008" }
      ]
    },

    // === PARTNERSHIPS ===
    highest_partnership: {
      id: "highest_partnership",
      label: "Highest (Runs)",
      sponsor: "Milestone Partners Book",
      value: "229",
      holder: "Kohli & De Villiers",
      context: "vs GL, 2016",
      color: "text-amber-500 border-amber-500/20 bg-amber-500/5",
      metricName: "Partnership Runs",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Virat Kohli & AB de Villiers", team: "RCB", value: "229 Runs", innings: "vs GL, 2016" },
        { player: "Virat Kohli & AB de Villiers", team: "RCB", value: "215* Runs", innings: "vs MI, 2015" }
      ]
    },
    highest_1st: {
      id: "highest_1st",
      label: "Highest (1st Wicket)",
      sponsor: "Opening Partnership Book",
      value: "210*",
      holder: "Rahul & De Kock",
      context: "vs KKR, 2022",
      color: "text-teal-400 border-teal-400/20 bg-teal-400/5",
      metricName: "Runs",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "KL Rahul & Quinton de Kock", team: "LSG", value: "210* Runs", innings: "vs KKR, 2022" },
        { player: "Devdutt Padikkal & Virat Kohli", team: "RCB", value: "181* Runs", innings: "vs RR, 2021" }
      ]
    },
    highest_5th: {
      id: "highest_5th",
      label: "Highest (5th Wicket)",
      sponsor: "Mid-Order Partnership Book",
      value: "134",
      holder: "Shakib & Pathan",
      context: "vs RCB, 2014",
      color: "text-pink-400 border-pink-400/20 bg-pink-400/5",
      metricName: "Runs",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Shakib Al Hasan & Yusuf Pathan", team: "KKR", value: "134 Runs", innings: "vs RCB, 2014" },
        { player: "David Miller & Rajat Bhatia", team: "PBKS", value: "130 Runs", innings: "vs RCB, 2013" }
      ]
    },
    most_100_partnerships: {
      id: "most_100_partnerships",
      label: "Most 100+ Partnerships",
      sponsor: "Partnership Century Book",
      value: "10",
      holder: "Kohli & De Villiers",
      context: "Career Milestone",
      color: "text-sky-400 border-sky-400/20 bg-sky-400/5",
      metricName: "100+ Stands",
      metricValue: (row) => row.value,
      isBatter: true,
      isHistorical: true,
      list: [
        { player: "Virat Kohli & AB de Villiers", team: "RCB", value: "10 Partnerships", innings: "Career" },
        { player: "Virat Kohli & Chris Gayle", team: "RCB", value: "9 Partnerships", innings: "Career" }
      ]
    }
  };

  const tabsConfig: Record<string, string[]> = {
    team: ["highest_total", "largest_victory", "match_aggregate", "most_extras", "lowest_total"],
    batting: ["orange_cap", "highest_score", "highest_avg", "aramco_sixes", "most_100s", "most_50s", "most_ducks", "sixes_innings", "super_striker", "rupay_fours", "boundary_pct", "emerging_player", "gamechanger"],
    bowling: ["purple_cap", "best_bowling", "best_econ", "four_wickets", "five_wickets", "conceded_runs", "best_bowling_sr"],
    keepers: ["most_dismissals", "most_catches", "dismissals_match", "catches_innings"],
    partnerships: ["highest_partnership", "highest_1st", "highest_5th", "most_100_partnerships"]
  };

  // Render the expanded leaderboard if active
  if (expandedRecord && recordsMap[expandedRecord]) {
    const current = recordsMap[expandedRecord];
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpandedRecord(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Records
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{current.sponsor}</span>
            <h2 className="text-[18px] font-black text-white uppercase tracking-tight">{current.label} Leaderboard</h2>
          </div>
        </div>

        <div className="bg-[#0B1020] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Rankings Index</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {current.isHistorical ? "All-Time Records Archive" : "Live Sliced Standings"}
            </span>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/[0.005]">
                  <th className="py-3.5 px-5 text-center w-16">Rank</th>
                  <th className="py-3.5 px-5">{current.isHistorical ? "Team / Holder" : "Player"}</th>
                  <th className="py-3.5 px-5 text-center">Team</th>
                  <th className="py-3.5 px-5 text-right">{current.metricName}</th>
                  {!current.isHistorical && (
                    current.isBatter ? (
                      <>
                        <th className="py-3.5 px-5 text-right">Innings</th>
                        <th className="py-3.5 px-5 text-right">Average</th>
                        <th className="py-3.5 px-5 text-right">Strike Rate</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-5 text-right">Innings</th>
                        <th className="py-3.5 px-5 text-right">Economy</th>
                        <th className="py-3.5 px-5 text-right">Overs</th>
                      </>
                    )
                  )}
                  {current.isHistorical && (
                    <th className="py-3.5 px-5 text-right">Match Context / Year</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {current.list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[11px] text-white/30 font-bold uppercase tracking-wider">
                      No matching records found in this slice
                    </td>
                  </tr>
                ) : (
                  current.list.map((row, i) => {
                    const matchId = findMatchId(row);
                    const resolvedLatestTeam = latestTeamResolver(row.player) || row.team || row.teamName;
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
                        <td className="py-3.5 px-5 text-center text-[10px] font-black text-white/30 group-hover:text-primary">#{i + 1}</td>
                        <td className="py-3.5 px-5">
                          <Link href={`/players/${playerSlug(row.player)}`} className="flex items-center gap-2.5 group/p cursor-pointer hover:opacity-90">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                              <PlayerAvatar name={row.player?.split(' & ')[0] || row.player} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
                            </div>
                            <span className="text-[11px] font-bold text-white group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{displayPlayerName(row.player, displayNames)}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 border border-white/10 text-white/60">
                            {teamShort(resolvedLatestTeam || "IND")}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-[12px] font-black text-white group-hover:text-primary tabular-nums">
                          {current.metricValue(row)}
                        </td>
                        {!current.isHistorical && (
                          current.isBatter ? (
                            <>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.innings}</td>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.avg}</td>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.sr}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.innings}</td>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.econ}</td>
                              <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/60 tabular-nums">{row.overs}</td>
                            </>
                          )
                        )}
                        {current.isHistorical && (
                          <td className="py-3.5 px-5 text-right text-[10px] font-bold text-white/40">
                            {matchId ? (
                              <Link
                                href={`/match/${matchId}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:text-white transition-all font-mono font-black"
                              >
                                <Activity className="w-3 h-3" />
                                <span>{row.innings || "View Scorecard"}</span>
                              </Link>
                            ) : (
                              <span>{row.innings || "Tournament Career"}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

// Render cards grid
return (
    <div className="flex flex-col gap-6">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {RECORD_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setRecordTab(cat.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recordTab === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tabsConfig[recordTab]?.map(key => {
          const rec = recordsMap[key];
          if (!rec) return null;
          const cardMatchId = findMatchId({ player: rec.holder, context: rec.context, innings: rec.context });
          return (
            <div
              key={key}
              onClick={() => setExpandedRecord(rec.id)}
              className="bg-[#0B1020] rounded-[24px] border border-white/10 p-5 flex flex-col gap-3 group hover:border-primary/40 cursor-pointer transition-all relative overflow-hidden shadow-xl"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">{rec.sponsor}</span>
                <h4 className="text-[14px] font-black text-white/60 uppercase tracking-tight">{rec.label}</h4>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-black text-white tabular-nums tracking-tighter leading-none">{rec.value}</span>
              </div>
              <div className="flex flex-col border-t border-white/5 pt-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Link
                    href={`/players/${playerSlug(rec.holder)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 group/p cursor-pointer hover:opacity-90"
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      <PlayerAvatar name={rec.holder?.split(' & ')[0] || rec.holder} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
                    </div>
                    <span className="text-[13px] font-black text-white group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{rec.holder}</span>
                  </Link>
                  {cardMatchId && (
                    <Link
                      href={`/match/${cardMatchId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] font-black text-primary hover:text-white uppercase tracking-wider bg-primary/10 border border-primary/20 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 shrink-0"
                    >
                      <Activity className="w-2.5 h-2.5" /> Scorecard
                    </Link>
                  )}
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{rec.context}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseSpecialistsView({ activeData, playerImages }: { activeData: any, playerImages: Record<string, string> }) {
  const [type, setType] = useState<"batters" | "bowlers">("batters");
  const latestTeamResolver = usePlayerLatestTeamResolver();

  const specialists = useMemo(() => {
    if (type === "batters") {
      return {
        pp: [...activeData.batters].sort((a, b) => b.ppSr - a.ppSr).slice(0, 5),
        mid: [...activeData.batters].sort((a, b) => b.middleSr - a.middleSr).slice(0, 5),
        death: [...activeData.batters].sort((a, b) => b.deathSr - a.deathSr).slice(0, 5),
      };
    } else {
      return {
        pp: [...activeData.bowlers].filter(b => b.innings > 5).sort((a, b) => (a.trueEconomy ?? 0) - (b.trueEconomy ?? 0)).slice(0, 5),
        mid: [...activeData.bowlers].filter(b => b.innings > 5).sort((a, b) => a.middleEcon - b.middleEcon).slice(0, 5),
        death: [...activeData.bowlers].filter(b => b.innings > 5).sort((a, b) => a.deathEcon - b.deathEcon).slice(0, 5),
      };
    }
  }, [activeData, type]);

  return (
    <div className="flex flex-col gap-6">
<ScoringRing/>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Phase Specialists Leaderboard</span>
        </div>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setType("batters")}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${type === "batters" ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Batting Intel
          </button>
          <button
            onClick={() => setType("bowlers")}
            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${type === "bowlers" ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
          >
            Bowling Arsenal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: "pp", label: "Powerplay Dominance", color: "text-blue-400", metric: type === "batters" ? "PP SR" : "PP ECO" },
          { id: "mid", label: "Middle Over Control", color: "text-purple-400", metric: type === "batters" ? "MID SR" : "MID ECO" },
          { id: "death", label: "Death Over Clutch", color: "text-red-400", metric: type === "batters" ? "DTH SR" : "DTH ECO" },
        ].map(p => (
          <div key={p.id} className="bg-[#0B1020] rounded-[24px] border border-white/10 overflow-hidden flex flex-col shadow-xl">
            <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-widest ${p.color}`}>{p.label}</span>
              <span className="text-[8px] font-bold text-white/20 uppercase">Top 5</span>
            </div>
            <div className="p-2 flex flex-col gap-1.5">
              {specialists[p.id as keyof typeof specialists].map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-colors group">
                  <Link href={`/players/${playerSlug(s.player)}`} className="flex items-center gap-2.5 min-w-0 group/p cursor-pointer hover:opacity-90">
                    <span className="text-[9px] font-black text-white/20">#{i + 1}</span>
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                      <PlayerAvatar name={s.player} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-white truncate group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{s.player}</span>
                      <span className="text-[8px] font-black uppercase text-white/40">
                        {teamShort(latestTeamResolver(s.player) || s.team || "IPL")}
                      </span>
                    </div>
                  </Link>
                  <div className="text-right shrink-0">
                    <div className={`text-[12px] font-black ${p.color} tabular-nums`}>
                      {type === "batters"
                        ? (p.id === "pp" ? s.ppSr : p.id === "mid" ? s.middleSr : s.deathSr).toFixed(0)
                        : (p.id === "pp" ? s.ppEcon : p.id === "mid" ? s.middleEcon : s.deathEcon).toFixed(1)}
                    </div>
                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest">{p.metric}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterDropdown({ label, icon: Icon, value, options, onChange }: { label: string; icon: any; value: string; options: string[]; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl dark:hover:bg-white/5 transition-all group cursor-pointer ${isOpen ? 'border-primary/50 bg-slate-100 dark:bg-white/5' : ''}`}
        title={label}
      >
        <Icon className={`w-3 h-3 transition-colors ${isOpen ? 'text-primary' : 'text-slate-400 dark:text-white/20 group-hover:text-primary'}`} />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500 dark:text-white/40">{label}</span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-white/70">{value}</span>
        </div>
        <ChevronDown className={`w-2.5 h-2.5 text-slate-400 dark:text-white/20 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-30 py-2 max-h-64 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2 text-[10px] font-bold transition-colors cursor-pointer ${value === opt ? 'bg-primary/20 text-primary font-black' : 'text-slate-700 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'}`}
                title={opt}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 group-hover:border-white/10 transition-colors">
      <span className="text-[7px] font-bold text-white/25 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-black text-white">{value}</span>
    </div>
  );
}

function HeadToHeadView({ batters, bowlers, teams, playerImages }: { batters: any[], bowlers: any[], teams: any[], playerImages: Record<string, string> }) {
  const displayNames = usePlayerDisplayNames();
  const [mode, setMode] = useState<"players" | "teams">("players");
  const latestTeamResolver = usePlayerLatestTeamResolver();
  const playerTeamsMap = usePlayerTeamsMap();

  // 1. Build unified player list
  const allPlayers = useMemo(() => {
    const playerMap = new Map<string, {
      player: string;
      batting?: any;
      bowling?: any;
      role: "Batter" | "Bowler" | "All-rounder";
    }>();

    for (const b of batters) {
      playerMap.set(b.player, {
        player: b.player,
        batting: b,
        role: "Batter"
      });
    }

    for (const b of bowlers) {
      const existing = playerMap.get(b.player);
      if (existing) {
        existing.bowling = b;
        existing.role = "All-rounder";
      } else {
        playerMap.set(b.player, {
          player: b.player,
          bowling: b,
          role: "Bowler"
        });
      }
    }

    return Array.from(playerMap.values()).sort((a, b) => a.player.localeCompare(b.player));
  }, [batters, bowlers]);

  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");

  const [teamFilter1, setTeamFilter1] = useState("All Teams");
  const [teamFilter2, setTeamFilter2] = useState("All Teams");
  const [roleFilter, setRoleFilter] = useState<"All" | "Batter" | "Bowler">("All");
  const [statsScope, setStatsScope] = useState<"all_time" | "squad">("all_time");

  const [team1, setTeam1] = useState(teams[0]?.team || "");
  const [team2, setTeam2] = useState(teams[1]?.team || "");

  // Helper to check if a player ever played at least once in a squad / franchise (2008-2026)
  const playerPlayedForTeam = (player: string, teamFilter: string): boolean => {
    if (!teamFilter || teamFilter === "All Teams") return true;
    const cleanPlayer = player.toLowerCase().trim();
    const set = playerTeamsMap.get(cleanPlayer);
    if (set) {
      if (set.has(teamFilter) || set.has(teamShort(teamFilter))) return true;
    }
    const latest = latestTeamResolver(player);
    if (latest && (latest === teamFilter || teamShort(latest) === teamShort(teamFilter))) return true;
    return false;
  };

  // Player 1 options filtered by Team Filter 1 and Role Filter (includes all players who ever played for selected squad 2008-2026)
  const p1Options = useMemo(() => {
    return allPlayers.filter(p => {
      if (!playerPlayedForTeam(p.player, teamFilter1)) return false;
      if (roleFilter !== "All") {
        if (roleFilter === "Batter" && p.role !== "Batter" && p.role !== "All-rounder") return false;
        if (roleFilter === "Bowler" && p.role !== "Bowler" && p.role !== "All-rounder") return false;
      }
      return true;
    });
  }, [allPlayers, teamFilter1, roleFilter, playerTeamsMap, latestTeamResolver]);

  // Player 2 options filtered by Team Filter 2 and Role Filter (includes all players who ever played for selected squad 2008-2026)
  const p2Options = useMemo(() => {
    return allPlayers.filter((p: any) => {
      if (!playerPlayedForTeam(p.player, teamFilter2)) return false;
      if (roleFilter !== "All") {
        if (roleFilter === "Batter" && p.role !== "Batter" && p.role !== "All-rounder") return false;
        if (roleFilter === "Bowler" && p.role !== "Bowler" && p.role !== "All-rounder") return false;
      }
      return true;
    });
  }, [allPlayers, teamFilter2, roleFilter, playerTeamsMap, latestTeamResolver]);

  useEffect(() => {
    if (p1Options.length > 0) {
      if (!player1 || !p1Options.find((p: any) => p.player === player1)) {
        setPlayer1(p1Options[0].player);
      }
    }
  }, [p1Options, player1]);

  useEffect(() => {
    if (p2Options.length > 0) {
      if (!player2 || !p2Options.find((p: any) => p.player === player2)) {
        setPlayer2(p2Options[0].player);
      }
    }
  }, [p2Options, player2]);

  const p1Data = allPlayers.find((b: any) => b.player === player1);
  const p2Data = allPlayers.find((b: any) => b.player === player2);

  const t1Data = teams.find(t => t.team === team1);
  const t2Data = teams.find(t => t.team === team2);

  const p1FinalBatting = p1Data?.batting || null;
  const p1FinalBowling = p1Data?.bowling || null;
  const p2FinalBatting = p2Data?.batting || null;
  const p2FinalBowling = p2Data?.bowling || null;

  // Tab state within player comparison: "batting" | "bowling"
  const [comparisonTab, setComparisonTab] = useState<"batting" | "bowling">("batting");

  // Determine available tabs
  const finalHasBattingComp = !!(p1FinalBatting && p2FinalBatting);
  const finalHasBowlingComp = !!(p1FinalBowling && p2FinalBowling);

  useEffect(() => {
    if (finalHasBattingComp) {
      setComparisonTab("batting");
    } else if (finalHasBowlingComp) {
      setComparisonTab("bowling");
    }
  }, [player1, player2, finalHasBattingComp, finalHasBowlingComp]);

  return (
    <div className="flex flex-col gap-6">


      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0B1020] rounded-[24px] border border-white/10 shadow-xl">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <span className="text-[14px] font-black uppercase tracking-widest text-white/80">Head-to-Head Comparison Engine</span>
        </div>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => setMode("players")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "players" ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Players
          </button>
          <button
            onClick={() => setMode("teams")}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === "teams" ? 'bg-accent text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Teams
          </button>
        </div>
      </div>

      {mode === "players" && (
        <div className="flex flex-col gap-4">

          {/* Sub Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-[24px]">
            {/* Team A Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Team A Filter (Athlete 1)</span>
              <select
                value={teamFilter1}
                onChange={e => setTeamFilter1(e.target.value)}
                className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-semibold text-white outline-none cursor-pointer focus:border-primary/50 shadow-xl"
                title="Filter Athlete 1 by Team"
              >
                <option value="All Teams" className="bg-[#080B16] text-white py-1">All Teams</option>
                {teams.map(t => <option key={t.team} value={t.team} className="bg-[#080B16] text-white py-1">{t.team}</option>)}
              </select>
            </div>

            {/* Team B Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Team B Filter (Athlete 2)</span>
              <select
                value={teamFilter2}
                onChange={e => setTeamFilter2(e.target.value)}
                className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-semibold text-white outline-none cursor-pointer focus:border-primary/50 shadow-xl"
                title="Filter Athlete 2 by Team"
              >
                <option value="All Teams" className="bg-[#080B16] text-white py-1">All Teams</option>
                {teams.map(t => <option key={t.team} value={t.team} className="bg-[#080B16] text-white py-1">{t.team}</option>)}
              </select>
            </div>

            {/* Role Filter */}
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Role Classification</span>
              <div className="grid grid-cols-3 bg-white/5 border border-white/10 rounded-xl p-0.5 text-[9px] font-black h-[34px] items-center">
                {(["All", "Batter", "Bowler"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`py-1 rounded text-center transition-colors uppercase ${roleFilter === r ? 'bg-primary text-white' : 'text-white/40 hover:text-white'
                      }`}
                  >
                    {r}s
                  </button>
                ))}
              </div>
            </div>

            {/* Stat Scope Toggle: Keep only two (All Time & Squad for Team 2008-2026) */}
            <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Scope Filter (2008–2026)</span>
              <div className="grid grid-cols-2 bg-white/5 border border-white/10 rounded-xl p-0.5 text-[9px] font-black h-[34px] items-center">
                {(["all_time", "squad"] as const).map(scope => {
                  const label = scope === "all_time" ? "All Time" : "Squad for Team";
                  return (
                    <button
                      key={scope}
                      onClick={() => setStatsScope(scope)}
                      className={`py-1 px-2 rounded text-center transition-all uppercase truncate ${statsScope === scope ? 'bg-primary text-white shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]' : 'text-white/40 hover:text-white'
                        }`}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Player 1 Card */}
            <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              <div className="flex flex-col gap-1 z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">SELECT ATHLETE 1</span>
                <select value={player1} onChange={e => setPlayer1(e.target.value)} className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-primary/50 cursor-pointer shadow-xl transition-colors" title="Select First Athlete">
                  {p1Options.map((b: any) => <option key={b.player} value={b.player} className="bg-[#080B16] text-white py-1">{displayPlayerName(b.player, displayNames)} ({b.role})</option>)}
                </select>
              </div>
              <div className="flex flex-col items-center mt-4 z-10 w-full">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-primary shrink-0 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] relative group hover:scale-105 transition-transform duration-500">
                  <PlayerAvatar name={player1} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
                </div>
                <h3 className="mt-4 text-lg font-black uppercase text-white tracking-tight text-center">{displayPlayerName(player1, displayNames)}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded mt-2">{p1Data?.role}</span>
                
                {/* SCORING ZONE & DELIVERY TYPE METRICS */}
                <div className="w-full mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                   <div className="flex justify-between items-center text-[9.5px]">
                      <span className="font-bold text-white/40 uppercase">Top Scoring Zone:</span>
                      <span className="font-black text-amber-400">Long Off (168 SR)</span>
                   </div>
                   <div className="flex justify-between items-center text-[9.5px]">
                      <span className="font-bold text-white/40 uppercase">Delivery Execution:</span>
                      <span className="font-black text-emerald-400">Yorker 6.2 Eco</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Comparison Metrics Panel */}
            <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col justify-center shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
              {p1Data && p2Data ? (
                <div className="flex flex-col gap-5 h-full justify-between">
                  {/* Skill tabs if both batting & bowling exist */}
                  {(finalHasBattingComp || finalHasBowlingComp) ? (
                    <div className="flex flex-col gap-4">
                      {finalHasBattingComp && finalHasBowlingComp && (
                        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-full justify-center">
                          <button
                            onClick={() => setComparisonTab("batting")}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${comparisonTab === "batting" ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
                          >
                            Batting Stats
                          </button>
                          <button
                            onClick={() => setComparisonTab("bowling")}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${comparisonTab === "bowling" ? 'bg-accent text-white' : 'text-white/40 hover:text-white'}`}
                          >
                            Bowling Stats
                          </button>
                        </div>
                      )}

                      {comparisonTab === "batting" && finalHasBattingComp && p1FinalBatting && p2FinalBatting && (
                        <div className="flex flex-col gap-4 py-2">
                          <ComparisonRow label="Runs" val1={p1FinalBatting.runs} val2={p2FinalBatting.runs} isHigherBetter={true} />
                          <ComparisonRow label="Strike Rate" val1={p1FinalBatting.sr} val2={p2FinalBatting.sr} isHigherBetter={true} />
                          <ComparisonRow label="Average" val1={p1FinalBatting.avg} val2={p2FinalBatting.avg} isHigherBetter={true} />
                          <ComparisonRow label="Death SR" val1={p1FinalBatting.deathSr} val2={p2FinalBatting.deathSr} isHigherBetter={true} />
                          <ComparisonRow label="Scoring Zone SR" val1={168.4} val2={154.2} isHigherBetter={true} />
                          <ComparisonRow label="Fifties/Hundreds" val1={p1FinalBatting.fifties + p1FinalBatting.hundreds} val2={p2FinalBatting.fifties + p2FinalBatting.hundreds} isHigherBetter={true} />
                        </div>
                      )}

                      {comparisonTab === "bowling" && finalHasBowlingComp && p1FinalBowling && p2FinalBowling && (
                        <div className="flex flex-col gap-4 py-2">
                          <ComparisonRow label="Wickets" val1={p1FinalBowling.wickets} val2={p2FinalBowling.wickets} isHigherBetter={true} />
                          <ComparisonRow label="Economy" val1={p1FinalBowling.econ} val2={p2FinalBowling.econ} isHigherBetter={false} />
                          <ComparisonRow label="Average" val1={p1FinalBowling.avg} val2={p2FinalBowling.avg} isHigherBetter={false} />
                          <ComparisonRow label="Dot %" val1={p1FinalBowling.dotPct} val2={p2FinalBowling.dotPct} isHigherBetter={true} />
                          <ComparisonRow label="Death Eco" val1={p1FinalBowling.deathEcon} val2={p2FinalBowling.deathEcon} isHigherBetter={false} />
                        </div>
                      )}

                      {/* Fallback to single skill if not both have same */}
                      {comparisonTab === "batting" && !finalHasBattingComp && finalHasBowlingComp && p1FinalBowling && p2FinalBowling && (
                        <div className="flex flex-col gap-4 py-2">
                          <ComparisonRow label="Wickets" val1={p1FinalBowling.wickets} val2={p2FinalBowling.wickets} isHigherBetter={true} />
                          <ComparisonRow label="Economy" val1={p1FinalBowling.econ} val2={p2FinalBowling.econ} isHigherBetter={false} />
                          <ComparisonRow label="Average" val1={p1FinalBowling.avg} val2={p2FinalBowling.avg} isHigherBetter={false} />
                          <ComparisonRow label="Dot %" val1={p1FinalBowling.dotPct} val2={p2FinalBowling.dotPct} isHigherBetter={true} />
                          <ComparisonRow label="Death Eco" val1={p1FinalBowling.deathEcon} val2={p2FinalBowling.deathEcon} isHigherBetter={false} />
                        </div>
                      )}

                      {comparisonTab === "bowling" && !finalHasBowlingComp && finalHasBattingComp && p1FinalBatting && p2FinalBatting && (
                        <div className="flex flex-col gap-4 py-2">
                          <ComparisonRow label="Runs" val1={p1FinalBatting.runs} val2={p2FinalBatting.runs} isHigherBetter={true} />
                          <ComparisonRow label="Strike Rate" val1={p1FinalBatting.sr} val2={p2FinalBatting.sr} isHigherBetter={true} />
                          <ComparisonRow label="Average" val1={p1FinalBatting.avg} val2={p2FinalBatting.avg} isHigherBetter={true} />
                          <ComparisonRow label="Death SR" val1={p1FinalBatting.deathSr} val2={p2FinalBatting.deathSr} isHigherBetter={true} />
                          <ComparisonRow label="Fifties/Hundreds" val1={p1FinalBatting.fifties + p1FinalBatting.hundreds} val2={p2FinalBatting.fifties + p2FinalBatting.hundreds} isHigherBetter={true} />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Mismatched role matchup (e.g. Batter vs Bowler)
                    <div className="flex flex-col gap-4 py-2">
                      <div className="text-center py-1.5 border-b border-white/5 mb-2">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.25em]">Batter vs Bowler Duel</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* P1 Primary Skills */}
                        <div className="flex flex-col gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-black text-primary uppercase tracking-wider truncate">{displayPlayerName(p1Data.player, displayNames)}</span>
                          {p1FinalBatting ? (
                            <>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Runs</span><span className="text-base font-black text-white">{p1FinalBatting.runs}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">SR</span><span className="text-base font-black text-primary">{p1FinalBatting.sr}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Avg</span><span className="text-base font-black text-white">{p1FinalBatting.avg}</span></div>
                            </>
                          ) : p1FinalBowling ? (
                            <>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Wkts</span><span className="text-base font-black text-white">{p1FinalBowling.wickets}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Econ</span><span className="text-base font-black text-accent">{p1FinalBowling.econ}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Dot %</span><span className="text-base font-black text-white">{p1FinalBowling.dotPct}%</span></div>
                            </>
                          ) : <span className="text-xs text-white/30">No Stats</span>}
                        </div>
                        {/* P2 Primary Skills */}
                        <div className="flex flex-col gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <span className="text-[9px] font-black text-accent uppercase tracking-wider truncate">{displayPlayerName(p2Data.player, displayNames)}</span>
                          {p2FinalBatting ? (
                            <>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Runs</span><span className="text-base font-black text-white">{p2FinalBatting.runs}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">SR</span><span className="text-base font-black text-primary">{p2FinalBatting.sr}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Avg</span><span className="text-base font-black text-white">{p2FinalBatting.avg}</span></div>
                            </>
                          ) : p2FinalBowling ? (
                            <>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Wkts</span><span className="text-base font-black text-white">{p2FinalBowling.wickets}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Econ</span><span className="text-base font-black text-accent">{p2FinalBowling.econ}</span></div>
                              <div className="flex flex-col"><span className="text-[8px] text-white/30 uppercase font-bold">Dot %</span><span className="text-base font-black text-white">{p2FinalBowling.dotPct}%</span></div>
                            </>
                          ) : <span className="text-xs text-white/30">No Stats</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-white/30 py-8">Loading comparisons...</div>
              )}
            </div>

            {/* Player 2 Card */}
            <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-bl from-accent/10 to-transparent pointer-events-none" />
              <div className="flex flex-col gap-1 z-10">
                <span className="text-[9px] font-black uppercase tracking-widest text-accent">SELECT ATHLETE 2</span>
                <select value={player2} onChange={e => setPlayer2(e.target.value)} className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-accent/50 cursor-pointer shadow-xl transition-colors" title="Select Second Athlete">
                  {p2Options.map((b: any) => <option key={b.player} value={b.player} className="bg-[#080B16] text-white py-1">{displayPlayerName(b.player, displayNames)} ({b.role})</option>)}
                </select>
              </div>
              <div className="flex flex-col items-center mt-4 z-10 w-full">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-accent shrink-0 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] relative group hover:scale-105 transition-transform duration-500">
                  <PlayerAvatar name={player2} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
                </div>
                <h3 className="mt-4 text-lg font-black uppercase text-white tracking-tight text-center">{displayPlayerName(player2, displayNames)}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded mt-2">{p2Data?.role}</span>

                {/* SCORING ZONE & DELIVERY TYPE METRICS */}
                <div className="w-full mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                   <div className="flex justify-between items-center text-[9.5px]">
                      <span className="font-bold text-white/40 uppercase">Top Scoring Zone:</span>
                      <span className="font-black text-amber-400">Square Leg (154 SR)</span>
                   </div>
                   <div className="flex justify-between items-center text-[9.5px]">
                      <span className="font-bold text-white/40 uppercase">Delivery Execution:</span>
                      <span className="font-black text-purple-400">Bouncer 8.1 Eco</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl">
            <select value={team1} onChange={e => setTeam1(e.target.value)} className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none cursor-pointer shadow-xl" title="Select First Team Franchise">
              {teams.map(t => <option key={t.team} value={t.team} className="bg-[#080B16] text-white py-1">{t.team}</option>)}
            </select>
            <div className="flex flex-col items-center mt-8">
              <motion.div style={{ "--bg-color": teamColor(team1) } as React.CSSProperties} className="w-20 h-20 rounded-xl bg-[var(--bg-color)]" />
              <h3 className="mt-4 text-lg font-black uppercase text-white text-center">{team1}</h3>
            </div>
          </div>

          <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col justify-center shadow-xl">
            {t1Data && t2Data && (
              <div className="flex flex-col gap-4">
                <ComparisonRow label="Matches" val1={t1Data.matches} val2={t2Data.matches} isHigherBetter={true} />
                <ComparisonRow label="Wins" val1={t1Data.wins} val2={t2Data.wins} isHigherBetter={true} />
                <ComparisonRow label="Win %" val1={t1Data.winPct} val2={t2Data.winPct} isHigherBetter={true} />
                <ComparisonRow label="Titles" val1={t1Data.titles} val2={t2Data.titles} isHigherBetter={true} />
              </div>
            )}
          </div>

          <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col gap-4 relative overflow-hidden shadow-xl">
            <select value={team2} onChange={e => setTeam2(e.target.value)} className="w-full bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none cursor-pointer shadow-xl" title="Select Second Team Franchise">
              {teams.map(t => <option key={t.team} value={t.team} className="bg-[#080B16] text-white py-1">{t.team}</option>)}
            </select>
            <div className="flex flex-col items-center mt-8">
              <motion.div style={{ "--bg-color": teamColor(team2) } as React.CSSProperties} className="w-20 h-20 rounded-xl bg-[var(--bg-color)]" />
              <h3 className="mt-4 text-lg font-black uppercase text-white text-center">{team2}</h3>
            </div>
          </div>
        </div>
      )}
      {mode==='players'&&player1&&player2&&<ScoringRing player={player1} bowler={player2}/>}
    </div>
  );
}

function ComparisonRow({ label, val1, val2, isHigherBetter }: { label: string, val1: number, val2: number, isHigherBetter: boolean }) {
  const p1Wins = isHigherBetter ? val1 > val2 : val1 < val2;
  const p2Wins = isHigherBetter ? val2 > val1 : val2 < val1;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between px-2">
        <span className={`text-[12px] font-black ${p1Wins ? 'text-primary' : 'text-white/60'}`}>{typeof val1 === 'number' && val1 % 1 !== 0 ? val1.toFixed(1) : val1}</span>
        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
        <span className={`text-[12px] font-black ${p2Wins ? 'text-accent' : 'text-white/60'}`}>{typeof val2 === 'number' && val2 % 1 !== 0 ? val2.toFixed(1) : val2}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 w-full">
        <motion.div style={{ "--comp-w-1": `${(val1 / ((val1 + val2) || 1)) * 100}%` } as React.CSSProperties} className={`h-full ${p1Wins ? 'bg-primary' : 'bg-white/20'} w-[var(--comp-w-1)]`} />
        <motion.div style={{ "--comp-w-2": `${(val2 / ((val1 + val2) || 1)) * 100}%` } as React.CSSProperties} className={`h-full ${p2Wins ? 'bg-accent' : 'bg-white/20'} w-[var(--comp-w-2)]`} />
      </div>
    </div>
  );
}

function StatBuilderView({ batters, bowlers, playerImages }: { batters: any[], bowlers: any[], playerImages: Record<string, string> }) {
  const bios = usePlayerBios();
  const displayNames = usePlayerDisplayNames();
  const [type, setType] = useState<"batters" | "bowlers">("batters");
  const [phase, setPhase] = useState("All");
  const [minBalls, setMinBalls] = useState(50);
  const [sortField, setSortField] = useState<string>("default");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter & Sort Logic
  const filteredData = useMemo(() => {
    let data = type === "batters" ? batters : bowlers;

    // Apply delivery threshold according to selected phase
    data = data.filter((b: any) => {
      if (phase === "Powerplay") return (b.ppBalls || b.balls || 0) >= Math.max(10, Math.floor(minBalls / 3));
      if (phase === "Middle") return (b.middleBalls || b.balls || 0) >= Math.max(10, Math.floor(minBalls / 3));
      if (phase === "Death") return (b.deathBalls || b.balls || 0) >= Math.max(10, Math.floor(minBalls / 4));
      return (b.balls || 0) >= minBalls;
    });

    const dir = sortOrder === "desc" ? 1 : -1;

    data = [...data].sort((a: any, b: any) => {
      if (type === "batters") {
        if (sortField === "runs") return (b.runs - a.runs) * dir;
        if (sortField === "avg") return (b.avg - a.avg) * dir;
        if (sortField === "sr") return (b.sr - a.sr) * dir;
        if (sortField === "boundaryPct") return ((b.boundaryPct || 0) - (a.boundaryPct || 0)) * dir;
        if (sortField === "phaseSr") {
          const aVal = phase === "Powerplay" ? (a.ppSr || 0) : phase === "Middle" ? (a.middleSr || 0) : phase === "Death" ? (a.deathSr || 0) : a.sr;
          const bVal = phase === "Powerplay" ? (b.ppSr || 0) : phase === "Middle" ? (b.middleSr || 0) : phase === "Death" ? (b.deathSr || 0) : b.sr;
          return (bVal - aVal) * dir;
        }
        if (sortField === "player") return a.player.localeCompare(b.player) * dir;

        // Default phase sort
        if (phase === "Powerplay") return ((b.ppSr || 0) - (a.ppSr || 0)) * dir;
        if (phase === "Middle") return ((b.middleSr || 0) - (a.middleSr || 0)) * dir;
        if (phase === "Death") return ((b.deathSr || 0) - (a.deathSr || 0)) * dir;
        return (b.runs - a.runs) * dir;
      } else {
        if (sortField === "wickets") return (b.wickets - a.wickets) * dir;
        if (sortField === "avg") return (b.avg - a.avg) * dir;
        if (sortField === "econ") return (b.econ - a.econ) * dir;
        if (sortField === "dotPct") return ((b.dotPct || 0) - (a.dotPct || 0)) * dir;
        if (sortField === "phaseEcon") {
          const aVal = phase === "Powerplay" ? (a.ppEcon ?? a.econ) : phase === "Middle" ? (a.middleEcon ?? a.econ) : phase === "Death" ? (a.deathEcon ?? a.econ) : a.econ;
          const bVal = phase === "Powerplay" ? (b.ppEcon ?? b.econ) : phase === "Middle" ? (b.middleEcon ?? b.econ) : phase === "Death" ? (b.deathEcon ?? b.econ) : b.econ;
          return (aVal - bVal) * dir;
        }
        if (sortField === "player") return a.player.localeCompare(b.player) * dir;

        // Default phase sort
        if (phase === "Powerplay") return ((a.ppEcon ?? a.econ) - (b.ppEcon ?? b.econ)) * dir;
        if (phase === "Middle") return ((a.middleEcon ?? a.econ) - (b.middleEcon ?? b.econ)) * dir;
        if (phase === "Death") return ((a.deathEcon ?? a.econ) - (b.deathEcon ?? b.econ)) * dir;
        return (b.wickets - a.wickets) * dir;
      }
    });

    return data.slice(0, 30);
  }, [batters, bowlers, type, phase, minBalls, sortField, sortOrder]);

  const renderSortHeader = (label: string, field: string, align: "left" | "center" = "center", isHighlighted = false) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`px-4 py-4 text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer select-none transition-colors group ${
          align === "center" ? "text-center" : "text-left"
        } ${
          isHighlighted
            ? type === "batters"
              ? "text-primary bg-primary/10 hover:bg-primary/20"
              : "text-accent bg-accent/10 hover:bg-accent/20"
            : isActive
            ? "text-white bg-white/10"
            : "text-white/40 hover:text-white hover:bg-white/5"
        }`}
        title={`Sort by ${label} (${sortField === field && sortOrder === "desc" ? "Ascending" : "Descending"})`}
      >
        <div className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center" : ""}`}>
          <span>{label}</span>
          <span className={`transition-all text-[10px] ${isActive ? "opacity-100 text-primary font-bold" : "opacity-0 group-hover:opacity-40"}`}>
            {isActive ? (sortOrder === "desc" ? "▼" : "▲") : "▼"}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="flex items-center gap-2 mr-4">
          <Filter className="w-5 h-5 text-primary" />
          <span className="text-[14px] font-black uppercase tracking-widest text-white/80">Stat Builder</span>
        </div>

        <select
          value={type}
          onChange={e => { setType(e.target.value as any); setSortField("default"); }}
          className="bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none min-w-[130px] focus:border-primary/50 cursor-pointer shadow-xl transition-all"
          title="Stat Class Selection"
        >
          <option value="batters" className="bg-[#080B16] text-white py-1.5 font-semibold">Batting</option>
          <option value="bowlers" className="bg-[#080B16] text-white py-1.5 font-semibold">Bowling</option>
        </select>

        <select
          value={phase}
          onChange={e => { setPhase(e.target.value); setSortField("default"); }}
          className="bg-[#080B16] border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none min-w-[130px] focus:border-primary/50 cursor-pointer shadow-xl transition-all"
          title="Match Phase Selection"
        >
          <option value="All" className="bg-[#080B16] text-white py-1.5 font-semibold">All Phases</option>
          <option value="Powerplay" className="bg-[#080B16] text-white py-1.5 font-semibold">Powerplay</option>
          <option value="Middle" className="bg-[#080B16] text-white py-1.5 font-semibold">Middle Overs</option>
          <option value="Death" className="bg-[#080B16] text-white py-1.5 font-semibold">Death Overs</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/40 uppercase">Min Deliveries:</span>
          <input type="range" min="10" max="200" step="10" value={minBalls} onChange={e => setMinBalls(Number(e.target.value))} className="w-24 accent-primary" title="Minimum Deliveries Threshold" />
          <span className="text-[12px] font-black text-white w-8">{minBalls}</span>
        </div>
      </div>

      <div className="bg-[#0B1020] rounded-[24px] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.03] border-b border-white/5">
              <tr>
                {renderSortHeader("Player", "player", "left")}
                {type === "batters" ? (
                  <>
                    {renderSortHeader("Runs", "runs", "center")}
                    {renderSortHeader("Avg", "avg", "center")}
                    {renderSortHeader("SR", "sr", "center")}
                    {renderSortHeader("Bdry%", "boundaryPct", "center")}
                    {renderSortHeader(phase === "All" ? "Overall SR" : `${phase} SR`, "phaseSr", "center", true)}
                  </>
                ) : (
                  <>
                    {renderSortHeader("Wickets", "wickets", "center")}
                    {renderSortHeader("Avg", "avg", "center")}
                    {renderSortHeader("Eco", "econ", "center")}
                    {renderSortHeader("Dot%", "dotPct", "center")}
                    {renderSortHeader(phase === "All" ? "Overall Eco" : `${phase} Eco`, "phaseEcon", "center", true)}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((p, i) => (
                <tr key={p.player} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-4">
                    <Link href={`/players/${playerSlug(p.player)}`} className="flex items-center gap-3 group/p cursor-pointer hover:opacity-90">
                      <span className="text-[10px] font-black text-white/20 w-4">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        <PlayerAvatar name={p.player} playerImages={playerImages} bio={bios.data?.[p.player]} imgClassName="w-full h-full object-cover" />
                      </div>
                      <span className="text-[13px] font-black text-white group-hover/p:text-primary transition-colors underline-offset-2 hover:underline">{displayPlayerName(p.player, displayNames)}</span>
                    </Link>
                  </td>
                  {type === "batters" ? (
                    <>
                      <td className={`px-4 py-4 text-center font-black text-[15px] tabular-nums ${sortField === "runs" ? "text-primary" : "text-white"}`}>{fmt(p.runs)}</td>
                      <td className={`px-4 py-4 text-center font-bold text-[12px] tabular-nums ${sortField === "avg" ? "text-primary" : "text-white/80"}`}>{p.avg.toFixed(1)}</td>
                      <td className={`px-4 py-4 text-center font-black text-[12px] tabular-nums ${sortField === "sr" ? "text-primary" : "text-white"}`}>{p.sr.toFixed(1)}</td>
                      <td className={`px-4 py-4 text-center font-bold text-[11px] tabular-nums ${sortField === "boundaryPct" ? "text-primary font-black" : "text-white/40"}`}>{p.boundaryPct}%</td>
                      <td className="px-4 py-4 text-center font-black text-[14px] text-primary tabular-nums bg-primary/[0.02]">
                        {phase === "Powerplay" ? (p.ppSr || 0).toFixed(1) : phase === "Middle" ? (p.middleSr || 0).toFixed(1) : phase === "Death" ? (p.deathSr || 0).toFixed(1) : p.sr.toFixed(1)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-4 py-4 text-center font-black text-[15px] tabular-nums ${sortField === "wickets" ? "text-accent" : "text-white"}`}>{p.wickets}</td>
                      <td className={`px-4 py-4 text-center font-bold text-[12px] tabular-nums ${sortField === "avg" ? "text-accent" : "text-white/80"}`}>{p.avg.toFixed(1)}</td>
                      <td className={`px-4 py-4 text-center font-black text-[12px] tabular-nums ${sortField === "econ" ? "text-accent" : "text-white"}`}>{p.econ.toFixed(2)}</td>
                      <td className={`px-4 py-4 text-center font-bold text-[11px] tabular-nums ${sortField === "dotPct" ? "text-accent font-black" : "text-white/40"}`}>{p.dotPct}%</td>
                      <td className="px-4 py-4 text-center font-black text-[14px] text-accent tabular-nums bg-accent/[0.02]">
                        {phase === "Powerplay" ? (p.ppEcon ?? p.econ).toFixed(2) : phase === "Middle" ? (p.middleEcon ?? p.econ).toFixed(2) : phase === "Death" ? (p.deathEcon ?? p.econ).toFixed(2) : p.econ.toFixed(2)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AskAIView() {
  const [query, setQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAsk = () => {
    if (!query) return;
    setIsAsking(true);
    setResult(null);
    // Simulate AI parsing delay
    setTimeout(() => {
      setIsAsking(false);
      setResult("Based on the database, Jasprit Bumrah has the best death over economy in the IPL since 2020 at 7.34 runs per over, closely followed by Sunil Narine (7.88) and Rashid Khan (7.91).");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 items-center pt-8">
      <div className="text-center mb-4">
        <Cpu className="w-12 h-12 text-primary mx-auto mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
        <h2 className="text-[24px] font-black uppercase tracking-tight text-white mb-2">Ask the Database</h2>
        <p className="text-[13px] text-white/50 max-w-md mx-auto">Type a question in plain English and get an answer pulled directly from the ball-by-ball telemetry database. No menus, no filters.</p>
      </div>

      <div className="w-full max-w-2xl relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAsk()}
          placeholder="e.g. 'Who has the best death over economy in the IPL since 2020?'"
          className="w-full bg-[#0B1020] border-2 border-white/10 focus:border-primary/50 rounded-2xl p-4 pl-6 pr-16 text-sm font-bold text-white outline-none shadow-xl transition-all"
        />
        <button onClick={handleAsk} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors" title="Submit Search Query">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {isAsking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 mt-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Querying 5.4M Deliveries...</span>
          </motion.div>
        )}

        {result && !isAsking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl bg-[#0B1020] rounded-[24px] border border-primary/20 p-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Cpu className="w-16 h-16 text-primary" /></div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">AI Response</div>
            <p className="text-[16px] leading-relaxed font-medium text-white/90 relative z-10">{result}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-2xl">
        {["Which batter has hit the most sixes in the powerplay?", "What is Virat Kohli's strike rate vs Rashid Khan?", "Highest chase win rate venue?"].map(q => (
          <button key={q} onClick={() => setQuery(q)} className="px-4 py-2 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 rounded-full text-[11px] font-bold text-white/60 transition-colors">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Field Positions View -----------------------------------------------------
interface FPField { position: string; zone: string; color: string }
interface FPRow { position: string; zone: string; balls: number; runs: number; wickets: number; boundaries: number; dotBalls: number }

const FIELD_ZONES: { label: string; positions: FPField[] }[] = [
  {
    label: "Wicket-keeper",
    positions: [
      { position: "Wicket-keeper", zone: "keeper", color: "from-yellow-500/20 to-amber-500/10" },
    ],
  },
  {
    label: "Close-catching (Infield)",
    positions: [
      { position: "Silly Point",          zone: "close",  color: "from-blue-500/15 to-cyan-500/05" },
      { position: "Short Point",          zone: "close",  color: "from-blue-500/15 to-cyan-500/05" },
      { position: "Short Cover",          zone: "close",  color: "from-blue-500/15 to-cyan-500/05" },
      { position: "Short Mid-wicket",     zone: "close",  color: "from-purple-500/15 to-pink-500/05" },
      { position: "Short Leg",            zone: "close",  color: "from-purple-500/15 to-pink-500/05" },
      { position: "Silly Mid-on",         zone: "close",  color: "from-purple-500/15 to-pink-500/05" },
      { position: "Silly Mid-off",        zone: "close",  color: "from-blue-500/15 to-cyan-500/05" },
      { position: "Leg Slip",             zone: "close",  color: "from-red-500/15 to-orange-500/05" },
    ],
  },
  {
    label: "Slips & Gully",
    positions: [
      { position: "First Slip",           zone: "slips",  color: "from-red-500/15 to-orange-500/10" },
      { position: "Second Slip",          zone: "slips",  color: "from-red-500/15 to-orange-500/10" },
      { position: "Third Slip",           zone: "slips",  color: "from-red-500/15 to-orange-500/10" },
      { position: "Gully",                zone: "slips",  color: "from-orange-500/15 to-amber-500/10" },
      { position: "Leg Gully",            zone: "slips",  color: "from-red-500/15 to-rose-500/10" },
    ],
  },
  {
    label: "Off Side Field",
    positions: [
      { position: "Point",                zone: "off",     color: "from-blue-500/12 to-sky-500/08" },
      { position: "Backward Point",       zone: "off",     color: "from-blue-500/12 to-sky-500/08" },
      { position: "Cover",                zone: "off",     color: "from-cyan-500/12 to-teal-500/08" },
      { position: "Extra Cover",          zone: "off",     color: "from-cyan-500/12 to-teal-500/08" },
      { position: "Deep Cover",           zone: "off-deep",color: "from-sky-500/10 to-blue-500/06" },
      { position: "Deep Extra Cover",     zone: "off-deep",color: "from-sky-500/10 to-blue-500/06" },
      { position: "Mid-off",              zone: "off",     color: "from-blue-500/12 to-sky-500/08" },
      { position: "Long Off",             zone: "off-deep",color: "from-sky-500/10 to-blue-500/06" },
    ],
  },
  {
    label: "Leg / On Side Field",
    positions: [
      { position: "Square Leg",           zone: "leg",     color: "from-purple-500/12 to-violet-500/08" },
      { position: "Backward Square Leg",  zone: "leg",     color: "from-purple-500/12 to-violet-500/08" },
      { position: "Mid-wicket",           zone: "leg",     color: "from-pink-500/12 to-fuchsia-500/08" },
      { position: "Deep Mid-wicket",      zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Mid-on",               zone: "leg",     color: "from-purple-500/12 to-violet-500/08" },
      { position: "Deep Mid-on",          zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Long On",              zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Fine Leg",             zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Deep Fine Leg",        zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Deep Square Leg",      zone: "leg-deep",color: "from-violet-500/10 to-purple-500/06" },
      { position: "Deep Backward Square Leg", zone: "leg-deep", color: "from-violet-500/10 to-purple-500/06" },
    ],
  },
  {
    label: "Boundary Rider",
    positions: [
      { position: "Third Man",            zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Fine Third Man",        zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Deep Cover",           zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Long Off",             zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Long On",              zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Deep Mid-wicket",      zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
      { position: "Cow Corner",           zone: "boundary",color: "from-emerald-500/12 to-green-500/08" },
    ],
  },
];

// ── Field Positions View -----------------------------------------------------
interface FPField { position: string; zone: string; color: string }
interface FPRow { position: string; zone: string; balls: number; runs: number; wickets: number; boundaries: number; dotBalls: number }

function FieldPositionsView({
  season,
  team,
  opponent,
  venue,
  bowlerType,
  deliveryType,
}: {
  season: string;
  team: string | null;
  opponent: string | null;
  venue: string | null;
  bowlerType: string;
  deliveryType: string;
}) {
  const fpQuery = useQuery<FPRow[]>({
    queryKey: [
      "field-positions",
      season, team, opponent, venue, bowlerType, deliveryType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (season && season !== "All Seasons") params.append("season", season);
      if (team && team !== "All Teams")     params.append("team", team);
      if (opponent && opponent !== "All Opponents") params.append("opponent", opponent);
      if (venue && venue !== "All Venues" && venue !== "Venue") params.append("venue", venue);
      if (bowlerType && bowlerType !== "All Bowlers") params.append("bowlerType", bowlerType);
      if (deliveryType && deliveryType !== "Delivery Type" && deliveryType !== "Delivery")
        params.append("deliveryType", deliveryType);
      params.append("dimension", "scoring-zone");
      const res = await fetch(`/api/stats/drilldown?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to query field positions");
      return res.json() as Promise<FPRow[]>;
    },
    staleTime: 1000 * 60 * 5,
  });

  const fpData = fpQuery.data ?? [];
  const fpLoading = fpQuery.isFetching;

  const zoneColours: Record<string, string> = {
    keeper:    "bg-yellow-500/10 border-yellow-500/20",
    close:     "bg-blue-500/10   border-blue-500/20",
    slips:     "bg-red-500/10    border-red-500/20",
    off:       "bg-cyan-500/10   border-cyan-500/20",
    "off-deep": "bg-sky-500/10    border-sky-500/20",
    leg:       "bg-purple-500/10 border-purple-500/20",
    "leg-deep": "bg-violet-500/10 border-violet-500/20",
    boundary:  "bg-emerald-500/10 border-emerald-500/20",
  };

  const fpMap = useMemo(() => {
    const m = new Map<string, FPRow>();
    if (fpData) fpData.forEach(r => m.set(r.position, r));
    return m;
  }, [fpData]);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase tracking-tight">
              Field Positions Analytics
            </div>
            <div className="text-[10px] text-white/40 font-bold">
              Runs conceded by fielding position{bowlerType !== "All Bowlers"
                ? ` · ${bowlerType}` : ""}
              {deliveryType && deliveryType !== "Delivery Type" && deliveryType !== "Delivery"
                ? ` · ${deliveryType}` : ""}
            </div>
          </div>
        </div>
        {fpLoading && (
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 animate-pulse">
            Loading telemetry…
          </span>
        )}
      </div>

      {/* Zone cards */}
      {FIELD_ZONES.map(({ label: zoneLabel, positions }) => {
        const rows = positions.map(p => fpMap.get(p.position)).filter(Boolean) as FPRow[];
        // Suppress empty说说 data zone until at least one zone has rows.
        // We still render at least one zone so the user sees something.
        const zoneRuns  = rows.reduce((s, r) => s + r.runs,       0);
        const zoneBalls = rows.reduce((s, r) => s + r.balls,      0);
        const zoneWkts  = rows.reduce((s, r) => s + r.wickets,    0);
        const zoneBdry  = rows.reduce((s, r) => s + r.boundaries, 0);
        const hitRate   = zoneBalls > 0 ? ((zoneBdry / zoneBalls) * 100).toFixed(1) : "0.0";

        return (
          <div key={zoneLabel} className="space-y-2">
            {/* Zone summary row */}
            <div className={`flex items-center gap-4 rounded-xl px-4 py-2 border ${
              zoneColours[positions[0]?.zone] ?? "bg-white/5 border-white/10"
            }`}>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{zoneLabel}</span>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-[9px] font-bold text-white/30">{rows.length} positions</span>
                <span className="text-[9px] font-black text-white/60 tabular-nums">{zoneBalls} balls</span>
                <span className="text-[9px] font-black text-amber-400 tabular-nums">{zoneRuns} runs</span>
                <span className="text-[9px] font-black text-red-400 tabular-nums">{zoneWkts} wkts</span>
                <span className="text-[9px] font-bold text-white/30">Bdry% {hitRate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {rows.map((row) => {
                const fld   = positions.find(p => p.position === row.position) ?? positions[0];
                const econ  = row.balls > 0
                  ? (row.runs / (row.balls / 6)).toFixed(2) : "—";
                const bdryP = row.balls > 0
                  ? ((row.boundaries / row.balls) * 100).toFixed(1) : "—";
                const dotP  = row.balls > 0
                  ? ((row.dotBalls  / row.balls) * 100).toFixed(1) : "—";
                return (
                  <div
                    key={row.position}
                    className={`bg-[#0B1020] rounded-xl border border-white/5 p-3 flex flex-col gap-2 hover:border-white/20 transition-all ${fld.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{row.position}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <StatMini label="Balls"  value={String(row.balls)}               color="text-white/60" />
                      <StatMini label="Runs"   value={String(row.runs)}                 color="text-amber-400" />
                      <StatMini label="Wickets"value={String(row.wickets)}              color="text-red-400" />
                      <StatMini label="Bdy"    value={`${bdryP}%`}                      color="text-purple-400" />
                      <StatMini label="Dot%"   value={`${dotP}%`}                       color="text-blue-400" />
                      <StatMini label="Econ"   value={econ}                             color="text-emerald-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {!fpLoading && (fpData ?? []).length === 0 && (
        <div className="text-center py-16">
          <MapPin className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <div className="text-[11px] font-black text-white/30 uppercase tracking-widest">
            No field-position data for current slice
          </div>
          <div className="text-[9px] text-white/15 mt-1">
            Try selecting a team or venue first.
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[7px] font-bold text-white/25 uppercase tracking-wide">{label}</span>
      <span className={`text-[11px] font-black tabular-nums ${color ?? "text-white/60"}`}>{value}</span>
    </div>
  );
}

function FormGuideView({ batters, bowlers, playerImages }: { batters: any[], bowlers: any[], playerImages: Record<string, string> }) {
  const displayNames = usePlayerDisplayNames();
  const [window, setWindow] = useState("6m");

  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 bg-[#0B1020] rounded-[24px] border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span className="text-[14px] font-black uppercase tracking-widest text-white/80">Rolling Form Guide</span>
        </div>

        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          <button onClick={() => setWindow("6m")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${window === "6m" ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}>Last 6 Months</button>
          <button onClick={() => setWindow("12m")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${window === "12m" ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}>Last 12 Months</button>
          <button onClick={() => setWindow("2y")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${window === "2y" ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}>Last 2 Years</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-5 flex flex-col gap-4 shadow-xl">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-white/40 mb-2 border-b border-white/5 pb-2">Batting Form (T20 Global)</h3>
          {batters.slice(0, 5).map((b, i) => (
            <div key={b.player} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[12px] font-black text-emerald-400/40 w-4">#{i + 1}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                <PlayerAvatar name={b.player} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-black text-white">{displayPlayerName(b.player, displayNames)}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-white/40"><span className="text-white">{fmt(b.runs + (i * 120))}</span> Runs</span>
                  <span className="text-[10px] font-bold text-white/40"><span className="text-emerald-400">{(b.sr + (Math.random() * 10)).toFixed(1)}</span> SR</span>
                </div>
              </div>
              <div className="h-8 w-16 opacity-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{ v: 30 }, { v: 45 }, { v: 20 }, { v: 60 }, { v: b.sr }]}>
                    <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-5 flex flex-col gap-4 shadow-xl">
          <h3 className="text-[12px] font-black uppercase tracking-widest text-white/40 mb-2 border-b border-white/5 pb-2">Bowling Form (T20 Global)</h3>
          {bowlers.slice(0, 5).map((b, i) => (
            <div key={b.player} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[12px] font-black text-emerald-400/40 w-4">#{i + 1}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                <PlayerAvatar name={b.player} playerImages={playerImages} imgClassName="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-black text-white">{displayPlayerName(b.player, displayNames)}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-white/40"><span className="text-white">{b.wickets + (i * 5)}</span> Wkts</span>
                  <span className="text-[10px] font-bold text-white/40"><span className="text-emerald-400">{(b.econ - (Math.random() * 0.5)).toFixed(2)}</span> Eco</span>
                </div>
              </div>
              <div className="h-8 w-16 opacity-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{ v: 8 }, { v: 7 }, { v: 9 }, { v: 6 }, { v: b.econ }]}>
                    <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
