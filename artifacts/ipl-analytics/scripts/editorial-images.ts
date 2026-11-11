// Editorial image manifest — command line.
//
//   pnpm exec tsx scripts/editorial-images.ts status
//   pnpm exec tsx scripts/editorial-images.ts activate --article art-srh-01 --section s2 --asset 2209926480 \
//        --file /editorial/srh/head-abhishek.webp --width 1600 --height 1067 \
//        --licence "GI-INV-12345" --credit "Photo by … / Getty Images" --by "Your Name" --confirm --caption-verified \
//        [--licensor "Getty Images"] [--expires 2027-10-31] [--caption "…"]
//   Gallery leads: add --from-gallery --asset <chosen frame id> --page <its Getty asset page URL>.
//   pnpm exec tsx scripts/editorial-images.ts reject --article art-srh-01 --section s2 --asset 2209926480 --by "Your Name" --reason "wrong season"
//
// "activate" turns a pending-license Getty candidate into a licensed, self-hosted
// image. Put the licensed file under public/editorial/ first. --confirm records
// that you checked the four rights items (licence covers this use, editorial
// context, photo matches the segment, credit kept). The record must then pass
// the same gate the article page uses, or nothing is written.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EditorialImage, EditorialImageManifest } from "../src/data/editorial-images/types";
import { publishBlockers } from "../src/lib/editorial-images";

const MANIFEST = resolve(import.meta.dirname, "../src/data/editorial-images/manifest.json");
const PUBLIC_DIR = resolve(import.meta.dirname, "../public");

const [cmd, ...rest] = process.argv.slice(2);
const args: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) continue;
  const key = rest[i].slice(2);
  const next = rest[i + 1];
  args[key] = next && !next.startsWith("--") ? (i++, next) : "true";
}

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const load = () => JSON.parse(readFileSync(MANIFEST, "utf8")) as EditorialImageManifest;
const save = (m: EditorialImageManifest) => {
  m.updatedAt = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
};

// --from-gallery: the candidate is a match-gallery lead; --asset and --page name the frame you chose from it.
function findCandidate(m: EditorialImageManifest): number {
  for (const k of ["article", "section", "asset"]) if (!args[k]) fail(`--${k} is required`);
  const fromGallery = args["from-gallery"] === "true";
  const idx = m.images.findIndex(
    (i) =>
      i.articleId === args.article &&
      i.sectionId === args.section &&
      (fromGallery ? i.discovery?.kind === "event-gallery" && i.rightsStatus.startsWith("pending") : i.assetId === args.asset),
  );
  if (idx < 0) fail(`no ${fromGallery ? "pending gallery lead" : `candidate ${args.asset}`} for ${args.article}/${args.section}`);
  if (fromGallery) {
    if (!args.page) fail("--page (the chosen frame's Getty asset page URL) is required with --from-gallery");
    const g = m.images[idx];
    m.images[idx] = { ...g, assetId: args.asset, sourcePageUrl: args.page, discovery: { ...g.discovery!, kind: "asset" } };
  }
  return idx;
}

if (cmd === "status") {
  const m = load();
  const by: Record<string, number> = {};
  m.images.forEach((i) => (by[i.rightsStatus] = (by[i.rightsStatus] ?? 0) + 1));
  const live = m.images.filter((i) => publishBlockers(i).length === 0);
  console.log(`manifest updated ${m.updatedAt}`);
  console.log(Object.entries(by).map(([k, v]) => `  ${k}: ${v}`).join("\n") || "  (empty)");
  console.log(`publishable now: ${live.length}`);
  live.forEach((i) => console.log(`  ✓ ${i.articleId}/${i.sectionId} ${i.assetId ?? i.licensedImageUrl}`));
} else if (cmd === "activate") {
  const m = load();
  const idx = findCandidate(m);
  const cur = m.images[idx];
  if (cur.rightsStatus !== "pending-license" && cur.rightsStatus !== "pending-review")
    fail(`candidate is "${cur.rightsStatus}", not pending`);
  for (const k of ["file", "licence", "by"]) if (!args[k]) fail(`--${k} is required`);
  if (args.confirm !== "true") fail("--confirm is required: it records that you checked the four rights items");
  if (!args.file.startsWith("/editorial/")) fail("--file must be a self-hosted path under /editorial/");
  if (!existsSync(resolve(PUBLIC_DIR, "." + args.file))) fail(`public${args.file} does not exist — add the licensed file first`);
  if (cur.discovery && !cur.discovery.captionVerified && args["caption-verified"] !== "true")
    fail("caption was never checked on the Getty page — confirm it, then pass --caption-verified");

  const next: EditorialImage = {
    ...cur,
    source: "licensed",
    rightsStatus: "licensed",
    embedHtml: undefined,
    licensedImageUrl: args.file,
    width: args.width ? Number(args.width) : cur.width,
    height: args.height ? Number(args.height) : cur.height,
    caption: args.caption ?? cur.caption,
    photographerCredit: args.credit ?? cur.photographerCredit,
    licence: { licensor: args.licensor ?? "Getty Images", reference: args.licence, expires: args.expires },
    review: {
      reviewedBy: args.by,
      reviewedAt: new Date().toISOString(),
      checklist: { usageAllowedForAsset: true, editorialContextOnly: true, matchesSectionContext: true, attributionIntact: true },
      notes: args.notes,
    },
    discovery: cur.discovery ? { ...cur.discovery, captionVerified: true } : undefined,
  };
  const blockers = publishBlockers(next);
  if (blockers.length) fail(`not activated:\n  - ${blockers.join("\n  - ")}`);
  m.images[idx] = next;
  save(m);
  console.log(`✓ ${next.articleId}/${next.sectionId} #${next.assetId} is licensed and will appear on the article.`);
  console.log("  Run scripts/check-editorial-images.ts --write-docs, then commit manifest.json and the file.");
} else if (cmd === "reject") {
  const m = load();
  const idx = findCandidate(m);
  if (!args.by) fail("--by is required");
  m.images[idx] = {
    ...m.images[idx],
    rightsStatus: "rejected",
    review: {
      reviewedBy: args.by,
      reviewedAt: new Date().toISOString(),
      checklist: { usageAllowedForAsset: false, editorialContextOnly: false, matchesSectionContext: false, attributionIntact: false },
      notes: args.reason,
    },
  };
  save(m);
  console.log(`✓ rejected ${args.article}/${args.section} #${args.asset}`);
} else {
  console.log("usage: editorial-images.ts status | activate … | reject …  (see header of this file)");
  process.exit(cmd ? 1 : 0);
}
