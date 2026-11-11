import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_OUTPUT = path.resolve(__dirname, "../../data/players.json");

async function scrapeIplT20WithPuppeteer() {
  console.log("Starting IPLT20 Puppeteer Scraper...");

  let players = [];
  if (fs.existsSync(JSON_OUTPUT)) {
    players = JSON.parse(fs.readFileSync(JSON_OUTPUT, "utf-8"));
  } else {
    console.log("No existing players.json found. Run sync-players.ts first.");
    return;
  }

  // Launch a headless browser
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // helpful in some environments
  });
  
  const page = await browser.newPage();
  
  // Set a standard user agent to avoid basic bot blocks
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  // Navigate to the teams page
  console.log("Navigating to IPL Teams page...");
  try {
    await page.goto('https://www.iplt20.com/teams', { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (err) {
    console.log("Could not load teams page, error:", err);
    await browser.close();
    return;
  }

  // Extract team URLs
  console.log("Extracting team URLs...");
  const teamLinks = await page.evaluate(() => {
    // The IPL website frequently changes its DOM, this is a standard CSS selector used on their teams page
    const links = Array.from(document.querySelectorAll('.teams-content a, .card a, a[href*="/teams/men/"]'));
    return Array.from(new Set(links.map(link => (link as HTMLAnchorElement).href).filter(href => href.includes('/teams/men/'))));
  });

  console.log(`Found ${teamLinks.length} teams.`);
  const playerImagesMap: Record<string, string> = {};

  // For demonstration, we'll visit the first 3 teams to prevent long execution times
  // To scrape everything, we would just loop over all teamLinks
  const linksToScrape = teamLinks.slice(0, 3);
  if (teamLinks.length === 0) {
    console.log("No team links found. The website structure may have changed, or access is blocked.");
  }

  for (const link of linksToScrape) {
    console.log(`Scraping team: ${link}`);
    try {
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const teamPlayers = await page.evaluate(() => {
        // Typically player profiles are in `.ih-p-c-wrap` or `.player-card`
        const playerNodes = document.querySelectorAll('.ih-p-c-wrap, .player-card, .ap-player-item');
        const data: { name: string; img: string }[] = [];
        
        playerNodes.forEach(node => {
          const imgEl = node.querySelector('img');
          const nameEl = node.querySelector('.ih-p-name, .player-name, h3');
          
          if (imgEl && nameEl) {
            const name = (nameEl as HTMLElement).innerText.trim().replace(/\n/g, ' ');
            const img = (imgEl as HTMLImageElement).src;
            data.push({ name, img });
          }
        });
        return data;
      });

      console.log(`Found ${teamPlayers.length} players for this team.`);
      teamPlayers.forEach(p => {
        // Name normalization for matching
        const normalizedName = p.name.replace(/\s+/g, ' ').trim().toLowerCase();
        playerImagesMap[normalizedName] = p.img;
      });

    } catch (e) {
      console.warn(`Failed to scrape ${link}:`, (e as Error).message);
    }
  }

  await browser.close();
  console.log("Browser closed. Applying scraped data to players.json...");

  let syncCount = 0;
  players = players.map((p: any) => {
    const normalizedTargetName = p.name.trim().toLowerCase();
    
    // Exact match
    let foundImg = playerImagesMap[normalizedTargetName];
    
    // Fallback: Partial match
    if (!foundImg) {
       for (const [scrapedName, imgUrl] of Object.entries(playerImagesMap)) {
         if (scrapedName.includes(normalizedTargetName) || normalizedTargetName.includes(scrapedName)) {
           foundImg = imgUrl;
           break;
         }
       }
    }

    if (foundImg) {
      p.img = foundImg;
      syncCount++;
    }
    return p;
  });

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(players, null, 2));
  console.log(`Successfully synced ${syncCount} player photos and metadata from IPLT20 using Puppeteer.`);
}

scrapeIplT20WithPuppeteer().catch(console.error);
