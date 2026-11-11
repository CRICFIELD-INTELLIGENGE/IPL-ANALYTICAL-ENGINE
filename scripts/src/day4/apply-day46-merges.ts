// Day 4.6 — approved duplicate-bio merges (DAY-04.6 instruction), each re-validated before writing.
//
//   tsx src/day4/apply-day46-merges.ts [--only jayant-yadav,...] [--apply]
//
// Per merge (keep ← fold), all must hold or the run aborts without writing:
//   - keep is verified to the registry id by the shared identity rules (identifyBio) and has IPL appearances;
//   - fold has no verified identity of its own, or is verified to the SAME id;
//   - the fold's display name is a Cricsheet register name/variant of exactly that id (global.db, read-only);
//   - no conflicting evidence: fold's country/role/team may differ (they are listed), but its name must not belong to
//     another registered player, and keep's bowling style must not be contradicted by fold.
// Merge: keep's existing values are never overwritten; empty keep fields are filled from fold; differences listed.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { REPO, IPL_RAW_DIR, parseArgs } from "../global/paths";
import { createRegistryHistory, recordAppearance, identifyBio, loadVerifiedAliases } from "../../lib/player-identity.mjs";

type Bio = Record<string, unknown>;
const MERGES: { keep: string; fold: string; id: string }[] = [
  { keep: "j-yadav", fold: "jayant-yadav", id: "81049310" },
  { keep: "ka-maharaj", fold: "keshav-maharaj", id: "0b60eb09" },
  { keep: "rj-gleeson", fold: "richard-gleeson", id: "402f8494" },
  { keep: "wanindu-hasaranga", fold: "pwh-de-silva", id: "a97c8ec2" },
];
const { values, flags } = parseArgs(process.argv.slice(2));
const only = values.get("only")?.split(",");
const apply = flags.has("apply");
const BIO_FILES = [path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json"), path.join(REPO, "artifacts", "api-server", "data", "player-bio.json")];
const OUT = path.join(REPO, "docs", "data-repairs", "2026-10-14-day46");
if (fs.readFileSync(BIO_FILES[0], "utf8") !== fs.readFileSync(BIO_FILES[1], "utf8")) throw new Error("bio copies differ");
const bios = JSON.parse(fs.readFileSync(BIO_FILES[0], "utf8")) as Record<string, Bio>;
const aliases = loadVerifiedAliases(path.join(REPO, "scripts", "data", "player-identity-aliases.json"));
const history = createRegistryHistory();
const apps = new Map<string, Set<string>>();
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
    const id = m.info.registry.people[n]; if (!id) continue;
    recordAppearance(history, id, n, team, m.info.season);
    (apps.get(id) ?? apps.set(id, new Set()).get(id)!).add(f);
  }
}
const g = new DatabaseSync(path.join(REPO, "lib", "cricket-data", "global", "warehouse", "global.db"), { readOnly: true });
const registerIds = (name: string) => (g.prepare(`SELECT DISTINCT p.cricsheet_id id FROM player_names n JOIN players p ON p.player_key = n.player_key
  WHERE n.name = ? AND n.origin IN ('register', 'register_variant', 'match')`).all(name) as { id: string }[]).map((r) => r.id);
const spin = (b: Bio) => { const s = String(b.bowlStyle ?? "").toLowerCase(); return !s ? null : /spin|legbreak|offbreak|orthodox|chinaman|slow left/.test(s) ? "Spinner" : "Pacer"; };

const log: Record<string, unknown>[] = [];
for (const m of MERGES.filter((x) => !only || only.includes(x.fold))) {
  const fail = (msg: string): never => { throw new Error(`${m.fold} → ${m.keep}: ${msg} — NOT merged`); };
  const k = bios[m.keep], f = bios[m.fold];
  if (!k || !f) fail("bio missing");
  const keepId = identifyBio(m.keep, k, history, aliases).id;
  if (keepId !== m.id) fail(`keep resolves to ${keepId}, expected ${m.id}`);
  const foldId = identifyBio(m.fold, f, history, aliases).id;
  if (foldId !== null && foldId !== m.id) fail(`fold is verified to a DIFFERENT id ${foldId}`);
  const foldName = String(f.fullName ?? f.playerName);
  const foldNameIds = [...new Set([...registerIds(String(f.playerName)), ...registerIds(foldName)])];
  if (foldId === null && JSON.stringify(foldNameIds) !== JSON.stringify([m.id])) fail(`fold name '${foldName}' → register ${JSON.stringify(foldNameIds)}`);
  if (spin(f) && spin(k) && spin(f) !== spin(k)) fail(`bowling style conflict: keep ${k.bowlStyle} vs fold ${f.bowlStyle}`);
  const checks = [`registry id ${m.id}: ${apps.get(m.id)?.size ?? 0} IPL matches`, `${m.keep} → ${m.id} (${keepId ? "verified" : ""})`,
    foldId ? `${m.fold} → ${foldId} (verified, same id)` : `${m.fold}: no verified identity; '${foldName}' is a register name/variant of ${m.id} only`,
    `bowling: keep ${k.bowlStyle || "—"} / fold ${f.bowlStyle || "—"} (${spin(k) ?? "unknown"})`];
  const filled: string[] = [], differing: string[] = [];
  for (const [field, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === "") continue;
    const cur = k[field];
    if (cur === undefined || cur === null || cur === "") { k[field] = v; filled.push(`${field} = ${JSON.stringify(v)}`); }
    else if (JSON.stringify(cur) !== JSON.stringify(v)) differing.push(`${field}: kept ${JSON.stringify(cur).slice(0, 70)} (fold ${JSON.stringify(v).slice(0, 70)})`);
  }
  delete bios[m.fold];
  if (identifyBio(m.keep, k, history, aliases).id !== m.id) fail("keep identity changed by the merge");
  log.push({ keep: m.keep, fold: m.fold, registryId: m.id, checks, filled, differing });
}
fs.mkdirSync(OUT, { recursive: true });
const tag = apply ? "applied" : "dry-run";
const name = only ? `merges-${tag}-${only.join("_")}` : `merges-${tag}`;
fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(log, null, 2));
fs.writeFileSync(path.join(OUT, `${name}.md`), [`# Day 4.6 merges — ${tag}`, "", ...log.flatMap((l: any) => [`## ${l.fold} → ${l.keep} (${l.registryId})`, "", ...l.checks.map((c: string) => `- ${c}`),
  `- filled: ${l.filled.join("; ") || "nothing"}`, `- differing (kept): ${l.differing.join("; ") || "none"}`, ""])].join("\n"));
console.log(`${log.length} merges verified${apply ? " and written" : " (dry run)"}; bios → ${Object.keys(bios).length}`);
for (const l of log as any[]) console.log(`  ${l.fold} → ${l.keep}: filled [${l.filled.join("; ")}]`);
if (apply) for (const f of BIO_FILES) fs.writeFileSync(f, JSON.stringify(bios, null, 2) + "\n");
