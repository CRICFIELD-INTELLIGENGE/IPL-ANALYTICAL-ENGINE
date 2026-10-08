// Google Analytics 4 and AdSense loading, gated on configuration and consent.
//
// Nothing here fires unless two things are true:
//   1. the relevant ID is configured (VITE_GA_MEASUREMENT_ID / VITE_ADSENSE_CLIENT)
//   2. the visitor has accepted analytics/ads cookies
//
// Both gates matter. Without (1) a build with no IDs would ship a broken
// tracker; without (2) the site would set third-party cookies before asking,
// which is what actually gets a site in trouble under GDPR/UK-GDPR and is also
// grounds for AdSense to decline an application.
//
// Consent is stored in localStorage and mirrored into Google Consent Mode v2,
// so gtag knows the state rather than merely being withheld.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const rawAdsenseClient = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim();
const ADSENSE_CLIENT = rawAdsenseClient
  ? rawAdsenseClient.startsWith("ca-pub-")
    ? rawAdsenseClient
    : rawAdsenseClient.startsWith("pub-")
    ? `ca-${rawAdsenseClient}`
    : `ca-pub-${rawAdsenseClient}`
  : undefined;

export const hasAnalytics = Boolean(GA_ID);
export const hasAds = Boolean(ADSENSE_CLIENT);
export const adsenseClient = ADSENSE_CLIENT;

const CONSENT_KEY = "iae:consent:v1";

export type ConsentChoice = "granted" | "denied";

export function readConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // Private mode or a blocked storage API: treat as undecided rather than
    // assuming permission.
    return null;
  }
}

function writeConsent(choice: ConsentChoice) {
  try { localStorage.setItem(CONSENT_KEY, choice); } catch { /* nothing to do */ }
}

/* ────────────────────────────── gtag plumbing ────────────────────────────── */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    adsbygoogle?: unknown[];
  }
}

function ensureGtagStub() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
}

function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(el);
  });
}

let gaLoaded = false;
let adsLoaded = false;

/**
 * Declares the default consent state before any Google tag runs. Consent Mode
 * expects this to be set first, so it must happen even when the visitor has not
 * decided yet.
 */
export function initConsentDefaults() {
  if (typeof window === "undefined") return;
  ensureGtagStub();
  const decided = readConsent();
  const state = decided === "granted" ? "granted" : "denied";
  window.gtag!("consent", "default", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
    wait_for_update: 500,
  });
}

async function startGoogleAnalytics() {
  if (gaLoaded || !GA_ID) return;
  gaLoaded = true;
  ensureGtagStub();
  await loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
  window.gtag!("js", new Date());
  // Page views are sent manually: this is a single-page app, so GA's automatic
  // pageview would fire once on load and never again as the reader navigates.
  window.gtag!("config", GA_ID, { send_page_view: false });
  pageview(window.location.pathname + window.location.search);
}

async function startAdSense() {
  if (adsLoaded || !ADSENSE_CLIENT) return;
  adsLoaded = true;
  await loadScript(
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
    { crossorigin: "anonymous" },
  );
}

/** Called once the visitor accepts. Updates Consent Mode, then loads the tags. */
export async function grantConsent() {
  writeConsent("granted");
  ensureGtagStub();
  window.gtag!("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
  await Promise.allSettled([startGoogleAnalytics(), startAdSense()]);
}

export function denyConsent() {
  writeConsent("denied");
  ensureGtagStub();
  window.gtag!("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
}

/** Loads the tags on a return visit where consent was previously granted. */
export async function resumeIfConsented() {
  if (readConsent() !== "granted") return;
  await Promise.allSettled([startGoogleAnalytics(), startAdSense()]);
}

/* ──────────────────────────────── reporting ──────────────────────────────── */

export function pageview(path: string) {
  if (!GA_ID || !window.gtag || readConsent() !== "granted") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!GA_ID || !window.gtag || readConsent() !== "granted") return;
  window.gtag("event", name, params);
}

/**
 * An outbound click on a published article.
 *
 * The server already counts these at /api/ipl/insights/go/<slug>, which works
 * even for a reader who declined cookies. This adds the GA side — audience,
 * source, device — for those who accepted. The two are complementary: the
 * server count is complete, the GA count is richer.
 */
export function trackOutbound(slug: string, title: string, platform?: string) {
  trackEvent("outbound_article_click", {
    article_slug: slug,
    article_title: title,
    platform: platform ?? "unknown",
  });
}
