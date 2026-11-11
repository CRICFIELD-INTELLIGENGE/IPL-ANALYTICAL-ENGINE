import React, { useRef, useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  ChevronLeft, ChevronRight, Play, ExternalLink, Filter, 
  Sparkles, CheckCircle2, Clock, BarChart2, ShieldCheck, Film
} from "lucide-react";
import { type VideoCatalogueItem } from "@/lib/video-registry";
import { VideoCard, CricFieldVideoThumbnail } from "@/components/video-card";
import { paletteForCode, withAlpha } from "@/lib/team-palette";

interface VideoShelfProps {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  videos: VideoCatalogueItem[];
  onOpenArchive?: (categoryOrTeam?: string) => void;
  className?: string;
  layout?: "gallery" | "carousel";
  teamAccent?: string;
}

/** Standard editorial video categories per specifications */
const STANDARD_CATEGORIES = [
  "Match Highlights",
  "Batting",
  "Bowling",
  "Fielding",
  "Interviews",
  "Historic Moments"
] as const;

/** Resolves an item to one of the 6 standard user-specified categories */
function mapToStandardCategory(v: VideoCatalogueItem): string {
  const combined = `${v.videoType} ${v.beyondXiCategory} ${v.originalCategory} ${v.title} ${v.keywords?.join(" ") || ""}`.toLowerCase();
  
  if (combined.includes("interview") || combined.includes("press") || combined.includes("react") || combined.includes("conversation")) {
    return "Interviews";
  }
  if (combined.includes("bowling") || combined.includes("wicket") || combined.includes("spell") || combined.includes("yorker") || combined.includes("hat-trick")) {
    return "Bowling";
  }
  if (combined.includes("fielding") || combined.includes("catch") || combined.includes("run out") || combined.includes("stumping")) {
    return "Fielding";
  }
  if (combined.includes("batting") || combined.includes("runs") || combined.includes("ton") || combined.includes("century") || combined.includes("six") || combined.includes("knock") || combined.includes("innings")) {
    return "Batting";
  }
  if (combined.includes("historic") || combined.includes("archive") || combined.includes("classic") || (v.season && v.season < 2024)) {
    return "Historic Moments";
  }
  if (combined.includes("highlight") || combined.includes("recap") || combined.includes("replay") || combined.includes("final") || combined.includes("eliminator") || combined.includes("qualifier")) {
    return "Match Highlights";
  }
  return "Match Highlights";
}

