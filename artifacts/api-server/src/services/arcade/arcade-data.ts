// CRICFIELD Arcade — the one verified fact table every factual game reads.
//
// Nothing here is typed in by hand. Sources, all already reconciled elsewhere in the project:
//   identity     services/intelligence/identity.ts  (canonical ids, aliases, country, squad role)
//   appearances  decision/player-profiles getRoster  (a player "played for" a team = appeared in a match)
//   season lines decision/player-profiles getSeasonLines (runs, balls, outs, sixes, wickets per season)
//   milestones   data/player-career-stats.json      (hundreds, highest score, five-fors, best figures)
//   titles       decision/dugout-data franchiseRecord (winner of each season's final)
// A player missing a field is left without it; games skip players that lack what a question needs.

import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { getPlayerMeta, getRoster, getSeasonLines, getSeasons, type SeasonLine } from "../decision/player-profiles";
import { franchiseOf, getFranchiseRefs } from "../decision/stats-engine";
import { franchiseRecord } from "../decision/dugout-data";
import { getBallColumns } from "../decision/ball-context";
import { getRegistry, normName } from "../intelligence/identity";

export interface ArcadeBatting { runs: number; balls: number; outs: number; fours: number; sixes: number; sr: number; avg: number | null; hundreds: number; fifties: number; highest: number | null }
export interface ArcadeBowling { balls: number; runs: number; wickets: number; econ: number; fiveW: number; fourW: number; best: string | null }

export interface ArcadePlayer {
  id: string; // canonical id (cs:<cricsheet id>)
  wid: number; // warehouse player_id
  name: string; // display name
  scorecard: string; // Cricsheet scorecard name
  aliases: string[];
  country: string | null;
  overseas: boolean | null;
  role: string | null; // latest squad-list role
  keeper: boolean;
  battingHand: "L" | "R" | null;
  bowlingType: string;
  /** Seasons and franchises (short code) where the player appeared in at least one match. */
  appearances: { season: number; team: string; matches: number }[];
  franchises: string[];
  firstSeason: number;
  lastSeason: number;
  matches: number;
  seasons: SeasonLine[];
  bat: ArcadeBatting | null;
  bowl: ArcadeBowling | null;
  /** Seasons in which the player appeared for that season's champion. */
  titles: number[];
}

interface CareerBat { player: string; hundreds: number; fifties: number; highest: number }
interface CareerBowl { player: string; fiveW: number; fourW: number; best: string }

let cache: { players: ArcadePlayer[]; byId: Map<string, ArcadePlayer>; champions: Map<number, string>; cutoff: { lastSeason: number; lastMatchDate: string } } | null = null;

function readData<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(getProjectRoot(), "artifacts", "api-server", "data", file), "utf8")) as T;
}

/** season → champion franchise short code, from the final's recorded winner. Seasons without a recorded final winner are absent. */
function loadChampions(): Map<number, string> {
  const out = new Map<number, string>();
  for (const ref of getFranchiseRefs()) {
    const rec = franchiseRecord(ref.short);
    for (const s of rec?.seasons ?? []) if (s.champion) out.set(Number(s.season), rec!.franchise.short);
  }
  return out;
}

