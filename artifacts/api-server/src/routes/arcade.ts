import * as Match from "../services/arcade/live-match";
import * as Draft from "../services/arcade/live-auction";
import * as Rooms from "../services/arcade/rooms";
// CRICFIELD Arcade API (/api/arcade/*)
//
// Factual games (Higher or Lower, Guess the Cricketer, Cricket Grid, Time Machine, Next Ball, Scout Gem) are
// graded here: the client gets questions without answers and each answer is checked against server-held state.
// Simulation games (Cup Chase, Hand Cricket, Super Over, DRS, Captain's Call, Auction) run in the browser with a
// seed issued here; a finished session is replayed with @workspace/arcade-rules before any score is stored.
// Progress is stored only for signed-in users (Supabase session via verifiedUser) — no second auth system.

import { createHash, randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ACHIEVEMENTS, DAILY_TIMEZONE, GAMES, auction as AU, captain, cup, dailyKey, drs, hand, msUntilNextDaily, superOver, type GameId } from "@workspace/arcade-rules";
import { verifiedUser } from "../services/platform/auth";
import { arcadePlayer, provenance, searchPlayers } from "../services/arcade/arcade-data";
import * as P from "../services/arcade/puzzles";
import * as S from "../services/arcade/arcade-store";
import * as Q from "../services/arcade/squads";

const router = Router();
export const ARCADE_GAMES = GAMES.filter(g => ["cup-chase","hand-cricket","super-over","cricket-grid","guess-cricketer","auction-room"].includes(g.id));

type User = { id: string; email: string } | null;
let resolveUser: (req: Request) => Promise<User> = verifiedUser;
/** Tests swap in a fake identity resolver; production always uses the Supabase check. */
export function setArcadeUserResolver(fn: (req: Request) => Promise<User>) { resolveUser = fn; }

const wrap = (fn: (req: Request, res: Response, user: User) => Promise<unknown> | unknown) => async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    const roomBody = (req.body ?? {}) as Record<string, unknown>;
    const roomGame = req.path === "/session/start" ? String(roomBody.game) : req.path === "/cricket-grid/start" ? "cricket-grid" : req.path === "/guess-cricketer/start" ? "guess-cricketer" : null;
    if (roomGame && roomBody.roomCode && roomBody.roomToken) {
      (req as Request & { arcadeRoomSeed?: string }).arcadeRoomSeed = Rooms.prepare(String(roomBody.roomCode), String(roomBody.roomToken), roomGame, roomBody);
    }
    const out = await fn(req, res, user);
    if (roomGame && roomBody.roomCode && roomBody.roomToken && out && typeof out === "object" && "runId" in out) Rooms.attach(String(roomBody.roomCode), String(roomBody.roomToken), String(out.runId));
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (err) {
    if (res.headersSent) return;
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); return; }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("bad_request:")) res.status(400).json({ error: msg.slice(12) });
    else if (msg === "not_found") res.status(404).json({ error: "not_found" });
    else { req.log?.error?.({ err }, "arcade request failed"); res.status(503).json({ error: "arcade_unavailable" }); }
  }
};
const bad = (why: string): never => { throw new Error(`bad_request:${why}`); };
function body<T>(schema: z.ZodType<T>, req: Request): T {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) bad(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return (r as { data: T }).data;
}
/** A run belongs to whoever started it; anonymous runs can be continued by anyone holding the unguessable id. */
function ownRun<T>(id: string, user: User, game: string): S.Run<T> {
  const run = S.getRun<T>(id);
  if (!run || run.game !== game) throw new Error("not_found");
  if (run.userId && run.userId !== user?.id) throw new Error("not_found");
  return run;
}
const newSeed = (game: string) => `${game}:${randomUUID()}`;

function finish(user: User, input: S.ResultInput) {
  return user ? S.recordResult(user.id, input) : null;
}

/* ─── Catalogue, meta, search ─────────────────────────────────────────────── */

// Lightweight contract check used by the dev proxy; it must not load scouting data.
router.get("/capabilities", (_req,res) => res.json({arcadeVersion:"rooms-v3",games:ARCADE_GAMES.map(g=>g.id),draftRooms:true,liveMatches:true}));
router.get("/games", wrap(() => ({ platform: "CRICFIELD Arcade", gamesCount: ARCADE_GAMES.length, games: ARCADE_GAMES, achievements: ACHIEVEMENTS })));
router.get("/meta", wrap(() => ({ day: dailyKey(), timezone: DAILY_TIMEZONE, msUntilNextDaily: msUntilNextDaily(), data: provenance() })));
router.get("/players/search", wrap((req) => searchPlayers(String(req.query.q ?? "").slice(0, 40))));
router.get("/base-rates", wrap(() => ({ rates: P.phaseBaseRates(), source: "CRICFIELD warehouse — every IPL delivery 2008–2026, innings 1–2", data: provenance() })));

/* ─── Higher or Lower ─────────────────────────────────────────────────────── */

