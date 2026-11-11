// Imports the canonical 1,000-title plan into src/data/editorial/plan/titles-1000.json.
//   pnpm exec tsx scripts/editorial/import-plan.ts
// Source: docs/editorial/plan/cricfield_1000_article_titles.csv (cross-checked against the .md copy).
// Ids are stable: cf-<franchise>-<franchise_article_number>, e.g. cf-rcb-022.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EDITORIAL_ASPECTS, FRANCHISE_CODES, planEntrySchema, type PlanEntry } from "../../src/data/editorial/schema";

const ROOT = resolve(import.meta.dirname, "../../../..");
const CSV = resolve(ROOT, "docs/editorial/plan/cricfield_1000_article_titles.csv");
const MD = resolve(ROOT, "docs/editorial/plan/cricfield_1000_article_titles.md");
const OUT = resolve(import.meta.dirname, "../../src/data/editorial/plan/titles-1000.json");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.some((f) => f.trim()));
}

export function slugify(title: string, code: string, franchiseName: string): string {
  const plain = title
    .replaceAll(`${franchiseName}’s`, code)
    .replaceAll(`${franchiseName}'s`, code)
    .replaceAll(franchiseName, code)
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const prefixed = plain.startsWith(`${code.toLowerCase()}-`) ? plain : `${code.toLowerCase()}-${plain}`;
  if (prefixed.length <= 90) return prefixed;
  const cut = prefixed.slice(0, 90);
  return cut.slice(0, cut.lastIndexOf("-"));
}

const text = readFileSync(CSV, "utf8").replace(/^﻿/, "");
const [header, ...rows] = parseCsv(text);
const expected = ["franchise", "franchise_name", "aspect", "aspect_number", "article_number", "franchise_article_number", "title", "status"];
if (header.join(",") !== expected.join(",")) throw new Error(`Unexpected CSV header: ${header.join(",")}`);

const problems: string[] = [];
const entries: PlanEntry[] = rows.map((r, i) => {
  const [franchise, franchiseName, aspectName, aspectNumber, articleNumber, franchiseNumber, title, status] = r;
  const aspect = EDITORIAL_ASPECTS.find((a) => a.name === aspectName);
  if (!aspect) problems.push(`row ${i + 2}: unknown aspect "${aspectName}"`);
  if (aspect && aspect.number !== Number(aspectNumber)) problems.push(`row ${i + 2}: aspect number mismatch`);
  const entry = {
    planId: `cf-${franchise.toLowerCase()}-${String(franchiseNumber).padStart(3, "0")}`,
    franchise,
    franchiseName,
    aspect: aspect?.id ?? "batting",
    aspectName,
    aspectNumber: Number(aspectNumber),
    // CSV article_number is the position inside the aspect (1–10); the global number is the row order.
    articleInAspect: Number(articleNumber),
    globalNumber: i + 1,
    franchiseNumber: Number(franchiseNumber),
    title: title.trim(),
    slug: slugify(title.trim(), franchise, franchiseName),
    sourceStatus: status,
  };
  const parsed = planEntrySchema.safeParse(entry);
  if (!parsed.success) problems.push(`row ${i + 2}: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
  return entry as PlanEntry;
});

// Structural checks: 1,000 rows, 100 per franchise, 10 per aspect per franchise, unique ids/slugs/numbers.
if (entries.length !== 1000) problems.push(`expected 1000 rows, got ${entries.length}`);
for (const code of FRANCHISE_CODES) {
  const own = entries.filter((e) => e.franchise === code);
  if (own.length !== 100) problems.push(`${code}: ${own.length} rows`);
  for (const a of EDITORIAL_ASPECTS) {
    const n = own.filter((e) => e.aspect === a.id).length;
    if (n !== 10) problems.push(`${code}/${a.id}: ${n} rows`);
  }
  const nums = new Set(own.map((e) => e.franchiseNumber));
  if (nums.size !== own.length) problems.push(`${code}: duplicate franchise_article_number`);
}
for (const key of ["planId", "slug", "globalNumber"] as const) {
  const seen = new Map<unknown, string>();
  for (const e of entries) {
    if (seen.has(e[key])) problems.push(`duplicate ${key} ${String(e[key])} (${seen.get(e[key])} / ${e.planId})`);
    seen.set(e[key], e.planId);
  }
}
const titleSeen = new Map<string, string>();
for (const e of entries) {
  const k = e.title.toLowerCase();
  if (titleSeen.has(k)) problems.push(`duplicate title "${e.title}" (${titleSeen.get(k)} / ${e.planId})`);
  titleSeen.set(k, e.planId);
}

// Cross-check against the Markdown copy: every CSV title must appear verbatim, in order, under its franchise.
const md = readFileSync(MD, "utf8");
let mdMissing = 0;
for (const e of entries) {
  if (!md.includes(`${e.franchiseNumber}. ${e.title}`)) {
    mdMissing++;
    if (mdMissing <= 5) problems.push(`md copy lacks "${e.franchiseNumber}. ${e.title}"`);
  }
}

if (problems.length) {
  console.error(`Plan import failed (${problems.length} problems):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify({ version: 1, source: "docs/editorial/plan/cricfield_1000_article_titles.csv", importedAt: new Date().toISOString().slice(0, 10), entries }, null, 1) + "\n");
console.log(`Imported ${entries.length} plan entries → ${OUT}`);
console.log(`  10 franchises × 10 aspects × 10, ids/slugs/titles unique, Markdown copy agrees on all ${entries.length} titles.`);
