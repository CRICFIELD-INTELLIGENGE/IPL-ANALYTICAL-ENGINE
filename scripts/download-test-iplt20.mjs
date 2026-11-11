import https from 'https';
import fs from 'fs';

const url = 'https://www.iplt20.com/api/team-assets?pathname=player%2F8903%2F2138%2F73907.png&brand=ipl';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Downloaded size:', buf.length);
    fs.writeFileSync('scripts/test_iplt20_bethell.png', buf);
  });
}).on('error', err => console.error(err));
