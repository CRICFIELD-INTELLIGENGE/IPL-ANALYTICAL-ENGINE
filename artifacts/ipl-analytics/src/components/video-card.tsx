import React, { useState } from "react";
import { Link } from "wouter";
import { 
  Play, ExternalLink, Clock, CheckCircle2, Shield, 
  BarChart2, Info, ChevronRight, Sparkles 
} from "lucide-react";
import { type VideoCatalogueItem, BROADCASTER_DISCLAIMER } from "@/lib/video-registry";

interface VideoCardProps {
  video: VideoCatalogueItem;
  className?: string;
  compact?: boolean;
  showExploreStats?: boolean;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Batting: "from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/20 hover:border-amber-400/50 hover:shadow-amber-500/10",
  Bowling: "from-cyan-950/60 via-slate-900 to-slate-950 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-cyan-500/10",
  "Match Highlights": "from-blue-950/70 via-slate-900 to-slate-950 border-blue-500/25 hover:border-blue-400/50 hover:shadow-blue-500/15",
  "Franchise Collections": "from-red-950/60 via-slate-900 to-slate-950 border-red-500/20 hover:border-red-400/50 hover:shadow-red-500/10",
  "Player Collections": "from-purple-950/60 via-slate-900 to-slate-950 border-purple-500/20 hover:border-purple-400/50 hover:shadow-purple-500/10",
  "Editorial and Entertainment": "from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-emerald-500/10",
  "Historical IPL": "from-indigo-950/60 via-slate-900 to-slate-950 border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-indigo-500/10"
};

const TEAM_ACCENTS: Record<string, { bg: string; text: string }> = {
  RCB: { bg: "bg-red-500/20 border-red-500/40", text: "text-red-300" },
  CSK: { bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-300" },
  MI: { bg: "bg-blue-500/20 border-blue-500/40", text: "text-blue-300" },
  KKR: { bg: "bg-purple-500/20 border-purple-500/40", text: "text-purple-300" },
  GT: { bg: "bg-teal-500/20 border-teal-500/40", text: "text-teal-300" },
  RR: { bg: "bg-pink-500/20 border-pink-500/40", text: "text-pink-300" },
  DC: { bg: "bg-cyan-500/20 border-cyan-500/40", text: "text-cyan-300" },
  PBKS: { bg: "bg-rose-500/20 border-rose-500/40", text: "text-rose-300" },
  SRH: { bg: "bg-orange-500/20 border-orange-500/40", text: "text-orange-300" },
  LSG: { bg: "bg-sky-500/20 border-sky-500/40", text: "text-sky-300" }
};

export function VideoCard({
  video,
  className = "",
  compact = false,
  showExploreStats = true,
}: VideoCardProps) {
  const [showNotice, setShowNotice] = useState(false);

  const gradientClass =
    CATEGORY_GRADIENTS[video.beyondXiCategory] ||
    "from-slate-900 via-slate-900 to-slate-950 border-white/10 hover:border-cyan-400/40 hover:shadow-cyan-500/10";

  const primaryTeam = video.teams[0];
  const teamTheme = primaryTeam ? TEAM_ACCENTS[primaryTeam] : null;

  return (
    <div
      className={`group relative rounded-2xl bg-gradient-to-b ${gradientClass} border shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col overflow-hidden ${
        compact ? "p-3" : "p-3.5"
      } ${className}`}
    >
      {/* 16:9 Thumbnail Graphic Art Stage */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950/80 border border-white/5 flex flex-col justify-between p-3">
        {/* Subtle decorative vector mesh background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Header Badges: Video Type & Duration */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold uppercase tracking-wider text-white">
              {video.videoType}
            </span>
            {video.matchStage && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono font-semibold text-cyan-300">
                {video.matchStage}
              </span>
            )}
          </div>

          {video.duration && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span>{video.duration}</span>
            </div>
          )}
        </div>

        {/* Center Artwork: Stylized Play Button HUD */}
        <div className="relative z-10 flex items-center justify-center my-auto">
          <a
            href={video.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Watch "${video.title}" on JioHotstar`}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500/80 to-blue-600/90 hover:from-cyan-400 hover:to-blue-500 border border-white/30 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-transform duration-300 group-hover:scale-110 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current ml-0.5 text-white" />
          </a>
        </div>

        {/* Bottom Metadata: Teams & Broadcaster badge */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {video.teams.map((t) => {
              const acc = TEAM_ACCENTS[t];
              return (
                <span
                  key={t}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                    acc ? `${acc.bg} ${acc.text}` : "bg-white/10 border-white/10 text-white"
                  }`}
                >
                  {t}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[9px] text-blue-300 font-mono">
            <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
            <span>JioHotstar</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col justify-between pt-3 gap-2">
        <div>
          <h4
            className="text-white font-bold text-sm leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors"
            title={video.title}
          >
            {video.title}
          </h4>
          <p className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">
            {video.description}
          </p>
        </div>

        {/* Player Pills if present */}
        {video.players.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {video.players.slice(0, 2).map((p) => (
              <span
                key={p}
                className="text-[10px] text-slate-300 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 font-medium truncate max-w-[130px]"
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

        {/* Interactive Action Bar */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          {/* Primary Action Button */}
          <a
            href={video.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25 active:scale-95"
          >
            <span>Watch on JioHotstar</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Secondary Stats Action */}
          {showExploreStats && (
            <Link
              href={
                primaryTeam
                  ? `/dugout/${primaryTeam}`
                  : "/stats"
              }
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center justify-center"
              title="Explore Statistics in Intelligence OS"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Compliance Disclaimer Info */}
          <button
            onClick={() => setShowNotice(!showNotice)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all text-xs flex items-center justify-center"
            title="Legal attribution notice"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legal Disclaimer Box (Expandable) */}
        {showNotice && (
          <div className="mt-2 p-2 rounded-lg bg-slate-950/90 border border-cyan-500/30 text-[10px] text-slate-400 leading-normal font-sans">
            <p className="text-cyan-300 font-bold mb-0.5">Broadcaster Notice:</p>
            <p>{BROADCASTER_DISCLAIMER}</p>
            {!video.isExactVideoUrl && (
              <p className="mt-1 text-amber-400">
                • Opens the official JioHotstar IPL 2026 Tournament Hub catalog.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
