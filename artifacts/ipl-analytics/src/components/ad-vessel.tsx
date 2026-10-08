/**
 * AD VESSEL — NATIVE GOOGLE ADSENSE PLACEMENT CONTAINER
 * ─────────────────────────────────────────────────────────────────────────────
 * Designed to fit seamlessly like an organic telemetry vessel into the
 * IPL Decision Intelligence OS dark cyberpunk layout.
 *
 * Supports:
 *   - Google AdSense ca-pub-XXXXXX integration
 *   - Responsive horizontal (leaderboard), rectangle (sidebar), and in-feed formats
 *   - Sleek glassmorphic vessel frame that prevents layout shifts (CLS)
 *   - High-tech placeholder telemetry when awaiting live AdSense ad fill
 */

import React, { useEffect, useRef, useState } from "react";
import { Radio, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { adsenseClient, hasAds, readConsent } from "@/lib/analytics";

export type AdVesselFormat = "horizontal" | "rectangle" | "in-feed" | "compact" | "skyscraper";

interface AdVesselProps {
  /** Google AdSense slot id (data-ad-slot) */
  slot?: string;
  format?: AdVesselFormat;
  className?: string;
  label?: string;
  minHeight?: number;
}

export function AdVessel({
  slot = "1029384756",
  format = "horizontal",
  className = "",
  label,
  minHeight,
}: AdVesselProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);

  const client = adsenseClient || (import.meta.env.VITE_ADSENSE_CLIENT as string) || "";
  const isConsentGranted = readConsent() !== "denied";

  const resolvedLabel = label ?? (format === "in-feed" ? "Sponsored" : format === "skyscraper" ? "Advertisement · Skyscraper" : "Advertisement · Partner Briefing");

  const defaultHeight =
    minHeight ??
    (format === "horizontal"
      ? 100
      : format === "skyscraper"
      ? 500
      : format === "rectangle"
      ? 260
      : format === "in-feed"
      ? 280
      : 120);

  useEffect(() => {
    if (!client || pushed.current || !isConsentGranted) return;
    pushed.current = true;
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch (err) {
      console.warn("[AdVessel] Push warning:", (err as Error).message);
    }
  }, [client, isConsentGranted]);

  // Dedicated In-Feed Editorial Card Layout (mirrors "Insights That Matter" cards)
  if (format === "in-feed") {
    return (
      <div
        className={`bg-[#0B1020] rounded-[18px] border border-white/10 hover:border-cyan-500/40 overflow-hidden flex flex-col group transition-all min-w-0 shadow-xl relative ${className}`}
        style={{ minHeight: defaultHeight }}
      >
        {/* Top Visual Area (mirrors editorial article thumbnail) */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-cyan-950/40 via-[#070B18] to-purple-950/30 flex items-center justify-center p-3" style={{ height: "70%" }}>
          <div className="absolute inset-0 bg-grid-40 opacity-20 pointer-events-none" />
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-cyan-400 text-black shadow-sm">
            {resolvedLabel}
          </div>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[8px] font-mono text-cyan-400/80 bg-black/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>SLOT {slot}</span>
          </div>

          {client ? (
            <ins
              ref={adRef}
              className="adsbygoogle block w-full h-full text-center"
              style={{ display: "block" }}
              data-ad-client={client}
              data-ad-slot={slot}
              data-ad-format="fluid"
              data-ad-layout-key="-fb+5w+4e-db+86"
            />
          ) : (
            <div className="text-center p-2 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-2 text-cyan-400 group-hover:scale-110 transition-transform">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <span className="text-[11px] font-black text-white/90 uppercase tracking-tight block">
                Partner Intelligence
              </span>
              <span className="text-[8px] font-mono text-white/40 uppercase tracking-wider">
                Native Telemetry Ad Vessel
              </span>
            </div>
          )}
        </div>

        {/* Text Area (mirrors editorial metadata & read time) */}
        <div className="flex-1 p-3 flex flex-col justify-center border-t border-white/5 bg-white/[0.01]">
          <p className="font-black text-[10px] leading-tight text-white/90 uppercase group-hover:text-cyan-400 transition-colors line-clamp-2 mb-1 tracking-tight">
            Fantasy & Tactical Performance Integrations
          </p>
          <div className="flex items-center justify-between">
            <p className="text-[8px] text-white/40 font-mono">VERIFIED PARTNER</p>
            <p className="text-[8px] text-cyan-400 font-black uppercase tracking-widest">SPONSORED</p>
          </div>
        </div>
      </div>
    );
  }

  // Sticky Skyscraper format for desktop long-form reading view
  if (format === "skyscraper") {
    return (
      <div
        className={`relative w-full rounded-2xl border border-white/10 bg-[#070B18]/80 backdrop-blur-xl p-3 flex flex-col overflow-hidden group hover:border-cyan-500/30 transition-all shadow-xl ${className}`}
        style={{ minHeight: defaultHeight }}
      >
        <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-white/5 text-[9px] font-mono text-white/40">
          <span className="uppercase tracking-widest text-[8px]">{resolvedLabel}</span>
          <span className="text-[8px] text-cyan-400/80">300×600</span>
        </div>
        <div className="flex-1 flex items-center justify-center w-full min-h-[300px]">
          {client ? (
            <ins
              ref={adRef}
              className="adsbygoogle block w-full h-full text-center"
              style={{ display: "inline-block", width: "300px", height: "600px" }}
              data-ad-client={client}
              data-ad-slot={slot}
            />
          ) : (
            <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-xs font-bold text-white mb-1">Contextual Sports Intel</span>
              <p className="text-[10px] text-white/40 max-w-[200px] mb-4">
                Targeted sports science, fantasy leagues & performance tech.
              </p>
              <span className="text-[8px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                SLOT {slot}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Horizontal Leaderboard & Standard Rectangular Vessels
  return (
    <div
      className={`relative w-full rounded-2xl border border-white/10 bg-[#070B18]/70 backdrop-blur-xl p-3 sm:p-4 overflow-hidden group hover:border-cyan-500/30 transition-all duration-300 shadow-md ${className}`}
      style={{ minHeight: defaultHeight }}
    >
      {/* Ambient vessel sheen */}
      <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

      {/* Discrete Vessel HUD Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-white/40 group-hover:text-cyan-300/80 transition-colors">
            {resolvedLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] font-mono text-white/30">
          <ShieldCheck className="w-3 h-3 text-cyan-400/60" />
          <span>ADSENSE VESSEL</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex items-center justify-center min-h-[60px] overflow-hidden">
        {client ? (
          <ins
            ref={adRef}
            className="adsbygoogle block w-full text-center"
            style={{ display: "block" }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format={format === "rectangle" ? "rectangle" : "auto"}
            data-full-width-responsive="true"
          />
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <span>Partner Intelligence Network</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                    SLOT {slot}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  High-leverage analytical sponsorships & brand integrations.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-mono text-white/30 hidden sm:inline">
                RESERVED VESSEL
              </span>
              <a
                href="mailto:partners@ipl-intelligence.com?subject=IPL%20Decision%20Intelligence%20Sponsorship"
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-white/70 hover:text-cyan-300 border border-white/10 text-[10px] font-semibold transition-all inline-flex items-center gap-1"
              >
                <span>Partner With Us</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
