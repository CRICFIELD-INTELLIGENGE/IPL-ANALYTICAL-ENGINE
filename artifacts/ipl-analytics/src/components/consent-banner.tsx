// Cookie consent, and the SPA page-view bridge.
//
// The banner only appears when there is actually something to consent to — if
// neither VITE_GA_MEASUREMENT_ID nor VITE_ADSENSE_CLIENT is configured, no
// third-party script will ever load and asking would be theatre.
//
// "Decline" is a real choice: it writes a denied state, updates Consent Mode,
// and no Google script is fetched. The banner also covers embedded third-party
// content (Getty Images' Embedded Viewer) whenever the build can show it; that
// choice is stored separately (lib/embed-consent.ts) so each can be changed alone. The server-side outbound click counter keeps
// working either way, so declining does not blind the site's own metrics.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  hasAnalytics, hasAds, readConsent, grantConsent, denyConsent,
  resumeIfConsented, initConsentDefaults, pageview,
} from "@/lib/analytics";
import { Cookie, X } from "lucide-react";
import { Link } from "wouter";
import { denyEmbedConsent, grantEmbedConsent, useEmbedConsent } from "@/lib/embed-consent";
import { PUBLIC_MANIFEST, gettyEmbedsPossible, isLocalPreviewable } from "@/lib/editorial-images";

// Public builds ask only when an approved Getty embed can appear. Development builds also ask when a
// local preview candidate exists, so the localhost preview can be switched on through the same choice.
const EMBEDS_POSSIBLE = gettyEmbedsPossible() || (Boolean(import.meta.env.DEV) && PUBLIC_MANIFEST.images.some(isLocalPreviewable));

/** Sends a GA page_view on every route change; GA4 cannot see SPA navigation. */
export function AnalyticsRouteTracker() {
  const [location] = useLocation();
  useEffect(() => { pageview(location); }, [location]);
  return null;
}

export function ConsentBanner() {
  const configured = hasAnalytics || hasAds;
  const [decided, setDecided] = useState<boolean>(true);
  const embedConsent = useEmbedConsent();
  const askEmbeds = EMBEDS_POSSIBLE && embedConsent === null;

  useEffect(() => {
    if (!configured) return;
    initConsentDefaults();
    const prior = readConsent();
    setDecided(prior !== null);
    if (prior === "granted") void resumeIfConsented();
  }, [configured]);

  const askGoogle = configured && !decided;
  if (!askGoogle && !askEmbeds) return null;

  const purposes = [
    ...(askGoogle ? [hasAnalytics && hasAds ? "analytics and advertising" : hasAnalytics ? "analytics" : "advertising"] : []),
    ...(askEmbeds ? ["embedded photos from Getty Images (Getty may collect data through its viewer)"] : []),
  ];
  const accept = () => {
    if (askGoogle) void grantConsent();
    if (askEmbeds) grantEmbedConsent();
    setDecided(true);
  };
  const decline = () => {
    if (askGoogle) denyConsent();
    if (askEmbeds) denyEmbedConsent();
    setDecided(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 md:p-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl bg-[#0B1020] border border-white/15 rounded-[20px] shadow-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <Cookie className="w-5 h-5 text-primary shrink-0" />
        <p className="text-[12px] text-white/60 leading-relaxed flex-1">
          This site uses cookies and third-party content for {purposes.join(", and ")}. Decline and none of it is
          loaded — the site works the same, with CricField illustrations in place of photos.{" "}
          <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-white">Privacy policy</Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all"
          >
            Accept
          </button>
        </div>
        <button
          onClick={decline}
          aria-label="Dismiss"
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0B1020] border border-white/15 hidden"
        >
          <X className="w-3 h-3 mx-auto text-white/40" />
        </button>
      </div>
    </div>
  );
}
