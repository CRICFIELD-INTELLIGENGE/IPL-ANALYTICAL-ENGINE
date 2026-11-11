import React, { useState } from "react";
import { Search, Play, ExternalLink, Sparkles, AlertCircle, Tv, Film } from "lucide-react";
import { searchAndOpenClip, getClipRoute, CLIP_CATALOG, type ClipRouteResponse } from "@/lib/clip-router";

interface ClipSearchNavigatorProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function ClipSearchNavigator({ className = "", defaultExpanded = false }: ClipSearchNavigatorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClipRouteResponse | null>(null);
  const [searched, setSearched] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleSearch = async (overrideQuery?: string) => {
    const textToSearch = overrideQuery ?? query;
    if (!textToSearch.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const data = await getClipRoute(textToSearch);
      setResult(data);
    } catch (err) {
      console.error("Clip search error", err);
      setResult({ matched: false, clip_id: null, title: null, url: null });
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchClip = async (targetQuery?: string) => {
    const text = targetQuery ?? query;
    if (!text.trim()) return;
    setLoading(true);
    await searchAndOpenClip(text);
    setLoading(false);
  };

  const suggestions = [
    { label: "Kohli 75* in Final", q: "Kohli's 75* vs GT in Final" },
    { label: "Patidar 93* in Q1", q: "Patidar's 33-ball 93* vs GT in Qualifier 1" },
    { label: "Gill 104 in Q2", q: "Gill's 104 vs RR in Qualifier 2" },
    { label: "Sooryavanshi 97 (29b)", q: "Sooryavanshi's 29-ball 97 vs SRH in Eliminator" },
    { label: "Rasikh 3/27 Spell", q: "Rasikh's 3/27 vs GT in Final" },
    { label: "RCB Champions Highlights", q: "RCB vs GT: Highlights, Final" },
  ];

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#031536] via-[#051C47] to-[#082357] border border-[#2563EB]/40 shadow-xl space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#93C5FD]">
                AI VIDEO NAVIGATION ROUTER
              </span>
              <span className="text-[10px] text-white/30">•</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">JIOHOTSTAR CATALOG</span>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">
              Natural Language Clip Finder
            </h3>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isExpanded ? "Collapse Navigator" : "Quick Navigator"}
        </button>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false);
            }}
            placeholder="Search milestone, e.g. 'Kohli 75 in final' or 'Patidar 93 against GT'..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 focus:border-[#3B82F6] focus:outline-none text-xs text-white placeholder-white/30 font-sans"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{loading ? "Matching..." : "Match Clip"}</span>
        </button>
      </form>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] font-mono text-white/40 uppercase mr-1">Trending:</span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(s.q);
              handleSearch(s.q);
            }}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[10px] font-mono transition-all cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Result Card */}
      {searched && (
        <div className="pt-2">
          {result?.matched && result.url ? (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[8px] font-black uppercase tracking-wider">
                    EXACT MATCH IDENTIFIED
                  </span>
                  <span className="text-[10px] font-mono text-white/40">Clip ID: {result.clip_id}</span>
                </div>
                <h4 className="text-sm font-black text-white">{result.title}</h4>
                <p className="text-[11px] text-white/60">
                  Target destination verified in official JioHotstar IPL catalog.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLaunchClip(query)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Open Target Clip</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                No clip matched your description. Try querying a player name, milestone, or stage (e.g. "Gill 104 in Q2" or "RCB vs GT highlights").
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Catalog Drawer */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
            <span>INDEXED REPLAY CATALOG ({CLIP_CATALOG.length} CLIPS)</span>
            <span>OPEN TARGET IN JIOHOTSTAR</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CLIP_CATALOG.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-black/30 hover:bg-black/50 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white group-hover:text-[#60A5FA] transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                    {item.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i}>#{kw}</span>
                    ))}
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white transition-colors shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
