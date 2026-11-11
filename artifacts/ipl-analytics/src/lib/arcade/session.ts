// Simulation-game sessions: the server issues the seed, the browser plays with the shared rules, and the finished
// game is submitted for replay validation. If the server is unreachable the game still plays on a local seed,
// and the result is kept in this browser only.
import { api, ArcadeError, type ResultOutcome } from "./client";

export interface Session<T = Record<string, unknown>> { runId: string | null; seed: string; offline: boolean; extra: T }
export async function startSession<T = Record<string, unknown>>(game: string, mode: string, params: Record<string, unknown> = {}): Promise<Session<T>> {
  try {
    const r = await api<{ runId: string; seed: string } & T>("/session/start", { body: { game, mode, params } });
    return { runId: r.runId, seed: r.seed, offline: false, extra: r };
  } catch (e) {
    if (e instanceof ArcadeError && e.status === 0) return { runId: null, seed: `local:${game}:${Date.now()}:${Math.random().toString(36).slice(2)}`, offline: true, extra: {} as T };
    throw e;
  }
}
export interface Submitted { validated: boolean; seriesOver: boolean; score?: number; won?: boolean; detail?: Record<string, unknown>; outcome: ResultOutcome | null; [k: string]: unknown }
export async function submitSession(s: Session<unknown>, payload: unknown): Promise<Submitted | null> {
  if (!s.runId) return null;
  return api<Submitted>(`/session/${s.runId}/submit`, { body: payload });
}
