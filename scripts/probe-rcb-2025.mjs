import https from 'https';

const players2025 = [
  'virat', 'rajat', 'dayal', 'nuwan', 'bhandage', 'manoj-bhandage',
  'ngidi', 'lungi-ngidi', 'livingstone', 'liam-livingstone', 'agarwal',
  'mayank-agarwal', 'chikara', 'swastik-chikara', 'rathee', 'mohit-rathee',
  'swapnil', 'swapnil-singh', 'padikkal', 'hazlewood', 'salt', 'jitesh',
  'bhuvi', 'bhuvneshwar', 'krunal', 'david', 'tim-david', 'bethell',
  'suyash', 'shepherd', 'romario', 'rasikh', 'abhinandan'
];

function probe(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve({ url, status: res.statusCode, size: res.headers['content-length'] });
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

async function run() {
  console.log('Probing 2025-03 photoshoot assets on royalchallengers.com...');
  const found = [];
  for (const p of players2025) {
    const testUrls = [
      `https://www.royalchallengers.com/PRRCB01/public/2025-03/${p}.png`,
      `https://www.royalchallengers.com/PRRCB01/public/2025-03/${p}_0.png`,
      `https://www.royalchallengers.com/PRRCB01/public/2025-04/${p}.png`,
    ];
    for (const u of testUrls) {
      const res = await probe(u);
      if (res.status === 200) {
        console.log(`✓ Found: ${u} (${Math.round(res.size/1024)} KB)`);
        found.push({ player: p, url: u, size: res.size });
        break;
      }
    }
  }
  console.log(`Total 2025 images discovered: ${found.length}`);
}

run();
