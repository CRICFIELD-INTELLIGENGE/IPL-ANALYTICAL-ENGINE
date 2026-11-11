// Duplicate detection + coverage report for the 1,000-title plan.
//   pnpm exec tsx scripts/editorial/coverage-report.ts
// Compares the 100 legacy Dugout articles (editorial-magazine-data.ts) against the plan, by
// exact title, token overlap and a cricket concept lexicon, then merges the reviewed decisions in
// src/data/editorial/plan/legacy-decisions.json. Writes:
//   src/data/editorial/plan/legacy-coverage.json   (machine-readable)
//   docs/editorial/COVERAGE-REPORT.md              (human-readable)

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EDITORIAL_ARTICLES } from "../../src/data/editorial-magazine-data";
import { EDITORIAL_ASPECTS, FRANCHISE_CODES, articleSchema, type PlanEntry } from "../../src/data/editorial/schema";

const APP = resolve(import.meta.dirname, "../..");
const ROOT = resolve(APP, "../..");
const plan: PlanEntry[] = JSON.parse(readFileSync(resolve(APP, "src/data/editorial/plan/titles-1000.json"), "utf8")).entries;
const decisionsFile = resolve(APP, "src/data/editorial/plan/legacy-decisions.json");
type Decision = { legacyId: string; planId: string | null; decision: "revise" | "reuse" | "keep-separate"; reviewed: boolean; note: string };
const decisions: Decision[] = existsSync(decisionsFile) ? JSON.parse(readFileSync(decisionsFile, "utf8")).decisions : [];

