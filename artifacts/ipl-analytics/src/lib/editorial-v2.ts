// Dugout v2 articles (the 1,000-article programme): index, lazy loading, visibility and token resolution.
// Article bodies and evidence files are code-split per article via import.meta.glob, so the Dugout
// never loads all 1,000 articles at once. Only "published" articles are visible in a public build;
// "review" articles render on localhost (import.meta.env.DEV) for editorial checking.

import indexData from "@/data/editorial/index.json";
import type { ArticleStatus, ArticleV2, EvidenceFile, IndexEntry, PlanEntry } from "@/data/editorial/schema";
import { TOKEN_RE } from "@/data/editorial/schema";

import { normalizeSiteOrigin } from "./site-seo";
export const SITE_ORIGIN = normalizeSiteOrigin(import.meta.env.VITE_SITE_ORIGIN);

const articleLoaders = import.meta.glob<{ default: ArticleV2 | null }>("../data/editorial/articles/*/*.json");
const evidenceLoaders = import.meta.glob<{ default: EvidenceFile | null }>("../data/editorial/evidence/*/*.json");

export const isVisibleStatus = (status: ArticleStatus) => status === "published" || Boolean(import.meta.env?.DEV);

const INDEX: IndexEntry[] = ((indexData as { articles: IndexEntry[] | null }).articles ?? []).filter((e) => isVisibleStatus(e.status));

export function getV2Index(): IndexEntry[] {
  return INDEX;
}
export function findV2BySlug(slug: string): IndexEntry | undefined {
  return INDEX.find((e) => e.slug === slug);
}
export function getV2ForFranchise(code: string): IndexEntry[] {
  return INDEX.filter((e) => e.franchise === code.toUpperCase());
}
export function findV2ById(id: string): IndexEntry | undefined {
  return INDEX.find((e) => e.id === id);
}

export interface LoadedArticle {
  article: ArticleV2;
  evidence: EvidenceFile;
}

export async function loadArticleV2(entry: IndexEntry): Promise<LoadedArticle | null> {
  const dir = entry.franchise.toLowerCase();
  const a = articleLoaders[`../data/editorial/articles/${dir}/${entry.id}.json`];
  const e = evidenceLoaders[`../data/editorial/evidence/${dir}/${entry.id}.json`];
  if (!a || !e) return null;
  const [article, evidence] = await Promise.all([a().then((m) => m.default), e().then((m) => m.default)]);
  if (!article || !evidence || !isVisibleStatus(article.status)) return null;
  return { article, evidence };
}

let planPromise: Promise<PlanEntry[]> | null = null;
/** The 1,000-title plan, loaded on demand (≈150 KB, never in the main bundle). */
export function loadPlan(): Promise<PlanEntry[]> {
  planPromise ??= import("@/data/editorial/plan/titles-1000.json").then((m) => (m.default as unknown as { entries: PlanEntry[] }).entries);
  return planPromise;
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "ev"; id: string }
  | { kind: "src"; id: string }
  | { kind: "hyp"; id: string };

export function splitTokens(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(TOKEN_RE.source, "gi"))) {
    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: m[1].toLowerCase() as "ev" | "src" | "hyp", id: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Plain-text rendering (meta tags, aria labels): evidence → display value; citations and hypotheses dropped. */
export function plainText(text: string, evidence: EvidenceFile): string {
  return text
    .replace(new RegExp(TOKEN_RE.source, "gi"), (_, kind: string, id: string) => (kind.toLowerCase() === "ev" ? evidence.metrics[id]?.display ?? "" : ""))
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const SECTION_ROLE_LABEL: Record<string, string> = {
  hook: "The Hook",
  evidence: "The Evidence",
  tactical: "The Tactics",
  counterargument: "The Counterargument",
  verdict: "Synthesis & Outlook",
};

export const STORY_TYPE_LABEL: Record<string, string> = {
  investigation: "Featured Investigation",
  "player-story": "Player Story",
  tactical: "Tactical Intelligence",
  archive: "Historical Archive",
  explainer: "Explainer",
};
