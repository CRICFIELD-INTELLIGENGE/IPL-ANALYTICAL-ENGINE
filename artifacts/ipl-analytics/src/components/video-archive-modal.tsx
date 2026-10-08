import React, { useState, useMemo } from "react";
import { 
  X, Search, Filter, Play, ExternalLink, Shield, 
  Sparkles, CheckCircle2, RotateCcw 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllVideos, type VideoCatalogueItem, OFFICIAL_IPL_2026_HUB } from "@/lib/video-registry";
import { VideoCard } from "@/components/video-card";

interface VideoArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeam?: string;
  initialCategory?: string;
}

const TEAMS = ["ALL", "RCB", "CSK", "MI", "KKR", "GT", "RR", "DC", "PBKS", "SRH", "LSG"];
const CATEGORIES = ["ALL", "Batting", "Bowling", "Match Highlights", "Interviews", "Awards", "Finishes"];

export function VideoArchiveModal({
  isOpen,
  onClose,
  initialTeam,
  initialCategory,
}: VideoArchiveModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || "ALL");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "ALL");

  const allVideos = useMemo(() => getAllVideos(), []);

  const filteredVideos = useMemo(() => {
    return allVideos.filter((v) => {
      // Team filter
      if (selectedTeam !== "ALL") {
        const matchesTeam =
          v.teams.includes(selectedTeam) ||
          (v.opponent && v.opponent.toUpperCase() === selectedTeam);
        if (!matchesTeam) return false;
      }

      // Category filter
      if (selectedCategory !== "ALL") {
        const cat = selectedCategory.toLowerCase();
        const matchesCat =
          v.beyondXiCategory.toLowerCase().includes(cat) ||
          v.videoType.toLowerCase().includes(cat) ||
          v.originalCategory.toLowerCase().includes(cat);
        if (!matchesCat) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = [
          v.title,
          v.description,
          v.videoType,
          ...v.teams,
          ...v.players,
          ...v.keywords,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      }

      return true;
    });
  }, [allVideos, selectedTeam, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl h-[90vh] bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-900/60 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Official Broadcaster Discovery
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  137 Verified Clips
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
                <span>Watch on JioHotstar • Master Video Archive</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={OFFICIAL_IPL_2026_HUB}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-300 transition-all"
              >
                <span>Open Tournament Hub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 border-b border-white/5 bg-slate-900/30 shrink-0 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by player, team, milestone, or topic (e.g. Kohli, Sooryavanshi, final, yorker)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-all font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Reset Button */}
              {(selectedTeam !== "ALL" || selectedCategory !== "ALL" || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedTeam("ALL");
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs">
              {/* Franchise selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 [scrollbar-width:none]">
                <span className="text-slate-500 font-mono uppercase text-[10px] shrink-0 mr-1">
                  Team:
                </span>
                {TEAMS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTeam(t)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                      selectedTeam === t
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                        : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 [scrollbar-width:none]">
                <span className="text-slate-500 font-mono uppercase text-[10px] shrink-0 mr-1">
                  Category:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                        : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Videos Grid Stage */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400">
                Showing {filteredVideos.length} of {allVideos.length} videos
              </span>
              <span className="text-[11px] text-slate-500 font-sans">
                Official external links • Verified JioHotstar player references
              </span>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-white font-bold text-base">No matching video clips found</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Try adjusting your search terms or clearing team and category filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedTeam("ALL");
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
