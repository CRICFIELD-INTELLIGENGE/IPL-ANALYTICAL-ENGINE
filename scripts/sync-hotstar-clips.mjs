#!/usr/bin/env node
/**
 * CLI Runner: Sync Hotstar IPL video clips into Dugout Video Vault via Anakin.io Wire API
 *
 * Usage:
 *   node scripts/sync-hotstar-clips.mjs --team=SRH --limit=5
 *   node scripts/sync-hotstar-clips.mjs --team=RCB
 *   node scripts/sync-hotstar-clips.mjs --team=CSK --api-key=YOUR_KEY
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANAKIN_API_URL = "https://api.anakin.io/v1/wire";

// Parse CLI arguments
const teamArg = process.argv.find((a) => a.startsWith("--team="))?.split("=")[1] || "SRH";
const limitArg = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 5;
const apiKeyArg = process.argv.find((a) => a.startsWith("--api-key="))?.split("=")[1] || process.env.ANAKIN_API_KEY;

const CATALOGUE_PATHS = [
  path.resolve(__dirname, "../artifacts/api-server/src/data/video-catalogue.json"),
  path.resolve(__dirname, "../artifacts/ipl-analytics/src/data/video-catalogue.json"),
];

if (!apiKeyArg) {
  console.error("\x1b[31m[ERROR]\x1b[0m Missing ANAKIN_API_KEY. Please set ANAKIN_API_KEY in environment or pass --api-key=YOUR_KEY");
  process.exit(1);
}

async function runAnakinAction(actionId, params) {
  const submitRes = await fetch(`${ANAKIN_API_URL}/task`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKeyArg,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action_id: actionId, params }),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`Anakin task failed (${submitRes.status}): ${text}`);
  }

  const job = await submitRes.json();
  console.log(`  -> Task queued: ${job.id} (${actionId})`);

  let attempts = 0;
  while (attempts < 25) {
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;

    const pollRes = await fetch(`${ANAKIN_API_URL}/jobs/${job.id}`, {
      headers: { "X-API-Key": apiKeyArg },
    });

    if (!pollRes.ok) continue;

    const data = await pollRes.json();
    if (data.status === "completed" || data.status === "settled") {
      return data.result;
    }
    if (data.status === "failed") {
      throw new Error(`Job ${job.id} failed: ${data.error || "Unknown"}`);
    }
  }

  throw new Error(`Timeout polling task ${job.id}`);
}

async function main() {
  console.log(`\n\x1b[36m=== Hotstar IPL Video Sync Engine (Anakin.io) ===\x1b[0m`);
  console.log(`Target Franchise: \x1b[33m${teamArg.toUpperCase()}\x1b[0m | Max Hydrations: \x1b[33m${limitArg}\x1b[0m\n`);

  // 1. Read existing catalogue for deduplication
  const existingIds = new Set();
  let currentList = [];
  try {
    const raw = await fs.readFile(CATALOGUE_PATHS[0], "utf-8");
    currentList = JSON.parse(raw);
    for (const c of currentList) {
      if (c.hotstarContentId) existingIds.add(String(c.hotstarContentId));
      if (c.id?.startsWith("HSTAR-")) existingIds.add(c.id.replace("HSTAR-", ""));
    }
    console.log(`Loaded ${currentList.length} existing video items in Dugout Vault.`);
  } catch (err) {
    console.log(`Note: No existing catalogue found at primary path; creating fresh list.`);
  }

  // 2. Discover clips from sports hub
  console.log(`\n[Step 1] Querying cricket hub listings...`);
  const hubData = await runAnakinAction("act_hotstar_in_sports_hub_listing", { hub_slug: "cricket" });
  const items = hubData?.items || hubData?.clips || [];
  console.log(`Discovered ${items.length} total sports clips in hub.`);

  const relevant = items.filter((item) => {
    const text = `${item.title} ${item.title_slug}`.toLowerCase();
    return text.includes(teamArg.toLowerCase());
  });
  console.log(`Found ${relevant.length} clips matching "${teamArg}".`);

  // 3. Hydrate watch details
  console.log(`\n[Step 2] Hydrating uncached clips (2 credits per clip)...`);
  const newVaultVideos = [];

  for (const item of relevant.slice(0, limitArg)) {
    const contentIdStr = String(item.content_id);
    if (existingIds.has(contentIdStr)) {
      console.log(`  \x1b[90m[SKIP]\x1b[0m Content ID ${contentIdStr} already exists in vault.`);
      continue;
    }

    try {
      console.log(`  \x1b[32m[HYDRATE]\x1b[0m Fetching watch metadata for ${contentIdStr} (${item.title_slug})...`);
      const details = await runAnakinAction("act_hotstar_in_sports_clip_watch_page", {
        hub_slug: "sports",
        title_slug: item.title_slug,
        content_id: contentIdStr,
      });

      const cleanSlug = item.title_slug.startsWith("cricket/") ? item.title_slug : `cricket/${item.title_slug}`;
      const canonicalUrl = `https://www.hotstar.com/in/sports/${cleanSlug}/${contentIdStr}`;

      newVaultVideos.push({
        id: `HSTAR-${contentIdStr}`,
        title: item.title,
        videoType: "match_highlights",
        originalCategory: "Hotstar Cricket Highlights",
        season: 2026,
        teams: [teamArg.toUpperCase()],
        players: [],
        duration: details?.duration || item.duration || "01:30",
        description: item.description || details?.description || item.title,
        officialVideoUrl: details?.playback_url || canonicalUrl,
        destinationUrl: canonicalUrl,
        isExactVideoUrl: true,
        broadcaster: "JioHotstar",
        verified: true,
        beyondXiCategory: "Match Coverage",
        suggestedDestination: "Dugout Video Vault",
        keywords: [teamArg.toUpperCase(), "IPL", "Highlights", "Hotstar"],
        hotstarContentId: contentIdStr,
        thumbnailUrl: details?.thumbnail_url || item.thumbnail || null,
      });
    } catch (err) {
      console.warn(`  \x1b[31m[FAILED]\x1b[0m Clip ${contentIdStr}: ${err.message}`);
    }
  }

  // 4. Save to disk if new clips were found
  if (newVaultVideos.length > 0) {
    const updated = [...newVaultVideos, ...currentList];
    for (const p of CATALOGUE_PATHS) {
      try {
        await fs.writeFile(p, JSON.stringify(updated, null, 2), "utf-8");
        console.log(`\x1b[32m[SAVED]\x1b[0m Updated ${p}`);
      } catch (err) {
        console.warn(`Could not write to ${p}:`, err.message);
      }
    }
    console.log(`\n\x1b[32m✓ Successfully added ${newVaultVideos.length} new Hotstar clips into Dugout Video Vault!\x1b[0m`);
  } else {
    console.log(`\n\x1b[33mNo new clips to add. Vault is fully up to date.\x1b[0m`);
  }
}

main().catch((err) => {
  console.error("\x1b[31m[FATAL ERROR]\x1b[0m", err);
  process.exit(1);
});
