import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

let pos = 0;
while ((pos = html.indexOf('Patidar', pos)) !== -1) {
  console.log('--- Patidar at', pos, '---');
  console.log(html.substring(Math.max(0, pos - 300), Math.min(html.length, pos + 800)));
  pos += 7;
}
