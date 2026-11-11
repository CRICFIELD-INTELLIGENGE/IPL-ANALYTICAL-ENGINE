import type { Page } from "@playwright/test";

/** What the smoke checks collect while a page loads: console errors, uncaught errors, failed /api or /data calls. */
export interface PageWatch {
  consoleErrors: string[];
  pageErrors: string[];
  badResponses: string[];
  /** Resolves once no /api or /data request has been in flight for `quietMs` (or `maxMs` passed). */
  settle(quietMs?: number, maxMs?: number): Promise<void>;
}

const isAppData = (url: string) => {
  const p = new URL(url).pathname;
  return p.startsWith("/api/") || p.startsWith("/data/");
};

export function watchPage(page: Page): PageWatch {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];
  let inFlight = 0;
  let lastChange = Date.now();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${msg.text()} @ ${msg.location().url}`);
  });
  // Uncaught exceptions and unhandled promise rejections both arrive here.
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack ?? err)));
  // The auction state is polled every second (lib/live.ts); it would keep the page from ever looking idle.
  const tracked = (url: string) => isAppData(url) && !url.includes("/api/auction/state");
  page.on("request", (req) => {
    if (!tracked(req.url())) return;
    inFlight++;
    lastChange = Date.now();
  });
  const done = () => {
    inFlight = Math.max(0, inFlight - 1);
    lastChange = Date.now();
  };
  page.on("requestfinished", (req) => {
    if (tracked(req.url())) done();
  });
  page.on("requestfailed", (req) => {
    if (!isAppData(req.url())) return;
    if (tracked(req.url())) done();
    // An aborted request (navigation away, React Query cancel) is not a server failure.
    const reason = req.failure()?.errorText ?? "";
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(reason)) badResponses.push(`FAILED ${req.method()} ${req.url()} (${reason})`);
  });
  page.on("response", (res) => {
    if (isAppData(res.url()) && res.status() >= 400) badResponses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });

  return {
    consoleErrors,
    pageErrors,
    badResponses,
    async settle(quietMs = 800, maxMs = 20_000) {
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        if (inFlight === 0 && Date.now() - lastChange >= quietMs) return;
        await page.waitForTimeout(100);
      }
    },
  };
}

/** Images that finished loading but have no pixels (a broken src), after any onError fallback had its chance. */
export async function brokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0 && (img.currentSrc || img.getAttribute("src")))
      .map((img) => img.currentSrc || img.getAttribute("src") || ""),
  );
}

/**
 * Mobile layout measurements: page-level horizontal scroll and the right "Intelligence" rail (DAY-07 §2).
 * `deviceWidth` is the emulated viewport width. It is passed in because on a mobile viewport an overflowing page
 * widens the layout viewport, so window.innerWidth grows with the overflow and cannot be the reference.
 */
export async function layoutMetrics(page: Page, deviceWidth: number) {
  return page.evaluate((deviceWidth) => {
    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width) };
    };
    const main = document.querySelector("main");
    // The Layout has two <aside> rails: the nav on the left and the Intelligence feed on the right.
    const asides = Array.from(document.querySelectorAll("aside")).filter((el) => el.getBoundingClientRect().width > 0);
    const rail = asides.sort((x, y) => y.getBoundingClientRect().left - x.getBoundingClientRect().left)[0] ?? null;
    const h1 = document.querySelector("main h1");
    const m = rect(main);
    const a = asides.length > 1 ? rect(rail) : null;
    const h = rect(h1);
    return {
      deviceWidth,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      main: m,
      rightRail: a,
      h1: h,
      // The rail's box covers part of <main>'s box (it is a sibling column, so any intersection is an overlap).
      railOverlapsMainPx: m && a ? Math.max(0, Math.min(m.right, a.right) - Math.max(m.left, a.left)) : 0,
      // The heading runs past the right edge of <main> (clipped, or pushing the page wider).
      h1OverflowPx: h && m ? Math.max(0, h.right - m.right) : 0,
      // Content wider than <main>: it runs on under the right rail (sticky, z-index 2000) and off-screen.
      mainOverflowPx: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
    };
  }, deviceWidth);
}
