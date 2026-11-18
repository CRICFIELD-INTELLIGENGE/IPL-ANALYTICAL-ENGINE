import ScoutPlayerPage from "@/pages/scout-player";
import { PlayerRetentionCard } from "@/components/retention/retention-widgets";
import {ScoringRing} from '@/components/visualizations/scoring-ring';
import {PlayerCareerMilestones} from '@/components/player-career-milestones';
import {
  PlayerComparisonModal,
  PlayerAskAIModal,
  PlayerPressurePassportSection,
  PlayerTacticalIntelligenceSection,
  PlayerVenueOppositionSection,
  EnlargedRadarChartSection,
  PlayerIntelligenceHub,
  HeadToHeadGroundVisual,
} from "@/components/player-intelligence-sections";
import React, { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useTheme } from "@/lib/theme";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Calendar, MapPin, Award, User, Globe, Target, Flame, Trophy,
  Activity, Zap, Shield, Sparkles, TrendingUp, Cpu, Heart, CheckCircle2,
  CalendarDays, Share2, AwardIcon, Crosshair, Search, SlidersHorizontal,
  Filter, Layers, Compass, HelpCircle, UserCheck, Crown, RotateCw, ShoppingBag, ArrowUpRight,
  ChevronUp, ChevronDown, X, Newspaper, BookOpen, Clock, FileText
} from "lucide-react";
import { getV2Index, STORY_TYPE_LABEL } from "@/lib/editorial-v2";
import { EDITORIAL_ASPECTS, type IndexEntry } from "@/data/editorial/schema";
import { LibraryMedia } from "@/components/dugout/franchise-library";
import { CricketStadium3D } from "@/components/cricket3d/CricketStadium3D";
import { GroundScoringWagonWheel, BowlingHeatmap, DeliveryTypeBreakdown, ShotZoneMap, DismissalZonesMap } from "@/components/visualizations/spatial-analytics";
import { PlayerIntelPanel } from "@/components/decision/intel-panels";
import { PlayerIntelligenceSection } from "@/components/intelligence/intel-components";
import { usePlayerIdentityIndex, usePlayerRecentMatches } from "@/lib/player-recent-matches";
import { resolvePlayerKey, resolveProfileName } from "@/lib/player-key";
import { useRecordedDeliveries, buildClientMatchupSummary, resolveScorecardName } from "@/lib/delivery-data";
import { BatterLens } from "@/components/batter-lens";
import {
  useTopBatters, useTopBowlers, usePlayerImages, useSeasons, useVenues, useTeams,
  usePlayerSeasonStats, useSquadsBySeason, usePlayerDisplayNames, useCaptains, usePlayerLatestTeams,
  selectPlayerRows, isSamePlayerName, normalizePlayerName, normalizeVenueName, displayPlayerName,
  teamColor, teamShort
} from "@/lib/aggregates";
import {
  ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, AreaChart, Area
} from "recharts";

export interface PlayerBio {
  playerId: string;
  playerName: string;
  fullName: string;
  batStyle: string;
  bowlStyle: string;
  fieldPos: string;
  image: string;
  birthDate: string;
  birthPlace: string;
  age: number;
  country: string;
  role: string;
  iplDebut: string;
  intDebut: string;
  bio: string;
}

interface RecordedMatchupStats {
  batter: string;
  bowler: string;
  battingHand: "LHB" | "RHB" | "Unknown";
  bowlerType: "Pacer" | "Spinner" | "Unknown";
  runs: number;
  balls: number;
  dismissals: number;
  sr: number;
  dotPct: number;
  dominanceIndex: number;
  boundaryPct?: number;
  fours?: number;
  sixes?: number;
  /** Real per-phase split of this duel, from the ball-by-ball record. */
  phaseSplit?: {
    powerplay: { runs: number; balls: number; wkts: number; sr: number };
    middle: { runs: number; balls: number; wkts: number; sr: number };
    death: { runs: number; balls: number; wkts: number; sr: number };
  };
}

