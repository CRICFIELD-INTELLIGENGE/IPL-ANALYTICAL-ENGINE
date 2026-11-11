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
  let pos = 0;
  while ((pos = text.indexOf('/api/bff', pos)) !== -1) {
    console.log('--- BFF call at', pos, '---');
    console.log(text.substring(Math.max(0, pos - 150), Math.min(text.length, pos + 250)));
    pos += 8;
  }
}
main();
