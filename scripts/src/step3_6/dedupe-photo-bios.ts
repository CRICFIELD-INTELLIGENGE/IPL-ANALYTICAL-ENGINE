// Day 3 — fold duplicate player bios created by the 2026 photo mapping back into their canonical bios.
//
//   tsx src/step3_6/dedupe-photo-bios.ts                  # dry run: report only, writes nothing
//   tsx src/step3_6/dedupe-photo-bios.ts --apply          # rewrite the bio files listed below
//   tsx src/step3_6/dedupe-photo-bios.ts --report out.md  # where to write the report
//
// Background: scratch/run_photo_mapping.py (run 2026-10-12) did `bios.setdefault(<display-name slug>, {})`,
// adding bios such as `virat-kohli` next to the existing, registry-verified `v-kohli`. The duplicate has no
// verifiable identity (its name "Virat Kohli" is not a name written in the IPL files), so /players/virat-kohli
// opened an empty, thin page instead of Kohli's.
//
// A bio is folded into another only when BOTH hold:
//   1. Registry identity: the duplicate's display-name slug resolves, through squads-by-season.json's
//      cricsheetName and the raw Cricsheet files (identifySquadEntry, franchise/season-narrowed), to exactly
//      one registry id, and exactly one ORIGINAL bio (one with an ESPN `playerId`) is verified to that id by the
//      shared exact rules (identifyBio).
//   2. Corroboration: the duplicate's surname is a word of the canonical bio's full name or written name.
// Merge policy: canonical fields are never overwritten; fields the canonical bio lacks are filled from the
// duplicate. Differing values (e.g. a new 2026 photo or team) are listed in the report for human review.
// Bios that fail either test are left untouched and listed.

import fs from "node:fs";
import path from "node:path";
import { REPO, IPL_RAW_DIR, parseArgs } from "../global/paths";
import { createRegistryHistory, recordAppearance, identifyBio, identifySquadEntry, loadVerifiedAliases, pageSlug, canonFranchise, type VerifiedAlias } from "../../lib/player-identity.mjs";

type Bio = Record<string, unknown> & { playerName?: string; fullName?: string; playerId?: unknown; team?: string; currentTeam?: string };

const { values, flags } = parseArgs(process.argv.slice(2));
const apply = flags.has("apply");
const BIO_FILES = [
  path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "player-bio.json"),
  path.join(REPO, "artifacts", "api-server", "data", "player-bio.json"),
];
const SQUADS = path.join(REPO, "artifacts", "ipl-analytics", "public", "data", "squads-by-season.json");
const ALIASES = path.join(REPO, "scripts", "data", "player-identity-aliases.json");

export interface Decision {
  duplicate: string;
  canonical: string | null;
  registryId: string | null;
  action: "fold" | "keep";
  reason: string;
  filled: string[];
  differing: { field: string; canonical: unknown; duplicate: unknown }[];
}

const words = (s: unknown) => String(s ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);

/**
 * Second, independent check that a display name ("Jasprit Bumrah") and a canonical bio ("JJ Bumrah" /
 * "Jasprit Jasbirsingh Bumrah") describe the same person. Both must hold:
 *   - surname: the display name's last word is a word of the canonical names;
 *   - first name: the display name's first word is a word of the canonical names, OR the canonical written
 *     name starts with initials (e.g. "JJ") whose first letter is the display name's first initial.
 * This rejects squad-file errors such as "Jayant Yadav" → UT Yadav (Umeshkumar Tilak Yadav).
 */
export function namesCorroborate(displayName: string, canonical: { playerName?: unknown; fullName?: unknown }): boolean {
  const d = words(displayName);
  if (d.length < 2) return false;
  const canonWords = new Set([...words(canonical.fullName), ...words(canonical.playerName)]);
  const first = d[0], surname = d[d.length - 1];
  if (!canonWords.has(surname)) return false;
  if (canonWords.has(first)) return true;
  const initials = String(canonical.playerName ?? "").trim().split(/\s+/)[0] ?? "";
  return /^[A-Z]{1,4}$/.test(initials) && initials[0].toLowerCase() === first[0];
}

