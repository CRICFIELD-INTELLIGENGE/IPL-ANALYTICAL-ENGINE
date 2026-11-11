import fs from 'fs';

const html = fs.readFileSync('scratch/iplt20_rcb_2024.html', 'utf8');

// Look for self.__next_f or RSC flight chunks or __NEXT_DATA__
console.log('HTML size:', html.length);

const rscChunks = [];
const rscRegex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
let match;
while ((match = rscRegex.exec(html)) !== null) {
  rscChunks.push(match[1]);
}

console.log('RSC Chunks count:', rscChunks.length);
if (rscChunks.length > 0) {
  const fullRSC = rscChunks.join('\n');
  fs.writeFileSync('scratch/iplt20_rcb_2024_rsc.txt', fullRSC);
  console.log('Saved RSC text to scratch/iplt20_rcb_2024_rsc.txt, length:', fullRSC.length);
  
  // Search for player objects or image urls
  const matches = [...fullRSC.matchAll(/(https?:\\\/\\\/[^"]+?\.(?:png|jpg|jpeg|webp))/gi)];
  console.log('Image URLs found in RSC:', matches.length);
  const uniqueUrls = new Set(matches.map(m => m[1].replace(/\\\//g, '/')));
  for (const u of uniqueUrls) {
    if (u.includes('player') || u.includes('bcci') || u.includes('headshot')) {
      console.log('Relevant URL:', u);
    }
  }
}
