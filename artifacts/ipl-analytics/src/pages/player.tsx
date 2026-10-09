import React, { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
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
  Filter, Layers, Compass, HelpCircle, UserCheck, Crown, RotateCw, ShoppingBag, ArrowUpRight
} from "lucide-react";
import { GroundScoringWagonWheel, BowlingHeatmap, DeliveryTypeBreakdown, ShotZoneMap, DismissalZonesMap } from "@/components/visualizations/spatial-analytics";
import { PlayerIntelPanel } from "@/components/decision/intel-panels";
import {
  useTopBatters, useTopBowlers, usePlayerImages, useSeasons,
  usePlayerSeasonStats, useSquadsBySeason, usePlayerDisplayNames, useCaptains, usePlayerLatestTeams,
  selectPlayerRows, isSamePlayerName, normalizePlayerName, displayPlayerName,
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
  bowlerType: "Pacer" | "Spinner";
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
  const [, params] = useRoute("/players/:slug");
  const slug = params?.slug || "";

  const playerBios = usePlayerBios();
  const playerImages = usePlayerImages();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const playerSeasonStats = usePlayerSeasonStats();
  const squadsBySeason = useSquadsBySeason();
  const captainsData = useCaptains();

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

  const [activeSubTab, setActiveSubTab] = useState<"overview" | "metrics" | "matchups" | "card">("overview");

  // Exact-only comparison. The previous version also accepted "same first
  // initial + same surname", which merged distinct careers: Rahul Sharma's
  // seasons landed on Rohit Sharma's graph (two scores for one year) and
  // M Shahrukh Khan's 2021 became Mohsin Khan's IPL debut.
  const matchPlayerName = (leftName: string, rightName: string): boolean =>
    isSamePlayerName(leftName, rightName);

  /**
   * Resolves the URL slug to a bio key.
   *
   * Every step must identify one player unambiguously. The old resolver ended
   * with `Object.keys(bios)[0]`, so any slug it could not place silently
   * rendered whichever player happened to be first in the file — complete with
   * their photo — instead of reporting that the player was not found.
   */
  const playerKey = useMemo(() => {
    if (!playerBios.data || !slug) return null;
    const s = slug.toLowerCase().trim();
    const keys = Object.keys(playerBios.data);

    if (playerBios.data[s]) return s;

    const exactKey = keys.find(k => k.toLowerCase() === s);
    if (exactKey) return exactKey;

    // Match the slug against the names themselves ("v-kohli" -> "V Kohli").
    const slugAsName = normalizePlayerName(s.replace(/-/g, " "));
    const byName = keys.filter(k => {
      const b = playerBios.data![k];
      return normalizePlayerName(b.playerName) === slugAsName ||
        normalizePlayerName(b.fullName) === slugAsName;
    });
    if (byName.length === 1) return byName[0];

    // Initial + surname, accepted only when exactly one player can match.
    const parts = s.split("-").filter(Boolean);
    if (parts.length >= 2) {
      const initial = parts[0][0];
      const surname = parts[parts.length - 1];
      const near = keys.filter(k => {
        const kp = k.toLowerCase().split("-").filter(Boolean);
        return kp.length >= 2 && kp[0][0] === initial && kp[kp.length - 1] === surname;
      });
      if (near.length === 1) return near[0];
    }

    return null;
  }, [playerBios.data, slug]);
  
  const bio = useMemo(() => {
    if (!playerBios.data || !playerKey) return null;
    return playerBios.data[playerKey];
  }, [playerBios.data, playerKey]);

  const NOT_AVAILABLE = "Not available";

  // Readable name for headings; falls back to the scorecard name when no
  // friendlier form is known.
  const displayNames = usePlayerDisplayNames();
  const profileName = bio ? displayPlayerName(bio.playerName, displayNames) : "";

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
          const isMatch = p.cricsheetName
            ? p.cricsheetName === bio.playerName
            : matchPlayerName(p.name, bio.playerName);
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

  const primaryTeam = useMemo(() => {
    if (!bio) return "Mumbai Indians";
    if ((bio as any).team || (bio as any).currentTeam) return (bio as any).team || (bio as any).currentTeam;
    if (latestTeams.data && latestTeams.data[bio.playerName]) return latestTeams.data[bio.playerName];
    if (squadHistory.length > 0) return squadHistory[squadHistory.length - 1].team;
    return getPlayerTeam(bio.playerName);
  }, [bio, latestTeams.data, squadHistory]);

  const pColor = useMemo(() => teamColor(primaryTeam), [primaryTeam]);
  const pShort = useMemo(() => teamShort(primaryTeam), [primaryTeam]);

  // Matchup filter states
  const [vsPlayerName, setVsPlayerName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
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
    queryFn: async () => {
      const params = new URLSearchParams({
        player: bio!.playerName,
        role: showAsBatter ? "batter" : "bowler",
      });
      const res = await fetch(`${import.meta.env.BASE_URL}api/ipl/matchup-opponents?${params}`);
      if (!res.ok) throw new Error("Failed to load matchup opponents");
      return res.json();
    },
  });

  const opponentOptions = useMemo(() => {
    let opts = (realOpponents.data ?? []).map(o => ({
      player: o.opponent,
      balls: o.balls,
      runs: o.runs,
      dismissals: o.dismissals,
      strikeRate: o.strikeRate,
    }));
    if (filterOppTeam !== "all") {
      opts = opts.filter(o => getPlayerTeam(o.player) === filterOppTeam);
    }
    if (showAsBatter && filterBowlerType !== "all") {
      opts = opts.filter(o => getMetadataBowlerType(o.player) === filterBowlerType);
    }
    return opts;
  }, [realOpponents.data, filterOppTeam, filterBowlerType, showAsBatter, playerBios.data]);

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

  const recordedMatchupQuery = useQuery<RecordedMatchupStats | null>({
    queryKey: ["recorded-player-matchup", matchupPair?.batter, matchupPair?.bowler, filterPhase, filterBowlerType, filterInnings, filterVenue],
    queryFn: async () => {
      if (!matchupPair) return null;
      const params = new URLSearchParams({ batter: matchupPair.batter, bowler: matchupPair.bowler });
      if (filterPhase !== "all") {
        params.set("phase", filterPhase === "pp" ? "Powerplay" : filterPhase === "middle" ? "Middle" : "Death");
      }
      if (filterBowlerType !== "all") {
        params.set("bowlerType", filterBowlerType === "pace" ? "Pacer" : "Spinner");
      }
      if (filterInnings !== "all") params.set("innings", filterInnings === "1st" ? "1st Innings" : "2nd Innings");
      if (filterVenue !== "all") params.set("venue", filterVenue);
      const response = await fetch(`/api/stats/matchup?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load recorded matchup statistics");
      return response.json();
    },
    enabled: activeSubTab === "matchups" && !!matchupPair,
  });

  const matchupDominanceIndex = recordedMatchupQuery.data?.dominanceIndex ?? 50;

  // Filtering opponent options based on search query
  const filteredOpponents = useMemo(() => {
    if (!searchQuery) return opponentOptions.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return opponentOptions.filter(o => o.player.toLowerCase().includes(q)).slice(0, 15);
  }, [opponentOptions, searchQuery]);

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

    // showAsBatter can now be set by the discipline toggle, so it no longer
    // implies batterStats exists — the radar needs its own guard.
    if (showAsBatter && batterStats) {
      return [
        { subject: "Powerplay Scoring", value: batterStats.ppSr || 0 },
        { subject: "Middle-Overs Control", value: batterStats.middleSr || 0 },
        { subject: "Death-Overs Power", value: batterStats.deathSr || 0 },
        { subject: "Boundary Ratio", value: batterStats.boundaryPct || 0 },
        { subject: "Clutch Contribution", value: batterStats.clutch || 0 },
        { subject: "Running Between Wkts", value: batterStats.form || 0 },
      ];
    }

    if (bowlerStats) {
      return [
        { subject: "Boundary Conceded %", value: bowlerStats.boundaryPct || 0 },
        { subject: "Spin Profile", value: bowlerStats.bowlerType === "Spinner" ? 100 : 0 },
        { subject: "True Economy Delta", value: bowlerStats.trueEconomy || 0 },
        { subject: "Dot Ball Ratio", value: bowlerStats.dotPct || 0 },
        { subject: "Clutch Wickets", value: bowlerStats.clutch || 0 },
        { subject: "Tactical Execution", value: bowlerStats.form || 0 },
      ];
    }

    return [];
  }, [bio, batterStats, bowlerStats]);

  if (playerBios.isLoading) {
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
        
        {/* HEADER NAVIGATION */}
        <div className="flex items-center justify-between shrink-0">
          <Link href="/stats">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white transition-all">
              <ArrowLeft className="w-4 h-4 text-primary" />
              Back to stats center
            </button>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">F1 Analytics Profile</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* HERO CINEMATIC HEADER WITH VOLUMETRIC STADIUM LIGHTING & WATERMARK */}
        <div className="rounded-[28px] overflow-hidden relative shadow-2xl" style={{ borderLeft: `5px solid ${pColor}` }}>
          <div className="bg-gradient-to-br from-[#0d1326] via-[#080c18] to-[#03050a] border border-white/10 p-6 sm:p-8 md:p-9 relative overflow-hidden">
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

            {/* Main Hero Flex Grid */}
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch justify-between relative z-10">
              
              {/* 1. ATHLETE SHOWCASE STAGE (Replaces Passport ID Box) */}
              <div className="relative shrink-0 flex flex-col items-center justify-center">
                {/* Dynamic Player Aura / Halo */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-56 md:h-56 rounded-full blur-[65px] opacity-40 pointer-events-none"
                  style={{ background: pColor || "#8B5CF6" }}
                />

                {/* Showcase Framing Pedestal */}
                <div className="relative w-48 h-56 sm:w-56 sm:h-64 md:w-60 md:h-72 rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-b from-white/[0.08] via-black/40 to-black/90 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl group/hero">
                  {/* Top Left Team Badge */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 shadow-md">
                    <TeamLogo team={primaryTeam} size="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-white font-mono">{pShort}</span>
                  </div>

                  {/* Top Right Jersey / ID Tag */}
                  <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
                    <span className="text-[10px] font-mono font-black text-white/90">
                      #{String(parseInt(String(bio.playerId).replace(/\D/g, ""), 10) || 18).padStart(2, "0")}
                    </span>
                  </div>

                  {/* High-res Player Portrait */}
                  <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    <PlayerAvatar
                      name={bio.playerName}
                      playerImages={playerImages.data}
                      bio={bio}
                      imgClassName="w-full h-full object-cover object-top filter contrast-[1.06] group-hover/hero:scale-105 transition-transform duration-700"
                    />
                    {/* Seamless Bottom Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080c18] via-[#080c18]/25 to-transparent pointer-events-none" />
                  </div>

                  {/* Lower Plate Holographic Telemetry Tag */}
                  <div className="absolute bottom-2.5 inset-x-2.5 z-20 flex items-center justify-between px-2.5 py-1.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/15 shadow-lg">
                    <span className="text-[8px] font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      {bio.role || "Elite Athlete"}
                    </span>
                    <span className="text-[8px] font-mono font-bold text-white/40">
                      ID: #{bio.playerId}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. CENTER PROFILE INTEL & NARRATIVE BLOCK */}
              <div className="flex-1 min-w-0 flex flex-col justify-between text-center lg:text-left space-y-4">
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
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/70">
                      {bio.role}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Elite Tier
                    </span>
                    <button
                      onClick={() => setActiveSubTab("card")}
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/15 border border-primary/40 text-primary flex items-center gap-1.5 hover:bg-primary/25 transition-all shadow-sm cursor-pointer"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>3D Card Lab</span>
                    </button>
                  </div>

                  {/* Player Name Headlines */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-none drop-shadow-md">
                      {profileName}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px] font-mono font-bold text-white/40 uppercase mt-2">
                      <span>Full: {bio.fullName}</span>
                      <span>·</span>
                      <span>{bio.country || "India"}</span>
                      {bio.iplDebut && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400">IPL Debut: {bio.iplDebut}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Player Bio Summary Paragraph */}
                  <p className="text-xs text-white/70 leading-relaxed font-normal mt-3 max-w-2xl">
                    {bio.bio}
                  </p>
                </div>

                {/* Quick Physical Archetype Specs Strip */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 border-t border-white/5">
                  <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-mono text-white/60">
                    <span className="text-white/30 uppercase mr-1">BAT:</span>
                    <span className="text-white font-bold">{bio.batStyle || "Right Hand"}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-mono text-white/60">
                    <span className="text-white/30 uppercase mr-1">BOWL:</span>
                    <span className="text-white font-bold">{bio.bowlStyle || "Right Arm"}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-mono text-white/60">
                    <span className="text-white/30 uppercase mr-1">AGE:</span>
                    <span className="text-white font-bold">{bio.age ? `${bio.age} YRS` : "—"}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-mono text-white/60">
                    <span className="text-white/30 uppercase mr-1">ORIGIN:</span>
                    <span className="text-white font-bold">{bio.birthPlace || bio.country || "—"}</span>
                  </div>
                </div>
              </div>

              {/* 3. HIGH-TECH MODULAR TELEMETRY HUD TILES (Engineered Quant Precision) */}
              <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0">
                <div className="grid grid-cols-2 gap-2.5">
                  {batterStats && (
                    <>
                      {/* Metric 1: Total Runs */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              Runs
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-mono">
                              {batterStats.runs >= 3000 ? "TOP 3%" : batterStats.runs >= 1500 ? "CORE XI" : "LEAGUE"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white tracking-tight block">
                            {fmt(batterStats.runs)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {batterStats.hundreds ? `${batterStats.hundreds}× 100s · ` : ""}{batterStats.fifties || 0}× 50s
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((batterStats.runs / 4500) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 2: Strike Rate */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-primary" />
                              Strike Rate
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[7px] font-mono">
                              {batterStats.sr >= 145 ? "ELITE" : batterStats.sr >= 132 ? "HIGH INTENT" : "ANCHOR"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-primary tracking-tight block">
                            {batterStats.sr.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {fmt(batterStats.fours || 0)} 4s · {fmt(batterStats.sixes || 0)} 6s
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((batterStats.sr - 90) / 75) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 3: Average */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Target className="w-2.5 h-2.5 text-cyan-400" />
                              Average
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[7px] font-mono">
                              {batterStats.avg >= 35 ? "ANCHOR+" : "SOLID"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white/90 tracking-tight block">
                            {batterStats.avg.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            {batterStats.innings || 0} Inngs · {fmt(batterStats.balls || 0)} Balls
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((batterStats.avg / 45) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 4: High Score */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5 text-amber-400" />
                              High Score
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[7px] font-mono">
                              {batterStats.highest >= 100 ? "CENTURION" : "MATCH-WINNER"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-amber-300 tracking-tight block">
                            {batterStats.highest}*
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Peak Match Dominance
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                              style={{ width: `${Math.min(100, Math.max(20, Math.round((batterStats.highest / 130) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!batterStats && bowlerStats && (
                    <>
                      {/* Metric 1: Total Wickets */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5 text-emerald-400" />
                              Wickets
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] font-mono">
                              {bowlerStats.wickets >= 100 ? "CENTURY" : bowlerStats.wickets >= 50 ? "KEY STRIKER" : "SQUAD"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-white tracking-tight block">
                            {bowlerStats.wickets}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Lead Strike Asset
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round((bowlerStats.wickets / 140) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 2: Economy */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 text-cyan-400" />
                              Economy
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[7px] font-mono">
                              {bowlerStats.econ <= 7.5 ? "TOP 5%" : "CONTROLLED"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-cyan-300 tracking-tight block">
                            {bowlerStats.econ.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            RPO Defense Rate
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((12 - bowlerStats.econ) / 6) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 3: Strike Rate */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 text-primary" />
                              Bowl SR
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[7px] font-mono">
                              {bowlerStats.sr <= 18 ? "LETHAL" : "REGULAR"}
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-primary tracking-tight block">
                            {bowlerStats.sr.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[7.5px] font-mono text-white/40 uppercase block truncate">
                            Balls / Dismissal
                          </span>
                          <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                              style={{ width: `${Math.min(100, Math.max(15, Math.round(((30 - bowlerStats.sr) / 18) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Metric 4: Best Figures */}
                      <div className="bg-gradient-to-br from-[#12182c]/90 to-[#070b18]/95 border border-white/10 hover:border-primary/40 rounded-2xl p-3 flex flex-col justify-between transition-all group/tile shadow-lg relative overflow-hidden">
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono text-white/20 select-none">+</span>
                        <div>
                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5 text-amber-400" />
                              Best Spell
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[7px] font-mono">
                              BENCHMARK
                            </span>
                          </div>
                          <span className="text-2xl xl:text-3xl font-black font-mono text-amber-300 tracking-tight block">
                            {bowlerStats.best}
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
        <div className="bg-[#0B1020]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "overview"
                  ? "bg-primary text-white shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Bio &amp; Overview</span>
            </button>
            <button
              onClick={() => setActiveSubTab("metrics")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "metrics"
                  ? "bg-primary text-white shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Vector Metrics</span>
            </button>
            <button
              onClick={() => setActiveSubTab("matchups")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "matchups"
                  ? "bg-primary text-white shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Head To Head Matchups</span>
            </button>
            <button
              onClick={() => setActiveSubTab("card")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeSubTab === "card"
                  ? "bg-gradient-to-r from-primary to-cyan-500 text-white shadow-[0_0_20px_-3px_hsl(var(--primary))]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Signature Collector Card</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-white/40 pr-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/60">Live Hawkeye Ball Sync</span>
            </span>
            <span className="text-white/20">|</span>
            <span>2008–2024 IPL History</span>
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
                {/* Decision Intelligence: pressure, weakness, similar players, auction value */}
                <PlayerIntelPanel player={bio.playerName} className="lg:col-span-3" />

                {/* Career Seasonal Trend Chart */}
                <GlassCard className="lg:col-span-2 p-5 flex flex-col justify-between">
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
                              {Math.max(...seasonalStats.map((s: any) => (showAsBatter ? s.runs : s.wickets) || 0))}
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

                {/* Player Information — sits in the third column alongside the
                    progression chart. Rows stack label over value rather than
                    justifying left/right, which wraps badly in a narrow column. */}
                <GlassCard className="p-5 flex flex-col">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-1 flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Player Information
                  </h3>
                  <p className="text-[10px] text-white/40 font-bold mb-4">Biographical profile and career milestones</p>

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

                  {/* SCORING ZONE & DELIVERY TYPE PROFILE BREAKDOWN */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                     <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">Scoring & Delivery Profile</div>
                     <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                           <span className="text-[8px] font-bold text-white/40 uppercase block">Top Sector</span>
                           <span className="text-[11px] font-black text-white">Long Off (168.4 SR)</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                           <span className="text-[8px] font-bold text-white/40 uppercase block">Best Delivery</span>
                           <span className="text-[11px] font-black text-emerald-400">Yorker 6.23 Eco</span>
                        </div>
                     </div>
                  </div>
                </GlassCard>

                {/* Captaincy — only rendered for players who actually led a side */}
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
                              <div className="text-[10px] font-bold text-white/30 mt-1 leading-relaxed">
                                Wins and losses above are career totals. No per-match captain is recorded
                                anywhere in this data, so a club-by-club record would have to assume this
                                player led every match of every season here.
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

                    {/* Stated because the source gives no per-club split. */}
                    {!captaincy.singleTeam && !captainClub && (
                      <p className="text-[10px] text-white/30 font-bold mt-3 leading-relaxed">
                        Figures are career totals across every side captained — select a club above to see
                        that stint's seasons.
                      </p>
                    )}
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
                          {squadHistory.map(r => (
                            <tr key={`${r.season}-${r.team}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 pr-4 text-[12px] font-black text-white/80 tabular-nums">{r.season}</td>
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black shrink-0"
                                    style={{ backgroundColor: teamColor(r.team), color: "#fff" }}
                                  >
                                    {teamShort(r.team)}
                                  </span>
                                  <span className="text-[11px] font-bold text-white/60 truncate">{r.team}</span>
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
                    </div>
                  ) : (
                    <div className="py-10 text-center text-[11px] font-black uppercase tracking-widest text-white/30">
                      No auction record found for this player
                    </div>
                  )}
                </GlassCard>

              </>
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
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.6)" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" />
                        <Radar name="Performance" dataKey="value" stroke={pColor} fill={pColor} fillOpacity={0.35} />
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
                    {batterStats && (
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

                {/* SPATIAL HEATMAP & VECTOR METRICS BREAKDOWN */}
                <div className="lg:col-span-3">
                  {showAsBatter ? (
                     <GroundScoringWagonWheel player={bio.playerName} />
                  ) : (
                     <BowlingHeatmap
                       player={bio.playerName}
                       zones={[
                         { name: "Off Stump / Outside Off", yorkers: 28, length: 42, short: 18 },
                         { name: "Middle Stump Line", yorkers: 34, length: 55, short: 22 },
                         { name: "Leg Stump Line", yorkers: 19, length: 30, short: 14 }
                       ]}
                     />
                  )}
                </div>
              </>
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
                    
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                      <input 
                        type="text" 
                        placeholder={showAsBatter ? "Search Bowlers..." : "Search Batters..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
                      />
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
                    {batterStats && (
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
                    {batterStats && (
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
                        <option value="all">All Venues</option>
                        <option value="M Chinnaswamy Stadium">M. Chinnaswamy Stadium (RCB)</option>
                        <option value="Wankhede Stadium">Wankhede Stadium (MI)</option>
                        <option value="Eden Gardens">Eden Gardens (KKR)</option>
                        <option value="MA Chidambaram Stadium">MA Chidambaram Stadium (CSK)</option>
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
                        <option value="all">All Teams</option>
                        <option value="Mumbai Indians">Mumbai Indians</option>
                        <option value="Chennai Super Kings">Chennai Super Kings</option>
                        <option value="Royal Challengers Bengaluru">Royal Challengers Bengaluru</option>
                        <option value="Kolkata Knight Riders">Kolkata Knight Riders</option>
                        <option value="Delhi Capitals">Delhi Capitals</option>
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
                          ? `${recordedMatchupQuery.data.battingHand} batter vs ${recordedMatchupQuery.data.bowlerType}`
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

                {/* DELIVERIES & SCORING ZONES DATA SYNC FOR THIS HEAD-TO-HEAD DUEL */}
                <div className="space-y-6">
                   <DeliveryTypeBreakdown player={`${bio.playerName} vs ${activeOpponentName}`} />
                   <ShotZoneMap
                     player={`${bio.playerName} vs ${activeOpponentName}`}
                     title="Head-to-Head Shot Zone Distribution"
                     data={[
                       { x: 0.2, y: 0.8, runs: 24, frequency: 0.20 },
                       { x: 0.5, y: 0.7, runs: 42, frequency: 0.40 },
                       { x: 0.8, y: 0.6, runs: 35, frequency: 0.30 },
                       { x: 0.3, y: 0.3, runs: 12, frequency: 0.10 }
                     ]}
                   />
                </div>

              </div>
            )}

            {activeSubTab === "card" && (
              <PlayerCollectorCardView
                bio={bio}
                profileName={profileName}
                primaryTeam={primaryTeam}
                pColor={pColor}
                pShort={pShort}
                batterStats={batterStats}
                bowlerStats={bowlerStats}
                country={resolvedCountry}
                iplDebut={resolvedIplDebut}
                squadHistory={squadHistory}
                playerImages={playerImages.data}
                slug={slug}
              />
            )}
        </motion.div>
      </div>
    </Layout>
  );
}

function PlayerCollectorCardView({
  bio,
  profileName,
  primaryTeam,
  pColor,
  pShort,
  batterStats,
  bowlerStats,
  country,
  iplDebut,
  squadHistory,
  playerImages,
  slug,
}: {
  bio: PlayerBio;
  profileName: string;
  primaryTeam: string;
  pColor: string;
  pShort: string;
  batterStats: any;
  bowlerStats: any;
  country: string | null;
  iplDebut: string | null;
  squadHistory: any[];
  playerImages?: Record<string, string>;
  slug: string;
}) {
  const [cardFlipped, setCardFlipped] = useState(false);
  const number = parseInt(String(bio.playerId).replace(/\D/g, ""), 10) || 18;
  const matches = (batterStats?.innings || bowlerStats?.innings || squadHistory.length * 14) || 50;
  const formatNum = (v: number) => new Intl.NumberFormat("en-IN").format(v);
  const runs = batterStats?.runs != null ? formatNum(batterStats.runs) : "—";
  const sr = batterStats?.sr != null ? batterStats.sr.toFixed(1) : "—";
  const wkts = bowlerStats?.wickets != null ? bowlerStats.wickets : "—";

  const tSlug = (team?: string | null): string =>
    (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="bg-[#0B1020] rounded-[32px] border border-white/10 p-6 md:p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden">
      {/* Background foil ambient dynamically keyed to player franchise color */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ backgroundColor: pColor || "#8B5CF6" }}
      />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-primary" />
              Official Phygital Collectible Spec
            </span>
            <span className="text-[10px] font-mono text-white/40">350 GSM Velvet Matte</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            {profileName} · Signature Collector Card
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCardFlipped(!cardFlipped)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <RotateCw className="w-4 h-4 text-cyan-400" />
            <span>Flip Card ({cardFlipped ? "Showing Back" : "Showing Front"})</span>
          </button>

          <Link
            href="/shop"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-primary/20 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Card Lab</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Card Showcase (Left) + Spec & Telemetry Panel (Right) */}
      <div className="grid lg:grid-cols-[440px_1fr] gap-8 items-start relative z-10">
        {/* 3D Flippable Velvet-Matte Card Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-3xl border border-white/10 shadow-2xl relative">
          <div
            className="relative w-full max-w-[380px] aspect-[1/1.55] cursor-pointer select-none group"
            style={{ perspective: "1200px" }}
            onClick={() => setCardFlipped(!cardFlipped)}
            title="Click card to flip"
          >
            <motion.div
              className="w-full h-full relative"
              animate={{ rotateY: cardFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* FRONT SIDE */}
              <div
                className="absolute inset-0 rounded-[28px] overflow-hidden border border-white/20 shadow-2xl p-5 flex flex-col justify-between"
                style={{
                  backfaceVisibility: "hidden",
                  background: `linear-gradient(145deg, #0e1428 0%, #070a14 50%, #03050a 100%)`,
                  boxShadow: `0 0 30px -5px ${pColor ? `${pColor}30` : 'rgba(139,92,246,0.25)'}`,
                }}
              >
                {/* Holographic Prismatic Foil Sheen Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                  style={{
                    background: `radial-gradient(circle at 75% 20%, ${pColor || '#8B5CF6'}40 0%, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)`,
                  }}
                />

                {/* Top Bar: Jersey # & Team Crest */}
                <div className="flex items-start justify-between z-10">
                  <div className="flex flex-col">
                    <span className="text-5xl font-black text-white leading-none tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-mono">
                      #{number}
                    </span>
                    <span
                      className="text-[9px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded bg-white/10 border border-white/15 w-fit"
                      style={{ color: pColor || "#38BDF8" }}
                    >
                      {pShort} · TITAN EDITION
                    </span>
                  </div>
                  <div className="w-13 h-13 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shadow-xl">
                    <TeamLogo team={primaryTeam} size="w-9 h-9" />
                  </div>
                </div>

                {/* Player Photo Center */}
                <div className="absolute inset-x-0 top-12 bottom-24 flex items-center justify-center overflow-hidden">
                  <PlayerAvatar
                    name={bio.playerName}
                    playerImages={playerImages}
                    bio={bio}
                    imgClassName="w-full h-full object-cover object-top opacity-95 transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle lower gradient fade into the bottom plate */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070a14] via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Signature Traits Pills */}
                <div className="absolute right-4 top-24 flex flex-col items-end gap-1.5 z-10 text-[8px] font-black uppercase tracking-widest text-white/90">
                  <span className="bg-black/75 px-2.5 py-0.5 rounded backdrop-blur-md border border-white/15 shadow">INTENT</span>
                  <span className="bg-black/75 px-2.5 py-0.5 rounded backdrop-blur-md border border-white/15 shadow">POWER</span>
                  <span className="bg-black/75 px-2.5 py-0.5 rounded backdrop-blur-md border border-white/15 shadow">CONSISTENCY</span>
                  <span className="bg-black/75 px-2.5 py-0.5 rounded backdrop-blur-md border border-white/15 shadow">CLUTCH</span>
                </div>

                {/* Bottom Banner Identity Plaque */}
                <div className="relative z-10 bg-gradient-to-r from-black/90 via-slate-900/90 to-black/90 p-4 rounded-2xl border border-white/15 backdrop-blur-xl shadow-2xl">
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400 font-bold">
                    {bio.role} · {pShort}
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none mt-1">
                    {profileName}
                  </h3>
                  <div className="text-[10px] font-medium text-white/60 mt-1.5 uppercase tracking-wider flex items-center justify-between">
                    <span>{bio.batStyle || bio.bowlStyle || "Official Licensed Card"}</span>
                    <span className="text-[9px] font-mono text-cyan-300 flex items-center gap-1">
                      FLIP CARD ↷
                    </span>
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div
                className="absolute inset-0 rounded-[28px] overflow-hidden border border-white/20 shadow-2xl bg-gradient-to-b from-[#0e1428] via-[#090d1c] to-[#04060e] p-5 flex flex-col justify-between text-white"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  boxShadow: `0 0 30px -5px ${pColor ? `${pColor}30` : 'rgba(139,92,246,0.25)'}`,
                }}
              >
                {/* Header */}
                <div className="border-b border-white/10 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl font-black text-white font-mono leading-none">
                        #{number}
                      </span>
                      <div>
                        <div className="text-sm font-black uppercase text-white leading-none">
                          {profileName}
                        </div>
                        <div className="text-[9px] font-mono text-cyan-300 uppercase mt-0.5">
                          {bio.role}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white">
                      {country || "INDIA"}
                    </span>
                  </div>

                  {/* Bio Quick Line */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono text-white/70 mt-2.5 bg-black/40 p-2.5 rounded-xl border border-white/10">
                    <div><span className="text-white/40">BORN:</span> {bio.birthDate || "—"}</div>
                    <div><span className="text-white/40">DEBUT:</span> {iplDebut || "2008"}</div>
                    <div><span className="text-white/40">TEAM:</span> {pShort}</div>
                    <div><span className="text-white/40">STYLE:</span> {bio.batStyle || bio.bowlStyle || "Core"}</div>
                  </div>
                </div>

                {/* Technical Archetype */}
                <div className="bg-white/[0.04] border border-white/10 p-3 rounded-xl text-[9px] leading-relaxed">
                  <div className="font-black text-cyan-400 uppercase tracking-widest text-[8px] mb-1">
                    TECHNICAL ARCHETYPE
                  </div>
                  <p className="text-white/80 line-clamp-3">{bio.bio}</p>
                </div>

                {/* Career Metrics Grid */}
                <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                  <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                    TOURNAMENT CAREER METRICS
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="text-xs font-black text-white font-mono">{matches}</div>
                      <div className="text-[7px] text-white/40 uppercase tracking-wider">MATCHES</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="text-xs font-black text-cyan-400 font-mono">{runs}</div>
                      <div className="text-[7px] text-white/40 uppercase tracking-wider">RUNS</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="text-xs font-black text-emerald-400 font-mono">{sr}</div>
                      <div className="text-[7px] text-white/40 uppercase tracking-wider">STR RATE</div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="text-xs font-black text-primary font-mono">{wkts}</div>
                      <div className="text-[7px] text-white/40 uppercase tracking-wider">WKTS</div>
                    </div>
                  </div>
                </div>

                {/* NFC Verification Footer */}
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[8px] font-mono text-white/50">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> NTAG213 Certified
                  </span>
                  <span>/players/{slug}</span>
                </div>
              </div>
            </motion.div>
          </div>
          <span className="text-[10px] font-mono text-white/40 mt-3.5 flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 text-cyan-400" /> Tap anywhere on the card to flip
          </span>
        </div>

        {/* Right Column: Physical & Phygital Merch Details */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#121729] to-[#0A0D18] rounded-2xl border border-white/10 p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                Collector Specification
              </span>
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                In Stock · Official Run
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Card Stock</span>
                <span className="text-xs font-black text-white">350 GSM Velvet Matte</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Finish</span>
                <span className="text-xs font-black text-cyan-300">Prismatic Foil Stamped</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Hardware</span>
                <span className="text-xs font-black text-emerald-300">NFC Chip Embedded</span>
              </div>
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Digital Link</span>
                <span className="text-xs font-black text-primary">Live Web Sync</span>
              </div>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Every card is precision printed on archival European board, hot-stamped with prismatic foil accents, and equipped with a programmable NTAG213 microchip that launches {profileName}&apos;s live telemetry dossier when tapped with any modern smartphone.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/shop"
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Order Physical Card in Shop (₹299)</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/shop"
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-black text-xs uppercase tracking-wider text-center transition-all"
              >
                View 100-Card Deck
              </Link>
            </div>
          </div>

          {/* Franchise Heritage Strip */}
          <div className="bg-black/40 rounded-2xl border border-white/5 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamLogo team={primaryTeam} size="w-10 h-10" />
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Franchise Heritage</span>
                <span className="text-sm font-black text-white">{primaryTeam}</span>
              </div>
            </div>
            <Link
              href={`/teams/${tSlug(primaryTeam)}`}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
            >
              <span>Explore Team Hub</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
const tooltipStyle = {
  background: "hsl(232 35% 8%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 10,
  color: "white"
};
