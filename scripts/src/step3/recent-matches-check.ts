// Step 3 review harness — the per-player split of player-recent-matches.json returns exactly what the
// player page showed before, for every player.
//
//   tsx src/step3/recent-matches-check.ts --data <dir with player-recent-matches.json, player-bio.json and the split>
//     --resolver <path to src/lib/player-recent-matches.ts> --out report.md
//
// "Before" is the page's previous inline resolution, copied verbatim below (legacyResolve), run on the
// full map. "After" is resolveRecentMatchesKey on the index, then that key's shard file.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "../global/paths";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const { values } = parseArgs(process.argv.slice(2));
const dataDir = values.get("data")!;
const out = values.get("out") ?? "recent-matches-check.md";
const { resolveRecentMatchesKey } = await import(pathToFileURL(values.get("resolver")!).href);

const map: Record<string, Any[]> = JSON.parse(fs.readFileSync(path.join(dataDir, "player-recent-matches.json"), "utf8"));
const bios: Record<string, { playerName?: string; fullName?: string }> = JSON.parse(fs.readFileSync(path.join(dataDir, "player-bio.json"), "utf8"));
const splitDir = path.join(dataDir, "player-recent-matches");
const index: { keys: Record<string, [string, number]> } = JSON.parse(fs.readFileSync(path.join(splitDir, "index.json"), "utf8"));

/** The player page's resolution before the change (pages/player.tsx), verbatim apart from taking `map` as an argument. */
function legacyResolve(map: Record<string, Any[]>, slug: string, bio: Any): Any[] {
  const mapKeys = Object.keys(map);
  const s = slug?.toLowerCase()?.trim() || "";
  const nameSlug = bio?.playerName?.toLowerCase()?.replace(/[^a-z0-9]+/g, "-") || "";
  const fullSlug = bio?.fullName?.toLowerCase()?.replace(/[^a-z0-9]+/g, "-") || "";
  if (map[s] && map[s].length > 0) return map[s];
  if (map[nameSlug] && map[nameSlug].length > 0) return map[nameSlug];
  if (map[fullSlug] && map[fullSlug].length > 0) return map[fullSlug];
  const parts = s.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const initial = parts[0][0];
    const surname = parts[parts.length - 1];
    const candidate1 = `${initial}-${surname}`;
    if (map[candidate1] && map[candidate1].length > 0) return map[candidate1];
    const candidate2 = mapKeys.find((k) => {
      const kp = k.split("-");
      return kp.length >= 2 && kp[kp.length - 1] === surname && kp[0].startsWith(initial);
    });
    if (candidate2 && map[candidate2] && map[candidate2].length > 0) return map[candidate2];
  }
  if (parts.length > 0) {
    const surname = parts[parts.length - 1];
    if (surname.length >= 4) {
      const candidate3 = mapKeys.find((k) => k.endsWith(`-${surname}`) || k === surname);
      if (candidate3 && map[candidate3] && map[candidate3].length > 0) return map[candidate3];
    }
  }
  const cleanS = s.replace(/[^a-z0-9]/g, "");
  const cleanN = nameSlug.replace(/[^a-z0-9]/g, "");
  const matchedKey = mapKeys.find((k) => {
    const cleanK = k.replace(/[^a-z0-9]/g, "");
    return cleanK === cleanS || cleanK === cleanN || (cleanS.length > 4 && cleanK.includes(cleanS)) || (cleanK.length > 4 && cleanS.includes(cleanK));
  });
  return matchedKey ? map[matchedKey] : [];
}

const shardCache = new Map<string, Any[]>();
const shard = (id: string) => {
  if (!shardCache.has(id)) shardCache.set(id, JSON.parse(fs.readFileSync(path.join(splitDir, `${id}.json`), "utf8")));
  return shardCache.get(id)!;
};
const lengths = Object.fromEntries(Object.entries(index.keys).map(([k, v]) => [k, v[1]]));
const newResolve = (slug: string, bio: Any): Any[] => {
  const key = resolveRecentMatchesKey(lengths, slug, bio);
  return key ? shard(index.keys[key][0]) : [];
};

