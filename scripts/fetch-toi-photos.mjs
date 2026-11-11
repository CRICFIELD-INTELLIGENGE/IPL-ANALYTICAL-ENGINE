import https from 'https';
import fs from 'fs';

const urls = [
  { name: 'manoj', url: 'https://static.toiimg.com/photo/120897597.cms' },
  { name: 'mohit', url: 'https://static.toiimg.com/photo/120897595.cms' },
  { name: 'swastik_thumb', url: 'https://static.toiimg.com/thumb/133850066.jpg?photoid=133850066&width=600&resizemode=4' },
  { name: 'swastik_full', url: 'https://static.toiimg.com/photo/133850066.cms' }
];

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      console.log(`[${url}] Status:`, res.statusCode);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return resolve({ ok: false, status: res.statusCode });
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve({ ok: true, size: fs.statSync(dest).size });
      });
    }).on('error', err => resolve({ ok: false, err: err.message }));
  });
}

for (const item of urls) {
  const dest = `scratch/${item.name}.jpg`;
  const res = await download(item.url, dest);
  console.log(`${item.name} ->`, res);
}
