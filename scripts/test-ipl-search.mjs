import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function searchPlayer(name) {
  const enc = encodeURIComponent(name);
  const urls = [
    `https://www.iplt20.com/api/search?q=${enc}`,
    `https://www.iplt20.com/api/bff/search?q=${enc}`,
    `https://www.iplt20.com/api/bff/players?search=${enc}`,
    `https://www.iplt20.com/api/bff/cms/players?name=${enc}`
  ];
  for (const u of urls) {
    try {
      const res = await get(u);
      if (res.status === 200) {
        console.log(`Success on ${u}: length ${res.data.length}`);
        console.log(res.data.substring(0, 300));
        return;
      }
    } catch (e) {}
  }
  console.log(`No match for ${name}`);
}

async function main() {
  await searchPlayer('Faf du Plessis');
  await searchPlayer('Glenn Maxwell');
}
main();
