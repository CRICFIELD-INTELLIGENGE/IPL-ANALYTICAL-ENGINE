// Player bio lookup by Cricsheet registry identity (Day 4.6).
//
// The stats aggregator only knows a scorecard's written name ("PWH de Silva", "N Saini"). It used to pick the
// first bio whose playerName matched exactly OR whose first initial and surname matched, so the answer depended
// on file order and could be another player (two Sainis, two Bishnois). This resolves:
//
//   written name → registry id(s) (from the raw IPL files' registry blocks)
//     exactly one id → the bio verified for that id in the identity index
//       (artifacts/ipl-analytics/public/data/player-recent-matches/index.json, built by
//        scripts/generate-player-recent-matches.mjs with the shared rules in scripts/lib/player-identity.mjs)
//     exactly one id but no verified bio → a bio whose own display name a squad row of the bio's own franchise maps
//       to this written name (e.g. 2026 Punjab Kings "Cooper Connolly" → "C Connolly"), if exactly one such bio
//       (used for stats attributes only; the page's verified identity is unchanged)
//     several ids (a written name shared by different people) → unknown
//   a name that is not an IPL written name → a bio whose playerName or fullName equals it exactly, if unique
//
// Unknown is returned as undefined: callers then use their existing fallbacks; nothing is guessed.

export type Bio = Record<string, unknown> & { playerName?: string; fullName?: string; playerId?: unknown };

export interface BioLookup {
  /** written name → registry ids it denotes in the IPL files */
  nameToIds: Map<string, Set<string>>;
  /** registry id → bio key (one per id; a scraped bio, i.e. one with playerId, wins if several are verified) */
  idToKey: Map<string, string>;
  /** written name → bio keys whose display name a squad row of the bio's franchise maps to it (unverified bios only) */
  squadKeys: Map<string, Set<string>>;
  /** normalized playerName / fullName → bio keys, for names that are not IPL written names */
  exact: Map<string, string[]>;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const normalizeName = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function buildBioLookup(
  bios: Record<string, Bio>,
  identityKeys: Record<string, [string, number]>,
  registries: Iterable<Record<string, string>>,
  squads: Record<string, Record<string, { name?: string; cricsheetName?: string | null }[]>> = {},
): BioLookup {
  const nameToIds = new Map<string, Set<string>>();
  for (const people of registries) {
    for (const [name, id] of Object.entries(people)) {
      if (!id) continue;
      (nameToIds.get(name) ?? nameToIds.set(name, new Set()).get(name)!).add(id);
    }
  }
  const idToKey = new Map<string, string>();
  for (const [key, [id]] of Object.entries(identityKeys)) {
    if (!bios[key]) continue;
    const cur = idToKey.get(id);
    if (!cur || (bios[cur].playerId === undefined && bios[key].playerId !== undefined)) idToKey.set(id, key);
  }
  const verified = new Set(Object.keys(identityKeys));
  const squadKeys = new Map<string, Set<string>>();
  for (const teams of Object.values(squads)) for (const [team, players] of Object.entries(teams)) for (const p of players ?? []) {
    if (!p.name || !p.cricsheetName) continue;
    const key = slug(p.name);
    const b = bios[key];
    if (!b || verified.has(key) || (b.team !== team && b.currentTeam !== team)) continue;
    (squadKeys.get(p.cricsheetName) ?? squadKeys.set(p.cricsheetName, new Set()).get(p.cricsheetName)!).add(key);
  }
  const exact = new Map<string, string[]>();
  for (const [key, b] of Object.entries(bios)) {
    for (const n of new Set([normalizeName(b.playerName), normalizeName(b.fullName)])) {
      if (n) (exact.get(n) ?? exact.set(n, []).get(n)!).push(key);
    }
  }
  return { nameToIds, idToKey, squadKeys, exact };
}

export function lookupBioKey(name: string, idx: BioLookup): { key: string | undefined; method: string } {
  const ids = idx.nameToIds.get(name);
  if (ids && ids.size === 1) {
    const key = idx.idToKey.get([...ids][0]);
    if (key) return { key, method: "registry" };
    const viaSquad = [...(idx.squadKeys.get(name) ?? [])];
    return viaSquad.length === 1 ? { key: viaSquad[0], method: "squad mapping (unverified bio)" } : { key: undefined, method: "registry id without a verified bio" };
  }
  if (ids && ids.size > 1) return { key: undefined, method: "written name shared by several players" };
  const keys = idx.exact.get(normalizeName(name)) ?? [];
  return keys.length === 1 ? { key: keys[0], method: "exact name" } : { key: undefined, method: keys.length ? "exact name shared by several bios" : "no bio" };
}
