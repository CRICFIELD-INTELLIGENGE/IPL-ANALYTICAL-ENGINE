const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const base = process.env.E2E_BASE_URL || "http://localhost:3000";
    const open = async code => {
      await page.goto(`${base}/dugout/${code}`);
      await page.locator("#milestones [role=tabpanel]").waitFor();
    };
    await open("KKR");
    await page.getByRole("tab", { name: "2021 2021 IPL Finalists", exact: true }).click();
    assert.match(await page.locator(".fm-memory-stage>.fm-event-photo").getAttribute("src"), /2021-kkr/);
    assert.match(await page.locator(".fm-photo-panel figcaption").innerText(), /Gill.*Iyer/);
    const expand = page.getByRole("button", { name: "Enlarge KKR 2021 photograph" });
    await expand.click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert(await expand.evaluate(button => button === document.activeElement), "Closing the photo restores focus");

    await open("CSK");
    await page.getByRole("tab", { name: "2021 2021 IPL Champions", exact: true }).click();
    assert.match(await page.locator(".fm-memory-stage>.fm-event-photo").getAttribute("src"), /2021-csk/);
    await open("SRH");
    await page.getByRole("button", { name: "Show standing showcase 2" }).click();
    assert(await page.locator(".fm-memory-stage.cutout").count());
    await page.getByRole("tab", { name: "2024 2024 IPL Finalists", exact: true }).click();
    assert.match(await page.locator(".fm-memory-stage>.fm-event-photo").getAttribute("src"), /showcase-2024-srh/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator(".fm-memory-stage>.fm-event-photo").evaluate(img => getComputedStyle(img).transform), "none");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Layout fits ${width}px`);
    }

    const audit = await page.evaluate(async () => {
      const { TEAM_REGISTRY } = await import("/src/lib/team-context.tsx");
      const { buildFranchiseMilestones } = await import("/src/lib/franchise-milestones.ts");
      const { milestonePhotography } = await import("/src/lib/milestone-photography.ts");
      const matches = await (await fetch("/api/ipl/matches")).json();
      const report = [];
      for (const team of Object.values(TEAM_REGISTRY)) {
        const record = await (await fetch(`/api/dugout/franchise?team=${team.id}`)).json();
        const moments = buildFranchiseMilestones(team.id, record, matches);
        const photos = milestonePhotography(team, moments);
        for (const moment of moments) for (const frame of photos.get(moment.id) ?? []) {
          const photo = frame.eventPhoto;
          if (!photo.teams.includes(team.id) || photo.season !== moment.season) throw Error(`${team.id}/${moment.id}: mismatched photo`);
          if (moment.id !== "most-season-wins" && photo.matchDate !== moment.match?.date.slice(0, 10)) throw Error(`${team.id}/${moment.id}: wrong occasion`);
          if (moment.kind === "finalist" && photo.depiction === "championship") throw Error(`${team.id}/${moment.id}: opponent's celebration`);
        }
        report.push({ team: team.id, moments: moments.length, mapped: photos.size });
      }
      return report;
    });
    const photos = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/milestone-event-photos.json"), "utf8"));
    for (const photo of photos.filter(photo => photo.teams.length)) {
      assert(fs.existsSync(path.join(__dirname, "../public", photo.src)), photo.src);
      assert(photo.width > 0 && photo.height > 0, `Dimensions recorded for ${photo.src}`);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(audit));
    console.log("Passed: team/result mapping, KKR/CSK 2021 regression, photo viewer, cutout showcase, reduced motion, five screen widths.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