type HlState = { round: number; streak: number; over: boolean };
const HL_DAILY_ROUNDS = 10;
router.post("/higher-or-lower/start", wrap((req, _res, user) => {
  const { mode } = body(z.object({ mode: z.enum(["daily", "endless"]) }), req);
  const day = dailyKey();
  if (mode === "daily" && user) {
    const done = S.dailyRecord(user.id, "higher-or-lower", day);
    if (done?.completed) return { alreadyCompleted: true, day, score: done.score };
    const active = S.activeDailyRun<HlState>(user.id, "higher-or-lower", day);
    if (active) return { runId: active.id, day, streak: active.state.streak, round: P.publicHl(P.hlRound(active.seed, active.state.round)), rounds: HL_DAILY_ROUNDS, data: provenance() };
  }
  const seed = mode === "daily" ? `hl:daily:${day}` : newSeed("hl");
  const run = S.createRun<HlState>(user?.id ?? null, "higher-or-lower", mode, seed, mode === "daily" ? day : null, { round: 0, streak: 0, over: false });
  return { runId: run.id, day: run.day, streak: 0, round: P.publicHl(P.hlRound(seed, 0)), rounds: mode === "daily" ? HL_DAILY_ROUNDS : null, data: provenance() };
}));
router.post("/higher-or-lower/:id/guess", wrap((req, _res, user) => {
  const { guess } = body(z.object({ guess: z.enum(["higher", "lower"]) }), req);
  const run = ownRun<HlState>(String(req.params.id), user, "higher-or-lower");
  if (run.status === "done") bad("run_finished");
  const g = P.gradeHl(run.seed, run.state.round, guess);
  const streak = run.state.streak + Number(g.correct);
  const done = !g.correct || (run.mode === "daily" && run.state.round + 1 >= HL_DAILY_ROUNDS);
  run.state = { round: run.state.round + 1, streak, over: done };
  run.status = done ? "done" : "active";
  run.score = streak;
  S.saveRun(run);
  let outcome = null;
  if (done) {
    if (user && run.day) S.markDaily(user.id, "higher-or-lower", run.day, streak, 1, true, "hl-v2");
    outcome = finish(user, { game: "higher-or-lower", mode: run.mode, score: streak, won: run.mode === "daily" ? streak === HL_DAILY_ROUNDS : streak >= 10, streak, achievements: streak >= 10 ? ["stat-detective"] : [] });
  }
  return { ...g, streak, done, next: done ? null : P.publicHl(P.hlRound(run.seed, run.state.round)), outcome };
}));

/* ─── Guess the Cricketer ─────────────────────────────────────────────────── */

type GuessState = { mode: P.GuessMode; clues: number; wrong: number; solved: boolean; over: boolean; guesses: string[] };
const guessReveal = (seed: string, mode: P.GuessMode) => { const z2 = P.guessPuzzle(seed, mode); const p = z2.player; return { id: p.id, name: p.name, country: p.country, franchises: p.franchises, firstSeason: p.firstSeason, lastSeason: p.lastSeason, matches: p.matches, bat: p.bat, bowl: p.bowl, titles: p.titles, history: P.franchiseHistory(p) }; };
router.get("/guess-cricketer/modes", wrap(() => P.GUESS_MODES));
router.post("/guess-cricketer/start", wrap((req, _res, user) => {
  const { mode } = body(z.object({ mode: z.enum(["daily", "practice", "legends", "current", "prospects"]) }), req);
  const day = dailyKey();
  if (mode === "daily" && user) {
    const done = S.dailyRecord(user.id, "guess-cricketer", day);
    if (done?.completed) return { alreadyCompleted: true, day, score: done.score };
    const active = S.activeDailyRun<GuessState>(user.id, "guess-cricketer", day);
    if (active) return { runId: active.id, mode, photoUrl: P.mysteryPortrait(active.seed, mode), clues: P.guessPuzzle(active.seed, mode).clues.slice(0, active.state.clues), wrong: active.state.wrong, guesses: active.state.guesses, maxWrong: P.GUESS_MAX_WRONG, data: provenance() };
  }
  const seed = (req as Request & { arcadeRoomSeed?: string }).arcadeRoomSeed ?? (mode === "daily" ? `guess:daily:${day}` : newSeed("guess"));
  const puzzle = P.guessPuzzle(seed, mode);
  const run = S.createRun<GuessState>(user?.id ?? null, "guess-cricketer", mode, seed, mode === "daily" ? day : null, { mode, clues: 1, wrong: 0, solved: false, over: false, guesses: [] });
  return { runId: run.id, mode, modeLabel: P.GUESS_MODES[mode], photoUrl: P.mysteryPortrait(seed, mode), clues: puzzle.clues.slice(0, 1), wrong: 0, guesses: [], maxWrong: P.GUESS_MAX_WRONG, data: provenance() };
}));
function guessEnd(run: S.Run<GuessState>, user: User) {
  const score = run.state.solved ? P.guessScore(run.state.clues, run.state.wrong) : 0;
  run.status = "done"; run.score = score; run.state.over = true;
  S.saveRun(run);
  if (user && run.day) S.markDaily(user.id, "guess-cricketer", run.day, score, run.state.guesses.length, true, "guess-v2");
  const outcome = finish(user, { game: "guess-cricketer", mode: run.mode, score, won: run.state.solved, achievements: run.state.solved && run.state.clues <= 2 ? ["mystery-solved"] : [] });
  return { score, player: guessReveal(run.seed, run.state.mode), outcome };
}
router.post("/guess-cricketer/:id/clue", wrap((req, _res, user) => {
  const run = ownRun<GuessState>(String(req.params.id), user, "guess-cricketer");
  if (run.status === "done") bad("run_finished");
  run.state.clues = Math.min(5, run.state.clues + 1);
  S.saveRun(run);
  return { clues: P.guessPuzzle(run.seed, run.state.mode).clues.slice(0, run.state.clues) };
}));
router.post("/guess-cricketer/:id/answer", wrap((req, _res, user) => {
  const { playerId } = body(z.object({ playerId: z.string().max(80) }), req);
  const run = ownRun<GuessState>(String(req.params.id), user, "guess-cricketer");
  if (run.status === "done") bad("run_finished");
  if (!arcadePlayer(playerId)) bad("unknown_player");
  if(run.state.guesses.includes(arcadePlayer(playerId)!.name))bad("player_already_guessed");
  const correct = P.guessPuzzle(run.seed, run.state.mode).player.id === playerId;
  run.state.guesses.push(arcadePlayer(playerId)!.name);
  if (correct) { run.state.solved = true; return { correct, done: true, ...guessEnd(run, user) }; }
  run.state.wrong++;
  if (run.state.wrong >= P.GUESS_MAX_WRONG) return { correct, done: true, ...guessEnd(run, user) };
  S.saveRun(run);
  return { correct, done: false, wrong: run.state.wrong };
}));
router.post("/guess-cricketer/:id/give-up", wrap((req, _res, user) => {
  const run = ownRun<GuessState>(String(req.params.id), user, "guess-cricketer");
  if (run.status === "done") bad("run_finished");
  return { done: true, ...guessEnd(run, user) };
}));

