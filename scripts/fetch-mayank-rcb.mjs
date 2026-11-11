import https from 'https';
import fs from 'fs';

const urls = [
  { name: 'mayank_rcb_1', url: 'https://www.royalchallengers.com/PRRCB01/public/styles/1061x767_landscape/public/2025-11/J62_1482.jpg?itok=CNQva9Ky' },
  { name: 'mayank_rcb_2', url: 'https://royalchallengers.com/PRRCB01/public/styles/1061x767_landscape/public/2025-11/MOH_0329.JPG?itok=ddgho7NN' },
  { name: 'mayank_rcb_3', url: 'https://www.royalchallengers.com/PRRCB01/public/styles/1061x767_landscape/public/2025-09/J62_8162.jpg?itok=lWonGn9D' }
];

async function download(url, dest) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      console.log(`[${url}] Status:`, res.statusCode);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve);
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
