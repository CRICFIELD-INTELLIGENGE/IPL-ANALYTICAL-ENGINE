// Consent for third-party embedded content (currently: the Getty Images Embedded Viewer).
//
// Kept separate from the analytics/advertising choice in analytics.ts so each can be given or
// withdrawn on its own. Getty's viewer loads a script and an iframe from Getty's servers, and
// Getty's site terms reserve the right to collect data and place ads inside the viewer, so no
// embed is requested until the visitor has said yes. Without consent, readers see the original
// CricField illustration instead.

import { useSyncExternalStore } from "react";

const KEY = "cf:consent:embeds:v1";
const EVENT = "cf:embed-consent";

export type EmbedConsent = "granted" | "denied" | null;

export function readEmbedConsent(): EmbedConsent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "denied" ? "denied" : "granted";
  } catch {
    return memo ?? "granted";
  }
}

function write(v: Exclude<EmbedConsent, null> | null) {
  try {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable: consent lasts for this page view only */
    memo = v;
  }
  window.dispatchEvent(new Event(EVENT));
}
let memo: EmbedConsent = null;

export const grantEmbedConsent = () => write("granted");
export const denyEmbedConsent = () => write("denied");
/** Forget the choice so the banner asks again (privacy page "change my choice"). */
export const resetEmbedConsent = () => write(null);

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useEmbedConsent(): EmbedConsent {
  return useSyncExternalStore(subscribe, () => readEmbedConsent() ?? memo, () => null);
}