/* ─── Cricket Grid ────────────────────────────────────────────────────────── */

type GridState = { filled: (string | null)[]; attemptsLeft: number; used: string[]; rarity: (number | null)[] };
router.post("/cricket-grid/start", wrap((req, _res, user) => {
  const { mode } = body(z.object({ mode: z.enum(["daily", "practice"]) }), req);
  const day = dailyKey();
  if (mode === "daily" && user) {
    const done = S.dailyRecord(user.id, "cricket-grid", day);
    if (done?.completed) return { alreadyCompleted: true, day, score: done.score };
    const active = S.activeDailyRun<GridState>(user.id, "cricket-grid", day);
    if (active) return { runId: active.id, grid: P.makeGrid(active.seed), ...gridView(active.state), data: provenance() };
  }
  const seed = (req as Request & { arcadeRoomSeed?: string }).arcadeRoomSeed ?? (mode === "daily" ? `grid:daily:${day}` : newSeed("grid"));
  const run = S.createRun<GridState>(user?.id ?? null, "cricket-grid", mode, seed, mode === "daily" ? day : null, { filled: Array(9).fill(null), attemptsLeft: P.GRID_ATTEMPTS, used: [], rarity: Array(9).fill(null) });
  return { runId: run.id, grid: P.makeGrid(seed), ...gridView(run.state), data: provenance() };
}));
const gridView = (s: GridState) => ({ filled: s.filled.map((id) => (id ? { id, name: arcadePlayer(id)?.name ?? id } : null)), attemptsLeft: s.attemptsLeft, rarity: s.rarity });
const gridScore = (s: GridState) => s.filled.reduce((sum, id, i) => sum + (id ? 10 + Math.round(10 * (1 - (s.rarity[i] ?? 0.5))) : 0), 0);
function gridEnd(run: S.Run<GridState>, user: User) {
  const grid = P.makeGrid(run.seed);
  const score = gridScore(run.state);
  const cells = run.state.filled.filter(Boolean).length;
  run.status = "done"; run.score = score; S.saveRun(run);
  if (user && run.day) S.markDaily(user.id, "cricket-grid", run.day, score, P.GRID_ATTEMPTS - run.state.attemptsLeft, true, "grid-v1");
  const outcome = finish(user, { game: "cricket-grid", mode: run.mode, score, won: cells === 9, detail: { cells }, achievements: cells === 9 ? ["grid-master"] : [] });
  // Example answers for every cell, revealed only after the grid is closed.
  const examples = grid.rows.flatMap((r) => grid.cols.map((c) => P.cellAnswers(r.key, c.key).slice(0, 4).map((p) => p.name)));
  return { score, cells, examples, outcome };
}
router.post("/cricket-grid/:id/guess", wrap((req, _res, user) => {
  const { cell, playerId } = body(z.object({ cell: z.number().int().min(0).max(8), playerId: z.string().max(80) }), req);
  const run = ownRun<GridState>(String(req.params.id), user, "cricket-grid");
  if (run.status === "done") bad("run_finished");
  if (run.state.filled[cell]) bad("cell_filled");
  if (run.state.used.includes(playerId)) bad("player_already_used");
  if (!arcadePlayer(playerId)) bad("unknown_player");
  const grid = P.makeGrid(run.seed);
  const correct = P.gradeGridCell(grid, cell, playerId);
  run.state.attemptsLeft--;
  if (correct) {
    run.state.filled[cell] = playerId; run.state.used.push(playerId);
    if (run.day) { S.recordGridPick(run.day, cell, playerId); run.state.rarity[cell] = S.gridRarity(run.day, cell, playerId); }
  }
  const done = run.state.attemptsLeft <= 0 || run.state.filled.every(Boolean);
  if (done) return { correct, done, ...gridView(run.state), ...gridEnd(run, user) };
  S.saveRun(run);
  return { correct, done, ...gridView(run.state) };
}));
router.post("/cricket-grid/:id/finish", wrap((req, _res, user) => {
  const run = ownRun<GridState>(String(req.params.id), user, "cricket-grid");
  if (run.status === "done") bad("run_finished");
  return { done: true, ...gridView(run.state), ...gridEnd(run, user) };
}));

