// Squad games (Build Your XI, Mega Auction Room, Franchise GM) on CRICFIELD's existing intelligence:
//   player ratings   Player Intelligence snapshot (runs above replacement, phase values, model market price)
//   team strength    intelligence/squad-optimizer bestSide() — the same LP the Retention Room and Squad Builder use
//   contracts        2026 squad lists (real contract prices); market prices are model predictions and labelled so
// Simulated outcomes (auction bids, season results, injuries) are fiction and are labelled as such by the UI.

import { auction, seeded, shuffle, type auction as A } from "@workspace/arcade-rules";
import { bestSide, type SquadCandidate } from "../intelligence/squad-optimizer";
import { getSnapshot, type SnapshotPlayer } from "../intelligence/service";
import { resolveFranchise } from "../decision/stats-engine";
import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "../decision/db";
import { normName } from "../intelligence/identity";
import { arcadeData, arcadePlayer, arcadePlayers, round } from "./arcade-data";

type Role = A.Role;
export interface PoolPlayer {
  id: string; name: string; team: string | null; role: Role; overseas: boolean; keeper: boolean; bowlingType: string; hand: "L" | "R" | null;
  rar: number; rating: number; contractCr: number | null; marketCr: number; marketLow: number; marketHigh: number; evidence: boolean;
  phase: { powerplay: number | null; middle: number | null; death: number | null };
}

const roleOf = (p: SnapshotPlayer): Role => (p.candidate.keeper ? "WK" : /all/i.test(p.role) ? "AR" : /bowl/i.test(p.role) ? "BOWL" : p.candidate.oversCapacity >= 2 && p.candidate.battingOption ? "AR" : p.candidate.oversCapacity >= 2 ? "BOWL" : "BAT");

let poolCache: { version: string; players: PoolPlayer[]; byId: Map<string, PoolPlayer>; cands: Map<string, SquadCandidate> } | null = null;
export function squadPool() {
  const snap = getSnapshot();
  if (!snap) throw new Error("intelligence_snapshot_unavailable");
  if (poolCache?.version === snap.version) return poolCache;
  const evid = snap.players.filter((p) => p.candidate.evidence).map((p) => p.candidate.rar).sort((a, b) => a - b);
  const pct = (v: number) => evid.findIndex((x) => x >= v) / Math.max(1, evid.length - 1);
  const players = snap.players.map((p): PoolPlayer => {
    const ap = arcadePlayer(p.id);
    return {
      id: p.id, name: ap?.name ?? p.name, team: p.team, role: roleOf(p), overseas: Boolean(p.overseas), keeper: p.candidate.keeper,
      bowlingType: p.candidate.bowlingType, hand: ap?.battingHand ?? null, rar: round(p.candidate.rar, 2),
      // Rating: percentile of runs above replacement among players with an IPL record, mapped to 40–99. No record → 35.
      rating: p.candidate.evidence ? Math.round(40 + 59 * Math.max(0, pct(p.candidate.rar))) : 35,
      contractCr: p.contractLakh != null ? p.contractLakh / 100 : null,
      marketCr: round(p.market.lakh / 100, 2), marketLow: round(p.market.low / 100, 2), marketHigh: round(p.market.high / 100, 2), evidence: p.candidate.evidence,
      phase: { powerplay: p.candidate.phaseValue.powerplay, middle: p.candidate.phaseValue.middle, death: p.candidate.phaseValue.death },
    };
  });
  poolCache = { version: snap.version, players, byId: new Map(players.map((p) => [p.id, p])), cands: new Map(snap.players.map((p) => [p.id, p.candidate])) };
  return poolCache;
}
export const snapshotMeta = () => { const s = getSnapshot()!; return { version: s.version, dataCutoff: s.dataCutoff, ratedThrough: s.ratedThrough }; };

/* ─── Build Your XI ───────────────────────────────────────────────────────── */

export type XiMode = "open" | "budget" | "rebuild" | "season";
export const XI_BUDGET_CR = 100; // CRICFIELD game budget — not an IPL rule
export const XI_RULES = ["11 players", "At most 4 overseas players (IPL playing-XI rule)", "At least 1 wicketkeeper (game rule)", "At least 5 bowling options (game rule)"];

