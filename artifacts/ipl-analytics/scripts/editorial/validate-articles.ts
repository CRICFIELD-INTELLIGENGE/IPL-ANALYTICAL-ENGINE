// Validates every v2 article against the schema, its evidence file, the plan, the video registry
// and the editorial rules, then regenerates:
//   src/data/editorial/index.json        (card index the app loads eagerly)
//   docs/editorial/VALIDATION-REPORT.md  (per-article report)
//   public/sitemap-dugout.xml            (published articles only)
//   pnpm exec tsx scripts/editorial/validate-articles.ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FRANCHISE_CODES,
  TOKEN_RE,
  articleSchema,
  evidenceFileSchema,
  type ArticleV2,
  type EvidenceFile,
  type IndexEntry,
  type PlanEntry,
} from "../../src/data/editorial/schema";

const APP = resolve(import.meta.dirname, "../..");
const ROOT = resolve(APP, "../..");
const SITE = "https://ipl-intelligence.com";
const plan: PlanEntry[] = JSON.parse(readFileSync(resolve(APP, "src/data/editorial/plan/titles-1000.json"), "utf8")).entries;
const decisions: { legacyId: string; planId: string | null; decision: string; reviewed: boolean }[] = JSON.parse(readFileSync(resolve(APP, "src/data/editorial/plan/legacy-decisions.json"), "utf8")).decisions;
const videos: { id: string; verified: boolean; isExactVideoUrl: boolean; source?: string; title: string }[] = JSON.parse(readFileSync(resolve(APP, "src/data/video-catalogue.json"), "utf8"));
const legacySrc = readFileSync(resolve(APP, "src/data/editorial-magazine-data.ts"), "utf8");
const manifest: { images: { articleId: string; sectionId: string; rightsStatus: string }[] } = JSON.parse(readFileSync(resolve(APP, "src/data/editorial-images/manifest.json"), "utf8"));

const YEAR_RE = /^(19|20)\d\d$/;

export function wordCount(a: ArticleV2): number {
  return a.sections.flatMap((s) => s.body).join(" ").replace(TOKEN_RE, "x").split(/\s+/).filter(Boolean).length;
}

type Result = { id: string; errors: string[]; warnings: string[]; stats: Record<string, string | number> };
const results: Result[] = [];
const index: IndexEntry[] = [];

