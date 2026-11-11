// Editorial image checks: rights gate, embed parser, planner, committed manifest.
//   pnpm exec tsx scripts/check-editorial-images.ts               → run checks
//   pnpm exec tsx scripts/check-editorial-images.ts --write-docs  → also regenerate docs/editorial-images/*
// Fixtures below are synthetic (asset ids 100000001…) and exist only in this
// script; they are never written to the manifest.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EDITORIAL_ARTICLES } from "../src/data/editorial-magazine-data";
import type { EditorialImage, EditorialImageManifest } from "../src/data/editorial-images/types";
import {
  PUBLIC_MANIFEST,
  getLocalEmbedImages,
  getPublishedArticleImages,
  gettyAssetIdFromPage,
  isPublishable,
  parseGettyEmbed,
  publishBlockers,
} from "../src/lib/editorial-images";
import { planAllArticles } from "../src/lib/editorial-image-plan";
import { filterManifestForRelease } from "../src/data/editorial-images/release-filter";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
  }
}

const embed = (items: string, id = "TestEmbed01") =>
  `<a id='${id}' class='gie-single' href='http://www.gettyimages.com/detail/${items}' target='_blank' style='color:#a7a7a7;text-decoration:none;font-weight:normal !important;border:none;display:inline-block;'>Embed from Getty Images</a>` +
  `<script>window.gie=window.gie||function(c){(gie.q=gie.q||[]).push(c)};gie(function(){gie.widgets.load({id:'${id}',sig:'abcdEFGH1234ijkl=',w:'594px',h:'396px',items:'${items}',caption: true ,tld:'com',is360: false })});</script>` +
  `<script src='//embed-cdn.gettyimages.com/widgets.js' charset='utf-8' async></script>`;

const review = {
  commercialEmbedAuthorization: "SYNTHETIC TEST AUTHORIZATION - NOT A REAL LICENCE",
  reviewedBy: "Test Reviewer",
  reviewedAt: "2026-10-25T00:00:00.000Z",
  checklist: { usageAllowedForAsset: true, editorialContextOnly: true, matchesSectionContext: true, attributionIntact: true },
};

const approvedEmbed: EditorialImage = {
  articleId: "art-srh-01",
  sectionId: "s2",
  source: "getty",
  assetId: "100000001",
  sourcePageUrl: "https://www.gettyimages.com/detail/news-photo/test-fixture-news-photo/100000001",
  embedHtml: embed("100000001"),
  caption: "TEST FIXTURE",
  photographerCredit: "Test Photographer",
  altText: "Test fixture",
  rightsStatus: "approved-embed",
  review,
};

const licensedFile: EditorialImage = {
  articleId: "art-srh-01",
  sectionId: "hero",
  source: "licensed",
  licensedImageUrl: "/editorial/srh/test.webp",
  width: 1600,
  height: 900,
  caption: "TEST FIXTURE",
  photographerCredit: "Test Photographer / Getty Images",
  altText: "Test fixture",
  rightsStatus: "licensed",
  licence: { licensor: "Getty Images", reference: "TEST-1" },
  review,
};

// ── Rights gate ──────────────────────────────────────────────────────────────
check("valid approved embed is publishable", () => assert.deepEqual(publishBlockers(approvedEmbed), []));
check("valid licensed file is publishable", () => assert.deepEqual(publishBlockers(licensedFile), []));
check("pending-review never publishes", () => assert.equal(isPublishable({ ...approvedEmbed, rightsStatus: "pending-review" }), false));
check("rejected never publishes", () => assert.equal(isPublishable({ ...approvedEmbed, rightsStatus: "rejected" }), false));
check("approval without reviewer blocked", () => assert.equal(isPublishable({ ...approvedEmbed, review: undefined }), false));
check("incomplete checklist blocked", () =>
  assert.equal(isPublishable({ ...approvedEmbed, review: { ...review, checklist: { ...review.checklist, matchesSectionContext: false } } }), false));
check("embed for a different asset blocked", () => assert.equal(isPublishable({ ...approvedEmbed, embedHtml: embed("100000002") }), false));
check("asset page for a different asset blocked", () =>
  assert.equal(isPublishable({ ...approvedEmbed, sourcePageUrl: "https://www.gettyimages.com/detail/100000009" }), false));
