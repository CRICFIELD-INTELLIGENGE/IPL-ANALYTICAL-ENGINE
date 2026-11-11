const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const base = process.env.E2E_BASE_URL || "http://localhost:3000";
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/feed/storylines`);
    await page.locator(".sl-story-card").first().waitFor();
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".sl-question-grid>article").count(), 10);
    assert.equal(await page.locator(".sl-story-card").count(), 9);
    assert(new Set(await page.locator(".sl-card-media>span").allTextContents()).size >= 8, "The opening selection covers different franchises");
    await page.locator(".sl-load-more").click();
    assert.equal(await page.locator(".sl-story-card").count(), 18);
    await page.locator(".sl-franchise-selector").getByRole("button", { name: "MI", exact: true }).click();
    await page.locator(".sl-topic-tabs").getByRole("button", { name: "Beyond the boundary", exact: true }).click();
    assert((await page.locator(".sl-card-media>span").allTextContents()).every(code => code === "MI"));
    assert((await page.locator(".sl-card-copy>span").allTextContents()).every(topic => topic === "THE HUMAN SIDE"));
    await page.getByRole("textbox", { name: "Search storylines" }).fill("no-story-matches-this-phrase");
    await page.getByRole("heading", { name: "No stories match this selection." }).waitFor();
    await page.getByRole("button", { name: "Clear story search" }).click();
    const bookmark = page.locator(".sl-card-media>button").first();
    await bookmark.click();
    assert.equal(await bookmark.getAttribute("aria-pressed"), "true");
    await page.reload();
    await page.locator(".sl-story-card").first().waitFor();
    assert.equal(await page.locator(".sl-card-media>button").first().getAttribute("aria-pressed"), "true", "Saved stories survive reload");
    await page.locator(".sl-edition-strip>button").click();
    assert.equal(await page.locator(".sl-story-card").count(), 1);
    await page.locator(".sl-card-media>button").first().click();
    await page.getByRole("heading", { name: "Your next read is waiting." }).waitFor();
    await page.getByRole("button", { name: "Explore all stories", exact: true }).click();
    await page.locator(".sl-story-card").first().waitFor();
    await page.locator(".sl-franchise-selector").getByRole("button", { name: "SRH", exact: true }).click();
    const intelligence = page.locator(".sl-route-panel>a").nth(1);
    assert.match(await intelligence.getAttribute("href"), /franchise=srh&angle=future/);
    const dugout = page.locator(".sl-route-panel>a").nth(2);
    assert.equal(await dugout.getAttribute("href"), "/dugout/srh#library");
    await intelligence.click();
    await page.waitForURL(/\/intelligence\?franchise=srh&angle=future/);
    await page.getByText("Sunrisers Hyderabad", { exact: true }).first().waitFor();
    await page.goto(`${base}/feed/storylines?team=SRH`);
    await page.locator(".sl-route-panel").waitFor();
    await page.locator(".sl-route-panel>a").nth(2).click();
    await page.waitForURL(/\/dugout\/srh#library/);
    await page.locator("#library").waitFor({ timeout: 60000 });
    await page.goto(`${base}/feed/storylines?team=CSK&topic=legacy`);
    await page.locator(".sl-story-card").first().waitFor();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}px`);
      assert(await page.locator(".sl-cover h1").evaluate(node => node.scrollWidth <= node.clientWidth), `Headline fits at ${width}px`);
    }
    const pressed = page.locator(".sl-topic-tabs").getByRole("button", { name: "The next era", exact: true });
    await pressed.focus();
    await page.keyboard.press("Enter");
    assert.equal(await pressed.getAttribute("aria-pressed"), "true");
    assert.deepEqual(errors, []);
    console.log("Passed: balanced editorial selection, team/topic/search filters, pagination, saved reading list persistence, empty states, keyboard controls, Intelligence and Dugout navigation, and five screen widths.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
