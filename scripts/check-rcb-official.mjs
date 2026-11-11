import fs from 'fs';

const html = fs.readFileSync('scripts/rcb_official_squad.html', 'utf8');
const regex = /https:\/\/www\.royalchallengers\.com\/PRRCB01\/public\/[^\s"'>]+/g;
const urls = Array.from(new Set(html.match(regex) || []));
console.log('Total URLs found:', urls.length);
for (const u of urls) {
  if (u.includes('virat') || u.includes('bhuvi') || u.includes('2025') || u.includes('2026')) {
    console.log(u);
  }
}
