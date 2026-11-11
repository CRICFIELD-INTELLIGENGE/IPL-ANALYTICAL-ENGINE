import puppeteer from '../node_modules/.pnpm/puppeteer-core@25.0.2/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('Launching headless Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const interceptedUrls = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('player') || url.includes('squad') || url.includes('team-assets') || url.includes('headshot')) {
      interceptedUrls.push(url);
    }
  });

  console.log('Navigating to https://www.iplt20.com/teams/royal-challengers-bengaluru/squad?season=2024 ...');
  try {
    await page.goto('https://www.iplt20.com/teams/royal-challengers-bengaluru/squad?season=2024', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }

  // Wait extra 3 seconds for client hydration
  await new Promise(r => setTimeout(r, 4000));

  // Extract all squad cards and image elements
  const data = await page.evaluate(() => {
    const results = [];
    // Find all images
    const imgs = Array.from(document.querySelectorAll('img'));
    const imgData = imgs.map(i => ({
      src: i.src,
      alt: i.alt,
      className: i.className
    })).filter(i => i.src && (i.src.includes('player') || i.src.includes('team-assets') || i.src.includes('bcci') || i.src.includes('headshot')));

    // Find any squad cards or player names
    const textNodes = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, span, p, a, div[data-testid*="squad"]'));
    const cardTexts = textNodes.map(t => t.textContent?.trim()).filter(Boolean);

    return { imgData, sampleTexts: cardTexts.slice(0, 100), fullHtmlLength: document.documentElement.outerHTML.length };
  });

  console.log('Page loaded. HTML length:', data.fullHtmlLength);
  console.log('Matching images found:', data.imgData.length);
  console.log(JSON.stringify(data.imgData, null, 2));

  fs.writeFileSync('scratch/iplt20_2024_scraped_images.json', JSON.stringify(data.imgData, null, 2));
  fs.writeFileSync('scratch/iplt20_2024_intercepted_urls.json', JSON.stringify(interceptedUrls, null, 2));

  // Also save screenshot to scratch
  await page.screenshot({ path: 'scratch/iplt20_2024_page.png', fullPage: false });
  console.log('Screenshot saved to scratch/iplt20_2024_page.png');

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
