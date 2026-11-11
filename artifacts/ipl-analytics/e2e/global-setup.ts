/**
 * Warm-up before the checks: a cold Vite dev server compiles each lazy page chunk on first request, and the API
 * builds its Decision Intelligence caches synchronously right after it starts listening. Without this, the first
 * parallel visits sit on "Loading…" for tens of seconds and time out. Every route is opened once, sequentially;
 * nothing is asserted here.
 */
import { chromium, type FullConfig } from "@playwright/test";
import { loadRoutes } from "./routes";

export default async function globalSetup(config: FullConfig) {
  const use = config.projects[0].use;
  const browser = await chromium.launch({ channel: use.channel });
  const page = await browser.newPage({ baseURL: use.baseURL });
  const t0 = Date.now();
  for (const route of loadRoutes()) {
    try {
      await page.goto(route.path, { waitUntil: "load", timeout: 120_000 });
      await page.locator("h1, h2, h3").first().waitFor({ timeout: 120_000 });
    } catch {
      // A route that never renders is reported by the smoke test itself.
    }
  }
  await browser.close();
  console.log(`[e2e] warm-up: ${loadRoutes().length} routes in ${Math.round((Date.now() - t0) / 1000)} s`);
}
