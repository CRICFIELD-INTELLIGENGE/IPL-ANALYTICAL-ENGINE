// Squad explorer: a franchise's squad for one season as a carousel, grid or list of
// portraits. Clicking a player opens an in-page spotlight with their season figures;
// Read More goes to the existing player profile (/players/:slug). Shared by the team
// profile page and My Dugout.
//
// Data rules: every figure shown comes from the roster API's season record for the
// selected franchise-season; nothing is estimated. Role, wicketkeeper, nationality,
// captain and jersey number come from the official IPL squad listing for that
// season (public/data/official-squads.json, scripts/data/fetch-official-squads.mjs);
// where a season has no official listing, the verified captain table and roster
// roles are used and no jersey number is shown.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Users, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Layers, LayoutGrid, List,
} from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { FRANCHISE_SEASON_CAPTAINS } from "@/components/dugout/franchise-hero";
import { fetchRoster, type RosterPlayer } from "@/lib/dugout-api";
import {
  useSquadsBySeason, usePlayerBios, usePlayerImages, usePlayerDisplayNames, displayPlayerName, teamShort,
  usePlayerTeamSeasonStats, usePlayerCareerStats,
  type PlayerBio, type SquadPlayer,
} from "@/lib/aggregates";

type RoleFilter = "all" | "batter" | "all-rounder" | "bowler" | "keeper";
const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "batter", label: "Batters" },
  { id: "all-rounder", label: "All-rounders" },
  { id: "bowler", label: "Bowlers" },
  { id: "keeper", label: "Wicketkeepers" },
];

type ViewMode = "carousel" | "grid" | "list";
const VIEWS: { id: ViewMode; label: string; Icon: typeof Layers }[] = [
  { id: "carousel", label: "Carousel", Icon: Layers },
  { id: "grid", label: "Grid", Icon: LayoutGrid },
  { id: "list", label: "List", Icon: List },
];

const GALLERY_PREVIEW = 10;
// Set when Read More opens a profile, so browser Back can restore the spotlight.
const RETURN_KEY = "cf:squad-return:v1";

const slugOf = (name: string) => (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const keyOf = (p: RosterPlayer) => `${p.name}|${p.cricsheetName ?? ""}`;

const isKeeper = (p: RosterPlayer) => p.keeper || p.role === "wicketkeeper" || p.role === "keeper";

function roleLabel(p: RosterPlayer): string {
  if (isKeeper(p)) return "Wicketkeeper-batter";
  switch (p.role) {
    case "batter": return "Batter";
    case "bowler": return "Bowler";
    case "all-rounder": return "All-rounder";
    default: return "Squad member";
  }
}

/** One player as listed on the official squad page (public/data/official-squads.json). */
interface OfficialPlayer {
  name: string;
  role: "batter" | "all-rounder" | "bowler" | null;
  keeper: boolean;
  overseas: boolean;
  country: string | null;
  captain: boolean;
  jersey: string | null;
}
interface OfficialSquads {
  source: string;
  retrievedAt: string;
  seasons: Record<string, Record<string, OfficialPlayer[]>>;
}

const nameTokens = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * Pairs roster rows with official listings. The roster can hold one player twice,
 * under the squad-file name and the scorecard name ("Varun Chakravarthy" and
 * "CV Varun"), so several rows may pair with one listing. Passes run from strict
 * to loose, and a row pairs only when exactly one listing fits it in that pass:
 *   1. same name                         "Sanju Samson"   / "Sanju Samson"
 *   2. surname and first initial          "MS Dhoni"       / "Mahendra Singh Dhoni"
 *   3. initial and a surname 1–2 letters off  "V Suryavanshi" / "Vaibhav Sooryavanshi"
 *   4. every word of the listed name      "B Sai Sudharsan" / "Sai Sudharsan"
 *   5. a name the listing starts with     "CV Varun"       / "Varun Chakaravarthy"
 *   6. the same letters run together      "Prithvi Raj"    / "Yarra Prithviraj"
 */
function matchOfficial(
  base: RosterPlayer[],
  list: OfficialPlayer[],
  namesOf: (p: RosterPlayer) => (string | null)[],
): Map<string, OfficialPlayer> {
  const out = new Map<string, OfficialPlayer>();
  const last = (t: string[]) => t[t.length - 1];
  const passes: ((a: string[], b: string[]) => boolean)[] = [
    (a, b) => a.join("") === b.join(""),
    (a, b) => a.length > 1 && b.length > 1 && last(a) === last(b) && a[0][0] === b[0][0],
    (a, b) => a.length > 1 && b.length > 1 && a[0][0] === b[0][0]
      && last(a).length >= 6 && last(b).length >= 6 && editDistance(last(a), last(b)) <= 2,
    (a, b) => b.length > 1 && b.every((t) => a.includes(t)),
    (a, b) => b.length > 1 && a.some((t) => t.length >= 4 && t === b[0]),
    (a, b) => b.length > 1 && a.join("").length >= 6 && a.join("") === b.slice(1).join(""),
  ];
  for (const pass of passes) {
    for (const p of base) {
      if (out.has(keyOf(p))) continue;
      const names = namesOf(p).filter((n): n is string => Boolean(n)).map(nameTokens);
      const hits = list.filter((o) => names.some((a) => pass(a, nameTokens(o.name))));
      if (hits.length === 1) out.set(keyOf(p), hits[0]);
    }
  }
  // 7. Same surname alone ("MD Shanaka" / "Dasun Shanaka"), only between a row and a
  //    listing that are both still unpaired and the only ones with that surname.
  const paired = new Set(out.values());
  const openRows = base.filter((p) => !out.has(keyOf(p)));
  const openList = list.filter((o) => !paired.has(o));
  const surnameOf = (s: string) => last(nameTokens(s)) ?? "";
  for (const p of openRows) {
    const s = surnameOf(p.cricsheetName ?? p.name);
    if (s.length < 4 || openRows.filter((q) => surnameOf(q.cricsheetName ?? q.name) === s).length !== 1) continue;
    const hits = openList.filter((o) => surnameOf(o.name) === s);
    if (hits.length === 1) out.set(keyOf(p), hits[0]);
  }
  return out;
}

function FallbackPlayer(p: SquadPlayer): RosterPlayer {
  return {
    name: p.name, cricsheetName: p.cricsheetName, playerId: null, country: p.country,
    acquisition: p.acquisition, priceLakh: p.priceLakh, priceUsd: p.priceUsd, priceDisplay: p.priceDisplay,
    // The squad file's keeper labels are unreliable (it tags Warner, Pollard and others),
    // so offline the role is left unknown rather than shown wrong.
    played: p.played, role: p.role === "wicketkeeper" || p.role === "keeper" ? null : p.role, keeper: false, season: null,
  };
}

/** Dark or light text, whichever reads on the franchise colour. */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#0B1120" : "#ffffff";
}

