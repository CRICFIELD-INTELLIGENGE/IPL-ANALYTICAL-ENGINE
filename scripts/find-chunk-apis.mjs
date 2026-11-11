import https from 'https';
import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');
const scriptChunks = [...html.matchAll(/src="(\/_next\/static\/immutable\/chunks\/[^"]+\.js)"/g)].map(m => m[1]);

console.log('Total script chunks in HTML:', scriptChunks.length);

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
  for (const chunk of scriptChunks) {
    const text = await fetchText(chunk);
    if (text.includes('squad') || text.includes('team-assets') || text.includes('player-bg')) {
      console.log('Chunk has squad logic:', chunk, 'Size:', text.length);
      // Look for fetch or api calls in this chunk
      const apiCalls = text.match(/\/api\/[a-zA-Z0-9_\-\/?&=%]+/g) || [];
      if (apiCalls.length > 0) {
        console.log('  APIs in chunk:', [...new Set(apiCalls)]);
      }
    }
  }
}
main();