/* ─── IPL Time Machine ────────────────────────────────────────────────────── */

type TmState = { season: number; answers: Record<string, string> };
router.get("/time-machine/chapters", wrap(() => ({ seasons: P.tmSeasons(), data: provenance() })));
router.post("/time-machine/start", wrap((req, _res, user) => {
  const { season } = body(z.object({ season: z.number().int().min(2008).max(2100) }), req);
  if (!P.tmSeasons().includes(season)) bad("unknown_season");
  const qs = P.timeMachineChapter(season);
  const run = S.createRun<TmState>(user?.id ?? null, "time-machine", String(season), `tm|${season}`, null, { season, answers: {} });
  return { runId: run.id, season, questions: qs.map(P.publicTm), data: provenance() };
}));
router.post("/time-machine/:id/answer", wrap((req, _res, user) => {
  const { questionId, option } = body(z.object({ questionId: z.string().max(80), option: z.string().max(80) }), req);
  const run = ownRun<TmState>(String(req.params.id), user, "time-machine");
  if (run.status === "done") bad("run_finished");
  const qs = P.timeMachineChapter(run.state.season);
  const q = qs.find((x) => x.id === questionId) ?? bad("unknown_question");
  if (run.state.answers[q.id]) bad("already_answered");
  run.state.answers[q.id] = option;
  const correct = option === q.answer;
  const done = Object.keys(run.state.answers).length >= qs.length;
  const score = qs.filter((x) => run.state.answers[x.id] === x.answer).length;
  run.score = score;
  let outcome = null;
  if (done) {
    run.status = "done";
    const perfect = score === qs.length;
    const priorPerfect = user ? S.countResults(user.id, "time-machine", (d) => d.perfect === true && d.season !== run.state.season) : 0;
    outcome = finish(user, { game: "time-machine", mode: String(run.state.season), score: score * 20, won: score >= 3, detail: { season: run.state.season, perfect }, achievements: perfect && priorPerfect >= 4 ? ["cricket-historian"] : [] });
  }
  S.saveRun(run);
  return { correct, answer: q.answer, fact: q.fact, score, total: qs.length, done, unlocksNext: done && score >= 3, outcome };
}));

/* ─── Predict the Next Ball ───────────────────────────────────────────────── */

type NbState = { mode: P.NbMode; round: number; points: number; correct: number };
router.post("/next-ball/start", wrap((req, _res, user) => {
  const { mode } = body(z.object({ mode: z.enum(["quick", "death", "powerplay", "chases", "daily"]) }), req);
  const day = dailyKey();
  if (mode === "daily" && user) {
    const done = S.dailyRecord(user.id, "next-ball", day);
    if (done?.completed) return { alreadyCompleted: true, day, score: done.score };
    const active = S.activeDailyRun<NbState>(user.id, "next-ball", day);
    if (active) return { runId: active.id, ...active.state, question: P.nbQuestion(active.seed, mode, active.state.round), rounds: P.NB_ROUNDS, outcomes: P.NB_OUTCOMES, data: provenance() };
  }
  const seed = mode === "daily" ? `nb:daily:${day}` : newSeed("nb");
  const run = S.createRun<NbState>(user?.id ?? null, "next-ball", mode, seed, mode === "daily" ? day : null, { mode, round: 0, points: 0, correct: 0 });
  return { runId: run.id, mode, modeLabel: P.NB_MODES[mode], round: 0, points: 0, correct: 0, question: P.nbQuestion(seed, mode, 0), rounds: P.NB_ROUNDS, outcomes: P.NB_OUTCOMES, data: provenance() };
}));
router.post("/next-ball/:id/guess", wrap((req, _res, user) => {
  const { guess } = body(z.object({ guess: z.enum(["dot", "single", "twothree", "four", "six", "wicket", "extra"]) }), req);
  const run = ownRun<NbState>(String(req.params.id), user, "next-ball");
  if (run.status === "done") bad("run_finished");
  const g = P.gradeNb(run.seed, run.state.mode, run.state.round, guess);
  run.state = { ...run.state, round: run.state.round + 1, points: run.state.points + g.points, correct: run.state.correct + Number(g.correct) };
  const done = run.state.round >= P.NB_ROUNDS;
  run.score = run.state.points;
  let outcome = null;
  if (done) {
    run.status = "done";
    if (user && run.day) S.markDaily(user.id, "next-ball", run.day, run.state.points, P.NB_ROUNDS, true, "nb-v1");
    outcome = finish(user, { game: "next-ball", mode: run.mode, score: run.state.points, won: run.state.correct >= 5, detail: { correct: run.state.correct } });
  }
  S.saveRun(run);
  return { ...g, total: run.state.points, correctCount: run.state.correct, done, next: done ? null : P.nbQuestion(run.seed, run.state.mode, run.state.round), outcome };
}));

/* ─── Scout the Hidden Gem ────────────────────────────────────────────────── */

