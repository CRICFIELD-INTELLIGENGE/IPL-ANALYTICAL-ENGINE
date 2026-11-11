/**
 * Route smoke: every route in docs/day07/route-api-matrix.json, at desktop (1280×800) and mobile (375×812).
 * Each must render a non-empty <main> with a visible heading, log no console errors or uncaught errors / unhandled
 * rejections, get no /api or /data response >= 400, show no broken image, and (mobile) not scroll horizontally.
 */
import { test, expect } from "@playwright/test";
import { loadRoutes } from "./routes";
import { brokenImages, layoutMetrics, watchPage } from "./support";

/**
 * Routes that scroll horizontally at 375 px today (first measured with a real mobile viewport on 2026-10-19,
 * page width in brackets). Open defect, not fixed by this suite: test infrastructure only. E2E_STRICT_LAYOUT=1
 * applies the normal rule to them too.
 */
const KNOWN_MOBILE_OVERFLOW = new Set([
  "/scout", // 378
  "/scout/player/456", // 415
  "/scores", // 540
  "/players/v-kohli", // 1090
  "/players/wanindu-hasaranga", // 1090
  "/venues/wankhede-stadium", // 399
  "/teams/mumbai-indians", // 653
  "/shop", // 381
]);

for (const route of loadRoutes()) {
  test(`smoke ${route.path}`, async ({ page }, info) => {
    const watch = watchPage(page);
    await page.goto(route.path, { waitUntil: "load" });

    // Pages render inside the Layout's <main>. The 404 page is standalone (no <main>), so it is checked on <body>;
    // that also covers /photo-pipeline in a production build, where the admin pages are off and it is a 404.
    const heading = page.locator("main :is(h1, h2, h3), body:not(:has(main)) :is(h1, h2, h3)").first();
    await expect(heading, "a visible heading").toBeVisible();
    const main = page.locator((await page.locator("main").count()) ? "main" : "body").first();
    await watch.settle();
    // Images that are already in the layout get a moment to load or fall back.
    await page.waitForTimeout(500);

    const mainText = (await main.innerText().catch(() => "")).trim();
    expect(mainText.length, "<main> has text").toBeGreaterThan(0);
    if (route.notFound) await expect(page.getByText(/404|not found/i).first()).toBeVisible();

    const broken = await brokenImages(page);
    const errors = {
      badResponses: watch.badResponses,
      consoleErrors: watch.consoleErrors,
      pageErrors: watch.pageErrors,
      brokenImages: broken,
    };

    if (info.project.name === "mobile") {
      const metrics = await layoutMetrics(page, page.viewportSize()!.width);
      info.annotations.push({ type: "layout", description: JSON.stringify(metrics) });
      await info.attach("mobile-viewport", { body: await page.screenshot(), contentType: "image/png" });
      if (KNOWN_MOBILE_OVERFLOW.has(route.path) && !process.env.E2E_STRICT_LAYOUT) {
        // Tracked defect: assert it is still there, so the list is trimmed the day a page is fixed.
        info.annotations.push({ type: "known-defect", description: "mobile horizontal overflow (defect register S7-5)" });
        expect
          .soft(metrics.scrollWidth, "KNOWN overflow (S7-5) no longer reproduces: remove this route from KNOWN_MOBILE_OVERFLOW")
          .toBeGreaterThan(metrics.deviceWidth);
      } else {
        expect.soft(metrics.scrollWidth, "no page-level horizontal scroll").toBeLessThanOrEqual(metrics.deviceWidth);
      }
    }

    expect.soft(errors.badResponses, "no /api or /data response >= 400").toEqual([]);
    expect.soft(errors.consoleErrors, "no console errors").toEqual([]);
    expect.soft(errors.pageErrors, "no uncaught errors / unhandled rejections").toEqual([]);
    expect.soft(errors.brokenImages, "no broken images").toEqual([]);
  });
}
