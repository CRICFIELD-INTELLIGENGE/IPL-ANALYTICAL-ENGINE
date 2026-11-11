const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/KIIT0001/.gemini/antigravity/brain/61c958b7-73cf-45d1-ad56-7df68e900ca4';

async function run() {
  console.log('Launching Chromium for RCB Dugout Video & UI verification...');
  const browser = await chromium.launch({ headless: true });
  
  // ── 1. Desktop 1440px Run ──
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await desktopContext.newPage();

  console.log('Navigating to http://localhost:3000/dugout/rcb ...');
  await page.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take Desktop Top (Hero + Squad)
  const heroScreenshotPath = path.join(ARTIFACT_DIR, 'rcb-dugout-desktop-hero.png');
  await page.screenshot({ path: heroScreenshotPath, fullPage: false });
  console.log('Saved:', heroScreenshotPath);

  // Scroll to Videos section
  const videoSection = page.locator('#videos');
  if (await videoSection.count() > 0) {
    await videoSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const videoScreenshotPath = path.join(ARTIFACT_DIR, 'rcb-dugout-desktop-video-gallery.png');
    await videoSection.screenshot({ path: videoScreenshotPath });
    console.log('Saved:', videoScreenshotPath);
  }

  // Scroll to Timeline section
  const timelineSection = page.locator('#history');
  if (await timelineSection.count() > 0) {
    await timelineSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const timelineScreenshotPath = path.join(ARTIFACT_DIR, 'rcb-dugout-desktop-timeline.png');
    await timelineSection.screenshot({ path: timelineScreenshotPath });
    console.log('Saved:', timelineScreenshotPath);
  }

  // ── 2. Mobile 390px Run ──
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Navigating mobile viewport to http://localhost:3000/dugout/rcb ...');
  await mobilePage.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);

  const mobileHeroScreenshotPath = path.join(ARTIFACT_DIR, 'rcb-dugout-mobile-hero.png');
  await mobilePage.screenshot({ path: mobileHeroScreenshotPath, fullPage: false });
  console.log('Saved:', mobileHeroScreenshotPath);

  const mobileVideoSection = mobilePage.locator('#videos');
  if (await mobileVideoSection.count() > 0) {
    await mobileVideoSection.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(1000);
    const mobileVideoScreenshotPath = path.join(ARTIFACT_DIR, 'rcb-dugout-mobile-video-gallery.png');
    await mobileVideoSection.screenshot({ path: mobileVideoScreenshotPath });
    console.log('Saved:', mobileVideoScreenshotPath);
  }

  // Extract video cards data for Phase 7 report
  const cardsData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#videos [class*="group relative rounded-2xl"]'));
    return cards.map(c => {
      const title = c.querySelector('h4')?.textContent?.trim() || '';
      const desc = c.querySelector('p')?.textContent?.trim() || '';
      const watchBtn = c.querySelector('a[href*="hotstar.com"]');
      const inReviewPill = c.querySelector('[title*="verification"]') || c.querySelector('[title*="under review"]');
      const href = watchBtn ? watchBtn.getAttribute('href') : null;
      const isExact = href ? href.includes('/watch') : false;
      const hasThumb = Boolean(c.querySelector('img[src]'));
      const hasCanvas = Boolean(c.querySelector('svg'));
      return {
        title,
        desc,
        href,
        isExact,
        hasThumb,
        hasCanvas,
        hasInReview: Boolean(inReviewPill)
      };
    });
  });

  console.log('EXTRACTED_CARDS_DATA_JSON=' + JSON.stringify(cardsData));

  await browser.close();
  console.log('Verification run completed successfully.');
}

run().catch(err => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