const GEM_PUBLIC = (g: P.GemProblem) => ({ ...g, candidates: g.candidates.map(({ id, name, country, team, priceCr, balls, rawRate, rawWktRate, overBudget, seasons }) => ({ id, name, country, team, priceCr, balls, rawRate, rawWktRate, overBudget, seasons })) });
router.post("/scout-gem/start", wrap((_req, _res, user) => {
  let seed = newSeed("gem"), problem = P.gemProblem(seed);
  for (let i = 0; !problem && i < 5; i++) { seed = newSeed("gem"); problem = P.gemProblem(seed); }
  if (!problem) bad("not_enough_verified_candidates");
  const run = S.createRun(user?.id ?? null, "scout-gem", problem!.brief.key, seed, null, {});
  return { runId: run.id, problem: GEM_PUBLIC(problem!), reasons: P.GEM_REASONS, data: provenance() };
}));
router.post("/scout-gem/:id/answer", wrap((req, _res, user) => {
  const { pickId, reasons } = body(z.object({ pickId: z.string().max(80), reasons: z.array(z.enum(["phase", "value", "sample", "budget"])).max(4) }), req);
  const run = ownRun(String(req.params.id), user, "scout-gem");
  if (run.status === "done") bad("run_finished");
  const problem = P.gemProblem(run.seed)!;
  const g = P.gradeGem(problem, pickId, reasons) ?? bad("unknown_candidate");
  run.status = "done"; run.score = g.points; S.saveRun(run);
  const outcome = finish(user, { game: "scout-gem", mode: run.mode, score: g.points, won: g.tied.includes(pickId) });
  return { ...g, candidates: problem.candidates, league: problem.league, outcome };
}));

/* ─── Simulation sessions (seed issued here, replay-validated on submit) ──── */

const SIM_GAMES = ["cup-chase", "hand-cricket", "super-over", "drs", "captains-call", "auction-room"] as const;
type SimState = { params: Record<string, unknown>; matches?: { winner: string; personality: string }[]; auction?: AU.AuctionState; lastSubmission?: { key:string; response:Record<string,unknown> } };
router.post("/session/start", wrap((req, _res, user) => {
  const b = body(z.object({ game: z.enum(SIM_GAMES), mode: z.string().max(30), params: z.record(z.string(), z.unknown()).optional() }), req);
  const { game, mode } = b;
  const params: Record<string, unknown> = b.params ?? {};
  const seed = (req as Request & { arcadeRoomSeed?: string }).arcadeRoomSeed ?? newSeed(game);
  if(game==="hand-cricket")z.enum(["quick","best-of-three","tournament"]).parse(mode);
  if(game==="cup-chase")z.enum(["classic","easy","medium","hard"]).parse(mode);
  if(game==="super-over"){z.enum(["easy","balanced","impossible","custom"]).parse(mode);if(mode==="custom")z.number().int().min(1).max(36).parse(params.target);}
  const state: SimState = { params };
  if (game === "auction-room") {
    const m = z.enum(["quick", "full", "rebuild", "historical"]).parse(mode);
    const team = z.string().regex(/^[A-Z]{2,4}$/).parse(params.team ?? "CSK");
    const { lots, start, note, retained } = Q.auctionLots(m, team);
    state.auction = AU.newAuction(seed, m, team, lots, start);
    state.params = { ...params, note, retained: retained ?? [] };
  }
  if (game === "captains-call" && !captain.SCENARIOS.some((s) => s.id === params.scenario)) bad("unknown_scenario");
  const run = S.createRun<SimState>(user?.id ?? null, game, mode, seed, null, state);
  return { runId: run.id, seed, auction: state.auction ?? null, note: state.params.note ?? null, retained: state.params.retained ?? [], baseRates: game === "captains-call" ? P.phaseBaseRates() : undefined };
}));

