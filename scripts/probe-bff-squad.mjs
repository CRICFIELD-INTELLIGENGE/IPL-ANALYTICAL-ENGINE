import https from 'https';

function probe(url) {
  return new Promise(res => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res({ url, status: r.statusCode, length: d.length, sample: d.substring(0, 150) }));
    }).on('error', () => res({ url, status: 500 }));
  });
}

async function main() {
  const tests = [
    'https://www.iplt20.com/api/bff/teams/royal-challengers-bengaluru/squad',
    'https://www.iplt20.com/api/bff/teams/2138/squad',
    'https://www.iplt20.com/api/bff/teams/royal-challengers-bengaluru',
    'https://www.iplt20.com/api/bff/cms/teams/royal-challengers-bengaluru/squad',
    'https://www.iplt20.com/api/bff/cms/teams/2138/squad',
    'https://www.iplt20.com/api/bff/tournaments/8903/teams/2138/squad',
    'https://www.iplt20.com/api/bff/teams/squad?teamId=2138',
    'https://www.iplt20.com/api/bff/squad?teamId=2138',
    'https://www.iplt20.com/api/bff/cms/squad?teamId=2138',
    'https://www.iplt20.com/api/bff/cms/squad/2138',
    'https://www.iplt20.com/api/bff/squad/2138'
  ];
  for (const t of tests) {
    const r = await probe(t);
    console.log(r.status, r.length, r.url, r.sample);
  }
}
main();
