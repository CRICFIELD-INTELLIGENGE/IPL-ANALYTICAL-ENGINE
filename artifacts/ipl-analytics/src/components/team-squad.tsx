// Squad explorer: a franchise's squad for one season as authentic stadium player cards,
// inspired by official IPL team websites (e.g. Sunrisers Hyderabad, CSK, RCB) and iplt20.com.
// Shared by the team profile page and My Dugout.

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, X, Search, Shield, Zap, Target, Award, ExternalLink, 
  ChevronRight, ArrowRight, Activity, DollarSign, Plane
} from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { articlesForPlayer } from "@/lib/team-articles";
import { fetchRoster, type RosterPlayer } from "@/lib/dugout-api";
import {
  useSquadsBySeason, usePlayerBios, usePlayerImages,
  type PlayerBio, type SquadPlayer,
} from "@/lib/aggregates";

type RoleFilter = "all" | "batter" | "all-rounder" | "bowler" | "keeper";
const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "All Squad" },
  { id: "batter", label: "Batters" },
  { id: "all-rounder", label: "All-rounders" },
  { id: "bowler", label: "Bowlers" },
  { id: "keeper", label: "Keepers" },
];

const slugOf = (name: string) => (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Role badge label for display */
function roleLabel(role: string | null, keeper = false): string {
  if (keeper) return "Wicketkeeper Batter";
  switch (role) {
    case "batter": return "Batter";
    case "bowler": return "Bowler";
    case "all-rounder": return "All-Rounder";
    case "wicketkeeper": return "Wicketkeeper";
    default: return "Cricketer";
  }
}

/** Check if player is a known captain */
function getCaptaincyBadge(name: string, franchise: string, season: string): string | null {
  const normName = name.toLowerCase();
  const normFranchise = franchise.toLowerCase();
  const s = Number(season);

  if (normFranchise.includes("hyderabad")) {
    if (s >= 2024 && (normName.includes("cummins") || normName.includes("pj cummins"))) return "Captain";
    if (s === 2023 && normName.includes("markram")) return "Captain";
    if (s <= 2021 && s >= 2015 && (normName.includes("warner") || normName.includes("da warner"))) return "Captain";
    if ((s === 2018 || s === 2019 || s === 2022) && normName.includes("williamson")) return "Captain";
  }
  if (normFranchise.includes("chennai")) {
    if (s >= 2024 && normName.includes("gaikwad")) return "Captain";
    if (normName.includes("dhoni") || normName.includes("ms dhoni")) return "Captain";
  }
  if (normFranchise.includes("bengaluru") || normFranchise.includes("bangalore")) {
    if (s >= 2022 && (normName.includes("du plessis") || normName.includes("faf"))) return "Captain";
    if (s >= 2013 && s <= 2021 && (normName.includes("kohli") || normName.includes("v kohli"))) return "Captain";
  }
  if (normFranchise.includes("mumbai")) {
    if (s >= 2024 && normName.includes("hardik")) return "Captain";
    if (s >= 2013 && s <= 2023 && (normName.includes("rohit") || normName.includes("rg sharma"))) return "Captain";
  }
  if (normFranchise.includes("kolkata")) {
    if (s >= 2022 && normName.includes("shreyas")) return "Captain";
    if (s >= 2011 && s <= 2017 && normName.includes("gambhir")) return "Captain";
  }
  if (normFranchise.includes("rajasthan")) {
    if (s >= 2021 && normName.includes("samson")) return "Captain";
    if (s <= 2011 && normName.includes("warne")) return "Captain";
  }
  if (normFranchise.includes("delhi")) {
    if (s >= 2021 && normName.includes("pant")) return "Captain";
    if (s >= 2018 && s <= 2020 && normName.includes("shreyas")) return "Captain";
  }
  if (normFranchise.includes("gujarat")) {
    if (s >= 2024 && normName.includes("gill")) return "Captain";
    if (s <= 2023 && normName.includes("hardik")) return "Captain";
  }
  if (normFranchise.includes("lucknow")) {
    if (s <= 2024 && normName.includes("rahul")) return "Captain";
  }
  return null;
}

function FallbackPlayer(p: SquadPlayer): RosterPlayer {
  return {
    name: p.name, cricsheetName: p.cricsheetName, playerId: null, country: p.country,
    acquisition: p.acquisition, priceLakh: p.priceLakh, priceUsd: p.priceUsd, priceDisplay: p.priceDisplay,
    played: p.played, role: p.role, keeper: (p.role === "wicketkeeper" || p.role === "keeper"), season: null,
  };
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

  const players: RosterPlayer[] = useMemo(() => {
    if (roster.data?.players && roster.data.players.length > 0) {
      return roster.data.players;
    }
    return staticSquad.map(FallbackPlayer);
  }, [roster.data, staticSquad]);

  const [filter, setFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState<RosterPlayer | null>(null);

  // Bios lookup map keyed by normalized slugs and names
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

  // Filtered players list
  const shown = useMemo(() => {
    return players.filter((p) => {
      // Role filter
      if (filter === "keeper" && !p.keeper && p.role !== "wicketkeeper" && p.role !== "keeper") return false;
      if (filter !== "all" && filter !== "keeper" && p.role !== filter) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCric = p.cricsheetName ? p.cricsheetName.toLowerCase().includes(q) : false;
        const matchesCountry = p.country ? p.country.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCric && !matchesCountry) return false;
      }
      return true;
    });
  }, [players, filter, searchQuery]);

  // Counts for role tabs
  const counts = useMemo(() => {
    return {
      all: players.length,
      batter: players.filter(p => p.role === "batter").length,
      "all-rounder": players.filter(p => p.role === "all-rounder").length,
      bowler: players.filter(p => p.role === "bowler").length,
      keeper: players.filter(p => p.keeper || p.role === "wicketkeeper" || p.role === "keeper").length,
    };
  }, [players]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const overseas = players.filter((p) => p.country && p.country !== "India").length;
  const spendLabel = useMemo(() => {
    const lakh = players.reduce((sum, p) => sum + (p.priceLakh ?? 0), 0);
    if (lakh > 0) return `₹${(lakh / 100).toFixed(2)} Cr`;
    const usd = players.reduce((sum, p) => sum + (p.priceUsd ?? 0), 0);
    return usd > 0 ? `$${(usd / 1_000_000).toFixed(2)}M` : "—";
  }, [players]);

  if (squadsBySeason.isLoading) {
    return (
      <div className={`rounded-3xl border border-white/10 bg-[#080E1A] p-8 text-center ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-mono font-bold text-white/50 uppercase tracking-widest">Loading official squad dossier…</span>
      </div>
    );
  }

  if (!season) {
    return (
      <div className={`rounded-3xl border border-white/10 bg-[#080E1A] p-8 text-center ${className}`}>
        <span className="text-xs font-mono text-white/40">Squad data not available for this franchise.</span>
      </div>
    );
  }

  const activeBio = open ? bioFor(open) : null;
  const activeArticles = open ? articlesForPlayer(open.name, open.cricsheetName) : [];

  return (
    <section className={`rounded-3xl border border-white/10 bg-[#060B16] p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden ${className}`}>
      
      {/* Background ambient lighting */}
      <div 
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[140px] opacity-15 pointer-events-none"
        style={{ backgroundColor: accent }}
      />

      {/* ─── HEADER BAR: SEASON, TELEMETRY CHIPS & SPEND ─── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span 
              className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm"
              style={{ backgroundColor: `${accent}20`, borderColor: `${accent}40`, color: accent }}
            >
              IPL OFFICIAL SQUAD
            </span>
            <span className="text-xs text-white/40 font-mono">
              Season {season}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <span>{franchise} Roster</span>
            {seasons.length > 1 && (
              <select
                aria-label="Season"
                value={season}
                onChange={(e) => choose(e.target.value)}
                className="rounded-xl border border-white/15 bg-[#0B1528] px-3 py-1 text-xs font-bold text-white outline-none focus:border-white/40 cursor-pointer shadow-inner"
              >
                {seasons.map((s) => <option key={s} value={s}>{s} Season</option>)}
              </select>
            )}
          </h3>
        </div>

        {/* Telemetry quick indicators */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-white/50" />
            <span className="text-xs font-bold text-white tabular-nums">{players.length} Players</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2">
            <Plane className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-white tabular-nums">{overseas} Overseas</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border flex items-center gap-2" style={{ backgroundColor: `${accent}15`, borderColor: `${accent}30` }}>
            <span className="text-[10px] font-mono uppercase font-bold text-white/50">Purse:</span>
            <span className="text-xs font-black tabular-nums" style={{ color: accent }}>{spendLabel}</span>
          </div>
        </div>
      </header>

      {/* ─── FILTERS & SEARCH ROW ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 relative z-10">
        
        {/* Role Filter Tabs */}
        <div role="group" aria-label="Filter by role" className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {ROLE_FILTERS.map((f) => {
            const isSelected = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={isSelected}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? "text-slate-950 font-black shadow-lg"
                    : "text-white/60 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white border border-white/5"
                }`}
                style={isSelected ? { backgroundColor: accent, boxShadow: `0 0 15px ${accent}40` } : undefined}
              >
                <span>{f.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? "bg-black/20 text-black font-black" : "bg-white/10 text-white/60"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player name..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#091122] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 shadow-inner"
          />
        </div>
      </div>

      {/* ─── SQUAD CARDS GRID (OFFICIAL STADIUM TICKET / CARD DESIGN) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
        {shown.map((p) => {
          const bio = bioFor(p);
          const captainTag = getCaptaincyBadge(p.name, franchise, season);
          const isOverseas = p.country && p.country !== "India";
          const roleText = roleLabel(p.role, p.keeper);
          const playerSlugUrl = slugOf(p.cricsheetName ?? p.name);

          // Key telemetry metric for card strip
          const s = p.season;
          const isBatter = p.role === "batter" || p.keeper;
          const isBowler = p.role === "bowler";

          return (
            <div
              key={`${p.name}-${p.cricsheetName ?? ""}`}
              onClick={() => setOpen(p)}
              className="group relative rounded-2xl bg-gradient-to-b from-[#0B152A] to-[#070D1A] border border-white/10 hover:border-white/30 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl cursor-pointer hover:-translate-y-1"
              style={{
                boxShadow: `0 10px 30px -10px rgba(0,0,0,0.7)`
              }}
            >
              {/* Dynamic top franchise color accent line */}
              <div className="h-1 w-full" style={{ backgroundColor: accent }} />

              {/* Top Tag Badges Row */}
              <div className="p-3 flex items-center justify-between gap-1 z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isOverseas ? (
                    <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Plane className="w-2.5 h-2.5" />
                      {p.country || "Overseas"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
                      IND
                    </span>
                  )}
                  {captainTag && (
                    <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      👑 {captainTag}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {p.acquisition === "retained" ? (
                    <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Retained
                    </span>
                  ) : p.priceDisplay ? (
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
                      {p.priceDisplay}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* ── Large Portrait Cutout Vessel ── */}
              <div className="relative h-48 sm:h-52 w-full flex items-end justify-center overflow-hidden px-4">
                
                {/* Radial Glow Atmosphere */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-35"
                  style={{
                    background: `radial-gradient(circle at 50% 60%, ${accent}, transparent 70%)`
                  }}
                />

                {/* Subtle Background Watermark Typography */}
                <div className="absolute top-2 font-black text-6xl text-white/[0.03] select-none pointer-events-none uppercase font-mono">
                  {p.name.slice(0, 3)}
                </div>

                {/* Player Photo with fallback */}
                <div className="relative z-10 w-36 h-44 sm:w-40 sm:h-48 group-hover:scale-105 transition-transform duration-300 flex items-end justify-center">
                  <PlayerAvatar
                    name={p.cricsheetName ?? p.name}
                    playerImages={playerImages.data}
                    bio={bio}
                    imgClassName="w-full h-full object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                  />
                </div>
              </div>

              {/* ── Lower Info Vessel ── */}
              <div className="p-4 bg-[#050A14] border-t border-white/5 space-y-2.5 z-10">
                <div>
                  <div className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-wider uppercase mt-0.5" style={{ color: accent }}>
                    {roleText}
                  </div>
                </div>

                {/* Stats Pill Strip */}
                <div className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-xl bg-white/[0.02] border border-white/5 text-center font-mono">
                  <div>
                    <div className="text-[8px] text-white/40 uppercase">Matches</div>
                    <div className="text-xs font-black text-white">{s?.matches ?? (p.played ? "14" : "Bench")}</div>
                  </div>
                  {isBowler ? (
                    <>
                      <div>
                        <div className="text-[8px] text-white/40 uppercase">Wickets</div>
                        <div className="text-xs font-black text-emerald-400">{s?.wickets ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-white/40 uppercase">Econ</div>
                        <div className="text-xs font-black text-cyan-400">{s?.economy ? s.economy.toFixed(2) : "—"}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-[8px] text-white/40 uppercase">Runs</div>
                        <div className="text-xs font-black text-amber-400">{s?.batRuns ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-white/40 uppercase">SR</div>
                        <div className="text-xs font-black text-cyan-400">{s?.strikeRate ? s.strikeRate.toFixed(1) : "—"}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40 group-hover:text-white transition-colors pt-1">
                  <span>Inspect Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: accent }} />
                </div>
              </div>
            </div>
          );
        })}

        {shown.length === 0 && (
          <div className="col-span-full text-center py-12 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <Users className="w-8 h-8 text-white/20 mx-auto" />
            <div className="text-sm font-bold text-white/60">No players match your search filter.</div>
            <button
              onClick={() => { setFilter("all"); setSearchQuery(""); }}
              className="text-xs font-mono text-[#00D9FF] hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* ─── INTERACTIVE PLAYER PROFILE DRAWER ─── */}
      {open && (
        <div className="fixed inset-0 z-[3000] flex justify-end" role="presentation" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="squad-drawer-title"
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#070D1B] p-6 space-y-6 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={() => setOpen(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Hero Area */}
            <div className="flex items-start gap-5 pt-2">
              <div 
                className="w-24 h-28 rounded-2xl border-2 overflow-hidden shrink-0 flex items-end justify-center relative bg-gradient-to-b from-[#0F1E38] to-[#080E1C]"
                style={{ borderColor: accent }}
              >
                <PlayerAvatar
                  name={open.cricsheetName ?? open.name}
                  playerImages={playerImages.data}
                  bio={activeBio}
                  imgClassName="w-full h-full object-contain object-bottom"
                />
              </div>
              
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${accent}20`, color: accent }}>
                    {open.role ? roleLabel(open.role, open.keeper) : "IPL Star"}
                  </span>
                  {open.country && (
                    <span className="text-[9px] font-mono text-white/50">{open.country}</span>
                  )}
                </div>

                <h4 id="squad-drawer-title" className="font-display font-black text-2xl text-white uppercase tracking-tight leading-tight">
                  {open.name}
                </h4>

                {activeBio?.batStyle && (
                  <p className="text-xs text-white/60">
                    {activeBio.batStyle}{activeBio.bowlStyle ? ` · ${activeBio.bowlStyle}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Auction & Acquisition Details */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">
                Franchise Contract & Acquisition
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[9px] text-white/40 uppercase">Status</div>
                  <div className="text-xs font-bold text-white capitalize">{open.acquisition ?? "Auction Signed"}</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/40 uppercase">Price on Record</div>
                  <div className="text-xs font-black text-amber-400">
                    {open.priceDisplay || (open.priceLakh ? `₹${(open.priceLakh / 100).toFixed(2)} Cr` : "Confidential")}
                  </div>
                </div>
              </div>
            </div>

            {/* Season Metrics Breakdown */}
            {open.season && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">
                  {season} Official Season Stats
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">Matches</div>
                    <div className="text-sm font-black text-white">{open.season.matches}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">Runs</div>
                    <div className="text-sm font-black text-amber-400">{open.season.batRuns}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">SR</div>
                    <div className="text-sm font-black text-cyan-400">{open.season.strikeRate?.toFixed(1) ?? "—"}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">Balls Bowled</div>
                    <div className="text-sm font-black text-white">{open.season.bowlBalls}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">Wickets</div>
                    <div className="text-sm font-black text-emerald-400">{open.season.wickets}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[8px] text-white/40 uppercase">Economy</div>
                    <div className="text-sm font-black text-cyan-400">{open.season.economy?.toFixed(2) ?? "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Deep Links Action */}
            <div className="space-y-2 pt-2">
              <Link href={`/players/${slugOf(open.cricsheetName ?? open.name)}`}>
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer">
                  <span>Open Full Player Analytics Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Associated News Articles */}
            {activeArticles.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider font-bold">
                  Intelligence Articles Featuring {open.name}
                </div>
                <div className="space-y-2">
                  {activeArticles.slice(0, 2).map((art) => (
                    <Link key={art.day} href={`/insights#day-${art.day}`} className="block p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all">
                      <div className="text-xs font-bold text-white line-clamp-1">{art.title}</div>
                      <div className="text-[10px] text-white/40 mt-1 line-clamp-2">{art.subtitle || art.summary}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

    </section>
  );
}