// ── Similarity ────────────────────────────────────────────────────────────────
const FRANCHISE_WORDS = /\b(royal challengers|bengaluru|bangalore|chennai super kings|mumbai indians|kolkata knight riders|sunrisers hyderabad|rajasthan royals|delhi capitals|punjab kings|gujarat titans|lucknow super giants|rcb|csk|mi|kkr|srh|rr|dc|pbks|gt|lsg|mumbai|chennai|kolkata|hyderabad|rajasthan|delhi|punjab|gujarat|lucknow|knight riders|capitals|titans|super giants|sunrisers)('s|’s)?\b/gi;
const STOP = new Set("a an the of to in on for and or but with is are be does do how what when where which who why its it their our as at by from into than more most can should still really much beyond not new".split(" "));

const CONCEPTS: Record<string, RegExp> = {
  venue: /\b(home|venue|ground|stadium|chinnaswamy|chepauk|wankhede|eden|uppal|kotla|ekana|jaipur|sawai|ahmedabad|narendra modi|mullanpur|mohali|hyderabad equation|chepauk code)\b/i,
  chase: /\b(chase|chasing|pursuit|pursuits|target)\b/i,
  powerplay: /\b(powerplay|first six overs|opening|floodgates|ball one|new-ball|new ball)\b/i,
  middle: /\b(middle-over|middle overs|middle-overs)\b/i,
  death: /\b(death|last five overs|final five overs|finisher|finishing|yorker)\b/i,
  auction: /\b(auction|price|spending|salary|budget|buying|value hunter|retention|bidding|investment)\b/i,
  pressure: /\b(pressure|expectation|clutch|temperament|tight finishes|close)\b/i,
  future: /\b(future|next|2027|blueprint|cycle)\b/i,
  history: /\b(evolution|evolved|era|eras|history|founding|legacy|from .* to|early years|first five seasons|reinvention)\b/i,
  identity: /\b(identity|dna|defines|formula|system|philosophy)\b/i,
  highTotal: /\b(200|high-scoring|big totals)\b/i,
  dotBall: /\b(dot-ball|dot ball|quiet over)\b/i,
  selection: /\b(xi|eleven|selection|balance|combination|role|sixth bowler|sixth-bowler|depth)\b/i,
  spin: /\b(spin|spinner)\b/i,
  boundary: /\b(boundary|boundaries|sixes|fours|big hitters|firepower)\b/i,
  scouting: /\b(scout|scouting|young|talent|emerging|breakout|unknown star|prospect|uncapped)\b/i,
  bowlingEconomy: /\b(economy rate|wickets versus economy|run prevention|defence|wicket-taking|bowling)\b/i,
  star: /\b(star|superstars|famous names|names|match-winners|russell|bumrah|dhoni|gayle)\b/i,
  momentum: /\b(momentum|swing|big over|surge)\b/i,
  partnership: /\b(partnership|partnerships)\b/i,
};

function tokens(title: string): Set<string> {
  return new Set(
    title
      .replace(FRANCHISE_WORDS, " ")
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, " ")
      .split(/[\s-]+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
      .map((t) => t.replace(/(ing|ers|er|es|s)$/, "")),
  );
}
const concepts = (title: string) => new Set(Object.entries(CONCEPTS).filter(([, re]) => re.test(title)).map(([k]) => k));
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

// Legacy parameter → most likely plan aspect (used as a small prior, never as a match on its own).
const PARAM_ASPECT: Record<string, string> = {
  "Franchise DNA": "history",
  "Batting Intelligence": "batting",
  "Bowling Intelligence": "bowling-fielding",
  "Player Psychology": "tactical",
  "Venue Intelligence": "tactical",
  "Auction Economics": "auction-economics",
  "Tactical Intelligence": "tactical",
  "Historical Evolution": "history",
  "Hidden Statistical Stories": "data-science",
  "Future Intelligence": "future",
};

type Candidate = { planId: string; title: string; score: number; titleOverlap: number; conceptOverlap: number; shared: string[] };
const coverage = EDITORIAL_ARTICLES.map((legacy) => {
  const lt = `${legacy.title} ${legacy.subtitle ?? ""}`;
  const ltTok = tokens(legacy.title);
  const ltCon = concepts(lt);
  const own = plan.filter((p) => p.franchise === legacy.teamCode.toUpperCase());
  const scored: Candidate[] = own
    .map((p) => {
      const exact = p.title.trim().toLowerCase() === legacy.title.trim().toLowerCase();
      const pc = concepts(p.title);
      const t = jaccard(ltTok, tokens(p.title));
      const c = jaccard(ltCon, pc);
      const prior = PARAM_ASPECT[legacy.parameter] === p.aspect ? 0.08 : 0;
      return {
        planId: p.planId,
        title: p.title,
        score: exact ? 1 : Math.min(0.99, +(0.45 * t + 0.47 * c + prior).toFixed(3)),
        titleOverlap: +t.toFixed(3),
        conceptOverlap: +c.toFixed(3),
        shared: [...ltCon].filter((x) => pc.has(x)),
      };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  const best = top[0];
  const auto = best.score >= 0.99 ? "exact" : best.score >= 0.4 ? "semantic-duplicate" : best.score >= 0.25 ? "partial-overlap" : "no-match";
  const decision = decisions.find((d) => d.legacyId === legacy.id);
  return { legacyId: legacy.id, legacySlug: legacy.slug, franchise: legacy.teamCode.toUpperCase(), legacyTitle: legacy.title, parameter: legacy.parameter, auto, candidates: top, decision: decision ?? null };
});

// ── Article status from v2 files ─────────────────────────────────────────────
const articlesDir = resolve(APP, "src/data/editorial/articles");
const written = new Map<string, { status: string; slug: string }>();
for (const code of FRANCHISE_CODES) {
  const dir = resolve(articlesDir, code.toLowerCase());
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const a = articleSchema.safeParse(JSON.parse(readFileSync(resolve(dir, f), "utf8")));
    if (a.success) written.set(a.data.planId, { status: a.data.status, slug: a.data.slug });
  }
}

const covered = new Map<string, string>(); // planId → legacyId (reviewed revise/reuse decisions)
for (const d of decisions) if (d.planId && d.decision !== "keep-separate") covered.set(d.planId, d.legacyId);

const perFranchise = FRANCHISE_CODES.map((code) => {
  const own = plan.filter((p) => p.franchise === code);
  const st = (s: string) => own.filter((p) => written.get(p.planId)?.status === s).length;
  const legacyMapped = own.filter((p) => covered.has(p.planId)).length;
  const legacyOwn = coverage.filter((c) => c.franchise === code);
  return {
    code,
    planned: own.length,
    published: st("published"),
    review: st("review"),
    draft: st("draft"),
    legacyMapped,
    legacyArticles: legacyOwn.length,
    legacyReviewed: legacyOwn.filter((c) => c.decision?.reviewed).length,
    notStarted: own.filter((p) => !written.has(p.planId)).length,
  };
});

writeFileSync(
  resolve(APP, "src/data/editorial/plan/legacy-coverage.json"),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), perFranchise, legacy: coverage }, null, 1) + "\n",
);

