import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\lib\\db\\src\\schema\\index.ts', 'utf8');
const lines = content.split('\n');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export const deliveriesTable') || lines[i].includes('const deliveriesTable')) {
    startLine = i;
    break;
  }
}

if (startLine !== -1) {
  console.log(`Found deliveriesTable at line ${startLine + 1}`);
  for (let i = startLine; i < Math.min(startLine + 40, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
