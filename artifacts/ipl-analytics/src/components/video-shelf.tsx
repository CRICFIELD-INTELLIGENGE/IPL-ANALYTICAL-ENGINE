import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Play, ExternalLink } from "lucide-react";
import { type VideoCatalogueItem } from "@/lib/video-registry";
import { VideoCard } from "@/components/video-card";

interface VideoShelfProps {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  videos: VideoCatalogueItem[];
  onOpenArchive?: (categoryOrTeam?: string) => void;
  className?: string;
}

export function VideoShelf({
  id,
  title,
  subtitle,
  badge,
  videos,
  onOpenArchive,
  className = "",
}: VideoShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const distance = direction === "left" ? -340 : 340;
    scrollRef.current.scrollBy({ left: distance, behavior: "smooth" });
  };

  if (!videos || videos.length === 0) return null;

  return (
    <section id={id} className={`w-full py-4 ${className}`}>
      {/* Shelf Header */}
      <div className="flex items-end justify-between mb-3 px-1 gap-4">
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

        {/* Carousel Controls & Optional Archive Trigger */}
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

      {/* Horizontal Carousel Track */}
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
