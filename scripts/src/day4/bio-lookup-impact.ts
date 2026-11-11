// Day 4.6 — impact of replacing stats-aggregator's name-based getPlayerBio() with the registry lookup.
//
//   tsx src/day4/bio-lookup-impact.ts [--data <public/data dir>] [--json out.json]
//
// For every written name in the IPL files: the bio the OLD lookup returns (exact playerName, else first bio with the
// same first initial and surname — replicated from stats-aggregator.ts) and the bio the NEW lookup returns
// (services/player-bio-lookup.ts), each checked against the registry id the name denotes, and the three attributes
// the aggregator derives from the bio: batting hand, bowler type, country.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, IPL_RAW_DIR, parseArgs } from "../global/paths";

type Bio = Record<string, any>;
const { values } = parseArgs(process.argv.slice(2));
const DATA = values.get("data") ?? path.join(REPO, "artifacts", "ipl-analytics", "public", "data");
const { buildBioLookup, lookupBioKey } = await import(pathToFileURL(path.join(REPO, "artifacts", "api-server", "src", "services", "player-bio-lookup.ts")).href);

const bios = JSON.parse(fs.readFileSync(path.join(DATA, "player-bio.json"), "utf8")) as Record<string, Bio>;
const index = JSON.parse(fs.readFileSync(path.join(DATA, "player-recent-matches", "index.json"), "utf8"));
const registries: Record<string, string>[] = [];
const names = new Set<string>();
for (const f of fs.readdirSync(IPL_RAW_DIR).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(fs.readFileSync(path.join(IPL_RAW_DIR, f), "utf8"));
  registries.push(m.info.registry.people);
  for (const ns of Object.values<string[]>(m.info.players)) for (const n of ns) names.add(n);
}
const idx = buildBioLookup(bios, index.keys, registries, JSON.parse(fs.readFileSync(path.join(DATA, "squads-by-season.json"), "utf8")));

// OLD (stats-aggregator.ts before Day 4.6)
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const bioEntries = Object.entries(bios);
function oldLookup(name: string): string | undefined {
  const sc = norm(name); const parts = sc.split(" ").filter(Boolean); const fi = parts[0]?.charAt(0); const ln = parts[parts.length - 1];
  const hit = bioEntries.find(([, b]) => {
    const bn = norm(b.playerName || b.fullName || "");
    if (bn === sc) return true;
    const bp = bn.split(" ").filter(Boolean);
    return bp.length > 0 && !!fi && bp[0].charAt(0) === fi && bp[bp.length - 1] === ln;
  });
  return hit?.[0];
}
const hand = (b?: Bio) => { const s = String(b?.batStyle ?? "").toLowerCase(); return s.includes("left") ? "LHB" : s.includes("right") ? "RHB" : "Unknown"; };
const btype = (b?: Bio) => { if (!b) return "(fallback)"; const s = String(b.bowlStyle ?? "").toLowerCase();
  return s.includes("spin") || s.includes("legbreak") || s.includes("offbreak") || s.includes("orthodox") || s.includes("chinaman") || s.includes("slow left") ? "Spinner" : "Pacer"; };
const country = (b?: Bio) => String(b?.country ?? "") || "(none)";
const idOfKey = (k?: string) => (k ? index.keys[k]?.[0] ?? null : null);

const rows: Record<string, unknown>[] = [];
const summary: Record<string, number> = {};
const bump = (k: string) => (summary[k] = (summary[k] ?? 0) + 1);
for (const n of [...names].sort()) {
  const ids = [...(idx.nameToIds.get(n) ?? [])];
  const o = oldLookup(n), nw = lookupBioKey(n, idx);
  const oId = idOfKey(o), nId = idOfKey(nw.key);
  const oldRight = ids.length === 1 && oId === ids[0];
  const oldWrong = !!o && ids.length === 1 && oId !== null && oId !== ids[0];
  const ob = o ? bios[o] : undefined, nb = nw.key ? bios[nw.key] : undefined;
  const attr = { hand: [hand(ob), hand(nb)], bowlerType: [btype(ob), btype(nb)], country: [country(ob), country(nb)] };
  const attrChanged = Object.entries(attr).filter(([, [a, b]]) => a !== b).map(([k]) => k);
  const cls = o === nw.key ? "same bio" : oldWrong ? "old returned ANOTHER player's bio" : !o ? "old found none, new found the player" : !nw.key ? `new: unknown (${nw.method})` : oldRight ? "both correct, different bio key" : "old bio unverified";
  bump(cls);
  if (o !== nw.key) rows.push({ name: n, ids, old: o ?? null, oldId: oId, new: nw.key ?? null, newId: nId, method: nw.method, cls, attrChanged, attr });
}
const changedAttr = rows.filter((r) => (r.attrChanged as string[]).length);
console.log(JSON.stringify({ names: names.size, summary, rowsDiffering: rows.length, attributeChanges: changedAttr.length }, null, 1));
for (const r of changedAttr) console.log(JSON.stringify(r));
const out = values.get("json");
if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 1));
