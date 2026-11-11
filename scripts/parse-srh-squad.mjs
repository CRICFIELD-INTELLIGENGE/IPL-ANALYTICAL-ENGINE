import fs from 'fs';
import https from 'https';
import path from 'path';

const htmlPath = 'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.system_generated/steps/3911/content.md';
const html = fs.readFileSync(htmlPath, 'utf8');

// Parse player sections
// On the SRH website:
// Each player has a card with:
// - alt="Player XX" and an image src from cloudfront.net/image-pool/
// - Followed by <span class="block">First</span><span class="block">Last</span>
// Let's find all player blocks

const playerEntries = [];

// Split by player block marker: class="block">First</span><span class="block">Last</span>
const regex = /<span class="block">([^<]+)<\/span>\s*<span class="block">([^<]+)<\/span>/g;
let m;
while ((m = regex.exec(html)) !== null) {
  const firstName = m[1].trim();
  const lastName = m[2].trim();
  const fullName = `${firstName} ${lastName}`;
  const idx = m.index;

  // Look in the 2500 characters preceding this name block for the primary cutout image
  const sub = html.substring(Math.max(0, idx - 2500), idx + 200);
  // Match d1zakxcsliwds.cloudfront.net/image-pool/...
  const imgMatches = [
    ...sub.matchAll(/(https%3A%2F%2Fd1zakxcsliwds\.cloudfront\.net%2Fimage-pool%2F[a-f0-9]+\.(?:png|webp|jpg))/g),
    ...sub.matchAll(/(https:\/\/d1zakxcsliwds\.cloudfront\.net\/image-pool\/[a-f0-9]+\.(?:png|webp|jpg))/g)
  ];

  if (imgMatches.length > 0) {
    // decode url if encoded
    let rawUrl = imgMatches[imgMatches.length - 1][1];
    rawUrl = decodeURIComponent(rawUrl);
    playerEntries.push({
      name: fullName,
      imageUrl: rawUrl
    });
  } else {
    playerEntries.push({
      name: fullName,
      imageUrl: null
    });
  }
}

// Deduplicate
const uniquePlayers = [];
const seen = new Set();
for (const p of playerEntries) {
  if (!seen.has(p.name)) {
    seen.add(p.name);
    uniquePlayers.push(p);
  }
}

console.log(`Found ${uniquePlayers.length} SRH Squad Players:`);
console.log(JSON.stringify(uniquePlayers, null, 2));

// Save parsed list
fs.writeFileSync('./scripts/srh-2026-extracted-players.json', JSON.stringify(uniquePlayers, null, 2));
