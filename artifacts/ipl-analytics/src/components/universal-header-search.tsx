import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, X, User, MapPin, Shield, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import {
  usePlayerBios,
  useVenues,
  usePlayerLatestTeams,
  playerSlug,
  displayPlayerName,
  COMMON_PLAYER_NAME_MAP,
  teamColor,
  teamShort,
} from "@/lib/aggregates";
import { TEAM_REGISTRY, type TeamCode } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { PlayerAvatar } from "@/components/player-avatar";

interface SearchResultItem {
  id: string;
  type: "player" | "venue" | "team";
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
  score: number;
  playerKey?: string;
  teamCode?: string;
  image?: string;
}

export function UniversalHeaderSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const playerBiosQuery = usePlayerBios();
  const venuesQuery = useVenues();
  const latestTeamsQuery = usePlayerLatestTeams();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute matched items
  const results = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (raw.length < 1) return { players: [], venues: [], teams: [], all: [] };

    // Helper for matching score
    const calcScore = (text: string): number => {
      const lower = text.toLowerCase();
      if (lower === raw) return 100;
      if (lower.startsWith(raw)) return 90;
      const words = lower.split(/[\s\-]+/);
      if (words.some((w) => w.startsWith(raw))) return 80;
      if (lower.includes(raw)) return 60;
      return 0;
    };

    // 1. MATCH TEAMS
    const teamHits: SearchResultItem[] = [];
    const teamEntries = Object.entries(TEAM_REGISTRY);
    for (const [code, info] of teamEntries) {
      const nameScore = Math.max(
        calcScore(info.name),
        calcScore(info.shortName),
        calcScore(code)
      );
      if (nameScore > 0) {
        teamHits.push({
          id: `team-${code}`,
          type: "team",
          title: info.name,
          subtitle: `${info.shortName} · Indian Premier League Franchise`,
          badge: code,
          url: `/dugout/${code.toLowerCase()}`,
          score: nameScore + 5, // slight boost for top franchises
          teamCode: code,
        });
      }
    }

    // 2. MATCH VENUES
    const venueHits: SearchResultItem[] = [];
    const venuesList = venuesQuery.data || [];
    for (const v of venuesList) {
      const vScore = Math.max(
        calcScore(v.venue),
        v.city ? calcScore(v.city) : 0
      );
      if (vScore > 0) {
        const slug = v.venue.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        venueHits.push({
          id: `venue-${v.venue}`,
          type: "venue",
          title: v.venue,
          subtitle: v.city ? `${v.city} · ${v.matches || 0} IPL matches recorded` : `${v.matches || 0} IPL matches`,
          badge: v.city || "Venue",
          url: `/venues/${slug}`,
          score: vScore,
        });
      }
    }

    // 3. MATCH PLAYERS
    const playerHits: SearchResultItem[] = [];
    const bios = playerBiosQuery.data || {};
    const latestTeams = latestTeamsQuery.data || {};

    // Also include common names
    const seenNames = new Set<string>();

    for (const [key, bio] of Object.entries(bios)) {
      const pName = bio.playerName || "";
      const fName = bio.fullName || "";
      const commonName = COMMON_PLAYER_NAME_MAP[pName] || "";

      const pScore = Math.max(
        calcScore(pName),
        calcScore(fName),
        calcScore(commonName),
        calcScore(key)
      );

      if (pScore > 0) {
        const canonical = commonName || fName || pName;
        const normKey = canonical.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seenNames.has(normKey)) continue;
        seenNames.add(normKey);

        const assignedTeam = latestTeams[pName] || latestTeams[fName] || latestTeams[canonical] || "";
        const role = bio.role || "IPL Player";
        const slug = playerSlug(canonical);

        playerHits.push({
          id: `player-${key}`,
          type: "player",
          title: canonical,
          subtitle: assignedTeam ? `${assignedTeam} · ${role}` : role,
          badge: assignedTeam ? teamShort(assignedTeam) : bio.country || undefined,
          url: `/players/${slug}`,
          score: pScore,
          playerKey: key,
          teamCode: assignedTeam ? teamShort(assignedTeam) : undefined,
          image: bio.image,
        });
      }
    }

    // Sort by relevance score
    teamHits.sort((a, b) => b.score - a.score);
    venueHits.sort((a, b) => b.score - a.score);
    playerHits.sort((a, b) => b.score - a.score);

    const limitedTeams = teamHits.slice(0, 3);
    const limitedVenues = venueHits.slice(0, 4);
    const limitedPlayers = playerHits.slice(0, 6);

    const all = [...limitedPlayers, ...limitedTeams, ...limitedVenues];

    return {
      players: limitedPlayers,
      venues: limitedVenues,
      teams: limitedTeams,
      all,
    };
  }, [query, playerBiosQuery.data, venuesQuery.data, latestTeamsQuery.data]);

  const handleSelect = (item: SearchResultItem) => {
    setLocation(item.url);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.all.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.all.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results.all[selectedIndex]) {
        handleSelect(results.all[selectedIndex]);
      } else if (query.trim()) {
        setLocation(`/scout/results?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const hasResults = results.players.length > 0 || results.teams.length > 0 || results.venues.length > 0;

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center w-48 lg:w-60 xl:w-72">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search players, venues, teams..."
          aria-label="Search players, venues, franchises"
          className="w-full h-8 pl-8 pr-7 rounded-full bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/90 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-cyan-500/70 focus:bg-white dark:focus:bg-slate-900/90 transition-all shadow-2xs font-medium"
        />
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-white/40 pointer-events-none" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Popup */}
      {isOpen && query.trim().length >= 1 && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-96 mt-2 rounded-2xl bg-[#090F1E]/95 dark:bg-[#060B16]/95 border border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[480px] overflow-y-auto scrollbar-thin">
          {!hasResults ? (
            <div className="p-4 text-center">
              <span className="text-xs text-white/50 block font-mono">No direct matches for &ldquo;{query}&rdquo;</span>
              <button
                type="button"
                onClick={() => {
                  setLocation(`/scout/results?q=${encodeURIComponent(query.trim())}`);
                  setIsOpen(false);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Search Scout Lab Database</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* PLAYERS SECTION */}
              {results.players.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[9px] font-mono font-black uppercase tracking-widest text-cyan-400/90">
                    <span className="flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      PLAYERS ({results.players.length})
                    </span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {results.players.map((item) => {
                      const idx = results.all.findIndex((a) => a.id === item.id);
                      const isHighlighted = selectedIndex === idx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isHighlighted
                              ? "bg-primary text-white shadow-sm"
                              : "hover:bg-white/[0.08] text-white/90"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              name={item.title}
                              size="w-7 h-7 text-[10px]"
                              className="shrink-0 rounded-full border border-white/10"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate text-white leading-tight">
                                {item.title}
                              </div>
                              <div className={`text-[10px] truncate ${isHighlighted ? "text-white/80" : "text-white/50"}`}>
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`shrink-0 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase border ${
                                isHighlighted
                                  ? "bg-white/20 text-white border-white/30"
                                  : "bg-white/5 text-cyan-300 border-white/10"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TEAMS / FRANCHISES SECTION */}
              {results.teams.length > 0 && (
                <div className="pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between px-2 py-1 text-[9px] font-mono font-black uppercase tracking-widest text-amber-400/90">
                    <span className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      FRANCHISES ({results.teams.length})
                    </span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {results.teams.map((item) => {
                      const idx = results.all.findIndex((a) => a.id === item.id);
                      const isHighlighted = selectedIndex === idx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isHighlighted
                              ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                              : "hover:bg-white/[0.08] text-white/90"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.teamCode ? (
                              <TeamLogo team={item.teamCode} size="w-6 h-6" className="shrink-0" />
                            ) : (
                              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate text-white leading-tight">
                                {item.title}
                              </div>
                              <div className={`text-[10px] truncate ${isHighlighted ? "text-slate-900" : "text-white/50"}`}>
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`shrink-0 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase border ${
                                isHighlighted
                                  ? "bg-black/20 text-slate-950 border-black/30"
                                  : "bg-white/5 text-amber-300 border-white/10"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VENUES & STADIUMS SECTION */}
              {results.venues.length > 0 && (
                <div className="pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between px-2 py-1 text-[9px] font-mono font-black uppercase tracking-widest text-emerald-400/90">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      VENUES &amp; STADIUMS ({results.venues.length})
                    </span>
                  </div>
                  <div className="space-y-1 mt-0.5">
                    {results.venues.map((item) => {
                      const idx = results.all.findIndex((a) => a.id === item.id);
                      const isHighlighted = selectedIndex === idx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isHighlighted
                              ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                              : "hover:bg-white/[0.08] text-white/90"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate text-white leading-tight">
                                {item.title}
                              </div>
                              <div className={`text-[10px] truncate ${isHighlighted ? "text-slate-900" : "text-white/50"}`}>
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`shrink-0 text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase border ${
                                isHighlighted
                                  ? "bg-black/20 text-slate-950 border-black/30"
                                  : "bg-white/5 text-emerald-300 border-white/10"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEARCH FOOTER */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/50 px-2 font-mono">
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3 text-cyan-400" />
                  Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white text-[9px]">Enter</kbd> to explore
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(`/scout/results?q=${encodeURIComponent(query.trim())}`);
                    setIsOpen(false);
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  All Scout Results &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
