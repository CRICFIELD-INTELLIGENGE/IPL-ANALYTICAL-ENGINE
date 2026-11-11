// Day 4.5 — apply the APPROVED identity proposals (docs/data-repairs/2026-10-14-day4/identity-proposals.json).
//
//   tsx src/day4/apply-identity-proposals.ts            # dry run: checks every precondition, writes the log only
//   tsx src/day4/apply-identity-proposals.ts --apply    # also writes the bio, squad and alias files
//
// Approved scope (DAY-04.5 instruction): P1 (3 merges), P2 (Porel), P3 (collapse the identical Tejasvi bios only —
// NO identity is asserted), P4 (3 squad rows), P5 (6 aliases). Every proposal is re-verified here against the
// Cricsheet register (global.db, read-only) and the raw IPL files before anything is written; any failed check
// aborts the whole run. Merges fill only fields the kept bio lacks (never overwrite), except where noted.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REPO, IPL_RAW_DIR, parseArgs } from "../global/paths";
import { createRegistryHistory, recordAppearance, identifyBio, loadVerifiedAliases } from "../../lib/player-identity.mjs";

type Bio = Record<string, unknown>;
const { flags } = parseArgs(process.argv.slice(2));
const apply = flags.has("apply");
const BIO_FILES = [path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json"), path.join(REPO, "artifacts", "api-server", "data", "player-bio.json")];
const SQUAD_FILES = [path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "squads-by-season.json"), path.join(REPO, "artifacts", "api-server", "data", "squads-by-season.json")];
const ALIAS_FILE = path.join(REPO, "scripts", "data", "player-identity-aliases.json");
const PROPOSALS = JSON.parse(fs.readFileSync(path.join(REPO, "docs", "data-repairs", "2026-10-14-day4", "identity-proposals.json"), "utf8"));
const OUT_DIR = path.join(REPO, "docs", "data-repairs", "2026-10-14-day45");

for (const files of [BIO_FILES, SQUAD_FILES]) {
  if (fs.readFileSync(files[0], "utf8") !== fs.readFileSync(files[1], "utf8")) throw new Error(`${files[1]} differs from ${files[0]}; reconcile first`);
}
const bios = JSON.parse(fs.readFileSync(BIO_FILES[0], "utf8")) as Record<string, Bio>;
const squads = JSON.parse(fs.readFileSync(SQUAD_FILES[0], "utf8")) as Record<string, Record<string, Bio[]>>;
const aliasDoc = JSON.parse(fs.readFileSync(ALIAS_FILE, "utf8")) as { aliases: Record<string, unknown> };
const aliases = loadVerifiedAliases(ALIAS_FILE);

