import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\ipl-analytics\\src\\pages\\stats.tsx', 'utf8');
const lines = content.split('\n');

let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('activeData.batters') || lines[i].includes('activeData.slicedBatters') || lines[i].includes('batters.map')) {
    start = i;
    break;
  }
}

if (start !== -1) {
  console.log(`Found batter rendering map at line ${start + 1}`);
  for (let i = Math.max(0, start - 5); i < Math.min(start + 80, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
