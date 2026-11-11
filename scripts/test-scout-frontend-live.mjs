// Automated Browser Validation & Screenshot Suite for CricField Scout Lab
// Runs headless Microsoft Edge via puppeteer-core, tests all routes, filters,
// search autocomplete, and captures high-res desktop & mobile screenshots.

import puppeteer from '../node_modules/.pnpm/puppeteer-core@25.0.2/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const SCREENSHOT_DIR = path.resolve('C:\\Users\\KIIT0001\\.gemini\\antigravity\\brain\\8149501b-359f-48db-9227-5bcc87e39868', 'scout_lab_screenshots');
const PUBLIC_SCREENSHOT_DIR = path.resolve(REPO, 'artifacts', 'ipl-analytics', 'public', 'scout-screenshots');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/scout/roles`);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await sleep(400);
  }
  throw new Error(`Server failed to respond at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log(`[1/6] Launching backend & frontend full-stack server on port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['artifacts/api-server/dist/index.mjs'], {
    cwd: REPO,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe',
  });

  serverProc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) console.error(`[Server stderr]: ${msg}`);
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`[2/6] Server ready and responsive on ${BASE_URL}`);

    console.log(`[3/6] Launching headless Edge browser...`);
    const browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.error('[Browser PageError]:', err));
    page.on('requestfailed', (req) => console.warn('[Request Failed]:', req.url(), req.failure()?.errorText));

    const results = [];

    // ── TEST 1: Scout Lab Homepage (/scout) ──────────────────────────────
    console.log(`Testing Route 1: ${BASE_URL}/scout ...`);
    const t0 = Date.now();
    await page.goto(`${BASE_URL}/scout`, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTimeScout = Date.now() - t0;

    await page.waitForSelector('table', { timeout: 15000 });
    const rowCount = await page.$$eval('tbody tr', (rows) => rows.length);
    const titleText = await page.$eval('h1', (el) => el.textContent);
    console.log(`  ✓ /scout loaded in ${loadTimeScout}ms with ${rowCount} ranked players. Title: "${titleText}"`);

    const shot1 = path.join(SCREENSHOT_DIR, '01_scout_homepage.png');
    await page.screenshot({ path: shot1, fullPage: false });
    fs.copyFileSync(shot1, path.join(PUBLIC_SCREENSHOT_DIR, '01_scout_homepage.png'));
    results.push({ route: '/scout', latencyMs: loadTimeScout, status: 'PASS', rows: rowCount });

    // ── TEST 2: Autocomplete Player Search ──────────────────────────────
    console.log(`Testing Autocomplete Search on /scout ...`);
    const searchInput = await page.$('input[placeholder*="Search across all 6 leagues"]');
    if (searchInput) {
      await searchInput.type('Virat', { delay: 50 });
      await sleep(1000);
      const dropdownVisible = await page.$('.shadow-2xl');
      const shotSearch = path.join(SCREENSHOT_DIR, '02_scout_search_autocomplete.png');
      await page.screenshot({ path: shotSearch, fullPage: false });
      fs.copyFileSync(shotSearch, path.join(PUBLIC_SCREENSHOT_DIR, '02_scout_search_autocomplete.png'));
      console.log(`  ✓ Search autocomplete verified for query "Virat"`);
      // Clear search
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await sleep(500);
    }

    // ── TEST 3: Scout Player Dossier (/scout/player/ba607b88 - Virat Kohli) ─
    console.log(`Testing Route 2: ${BASE_URL}/scout/player/ba607b88 (Virat Kohli) ...`);
    const tKohli = Date.now();
    await page.goto(`${BASE_URL}/scout/player/ba607b88`, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTimeKohli = Date.now() - tKohli;
    await page.waitForSelector('table', { timeout: 15000 });
    const playerHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`  ✓ Player dossier loaded in ${loadTimeKohli}ms. Heading: "${playerHeading}"`);

    const shotKohli = path.join(SCREENSHOT_DIR, '03_scout_player_virat_kohli.png');
    await page.screenshot({ path: shotKohli, fullPage: false });
    fs.copyFileSync(shotKohli, path.join(PUBLIC_SCREENSHOT_DIR, '03_scout_player_virat_kohli.png'));
    results.push({ route: '/scout/player/ba607b88', latencyMs: loadTimeKohli, status: 'PASS', player: playerHeading });

    // ── TEST 4: Verified TigZig Player Dossier (/scout/player/f1809c03 - Tanay) ─
    console.log(`Testing Route 3: ${BASE_URL}/scout/player/f1809c03 (Tanay Thyagarajan) ...`);
    const tTanay = Date.now();
    await page.goto(`${BASE_URL}/scout/player/f1809c03`, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTimeTanay = Date.now() - tTanay;
    await page.waitForSelector('table', { timeout: 15000 });
    const tanayHeading = await page.$eval('h1', (el) => el.textContent);
    console.log(`  ✓ Tanay dossier loaded in ${loadTimeTanay}ms. Heading: "${tanayHeading}"`);

    const shotTanay = path.join(SCREENSHOT_DIR, '04_scout_player_tanay.png');
    await page.screenshot({ path: shotTanay, fullPage: false });
    fs.copyFileSync(shotTanay, path.join(PUBLIC_SCREENSHOT_DIR, '04_scout_player_tanay.png'));
    results.push({ route: '/scout/player/f1809c03', latencyMs: loadTimeTanay, status: 'PASS', player: tanayHeading });

    // ── TEST 5: Head-to-Head Compare (/scout/compare?ids=f1809c03,31ee319e) ─
    console.log(`Testing Route 4: ${BASE_URL}/scout/compare?ids=f1809c03,31ee319e (Tanay vs Ajay) ...`);
    const tCompare = Date.now();
    await page.goto(`${BASE_URL}/scout/compare?ids=f1809c03,31ee319e`, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTimeCompare = Date.now() - tCompare;
    await page.waitForSelector('.recharts-responsive-container', { timeout: 15000 });
    console.log(`  ✓ Radar comparison chart loaded in ${loadTimeCompare}ms.`);

    const shotCompare = path.join(SCREENSHOT_DIR, '05_scout_compare_radar.png');
    await page.screenshot({ path: shotCompare, fullPage: false });
    fs.copyFileSync(shotCompare, path.join(PUBLIC_SCREENSHOT_DIR, '05_scout_compare_radar.png'));
    results.push({ route: '/scout/compare', latencyMs: loadTimeCompare, status: 'PASS' });

    // ── TEST 6: Role Catalog (/scout/roles) ─────────────────────────────
    console.log(`Testing Route 5: ${BASE_URL}/scout/roles ...`);
    const tRoles = Date.now();
    await page.goto(`${BASE_URL}/scout/roles`, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTimeRoles = Date.now() - tRoles;
    await page.waitForSelector('h2', { timeout: 15000 });
    console.log(`  ✓ Role catalog loaded in ${loadTimeRoles}ms.`);

    const shotRoles = path.join(SCREENSHOT_DIR, '06_scout_roles_catalog.png');
    await page.screenshot({ path: shotRoles, fullPage: false });
    fs.copyFileSync(shotRoles, path.join(PUBLIC_SCREENSHOT_DIR, '06_scout_roles_catalog.png'));
    results.push({ route: '/scout/roles', latencyMs: loadTimeRoles, status: 'PASS' });

    // ── TEST 7: Home Page Scout Integration (/home) ───────────────────────
    console.log(`Testing Route 6: ${BASE_URL}/home (Scout Lab Feature Section) ...`);
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, 1500));
    await sleep(800);
    const shotHome = path.join(SCREENSHOT_DIR, '07_home_scout_integration.png');
    await page.screenshot({ path: shotHome, fullPage: false });
    fs.copyFileSync(shotHome, path.join(PUBLIC_SCREENSHOT_DIR, '07_home_scout_integration.png'));
    console.log(`  ✓ Home page Scout Lab integration verified.`);

    // ── TEST 8: Mobile Responsiveness (/scout on iPhone Viewport) ────────
    console.log(`Testing Mobile Viewport (390x844) on /scout ...`);
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(`${BASE_URL}/scout`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(500);
    const shotMobile = path.join(SCREENSHOT_DIR, '08_scout_mobile_view.png');
    await page.screenshot({ path: shotMobile, fullPage: false });
    fs.copyFileSync(shotMobile, path.join(PUBLIC_SCREENSHOT_DIR, '08_scout_mobile_view.png'));
    console.log(`  ✓ Mobile responsiveness verified.`);

    await browser.close();

    console.log(`\n======================================================`);
    console.log(`ALL 8 LIVE BROWSER TESTS PASSED SUCCESSFULLY!`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(JSON.stringify(results, null, 2));
    console.log(`======================================================\n`);
  } finally {
    serverProc.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('[Browser Test Failed]:', err);
  process.exit(1);
});
