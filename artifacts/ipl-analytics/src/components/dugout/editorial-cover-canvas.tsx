import React, { useState } from "react";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";

interface EditorialCoverCanvasProps {
  franchiseName: string;
  teamCode: string;
  parameter: string;
  parameterNumber?: number;
  title: string;
  accent?: string;
  coverImage?: string;
  aspectRatio?: "video" | "hero" | "banner" | "wide";
  className?: string;
  isCoverStory?: boolean;
  /** Edition chip, e.g. "IPL 2008–2026". Legacy covers keep the original label. */
  edition?: string;
}

export function EditorialCoverCanvas({
  franchiseName,
  teamCode,
  parameter,
  parameterNumber = 1,
  title,
  accent = "#f97316",
  coverImage,
  aspectRatio = "video",
  className = "",
  isCoverStory = false,
  edition = "IPL 2024",
}: EditorialCoverCanvasProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(coverImage && coverImage.trim() !== "" && !imageError);

  const aspectClass =
    aspectRatio === "hero"
      ? "aspect-video"
      : aspectRatio === "banner"
      ? "aspect-[16/7]"
      : aspectRatio === "wide"
      ? "aspect-[16/9]"
      : "aspect-video";

  return (
    <div
      data-on-image="true"
      className={`editorial-cover-canvas relative w-full ${aspectClass} overflow-hidden rounded-xl border border-white/10 bg-[#0A0F1D] flex flex-col justify-between p-3.5 sm:p-4 group select-none ${className}`}
    >
      {/* If an actual photo file is provided in the future, render it with fallback */}
      {hasImage && (
        <>
          <img
            src={coverImage}
            alt={title}
            onError={() => setImageError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 z-[1] pointer-events-none" />
        </>
      )}

      {/* Editorial Canvas Graphic Background (Visible when no photo is attached) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Ambient radial glow using team accent */}
        <div
          className="absolute -top-12 -right-12 w-64 sm:w-80 h-64 sm:h-80 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accent }}
        />
        <div
          className="absolute -bottom-12 -left-12 w-64 sm:w-80 h-64 sm:h-80 rounded-full blur-3xl opacity-15"
          style={{ backgroundColor: accent }}
        />

        {/* Geometric Pitch & Trajectory SVG Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="cricket-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cricket-grid)" />
        </svg>

        {/* Subtle Arch & Vector Lines */}
        <div className="absolute inset-0 opacity-20 flex items-center justify-center">
          <div
            className="w-96 h-96 rounded-full border border-dashed"
            style={{ borderColor: accent }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full border border-white/10"
          />
        </div>

        {/* Giant Monogram Watermark */}
        <div className="absolute right-4 bottom-2 text-7xl sm:text-8xl md:text-9xl font-black font-display tracking-tighter text-white/[0.04] pointer-events-none select-none">
          {teamCode}
        </div>

        {/* Gradient Scrim for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1D] via-[#0A0F1D]/60 to-transparent" />
      </div>

      {/* Top Header of Editorial Canvas */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span
          className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md whitespace-nowrap"
          style={{
            backgroundColor: `${accent}25`,
            color: accent,
            borderColor: `${accent}50`,
          }}
        >
          {isCoverStory ? "★ COVER STORY" : `STORY 0${parameterNumber}`}
        </span>

        <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-300 bg-black/60 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md whitespace-nowrap">
          <span className="text-gray-200 font-semibold tracking-wider uppercase">
            {edition && edition !== "CricField Library" ? edition : (isCoverStory ? "SPECIAL REPORT" : "INTELLIGENCE")}
          </span>
        </div>
      </div>

      {/* Center Graphic Crest / Title Art */}
      <div className="relative z-10 my-auto py-1">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono uppercase tracking-wider mb-1 text-slate-300 truncate">
          <span style={{ color: accent }} className="font-bold shrink-0">{franchiseName}</span>
          <span className="text-white/40 shrink-0">•</span>
          <span className="text-white/80 font-medium truncate">{parameter || "SPECIAL REPORT"}</span>
        </div>
        <h3
          style={{ color: "#ffffff" }}
          className={`font-black tracking-tight text-white !text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-tight forced-white on-image ${
            isCoverStory ? "text-lg sm:text-xl md:text-2xl" : "text-sm sm:text-base"
          }`}
        >
          {title}
        </h3>
      </div>

      {/* Bottom Metadata Ribbon */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1.5 border-t border-white/10">
        <div className="flex items-center gap-1.5 truncate mr-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <span className="uppercase text-gray-300 font-semibold truncate">{franchiseName}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 shrink-0 text-[9px]">
          <span>CRICFIELD EDITORIAL</span>
        </div>
      </div>
    </div>
  );
}
