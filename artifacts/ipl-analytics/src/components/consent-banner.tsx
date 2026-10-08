// Cookie consent, and the SPA page-view bridge.
//
// The banner only appears when there is actually something to consent to — if
// neither VITE_GA_MEASUREMENT_ID nor VITE_ADSENSE_CLIENT is configured, no
// third-party script will ever load and asking would be theatre.
//
// "Decline" is a real choice: it writes a denied state, updates Consent Mode,
// and no Google script is fetched. The server-side outbound click counter keeps
// working either way, so declining does not blind the site's own metrics.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  hasAnalytics, hasAds, readConsent, grantConsent, denyConsent,
  resumeIfConsented, initConsentDefaults, pageview,
} from "@/lib/analytics";
import { Cookie, X } from "lucide-react";

/** Sends a GA page_view on every route change; GA4 cannot see SPA navigation. */
export function AnalyticsRouteTracker() {
  const [location] = useLocation();
  useEffect(() => { pageview(location); }, [location]);
  return null;
}

export function ConsentBanner() {
  const configured = hasAnalytics || hasAds;
  const [decided, setDecided] = useState<boolean>(true);

  useEffect(() => {
    if (!configured) return;
    initConsentDefaults();
    const prior = readConsent();
    setDecided(prior !== null);
    if (prior === "granted") void resumeIfConsented();
  }, [configured]);

  if (!configured || decided) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] p-4 md:p-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl bg-[#0B1020] border border-white/15 rounded-[20px] shadow-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
        <Cookie className="w-5 h-5 text-primary shrink-0" />
        <p className="text-[12px] text-white/60 leading-relaxed flex-1">
          This site uses cookies for{" "}
          {hasAnalytics && hasAds ? "analytics and advertising" : hasAnalytics ? "analytics" : "advertising"}.
          Decline and nothing is loaded — the site works exactly the same.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { denyConsent(); setDecided(true); }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all"
          >
            Decline
          </button>
          <button
            onClick={() => { void grantConsent(); setDecided(true); }}
            className="px-5 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all"
          >
            Accept
          </button>
        </div>
        <button
          onClick={() => { denyConsent(); setDecided(true); }}
          aria-label="Dismiss"
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0B1020] border border-white/15 hidden"
        >
          <X className="w-3 h-3 mx-auto text-white/40" />
        </button>
      </div>
    </div>
  );
}
