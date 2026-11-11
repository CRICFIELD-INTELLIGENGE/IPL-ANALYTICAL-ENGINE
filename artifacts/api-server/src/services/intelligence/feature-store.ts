// CricField Player Intelligence — point-in-time feature store (batch only).
//
// One rule governs this file: a row for an event in season T uses only what was
// known before that event. Performance is rated as of T−1 and prices come from
// earlier auctions. Nothing from the auction being predicted, including its sale
// totals, may enter a row. test/intelligence.test.ts enforces this with a
// perturbation check: rewriting season T changes no row for season T.

import { loadAuctionList } from "../decision/auction-war-room";
import { getPlayerMeta, getRoster, getUsage } from "../decision/player-profiles";
import { franchiseOf, resolveFranchise } from "../decision/stats-engine";
import { getRegistry, getResolvedSales, loadSquadBook, normName, type SquadRow } from "./identity";
import {
  getPlayerSeasons, PHASE_LIST, ratingsAsOf, replacementRates, runsAboveReplacement,
  type PlayerSeason, type Ratings,
} from "./impact-engine";

export const MEGA_AUCTIONS = new Set([2014, 2018, 2022, 2025]);
/** First season with `retained` labels in the squad book that can be compared with the season before. */
export const FIRST_RETENTION_SEASON = 2019;
export const TARGET_SEASON = 2027;
export const LATEST_SEASON = 2026;

export type AnalyticRole = "batter" | "bowler" | "all-rounder" | "wicketkeeper";

export const median = (v: number[]) => {
  const a = v.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
};

/** Role from what the player actually does. Squad-list labels are wrong too often (Piyush Chawla: "wicketkeeper"). */
export function analyticRole(warehouseId: number | null, asOf: number, listed: string | null): AnalyticRole {
  if (warehouseId !== null) {
    const u = getUsage(warehouseId, String(asOf));
    if (u.matchesWeighted > 0) {
      if (getPlayerMeta().get(warehouseId)?.keeper) return "wicketkeeper";
      return u.role === "wicketkeeper" ? "batter" : u.role;
    }
  }
  const l = (listed ?? "").toLowerCase();
  return /keep/.test(l) ? "wicketkeeper" : /all/.test(l) ? "all-rounder" : /bowl/.test(l) ? "bowler" : "batter";
}

/* ─── Contracts ──────────────────────────────────────────────────────────── */

export interface Contract { season: number; team: string; lakh: number | null; acquisition: string | null; played: boolean | null; row: SquadRow }

let contractCache: Map<string, Contract[]> | null = null;
export function getContracts(): Map<string, Contract[]> {
  if (contractCache) return contractCache;
  const reg = getRegistry();
  const book = loadSquadBook();
  const out = new Map<string, Contract[]>();
  for (const [y, teams] of Object.entries(book)) {
    for (const [team, rows] of Object.entries(teams)) {
      const short = resolveFranchise(team)?.short ?? team;
      for (const row of rows) {
        const id = reg.squadLink.get(`${y}|${short}|${normName(row.name)}`);
        if (!id) continue;
        const list = out.get(id) ?? [];
        list.push({ season: Number(y), team: short, lakh: row.priceLakh, acquisition: row.acquisition, played: row.played ?? null, row });
        out.set(id, list);
      }
    }
  }
  for (const l of out.values()) l.sort((a, b) => a.season - b.season);
  contractCache = out;
  return out;
}

/** Latest rupee contract signed before a season. */
function priorContract(id: string, season: number): Contract | null {
  const l = (getContracts().get(id) ?? []).filter((c) => c.season < season && c.lakh);
  return l.at(-1) ?? null;
}

function ageAt(birthDate: string | null, year: number): number | null {
  if (!birthDate) return null;
  const m = /(\d{4})/.exec(birthDate);
  return m ? year - Number(m[1]) : null;
}

/* ─── Performance features ───────────────────────────────────────────────── */