check("approved-embed with direct image URL blocked", () =>
  assert.equal(isPublishable({ ...approvedEmbed, licensedImageUrl: "/x.webp" }), false));
check("Getty preview URL as licensed file blocked", () =>
  assert.equal(isPublishable({ ...licensedFile, licensedImageUrl: "https://media.gettyimages.com/id/100000001/photo/x.jpg" }), false));
check("iStock URL as licensed file blocked", () =>
  assert.equal(isPublishable({ ...licensedFile, licensedImageUrl: "https://media.istockphoto.com/id/1/x.jpg" }), false));
check("protocol-relative URL blocked", () => assert.equal(isPublishable({ ...licensedFile, licensedImageUrl: "//cdn.example.com/x.jpg" }), false));
check("licensed without licence reference blocked", () => assert.equal(isPublishable({ ...licensedFile, licence: undefined }), false));
check("expired licence blocked", () =>
  assert.equal(isPublishable({ ...licensedFile, licence: { licensor: "Getty Images", reference: "T", expires: "2020-01-01" } }), false));
check("missing credit blocked", () => assert.equal(isPublishable({ ...approvedEmbed, photographerCredit: "" }), false));
check("original CricField art needs no licence ref", () =>
  assert.equal(isPublishable({ ...licensedFile, source: "original", licence: undefined, photographerCredit: "CricField Graphics" }), true));

check("pending-license never publishes", () => assert.equal(isPublishable({ ...licensedFile, rightsStatus: "pending-license" }), false));
const discovered = { kind: "asset" as const, method: "web-search" as const, query: "q", foundAt: "2026-10-25", captionVerified: false };
check("unverified caption blocks activation", () => assert.equal(isPublishable({ ...licensedFile, discovery: discovered }), false));
check("verified caption allows activation", () =>
  assert.equal(isPublishable({ ...licensedFile, discovery: { ...discovered, captionVerified: true } }), true));
check("gallery lead cannot be activated", () =>
  assert.equal(isPublishable({ ...licensedFile, discovery: { ...discovered, kind: "event-gallery", captionVerified: true } }), false));
check("licensed Getty asset needs its asset page", () =>
  assert.equal(isPublishable({ ...licensedFile, assetId: "100000001", sourcePageUrl: undefined }), false));

// ── Release filter + local preview ───────────────────────────────────────────
check("release build strips every unlicensed candidate", () => {
  const src = JSON.stringify({
    version: 1,
    updatedAt: "",
    images: [licensedFile, approvedEmbed, { ...licensedFile, rightsStatus: "pending-license" }, { ...licensedFile, rightsStatus: "rejected" }],
  });
  const r = filterManifestForRelease(src);
  assert.equal(r.kept, 2);
  assert.equal(r.stripped, 2);
  assert.ok(!r.json.includes("pending-license") && !r.json.includes("rejected"));
});
check("committed manifest's candidates never reach a release build", () => {
  const r = filterManifestForRelease(JSON.stringify(PUBLIC_MANIFEST));
  const pending = PUBLIC_MANIFEST.images.filter((i) => i.rightsStatus.startsWith("pending"));
  pending.forEach((p) => assert.ok(!p.assetId || !r.json.includes(p.assetId), p.assetId));
});
check("localhost embeds: pending candidates cannot bypass authorization", () => {
  const m: EditorialImageManifest = {
    version: 1,
    updatedAt: "",
    images: [
      { ...approvedEmbed, sectionId: "s1", rightsStatus: "pending-license", discovery: discovered },
      { ...approvedEmbed, sectionId: "s2", rightsStatus: "pending-license", embedHtml: embed("100000002") },
      { ...approvedEmbed, sectionId: "s3", rightsStatus: "pending-license", embedHtml: undefined },
      { ...approvedEmbed, sectionId: "s4", rightsStatus: "rejected" },
      { ...licensedFile, sectionId: "s5", rightsStatus: "pending-license" },
    ],
  };
  assert.deepEqual(Object.keys(getLocalEmbedImages("art-srh-01", m)), []);
});

