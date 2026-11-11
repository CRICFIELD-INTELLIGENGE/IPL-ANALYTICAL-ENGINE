import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';

const extractedPath = './scripts/rcb-2026-official-players.json';
const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const targetDir = './artifacts/ipl-analytics/public/players/rcb-2026';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const file = fs.createWriteStream(dest);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.royalchallengers.com/rcb-squad-men',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    };

    client.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          loc = `${parsed.protocol}//${parsed.host}${loc}`;
        }
        return downloadImage(loc, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Name normalization to align with our squad database & cricsheet
const NAME_MAP = {
  'Rasikh Dar': 'Rasikh Salam',
  'Ajith  Ramamurthy': null, // staff
  'Ramesh  Mane': null, // staff
  'Richard Gleeson': null, // replacement / standby if not in 25
};

async function run() {
  console.log(`Starting download of RCB 2026 official player portraits (${extracted.length} candidates)...`);
  const downloaded = [];
  const failures = [];

  for (const item of extracted) {
    const mappedName = NAME_MAP[item.name] !== undefined ? NAME_MAP[item.name] : item.name;
    if (!mappedName) {
      console.log(`[Skipping staff/non-squad] ${item.name}`);
      continue;
    }

    const slug = slugify(mappedName);
    const filename = `${slug}-rcb-2026.png`;
    const destPath = path.join(targetDir, filename);

    // Convert thumbnail style to master full-resolution vertical cutout
    const masterUrl = item.imageUrl.replace('/styles/s/public/', '/').split('?')[0];

    try {
      console.log(`Downloading Master Cutout: ${mappedName} (${item.name}) -> ${filename}`);
      await downloadImage(masterUrl, destPath);
      const stat = fs.statSync(destPath);
      console.log(`✓ Saved ${filename} (${Math.round(stat.size / 1024)} KB)`);
      downloaded.push({
        name: mappedName,
        originalName: item.name,
        slug,
        filename,
        localPath: `/players/rcb-2026/${filename}`,
        sourceUrl: masterUrl,
        thumbnailUrl: item.imageUrl,
        role: item.role,
        sizeBytes: stat.size,
        verified2026Kit: item.imageUrl.includes('2026-03') || item.imageUrl.includes('2026-05')
      });
    } catch (err) {
      console.error(`✗ Failed downloading ${item.name}:`, err.message);
      failures.push({ name: item.name, url: item.imageUrl, error: err.message });
    }
  }

  console.log(`\nDownload summary: ${downloaded.length} succeeded, ${failures.length} failed.`);
  fs.writeFileSync('./scripts/rcb-2026-downloaded-manifest.json', JSON.stringify({ downloaded, failures }, null, 2));
  console.log('Saved rcb-2026-downloaded-manifest.json');
}

run();