const handPayload = z.object({ personality: z.enum(["rookie", "pattern", "aggressive", "expert"]), overs: z.union([z.literal(1), z.literal(2), z.literal(5)]), batFirst: z.boolean(), picks: z.array(z.number().int().min(1).max(6)).max(80), matchNo:z.number().int().nonnegative().optional() });
router.post("/session/:id/submit", wrap((req, _res, user) => {
  const run = S.getRun<SimState>(String(req.params.id));
  if (!run || (run.userId && run.userId !== user?.id) || !(SIM_GAMES as readonly string[]).includes(run.game)) throw new Error("not_found");
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const submissionKey=createHash("sha256").update(JSON.stringify(raw)).digest("hex");
  if(run.state.lastSubmission?.key===submissionKey)return run.state.lastSubmission.response;
  if (run.status === "done") bad("run_finished");
  const game = run.game as GameId;
  let score = 0, won = false, close = true;
  const achievements: string[] = [];
  let detail: Record<string, unknown> = {};

  if (game === "hand-cricket") {
    const p = handPayload.parse(raw);
    const k = run.state.matches?.length ?? 0;
    if(p.matchNo!=null&&p.matchNo!==k)bad("match_changed_retry");
    if (run.mode === "tournament" && p.personality !== hand.TOURNAMENT[k]) bad("wrong_tournament_opponent");
    const m = hand.replayHandMatch(`${run.seed}|m${k}`, p.personality, p.overs, p.batFirst, p.picks);
    if (!m.result) bad("match_not_finished");
    const matches = [...(run.state.matches ?? []), { winner: m.result!.winner, personality: p.personality }];
    run.state.matches = matches;
    const wins = matches.filter((x) => x.winner === "player").length, losses = matches.filter((x) => x.winner === "computer").length;
    if (run.mode === "best-of-three") close = wins >= 2 || losses >= 2 || matches.length >= 5;
    else if (run.mode === "tournament") close = m.result!.winner !== "player" || matches.length >= hand.TOURNAMENT.length;
    won = run.mode === "quick" ? m.result!.winner === "player" : run.mode === "best-of-three" ? wins >= 2 : wins === hand.TOURNAMENT.length;
    const margin = m.result!.winner === "player" ? (m.playerBatFirst ? m.target! - 1 - m.runs : (m.maxWickets - m.wickets) * 10) : 0;
    score = run.mode === "quick" ? margin : wins * 50 + (won ? 100 : 0);
    if (run.mode === "tournament" && won) achievements.push("schoolyard-champion");
    detail = { result: m.result, matches: matches.length, wins };
    if (!close) { const response={ validated: true, seriesOver: false, result: m.result, wins, losses, nextOpponent: run.mode === "tournament" ? hand.TOURNAMENT[matches.length] : p.personality };run.state.lastSubmission={key:submissionKey,response};S.saveRun(run);return response; }
  } else if (game === "super-over") {
    const p = z.object({ shots: z.array(z.enum(["block", "push", "drive", "loft", "ramp", "slog"])).max(30) }).parse(raw);
    const mode = z.enum(["easy", "balanced", "impossible", "custom"]).parse(run.mode);
    const target = typeof run.state.params.target === "number" ? run.state.params.target : undefined;
    const s = superOver.replaySuperOver(run.seed, mode, target, p.shots);
    if (!s.result) bad("over_not_finished");
    won = s.result === "won";
    const lastLegal = s.balls.filter((b) => b.legal).length;
    score = won ? 100 + (s.runs - s.target) * 5 + (6 - lastLegal) * 15 : s.result === "tied" ? 40 : Math.round((s.runs / s.target) * 30);
    if (won && lastLegal === 6 && s.balls.at(-1)?.legal) achievements.push("last-ball-hero");
    detail = { runs: s.runs, target: s.target, wickets: s.wickets, result: s.result };
  } else if (game === "cup-chase" && run.mode === "classic") {
    const p = z.object({ swings: z.array(z.number().min(0).max(6000).nullable()).min(1).max(cup.CLASSIC_LIMIT) }).parse(raw);
    const r = cup.replayClassic(run.seed, p.swings);
    if (!r.finished || r.balls !== p.swings.length) bad("innings_not_finished");
    score = r.runs; won = r.runs >= 24;
    detail = { runs: r.runs, balls: r.balls, mode: "classic" };
  } else if (game === "cup-chase") {
    const input = z.object({ swingMs: z.number().min(0).max(6000).nullable(), aim: z.enum(["off", "straight", "leg"]), loft: z.boolean() });
    const p = z.object({ rounds: z.array(z.array(input).max(cup.BALLS_PER_ROUND)).max(3) }).parse(raw);
    const difficulty = z.enum(["easy", "medium", "hard"]).parse(run.mode);
    const r = cup.replayCup(run.seed, difficulty, p.rounds);
    if (!r.rounds.length || r.rounds.at(-1)!.status === "playing" || (r.rounds.at(-1)!.status === "won" && r.rounds.length < 3)) bad("cup_not_finished");
    won = r.roundsWon === 3;
    score = r.roundsWon * 100 + r.runs;
    if (r.lastBallWin) achievements.push("last-ball-hero");
    detail = { roundsWon: r.roundsWon, runs: r.runs, difficulty };
  } else if (game === "drs") {
    const p = z.object({ calls: z.array(z.object({ decision: z.enum(["OUT", "NOT OUT"]), reason: z.string().max(20).nullable() })).length(drs.DRS_ROUNDS) }).parse(raw);
    const results = p.calls.map((c, i) => drs.scoreDrs(drs.drsScenario(run.seed, i, drs.drsLevel(i)), c.decision, c.reason));
    const correct = results.filter((r) => r.correct).length;
    score = results.reduce((s, r) => s + r.points, 0);
    won = correct >= 7;
    if (correct === drs.DRS_ROUNDS) achievements.push("umpires-eye");
    detail = { correct };
  } else if (game === "captains-call") {
    const p = z.object({ bowler: z.string().max(4), plan: z.enum(["yorkers", "wide_line", "slower_balls", "bouncers", "attack_stumps"]), field: z.enum(["attacking", "balanced", "defensive"]) }).parse(raw);
    const scenario = captain.SCENARIOS.find((s) => s.id === run.state.params.scenario)!;
    if (!scenario.bowlers.some((b) => b.id === p.bowler)) bad("unknown_bowler");
    const r = captain.playCall(P.phaseBaseRates() as unknown as captain.BaseRates, scenario, p, run.seed);
    const best = r.best.choice.bowler === p.bowler && r.best.choice.plan === p.plan && r.best.choice.field === p.field;
    score = r.points; won = r.outcome.success;
    const priorBest = user ? S.countResults(user.id, "captains-call", (d) => d.best === true) : 0;
    if (best && priorBest >= 2) achievements.push("tactical-genius");
    detail = { scenario: scenario.id, best };
  } else if (game === "auction-room") {
    const p = z.object({ humanMaxes: z.array(z.number().min(0).max(100).nullable()).max(200) }).parse(raw);
    const start = run.state.auction!;
    const human = start.bidders.find((b) => b.human)!;
    const end = AU.replayAuction(start, p.humanMaxes);
    if (!end.done) bad("auction_not_finished");
    const me = end.bidders.find((b) => b.code === human.code)!;
    const v = AU.squadValid(end, me.code);
    // Score what was bought in the room; a Rebuild's retained core came free and does not count.
    const bought = me.squad.filter((id) => !human.squad.includes(id));
    const rated = Q.squadRatingFromIds(bought);
    score = v.valid ? rated.rating : 0;
    won = v.valid;
    if (v.valid && rated.rating >= 80) achievements.push("auction-mastermind");
    detail = { signed: me.squad.length, purseLeft: me.purseCr, valid: v.valid, issues: v.issues, rating: rated.rating };
  }

  run.status = "done"; run.score = score; S.saveRun(run);
  const outcome = finish(user, { game, mode: run.mode, score, won, detail, achievements });
  const response={ validated: true, seriesOver: true, score, won, detail, outcome };
  run.state.lastSubmission={key:submissionKey,response};S.saveRun(run);return response;
}));

