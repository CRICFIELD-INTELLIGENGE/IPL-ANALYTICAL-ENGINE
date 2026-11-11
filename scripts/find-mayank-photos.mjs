import https from 'https';
import fs from 'fs';

const articleUrl = 'https://www.royalchallengers.com/cricket-news/mayank-agarwal-replaces-injured-devdutt-padikkal-in-rcb-squad';

https.get(articleUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/https?:\/\/[^\s\"']+\.(?:jpg|jpeg|png)(?:\?[^\s\"']*)?/gi) || [];
    console.log('Unique images:', [...new Set(matches)]);
  });
}).on('error', err => console.error(err));
