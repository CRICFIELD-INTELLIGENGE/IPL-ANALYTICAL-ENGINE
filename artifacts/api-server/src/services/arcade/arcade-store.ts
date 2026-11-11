// Arcade persistence: lives in the existing platform SQLite file (services/platform/store.ts), keyed by the
// Supabase user id that verifiedUser() returns. No second auth system. Only server-validated results are stored.

import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ACHIEVEMENTS, DAILY_SCORED_SESSIONS_PER_GAME, DAILY_XP_CAP_PER_GAME, dailyKey, levelFor, xpForSession, type GameId } from "@workspace/arcade-rules";
import { platform } from "../platform/store";

let ready: DatabaseSync | null = null;
function db(): DatabaseSync {
  const d = platform().db;
  if (ready === d) return d;
  d.exec(`
    CREATE TABLE IF NOT EXISTS arcade_runs(id TEXT PRIMARY KEY, user_id TEXT, game TEXT NOT NULL, mode TEXT NOT NULL, seed TEXT NOT NULL, day TEXT, state TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', score INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS arcade_runs_user ON arcade_runs(user_id, game, status);
    CREATE TABLE IF NOT EXISTS arcade_results(id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, game TEXT NOT NULL, mode TEXT NOT NULL, score INTEGER NOT NULL, won INTEGER NOT NULL, day TEXT NOT NULL, week TEXT NOT NULL, xp INTEGER NOT NULL, detail TEXT, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS arcade_results_board ON arcade_results(game, day);
    CREATE INDEX IF NOT EXISTS arcade_results_user ON arcade_results(user_id, created);
    CREATE TABLE IF NOT EXISTS arcade_profile(user_id TEXT PRIMARY KEY, xp INTEGER NOT NULL DEFAULT 0, games_played INTEGER NOT NULL DEFAULT 0, best_streak INTEGER NOT NULL DEFAULT 0, handle TEXT, show_on_boards INTEGER NOT NULL DEFAULT 1, favourite_team TEXT, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS arcade_achievements(user_id TEXT NOT NULL, code TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(user_id, code));
    CREATE TABLE IF NOT EXISTS arcade_daily(user_id TEXT NOT NULL, game TEXT NOT NULL, day TEXT NOT NULL, score INTEGER NOT NULL, attempts INTEGER NOT NULL, completed INTEGER NOT NULL, version TEXT NOT NULL, PRIMARY KEY(user_id, game, day));
    CREATE TABLE IF NOT EXISTS arcade_saves(user_id TEXT NOT NULL, game TEXT NOT NULL, slot TEXT NOT NULL, state TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY(user_id, game, slot));
    CREATE TABLE IF NOT EXISTS arcade_grid_picks(day TEXT NOT NULL, cell INTEGER NOT NULL, player_id TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY(day, cell, player_id));
  `);
  ready = d;
  return d;
}
const tx = <T>(run: () => T): T => platform().transaction(run);