let refCache: { version: string; strengths: number[] } | null = null;
function franchiseXiStrengths(): number[] {
  const { version, cands } = squadPool();
  if (refCache?.version === version) return refCache.strengths;
  const snap = getSnapshot()!;
  const strengths = Object.values(snap.teams).map((t) => bestSide([...t.xii, ...t.bench].map((x) => cands.get(x.id)!).filter(Boolean), 11).strength).filter((s) => s > 0).sort((a, b) => a - b);
  refCache = { version, strengths };
  return strengths;
}
/** 0–100: the median real franchise XI ≈ 60, the strongest ≈ 90. */
function rateStrength(s: number): number {
  const ref = franchiseXiStrengths();
  const med = ref[Math.floor(ref.length / 2)], max = ref.at(-1)!;
  return Math.max(0, Math.min(100, Math.round(60 + (30 * (s - med)) / Math.max(0.5, max - med))));
}

export interface XiReport {
  valid: boolean; issues: string[]; rating: number; strength: number; battingValue: number; bowlingValue: number;
  composition: ReturnType<typeof bestSide>["composition"] | null; gaps: string[]; costCr: number; budgetCr: number | null;
  paceOptions: number; spinOptions: number; leftHandersTop7: number; efficiency: number | null; strengths: string[]; weaknesses: string[];
}
export function evaluateXi(ids: string[], mode: XiMode, team?: string): XiReport {
  const { byId, cands } = squadPool();
  const uniq = [...new Set(ids)];
  const players = uniq.map((id) => byId.get(id)).filter((p): p is PoolPlayer => Boolean(p));
  const issues: string[] = [];
  if (uniq.length !== ids.length) issues.push("A player is picked twice.");
  if (players.length !== 11) issues.push(`Pick exactly 11 players (you have ${players.length}).`);
  const overseas = players.filter((p) => p.overseas).length;
  if (overseas > 4) issues.push(`${overseas} overseas players; the IPL allows 4 in a playing XI.`);
  if (!players.some((p) => p.keeper)) issues.push("No wicketkeeper.");
  const bowlers = players.filter((p) => (cands.get(p.id)?.oversCapacity ?? 0) > 0);
  if (bowlers.length < 5) issues.push(`Only ${bowlers.length} bowling options; 5 are needed.`);
  const costCr = round(players.reduce((s, p) => s + (p.contractCr ?? p.marketCr), 0), 2);
  const budgetCr = mode === "budget" ? XI_BUDGET_CR : null;
  if (budgetCr != null && costCr > budgetCr) issues.push(`₹${costCr} Cr spent; the game budget is ₹${budgetCr} Cr.`);
  if (mode === "rebuild" && team) {
    const outsiders = players.filter((p) => p.team !== team);
    if (outsiders.length > 3) issues.push(`Rebuild allows 3 signings from outside ${team}; you have ${outsiders.length}.`);
    if (outsiders.some((p) => p.team)) issues.push("Rebuild signings must be uncontracted players.");
  }
  const side = players.length === 11 ? bestSide(players.map((p) => cands.get(p.id)!), 11) : null;
  const strength = side?.feasible ? side.strength : 0;
  const rating = side?.feasible ? rateStrength(strength) : 0;
  const top7 = players.slice(0, 7);
  const paceOptions = bowlers.filter((p) => p.bowlingType === "pace").length, spinOptions = bowlers.filter((p) => p.bowlingType === "spin").length;
  const strengths: string[] = [], weaknesses: string[] = [];
  if (side?.feasible) {
    const c = side.composition;
    if (side.battingValue > side.bowlingValue + 2) strengths.push("Batting carries this side."); else if (side.bowlingValue > side.battingValue + 2) strengths.push("Bowling carries this side.");
    for (const ph of ["powerplay", "middle", "death"] as const) (c.phaseCoverage[ph] >= 100 ? strengths : weaknesses).push(c.phaseCoverage[ph] >= 100 ? `All ${ph} overs covered by recognised bowlers.` : `${100 - c.phaseCoverage[ph]}% of ${ph} overs fall to part-timers.`);
    if (c.battingDepth < 7) weaknesses.push(`Only ${c.battingDepth} genuine batting options.`);
    weaknesses.push(...side.gaps);
  }
  if (spinOptions === 0) weaknesses.push("No spin option.");
  if (paceOptions < 2) weaknesses.push("Fewer than two pace options.");
  const left = top7.filter((p) => p.hand === "L").length;
  if (left === 0) weaknesses.push("No left-hander in the top seven — easy for bowlers to settle.");
  else strengths.push(`${left} left-hander${left > 1 ? "s" : ""} in the top seven.`);
  return { valid: issues.length === 0 && Boolean(side?.feasible), issues: side && !side.feasible ? [...issues, "No legal XI: these players cannot meet the overseas and bowling rules together."] : issues, rating, strength, battingValue: side?.battingValue ?? 0, bowlingValue: side?.bowlingValue ?? 0, composition: side?.composition ?? null, gaps: side?.gaps ?? [], costCr, budgetCr, paceOptions, spinOptions, leftHandersTop7: left, efficiency: costCr > 0 && rating > 0 ? round(rating / costCr, 2) : null, strengths: [...new Set(strengths)], weaknesses: [...new Set(weaknesses)] };
}