for (const code of FRANCHISE_CODES) {
  const dir = resolve(APP, "src/data/editorial/articles", code.toLowerCase());
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const raw = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
    const parsed = articleSchema.safeParse(raw);
    const id = raw.id ?? file;
    if (!parsed.success) {
      results.push({ id, errors: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} — ${i.message}`), warnings, stats: {} });
      continue;
    }
    const a = parsed.data;
    if (`${a.id}.json` !== file) errors.push(`file name ${file} does not match id ${a.id}`);
    // Publication needs a human editorial sign-off; image rights are a separate gate and never block it.
    if (a.status === "published" && !a.editorialReview?.approved) errors.push("published without an approved editorialReview (reviewedBy, reviewedAt, approved: true)");

    // Plan alignment
    const p = plan.find((x) => x.planId === a.planId);
    if (!p) errors.push(`planId ${a.planId} not in plan`);
    else {
      if (p.title !== a.title) errors.push(`title differs from plan title "${p.title}"`);
      if (p.franchise !== a.franchise || p.aspect !== a.aspect) errors.push("franchise/aspect differ from plan");
      const d = decisions.find((x) => x.planId === a.planId && x.decision === "revise");
      if (d) {
        if (!a.supersedes || a.supersedes.legacyId !== d.legacyId) errors.push(`legacy decision says this revises ${d.legacyId}; 'supersedes' must say so`);
        else if (a.slug !== a.supersedes.legacySlug) errors.push("a revision must keep the legacy URL (slug = supersedes.legacySlug)");
        else if (!legacySrc.includes(`"slug": "${a.slug}"`) && !legacySrc.includes(`slug: "${a.slug}"`)) errors.push(`legacy slug ${a.slug} not found in editorial-magazine-data.ts`);
      } else if (a.slug !== p.slug) errors.push(`slug must be the plan slug ${p.slug}`);
    }

    // Evidence
    const evPath = resolve(APP, "src/data/editorial/evidence", a.franchise.toLowerCase(), `${a.id}.json`);
    let ev: EvidenceFile | null = null;
    if (!existsSync(evPath)) errors.push("evidence file missing");
    else {
      const e = evidenceFileSchema.safeParse(JSON.parse(readFileSync(evPath, "utf8")));
      if (!e.success) errors.push("evidence file fails schema");
      else ev = e.data;
    }
    if (ev) for (const [k, m] of Object.entries(ev.metrics)) if (!m.validation.passed) errors.push(`evidence ${k} failed validation`);

    // Tokens and numerals in prose
    const prose: [string, string][] = [
      ["dek", a.dek],
      ["excerpt", a.excerpt],
      ...a.keyTakeaways.map((t, i) => [`keyTakeaways[${i}]`, t] as [string, string]),
      ...a.sections.flatMap((s) => [[`${s.id}.heading`, s.heading] as [string, string], ...s.body.map((b, i) => [`${s.id}.body[${i}]`, b] as [string, string]), ...(s.pullQuote ? [[`${s.id}.pullQuote`, s.pullQuote] as [string, string]] : [])]),
      ...a.charts.map((c) => [`chart ${c.id}.takeaway`, c.takeaway] as [string, string]),
      ...a.hypotheses.map((h) => [`hypothesis ${h.id}`, h.statement] as [string, string]),
    ];
    const used = { ev: new Set<string>(), src: new Set<string>(), hyp: new Set<string>() };
    const literals = new Set(a.literalNumbers.map((l) => l.text));
    let untokenised = 0;
    for (const [where, text] of prose) {
      for (const m of text.matchAll(TOKEN_RE)) {
        const kind = m[1] as "ev" | "src" | "hyp";
        used[kind].add(m[2]);
        if (kind === "ev" && ev && !ev.metrics[m[2]]) errors.push(`${where}: unknown metric {{ev:${m[2]}}}`);
        if (kind === "src" && !a.sources.some((s) => s.id === m[2])) errors.push(`${where}: unknown source ${m[2]}`);
        if (kind === "hyp" && !a.hypotheses.some((h) => h.id === m[2])) errors.push(`${where}: unknown hypothesis ${m[2]}`);
      }
      // "T20" is the format's name, not a statistic.
      const stripped = text.replace(TOKEN_RE, " ").replace(/\bT20\b/g, " ");
      for (const n of stripped.match(/\d+(?:[.,]\d+)*/g) ?? []) {
        if (YEAR_RE.test(n) || literals.has(n)) continue;
        untokenised++;
        errors.push(`${where}: numeral "${n}" is not from evidence (use {{ev:…}} or declare it in literalNumbers)`);
      }
    }
    for (const h of a.hypotheses) if (!used.hyp.has(h.id)) errors.push(`hypothesis ${h.id} declared but never shown`);
    for (const s of a.sources) if (s.kind !== "cricfield-dataset" && !used.src.has(s.id)) errors.push(`external source ${s.id} never cited in text`);
    if (ev && ev.metrics && Object.values(ev.metrics).some((m) => m.query === "external") && !a.sources.some((s) => s.kind !== "cricfield-dataset")) errors.push("external figures used without an external source entry");

    // Charts
    const chartUse = a.sections.flatMap((s) => s.chartIds ?? []);
    for (const c of a.charts) {
      const t = ev?.tables[c.table];
      if (!t) errors.push(`chart ${c.id}: table ${c.table} missing from evidence`);
      else {
        if (!t.rows.length) errors.push(`chart ${c.id}: empty table`);
        else for (const k of [c.xKey, ...c.series.map((s) => s.key)]) if (!(k in t.rows[0])) errors.push(`chart ${c.id}: key ${k} not in table ${c.table}`);
      }
      if (!chartUse.includes(c.id)) errors.push(`chart ${c.id} never placed in a section`);
      if (c.ariaLabel.length < 40) errors.push(`chart ${c.id}: aria label too thin`);
    }
    for (const cid of chartUse) if (!a.charts.some((c) => c.id === cid)) errors.push(`section references unknown chart ${cid}`);

    // Videos — only verified, exact JioHotstar URLs discovered from the official sitemap
    for (const v of a.videos) {
      const item = videos.find((x) => x.id === v.catalogueId);
      if (!item) errors.push(`video ${v.catalogueId} not in registry`);
      else if (!item.verified || !item.isExactVideoUrl) errors.push(`video ${v.catalogueId} is not a verified exact URL`);
      else if (item.source === "gemini_catalogue") errors.push(`video ${v.catalogueId} comes from the unverified generated catalogue`);
    }
    // Related & plan
    for (const r of a.related) if (!plan.some((x) => x.planId === r)) errors.push(`related ${r} not in plan`);
    if (!a.imageBriefs.some((b) => b.slot === "hero")) errors.push("no hero image brief");
    if (a.sections.map((s) => s.role).join() !== "hook,evidence,tactical,counterargument,verdict") errors.push("sections must run hook → evidence → tactical → counterargument → verdict");

    const imgs = manifest.images.filter((i) => i.articleId === a.id);
    const words = wordCount(a);
    if (words < 700) warnings.push(`short article (${words} words)`);
    if (!imgs.some((i) => i.sectionId === "hero")) warnings.push("no hero photograph in manifest (illustrated cover will be used)");

    const evMetrics = ev ? Object.keys(ev.metrics).length : 0;
    results.push({
      id: a.id,
      errors,
      warnings,
      stats: {
        status: a.status,
        words,
        metricsUsed: used.ev.size,
        metricsAvailable: evMetrics,
        charts: a.charts.length,
        externalSources: a.sources.filter((s) => s.kind !== "cricfield-dataset").length,
        hypotheses: a.hypotheses.length,
        images: imgs.length,
        imagesLicensed: imgs.filter((i) => i.rightsStatus === "approved-embed" || i.rightsStatus === "licensed").length,
        videos: a.videos.length,
        untokenised,
      },
    });
    const headline = ev && a.keyTakeaways.length ? [...a.keyTakeaways[0].matchAll(TOKEN_RE)].find((m) => m[1] === "ev") : undefined;
    const hm = headline && ev ? ev.metrics[headline[2]] : undefined;
    index.push({
      id: a.id,
      franchise: a.franchise,
      aspect: a.aspect,
      title: a.title,
      slug: a.slug,
      dek: a.dek.replace(TOKEN_RE, (_, k, id) => (k === "ev" && ev?.metrics[id] ? ev.metrics[id].display : "")),
      status: a.status,
      storyType: a.storyType,
      featured: a.featured,
      publishedDate: a.publishedDate,
      readMinutes: Math.max(3, Math.round(words / 220)),
      players: a.players,
      seasons: a.seasons,
      headlineStat: hm ? { label: hm.label, display: hm.display } : undefined,
      supersedes: a.supersedes?.legacySlug,
    });
  }
}

index.sort((x, y) => x.id.localeCompare(y.id));
writeFileSync(resolve(APP, "src/data/editorial/index.json"), JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), articles: index }, null, 1) + "\n");

// Sitemap: published only. Review articles are never advertised.
const published = index.filter((e) => e.status === "published");
writeFileSync(
  resolve(APP, "public/sitemap-dugout.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${published
    .map((e) => `  <url><loc>${SITE}/dugout/articles/${e.slug}</loc><lastmod>${e.publishedDate}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`)
    .join("\n")}${published.length ? "\n" : ""}</urlset>\n`,
);

const L: string[] = ["# Dugout v2 article validation report", "", `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/editorial/validate-articles.ts\`.`, ""];
L.push("| Article | Status | Words | Metrics used | Charts | External sources | Hypotheses | Photos (licensed) | Videos | Errors | Warnings |", "|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of results) L.push(`| \`${r.id}\` | ${r.stats.status ?? "—"} | ${r.stats.words ?? "—"} | ${r.stats.metricsUsed ?? "—"} | ${r.stats.charts ?? "—"} | ${r.stats.externalSources ?? "—"} | ${r.stats.hypotheses ?? "—"} | ${r.stats.images ?? 0} (${r.stats.imagesLicensed ?? 0}) | ${r.stats.videos ?? "—"} | ${r.errors.length} | ${r.warnings.length} |`);
L.push("");
for (const r of results) {
  if (!r.errors.length && !r.warnings.length) continue;
  L.push(`### ${r.id}`, "", ...r.errors.map((e) => `- ✗ ${e}`), ...r.warnings.map((w) => `- ⚠ ${w}`), "");
}
L.push("## Rules enforced", "", "- Schema v2 (zod) and file name = id.", "- Title, franchise and aspect equal the plan; slug equals the plan slug, or the legacy slug when a reviewed decision says the article revises a legacy piece.", "- Every number in prose comes from an evidence token, is a year, or is declared in `literalNumbers` with a reason.", "- Every evidence metric passed its own validation step (sample floor, reconciliation or range check).", "- Charts draw from evidence tables with existing keys and carry an accessible label; every chart is placed.", "- External figures need an external source that is cited in the text; hypotheses are labelled where they appear.", "- Videos must be verified exact JioHotstar URLs from the sitemap-discovered registry (never the generated catalogue).", "- Sections follow hook → evidence → tactical → counterargument → verdict.", "- Sitemap lists published articles only.");
writeFileSync(resolve(ROOT, "docs/editorial/VALIDATION-REPORT.md"), L.join("\n") + "\n");
// Machine-readable results for publication-readiness.ts.
writeFileSync(resolve(ROOT, "docs/editorial/VALIDATION-REPORT.json"), JSON.stringify({ results: results.map(({ id, errors }) => ({ id, errors })) }) + "\n");

const bad = results.filter((r) => r.errors.length);
for (const r of results) {
  console.log(`${r.errors.length ? "✗" : "✓"} ${r.id} ${JSON.stringify(r.stats)}`);
  for (const e of r.errors) console.log(`    ✗ ${e}`);
  for (const w of r.warnings) console.log(`    ⚠ ${w}`);
}
console.log(`${results.length} articles, ${bad.length} with errors. Index: ${index.length}; sitemap: ${published.length} published.`);
process.exit(bad.length ? 1 : 0);
