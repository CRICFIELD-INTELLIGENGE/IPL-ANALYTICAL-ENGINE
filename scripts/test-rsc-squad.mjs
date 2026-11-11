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
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing RSC request for squad...');
  const res = await fetchUrl('https://www.iplt20.com/teams/royal-challengers-bengaluru/squad', {
    'RSC': '1',
    'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22teams%22%2C%7B%22children%22%3A%5B%22royal-challengers-bengaluru%22%2C%7B%22children%22%3A%5B%22squad%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D%7D%5D'
  });
  console.log('Status:', res.status, 'Length:', res.data.length);
  fs.writeFileSync('scripts/iplt20_rcb_squad_rsc.txt', res.data);
  console.log('Includes Kohli:', res.data.includes('Kohli'));
  console.log('Includes Bethell:', res.data.includes('Bethell'));
}

main();
