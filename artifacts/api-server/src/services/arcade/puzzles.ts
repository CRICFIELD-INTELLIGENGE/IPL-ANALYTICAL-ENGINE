// CRICFIELD Arcade — factual puzzle generators. Every puzzle is a pure function of a seed string, built only
// from arcade-data.ts (verified warehouse facts). The client receives questions without answers; graders
// rebuild the puzzle from the seed. Anything that would need a fact we do not hold is skipped, never filled in.

import fs from "node:fs";
import path from "node:path";
import { pick, seeded, shuffle } from "@workspace/arcade-rules";
import { getProjectRoot } from "../decision/db";
import { F_BOWLER_WICKET, F_LEGAL, F_FACED, F_WICKET, getBallColumns } from "../decision/ball-context";
import { franchiseOf, resolveFranchise } from "../decision/stats-engine";
import { getPlayerMeta } from "../decision/player-profiles";
import { loadSquadBook, normName } from "../intelligence/identity";
import { arcadeData, arcadePlayer, arcadePlayers, champions, round, type ArcadePlayer } from "./arcade-data";

const latestTeam = (p: ArcadePlayer) => p.appearances.at(-1)!.team;
const teamName = (short: string) => resolveFranchise(short)?.name ?? short;

/* ─── Higher or Lower ─────────────────────────────────────────────────────── */

interface HlMetric { key: string; label: string; scope: "career" | "season"; unit: string; dp: number; threshold: string; value: (p: ArcadePlayer, season?: number) => number | null }
const seasonLine = (p: ArcadePlayer, s?: number) => p.seasons.find((l) => Number(l.season) === s);
const HL_METRICS: HlMetric[] = [
  { key: "runs", label: "IPL career runs", scope: "career", unit: "runs", dp: 0, threshold: "Min. 300 balls faced", value: (p) => (p.bat && p.bat.balls >= 300 ? p.bat.runs : null) },
  { key: "sr", label: "IPL career batting strike rate", scope: "career", unit: "", dp: 2, threshold: "Min. 500 balls faced", value: (p) => (p.bat && p.bat.balls >= 500 ? p.bat.sr : null) },
  { key: "avg", label: "IPL career batting average", scope: "career", unit: "", dp: 2, threshold: "Min. 500 balls faced and 10 dismissals", value: (p) => (p.bat && p.bat.balls >= 500 && p.bat.outs >= 10 ? p.bat.avg : null) },
  { key: "sixes", label: "IPL career sixes", scope: "career", unit: "sixes", dp: 0, threshold: "Min. 300 balls faced", value: (p) => (p.bat && p.bat.balls >= 300 ? p.bat.sixes : null) },
  { key: "wickets", label: "IPL career wickets", scope: "career", unit: "wickets", dp: 0, threshold: "Min. 600 balls bowled", value: (p) => (p.bowl && p.bowl.balls >= 600 ? p.bowl.wickets : null) },
  { key: "econ", label: "IPL career economy rate", scope: "career", unit: "runs/over", dp: 2, threshold: "Min. 600 balls bowled", value: (p) => (p.bowl && p.bowl.balls >= 600 ? p.bowl.econ : null) },
  { key: "season_runs", label: "Runs in the season", scope: "season", unit: "runs", dp: 0, threshold: "Min. 60 balls faced that season", value: (p, s) => { const l = seasonLine(p, s); return l && l.batBalls >= 60 ? l.batRuns : null; } },
  { key: "season_wickets", label: "Wickets in the season", scope: "season", unit: "wickets", dp: 0, threshold: "Min. 120 balls bowled that season", value: (p, s) => { const l = seasonLine(p, s); return l && l.bowlBalls >= 120 ? l.wickets : null; } },
];

export interface HlRound { round: number; metric: { key: string; label: string; scope: string; season: number | null; unit: string; threshold: string }; a: { id: string; name: string; team: string; value: number }; b: { id: string; name: string; team: string }; level: number }
interface HlFull extends HlRound { bValue: number }

/** Closeness bands by level: relative gap between the two values. */
const BANDS: [number, number][] = [[0.35, 10], [0.18, 0.5], [0.08, 0.25], [0.01, 0.12], [0.001, 0.06]];