check("commercial embed authorization required", () => assert.equal(isPublishable({ ...approvedEmbed, review: { ...review, commercialEmbedAuthorization: undefined } }), false));

// ── Embed parser ─────────────────────────────────────────────────────────────
check("parses official embed", () => {
  const p = parseGettyEmbed(embed("100000001"));
  assert.ok(p);
  assert.equal(p!.items, "100000001");
  assert.equal(p!.detailUrl, "https://www.gettyimages.com/detail/100000001");
});
check("rejects arbitrary HTML", () => assert.equal(parseGettyEmbed("<img src=x onerror=alert(1)>"), null));
check("rejects embed with injected id", () => assert.equal(parseGettyEmbed(embed("100000001", "x' onload='alert(1)")), null));
check("rejects multi-image embeds", () => assert.equal(parseGettyEmbed(embed("100000001,100000002")), null));

// ── Public lookup ────────────────────────────────────────────────────────────
check("lookup returns only publishable records", () => {
  const m: EditorialImageManifest = {
    version: 1,
    updatedAt: "",
    images: [{ ...approvedEmbed, sectionId: "s1", rightsStatus: "pending-review" }, approvedEmbed, licensedFile],
  };
  const got = getPublishedArticleImages("art-srh-01", m);
  assert.deepEqual(Object.keys(got).sort(), ["hero", "s2"]);
  assert.deepEqual(getPublishedArticleImages("art-rcb-01", m), {});
});

// ── Planner ──────────────────────────────────────────────────────────────────
const plans = planAllArticles();
check("plans every article", () => assert.equal(plans.length, EDITORIAL_ARTICLES.length));
check("six slots per article", () => plans.forEach((p) => assert.equal(p.slots.length, 6, p.articleId)));
check("every query names the article's franchise", () =>
  plans.forEach((p) => p.slots.forEach((s) => assert.ok(s.query.includes(p.franchiseName), `${p.articleId}/${s.sectionId}`))));
check("SRH cover story segment 2 targets Head and Abhishek", () => {
  const s2 = plans.find((p) => p.articleId === "art-srh-01")!.slots[2];
  assert.deepEqual(s2.players, ["Travis Head", "Abhishek Sharma"]);
});
check("search links go to Getty editorial search", () =>
  plans.forEach((p) => p.slots.forEach((s) => assert.match(s.gettySearchUrl, /^https:\/\/www\.gettyimages\.com\/search\/2\/image\?family=editorial&phrase=/))));

// ── Committed manifest ───────────────────────────────────────────────────────
// Legacy Dugout articles plus v2 articles (the 1,000-article programme) listed in the generated index.
const v2Index: { articles: { id: string }[] } = JSON.parse(readFileSync(resolve(import.meta.dirname, "../src/data/editorial/index.json"), "utf8"));
const articleIds = new Set([...EDITORIAL_ARTICLES.map((a) => a.id), ...v2Index.articles.map((a) => a.id)]);
check("manifest shape", () => {
  assert.equal(PUBLIC_MANIFEST.version, 1);
  assert.ok(Array.isArray(PUBLIC_MANIFEST.images));
});
PUBLIC_MANIFEST.images.forEach((img, i) => {
  check(`manifest[${i}] references a real article`, () => assert.ok(articleIds.has(img.articleId), img.articleId));
  check(`manifest[${i}] has no synthetic fixture id`, () => assert.ok(!/^1000000\d\d$/.test(img.assetId ?? ""), img.assetId));
  if (img.rightsStatus === "pending-license") {
    check(`manifest[${i}] candidate has a real Getty source`, () => {
      assert.ok(img.discovery, "discovery record missing");
      if (img.discovery!.kind === "asset") {
        assert.match(img.assetId ?? "", /^\d{6,12}$/);
        assert.equal(gettyAssetIdFromPage(img.sourcePageUrl), img.assetId);
      } else {
        assert.equal(img.assetId, undefined);
        assert.match(img.sourcePageUrl ?? "", /^https:\/\/www\.gettyimages\.[a-z.]+\/editorial-images\/[a-z-]+\/event\/[a-z0-9-]+\/\d{6,12}$/);
      }
      assert.ok(!img.licensedImageUrl && !img.embedHtml?.includes("<img"), "no direct image URL on a candidate");
    });
  }
  if (img.rightsStatus === "approved-embed" || img.rightsStatus === "licensed")
    check(`manifest[${i}] approved record passes the gate`, () => assert.deepEqual(publishBlockers(img), []));
});