const overs = (balls: number) => `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ""}`;

/** 3–5 role-specific figures from the season record. Null figures are left out, never estimated. */
function seasonStats(p: RosterPlayer): { label: string; value: string }[] {
  const s = p.season;
  if (!s) return [];
  const bat = [
    { label: "Runs", value: String(s.batRuns) },
    s.strikeRate != null ? { label: "Strike rate", value: s.strikeRate.toFixed(1) } : null,
    s.batBalls > 0 ? { label: "Balls faced", value: String(s.batBalls) } : null,
  ];
  const bowl = [
    { label: "Wickets", value: String(s.wickets) },
    s.economy != null ? { label: "Economy", value: s.economy.toFixed(2) } : null,
    s.bowlBalls > 0 ? { label: "Overs", value: overs(s.bowlBalls) } : null,
  ];
  const matches = { label: "Matches", value: String(s.matches) };
  let rows: ({ label: string; value: string } | null)[];
  if (p.role === "bowler") rows = [matches, ...bowl];
  else if (p.role === "all-rounder") rows = [matches, bat[0], bat[1], bowl[0], bowl[1]];
  else rows = [matches, ...bat];
  // A bowler who batted, or a batter who bowled, keeps their primary discipline first.
  return rows.filter((r): r is { label: string; value: string } => r !== null).slice(0, 5);
}