export function hlRound(seed: string, roundNo: number): HlFull {
  const rng = seeded(`${seed}|hl|${roundNo}`);
  const level = Math.min(4, Math.floor(roundNo / 3));
  for (let attempt = 0; attempt < 40; attempt++) {
    const metric = pick(rng, HL_METRICS);
    const season = metric.scope === "season" ? 2008 + Math.floor(rng() * (arcadeData().cutoff.lastSeason - 2007)) : undefined;
    // Early rounds use well-known players (most matches); the pool widens with the level.
    const pool = arcadePlayers().filter((p) => metric.value(p, season) != null).slice(0, 80 + level * 70);
    if (pool.length < 10) continue;
    const a = pick(rng, pool);
    const va = metric.value(a, season)!;
    const [lo, hi] = BANDS[level];
    const near = pool.filter((p) => { if (p.id === a.id) return false; const v = metric.value(p, season)!; const gap = Math.abs(v - va) / Math.max(v, va, 1e-9); return v !== va && gap >= lo && gap <= hi; });
    if (!near.length) continue;
    const b = pick(rng, near);
    const team = (p: ArcadePlayer) => (season ? p.appearances.find((x) => x.season === season)?.team ?? latestTeam(p) : latestTeam(p));
    return {
      round: roundNo, level,
      metric: { key: metric.key, label: metric.label, scope: metric.scope, season: season ?? null, unit: metric.unit, threshold: metric.threshold },
      a: { id: a.id, name: a.name, team: team(a), value: round(va, metric.dp) }, b: { id: b.id, name: b.name, team: team(b) },
      bValue: round(metric.value(b, season)!, metric.dp),
    };
  }
  throw new Error("no higher-or-lower pair available");
}
export const publicHl = ({ bValue: _hidden, ...r }: HlFull): HlRound => r;
export function gradeHl(seed: string, roundNo: number, guess: "higher" | "lower") {
  const r = hlRound(seed, roundNo);
  const correct = guess === "higher" ? r.bValue > r.a.value : r.bValue < r.a.value;
  return { correct, aValue: r.a.value, bValue: r.bValue, metric: r.metric };
}

/* ─── Guess the Cricketer ─────────────────────────────────────────────────── */

export type GuessMode = "daily" | "practice" | "legends" | "current" | "prospects";
export const GUESS_MODES: Record<GuessMode, string> = {
  daily: "Daily Mystery — the same player for everyone today",
  practice: "Unlimited practice — established IPL players",
  legends: "IPL Legends — debut by 2014, 60+ matches",
  current: "Current players — appeared in 2025 or 2026",
  prospects: "Emerging Indian players — 5–30 IPL matches, active since 2024",
};
function guessPool(mode: GuessMode): ArcadePlayer[] {
  const last = arcadeData().cutoff.lastSeason;
  const base = arcadePlayers().filter((p) => p.country);
  switch (mode) {
    case "legends": return base.filter((p) => p.firstSeason <= 2014 && p.matches >= 60);
    case "current": return base.filter((p) => p.lastSeason >= last - 1 && p.matches >= 20);
    case "prospects": return base.filter((p) => p.country === "India" && p.matches >= 5 && p.matches <= 30 && p.lastSeason >= 2024);
    default: return base.filter((p) => p.matches >= 30);
  }
}
function roleLabel(p: ArcadePlayer): string {
  const hand = p.battingHand === "L" ? "left-handed" : p.battingHand === "R" ? "right-handed" : null;
  const bowl = p.bowlingType === "pace" ? "pace" : p.bowlingType === "spin" ? "spin" : null;
  const bb = p.bat?.balls ?? 0, wb = p.bowl?.balls ?? 0;
  if (p.keeper) return `Wicketkeeper-batter${hand ? `, bats ${hand}` : ""}`;
  if (wb > 600 && bb > 400) return `All-rounder${hand ? ` who bats ${hand}` : ""}${bowl ? ` and bowls ${bowl}` : ""}`;
  if (wb > bb) return `${bowl ? `${bowl[0].toUpperCase()}${bowl.slice(1)} bowler` : "Bowler"}`;
  return `${hand ? `${hand[0].toUpperCase()}${hand.slice(1)} batter` : "Batter"}`;
}
export function franchiseHistory(p: ArcadePlayer): string {
  const spans: { team: string; from: number; to: number }[] = [];
  for (const a of p.appearances) {
    const last = [...spans].reverse().find((s) => s.team === a.team);
    if (last && (last.to === a.season - 1 || last.to === a.season)) last.to = a.season;
    else spans.push({ team: a.team, from: a.season, to: a.season });
  }
  return spans.sort((x, y) => x.from - y.from).map((s) => `${s.team} ${s.from === s.to ? s.from : `${s.from}–${s.to}`}`).join(" · ");
}
function statClue(p: ArcadePlayer): string {
  const parts: string[] = [`${p.matches} IPL matches`];
  if (p.bat && p.bat.runs >= 100) parts.push(`${p.bat.runs.toLocaleString("en-IN")} runs at a strike rate of ${p.bat.sr.toFixed(1)}`);
  if (p.bowl && p.bowl.wickets >= 5) parts.push(`${p.bowl.wickets} wickets at ${p.bowl.econ.toFixed(2)} an over`);
  return parts.join(", ");
}
function strongClue(p: ArcadePlayer): string {
  const initials = p.name.split(/\s+/).map((w) => `${w[0]}.`).join(" ");
  const best = p.bat && p.bat.highest != null && (p.bat.runs >= (p.bowl?.wickets ?? 0) * 20) ? `highest IPL score ${p.bat.highest}` : p.bowl?.best ? `best IPL figures ${p.bowl.best}` : null;
  return `Initials ${initials} · IPL debut season ${p.firstSeason}${best ? ` · ${best}` : ""}`;
}
export interface GuessPuzzle { player: ArcadePlayer; clues: { label: string; text: string }[] }
export function guessPuzzle(seed: string, mode: GuessMode): GuessPuzzle {
  const pool = guessPool(mode).filter(p => portraitFor(p) !== null);
  const rng = seeded(`${seed}|guess`);
  const order = shuffle(rng, pool);
  for (const p of order) {
    const clues = [
      { label: "Playing role", text: roleLabel(p) },
      { label: "Nationality", text: p.country! },
      { label: "IPL franchise history", text: franchiseHistory(p) },
      { label: "Career numbers", text: statClue(p) },
      { label: "Strong clue", text: strongClue(p) },
    ];
    // Reject a puzzle whose full clue set would also describe someone else.
    const key = clues.map((c) => c.text).join("|");
    const twin = pool.some((o) => o.id !== p.id && [roleLabel(o), o.country, franchiseHistory(o), statClue(o), strongClue(o)].join("|") === key);
    if (!twin) return { player: p, clues };
  }
  throw new Error("no unambiguous mystery player");
}
export const GUESS_MAX_WRONG = 5;
export const guessScore = (cluesUsed: number, wrong: number) => Math.max(10, 100 - 15 * (cluesUsed - 1) - 10 * wrong);

