import fs from 'fs';
import https from 'https';

const extracted = JSON.parse(fs.readFileSync('./scripts/rcb-2026-official-players.json', 'utf8'));

function getMasterUrl(url) {
  // Replace /styles/s/public/ with /
  let master = url.replace('/styles/s/public/', '/');
  // strip query params like ?itok=...
  master = master.split('?')[0];
  return master;
}

function probe(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve({ url, status: res.statusCode, size: res.headers['content-length'] });
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

async function run() {
  console.log('Testing master URLs for all players...');
  for (const item of extracted) {
    const master = getMasterUrl(item.imageUrl);
    const res = await probe(master);
    console.log(item.name.padEnd(20), '=>', res.status, res.size ? `(${Math.round(res.size/1024)} KB)` : '');
  }
}

run();