/* ─── Build Your XI ───────────────────────────────────────────────────────── */

router.get("/xi/pool", wrap((req) => {
  const season = req.query.season ? Number(req.query.season) : null;
  if (season) return { season, players: Q.seasonPool(season), rules: Q.XI_RULES, data: provenance() };
  return { players: Q.squadPool().players.filter((p) => p.evidence || p.team), budgetCr: Q.XI_BUDGET_CR, budgetNote: "₹100 Cr is a CRICFIELD game budget, not an IPL rule. Costs are 2026 contract prices; uncontracted players cost their model market price.", rules: Q.XI_RULES, snapshot: Q.snapshotMeta(), data: provenance() };
}));
const xiBody = z.object({ ids: z.array(z.string().max(80)).max(15), mode: z.enum(["open", "budget", "rebuild", "season"]), team: z.string().max(5).optional(), season: z.number().int().optional() });
router.post("/xi/evaluate", wrap((req) => {
  const b = body(xiBody, req);
  return b.mode === "season" ? Q.evaluateSeasonXi(b.season ?? bad("season_required"), b.ids) : Q.evaluateXi(b.ids, b.mode, b.team);
}));
router.post("/xi/submit", wrap((req, _res, user) => {
  const b = body(xiBody, req);
  const report = b.mode === "season" ? Q.evaluateSeasonXi(b.season ?? bad("season_required"), b.ids) : Q.evaluateXi(b.ids, b.mode, b.team);
  if (!report.valid) return { report, outcome: null };
  const outcome = finish(user, { game: "build-your-xi", mode: b.mode, score: report.rating, won: report.rating >= 70, detail: { mode: b.mode }, achievements: report.rating >= 85 ? ["perfect-xi"] : [] });
  return { report, outcome };
}));

/* ─── Franchise GM ────────────────────────────────────────────────────────── */

router.get("/gm/setup", wrap(() => ({ franchises: Q.gmFranchises(), freeAgents: Q.gmFreeAgents().slice(0, 60), purseCr: Q.GM_PURSE_CR, maxRetain: Q.GM_MAX_RETAIN, provenance: Q.gmProvenance() })));
router.post("/gm/strength", wrap((req) => Q.teamStrength(body(z.object({ ids: z.array(z.string().max(80)).max(40) }), req).ids)));
router.post("/gm/trade", wrap((req) => {
  const b = body(z.object({ aiTeam: z.string().max(5), aiSquad: z.array(z.string().max(80)).max(40), give: z.array(z.string().max(80)).min(1).max(3), get: z.array(z.string().max(80)).min(1).max(3) }), req);
  return Q.evaluateTrade(b.aiTeam, b.aiSquad, b.give, b.get);
}));
router.post("/gm/season", wrap((req, _res, user) => {
  const b = body(z.object({ seed: z.string().max(80), team: z.string().max(5), squad: z.array(z.string().max(80)).min(12).max(25), approach: z.enum(["balanced", "aggressive", "conservative"]), rivals: z.record(z.string(), z.array(z.string().max(80)).max(30)), record: z.boolean().default(false) }), req);
  const issues = Q.validateGmSquad(b.team, b.squad, b.rivals);
  if (issues.length) bad(issues.join(","));
  const season = Q.simulateGmSeason(b.seed, b.team, b.squad, b.approach, b.rivals);
  // One recorded result per career seed: re-simulating the same career cannot farm XP.
  const already = user ? S.countResults(user.id, "franchise-gm", (d) => d.seed === b.seed) > 0 : false;
  const outcome = b.record && !already ? finish(user, { game: "franchise-gm", mode: b.team, score: season.seasonPoints, won: season.champion === b.team, detail: { finish: season.userFinish, seed: b.seed } }) : null;
  return { season, outcome };
}));

/* ─── Passport, leaderboards, saves ───────────────────────────────────────── */