/* ─── Cricket Grid ────────────────────────────────────────────────────────── */

interface Cond { key: string; label: string; test: (p: ArcadePlayer) => boolean }
const GRID_TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"];
const teamCond = (t: string): Cond => ({ key: `team:${t}`, label: `Played for ${t}`, test: (p) => p.franchises.includes(t) });
const STAT_CONDS: Cond[] = [
  { key: "century", label: "Scored an IPL hundred", test: (p) => (p.bat?.hundreds ?? 0) > 0 },
  { key: "fivefor", label: "Took an IPL five-wicket haul", test: (p) => (p.bowl?.fiveW ?? 0) > 0 },
  { key: "runs3000", label: "3,000+ IPL runs", test: (p) => (p.bat?.runs ?? 0) >= 3000 },
  { key: "wkts100", label: "100+ IPL wickets", test: (p) => (p.bowl?.wickets ?? 0) >= 100 },
  { key: "sixes100", label: "100+ IPL sixes", test: (p) => (p.bat?.sixes ?? 0) >= 100 },
  { key: "multi3", label: "Played for 3+ franchises", test: (p) => p.franchises.length >= 3 },
  { key: "title", label: "Won an IPL title", test: (p) => p.titles.length > 0 },
  { key: "overseas", label: "Overseas player", test: (p) => p.overseas === true },
  { key: "keeper", label: "Wicketkeeper", test: (p) => p.keeper },
];
const countryCond = (country: string): Cond => ({ key: `country:${country}`, label: country, test: p => p.country === country });
const condByKey = (k: string): Cond | undefined => (k.startsWith("team:") ? teamCond(k.slice(5)) : k.startsWith("country:") ? countryCond(k.slice(8)) : STAT_CONDS.find((c) => c.key === k));
export interface Grid { seed: string; rows: { key: string; label: string }[]; cols: { key: string; label: string }[]; answerCounts: number[] }
export const cellAnswers = (rowKey: string, colKey: string) => { const r = condByKey(rowKey)!, c = condByKey(colKey)!; return arcadePlayers().filter((p) => r.test(p) && c.test(p)); };