/** Best XI by season: a separate, season-only rating from that season's verified lines. */
export function seasonPool(season: number) {
  const ps = arcadePlayers().map((p) => ({ p, l: p.seasons.find((x) => Number(x.season) === season), team: p.appearances.find((a) => a.season === season)?.team })).filter((x) => x.l && x.team);
  const tb = ps.reduce((s, x) => s + x.l!.batBalls, 0), tr = ps.reduce((s, x) => s + x.l!.batRuns, 0);
  const bb = ps.reduce((s, x) => s + x.l!.bowlBalls, 0), br = ps.reduce((s, x) => s + x.l!.bowlRuns, 0);
  const to = ps.reduce((s, x) => s + x.l!.batOuts, 0);
  const rpb = tr / tb, erpb = br / bb, bpo = tb / Math.max(1, to);
  return ps.map(({ p, l, team }) => {
    // Runs above the season's average rate, plus 8 per dismissal avoided against the season's balls-per-dismissal —
    // the same 8-run wicket weight bowlers get, so neither side is favoured.
    const bat = l!.batRuns - l!.batBalls * rpb + (l!.batBalls / bpo - l!.batOuts) * 8;
    const bowl = l!.bowlBalls * erpb - l!.bowlRuns + l!.wickets * 8; // runs saved + 8 per wicket (game weight)
    return { id: p.id, name: p.name, team: team!, overseas: Boolean(p.overseas), keeper: p.keeper, bowls: l!.bowlBalls >= 60, runs: l!.batRuns, sr: l!.batBalls ? round((l!.batRuns / l!.batBalls) * 100, 1) : null, wickets: l!.wickets, econ: l!.bowlBalls ? round((l!.bowlRuns / l!.bowlBalls) * 6, 2) : null, value: round(bat + bowl, 1), matches: l!.matches };
  }).filter((x) => x.matches >= 3).sort((a, b) => b.value - a.value);
}
export function evaluateSeasonXi(season: number, ids: string[]) {
  const pool = seasonPool(season), byId = new Map(pool.map((p) => [p.id, p]));
  const xi = ids.map((id) => byId.get(id)).filter((p): p is (typeof pool)[number] => Boolean(p));
  const issues: string[] = [];
  if (xi.length !== 11 || new Set(ids).size !== 11) issues.push("Pick 11 different players who played that season.");
  if (xi.filter((p) => p.overseas).length > 4) issues.push("More than 4 overseas players.");
  if (!xi.some((p) => p.keeper)) issues.push("No wicketkeeper.");
  if (xi.filter((p) => p.bowls).length < 5) issues.push("Fewer than 5 players who bowled 10+ overs that season.");
  const best = pool.slice(0, 40);
  const total = xi.reduce((s, p) => s + p.value, 0);
  // Reference: a greedy legal XI from the season's best values.
  const ref = greedySeasonXi(pool).reduce((s, p) => s + p.value, 0);
  return { valid: issues.length === 0, issues, total: round(total, 1), reference: round(ref, 1), rating: issues.length ? 0 : Math.max(0, Math.min(100, Math.round((total / Math.max(1, ref)) * 90))), topPicks: best.slice(0, 5).map((p) => p.name) };
}
function greedySeasonXi(pool: ReturnType<typeof seasonPool>) {
  const out: typeof pool = [];
  const keeper = pool.find((p) => p.keeper);
  if (keeper) out.push(keeper);
  for (const p of pool.filter((x) => x.bowls)) { if (out.filter((x) => x.bowls).length >= 5) break; if (!out.includes(p) && (!p.overseas || out.filter((x) => x.overseas).length < 4)) out.push(p); }
  for (const p of pool) { if (out.length >= 11) break; if (!out.includes(p) && (!p.overseas || out.filter((x) => x.overseas).length < 4)) out.push(p); }
  return out;
}

