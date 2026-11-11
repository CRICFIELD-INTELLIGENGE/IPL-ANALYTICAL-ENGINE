const { chromium } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/KIIT0001/.gemini/antigravity/brain/61c958b7-73cf-45d1-ad56-7df68e900ca4';

async function run() {
  console.log('Launching Edge for Redesigned Intelligence & Insights test...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Desktop 1440px
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/intelligence ...');
  await page.goto('http://localhost:3000/intelligence', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  const desktopHeroPath = path.join(ARTIFACT_DIR, 'intelligence-hub-desktop-hero.png');
  await page.screenshot({ path: desktopHeroPath, fullPage: false });
  console.log('Saved:', desktopHeroPath);

  // Scroll down to the articles grid
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1000);
  const desktopGridPath = path.join(ARTIFACT_DIR, 'intelligence-hub-desktop-grid.png');
  await page.screenshot({ path: desktopGridPath, fullPage: false });
  console.log('Saved:', desktopGridPath);

  // 2. Mobile 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/intelligence', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(1500);

  const mobileHeroPath = path.join(ARTIFACT_DIR, 'intelligence-hub-mobile-hero.png');
  await page.screenshot({ path: mobileHeroPath, fullPage: false });
  console.log('Saved:', mobileHeroPath);

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(800);
  const mobileGridPath = path.join(ARTIFACT_DIR, 'intelligence-hub-mobile-grid.png');
  await page.screenshot({ path: mobileGridPath, fullPage: false });
  console.log('Saved:', mobileGridPath);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
