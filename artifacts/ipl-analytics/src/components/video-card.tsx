import React, { useState } from "react";
import { Link } from "wouter";
import { 
  Play, ExternalLink, Clock, CheckCircle2, Shield, 
  BarChart2, Info, AlertTriangle, Sparkles, Tv
} from "lucide-react";
import { type VideoCatalogueItem, BROADCASTER_DISCLAIMER } from "@/lib/video-registry";
import { paletteForCode, withAlpha } from "@/lib/team-palette";

interface VideoCardProps {
  video: VideoCatalogueItem;
  className?: string;
  compact?: boolean;
  showExploreStats?: boolean;
}

const CATEGORY_THEMES: Record<string, { gradient: string; badge: string; accent: string }> = {
  Batting: {
    gradient: "from-amber-950/40 via-[#0A1020] to-[#060A14] border-amber-500/20 hover:border-amber-400/50 hover:shadow-amber-500/10",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    accent: "#F59E0B"
  },
  Bowling: {
    gradient: "from-cyan-950/40 via-[#0A1020] to-[#060A14] border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-cyan-500/10",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    accent: "#06B6D4"
  },
  "Match Highlights": {
    gradient: "from-blue-950/50 via-[#0A1020] to-[#060A14] border-blue-500/25 hover:border-blue-400/50 hover:shadow-blue-500/15",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    accent: "#3B82F6"
  },
  Highlights: {
    gradient: "from-blue-950/50 via-[#0A1020] to-[#060A14] border-blue-500/25 hover:border-blue-400/50 hover:shadow-blue-500/15",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    accent: "#3B82F6"
  },
  "Franchise Collections": {
    gradient: "from-red-950/40 via-[#0A1020] to-[#060A14] border-red-500/20 hover:border-red-400/50 hover:shadow-red-500/10",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    accent: "#EF4444"
  },
  "Player Collections": {
    gradient: "from-purple-950/40 via-[#0A1020] to-[#060A14] border-purple-500/20 hover:border-purple-400/50 hover:shadow-purple-500/10",
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    accent: "#A855F7"
  },
  "Editorial and Entertainment": {
    gradient: "from-emerald-950/40 via-[#0A1020] to-[#060A14] border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accent: "#10B981"
  },
  Interviews: {
    gradient: "from-emerald-950/40 via-[#0A1020] to-[#060A14] border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    accent: "#10B981"
  },
  "Historical IPL": {
    gradient: "from-indigo-950/40 via-[#0A1020] to-[#060A14] border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-indigo-500/10",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    accent: "#6366F1"
  },
  "Historic Moments": {
    gradient: "from-indigo-950/40 via-[#0A1020] to-[#060A14] border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-indigo-500/10",
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    accent: "#6366F1"
  }
};

/**
 * 16:9 CricField-branded Thumbnail Generator
 * Renders verified official thumbnail when available; otherwise generates a crisp,
 * telemetry-branded 16:9 canvas with match metadata, team accents, and centered play button.
 */