/* ─── Auction lots ────────────────────────────────────────────────────────── */

const baseFor = (marketCr: number) => (marketCr >= 6 ? 2 : marketCr >= 3 ? 1.5 : marketCr >= 1.5 ? 1 : marketCr >= 0.75 ? 0.5 : 0.3);
export function auctionLots(mode: A.AuctionConfig["mode"], humanTeam: string): { lots: A.Lot[]; start: Parameters<typeof auction.newAuction>[4]; note: string; retained?: { id: string; name: string }[] } {
  const { players } = squadPool();
  const rated = players.filter((p) => p.evidence);
  if (mode === "historical") {
    // The real 2026 auction's sold lots (base and sold price on record). Bidding in the game is simulated.
    const sales = (JSON.parse(fs.readFileSync(path.join(getProjectRoot(), "artifacts", "api-server", "data", "player-auctions.json"), "utf8")) as { season: number; player: string; team: string; soldLakh: number | null; baseLakh: number | null }[]).filter((s) => s.season === 2026 && s.soldLakh != null);
    const byName = new Map<string, PoolPlayer>();
    for (const p of rated) { byName.set(normName(p.name), p); const ap = arcadePlayer(p.id); for (const a of ap?.aliases ?? []) byName.set(normName(a), p); }
    const lots: A.Lot[] = [];
    for (const s of sales) {
      const p = byName.get(normName(s.player));
      if (!p) continue;
      lots.push({ id: p.id, name: p.name, role: p.role, overseas: p.overseas, baseCr: (s.baseLakh ?? 30) / 100, valueCr: Math.max((s.baseLakh ?? 30) / 100, p.marketCr), rating: p.rating, team: null /* the current team would reveal the real buyer */, actualCr: s.soldLakh! / 100, actualTeam: resolveFranchise(s.team)?.short ?? s.team });
    }
    return { lots, start: undefined, note: `${lots.length} lots from the real 2026 auction (sold lots that link to a verified player). Recorded prices are shown after each simulated lot; unsold lots are not in this scenario.` };
  }
  let pool = rated;
  let start: Parameters<typeof auction.newAuction>[4];
  let retainedCore: { id: string; name: string }[] = [];
  if (mode === "rebuild") {
    // Your franchise keeps its top-rated core; everyone else on its list goes back into the pool.
    const own = rated.filter((p) => p.team === humanTeam).sort((a, b) => b.rating - a.rating);
    // A top-four core with at most two overseas players, so the room still has slots and overseas places to fill.
    const core: PoolPlayer[] = [];
    for (const p of own) if (core.length < 4 && (!p.overseas || core.filter((c) => c.overseas).length < 2)) core.push(p);
    pool = rated.filter((p) => !core.includes(p));
    const roles = { BAT: 0, WK: 0, AR: 0, BOWL: 0 } as Record<Role, number>;
    for (const p of core) roles[p.role]++;
    retainedCore = core.map((p) => ({ id: p.id, name: p.name }));
    start = { [humanTeam]: { purseCr: auction.MODES.rebuild.purse, squad: core.map((p) => p.id), roles, overseas: core.filter((p) => p.overseas).length } };
  }
  const lots = pool.map((p): A.Lot => ({ id: p.id, name: p.name, role: p.role, overseas: p.overseas, baseCr: baseFor(p.marketCr), valueCr: Math.max(baseFor(p.marketCr), p.marketCr), rating: p.rating, team: p.team }));
  return { lots, start, retained: mode === "rebuild" ? retainedCore : undefined, note: "Lots are players with an IPL record. Rival valuations start from CRICFIELD's market model; every bid and price in the room is simulated." };
}
export function squadRatingFromIds(ids: string[]): { rating: number; strength: number; feasible: boolean } {
  const { cands } = squadPool();
  const c = ids.map((id) => cands.get(id)).filter((x): x is SquadCandidate => Boolean(x));
  if (c.length < 11) {
    // Too few for an XI: rate the signings' mean player rating instead.
    const { byId } = squadPool();
    const r = ids.map((id) => byId.get(id)?.rating ?? 0);
    return { rating: r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : 0, strength: 0, feasible: false };
  }
  const side = bestSide(c, 11);
  return { rating: side.feasible ? rateStrength(side.strength) : 0, strength: side.strength, feasible: side.feasible };
}

