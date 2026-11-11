// CricField Player Intelligence — canonical player identity.
//
// A canonical id never changes and is never derived from a display name when a
// better key exists:
//
//   cs:<cricsheet id>   the player has a Cricsheet register id (every warehouse player)
//   sq:<name>|<country> squad-list player with no match record yet. Marked name_only
//
// Links are exact-only. A squad row carries its Cricsheet scorecard name; a sale
// is joined to the same-season, same-franchise squad row. A display name found on
// more than one canonical id is ambiguous and is never guessed. There is no fuzzy
// matching anywhere in this file, because the same player must not be split and
// two different players must not be merged.

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, queryAll } from "../decision/db";
import { getPlayerMeta, getRoster, getSeasonLines, getSeasons } from "../decision/player-profiles";
import { franchiseOf, resolveFranchise } from "../decision/stats-engine";
import type { IdentityStatus, Lookup, PlayerIdentity } from "./schema";

export const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

export interface SquadRow {
  name: string;
  cricsheetName?: string | null;
  country: string | null;
  role: string | null;
  acquisition: string | null;
  priceLakh: number | null;
  priceUsd: number | null;
  played?: boolean;
}
export type SquadBook = Record<string, Record<string, SquadRow[]>>;

export interface SaleRow {
  season: number;
  player: string;
  team: string;
  teamCanonical?: string;
  country: string | null;
  role: string | null;
  iplMatches: number | null;
  category: string | null;
  soldLakh: number | null;
  soldUsd: number | null;
  baseLakh: number | null;
}

const dataFile = (name: string) => path.join(getProjectRoot(), "artifacts", "api-server", "data", name);

let squadBook: SquadBook | null = null;
export function loadSquadBook(): SquadBook {
  return (squadBook ??= JSON.parse(fs.readFileSync(dataFile("squads-by-season.json"), "utf8")) as SquadBook);
}

/** Same surname with a different first initial is another person ("Jason Roy" is not "AS Roy"); "Wanindu Hasaranga" / "PWH de Silva" stays linked. */
function conflicting(display: string, scorecard: string): boolean {
  const a = normName(display).split(" "), b = normName(scorecard).split(" ");
  return a.at(-1) === b.at(-1) && a[0][0] !== b[0][0];
}

export interface Registry {
  byCanonical: Map<string, PlayerIdentity>;
  byWarehouse: Map<number, string>;
  byAlias: Map<string, Set<string>>;
  /** season|franchise short|normalised name → canonical id. */
  squadLink: Map<string, string>;
}

let registry: Registry | null = null;

const shortOf = (team: string) => resolveFranchise(team)?.short ?? team;

function loadBirthDates(): Map<string, string> {
  const fp = dataFile("player-bio.json");
  const out = new Map<string, string>();
  if (!fs.existsSync(fp)) return out;
  const bios = Object.values(JSON.parse(fs.readFileSync(fp, "utf8")) as Record<string, { playerName?: string; fullName?: string; birthDate?: string }>);
  const seen = new Map<string, string | null>();
  for (const b of bios) {
    if (!b.birthDate) continue;
    for (const n of [b.playerName, b.fullName]) {
      if (!n) continue;
      const k = normName(n);
      // Two bios with one name and different birthdays: keep neither.
      seen.set(k, seen.has(k) && seen.get(k) !== b.birthDate ? null : b.birthDate);
    }
  }
  for (const [k, v] of seen) if (v) out.set(k, v);
  return out;
}

