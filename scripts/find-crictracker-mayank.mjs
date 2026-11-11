import https from 'https';

const u = 'https://www.crictracker.com/cricket-news/ipl-2025-mayank-agarwal-replaces-injured-devdutt-padikkal-in-rcb-squad/';
https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const imgs = data.match(/https?:\/\/[^\s\"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\"']*)?/gi) || [];
    console.log('All imgs:', [...new Set(imgs)].filter(x => !x.includes('logo') && !x.includes('icon')));
  });
}).on('error', err => console.error(err));