export interface PerfFeatures {
  rar: number | null; rarSd: number | null; rarBat: number | null; rarBowl: number | null; rarPrev: number | null;
  batRate: number | null; bowlRate: number | null; sampleMatches: number; matchesCareer: number; matchesLast2: number; seasonsPlayed: number;
  ballsFacedPerMatch: number; ballsBowledPerMatch: number;
  ppSR: number | null; midSR: number | null; deathSR: number | null; srVsPace: number | null; srVsSpin: number | null; dotPctBat: number | null; bndPctBat: number | null;
  ppEcon: number | null; midEcon: number | null; deathEcon: number | null; bowlDotPct: number | null; ballsPerWicket: number | null;
  batChaseSR: number | null; batDefendSR: number | null; bowlChaseEcon: number | null; bowlDefendEcon: number | null;
  catches: number; stumpings: number; runOuts: number;
  ppOvers: number; midOvers: number; deathOvers: number;
  ppBalls: number; midBalls: number; deathBalls: number;
  ppFaced: number; midFaced: number; deathFaced: number;
}

const ratingCache = new Map<number, { r: Ratings; repl: ReturnType<typeof replacementRates> }>();
const roleLookup = (asOf: number) => (id: number): string => {
  const c = getRegistry().byWarehouse.get(id);
  return analyticRole(id, asOf, c ? getRegistry().byCanonical.get(c)?.role ?? null : null);
};
export function ratingBundle(asOf: number) {
  let b = ratingCache.get(asOf);
  if (!b) {
    const r = ratingsAsOf(asOf);
    b = { r, repl: replacementRates(r, roleLookup(asOf)) };
    ratingCache.set(asOf, b);
  }
  return b;
}

const ratio = (a: number, b: number, scale = 1, minB = 30) => (b >= minB ? (a / b) * scale : null);

