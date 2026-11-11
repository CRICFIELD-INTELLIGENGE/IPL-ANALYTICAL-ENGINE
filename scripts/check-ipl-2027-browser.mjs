import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const { chromium } = createRequire(
  new URL("../artifacts/ipl-analytics/package.json", import.meta.url),
)("@playwright/test");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const root = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3078";
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/**", (r) =>
  r.fulfill({
    status: 503,
    contentType: "application/json",
    body: '{"error":"Backend unavailable for static fallback test"}',
  }),
);
await page.goto(root + "/feed");
await page
  .getByText("Explore 2027 Intel", { exact: true })
  .waitFor({ timeout: 120000 });
await page.waitForTimeout(1500);
await page.screenshot({
  path: "docs/ipl-2027/screenshots/feed-after-desktop.png",
});
console.log("Feed captured");
await page.getByRole("button", { name: /decline/i }).click();
await page.getByText("Explore 2027 Intel", { exact: true }).click();
console.log("Hub navigation", page.url());
await page
  .getByRole("heading", { name: "IPL 2027 Intelligence Hub", exact: true })
  .waitFor({ timeout: 120000 });
await page
  .getByRole("heading", { name: "Tournament preparation timeline" })
  .waitFor({ timeout: 120000 });
for (const team of [
  "CSK",
  "MI",
  "RCB",
  "KKR",
  "SRH",
  "RR",
  "DC",
  "PBKS",
  "GT",
  "LSG",
]) {
  console.log("Checking", team);
  await page.getByLabel("Franchise", { exact: true }).selectOption(team);
  await page
    .getByRole("heading", { name: "Tournament preparation timeline" })
    .waitFor();
  assert.ok(page.url().includes("team=" + team));
}
await page.getByLabel("Franchise", { exact: true }).selectOption("RCB");
console.log("Testing retention");
await page.getByRole("tab", { name: "Retention Lab", exact: true }).click();
await page
  .getByRole("heading", { name: "Retention Decision Lab", exact: true })
  .waitFor();
const decision = page.locator('select[aria-label^="Decision for "]').first();
const label = await decision.getAttribute("aria-label");
await decision.selectOption("release");
await page.getByRole("button", { name: "Save scenario", exact: true }).click();
await page
  .getByText("Scenario saved on this device.", { exact: true })
  .waitFor();
await page.reload();
await page
  .getByRole("heading", { name: "Retention Decision Lab", exact: true })
  .waitFor({ timeout: 120000 });
assert.equal(
  await page.getByLabel(label, { exact: true }).inputValue(),
  "release",
);
await page.getByLabel("Franchise", { exact: true }).selectOption("MI");
await page
  .getByRole("heading", { name: "Retention Decision Lab", exact: true })
  .waitFor();
assert.equal(
  await page
    .locator('select[aria-label^="Decision for "]')
    .first()
    .inputValue(),
  "undecided",
);
await page.getByLabel("Franchise", { exact: true }).selectOption("RCB");
await page.getByLabel(label, { exact: true }).waitFor();
assert.equal(
  await page.getByLabel(label, { exact: true }).inputValue(),
  "release",
);
await page
  .getByRole("button", { name: "Reset decisions", exact: true })
  .click();
assert.equal(
  await page.getByLabel(label, { exact: true }).inputValue(),
  "undecided",
);
await page.getByLabel("Search squad players").fill("zzzznomatch");
await page
  .getByText("No players match these filters.", { exact: true })
  .waitFor();
await page.getByLabel("Search squad players").fill("");
await page.screenshot({
  path: "docs/ipl-2027/screenshots/hub-retention-desktop.png",
  fullPage: true,
});
await page
  .getByRole("tab", { name: "Squad Gap Analyzer", exact: true })
  .click();
await page.getByLabel("bowler target", { exact: true }).fill("10");
assert.equal(
  await page.getByLabel("bowler target", { exact: true }).inputValue(),
  "10",
);
await page.getByRole("tab", { name: "Franchise Brief", exact: true }).click();
await page
  .getByRole("heading", {
    name: "RCB — 2027 Franchise Intelligence Brief",
    exact: true,
  })
  .waitFor();
await page.screenshot({
  path: "docs/ipl-2027/screenshots/hub-brief-desktop.png",
  fullPage: true,
});
await page.getByRole("tab", { name: "Scout & Tactics", exact: true }).click();
await page
  .getByText("Phase analytics unavailable from the current backend.", {
    exact: false,
  })
  .waitFor({ timeout: 60000 });
await page.getByTitle("Expand Intelligence", { exact: true }).click();
await page.getByText("IPL 2027 Overview", { exact: true }).waitFor();
await page.getByRole("link", { name: "Retention Lab", exact: true }).click();
assert.ok(page.url().includes("team=RCB"));
await page.getByTitle("Collapse Intelligence", { exact: true }).click();
await page.getByTitle("Switch Franchise Identity", { exact: true }).click();
await page.getByRole("button").filter({ has: page.getByText("MI", { exact: true }) }).click();
await page.waitForURL(/team=MI/);
assert.equal(await page.getByLabel("Franchise", { exact: true }).inputValue(), "MI");
for (const code of ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"]) {
  await page.goto(`${root}/feed/ipl-2027?team=${code}&module=brief`);
  await page.getByRole("heading", { name: `${code} — 2027 Franchise Intelligence Brief`, exact: true }).waitFor();
}
await page.emulateMedia({ media: "print" });
await page.screenshot({ path: "docs/ipl-2027/screenshots/hub-brief-print.png", fullPage: true });
await page.emulateMedia({ media: "screen" });
const empty = await browser.newPage();
empty.setDefaultTimeout(30000);
await empty.route("**/api/**", r => r.fulfill({ status: 503, body: "{}" }));
await empty.route("**/data/official-squads.json", r => r.fulfill({ contentType: "application/json", body: '{"source":"test empty state","retrievedAt":"2026-10-27","seasons":{}}' }));
await empty.route("**/data/squads-by-season.json", r => r.fulfill({ contentType: "application/json", body: "{}" }));
await empty.goto(`${root}/feed/ipl-2027?team=CSK`);
await empty.getByRole("heading", { name: "Squad data unavailable", exact: true }).waitFor();
await empty.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.route("**/api/**", (r) => r.fulfill({ status: 503, body: "{}" }));
await mobile.goto(root + "/feed");
await mobile
  .getByText("Explore 2027 Intel", { exact: true })
  .waitFor({ timeout: 120000 });
