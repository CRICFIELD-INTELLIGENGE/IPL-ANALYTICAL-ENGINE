import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Trophy, 
  Sparkles,
  RotateCcw,
  Film,
  Tv,
  ArrowUpRight,
  BarChart2
} from "lucide-react";
import { Layout } from "@/components/layout";
import { fetchVideoCatalogue, fetchVideoStats, type VideoMetadata } from "@/lib/video-api";
import { PlayerAvatar } from "@/components/player-avatar";

const COMPETITIONS = [
  { id: "", label: "All Competitions" },
  { id: "ipl", label: "IPL" },
  { id: "smat", label: "SMAT" },
  { id: "bbl", label: "BBL" },
];

const CATEGORIES = [
  { id: "", label: "All Categories" },
  { id: "Highlights", label: "Match Highlights" },
  { id: "Top Knocks", label: "Centuries & Top Knocks" },
  { id: "Bowling", label: "Lethal Spells & Yorkers" },
  { id: "Finishes", label: "Thrilling Finishes" },
  { id: "Compilation", label: "Compilations" },
];

const PROVIDERS = [
  { id: "", label: "All Providers" },
  { id: "jiohotstar", label: "JioHotstar" },
  { id: "youtube", label: "YouTube" },
];

export default function WatchAndAnalyzePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedComp, setSelectedComp] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<any>("");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ["video-stats-summary"],
    queryFn: fetchVideoStats,
    staleTime: 60_000,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "video-catalogue-search",
      searchQuery,
      selectedComp,
      selectedCategory,
      selectedProvider,
      page,
    ],
    queryFn: () =>
      fetchVideoCatalogue({
        query: searchQuery || undefined,
        competition: selectedComp || undefined,
        category: selectedCategory || undefined,
        provider: selectedProvider || undefined,
        page,
        limit: 18,
      }),
    staleTime: 30_000,
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedComp("");
    setSelectedCategory("");
    setSelectedProvider("");
    setPage(1);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0B1118] text-[#F5F7F8] p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
        {/* Editorial Cinematic Hero */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#14212A] via-[#0B1118] to-[#14212A] border border-white/10 p-6 sm:p-10 shadow-2xl">
          {/* Subtle Abstract Pitch Lines Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="pitchGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#B8F36B" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#pitchGrid)" />
            </svg>
          </div>

          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#B8F36B]/15 text-[#B8F36B] border border-[#B8F36B]/30 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>CRICFIELD VIDEO INTELLIGENCE</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-[#4CC9C0] border border-white/10">
                100% Authorized External Links
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#F5F7F8] leading-tight">
              WATCH & ANALYZE
            </h1>

            <p className="font-body text-sm sm:text-base text-[#9BAAB5] max-w-2xl leading-relaxed">
              Discover official match highlights, lethal bowling spells, and historic tournament finishes.
              Seamlessly cross-referenced with CricField's deep ball-by-ball scorecards and true talent ratings.
            </p>

            {/* Quick Stats Pill Strip */}
            {stats && (
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#9BAAB5]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#B8F36B]" />
                  <span>Verified Catalogue: <strong className="text-[#F5F7F8]">{stats.totalVideos}</strong> videos</span>
                </div>
                <span>•</span>
                <div>
                  Match Link Rate: <strong className="text-[#4CC9C0]">{stats.matchResolutionRate}%</strong>
                </div>
                <span>•</span>
                <div>
                  Official Hubs: <strong className="text-[#F4B96C]">JioHotstar & YouTube</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Global Video Discovery Search & Filter Bar */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9BAAB5]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by player (e.g. Kohli, Bumrah), team (e.g. RCB vs GT), stage or milestone..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#14212A] border border-white/10 text-[#F5F7F8] placeholder-white/30 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#B8F36B]/60 shadow-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-3.5 rounded-2xl bg-[#14212A] border border-white/10 text-xs text-[#F5F7F8] font-mono focus:outline-none focus:border-[#B8F36B]/60"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0B1118]">
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-3.5 rounded-2xl bg-[#14212A] border border-white/10 text-xs text-[#F5F7F8] font-mono focus:outline-none focus:border-[#B8F36B]/60"
              >
                {PROVIDERS.map((prv) => (
                  <option key={prv.id} value={prv.id} className="bg-[#0B1118]">
                    {prv.label}
                  </option>
                ))}
              </select>

              {(searchQuery || selectedCategory || selectedProvider) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#9BAAB5] hover:text-[#F5F7F8] font-mono transition-all flex items-center gap-1.5"
                  title="Reset all search filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Legal & Compliance Safeguard Notice */}
        <div className="rounded-xl bg-[#14212A]/60 border border-white/5 p-3.5 flex items-start gap-3 text-xs text-[#9BAAB5] font-mono">
          <ShieldCheck className="w-4 h-4 text-[#B8F36B] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Authorized Redirection Notice:</strong> CricField is an independent analytical platform. We do not host, store, download, or proxy video streams. Clicking "Watch on Broadcaster" safely opens the official rights holder (JioHotstar / YouTube) in a new tab.
          </p>
        </div>

        {/* Video Catalogue Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-[#F5F7F8] flex items-center gap-2">
              <Film className="w-4 h-4 text-[#B8F36B]" />
              <span>OFFICIAL HIGHLIGHTS & ARCHIVE</span>
            </h2>
            {data && (
              <span className="text-xs font-mono text-[#9BAAB5]">
                Showing {data.videos.length} of {data.total} records
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#B8F36B] border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-[#9BAAB5]">
                Cross-referencing authorized match archives & entity mappings...
              </p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center space-y-3 p-6 font-mono text-xs rounded-2xl bg-[#14212A] border border-white/10">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-rose-400">Failed to load video catalogue.</p>
              <p className="text-[#9BAAB5]">{(error as any)?.message}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
              >
                Retry
              </button>
            </div>
          ) : data && data.videos.length === 0 ? (
            <div className="py-20 text-center space-y-3 p-8 font-mono rounded-2xl bg-[#14212A] border border-white/10">
              <Film className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-sm font-bold text-[#F5F7F8]">No video highlights found matching your query.</p>
              <p className="text-xs text-[#9BAAB5] max-w-sm mx-auto">
                Try searching for general terms like "Kohli", "Final", "Bumrah", or clearing active filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-[#B8F36B] text-[#0B1118] text-xs font-bold transition-all"
              >
                Clear All Filters
              </button>
            </div>
          ) : data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.videos.map((video: VideoMetadata) => {
                const isJioHotstar = video.provider === "jiohotstar";
                const isMatched = video.matchId != null && (video.matchConfidence ?? 0) >= 0.70;

                return (
                  <div
                    key={video.id}
                    className="rounded-2xl bg-[#14212A] border border-white/10 overflow-hidden flex flex-col justify-between hover:border-[#B8F36B]/40 transition-all shadow-xl group"
                  >
                    {/* Editorial Card Top Image / Abstract Graphic */}
                    <div className="relative h-44 bg-gradient-to-br from-[#1B2932] to-[#0B1118] p-4 flex flex-col justify-between border-b border-white/5 overflow-hidden">
                      {/* Glow Accent */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#B8F36B]/5 rounded-full blur-2xl group-hover:bg-[#B8F36B]/15 transition-all" />

                      <div className="flex items-center justify-between gap-2 z-10">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-[#0B1118]/80 text-[#B8F36B] border border-[#B8F36B]/30 backdrop-blur-sm">
                          {video.videoType}
                        </span>

                        <span className="text-[10px] font-mono text-[#9BAAB5] bg-[#0B1118]/80 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 backdrop-blur-sm">
                          <Clock className="w-3 h-3 text-[#4CC9C0]" />
                          <span>{video.duration || "4m"}</span>
                        </span>
                      </div>

                      {/* Teams & Players Graphic Preview */}
                      <div className="z-10 space-y-1">
                        <div className="flex flex-wrap gap-1.5">
                          {video.teams.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-[11px] border border-white/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {video.matchStage && (
                          <span className="text-[10px] font-mono font-bold text-[#F4B96C] uppercase tracking-wider block">
                            ★ {video.matchStage}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 font-mono">
                      <div className="space-y-2">
                        <h3 className="font-display text-base font-bold text-[#F5F7F8] group-hover:text-[#B8F36B] transition-colors line-clamp-2">
                          {video.title}
                        </h3>

                        <p className="font-body text-xs text-[#9BAAB5] line-clamp-2 leading-relaxed">
                          {video.description}
                        </p>

                        {/* Featured Players Strip */}
                        {video.players.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#4CC9C0] truncate">
                            <span className="text-white/40">ft.</span>
                            <span className="font-semibold">{video.players.join(", ")}</span>
                          </div>
                        )}
                      </div>

                      {/* Match Intelligence Connection Badge */}
                      <div className="pt-3 border-t border-white/5 space-y-2 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#9BAAB5]">Entity Match:</span>
                          {isMatched ? (
                            <span className="text-[#B8F36B] bg-[#B8F36B]/10 px-2 py-0.5 rounded border border-[#B8F36B]/20 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Match #{video.matchId} ({Math.round((video.matchConfidence ?? 0) * 100)}%)</span>
                            </span>
                          ) : (
                            <span className="text-[#9BAAB5] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              Tournament Compilation
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[#9BAAB5]">
                          <span>Broadcaster:</span>
                          <span className="text-white/80 font-bold">{video.attribution}</span>
                        </div>
                      </div>

                      {/* Actions: Watch on Broadcaster + View Match Scorecard */}
                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={video.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-[#B8F36B] hover:bg-[#a6e556] text-[#0B1118] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-[#0B1118]" />
                          <span>Watch on {isJioHotstar ? "JioHotstar" : "YouTube"}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>

                        {isMatched && video.matchId && (
                          <Link href={`/match/${video.matchId}`}>
                            <button
                              type="button"
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors"
                              title="Inspect match scorecard and ball-by-ball analysis"
                            >
                              <BarChart2 className="w-4 h-4" />
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Pagination Controls */}
          {data && data.totalPages > 1 && (
            <div className="p-4 rounded-2xl bg-[#14212A] border border-white/10 flex items-center justify-between font-mono text-xs">
              <span className="text-[#9BAAB5]">
                Page {data.page} of {data.totalPages}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white font-bold transition-all"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white font-bold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