export function perfFeatures(warehouseId: number | null, asOf: number, listedRole: string | null): PerfFeatures {
  const blank: PerfFeatures = {
    rar: null, rarSd: null, rarBat: null, rarBowl: null, rarPrev: null, batRate: null, bowlRate: null, sampleMatches: 0, matchesCareer: 0, matchesLast2: 0, seasonsPlayed: 0,
    ballsFacedPerMatch: 0, ballsBowledPerMatch: 0, ppSR: null, midSR: null, deathSR: null, srVsPace: null, srVsSpin: null, dotPctBat: null, bndPctBat: null,
    ppEcon: null, midEcon: null, deathEcon: null, bowlDotPct: null, ballsPerWicket: null, batChaseSR: null, batDefendSR: null, bowlChaseEcon: null, bowlDefendEcon: null,
    catches: 0, stumpings: 0, runOuts: 0, ppOvers: 0, midOvers: 0, deathOvers: 0, ppBalls: 0, midBalls: 0, deathBalls: 0, ppFaced: 0, midFaced: 0, deathFaced: 0,
  };
  if (warehouseId === null) return blank;
  const ls: PlayerSeason[] = (getPlayerSeasons().byPlayer.get(warehouseId) ?? []).filter((l) => l.season <= asOf);
  if (!ls.length) return blank;
  const { r, repl } = ratingBundle(asOf);
  const rt = r.players.get(warehouseId);
  const role = analyticRole(warehouseId, asOf, listedRole);
  const f = { ...blank };
  f.matchesCareer = ls.reduce((s, l) => s + l.matches, 0);
  f.matchesLast2 = ls.filter((l) => l.season >= asOf - 1).reduce((s, l) => s + l.matches, 0);
  f.seasonsPlayed = ls.filter((l) => l.matches > 0).length;
  if (rt) {
    const rr = repl.get(role) ?? { bat: 0, bowl: 0 };
    const x = runsAboveReplacement(rt, rr);
    f.rar = x.perMatch; f.rarSd = x.sd; f.rarBat = x.batting; f.rarBowl = x.bowling;
    f.batRate = rt.batRate; f.bowlRate = rt.bowlRate; f.sampleMatches = rt.matchesWeighted;
    f.ballsFacedPerMatch = rt.batBallsPerMatch; f.ballsBowledPerMatch = rt.bowlBallsPerMatch;
  }
  const prev = asOf - 1 >= 2010 ? ratingBundle(asOf - 1) : null;
  const prt = prev?.r.players.get(warehouseId);
  if (prev && prt) f.rarPrev = runsAboveReplacement(prt, prev.repl.get(role) ?? { bat: 0, bowl: 0 }).perMatch;

  const w = ls.filter((l) => l.season >= asOf - 2);
  const sum = (pick: (l: PlayerSeason) => { balls: number; runs: number; outs: number; dots: number; boundaries: number }) =>
    w.reduce((a, l) => { const s = pick(l); return { balls: a.balls + s.balls, runs: a.runs + s.runs, outs: a.outs + s.outs, dots: a.dots + s.dots, boundaries: a.boundaries + s.boundaries }; }, { balls: 0, runs: 0, outs: 0, dots: 0, boundaries: 0 });
  const [bp, bm, bd] = PHASE_LIST.map((ph) => sum((l) => l.bat[ph]));
  const [wp, wm, wd] = PHASE_LIST.map((ph) => sum((l) => l.bowl[ph]));
  const batAll = { balls: bp.balls + bm.balls + bd.balls, runs: bp.runs + bm.runs + bd.runs, dots: bp.dots + bm.dots + bd.dots, boundaries: bp.boundaries + bm.boundaries + bd.boundaries };
  const bowlAll = { balls: wp.balls + wm.balls + wd.balls, outs: wp.outs + wm.outs + wd.outs, dots: wp.dots + wm.dots + wd.dots };
  const pace = sum((l) => l.batVsPace), spin = sum((l) => l.batVsSpin);
  const cBat = sum((l) => l.batChasing), dBat = sum((l) => l.batDefending), cBowl = sum((l) => l.bowlChasing), dBowl = sum((l) => l.bowlDefending);
  f.ppSR = ratio(bp.runs, bp.balls, 100); f.midSR = ratio(bm.runs, bm.balls, 100); f.deathSR = ratio(bd.runs, bd.balls, 100);
  f.srVsPace = ratio(pace.runs, pace.balls, 100); f.srVsSpin = ratio(spin.runs, spin.balls, 100);
  f.dotPctBat = ratio(batAll.dots, batAll.balls, 100); f.bndPctBat = ratio(batAll.boundaries, batAll.balls, 100);
  f.ppEcon = ratio(wp.runs, wp.balls, 6); f.midEcon = ratio(wm.runs, wm.balls, 6); f.deathEcon = ratio(wd.runs, wd.balls, 6);
  f.bowlDotPct = ratio(bowlAll.dots, bowlAll.balls, 100); f.ballsPerWicket = bowlAll.outs ? ratio(bowlAll.balls, bowlAll.outs) : null;
  f.batChaseSR = ratio(cBat.runs, cBat.balls, 100); f.batDefendSR = ratio(dBat.runs, dBat.balls, 100);
  f.bowlChaseEcon = ratio(cBowl.runs, cBowl.balls, 6); f.bowlDefendEcon = ratio(dBowl.runs, dBowl.balls, 6);
  f.catches = w.reduce((s, l) => s + l.catches, 0); f.stumpings = w.reduce((s, l) => s + l.stumpings, 0); f.runOuts = w.reduce((s, l) => s + l.runOuts, 0);
  const m = w.reduce((s, l) => s + l.matches, 0);
  if (m) { f.ppOvers = wp.balls / 6 / m; f.midOvers = wm.balls / 6 / m; f.deathOvers = wd.balls / 6 / m; }
  f.ppBalls = wp.balls; f.midBalls = wm.balls; f.deathBalls = wd.balls;
  f.ppFaced = bp.balls; f.midFaced = bm.balls; f.deathFaced = bd.balls;
  return f;
}