// ── Markdown report ───────────────────────────────────────────────────────────
const L: string[] = [];
L.push("# Dugout 1,000-article plan: coverage and duplicate report", "");
L.push(`Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/editorial/coverage-report.ts\`. Plan source: \`docs/editorial/plan/cricfield_1000_article_titles.csv\` (1,000 titles, verified against the Markdown copy).`, "");
L.push("## Coverage by franchise", "");
L.push("| Franchise | Planned | Published | In review (localhost only) | Draft | Not started | Legacy articles | Legacy decisions reviewed | Plan slots covered by a legacy article |");
L.push("|---|---|---|---|---|---|---|---|---|");
for (const f of perFranchise) L.push(`| ${f.code} | ${f.planned} | ${f.published} | ${f.review} | ${f.draft} | ${f.notStarted} | ${f.legacyArticles} | ${f.legacyReviewed} | ${f.legacyMapped} |`);
const tot = (k: keyof (typeof perFranchise)[number]) => perFranchise.reduce((s, f) => s + (f[k] as number), 0);
L.push(`| **All** | ${tot("planned")} | ${tot("published")} | ${tot("review")} | ${tot("draft")} | ${tot("notStarted")} | ${tot("legacyArticles")} | ${tot("legacyReviewed")} | ${tot("legacyMapped")} |`, "");
L.push("“Published” means `status: published` in the article file. Nothing is published automatically: Batch articles enter as `review` and render only on localhost until an editor changes the status.", "");
L.push("## How duplicates are detected", "");
L.push("- **Exact:** the legacy title equals a plan title (case-insensitive).");
L.push("- **Semantic:** score = 0.45 × title-token Jaccard (franchise names and stop words removed, light stemming) + 0.47 × concept Jaccard (a cricket lexicon: venue, chase, powerplay, death, auction, pressure, history, selection, …) + 0.08 when the legacy parameter maps to the plan aspect. ≥ 0.40 is flagged as a likely duplicate, 0.25–0.40 as partial overlap.");
L.push("- Automatic flags are proposals. A legacy article is only treated as covering a plan slot after a reviewed decision in `src/data/editorial/plan/legacy-decisions.json`.", "");
L.push("## Legacy articles against the plan", "");
for (const code of FRANCHISE_CODES) {
  const rows = coverage.filter((c) => c.franchise === code);
  if (!rows.length) continue;
  L.push(`### ${code}`, "");
  L.push("| Legacy article | Auto flag | Best plan match (score) | Decision |");
  L.push("|---|---|---|---|");
  for (const r of rows) {
    const b = r.candidates[0];
    const d = r.decision
      ? `${r.decision.decision}${r.decision.planId ? ` → ${r.decision.planId}` : ""}${r.decision.reviewed ? "" : " (unreviewed)"}: ${r.decision.note}`
      : "pending review";
    L.push(`| \`${r.legacyId}\` ${r.legacyTitle} | ${r.auto} | \`${b.planId}\` ${b.title} (${b.score}; shared: ${b.shared.join(", ") || "none"}) | ${d} |`);
  }
  L.push("");
}
L.push("## Aspect key", "");
for (const a of EDITORIAL_ASPECTS) L.push(`- ${a.number}. ${a.name} (\`${a.id}\`)`);
writeFileSync(resolve(ROOT, "docs/editorial/COVERAGE-REPORT.md"), L.join("\n") + "\n");

const flagged = coverage.filter((c) => c.auto !== "no-match").length;
console.log(`Legacy articles: ${coverage.length}; flagged against the plan: ${flagged} (exact ${coverage.filter((c) => c.auto === "exact").length}, semantic ${coverage.filter((c) => c.auto === "semantic-duplicate").length}, partial ${coverage.filter((c) => c.auto === "partial-overlap").length}).`);
console.log(`Reviewed decisions: ${decisions.filter((d) => d.reviewed).length}. v2 articles on disk: ${written.size}.`);
for (const f of perFranchise) console.log(`  ${f.code}: planned ${f.planned}, published ${f.published}, review ${f.review}, not started ${f.notStarted}, legacy-mapped ${f.legacyMapped}`);
