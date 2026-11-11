// Regenerates article evidence files from sqlite.db (read-only).
//   pnpm exec tsx scripts/editorial/evidence/run.ts            → all articles with a generator
//   pnpm exec tsx scripts/editorial/evidence/run.ts cf-rcb-001 → one article
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Evidence, openDb } from "./lib";

const only = process.argv[2];
const db = openDb();
let failed = 0;
for (const franchise of readdirSync(import.meta.dirname, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const dir = resolve(import.meta.dirname, franchise.name);
  for (const file of readdirSync(dir).filter((f) => /^cf-[a-z]+-\d{3}\.ts$/.test(f))) {
    const id = file.replace(/\.ts$/, "");
    if (only && id !== only) continue;
    const mod = await import(pathToFileURL(resolve(dir, file)).href);
    const ev = new Evidence(id, db);
    mod.default(ev);
    const out = ev.write();
    const status = ev.failures.length ? `FAILED (${ev.failures.length})` : "ok";
    console.log(`${id}: ${Object.keys(out.metrics).length} metrics, ${Object.keys(out.tables).length} tables — ${status}`);
    for (const f of ev.failures) console.log(`   ✗ ${f}`);
    failed += ev.failures.length;
  }
}
process.exit(failed ? 1 : 0);
