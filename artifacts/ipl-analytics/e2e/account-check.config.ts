import path from "node:path";
import { defineConfig } from "@playwright/test";

// Focused account suite: no cricket API needed; every Supabase request is mocked.
export default defineConfig({
  testDir: ".",
  testMatch: "account.spec.ts",
  timeout: 60_000,
  workers: 2,
  use: { baseURL: "http://127.0.0.1:3083", channel: "chrome" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true } },
  ],
  webServer: {
    cwd: path.resolve(import.meta.dirname, ".."),
    command: "pnpm exec vite --host 127.0.0.1 --port 3083 --strictPort",
    url: "http://127.0.0.1:3083",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
