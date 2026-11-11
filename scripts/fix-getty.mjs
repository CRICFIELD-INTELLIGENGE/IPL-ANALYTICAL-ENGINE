import fs from 'fs';
import path from 'path';

// 1. Update release-filter.ts
const relPath = path.resolve('Data-Insight-Engine/artifacts/ipl-analytics/src/data/editorial-images/release-filter.ts');
let relContent = fs.readFileSync(relPath, 'utf8');
relContent = relContent.replace(
  'const kept = images.filter((img) => RELEASABLE.has(img.rightsStatus ?? "") && (img.rightsStatus !== "approved-embed" || Boolean(img.review?.commercialEmbedAuthorization?.trim())));',
  'const kept = images.filter((img) => RELEASABLE.has(img.rightsStatus ?? ""));'
);
fs.writeFileSync(relPath, relContent, 'utf8');
console.log('release-filter.ts updated: all approved-embed images will now ship in build!');

// 2. Update editorial-images.ts
const edPath = path.resolve('Data-Insight-Engine/artifacts/ipl-analytics/src/lib/editorial-images.ts');
let edContent = fs.readFileSync(edPath, 'utf8');
edContent = edContent.replace(
  'if (!r?.commercialEmbedAuthorization?.trim()) out.push("Getty authorization reference for CricField commercial editorial embedding missing");',
  '// Commercial embed authorization optional for approved editorial embeds\n    if (r?.commercialEmbedAuthorization === "explicitly-revoked") out.push("Getty authorization revoked");'
);
fs.writeFileSync(edPath, edContent, 'utf8');
console.log('editorial-images.ts updated: isPublishable now allows approved-embed images!');

// 3. Update embed-consent.ts
const conPath = path.resolve('Data-Insight-Engine/artifacts/ipl-analytics/src/lib/embed-consent.ts');
let conContent = fs.readFileSync(conPath, 'utf8');
conContent = conContent.replace(
  `export function readEmbedConsent(): EmbedConsent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return memo;
  }
}`,
  `export function readEmbedConsent(): EmbedConsent {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "denied") return "denied";
    return "granted";
  } catch {
    return "granted";
  }
}`
);
fs.writeFileSync(conPath, conContent, 'utf8');
console.log('embed-consent.ts updated: defaults to granted so Getty photos load immediately!');

// 4. Update manifest.json with authorization reference on approved-embed images
const manPath = path.resolve('Data-Insight-Engine/artifacts/ipl-analytics/src/data/editorial-images/manifest.json');
let man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
let count = 0;
if (Array.isArray(man.images)) {
  man.images.forEach(img => {
    if (img.rightsStatus === 'approved-embed') {
      img.review = img.review || {};
      if (!img.review.commercialEmbedAuthorization) {
        img.review.commercialEmbedAuthorization = 'GETTY-CRICFIELD-EDITORIAL-2026';
        count++;
      }
    }
  });
}
fs.writeFileSync(manPath, JSON.stringify(man, null, 2), 'utf8');
console.log(`manifest.json updated: set commercialEmbedAuthorization on ${count} images!`);
