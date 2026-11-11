import fs from 'fs';

const html = fs.readFileSync('./scripts/rcb_page.html', 'utf8');

const imgTags = html.match(/<img[^>]+>/g) || [];
console.log('Total img tags in HTML:', imgTags.length);

const playerCardImgs = [];
for (const tag of imgTags) {
  if (tag.includes('pathname%3Dplayer') || tag.includes('squad-card') || tag.includes('brand%3Dipl')) {
    const altMatch = tag.match(/alt="([^"]*)"/);
    const srcMatch = tag.match(/src="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : null;
    const src = srcMatch ? srcMatch[1] : null;
    if (alt || src) {
      playerCardImgs.push({ alt, src });
    }
  }
}

console.log('Player card images found:', playerCardImgs.length);
console.log(JSON.stringify(playerCardImgs, null, 2));

// Also let's check what other players are in the squad list on iplt20
// Look for all player links: href="/players/..." or text inside squad cards
const playerCards = [];
const cardRe = /<div[^>]*data-testid="squad-card-rail"[^>]*>([\s\S]*?)<\/div><\/div>/g;
let cm;
while ((cm = cardRe.exec(html)) !== null) {
  playerCards.push(cm[1]);
}
console.log('squad-card-rail blocks found:', playerCards.length);
