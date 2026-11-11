// Step 3.5 Task A — audit every player page's recent matches against the Cricsheet registry.
//
//   tsx src/step3/identity-audit.ts [--resolver <player-recent-matches.ts>] [--data <public/data dir>] [--json out.json] [--out report.md]
//
// Ground truth comes from the raw IPL Cricsheet files the site ships (lib/cricket-data/raw): each file lists
// both XIs by written name and maps each written name to a registry id, so a registry id's true match list is
// exact. For each of the 788 player bios the audit:
//   1. decides the bio's registry id with the shared rules in scripts/lib/player-identity.mjs (exact only);
//   2. resolves the page's key with the given resolver and reads that log, as the page would;
//   3. compares the log's match ids with the true match ids of that registry id.
// The Cricsheet people register (if present locally) is used only to suggest aliases for human review.
//
// It also checks the step before that: every written name in the IPL files, as a /players/<slug> link, is
// resolved to a bio with the page's own resolver (src/lib/player-key.ts) and must not land on another
// player's page.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { IPL_RAW_DIR, REPO, GLOBAL_DIR, parseArgs } from "../global/paths";
import { parseCsvObjects } from "../global/csv";
import { createRegistryHistory, recordAppearance, identifyBio, loadVerifiedAliases, canonFranchise } from "../../lib/player-identity.mjs";

// The web modules import through the "@/" alias, which tsx resolves only with the web tsconfig.
const WEB = path.join(REPO, "artifacts", "ipl-analytics");
if (!process.env.TSX_TSCONFIG_PATH) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit", env: { ...process.env, TSX_TSCONFIG_PATH: path.join(WEB, "tsconfig.json") },
  });
  process.exit(r.status ?? 1);
}

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { values } = parseArgs(process.argv.slice(2));
const dataDir = values.get("data") ?? path.join(WEB, "public", "data");
const resolverPath = values.get("resolver") ?? path.join(WEB, "src", "lib", "player-recent-matches.ts");
const aliasPath = values.get("aliases") ?? path.join(REPO, "scripts", "data", "player-identity-aliases.json");
const { resolveRecentMatchesKey } = await import(pathToFileURL(resolverPath).href);
const { resolvePlayerKey, resolveProfileName } = await import(pathToFileURL(path.join(WEB, "src", "lib", "player-key.ts")).href);
const { playerSlug, buildPlayerDisplayNames } = await import(pathToFileURL(path.join(WEB, "src", "lib", "aggregates.ts")).href);

// ── Ground truth from the raw files ──
const history = createRegistryHistory();
const truth = new Map<string, Set<string>>();
const rawFiles = fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"));
for (const f of rawFiles) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  const mid = f.replace(".json", "");
  for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
    const id = m.info.registry.people[n];
    if (!id) continue;
    recordAppearance(history, id, n, team, m.info.season);
    (truth.get(id) ?? truth.set(id, new Set()).get(id)!).add(mid);
  }
}
const aliases = loadVerifiedAliases(aliasPath);

// ── Register names (for alias suggestions only) ──
const regDir = path.join(GLOBAL_DIR, "raw", "cricsheet", "register");
const latest = (sub: string) => { const d = path.join(regDir, sub); return fs.existsSync(d) ? fs.readdirSync(d).filter((x) => x.endsWith(".csv")).sort().pop() : undefined; };
const variants = new Map<string, Set<string>>();
const regName = new Map<string, string>();
for (const [sub, nameCols] of [["people", ["name", "unique_name"]], ["names", ["name"]]] as const) {
  const file = latest(sub);
  if (!file) continue;
  for (const r of parseCsvObjects(fs.readFileSync(path.join(regDir, sub, file), "utf8"))) {
    if (sub === "people") regName.set(r.identifier, r.unique_name || r.name);
    for (const c of nameCols) if (r[c]) (variants.get(r[c]) ?? variants.set(r[c], new Set()).get(r[c])!).add(r.identifier);
  }
}
const who = (id: string) => `${regName.get(id) ?? [...(history.ids.get(id)?.written ?? [])][0] ?? id} (${id})`;

// ── Page data as the page reads it ──
const splitDir = path.join(dataDir, "player-recent-matches");
const identityIndex = JSON.parse(fs.readFileSync(path.join(splitDir, "index.json"), "utf8"));
const index: Record<string, [string, number]> = identityIndex.keys;
const lengths = Object.fromEntries(Object.entries(index).map(([k, v]) => [k, v[1]]));
const shard = (k: string): Any[] => JSON.parse(fs.readFileSync(path.join(splitDir, `${index[k][0]}.json`), "utf8"));
const bios: Record<string, Any> = JSON.parse(fs.readFileSync(path.join(dataDir, "player-bio.json"), "utf8"));

