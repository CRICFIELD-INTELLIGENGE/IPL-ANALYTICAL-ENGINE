import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\api-server\\src\\services\\stats-aggregator.ts', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('representation') || line.includes('current-squad')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
