import https from 'https';
import fs from 'fs';

https.get('https://www.iplt20.com/teams/royal-challengers-bengaluru', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, res => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    // Search for all player profile links: /players/...
    const playerLinks = html.match(/\/players\/[a-z0-9\-]+/gi) || [];
    console.log('Player links found on page:', Array.from(new Set(playerLinks)));

    // Look for image tags or image URLs near player links
    const imgMatches = html.match(/pathname%3Dplayer%252F[^&"'\s]+/gi) || [];
    console.log('Direct player image pathnames found:', Array.from(new Set(imgMatches)));
  });
}).on('error', e => console.error('Error:', e.message));
