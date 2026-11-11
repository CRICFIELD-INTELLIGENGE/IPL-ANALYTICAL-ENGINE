import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, X, Loader2, User, ExternalLink, ArrowRight } from "lucide-react";
import { searchScoutPlayers, type ScoutSearchResult } from "@/lib/scout-api";

interface ScoutSearchBarProps {
  onSearchSubmit?: (term: string) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
}

export function ScoutSearchBar({
  onSearchSubmit,
  initialValue = "",
  placeholder = "Search players across 6 global leagues (e.g., Virat, Bumrah, Atkinson)...",
  className = "",
}: ScoutSearchBarProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<ScoutSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await searchScoutPlayers(query.trim());
        setResults(matches);
        setIsOpen(true);
      } catch (err) {
        console.error("Scout search error:", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onSearchSubmit?.("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (onSearchSubmit) {
      onSearchSubmit(query.trim());
    } else if (results.length > 0) {
      setLocation(`/scout/player/${results[0].cricsheet_id}`);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-white/40">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {onSearchSubmit && (
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-[11px] font-bold transition-all border border-primary/30"
            >
              Filter
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#0F172A]/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40 border-b border-white/5 flex items-center justify-between">
            <span>Global Database Matches ({results.length})</span>
            <span className="text-[9px] font-normal lowercase opacity-80">click to inspect scouting profile</span>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {results.map((r) => (
              <Link
                key={r.player_key}
                href={`/scout/player/${r.cricsheet_id}`}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/10 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/60 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                      {r.unique_name || r.name}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 truncate">
                      {r.name !== r.unique_name && r.unique_name ? `${r.name} • ` : ""}ID: {r.cricsheet_id}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-[10px] text-white/40 group-hover:text-primary font-bold transition-colors">
                  <span>Profile</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {onSearchSubmit && query.trim() && (
            <div className="p-2 border-t border-white/5 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSearchSubmit(query.trim());
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
              >
                <span>Filter table rankings for "{query.trim()}"</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#0F172A]/95 backdrop-blur-xl border border-white/15 p-4 text-center z-50">
          <p className="text-xs text-white/60">No players found matching "{query}".</p>
          <p className="text-[10px] text-white/40 mt-1">Try searching by surname or check spelling.</p>
        </div>
      )}
    </div>
  );
}
