import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\schema.sql', 'utf8');
const lines = content.split('\n');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CREATE TABLE current_squad') || lines[i].includes('create table current_squad')) {
    startLine = i;
    break;
  }
}

if (startLine !== -1) {
  console.log(`Found current_squad table at line ${startLine + 1}`);
  for (let i = startLine; i < Math.min(startLine + 30, lines.length); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
    if (lines[i].includes(');')) break;
  }
} else {
  console.log('Not found');
}