export function planDedupe(bios: Record<string, Bio>, squads: Record<string, Record<string, { name?: string; cricsheetName?: string }[]>>,
  history: ReturnType<typeof createRegistryHistory>, aliases: Record<string, VerifiedAlias>): Decision[] {
  // Original bios (scraped profiles carry an ESPN playerId) with a verified identity, by registry id.
  const originalsById = new Map<string, string[]>();
  for (const [k, b] of Object.entries(bios)) {
    if (b.playerId === undefined) continue;
    const id = identifyBio(k, b, history, aliases).id;
    if (id) (originalsById.get(id) ?? originalsById.set(id, []).get(id)!).push(k);
  }
  // Squad display-name slug → registry ids, and the (season, franchise, id) entries behind them.
  const squadIds = new Map<string, Set<string>>();
  const squadEntries = new Map<string, { season: number; team: string; id: string }[]>();
  for (const [season, teams] of Object.entries(squads)) for (const [team, ps] of Object.entries(teams)) for (const p of ps ?? []) {
    if (!p.name || !p.cricsheetName) continue;
    const id = identifySquadEntry({ name: p.name, cricsheetName: p.cricsheetName }, season, team, history);
    if (!id) continue;
    const s = pageSlug(p.name);
    (squadIds.get(s) ?? squadIds.set(s, new Set()).get(s)!).add(id);
    (squadEntries.get(s) ?? squadEntries.set(s, []).get(s)!).push({ season: Number(season), team: canonFranchise(team), id });
  }
  // When a display name maps to several ids across seasons (the squad file has wrong rows, e.g. "Shreyas Iyer"
  // → VR Iyer in 2023), use only the bio's own franchise in its latest squad season.
  const latestForTeam = (slug: string, team: string): string | null => {
    const rows = (squadEntries.get(slug) ?? []).filter((r) => r.team === canonFranchise(team));
    if (!rows.length) return null;
    const latest = Math.max(...rows.map((r) => r.season));
    const ids = new Set(rows.filter((r) => r.season === latest).map((r) => r.id));
    return ids.size === 1 ? [...ids][0] : null;
  };

  const out: Decision[] = [];
  for (const [key, b] of Object.entries(bios)) {
    if (b.playerId !== undefined) continue; // only bios added without a scraped profile
    const own = identifyBio(key, b, history, aliases);
    let ids = own.id ? [own.id] : [...(squadIds.get(key) ?? [])];
    let route = own.id ? own.method : "squad display name → cricsheetName → registry id";
    if (ids.length > 1) {
      const narrowed = latestForTeam(key, String(b.currentTeam ?? b.team ?? ""));
      if (narrowed) { ids = [narrowed]; route = "bio franchise's latest squad entry → cricsheetName → registry id"; }
    }
    const keep = (reason: string, registryId: string | null = null): Decision =>
      ({ duplicate: key, canonical: null, registryId, action: "keep", reason, filled: [], differing: [] });
    if (ids.length !== 1) { out.push(keep(ids.length ? "squad display name names several registry ids" : "no registry identity")); continue; }
    const id = ids[0];
    const canon = (originalsById.get(id) ?? []).filter((k) => k !== key);
    if (canon.length === 0) { out.push(keep("no existing bio has this registry id (a new player)", id)); continue; }
    if (canon.length > 1) { out.push(keep(`several existing bios share this registry id: ${canon.join(", ")}`, id)); continue; }
    const c = bios[canon[0]];
    if (!namesCorroborate(String(b.playerName ?? b.fullName ?? ""), c)) {
      out.push(keep(`names disagree with ${canon[0]} (${c.playerName} / ${c.fullName}) — needs review`, id));
      continue;
    }
    const filled: string[] = [], differing: Decision["differing"] = [];
    for (const [f, v] of Object.entries(b)) {
      if (v === undefined || v === null || v === "") continue;
      const cv = c[f];
      if (cv === undefined || cv === null || cv === "") filled.push(f);
      else if (JSON.stringify(cv) !== JSON.stringify(v)) differing.push({ field: f, canonical: cv, duplicate: v });
    }
    out.push({ duplicate: key, canonical: canon[0], registryId: id, action: "fold", reason: route, filled, differing });
  }
  return out;
}

