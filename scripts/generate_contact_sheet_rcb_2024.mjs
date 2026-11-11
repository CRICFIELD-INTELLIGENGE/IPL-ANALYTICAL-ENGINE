import fs from 'fs';
import path from 'path';

const reg = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/player-photo-registry.json', 'utf8'));
const squads = JSON.parse(fs.readFileSync('artifacts/ipl-analytics/public/data/squads-by-season.json', 'utf8'));
const rcb2024 = squads['2024']['Royal Challengers Bengaluru'];

function resolvePhoto(playerName) {
  const norm = playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const exact = reg.photos.find(p => 
    p.season === 2024 &&
    p.franchiseId === 'RCB' &&
    p.verificationStatus === 'exact_verified' &&
    (p.aliases?.some(a => a.toLowerCase() === playerName.toLowerCase() || a.toLowerCase().replace(/[^a-z0-9]+/g, '-') === norm) ||
     p.playerId === norm ||
     p.playerId?.replace(/^[a-z]-/, '') === norm.replace(/^[a-z]-/, ''))
  );
  if (exact) return { status: 'exact_verified', photo: exact };
  return { status: 'pending_user_asset', photo: null };
}

let verifiedCount = 0;
let pendingCount = 0;

const cardsHtml = rcb2024.map((p, idx) => {
  const res = resolvePhoto(p.name);
  const isExact = res.status === 'exact_verified';
  if (isExact) verifiedCount++;
  else pendingCount++;

  const roleText = p.role || (p.played ? 'Cricketer' : 'Squad Member');
  const imgUrl = isExact ? res.photo.imageUrl : null;
  const statusBadge = isExact 
    ? '<span class="status-badge exact">Exact 2024 Verified</span>'
    : '<span class="status-badge pending">Awaiting User Asset</span>';

  const avatarContent = imgUrl ? `
    <img src="${imgUrl}" alt="${p.name}" class="player-cutout" />
  ` : `
    <div class="initial-shield">
      <span>${p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
      <p class="missing-hint">Not on IPLT20</p>
    </div>
  `;

  return `
    <div class="player-card ${isExact ? 'card-verified' : 'card-pending'}">
      <div class="card-accent-bar"></div>
      <div class="card-top">
        <span class="player-num">#${String(idx + 1).padStart(2, '0')}</span>
        ${statusBadge}
      </div>
      
      <div class="portrait-stage">
        <div class="aura-halo"></div>
        <div class="grid-watermark">${p.name.slice(0, 3).toUpperCase()}</div>
        <div class="cutout-wrapper">
          ${avatarContent}
        </div>
        <div class="bottom-blend"></div>
      </div>

      <div class="card-details">
        <div class="player-name">${p.name}</div>
        <div class="player-role">${roleText}</div>
        <div class="meta-row">
          <span class="meta-tag">RCB 2024</span>
          <span class="meta-tag ${isExact ? 'tag-verified' : 'tag-pending'}">${isExact ? '100% Kit Match' : 'Pending Upload'}</span>
        </div>
      </div>
    </div>
  `;
}).join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RCB 2024 Squad — Player Jersey & Photo Verification</title>
  <style>
    :root {
      --bg-base: #050A14;
      --bg-card: #0A1224;
      --rcb-red: #C8102E;
      --rcb-gold: #D4AF37;
      --rcb-navy: #002244;
      --text-white: #FFFFFF;
      --text-dim: #8899B7;
      --border-subtle: #1E293B;
      --verified-green: #10B981;
      --pending-orange: #F59E0B;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-white);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 30px;
    }

    .header {
      max-width: 1400px;
      margin: 0 auto 30px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 20px;
    }

    .title-group h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .title-group h1 .team-tag {
      background: linear-gradient(135deg, var(--rcb-red), var(--rcb-navy));
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 14px;
      letter-spacing: 1px;
    }

    .title-group p {
      color: var(--text-dim);
      font-size: 14px;
      margin-top: 6px;
    }

    .stats-bar {
      display: flex;
      gap: 20px;
    }

    .stat-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 10px 18px;
      text-align: right;
    }

    .stat-pill .val {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-white);
    }
    .stat-pill .val.green { color: var(--verified-green); }
    .stat-pill .val.orange { color: var(--pending-orange); }

    .stat-pill .label {
      font-size: 11px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .grid-container {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 24px;
    }

    .player-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .player-card:hover {
      transform: translateY(-4px);
      border-color: rgba(200, 16, 46, 0.4);
    }

    .card-verified { border-top: 3px solid var(--verified-green); }
    .card-pending { border-top: 3px solid var(--pending-orange); }

    .card-top {
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }

    .player-num {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-dim);
    }

    .status-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .status-badge.exact { background: rgba(16, 185, 129, 0.15); color: var(--verified-green); }
    .status-badge.pending { background: rgba(245, 158, 11, 0.15); color: var(--pending-orange); }

    .portrait-stage {
      height: 280px;
      position: relative;
      background: radial-gradient(circle at 50% 60%, rgba(200, 16, 46, 0.12) 0%, rgba(5, 10, 20, 0.8) 70%);
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-end;
    }

    .aura-halo {
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(200, 16, 46, 0.2) 0%, transparent 70%);
      bottom: 20px;
      z-index: 1;
    }

    .grid-watermark {
      position: absolute;
      top: 15px;
      font-size: 64px;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.03);
      user-select: none;
      letter-spacing: -2px;
    }

    .cutout-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-end;
    }

    .player-cutout {
      max-height: 270px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
    }

    .initial-shield {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 2px dashed rgba(245, 158, 11, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin-bottom: 80px;
      z-index: 2;
    }
    .initial-shield span {
      font-size: 24px;
      font-weight: 800;
      color: var(--pending-orange);
    }
    .missing-hint {
      font-size: 8px;
      color: var(--text-dim);
      text-transform: uppercase;
      margin-top: 4px;
    }

    .bottom-blend {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 25px;
      background: linear-gradient(to top, var(--bg-card), transparent);
      z-index: 3;
    }

    .card-details {
      padding: 16px 14px;
      background: var(--bg-card);
      z-index: 4;
    }

    .player-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-white);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .player-role {
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    .meta-row {
      margin-top: 12px;
      display: flex;
      gap: 6px;
    }

    .meta-tag {
      font-size: 10px;
      padding: 3px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-dim);
      font-weight: 600;
    }
    .meta-tag.tag-verified { color: var(--verified-green); background: rgba(16, 185, 129, 0.1); }
    .meta-tag.tag-pending { color: var(--pending-orange); background: rgba(245, 158, 11, 0.1); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>Royal Challengers Bengaluru <span class="team-tag">2024 SQUAD</span></h1>
      <p>Official IPLT20 photoshoot cutout extraction & jersey mapping pipeline (Season 2024)</p>
    </div>
    <div class="stats-bar">
      <div class="stat-pill">
        <div class="val green">${verifiedCount} / 25</div>
        <div class="label">Mapped & Verified</div>
      </div>
      <div class="stat-pill">
        <div class="val orange">${pendingCount}</div>
        <div class="label">Awaiting User Asset</div>
      </div>
    </div>
  </div>

  <div class="grid-container">
    ${cardsHtml}
  </div>
</body>
</html>
`;

fs.writeFileSync('artifacts/ipl-analytics/public/contact-sheet-rcb-2024.html', htmlContent);
fs.writeFileSync('artifacts/ipl-analytics/dist/public/contact-sheet-rcb-2024.html', htmlContent);
console.log(`Generated contact-sheet-rcb-2024.html: ${verifiedCount} mapped, ${pendingCount} pending.`);
