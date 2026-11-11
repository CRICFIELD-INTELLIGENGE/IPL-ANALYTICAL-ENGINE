import fs from 'fs';

const html = fs.readFileSync('./scripts/rcb_page.html', 'utf8');

// Find all occurrences of player images and extract the nearby player name, jersey number, and role
// Next.js RSC payload contains JSON-like structures or strings
const re = /pathname%3Dplayer%252F([^%&"'\s]+)%252F([^%&"'\s]+)%252F([0-9]+)\.png/g;
let m;
const players = [];

// Also let's extract all matches of player image URLs
const imgRe = /https:\/\/www\.iplt20\.com\/_next\/image\?url=%2Fapi%2Fteam-assets%3Fpathname%3Dplayer%252F([^&"'\s]+)/g;
const directRe = /\/api\/team-assets\?pathname=player\/([^&"'\s]+)/g;

// Let's do a broader inspection around each player image found in html
const matches = [];
let idx = 0;
while ((idx = html.indexOf('pathname%3Dplayer%252F', idx)) !== -1) {
  // get a window of 800 characters around this occurrence
  const slice = html.substring(Math.max(0, idx - 400), idx + 800);
  matches.push({ idx, slice });
  idx += 22;
}

console.log(`Found ${matches.length} player image references in rcb_page.html`);

const parsed = [];
for (const item of matches) {
  // Extract pathname
  const pathMatch = item.slice.match(/pathname%3D(player%252F[0-9]+%252F[0-9]+%252F[0-9]+\.png)/);
  const decodedPath = pathMatch ? decodeURIComponent(decodeURIComponent(pathMatch[1])) : null;
  
  // Extract text like name, role
  // Look for text fragments inside the slice
  parsed.push({
    decodedPath,
    fullSlice: item.slice.replace(/\\"/g, '"')
  });
}

fs.writeFileSync('./scripts/rcb_extracted_matches.json', JSON.stringify(parsed, null, 2));
console.log('Saved rcb_extracted_matches.json');