export function getRegistry(): Registry {
  if (registry) return registry;
  const meta = getPlayerMeta();
  const lines = getSeasonLines();
  const dbRows = queryAll<{ player_id: number; cricsheet_id: string | null; name: string; batting_style: string | null }>(
    "SELECT player_id, cricsheet_id, name, batting_style FROM players",
  );
  const byCanonical = new Map<string, PlayerIdentity>();
  const byWarehouse = new Map<number, string>();
  const byScorecardName = new Map<string, string>();
  // Tier 1: scorecard names and squad display names bound to a scorecard name. Tier 2: full names from the
  // bio layer, which are loosely matched upstream (it gives Anukul Roy the name "Jason Roy"), so they only
  // answer a lookup that tier 1 cannot, and a registered player's own name can never be taken from them.
  const alias = new Map<string, Set<string>>();
  const weakAlias = new Map<string, Set<string>>();
  const put = (into: Map<string, Set<string>>, name: string | null | undefined, id: string) => {
    if (!name) return;
    const k = normName(name);
    if (!k) return;
    const set = into.get(k) ?? new Set<string>();
    set.add(id);
    into.set(k, set);
  };
  const addAlias = (name: string | null | undefined, id: string) => put(alias, name, id);

  // json:N rows are squad stubs from ingest: no register id and no deliveries, never a verified identity.
  const isStub = (r: { cricsheet_id: string | null }) => !r.cricsheet_id || r.cricsheet_id.startsWith("json:");
  for (const r of dbRows) {
    if (isStub(r)) continue;
    const m = meta.get(r.player_id);
    const seasons = (lines.get(r.player_id) ?? []).filter((l) => l.matches > 0).map((l) => Number(l.season));
    const id = `cs:${r.cricsheet_id}`;
    byCanonical.set(id, {
      canonicalId: id, warehouseId: r.player_id, cricsheetId: r.cricsheet_id, name: r.name, fullName: m?.fullName ?? null,
      aliases: [], country: m?.country ?? null, overseas: m?.country ? m.overseas : null, role: null,
      battingStyle: r.batting_style || (m?.battingHand === "L" ? "Left-hand bat" : m?.battingHand === "R" ? "Right-hand bat" : null),
      bowlingStyle: m?.bowlingStyle ?? null, birthDate: null,
      firstSeason: seasons.length ? Math.min(...seasons) : null, lastSeason: seasons.length ? Math.max(...seasons) : null,
      matches: (lines.get(r.player_id) ?? []).reduce((s, l) => s + l.matches, 0),
      teamsBySeason: [], identityStatus: "verified", sources: ["cricsheet"],
    });
    byWarehouse.set(r.player_id, id);
    byScorecardName.set(normName(r.name), id);
    addAlias(r.name, id);
    put(weakAlias, m?.fullName, id);
  }
  // Squad lists: an exact scorecard name links the row; otherwise a display name that
  // already resolves to exactly one player does. Anything else stays a separate entry.
  const squads = loadSquadBook();
  const seasonsAsc = Object.keys(squads).sort();
  const pending: { season: number; short: string; row: SquadRow }[] = [];
  const squadLink = new Map<string, string>();
  const linkKey = (season: number, short: string, name: string) => `${season}|${short}|${normName(name)}`;
  const attach = (id: string, season: number, short: string, row: SquadRow) => {
    const p = byCanonical.get(id)!;
    squadLink.set(linkKey(season, short, row.name), id);
    if (row.name && !p.aliases.includes(row.name) && normName(row.name) !== normName(p.name)) p.aliases.push(row.name);
    addAlias(row.name, id);
    if (!p.teamsBySeason.some((t) => t.season === season && t.team === short)) p.teamsBySeason.push({ season, team: short });
    if (row.country && !p.country) { p.country = row.country; p.overseas = !/^india$/i.test(row.country); }
    if (row.role) p.role = row.role; // latest season wins
    if (!p.sources.includes("squad-lists")) p.sources.push("squad-lists");
  };
  for (const y of seasonsAsc) {
    const season = Number(y);
    for (const [team, rows] of Object.entries(squads[y])) {
      const short = shortOf(team);
      for (const row of rows) {
        // A display name that is itself a scorecard name wins: the list maps Ravi Bishnoi to "R Bishnoi" (Rajesh) in places.
        const id = byScorecardName.get(normName(row.name)) ?? (row.cricsheetName && !conflicting(row.name, row.cricsheetName) ? byScorecardName.get(normName(row.cricsheetName)) : undefined);
        if (id) attach(id, season, short, row);
        else pending.push({ season, short, row });
      }
    }
  }
  for (const { season, short, row } of pending) {
    const hits = alias.get(normName(row.name)) ?? weakAlias.get(normName(row.name));
    if (hits?.size === 1) { attach([...hits][0], season, short, row); continue; }
    const country = row.country ?? "unknown";
    const id = `sq:${normName(row.name).replace(/ /g, "-")}|${normName(country).replace(/ /g, "-")}`;
    if (!byCanonical.has(id)) {
      byCanonical.set(id, {
        canonicalId: id, warehouseId: null, cricsheetId: null, name: row.name, fullName: null, aliases: [],
        country: row.country, overseas: row.country ? !/^india$/i.test(row.country) : null, role: row.role,
        battingStyle: null, bowlingStyle: null, birthDate: null, firstSeason: null, lastSeason: null, matches: 0,
        teamsBySeason: [], identityStatus: "name_only", sources: ["squad-lists"],
      });
    }
    attach(id, season, short, row);
  }

  // Match rosters fill team history that the squad lists miss.
  for (const y of getSeasons()) {
    for (const r of getRoster(y)) {
      const id = byWarehouse.get(r.playerId);
      const fr = franchiseOf(r.teamId);
      if (!id || !fr) continue;
      const p = byCanonical.get(id)!;
      if (!p.teamsBySeason.some((t) => t.season === Number(y) && t.team === fr.short)) p.teamsBySeason.push({ season: Number(y), team: fr.short });
    }
  }

  const births = loadBirthDates();
  for (const p of byCanonical.values()) {
    p.teamsBySeason.sort((a, b) => a.season - b.season);
    // A full name another player owns outright is a bad bio match, not this player's name.
    if (p.fullName && !(alias.get(normName(p.fullName))?.has(p.canonicalId) ?? true)) p.fullName = null;
    const ids = [p.name, ...p.aliases, ...(p.fullName ? [p.fullName] : [])].map(normName);
    const hit = ids.map((k) => (alias.get(k)?.size === 1 ? births.get(k) : undefined)).find(Boolean);
    if (hit) p.birthDate = hit;
  }
  for (const [k, ids] of weakAlias) if (!alias.has(k) && ids.size === 1) alias.set(k, ids);

  registry = { byCanonical, byWarehouse, byAlias: alias, squadLink };
  return registry;
}

