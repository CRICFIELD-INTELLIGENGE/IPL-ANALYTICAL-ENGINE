import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\scripts\\src\\update-ipl-data.ts', 'utf8');
const lines = content.split('\n');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async function getOrCreatePlayer') || lines[i].includes('const getOrCreatePlayer') || lines[i].includes('let getOrCreatePlayer')) {
    startLine = i;
    break;
  }
}

if (startLine !== -1) {
  console.log(`Found getOrCreatePlayer in update-ipl-data.ts at line ${startLine + 1}`);
  for (let i = Math.max(0, startLine - 2); i < Math.min(startLine + 40, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('Not found');
}