/** League economy by phase over the three seasons ending at asOf. */
export function leaguePhaseEcon(asOf: number): Record<"powerplay" | "middle" | "death", number> {
  const t = { powerplay: [0, 0], middle: [0, 0], death: [0, 0] };
  for (let s = asOf; s > asOf - 3; s--) {
    for (const l of getPlayerSeasons().seasons.get(s) ?? []) {
      for (const ph of PHASE_LIST) { t[ph][0] += l.bowl[ph].runs; t[ph][1] += l.bowl[ph].balls; }
    }
  }
  return { powerplay: (t.powerplay[0] / Math.max(1, t.powerplay[1])) * 6, middle: (t.middle[0] / Math.max(1, t.middle[1])) * 6, death: (t.death[0] / Math.max(1, t.death[1])) * 6 };
}

/* ─── Auction rows ───────────────────────────────────────────────────────── */

export interface AuctionFeatures {
  overseas: number | null; isBatter: number; isBowler: number; isAllRounder: number; isKeeper: number;
  age: number | null; priorLakh: number | null; priorGap: number | null; hasPrior: number;
  mega: number; marketMedianLakh: number | null; marketP90Lakh: number | null; seasonIndex: number; roleSupply: number | null;
  noIplRecord: number;
}

const perfKeys: (keyof PerfFeatures)[] = ["rar", "rarSd", "rarBat", "rarBowl", "rarPrev", "batRate", "bowlRate", "sampleMatches", "matchesCareer", "matchesLast2", "seasonsPlayed", "ballsFacedPerMatch", "ballsBowledPerMatch", "ppSR", "midSR", "deathSR", "srVsPace", "srVsSpin", "dotPctBat", "bndPctBat", "ppEcon", "midEcon", "deathEcon", "bowlDotPct", "ballsPerWicket"];
const auctionKeys: (keyof AuctionFeatures)[] = ["overseas", "isBatter", "isBowler", "isAllRounder", "isKeeper", "age", "priorLakh", "priorGap", "hasPrior", "mega", "marketMedianLakh", "marketP90Lakh", "seasonIndex", "roleSupply", "noIplRecord"];
export const AUCTION_FEATURES: string[] = [...perfKeys, ...auctionKeys];

const auctionMarket = (season: number) => {
  // The previous auction of the same kind is the most recent price level known before this one.
  const prior = getResolvedSales().filter((s) => s.soldLakh && s.season < season);
  const last = Math.max(0, ...prior.map((s) => s.season));
  const v = prior.filter((s) => s.season === last).map((s) => s.soldLakh!).sort((a, b) => a - b);
  return { med: median(v), p90: v.length ? v[Math.floor(v.length * 0.9)] : null };
};

/** Players with a positive rating in this role, expected to reach the auction: active last season and not kept. */
function roleSupply(season: number, role: AnalyticRole, asOf: number, retainedKnown: boolean): number | null {
  if (!retainedKnown) return null;
  const contracts = getContracts();
  const reg = getRegistry();
  const { r, repl } = ratingBundle(asOf);
  let n = 0;
  for (const e of getRoster(String(asOf))) {
    const rt = r.players.get(e.playerId);
    const id = reg.byWarehouse.get(e.playerId);
    if (!rt || !id) continue;
    if ((contracts.get(id) ?? []).some((c) => c.season === season && c.acquisition === "retained")) continue;
    const pr = analyticRole(e.playerId, asOf, null);
    if (pr !== role) continue;
    if (runsAboveReplacement(rt, repl.get(role) ?? { bat: 0, bowl: 0 }).perMatch > 0) n++;
  }
  return n;
}
const hasRetained = (season: number) => [...getContracts().values()].some((l) => l.some((c) => c.season === season && c.acquisition === "retained"));
const supplyCache = new Map<string, number | null>();

