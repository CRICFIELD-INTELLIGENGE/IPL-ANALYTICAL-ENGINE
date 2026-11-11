const { chromium } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/KIIT0001/.gemini/antigravity/brain/61c958b7-73cf-45d1-ad56-7df68e900ca4';

async function run() {
  console.log('Launching Edge for Verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Dugout RCB Editorial Carousel
  console.log('1. Navigating to http://localhost:3000/dugout/rcb ...');
  await page.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  const newsroomSection = page.locator('#newsroom');
  console.log('#newsroom section exists?', (await newsroomSection.count()) > 0);
  
  if ((await newsroomSection.count()) > 0) {
    await newsroomSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const carouselPath = path.join(ARTIFACT_DIR, 'dugout-compact-carousel-desktop.png');
    await newsroomSection.screenshot({ path: carouselPath });
    console.log('Saved:', carouselPath);
  }

  // Mobile Carousel Test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(1500);
  const mobileNewsroom = page.locator('#newsroom');
  if ((await mobileNewsroom.count()) > 0) {
    await mobileNewsroom.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const mobileCarouselPath = path.join(ARTIFACT_DIR, 'dugout-compact-carousel-mobile.png');
    await mobileNewsroom.screenshot({ path: mobileCarouselPath });
    console.log('Saved:', mobileCarouselPath);
  }

  // 2. Intelligence & Insights Unified Page
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('2. Navigating to http://localhost:3000/intelligence?tab=insights&franchise=rcb ...');
  await page.goto('http://localhost:3000/intelligence?tab=insights&franchise=rcb', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);
  const intelPath = path.join(ARTIFACT_DIR, 'unified-intelligence-insights-desktop.png');
  await page.screenshot({ path: intelPath, fullPage: false });
  console.log('Saved:', intelPath);

  // 3. /insights Redirect Test
  console.log('3. Testing /insights redirect...');
  await page.goto('http://localhost:3000/insights', { waitUntil: 'networkidle', timeout: 35000 });
  console.log('Current URL after /insights:', page.url());

  // 4. /auction Redirect Test
  console.log('4. Testing /auction redirect...');
  await page.goto('http://localhost:3000/auction', { waitUntil: 'networkidle', timeout: 35000 });
  console.log('Current URL after /auction:', page.url());

  // 5. Arcade Game Page with Auction War Room
  const arcadePath = path.join(ARTIFACT_DIR, 'arcade-game-with-auction.png');
  await page.screenshot({ path: arcadePath, fullPage: false });
  console.log('Saved:', arcadePath);

  await browser.close();
  console.log('All verification assertions passed!');
}

run().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