/** ISO week key, e.g. 2026-W45, computed on the IST calendar day. */
export function weekKey(day = dailyKey()): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const wk = 1 + Math.round(((d.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}

/* ─── Runs: server-held game state for server-graded games ─────────────────── */

export interface Run<S> { id: string; userId: string | null; game: string; mode: string; seed: string; day: string | null; state: S; status: "active" | "done"; score: number }
const RUN_TTL = 24 * 3600_000;

export function createRun<S>(userId: string | null, game: string, mode: string, seed: string, day: string | null, state: S): Run<S> {
  const id = randomUUID(), now = Date.now();
  const d = db();
  d.prepare("DELETE FROM arcade_runs WHERE updated < ?").run(now - RUN_TTL);
  d.prepare("INSERT INTO arcade_runs(id,user_id,game,mode,seed,day,state,created,updated) VALUES(?,?,?,?,?,?,?,?,?)").run(id, userId, game, mode, seed, day, JSON.stringify(state), now, now);
  return { id, userId, game, mode, seed, day, state, status: "active", score: 0 };
}
export function getRun<S>(id: string): Run<S> | null {
  const r = db().prepare("SELECT * FROM arcade_runs WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return { id: String(r.id), userId: (r.user_id as string) ?? null, game: String(r.game), mode: String(r.mode), seed: String(r.seed), day: (r.day as string) ?? null, state: JSON.parse(String(r.state)) as S, status: r.status as "active" | "done", score: Number(r.score) };
}
export function saveRun<S>(run: Run<S>) {
  db().prepare("UPDATE arcade_runs SET state=?, status=?, score=?, updated=? WHERE id=?").run(JSON.stringify(run.state), run.status, run.score, Date.now(), run.id);
}
export function activeDailyRun<S>(userId: string, game: string, day: string): Run<S> | null {
  const r = db().prepare("SELECT id FROM arcade_runs WHERE user_id=? AND game=? AND day=? AND status='active' ORDER BY created DESC LIMIT 1").get(userId, game, day) as { id: string } | undefined;
  return r ? getRun<S>(r.id) : null;
}

/* ─── Daily attempts ──────────────────────────────────────────────────────── */

export function dailyRecord(userId: string, game: string, day: string) {
  return db().prepare("SELECT score, attempts, completed, version FROM arcade_daily WHERE user_id=? AND game=? AND day=?").get(userId, game, day) as { score: number; attempts: number; completed: number; version: string } | undefined;
}
export function markDaily(userId: string, game: string, day: string, score: number, attempts: number, completed: boolean, version: string) {
  db().prepare("INSERT INTO arcade_daily VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,game,day) DO UPDATE SET score=excluded.score, attempts=excluded.attempts, completed=MAX(completed, excluded.completed)").run(userId, game, day, score, attempts, Number(completed), version);
}
/** Consecutive IST days, ending today or yesterday, with any completed daily challenge. */
export function dailyStreak(userId: string): number {
  const days = new Set((db().prepare("SELECT DISTINCT day FROM arcade_daily WHERE user_id=? AND completed=1").all(userId) as { day: string }[]).map((r) => r.day));
  let streak = 0;
  const today = dailyKey();
  let t = Date.parse(`${today}T00:00:00Z`);
  if (!days.has(today)) t -= 86400000;
  while (days.has(new Date(t).toISOString().slice(0, 10))) { streak++; t -= 86400000; }
  return streak;
}

/* ─── Results, XP, achievements ───────────────────────────────────────────── */

export interface ResultInput { game: GameId; mode: string; score: number; won: boolean; detail?: Record<string, unknown>; achievements?: string[]; streak?: number }
export interface ResultOutcome { recorded: boolean; xp: number; capped: boolean; newAchievements: string[]; level: number; totalXp: number }

export function recordResult(userId: string, input: ResultInput): ResultOutcome {
  return tx(() => {
    const d = db(), day = dailyKey(), now = Date.now();
    const today = d.prepare("SELECT count(*) n, coalesce(sum(xp),0) xp FROM arcade_results WHERE user_id=? AND game=? AND day=?").get(userId, input.game, day) as { n: number; xp: number };
    const capped = Number(today.n) >= DAILY_SCORED_SESSIONS_PER_GAME;
    const xp = capped ? 0 : Math.max(0, Math.min(xpForSession(input.game, input.score, input.won), DAILY_XP_CAP_PER_GAME - Number(today.xp)));
    d.prepare("INSERT INTO arcade_results(user_id,game,mode,score,won,day,week,xp,detail,created) VALUES(?,?,?,?,?,?,?,?,?,?)").run(userId, input.game, input.mode, Math.round(input.score), Number(input.won), day, weekKey(day), xp, JSON.stringify(input.detail ?? {}), now);
    d.prepare("INSERT INTO arcade_profile(user_id,xp,games_played,best_streak,updated) VALUES(?,?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET xp=xp+excluded.xp, games_played=games_played+1, best_streak=MAX(best_streak, excluded.best_streak), updated=excluded.updated").run(userId, xp, input.streak ?? 0, now);
    const newAchievements: string[] = [];
    for (const code of input.achievements ?? []) {
      if (!ACHIEVEMENTS.some((a) => a.code === code)) continue;
      const r = d.prepare("INSERT OR IGNORE INTO arcade_achievements VALUES(?,?,?)").run(userId, code, now);
      if (Number(r.changes)) newAchievements.push(code);
    }
    const total = Number((d.prepare("SELECT xp FROM arcade_profile WHERE user_id=?").get(userId) as { xp: number }).xp);
    return { recorded: true, xp, capped, newAchievements, level: levelFor(total), totalXp: total };
  });
}

/** Count of results of a game with a detail flag — used by cumulative achievements (e.g. five perfect chapters). */
export function countResults(userId: string, game: string, where: (detail: Record<string, unknown>) => boolean): number {
  return (db().prepare("SELECT detail FROM arcade_results WHERE user_id=? AND game=?").all(userId, game) as { detail: string }[]).filter((r) => { try { return where(JSON.parse(r.detail)); } catch { return false; } }).length;
}

export function passport(userId: string) {
  const d = db();
  const p = (d.prepare("SELECT * FROM arcade_profile WHERE user_id=?").get(userId) as Record<string, unknown> | undefined) ?? { xp: 0, games_played: 0, best_streak: 0, handle: null, show_on_boards: 1, favourite_team: null };
  const xp = Number(p.xp);
  const achievements = d.prepare("SELECT code, at FROM arcade_achievements WHERE user_id=? ORDER BY at").all(userId) as { code: string; at: number }[];
  const recent = d.prepare("SELECT game, mode, score, won, created FROM arcade_results WHERE user_id=? ORDER BY created DESC LIMIT 8").all(userId);
  const bests = d.prepare("SELECT game, max(score) best, count(*) plays FROM arcade_results WHERE user_id=? GROUP BY game").all(userId);
  const daily = d.prepare("SELECT game, score, completed FROM arcade_daily WHERE user_id=? AND day=?").all(userId, dailyKey());
  const saves = d.prepare("SELECT game, slot, updated FROM arcade_saves WHERE user_id=? ORDER BY updated DESC").all(userId);
  return {
    xp, level: levelFor(xp), gamesPlayed: Number(p.games_played), bestStreak: Number(p.best_streak), dailyStreak: dailyStreak(userId),
    handle: (p.handle as string) ?? null, showOnBoards: Boolean(p.show_on_boards), favouriteTeam: (p.favourite_team as string) ?? null,
    achievements, recent, bests, daily, saves,
  };
}
export function updateProfile(userId: string, patch: { handle?: string | null; showOnBoards?: boolean; favouriteTeam?: string | null }) {
  const d = db();
  d.prepare("INSERT OR IGNORE INTO arcade_profile(user_id,updated) VALUES(?,?)").run(userId, Date.now());
  if (patch.handle !== undefined) d.prepare("UPDATE arcade_profile SET handle=? WHERE user_id=?").run(patch.handle, userId);
  if (patch.showOnBoards !== undefined) d.prepare("UPDATE arcade_profile SET show_on_boards=? WHERE user_id=?").run(Number(patch.showOnBoards), userId);
  if (patch.favouriteTeam !== undefined) d.prepare("UPDATE arcade_profile SET favourite_team=? WHERE user_id=?").run(patch.favouriteTeam, userId);
}

/* ─── Leaderboards ────────────────────────────────────────────────────────── */

/** Public name: the player's chosen handle, else a stable pseudonym. Never an email or user id. */
const pseudonym = (userId: string) => `Fan-${createHash("sha256").update(`arcade|${userId}`).digest("hex").slice(0, 5).toUpperCase()}`;

export function leaderboard(game: string, period: "daily" | "weekly" | "all", userId: string | null, team?: string | null) {
  const d = db();
  const where = period === "daily" ? "AND r.day = ?" : period === "weekly" ? "AND r.week = ?" : "";
  const args: (string | number)[] = [game];
  if (period === "daily") args.push(dailyKey());
  if (period === "weekly") args.push(weekKey());
  const teamWhere = team ? "AND p.favourite_team = ?" : "";
  if (team) args.push(team);
  const rows = d.prepare(`SELECT r.user_id, max(r.score) score, count(*) plays FROM arcade_results r LEFT JOIN arcade_profile p ON p.user_id = r.user_id
    WHERE r.game = ? ${where} AND coalesce(p.show_on_boards, 1) = 1 ${teamWhere} GROUP BY r.user_id ORDER BY score DESC, min(r.created) ASC LIMIT 200`).all(...args) as { user_id: string; score: number; plays: number }[];
  const handles = new Map((d.prepare("SELECT user_id, handle FROM arcade_profile WHERE handle IS NOT NULL").all() as { user_id: string; handle: string }[]).map((r) => [r.user_id, r.handle]));
  const ranked = rows.map((r, i) => ({ rank: i + 1, name: handles.get(r.user_id) ?? pseudonym(r.user_id), score: r.score, plays: r.plays, you: r.user_id === userId }));
  return { game, period, team: team ?? null, top: ranked.slice(0, 20), you: ranked.find((r) => r.you) ?? null, entrants: ranked.length };
}

/* ─── Saves ───────────────────────────────────────────────────────────────── */

export const MAX_SAVE_BYTES = 95_000;
export function putSave(userId: string, game: string, slot: string, state: unknown) {
  const json = JSON.stringify(state);
  if (json.length > MAX_SAVE_BYTES) throw new Error("save_too_large");
  db().prepare("INSERT INTO arcade_saves VALUES(?,?,?,?,?) ON CONFLICT(user_id,game,slot) DO UPDATE SET state=excluded.state, updated=excluded.updated").run(userId, game, slot, json, Date.now());
}
export function getSaves(userId: string, game: string) {
  return (db().prepare("SELECT slot, state, updated FROM arcade_saves WHERE user_id=? AND game=? ORDER BY updated DESC").all(userId, game) as { slot: string; state: string; updated: number }[]).map((r) => ({ slot: r.slot, updated: r.updated, state: JSON.parse(r.state) }));
}
export function deleteSave(userId: string, game: string, slot: string) {
  db().prepare("DELETE FROM arcade_saves WHERE user_id=? AND game=? AND slot=?").run(userId, game, slot);
}

/* ─── Grid rarity ─────────────────────────────────────────────────────────── */

export function recordGridPick(day: string, cell: number, playerId: string) {
  db().prepare("INSERT INTO arcade_grid_picks VALUES(?,?,?,1) ON CONFLICT(day,cell,player_id) DO UPDATE SET n=n+1").run(day, cell, playerId);
}
/** Share of today's correct answers in this cell that picked this player (lower = rarer). Null until 5 picks exist. */
export function gridRarity(day: string, cell: number, playerId: string): number | null {
  const rows = db().prepare("SELECT player_id, n FROM arcade_grid_picks WHERE day=? AND cell=?").all(day, cell) as { player_id: string; n: number }[];
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (total < 5) return null;
  return (rows.find((r) => r.player_id === playerId)?.n ?? 0) / total;
}