/* ─── Franchise GM ────────────────────────────────────────────────────────── */

export const GM_PURSE_CR = 120; // game purse — the real figure varies by season and is not modelled
export const GM_MAX_RETAIN = 6;
export function gmFranchises() {
  const snap = getSnapshot()!;
  const { byId } = squadPool();
  return Object.entries(snap.teams).map(([code, t]) => ({ code, name: resolveFranchise(code)?.name ?? code, strength: t.strength, squad: [...t.xii, ...t.bench].map((x) => byId.get(x.id)).filter((p): p is PoolPlayer => Boolean(p)) }));
}
export function gmFreeAgents() {
  return squadPool().players.filter((p) => !p.team && p.evidence).sort((a, b) => b.rating - a.rating);
}
export function teamStrength(ids: string[]) {
  const { cands } = squadPool();
  const side = bestSide(ids.map((id) => cands.get(id)).filter((x): x is SquadCandidate => Boolean(x)), 12);
  return { strength: side.feasible ? side.strength : 0, feasible: side.feasible, gaps: side.gaps, xii: side.xii.map((x) => x.id), composition: side.composition };
}
/** The AI side accepts a trade when the market value it receives is at least 95% of what it gives and its best XII is no more than 0.3 runs/match weaker. */
export function evaluateTrade(aiTeam: string, aiSquad: string[], give: string[], get: string[]) {
  const { byId } = squadPool();
  const val = (ids: string[]) => ids.reduce((s, id) => s + (byId.get(id)?.marketCr ?? 0), 0);
  const before = teamStrength(aiSquad).strength;
  const after = teamStrength([...aiSquad.filter((id) => !get.includes(id)), ...give]).strength;
  const fair = val(give) >= 0.95 * val(get);
  const keeps = after >= before - 0.3;
  return { accepted: fair && keeps, reason: !fair ? `${aiTeam} wants more value back (₹${round(val(give), 1)} Cr offered vs ₹${round(val(get), 1)} Cr asked, model prices).` : !keeps ? `${aiTeam} says the deal weakens its best XII too much.` : `${aiTeam} accepts.`, valueGive: round(val(give), 2), valueGet: round(val(get), 2), aiBefore: before, aiAfter: after };
}

export type Approach = "balanced" | "aggressive" | "conservative";
export interface GmMatch { n: number; home: string; away: string; winner: string; margin: string; userInvolved: boolean; note?: string }
export interface GmSeason { seed: string; team: string; matches: GmMatch[]; table: { code: string; played: number; won: number; lost: number; points: number }[]; playoffs: GmMatch[]; champion: string; userFinish: string; seasonPoints: number; injuries: { player: string; match: number; out: number }[]; strengths: Record<string, number> }