/** Every cell needs ≥ minAnswers players and nine distinct players must be able to fill the grid together. */
export function makeGrid(seed: string, minAnswers = 3): Grid {
  const rng = seeded(`${seed}|grid`);
  for (let attempt = 0; attempt < 300; attempt++) {
    const teams = shuffle(rng, GRID_TEAMS);
    const rows = teams.slice(0, 3).map(teamCond);
    const countries = [...new Set(arcadePlayers().map(p => p.country).filter((c): c is string => Boolean(c)))];
    const cols = shuffle(rng, countries).slice(0, 3).map(countryCond);
    const answers = rows.flatMap((r) => cols.map((c) => arcadePlayers().filter((p) => r.test(p) && c.test(p))));
    if (answers.some((a) => a.length < minAnswers)) continue;
    if (!distinctFill(answers.map((a) => a.map((p) => p.id)))) continue;
    return { seed, rows: rows.map(({ key, label }) => ({ key, label })), cols: cols.map(({ key, label }) => ({ key, label })), answerCounts: answers.map((a) => a.length) };
  }
  throw new Error("no valid grid");
}
function distinctFill(cells: string[][]): boolean {
  const order = cells.map((c, i) => i).sort((a, b) => cells[a].length - cells[b].length);
  const used = new Set<string>();
  const go = (k: number): boolean => {
    if (k === order.length) return true;
    for (const id of cells[order[k]]) { if (used.has(id)) continue; used.add(id); if (go(k + 1)) return true; used.delete(id); }
    return false;
  };
  return go(0);
}
export function gradeGridCell(grid: Grid, cell: number, playerId: string): boolean {
  const p = arcadePlayer(playerId);
  if (!p || cell < 0 || cell > 8) return false;
  const r = condByKey(grid.rows[Math.floor(cell / 3)].key)!, c = condByKey(grid.cols[cell % 3].key)!;
  return r.test(p) && c.test(p);
}
export const GRID_ATTEMPTS = 12;

/* ─── IPL Time Machine ────────────────────────────────────────────────────── */

export interface TmQuestion { id: string; kind: string; prompt: string; options: string[]; answer: string; fact: string }
interface SeasonHigh { player: string; season: string; highest: number }
let seasonHighs: SeasonHigh[] | null = null;
const loadSeasonHighs = () => (seasonHighs ??= (JSON.parse(fs.readFileSync(path.join(getProjectRoot(), "artifacts", "api-server", "data", "player-season-stats.json"), "utf8")) as { batters: SeasonHigh[] }).batters);

function seasonPlayers(season: number) {
  return arcadePlayers().map((p) => ({ p, l: seasonLine(p, season), teams: p.appearances.filter((a) => a.season === season).map((a) => a.team) })).filter((x) => x.l);
}
/** Top of a ranking only when it is not tied. */
function uniqueTop<T>(rows: T[], v: (r: T) => number): T | null {
  const s = [...rows].sort((a, b) => v(b) - v(a));
  return s.length >= 4 && v(s[0]) > v(s[1]) ? s[0] : null;
}

