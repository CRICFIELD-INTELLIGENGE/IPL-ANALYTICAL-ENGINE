/**
 * CricField browser smoke suite (Playwright). See e2e/README.md.
 *
 * By default the suite starts its OWN servers on dedicated ports, so it never collides with the dev servers in
 * .claude/launch.json (5055 / 3055):
 *   - API  :5065  `tsx src/index.ts` with CRICFIELD_DB_READONLY=1 (the warehouse is opened read-only, always)
 *   - web  :3066  production build into e2e/.dist, then `vite preview` proxying /api to :5065 (default)
 *          :3065  Vite dev server proxying /api to :5065 (E2E_MODE=dev: no build, but far slower per page)
 * Set E2E_BASE_URL to test servers that are already running instead (nothing is started then).
 */
import { defineConfig } from "@playwright/test";
import path from "node:path";

const here = import.meta.dirname;
const appDir = path.resolve(here, "..");
const apiDir = path.resolve(appDir, "..", "api-server");

const API_PORT = Number(process.env.E2E_API_PORT ?? 5065);
const mode = process.env.E2E_MODE === "dev" ? "dev" : "preview";
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? (mode === "preview" ? 3066 : 3065));
// Its own output folder, so the suite never overwrites the app's dist/.
const DIST = "e2e/.dist";
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://localhost:${WEB_PORT}`;

// The installed Google Chrome by default (no browser download needed). E2E_CHANNEL="" uses Playwright's bundled
// Chromium instead (`pnpm exec playwright install chromium` once).
const channel = process.env.E2E_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: here,
  outputDir: path.resolve(here, ".results"),
  globalSetup: path.resolve(here, "global-setup.ts"),
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS ?? 2),
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: path.resolve(here, ".report"), open: "never" }],
    ["json", { outputFile: path.resolve(here, ".results", "results.json") }],
  ],
  use: {
    baseURL,
    channel: channel || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testIgnore: /journeys\.spec\.ts/,
      use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
  ],
  webServer: external
    ? undefined
    : [
        {
          command: "pnpm exec tsx src/index.ts",
          cwd: apiDir,
          env: { PORT: String(API_PORT), CRICFIELD_DB_READONLY: "1" },
          url: `http://localhost:${API_PORT}/api/ipl/seasons`,
          reuseExistingServer: false,
          timeout: 180_000,
          stdout: "ignore",
          stderr: "pipe",
        },
        {
          command:
            mode === "preview"
              ? `pnpm exec vite build --config vite.config.ts --outDir ${DIST} --emptyOutDir && ` +
                `pnpm exec vite preview --config vite.config.ts --outDir ${DIST} --port ${WEB_PORT} --strictPort`
              : `pnpm exec vite --config vite.config.ts`,
          cwd: appDir,
          env: { PORT: String(WEB_PORT), VITE_BACKEND_PORT: String(API_PORT) },
          url: baseURL,
          reuseExistingServer: false,
          timeout: 300_000,
          stdout: "ignore",
          stderr: "pipe",
        },
      ],
});
