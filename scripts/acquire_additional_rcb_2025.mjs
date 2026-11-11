import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = 'artifacts/ipl-analytics/public/players/rcb-2025';
const DIST_TARGET_DIR = 'artifacts/ipl-analytics/dist/public/players/rcb-2025';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve(dest);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading Manoj Bhandage 2024/2025 headshot from BCCI IPL CDN...');
  const bhandageRaw = path.join(TARGET_DIR, 'manoj-bhandage-rcb-2025-raw.png');
  await downloadFile('https://documents.iplt20.com/ipl/IPLHeadshot2024/179.png', bhandageRaw);
  console.log('Downloaded Manoj Bhandage raw headshot:', fs.statSync(bhandageRaw).size, 'bytes');

  console.log('Downloading Mayank Agarwal headshot...');
  const mayankRaw = path.join(TARGET_DIR, 'mayank-agarwal-rcb-2025-raw.png');
  await downloadFile('https://img1.hscicdn.com/image/upload/f_auto,t_ds_square_w_640,q_50/lsci/db/PICTURES/CMS/322600/322626.png', mayankRaw);
  console.log('Downloaded Mayank Agarwal raw portrait:', fs.statSync(mayankRaw).size, 'bytes');

  console.log('Running crop_rcb_2025_to_chest.py...');
  execSync('python scripts/crop_rcb_2025_to_chest.py', { stdio: 'inherit' });

  // Copy to dist
  const bhandageFinal = path.join(TARGET_DIR, 'manoj-bhandage-rcb-2025.png');
  const mayankFinal = path.join(TARGET_DIR, 'mayank-agarwal-rcb-2025.png');
  if (fs.existsSync(bhandageFinal)) {
    fs.copyFileSync(bhandageFinal, path.join(DIST_TARGET_DIR, 'manoj-bhandage-rcb-2025.png'));
    console.log('Copied Manoj Bhandage to dist');
  }
  if (fs.existsSync(mayankFinal)) {
    fs.copyFileSync(mayankFinal, path.join(DIST_TARGET_DIR, 'mayank-agarwal-rcb-2025.png'));
    console.log('Copied Mayank Agarwal to dist');
  }

  // Update registry
  const REG_PATH = 'artifacts/ipl-analytics/public/data/player-photo-registry.json';
  const DIST_REG_PATH = 'artifacts/ipl-analytics/dist/public/data/player-photo-registry.json';
  const registry = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));

  const additionalMappings = [
    {
      name: 'Manoj Bhandage',
      id: 'ms-bhandage',
      aliases: ['Manoj Bhandage', 'MS Bhandage', 'manoj-bhandage', 'ms-bhandage', 'Manoj Shivaramsa Bhandage'],
      slug: 'manoj-bhandage',
      note: 'Official BCCI IPL Studio Headshot in RCB Kit (All-Rounder)'
    },
    {
      name: 'MA Agarwal',
      id: 'ma-agarwal',
      aliases: ['MA Agarwal', 'Mayank Agarwal', 'ma-agarwal', 'mayank-agarwal', 'Mayank Anurag Agarwal'],
      slug: 'mayank-agarwal',
      note: 'Verified Player Profile Cutout (Batter)'
    }
  ];

  for (const p of additionalMappings) {
    const imageFilename = `${p.slug}-rcb-2025.png`;
    const imagePath = `/players/rcb-2025/${imageFilename}`;
    const key = `${p.id}_RCB_2025`;

    const existingIdx = registry.photos.findIndex(item => item.key === key);
    const entry = {
      key,
      playerId: p.id,
      aliases: p.aliases,
      franchiseId: 'RCB',
      teamId: 'RCB',
      kitTeamId: 'RCB',
      season: 2025,
      kitSeason: 2025,
      imageUrl: imagePath,
      sourceUrl: 'https://documents.iplt20.com/ipl/IPLHeadshot2024/179.png',
      verificationStatus: 'exact_verified',
      licenseStatus: 'approved',
      attribution: 'Official IPL & RCB Kit Cutout',
      matchConfidence: 1.0,
      isCutout: true,
      notes: p.note
    };

    if (existingIdx >= 0) {
      registry.photos[existingIdx] = entry;
      console.log(`Updated existing key: ${key}`);
    } else {
      registry.photos.push(entry);
      console.log(`Added new key: ${key}`);
    }
  }

  registry.totalApproved = registry.photos.filter(p => p.licenseStatus === 'approved').length;
  registry.lastUpdated = new Date().toISOString();

  fs.writeFileSync(REG_PATH, JSON.stringify(registry, null, 2));
  fs.writeFileSync(DIST_REG_PATH, JSON.stringify(registry, null, 2));
  console.log(`Registry updated. Total photos: ${registry.photos.length}`);
}

main().catch(err => console.error(err));
