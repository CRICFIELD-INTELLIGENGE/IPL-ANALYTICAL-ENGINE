import fs from 'fs';
import https from 'https';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = `${u.protocol}//${u.host}${loc}`;
        }
        return fetchUrl(loc).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

async function run() {
  console.log('Fetching official RCB squad page: https://www.royalchallengers.com/rcb-squad-men ...');
  try {
    const res = await fetchUrl('https://www.royalchallengers.com/rcb-squad-men');
    console.log('RCB official squad page status:', res.status, 'bytes:', res.body.length);
    fs.writeFileSync('./scripts/rcb_official_squad.html', res.body);
    
    // Look for player images and names in rcb_official_squad.html
    const imgMatches = res.body.match(/https?:\/\/[^\s"'<>]+\.(?:png|webp|jpg|jpeg)/gi) || [];
    console.log('Total images found on official RCB squad page:', imgMatches.length);
    const candidateImgs = imgMatches.filter(u => u.toLowerCase().includes('player') || u.toLowerCase().includes('squad') || u.toLowerCase().includes('assets') || u.toLowerCase().includes('upload'));
    console.log('Candidate player images:', candidateImgs.slice(0, 20));
  } catch (e) {
    console.error('Failed to fetch royalchallengers.com:', e.message);
  }

  // Also parse iplt20 html
  if (fs.existsSync('./scripts/rcb_page.html')) {
    const iplHtml = fs.readFileSync('./scripts/rcb_page.html', 'utf8');
    console.log('\n--- Analyzing IPLT20 RCB page ---');
    
    // Search for player cutouts/portraits
    // In IPLT20 Next.js, images are often in /api/team-assets?pathname=... or sportz.io
    const matches = Array.from(new Set(iplHtml.match(/(?:pathname=player%2F[^"'\s&]+|player\/[0-9]+\/[0-9]+\/[0-9]+\.png|https?:\/\/[^"'\s&]+\.(?:png|webp|jpg))/gi) || []));
    console.log('IPLT20 matches found:', matches.length);
    console.log('Sample matches:', matches.slice(0, 15));
  }
}

run();
