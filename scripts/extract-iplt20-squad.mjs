import fs from 'fs';

const html = fs.readFileSync('scripts/iplt20_rcb_squad.html', 'utf8');

const squadStart = html.indexOf('\\"squad\\":{\\"players\\":');
if (squadStart === -1) {
  console.log('Not found');
  process.exit(1);
}

// Find the players array
const chunk = html.substring(squadStart, squadStart + 20000);
// Unescape the JSON chunk
const unescaped = chunk.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// Find JSON ending
let depth = 0;
let jsonEnd = -1;
const startIdx = unescaped.indexOf('{');
for (let i = startIdx; i < unescaped.length; i++) {
  if (unescaped[i] === '{') depth++;
  else if (unescaped[i] === '}') {
    depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}

if (jsonEnd !== -1) {
  const jsonStr = unescaped.substring(startIdx, jsonEnd);
  try {
    const data = JSON.parse(jsonStr);
    console.log('Parsed successfully! Total players in squad:', data.players?.length);
    console.log(JSON.stringify(data.players, null, 2));
    fs.writeFileSync('scripts/iplt20_rcb_parsed_squad.json', JSON.stringify(data.players, null, 2));
  } catch (e) {
    console.log('Parse error:', e.message);
    console.log('Preview:', jsonStr.substring(0, 500));
  }
} else {
  console.log('Could not find jsonEnd, preview:', unescaped.substring(0, 500));
}
