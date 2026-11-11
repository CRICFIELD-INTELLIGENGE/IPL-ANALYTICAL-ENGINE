import { useAnalyticsFilterStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useMatches, useSeasons, useSquadsBySeason, usePlayerBios, usePointsTables, usePlayerImages,
  TEAM_COLORS, teamColor, teamShort, venueSlug, normalizeVenueName, playerSlug,
  type SquadPlayer, type PlayerBio, type MatchSummary,
} from "@/lib/aggregates";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { Link } from "wouter";
import {
  Calendar, Trophy, Users, Activity, Filter, MapPin, Award,
  ArrowUpRight, Search, Sparkles, Shield, Star, Grid, List,
  ShoppingBag, CheckCircle2, ChevronRight, Zap, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdVessel } from "@/components/ad-vessel";
import { FixtureTicketCard } from "@/components/fixture-ticket-card";
import { CricFieldMascot } from "@/components/CricFieldMascot";

/** Helper to generate standard URL slug for a team */
const teamSlug = (team?: string | null): string =>
  (team || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ScoresPage() {
  const seasons = useSeasons();
  const filterStore = useAnalyticsFilterStore();
  const selectedSeason = filterStore.filters.season === "All Seasons"
    ? (seasons.data?.at(-1)?.season ?? "2026")
    : filterStore.filters.season;
  const [activeTab, setActiveTab] = useState<"schedule" | "points" | "squad">("schedule");

  const allMatches = useMatches();
  const seasonMatches = useMemo(
    () => allMatches.data?.filter(m => m.season === selectedSeason) || [],
    [allMatches.data, selectedSeason]
  );
  const pointsTables = usePointsTables();
  const standings = pointsTables.data?.[selectedSeason] || [];
  const leaderTeam = standings[0]?.team;
  const playerImages = usePlayerImages();

  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-[#050816] text-white p-4 md:p-8 gap-6">
        
        {/* ─── BROADCAST TELEMETRY & ARCHIVE FILTER BAR ─── */}
        <div className="bg-[#0B1020]/90 rounded-[28px] border border-white/10 p-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl sticky top-4 z-[100] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
              <CricFieldMascot team={leaderTeam || "default"} mood="fire" size={38} interactive />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest franchise-eyebrow flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> OFFICIAL TOURNAMENT ARCHIVE
                </span>
                <span className="text-[10px] font-mono text-white/40">2008–2026</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                IPL {selectedSeason} MATCH CENTER &amp; SQUADS
              </h1>
            </div>
          </div>
          
          {/* Season Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-thin">
            {seasons.data?.slice().reverse().map(s => (
              <button 
                key={s.season}
                onClick={() => filterStore.setFilter("season", s.season)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedSeason === s.season 
                    ? 'bg-primary text-white font-black shadow-lg shadow-primary/25 scale-105 border border-primary/40' 
                    : 'bg-white/[0.03] text-white/50 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {s.season}
              </button>
            ))}
          </div>
        </div>

        {/* ─── TOURNAMENT TELEMETRY STRIP ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0B1020]/80 rounded-2xl border border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Season Fixtures</span>
              <span className="text-base font-black text-white">{seasonMatches.length} Matches</span>
            </div>
          </div>

          <div className="bg-[#0B1020]/80 rounded-2xl border border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Table Leader</span>
              <span className="text-base font-black text-cyan-300 truncate max-w-[130px] block">
                {leaderTeam ? teamShort(leaderTeam) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-[#0B1020]/80 rounded-2xl border border-white/10 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Franchises</span>
              <span className="text-base font-black text-white">{standings.length || 10} Teams</span>
            </div>
          </div>

          
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: "schedule", label: "Schedule & Results", icon: Calendar, count: seasonMatches.length },
            { id: "points", label: "Points Standings", icon: Trophy, count: standings.length },
            { id: "squad", label: "Squads & Player Cards", icon: Users },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 border border-primary/40' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${activeTab === tab.id ? 'bg-black/30 text-white' : 'bg-white/10 text-white/50'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── MAIN CONTENT VIEW ─── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {activeTab === "schedule" && <ScheduleView season={selectedSeason} matches={seasonMatches} />}
          {activeTab === "points" && <PointsView season={selectedSeason} standings={standings} />}
          {activeTab === "squad" && <SquadsListView season={selectedSeason} playerImages={playerImages.data} />}
        </motion.div>

        {/* Native Ad Vessel - Match Day Telemetry Sponsor */}
        <div className="pt-2">
          <AdVessel slot="1029384757" format="horizontal" label="Match Day Partner · Live Telemetry Briefing" />
        </div>
      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   1. SCHEDULE VIEW — SUNRISERS HYDERABAD STYLE TICKET-STUB FIXTURES
   ══════════════════════════════════════════════════════════════════════════ */

function ScheduleView({ season, matches }: { season: string; matches: MatchSummary[] }) {
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all");
  const [matchStatusFilter, setMatchStatusFilter] = useState<"all" | "completed" | "upcoming">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique franchises playing in this season's matches
  const franchises = useMemo(() => {
    const set = new Set<string>();
    matches.forEach(m => {
      if (m.team1) set.add(m.team1);
      if (m.team2) set.add(m.team2);
    });
    return Array.from(set).sort();
  }, [matches]);

  // Filter matches based on selected franchise, status, and search query
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Franchise filter
      if (selectedFranchise !== "all") {
        if (m.team1 !== selectedFranchise && m.team2 !== selectedFranchise) {
          return false;
        }
      }
      // Match status filter
      const isCompleted = !!m.winner || m.margin === "tie" || m.margin === "no result";
      if (matchStatusFilter === "completed" && !isCompleted) return false;
      if (matchStatusFilter === "upcoming" && isCompleted) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t1 = (m.team1 || "").toLowerCase();
        const t2 = (m.team2 || "").toLowerCase();
        const venue = (m.venue || "").toLowerCase();
        const id = String(m.id);
        const mom = (m.mom || "").toLowerCase();
        if (!t1.includes(q) && !t2.includes(q) && !venue.includes(q) && !id.includes(q) && !mom.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [matches, selectedFranchise, matchStatusFilter, searchQuery]);

  if (matches.length === 0) {
    return (
      <div className="py-24 text-center bg-[#0B1020]/60 rounded-3xl border border-white/5">
        <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 font-black uppercase tracking-widest text-sm">
          No matches found for {season} season
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── FIXTURES CONTROL STRIP (SRH INSPIRED FRANCHISE FILTER & SEARCH) ─── */}
      <div className="bg-[#0B1020]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fixture, team, venue, match #…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 self-end md:self-auto">
            {(["all", "completed", "upcoming"] as const).map(st => (
              <button
                key={st}
                onClick={() => setMatchStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  matchStatusFilter === st
                    ? "bg-primary text-black font-black shadow-md"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {st === "all" ? "All Fixtures" : st === "completed" ? "Results" : "Upcoming"}
              </button>
            ))}
          </div>
        </div>

        {/* Franchise Filter Pills Strip with Team Logos & Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedFranchise("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedFranchise === "all"
                ? "bg-white text-black shadow-lg shadow-white/20 font-black"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>All Franchises ({matches.length})</span>
          </button>

          {franchises.map(team => {
            const tColor = teamColor(team);
            const isSelected = selectedFranchise === team;
            return (
              <button
                key={team}
                onClick={() => setSelectedFranchise(team)}
                style={isSelected ? { backgroundColor: tColor, borderColor: tColor, color: "#000" } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  isSelected
                    ? "font-black shadow-lg scale-105"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
                title={`Filter ${team} Fixtures`}
              >
                <TeamLogo team={team} size="w-4 h-4" />
                <span>{teamShort(team)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TICKET STUB FIXTURES GRID (SRH MATCH CENTER INSPIRED) ─── */}
      {filteredMatches.length === 0 ? (
        <div className="py-20 text-center bg-[#0B1020]/60 rounded-3xl border border-white/5">
          <Calendar className="w-10 h-10 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
            No matches matching current filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredMatches.map(m => (
            <FixtureTicketCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   2. POINTS TABLE VIEW — CO-MAPPED WITH TEAM PROFILES & LOGOS
   ══════════════════════════════════════════════════════════════════════════ */

function PointsView({ season, standings }: { season: string; standings: any[] }) {
  if (standings.length === 0) {
    return (
      <div className="py-24 text-center bg-[#0B1020]/60 rounded-3xl border border-white/5">
        <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 font-black uppercase tracking-widest text-sm">
          No standings available for {season}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1020] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black uppercase tracking-widest text-[14px] text-white block">
              {season} League Stage Standings
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              Top 4 franchises qualify for the Playoff Qualifier &amp; Eliminator rounds
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Qualified
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              {["Pos", "Franchise", "P", "W", "L", "NR", "NRR", "Pts", "Dossier"].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${
                    h === "Pts" ? "text-primary" : "text-white/40"
                  } ${i >= 2 && i <= 7 ? "text-center" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {standings.map(r => {
              const tSlug = teamSlug(r.team);
              const isFirst = r.position === 1;

              return (
                <tr
                  key={r.team}
                  className={`hover:bg-white/[0.03] transition-colors group ${
                    r.qualified ? "bg-emerald-400/[0.03]" : ""
                  }`}
                >
                  {/* Position */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-black ${isFirst ? 'text-primary' : 'text-white/60'}`}>
                        {r.position}
                      </span>
                      {r.qualified && (
                        <span className="w-1.5 h-4 rounded-full bg-emerald-400/80 shadow-sm shadow-emerald-400/50" />
                      )}
                    </div>
                  </td>

                  {/* Team Logo + Name linking to /teams/:slug */}
                  <td className="px-6 py-5">
                    <Link
                      href={`/teams/${tSlug}`}
                      className="flex items-center gap-3.5 group/teamlink"
                    >
                      <TeamLogo team={r.team} size="w-8 h-8" />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-white group-hover/teamlink:text-primary transition-colors flex items-center gap-1.5">
                          {r.team}
                          {isFirst && <CricFieldMascot team={r.team} mood="laughing" size={22} interactive />}
                        </span>
                        <span className="text-[9px] font-mono text-white/40 uppercase">
                          {teamShort(r.team)} · Franchise Hub ➔
                        </span>
                      </div>
                    </Link>
                  </td>

                  <td className="px-6 py-5 text-center font-bold text-white/60 tabular-nums">{r.played}</td>
                  <td className="px-6 py-5 text-center font-black text-emerald-400 tabular-nums">{r.wins}</td>
                  <td className="px-6 py-5 text-center font-black text-red-400 tabular-nums">{r.losses}</td>
                  <td className="px-6 py-5 text-center font-bold text-white/40 tabular-nums">{r.noResult}</td>
                  <td className={`px-6 py-5 text-center font-bold font-mono tabular-nums ${
                    (r.nrr ?? 0) >= 0 ? "text-emerald-300" : "text-white/40"
                  }`}>
                    {r.nrr == null ? "—" : (r.nrr > 0 ? "+" : "") + r.nrr.toFixed(3)}
                  </td>
                  <td className="px-6 py-5 text-center font-black text-primary text-[18px] tabular-nums">
                    {r.points}
                  </td>
                  <td className="px-6 py-5">
                    <Link
                      href={`/teams/${tSlug}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 text-[10px] font-black text-white/70 hover:text-white uppercase tracking-wider transition-all"
                    >
                      <span>Profile</span>
                      <ArrowUpRight className="w-3 h-3 text-primary" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   3. SQUADS & SHOP-STYLE COLLECTOR PLAYER CARDS VIEW
   ══════════════════════════════════════════════════════════════════════════ */

function SquadsListView({ season, playerImages }: { season: string; playerImages?: Record<string, string> }) {
  const squads = useSquadsBySeason();
  const bios = usePlayerBios();

  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const seasonSquads = squads.data?.[season];
  const teamNames = useMemo(
    () => (seasonSquads ? Object.keys(seasonSquads).sort() : []),
    [seasonSquads],
  );

  // Active single selected team
  const activeTeam = useMemo(() => {
    if (selectedTeamFilter && teamNames.includes(selectedTeamFilter)) {
      return selectedTeamFilter;
    }
    return teamNames[0] || "";
  }, [selectedTeamFilter, teamNames]);

  // Bios indexing by name variants and exact slug
  const bioIndex = useMemo(() => {
    const map = new Map<string, { bio: PlayerBio; slug: string }>();
    for (const [slug, bio] of Object.entries(bios.data ?? {})) {
      const keys = [
        slug,
        slug.replace(/-/g, " "),
        bio.playerName,
        bio.fullName,
        bio.playerName?.replace(/\./g, ""),
        bio.fullName?.replace(/\./g, ""),
      ];
      for (const key of keys) {
        if (!key) continue;
        const k = key.trim().toLowerCase();
        if (k && !map.has(k)) map.set(k, { bio, slug });
      }
    }
    return map;
  }, [bios.data]);

  const resolvePlayer = (p: SquadPlayer) => {
    const pName = p.name.trim().toLowerCase();
    const cName = (p.cricsheetName ?? "").trim().toLowerCase();
    const hit =
      bioIndex.get(pName) ??
      bioIndex.get(playerSlug(p.name)) ??
      bioIndex.get(cName) ??
      bioIndex.get(playerSlug(p.cricsheetName || "")) ??
      null;
    return {
      bio: hit?.bio ?? null,
      slug: hit?.slug || playerSlug(p.name || p.cricsheetName || ""),
    };
  };

  // Strictly show ONLY the single active filtered team
  const filteredTeams = useMemo(() => {
    return activeTeam ? [activeTeam] : [];
  }, [activeTeam]);

  if (squads.isLoading) {
    return (
      <div className="py-24 text-center text-white/40 font-black uppercase tracking-widest">
        Loading squad telemetry…
      </div>
    );
  }
  if (!seasonSquads || teamNames.length === 0) {
    return (
      <div className="py-24 text-center bg-[#0B1020]/60 rounded-3xl border border-white/5">
        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 font-black uppercase tracking-widest text-sm">
          No squad data available for {season}
        </p>
      </div>
    );
  }

  const activeTeamColor = teamColor(activeTeam);

  return (
    <div className="flex flex-col gap-6">
      {/* ─── SQUADS CONTROLS STRIP: TEAM SELECTION, ROLE FILTER & SEARCH ─── */}
      <div className="bg-[#0B1020]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, nationality, role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* View Mode Toggle: Collector Cards vs Roster List */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === "cards" ? "bg-primary text-black shadow-md" : "text-white/40 hover:text-white"
              }`}
              title="Luxury Collector Cards (Shop Synergy)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === "list" ? "bg-primary text-black shadow-md" : "text-white/40 hover:text-white"
              }`}
              title="Compact Squad Roster List"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Team Selector Pills Strip with Dynamic Franchise Logo & Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
          {teamNames.map(team => {
            const tColor = teamColor(team);
            const isSelected = activeTeam === team;
            return (
              <button
                key={team}
                onClick={() => setSelectedTeamFilter(team)}
                style={isSelected ? { backgroundColor: tColor, borderColor: tColor, color: "#000" } : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  isSelected
                    ? "font-black shadow-lg scale-105"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
                title={`View ${team} Official Squad`}
              >
                <TeamLogo team={team} size="w-4 h-4" />
                <span>{teamShort(team)}</span>
              </button>
            );
          })}
        </div>

        {/* Role Filter Tabs (Inspired by SRH Squad Page) */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pt-1 border-t border-white/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mr-1 hidden sm:inline">Role:</span>
          {[
            { id: "all", label: "All Players" },
            { id: "bat", label: "Batters" },
            { id: "allrounder", label: "All-Rounders" },
            { id: "bowl", label: "Bowlers" },
            { id: "wk", label: "Wicket-Keepers" },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                roleFilter === r.id
                  ? "bg-white/20 text-white border border-white/30 shadow-sm"
                  : "bg-white/[0.02] text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ACTIVE FRANCHISE SQUAD SHOWCASE ─── */}
      <div className="flex flex-col gap-10">
        {filteredTeams.map(team => {
          let players = seasonSquads[team] ?? [];
          
          // Role Filtering
          if (roleFilter !== "all") {
            players = players.filter(p => {
              const r = (p.role || "").toLowerCase();
              if (roleFilter === "bat") return r.includes("bat") && !r.includes("all");
              if (roleFilter === "allrounder") return r.includes("all");
              if (roleFilter === "bowl") return r.includes("bowl") && !r.includes("all");
              if (roleFilter === "wk") return r.includes("keeper") || r.includes("wk");
              return true;
            });
          }

          // Search Query Filtering
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            players = players.filter(p =>
              p.name.toLowerCase().includes(q) ||
              (p.cricsheetName && p.cricsheetName.toLowerCase().includes(q)) ||
              (p.role && p.role.toLowerCase().includes(q)) ||
              (p.country && p.country.toLowerCase().includes(q))
            );
          }

          const tSlug = teamSlug(team);
          const spendLakh = players.reduce((sum, p) => sum + (p.priceLakh ?? 0), 0);
          const spendUsd = players.reduce((sum, p) => sum + (p.priceUsd ?? 0), 0);
          const spendLabel = spendLakh > 0
            ? `₹${(spendLakh / 100).toFixed(2)} Cr`
            : spendUsd > 0
              ? `$${(spendUsd / 1_000_000).toFixed(2)}M`
              : "—";
          const overseas = players.filter(p => p.country && p.country !== "India").length;
          const retainedCount = players.filter(p => p.acquisition === "retained").length;

          return (
            <div key={team} className="flex flex-col gap-4">
              {/* Franchise Header Banner with Dynamic Team Identity */}
              <div
                className="relative rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${activeTeamColor}25 0%, #0B1020 50%, #070A14 100%)`,
                  boxShadow: `0 10px 40px -15px ${activeTeamColor}30`
                }}
              >
                {/* Ambient glowing radial aura behind logo */}
                <div
                  className="absolute -left-10 -top-10 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30"
                  style={{ backgroundColor: activeTeamColor }}
                />

                <div className="flex items-center gap-5 z-10">
                  <Link href={`/teams/${tSlug}`} className="group/logo hover:scale-105 transition-transform">
                    <div
                      className="p-2 rounded-2xl border"
                      style={{
                        backgroundColor: `${activeTeamColor}15`,
                        borderColor: `${activeTeamColor}40`,
                        boxShadow: `0 0 25px ${activeTeamColor}30`
                      }}
                    >
                      <TeamLogo team={team} size="w-14 h-14 md:w-16 md:h-16" />
                    </div>
                  </Link>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${activeTeamColor}20`,
                          borderColor: `${activeTeamColor}40`,
                          color: activeTeamColor
                        }}
                      >
                        {season} Official Squad
                      </span>
                      <span className="text-[10px] font-mono text-white/40">· {players.length} Players Listed</span>
                    </div>
                    <Link
                      href={`/teams/${tSlug}`}
                      className="text-xl md:text-2xl font-black uppercase text-white hover:text-white/80 transition-colors flex items-center gap-2 mt-1"
                    >
                      <span>{team}</span>
                      <ArrowUpRight className="w-5 h-5 opacity-70" style={{ color: activeTeamColor }} />
                    </Link>
                  </div>
                </div>

                {/* Team Financials & Quotas Telemetry Cluster */}
                <div className="flex items-center gap-3 z-10 flex-wrap">
                  <div className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-2xl text-right">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Squad Outlay</span>
                    <span className="text-sm md:text-base font-black text-cyan-300 font-mono">{spendLabel}</span>
                  </div>
                  <div className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-2xl text-right">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Overseas</span>
                    <span className="text-sm md:text-base font-black text-white font-mono">{overseas} slots</span>
                  </div>
                  {retainedCount > 0 && (
                    <div className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-2xl text-right hidden sm:block">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Retained</span>
                      <span className="text-sm md:text-base font-black text-emerald-400 font-mono">{retainedCount} Stars</span>
                    </div>
                  )}
                  <Link
                    href={`/teams/${tSlug}`}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-black uppercase tracking-wider text-white transition-all flex items-center gap-1.5"
                  >
                    <span>Franchise Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* View Mode 1: Luxury Shop-Style Collector Cards Grid */}
              {viewMode === "cards" ? (
                players.length === 0 ? (
                  <div className="py-16 text-center bg-[#0B1020]/60 rounded-3xl border border-white/5">
                    <Users className="w-10 h-10 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                      No players match the current role or search filter
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {players.map((p, idx) => {
                      const { bio, slug } = resolvePlayer(p);
                      const isOverseas = p.country && p.country !== "India";

                      return (
                        <div
                          key={p.name + idx}
                          className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 bg-gradient-to-b from-[#111728] via-[#0B0F1E] to-[#060812] shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                          style={{
                            boxShadow: `0 8px 25px -12px ${activeTeamColor}30`
                          }}
                        >
                          {/* Dynamic ambient franchise corner highlight */}
                          <div
                            className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity blur-2xl"
                            style={{ backgroundColor: activeTeamColor }}
                          />

                          {/* Top Card Strip: Index, Retained & Nationality */}
                          <div className="p-3 pb-1.5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-white/40 group-hover:text-white transition-colors">
                                #{String(idx + 1).padStart(2, "0")}
                              </span>
                              {p.acquisition === "retained" && (
                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1 py-0.5 rounded">
                                  ★ Retained
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isOverseas && (
                                <span className="text-[7px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1 py-0.5 rounded">
                                  ✈ {p.country}
                                </span>
                              )}
                              <TeamLogo team={team} size="w-4 h-4" />
                            </div>
                          </div>

                          {/* Center Athlete Showcase & Player Headshot */}
                          <div className="px-3 py-2 flex flex-col items-center text-center z-10">
                            <Link href={`/players/${slug}`} className="relative group/avatar cursor-pointer mb-2.5">
                              {/* Glowing halo behind avatar */}
                              <div
                                className="absolute inset-0 rounded-2xl opacity-20 group-hover/avatar:opacity-60 blur-md transition-opacity"
                                style={{ backgroundColor: activeTeamColor }}
                              />

                              {/* Headshot container */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 group-hover/avatar:border-white transition-all shadow-xl bg-black/60 relative">
                                <PlayerAvatar
                                  name={p.name}
                                  playerImages={playerImages}
                                  bio={bio}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Floating Role Badge */}
                              <div
                                className="absolute -bottom-2 inset-x-0 mx-auto w-fit px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider shadow-md border"
                                style={{
                                  backgroundColor: "#0B1020",
                                  borderColor: `${activeTeamColor}60`,
                                  color: activeTeamColor
                                }}
                              >
                                {p.role || bio?.role || "Player"}
                              </div>
                            </Link>

                            {/* Player Name */}
                            <Link
                              href={`/players/${slug}`}
                              className="text-xs sm:text-sm font-black text-white hover:text-primary transition-colors uppercase tracking-tight line-clamp-1 mt-1"
                              title={`Open ${p.name}'s Dossier`}
                            >
                              {p.name}
                            </Link>

                            {/* Playing Style Subtitle */}
                            <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider truncate max-w-full mt-0.5">
                              {[bio?.batStyle, bio?.bowlStyle].filter(Boolean).join(" · ") || (isOverseas ? p.country : "Domestic Core")}
                            </span>
                          </div>

                          {/* Bottom Card Footer: Price, Status & Actions */}
                          <div className="p-3 pt-2 bg-black/50 border-t border-white/5 z-10 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[8px]">
                              <div>
                                <span className="font-bold text-white/30 uppercase tracking-widest block text-[7px]">Fee</span>
                                <span className={`text-[11px] font-mono font-black ${p.priceDisplay ? "text-cyan-400" : "text-white/30"}`}>
                                  {p.priceDisplay ?? "—"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-white/30 uppercase tracking-widest block text-[7px]">Status</span>
                                <span className={`text-[9px] font-bold uppercase ${p.played ? "text-emerald-400" : "text-white/40"}`}>
                                  {p.played ? "Playing XI" : "Squad"}
                                </span>
                              </div>
                            </div>

                            {/* Direct Co-mapping Navigation Buttons */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              <Link
                                href={`/players/${slug}`}
                                className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 text-[8px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-0.5"
                              >
                                <span>Dossier</span>
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              </Link>
                              
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* View Mode 2: Compact Squad List with Direct Links */
                <div className="bg-[#0B1020] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  <div className="flex flex-col divide-y divide-white/5">
                    {players.map(p => {
                      const { bio, slug } = resolvePlayer(p);
                      return (
                        <div
                          key={p.name}
                          className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Link href={`/players/${slug}`}>
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/15 hover:border-white transition-colors cursor-pointer bg-black/50">
                                <PlayerAvatar
                                  name={p.name}
                                  playerImages={playerImages}
                                  bio={bio}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </Link>
                            <div className="flex flex-col min-w-0">
                              <Link
                                href={`/players/${slug}`}
                                className="text-[13px] font-black text-white hover:text-primary transition-colors truncate"
                              >
                                {p.name}
                              </Link>
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider truncate">
                                {[p.country, p.role, bio?.batStyle].filter(Boolean).join(" · ") || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {!p.played && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30 border border-white/10 rounded px-2 py-0.5">
                                Bench
                              </span>
                            )}
                            {p.acquisition === "retained" && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300 border border-emerald-400/20 bg-emerald-400/10 rounded px-2 py-0.5">
                                Retained
                              </span>
                            )}
                            <span className={`text-[12px] font-mono font-black tabular-nums ${p.priceDisplay ? "text-cyan-400" : "text-white/20"}`}>
                              {p.priceDisplay ?? "—"}
                            </span>
                            <Link
                              href={`/players/${slug}`}
                              className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-white/60 hover:text-white transition-colors"
                              title="Open Player Dossier"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
