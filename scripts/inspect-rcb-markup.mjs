import https from 'https';
import fs from 'fs';

https.get('https://www.iplt20.com/teams/royal-challengers-bengaluru', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, res => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    // Find all player cards or images with names
    // Next.js App Router renders RSC payloads inside self.__next_f.push([1, "..."])
    const rscMatches = html.match(/self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g);
    console.log('RSC script blocks found:', rscMatches ? rscMatches.length : 0);

    // Search for player names in html
    const sampleNames = ['Kohli', 'Hazlewood', 'Patidar', 'Dayal', 'Krunal', 'Salt'];
    for (const name of sampleNames) {
      const idx = html.indexOf(name);
      if (idx !== -1) {
        console.log(`Found "${name}" around index ${idx}. Context:`);
        console.log(html.slice(Math.max(0, idx - 150), idx + 250));
        break;
      }
    }
  });
}).on('error', e => console.error('Error:', e.message));
