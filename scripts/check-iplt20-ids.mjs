import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

// Look for player names and images or IDs in the html
const matches = [];
const imgRegex = /https:\/\/[^"'\s]+\/(?:IPLHeadshot\d*|playerimages|players|headshots|player)\/[^"'\s]+/gi;
let m;
while ((m = imgRegex.exec(html)) !== null) {
  matches.push(m[0]);
}

console.log('Found image URLs in iplt20_rcb_squad.html:', matches.length);
console.log(matches.slice(0, 40));

// Also let's check iplt20_rcb_parsed_squad.json
if (fs.existsSync('scripts/iplt20_rcb_parsed_squad.json')) {
  const parsed = JSON.parse(fs.readFileSync('scripts/iplt20_rcb_parsed_squad.json', 'utf8'));
  console.log('Parsed squad sample:', JSON.stringify(parsed, null, 2).slice(0, 1000));
}
