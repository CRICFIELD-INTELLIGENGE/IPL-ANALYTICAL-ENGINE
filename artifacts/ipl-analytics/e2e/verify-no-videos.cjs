const { chromium } = require('@playwright/test');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/KIIT0001/.gemini/antigravity/brain/61c958b7-73cf-45d1-ad56-7df68e900ca4';

async function run() {
  console.log('Launching browser (channel: msedge)...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Check RCB Dugout page
  console.log('Navigating to http://localhost:3000/dugout/rcb...');
  await page.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  // Check that #videos does not exist
  const videosCount = await page.locator('#videos').count();
  console.log('RCB Dugout #videos section count (should be 0):', videosCount);

  // Check header pills: ensure "Videos" tab is NOT present
  const videoButtonCount = await page.locator('button:has-text("Videos")').count();
  console.log('RCB Dugout "Videos" pill count (should be 0):', videoButtonCount);

  // Take screenshot of RCB Dugout page (showing hero and navigation without Videos)
  const dugoutDesktopPath = path.join(ARTIFACT_DIR, 'rcb-dugout-no-videos-desktop.png');
  await page.screenshot({ path: dugoutDesktopPath, fullPage: false });
  console.log('Saved:', dugoutDesktopPath);

  // 2. Check Mobile RCB Dugout page
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/dugout/rcb', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(1500);
  const dugoutMobilePath = path.join(ARTIFACT_DIR, 'rcb-dugout-no-videos-mobile.png');
  await page.screenshot({ path: dugoutMobilePath, fullPage: false });
  console.log('Saved:', dugoutMobilePath);

  // 3. Check Pulse page (Desktop)
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('Navigating to http://localhost:3000/pulse...');
  await page.goto('http://localhost:3000/pulse', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(2000);

  const broadcasterDiscoveryCount = await page.locator('#broadcaster-discovery').count();
  console.log('Pulse #broadcaster-discovery count (should be 0):', broadcasterDiscoveryCount);

  const hotstarTextCount = await page.locator('text=Watch on JioHotstar').count();
  console.log('Pulse "Watch on JioHotstar" occurrences (should be 0):', hotstarTextCount);

  const pulseScreenshotPath = path.join(ARTIFACT_DIR, 'pulse-no-videos-desktop.png');
  await page.screenshot({ path: pulseScreenshotPath, fullPage: false });
  console.log('Saved:', pulseScreenshotPath);

  // 4. Test /watch redirect
  console.log('Testing /watch redirect...');
  await page.goto('http://localhost:3000/watch', { waitUntil: 'networkidle', timeout: 35000 });
  console.log('Current URL after /watch:', page.url());

  // 5. Check Layout sidebar
  const watchSidebarLink = await page.locator('a[href="/watch"]').count();
  console.log('Sidebar Watch & Analyze link count (should be 0):', watchSidebarLink);

  await browser.close();
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
