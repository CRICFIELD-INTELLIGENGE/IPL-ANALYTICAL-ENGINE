import { useLiveAllMatches, getMatchScoreLine, getMatchStateColor } from "@/lib/live";
import { useAnalyticsFilterStore } from "@/lib/store";
import { useState, useMemo, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { useTeamTheme, TEAM_REGISTRY } from "@/lib/team-context";
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
  ShoppingBag, CheckCircle2, ChevronRight, ChevronLeft, Zap, Target, BarChart2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const liveFeed = useLiveAllMatches();
  const liveMatches = (liveFeed.data?.matches ?? []).filter(match =>
    getMatchStateColor(match.matchInfo.state).label === "LIVE" && match.matchInfo.matchId !== 99999
  );
  const seasonMatches = useMemo(
    () => allMatches.data?.filter(m => m.season === selectedSeason) || [],
    [allMatches.data, selectedSeason]
  );
  const pointsTables = usePointsTables();
  const standings = pointsTables.data?.[selectedSeason] || [];
  const leaderTeam = standings[0]?.team;
  const leaderColor = leaderTeam ? teamColor(leaderTeam) : "#0ea5e9";
  const playerImages = usePlayerImages();

  const { selectedTeam } = useTeamTheme();
  const defaultFranchise = useMemo(() => {
    if (!selectedTeam || !TEAM_REGISTRY[selectedTeam]) return "all";
    return TEAM_REGISTRY[selectedTeam].name;
  }, [selectedTeam]);

  const [selectedFranchise, setSelectedFranchise] = useState<string>(defaultFranchise);
  useEffect(() => {
    setSelectedFranchise(defaultFranchise);
  }, [defaultFranchise]);

  const seasonFranchises = useMemo(() => {
    const set = new Set<string>();
    seasonMatches.forEach((m) => {
      if (m.team1) set.add(m.team1);
      if (m.team2) set.add(m.team2);
    });
    if (set.size > 0) return Array.from(set).sort();
    return Object.values(TEAM_REGISTRY).map((t) => t.name).sort();
  }, [seasonMatches]);

  const activeTeamCode = selectedFranchise !== "all" ? teamShort(selectedFranchise) : null;
  const activeTeamMeta = activeTeamCode ? TEAM_REGISTRY[activeTeamCode as keyof typeof TEAM_REGISTRY] : null;
  const topAccent = activeTeamMeta?.accent || (selectedFranchise !== "all" ? teamColor(selectedFranchise) : "#38BDF8");
  const topBanner = activeTeamMeta?.bannerImg || "/ipl-2027-banner.jpg";

  const seasonList = useMemo(() => seasons.data?.map(s => s.season) || [], [seasons.data]);
  const currentSeasonIndex = seasonList.indexOf(selectedSeason);
  const canPrevSeason = currentSeasonIndex > 0;
  const canNextSeason = currentSeasonIndex !== -1 && currentSeasonIndex < seasonList.length - 1;

  const prevSeason = () => {
    if (canPrevSeason) {
      filterStore.setFilter("season", seasonList[currentSeasonIndex - 1]);
    }
  };
  const nextSeason = () => {
    if (canNextSeason) {
      filterStore.setFilter("season", seasonList[currentSeasonIndex + 1]);
    }
  };

  const [stickyTop, setStickyTop] = useState(66);

  useEffect(() => {
    const navEl = document.querySelector<HTMLElement>(".cfm-top");
    if (!navEl) return;
    const syncTop = () => {
      const h = navEl.getBoundingClientRect().height;
      if (h > 0) setStickyTop(Math.round(h));
    };
    syncTop();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncTop) : null;
    ro?.observe(navEl);
    window.addEventListener("resize", syncTop);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncTop);
    };
  }, []);

  // Scroll to top only when changing seasons, never on tab switches
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [selectedSeason]);

  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white p-4 md:p-8 gap-4 lg:gap-6">

        {/* ─── MOBILE DUGOUT-STYLE STICKY TOP BOX (<1024px) ─── */}
        <header
          style={{ top: `${stickyTop}px` }}
          className="lg:hidden sticky z-30 -mx-4 -mt-4 overflow-hidden border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#030f17] shadow-md"
        >
          <img
            src={topBanner}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-15 dark:opacity-30 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/70 dark:from-[#030f17]/95 dark:via-[#030f17]/80 dark:to-[#030f17]/40 pointer-events-none"
          />
          <div className="relative z-10 flex items-center gap-3 px-4 py-3">
            <div
              className="w-[56px] h-[56px] rounded-full p-2 shrink-0 flex items-center justify-center bg-slate-100 dark:bg-[#070e1b]/90 shadow-inner"
              style={{ border: `2px solid ${topAccent}` }}
            >
              {selectedFranchise === "all" ? (
                <img
                  src="/ipl-logo-transparent.png"
                  alt="IPL Tournament Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <TeamLogo team={selectedFranchise} size="w-9 h-9" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <small
                className="block text-[9.5px] font-bold tracking-[0.09em] uppercase leading-tight truncate"
                style={{ color: topAccent }}
              >
                IPL {selectedSeason} · MATCH CENTER
              </small>
              <h1 className="text-[18px] font-extrabold leading-tight truncate mt-0.5 text-slate-900 dark:text-white">
                {selectedFranchise === "all" ? "All Franchises" : selectedFranchise}
              </h1>

              <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Choose franchise</span>
                  <select
                    aria-label="Choose franchise"
                    value={selectedFranchise}
                    onChange={(e) => setSelectedFranchise(e.target.value)}
                    className="w-full text-[11px] font-semibold bg-white/90 dark:bg-[#071321]/90 border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-900 dark:text-white outline-none truncate"
                  >
                    <option value="all" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                      All Franchises ({seasonMatches.length})
                    </option>
                    {seasonFranchises.map((team) => (
                      <option
                        key={team}
                        value={team}
                        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                      >
                        {team}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="shrink-0">
                  <span className="sr-only">Choose season</span>
                  <select
                    aria-label="Choose season"
                    value={selectedSeason}
                    onChange={(e) => filterStore.setFilter("season", e.target.value)}
                    className="text-[11px] font-bold font-mono bg-white/90 dark:bg-[#071321]/90 border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 text-slate-900 dark:text-white outline-none"
                  >
                    {[...seasonList].reverse().map((yr) => (
                      <option
                        key={yr}
                        value={yr}
                        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                      >
                        {yr}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-300/80 mt-1 truncate">
                Schedule · Standings · Squads · Match Center
              </p>
            </div>
          </div>
        </header>

        {/* ─── BROADCAST TELEMETRY & ARCHIVE FILTER BAR (Desktop >=1024px) ─── */}
        <div className="hidden lg:flex bg-white/95 dark:bg-[#0B1020]/90 rounded-[28px] border border-slate-200 dark:border-white/10 p-6 flex-col lg:flex-row items-center justify-between gap-6 shadow-sm dark:shadow-2xl relative z-10 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center shrink-0 group">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center p-1.5 shadow-inner">
                <img
                  src="/ipl-logo-transparent.png"
                  alt="IPL Tournament Logo"
                  className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest franchise-eyebrow flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> OFFICIAL TOURNAMENT ARCHIVE
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-white/40">2008–2026</span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  IPL {selectedSeason} MATCH CENTER &amp; SQUADS
                </h1>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={prevSeason}
                    disabled={!canPrevSeason}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white disabled:opacity-20 cursor-pointer transition-colors"
                    title="Previous Season"
                    aria-label="Previous IPL Season"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 py-0.5 text-xs font-mono font-black text-slate-900 dark:text-white">
                    IPL {selectedSeason}
                  </span>
                  <button
                    type="button"
                    onClick={nextSeason}
                    disabled={!canNextSeason}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white disabled:opacity-20 cursor-pointer transition-colors"
                    title="Next Season"
                    aria-label="Next IPL Season"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Season Selector Pills: 2026, 2025, 2024 + Historical Archive */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {["2026", "2025", "2024"].map((yr) => (
              <button 
                key={yr}
                onClick={() => filterStore.setFilter("season", yr)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedSeason === yr 
                    ? 'bg-primary text-white font-black shadow-lg shadow-primary/25 scale-105 border border-primary/40' 
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10'
                }`}
              >
                {yr}
              </button>
            ))}
            <div className="relative">
              <select
                value={["2026", "2025", "2024"].includes(selectedSeason) ? "" : selectedSeason}
                onChange={(e) => {
                  if (e.target.value) filterStore.setFilter("season", e.target.value);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 outline-none ${
                  !["2026", "2025", "2024"].includes(selectedSeason) ? "border-primary text-primary font-black" : ""
                }`}
                title="Select Archive Season (2008–2023)"
                aria-label="Historical Season Archive"
              >
                <option value="" disabled className="bg-slate-900 text-white">
                  {!["2026", "2025", "2024"].includes(selectedSeason) ? `Archive: ${selectedSeason}` : "Archive (2008–23)"}
                </option>
                {seasons.data?.slice().reverse().filter(s => !["2026", "2025", "2024"].includes(s.season)).map(s => (
                  <option key={s.season} value={s.season} className="bg-slate-900 text-white">
                    {s.season} Season
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── TOURNAMENT TELEMETRY STRIP ─── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white dark:bg-[#0B1020]/80 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 shadow-sm min-w-0">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[8.5px] sm:text-[9px] font-extrabold sm:font-black uppercase tracking-normal sm:tracking-widest text-slate-500 dark:text-white/50 block truncate">Season Fixtures</span>
              <span className="text-[13px] sm:text-base font-black text-slate-900 dark:text-white block truncate leading-tight mt-0.5">{seasonMatches.length} Matches</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B1020]/80 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 shadow-sm min-w-0">
            <div
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{
                backgroundColor: `${leaderColor}20`,
                borderColor: `${leaderColor}40`,
                borderWidth: 1,
                color: leaderColor,
              }}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[8.5px] sm:text-[9px] font-extrabold sm:font-black uppercase tracking-normal sm:tracking-widest text-slate-500 dark:text-white/50 block truncate">Table Leader</span>
              <span
                className="text-[13px] sm:text-base font-black truncate block leading-tight mt-0.5"
                style={{ color: leaderColor }}
              >
                {leaderTeam ? teamShort(leaderTeam) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B1020]/80 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 shadow-sm min-w-0">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[8.5px] sm:text-[9px] font-extrabold sm:font-black uppercase tracking-normal sm:tracking-widest text-slate-500 dark:text-white/50 block truncate">Franchises</span>
              <span className="text-[13px] sm:text-base font-black text-slate-900 dark:text-white block truncate leading-tight mt-0.5">{standings.length || 10} Teams</span>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="grid grid-cols-[1.06fr_1.14fr_0.8fr] sm:inline-flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-white/[0.03] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 w-full sm:w-fit">
          {[
            { id: "schedule", label: "Schedule & Results", shortLabel: "Schedule", icon: Calendar, count: seasonMatches.length },
            { id: "points", label: "Points Standings", shortLabel: "Standings", icon: Trophy, count: standings.length },
            { id: "squad", label: "Squads & Player Cards", shortLabel: "Squads", icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 sm:px-5 sm:py-2.5 min-h-[38px] sm:min-h-0 rounded-lg sm:rounded-xl whitespace-nowrap min-w-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40'
                  : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden text-[11px] font-bold tracking-normal leading-none">{tab.shortLabel}</span>
              <span className="hidden sm:inline text-[11px] font-black uppercase tracking-wider leading-none">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[9.5px] sm:text-[9px] font-bold sm:font-black px-1.5 py-0.5 leading-none rounded-md shrink-0 ${activeTab === tab.id ? 'bg-black/30 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/60'}`}>
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
          {activeTab === "schedule" && liveMatches.length > 0 && (
            <section aria-label="Live matches" className="mb-6 rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <h2 className="mb-3 text-sm font-bold">Live matches</h2>
              {liveMatches.map(match => {
                const { matchInfo: info } = match;
                const score = getMatchScoreLine(match);
                return (
                  <div key={info.matchId} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 py-3">
                    <div>
                      <p className="font-semibold">{info.team1.teamSName} {score.team1} · {info.team2.teamSName} {score.team2}</p>
                      <p className="text-xs opacity-70">{info.status}</p>
                    </div>
                    <div className="flex gap-4 text-sm font-semibold text-primary">
                      <Link href={`/match/${info.matchId}?tab=scorecard`}>Scorecard</Link>
                      <Link href={`/match/${info.matchId}?tab=commentary`}>Commentary</Link>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
          {activeTab === "schedule" && (
            <ScheduleView
              season={selectedSeason}
              matches={seasonMatches}
              selectedFranchise={selectedFranchise}
              onSelectFranchise={setSelectedFranchise}
            />
          )}
          {activeTab === "points" && <PointsView season={selectedSeason} standings={standings} />}
          {activeTab === "squad" && (
            <SquadsListView
              season={selectedSeason}
              playerImages={playerImages.data}
              selectedFranchise={selectedFranchise}
            />
          )}
        </motion.div>

        {/* Native Ad Vessel - Match Day Telemetry Sponsor */}
        <div className="pt-2">
                  </div>
      </div>
    </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   1. SCHEDULE VIEW — SUNRISERS HYDERABAD STYLE TICKET-STUB FIXTURES
   ══════════════════════════════════════════════════════════════════════════ */

function getContrastTextColor(hex: string): string {
  const c = (hex || "").replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}

function ScheduleView({
  season,
  matches,
  selectedFranchise,
  onSelectFranchise,
}: {
  season: string;
  matches: MatchSummary[];
  selectedFranchise: string;
  onSelectFranchise: (team: string) => void;
}) {
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
      <div className="py-24 text-center bg-white dark:bg-[#0B1020]/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
        <Trophy className="w-12 h-12 text-slate-400 dark:text-white/20 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-white/40 font-black uppercase tracking-widest text-sm">
          No matches found for {season} season
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── FIXTURES CONTROL STRIP (SRH INSPIRED FRANCHISE FILTER & SEARCH) ─── */}
      <div className="bg-white/95 dark:bg-[#0B1020]/90 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 p-2.5 sm:p-4 flex flex-col gap-2.5 sm:gap-4 shadow-sm dark:shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fixture, team, venue, match #…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Status Filter Toggle */}
          <div className="grid grid-cols-[1.16fr_0.9fr_0.94fr] md:flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0 w-full md:w-auto">
            {(["all", "completed", "upcoming"] as const).map(st => (
              <button
                key={st}
                onClick={() => setMatchStatusFilter(st)}
                className={`px-2 sm:px-3 py-2 sm:py-1.5 min-h-[34px] sm:min-h-0 rounded-lg transition-all flex items-center justify-center whitespace-nowrap ${
                  matchStatusFilter === st
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 border border-blue-400/30"
                    : "text-slate-500 dark:text-white/55 hover:text-slate-900 dark:hover:text-white border border-transparent"
                }`}
              >
                <span className="text-[11px] sm:text-[10px] font-bold sm:font-black sm:uppercase tracking-normal sm:tracking-wider leading-none">
                  {st === "all" ? "All Fixtures" : st === "completed" ? "Results" : "Upcoming"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Franchise Filter Pills Strip (Desktop >=1024px; mobile uses sticky top box dropdown) */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
          <button
            onClick={() => onSelectFranchise("all")}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
              selectedFranchise === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white dark:text-slate-950 dark:border-white font-black forced-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>All Franchises ({matches.length})</span>
          </button>

          {franchises.filter(Boolean).map(team => {
            const tColor = teamColor(team);
            const isSelected = selectedFranchise === team;
            const contrastText = getContrastTextColor(tColor);
            return (
              <button
                key={team}
                onClick={() => onSelectFranchise(team)}
                style={
                  isSelected
                    ? {
                        backgroundColor: tColor,
                        borderColor: tColor,
                        color: contrastText,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isSelected
                    ? "font-black shadow-md scale-[1.03] forced-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10"
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
      <div className="py-24 text-center bg-white dark:bg-[#0B1020]/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
        <Trophy className="w-12 h-12 text-slate-400 dark:text-white/20 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-white/40 font-black uppercase tracking-widest text-sm">
          No standings available for {season}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0B1020] rounded-[32px] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl">
      <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 flex items-center justify-center text-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black uppercase tracking-widest text-[14px] text-slate-900 dark:text-white block">
              {season} League Stage Standings
            </span>
            <span className="text-[10px] text-slate-500 dark:text-white/40 font-mono">
              Top 4 franchises qualify for the Playoff Qualifier &amp; Eliminator rounds
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Qualified
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
            <tr>
              {["Pos", "Franchise", "P", "W", "L", "NR", "NRR", "Pts", "Dossier"].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${
                    h === "Pts" ? "text-primary" : "text-slate-500 dark:text-white/40"
                  } ${i >= 2 && i <= 7 ? "text-center" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {standings.map(r => {
              const tSlug = teamSlug(r.team);
              const isFirst = r.position === 1;

              return (
                <tr
                  key={r.team}
                  className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors group ${
                    r.qualified ? "bg-emerald-50/50 dark:bg-emerald-400/[0.03]" : ""
                  }`}
                >
                  {/* Position */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-black ${isFirst ? 'text-primary' : 'text-slate-700 dark:text-white/60'}`}>
                        {r.position}
                      </span>
                      {r.qualified && (
                        <span className="w-1.5 h-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
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
                        <span className="text-[13px] font-black text-slate-900 dark:text-white group-hover/teamlink:text-primary transition-colors flex items-center gap-1.5">
                          {r.team}
                          {isFirst && <CricFieldMascot team={r.team} mood="laughing" size={22} interactive />}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-white/40 uppercase">
                          {teamShort(r.team)} · Franchise Hub ➔
                        </span>
                      </div>
                    </Link>
                  </td>

                  <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-white/60 tabular-nums">{r.played}</td>
                  <td className="px-6 py-5 text-center font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{r.wins}</td>
                  <td className="px-6 py-5 text-center font-black text-rose-600 dark:text-red-400 tabular-nums">{r.losses}</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-400 dark:text-white/40 tabular-nums">{r.noResult}</td>
                  <td className={`px-6 py-5 text-center font-bold font-mono tabular-nums ${
                    (r.nrr ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400 dark:text-white/40"
                  }`}>
                    {r.nrr == null ? "—" : (r.nrr > 0 ? "+" : "") + r.nrr.toFixed(3)}
                  </td>
                  <td className="px-6 py-5 text-center font-black text-primary text-[18px] tabular-nums">
                    {r.points}
                  </td>
                  <td className="px-6 py-5">
                    <Link
                      href={`/teams/${tSlug}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-primary/20 dark:text-white/70 dark:hover:text-white border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider transition-all"
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

function SquadsListView({
  season,
  playerImages,
  selectedFranchise,
}: {
  season: string;
  playerImages?: Record<string, string>;
  selectedFranchise?: string;
}) {
  const squads = useSquadsBySeason();
  const bios = usePlayerBios();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { selectedTeam } = useTeamTheme();

  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const seasonSquads = squads.data?.[season];
  const teamNames = useMemo(
    () => (seasonSquads ? Object.keys(seasonSquads).sort() : []),
    [seasonSquads],
  );

  // Sync with sticky header / master team dropdown when it changes
  useEffect(() => {
    if (selectedFranchise && selectedFranchise !== "all" && teamNames.includes(selectedFranchise)) {
      setSelectedTeamFilter(selectedFranchise);
      return;
    }
    if (selectedTeam && TEAM_REGISTRY[selectedTeam]) {
      const masterName = TEAM_REGISTRY[selectedTeam].name;
      if (teamNames.includes(masterName)) {
        setSelectedTeamFilter(masterName);
        return;
      }
    }
    setSelectedTeamFilter("");
  }, [selectedFranchise, selectedTeam, teamNames]);

  // Active single selected team
  const activeTeam = useMemo(() => {
    if (selectedTeamFilter && teamNames.includes(selectedTeamFilter)) {
      return selectedTeamFilter;
    }
    if (selectedTeam && TEAM_REGISTRY[selectedTeam] && teamNames.includes(TEAM_REGISTRY[selectedTeam].name)) {
      return TEAM_REGISTRY[selectedTeam].name;
    }
    return teamNames[0] || "";
  }, [selectedTeamFilter, selectedTeam, teamNames]);

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
      <div className="py-24 text-center bg-white dark:bg-[#0B1020]/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
        <Users className="w-12 h-12 text-slate-400 dark:text-white/20 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-500 dark:text-white/40 font-black uppercase tracking-widest text-sm">
          Loading {season} Squad Profiles…
        </p>
      </div>
    );
  }
  if (!seasonSquads || teamNames.length === 0) {
    return (
      <div className="py-24 text-center bg-white dark:bg-[#0B1020]/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
        <Users className="w-12 h-12 text-slate-400 dark:text-white/20 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-white/40 font-black uppercase tracking-widest text-sm">
          No squad data available for {season}
        </p>
      </div>
    );
  }

  const activeTeamColor = teamColor(activeTeam);

  return (
    <div className="flex flex-col gap-6">
      {/* ─── SQUADS CONTROLS STRIP: TEAM SELECTION, ROLE FILTER & SEARCH ─── */}
      <div className="bg-white/95 dark:bg-[#0B1020]/90 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-4 shadow-sm dark:shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, nationality, role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* View Mode Toggle: Collector Cards vs Roster List */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === "cards" ? "bg-primary text-white shadow-md font-black" : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"
              }`}
              title="Luxury Collector Cards (Shop Synergy)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === "list" ? "bg-primary text-white shadow-md font-black" : "text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"
              }`}
              title="Compact Squad Roster List"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Team Selector Pills Strip (Desktop >=1024px; mobile uses top box dropdown) */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 no-scrollbar">
          {teamNames.filter(Boolean).map(team => {
            const tColor = teamColor(team);
            const isSelected = activeTeam === team;
            const contrastText = getContrastTextColor(tColor);
            return (
              <button
                key={team}
                onClick={() => setSelectedTeamFilter(team)}
                style={
                  isSelected
                    ? {
                        backgroundColor: tColor,
                        borderColor: tColor,
                        color: contrastText,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isSelected
                    ? "font-black shadow-md scale-[1.03] forced-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10"
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
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pt-1 border-t border-slate-200 dark:border-white/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 mr-1 hidden sm:inline">Role:</span>
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
                  ? "bg-slate-900 text-white dark:bg-white/20 dark:text-white border border-slate-900 dark:border-white/30 shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/[0.02] dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5 border border-slate-200/60 dark:border-transparent"
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
                className="relative rounded-3xl border border-slate-200 dark:border-white/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm dark:shadow-2xl overflow-hidden"
                style={{
                  background: isDark
                    ? `linear-gradient(135deg, ${activeTeamColor}25 0%, #0B1020 50%, #070A14 100%)`
                    : `linear-gradient(135deg, ${activeTeamColor}18 0%, #FFFFFF 50%, #F8FAFC 100%)`,
                  boxShadow: isDark
                    ? `0 10px 40px -15px ${activeTeamColor}30`
                    : `0 8px 30px -10px ${activeTeamColor}25, 0 1px 3px rgba(0,0,0,0.05)`
                }}
              >
                {/* Ambient glowing radial aura behind logo */}
                <div
                  className="absolute -left-10 -top-10 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-20 dark:opacity-30"
                  style={{ backgroundColor: activeTeamColor }}
                />

                <div className="flex items-center gap-5 z-10">
                  <Link href={`/teams/${tSlug}`} className="group/logo hover:scale-105 transition-transform">
                    <div
                      className="p-2.5 rounded-2xl border bg-white/80 dark:bg-transparent"
                      style={{
                        backgroundColor: isDark ? `${activeTeamColor}15` : undefined,
                        borderColor: isDark ? `${activeTeamColor}40` : `${activeTeamColor}30`,
                        boxShadow: `0 0 25px ${activeTeamColor}25`
                      }}
                    >
                      <TeamLogo team={team} size="w-14 h-14 md:w-16 md:h-16" />
                    </div>
                  </Link>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: isDark ? `${activeTeamColor}20` : `${activeTeamColor}15`,
                          borderColor: isDark ? `${activeTeamColor}40` : `${activeTeamColor}30`,
                          color: isDark ? activeTeamColor : '#0f172a'
                        }}
                      >
                        {season} Official Squad
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-white/40">· {players.length} Players Listed</span>
                    </div>
                    <Link
                      href={`/teams/${tSlug}`}
                      className="text-xl md:text-2xl font-black uppercase text-slate-900 dark:text-white hover:opacity-80 transition-opacity flex items-center gap-2 mt-1"
                    >
                      <span className="text-slate-900 dark:text-white">{team}</span>
                      <ArrowUpRight className="w-5 h-5 opacity-70" style={{ color: activeTeamColor }} />
                    </Link>
                  </div>
                </div>

                {/* Team Financials & Quotas Telemetry Cluster */}
                <div className="flex items-center gap-3 z-10 flex-wrap">
                  <div className="bg-slate-50/90 dark:bg-black/50 border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-right shadow-2xs">
                    <span className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest block">Squad Outlay</span>
                    <span className="text-sm md:text-base font-black text-indigo-600 dark:text-cyan-300 font-mono">{spendLabel}</span>
                  </div>
                  <div className="bg-slate-50/90 dark:bg-black/50 border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-right shadow-2xs">
                    <span className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest block">Overseas</span>
                    <span className="text-sm md:text-base font-black text-slate-800 dark:text-white font-mono">{overseas} slots</span>
                  </div>
                  {retainedCount > 0 && (
                    <div className="bg-slate-50/90 dark:bg-black/50 border border-slate-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-right hidden sm:block shadow-2xs">
                      <span className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest block">Retained</span>
                      <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{retainedCount} Stars</span>
                    </div>
                  )}
                  <Link
                    href={`/teams/${tSlug}`}
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Franchise Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* View Mode 1: Luxury Shop-Style Collector Cards Grid */}
              {viewMode === "cards" ? (
                players.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-[#0B1020]/60 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <Users className="w-10 h-10 text-slate-400 dark:text-white/20 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest text-xs">
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
                          className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/30 bg-white dark:bg-gradient-to-b dark:from-[#111728] dark:via-[#0B0F1E] dark:to-[#060812] shadow-sm hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                          style={{
                            boxShadow: isDark
                              ? `0 8px 25px -12px ${activeTeamColor}30`
                              : `0 4px 20px -8px ${activeTeamColor}20, 0 1px 3px rgba(0,0,0,0.04)`
                          }}
                        >
                          {/* Dynamic ambient franchise corner highlight */}
                          <div
                            className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-10 dark:opacity-20 group-hover:opacity-25 dark:group-hover:opacity-40 transition-opacity blur-2xl"
                            style={{ backgroundColor: activeTeamColor }}
                          />

                          {/* Top Card Strip: Index, Retained & Nationality */}
                          <div className="p-3 pb-1.5 flex items-center justify-between z-10">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-white/40 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                #{String(idx + 1).padStart(2, "0")}
                              </span>
                              {p.acquisition === "retained" && (
                                <span className="text-[7px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-1 py-0.5 rounded">
                                  ★ Retained
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isOverseas && (
                                <span className="text-[7px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/30 px-1 py-0.5 rounded">
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
                                className="absolute inset-0 rounded-2xl opacity-15 dark:opacity-20 group-hover/avatar:opacity-40 dark:group-hover/avatar:opacity-60 blur-md transition-opacity"
                                style={{ backgroundColor: activeTeamColor }}
                              />

                              {/* Headshot container */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/20 group-hover/avatar:border-primary dark:group-hover/avatar:border-white transition-all shadow-sm dark:shadow-xl bg-slate-100 dark:bg-black/60 relative">
                                <PlayerAvatar
                                  name={p.name}
                                  playerImages={playerImages}
                                  bio={bio}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Floating Role Badge */}
                              <div
                                className="absolute -bottom-2 inset-x-0 mx-auto w-fit px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider shadow-xs border"
                                style={{
                                  backgroundColor: isDark ? "#0B1020" : "#FFFFFF",
                                  borderColor: isDark ? `${activeTeamColor}60` : `${activeTeamColor}40`,
                                  color: isDark ? activeTeamColor : '#0f172a'
                                }}
                              >
                                {p.role || bio?.role || "Player"}
                              </div>
                            </Link>

                            {/* Player Name */}
                            <Link
                              href={`/players/${slug}`}
                              className="text-xs sm:text-sm font-black text-slate-900 dark:text-white hover:text-primary transition-colors uppercase tracking-tight line-clamp-1 mt-1"
                              title={`Open ${p.name}'s Dossier`}
                            >
                              <span className="text-slate-900 dark:text-white">{p.name}</span>
                            </Link>

                            {/* Playing Style Subtitle */}
                            <span className="text-[8px] font-mono text-slate-500 dark:text-white/40 uppercase tracking-wider truncate max-w-full mt-0.5">
                              {[bio?.batStyle, bio?.bowlStyle].filter(Boolean).join(" · ") || (isOverseas ? p.country : "Domestic Core")}
                            </span>
                          </div>

                          {/* Bottom Card Footer: Price, Status & Actions */}
                          <div className="p-3 pt-2 bg-slate-50 dark:bg-black/50 border-t border-slate-100 dark:border-white/5 z-10 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[8px]">
                              <div>
                                <span className="font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest block text-[7px]">Fee</span>
                                <span className={`text-[11px] font-mono font-black ${p.priceDisplay ? "text-indigo-600 dark:text-cyan-400" : "text-slate-400 dark:text-white/30"}`}>
                                  {p.priceDisplay ?? "—"}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest block text-[7px]">Status</span>
                                <span className={`text-[9px] font-bold uppercase ${p.played ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/40"}`}>
                                  {p.played ? "Playing XI" : "Squad"}
                                </span>
                              </div>
                            </div>

                            {/* Direct Co-mapping Navigation Buttons */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              <Link
                                href={`/players/${slug}`}
                                className="py-1 px-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white/80 dark:hover:text-white dark:border-white/10 text-[8px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-0.5 shadow-2xs"
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
                <div className="bg-white dark:bg-[#0B1020] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl">
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                    {players.map(p => {
                      const { bio, slug } = resolvePlayer(p);
                      return (
                        <div
                          key={p.name}
                          className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Link href={`/players/${slug}`}>
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/15 hover:border-primary dark:hover:border-white transition-colors cursor-pointer bg-slate-100 dark:bg-black/50">
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
                                className="text-[13px] font-black text-slate-900 dark:text-white hover:text-primary transition-colors truncate"
                              >
                                {p.name}
                              </Link>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider truncate">
                                {[p.country, p.role, bio?.batStyle].filter(Boolean).join(" · ") || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {!p.played && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-transparent rounded px-2 py-0.5">
                                Bench
                              </span>
                            )}
                            {p.acquisition === "retained" && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/20 bg-emerald-50 dark:bg-emerald-400/10 rounded px-2 py-0.5">
                                Retained
                              </span>
                            )}
                            <span className={`text-[12px] font-mono font-black tabular-nums ${p.priceDisplay ? "text-indigo-600 dark:text-cyan-400" : "text-slate-400 dark:text-white/20"}`}>
                              {p.priceDisplay ?? "—"}
                            </span>
                            <Link
                              href={`/players/${slug}`}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-primary/20 dark:text-white/60 dark:hover:text-white transition-colors"
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
