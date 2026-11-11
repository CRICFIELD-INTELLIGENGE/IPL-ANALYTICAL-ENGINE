// Article engine runner: builds evidence + article files for every plan slot that has a template.
//   pnpm exec tsx scripts/editorial/engine/run.ts                 → all franchises, all slots
//   pnpm exec tsx scripts/editorial/engine/run.ts CSK MI          → some franchises
//   pnpm exec tsx scripts/editorial/engine/run.ts --slot 1,22     → some slots
// Hand-written articles (no "generator" field) are never overwritten. Every article is written
// with status "review"; publishing is an editor's decision.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Evidence, openDb, APP } from "../evidence/lib";
import { EDITORIAL_AUTHOR, articleSchema, type PlanEntry } from "../../../src/data/editorial/schema";
import { A, FR_NAME, type Draft } from "./core";
import { CONTEXTS, FRANCHISE_IDS as TEAM_CODE, type Ctx } from "./context";
import { SLOTS } from "./registry";

const args = process.argv.slice(2);
const slotArg = args.includes("--slot") ? args[args.indexOf("--slot") + 1].split(",").map(Number) : null;
const codes = args.filter((x, i) => !x.startsWith("--") && args[i - 1] !== "--slot").map((x) => x.toUpperCase());
const plan: PlanEntry[] = JSON.parse(readFileSync(resolve(APP, "src/data/editorial/plan/titles-1000.json"), "utf8")).entries;
const decisions: { legacyId: string; planId: string | null; decision: string; reviewed: boolean }[] = JSON.parse(readFileSync(resolve(APP, "src/data/editorial/plan/legacy-decisions.json"), "utf8")).decisions;
const legacySrc = readFileSync(resolve(APP, "src/data/editorial-magazine-data.ts"), "utf8");
const legacySlug = (id: string) => {
  const i = legacySrc.indexOf(`"id": "${id}"`);
  const m = i >= 0 ? legacySrc.slice(i, i + 400).match(/"slug": "([^"]+)"/) : null;
  return m?.[1];
};

const HERO_QUERIES: Record<string, { query: string; wanted: string; players: string[]; franchise: string }> = {};
const db = openDb();
const TODAY = new Date().toISOString().slice(0, 10);
let built = 0, skipped = 0;
const failures: string[] = [];

for (const c of CONTEXTS.filter((x) => !codes.length || codes.includes(x.code))) {
  // Most-played opponent, used by rivalry templates.
  const rival = db.prepare(`SELECT CASE WHEN m.team1_id IN ${c.idsSql} THEN m.team2_id ELSE m.team1_id END opp, COUNT(*) n FROM matches m WHERE (m.team1_id IN ${c.idsSql} OR m.team2_id IN ${c.idsSql}) GROUP BY opp ORDER BY n DESC LIMIT 1`).get() as { opp: number };
  const rivalCode = Object.entries(TEAM_CODE).find(([, ids]) => ids.includes(rival.opp))?.[0] ?? "";
  const ctx: Ctx = { ...c, rival: rivalCode };
  for (const spec of SLOTS.filter((s) => !slotArg || slotArg.includes(s.n))) {
    const p = plan.find((x) => x.franchise === c.code && x.franchiseNumber === spec.n);
    if (!p) continue;
    const file = resolve(APP, `src/data/editorial/articles/${c.code.toLowerCase()}/${p.planId}.json`);
    if (existsSync(file) && !JSON.parse(readFileSync(file, "utf8")).generator) {
      skipped++;
      continue; // hand-written
    }
    const ev = new Evidence(p.planId, db);
    let draft: Draft;
    try {
      draft = spec.build(new A(ev, ctx));
    } catch (e) {
      failures.push(`${p.planId}: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    if (ev.failures.length) {
      failures.push(`${p.planId}: evidence checks failed — ${ev.failures.slice(0, 3).join("; ")}`);
      continue;
    }
    ev.write();
    const d = decisions.find((x) => x.planId === p.planId && x.decision === "revise");
    const ls = d ? legacySlug(d.legacyId) : undefined;
    const tableIds = new Set(Object.keys(ev.tables));
    const article = {
      schemaVersion: 2,
      id: p.planId,
      planId: p.planId,
      franchise: c.code,
      aspect: p.aspect,
      title: p.title,
      slug: ls ?? p.slug,
      ...(d && ls ? { supersedes: { legacyId: d.legacyId, legacySlug: ls, decision: "revise" } } : {}),
      dek: draft.dek,
      excerpt: draft.excerpt,
      author: EDITORIAL_AUTHOR,
      publishedDate: TODAY,
      status: "review",
      featured: spec.n === 22,
      storyType: draft.storyType ?? spec.storyType,
      teams: draft.teams ?? [c.code],
      players: draft.players,
      seasons: draft.seasons,
      keyTakeaways: draft.keyTakeaways,
      sections: draft.sections.map((s, i) => ({ id: `s${i + 1}`, role: ["hook", "evidence", "tactical", "counterargument", "verdict"][i], ...s })),
      charts: draft.charts.filter((ch) => tableIds.has(ch.table)),
      sources: [
        { id: "cf-warehouse", kind: "cricfield-dataset", title: "CricField ball-by-ball warehouse (Cricsheet IPL data, 2008–2026)", publisher: "CricField / Cricsheet", url: "https://cricsheet.org/downloads/", note: "Open Data Commons Attribution licence; regulation innings only." },
        ...(draft.sources ?? []),
      ],
      hypotheses: draft.hypotheses,
      literalNumbers: draft.literalNumbers ?? [],
      imageBriefs: [{ slot: "hero", narrative: draft.hero.narrative, wanted: draft.hero.wanted }],
      videos: [],
      related: draft.related.map((n) => plan.find((x) => x.franchise === c.code && x.franchiseNumber === n)?.planId).filter(Boolean),
      seo: draft.seo,
      methodology: draft.methodology,
      generator: "engine:v1",
      heroQuery: draft.hero.query,
    };
    const { heroQuery, ...rest } = article;
    const parsed = articleSchema.safeParse(rest);
    if (!parsed.success) {
      failures.push(`${p.planId}: schema — ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    mkdirSync(resolve(APP, `src/data/editorial/articles/${c.code.toLowerCase()}`), { recursive: true });
    writeFileSync(file, JSON.stringify(rest, null, 1) + "\n");
    // Getty hero search query, kept outside the article for the photo picker.
    HERO_QUERIES[p.planId] = { query: heroQuery, wanted: draft.hero.wanted, players: draft.players, franchise: FR_NAME[c.code] };
    built++;
  }
}

const qFile = resolve(APP, "scripts/editorial/engine/hero-queries.json");
const prior = existsSync(qFile) ? JSON.parse(readFileSync(qFile, "utf8")) : {};
writeFileSync(qFile, JSON.stringify({ ...prior, ...HERO_QUERIES }, null, 1) + "\n");
console.log(`built ${built}, skipped (hand-written) ${skipped}, failed ${failures.length}`);
for (const f of failures) console.log("  ✗ " + f);
process.exit(failures.length ? 1 : 0);