type Row = { slug: string; name: string; team: string; id: string | null; method: string; key: string | null; shown: number; truthN: number; status: string; detail: string; suggestion: string };
const rows: Row[] = [];
for (const [slug, bio] of Object.entries(bios)) {
  const ident = identifyBio(slug, bio, history, aliases);
  const key: string | null = resolveRecentMatchesKey(lengths, slug);
  const log = key ? shard(key) : [];
  const shownIds = new Set(log.map((x: Any) => String(x.matchId)));
  const t = ident.id ? truth.get(ident.id) ?? new Set<string>() : null;
  let status: string, detail = "", suggestion = "";
  if (!t) {
    status = shownIds.size ? "SHOWN WITHOUT VERIFIED IDENTITY" : "no verified identity (empty)";
    detail = ident.method + (ident.candidates.length ? `: ${ident.candidates.map(who).join(" / ")}` : "");
    const reg = [bio.playerName, bio.fullName].flatMap((n: string) => [...(variants.get(n) ?? [])]).filter((i) => truth.has(i));
    if (reg.length) suggestion = [...new Set(reg)].map(who).join(" / ");
  } else {
    const missing = [...t].filter((x) => !shownIds.has(x)).length;
    const extra = [...shownIds].filter((x) => !t.has(x)).length;
    if (!missing && !extra) status = t.size ? "correct" : "correct (no matches)";
    else if (shownIds.size === 0) { status = "MISSING (empty page)"; detail = `${t.size} true matches not shown`; }
    else if (extra === shownIds.size) { status = "WRONG PLAYER"; detail = `all ${shownIds.size} shown matches belong to someone else; true ${t.size}`; }
    else if (extra) { status = "MERGED"; detail = `${extra} of ${shownIds.size} shown matches belong to another player${missing ? `; ${missing} true matches missing` : ""}`; }
    else { status = "INCOMPLETE"; detail = `${missing} of ${t.size} true matches missing`; }
    const team = canonFranchise(bio.currentTeam || bio.team || "");
    if (team && !history.ids.get(ident.id!)?.franchises.has(team)) detail += `${detail ? "; " : ""}note: never played for bio team ${team}`;
  }
  rows.push({ slug, name: bio.fullName ?? bio.playerName ?? "", team: bio.currentTeam || bio.team || "", id: ident.id, method: ident.method, key, shown: shownIds.size, truthN: t?.size ?? 0, status, detail, suggestion });
}

// ── Links: every written name as /players/<slug>, through the page's slug → bio resolver ──
const bioIdentity = new Map(rows.map((r) => [r.slug, r.id]));
type Link = { written: string; slug: string; ids: string[]; bioKey: string | null; bioId: string | null; status: string };
const links: Link[] = [];
for (const [written, idSet] of history.writtenToIds) {
  const ids = [...idSet];
  const slug: string = playerSlug(written);
  const bioKey: string | null = resolvePlayerKey(bios, slug, identityIndex);
  const bioId = bioKey ? bioIdentity.get(bioKey) ?? null : null;
  let status: string;
  if (!bioKey) status = "no player page";
  else if (ids.length > 1) status = bioId && ids.includes(bioId) ? "shared written name (page of one of them)" : "SHARED NAME ON ANOTHER PLAYER'S PAGE";
  else if (!bioId) status = "page with no verified identity (empty recent matches)";
  else status = bioId === ids[0] ? "correct page" : "WRONG PLAYER PAGE";
  links.push({ written, slug, ids, bioKey, bioId, status });
}
// ── Headings: the page's heading name must not be a name the registry gives another player ──
const displayNames = buildPlayerDisplayNames(JSON.parse(fs.readFileSync(path.join(dataDir, "squads-by-season.json"), "utf8")));
const idOfLink = (s: string): string | undefined => index[s]?.[0] ?? identityIndex.pages?.[s];
const badHeadings: { slug: string; heading: string; id: string; namedIds: string[] }[] = [];
for (const r of rows) {
  if (!r.id) continue;
  const heading: string = resolveProfileName(bios[r.slug], r.slug, displayNames, identityIndex);
  const namedIds = new Set([...(history.writtenToIds.get(heading) ?? [])]);
  const viaLink = idOfLink(playerSlug(heading));
  if (viaLink) namedIds.add(viaLink);
  if (namedIds.size && !namedIds.has(r.id)) badHeadings.push({ slug: r.slug, heading, id: r.id, namedIds: [...namedIds] });
}

const linkStatuses = [...new Set(links.map((l) => l.status))].sort();
const linkCount = (s: string) => links.filter((l) => l.status === s).length;
const badLinks = links.filter((l) => /^[A-Z]/.test(l.status));
const noteLinks = links.filter((l) => l.status.startsWith("page with no verified") || l.status.startsWith("shared written"));