const usePlayerBios = () => useQuery<Record<string, PlayerBio>>({
  queryKey: ["player-bios"],
  queryFn: async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/player-bio.json`);
    if (!res.ok) throw new Error("Failed to load player bios");
    return res.json();
  },
  staleTime: 1000 * 60 * 60, // 1 hour static caching
});

export default function PlayerProfilePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [, params] = useRoute("/players/:slug");
  const [, scoutParams] = useRoute("/pressurelab/player/:id");
  const [returnPath] = useState(() => {
    const from = new URLSearchParams(window.location.search).get("from") || sessionStorage.getItem('cricfield-player-return') || '';
    return /^\/(stats|scout|dugout|teams)(?:[/?#]|$)/i.test(from) && !from.startsWith('//') && !/^\/scout\/player\//.test(from) ? from : '/stats';
  });
  const slug = params?.slug || scoutParams?.id || "";

  const playerBios = usePlayerBios();
  const identityIndex = usePlayerIdentityIndex();
  const playerImages = usePlayerImages();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const playerSeasonStats = usePlayerSeasonStats();
  const squadsBySeason = useSquadsBySeason();
  const captainsData = useCaptains();
  const venuesData = useVenues();
  const teamsData = useTeams();

  // Country coverage in player-bio.json is sparse (~17%); the auction
  // registry has it for every entry, so it's a useful second source before
  // giving up and saying "Not available".
  const playersRegistry = useQuery<Array<{ name: string; country?: string }>>({
    queryKey: ["players-registry"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/players.json`);
      if (!res.ok) throw new Error("Failed to load players registry");
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  const playerJerseysQuery = useQuery<Record<string, string>>({
    queryKey: ["player-jerseys"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/player-jerseys.json`);
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "metrics" | "lens" | "intelligence" | "clutch" | "tactical" | "venue" | "recent" | "matchups">("overview");
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [showAllAuction, setShowAllAuction] = useState(false);

  // Exact-only comparison. The previous version also accepted "same first
  // initial + same surname", which merged distinct careers: Rahul Sharma's
  // seasons landed on Rohit Sharma's graph (two scores for one year) and
  // M Shahrukh Khan's 2021 became Mohsin Khan's IPL debut.
  const matchPlayerName = (leftName: string, rightName: string): boolean =>
    isSamePlayerName(leftName, rightName);

  /** Resolves the URL slug to a bio key (see resolvePlayerKey), once the identity index has settled. */
  const playerKey = useMemo(
    () => (playerBios.data && slug && !identityIndex.isLoading ? resolvePlayerKey(playerBios.data, slug, identityIndex.data) : null),
    [playerBios.data, slug, identityIndex.isLoading, identityIndex.data],
  );
  
  const bio = useMemo(() => {
    if (!playerBios.data || !playerKey) return null;
    return playerBios.data[playerKey];
  }, [playerBios.data, playerKey]);


  const NOT_AVAILABLE = "Not available";

  // Readable name for headings; falls back to the scorecard name when no
  // friendlier form is known.
  const displayNames = usePlayerDisplayNames();
  const profileName = bio ? resolveProfileName(bio, playerKey, displayNames, identityIndex.data) : "";

  /**
   * This player's captaincy record, if they ever led a side.
   *
   * The source lists captains under their everyday name ("Rohit Sharma"), so
   * the profile's display name is the primary key — matching on the scorecard
   * form alone would miss almost everyone. Comparison is exact on each known
   * spelling; no surname fallback, since "R Sharma" would otherwise pick up a
   * different player's captaincy.
   */
  const captaincy = useMemo(() => {
    if (!bio || !captainsData.data?.captains) return null;
    const wanted = [profileName, bio.playerName, bio.fullName]
      .map(normalizePlayerName)
      .filter(Boolean);
    if (wanted.length === 0) return null;
    return captainsData.data.captains.find(c => wanted.includes(normalizePlayerName(c.player))) ?? null;
  }, [bio, profileName, captainsData.data]);

  /** Club whose captaincy stint is being shown; null = every club. */
  const [captainClub, setCaptainClub] = useState<string | null>(null);

  const FRANCHISE_LABELS: Record<string, string> = {
    CSK: "Chennai Super Kings", MI: "Mumbai Indians", KKR: "Kolkata Knight Riders",
    RCB: "Royal Challengers Bengaluru", RR: "Rajasthan Royals", DC: "Delhi Capitals",
    PBKS: "Punjab Kings", SRH: "Sunrisers Hyderabad", DEC: "Deccan Chargers",
    GT: "Gujarat Titans", GL: "Gujarat Lions", LSG: "Lucknow Super Giants",
    RPS: "Rising Pune Supergiant", PW: "Pune Warriors", KTK: "Kochi Tuskers Kerala",
  };


  /**
   * Every season this player appears in a franchise squad, with the fee paid.
   *
   * squads-by-season.json is used rather than the raw auction rows because the
   * squad build already resolved Wikipedia's full names ("Albie Morkel") onto
   * the scorecard names used everywhere else here ("JA Morkel"), scoped to a
   * single franchise-season so the match is trustworthy. Re-deriving that here
   * would mean repeating the ambiguous-name problem in a second place.
   */
  const squadHistory = useMemo(() => {
    if (!bio || !squadsBySeason.data) return [];
    const rows: {
      season: string; team: string; priceLakh: number | null; priceUsd: number | null;
      priceDisplay: string | null; acquisition: string | null; country: string | null;
    }[] = [];
    for (const [season, teams] of Object.entries(squadsBySeason.data)) {
      for (const [team, players] of Object.entries(teams)) {
        for (const p of players) {
          const isMatch = [p.cricsheetName,p.name].filter(Boolean).some(name =>
            [bio.playerName,bio.fullName].filter(Boolean).some(known => matchPlayerName(name!,known!)));
          if (!isMatch) continue;
          rows.push({
            season, team,
            priceLakh: p.priceLakh, priceUsd: p.priceUsd, priceDisplay: p.priceDisplay,
            acquisition: p.acquisition, country: p.country,
          });
        }
      }
    }
    return rows.sort((a, b) => a.season.localeCompare(b.season));
  }, [bio, squadsBySeason.data]);

  // Fee history for the chart. Rupee and dollar eras are not interconvertible
  // without a historical rate, so only the rupee years (2014 onward) are
  // plotted on a shared axis; earlier fees stay in the table below it.
  const priceProgression = useMemo(
    () => squadHistory
      .filter(r => r.priceLakh != null)
      .map(r => ({
        season: r.season,
        crore: Math.round((r.priceLakh as number)) / 100,
        team: r.team,
        acquisition: r.acquisition,
      })),
    [squadHistory],
  );

  /**
   * Seasons this player spent at each club they captained, taken from their own
   * squad history and clipped to the years they held the job.
   *
   * This is how a multi-club captain's stint gets separated. The wins and
   * losses cannot be split the same way: the captains list publishes one
   * combined row per person, and no per-match captain exists anywhere in this
   * data (Cricsheet does not record one), so a club-by-club record would have
   * to assume the captain led every match of every season he was there — which
   * is wrong wherever two players shared a season.
   */
  const captainStints = useMemo(() => {
    if (!captaincy) return [];
    const first = captaincy.firstSeason ?? 0;
    const last = captaincy.lastSeason ?? 9999;
    return captaincy.teams.map(code => {
      const label = FRANCHISE_LABELS[code] ?? code;
      const seasons = squadHistory
        .filter(r => r.team === label)
        .map(r => Number(r.season))
        .filter(y => Number.isFinite(y) && y >= first && y <= last)
        .sort((a, b) => a - b);
      return {
        code,
        label,
        seasons,
        from: seasons[0] ?? null,
        to: seasons[seasons.length - 1] ?? null,
      };
    });
  }, [captaincy, squadHistory]);

  // player-bio.json's `country` field is only populated for ~17% of
  // players; the squad records carry a nationality for far more of them, and
  // the auction registry is the last resort before admitting we don't know.
  const resolvedCountry = useMemo(() => {
    if (bio?.country?.trim()) return bio.country;
    const fromSquad = squadHistory.find(r => r.country?.trim())?.country;
    if (fromSquad) return fromSquad;
    if (!bio || !playersRegistry.data) return null;
    const match = playersRegistry.data.find(p => matchPlayerName(p.name, bio.playerName));
    return match?.country?.trim() || null;
  }, [bio, squadHistory, playersRegistry.data]);

  // player-bio.json never has an IPL debut season (checked: 0/772 populated
  // across the whole file) — but we can derive the real one from our own
  // season-by-season stats instead of leaving it blank or making one up.
  const resolvedIplDebut = useMemo(() => {
    if (bio?.iplDebut?.trim()) return bio.iplDebut;
    if (!bio || !playerSeasonStats.data) return null;
    const all = [
      ...(playerSeasonStats.data.batters || []),
      ...(playerSeasonStats.data.bowlers || []),
    ];
    const seasons = selectPlayerRows(all, bio.playerName, bio.fullName)
      .map(row => parseInt(String(row.season).replace(/[^0-9]/g, ""), 10))
      .filter(y => Number.isFinite(y));
    if (seasons.length === 0) return null;
    return String(Math.min(...seasons));
  }, [bio, playerSeasonStats.data]);

  // Map to batter statistics
  const batterStats = useMemo(() => {
    if (!bio || !topBatters.data) return null;
    // Substring matching used to be part of this test, which is unsafe in both
    // directions: "R Sharma" is a substring of nothing useful, but "S Khan"
    // matches "Musheer Khan" and every other Khan on the list.
    return selectPlayerRows(topBatters.data.runs, bio.playerName, bio.fullName)[0] ?? undefined;
  }, [bio, topBatters.data]);

  // Map to bowler statistics
  const bowlerStats = useMemo(() => {
    if (!bio || !topBowlers.data) return null;
    return selectPlayerRows(topBowlers.data.wickets, bio.playerName, bio.fullName)[0] ?? undefined;
  }, [bio, topBowlers.data]);

  // Scope switcher state: "career" or a specific season like "2026", "2025"
  const [selectedSeasonScope, setSelectedSeasonScope] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const s = new URLSearchParams(window.location.search).get("season");
      if (s) return s;
    }
    return "career";
  });

  const availableSeasons = useMemo(() => {
    if (!bio || !playerSeasonStats.data) return [];
    const bRows = selectPlayerRows(playerSeasonStats.data.batters || [], bio.playerName, bio.fullName);
    const pRows = selectPlayerRows(playerSeasonStats.data.bowlers || [], bio.playerName, bio.fullName);
    const seasons = new Set<string>();
    bRows.forEach((r: any) => r.season && seasons.add(String(r.season)));
    pRows.forEach((r: any) => r.season && seasons.add(String(r.season)));
    return Array.from(seasons).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [bio, playerSeasonStats.data]);

  const activeBatterStats = useMemo(() => {
    if (selectedSeasonScope === "career" || !selectedSeasonScope) {
      return batterStats ?? null;
    }
    if (!bio || !playerSeasonStats.data?.batters) return batterStats ?? null;
    const rows = selectPlayerRows(playerSeasonStats.data.batters, bio.playerName, bio.fullName);
    const seasonRow = rows.find((r: any) => String(r.season) === selectedSeasonScope);
    return seasonRow ?? batterStats ?? null;
  }, [selectedSeasonScope, batterStats, bio, playerSeasonStats.data]);

  const activeBowlerStats = useMemo(() => {
    if (selectedSeasonScope === "career" || !selectedSeasonScope) {
      return bowlerStats ?? null;
    }
    if (!bio || !playerSeasonStats.data?.bowlers) return bowlerStats ?? null;
    const rows = selectPlayerRows(playerSeasonStats.data.bowlers, bio.playerName, bio.fullName);
    const seasonRow = rows.find((r: any) => String(r.season) === selectedSeasonScope);
    return seasonRow ?? bowlerStats ?? null;
  }, [selectedSeasonScope, bowlerStats, bio, playerSeasonStats.data]);

  /**
   * Which discipline this profile leads with.
   *
   * Presence of a batting record is not enough on its own — nearly every bowler
   * has one. Yuzvendra Chahal has a handful of tail-end runs and ~220 wickets,
   * and showing him as a batter with a "best season" of 13 runs reads as broken.
   * Weighting a wicket against roughly 20 runs puts specialists on the right
   * side and leaves genuine all-rounders near the boundary either way.
   */
  const leadsWithBowling = useMemo(() => {
    const runs = Number((batterStats as any)?.runs ?? 0);
    const wickets = Number((bowlerStats as any)?.wickets ?? 0);
    if (!wickets) return false;
    if (!runs) return true;
    return wickets * 20 > runs;
  }, [batterStats, bowlerStats]);

  /** The discipline the profile leads with, before any manual override. */
  const defaultIsBatting = !!batterStats && !leadsWithBowling;

  // Which disciplines this player actually has season rows for. An all-rounder
  // has both, so the chart offers a toggle rather than guessing for them.
  const availableDisciplines = useMemo(() => {
    if (!bio) return { batting: false, bowling: false };
    return {
      batting: selectPlayerRows(playerSeasonStats.data?.batters as any[], bio.playerName, bio.fullName).length > 0,
      bowling: selectPlayerRows(playerSeasonStats.data?.bowlers as any[], bio.playerName, bio.fullName).length > 0,
    };
  }, [bio, playerSeasonStats.data]);

  // null means "follow the player's primary discipline"; set once the reader
  // picks a tab.
  const [chartDiscipline, setChartDiscipline] = useState<"batting" | "bowling" | null>(null);

  const showAsBatter = useMemo(() => {
    if (chartDiscipline === "batting") return true;
    if (chartDiscipline === "bowling") return false;
    // Fall back to whichever discipline actually has data if only one does.
    if (defaultIsBatting && !availableDisciplines.batting && availableDisciplines.bowling) return false;
    if (!defaultIsBatting && !availableDisciplines.bowling && availableDisciplines.batting) return true;
    return defaultIsBatting;
  }, [chartDiscipline, defaultIsBatting, availableDisciplines]);

  const latestTeams = usePlayerLatestTeams();

  // Dynamically resolve player's team based on synchronized dataset
  const getPlayerTeam = (player: string): string => {
    if (latestTeams.data && latestTeams.data[player]) return latestTeams.data[player];
    const bioCandidate = Object.values(playerBios.data || {}).find(b => matchPlayerName(b.playerName, player));
    if (bioCandidate && ((bioCandidate as any).team || (bioCandidate as any).currentTeam)) {
      return (bioCandidate as any).team || (bioCandidate as any).currentTeam;
    }
    const name = player.toLowerCase().trim();
    if (name.includes("kohli")) return "Royal Challengers Bengaluru";
    if (name.includes("rohit") || name.includes("sharma")) return "Mumbai Indians";
    if (name.includes("dhoni")) return "Chennai Super Kings";
    return "IPL";
  };

  // Declared before primaryTeam, which reads it (it used to be declared after, which threw on every render).
  const playerRecentMatches = usePlayerRecentMatches(playerKey);

  const primaryTeam = useMemo(() => {
    // RULE B (General Player Bio / DP): Lead with latest actual played IPL match appearance
    if (playerRecentMatches && playerRecentMatches.length > 0) {
      const latestMatch = playerRecentMatches[0];
      if (latestMatch?.team) return latestMatch.team;
    }
    if (squadHistory.length > 0) return squadHistory[squadHistory.length - 1].team;
    if (bio && ((bio as any).team || (bio as any).currentTeam)) return (bio as any).team || (bio as any).currentTeam;
    if (bio && latestTeams.data && latestTeams.data[bio.playerName]) return latestTeams.data[bio.playerName];
    if (bio) return getPlayerTeam(bio.playerName);
    return "Mumbai Indians";
  }, [playerRecentMatches, squadHistory, bio, latestTeams.data]);

  const pColor = useMemo(() => teamColor(primaryTeam), [primaryTeam]);
  const pShort = useMemo(() => teamShort(primaryTeam), [primaryTeam]);

  // Query Intelligence Hub Articles related to this player
  const playerArticles = useMemo(() => {
    const allArticles = getV2Index();
    const pName = (bio?.playerName || profileName || "").toLowerCase().trim();
    const fName = (bio?.fullName || "").toLowerCase().trim();
    const parts = (bio?.fullName || bio?.playerName || profileName || "").trim().split(/\s+/);
    const first = parts[0] ? parts[0].toLowerCase() : "";
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    const initialPlusLast = first && last ? `${first[0]} ${last}` : "";

    const matched = allArticles.filter(art => {
      if (art.players && art.players.length > 0) {
        for (const rawP of art.players) {
          const p = rawP.toLowerCase().trim();
          if (p === pName || p === fName) return true;
          if (initialPlusLast && p === initialPlusLast) return true;
          if (p.includes(pName) || pName.includes(p)) return true;
          if (fName && (p.includes(fName) || fName.includes(p))) return true;
          if (last.length > 3 && p.endsWith(last)) return true;
        }
      }
      const title = (art.title || "").toLowerCase();
      const dek = (art.dek || "").toLowerCase();
      if (title.includes(pName) || (fName && title.includes(fName))) return true;
      if (initialPlusLast && (title.includes(initialPlusLast) || dek.includes(initialPlusLast))) return true;
      if (last.length > 3 && (title.includes(last) || dek.includes(last))) return true;
      return false;
    });

    if (matched.length >= 3) return matched;

    // Supplement with franchise intelligence articles if under 3
    const fCode = primaryTeam ? teamShort(primaryTeam) : "";
    if (fCode) {
      const franchiseMatches = allArticles.filter(a => a.franchise.toUpperCase() === fCode.toUpperCase());
      const set = new Set(matched.map(m => m.id));
      const res = [...matched];
      for (const a of franchiseMatches) {
        if (!set.has(a.id)) {
          res.push(a);
          set.add(a.id);
        }
        if (res.length >= 6) break;
      }
      return res;
    }
    return matched;
  }, [bio?.playerName, bio?.fullName, profileName, primaryTeam]);

  const recentScores = useMemo(() => {
    if (!playerRecentMatches || !playerRecentMatches.length) return [];
    return playerRecentMatches.slice(0, 5).map(m => ({
      runs: m.batting?.runs ?? 0,
      notOut: m.batting?.notOut ?? false,
      balls: m.batting?.balls ?? 0,
      vsTeam: m.vsTeam ?? "IPL",
      wickets: m.bowling?.wickets ?? 0,
      bowlRuns: m.bowling?.runs ?? 0,
      date: m.date,
    }));
  }, [playerRecentMatches]);

  const jerseyNo = useMemo(() => {
    const jMap = playerJerseysQuery.data || {};
    const nKey = bio?.playerName?.toLowerCase()?.trim() || "";
    const fKey = bio?.fullName?.toLowerCase()?.trim() || "";
    const sKey = slug?.toLowerCase()?.trim() || "";
    if (jMap[nKey]) return jMap[nKey];
    if (jMap[fKey]) return jMap[fKey];
    if (jMap[sKey]) return jMap[sKey];
    for (const [k, v] of Object.entries(jMap)) {
      if (nKey.includes(k) || k.includes(nKey)) return v;
    }
    const fallbackNum = parseInt(String(bio?.playerId || "").replace(/\D/g, ""), 10);
    return fallbackNum && fallbackNum < 100 ? String(fallbackNum).padStart(2, "0") : "04";
  }, [playerJerseysQuery.data, bio, slug]);

  // Matchup filter states
  const [vsPlayerName, setVsPlayerName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOppSearchOpen, setIsOppSearchOpen] = useState<boolean>(false);
  const [filterPhase, setFilterPhase] = useState<"all" | "pp" | "middle" | "death">("all");
  const [filterBowlerType, setFilterBowlerType] = useState<"all" | "pace" | "spin">("all");
  const [filterInnings, setFilterInnings] = useState<"all" | "1st" | "2nd">("all");
  const [filterBatPos, setFilterBatPos] = useState<"open" | "3" | "4" | "5">("3");
  const [filterVenue, setFilterVenue] = useState<string>("all");
  const [filterOppTeam, setFilterOppTeam] = useState<string>("all");

  const getBioForPlayer = (playerName: string): PlayerBio | undefined =>
    Object.values(playerBios.data || {}).find(candidate => matchPlayerName(candidate.playerName, playerName));

  const getMetadataBowlerType = (playerName: string): "pace" | "spin" => {
    const style = (getBioForPlayer(playerName)?.bowlStyle || "").toLowerCase();
    return style.includes("spin") || style.includes("legbreak") || style.includes("offbreak") ||
      style.includes("orthodox") || style.includes("chinaman") || style.includes("slow left") ? "spin" : "pace";
  };

  /**
   * Opponents this player has actually faced, busiest duel first.
   *
   * Previously this listed every leading batter or bowler in the league, so a
   * reader could select someone the player had never met and be shown a screen
   * of zeros as though it were a record.
   */
  const realOpponents = useQuery<Array<{
    opponent: string; balls: number; runs: number; dismissals: number; strikeRate: number;
  }>>({
    queryKey: ["matchup-opponents", bio?.playerName, showAsBatter ? "batter" : "bowler"],
    enabled: activeSubTab === "matchups" && !!bio?.playerName,
    staleTime: 1000 * 60 * 60,
    retry: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        player: bio!.playerName,
        role: showAsBatter ? "batter" : "bowler",
      });
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/matchup-opponents?${params}`);
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/json")) {
        throw new Error("Failed to load matchup opponents");
      }
      return res.json();
    },
  });

  const opponentOptions = useMemo(() => {
    const apiList = realOpponents.data ?? [];
    let opts = apiList.length > 0
      ? apiList.map(o => ({
          player: o.opponent,
          balls: o.balls,
          runs: o.runs,
          dismissals: o.dismissals,
          strikeRate: o.strikeRate,
        }))
      : realOpponents.isError
        ? (showAsBatter ? (topBowlers.data?.wickets ?? []) : (topBatters.data?.runs ?? []))
            .filter(p => !isSamePlayerName(p.player, bio?.playerName ?? ""))
            .map(p => ({
              player: p.player,
              balls: Number((p as any).balls ?? 0),
              runs: Number((p as any).runs ?? 0),
              dismissals: Number((p as any).wickets ?? 0),
              strikeRate: Number((p as any).sr ?? 0),
            }))
        : [];
    if (filterOppTeam !== "all") {
      opts = opts.filter(o => getPlayerTeam(o.player) === filterOppTeam);
    }
    if (showAsBatter && filterBowlerType !== "all") {
      opts = opts.filter(o => getMetadataBowlerType(o.player) === filterBowlerType);
    }
    return opts;
  }, [realOpponents.data, realOpponents.isError, topBowlers.data, topBatters.data, filterOppTeam, filterBowlerType, showAsBatter, playerBios.data, bio?.playerName]);

  // No hardcoded stand-in: if there is nobody to show, nothing is selected.
  const defaultOpponentName = useMemo(
    () => opponentOptions[0]?.player ?? "",
    [opponentOptions],
  );

  const activeOpponentName = vsPlayerName && opponentOptions.some(o => o.player === vsPlayerName)
    ? vsPlayerName
    : defaultOpponentName;

  const opponentStats = useMemo(() => {
    if (!activeOpponentName) return null;
    if (showAsBatter) {
      return topBowlers.data?.wickets.find(b => b.player === activeOpponentName) || null;
    } else {
      return topBatters.data?.runs.find(b => b.player === activeOpponentName) || null;
    }
  }, [activeOpponentName, showAsBatter, topBowlers.data, topBatters.data]);

  const matchupPair = useMemo(() => {
    if (!bio || !activeOpponentName) return null;
    if (showAsBatter) return { batter: bio.playerName, bowler: activeOpponentName };
    if (bowlerStats) return { batter: activeOpponentName, bowler: bio.playerName };
    return null;
  }, [bio, activeOpponentName, showAsBatter]);

  const recordedMatchupApiQuery = useQuery<RecordedMatchupStats | null>({
    queryKey: ["recorded-player-matchup", matchupPair?.batter, matchupPair?.bowler, filterPhase, filterBowlerType, filterInnings, filterVenue],
    queryFn: async () => {
      if (!matchupPair) return null;
      const batterName = resolveScorecardName(matchupPair.batter, playerBios.data);
      const bowlerName = resolveScorecardName(matchupPair.bowler, playerBios.data);
      const params = new URLSearchParams({ batter: batterName, bowler: bowlerName });
      if (filterPhase !== "all") {
        params.set("phase", filterPhase === "pp" ? "Powerplay" : filterPhase === "middle" ? "Middle" : "Death");
      }
      if (filterBowlerType !== "all") {
        params.set("bowlerType", filterBowlerType === "pace" ? "Pacer" : "Spinner");
      }
      if (filterInnings !== "all") params.set("innings", filterInnings === "1st" ? "1st Innings" : "2nd Innings");
      if (filterVenue !== "all") params.set("venue", filterVenue);
      try {
        const response = await fetch(`/api/stats/matchup?${params.toString()}`);
        const ct = response.headers.get("content-type") || "";
        if (!response.ok || ct.includes("text/html")) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: activeSubTab === "matchups" && !!matchupPair,
  });

  const recordedBatterDeliveries = useRecordedDeliveries(
    activeSubTab === "matchups" && matchupPair ? matchupPair.batter : "",
  );

  const clientMatchupFallback = useMemo(() => {
    if (!matchupPair || filterVenue !== "all") return null;
    if (filterBowlerType !== "all" && showAsBatter && getMetadataBowlerType(matchupPair.bowler) !== filterBowlerType) {
      return null;
    }
    return buildClientMatchupSummary(recordedBatterDeliveries.data, matchupPair.batter, matchupPair.bowler, playerBios.data, {
      phase: filterPhase,
      innings: filterInnings,
    });
  }, [recordedBatterDeliveries.data, matchupPair, playerBios.data, filterPhase, filterInnings, filterVenue, filterBowlerType, showAsBatter]);

  const recordedMatchupQuery = useMemo(() => {
    const api = recordedMatchupApiQuery.data;
    const data: RecordedMatchupStats | null =
      api && api.balls > 0
        ? api
        : clientMatchupFallback && clientMatchupFallback.balls > 0
          ? clientMatchupFallback
          : api ?? null;
    return {
      ...recordedMatchupApiQuery,
      data,
      isLoading: recordedMatchupApiQuery.isLoading && !clientMatchupFallback,
    };
  }, [recordedMatchupApiQuery, clientMatchupFallback]);

  const matchupDominanceIndex =
    recordedMatchupQuery.data && recordedMatchupQuery.data.balls > 0
      ? recordedMatchupQuery.data.dominanceIndex
      : 50;

  // Filtering opponent options based on search query (full list preserved for scrollable dropdown)
  const filteredOpponents = useMemo(() => {
    if (!searchQuery) return opponentOptions;
    const q = searchQuery.toLowerCase().trim();
    return opponentOptions.filter(o =>
      o.player.toLowerCase().includes(q) ||
      displayPlayerName(o.player, displayNames).toLowerCase().includes(q)
    );
  }, [opponentOptions, searchQuery, displayNames]);

  const allVenueNames = useMemo(() => {
    const set = new Set<string>();
    for (const v of venuesData.data ?? []) {
      const n = normalizeVenueName(v.venue);
      if (n) set.add(n);
    }
    return Array.from(set).sort();
  }, [venuesData.data]);

  const allTeamNames = useMemo(() => {
    const set = new Set<string>();
    for (const t of teamsData.data ?? []) {
      if (t.team) set.add(t.team);
    }
    return Array.from(set).sort();
  }, [teamsData.data]);

  // Build beautiful season stats progression chart synchronized with real-time season-tops database
  // NOTE: this used to source from `seasonTops` (season-tops.json), which
  // only lists the single #1 run-scorer/wicket-taker league-wide per season
  // — so any season where this player wasn't literally the league leader
  // silently vanished from their own chart (e.g. Kohli's 2008 rookie season
  // dropped out because Shaun Marsh topped the runs table that year, even
  // though Kohli's real 165-run 2008 season is right there in the per-player
  // season stats). Pulling from playerSeasonStats instead — every season the
  // player actually appears in, not just seasons they led the league.
  const seasonalStats = useMemo(() => {
    if (!bio) return [];
    const rows = showAsBatter ? playerSeasonStats.data?.batters : playerSeasonStats.data?.bowlers;
    const mine = selectPlayerRows(rows as any[], bio.playerName, bio.fullName);
    if (mine.length === 0) return [];

    // One point per season. A player can legitimately appear twice in a season
    // after a mid-season transfer, so same-season rows are summed rather than
    // plotted as two competing values.
    const bySeason = new Map<string, any>();
    for (const row of mine) {
      const season = String(row.season);
      const prev = bySeason.get(season);
      if (!prev) {
        // Shape must follow the SAME flag that chose the source rows. Keying
        // this off batterStats while the rows came from the bowling table gave
        // Chahal batter-shaped points with no wickets in them, so the header
        // read "Most Wickets 0".
        bySeason.set(season, showAsBatter
          ? { season, runs: row.runs ?? 0, sr: row.sr ?? 0 }
          : { season, wickets: row.wickets ?? 0, econ: row.econ ?? 0 });
        continue;
      }
      if (showAsBatter) {
        prev.runs += row.runs ?? 0;
        prev.sr = Math.round(((prev.sr + (row.sr ?? 0)) / 2) * 100) / 100;
      } else {
        prev.wickets += row.wickets ?? 0;
        prev.econ = Math.round(((prev.econ + (row.econ ?? 0)) / 2) * 100) / 100;
      }
    }
    return Array.from(bySeason.values()).sort((a, b) => a.season.localeCompare(b.season));
  }, [bio, showAsBatter, playerSeasonStats.data]);

  const radarData = useMemo(() => {
    if (!bio) return [];

    const b = activeBatterStats ?? batterStats;
    const w = activeBowlerStats ?? bowlerStats;

    // showAsBatter can now be set by the discipline toggle, so it no longer
    // implies batterStats exists — the radar needs its own guard.
    if (showAsBatter && b) {
      return [
        { subject: "Powerplay Scoring", short: "Powerplay", value: b.ppSr || 0 },
        { subject: "Middle-Overs Control", short: "Middle", value: b.middleSr || 0 },
        { subject: "Death-Overs Power", short: "Death", value: b.deathSr || 0 },
        { subject: "Boundary Ratio", short: "Boundaries", value: b.boundaryPct || 0 },
        { subject: "Clutch Contribution", short: "Clutch", value: b.clutch || 0 },
        { subject: "Running Between Wkts", short: "Running", value: b.form || 0 },
      ];
    }

    if (w) {
      return [
        { subject: "Boundary Conceded %", short: "Boundaries", value: w.boundaryPct || 0 },
        // Unknown bowling type: no Spin Profile axis rather than a 0 that reads as pace (Day 6).
        ...(w.bowlerType === "Unknown" ? [] : [{ subject: "Spin Profile", short: w.bowlerType === "Spinner" ? "Spin" : "Pace", value: w.bowlerType === "Spinner" ? 100 : 0 }]),
        { subject: "True Economy Delta", short: "True Econ", value: w.trueEconomy || 0 },
        { subject: "Dot Ball Ratio", short: "Dot Balls", value: w.dotPct || 0 },
        { subject: "Clutch Wickets", short: "Clutch", value: w.clutch || 0 },
        { subject: "Tactical Execution", short: "Tactics", value: w.form || 0 },
      ];
    }

    return [];
  }, [bio, activeBatterStats, activeBowlerStats, batterStats, bowlerStats, showAsBatter]);

  if (playerBios.isLoading || identityIndex.isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-primary">Aligning Vector Roster profiles...</span>
        </div>
      </Layout>
    );
  }

  if (playerBios.isError || !bio) {
    if (scoutParams?.id) return <ScoutPlayerPage />;
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white/60">
            {playerBios.isError ? "Player data is unavailable right now." : "Player not found."}
          </span>
          <Link href="/stats">
            <button className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline">Back to Stats Center</button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Format helper for numbers
  const fmt = (v: number) => new Intl.NumberFormat("en-IN").format(v);

  return (
    <Layout>
      <div className="space-y-6 pb-12 px-4 max-w-7xl mx-auto">
        
        {/* HERO CINEMATIC HEADER WITH VOLUMETRIC STADIUM LIGHTING & WATERMARK */}
        <div
          className="rounded-[28px] overflow-hidden relative shadow-2xl border border-white/10 bg-gradient-to-br from-[#0d1326] via-[#080c18] to-[#03050a]"
          style={{ borderLeft: `5px solid ${pColor}` }}
        >
          <div className="p-5 sm:p-7 md:p-8 relative overflow-hidden">
            {/* Volumetric Radial Floodlight & Team Color Halo */}
            <div
              className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-25"
              style={{ background: pColor || "#8B5CF6" }}
            />
            <div
              className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[550px] h-[360px] rounded-full blur-[170px] pointer-events-none opacity-15"
              style={{ background: pColor || "#38BDF8" }}
            />
            {/* Carbon / Stadium Grid Texture Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />

            {/* Giant Faint Stencil Watermark Typography */}
            <div className="absolute right-4 md:right-12 bottom-0 select-none pointer-events-none overflow-hidden flex items-end opacity-[0.035] leading-none z-0">
              <span className="font-black text-[130px] sm:text-[180px] lg:text-[230px] tracking-tighter uppercase font-mono text-white">
                {pShort || profileName.split(" ").slice(-1)[0]}
              </span>
            </div>

            {/* TIER 1: ATHLETE IDENTITY & CORE STATS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center lg:items-start relative z-10">
              
              {/* 1. ATHLETE SHOWCASE STAGE */}
              <div className="lg:col-span-3 flex flex-col items-center justify-center relative min-h-[280px]">
                {/* Dynamic Player Aura / Halo Plinth */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 sm:w-60 sm:h-60 rounded-full blur-[70px] opacity-35 pointer-events-none"
                  style={{ background: pColor || "#8B5CF6" }}
                />

                {/* Showcase Cutout Display (Unconstrained Cinematic Athletic Cutout) */}
                <div className="relative w-56 sm:w-64 md:w-72 h-64 sm:h-72 md:h-80 flex items-end justify-center select-none group/hero">
                  <PlayerAvatar
                    framing="chest"
                    name={bio.playerName}
                    teamId={primaryTeam}
                    season={playerRecentMatches?.[0]?.season ?? (squadHistory?.[squadHistory.length - 1]?.season)}
                    strictHistoricalJersey={false}
                    playerImages={playerImages.data}
                    bio={bio}
                    imgClassName="w-full h-full object-contain object-bottom filter contrast-[1.06] drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] transition-transform duration-500 group-hover/hero:scale-105"
                  />
                  {/* Seamless Bottom Vignette Fade */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#080c18] via-[#080c18]/50 to-transparent pointer-events-none z-[2]" />
                </div>
              </div>

              {/* 2. ATHLETE IDENTITY, BIO & ACTIONS (Middle Column) */}
              <div className="lg:col-span-5 flex flex-col justify-between text-center lg:text-left space-y-4">
                <div>
                  {/* Badge Row */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-3">
                    <span
                      className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-1.5"
                      style={{ backgroundColor: `${pColor}18`, borderColor: `${pColor}50`, color: pColor }}
                    >
                      <TeamLogo team={primaryTeam} size="w-3.5 h-3.5" />
                      <span>{primaryTeam} ({pShort})</span>
                    </span>
                    {jerseyNo && (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-white/10 border border-white/15 text-white">
                        #{jerseyNo}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/80">
                      {bio.role}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Elite Tier
                    </span>
                  </div>

                  {/* Player Name Headlines */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-none drop-shadow-md font-sans">
                      <span>{profileName}</span>
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px] font-mono font-bold text-white/60 uppercase mt-2.5">
                      <span>{bio.country || "India"}</span>
                      <span>·</span>
                      <span>{bio.batStyle || "Right-hand Bat"}</span>
                      {bio.bowlStyle && (
                        <>
                          <span>·</span>
                          <span>{bio.bowlStyle}</span>
                        </>
                      )}
                      {bio.age && (
                        <>
                          <span>·</span>
                          <span className="text-white/80">Age: {bio.age}</span>
                        </>
                      )}
                      {bio.iplDebut && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400">IPL Debut: {bio.iplDebut}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Player Bio Narrative */}
                  {bio.bio && (
                    <p className="text-xs sm:text-[13px] text-white/75 leading-relaxed font-normal mt-3 max-w-2xl line-clamp-3">
                      {bio.bio}
                    </p>
                  )}

                  {/* Clean Quick Action Suite Buttons */}
                  <div className="flex items-center justify-center lg:justify-start gap-2.5 mt-3.5">
                    <button
                      onClick={() => setShowCompareModal(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. CORE TELEMETRY STAT TILES (Right Column) */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-2.5">
                {/* Season / Career Scope Control */}
                <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-xs flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-white/70 truncate">
                      {selectedSeasonScope === "career"
                        ? `Career (${activeBatterStats?.matches ?? activeBowlerStats?.matches ?? seasonalStats.length} M)`
                        : `IPL ${selectedSeasonScope} (${activeBatterStats?.matches ?? activeBowlerStats?.matches ?? 1} M)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedSeasonScope("career")}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedSeasonScope === "career"
                          ? "bg-primary text-white shadow-xs"
                          : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      Career
                    </button>
                    {availableSeasons.slice(0, 2).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSeasonScope(s)}
                        className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selectedSeasonScope === s
                            ? "bg-primary text-white shadow-xs"
                            : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    {availableSeasons.length > 2 && (
                      <select
                        value={availableSeasons.slice(0, 2).includes(selectedSeasonScope) || selectedSeasonScope === "career" ? "" : selectedSeasonScope}
                        onChange={(e) => { if (e.target.value) setSelectedSeasonScope(e.target.value); }}
                        className="px-1.5 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider bg-[#0b1020] border border-white/10 text-white/70 cursor-pointer"
                        title="More seasons"
                      >
                        <option value="" disabled>More...</option>
                        {availableSeasons.slice(2).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* 4 Stat HUD Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {((showAsBatter && activeBatterStats) || (!activeBowlerStats && activeBatterStats)) && (
                    <>
                      {/* Metric 1: Total Runs */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              Runs
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-mono font-bold">
                              {selectedSeasonScope === "career"
                                ? (activeBatterStats.runs >= 3000 ? "TOP 3%" : activeBatterStats.runs >= 1500 ? "CORE XI" : "LEAGUE")
                                : (activeBatterStats.runs >= 500 ? "ORANGE CAP" : activeBatterStats.runs >= 300 ? "KEY BATTER" : "SQUAD")}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white tracking-tight block">
                            {fmt(activeBatterStats.runs)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {activeBatterStats.hundreds ? `${activeBatterStats.hundreds}× 100s · ` : ""}{activeBatterStats.fifties || 0}× 50s
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((activeBatterStats.runs / (selectedSeasonScope === "career" ? 4500 : 700)) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 2: Strike Rate */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Zap className="w-2.5 h-2.5 text-primary" />
                              Strike Rate
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[7px] font-mono font-bold">
                              {activeBatterStats.sr >= 145 ? "ELITE" : activeBatterStats.sr >= 132 ? "HIGH INTENT" : "ANCHOR"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-primary tracking-tight block">
                            {activeBatterStats.sr.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {fmt(activeBatterStats.fours || 0)} 4s · {fmt(activeBatterStats.sixes || 0)} 6s
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((activeBatterStats.sr - 90) / 75) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 3: Average */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Target className="w-2.5 h-2.5 text-cyan-400" />
                              Average
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[7px] font-mono font-bold">
                              {activeBatterStats.avg >= 35 ? "ANCHOR+" : "SOLID"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white/90 tracking-tight block">
                            {activeBatterStats.avg.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {activeBatterStats.innings || 0} Inngs · {fmt(activeBatterStats.balls || 0)} Balls
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((activeBatterStats.avg / 45) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 4: High Score */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Trophy className="w-2.5 h-2.5 text-amber-400" />
                              High Score
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[7px] font-mono font-bold">
                              {activeBatterStats.highest >= 100 ? "CENTURION" : activeBatterStats.highest >= 50 ? "HALF-CENTURY" : "MATCH-WINNER"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-amber-300 tracking-tight block">
                            {activeBatterStats.highest}{activeBatterStats.highestNotOut ? "*" : ""}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Peak Match Dominance
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                              style={{ width: `${Math.min(100, Math.max(20, Math.round((activeBatterStats.highest / 130) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {((!showAsBatter && activeBowlerStats) || (!activeBatterStats && activeBowlerStats)) && (
                    <>
                      {/* Metric 1: Total Wickets */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Flame className="w-2.5 h-2.5 text-emerald-400" />
                              Wickets
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-mono font-bold">
                              {activeBowlerStats.wickets >= 100 ? "CENTURY" : activeBowlerStats.wickets >= 50 ? "KEY STRIKER" : "SQUAD"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white tracking-tight block">
                            {activeBowlerStats.wickets}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {activeBowlerStats.fourW ? `${activeBowlerStats.fourW}× 4w · ` : ""}{activeBowlerStats.fiveW ? `${activeBowlerStats.fiveW}× 5w` : "Lead Strike Asset"}
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((activeBowlerStats.wickets / 140) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 2: Economy */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Shield className="w-2.5 h-2.5 text-cyan-400" />
                              Economy
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[7px] font-mono font-bold">
                              {activeBowlerStats.econ <= 7.5 ? "TOP 5%" : "CONTROLLED"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-cyan-300 tracking-tight block">
                            {activeBowlerStats.econ.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {activeBowlerStats.overs || "0"} Overs Defended
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((12 - activeBowlerStats.econ) / 6) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 3: Bowl Strike Rate */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Zap className="w-2.5 h-2.5 text-primary" />
                              Bowl SR
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[7px] font-mono font-bold">
                              {activeBowlerStats.sr <= 18 ? "LETHAL" : "REGULAR"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-primary tracking-tight block">
                            {activeBowlerStats.sr.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Balls / Dismissal
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((30 - activeBowlerStats.sr) / 18) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 4: Best Spell */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1 text-white/70">
                              <Trophy className="w-2.5 h-2.5 text-amber-400" />
                              Best Spell
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[7px] font-mono font-bold">
                              BENCHMARK
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-amber-300 tracking-tight block">
                            {activeBowlerStats.best}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Peak Match Return
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 w-3/4" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BROADCAST COMMAND STRIP NAVIGATION (Elevated & High-Contrast) */}
        <div className="bg-white/90 dark:bg-[#0B1020]/90 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 p-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "overview"
                  ? "bg-primary text-slate-950 font-black shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Bio &amp; Career</span>
            </button>
            <button
              onClick={() => setActiveSubTab("metrics")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "metrics"
                  ? "bg-primary text-slate-950 font-black shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Vector Metrics</span>
            </button>
            <button
              onClick={() => setActiveSubTab("lens")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "lens"
                  ? "bg-primary text-slate-950 font-black shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Batter Lens</span>
            </button>
            <button
              onClick={() => setActiveSubTab("intelligence")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "intelligence" || activeSubTab === "clutch" || activeSubTab === "tactical" || activeSubTab === "venue"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_20px_-3px_rgba(6,182,212,0.6)]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Player Intelligence Hub</span>
            </button>
            <button
              onClick={() => setActiveSubTab("matchups")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "matchups"
                  ? "bg-primary text-slate-950 font-black shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Head To Head</span>
            </button>
            <button
              onClick={() => setActiveSubTab("recent")}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "recent"
                  ? "bg-primary text-slate-950 font-black shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Recent Form</span>
            </button>
          </div>
        </div>

        {/* PROFILE CONTENT AREA */}
        {/* No AnimatePresence/exit: an exiting child stays mounted until its
            exit animation finishes, so when frames stall the previous sub-tab
            never unmounts and two tabs render at once. Keying the div still
            gives the enter animation. */}
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            
            {/* OVERVIEW SUB-TAB */}
            {activeSubTab === "overview" && (
              <>

                {/* Career Seasonal Trend Chart */}
                <GlassCard className="lg:col-span-2 p-5 flex flex-col self-start">
                  <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Career Season-by-Season Progression
                      </h3>
                      <p className="text-[10px] text-white/40 font-bold mt-0.5">
                        {showAsBatter ? "Runs scored and strike rate per season" : "Wickets taken and economy per season"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Discipline toggle, shown only when the player has
                          seasons on both sides of the game. */}
                      {availableDisciplines.batting && availableDisciplines.bowling && (
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                          {([
                            { id: "batting", label: "Batting" },
                            { id: "bowling", label: "Bowling" },
                          ] as const).map(opt => {
                            const active = opt.id === (showAsBatter ? "batting" : "bowling");
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setChartDiscipline(opt.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                  active
                                    ? "bg-primary/30 text-white shadow-[0_0_14px_-4px_hsl(var(--primary))]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {seasonalStats.length > 0 && (
                        <>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Seasons</div>
                            <div className="text-[15px] font-black text-white">{seasonalStats.length}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                              {showAsBatter ? "Best Season" : "Most Wickets"}
                            </div>
                            <div className="text-[15px] font-black text-primary">
                              {Math.max(0, ...seasonalStats.map((s: any) => (showAsBatter ? s.runs : s.wickets) || 0))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={seasonalStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={pColor} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={pColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="season" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ ...tooltipStyle }} />
                        <Area 
                          type="monotone" 
                          dataKey={showAsBatter ? "runs" : "wickets"} 
                          name={showAsBatter ? "Runs Scored" : "Wickets Taken"} 
                          stroke={pColor} 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#chartGlow)" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey={showAsBatter ? "sr" : "econ"} 
                          name={showAsBatter ? "Strike Rate" : "Economy"} 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                {/* Player Information — sits in the third column alongside the progression
                    chart without duplicating the top hero portrait or repeating bio facts. */}
                <GlassCard className="p-5 flex flex-col self-start gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-1 flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      Player Information
                    </h3>
                    <p className="text-[10px] text-white/40 font-bold mb-3">Biographical profile and career milestones</p>

                    <div className="flex flex-col gap-1.5 flex-1">
                      {[
                        { label: "Country", icon: Globe, tint: "text-primary", value: resolvedCountry },
                        {
                          label: "Date of Birth", icon: Calendar, tint: "text-primary",
                          value: bio.birthDate ? `${bio.birthDate}${bio.age ? ` (${bio.age} yrs)` : ""}` : null,
                        },
                        { label: "Birth Place", icon: MapPin, tint: "text-primary", value: bio.birthPlace || null },
                        { label: "Batting Style", icon: Flame, tint: "text-orange-300", value: bio.batStyle || null },
                        { label: "Bowling Style", icon: Target, tint: "text-sky-300", value: bio.bowlStyle || null },
                        {
                          label: "IPL Debut", icon: Trophy, tint: "text-amber-400",
                          value: resolvedIplDebut ? `Season ${resolvedIplDebut}` : null,
                        },
                        { label: "International Debut", icon: CalendarDays, tint: "text-primary", value: bio.intDebut || null },
                      ].map(({ label, icon: Icon, tint, value }) => (
                        <div
                          key={label}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Icon className={`w-3.5 h-3.5 ${tint}`} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black text-white/35 uppercase tracking-widest leading-tight">
                              {label}
                            </span>
                            <span className={`text-[12px] font-bold leading-snug truncate ${value ? "text-white" : "text-white/25 italic"}`}>
                              {value || NOT_AVAILABLE}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>



                {/* ── 8. CAREER MILESTONES: 3 FEATURED LANDMARKS & EXPANDABLE TIMELINE ── */}
                <PlayerCareerMilestones
                  key={`${bio.playerName}-${showAsBatter}`}
                  name={bio.fullName || bio.playerName}
                  aliases={[bio.playerName]}
                  seasons={seasonalStats}
                  batting={showAsBatter}
                  accent={pColor}
                  history={squadHistory}
                  captaincy={captaincy}
                  matches={playerRecentMatches}
                />

                {/* ── 9. CAPTAINTCY & AUCTION HISTORY ── */}
                {captaincy && (
                  <GlassCard className="lg:col-span-3 p-5">
                    <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-400" />
                          Captaincy Record
                        </h3>
                        <p className="text-[10px] text-white/40 font-bold mt-0.5">
                          {captaincy.firstSeason === captaincy.lastSeason
                            ? `Led in ${captaincy.firstSeason}`
                            : `Led from ${captaincy.firstSeason} to ${captaincy.lastSeason}`}
                        </p>
                      </div>
                      {captaincy.titles > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-300">
                          <Trophy className="w-3 h-3" />
                          {captaincy.titles} {captaincy.titles === 1 ? "Title" : "Titles"} as captain
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { label: "Matches", value: String(captaincy.matches) },
                        { label: "Won", value: String(captaincy.won), tint: "#34d399" },
                        { label: "Lost", value: String(captaincy.lost), tint: "#f87171" },
                        {
                          label: "Win %",
                          value: `${captaincy.matches > 0 ? Math.round((captaincy.won / captaincy.matches) * 1000) / 10 : 0}%`,
                          tint: pColor,
                        },
                        { label: "Tied / NR", value: `${captaincy.tied}/${captaincy.noResult}` },
                      ].map(s => (
                        <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">{s.label}</div>
                          <div className="text-[18px] font-black mt-0.5 tabular-nums" style={s.tint ? { color: s.tint } : undefined}>
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-1">Led</span>
                      {captainStints.map(s => {
                        const active = captainClub === s.code;
                        return (
                          <button
                            key={s.code}
                            // Selecting a club narrows the view to that stint;
                            // clicking it again clears the selection.
                            onClick={() => setCaptainClub(active ? null : s.code)}
                            disabled={captaincy.teams.length === 1}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                              active
                                ? "bg-white/[0.08] border-white/25"
                                : "bg-white/[0.03] border-white/10 hover:border-white/20"
                            } ${captaincy.teams.length === 1 ? "cursor-default" : "cursor-pointer"}`}
                            style={{ color: teamColor(s.label) }}
                          >
                            <TeamLogo team={s.label} size="w-4 h-4" />
                            {s.label}
                            {s.from != null && (
                              <span className="text-white/35 font-bold">
                                {s.from === s.to ? s.from : `${s.from}–${s.to}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected stint: the seasons are real, the record is not
                        splittable — both are said plainly. */}
                    {captainClub && (() => {
                      const stint = captainStints.find(s => s.code === captainClub);
                      if (!stint) return null;
                      return (
                        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                            {stint.label} stint
                          </div>
                          {stint.seasons.length > 0 ? (
                            <>
                              <div className="text-[12px] font-bold text-white/80">
                                {stint.seasons.length} {stint.seasons.length === 1 ? "season" : "seasons"} as captain
                                {" · "}{stint.seasons.join(", ")}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-primary mt-1">
                                {stint.label} Tactical Stint
                              </div>
                            </>
                          ) : (
                            <div className="text-[11px] font-bold text-white/40">
                              No squad record for this club in the captaincy window.
                            </div>
                          )}
                        </div>
                      );
                    })()}


                  </GlassCard>
                )}

                {/* Auction fee progression across seasons */}
                <GlassCard className="lg:col-span-3 p-5">
                  <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-accent" />
                        Auction Price Progression
                      </h3>
                      <p className="text-[10px] text-white/40 font-bold mt-0.5">
                        Fee paid per season — retentions included, sourced from IPL auction records
                      </p>
                    </div>
                    {squadHistory.length > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Seasons</div>
                          <div className="text-[15px] font-black text-white">{squadHistory.length}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Peak Fee</div>
                          <div className="text-[15px] font-black text-primary">
                            {squadHistory.reduce<string>((best, r) => {
                              if (!r.priceDisplay) return best;
                              const cur = r.priceLakh ?? (r.priceUsd ?? 0) / 1000;
                              const bestRow = squadHistory.find(x => x.priceDisplay === best);
                              const bestVal = bestRow ? (bestRow.priceLakh ?? (bestRow.priceUsd ?? 0) / 1000) : -1;
                              return cur > bestVal ? r.priceDisplay : best;
                            }, "—")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {priceProgression.length > 1 ? (
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceProgression} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="season" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} unit=" Cr" />
                          <Tooltip
                            contentStyle={{ ...tooltipStyle }}
                            formatter={(v: any, _n: any, p: any) => [`₹${Number(v).toFixed(2)} Cr`, p?.payload?.team ?? "Fee"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="crore"
                            name="Fee"
                            stroke="hsl(var(--accent))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#priceGlow)"
                            dot={{ r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}

                  {squadHistory.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left min-w-[420px]">
                        <thead>
                          <tr className="border-b border-white/5">
                            {["Season", "Franchise", "Route", "Fee"].map(h => (
                              <th key={h} className="py-2 pr-4 text-[9px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(showAllAuction ? squadHistory : squadHistory.slice(-3).reverse()).map(r => (
                            <tr key={`${r.season}-${r.team}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 pr-4 text-[12px] font-black text-white/80 tabular-nums">{r.season}</td>
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-white/5 p-0.5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                    <TeamLogo team={r.team} size="w-5 h-5" />
                                  </div>
                                  <span className="text-[11px] font-bold text-white/70 truncate">{r.team}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-4">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${r.acquisition === "retained" ? "text-emerald-300/70" : r.acquisition === "auction" ? "text-white/45" : "text-white/20"}`}>
                                  {r.acquisition ?? "—"}
                                </span>
                              </td>
                              <td className={`py-2 pr-4 text-[12px] font-black tabular-nums ${r.priceDisplay ? "text-primary" : "text-white/20"}`}>
                                {r.priceDisplay ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {squadHistory.length > 3 && (
                        <div className="mt-3 pt-2 border-t border-white/5 text-center">
                          <button
                            onClick={() => setShowAllAuction(!showAllAuction)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            <span>{showAllAuction ? "Collapse older seasons" : `Show all ${squadHistory.length} auction transactions`}</span>
                            {showAllAuction ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-[11px] font-black uppercase tracking-widest text-white/30">
                      No auction record found for this player
                    </div>
                  )}
                </GlassCard>
              </>
            )}

            {/* PLAYER INTELLIGENCE HUB SUB-TAB (Merged from Clutch, Tactical & Venue Intelligence) */}
            {(activeSubTab === "intelligence" || activeSubTab === "clutch" || activeSubTab === "tactical" || activeSubTab === "venue") && (
              <PlayerIntelligenceHub
                playerName={bio?.playerName || profileName || "Player"}
                fullName={bio?.fullName || profileName}
                primaryTeam={primaryTeam}
                pColor={pColor}
                showAsBatter={showAsBatter}
                batterStats={activeBatterStats}
                bowlerStats={activeBowlerStats}
                seasonalStats={seasonalStats}
                recentMatches={playerRecentMatches}
                squadHistory={squadHistory}
                playerRef={scoutParams?.id || (playerKey && identityIndex.data?.keys[playerKey]?.[0]) || bio?.playerName || profileName}
                bio={bio}
                playerImages={playerImages.data}
              />
            )}

            {/* METRICS SUB-TAB */}
            {activeSubTab === "metrics" && (
              <>
                {/* Radar Chart phase performance */}
                <GlassCard className="p-5 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Phase Analysis Radar</h3>
                    <p className="text-[10px] text-white/40 font-bold mt-0.5">Visualizing performance strengths across all overs</p>
                  </div>

                  <div className="h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.12)"} />
                        <PolarAngleAxis dataKey="subject" stroke={isDark ? "rgba(255,255,255,0.65)" : "rgba(51,65,85,0.85)"} fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.15)"} />
                        <Radar name="Performance" dataKey="value" stroke={pColor} fill={pColor} fillOpacity={isDark ? 0.35 : 0.28} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                {/* Advanced Stats Breakdowns */}
                <GlassCard className="lg:col-span-2 p-5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Advanced Telemetry Diagnostics
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {((showAsBatter && batterStats) || (!bowlerStats && batterStats)) && (
                      <>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Boundary Pct (Fours/Sixes)</span>
                          <div className="text-2xl font-black text-white">{batterStats.boundaryPct}%</div>
                          <div className="text-[9px] font-bold text-white/30">{batterStats.fours} Fours · {batterStats.sixes} Sixes</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Powerplay Strike Rate</span>
                          <div className="text-2xl font-black text-blue-400">{batterStats.ppSr.toFixed(0)}</div>
                          <div className="text-[9px] font-bold text-white/30">Overs 0 - 6 execution</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Death-Overs Strike Rate</span>
                          <div className="text-2xl font-black text-red-400">{batterStats.deathSr.toFixed(0)}</div>
                          <div className="text-[9px] font-bold text-white/30">Overs 16 - 20 absolute power</div>
                        </div>
                      </>
                    )}

                    {bowlerStats && (
                      <>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Dot Ball Percentage</span>
                          <div className="text-2xl font-black text-white">{bowlerStats.dotPct}%</div>
                          <div className="text-[9px] font-bold text-white/30">{bowlerStats.dots ?? 0} dots bowled</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Boundary %</span>
                          <div className="text-2xl font-black text-blue-400">{bowlerStats.boundaryPct == null ? "—" : `${bowlerStats.boundaryPct.toFixed(1)}%`}</div>
                          <div className="text-[9px] font-bold text-white/30">{bowlerStats.boundaries ?? ((bowlerStats.fours ?? 0) + (bowlerStats.sixes ?? 0))} boundaries conceded ({bowlerStats.fours ?? 0}4s · {bowlerStats.sixes ?? 0}6s)</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Balls Per Boundary</span>
                          <div className="text-2xl font-black text-red-400">{bowlerStats.ballsPerBoundary?.toFixed(1) ?? "—"}</div>
                          <div className="text-[9px] font-bold text-white/30">Legal deliveries between boundaries</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">True Economy Rate</span>
                          <div className="text-2xl font-black text-purple-400">{bowlerStats.trueEconomy == null ? "—" : `${bowlerStats.trueEconomy > 0 ? "+" : ""}${bowlerStats.trueEconomy.toFixed(2)}`}</div>
                          <div className="text-[9px] font-bold text-white/30">Delta from Match Avg Econ</div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-white">Dynamic Rarity & Roster Rarity</h4>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-1">
                        Rarity profiles index a player's statistical deviation from the average league baseline. A player holding high-end statistics in both the Powerplay and Death overs receives the **Legend Rarity** classification.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* SPATIAL HEATMAP FOR BOWLERS */}
                {!showAsBatter && (
                  <div className="lg:col-span-3">
                    <BowlingHeatmap
                      player={bio.playerName}
                      zones={[
                        { name: "Off Stump / Outside Off", yorkers: 28, length: 42, short: 18 },
                        { name: "Middle Stump Line", yorkers: 34, length: 55, short: 22 },
                        { name: "Leg Stump Line", yorkers: 19, length: 30, short: 14 }
                      ]}
                    />
                  </div>
                )}
              </>
            )}

            {/* RECENT MATCH PERFORMANCES SUB-TAB */}
            {/* BATTER LENS SUB-TAB */}
            {activeSubTab === "lens" && (
              <div className="lg:col-span-3 min-w-0">
                <BatterLens names={[bio?.playerName, bio?.fullName]} />
              </div>
            )}

            {activeSubTab === "recent" && (
              <div className="lg:col-span-3 space-y-6">
                <PlayerRecentMatchesCard
                  matches={playerRecentMatches}
                  playerName={profileName}
                  pColor={pColor}
                  articles={playerArticles}
                />
              </div>
            )}

            {/* MATCHUPS SUB-TAB */}
            {activeSubTab === "matchups" && (
              <div className="lg:col-span-3 space-y-6">
                
                {/* 1. Duelist Selector Panel */}
                <GlassCard className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-primary animate-pulse" />
                        Interactive Duel Selector
                      </h3>
                      <p className="text-[10px] text-white/40 font-bold mt-0.5">Choose an opponent to calculate real-time matchup metrics</p>
                    </div>
                    <Link
                      href={`/stats?tab=head2head&player=${encodeURIComponent(bio.playerName)}`}
                      className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Tactical Lab &amp; Spatial Matrix in Stats</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    
                    {/* Search Bar and Dropdown Selector */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                      <div className="relative flex-1 md:w-60 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                        <input 
                          type="text" 
                          placeholder={showAsBatter ? "Search Bowlers..." : "Search Batters..."}
                          value={searchQuery}
                          onFocus={() => setIsOppSearchOpen(true)}
                          onBlur={() => setTimeout(() => setIsOppSearchOpen(false), 160)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            setIsOppSearchOpen(true);
                            const q = val.toLowerCase().trim();
                            if (q) {
                              const matches = opponentOptions.filter(o =>
                                o.player.toLowerCase().includes(q) ||
                                displayPlayerName(o.player, displayNames).toLowerCase().includes(q),
                              );
                              if (matches.length === 1) {
                                setVsPlayerName(matches[0].player);
                              } else {
                                const exact = matches.find(
                                  o => o.player.toLowerCase() === q || displayPlayerName(o.player, displayNames).toLowerCase() === q,
                                );
                                if (exact) setVsPlayerName(exact.player);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filteredOpponents.length > 0) {
                              setVsPlayerName(filteredOpponents[0].player);
                              setIsOppSearchOpen(false);
                            }
                          }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                        {searchQuery && (
                          <button 
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-2.5 text-white/40 hover:text-white"
                            aria-label="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isOppSearchOpen && (searchQuery.trim().length > 0 || filteredOpponents.length > 0) && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-white/15 bg-[#080B16]/95 backdrop-blur-xl shadow-2xl max-h-60 overflow-y-auto p-1">
                            {filteredOpponents.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] font-mono text-white/40">No matching opponents</div>
                            ) : (
                              filteredOpponents.slice(0, 40).map((opp) => (
                                <button
                                  key={opp.player}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setVsPlayerName(opp.player);
                                    setIsOppSearchOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                    opp.player === activeOpponentName ? "bg-primary/20 text-white font-bold" : "text-white/80 hover:bg-white/10"
                                  }`}
                                >
                                  <PlayerAvatar name={opp.player} playerImages={playerImages.data} className="w-6 h-6 shrink-0" />
                                  <span className="truncate flex-1">{displayPlayerName(opp.player, displayNames)}</span>
                                  {opp.balls > 0 && (
                                    <span className="text-[10px] font-mono text-white/45 shrink-0">{opp.balls}b · {opp.dismissals}w</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <select
                        aria-label={showAsBatter ? "Select Bowler" : "Select Batter"}
                        value={activeOpponentName}
                        onChange={(e) => {
                          if (e.target.value) setVsPlayerName(e.target.value);
                        }}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-primary/50 transition-colors min-w-[180px] max-w-[240px]"
                      >
                        <option value="">{showAsBatter ? "Select Bowler..." : "Select Batter..."}</option>
                        {filteredOpponents.map((opp) => (
                          <option key={opp.player} value={opp.player}>
                            {displayPlayerName(opp.player, displayNames)}{opp.balls > 0 ? ` (${opp.balls}b, ${opp.dismissals}w)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Opponent list scroll */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredOpponents.map((opp) => {
                      const isSelected = opp.player === activeOpponentName;
                      const oppColor = teamColor(getPlayerTeam(opp.player));
                      
                      return (
                        <button
                          key={opp.player}
                          onClick={() => setVsPlayerName(opp.player)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl shrink-0 transition-all border ${
                            isSelected 
                              ? "bg-white/[0.08] border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/15"
                          }`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border shrink-0"
                            style={{ borderColor: isSelected ? oppColor : "rgba(255,255,255,0.1)" }}
                          >
                            <PlayerAvatar name={opp.player} playerImages={playerImages.data} imgClassName="w-full h-full object-cover" />
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] font-bold text-white leading-tight">
                              {displayPlayerName(opp.player, displayNames)}
                            </div>
                            {/* How much of a duel this actually is, so the
                                reader can see which pairings carry weight. */}
                            <div className="text-[8px] font-black uppercase text-white/40 tracking-wider flex items-center gap-1">
                              <span style={{ color: oppColor }}>●</span>
                              {opp.balls} balls · {opp.dismissals}w
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {filteredOpponents.length === 0 && (
                      <div className="text-xs font-bold text-white/30 py-2">No opponents found. Try searching for another name.</div>
                    )}
                  </div>
                </GlassCard>

                {/* 2. Multi-Dimensional Dimensional Slicers */}
                <GlassCard className="p-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    Dimensional Matchup Slicers
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Phase filter */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Match Phase</span>
                      <div className="grid grid-cols-4 bg-white/[0.02] border border-white/5 rounded-lg p-0.5 text-[9px] font-black">
                        {(["all", "pp", "middle", "death"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setFilterPhase(p)}
                            className={`py-1 rounded text-center transition-colors uppercase ${
                              filterPhase === p 
                                ? "bg-primary text-white" 
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            {p === "all" ? "All" : p === "pp" ? "PP" : p === "middle" ? "Mid" : "Death"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Innings context */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Innings Context</span>
                      <div className="grid grid-cols-3 bg-white/[0.02] border border-white/5 rounded-lg p-0.5 text-[9px] font-black">
                        {(["all", "1st", "2nd"] as const).map((inn) => (
                          <button
                            key={inn}
                            onClick={() => setFilterInnings(inn)}
                            className={`py-1 rounded text-center transition-colors uppercase ${
                              filterInnings === inn 
                                ? "bg-primary text-white" 
                                : "text-white/40 hover:text-white"
                            }`}
                          >
                            {inn === "all" ? "All" : inn === "1st" ? "1st" : "Chase"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pace vs Spin toggles (Only relevant for Batters) */}
                    {((showAsBatter && batterStats) || (!bowlerStats && batterStats)) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Pace vs Spin (Matchup)</span>
                        <div className="grid grid-cols-3 bg-white/[0.02] border border-white/5 rounded-lg p-0.5 text-[9px] font-black">
                          {(["all", "pace", "spin"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setFilterBowlerType(t)}
                              className={`py-1 rounded text-center transition-colors uppercase ${
                                filterBowlerType === t 
                                  ? "bg-primary text-white" 
                                  : "text-white/40 hover:text-white"
                              }`}
                            >
                              {t === "all" ? "All" : t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batting Position selector (Only relevant for Batters) */}
                    {((showAsBatter && batterStats) || (!bowlerStats && batterStats)) && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Batting Position</span>
                        <div className="grid grid-cols-4 bg-white/[0.02] border border-white/5 rounded-lg p-0.5 text-[9px] font-black">
                          {(["open", "3", "4", "5"] as const).map((pos) => (
                            <button
                              key={pos}
                              onClick={() => setFilterBatPos(pos)}
                              className={`py-1 rounded text-center transition-colors uppercase ${
                                filterBatPos === pos 
                                  ? "bg-primary text-white" 
                                  : "text-white/40 hover:text-white"
                              }`}
                            >
                              {pos === "open" ? "Open" : pos === "3" ? "#3" : pos === "4" ? "#4" : "#5+"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Venue Dropdown */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Venue</span>
                      <select
                        value={filterVenue}
                        onChange={(e) => setFilterVenue(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white/80 focus:outline-none focus:border-primary/50"
                      >
                        <option value="all">All Venues ({allVenueNames.length})</option>
                        {allVenueNames.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    {/* Opponent Team Dropdown */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Opponent Team</span>
                      <select
                        value={filterOppTeam}
                        onChange={(e) => setFilterOppTeam(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-1.5 text-xs text-white/80 focus:outline-none focus:border-primary/50"
                      >
                        <option value="all">All Teams ({allTeamNames.length})</option>
                        {allTeamNames.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </GlassCard>

                {/* 3. Real-Time Telemetry Projection & Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* H2H Duel Cards & Dominance Gauge */}
                  <GlassCard className="lg:col-span-2 p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-4">Matchup Battleground</h3>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 my-2">
                      
                      {/* Left: Player */}
                      <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.01] border border-white/5 w-full md:w-1/3">
                        <div 
                          className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border-2 shadow-lg mb-2"
                          style={{ borderColor: pColor }}
                        >
                          <PlayerAvatar name={bio.playerName} playerImages={playerImages.data} bio={bio} imgClassName="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs font-black text-white">{bio.playerName}</div>
                        <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: pColor }}>{pShort}</div>
                      </div>

                      {/* Middle: Dominance Gauge */}
                      <div className="flex-1 w-full space-y-4">
                        <div className="text-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Matchup Dominance</span>
                          <div className="text-2xl font-black text-white mt-1">
                            {matchupDominanceIndex}%
                          </div>
                          <span className="text-[9px] font-black text-primary uppercase">
                            {matchupDominanceIndex > 52 
                              ? "Player Favorable" 
                              : matchupDominanceIndex < 48 
                                ? "Opponent Favorable" 
                                : "Dead Even Matchup"}
                          </span>
                        </div>

                        {/* Visual Slider/Meter */}
                        <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <div 
                            className="absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full"
                            style={{ 
                              width: `${matchupDominanceIndex}%`, 
                              background: `linear-gradient(90deg, ${teamColor(getPlayerTeam(activeOpponentName))}, ${pColor})`
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-[9px] font-black uppercase text-white/30">
                          <span>{activeOpponentName.split(" ").slice(-1)[0]}</span>
                          <span>{bio.playerName.split(" ").slice(-1)[0]}</span>
                        </div>
                      </div>

                      {/* Right: Opponent */}
                      <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/[0.01] border border-white/5 w-full md:w-1/3">
                        <div 
                          className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border-2 shadow-lg mb-2"
                          style={{ borderColor: teamColor(getPlayerTeam(activeOpponentName)) }}
                        >
                          <PlayerAvatar name={activeOpponentName} playerImages={playerImages.data} imgClassName="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs font-black text-white">{activeOpponentName}</div>
                        <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: teamColor(getPlayerTeam(activeOpponentName)) }}>
                          {teamShort(getPlayerTeam(activeOpponentName))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Recorded Matchup Stats Panel */}
                  <GlassCard className="p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Recorded Matchup Stats</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mt-1 mb-4">
                        {recordedMatchupQuery.data
                          ? `${recordedMatchupQuery.data.battingHand} batter vs ${recordedMatchupQuery.data.bowlerType === "Unknown" ? "bowler of unknown type" : recordedMatchupQuery.data.bowlerType}`
                          : "Ball-by-ball head to head"}
                      </p>
                    </div>

                    {recordedMatchupQuery.isLoading ? (
                      <div className="text-xs text-white/40 font-mono py-8 text-center">Loading recorded duel...</div>
                    ) : recordedMatchupQuery.data ? (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Batter Runs", value: recordedMatchupQuery.data.runs, accent: "text-primary" },
                          { label: "Legal Balls", value: recordedMatchupQuery.data.balls, accent: "text-white" },
                          { label: "Strike Rate", value: recordedMatchupQuery.data.sr.toFixed(1), accent: "text-amber-400" },
                          { label: "Dismissals", value: recordedMatchupQuery.data.dismissals, accent: "text-red-400" },
                        ].map(metric => (
                          <div key={metric.label} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/40">{metric.label}</div>
                            <div className={`text-lg font-black mt-1 tabular-nums ${metric.accent}`}>{metric.value}</div>
                          </div>
                        ))}
                        <div className="col-span-2 text-[10px] text-white/40 font-bold text-center">
                          Dot balls: {recordedMatchupQuery.data.dotPct}% of legal deliveries
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-white/35 py-8 text-center">No recorded deliveries for this matchup.</div>
                    )}
                  </GlassCard>

                </div>

                {/* Phase breakdown of this specific duel */}
                {recordedMatchupQuery.data?.phaseSplit && recordedMatchupQuery.data.balls > 0 && (
                  <GlassCard className="p-5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-400" />
                      This Duel By Phase vs {displayPlayerName(activeOpponentName, displayNames)}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {([
                        { key: "powerplay", label: "Powerplay", overs: "Overs 1–6" },
                        { key: "middle", label: "Middle", overs: "Overs 7–15" },
                        { key: "death", label: "Death", overs: "Overs 16–20" },
                      ] as const).map(p => {
                        const s = recordedMatchupQuery.data!.phaseSplit![p.key];
                        return (
                          <div key={p.key} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                            <div className="text-xs font-black text-white flex justify-between">
                              <span>{p.label}</span>
                              <span style={{ color: pColor }}>{s.balls > 0 ? `SR ${s.sr}` : "—"}</span>
                            </div>
                            <p className="text-[9px] text-white/40 leading-relaxed font-medium">
                              {s.balls > 0
                                ? `${s.runs} runs off ${s.balls} balls · ${s.wkts} ${s.wkts === 1 ? "dismissal" : "dismissals"} · ${p.overs}`
                                : `Never met in this phase · ${p.overs}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

                {/* HEAD-TO-HEAD SHOT ZONE DISTRIBUTION & GROUND VISUAL CONTROL */}
                <div className="space-y-6">
                  <HeadToHeadGroundVisual
                    batterName={showAsBatter ? bio.playerName : activeOpponentName}
                    bowlerName={showAsBatter ? activeOpponentName : bio.playerName}
                    matchupData={recordedMatchupQuery.data}
                    phaseFilter={filterPhase}
                    inningsFilter={filterInnings}
                  />
                </div>

              </div>
            )}
        </motion.div>
      </div>

      {bio && (
        <>
          <PlayerComparisonModal
            isOpen={showCompareModal}
            onClose={() => setShowCompareModal(false)}
            currentPlayer={{
              name: bio.playerName || profileName,
              fullName: bio.fullName,
              role: bio.role,
              runs: activeBatterStats?.runs,
              strikeRate: (activeBatterStats as any)?.sr,
              average: (activeBatterStats as any)?.avg,
              ppSr: activeBatterStats?.ppSr,
              middleSr: activeBatterStats?.middleSr,
              deathSr: activeBatterStats?.deathSr,
            }}
            primaryTeam={primaryTeam}
            pColor={pColor}
            isBatter={showAsBatter}
          />
        </>
      )}
    </Layout>
  );
}

function PlayerIntelligenceArticlesCard({
  playerName,
  articles,
  pColor,
}: {
  playerName: string;
  articles: IndexEntry[];
  pColor: string;
}) {
  return (
    <GlassCard className="lg:col-span-3 p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
              Intelligence Hub · Match Analysis &amp; Feature Dossiers
            </h3>
            <p className="text-[10px] text-white/40 font-bold mt-0.5">
              Verified investigative reporting, tactical telemetry &amp; predictive coverage featuring {playerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
            {articles.length} Available Reports
          </span>
          <Link
            href={`/intelligence?search=${encodeURIComponent(playerName)}`}
            className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Intelligence Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.slice(0, 6).map(art => {
          const aspect = EDITORIAL_ASPECTS.find(a => a.id === art.aspect);
          const fAccent = teamColor(art.franchise);
          return (
            <Link
              key={art.id}
              href={`/dugout/articles/${art.slug}`}
              className="group rounded-2xl bg-[#090d16]/95 border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.03] overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl cursor-pointer"
            >
              {/* Picture just like in Dugouts */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                <LibraryMedia
                  imageId={art.id}
                  title={art.title}
                  accent={fAccent}
                  code={art.franchise}
                  teamName={art.franchise}
                  aspect={art.aspect}
                />
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-amber-300 border border-white/10 uppercase font-black">
                    {aspect?.name || "Intelligence"}
                  </span>
                  <span className="text-white/40 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {art.readMinutes} min read
                  </span>
                </div>

                <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                  {art.title}
                </h4>

                <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                  {art.dek}
                </p>

                {art.headlineStat && (
                  <div className="mt-1 p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-[8.5px] font-mono uppercase text-white/40 truncate max-w-[140px]">{art.headlineStat.label}</span>
                    <span className="text-xs font-black font-mono text-cyan-300">{art.headlineStat.display}</span>
                  </div>
                )}

                <div className="mt-auto pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-white/40">{art.franchise} Archive · {art.publishedDate}</span>
                  <span className="text-amber-400 group-hover:translate-x-1 transition-transform font-bold flex items-center gap-0.5">
                    Read Article ➔
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

function PlayerRecentMatchesCard({
  matches,
  playerName,
  pColor,
  articles = [],
}: {
  matches: any[];
  playerName: string;
  pColor: string;
  articles?: IndexEntry[];
}) {
  const [activeSection, setActiveSection] = useState<"matches" | "articles">("matches");
  const [articleAspectFilter, setArticleAspectFilter] = useState("all");
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFranchise, setSelectedFranchise] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [selectedResult, setSelectedResult] = useState<"all" | "won" | "lost">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(12);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      if (articleAspectFilter !== "all" && art.aspect !== articleAspectFilter) return false;
      if (articleSearchQuery.trim()) {
        const q = articleSearchQuery.toLowerCase().trim();
        const t = art.title.toLowerCase();
        const d = (art.dek || "").toLowerCase();
        if (!t.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });
  }, [articles, articleAspectFilter, articleSearchQuery]);

  // Distinct Opponent Franchises
  const availableFranchises = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => { if (m.vsTeam) set.add(m.vsTeam); });
    return Array.from(set).sort();
  }, [matches]);

  // Distinct Seasons
  const availableSeasons = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => { if (m.season) set.add(String(m.season)); });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [matches]);

  // Season Statistical Summary Map for Top Dimension
  const seasonSummaryMap = useMemo(() => {
    const map: Record<string, { count: number; won: number; lost: number; runs: number; wkts: number }> = {};
    matches.forEach(m => {
      const s = String(m.season);
      if (!map[s]) map[s] = { count: 0, won: 0, lost: 0, runs: 0, wkts: 0 };
      map[s].count++;
      if (m.result === "Won") map[s].won++;
      if (m.result === "Lost") map[s].lost++;
      if (m.batting?.runs) map[s].runs += m.batting.runs;
      if (m.bowling?.wickets) map[s].wkts += m.bowling.wickets;
    });
    return map;
  }, [matches]);

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (selectedFranchise !== "all" && m.vsTeam !== selectedFranchise) return false;
      if (selectedSeason !== "all" && String(m.season) !== selectedSeason) return false;
      if (selectedResult === "won" && m.result !== "Won") return false;
      if (selectedResult === "lost" && m.result !== "Lost") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vs = (m.vsTeam || "").toLowerCase();
        const ven = (m.venue || "").toLowerCase();
        const dt = (m.date || "").toLowerCase();
        if (!vs.includes(q) && !ven.includes(q) && !dt.includes(q)) return false;
      }
      return true;
    });
  }, [matches, selectedFranchise, selectedSeason, selectedResult, searchQuery]);

  const displayMatches = filteredMatches.slice(0, visibleCount);
  const formStreak = matches.slice(0, 5).map(m => m.result === "Won" ? "W" : m.result === "Lost" ? "L" : "T");
  const hasActiveFilters = searchQuery !== "" || selectedFranchise !== "all" || selectedSeason !== "all" || selectedResult !== "all";

  const handleSelectSeason = (season: string) => {
    setSelectedSeason(season);
    // When a specific season is chosen, expand to show all season matches in the sub-scroll list
    setVisibleCount(50);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedFranchise("all");
    setSelectedSeason("all");
    setSelectedResult("all");
    setVisibleCount(8);
  };

  return (
    <GlassCard className="p-5 flex flex-col gap-5">
      {/* Header Bar with Matches vs Articles Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Award className="w-3 h-3 text-cyan-400" />
              Official Match Performance &amp; News Intelligence
            </span>
            <span className="text-[10px] font-mono text-white/40">Verified Cricsheet &amp; Dugout Media</span>
          </div>
          <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            Match Performance Dossier · {playerName}
          </h3>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {formStreak.length > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Recent Form:</span>
              <div className="flex items-center gap-1">
                {formStreak.map((f, i) => (
                  <span
                    key={i}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shadow-sm ${
                      f === "W"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : f === "L"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-white/10 text-white/60 border border-white/15"
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Selection: Match History vs Intelligence Reports */}
          <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setActiveSection("matches")}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === "matches"
                  ? "bg-primary text-slate-950 font-black shadow-md"
                  : "text-white/45 hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Match History ({matches.length})</span>
            </button>
            <button
              onClick={() => setActiveSection("articles")}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSection === "articles"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "text-white/45 hover:text-white"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Intelligence Reports ({articles.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION MODE 1: MATCH HISTORY ── */}
      {activeSection === "matches" && (
        <>
          {/* TOP DIMENSION: SEASON SELECTOR & SUMMARY HORIZONTAL STRIP */}
          <div className="flex flex-col gap-2 bg-slate-950/60 border border-white/5 rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Season Dimension Strip (Choose Season to Filter All Performances)
          </span>
          <span className="text-[9px] font-mono text-white/40">
            {availableSeasons.length} IPL Editions Available
          </span>
        </div>

        {/* Horizontal Carousel of Season Dimension Cards */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
          {/* All Seasons Pill */}
          <button
            onClick={() => handleSelectSeason("all")}
            className={`px-3 py-2 rounded-xl text-left shrink-0 transition-all cursor-pointer border ${
              selectedSeason === "all"
                ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/20"
                : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <div className="text-xs font-black uppercase">All Seasons</div>
            <div className="text-[9px] font-mono text-white/40 mt-0.5">{matches.length} Total Matches</div>
          </button>

          {/* Individual Season Dimension Pills */}
          {availableSeasons.map(season => {
            const sum = seasonSummaryMap[season] || { count: 0, won: 0, lost: 0, runs: 0, wkts: 0 };
            const isSelected = selectedSeason === season;
            return (
              <button
                key={season}
                onClick={() => handleSelectSeason(season)}
                className={`px-3 py-2 rounded-xl text-left shrink-0 transition-all cursor-pointer border min-w-[120px] ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-[1.02]"
                    : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-black font-mono ${isSelected ? "text-amber-300" : "text-white"}`}>
                    IPL {season}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">
                    {sum.won}W
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-white/40 mt-0.5">
                  <span>{sum.count} Matches</span>
                  {sum.runs > 0 ? (
                    <span className="text-cyan-300">{sum.runs} runs</span>
                  ) : sum.wkts > 0 ? (
                    <span className="text-purple-300">{sum.wkts} wkts</span>
                  ) : (
                    <span>{sum.lost}L</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filter Controls for Franchise, Season, and Search */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Query Input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search opponent franchise or stadium..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Franchise Filter Select */}
          <div className="relative">
            <select
              value={selectedFranchise}
              onChange={e => setSelectedFranchise(e.target.value)}
              className="bg-[#090d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Franchises</option>
              {availableFranchises.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Year / Season Filter Select */}
          <div className="relative">
            <select
              value={selectedSeason}
              onChange={e => handleSelectSeason(e.target.value)}
              className="bg-[#090d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Seasons</option>
              {availableSeasons.map(season => (
                <option key={season} value={season}>IPL {season}</option>
              ))}
            </select>
          </div>

          {/* Result Filter Tabs */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10">
            {(["all", "won", "lost"] as const).map(res => (
              <button
                key={res}
                onClick={() => setSelectedResult(res)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selectedResult === res
                    ? "bg-primary text-white shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {res}
              </button>
            ))}
          </div>

          {/* Grid vs List View Mode Toggle */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
              title="2-Column Grid View"
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
              title="Single-Column Ticket View"
            >
              ☰ List
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[10px] font-mono text-cyan-300 uppercase tracking-wider transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Match Performance Cards inside dedicated Season Sub-Scroll Container */}
      {filteredMatches.length === 0 ? (
        <div className="py-12 text-center text-[11px] font-black uppercase tracking-widest text-white/30 bg-black/30 rounded-2xl border border-white/5">
          {matches.length === 0
            ? "No match scorecards recorded for this player"
            : "No match records match the selected franchise or season filters"}
        </div>
      ) : (
        <div className="w-full">
          <div className="w-full flex flex-col gap-4">
            <div
              className={`${
                viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                : "flex flex-col gap-3"
              } max-h-[720px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 scrollbar-track-transparent`}
            >
          {displayMatches.map((m, idx) => {
            const isWon = m.result === "Won";
            const isLost = m.result === "Lost";
            const matchDate = new Date(m.date);
            const day = matchDate.getDate() || "—";
            const month = matchDate.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
            const year = matchDate.getFullYear() || m.season;
            const matchArticle = articles.find(a =>
              (m.season && a.seasons && a.seasons.includes(String(m.season))) ||
              (m.vsTeam && a.franchise && teamShort(m.vsTeam) === a.franchise)
            ) || articles[0];
            
            // REFINED DARK-SHADE COLOR PALETTE:
            // Won matches: Deep burnt bronze / dark amber (#9a3412) with dark slate base
            // Lost matches: Deep muted burgundy / dark ruby (#881337)
            // Tie/NR: Deep slate (#334155)
            const darkThemeColor = isWon ? "#9a3412" : isLost ? "#881337" : "#334155";
            const darkBorderColor = isWon ? "rgba(180, 83, 9, 0.4)" : isLost ? "rgba(136, 19, 55, 0.4)" : "rgba(255, 255, 255, 0.12)";
            const darkBadgeBg = isWon ? "rgba(180, 83, 9, 0.25)" : isLost ? "rgba(136, 19, 55, 0.25)" : "rgba(255, 255, 255, 0.05)";
            const darkTextColor = isWon ? "#fbbf24" : isLost ? "#fb7185" : "#94a3b8";
            const darkButtonBg = isWon ? "#9a3412" : isLost ? "#881337" : "#334155";

            if (viewMode === "grid") {
              // ─── 2-COLUMN PERFECT GRID CARD LAYOUT ───
              return (
                <div
                  key={`${m.matchId}-${idx}`}
                  className="relative w-full rounded-2xl bg-[#090d16]/95 border backdrop-blur-xl shadow-xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-300 hover:border-white/25 hover:shadow-2xl group overflow-hidden"
                  style={{
                    boxShadow: `0 8px 30px -8px rgba(0,0,0,0.85), 0 0 16px -4px ${darkBorderColor}`,
                    borderColor: darkBorderColor,
                  }}
                >
                  {/* Subtle dark ambient glow keyed to victor's palette */}
                  <div
                    className="absolute -inset-0.5 rounded-2xl blur-md opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-300"
                    style={{ backgroundColor: darkThemeColor }}
                  />

                  {/* Clean Ticket Perforation Crimp at Side Edges */}
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-6 rounded-r-full bg-[#050816] border-r border-y border-white/15 z-20 pointer-events-none" />
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-6 rounded-l-full bg-[#050816] border-l border-y border-white/15 z-20 pointer-events-none" />

                  {/* 1. Header: Date Stub, Season, Result Badge */}
                  <div className="flex items-center justify-between border-b border-dashed border-white/15 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border text-[11px] font-mono font-bold"
                        style={{ borderColor: darkBorderColor }}
                      >
                        <span style={{ color: darkTextColor }}>{day} {month}</span>
                        <span className="text-white/40">{year}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-white/60">
                        IPL {m.season}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border shadow-sm"
                        style={{
                          backgroundColor: darkBadgeBg,
                          color: darkTextColor,
                          borderColor: darkBorderColor,
                        }}
                      >
                        {isWon ? "✓" : isLost ? "✕" : "•"} {m.result} {m.margin ? `· ${m.margin}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* 2. Opponent Matchup Strip */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-black/60 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow">
                      <TeamLogo team={m.vsTeam} size="w-8 h-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">vs Opponent</div>
                      <div className="text-sm sm:text-base font-black text-white truncate">{m.vsTeam}</div>
                      <div className="text-[10px] text-white/50 truncate max-w-full">{m.venue?.split(",")[0]}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/40 block">
                        #{m.matchId}
                      </span>
                    </div>
                  </div>

                  {/* 3. Performance Telemetry Split (Batting & Bowling) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Batting Box */}
                    <div className="bg-black/50 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between min-w-0">
                      <div className="flex items-center justify-between text-[8px] font-mono uppercase text-white/40 mb-1">
                        <span>Batting</span>
                        {m.batting?.notOut && <span className="text-emerald-400 font-bold uppercase">Not Out</span>}
                      </div>
                      {m.batting ? (
                        <div>
                          <div className="font-mono font-black text-white flex items-baseline gap-1.5">
                            <span className="text-lg text-cyan-300">{m.batting.runs}</span>
                            <span className="text-[11px] text-white/50">({m.batting.balls}b)</span>
                            {m.batting.notOut && <span className="text-emerald-400 font-bold text-sm">*</span>}
                          </div>
                          <div className="text-[9px] font-mono text-white/60 mt-0.5 truncate">
                            {m.batting.fours}×4 · {m.batting.sixes}×6 · SR {m.batting.sr?.toFixed(1)}
                          </div>
                          <div className="text-[8px] font-medium text-white/50 truncate mt-1">
                            {m.batting.dismissal || (m.batting.notOut ? "Not out" : "Out")}
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-[10px] font-mono text-white/30 uppercase italic">
                          Did Not Bat
                        </div>
                      )}
                    </div>

                    {/* Bowling Box */}
                    <div className="bg-black/50 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between min-w-0">
                      <div className="text-[8px] font-mono uppercase text-white/40 mb-1">
                        <span>Bowling</span>
                      </div>
                      {m.bowling ? (
                        <div>
                          <div className="font-mono font-black text-white flex items-baseline gap-1.5">
                            <span className="text-lg text-amber-300">{m.bowling.wickets}/{m.bowling.runs}</span>
                            <span className="text-[11px] text-white/50">({m.bowling.overs} ov)</span>
                          </div>
                          <div className="text-[9px] font-mono text-white/60 mt-0.5 truncate">
                            Econ {m.bowling.econ?.toFixed(1)} · {m.bowling.dots ?? 0} dots
                          </div>
                          <div className="text-[8px] font-mono text-white/40 truncate mt-1">
                            Wkt SR {m.bowling.wickets > 0 ? (m.bowling.overs * 6 / m.bowling.wickets).toFixed(1) : "—"}
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-[10px] font-mono text-white/30 uppercase italic">
                          Did Not Bowl
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Footer: Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-white/10 gap-2">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={m.matchId ? `/scores?matchId=${m.matchId}` : "/scores"}
                        className="text-[10px] font-mono text-cyan-300/80 hover:text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <span>Scores Tab</span>
                        <span>➔</span>
                      </Link>

                      {matchArticle && (
                        <Link
                          href={`/dugout/articles/${matchArticle.slug}`}
                          className="text-[9.5px] font-mono text-amber-300/90 hover:text-amber-300 hover:underline flex items-center gap-1"
                          title={`Read Intelligence Hub analysis: ${matchArticle.title}`}
                        >
                          <Newspaper className="w-3 h-3 text-amber-400" />
                          <span>Match Intel ➔</span>
                        </Link>
                      )}
                    </div>

                    <Link
                      href={m.matchId ? `/match/${m.matchId}` : "/scores"}
                      style={{ backgroundColor: darkButtonBg }}
                      className="px-3.5 py-1.5 rounded-xl text-white/95 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-90"
                      title="Open full match scorecard"
                    >
                      <span>Match Scorecard</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            }

            // ─── FULL-WIDTH TICKET LIST VIEW ───
            return (
              <div key={`${m.matchId}-${idx}`} className="relative w-full group">
                <div
                  className="absolute -inset-0.5 rounded-2xl blur-md opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-300"
                  style={{ backgroundColor: darkThemeColor }}
                />

                <div
                  className="relative w-full rounded-2xl bg-[#090d16]/95 border backdrop-blur-xl shadow-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1fr)] gap-4 md:gap-0 items-center transition-all duration-300 hover:border-white/25 overflow-hidden"
                  style={{
                    boxShadow: `0 8px 30px -8px rgba(0,0,0,0.85), 0 0 16px -4px ${darkBorderColor}`,
                    borderColor: darkBorderColor,
                  }}
                >
                  {/* Left & Right Edge Ticket Crimp */}
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-6 rounded-r-full bg-[#050816] border-r border-y border-white/15 z-20 pointer-events-none" />
                  <div className="hidden md:block absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-6 rounded-l-full bg-[#050816] border-l border-y border-white/15 z-20 pointer-events-none" />

                  {/* LEFT: Date Stub & Opponent */}
                  <div className="flex items-center gap-3.5 pr-0 md:pr-4 md:border-r border-dashed border-white/15 min-w-0">
                    <div
                      className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/[0.03] border shrink-0 shadow-inner"
                      style={{ borderColor: darkBorderColor }}
                    >
                      <span className="text-[9px] font-mono font-bold leading-none" style={{ color: darkTextColor }}>{month}</span>
                      <span className="text-xl font-black text-white font-mono leading-tight">{day}</span>
                      <span className="text-[8px] font-mono text-white/40 leading-none">{year}</span>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow">
                        <TeamLogo team={m.vsTeam} size="w-7 h-7" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">vs Opponent</div>
                        <div className="text-sm font-black text-white truncate">{m.vsTeam}</div>
                        <div className="text-[9px] text-white/45 truncate max-w-[170px] mt-0.5">{m.venue?.split(",")[0]}</div>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Telemetry */}
                  <div className="flex flex-col px-0 md:px-5 md:border-r border-dashed border-white/15 min-w-0 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border"
                        style={{
                          backgroundColor: darkBadgeBg,
                          color: darkTextColor,
                          borderColor: darkBorderColor,
                        }}
                      >
                        {m.result} {m.margin ? `· ${m.margin}` : ""}
                      </span>
                      <span className="text-[9px] font-mono text-white/40">IPL {m.season} Season</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/40 border border-white/5 rounded-xl p-2 min-w-0">
                        <span className="text-[8px] font-mono uppercase text-white/40 block leading-none mb-1">Batting</span>
                        {m.batting ? (
                          <div>
                            <div className="font-mono font-black text-white flex items-baseline gap-1">
                              <span className="text-base text-cyan-300">{m.batting.runs}</span>
                              <span className="text-[10px] text-white/50">({m.batting.balls}b)</span>
                              {m.batting.notOut && <span className="text-emerald-400 font-bold text-xs">*</span>}
                            </div>
                            <div className="text-[8px] font-mono text-white/50 mt-0.5 truncate">
                              {m.batting.fours}×4 · {m.batting.sixes}×6 · SR {m.batting.sr?.toFixed(1)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-white/30 uppercase">Did Not Bat</span>
                        )}
                      </div>

                      <div className="bg-black/40 border border-white/5 rounded-xl p-2 min-w-0">
                        <span className="text-[8px] font-mono uppercase text-white/40 block leading-none mb-1">Bowling</span>
                        {m.bowling ? (
                          <div>
                            <div className="font-mono font-black text-white flex items-baseline gap-1">
                              <span className="text-base text-amber-300">{m.bowling.wickets}/{m.bowling.runs}</span>
                              <span className="text-[10px] text-white/50">({m.bowling.overs} ov)</span>
                            </div>
                            <div className="text-[8px] font-mono text-white/50 mt-0.5 truncate">
                              Econ {m.bowling.econ?.toFixed(1)} · {m.bowling.dots ?? 0} dots
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-white/30 uppercase">Did Not Bowl</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Actions */}
                  <div className="flex flex-col items-start md:items-end justify-center pl-0 md:pl-5 min-w-0 gap-2">
                    <div className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>TICKET #{m.matchId}</span>
                    </div>

                    <Link
                      href={m.matchId ? `/match/${m.matchId}` : "/scores"}
                      style={{ backgroundColor: darkButtonBg }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-white/95 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:opacity-90"
                      title="Open full match scorecard"
                    >
                      <span>Match Scorecard</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-2.5">
                      <Link
                        href={m.matchId ? `/scores?matchId=${m.matchId}` : "/scores"}
                        className="text-[9px] font-mono text-cyan-300/80 hover:text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <span>Scores Tab</span>
                        <span>➔</span>
                      </Link>

                      {matchArticle && (
                        <Link
                          href={`/dugout/articles/${matchArticle.slug}`}
                          className="text-[9px] font-mono text-amber-300/90 hover:text-amber-300 hover:underline flex items-center gap-1"
                          title={`Read Intelligence Hub report: ${matchArticle.title}`}
                        >
                          <Newspaper className="w-3 h-3 text-amber-400" />
                          <span>Match Intel ➔</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {/* Ticket Count & Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-[10px] font-mono text-white/50 border-t border-white/5">
            <span>Showing {displayMatches.length} of {filteredMatches.length} match performance tickets</span>
            {filteredMatches.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(filteredMatches.length)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black uppercase tracking-wider text-cyan-300 transition-all cursor-pointer"
              >
                View All {filteredMatches.length} Match Tickets
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </>
)}

      {/* ── SECTION MODE 2: INTELLIGENCE REPORTS ── */}
      {activeSection === "articles" && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Article Filters Bar */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={articleSearchQuery}
                onChange={e => setArticleSearchQuery(e.target.value)}
                placeholder="Search articles by title, key phrase or tactic..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={articleAspectFilter}
                onChange={e => setArticleAspectFilter(e.target.value)}
                className="bg-[#090d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">All Editorial Aspects</option>
                {EDITORIAL_ASPECTS.map(asp => (
                  <option key={asp.id} value={asp.id}>{asp.name}</option>
                ))}
              </select>

              {(articleSearchQuery || articleAspectFilter !== "all") && (
                <button
                  onClick={() => { setArticleSearchQuery(""); setArticleAspectFilter("all"); }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[10px] font-mono text-cyan-300 uppercase tracking-wider transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="py-12 text-center text-[11px] font-black uppercase tracking-widest text-white/30 bg-black/30 rounded-2xl border border-white/5">
              No intelligence articles matched the query
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map(art => {
                const aspect = EDITORIAL_ASPECTS.find(a => a.id === art.aspect);
                const fAccent = teamColor(art.franchise);
                return (
                  <Link
                    key={art.id}
                    href={`/dugout/articles/${art.slug}`}
                    className="group rounded-2xl bg-[#090d16]/95 border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.03] overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl cursor-pointer"
                  >
                    {/* Picture just like in Dugouts */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                      <LibraryMedia
                        imageId={art.id}
                        title={art.title}
                        accent={fAccent}
                        code={art.franchise}
                        teamName={art.franchise}
                        aspect={art.aspect}
                      />
                    </div>

                    <div className="p-4 sm:p-5 flex flex-col justify-between gap-3.5 flex-1">
                      <div>
                        <div className="flex items-center justify-between text-[9px] font-mono mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-amber-300 border border-white/10 uppercase font-black">
                            {aspect?.name || "Intelligence"}
                          </span>
                          <span className="text-white/40 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {art.readMinutes} min read
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                          {art.title}
                        </h4>

                        <p className="text-xs text-white/50 line-clamp-3 mt-2 leading-relaxed">
                          {art.dek}
                        </p>

                        {art.headlineStat && (
                          <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-mono uppercase text-white/40">{art.headlineStat.label}</span>
                            <span className="text-xs font-black font-mono text-cyan-300">{art.headlineStat.display}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-dashed border-white/10 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-white/40 font-bold">{art.franchise} Archive · {art.publishedDate}</span>
                        <span className="text-amber-400 group-hover:translate-x-1 transition-transform font-bold flex items-center gap-1">
                          Read Story ➔
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[10px] font-mono text-white/40 border-t border-white/5">
            <span>Showing {filteredArticles.length} of {articles.length} news &amp; analysis articles from Intelligence Hub</span>
            <Link
              href={`/intelligence?search=${encodeURIComponent(playerName)}`}
              className="text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All Intelligence Articles</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

const tooltipStyle = {
  background: "hsl(232 35% 8%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 10,
  color: "white"
};
