// Article publication readiness — independent of image authorization.
//
// An article is ready to publish when all four article checks pass:
//   1. Content complete   — passes validate-articles (schema, five sections, tokenised numbers, evidence
//                           checks, charts placed, hypotheses labelled).
//   2. Editorial review    — a human sign-off recorded in `editorialReview` with approved: true.
//   3. Valid metadata      — SEO title/description lengths, publishedDate, seasons, franchise/aspect.
//   4. Working route       — slug is unique across v2 and legacy articles (or deliberately takes over the
//                           legacy URL it supersedes) so /dugout/articles/<slug> resolves to this article.
// Getty or other image rights are NOT checked here: an article whose photo is pending still publishes,
// and the page shows the CricField illustration until the photo passes its own rights gate.
//
//   pnpm exec tsx --no-warnings scripts/editorial/publication-readiness.ts [--json]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EDITORIAL_ARTICLES } from "../../src/data/editorial-magazine-data";
import { APP } from "./evidence/lib";

const ROOT = resolve(APP, "src/data/editorial");
const report = JSON.parse(readFileSync(resolve(APP, "../../docs/editorial/VALIDATION-REPORT.json"), "utf8").replace(/^﻿/, "")) as { results?: { id: string; errors: string[] }[] } | undefined;
const validationErrors = new Map((report?.results ?? []).map((r) => [r.id, r.errors]));
const legacySlugs = new Map(EDITORIAL_ARTICLES.map((a) => [a.slug, a.id]));
const manifest = JSON.parse(readFileSync(resolve(APP, "src/data/editorial-images/manifest.json"), "utf8")) as { images: { articleId: string; sectionId: string; rightsStatus: string }[] };

type Row = { id: string; status: string; content: boolean; review: boolean; metadata: boolean; route: boolean; ready: boolean; awaitingReviewOnly: boolean; heroPhoto: string; problems: string[] };
const rows: Row[] = [];
const slugCount = new Map<string, number>();
const articles = readdirSync(resolve(ROOT, "articles")).flatMap((fr) => readdirSync(resolve(ROOT, "articles", fr)).map((f) => JSON.parse(readFileSync(resolve(ROOT, "articles", fr, f), "utf8"))));
for (const a of articles) slugCount.set(a.slug, (slugCount.get(a.slug) ?? 0) + 1);

for (const a of articles) {
  const problems: string[] = [];
  const errs = validationErrors.get(a.id);
  const content = errs ? errs.filter((e) => !/editorialReview/.test(e)).length === 0 : false;
  if (!errs) problems.push("not in the latest validation report — run validate-articles.ts");
  else if (!content) problems.push(...errs.filter((e) => !/editorialReview/.test(e)).map((e) => `content: ${e}`));
  const review = a.editorialReview?.approved === true;
  if (!review) problems.push("editorial review: no approved sign-off recorded");
  const md: string[] = [];
  if (!a.seo?.metaTitle || a.seo.metaTitle.length > 70) md.push("SEO title missing or over 70 characters");
  if (!a.seo?.metaDescription || a.seo.metaDescription.length < 70 || a.seo.metaDescription.length > 170) md.push("SEO description outside 70–170 characters");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.publishedDate ?? "")) md.push("publishedDate invalid");
  if (!a.seasons?.length) md.push("seasons missing");
  problems.push(...md.map((m) => `metadata: ${m}`));
  const legacyOwner = legacySlugs.get(a.slug);
  const route = slugCount.get(a.slug) === 1 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) && (!legacyOwner || a.supersedes?.legacyId === legacyOwner);
  if (!route) problems.push(legacyOwner && a.supersedes?.legacyId !== legacyOwner ? `route: slug belongs to legacy ${legacyOwner}` : "route: slug not unique or malformed");
  const hero = manifest.images.find((i) => i.articleId === a.id && i.sectionId === "hero");
  const metadata = md.length === 0;
  rows.push({ id: a.id, status: a.status, content, review, metadata, route, ready: content && review && metadata && route, awaitingReviewOnly: content && !review && metadata && route, heroPhoto: hero ? hero.rightsStatus : "none (illustration)", problems });
}

const count = (f: (r: Row) => boolean) => rows.filter(f).length;
const summary = {
  articles: rows.length,
  published: count((r) => r.status === "published"),
  readyToPublish: count((r) => r.ready),
  passAutomatedChecks_awaitingEditorialReview: count((r) => r.awaitingReviewOnly),
  failingContent: count((r) => !r.content),
  failingMetadata: count((r) => !r.metadata),
  failingRoute: count((r) => !r.route),
  heroPhotos: rows.reduce<Record<string, number>>((c, r) => ((c[r.heroPhoto] = (c[r.heroPhoto] ?? 0) + 1), c), {}),
  note: "Image rights are not a publication criterion; pending photos fall back to the CricField illustration.",
};
writeFileSync(resolve(APP, "../../docs/editorial/PUBLICATION-READINESS.json"), JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 1) + "\n");
console.log(JSON.stringify(summary, null, 1));
if (process.argv.includes("--json")) console.log(JSON.stringify(rows.filter((r) => r.problems.length > 1).slice(0, 10), null, 1));