export function applyDedupe(bios: Record<string, Bio>, decisions: Decision[]): Record<string, Bio> {
  const next: Record<string, Bio> = JSON.parse(JSON.stringify(bios));
  for (const d of decisions) {
    if (d.action !== "fold" || !d.canonical) continue;
    for (const f of d.filled) next[d.canonical][f] = bios[d.duplicate][f];
    delete next[d.duplicate];
  }
  return next;
}

// ── CLI ──
if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("step3_6", "dedupe-photo-bios.ts"))) {
  const history = createRegistryHistory();
  for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
    const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
    for (const [team, names] of Object.entries<string[]>(m.info.players)) for (const n of names) {
      const id = m.info.registry.people[n];
      if (id) recordAppearance(history, id, n, team, m.info.season);
    }
  }
  const bios = JSON.parse(fs.readFileSync(BIO_FILES[0], "utf8")) as Record<string, Bio>;
  for (const f of BIO_FILES.slice(1)) {
    if (fs.existsSync(f) && fs.readFileSync(f, "utf8") !== fs.readFileSync(BIO_FILES[0], "utf8")) {
      throw new Error(`${f} differs from ${BIO_FILES[0]}; reconcile them before deduplicating`);
    }
  }
  const decisions = planDedupe(bios, JSON.parse(fs.readFileSync(SQUADS, "utf8")), history, loadVerifiedAliases(ALIASES));
  const fold = decisions.filter((d) => d.action === "fold");
  const keep = decisions.filter((d) => d.action === "keep");
  const md = [
    `# Duplicate bio repair — ${apply ? "APPLIED" : "dry run"} (${new Date().toISOString().slice(0, 10)})`, "",
    `Bios without a scraped profile examined: ${decisions.length}. Folded into a canonical bio: **${fold.length}**. Kept: ${keep.length}.`, "",
    "## Folded (duplicate → canonical, registry id)", "",
    "| Duplicate | Canonical | Registry id | Identity route | Filled into canonical | Differing values kept from canonical |", "|---|---|---|---|---|---|",
    ...fold.map((d) => `| ${d.duplicate} | ${d.canonical} | ${d.registryId} | ${d.reason} | ${d.filled.join(", ") || "—"} | ${d.differing.map((x) => `${x.field}: \`${String(x.canonical).slice(0, 60)}\` (dup \`${String(x.duplicate).slice(0, 60)}\`)`).join("; ") || "—"} |`), "",
    "## Kept (not folded)", "", "| Bio | Registry id | Reason |", "|---|---|---|",
    ...keep.map((d) => `| ${d.duplicate} | ${d.registryId ?? "—"} | ${d.reason} |`), "",
  ].join("\n");
  const reportPath = values.get("report") ?? path.join(REPO, "docs", "data-repairs", "2026-10-14-day3", `dedupe-${apply ? "applied" : "dry-run"}.md`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, md);
  console.log(`fold ${fold.length} | keep ${keep.length} | report ${path.relative(REPO, reportPath)}`);
  if (apply) {
    const next = applyDedupe(bios, decisions);
    for (const f of BIO_FILES) if (fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(next, null, 2) + "\n");
    console.log(`wrote ${Object.keys(next).length} bios (was ${Object.keys(bios).length}) to ${BIO_FILES.map((f) => path.relative(REPO, f)).join(", ")}`);
  }
}
