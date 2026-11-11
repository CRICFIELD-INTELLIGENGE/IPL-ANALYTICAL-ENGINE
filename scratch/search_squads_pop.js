import fs from 'fs';
import path from 'path';

const dir = 'C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\scripts\\src';
const files = fs.readdirSync(dir);

for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('current_squad') || content.includes('currentSquad') || content.includes('current-squads')) {
      console.log(`Found in file: ${file}`);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('current_squad') || lines[i].includes('currentSquad') || lines[i].includes('current-squads')) {
          console.log(`  Line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
  }
}