const statuses = [...new Set(rows.map((r) => r.status))].sort();
const count = (s: string) => rows.filter((r) => r.status === s).length;
const bad = rows.filter((r) => /^[A-Z]/.test(r.status));
const empty = rows.filter((r) => r.status === "no verified identity (empty)");
const sharedWritten = [...history.writtenToIds.entries()].filter(([, ids]) => ids.size > 1).map(([n, ids]) => `${n}: ${[...ids].map(who).join(" / ")}`);
const md = [
  "# Player identity audit — recent matches on all player pages", "",
  `Resolver \`${path.relative(REPO, resolverPath)}\`; data \`${path.relative(REPO, dataDir) || dataDir}\`; ${Object.keys(aliases).length} reviewed aliases. Ground truth: ${truth.size} registry ids from ${rawFiles.length} raw IPL files.`, "",
  "| Status | Pages |", "|---|---:|", ...statuses.map((s) => `| ${s} | ${count(s)} |`), `| **Total** | ${rows.length} |`, "",
  "**correct**: shown matches equal the registry id's true match list. **MERGED** / **WRONG PLAYER**: shown matches include another person's. **INCOMPLETE** / **MISSING**: true matches not shown. **SHOWN WITHOUT VERIFIED IDENTITY**: data shown for a bio no exact rule ties to one registry id. **no verified identity (empty)**: the page shows its empty state.", "",
  "## Pages that show wrong, merged or incomplete data", "",
  bad.length ? "| Page | Bio name | Bio team | Identity (method) | Key | Shown | True | Status | Detail |\n|---|---|---|---|---|---:|---:|---|---|" : "None.",
  ...bad.map((r) => `| ${r.slug} | ${r.name} | ${r.team} | ${r.id ? `${who(r.id)}: ${r.method}` : r.method} | ${r.key ?? "—"} | ${r.shown} | ${r.truthN} | ${r.status} | ${r.detail} |`), "",
  "## Pages with no verified identity (empty state)", "",
  "| Page | Bio name | Bio team | Why | Register suggestion (for review, not applied) |", "|---|---|---|---|---|",
  ...empty.map((r) => `| ${r.slug} | ${r.name} | ${r.team} | ${r.detail} | ${r.suggestion || "—"} |`), "",
  "## Identities resolved only with franchise evidence", "",
  ...rows.filter((r) => r.method.includes("franchise")).map((r) => `- ${r.slug} (${r.name}, ${r.team}) → ${who(r.id!)}`), "",
  "## Written names shared by different people in the IPL files", "", ...sharedWritten.map((s) => `- ${s}`), "",
  "## Links to player pages", "",
  `Every written name in the IPL files (${links.length}) as \`/players/<slug>\`, resolved to a bio by the page's resolver (\`src/lib/player-key.ts\`). **WRONG PLAYER PAGE**: the link opens a bio whose verified identity is a different registry id. **no player page**: no bio matches (the page says \"Player not found\").`, "",
  "| Status | Links |", "|---|---:|", ...linkStatuses.map((s) => `| ${s} | ${linkCount(s)} |`), `| **Total** | ${links.length} |`, "",
  badLinks.length ? "| Written name | Slug | Registry id(s) | Opens bio | Bio identity | Status |\n|---|---|---|---|---|---|" : "No link opens another player's page.",
  ...badLinks.map((l) => `| ${l.written} | ${l.slug} | ${l.ids.map(who).join(" / ")} | ${l.bioKey} | ${l.bioId ? who(l.bioId) : "—"} | ${l.status} |`), "",
  ...(noteLinks.length ? ["Links that open a page without an exact identity check (for review):", "",
    ...noteLinks.map((l) => `- ${l.written} (${l.ids.map(who).join(" / ")}) → bio ${l.bioKey}${l.bioId ? ` = ${who(l.bioId)}` : ""}: ${l.status}`), ""] : []),
  "## Page headings", "",
  `The heading of each page with a verified identity (\`resolveProfileName\`), checked against the names the IPL files give each registry id: ${badHeadings.length ? `**${badHeadings.length} headings name another player**` : "no heading names another player"}.`, "",
  ...badHeadings.map((h) => `- ${h.slug}: heading "${h.heading}" names ${h.namedIds.map(who).join(" / ")}, page is ${who(h.id)}`), "",
];
fs.writeFileSync(values.get("out") ?? "identity-audit.md", md.join("\n") + "\n");
if (values.get("json")) fs.writeFileSync(values.get("json")!, JSON.stringify(rows, null, 1));
console.log(statuses.map((s) => `${s}: ${count(s)}`).join(" | "));
for (const r of [...bad, ...empty].slice(0, 30)) console.log(`  ${r.status.padEnd(30)} ${r.slug.padEnd(26)} key=${r.key} shown=${r.shown} true=${r.truthN} ${r.detail}${r.suggestion ? ` | suggest ${r.suggestion}` : ""}`);
console.log(`links: ${linkStatuses.map((s) => `${s}: ${linkCount(s)}`).join(" | ")}`);
for (const l of badLinks.slice(0, 30)) console.log(`  ${l.status.padEnd(36)} ${l.written.padEnd(22)} /players/${l.slug} → ${l.bioKey} (${l.bioId}) expected ${l.ids.join("/")}`);
console.log(`headings naming another player: ${badHeadings.length}`);
for (const h of badHeadings) console.log(`  ${h.slug}: "${h.heading}" names ${h.namedIds.join("/")}, page is ${h.id}`);
process.exitCode = bad.length || badLinks.length || badHeadings.length ? 1 : 0;
