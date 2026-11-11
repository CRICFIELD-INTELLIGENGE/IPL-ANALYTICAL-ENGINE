import https from 'https';
import fs from 'fs';

function probe(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length, body: data });
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function main() {
  console.log('Probing websiteimagextractor.com and official IPL sites...');
  const resExtractor = await probe('https://websiteimagextractor.com/');
  console.log('websiteimagextractor.com status:', resExtractor.status, 'size:', resExtractor.length);

  const resIPL = await probe('https://www.iplt20.com/teams/royal-challengers-bengaluru');
  console.log('iplt20.com RCB status:', resIPL.status, 'size:', resIPL.length);

  if (resIPL.body) {
    // Check for player image paths
    const re = /https:\/\/[^"']*\.(?:png|jpg|webp)/gi;
    const matches = (resIPL.body.match(re) || []).filter(u => u.includes('player') || u.includes('action') || u.includes('sportz'));
    console.log('IPL RCB player image candidates found:', matches.length);
    console.log('Sample candidate URLs:', matches.slice(0, 5));
  }
}

main();