export function timeMachineChapter(season: number): TmQuestion[] {
  const rng = seeded(`tm|${season}`);
  const sp = seasonPlayers(season);
  const teamsThatSeason = [...new Set(sp.flatMap((x) => x.teams))];
  const opts = (answer: string, pool: string[]) => shuffle(rng, [answer, ...shuffle(rng, pool.filter((o) => o !== answer)).slice(0, 3)]);
  const qs: TmQuestion[] = [];
  const champ = champions().get(season);
  if (champ && teamsThatSeason.length >= 4) qs.push({ id: `${season}-champ`, kind: "Champion", prompt: `Who won the IPL in ${season}?`, options: opts(teamName(champ), teamsThatSeason.map(teamName)), answer: teamName(champ), fact: `${teamName(champ)} won the ${season} final.` });
  const orange = uniqueTop(sp.filter((x) => x.l!.batRuns > 0), (x) => x.l!.batRuns);
  if (orange) {
    const top4 = [...sp].sort((a, b) => b.l!.batRuns - a.l!.batRuns).slice(0, 6).map((x) => x.p.name);
    qs.push({ id: `${season}-orange`, kind: "Orange Cap", prompt: `Who scored the most runs in IPL ${season}?`, options: opts(orange.p.name, top4), answer: orange.p.name, fact: `${orange.p.name} led the season with ${orange.l!.batRuns} runs.` });
  }
  const purple = uniqueTop(sp.filter((x) => x.l!.wickets > 0), (x) => x.l!.wickets);
  if (purple) {
    const top = [...sp].sort((a, b) => b.l!.wickets - a.l!.wickets).slice(0, 6).map((x) => x.p.name);
    qs.push({ id: `${season}-purple`, kind: "Purple Cap", prompt: `Who took the most wickets in IPL ${season}?`, options: opts(purple.p.name, top), answer: purple.p.name, fact: `${purple.p.name} took ${purple.l!.wickets} wickets, the most that season.` });
  }
  const oneTeam = sp.filter((x) => x.teams.length === 1 && (x.l!.batRuns >= 250 || x.l!.wickets >= 12));
  if (oneTeam.length && teamsThatSeason.length >= 4) {
    const x = pick(rng, oneTeam);
    qs.push({ id: `${season}-team-${x.p.id}`, kind: "Player → franchise", prompt: `Which franchise did ${x.p.name} play for in ${season}?`, options: opts(teamName(x.teams[0]), teamsThatSeason.map(teamName)), answer: teamName(x.teams[0]), fact: `${x.p.name} played for ${teamName(x.teams[0])} in ${season}${x.l!.batRuns >= 250 ? ` (${x.l!.batRuns} runs)` : ` (${x.l!.wickets} wickets)`}.` });
  }
  const highs = loadSeasonHighs().filter((h) => Number(h.season) === season);
  const hi = uniqueTop(highs, (h) => h.highest);
  const byScorecard = new Map(arcadePlayers().map((p) => [normName(p.scorecard), p.name]));
  if (hi && byScorecard.has(normName(hi.player))) {
    const pool = [...highs].sort((a, b) => b.highest - a.highest).slice(0, 6).map((h) => byScorecard.get(normName(h.player))).filter((n): n is string => Boolean(n));
    const name = byScorecard.get(normName(hi.player))!;
    qs.push({ id: `${season}-high`, kind: "Historic innings", prompt: `Who made the highest individual score of IPL ${season} — ${hi.highest}?`, options: opts(name, pool), answer: name, fact: `${name} made ${hi.highest}, the top score of ${season}.` });
  }
  // Time warp: identify a different season from its champion and run-leader.
  const other = 2008 + Math.floor(rng() * (arcadeData().cutoff.lastSeason - 2007));
  const oc = champions().get(other);
  const oo = uniqueTop(seasonPlayers(other).filter((x) => x.l!.batRuns > 0), (x) => x.l!.batRuns);
  if (other !== season && oc && oo) {
    const seasons = Array.from({ length: arcadeData().cutoff.lastSeason - 2007 }, (_, i) => String(2008 + i)).filter((s) => Math.abs(Number(s) - other) <= 4);
    qs.push({ id: `${season}-warp-${other}`, kind: "Identify the season", prompt: `Time warp: ${teamName(oc)} won the title and ${oo.p.name} topped the run charts with ${oo.l!.batRuns}. Which season?`, options: opts(String(other), seasons), answer: String(other), fact: `That was IPL ${other}.` });
  }
  return qs.slice(0, 5);
}
export const tmSeasons = () => Array.from({ length: arcadeData().cutoff.lastSeason - 2007 }, (_, i) => 2008 + i);
export const publicTm = (q: TmQuestion) => ({ id: q.id, kind: q.kind, prompt: q.prompt, options: q.options });

/* ─── Predict the Next Ball ───────────────────────────────────────────────── */

export type NbMode = "quick" | "death" | "powerplay" | "chases" | "daily";
export const NB_MODES: Record<NbMode, string> = { quick: "Any over", death: "Death overs (16–20)", powerplay: "Powerplay (1–6)", chases: "Tight chases — last 3 overs, 30 or fewer needed", daily: "Daily Prediction — ten deliveries, the same for everyone" };
export const NB_OUTCOMES = [
  { key: "dot", label: "Dot ball" }, { key: "single", label: "Single" }, { key: "twothree", label: "Two or three" },
  { key: "four", label: "Four" }, { key: "six", label: "Six" }, { key: "wicket", label: "Wicket" }, { key: "extra", label: "Wide / no-ball / other" },
] as const;
export const NB_ROUNDS = 10;

