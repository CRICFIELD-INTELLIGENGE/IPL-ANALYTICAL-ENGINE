// Player identity for the player page's recent matches — keyed by Cricsheet registry id, never by guesswork.
//
// Used by scripts/generate-player-recent-matches.mjs (to build the per-player index) and by
// scripts/src/step3/identity-audit.ts (to verify every page), so both apply the same rules.
//
// Ground truth: each raw IPL Cricsheet file lists both XIs by written name and maps every written name to a
// registry id. A player's recent-matches log is therefore built per registry id, and a bio points at a log only
// when exact rules tie it to one registry id; anything else is left out so the page shows its empty state
// instead of someone else's matches.

import fs from 'fs';

/** Franchise renames, as already mapped elsewhere in the project (migrate_deliveries.ts TEAM_ALIASES). */
export const FRANCHISE_ALIASES = {
  'Delhi Daredevils': 'Delhi Capitals',
  'Kings XI Punjab': 'Punjab Kings',
  'Rising Pune Supergiants': 'Rising Pune Supergiant',
  'Royal Challengers Bangalore': 'Royal Challengers Bengaluru',
};
export const canonFranchise = (team) => FRANCHISE_ALIASES[team] ?? team;
export const slugify = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Registry facts from the raw files: written names per id, ids per written name, franchises and seasons per id. */
export function createRegistryHistory() {
  return { writtenToIds: new Map(), ids: new Map() };
}

export function recordAppearance(history, registryId, writtenName, team, season) {
  if (!registryId) return;
  let h = history.ids.get(registryId);
  if (!h) { h = { written: new Set(), franchises: new Set(), seasonsByFranchise: new Map() }; history.ids.set(registryId, h); }
  h.written.add(writtenName);
  const f = canonFranchise(team);
  h.franchises.add(f);
  if (!h.seasonsByFranchise.has(f)) h.seasonsByFranchise.set(f, new Set());
  h.seasonsByFranchise.get(f).add(String(season));
  if (!history.writtenToIds.has(writtenName)) history.writtenToIds.set(writtenName, new Set());
  history.writtenToIds.get(writtenName).add(registryId);
}

/** Reviewed aliases for bios whose names are not written in the IPL files (manifest with evidence per entry). */
export function loadVerifiedAliases(file) {
  if (!file || !fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).aliases ?? {};
}

/**
 * The registry id a player bio refers to. Exact methods only, in order:
 *   1. a reviewed alias for this bio key;
 *   2. the bio's playerName / fullName written in IPL files for exactly one registry id;
 *   3. if those names point at several ids, the one that played for the bio's franchise (if exactly one did);
 * otherwise null (the page shows no recent matches).
 */
export function identifyBio(bioKey, bio, history, aliases = {}) {
  const alias = aliases[bioKey];
  if (alias?.cricsheetId) return { id: alias.cricsheetId, method: 'verified alias', candidates: [alias.cricsheetId] };
  const candidates = new Set();
  for (const name of [bio.playerName, bio.fullName]) {
    for (const id of history.writtenToIds.get(name) ?? []) candidates.add(id);
  }
  if (candidates.size === 1) return { id: [...candidates][0], method: 'IPL written name', candidates: [...candidates] };
  if (candidates.size > 1) {
    const team = canonFranchise(bio.currentTeam || bio.team || '');
    const played = team ? [...candidates].filter((id) => history.ids.get(id)?.franchises.has(team)) : [];
    if (played.length === 1) return { id: played[0], method: 'IPL written name + franchise', candidates: [...candidates] };
    return { id: null, method: 'ambiguous written name', candidates: [...candidates] };
  }
  return { id: null, method: 'no exact identity', candidates: [] };
}

/** The /players/<slug> slug the site links with (playerSlug in artifacts/ipl-analytics/src/lib/aggregates.ts). */
export const pageSlug = (s) => (s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The registry id behind a squads-by-season entry: written name, narrowed by franchise and season when shared. */
export function identifySquadEntry(entry, season, team, history) {
  const ids = [...(history.writtenToIds.get(entry.cricsheetName) ?? [])];
  if (ids.length <= 1) return ids[0] ?? null;
  const f = canonFranchise(team);
  const played = ids.filter((id) => history.ids.get(id)?.seasonsByFranchise.get(f)?.has(String(season)));
  return played.length === 1 ? played[0] : null;
}

/**
 * Link slug → registry id, for /players/<slug> links that are not bio keys: every written name in the IPL
 * files that belongs to one registry id, then squad display names whose cricsheetName gives one id. A written
 * name is registry fact and beats the hand-curated squad file; a slug claimed for several ids is left out
 * (and reported), so the page falls back to its name rules rather than picking one of them.
 */
export function buildPageIds({ bios, squads, history }) {
  const written = new Map(); // slug → Set<id>
  const squad = new Map();   // slug → Set<id>
  const add = (m, slug, id) => { if (!slug || !id) return; if (!m.has(slug)) m.set(slug, new Set()); m.get(slug).add(id); };
  for (const [name, ids] of history.writtenToIds) for (const id of ids) add(written, pageSlug(name), id);
  for (const [season, teams] of Object.entries(squads ?? {})) {
    for (const [team, players] of Object.entries(teams ?? {})) {
      for (const p of players ?? []) {
        if (!p.name || !p.cricsheetName) continue;
        add(squad, pageSlug(p.name), identifySquadEntry(p, season, team, history));
      }
    }
  }
  const pages = {};
  const conflicts = [];
  for (const [slug, ids] of written) {
    if (bios[slug]) continue; // a bio key opens that bio
    if (ids.size === 1) pages[slug] = [...ids][0];
    else conflicts.push({ slug, source: 'written name', ids: [...ids] });
  }
  for (const [slug, ids] of squad) {
    if (bios[slug]) continue;
    if (written.has(slug)) {
      const w = written.get(slug);
      if ([...ids].some((id) => !w.has(id))) conflicts.push({ slug, source: 'squad name disagrees with the written name', ids: [...ids], written: [...w] });
      continue;
    }
    if (ids.size === 1) pages[slug] = [...ids][0];
    else conflicts.push({ slug, source: 'squad name', ids: [...ids] });
  }
  return { pages, conflicts };
}

/**
 * Bio key → registry id, for every bio with a verified identity. The player page resolves its URL to a bio
 * first and looks recent matches up by that bio key alone, so no other key (name slugs, squad names, URL
 * variants) can point a page at a log.
 */
export function buildKeyIndex({ bios, history, aliases }) {
  const keys = new Map();
  const bioIdentity = {};
  for (const [bioKey, bio] of Object.entries(bios)) {
    const ident = identifyBio(bioKey, bio, history, aliases);
    bioIdentity[bioKey] = ident;
    if (ident.id) keys.set(bioKey, ident.id);
  }
  return { keys, bioIdentity };
}
