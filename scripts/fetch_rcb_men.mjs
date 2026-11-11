import https from 'https';
import fs from 'fs';

https.get('https://www.royalchallengers.com/rcb-squad-men', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('scripts/rcb_official_men.html', data);
    console.log('Saved rcb_official_men.html, size:', data.length);
    const matches = data.match(/<img[^>]+src=["'][^"']+["'][^>]*>/gi) || [];
    console.log('Total img tags:', matches.length);
    const playerImgs = matches.filter(m => m.includes('PRRCB01') || m.includes('player') || m.includes('squad'));
    console.log('Player images found:', playerImgs.length);
    for (const m of playerImgs) {
      console.log(m);
    }
  });
}).on('error', err => console.error(err));
