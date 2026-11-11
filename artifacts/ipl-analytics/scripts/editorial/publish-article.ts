// Publish reviewed v2 articles — never run automatically.
//
// Records the editor's sign-off and sets status "published" for each id, but only when the article's
// content, metadata and route checks pass (publication-readiness.ts). Image rights are not consulted:
// an article with a pending Getty photo publishes with the CricField illustration.
//
//   pnpm exec tsx --no-warnings scripts/editorial/publish-article.ts cf-csk-022 [cf-…] --reviewer "Full Name" [--dry-run]
//   then: validate-articles.ts (re-index, sitemap) and a production build.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP } from "./evidence/lib";

const args = process.argv.slice(2);
const ri = args.indexOf("--reviewer");
const reviewer = ri >= 0 ? args[ri + 1] : "";
const dry = args.includes("--dry-run");
const ids = args.filter((a, i) => /^cf-[a-z]+-\d{3}$/.test(a) && args[i - 1] !== "--reviewer");
if (!ids.length || reviewer.trim().length < 2) {
  console.error('usage: publish-article.ts <cf-id…> --reviewer "Full Name" [--dry-run]');
  process.exit(1);
}

// The validator exits non-zero when any article has errors but still writes its reports; readiness is read from those.
const tsx = (script: string) => {
  try {
    execFileSync("pnpm", ["exec", "tsx", "--no-warnings", script], { cwd: APP, stdio: "pipe", shell: true });
  } catch {
    /* reports written; per-article readiness decides below */
  }
};
tsx("scripts/editorial/validate-articles.ts");
tsx("scripts/editorial/publication-readiness.ts");
const readiness = JSON.parse(readFileSync(resolve(APP, "../../docs/editorial/PUBLICATION-READINESS.json"), "utf8")) as { rows: { id: string; content: boolean; metadata: boolean; route: boolean; problems: string[] }[] };

const today = new Date().toISOString().slice(0, 10);
let failed = 0;
for (const id of ids) {
  const r = readiness.rows.find((x) => x.id === id);
  if (!r) { console.error(`✗ ${id}: not found`); failed++; continue; }
  if (!(r.content && r.metadata && r.route)) { console.error(`✗ ${id}: not ready — ${r.problems.filter((p) => !p.startsWith("editorial review")).join("; ")}`); failed++; continue; }
  const file = resolve(APP, "src/data/editorial/articles", id.split("-")[1], `${id}.json`);
  const a = JSON.parse(readFileSync(file, "utf8"));
  a.editorialReview = { reviewedBy: reviewer.trim(), reviewedAt: today, approved: true };
  a.status = "published";
  a.publishedDate = today;
  if (dry) console.log(`would publish ${id} (reviewer ${reviewer.trim()})`);
  else { writeFileSync(file, JSON.stringify(a, null, 2) + "\n"); console.log(`✓ published ${id} (reviewer ${reviewer.trim()}) — photo rights unchanged`); }
}
if (!dry && failed < ids.length) tsx("scripts/editorial/validate-articles.ts");
process.exit(failed ? 1 : 0);
