import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\KIIT0001\\Downloads\\Data-Insight-Engine\\Data-Insight-Engine\\artifacts\\ipl-analytics\\src\\pages\\stats.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('isLoading') || line.includes('loading') || line.includes('error') || line.includes('Error')) {
    if (line.includes('Query') || line.includes('Matches') || line.includes('Overview') || line.includes('stats')) {
      console.log(`${i + 1}: ${line.trim()}`);
    }
  }
}