export function TeamSquad({ franchise, accent, season: seasonProp, onSeasonChange, className = "" }: {
  franchise: string;
  accent: string;
  /** Controlled season (the Dugout shares one season across its sections). */
  season?: string;
  onSeasonChange?: (season: string) => void;
  className?: string;
}) {
  const squadsBySeason = useSquadsBySeason();
  const playerImages = usePlayerImages();
  const playerBios = usePlayerBios();
  const code = teamShort(franchise);

  // Seasons this franchise has a squad for, newest first (from the static season file).
  const seasons = useMemo(() => {
    if (!squadsBySeason.data) return [];
    return Object.keys(squadsBySeason.data)
      .filter((s) => (squadsBySeason.data![s]?.[franchise]?.length ?? 0) > 0)
      .sort((a, b) => Number(b) - Number(a));
  }, [squadsBySeason.data, franchise]);

  const [ownSeason, setOwnSeason] = useState<string | null>(null);
  const season = (seasonProp && seasons.includes(seasonProp) ? seasonProp : null) ?? (ownSeason && seasons.includes(ownSeason) ? ownSeason : null) ?? seasons[0] ?? null;
  const choose = (s: string) => { setOwnSeason(s); onSeasonChange?.(s); };

  const roster = useQuery({
    queryKey: ["roster", franchise, season],
    queryFn: () => fetchRoster(franchise, season!),
    enabled: Boolean(season),
    retry: false,
    staleTime: 10 * 60_000,
  });

  const staticSquad: SquadPlayer[] = useMemo(() => {
    if (!squadsBySeason.data || !season) return [];
    return squadsBySeason.data[season]?.[franchise] ?? [];
  }, [squadsBySeason.data, season, franchise]);

  const displayNames = usePlayerDisplayNames();
  const nameOf = (p: RosterPlayer) => displayPlayerName(p.name, displayNames);
  const playerTeamSeasonStats = usePlayerTeamSeasonStats();
  const playerCareerStats = usePlayerCareerStats();

  // The official squad listing (iplt20.com) is the authority for role, keeper,
  // nationality, captain and jersey number; season figures come from the roster.
  const official = useQuery({
    queryKey: ["official-squads"],
    queryFn: async (): Promise<OfficialSquads | null> => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/official-squads.json`);
      return res.ok ? res.json() : null;
    },
    staleTime: Infinity,
    retry: false,
  });
  const officialList = season ? official.data?.seasons[season]?.[franchise] ?? null : null;

  const { players, officialByKey } = useMemo(() => {
    const base = roster.data?.players && roster.data.players.length > 0 ? roster.data.players : staticSquad.map(FallbackPlayer);
    if (!officialList?.length) return { players: base, officialByKey: new Map<string, OfficialPlayer>() };
    const pairs = matchOfficial(base, officialList, (p) => [p.name, p.cricsheetName, displayPlayerName(p.name, displayNames)]);
    const rowsOf = new Map<OfficialPlayer, RosterPlayer[]>();
    const unlisted: RosterPlayer[] = [];
    for (const p of base) {
      const o = pairs.get(keyOf(p));
      if (o) (rowsOf.get(o) ?? rowsOf.set(o, []).get(o)!).push(p);
      else unlisted.push(p);
    }

    // Helper to resolve season stats from authenticated playerTeamSeasonStats if missing
    const resolveSeasonFromDataset = (p: RosterPlayer, o?: OfficialPlayer | null): RosterPlayer => {
      if (p.season || !season || !playerTeamSeasonStats.data) return p;
      const candidateNames = [
        p.cricsheetName,
        p.name,
        o?.name,
        displayPlayerName(p.name, displayNames),
        o?.name ? displayPlayerName(o.name, displayNames) : null,
      ].filter((n): n is string => Boolean(n));

      const normCandidateTokens = candidateNames.map(nameTokens);
      const ptss = playerTeamSeasonStats.data;
      const normFranchise = franchise.toLowerCase().trim();
      const shortCode = code.toLowerCase().trim();

      const matchTeam = (t: string) => {
        const nt = (t || "").toLowerCase().trim();
        return nt === normFranchise || nt === shortCode || teamShort(t).toLowerCase() === shortCode;
      };

      const batterMatch = ptss.batters.find(
        b => String(b.season) === season && matchTeam(b.team) && candidateNames.some(cn => cn.toLowerCase().trim() === b.player?.toLowerCase().trim())
      ) || ptss.batters.find(
        b => String(b.season) === season && candidateNames.some(cn => cn.toLowerCase().trim() === b.player?.toLowerCase().trim())
      ) || ptss.batters.find(
        b => String(b.season) === season && matchTeam(b.team) && normCandidateTokens.some(tokens => tokens.length > 1 && nameTokens(b.player || "").length > 1 && tokens[tokens.length - 1] === nameTokens(b.player || "")[nameTokens(b.player || "").length - 1] && tokens[0][0] === nameTokens(b.player || "")[0][0])
      );

      const bowlerMatch = ptss.bowlers.find(
        w => String(w.season) === season && matchTeam(w.team) && candidateNames.some(cn => cn.toLowerCase().trim() === w.player?.toLowerCase().trim())
      ) || ptss.bowlers.find(
        w => String(w.season) === season && candidateNames.some(cn => cn.toLowerCase().trim() === w.player?.toLowerCase().trim())
      ) || ptss.bowlers.find(
        w => String(w.season) === season && matchTeam(w.team) && normCandidateTokens.some(tokens => tokens.length > 1 && nameTokens(w.player || "").length > 1 && tokens[tokens.length - 1] === nameTokens(w.player || "")[nameTokens(w.player || "").length - 1] && tokens[0][0] === nameTokens(w.player || "")[0][0])
      );

      if (batterMatch || bowlerMatch) {
        const m = Math.max(batterMatch?.matches ?? 0, bowlerMatch?.matches ?? 0);
        const batBalls = batterMatch?.balls ?? 0;
        const batRuns = batterMatch?.runs ?? 0;
        const bowlBalls = bowlerMatch?.balls ?? 0;
        const bowlRuns = bowlerMatch?.runs ?? 0;
        const wickets = bowlerMatch?.wickets ?? 0;

        return {
          ...p,
          played: true,
          season: {
            matches: m,
            batRuns,
            batBalls,
            strikeRate: batterMatch?.sr != null ? Number(batterMatch.sr) : (batBalls >= 20 ? Math.round((batRuns / batBalls) * 1000) / 10 : null),
            bowlBalls,
            wickets,
            economy: bowlerMatch?.econ != null ? Number(bowlerMatch.econ) : (bowlBalls >= 12 ? Math.round((bowlRuns / bowlBalls) * 600) / 100 : null),
          }
        };
      }

      // Fallback: If no season matches found, check career stats so players in squad never have an empty "no data" state
      if (!p.season && playerCareerStats.data) {
        const pcs = playerCareerStats.data;
        const cBat = pcs.batters.find(b => candidateNames.some(cn => cn.toLowerCase().trim() === b.player?.toLowerCase().trim()))
          || pcs.batters.find(b => normCandidateTokens.some(tokens => tokens.length > 1 && nameTokens(b.player || "").length > 1 && tokens[tokens.length - 1] === nameTokens(b.player || "")[nameTokens(b.player || "").length - 1] && tokens[0][0] === nameTokens(b.player || "")[0][0]));
        const cBowl = pcs.bowlers.find(w => candidateNames.some(cn => cn.toLowerCase().trim() === w.player?.toLowerCase().trim()))
          || pcs.bowlers.find(w => normCandidateTokens.some(tokens => tokens.length > 1 && nameTokens(w.player || "").length > 1 && tokens[tokens.length - 1] === nameTokens(w.player || "")[nameTokens(w.player || "").length - 1] && tokens[0][0] === nameTokens(w.player || "")[0][0]));

        if (cBat || cBowl) {
          const m = Math.max(cBat?.matches ?? 0, cBowl?.matches ?? 0);
          const batBalls = cBat?.balls ?? 0;
          const batRuns = cBat?.runs ?? 0;
          const bowlBalls = cBowl?.balls ?? 0;
          const wickets = cBowl?.wickets ?? 0;
          const bowlRuns = cBowl?.runs ?? 0;
          return {
            ...p,
            season: {
              matches: m,
              batRuns,
              batBalls,
              strikeRate: cBat?.sr != null ? Number(cBat.sr) : (batBalls >= 20 ? Math.round((batRuns / batBalls) * 1000) / 10 : null),
              bowlBalls,
              wickets,
              economy: cBowl?.econ != null ? Number(cBowl.econ) : (bowlBalls >= 12 ? Math.round((bowlRuns / bowlBalls) * 600) / 100 : null),
            }
          };
        }
      }

      return p;
    };

    // One card per listed player, in the official order. Duplicate roster rows of
    // that player collapse into the one carrying the season record.
    const merged: RosterPlayer[] = [];
    const byKey = new Map<string, OfficialPlayer>();
    for (const o of officialList) {
      const rows = rowsOf.get(o) ?? [];
      const best = [...rows].sort((a, b) => (b.season?.matches ?? -1) - (a.season?.matches ?? -1))[0];
      let p: RosterPlayer = best
        ? {
            ...best,
            name: o.name,
            cricsheetName: best.cricsheetName ?? rows.find((r) => r.cricsheetName)?.cricsheetName ?? null,
            role: o.role ?? best.role, keeper: o.keeper, country: o.country ?? best.country,
          }
        // Listed officially but absent from the roster file: no season record to show.
        : {
            name: o.name, cricsheetName: null, playerId: null, country: o.country, acquisition: null,
            priceLakh: null, priceUsd: null, priceDisplay: null, played: true, role: o.role, keeper: o.keeper, season: null,
          };
      p = resolveSeasonFromDataset(p, o);
      merged.push(p);
      byKey.set(keyOf(p), o);
    }
    const resolvedUnlisted = unlisted.map(p => resolveSeasonFromDataset(p));
    return { players: [...merged, ...resolvedUnlisted], officialByKey: byKey };
  }, [roster.data, staticSquad, officialList, displayNames, season, playerTeamSeasonStats.data, playerCareerStats.data, franchise, code]);
  const officialFor = (p: RosterPlayer) => officialByKey.get(keyOf(p)) ?? null;

  const [filter, setFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("carousel");
  const spotlightRef = useRef<HTMLDivElement>(null);

  // A different franchise starts from its full squad.
  useEffect(() => {
    setFilter("all");
    setSearchQuery("");
    setExpanded(false);
    setSelectedKey(null);
  }, [franchise]);

  const bios = playerBios.data ?? {};
  const bioFor = (p: RosterPlayer) => {
    const s1 = slugOf(p.name);
    const s2 = p.cricsheetName ? slugOf(p.cricsheetName) : "";
    if (bios[s1]) return bios[s1];
    if (s2 && bios[s2]) return bios[s2];
    const nClean = p.name.toLowerCase().trim();
    for (const b of Object.values(bios)) {
      if (b.playerName?.toLowerCase().trim() === nClean || b.fullName?.toLowerCase().trim() === nClean) return b;
    }
    return null;
  };

  // Season captain from the verified table. Older rosters use scorecard names
  // ("RG Sharma"), so fall back to surname + first initial when exactly one player fits.
  const captainName = season ? FRANCHISE_SEASON_CAPTAINS[code]?.[season]?.name ?? null : null;
  const captainKey = useMemo(() => {
    if (!captainName) return null;
    const exact = players.find((p) => norm(p.name) === norm(captainName) || norm(nameOf(p)) === norm(captainName));
    if (exact) return keyOf(exact);
    const parts = captainName.toLowerCase().split(/\s+/);
    const surname = parts[parts.length - 1], initial = parts[0][0];
    const close = players.filter((p) => {
      const t = p.name.toLowerCase().split(/\s+/);
      return t.length > 1 && t[t.length - 1] === surname && t[0][0] === initial;
    });
    return close.length === 1 ? keyOf(close[0]) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, captainName, displayNames]);
  // The official listing's captain flag wins; the table covers seasons without one.
  const officialHasCaptain = officialList?.some((o) => o.captain) ?? false;
  const isCaptain = (p: RosterPlayer) =>
    officialHasCaptain ? officialFor(p)?.captain === true : captainKey != null && keyOf(p) === captainKey;

  const shown = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return players.filter((p) => {
      if (filter === "keeper" && !isKeeper(p)) return false;
      if (filter === "batter" && (p.role !== "batter" || isKeeper(p))) return false;
      if ((filter === "all-rounder" || filter === "bowler") && p.role !== filter) return false;
      if (q) {
        const hit = p.name.toLowerCase().includes(q)
          || nameOf(p).toLowerCase().includes(q)
          || (p.cricsheetName?.toLowerCase().includes(q) ?? false)
          || (p.country?.toLowerCase().includes(q) ?? false);
        if (!hit) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, filter, searchQuery, displayNames]);

  const counts = useMemo(() => ({
    all: players.length,
    batter: players.filter((p) => p.role === "batter" && !isKeeper(p)).length,
    "all-rounder": players.filter((p) => p.role === "all-rounder").length,
    bowler: players.filter((p) => p.role === "bowler").length,
    keeper: players.filter(isKeeper).length,
  }), [players]);

  // Coming back from a profile: restore the season and the spotlighted player.
  const [pendingReturn, setPendingReturn] = useState<{ player: string } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RETURN_KEY);
      if (!raw) return;
      const r = JSON.parse(raw) as { franchise: string; season: string; player: string; at: number };
      if (r.franchise !== franchise || Date.now() - r.at > 30 * 60_000) return;
      sessionStorage.removeItem(RETURN_KEY);
      if (r.season && r.season !== season) choose(r.season);
      setPendingReturn({ player: r.player });
    } catch { /* storage unavailable: start fresh */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [franchise]);

  useEffect(() => {
    if (!pendingReturn || players.length === 0) return;
    const hit = players.find((p) => keyOf(p) === pendingReturn.player);
    if (!hit) return;
    setSelectedKey(keyOf(hit));
    setPendingReturn(null);
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-squad-key="${CSS.escape(keyOf(hit))}"]`);
      (card ?? spotlightRef.current)?.scrollIntoView({ block: "center", inline: "center" });
    });
  }, [pendingReturn, players]);

  // Stats show only for the player the reader clicked: one flipped card at a time
  // (carousel, grid) or the details panel (list).
  const selected = useMemo(
    () => (selectedKey ? shown.find((p) => keyOf(p) === selectedKey) ?? null : null),
    [shown, selectedKey],
  );

  const select = (p: RosterPlayer) => {
    setSelectedKey(keyOf(p));
    if (view !== "list") return;
    requestAnimationFrame(() => {
      const el = spotlightRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.5) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedKey(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey]);

  const shelfRef = useRef<HTMLUListElement>(null);
  const scrollShelf = (dir: 1 | -1) => {
    const el = shelfRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const rememberReturn = (p: RosterPlayer) => {
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ franchise, season, player: keyOf(p), at: Date.now() }));
    } catch { /* non-essential */ }
  };

  if (squadsBySeason.isLoading || (roster.isLoading && !roster.data && !playerTeamSeasonStats.data)) {
    return (
      <div className={`rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080E1A] p-8 text-center shadow-lg dark:shadow-none ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500 dark:text-white/50">Loading the squad…</span>
      </div>
    );
  }

  if (!season) {
    return (
      <div className={`rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080E1A] p-8 text-center shadow-lg dark:shadow-none ${className}`}>
        <span className="text-xs text-slate-500 dark:text-white/40">Squad data not available for this franchise.</span>
      </div>
    );
  }

  const cardProps = (p: RosterPlayer) => ({
    p,
    name: nameOf(p),
    open: selected != null && keyOf(p) === keyOf(selected),
    onToggle: () => setSelectedKey((k) => (k === keyOf(p) ? null : keyOf(p))),
    onReadMore: () => rememberReturn(p),
    captain: isCaptain(p),
    jersey: officialFor(p)?.jersey ?? null,
    franchise, code, season, accent,
    bio: bioFor(p),
    playerImages: playerImages.data,
  });

  const overseas = players.filter((p) => p.country && p.country !== "India").length;
  const gallery = expanded || filter !== "all" || searchQuery ? shown : shown.slice(0, GALLERY_PREVIEW);

  return (
    <section className={`rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#060B16] p-4 sm:p-7 space-y-6 relative overflow-hidden shadow-xl dark:shadow-none transition-colors ${className}`}>
      {/* ─── Header: season and squad size ─── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Squad · {season}</div>
          <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{franchise}</h3>
          <p className="text-xs text-slate-500 dark:text-white/45 mt-1 tabular-nums">{players.length} players · {overseas} overseas</p>
        </div>
        {seasons.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50">
            Season
            <select
              aria-label="Season"
              value={season}
              onChange={(e) => choose(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0B1528] px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-slate-500 dark:focus:border-white/40 cursor-pointer shadow-inner dark:shadow-none"
            >
              {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </header>

      {/* ─── Filters, search and view ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div role="group" aria-label="Filter by role" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {ROLE_FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0).map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setExpanded(false); }}
                aria-pressed={on}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  on
                    ? "forced-white border-transparent text-white shadow-sm"
                    : "text-slate-600 dark:text-white/55 border-slate-200 dark:border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
                style={on ? { backgroundColor: accent, color: "#ffffff" } : undefined}
              >
                {f.label} <span className="tabular-nums opacity-75">{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a player"
              aria-label="Find a player"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-50 dark:bg-[#091122] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 transition-colors"
            />
          </div>
          <div role="group" aria-label="Layout" className="flex items-center gap-0.5 p-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] shrink-0">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-pressed={view === id}
                title={label}
                aria-label={label}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${view === id ? "text-slate-950 dark:text-white bg-white dark:bg-transparent shadow-sm dark:shadow-none" : "text-slate-500 dark:text-white/45 hover:text-slate-900 dark:hover:text-white"}`}
                style={view === id ? { backgroundColor: undefined } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── List view: the clicked player's details open above the list ─── */}
      <div ref={spotlightRef} className="scroll-mt-24" aria-live="polite">
        {view === "list" && selected && (
          <Spotlight
            key={keyOf(selected) + season}
            player={selected}
            displayName={nameOf(selected)}
            franchise={franchise}
            code={code}
            season={season}
            accent={accent}
            captain={isCaptain(selected)}
            bio={bioFor(selected)}
            playerImages={playerImages.data}
            onReadMore={() => rememberReturn(selected)}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>

      {/* ─── Squad: carousel, grid or list ─── */}
      {shown.length > 0 ? (
        <>
          {view === "carousel" && (
            <div className="relative">
              <ul ref={shelfRef} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 -mx-1 px-1">
                {shown.map((p) => (
                  <li key={keyOf(p)} data-squad-key={keyOf(p)} className="w-[72%] sm:w-60 lg:w-64 shrink-0 snap-start">
                    <SquadCard {...cardProps(p)} />
                  </li>
                ))}
              </ul>
              {shown.length > 3 && (
                <div className="hidden sm:flex justify-end gap-2 mt-3">
                  <button onClick={() => scrollShelf(-1)} aria-label="Previous players" className="w-9 h-9 rounded-full border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/30 bg-white dark:bg-transparent shadow-sm dark:shadow-none flex items-center justify-center cursor-pointer transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => scrollShelf(1)} aria-label="More players" className="w-9 h-9 rounded-full border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/30 bg-white dark:bg-transparent shadow-sm dark:shadow-none flex items-center justify-center cursor-pointer transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          )}

          {view === "grid" && (
            <ul className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
              {gallery.map((p) => (
                <li key={keyOf(p)} data-squad-key={keyOf(p)}>
                  <SquadCard {...cardProps(p)} />
                </li>
              ))}
            </ul>
          )}

          {view === "list" && (
            <ul className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 bg-slate-50/50 dark:bg-transparent overflow-hidden">
              {gallery.map((p) => {
                const on = selected != null && keyOf(p) === keyOf(selected);
                return (
                  <li key={keyOf(p)}>
                    <button
                      onClick={() => select(p)}
                      aria-pressed={on}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors ${on ? "bg-slate-200/70 dark:bg-white/[0.06]" : "hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"}`}
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-gradient-to-b dark:from-[#0E1830] dark:to-[#080F1E] border border-slate-200 dark:border-white/10">
                        <PlayerAvatar framing="chest" name={p.cricsheetName ?? p.name} teamId={franchise} season={season} playerImages={playerImages.data} bio={bioFor(p)} disableHover
                          imgClassName="w-full h-full object-contain object-bottom" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{nameOf(p)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-white/45 truncate">{[roleLabel(p), p.country].filter(Boolean).join(" · ")}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0 text-slate-400 dark:text-white/30" style={{ color: on ? accent : undefined }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {view !== "carousel" && filter === "all" && !searchQuery && shown.length > GALLERY_PREVIEW && (
            <div className="text-center">
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-300 dark:border-white/15 text-xs font-bold text-slate-700 dark:text-white/75 hover:text-slate-950 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/30 bg-white dark:bg-transparent shadow-sm dark:shadow-none cursor-pointer transition-colors"
              >
                {expanded ? "Show fewer" : `Show all ${shown.length} players`}
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
          <Users className="w-8 h-8 text-slate-400 dark:text-white/20 mx-auto" />
          <div className="text-sm font-bold text-slate-700 dark:text-white/60">No players match this filter.</div>
          <button onClick={() => { setFilter("all"); setSearchQuery(""); }} className="text-xs text-primary underline cursor-pointer">
            Show the full squad
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Squad card in the official-site pattern: a tall portrait with the jersey number
 * behind it. Clicking raises a details panel from the bottom while the portrait
 * shrinks out of its way; the rows slide up into place. Clicking again (or ✕)
 * lowers it.
 */
function SquadCard({ p, name, open, onToggle, onReadMore, captain, jersey, franchise, code, season, accent, bio, playerImages }: {
  p: RosterPlayer;
  name: string;
  open: boolean;
  onToggle: () => void;
  onReadMore: () => void;
  captain: boolean;
  jersey: string | null;
  franchise: string;
  code: string;
  season: string;
  accent: string;
  bio: PlayerBio | null;
  playerImages: Parameters<typeof PlayerAvatar>[0]["playerImages"];
}) {
  const [location] = useLocation();
  const stats = seasonStats(p);
  const nationality = p.country ?? bio?.country ?? null;
  const [first, ...rest] = name.split(" ");
  const last = rest.join(" ");
  const tab = open ? 0 : -1;
  // Rows of the details panel, revealed one after another.
  const rise = (i: number, extra = "") => ({
    className: `${extra} transition-all duration-500 ease-out motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`,
    style: { transitionDelay: open ? `${120 + i * 55}ms` : "0ms" },
  });

  return (
    <div
      className="group relative h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0E1830] dark:to-[#080F1E] shadow-md dark:shadow-none transition-all"
      style={open ? { borderColor: `${accent}88` } : undefined}
    >
      {/* Portrait and jersey number: shrinks upward while the panel is open */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${name}, ${roleLabel(p)}. ${open ? "Hide" : "Show"} ${season} details`}
        className="absolute inset-0 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
      >
        <div
          className={`absolute inset-x-0 top-0 transition-all duration-500 ease-out motion-reduce:transition-none ${open ? "h-[34%]" : "h-[calc(100%-68px)]"}`}
        >
          {jersey && (
            <span
              aria-hidden
              className={`absolute left-1/2 -translate-x-1/2 font-display font-black leading-none select-none tabular-nums transition-all duration-500 ${open ? "top-1 text-[64px] opacity-[0.08] dark:opacity-[0.10]" : "top-6 text-[150px] opacity-[0.10] dark:opacity-[0.14]"}`}
              style={{ color: accent }}
            >
              {jersey}
            </span>
          )}
          <div className={`absolute inset-x-0 bottom-0 transition-all duration-500 ease-out ${open ? "top-2" : "top-10"}`}>
            <PlayerAvatar framing="chest"
              name={p.cricsheetName ?? p.name}
              teamId={franchise}
              season={season}
              playerImages={playerImages}
              bio={bio}
              disableHover
              imgClassName="w-full h-full object-contain object-bottom"
            />
          </div>
          <div className="absolute top-3 inset-x-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em]">
            <span style={{ color: accent }}>{open ? "" : roleLabel(p)}</span>
            {captain && !open && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:text-white/85 border border-slate-300 dark:border-white/25 bg-white/80 dark:bg-black/30 shadow-sm dark:shadow-none">C</span>}
          </div>
        </div>

        {/* Bottom bar: number and role, name */}
        <div
          className={`absolute inset-x-0 bottom-0 h-[68px] px-3.5 flex items-center justify-between gap-3 border-t bg-white/95 dark:bg-[#070D1A] backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-0" : "opacity-100"}`}
          style={{ borderColor: `${accent}55` }}
        >
          <div className="min-w-0">
            {jersey && <div className="text-xs font-bold text-slate-800 dark:text-white/80 tabular-nums">{jersey}</div>}
            <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/45 truncate">{roleLabel(p)}</div>
          </div>
          <div className="text-right min-w-0 leading-tight">
            <div className="text-[11px] font-bold uppercase text-slate-600 dark:text-white/70 truncate">{first}</div>
            <div className="text-base font-black uppercase text-slate-950 dark:text-white truncate">{last || first}</div>
          </div>
        </div>
      </button>

      {/* Details panel: rises from the bottom */}
      <div
        aria-hidden={!open}
        className={`absolute inset-x-0 bottom-0 flex flex-col px-4 overflow-hidden transition-[height,padding] duration-500 ease-out motion-reduce:transition-none bg-white dark:bg-[#08101F] ${open ? "h-[66%] pt-3 pb-4 border-t" : "h-0 py-0 border-t-0 pointer-events-none"}`}
        style={{ borderColor: accent, backgroundImage: `radial-gradient(120% 70% at 100% 100%, ${accent}15 0%, transparent 60%)` }}
      >
        <div {...rise(0, "flex items-start justify-between gap-2")}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] truncate" style={{ color: accent }}>
              {[nationality, roleLabel(p)].filter(Boolean).join(" · ")}
            </div>
            <div className="text-base font-black uppercase tracking-tight text-slate-950 dark:text-white leading-tight line-clamp-2">
              {jersey && <span className="text-slate-400 dark:text-white/40 tabular-nums mr-1.5">{jersey}</span>}{name}
            </div>
            {captain && <div className="text-[11px] text-slate-600 dark:text-white/60">Captain · {season}</div>}
          </div>
          <button
            onClick={onToggle}
            tabIndex={tab}
            aria-label="Hide details"
            className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:text-slate-950 dark:hover:text-white flex items-center justify-center cursor-pointer shadow-sm dark:shadow-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div {...rise(1, "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-white/35 mt-3 mb-1.5")}>
          {stats.length > 0 ? `IPL ${season} · ${code}` : `IPL Career & Profile · ${code}`}
        </div>
        {stats.length > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4">
            {stats.map((s, i) => (
              <div key={s.label} style={rise(2 + i).style} className={`${rise(2 + i).className} min-w-0 border-t border-slate-200 dark:border-white/10 py-1.5`}>
                <dd className="font-display font-black text-xl text-slate-950 dark:text-white tabular-nums leading-none">{s.value}</dd>
                <dt className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-white/45 mt-1">{s.label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <div {...rise(2, "space-y-1.5 text-xs text-slate-600 dark:text-white/70 leading-relaxed")}>
            <div className="font-semibold text-slate-800 dark:text-white/90">
              {p.acquisition === "retained" ? "Retained Core Asset" : p.acquisition === "auction" ? "Auction Acquisition" : "Franchise Roster Asset"}
              {p.priceDisplay ? ` · ${p.priceDisplay}` : ""}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/50">
              {bio?.batStyle || bio?.bowlStyle ? [bio.batStyle, bio.bowlStyle].filter(Boolean).join(" · ") : `${roleLabel(p)} registered for ${code}.`}
            </p>
          </div>
        )}

        <div {...rise(7, "mt-auto pt-2")}>
          <Link
            href={`/players/${slugOf(p.cricsheetName ?? p.name)}?from=${encodeURIComponent(location)}`}
            onClick={onReadMore}
            tabIndex={tab}
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider hover:underline underline-offset-4"
            style={{ color: accent }}
          >
            Read more <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Spotlight({ player: p, displayName, franchise, code, season, accent, captain, bio, playerImages, onReadMore, onClose }: {
  player: RosterPlayer;
  displayName: string;
  franchise: string;
  code: string;
  season: string;
  accent: string;
  captain: boolean;
  bio: PlayerBio | null;
  playerImages: Parameters<typeof PlayerAvatar>[0]["playerImages"];
  onReadMore: () => void;
  onClose: () => void;
}) {
  const [location] = useLocation();
  const stats = seasonStats(p);
  const nationality = p.country ?? bio?.country ?? null;
  const styles = [bio?.batStyle, bio?.bowlStyle].filter((s) => s && s !== "-" && s.trim()).join(" · ");

  return (
    <article
      className="relative grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08101F] shadow-xl dark:shadow-none animate-in fade-in duration-300 motion-reduce:animate-none"
      style={{ backgroundImage: `radial-gradient(90% 90% at 100% 100%, ${accent}15 0%, transparent 60%)` }}
    >
      <button
        onClick={onClose}
        aria-label="Close player details"
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/75 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-black/60 shadow-md dark:shadow-none flex items-center justify-center cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      {/* Portrait */}
      <div className="relative h-[340px] sm:h-[420px] md:h-[460px] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-[#0E1830] dark:to-[#08101F]">
        <div className="absolute inset-x-0 bottom-0 top-4">
          <PlayerAvatar framing="chest"
            name={p.cricsheetName ?? p.name}
            teamId={franchise}
            season={season}
            playerImages={playerImages}
            bio={bio}
            disableHover
            imgClassName="w-full h-full object-contain object-bottom"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-200 dark:from-[#08101F] to-transparent md:hidden pointer-events-none" />
      </div>

      {/* Identity, figures and Read More, over an oversized franchise mark */}
      <div className="relative isolate overflow-hidden p-5 sm:p-8 md:p-10 flex flex-col justify-center gap-6 min-w-0">
        <div
          aria-hidden
          className="absolute -right-3 -bottom-8 -z-10 font-display font-black leading-none select-none pointer-events-none tracking-tighter"
          style={{ fontSize: "clamp(120px, 20vw, 240px)", color: accent, opacity: 0.08 }}
        >
          {code}
        </div>
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span style={{ color: accent }}>{roleLabel(p)}</span>
            {captain && <span className="text-slate-700 dark:text-white/80">Captain · {season}</span>}
          </div>
          <h4 className="font-display font-black text-3xl sm:text-5xl text-slate-950 dark:text-white uppercase tracking-tight leading-[0.95] break-words">{displayName}</h4>
          <p className="text-sm text-slate-600 dark:text-white/55">
            {[nationality, styles].filter(Boolean).join(" · ") || " "}
          </p>
        </div>

        {stats.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/35 mb-3">IPL {season} for {code}</div>
            <dl className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-4">
              {stats.map((s, i) => (
                <div key={s.label} className={`min-w-0 ${i > 0 ? "sm:border-l border-slate-200 dark:border-white/10 sm:pl-4" : ""}`}>
                  <dd className="font-display font-black text-2xl sm:text-3xl text-slate-950 dark:text-white tabular-nums leading-none">{s.value}</dd>
                  <dt className="text-[11px] text-slate-500 dark:text-white/45 mt-1.5">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/35">Roster Status · {code}</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-white/90">
              {p.acquisition === "retained" ? "Retained Franchise Asset" : p.acquisition === "auction" ? "Auction Acquisition" : "Official Squad Member"}
              {p.priceDisplay ? ` · ${p.priceDisplay}` : ""}
            </div>
            <p className="text-xs text-slate-500 dark:text-white/55">
              {bio?.iplDebut ? `IPL Debut: ${bio.iplDebut} · ` : ""}{styles || `${roleLabel(p)} registered in official team sheet.`}
            </p>
          </div>
        )}

        <div>
          <Link
            href={`/players/${slugOf(p.cricsheetName ?? p.name)}?from=${encodeURIComponent(location)}`}
            onClick={onReadMore}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-transform hover:translate-x-0.5 motion-reduce:transition-none shadow-md"
            style={{ backgroundColor: accent, color: inkOn(accent) }}
          >
            Read more <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