/** Deterministic season: 70 league games (each side plays 14), top four into IPL-style playoffs. Fiction, clearly labelled. */
export function simulateGmSeason(seed: string, team: string, squad: string[], approach: Approach, rivalSquads: Record<string, string[]>): GmSeason {
  const rng = seeded(`${seed}|gm-season`);
  const codes = Object.keys(rivalSquads).filter((c) => c !== team).concat(team);
  const squads: Record<string, string[]> = { ...rivalSquads, [team]: squad };
  const strengths: Record<string, number> = Object.fromEntries(codes.map((c) => [c, teamStrength(squads[c]).strength]));
  // Schedule: full round robin (45 games) + 5 seeded rounds of pairings (25 games) = 14 games each.
  const fixtures: [string, string][] = [];
  for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) fixtures.push([codes[i], codes[j]]);
  for (let r = 0; r < 5; r++) { const s = shuffle(rng, codes); for (let k = 0; k < s.length; k += 2) fixtures.push([s[k], s[k + 1]]); }
  const order = shuffle(rng, fixtures);
  const { byId } = squadPool();
  const injuries: GmSeason["injuries"] = [];
  const out = new Map<string, number>(); // player → match index they return
  let userGame = 0;
  const gauss = () => { const u = Math.max(1e-9, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const mood = approach === "aggressive" ? { mean: 0.8, sd: 1.5 } : approach === "conservative" ? { mean: -0.3, sd: 0.7 } : { mean: 0, sd: 1 };
  const play = (a: string, b: string, n: number, note?: string): GmMatch => {
    const s = (c: string) => {
      if (c !== team) return strengths[c] + gauss() * 2;
      const available = squad.filter((id) => (out.get(id) ?? -1) <= userGame);
      const base = available.length === squad.length ? strengths[team] : teamStrength(available).strength;
      return base + mood.mean + gauss() * 2 * mood.sd;
    };
    const sa = s(a), sb = s(b);
    const p = 1 / (1 + Math.exp(-(sa - sb) / 8));
    const winner = rng() < p ? a : b;
    const margin = rng() < 0.5 ? `${1 + Math.floor(rng() * 35)} runs` : `${1 + Math.floor(rng() * 8)} wickets`;
    return { n, home: a, away: b, winner, margin, userInvolved: a === team || b === team, note };
  };
  const matches: GmMatch[] = [];
  const table = new Map(codes.map((c) => [c, { code: c, played: 0, won: 0, lost: 0, points: 0 }]));
  order.forEach(([a, b], i) => {
    const involved = a === team || b === team;
    if (involved) {
      // Fictional injury events for the user's squad only.
      for (const id of squad) if ((out.get(id) ?? -1) <= userGame && rng() < 0.012) { const len = 1 + Math.floor(rng() * 3); out.set(id, userGame + len + 1); injuries.push({ player: byId.get(id)?.name ?? id, match: userGame + 1, out: len }); }
    }
    const m = play(a, b, i + 1);
    matches.push(m);
    for (const c of [a, b]) { const t = table.get(c)!; t.played++; if (m.winner === c) { t.won++; t.points += 2; } else t.lost++; }
    if (involved) userGame++;
  });
  const standings = [...table.values()].sort((x, y) => y.points - x.points || strengths[y.code] - strengths[x.code]);
  const [f1, f2, f3, f4] = standings.map((t) => t.code);
  const q1 = play(f1, f2, 71, "Qualifier 1"), el = play(f3, f4, 72, "Eliminator");
  const q2 = play(q1.winner === f1 ? f2 : f1, el.winner, 73, "Qualifier 2");
  const final = play(q1.winner, q2.winner, 74, "Final");
  const pos = standings.findIndex((t) => t.code === team) + 1;
  const inPlayoffs = pos <= 4;
  const userFinish = final.winner === team ? "Champions" : final.home === team || final.away === team ? "Runners-up" : inPlayoffs ? `Playoffs (${pos}${["st", "nd", "rd", "th"][Math.min(3, pos - 1)]} in league)` : `${pos}th in the league`;
  const seasonPoints = table.get(team)!.points + (inPlayoffs ? 10 : 0) + (final.home === team || final.away === team ? 20 : 0) + (final.winner === team ? 40 : 0);
  return { seed, team, matches, table: standings, playoffs: [q1, el, q2, final], champion: final.winner, userFinish, seasonPoints, injuries, strengths: Object.fromEntries(Object.entries(strengths).map(([k, v]) => [k, round(v, 2)])) };
}
export const gmProvenance = () => ({ ...snapshotMeta(), cutoff: arcadeData().cutoff });

/** Server-side guard for a submitted GM season: real ids, purse, overseas cap, and rival squads close to their real lists. */
export function validateGmSquad(team: string, squad: string[], rivals: Record<string, string[]>): string[] {
  const { byId } = squadPool();
  const issues: string[] = [];
  if (new Set(squad).size !== squad.length || squad.some((id) => !byId.has(id))) issues.push("unknown_or_duplicate_players");
  const cost = squad.reduce((s, id) => s + (byId.get(id)?.contractCr ?? byId.get(id)?.marketCr ?? 0), 0);
  if (cost > GM_PURSE_CR + 0.01) issues.push("over_purse");
  if (squad.filter((id) => byId.get(id)?.overseas).length > 8) issues.push("too_many_overseas");
  const real = new Map(gmFranchises().map((f) => [f.code, new Set(f.squad.map((p) => p.id))]));
  const seen = new Set(squad);
  for (const [code, ids] of Object.entries(rivals)) {
    const base = real.get(code);
    if (!base || code === team) { issues.push("unknown_rival"); continue; }
    if (ids.filter((id) => !base.has(id)).length > 3) issues.push(`rival_${code}_altered`);
    for (const id of ids) { if (seen.has(id)) issues.push("player_on_two_teams"); seen.add(id); }
  }
  return [...new Set(issues)];
}
