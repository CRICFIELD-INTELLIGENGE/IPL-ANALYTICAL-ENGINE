import fs from 'fs';

const html = fs.readFileSync('./scripts/rcb_official_squad.html', 'utf8');

// Match all player card blocks
// Structure:
// <div class="views-row">... <img alt="..." ... data-src="/PRRCB01/public/styles/s/public/..." ... /> ...
// followed by <a href="/rcb-squad/...">Player Name</a>

// Let's find each views-row
const rows = html.split('<div class="views-row">');
console.log('Total views-row blocks:', rows.length);

const rcbExtracted = [];

for (const row of rows.slice(1)) {
  // Extract data-src
  const dataSrcMatch = row.match(/data-src="([^"]+)"/);
  // Extract alt
  const altMatch = row.match(/alt="([^"]+)"/);
  // Extract player link & name
  // E.g. <span class="tm-lis-fn"><a href="/rcb-squad/[^"]+">Name</a></span>
  const nameMatch = row.match(/<span class="tm-lis-fn"><a[^>]*>([^<]+)<\/a><\/span>/) ||
                    row.match(/<a href="(?:\/rcb-squad\/|http:\/\/www\.royalchallengers\.com\/rcb-squad\/)[^"]*">([^<]+)<\/a>/);
  
  const roleMatch = row.match(/<span class="rcb-pyr-tye">([^<]+)<\/span>/);

  if (nameMatch && dataSrcMatch) {
    const rawName = nameMatch[1].trim();
    // Ignore coaching/support staff
    const staff = ['Andy Flower', 'Mo Bobat', 'Dinesh Karthik', 'Omkar Salvi', 'Malolan Rangarajan',
                   'Basu Shanker', 'Richard Halsall', 'Tamara Zweck', 'James Pipe', 'Navnita Gautam',
                   'Major Shaminder Singh Sidhu', 'Arihant Jain', 'Rajesh Menon', 'Nikhil Sosale',
                   'Ajith Ramamurthy', 'Ramesh Mane', 'Rohit Singh', 'Freddie Wilde'];
    
    const isStaff = staff.some(s => s.toLowerCase() === rawName.toLowerCase());

    const relativeUrl = dataSrcMatch[1];
    const fullUrl = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `https://www.royalchallengers.com${relativeUrl}`;

    rcbExtracted.push({
      name: rawName,
      role: roleMatch ? roleMatch[1].trim() : 'Player',
      alt: altMatch ? altMatch[1] : '',
      imageUrl: fullUrl,
      isStaff
    });
  }
}

console.log(`Extracted ${rcbExtracted.length} entries (${rcbExtracted.filter(p => !p.isStaff).length} squad players, ${rcbExtracted.filter(p => p.isStaff).length} staff)`);
console.log(JSON.stringify(rcbExtracted.filter(p => !p.isStaff), null, 2));

fs.writeFileSync('./scripts/rcb-2026-official-players.json', JSON.stringify(rcbExtracted.filter(p => !p.isStaff), null, 2));
console.log('Saved rcb-2026-official-players.json');