export function CricFieldVideoThumbnail({
  video,
  className = "",
  showPlayButton = true
}: {
  video: VideoCatalogueItem;
  className?: string;
  showPlayButton?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const primaryTeam = video.teams[0] || "IPL";
  const opponentTeam = video.opponent || (video.teams.length > 1 ? video.teams[1] : null);
  const teamPalette = paletteForCode(primaryTeam);
  const teamAccent = teamPalette?.accent || "#00E5FF";

  const category = video.beyondXiCategory || video.videoType || "Highlights";
  const theme = CATEGORY_THEMES[category] || {
    gradient: "from-slate-900 via-[#0A1020] to-[#060A14]",
    badge: "bg-white/10 text-white/80 border-white/15",
    accent: teamAccent
  };

  const hasAuthorizedThumbnail = Boolean(video.thumbnailUrl && !imgFailed);

  return (
    <div
      className={`relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 flex flex-col justify-between p-3 select-none ${className}`}
      style={{
        backgroundColor: "#070C16",
        background: `radial-gradient(ellipse at 50% 30%, ${teamAccent}22 0%, #080D1A 60%, #04070E 100%)`
      }}
    >
      {/* 1. Official Authorized Thumbnail (if available and loads successfully) */}
      {hasAuthorizedThumbnail && (
        <>
          <img
            src={video.thumbnailUrl!}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] via-[#060A14]/40 to-black/60 pointer-events-none" />
        </>
      )}

      {/* 2. CricField Branded Vector Grid & Telemetry Overlay (when no thumbnail or behind image) */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" 
        aria-hidden="true"
      />
      <svg 
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg" 
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1="100%" x2="100%" y2="0" stroke={teamAccent} strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="50%" cy="50%" r="28%" stroke={teamAccent} strokeWidth="1" fill="none" opacity="0.4" />
      </svg>

      {/* Ambient Accent Radial Halo */}
      <div 
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-30 pointer-events-none"
        style={{ backgroundColor: teamAccent }}
      />

      {/* ── Top Row: Category Pill & Duration ── */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase tracking-wider ${theme.badge}`}>
            {video.videoType || category}
          </span>
          {video.matchStage && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/70">
              {video.matchStage}
            </span>
          )}
        </div>

        {video.duration && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono text-slate-300">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>{video.duration}</span>
          </div>
        )}
      </div>

      {/* ── Center: Centered Play HUD ── */}
      {showPlayButton && (
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          {video.isExactVideoUrl && video.officialVideoUrl ? (
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-white/40 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
              style={{
                background: `linear-gradient(135deg, ${teamAccent}cc 0%, #1e40af 100%)`,
                boxShadow: `0 0 20px ${teamAccent}44`
              }}
            >
              <Play className="w-5 h-5 fill-current ml-0.5 text-white" />
            </div>
          ) : (
            <div
              title="Official clip under review"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/80 border border-white/10 text-slate-400 flex items-center justify-center backdrop-blur-md"
            >
              <Play className="w-4 h-4 fill-current ml-0.5 text-slate-500 opacity-60" />
            </div>
          )}

          {/* Contextual Subtitle on Branded Canvas */}
          {!hasAuthorizedThumbnail && (
            <div className="mt-2 text-center max-w-[90%]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 font-semibold truncate block">
                {video.players.length > 0 ? video.players.slice(0, 2).join(" · ") : `${primaryTeam} Replay`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Row: Matchup Badges & Broadcaster Attribution ── */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-black border"
            style={{ 
              backgroundColor: withAlpha(teamAccent, 0.18), 
              borderColor: withAlpha(teamAccent, 0.45), 
              color: teamAccent 
            }}
          >
            {primaryTeam}
          </span>
          {opponentTeam && (
            <>
              <span className="text-[8px] font-mono text-white/30 font-bold">VS</span>
              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-white/5 border border-white/10 text-white/80">
                {opponentTeam}
              </span>
            </>
          )}
          {video.season && (
            <span className="text-[8.5px] font-mono text-white/40 ml-1">
              {video.season}
            </span>
          )}
        </div>

        {/* Broadcaster Logo Badge */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[8.5px] text-blue-300 font-mono shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
          <span>{video.broadcaster || "JioHotstar"}</span>
        </div>
      </div>
    </div>
  );
}

export function VideoCard({
  video,
  className = "",
  compact = false,
  showExploreStats = true,
}: VideoCardProps) {
  const [showNotice, setShowNotice] = useState(false);

  const category = video.beyondXiCategory || video.videoType || "Highlights";
  const theme = CATEGORY_THEMES[category] || {
    gradient: "from-slate-900 via-[#0A1020] to-[#060A14] border-white/10 hover:border-cyan-400/40 hover:shadow-cyan-500/10",
    badge: "bg-white/10 text-white border-white/10",
    accent: "#00E5FF"
  };

  const primaryTeam = video.teams[0] || "IPL";

  return (
    <div
      className={`group relative rounded-2xl bg-gradient-to-b ${theme.gradient} border shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between overflow-hidden ${
        compact ? "p-3" : "p-3.5"
      } ${className}`}
    >
      <div>
        {/* 16:9 CricField-branded Thumbnail Container */}
        <CricFieldVideoThumbnail video={video} />

        {/* Card Header & Title (2-line clamp limit) */}
        <div className="pt-3 space-y-1.5">
          <h4
            className="text-white font-bold text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-cyan-300 transition-colors"
            title={video.title}
          >
            {video.title}
          </h4>
          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed min-h-[2rem]">
            {video.description || `${video.videoType} featuring ${video.teams.join(" and ")} in the ${video.season} IPL campaign.`}
          </p>
        </div>

        {/* Relevant Players (if present) */}
        {video.players && video.players.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-2">
            {video.players.slice(0, 2).map((p) => (
              <span
                key={p}
                className="text-[10px] text-slate-300 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 font-medium truncate max-w-[125px]"
              >
                {p}
              </span>
            ))}
            {video.players.length > 2 && (
              <span className="text-[10px] text-slate-500 font-mono">
                +{video.players.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interactive Action Bar */}
      <div className="pt-3 mt-2 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Watch Action: Exact verified vs In-review Hub */}
          {video.isExactVideoUrl && video.officialVideoUrl ? (
            <a
              href={video.officialVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/15 hover:shadow-cyan-500/30 active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch on JioHotstar</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>
          ) : (
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <span
                title="Exact clip link currently under editorial verification. Direct playback disabled."
                className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-400 text-[10.5px] font-mono flex items-center gap-1 cursor-not-allowed select-none shrink-0"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>In Review</span>
              </span>
              <a
                href={video.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Browse verified official IPL tournament hub on JioHotstar"
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 hover:text-cyan-200 font-semibold text-xs transition-colors whitespace-nowrap"
              >
                <span>Browse Hub</span>
                <ExternalLink className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
              </a>
            </div>
          )}

          {/* Secondary Stats Link */}
          {showExploreStats && (
            <Link
              href={primaryTeam ? `/dugout/${primaryTeam.toLowerCase()}` : "/stats"}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-center shrink-0"
              title="Explore team statistics in CricField Intelligence"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Legal Attribution Notice Toggle */}
          <button
            onClick={() => setShowNotice(!showNotice)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all text-xs flex items-center justify-center shrink-0 cursor-pointer"
            title="Legal attribution and broadcast compliance notice"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Compliance Notice Drawer */}
        {showNotice && (
          <div className="p-2.5 rounded-xl bg-[#050A14] border border-cyan-500/30 text-[10px] text-slate-400 leading-relaxed font-sans">
            <p className="text-cyan-300 font-bold mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Broadcaster Notice</span>
            </p>
            <p>{BROADCASTER_DISCLAIMER}</p>
            {!video.isExactVideoUrl && (
              <p className="mt-1 text-amber-400/90 font-mono">
                • Status: Awaiting direct clip indexation. "Browse Hub" links to the official tournament directory.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
