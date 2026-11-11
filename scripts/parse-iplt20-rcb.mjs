import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

// Find all squad-card-rail blocks
let idx = 0;
let count = 0;
while ((idx = html.indexOf('data-testid="squad-card-rail"', idx)) !== -1) {
  count++;
  const chunk = html.substring(idx, idx + 1200);
  console.log(`\n=== Card ${count} ===`);
  console.log(chunk);
  idx += 30;
}
console.log(`Total squad-card-rail found: ${count}`);
