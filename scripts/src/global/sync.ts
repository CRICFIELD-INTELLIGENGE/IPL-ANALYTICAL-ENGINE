// Global data engine — one command for a full, repeatable update.
//
//   pnpm --filter @workspace/scripts run global:sync     # check Cricsheet, download changes, rebuild what changed
//   pnpm --filter @workspace/scripts run global:build    # same, from the archives already on disk (no network)
//   flags: --only ipl,smat   --force (re-normalize everything)   --skip-download
//
// Steps: acquire → normalize (changed matches only) → identity → aggregate
// (competitions with changes, or all on first build) → validate → change report.
// Nothing is scheduled; run it by hand. Never touches sqlite.db or the IPL site.

import fs from "node:fs";
import path from "node:path";
import { openGlobalDb, all, setMeta } from "./db";
import { REPORT_DIR, WAREHOUSE_PATH, ensureDir, parseArgs, today } from "./paths";
import { acquire, type AcquisitionRecord } from "./acquire";
import { normalize, type CompetitionIngestSummary } from "./normalize";
import { runIdentity } from "./identity";
import { aggregate } from "./aggregate";
import { runValidation } from "./validate";

async function main(): Promise<void> {
  const { only, flags } = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const lines: string[] = [];
  const log = (s: string) => { console.log(s); lines.push(s); };

  let acquired: AcquisitionRecord[] = [];
  if (!flags.has("skip-download")) {
    log("1/6 Acquire");
    acquired = await acquire({ only, registers: !only });
  } else log("1/6 Acquire — skipped (using archives on disk)");

  const db = openGlobalDb();
  const firstBuild = (all<{ n: number }>(db, "SELECT COUNT(*) n FROM agg_batting")[0]?.n ?? 0) === 0;
  const runId = Number(db.prepare("INSERT INTO ingest_runs (started_at, command) VALUES (?, ?)").run(new Date().toISOString(), process.argv.slice(2).join(" ") || "global:sync").lastInsertRowid);

  log("2/6 Normalize");
  const ingest: CompetitionIngestSummary[] = normalize(db, { only, force: flags.has("force") });

  log("3/6 Identity");
  const registerChanged = acquired.some((a) => a.kind === "register" && a.status === "new");
  const changed = new Set(ingest.filter((s) => s.added + s.updated + s.missingFromLatest > 0).map((s) => s.code));
  const id = runIdentity(db);
  log(`  ${id.matchPlayers.total} players in loaded matches; ${id.iplWarehouseBridge.linkedExact} IPL warehouse players linked exactly; ${id.reviewQueue.length} in review`);

  log("4/6 Aggregate");
  const toAggregate = firstBuild || flags.has("force") ? null : changed;
  if (toAggregate && toAggregate.size === 0) log("  no competition changed — aggregates kept");
  else for (const s of aggregate(db, toAggregate)) log(`  ${s.code.padEnd(6)} ${s.balls} balls (${s.ms} ms)`);

  log("5/6 Validate");
  const v = runValidation(db);
  log(`  ${v.summary.pass} pass, ${v.summary.warn} warn, ${v.summary.fail} fail`);

  log("6/6 Change report");
  db.prepare("UPDATE ingest_runs SET finished_at = ?, summary = ? WHERE run_id = ?").run(new Date().toISOString(), JSON.stringify(ingest), runId);
  setMeta(db, "last_sync", new Date().toISOString());
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  db.close();

  const md: string[] = [`# Change report — ${new Date().toISOString()}`, "", `Run ${runId}, ${((Date.now() - started) / 1000).toFixed(1)} s.`, ""];
  md.push("## Downloads", "", acquired.length ? "| Source | Status | Size | Path |\n|---|---|---:|---|" : "Skipped.");
  for (const a of acquired) md.push(`| ${a.key} | ${a.status} | ${(a.bytes / 1048576).toFixed(2)} MB | ${a.path} |`);
  md.push("", "## Matches", "", "| Competition | In archive | New | Updated | Unchanged | No longer in source | Id conflicts |", "|---|---:|---:|---:|---:|---:|---:|");
  for (const s of ingest) md.push(`| ${s.code} | ${s.entries} | ${s.added} | ${s.updated} | ${s.unchanged} | ${s.missingFromLatest} | ${s.conflicts.length} |`);
  const changedIds = ingest.flatMap((s) => (firstBuild ? [] : s.changedMatchIds.map((id) => `${s.code}:${id}`)));
  if (changedIds.length) md.push("", `Changed matches: ${changedIds.join(", ")}`);
  md.push("", "## Validation", "", `${v.summary.pass} pass, ${v.summary.warn} warn, ${v.summary.fail} fail — see validation-${today()}.md.`);
  md.push("", `Register refreshed: ${registerChanged ? "yes" : "no"}. Warehouse: ${path.relative(process.cwd(), WAREHOUSE_PATH)} (${(fs.statSync(WAREHOUSE_PATH).size / 1048576).toFixed(1)} MB).`);
  ensureDir(REPORT_DIR);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  fs.writeFileSync(path.join(REPORT_DIR, `change-${stamp}.md`), md.join("\n") + "\n");
  log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s → reports/change-${stamp}.md`);
  if (v.summary.fail > 0) process.exitCode = 2;
}

main().catch((err) => { console.error(err instanceof Error ? err.stack : err); process.exit(1); });
