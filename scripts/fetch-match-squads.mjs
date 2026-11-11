import https from 'https';
import fs from 'fs';

https.get('https://www.iplt20.com/matches/237141/More/squads', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Data length:', data.length);
    fs.writeFileSync('scripts/match_squads_237141.html', data);
    console.log('Includes Kohli:', data.includes('Kohli'));
    console.log('Includes Patidar:', data.includes('Patidar'));
    console.log('Includes Dayal:', data.includes('Dayal'));
  });
}).on('error', err => console.error(err));
