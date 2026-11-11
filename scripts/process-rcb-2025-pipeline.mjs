import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = path.resolve('artifacts/ipl-analytics/public/players/rcb-2025');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// 2025 RCB Squad mapped to source URLs
const rcb2025Sources = [
  {
    name: 'Virat Kohli',
    slug: 'virat-kohli',
    url: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/164.png',
    attribution: 'BCCI IPL Official 2025 Headshot'
  },
  {
    name: 'Josh Hazlewood',
    slug: 'josh-hazlewood',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2813%29.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Phil Salt',
    slug: 'phil-salt',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2817%29.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Jitesh Sharma',
    slug: 'jitesh-sharma',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/Jitesh%203_0.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Rajat Patidar',
    slug: 'rajat-patidar',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/rajat.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Bhuvneshwar Kumar',
    slug: 'bhuvneshwar-kumar',
    url: 'https://documents.iplt20.com/ipl/IPLHeadshot2025/116.png',
    attribution: 'BCCI IPL Official 2025 Headshot'
  },
  {
    name: 'Liam Livingstone',
    slug: 'liam-livingstone',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/livingstone.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Rasikh Salam Dar',
    slug: 'rasikh-salam',
    url: 'https://www.iplt20.com/api/team-assets?pathname=player%2F8903%2F2138%2F68859.png&brand=ipl',
    attribution: 'Official IPL Squad Portrait'
  },
  {
    name: 'Krunal Pandya',
    slug: 'krunal-pandya',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/krunal.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Yash Dayal',
    slug: 'yash-dayal',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/dayal.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Tim David',
    slug: 'tim-david',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/david.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Jacob Bethell',
    slug: 'jacob-bethell',
    url: 'https://www.iplt20.com/api/team-assets?pathname=player%2F8903%2F2138%2F73907.png&brand=ipl',
    attribution: 'Official IPL Squad Portrait'
  },
  {
    name: 'Suyash Sharma',
    slug: 'suyash-sharma',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2821%29.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Devdutt Padikkal',
    slug: 'devdutt-padikkal',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2810%29_0.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Nuwan Thushara',
    slug: 'nuwan-thushara',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/nuwan.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Romario Shepherd',
    slug: 'romario-shepherd',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2025-03/romario.png',
    attribution: 'RCB Official 2025 Photoshoot Cutout'
  },
  {
    name: 'Lungi Ngidi',
    slug: 'lungi-ngidi',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2816%29.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Swapnil Singh',
    slug: 'swapnil-singh',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2822%29.png',
    attribution: 'RCB Official Photoshoot'
  },
  {
    name: 'Abhinandan Singh',
    slug: 'abhinandan-singh',
    url: 'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2811%29.png',
    attribution: 'RCB Official Photoshoot'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with ${res.statusCode}: ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading RCB 2025 player cutouts...');
  const downloaded = [];
  for (const item of rcb2025Sources) {
    const rawDest = path.join(TARGET_DIR, `${item.slug}-rcb-2025-raw.png`);
    try {
      await download(item.url, rawDest);
      console.log(`Downloaded: ${item.name} (${fs.statSync(rawDest).size} bytes)`);
      downloaded.push({ ...item, rawDest });
    } catch (e) {
      console.error(`Failed ${item.name}: ${e.message}`);
    }
  }

  console.log(`Successfully downloaded ${downloaded.length} images.`);
  fs.writeFileSync('scripts/rcb-2025-downloaded.json', JSON.stringify(downloaded, null, 2));
}

run();