const history = createRegistryHistory();
const appearances = new Map<string, { team: string; season: string }[]>();
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
    const id = m.info.registry.people[n];
    if (!id) continue;
    recordAppearance(history, id, n, team, m.info.season);
    (appearances.get(id) ?? appearances.set(id, []).get(id)!).push({ team, season: String(m.info.season) });
  }
}
const gdb = new DatabaseSync(path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db"), { readOnly: true });
const registerIdsFor = (name: string) => (gdb.prepare(`SELECT DISTINCT p.cricsheet_id id FROM player_names n JOIN players p ON p.player_key = n.player_key
  WHERE n.name = ? AND n.origin IN ('register', 'register_variant', 'match')`).all(name) as { id: string }[]).map((r) => r.id);

const log: { id: string; action: string; keys: string[]; registryId: string | null; checks: string[]; changes: string[] }[] = [];
const fail = (id: string, msg: string): never => { throw new Error(`${id}: precondition failed: ${msg}`); };
const idOf = (k: string) => identifyBio(k, bios[k], history, aliases).id;
const isImage = (v: unknown) => typeof v === "string" && /\.(webp|png|jpe?g|gif|avif)(\?|$)/i.test(v);

function merge(id: string, keep: string, fold: string, registryId: string, opts: { foldMayLackIdentity?: boolean; replaceNonImage?: boolean; setPlayerName?: string } = {}) {
  const checks: string[] = [], changes: string[] = [];
  if (!bios[keep] || !bios[fold]) fail(id, `bio missing (${keep}: ${!!bios[keep]}, ${fold}: ${!!bios[fold]})`);
  if (idOf(keep) !== registryId) fail(id, `${keep} resolves to ${idOf(keep)}, not ${registryId}`);
  checks.push(`${keep} → ${registryId} by the shared identity rules`);
  const foldId = idOf(fold);
  if (foldId === null && opts.foldMayLackIdentity) checks.push(`${fold} has no verified identity (spelling variant)`);
  else if (foldId !== registryId) fail(id, `${fold} resolves to ${foldId}, not ${registryId}`);
  else checks.push(`${fold} → ${registryId} by the shared identity rules`);
  const apps = appearances.get(registryId) ?? [];
  checks.push(`${registryId}: ${apps.length} IPL appearances (${[...new Set(apps.map((a) => a.team))].join(", ")})`);
  const k = bios[keep], f = bios[fold];
  for (const [field, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === "") continue;
    const cur = k[field];
    if (cur === undefined || cur === null || cur === "") { k[field] = v; changes.push(`${keep}.${field} filled from ${fold}: ${JSON.stringify(v).slice(0, 80)}`); }
    else if (opts.replaceNonImage && field === "image" && !isImage(cur) && isImage(v)) { changes.push(`${keep}.image ${JSON.stringify(cur)} (a web page, not an image) → ${JSON.stringify(v)}`); k[field] = v; }
    else if (JSON.stringify(cur) !== JSON.stringify(v)) changes.push(`kept ${keep}.${field} = ${JSON.stringify(cur).slice(0, 60)} (${fold} had ${JSON.stringify(v).slice(0, 60)})`);
  }
  if (opts.setPlayerName) { changes.push(`${keep}.playerName ${JSON.stringify(k.playerName)} → ${JSON.stringify(opts.setPlayerName)}`); k.playerName = opts.setPlayerName; }
  delete bios[fold];
  changes.push(`removed bio ${fold}`);
  if (idOf(keep) !== registryId) fail(id, `${keep} no longer resolves to ${registryId} after the merge`);
  log.push({ id, action: `fold ${fold} → ${keep}`, keys: [keep, fold], registryId, checks, changes });
}

// P1: scraped pairs with one registry id.
for (const p of PROPOSALS.mergeScrapedPairs) {
  merge(p.id, p.keep, p.fold, p.registryId, p.id === "P1b" ? { setPlayerName: "NA Saini" } : {});
}
// P2: Porel spelling variant — evidence is the squad mapping display → cricsheetName.
{
  const p = PROPOSALS.spellingVariant[0];
  const rows = Object.entries(squads).flatMap(([s, t]) => (t["Delhi Capitals"] ?? []).filter((r) => r.name === "Abhishek Porel").map((r) => ({ s, cs: r.cricsheetName })));
  if (!rows.length || rows.some((r) => r.cs !== "Abishek Porel")) fail(p.id, `squad rows ${JSON.stringify(rows)}`);
  if (JSON.stringify(registerIdsFor("Abishek Porel")) !== JSON.stringify([p.registryId])) fail(p.id, "register name 'Abishek Porel' is not unique to ad3b6e95");
  merge(p.id, p.keep, p.fold, p.registryId, { foldMayLackIdentity: true, replaceNonImage: true });
  log[log.length - 1].checks.unshift(`squads ${rows.map((r) => r.s).join(", ")} Delhi Capitals: 'Abhishek Porel' → cricsheetName 'Abishek Porel'`);
}
// P3: collapse identical unverified Tejasvi bios; no identity asserted.
{
  const p = PROPOSALS.unverifiedDuplicates[0];
  const all = [p.keep, ...p.remove];
  const strip = (b: Bio) => JSON.stringify({ ...b });
  for (const k of all) { if (!bios[k]) fail(p.id, `${k} missing`); if (idOf(k) !== null) fail(p.id, `${k} unexpectedly has identity ${idOf(k)}`); }
  for (const k of p.remove) if (strip(bios[k]) !== strip(bios[p.keep])) fail(p.id, `${k} is not identical to ${p.keep}`);
  for (const k of p.remove) delete bios[k];
  log.push({ id: p.id, action: `remove ${p.remove.join(", ")} (identical to ${p.keep})`, keys: all, registryId: null,
    checks: ["all three bios byte-identical", "none has a verified identity", "NOT asserted: Tejasvi Singh Dahiya = T Dahiya (f12fe2a1)"], changes: p.remove.map((k: string) => `removed bio ${k}`) });
}
// P4: squad rows.
for (const p of PROPOSALS.squadFileCorrections) {
  const row = (squads[p.season]?.[p.team] ?? []).find((r) => r.name === p.name);
  if (!row) fail(p.id, "squad row not found");
  if (row!.cricsheetName !== p.current.cricsheetName) fail(p.id, `cricsheetName is ${row!.cricsheetName}, expected ${p.current.cricsheetName}`);
  const [wrongId] = registerIdsFor(p.current.cricsheetName);
  const playedThatSeason = (appearances.get(wrongId) ?? []).some((a) => a.season === p.season);
  // Candidates for the real person: register variants of the display name, plus the written names the squad file
  // gives the same display name in other seasons (e.g. Jitesh Sharma → JM Sharma, 2022–2026). None may have played
  // in this season, otherwise the correct mapping would be that player, not null.
  const otherSeasonNames = [...new Set(Object.values(squads).flatMap((t) => Object.values(t).flat())
    .filter((r) => r.name === p.name && r.cricsheetName && r.cricsheetName !== p.current.cricsheetName).map((r) => String(r.cricsheetName)))];
  const rightIds = [...new Set([...registerIdsFor(p.name), ...otherSeasonNames.flatMap(registerIdsFor)])];
  if (!rightIds.length) fail(p.id, `no register entry for ${p.name} by name or squad mapping`);
  const inSeason = (id: string) => (appearances.get(id) ?? []).some((a) => a.season === p.season || a.season.startsWith(p.season));
  const played = rightIds.filter(inSeason);
  if (played.length) fail(p.id, `${p.name} candidate ${played.join(", ")} DID play in ${p.season}; correct mapping would not be null`);
  const before = { cricsheetName: row!.cricsheetName, played: row!.played };
  row!.cricsheetName = p.proposed.cricsheetName; row!.played = p.proposed.played;
  log.push({ id: p.id, action: `squad ${p.season} ${p.team} '${p.name}'`, keys: [], registryId: null,
    checks: [`'${p.current.cricsheetName}' is ${wrongId}${playedThatSeason ? ` (who played in ${p.season})` : ""}, a different person`, `${p.name} → ${rightIds.join(", ")} (register${otherSeasonNames.length ? " + squad rows " + otherSeasonNames.join("/") : ""}): no ${p.season} IPL appearance`],
    changes: [`${JSON.stringify(before)} → ${JSON.stringify(p.proposed)}`] });
}
// P5: aliases.
for (const [key, a] of Object.entries<{ cricsheetId: string; evidence: string }>(Object.fromEntries(Object.entries(PROPOSALS.aliases).filter(([k]) => !k.startsWith("$"))) as Record<string, { cricsheetId: string; evidence: string }>)) {
  if (!bios[key]) fail("P5", `bio ${key} missing`);
  if (aliasDoc.aliases[key]) fail("P5", `${key} already aliased`);
  if (idOf(key) !== null) fail("P5", `${key} already resolves to ${idOf(key)}`);
  const ids = registerIdsFor(String(bios[key].playerName ?? bios[key].fullName));
  if (JSON.stringify(ids) !== JSON.stringify([a.cricsheetId])) fail("P5", `${key}: register lookup of its name gives ${JSON.stringify(ids)}`);
  if (!(appearances.get(a.cricsheetId) ?? []).length) fail("P5", `${a.cricsheetId} has no IPL appearance`);
  aliasDoc.aliases[key] = { cricsheetId: a.cricsheetId, evidence: a.evidence, reviewed: "2026-10-14" };
  log.push({ id: "P5", action: `alias ${key} → ${a.cricsheetId}`, keys: [key], registryId: a.cricsheetId,
    checks: [`register name/variant '${bios[key].playerName ?? bios[key].fullName}' belongs only to ${a.cricsheetId}`, `${(appearances.get(a.cricsheetId) ?? []).length} IPL appearances`], changes: ["alias added (reviewed 2026-10-14)"] });
}
// Post-check with the new aliases: every P5 key now resolves.
const newAliases = Object.fromEntries(Object.entries(aliasDoc.aliases).map(([k, v]) => [k, v as { cricsheetId: string; evidence: string }]));
for (const e of log.filter((l) => l.id === "P5")) if (identifyBio(e.keys[0], bios[e.keys[0]], history, newAliases).id !== e.registryId) fail("P5", `${e.keys[0]} does not resolve after adding the alias`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const md = [`# Identity corrections — ${apply ? "APPLIED" : "dry run"} (2026-10-14)`, "", `Bios: ${Object.keys(JSON.parse(fs.readFileSync(BIO_FILES[0], "utf8"))).length} → ${Object.keys(bios).length}`, "",
  ...log.flatMap((l) => [`## ${l.id}: ${l.action}`, "", `Registry id: ${l.registryId ?? "— (none asserted)"}`, "", "Checks:", ...l.checks.map((c) => `- ${c}`), "", "Changes:", ...l.changes.map((c) => `- ${c}`), ""])].join("\n");
fs.writeFileSync(path.join(OUT_DIR, `identity-${apply ? "applied" : "dry-run"}.md`), md);
fs.writeFileSync(path.join(OUT_DIR, `identity-${apply ? "applied" : "dry-run"}.json`), JSON.stringify(log, null, 2));
console.log(`${log.length} corrections verified; bios ${Object.keys(JSON.parse(fs.readFileSync(BIO_FILES[0], "utf8"))).length} → ${Object.keys(bios).length}`);
if (apply) {
  for (const f of BIO_FILES) fs.writeFileSync(f, JSON.stringify(bios, null, 2) + "\n");
  for (const f of SQUAD_FILES) fs.writeFileSync(f, JSON.stringify(squads, null, 2) + "\n");
  fs.writeFileSync(ALIAS_FILE, JSON.stringify(aliasDoc, null, 2) + "\n");
  console.log("written:", [...BIO_FILES, ...SQUAD_FILES, ALIAS_FILE].map((f) => path.relative(REPO, f)).join(", "));
}