router.get("/passport", wrap((_req, res, user) => { if (!user) { res.status(401).json({ error: "sign_in_required" }); return; } return S.passport(user.id); }));
router.post("/passport/profile", wrap((req, res, user) => {
  if (!user) { res.status(401).json({ error: "sign_in_required" }); return; }
  const b = body(z.object({ handle: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9 _-]+$/).nullable().optional(), showOnBoards: z.boolean().optional(), favouriteTeam: z.string().regex(/^[A-Z]{2,4}$/).nullable().optional() }), req);
  S.updateProfile(user.id, b);
  return S.passport(user.id);
}));
router.get("/leaderboard/:game", wrap((req, _res, user) => {
  const game = String(req.params.game);
  if (!GAMES.some((g) => g.id === game)) throw new Error("not_found");
  const period = z.enum(["daily", "weekly", "all"]).catch("weekly").parse(req.query.period);
  const team = typeof req.query.team === "string" && /^[A-Z]{2,4}$/.test(req.query.team) ? req.query.team : null;
  return { ...S.leaderboard(game, period, user?.id ?? null, team), scoreLabel: GAMES.find((g) => g.id === game)!.scoreLabel };
}));
const saveGames = z.enum(["franchise-gm", "build-your-xi", "auction-room"]);
router.get("/saves/:game", wrap((req, res, user) => { if (!user) { res.status(401).json({ error: "sign_in_required" }); return; } return S.getSaves(user.id, saveGames.parse(req.params.game)); }));
router.put("/saves/:game/:slot", wrap((req, res, user) => {
  if (!user) { res.status(401).json({ error: "sign_in_required" }); return; }
  const slot = z.string().regex(/^[a-z0-9-]{1,20}$/).parse(req.params.slot);
  S.putSave(user.id, saveGames.parse(req.params.game), slot, req.body);
  return { ok: true };
}));
router.delete("/saves/:game/:slot", wrap((req, res, user) => { if (!user) { res.status(401).json({ error: "sign_in_required" }); return; } S.deleteSave(user.id, saveGames.parse(req.params.game), String(req.params.slot)); return { ok: true }; }));

const roomInput = z.object({ game: z.string().max(30), name: z.string().min(1).max(24) });
router.post("/rooms", wrap(req => { const b=body(roomInput,req);return Rooms.create(b.game,b.name); }));
router.post("/rooms/join", wrap(req => {const b=body(roomInput.extend({code:z.string().regex(/^[A-Fa-f0-9]{8}$/)}),req);return Rooms.join(b.code,b.game,b.name);}));
router.get("/rooms/:code", wrap(req => {const token=String(req.query.token??"");return Rooms.view(Rooms.member(String(req.params.code),token),token);}));
router.post("/rooms/:code/leave", wrap(req => {const b=body(z.object({token:z.string().uuid()}),req);const r=Rooms.member(String(req.params.code),b.token);if(r.started){try{Match.action(String(req.params.code),b.token,{type:"forfeit"});}catch(e){if(!(e instanceof Error)||e.message!=="bad_request:match_finished")throw e;}}return Rooms.leave(String(req.params.code),b.token);}));
router.post("/rooms/:code/start", wrap(req => {const b=body(z.object({token:z.string().uuid()}),req);return Rooms.start(String(req.params.code),b.token);}));
router.get("/draft/pool", wrap(() => ({ players: Draft.pool(), source: Q.snapshotMeta() })));
router.post("/draft/create", wrap(req => {const b=body(z.object({name:z.string().max(24),solo:z.boolean()}),req);return Draft.create(b.name,b.solo);}));
router.post("/draft/join", wrap(req => {const b=body(z.object({name:z.string().max(24),code:z.string().regex(/^[A-Fa-f0-9]{8}$/)}),req);return Draft.join(b.code,b.name);}));
router.get("/draft/:code", wrap(req => Draft.read(String(req.params.code),String(req.query.token??""))));
router.post("/draft/:code/action", wrap(req => {const b=body(z.object({token:z.string().uuid(),type:z.enum(["setup","start","bid","pause","resume","nominate","finish"]),team:z.string().max(4).optional(),retained:z.array(z.string().max(100)).max(6).optional(),lotId:z.string().max(100).optional(),expectedLot:z.string().max(100).optional(),expectedPrice:z.number().finite().nonnegative().optional(),rules:z.object({purse:z.number().int(),slots:z.number().int(),minSlots:z.number().int(),maxOverseas:z.number().int(),seconds:z.number().int()}).optional()}),req);return Draft.action(String(req.params.code),b.token,b);}));
router.post("/match/bot", wrap(req => {const b=body(z.object({game:z.enum(["cricket-grid","guess-cricketer"]),name:z.string().max(24)}),req);return Match.bot(b.game,b.name);}));
router.get("/match/:code", wrap(req => Match.read(String(req.params.code),String(req.query.token??""))));
router.post("/match/:code/action", wrap(req=>{const b=body(z.object({token:z.string().uuid(),type:z.enum(["forfeit","guess","hint","hand","shot","delivery","bowl","swing"]),value:z.union([z.string().max(30),z.number().int()]).optional(),playerId:z.string().max(100).optional(),cell:z.number().int().min(0).max(8).optional(),round:z.number().int().nonnegative().optional(),move:z.number().int().nonnegative().optional(),swingMs:z.number().finite().min(0).max(6000).optional(),aim:z.enum(["off","straight","leg"]).optional()}),req);return Match.action(String(req.params.code),b.token,b);}));
export default router;
