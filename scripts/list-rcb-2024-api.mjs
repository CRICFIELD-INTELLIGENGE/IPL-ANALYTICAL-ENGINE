import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/rcb_2024_bff_squad.json', 'utf8'));
const players = data.data.squad.players;
console.log('Total players in official RCB 2024 API:', players.length);

const summary = players.map((p, i) => ({
  index: i + 1,
  name: p.name,
  externalId: p.externalId,
  role: p.role,
  isCaptain: p.isCaptain,
  imageUrl: p.imageUrl,
  largeUrl: p.imageUrlSet?.large || p.imageUrl
}));

console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync('scratch/rcb_2024_official_players.json', JSON.stringify(summary, null, 2));
