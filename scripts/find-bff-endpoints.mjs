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
  const text = await fetchText('/_next/static/immutable/chunks/1cf7y_irun2c1.js');
  
  // Find all endpointPath occurrences
  const epMatches = [...text.matchAll(/endpointPath:\s*["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
  console.log('endpointPath string literals found:');
  console.log([...new Set(epMatches)]);
  
  // Also search for any string matching /teams/ or /squad/ or teams/ or squad
  const paths = [...text.matchAll(/["'`](\/(?:teams|squad|players|tournaments)[^"'`]+)["'`]/g)].map(m => m[1]);
  console.log('Paths found:');
  console.log([...new Set(paths)]);
}
main();
