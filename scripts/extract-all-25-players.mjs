import puppeteer from '../node_modules/.pnpm/puppeteer-core@25.0.2/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_DIR = path.resolve('artifacts/ipl-analytics/public/players/rcb-2024');

const data = JSON.parse(fs.readFileSync('scratch/rcb_2024_bff_squad.json', 'utf8'));
const players = data.data.squad.players;

async function main() {
  console.log(`Extracting all ${players.length} RCB 2024 players via in-page image loader...`);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Go to iplt20 domain so same-origin canvas works
  await page.goto('https://www.iplt20.com/teams/royal-challengers-bengaluru/squad?season=2024', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  const results = [];
  for (const p of players) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = `${slug}-rcb-2024-raw.png`;
    const dest = path.join(TARGET_DIR, filename);

    // Try loading both the Next.js optimized URL and direct asset URL in page
    const candidateUrls = [
      `https://www.iplt20.com/_next/image?url=%2Fapi%2Fteam-assets%3Fpathname%3Dplayer%252F8190%252F2138%252F${p.externalId}.png%26brand%3Dipl&w=750&q=75`,
      `https://www.iplt20.com/_next/image?url=%2Fapi%2Fteam-assets%3Fpathname%3Dplayer%252F8190%252F2138%252F${p.externalId}.png%26brand%3Dipl&w=384&q=75`,
      p.imageUrl
    ];

    console.log(`Processing ${p.name} (ID: ${p.externalId})...`);
    const base64Data = await page.evaluate(async (urls) => {
      for (const u of urls) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const loaded = await new Promise((res, rej) => {
            img.onload = () => res(true);
            img.onerror = () => res(false);
            img.src = u;
          });
          if (loaded && img.naturalWidth > 50) {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return {
              success: true,
              dataUrl: canvas.toDataURL('image/png'),
              width: img.naturalWidth,
              height: img.naturalHeight,
              usedUrl: u
            };
          }
        } catch (e) {}
      }
      return { success: false };
    }, candidateUrls);

    if (base64Data.success && base64Data.dataUrl) {
      const b64 = base64Data.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
      console.log(`  -> SUCCESS (${base64Data.width}x${base64Data.height}) saved to ${filename}`);
      results.push({ name: p.name, slug, id: p.externalId, filename, width: base64Data.width, height: base64Data.height, status: 'OK' });
    } else {
      console.log(`  -> FAILED for ${p.name}`);
      results.push({ name: p.name, slug, id: p.externalId, filename, status: 'FAILED' });
    }
  }

  await browser.close();
  fs.writeFileSync('scratch/rcb_2024_download_results.json', JSON.stringify(results, null, 2));
  console.log(`Extraction complete: ${results.filter(r => r.status === 'OK').length} / ${players.length} successful!`);
}

main().catch(console.error);
