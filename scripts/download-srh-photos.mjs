import fs from 'fs';
import https from 'https';
import path from 'path';

const extracted = JSON.parse(fs.readFileSync('./scripts/srh-2026-extracted-players.json', 'utf8'));
const targetDir = './artifacts/ipl-analytics/public/players/srh-2026';

function downloadFileWithHeaders(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://sunrisershyderabad.in/squad',
        'Origin': 'https://sunrisershyderabad.in'
      }
    };

    https.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFileWithHeaders(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
  console.log(`Starting download of ${extracted.length} SRH 2026 official player portraits with browser headers...`);
  const downloaded = [];

  for (const item of extracted) {
    if (!item.imageUrl) {
      console.warn(`[Skip] No image URL for ${item.name}`);
      continue;
    }
    const slug = slugify(item.name);
    const filename = `${slug}.png`;
    const destPath = path.join(targetDir, filename);

    try {
      console.log(`Downloading: ${item.name} -> ${filename}`);
      await downloadFileWithHeaders(item.imageUrl, destPath);
      const stat = fs.statSync(destPath);
      console.log(`✓ Saved ${filename} (${Math.round(stat.size / 1024)} KB)`);
      downloaded.push({
        name: item.name,
        slug,
        localPath: `/players/srh-2026/${filename}`,
        sourceUrl: item.imageUrl,
        sizeBytes: stat.size
      });
    } catch (err) {
      console.error(`✗ Failed downloading ${item.name}:`, err.message);
    }
  }

  console.log(`\nSuccessfully downloaded ${downloaded.length} portraits into ${targetDir}`);
  fs.writeFileSync('./scripts/srh-2026-downloaded-manifest.json', JSON.stringify(downloaded, null, 2));
}

run().catch(console.error);
