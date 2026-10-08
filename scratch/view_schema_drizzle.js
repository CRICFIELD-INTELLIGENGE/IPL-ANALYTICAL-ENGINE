import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\lib\\db\\src\\schema\\index.ts', 'utf8');
const lines = content.split('\n');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('currentSquad') || lines[i].includes('current_squad')) {
    startLine = i;
    break;
  }
}

if (startLine !== -1) {
  console.log(`Found currentSquad in schema index.ts at line ${startLine + 1}`);
  for (let i = Math.max(0, startLine - 5); i < Math.min(startLine + 25, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