export function auctionRow(canonicalId: string, season: number): Record<string, number | null> {
  const reg = getRegistry();
  const p = reg.byCanonical.get(canonicalId)!;
  const asOf = season - 1;
  const perf = perfFeatures(p.warehouseId, asOf, p.role);
  const role = analyticRole(p.warehouseId, asOf, p.role);
  const prior = priorContract(canonicalId, season);
  const mkt = auctionMarket(season);
  const sk = `${season}|${role}`;
  // The 2027 retentions are not public: last auction's supply stands in until they are.
  const supplySeason = hasRetained(season) ? season : hasRetained(season - 1) ? season - 1 : season;
  if (!supplyCache.has(sk)) supplyCache.set(sk, roleSupply(supplySeason, role, Math.min(asOf, supplySeason - 1), hasRetained(supplySeason)));
  const row: Record<string, number | null> = {};
  for (const k of perfKeys) row[k] = perf[k] as number | null;
  const a: AuctionFeatures = {
    overseas: p.overseas === null ? null : p.overseas ? 1 : 0,
    isBatter: role === "batter" ? 1 : 0, isBowler: role === "bowler" ? 1 : 0, isAllRounder: role === "all-rounder" ? 1 : 0, isKeeper: role === "wicketkeeper" ? 1 : 0,
    age: ageAt(p.birthDate, season), priorLakh: prior?.lakh ?? null, priorGap: prior ? season - prior.season : null, hasPrior: prior ? 1 : 0,
    mega: MEGA_AUCTIONS.has(season) ? 1 : 0, marketMedianLakh: mkt.med, marketP90Lakh: mkt.p90, seasonIndex: season - 2014,
    roleSupply: supplyCache.get(sk) ?? null, noIplRecord: perf.matchesCareer === 0 ? 1 : 0,
  };
  for (const k of auctionKeys) row[k] = a[k];
  return row;
}

export function auctionTrainingRows() {
  return getResolvedSales()
    .filter((s) => s.soldLakh && s.season >= 2014 && s.canonicalId)
    .map((s) => ({ season: s.season, canonicalId: s.canonicalId!, player: s.player, team: resolveFranchise(s.teamCanonical ?? s.team)?.short ?? s.team, lakh: s.soldLakh!, baseLakh: s.baseLakh, ...auctionRow(s.canonicalId!, s.season) }));
}

/** The only full auction pool on file: the 2026 list. Sold = in the sale records for 2026. */
export function soldListRows() {
  const reg = getRegistry();
  const sold = new Set(getResolvedSales().filter((s) => s.season === 2026 && s.canonicalId).map((s) => s.canonicalId!));
  const out: Record<string, number | string | null>[] = [];
  const seen = new Set<string>();
  let unmatched = 0;
  for (const l of loadAuctionList()) {
    const ids = reg.byAlias.get(normName(l.fullName));
    if (ids?.size !== 1) { unmatched++; continue; }
    const id = [...ids][0];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ canonicalId: id, player: l.fullName, sold: sold.has(id) ? 1 : 0, ...auctionRow(id, 2026) });
  }
  return { rows: out, unmatched };
}

/* ─── Retention rows ─────────────────────────────────────────────────────── */

export const RETENTION_FEATURES = ["rar", "rarSd", "rarPrev", "sampleMatches", "matchesCareer", "matchesForTeam", "teamMatchShare", "seasonsWithTeam", "contractLakh", "contractMissing", "lakhPerRarRank", "rarRankInSquad", "contractRankInSquad", "overseas", "isBatter", "isBowler", "isAllRounder", "isKeeper", "age", "mega", "franchiseKeepRate", "boughtLastAuction"];

export type RetentionLabel = 0 | 1 | null;

