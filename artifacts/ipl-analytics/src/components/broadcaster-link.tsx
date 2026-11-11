import React from "react";
import { ExternalLink, Play, Tv, ShieldCheck, Film } from "lucide-react";
import {
  type BroadcasterHighlight,
  type HighlightLookupParams,
  findBroadcasterHighlight,
  BROADCASTER_DISCLAIMER,
  OFFICIAL_IPL_HUB_URL,
  OFFICIAL_LIVE_CRICKET_URL
} from "@/lib/broadcaster-registry";

interface BroadcasterLinkProps {
  highlight?: BroadcasterHighlight | null;
  lookupParams?: HighlightLookupParams;
  variant?: "pill" | "compact" | "banner" | "card" | "second-screen";
  label?: string;
  showDisclaimer?: boolean;
  className?: string;
  fallbackToHub?: boolean;
}

/**
 * Reusable JioHotstar Broadcaster Integration Component.
 * 
 * Compliant external deep-link component that directs fans to verified
 * match replays, landmark finals, and live broadcaster streams.
 * 
 * Does NOT embed or proxy video; strictly opens official destinations externally.
 */
export function BroadcasterLink({
  highlight: explicitHighlight,
  lookupParams,
  variant = "pill",
  label,
  showDisclaimer = true,
  className = "",
  fallbackToHub = false
}: BroadcasterLinkProps) {
  const highlight = explicitHighlight ?? (lookupParams ? findBroadcasterHighlight(lookupParams) : null);

  // If no highlight is resolved and fallbackToHub is not enabled, safely render nothing
  if (!highlight && !fallbackToHub) {
    return null;
  }

  const destinationUrl = highlight ? highlight.url : OFFICIAL_IPL_HUB_URL;
  const matchTitle = highlight?.title || "Official IPL Broadcaster Hub";
  const duration = highlight?.duration;

  // 1. PILL VARIANT (Ideal for timeline cards, milestone headers, and match summary bars)
  if (variant === "pill") {
    return (
      <a
        href={destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${matchTitle} — Opens in JioHotstar`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#001D4A]/80 hover:bg-[#002D72] text-[#60A5FA] hover:text-white border border-[#1E40AF]/40 hover:border-[#3B82F6] transition-all text-[10px] font-mono font-bold uppercase tracking-wider group cursor-pointer shadow-sm ${className}`}
      >
        <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
        <Tv className="w-3 h-3 text-[#60A5FA] group-hover:scale-110 transition-transform" />
        <span>{label || "Watch on JioHotstar"}</span>
        {duration && <span className="text-white/40 font-normal">({duration})</span>}
        <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </a>
    );
  }

  // 2. COMPACT BUTTON VARIANT (For match cards, stats cards, and scorecard headers)
  if (variant === "compact") {
    return (
      <div className={`inline-flex flex-col gap-1 ${className}`}>
        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#001433] to-[#0A2558] hover:from-[#002255] hover:to-[#123E8A] text-white border border-[#2563EB]/40 hover:border-[#60A5FA] transition-all text-xs font-semibold group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[#2563EB]/30 text-[#60A5FA]">
            <Play className="w-3 h-3 fill-[#60A5FA]" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[9px] font-mono font-bold tracking-wider text-[#93C5FD] uppercase">
              Official Highlights
            </span>
            <span className="text-[11px] font-bold text-white flex items-center gap-1">
              <span>{label || (highlight ? "JioHotstar Replay" : "JioHotstar Hub")}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </span>
          </div>
        </a>
        {showDisclaimer && (
          <span className="text-[9px] font-mono text-white/40 px-1">
            Official Broadcaster • Opens external window
          </span>
        )}
      </div>
    );
  }

  // 3. SECOND SCREEN COMPANION BANNER (For Pulse page & Live Match Companion)
  if (variant === "second-screen") {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-[#02102B] via-[#051C47] to-[#082866] border border-[#2563EB]/40 relative overflow-hidden space-y-3 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#3B82F6]/40 flex items-center justify-center shrink-0 text-[#60A5FA]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest bg-[#3B82F6]/20 border border-[#3B82F6]/30 text-[#93C5FD]">
                  OFFICIAL BROADCASTER COMPANION
                </span>
                <span className="text-[10px] text-white/30">•</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE TELECAST</span>
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                Watching Live on JioHotstar?
              </h4>
              <p className="text-xs text-white/70 max-w-xl mt-0.5 leading-relaxed">
                Use Beyond XI as your interactive second screen. Track live win probabilities, momentum heat, and fan polls while enjoying the official JioHotstar live stream.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <a
              href={OFFICIAL_LIVE_CRICKET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch on JioHotstar</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>

        {showDisclaimer && (
          <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] font-mono text-white/40">
            <ShieldCheck className="w-3 h-3 text-[#60A5FA]" />
            <span>
              Beyond XI is an independent telemetry platform. Live video stream broadcasted and hosted by JioHotstar.
            </span>
          </div>
        )}
      </div>
    );
  }

  // 4. FULL BANNER / CARD VARIANT (For Match Intelligence & Story Vault)
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#031538] to-[#0A265C] border border-[#3B82F6]/30 relative overflow-hidden space-y-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#2563EB]/20 border border-[#3B82F6]/30 text-[#60A5FA] shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#93C5FD] font-bold">
                OFFICIAL MATCH ARCHIVE • JIOHOTSTAR
              </span>
              {duration && (
                <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-white/10 text-white/80">
                  {duration}
                </span>
              )}
            </div>
            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight mt-0.5">
              {highlight?.title || "Match Highlights & Replay"}
            </h4>
            <p className="text-xs text-white/70 max-w-lg mt-0.5 leading-relaxed">
              {highlight?.matchDesc || "Official high-definition highlights provided directly by the official broadcaster."}
            </p>
          </div>
        </div>

        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#3B82F6] hover:to-[#2563EB] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{label || "Watch Highlights"}</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>

      {showDisclaimer && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
          <span>{highlight?.venue || "IPL Tournament Archive"}</span>
          <span className="hidden sm:inline">
            Official Broadcaster link • Beyond XI is an independent analytical engine
          </span>
        </div>
      )}
    </div>
  );
}
