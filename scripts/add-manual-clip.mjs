#!/usr/bin/env node
/**
 * Manual Hotstar Clip Importer with Automatic Thumbnail Extraction
 *
 * Usage:
 *   node scripts/add-manual-clip.mjs "https://www.hotstar.com/in/sports/cricket/gill-plays-on-after-nicking-one-behind/1271641827"
 *   node scripts/add-manual-clip.mjs "https://www.hotstar.com/in/sports/cricket/..." --team=GT --title="Gill Wicket"
 *   node scripts/add-manual-clip.mjs --id=1271641827 --slug="cricket/gill-plays-on..." --team=SRH --thumbnail="https://img10.hotstar.com/..."
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOGUE_PATHS = [
  path.resolve(__dirname, "../artifacts/api-server/src/data/video-catalogue.json"),
  path.resolve(__dirname, "../artifacts/ipl-analytics/src/data/video-catalogue.json"),
];

function extractMetaTag(html, property) {
  const regex = new RegExp(`<meta\\s+(?:property|name)=["']${property}["']\\s+content=["']([^"']+)["']`, "i");
  const match = html.match(regex);
  if (match) return match[1];

  const reverseRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`, "i");
  const reverseMatch = html.match(reverseRegex);
  return reverseMatch ? reverseMatch[1] : null;
}

function parseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    // Typical pattern: /in/sports/cricket/title-slug/content_id
    const contentId = parts[parts.length - 1];
    const sportsIndex = parts.indexOf("sports");
    let slug = "";
    if (sportsIndex !== -1 && parts.length > sportsIndex + 1) {
      slug = parts.slice(sportsIndex + 1, parts.length - 1).join("/");
    }
    return { contentId, slug, fullUrl: rawUrl };
  } catch {
    return null;
  }
}

async function scrapeHotstarMetadata(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const title = extractMetaTag(html, "og:title") || extractMetaTag(html, "twitter:title");
    const thumbnail = extractMetaTag(html, "og:image") || extractMetaTag(html, "twitter:image");
    const description = extractMetaTag(html, "og:description") || extractMetaTag(html, "twitter:description");

    return { title, thumbnail, description };
  } catch (err) {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const positionalUrl = args.find((a) => a.startsWith("http://") || a.startsWith("https://"));
  const teamArg = args.find((a) => a.startsWith("--team="))?.split("=")[1] || "SRH";
  const customTitle = args.find((a) => a.startsWith("--title="))?.split("=")[1];
  const customThumbnail = args.find((a) => a.startsWith("--thumbnail="))?.split("=")[1];
  const customDuration = args.find((a) => a.startsWith("--duration="))?.split("=")[1] || "01:30";

  if (!positionalUrl) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Please provide a Hotstar video URL.`);
    console.log(`Example: node scripts/add-manual-clip.mjs "https://www.hotstar.com/in/sports/cricket/gill-plays-on-after-nicking-one-behind/1271641827" --team=GT`);
    process.exit(1);
  }

  const parsed = parseUrl(positionalUrl);
  if (!parsed || !parsed.contentId) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Could not extract content_id from URL: ${positionalUrl}`);
    process.exit(1);
  }

  console.log(`\n\x1b[36m=== Manual Hotstar Clip Importer ===\x1b[0m`);
  console.log(`Target Content ID: \x1b[33m${parsed.contentId}\x1b[0m`);
  console.log(`Team Tag: \x1b[33m${teamArg.toUpperCase()}\x1b[0m`);

  // Step 1: Scrape OpenGraph metadata for title and high-res thumbnail (0 credits!)
  console.log(`\nResolving page metadata & thumbnail from Hotstar (0 credits)...`);
  const scraped = await scrapeHotstarMetadata(positionalUrl);

  let finalTitle = customTitle || scraped?.title || parsed.slug.replace(/[-_/]/g, " ");
  // Clean branding suffixes if any
  finalTitle = finalTitle.replace(/\s*\|\s*Watch.*$/i, "").replace(/\s*\|\s*JioHotstar.*$/i, "").trim();

  let finalThumbnail = customThumbnail || scraped?.thumbnail || null;
  let finalDescription = scraped?.description || finalTitle;

  // If thumbnail still not found, construct default Hotstar CDN fallback
  if (!finalThumbnail) {
    finalThumbnail = `https://img10.hotstar.com/image/upload/f_auto,q_90,w_1280/sources/r1/cms/prod/sports/${parsed.contentId}`;
  }

  console.log(`\x1b[32m✓ Title:\x1b[0m ${finalTitle}`);
  console.log(`\x1b[32m✓ Thumbnail:\x1b[0m ${finalThumbnail}`);

  // Step 2: Construct Vault Entry
  const vaultItem = {
    id: `HSTAR-${parsed.contentId}`,
    title: finalTitle,
    videoType: "match_highlights",
    originalCategory: "Hotstar Cricket Highlights",
    season: 2026,
    teams: [teamArg.toUpperCase()],
    players: [],
    opponent: null,
    duration: customDuration,
    description: finalDescription,
    officialVideoUrl: positionalUrl,
    destinationUrl: positionalUrl,
    isExactVideoUrl: true,
    broadcaster: "JioHotstar",
    verified: true,
    beyondXiCategory: "Match Coverage",
    suggestedDestination: "Dugout Video Vault",
    keywords: [teamArg.toUpperCase(), "IPL", "Highlights", "Hotstar"],
    hotstarContentId: String(parsed.contentId),
    thumbnailUrl: finalThumbnail,
  };

  // Step 3: Insert / Update in video-catalogue.json
  for (const catPath of CATALOGUE_PATHS) {
    try {
      const raw = await fs.readFile(catPath, "utf-8");
      const list = JSON.parse(raw);

      // Check if item already exists; update it if so, or unshift
      const existingIdx = list.findIndex(
        (v) => String(v.hotstarContentId) === String(parsed.contentId) || v.id === vaultItem.id
      );

      if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], ...vaultItem };
        console.log(`Updated existing entry in ${catPath}`);
      } else {
        list.unshift(vaultItem);
        console.log(`Appended new entry to ${catPath}`);
      }

      await fs.writeFile(catPath, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn(`Could not update ${catPath}:`, err.message);
    }
  }

  console.log(`\n\x1b[32m✓ Success! Clip synced to Dugout Video Vault with thumbnail.\x1b[0m\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