await mobile.waitForTimeout(1500);
await mobile.screenshot({
  path: "docs/ipl-2027/screenshots/feed-after-mobile.png",
});
await mobile.goto(root + "/feed/ipl-2027?team=RR&module=overview");
await mobile
  .getByRole("heading", { name: "Tournament preparation timeline" })
  .waitFor({ timeout: 120000 });
await mobile.emulateMedia({ media: "print" });
assert.equal(await mobile.getByRole("button", { name: /decline/i }).isVisible(), false, "Consent overlay must be hidden in print");
await mobile.emulateMedia({ media: "screen" });
await mobile.getByRole("button", { name: /decline/i }).click();
await mobile.waitForTimeout(500);
await mobile.screenshot({
  path: "docs/ipl-2027/screenshots/hub-overview-mobile.png",
  fullPage: true,
});
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
console.log("Mobile overflow:", overflow);
fs.writeFileSync(
  "docs/ipl-2027/browser-results.json",
  JSON.stringify(
    {
      errors,
      mobileOverflow: overflow,
      tests: [
        "ten franchises",
        "Feed entry",
        "save/reload",
        "team isolation",
        "reset",
        "empty search",
        "role targets",
        "shareable brief",
        "backend unavailable",
        "mobile rendering",
        "Navigator expansion and contextual links",
        "existing header franchise switcher",
        "all ten franchise briefs",
        "print brief",
        "empty squad data",
      ],
    },
    null,
    2,
  ),
);
assert.deepEqual(errors, []);
assert.equal(overflow, false, "New hub causes horizontal page overflow");
await browser.close();
console.log("Browser journey passed.");
