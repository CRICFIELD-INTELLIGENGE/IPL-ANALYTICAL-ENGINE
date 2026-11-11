import fs from 'fs';

const html = fs.readFileSync('./scripts/rcb_official_squad.html', 'utf8');
console.log('rcb_official_squad.html length:', html.length);

const names = ['Kohli', 'Patidar', 'Hazlewood', 'Salt', 'Yash', 'Krunal', 'Bhuvneshwar', 'Padikkal'];
for (const n of names) {
  console.log(n, 'in official html:', html.includes(n));
}

// Find any JSON or API endpoints in the page
const jsonMatches = html.match(/\{"[^"]+":[\s\S]*?\}/g) || [];
console.log('JSON matches found:', jsonMatches.length);

// Print all links
const links = html.match(/href="([^"]+)"/g) || [];
console.log('Links on page:', links.filter(l => l.includes('squad') || l.includes('player') || l.includes('team')));