function build() {
  const reg = getRegistry();
  const meta = getPlayerMeta();
  const lines = getSeasonLines();
  const career = readData<{ batters: CareerBat[]; bowlers: CareerBowl[] }>("player-career-stats.json");
  const batMilestones = new Map(career.batters.map((b) => [normName(b.player), b]));
  const bowlMilestones = new Map(career.bowlers.map((b) => [normName(b.player), b]));
  const champions = loadChampions();

  const apps = new Map<number, Map<string, { season: number; team: string; matches: number }>>();
  for (const season of getSeasons()) {
    for (const r of getRoster(season)) {
      const fr = franchiseOf(r.teamId);
      if (!fr || r.matches <= 0) continue;
      const m = apps.get(r.playerId) ?? new Map();
      const key = `${season}|${fr.short}`;
      const prev = m.get(key);
      m.set(key, { season: Number(season), team: fr.short, matches: (prev?.matches ?? 0) + r.matches });
      apps.set(r.playerId, m);
    }
  }

  const players: ArcadePlayer[] = [];
  for (const p of reg.byCanonical.values()) {
    if (p.warehouseId == null || p.identityStatus !== "verified") continue;
    const seasons = (lines.get(p.warehouseId) ?? []).filter((l) => l.matches > 0);
    const appearances = [...(apps.get(p.warehouseId)?.values() ?? [])].sort((a, b) => a.season - b.season || a.team.localeCompare(b.team));
    if (!seasons.length || !appearances.length) continue;
    const m = meta.get(p.warehouseId);
    const sum = (k: keyof SeasonLine) => seasons.reduce((s, l) => s + Number(l[k]), 0);
    const batBalls = sum("batBalls"), bowlBalls = sum("bowlBalls");
    const bm = batMilestones.get(normName(p.name));
    const wm = bowlMilestones.get(normName(p.name));
    const runs = sum("batRuns"), outs = sum("batOuts");
    const bowlRuns = sum("bowlRuns"), wickets = sum("wickets");
    // Squad lists give the familiar display name ("Virat Kohli" for scorecard "V Kohli"); the latest listing wins.
    const display = [...p.aliases].reverse().find((a) => a.trim().includes(" ")) ?? p.name;
    players.push({
      id: p.canonicalId, wid: p.warehouseId, name: display, scorecard: p.name, aliases: p.aliases,
      country: p.country, overseas: p.overseas, role: p.role, keeper: Boolean(m?.keeper),
      battingHand: m?.battingHand ?? null, bowlingType: m?.bowlingType ?? "unknown",
      appearances, franchises: [...new Set(appearances.map((a) => a.team))],
      firstSeason: Math.min(...seasons.map((s) => Number(s.season))), lastSeason: Math.max(...seasons.map((s) => Number(s.season))),
      matches: sum("matches"), seasons,
      bat: batBalls > 0 ? { runs, balls: batBalls, outs, fours: sum("fours"), sixes: sum("sixes"), sr: round((runs / batBalls) * 100, 2), avg: outs > 0 ? round(runs / outs, 2) : null, hundreds: bm?.hundreds ?? 0, fifties: bm?.fifties ?? 0, highest: bm?.highest ?? null } : null,
      bowl: bowlBalls > 0 ? { balls: bowlBalls, runs: bowlRuns, wickets, econ: round((bowlRuns / bowlBalls) * 6, 2), fiveW: wm?.fiveW ?? 0, fourW: wm?.fourW ?? 0, best: wm?.best ?? null } : null,
      titles: appearances.filter((a) => champions.get(a.season) === a.team).map((a) => a.season),
    });
  }
  players.sort((a, b) => b.matches - a.matches || a.id.localeCompare(b.id));
  const c = getBallColumns();
  const lastMatchDate = c.matches.reduce((max, m) => (m.date > max ? m.date : max), "");
  return { players, byId: new Map(players.map((p) => [p.id, p])), champions, cutoff: { lastSeason: Math.max(...players.map((p) => p.lastSeason)), lastMatchDate: lastMatchDate.replace(/\//g, "-") } };
}

export const round = (v: number, dp = 1) => Math.round(v * 10 ** dp) / 10 ** dp;

export function arcadeData() {
  return (cache ??= build());
}
export const arcadePlayers = () => arcadeData().players;
export const arcadePlayer = (id: string) => arcadeData().byId.get(id);
export const champions = () => arcadeData().champions;

export const DATA_SOURCE = "CRICFIELD warehouse — Cricsheet IPL ball-by-ball (ODC-BY), CRICFIELD squad lists";
export function provenance() {
  const { cutoff } = arcadeData();
  return { source: DATA_SOURCE, lastSeason: cutoff.lastSeason, dataCutoff: cutoff.lastMatchDate };
}

/** Name search for autocomplete and answer checking. Exact on any known name; returns canonical ids. */
export function searchPlayers(q: string, limit = 8): { id: string; name: string; detail: string }[] {
  const k = normName(q);
  if (k.length < 2) return [];
  const hits: { p: ArcadePlayer; rank: number }[] = [];
  for (const p of arcadePlayers()) {
    const names = [p.name, p.scorecard, ...p.aliases].map(normName);
    const tokens = k.split(" ");
    const rank = names.some((n) => n === k) ? 0 : names.some((n) => n.startsWith(k)) ? 1
      : names.some((n) => { const words = n.split(" "); return tokens.every((t) => words.some((w) => w.startsWith(t))); }) ? 2
      : names.some((n) => n.includes(k)) ? 3 : -1;
    if (rank >= 0) hits.push({ p, rank });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || b.p.matches - a.p.matches)
    .slice(0, limit)
    .map(({ p }) => ({ id: p.id, name: p.name, detail: `${p.franchises.join(" · ")} · ${p.firstSeason}–${p.lastSeason}` }));
}