// ── Docs ─────────────────────────────────────────────────────────────────────
if (process.argv.includes("--write-docs")) {
  const outDir = resolve(import.meta.dirname, "../../../docs/editorial-images");
  mkdirSync(outDir, { recursive: true });
  const published = (id: string) => Object.keys(getPublishedArticleImages(id));

  const plan = [
    "# Editorial Dugout — image plan (generated)",
    "",
    `Generated by \`artifacts/ipl-analytics/scripts/check-editorial-images.ts --write-docs\` from the full text of all ${plans.length} articles.`,
    "Each slot lists what the photo must show and a Getty editorial search to run by hand. No asset has been selected:",
    "the plan is a brief for an editor, not a result.",
    "",
  ];
  for (const p of plans) {
    plan.push(`## ${p.teamCode} · ${p.title}`, "", `\`${p.articleId}\` · venue: ${p.venue ?? "—"} · seasons in text: ${p.seasons.join(", ") || "—"}`, "");
    plan.push("| Slot | Segment | Role | Priority | Must show | Getty search |", "|---|---|---|---|---|---|");
    for (const s of p.slots) {
      const show = [s.players.join(" + ") || "team / venue", s.seasons.length ? s.seasons.join("/") : "season unconfirmed"].join(", ");
      plan.push(`| ${s.sectionId} | ${s.sectionHeading.replace(/\|/g, "/")} | ${s.role} | ${s.priority} | ${show} | [${s.query}](${s.gettySearchUrl}) |`);
    }
    plan.push("");
  }
  writeFileSync(resolve(outDir, "IMAGE-PLAN.md"), plan.join("\n"));

  const withImages = plans.filter((p) => published(p.articleId).length > 0);
  const local = (id: string) => getLocalEmbedImages(id);
  const withLocal = plans.filter((p) => Object.keys(local(p.articleId)).length > 0);
  const needing = plans.filter((p) => Object.keys(local(p.articleId)).length === 0 && published(p.articleId).length === 0);
  const status = [
    "# Editorial Dugout — image rights status (generated)",
    "",
    `Manifest updated: ${PUBLIC_MANIFEST.updatedAt} · publishable (licensed / approved) images: ${PUBLIC_MANIFEST.images.filter((i) => isPublishable(i)).length}`,
    "",
    `## Articles with working Getty embeds on localhost (${withLocal.length})`,
    "",
    "Rendered through Getty's Embedded Viewer on the dev server only. Status stays `pending-license`; public builds strip them.",
    "",
    "| Article | Slot | Getty asset | Photo |",
    "|---|---|---|---|",
    ...withLocal.flatMap((p) =>
      Object.values(local(p.articleId)).map(
        (i) => `| ${p.teamCode} · ${p.title} | ${i!.sectionId} | [${i!.assetId}](${i!.sourcePageUrl}) | ${i!.caption.replace(/^[A-Z][A-Z ,.'-]+ - [A-Z]+ \d{1,2}: /, "").slice(0, 110)}… |`,
      ),
    ),
    "",
    `## Articles with approved (licensed) images for public builds (${withImages.length})`,
    "",
    ...(withImages.length ? withImages.map((p) => `- ${p.teamCode} · ${p.title} — ${published(p.articleId).join(", ")}`) : ["_None yet._"]),
    "",
    `## Articles still needing suitable images (${needing.length})`,
    "",
    "These show CricField's original cover illustration and no inline photos until images are added.",
    "",
    ...needing.map((p) => {
      const rec = p.slots.filter((s) => s.priority === "recommended").map((s) => s.sectionId);
      return `- ${p.teamCode} · ${p.title} (\`${p.articleId}\`) — recommended slots: ${rec.join(", ")}`;
    }),
    "",
  ];
  writeFileSync(resolve(outDir, "RIGHTS-STATUS.md"), status.join("\n"));
  console.log(`docs written to ${outDir}`);
}

console.log(`editorial-images: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
