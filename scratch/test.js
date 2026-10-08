const fs = require('fs');
fetch('https://www.cricbuzz.com/live-cricket-scores/90240/match', {headers: {'User-Agent': 'Mozilla/5.0'}})
.then(r=>r.text())
.then(html => {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let combined = '';
  let m;
  while ((m = re.exec(html)) !== null) {
    try { combined += JSON.parse('"' + m[1] + '"'); } catch(e) { combined += m[1]; }
  }
  fs.writeFileSync('cb_payload.txt', combined);
  console.log('Payload written');
});
