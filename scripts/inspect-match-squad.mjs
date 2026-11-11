import fs from 'fs';

const html = fs.readFileSync('scripts/match_squads_237141.html', 'utf8');
const imgRegex = /https:\/\/[^"'\\s]+\.(?:png|jpg|jpeg|webp)/gi;
const imgs = [...new Set(html.match(imgRegex) || [])];
console.log('Images count:', imgs.length);
for (const u of imgs) {
  if (u.includes('player') || u.includes('headshot') || u.includes('team-assets')) {
    console.log(u);
  }
}