const checks: { name: string; pass: boolean; detail: string }[] = [];
// 1. Index and shards reproduce the full map exactly, in the same key order.
const sameOrder = JSON.stringify(Object.keys(map)) === JSON.stringify(Object.keys(index.keys));
checks.push({ name: "index has every key, in the full file's order", pass: sameOrder, detail: `${Object.keys(index.keys).length} of ${Object.keys(map).length} keys` });
let shardMismatch = 0;
for (const [k, v] of Object.entries(map)) if (JSON.stringify(shard(index.keys[k][0])) !== JSON.stringify(v) || index.keys[k][1] !== v.length) shardMismatch++;
checks.push({ name: "every key's shard equals its array in the full file", pass: shardMismatch === 0, detail: `${shardMismatch} mismatches` });

// 2. Same player-page result for every bio slug, every bio name slug and every map key used as a slug.
const cases: { slug: string; bio: Any }[] = [];
for (const [slug, bio] of Object.entries(bios)) {
  cases.push({ slug, bio });
  if (bio.playerName) cases.push({ slug: bio.playerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), bio });
}
for (const k of Object.keys(map)) cases.push({ slug: k, bio: null });
cases.push({ slug: "no-such-player", bio: null }, { slug: "", bio: null });
let diff = 0;
const diffs: string[] = [];
const t0 = performance.now();
for (const c of cases) {
  const a = legacyResolve(map, c.slug, c.bio), b = newResolve(c.slug, c.bio);
  if (JSON.stringify(a) !== JSON.stringify(b)) { diff++; if (diffs.length < 10) diffs.push(c.slug); }
}
checks.push({ name: "player page result identical (legacy full-map lookup vs index + shard)", pass: diff === 0, detail: `${cases.length} slugs checked, ${diff} differ${diffs.length ? `: ${diffs.join(", ")}` : ""}` });

// 3. Download sizes.
const fullBytes = fs.statSync(path.join(dataDir, "player-recent-matches.json")).size;
const indexBytes = fs.statSync(path.join(splitDir, "index.json")).size;
const shardSizes = [...new Set(Object.values(index.keys).map((v) => v[0]))].map((id) => fs.statSync(path.join(splitDir, `${id}.json`)).size).sort((a, b) => a - b);
const pick = (p: number) => shardSizes[Math.min(shardSizes.length - 1, Math.floor(p * shardSizes.length))];
const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const totalShards = shardSizes.reduce((s, x) => s + x, 0);
const examples = ["virat-kohli", "jasprit-bumrah", "ms-dhoni", "rashid-khan"].map((s) => {
  const bio = bios[s] ?? null;
  const key = resolveRecentMatchesKey(lengths, s, bio);
  return { slug: s, key, matches: key ? index.keys[key][1] : 0, bytes: key ? fs.statSync(path.join(splitDir, `${index.keys[key][0]}.json`)).size : 0 };
});

const pass = checks.every((c) => c.pass);
const L = [
  "# Step 3 player-page download — regression results", "",
  `**Verdict: ${pass ? "PASS" : "FAIL"}** (${checks.filter((c) => c.pass).length}/${checks.length}). Parity check over ${cases.length} slugs took ${(performance.now() - t0).toFixed(0)} ms.`, "",
  "| Check | Result | Detail |", "|---|---|---|", ...checks.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`), "",
  "## Download per player page", "",
  "| | Size |", "|---|---:|",
  `| Before: full file, fetched on every player page | ${kb(fullBytes)} |`,
  `| After: index (fetched once, cached) | ${kb(indexBytes)} |`,
  `| After: one player's shard — median / 90th pct / largest | ${kb(pick(0.5))} / ${kb(pick(0.9))} / ${kb(shardSizes[shardSizes.length - 1])} |`,
  `| After: all ${shardSizes.length} shards on disk (alias keys share one) | ${kb(totalShards)} |`, "",
  "| Player slug | Key resolved | Matches | Shard size |", "|---|---|---:|---:|",
  ...examples.map((e) => `| ${e.slug} | ${e.key ?? "—"} | ${e.matches} | ${kb(e.bytes)} |`), "",
];
fs.writeFileSync(out, L.join("\n") + "\n");
console.log(`${pass ? "PASS" : "FAIL"}: ${checks.map((c) => `${c.name}: ${c.detail}`).join(" | ")}`);
process.exit(pass ? 0 : 1);
