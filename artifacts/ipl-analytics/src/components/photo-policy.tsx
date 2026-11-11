// Photo placement policy.
//
// 1. Commercial zones: Getty-sourced photographs (embedded or licensed) never render inside the
//    Shop, merchandise, Premium features, ad units or sponsor modules. Wrap such a surface in
//    <CommercialZone>; editorial photo components check the zone and show their fallback.
// 2. Revenue modules remain mounted. Image authorization is enforced by the photo renderer.

import { createContext, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

export type CommercialReason = "shop" | "merchandise" | "premium" | "advertising" | "sponsor" | "promotion";

const ZoneContext = createContext<CommercialReason | null>(null);

export function CommercialZone({ reason, children }: { reason: CommercialReason; children: ReactNode }) {
  return (
    <ZoneContext.Provider value={reason}>
      <div data-commercial-zone={reason} className="contents">
        {children}
      </div>
    </ZoneContext.Provider>
  );
}

/** The commercial surface this component sits in, or null on editorial pages. */
export function useCommercialZone(): CommercialReason | null {
  return useContext(ZoneContext);
}

// ── Live Getty embeds on the current page ────────────────────────────────────
let activeEmbeds = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Number of Getty Embedded Viewers currently mounted. */
export function gettyEmbedsOnPage(): number {
  return activeEmbeds;
}

/** Called by the Getty viewer component while it is mounted. Layout effect, so ads see it before they load. */
export function useRegisterGettyEmbed() {
  useLayoutEffect(() => {
    activeEmbeds++;
    notify();
    return () => {
      activeEmbeds--;
      notify();
    };
  }, []);
}

export function useGettyEmbedsOnPage(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => activeEmbeds > 0,
    () => false,
  );
}

/**
 * Sponsor modules remain visible and isolate commercial content from editorial photography.
 */
export function SponsorModule({ children }: { children: ReactNode }) {
  return <CommercialZone reason="sponsor">{children}</CommercialZone>;
}
