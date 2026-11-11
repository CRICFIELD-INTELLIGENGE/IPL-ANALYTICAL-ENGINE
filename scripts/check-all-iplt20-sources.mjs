import fs from 'fs';

const reg = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/player-photo-registry.json', 'utf8'));

console.log('All documents.iplt20.com photos in registry:');
reg.photos.filter(p => p.sourceUrl && p.sourceUrl.includes('documents.iplt20.com')).forEach(p => {
  console.log(p.key, '| player:', p.playerId, '| source:', p.sourceUrl, '| local:', p.imageUrl);
});