/** Rows for the decision "does this franchise keep this player going into season T?". */
export function retentionRows(season: number): Record<string, number | string | null>[] {
  const reg = getRegistry();
  const book = loadSquadBook();
  const asOf = season - 1;
  const contracts = getContracts();
  const prevTeams = book[String(asOf)];
  if (!prevTeams) return [];
  const known = season <= LATEST_SEASON;
  const teamGames = new Map<string, number>();
  const gamesBy = new Map<string, number>();
  for (const e of getRoster(String(asOf))) {
    const fr = franchiseOf(e.teamId);
    const id = reg.byWarehouse.get(e.playerId);
    if (!fr || !id) continue;
    teamGames.set(fr.short, Math.max(teamGames.get(fr.short) ?? 0, e.matches));
    gamesBy.set(`${fr.short}|${id}`, e.matches);
  }
  const keepRate = (team: string) => {
    // Share of the squad this franchise kept at its most recent earlier non-mega decision.
    for (let s = asOf; s >= FIRST_RETENTION_SEASON; s--) {
      if (MEGA_AUCTIONS.has(s)) continue;
      const list = [...contracts.values()].flatMap((l) => l.filter((c) => c.season === s && c.team === team));
      if (list.length) return list.filter((c) => c.acquisition === "retained").length / list.length;
    }
    return null;
  };
  const out: Record<string, number | string | null>[] = [];
  for (const [team, rows] of Object.entries(prevTeams)) {
    const short = resolveFranchise(team)?.short ?? team;
    const squad = rows.map((row) => {
      const id = reg.squadLink.get(`${asOf}|${short}|${normName(row.name)}`);
      const p = id ? reg.byCanonical.get(id)! : null;
      return { row, id, p, perf: p ? perfFeatures(p.warehouseId, asOf, p.role) : null };
    }).filter((x) => x.id && x.p);
    const byRar = [...squad].sort((a, b) => (b.perf!.rar ?? -99) - (a.perf!.rar ?? -99)).map((x) => x.id);
    const byPay = [...squad].sort((a, b) => (b.row.priceLakh ?? 0) - (a.row.priceLakh ?? 0)).map((x) => x.id);
    const rate = keepRate(short);
    for (const x of squad) {
      const id = x.id!, p = x.p!;
      const next = (contracts.get(id) ?? []).filter((c) => c.season === season);
      let retained: RetentionLabel = null;
      let outcome = "unknown";
      if (known) {
        const same = next.find((c) => c.team === short);
        const elsewhereKept = next.find((c) => c.team !== short && c.acquisition === "retained");
        if (same?.acquisition === "retained") { retained = 1; outcome = "retained"; }
        else if (same?.acquisition === "auction") { retained = 0; outcome = "released_rebought"; }
        else if (same) { retained = null; outcome = "unlabelled"; } // on the squad with no acquisition label
        else if (elsewhereKept) { retained = 0; outcome = "traded"; }
        else { retained = 0; outcome = "released"; }
      }
      const role = analyticRole(p.warehouseId, asOf, p.role);
      const mine = gamesBy.get(`${short}|${id}`) ?? 0;
      const seasonsWithTeam = (contracts.get(id) ?? []).filter((c) => c.team === short && c.season <= asOf).length;
      const last = (contracts.get(id) ?? []).find((c) => c.season === asOf && c.team === short);
      out.push({
        season, canonicalId: id, player: p.name, team: short, outcome, retained,
        rar: x.perf!.rar, rarSd: x.perf!.rarSd, rarPrev: x.perf!.rarPrev, sampleMatches: x.perf!.sampleMatches, matchesCareer: x.perf!.matchesCareer,
        matchesForTeam: mine, teamMatchShare: teamGames.get(short) ? mine / teamGames.get(short)! : 0, seasonsWithTeam,
        contractLakh: x.row.priceLakh, contractMissing: x.row.priceLakh ? 0 : 1,
        lakhPerRarRank: (byPay.indexOf(id) - byRar.indexOf(id)) / Math.max(1, squad.length),
        rarRankInSquad: byRar.indexOf(id) / Math.max(1, squad.length), contractRankInSquad: byPay.indexOf(id) / Math.max(1, squad.length),
        overseas: p.overseas === null ? null : p.overseas ? 1 : 0,
        isBatter: role === "batter" ? 1 : 0, isBowler: role === "bowler" ? 1 : 0, isAllRounder: role === "all-rounder" ? 1 : 0, isKeeper: role === "wicketkeeper" ? 1 : 0,
        age: ageAt(p.birthDate, season), mega: MEGA_AUCTIONS.has(season) ? 1 : 0, franchiseKeepRate: rate,
        boughtLastAuction: last?.acquisition === "auction" ? 1 : 0,
      });
    }
  }
  return out;
}