function outcomeOf(i: number): string {
  const c = getBallColumns(), f = c.flags[i];
  if (f & F_WICKET) return "wicket";
  if (!(f & F_LEGAL) || !(f & F_FACED)) return "extra";
  if (c.batterRuns[i] === 6) return "six";
  if (c.batterRuns[i] === 4) return "four";
  const t = c.totalRuns[i];
  return t === 0 ? "dot" : t === 1 ? "single" : t <= 3 ? "twothree" : "extra";
}
const nameOfWid = (wid: number) => { const p = arcadeData().players.find((x) => x.wid === wid); return p?.name ?? getPlayerMeta().get(wid)?.name ?? "Unknown"; };

export interface NbQuestion { round: number; season: string; date: string; stage: string | null; battingTeam: string; bowlingTeam: string; batter: string; bowler: string; innings: number; over: string; score: string; target: number | null; need: string | null }
export function nbIndex(seed: string, mode: NbMode, roundNo: number): number {
  const c = getBallColumns();
  const rng = seeded(`${seed}|nb|${roundNo}`);
  for (let tries = 0; tries < 5000; tries++) {
    const i = Math.floor(rng() * c.n);
    const over = c.over[i];
    if (mode === "death" && over < 15) continue;
    if (mode === "powerplay" && over > 5) continue;
    if (mode === "chases" && !(c.inningsNumber[i] === 2 && over >= 17 && c.runsNeeded[i] > 0 && c.runsNeeded[i] <= 30)) continue;
    return i;
  }
  return Math.floor(rng() * c.n);
}
export function nbQuestion(seed: string, mode: NbMode, roundNo: number): NbQuestion {
  const c = getBallColumns(), i = nbIndex(seed, mode, roundNo), m = c.matches[c.match[i]];
  const legalInOver = Math.max(0, c.legalBefore[i] - c.over[i] * 6);
  const chase = c.runsNeeded[i] >= 0;
  return {
    round: roundNo, season: String(c.season[i]), date: m.date.replace(/\//g, "-"), stage: m.stage,
    battingTeam: franchiseOf(c.battingTeam[i])?.name ?? "—", bowlingTeam: franchiseOf(c.bowlingTeam[i])?.name ?? "—",
    batter: nameOfWid(c.batter[i]), bowler: nameOfWid(c.bowler[i]), innings: c.inningsNumber[i],
    over: `${c.over[i]}.${legalInOver + 1}`, score: `${c.runsBefore[i]}/${c.wicketsBefore[i]}`,
    target: chase ? m.target?.runs ?? null : null,
    need: chase && c.ballsLeft[i] > 0 ? `${c.runsNeeded[i]} from ${c.ballsLeft[i]} (required rate ${((c.runsNeeded[i] / c.ballsLeft[i]) * 6).toFixed(2)})` : null,
  };
}
export function gradeNb(seed: string, mode: NbMode, roundNo: number, guess: string) {
  const c = getBallColumns(), i = nbIndex(seed, mode, roundNo), actual = outcomeOf(i);
  const rare = actual === "wicket" || actual === "six";
  const correct = guess === actual;
  const runs = c.totalRuns[i];
  return { correct, actual, points: correct ? (rare ? 20 : 10) : 0, detail: `${actual === "wicket" ? "Wicket fell" : `${runs} run${runs === 1 ? "" : "s"} off the ball`}${!(c.flags[i] & F_FACED) ? " (wide)" : !(c.flags[i] & F_LEGAL) ? " (no-ball)" : ""}.` };
}

/* ─── Base rates for Captain's Call (real IPL deliveries) ─────────────────── */

let baseRates: Record<string, { rates: number[]; balls: number }> | null = null;
export function phaseBaseRates(): Record<string, { rates: number[]; balls: number }> {
  if (baseRates) return baseRates;
  const c = getBallColumns();
  const counts: Record<string, number[]> = { powerplay: Array(8).fill(0), middle: Array(8).fill(0), death: Array(8).fill(0) };
  for (let i = 0; i < c.n; i++) {
    const ph = c.over[i] < 6 ? "powerplay" : c.over[i] < 15 ? "middle" : "death";
    const o = outcomeOf(i);
    const idx = o === "wicket" ? 6 : o === "extra" ? 7 : o === "six" ? 5 : o === "four" ? 4 : o === "dot" ? 0 : o === "single" ? 1 : c.totalRuns[i] === 2 ? 2 : 3;
    counts[ph][idx]++;
  }
  baseRates = Object.fromEntries(Object.entries(counts).map(([k, v]) => { const n = v.reduce((a, b) => a + b, 0); return [k, { rates: v.map((x) => x / n), balls: n }]; }));
  return baseRates;
}

/* ─── Scout the Hidden Gem ────────────────────────────────────────────────── */

type Brief = { key: string; title: string; need: string; phase: "powerplay" | "middle" | "death"; side: "bowl" | "bat"; filter: (p: ArcadePlayer) => boolean };
const BRIEFS: Brief[] = [
  { key: "death-pacer", title: "Indian death-overs pacer", need: "The franchise needs an Indian pace bowler for overs 16–20.", phase: "death", side: "bowl", filter: (p) => p.country === "India" && p.bowlingType === "pace" },
  { key: "pp-opener", title: "Powerplay opener", need: "The franchise needs a top-order batter who scores fast in overs 1–6.", phase: "powerplay", side: "bat", filter: () => true },
  { key: "middle-spinner", title: "Middle-overs spinner", need: "The franchise needs a spinner to control overs 7–15.", phase: "middle", side: "bowl", filter: (p) => p.bowlingType === "spin" },
];
const inPhase = (over: number, ph: Brief["phase"]) => (ph === "powerplay" ? over < 6 : ph === "middle" ? over >= 6 && over < 15 : over >= 15);

function priceBook(): Map<string, number> {
  const book = loadSquadBook();
  const latest = Object.keys(book).sort().at(-1)!;
  const out = new Map<string, number>();
  for (const rows of Object.values(book[latest])) for (const r of rows) if (r.priceLakh != null) for (const n of [r.name, r.cricsheetName]) if (n) out.set(normName(n), r.priceLakh);
  return out;
}

export interface GemCandidate { id: string; name: string; country: string | null; team: string; priceCr: number; balls: number; rawRate: number; rawWktRate: number; shrunkRate: number; impact: number; band: number; value: number; riskAdjusted: number; overBudget: boolean; seasons: string }
export interface GemProblem { seed: string; brief: Omit<Brief, "filter">; budgetCr: number; league: { rate: number; wktRate: number; window: string }; candidates: GemCandidate[]; rateLabel: string }

/** Transparent model: shrink the player's phase rate toward the league (k = 120 balls), convert to runs per 4 overs (bowlers) or per 24 balls (batters), subtract an uncertainty band. */
export function gemProblem(seed: string): GemProblem | null {
  const rng = seeded(`${seed}|gem`);
  const brief = pick(rng, BRIEFS);
  const c = getBallColumns();
  const last = arcadeData().cutoff.lastSeason;
  const window = [last - 1, last];
  const agg = new Map<number, { balls: number; runs: number; wkts: number }>();
  let lb = 0, lr = 0, lw = 0;
  for (let i = 0; i < c.n; i++) {
    if (!window.includes(c.season[i]) || !inPhase(c.over[i], brief.phase)) continue;
    const who = brief.side === "bowl" ? c.bowler[i] : c.batter[i];
    const legal = brief.side === "bowl" ? (c.flags[i] & F_LEGAL) !== 0 : (c.flags[i] & F_FACED) !== 0;
    const runs = brief.side === "bowl" ? c.conceded[i] : c.batterRuns[i];
    const wk = brief.side === "bowl" ? (c.flags[i] & F_BOWLER_WICKET) !== 0 : c.outPlayer[i] === c.batter[i];
    const a = agg.get(who) ?? { balls: 0, runs: 0, wkts: 0 };
    a.balls += Number(legal); a.runs += runs; a.wkts += Number(wk);
    agg.set(who, a);
    lb += Number(legal); lr += runs; lw += Number(wk);
  }
  const lRate = lr / lb, lW = lw / lb, K = 120, minBalls = brief.side === "bowl" ? 60 : 90;
  const prices = priceBook();
  const wicketValue = brief.phase === "death" ? 6 : 9; // runs a wicket is worth in this phase (game assumption)
  const pool: GemCandidate[] = [];
  for (const p of arcadePlayers()) {
    const a = agg.get(p.wid);
    const price = prices.get(normName(p.scorecard)) ?? prices.get(normName(p.name));
    if (!a || a.balls < minBalls || price == null || !brief.filter(p) || p.lastSeason < last) continue;
    const sr = (a.runs + lRate * K) / (a.balls + K), sw = (a.wkts + lW * K) / (a.balls + K);
    const per = brief.side === "bowl" ? 24 : 24;
    // Bowlers: runs saved + wickets above league. Batters: runs above league − cost of extra dismissals.
    const impact = brief.side === "bowl" ? per * (lRate - sr) + per * (sw - lW) * wicketValue : per * (sr - lRate) - per * (sw - lW) * wicketValue;
    const band = 1.645 * 1.6 * per / Math.sqrt(a.balls); // ≈90% half-width; per-ball run s.d. ≈ 1.6 (game assumption)
    pool.push({ id: p.id, name: p.name, country: p.country, team: latestTeam(p), priceCr: price / 100, balls: a.balls, rawRate: round(brief.side === "bowl" ? (a.runs / a.balls) * 6 : (a.runs / a.balls) * 100, 2), rawWktRate: round(a.balls / Math.max(1, a.wkts), 1), shrunkRate: round(brief.side === "bowl" ? sr * 6 : sr * 100, 2), impact: round(impact, 1), band: round(band, 1), value: round(impact / Math.max(0.2, price / 100), 2), riskAdjusted: round(impact - band / 2, 1), overBudget: false, seasons: window.join("–") });
  }
  if (pool.length < 5) return null;
  const candidates = shuffle(rng, pool).slice(0, 5);
  const prices5 = candidates.map((x) => x.priceCr).sort((a, b) => a - b);
  const budgetCr = Math.max(prices5[2], round(prices5[1] + (prices5[3] - prices5[1]) * rng(), 1));
  for (const x of candidates) x.overBudget = x.priceCr > budgetCr;
  const { filter: _f, ...b } = brief;
  return { seed, brief: b, budgetCr, league: { rate: round(brief.side === "bowl" ? lRate * 6 : lRate * 100, 2), wktRate: round(1 / lW, 1), window: window.join("–") }, candidates, rateLabel: brief.side === "bowl" ? "Economy (runs per over)" : "Strike rate" };
}

export const GEM_REASONS = { phase: "Best phase numbers", value: "Best value for money", sample: "Biggest sample — least uncertainty", budget: "Fits the budget" } as const;
export function gradeGem(problem: GemProblem, pickId: string, reasons: string[]) {
  const eligible = problem.candidates.filter((x) => !x.overBudget).sort((a, b) => b.riskAdjusted - a.riskAdjusted);
  const chosen = problem.candidates.find((x) => x.id === pickId);
  if (!chosen) return null;
  const top = eligible[0];
  // Candidates whose risk-adjusted impact is within the top candidate's band are statistically tied with it.
  const tied = eligible.filter((x) => top.riskAdjusted - x.riskAdjusted <= top.band / 2).map((x) => x.id);
  const rank = eligible.findIndex((x) => x.id === pickId);
  const base = chosen.overBudget ? 0 : tied.includes(pickId) ? 60 : rank === 1 ? 35 : rank === 2 ? 15 : 0;
  const truth: Record<string, boolean> = {
    phase: problem.candidates.every((x) => x.impact <= chosen.impact),
    value: problem.candidates.filter((x) => !x.overBudget).every((x) => x.value <= chosen.value),
    sample: problem.candidates.every((x) => x.balls <= chosen.balls),
    budget: !chosen.overBudget,
  };
  const reasonPoints = reasons.filter((r) => r in truth).reduce((s, r) => s + (truth[r] ? 10 : -5), 0);
  return { points: Math.max(0, base + reasonPoints), modelPick: top.id, tied, truth, ranking: eligible.map((x) => x.id) };
}

let portraitIndex: Record<string, string> | null = null;
function portraitFor(p: ArcadePlayer): string | null {
 try {portraitIndex ??= JSON.parse(fs.readFileSync(path.join(getProjectRoot(),"artifacts/api-server/data/player-images.json"),"utf8"));
 for (const key of [p.name,p.scorecard,...p.aliases]) {const url=portraitIndex![key]??portraitIndex![key.toLowerCase()];if(typeof url === "string" && url.startsWith("/players/") && !url.includes("..") && fs.existsSync(path.join(getProjectRoot(),"artifacts/ipl-analytics/public",url.slice(1))))return url;}
 } catch { /* Missing portraits are excluded from photo mysteries. */ }
 return null;
}
export function mysteryPortrait(seed: string, mode: GuessMode): string | null {return portraitFor(guessPuzzle(seed,mode).player);}

/** Candidate elimination uses only the clues already shown to an opponent. */
export function mysteryCandidates(clues: { label: string; text: string }[]): string[] {
  return guessPool("practice").filter(p => portraitFor(p) !== null).filter(p => {
    const values = [roleLabel(p), p.country, franchiseHistory(p), statClue(p), strongClue(p)];
    return clues.every((c, i) => values[i] === c.text);
  }).map(p => p.id);
}
