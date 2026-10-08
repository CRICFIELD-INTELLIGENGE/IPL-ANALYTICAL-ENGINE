// An AdSense placement.
//
// Renders nothing at all unless a publisher client is configured, a slot id is
// given, and the visitor consented. That is deliberate: an unfilled ad slot in
// a dark layout shows as a blank rectangle, and a placeholder that says "ad
// goes here" is worse — it makes a portfolio look like a template.
//
// Note for review time: AdSense requires the site to be live on a real domain,
// with an approved application and an ads.txt at the domain root. Nothing in
// this file can substitute for that; it only handles the client side once the
// account exists.

import { useEffect, useRef } from "react";
import { adsenseClient, hasAds, readConsent } from "@/lib/analytics";

interface AdSlotProps {
  /** The ad unit id from AdSense (data-ad-slot). */
  slot?: string;
  format?: string;
  /** Reserve height so the page does not jump when the unit fills. */
  minHeight?: number;
  className?: string;
  label?: boolean;
}

export function AdSlot({
  slot,
  format = "auto",
  minHeight = 90,
  className = "",
  label = true,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  const active = hasAds && Boolean(slot) && readConsent() === "granted";

  useEffect(() => {
    if (!active || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // A blocked or failed ad must never take the page down with it.
      console.warn("[ads] slot push failed:", (err as Error).message);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className={`w-full ${className}`} style={{ minHeight }}>
      {label && (
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-1.5">
          Advertisement
        </div>
      )}
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={adsenseClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
