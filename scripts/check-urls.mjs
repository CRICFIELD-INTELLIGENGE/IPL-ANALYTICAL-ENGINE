import https from 'https';

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function main() {
  const ids = [164, 116, 2, 147, 857, 115, 117];
  for (const id of ids) {
    const html = await fetchPage(`https://www.iplt20.com/players/${id}`);
    const nameMatch = html.match(/<h1[^>]*class="[^"]*player-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) 
      || html.match(/<title>([^<]+)<\/title>/i);
    const clean = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'Unknown';
    console.log(`Player ID ${id}: ${clean}`);
  }
}

main();
