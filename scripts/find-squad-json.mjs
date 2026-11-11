import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

// Search with regex ignoring backslashes
const squadMatches = html.match(/\\?"squad\\?":[\s\S]{1,1000}/g) || [];
console.log('squad matches count:', squadMatches.length);
squadMatches.slice(0, 5).forEach((m, i) => console.log(`Match ${i}:`, m.substring(0, 300)));

// Let's also search for any player names we know:
const names = ['Kohli', 'Patidar', 'Hazlewood', 'Salt', 'Yash Dayal', 'Livingstone', 'Krunal', 'Bhandage'];
for (const n of names) {
  const re = new RegExp(n, 'gi');
  const count = (html.match(re) || []).length;
  console.log(`${n}: ${count} occurrences`);
}
