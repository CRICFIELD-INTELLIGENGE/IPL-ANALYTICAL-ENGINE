import https from 'https';
import fs from 'fs';

const squads = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/squads-by-season.json', 'utf8'));
const rcb2025 = squads['2025']['Royal Challengers Bengaluru'];

function probe(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve({ status: res.statusCode, size: Number(res.headers['content-length'] || 0) });
    }).on('error', () => resolve({ status: 500, size: 0 }));
  });
}

// Map each 2025 player to candidate URLs from iplt20 and royalchallengers.com
const candidateSources = {
  'Virat Kohli': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/164.png',
    'https://documents.iplt20.com/ipl/IPLHeadshot2024/164.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/virat.png'
  ],
  'Josh Hazlewood': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/857.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2813%29.png'
  ],
  'Phil Salt': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/3511.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2817%29_0.png'
  ],
  'Jitesh Sharma': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/Jitesh%203_0.png'
  ],
  'Rajat Patidar': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/5471.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/rajat.png'
  ],
  'Bhuvneshwar Kumar': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/116.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/bhuvi_0.png'
  ],
  'Liam Livingstone': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/livingstone.png',
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/3644.png'
  ],
  'Rasikh Salam Dar': [
    'https://www.iplt20.com/api/team-assets?pathname=player%2F8903%2F2138%2F68859.png&brand=ipl',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2818%29.png'
  ],
  'Krunal Pandya': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/krunal.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2815%29.png'
  ],
  'Yash Dayal': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/dayal.png'
  ],
  'Tim David': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/david.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2823%29_0.png'
  ],
  'Jacob Bethell': [
    'https://www.iplt20.com/api/team-assets?pathname=player%2F8903%2F2138%2F73907.png&brand=ipl',
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/bethell.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/Jacob_0.png'
  ],
  'Suyash Sharma': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2821%29.png'
  ],
  'Devdutt Padikkal': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/5430.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2810%29_0.png'
  ],
  'Nuwan Thushara': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/nuwan.png'
  ],
  'Romario Shepherd': [
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/romario.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2819%29_0.png'
  ],
  'Lungi Ngidi': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/3746.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2816%29.png'
  ],
  'Swapnil Singh': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2025/3180.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2822%29.png'
  ],
  'Abhinandan Singh': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2811%29.png'
  ],
  'Manoj Bhandage': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/manoj-bhandage.png'
  ],
  'Mohit Rathee': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/mohit-rathee.png'
  ],
  'Swastik Chikara': [
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/swastik-chikara.png'
  ],
  'MA Agarwal': [
    'https://documents.iplt20.com/ipl/IPLHeadshot2024/158.png',
    'https://documents.iplt20.com/ipl/IPLHeadshot2023/158.png'
  ]
};

async function main() {
  console.log('Resolving RCB 2025 official player portraits...');
  const results = [];
  for (const p of rcb2025) {
    const urls = candidateSources[p.name] || [];
    let found = null;
    for (const u of urls) {
      const res = await probe(u);
      if (res.status === 200 && res.size > 20000) {
        found = { url: u, size: res.size };
        break;
      }
    }
    console.log(`${p.name}: ${found ? `OK (${Math.round(found.size/1024)} KB) -> ${found.url}` : 'NOT FOUND'}`);
    results.push({ player: p, source: found });
  }
  fs.writeFileSync('scripts/rcb-2025-resolved.json', JSON.stringify(results, null, 2));
}

main();
