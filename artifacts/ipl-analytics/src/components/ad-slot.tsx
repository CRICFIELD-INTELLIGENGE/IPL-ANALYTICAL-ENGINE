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
import { adsenseClient, hasAds, useAdConsent, mountAd } from "@/lib/analytics";
import { CommercialZone } from "@/components/photo-policy";

interface AdSlotProps {
  /** The ad unit id from AdSense (data-ad-slot). */
  slot?: string;
  format?: string;
  /** Reserve height so the page does not jump when the unit fills. */
  minHeight?: number;
  className?: string;
  label?: boolean;
}

/** Ad units are commercial zones: editorial (Getty-sourced) photos never render inside them. */
export function AdSlot(props: AdSlotProps) {
  return (
    <CommercialZone reason="advertising">
      <AdSlotUnit {...props} />
    </CommercialZone>
  );
}

function AdSlotUnit({
  slot,
  format = "auto",
  minHeight = 90,
  className = "",
  label = true,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement | null>(null);

  const consent = useAdConsent();
  const active = hasAds && /^\d{10}$/.test(slot ?? "") && consent === "granted";

  useEffect(() => {
    if (!active || !ref.current) return;
    return mountAd(ref.current);
  }, [active, slot, format]);

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
