import https from 'https';
import fs from 'fs';

https.get('https://www.iplt20.com/teams/royal-challengers-bengaluru', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, res => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      console.log('Found __NEXT_DATA__!');
      const nextData = JSON.parse(nextDataMatch[1]);
      fs.writeFileSync('./scripts/iplt20_rcb_nextdata.json', JSON.stringify(nextData, null, 2));
      console.log('Saved __NEXT_DATA__ successfully.');
    } else {
      console.log('No __NEXT_DATA__ tag found. Dumping head of html:');
      console.log(html.slice(0, 500));
    }
  });
}).on('error', e => console.error('Error:', e.message));
