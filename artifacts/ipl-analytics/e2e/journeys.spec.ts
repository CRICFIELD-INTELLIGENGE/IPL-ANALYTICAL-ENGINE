/**
 * The interactive journeys from DAY-07-REPORT.md §3 (desktop only).
 * The auction runs on one global in-memory game in the API, so it is reset through the API afterwards.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { watchPage } from "./support";

async function auctionState(request: APIRequestContext) {
  const res = await request.get("/api/auction/state");
  expect(res.ok()).toBe(true);
  return (await res.json()) as { status: string; userTeamId: number | null; teams: { id: number; name: string; purse: number; squad: unknown[] }[] };
}

test("Scout: search Bumrah → suggestion → dossier", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/scout");
  const search = page.getByPlaceholder(/Search across all 6 leagues/);
  await search.fill("Bumrah");

  const suggestion = page.locator('a[href^="/scout/player/"]').filter({ hasText: /Bumrah/i }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  await expect(page).toHaveURL(/\/scout\/player\/[0-9a-z]+$/); // a Cricsheet id, e.g. 462411b3
  await expect(page.locator("h1").filter({ hasText: /Bumrah/i })).toBeVisible();
  await expect(page.getByText("Capped 2026")).toBeVisible();
  await watch.settle();
  expect(watch.badResponses).toEqual([]);
  expect(watch.pageErrors).toEqual([]);
  expect(watch.consoleErrors).toEqual([]);
});

test("AI Analyst Ask: 'Most runs in IPL 2025' → B Sai Sudharsan 759", async ({ page }) => {
  const watch = watchPage(page);
  await page.goto("/ai-analyst/ask");
  const input = page.getByPlaceholder("e.g. Most sixes at the death since 2023");
  await input.fill("Most runs in IPL 2025");
  await input.press("Enter");

  const topRow = page.locator("tr", { hasText: "B Sai Sudharsan" }).first();
  await expect(topRow).toBeVisible({ timeout: 30_000 });
  await expect(topRow).toContainText("759");
  await watch.settle();
  expect(watch.badResponses).toEqual([]);
  expect(watch.pageErrors).toEqual([]);
  expect(watch.consoleErrors).toEqual([]);
});

test.describe("Auction", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    await request.post("/api/auction/reset");
  });
  test.afterAll(async ({ request }) => {
    const res = await request.post("/api/auction/reset");
    expect(res.ok()).toBe(true);
  });

  test("select team → enter → start → pause → reset", async ({ page, request }) => {
    const watch = watchPage(page);
    await page.goto("/auction");

    await page.getByText("Single-Player Arena").click();
    const csk = page.locator("button", { hasText: "Franchise #2" }); // CSK, as on Day 7
    await csk.click();
    await expect(csk.locator("svg.lucide-check")).toBeVisible();
    const selected = page.waitForResponse((r) => r.url().endsWith("/api/auction/select-team"));
    await page.getByRole("button", { name: /ENTER AUCTION STAGE/ }).click();
    expect((await selected).status()).toBe(200);
    await expect.poll(async () => (await auctionState(request)).userTeamId).toBe(2);

    await page.getByRole("button", { name: /Start Auction Stage/ }).click();
    await expect.poll(async () => (await auctionState(request)).status).toBe("ACTIVE");

    await page.getByTitle("Pause Auction").click();
    await expect.poll(async () => (await auctionState(request)).status).toBe("PAUSED");

    await page.getByTitle("Reset Simulation").click();
    await expect.poll(async () => (await auctionState(request)).status).toBe("WAITING");
    const after = await auctionState(request);
    expect(after.userTeamId).toBeNull();
    for (const t of after.teams) {
      expect(t.purse, `${t.name} purse restored`).toBe(120);
      expect(t.squad, `${t.name} squad emptied`).toEqual([]);
    }
    // Back on the lobby screen.
    await expect(page.getByRole("button", { name: /ENTER AUCTION STAGE/ })).toBeVisible();

    expect(watch.badResponses).toEqual([]);
    expect(watch.pageErrors).toEqual([]);
    expect(watch.consoleErrors).toEqual([]);
  });
});
