// Global data engine — add a competition to the catalogue.
//
//   pnpm --filter @workspace/scripts run global:onboard -- --code csa-t20 --name "CSA T20 Challenge" --slug ctc_json \
//     --region "South Africa" --format T20 --gender male --team-type club --catalogue-matches 314 [--batch 3] [--enable]
//
// Checks that https://cricsheet.org/downloads/<slug>.zip exists (HEAD request, nothing downloaded), then
// writes the entry to manifests/sources.json. Entries are added disabled unless --enable is passed; enabling
// an existing entry: --code <code> --enable. Then run global:sync -- --only <code>.

import fs from "node:fs";
import { SOURCES_PATH, archiveUrl, loadSources, parseArgs, type CompetitionSource, type Format } from "./paths";

async function main(): Promise<void> {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const code = values.get("code");
  if (!code) throw new Error("--code is required");
  const sources = loadSources();
  const existing = sources.competitions.find((c) => c.code === code);

  if (existing && flags.has("enable") && !values.get("slug")) {
    existing.enabled = true;
    fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2) + "\n");
    console.log(`Enabled ${code}. Next: pnpm --filter @workspace/scripts run global:sync -- --only ${code}`);
    return;
  }
  if (existing) throw new Error(`competition ${code} already exists in sources.json`);

  const need = (k: string) => { const v = values.get(k); if (!v) throw new Error(`--${k} is required`); return v; };
  const slug = need("slug");
  if (!/^[a-z0-9_]+$/.test(slug)) throw new Error("slug must look like 'ctc_json' (see https://cricsheet.org/downloads/)");
  const res = await fetch(archiveUrl(slug), { method: "HEAD" });
  if (!res.ok) throw new Error(`${archiveUrl(slug)} returned HTTP ${res.status}; check the slug on the Cricsheet downloads page`);

  const format = need("format") as Format;
  if (!["T20", "T20I", "100-ball"].includes(format)) throw new Error("--format must be T20, T20I or 100-ball");
  const entry: CompetitionSource = {
    code, name: need("name"), region: need("region"), format,
    gender: need("gender") === "female" ? "female" : "male",
    teamType: need("team-type") === "international" ? "international" : "club",
    slug, batch: Number(values.get("batch") ?? 3), enabled: flags.has("enable"),
    catalogueMatches: Number(need("catalogue-matches")),
    note: `Onboarded ${new Date().toISOString().slice(0, 10)}; archive ${(Number(res.headers.get("content-length") ?? 0) / 1048576).toFixed(2)} MB.`,
  };
  sources.competitions.push(entry);
  fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2) + "\n");
  console.log(`Added ${code} (${entry.enabled ? "enabled" : "disabled"}). ${entry.enabled ? `Next: pnpm --filter @workspace/scripts run global:sync -- --only ${code}` : `Enable with --code ${code} --enable when approved.`}`);
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
