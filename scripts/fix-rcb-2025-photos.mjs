import fs from 'fs';
import path from 'path';

// 1. Copy verified RCB cutouts for Virat Kohli and Bhuvneshwar Kumar into rcb-2025
const vk26 = 'artifacts/ipl-analytics/public/players/rcb-2026/virat-kohli-rcb-2026.png';
const bk26 = 'artifacts/ipl-analytics/public/players/rcb-2026/bhuvneshwar-kumar-rcb-2026.png';

const vk25 = 'artifacts/ipl-analytics/public/players/rcb-2025/virat-kohli-rcb-2025.png';
const bk25 = 'artifacts/ipl-analytics/public/players/rcb-2025/bhuvneshwar-kumar-rcb-2025.png';

if (fs.existsSync(vk26)) {
  fs.copyFileSync(vk26, vk25);
  console.log('Successfully replaced virat-kohli-rcb-2025.png with genuine Virat Kohli RCB cutout.');
}

if (fs.existsSync(bk26)) {
  fs.copyFileSync(bk26, bk25);
  console.log('Successfully replaced bhuvneshwar-kumar-rcb-2025.png with genuine Bhuvneshwar Kumar RCB cutout.');
}

// 2. Remove the duplicate 179.png from Mayank Agarwal in rcb-2025
const ma25 = 'artifacts/ipl-analytics/public/players/rcb-2025/mayank-agarwal-rcb-2025.png';
if (fs.existsSync(ma25)) {
  fs.unlinkSync(ma25);
  console.log('Removed duplicate 179.png from mayank-agarwal-rcb-2025.png');
}

// 3. Update player-photo-registry.json
const regPath = 'artifacts/ipl-analytics/public/data/player-photo-registry.json';
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));

// Update Virat Kohli 2025 entry
const vkEntry = reg.photos.find(p => p.key === 'v-kohli_RCB_2025');
if (vkEntry) {
  vkEntry.sourceUrl = 'https://www.royalchallengers.com/PRRCB01/public/styles/s/public/2026-03/virat.png?itok=gLKCBlX6';
  vkEntry.sourcePageUrl = 'https://www.royalchallengers.com/rcb-squad-men';
  vkEntry.attribution = 'Official Royal Challengers Bengaluru Authentic Portrait Cutout';
  vkEntry.notes = 'Official Royal Challengers Bengaluru Authentic Portrait (Replaced incorrect BCCI CDN 164.png Ishan Kishan collision)';
  vkEntry.imageUrl = '/players/rcb-2025/virat-kohli-rcb-2025.png';
}

// Update Bhuvneshwar Kumar 2025 entry
const bkEntry = reg.photos.find(p => p.key === 'b-kumar_RCB_2025');
if (bkEntry) {
  bkEntry.sourceUrl = 'https://www.royalchallengers.com/PRRCB01/public/styles/s/public/2026-03/bhuvi_0.png?itok=ktTs4_Xt';
  bkEntry.sourcePageUrl = 'https://www.royalchallengers.com/rcb-squad-men';
  bkEntry.attribution = 'Official Royal Challengers Bengaluru Authentic Portrait Cutout';
  vkEntry.notes = 'Official Royal Challengers Bengaluru Authentic Portrait (Replaced incorrect BCCI CDN 116.png Kagiso Rabada collision)';
  bkEntry.imageUrl = '/players/rcb-2025/bhuvneshwar-kumar-rcb-2025.png';
}

// Remove ma-agarwal_RCB_2025 if it used 179.png collision
reg.photos = reg.photos.filter(p => p.key !== 'ma-agarwal_RCB_2025');

reg.lastUpdated = new Date().toISOString();
reg.totalApproved = reg.photos.filter(p => p.licenseStatus === 'approved').length;

fs.writeFileSync(regPath, JSON.stringify(reg, null, 2));
console.log('Successfully updated player-photo-registry.json. Total approved:', reg.totalApproved);

// 4. Update also in api-server if it exists there
const apiRegPath = 'artifacts/api-server/data/player-photo-registry.json';
if (fs.existsSync(apiRegPath)) {
  fs.writeFileSync(apiRegPath, JSON.stringify(reg, null, 2));
  console.log('Synced to api-server data.');
}