/** Exact lookup by canonical id, warehouse id or a known name. Ambiguous names return candidates, never a pick. */
export function lookupPlayer(key: string | number): Lookup {
  const reg = getRegistry();
  const raw = String(key).trim();
  const summary = (id: string) => { const p = reg.byCanonical.get(id)!; return { canonicalId: id, name: p.name, lastSeason: p.lastSeason, country: p.country }; };
  const found = (id: string): Lookup => {
    const player = reg.byCanonical.get(id)!;
    return { status: player.identityStatus as IdentityStatus, player, candidates: [] };
  };
  if (reg.byCanonical.has(raw)) return found(raw);
  if (/^\d+$/.test(raw)) {
    const id = reg.byWarehouse.get(Number(raw));
    return id ? found(id) : { status: "not_found", player: null, candidates: [] };
  }
  const ids = reg.byAlias.get(normName(raw.replace(/-/g, " ")));
  if (!ids?.size) return { status: "not_found", player: null, candidates: [] };
  if (ids.size === 1) return found([...ids][0]);
  return { status: "ambiguous", player: null, candidates: [...ids].map(summary).sort((a, b) => (b.lastSeason ?? 0) - (a.lastSeason ?? 0)) };
}

export type SaleLink = "squad_row" | "unique_alias" | "ambiguous" | "unresolved";

/** Resolve an auction record: same-season, same-team squad row first, then a name held by one player only. */
export function resolveSale(season: number, team: string, player: string): { canonicalId: string | null; link: SaleLink } {
  const reg = getRegistry();
  const direct = reg.squadLink.get(`${season}|${shortOf(team)}|${normName(player)}`);
  if (direct) return { canonicalId: direct, link: "squad_row" };
  const ids = reg.byAlias.get(normName(player));
  if (ids?.size === 1) return { canonicalId: [...ids][0], link: "unique_alias" };
  return { canonicalId: null, link: ids?.size ? "ambiguous" : "unresolved" };
}

let sales: (SaleRow & { canonicalId: string | null; link: SaleLink })[] | null = null;

/** All priced auction records with their identity link. Dollar-era rows have no rupee price and are kept out of ₹ models. */
export function getResolvedSales() {
  if (sales) return sales;
  const raw = JSON.parse(fs.readFileSync(dataFile("player-auctions.json"), "utf8")) as SaleRow[];
  sales = raw.map((s) => ({ ...s, ...resolveSale(s.season, s.teamCanonical ?? s.team, s.player) }));
  return sales;
}

export function identityCoverage() {
  const reg = getRegistry();
  const all = [...reg.byCanonical.values()];
  const s = getResolvedSales();
  const rupee = s.filter((x) => x.soldLakh);
  const count = (l: SaleLink) => rupee.filter((x) => x.link === l).length;
  return {
    totalPlayers: all.length,
    verifiedIdentities: all.filter((p) => p.identityStatus === "verified").length,
    nameOnlyIdentities: all.filter((p) => p.identityStatus === "name_only").length,
    ambiguousAliases: [...reg.byAlias.values()].filter((v) => v.size > 1).length,
    withBirthDate: all.filter((p) => p.birthDate).length,
    rupeeSales: rupee.length,
    salesBySquadRow: count("squad_row"),
    salesByUniqueAlias: count("unique_alias"),
    salesAmbiguous: count("ambiguous"),
    salesUnresolved: count("unresolved"),
  };
}
