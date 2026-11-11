import https from 'https';
import fs from 'fs';

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing /players?tags=royal-challengers-bengaluru...');
  const res = await fetchUrl('https://www.iplt20.com/players?tags=royal-challengers-bengaluru');
  console.log('Status:', res.status, 'Length:', res.data.length);
  fs.writeFileSync('scripts/iplt20_players_rcb.html', res.data);
  console.log('Includes Kohli:', res.data.includes('Kohli'));
  console.log('Includes Patidar:', res.data.includes('Patidar'));
  console.log('Includes Hazlewood:', res.data.includes('Hazlewood'));
}
main();
