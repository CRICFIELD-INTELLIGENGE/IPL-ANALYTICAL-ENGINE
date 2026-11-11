import https from 'https';

function fetchText(path) {
  return new Promise(res => {
    https.get('https://www.iplt20.com' + path, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    }).on('error', () => res(''));
  });
}

async function main() {
  const text = await fetchText('/_next/static/immutable/chunks/0ftpxmu8bb0ur.js');
  const epMatches = [...text.matchAll(/endpointPath:\s*["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
  console.log('endpointPath in 0ftpxmu8bb0ur.js:');
  console.log([...new Set(epMatches)]);
  
  // Also search for /cms/
  const cmsPaths = [...text.matchAll(/["'`](\/cms\/[^"'`]+)["'`]/g)].map(m => m[1]);
  console.log('cmsPaths:');
  console.log([...new Set(cmsPaths)]);
}
main();