export function VideoShelf({
  id,
  title,
  subtitle,
  badge,
  videos,
  onOpenArchive,
  className = "",
  layout = "gallery",
  teamAccent = "#A3E635"
}: VideoShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [displayCount, setDisplayCount] = useState<number>(6);

  // Group videos by category and compute counts
  const { categorizedVideos, availableCategories, featuredMarqueeVideo } = useMemo(() => {
    const map: Record<string, VideoCatalogueItem[]> = {
      All: videos
    };
    
    videos.forEach(v => {
      const cat = mapToStandardCategory(v);
      if (!map[cat]) map[cat] = [];
      map[cat].push(v);
    });

    // Available categories where sufficient verified videos exist (count > 0)
    const available = STANDARD_CATEGORIES.filter(cat => map[cat] && map[cat].length > 0);

    // Identify marquee featured video: prefer a verified final / major milestone / exact video
    const featured = videos.find(v => v.isExactVideoUrl && (v.matchStage?.includes("Final") || v.title.toLowerCase().includes("final")))
      || videos.find(v => v.isExactVideoUrl)
      || videos[0];

    return {
      categorizedVideos: map,
      availableCategories: available,
      featuredMarqueeVideo: featured
    };
  }, [videos]);

  const activeVideos = categorizedVideos[selectedCategory] || categorizedVideos.All || [];
  const [activeFeatured, setActiveFeatured] = useState<VideoCatalogueItem | null>(null);

  // Fallback to computed marquee featured video if activeFeatured is not set
  const currentFeatured = activeFeatured || featuredMarqueeVideo;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const distance = direction === "left" ? -340 : 340;
    scrollRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  if (!videos || videos.length === 0) return null;

  // ─────────────────────────────────────────────────────────────
  // CAROUSEL VIEW (for compact shelves)
  // ─────────────────────────────────────────────────────────────
  if (layout === "carousel") {
    return (
      <section id={id} className={`w-full py-4 ${className}`}>
        <div className="flex items-end justify-between mb-4 px-1 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  {badge}
                </span>
              )}
              <span className="text-xs font-mono text-slate-500">
                {videos.length} Videos
              </span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenArchive && (
              <button
                onClick={() => onOpenArchive(title)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <span>View All</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => scroll("left")}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-md"
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-md"
                title="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((video) => (
            <div
              key={video.id}
              className="w-[280px] sm:w-[320px] shrink-0 snap-start"
            >
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // REDESIGNED VIDEO GALLERY VIEW (Desktop 3-col, Tablet 2-col, Mobile 1-col)
  // ─────────────────────────────────────────────────────────────
  const visibleVideos = activeVideos.slice(0, displayCount);
  const primaryFeaturedTeam = currentFeatured?.teams[0] || "IPL";
  const featuredAccent = paletteForCode(primaryFeaturedTeam)?.accent || teamAccent;

  return (
    <section id={id} className={`w-full space-y-6 min-w-0 ${className}`}>
      
      {/* ── 1. GALLERY HEADER & STATS ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border"
              style={{
                backgroundColor: withAlpha(teamAccent, 0.15),
                borderColor: withAlpha(teamAccent, 0.4),
                color: teamAccent
              }}
            >
              Official Highlights Hub
            </span>
            <span className="text-xs font-mono text-slate-400">
              {activeVideos.length} {selectedCategory === "All" ? "verified entries" : selectedCategory.toLowerCase()}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        {onOpenArchive && (
          <button
            onClick={() => onOpenArchive(selectedCategory)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
          >
            <span>Browse Full Vault</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* ── 2. FEATURED VIDEO SHOWCASE (LARGE 16:9 MARQUEE) ── */}
      {currentFeatured && (
        <div 
          className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-[#0B152A] via-[#080D1A] to-[#04070E] p-4 sm:p-6 shadow-2xl overflow-hidden"
          style={{
            boxShadow: `0 12px 35px -10px ${withAlpha(featuredAccent, 0.2)}`
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div 
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: featuredAccent }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Featured 16:9 Large Thumbnail Stage (7 Cols) */}
            <div className="lg:col-span-7 w-full">
              <div className="relative group cursor-pointer" onClick={() => {
                if (currentFeatured.isExactVideoUrl && currentFeatured.officialVideoUrl) {
                  window.open(currentFeatured.officialVideoUrl, "_blank", "noopener,noreferrer");
                }
              }}>
                <CricFieldVideoThumbnail 
                  video={currentFeatured} 
                  className="rounded-xl shadow-xl border-white/20 group-hover:border-cyan-400/50 transition-all"
                />
              </div>
            </div>

            {/* Featured Metadata & Action Panel (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    className="px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase tracking-wider border"
                    style={{
                      backgroundColor: withAlpha(featuredAccent, 0.18),
                      borderColor: withAlpha(featuredAccent, 0.45),
                      color: featuredAccent
                    }}
                  >
                    FEATURED SPOTLIGHT
                  </span>
                  {currentFeatured.matchStage && (
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-white/10 text-white border border-white/15">
                      {currentFeatured.matchStage}
                    </span>
                  )}
                  {currentFeatured.season && (
                    <span className="text-[10px] font-mono text-white/50">
                      TATA IPL {currentFeatured.season}
                    </span>
                  )}
                </div>

                <h4 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {currentFeatured.title}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentFeatured.description || `Key match highlights featuring ${currentFeatured.teams.join(" vs ")} in the ${currentFeatured.season} tournament.`}
                </p>

                {currentFeatured.players.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-mono text-slate-400">Featured:</span>
                    {currentFeatured.players.map(p => (
                      <span key={p} className="text-[10px] text-white/90 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Prominent Watch on Provider Action */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
                {currentFeatured.isExactVideoUrl && currentFeatured.officialVideoUrl ? (
                  <a
                    href={currentFeatured.officialVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch on JioHotstar</span>
                    <ExternalLink className="w-3 h-3 opacity-90" />
                  </a>
                ) : (
                  <a
                    href={currentFeatured.destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-cyan-300 hover:text-white font-bold text-xs transition-all shadow-md active:scale-95"
                  >
                    <span>Browse Official Hub</span>
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                  </a>
                )}

                <Link
                  href={`/dugout/${primaryFeaturedTeam.toLowerCase()}`}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  title="Explore match and franchise telemetry"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Telemetry</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. CATEGORY FILTERS (NO EMPTY CATEGORIES) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => {
            setSelectedCategory("All");
            setDisplayCount(6);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "All"
              ? "bg-[#A3E635] text-slate-950 shadow-md shadow-lime-500/20"
              : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
          }`}
        >
          <span>All Highlights</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            selectedCategory === "All" ? "bg-slate-950/20 text-slate-950 font-black" : "bg-white/10 text-slate-400"
          }`}>
            {videos.length}
          </span>
        </button>

        {availableCategories.map((cat) => {
          const count = categorizedVideos[cat]?.length || 0;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setDisplayCount(6);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#A3E635] text-slate-950 shadow-md shadow-lime-500/20"
                  : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? "bg-slate-950/20 text-slate-950 font-black" : "bg-white/10 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. RESPONSIVE VIDEO GALLERY GRID (3 COLS DESKTOP, 2 COLS TABLET, 1 COL MOBILE) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleVideos.map((video) => (
          <VideoCard 
            key={video.id} 
            video={video}
            showExploreStats={true}
          />
        ))}
      </div>

      {/* ── 5. PAGINATION & VAULT CONTROLS ── */}
      {activeVideos.length > visibleVideos.length && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5">
          <button
            onClick={() => setDisplayCount(prev => Math.min(prev + 6, activeVideos.length))}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-all shadow-md hover:border-white/30 cursor-pointer active:scale-95"
          >
            Load More Videos ({activeVideos.length - visibleVideos.length} remaining)
          </button>

          {onOpenArchive && (
            <button
              onClick={() => onOpenArchive(selectedCategory)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-all cursor-pointer"
            >
              Open Full Archive Modal
            </button>
          )}
        </div>
      )}

    </section>
  );
}
