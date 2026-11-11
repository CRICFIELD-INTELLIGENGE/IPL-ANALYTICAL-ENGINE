import puppeteer from '../node_modules/.pnpm/puppeteer-core@25.0.2/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_DIR = path.resolve('artifacts/ipl-analytics/public/players/rcb-2024');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function main() {
  console.log('Launching headless Edge for RCB 2024 extraction...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1600,1200']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.iplt20.com/teams/royal-challengers-bengaluru/squad?season=2024 ...');
  await page.goto('https://www.iplt20.com/teams/royal-challengers-bengaluru/squad?season=2024', {
    waitUntil: 'networkidle2',
    timeout: 45000
  });

  // Accept cookies if present
  try {
    const cookieBtn = await page.$('button[id*="cookie"], button:has-text("Accept All Cookies")');
    if (cookieBtn) {
      await cookieBtn.click();
      console.log('Clicked Accept Cookies');
    }
  } catch (e) {}

  // Scroll down to load all images and trigger lazy-loading
  console.log('Scrolling down to trigger full squad load...');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await new Promise(r => setTimeout(r, 600));
  }

  // Wait 3 seconds for all images to settle
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot after scroll
  await page.screenshot({ path: 'scratch/iplt20_2024_full_scroll.png', fullPage: true });
  console.log('Saved full-page screenshot');

  // Extract all player cards
  const players = await page.evaluate(() => {
    const results = [];
    // Each squad card usually has an img with alt=playerName
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      if (img.src && img.src.includes('player') && img.alt && img.alt.length > 2) {
        // Draw to canvas to extract clean base64 PNG
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        try {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          results.push({
            name: img.alt.trim(),
            src: img.src,
            width: canvas.width,
            height: canvas.height,
            dataUrl
          });
        } catch (e) {
          results.push({
            name: img.alt.trim(),
            src: img.src,
            width: canvas.width,
            height: canvas.height,
            error: e.message
          });
        }
      }
    }
    return results;
  });

  console.log(`Extracted ${players.length} player images from DOM!`);
  const saved = [];
  for (const p of players) {
    if (p.dataUrl && p.dataUrl.startsWith('data:image/png;base64,')) {
      const base64 = p.dataUrl.replace(/^data:image\/png;base64,/, '');
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const filename = `${slug}-rcb-2024-raw.png`;
      const filePath = path.join(TARGET_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      console.log(`Saved: ${p.name} (${p.width}x${p.height}) -> ${filename}`);
      saved.push({ name: p.name, slug, filename, width: p.width, height: p.height });
    } else {
      console.log(`Could not get canvas data for ${p.name}: ${p.error || 'no dataUrl'}`);
    }
  }

  fs.writeFileSync('scratch/rcb_2024_extracted_manifest.json', JSON.stringify(saved, null, 2));
  console.log(`Total saved to ${TARGET_DIR}: ${saved.length}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
