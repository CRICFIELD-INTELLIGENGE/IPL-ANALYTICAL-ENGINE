import https from 'https';

function probe(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve({ url, status: res.statusCode, headers: res.headers });
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

async function main() {
  const testUrls = [
    'https://www.iplt20.com/api/team-assets?pathname=player/8903/2138/73907.png&brand=ipl',
    'https://assets-icc.sportz.io/cricket/v1/player/73907.png',
    'https://www.royalchallengers.com/squad',
    'https://www.royalchallengers.com/rcb-squad',
  ];

  for (const u of testUrls) {
    const res = await probe(u);
    console.log(u, '=>', res.status || res.error);
  }
}

main();
