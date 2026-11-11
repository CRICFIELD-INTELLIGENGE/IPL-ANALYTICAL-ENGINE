import fs from 'fs';

const html = fs.readFileSync('scripts/rcb_official_squad.html', 'utf8');
const names = ['agarwal', 'mayank', 'swastik', 'rathee', 'lungi', 'ngidi', 'manoj', 'bhandage'];
for (const k of names) {
  const re = new RegExp('[^"\'\\s<>]*' + k + '[^"\'\\s<>]*', 'gi');
  const matches = html.match(re) || [];
  console.log(k, '=>', matches.slice(0, 5));
}
