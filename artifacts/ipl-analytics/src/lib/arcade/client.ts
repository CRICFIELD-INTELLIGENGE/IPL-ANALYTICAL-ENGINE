// CRICFIELD Arcade — browser API client. Uses the site's existing Supabase session (no second auth system):
// signed-in players send their access token so the server can store validated progress.

import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { GAMES, type GameId } from "@workspace/arcade-rules";

export async function authHeader(): Promise<Record<string, string>> {
  if (!supabaseConfigured) return {};
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {};
  } catch {
    return {};
  }
}
export async function signedIn(): Promise<boolean> {
  return Boolean((await authHeader()).Authorization);
}

export class ArcadeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const FRIENDLY: Record<string, string> = {
  room_expired:
    "This room has expired or the host closed it. Create or join another room.",
  room_full:
    "All player seats in this room are occupied. Ask your friend for a different room code.",
  room_already_started:
    "This match has already started. Reconnect from the browser where you joined.",
  match_expired:
    "This match has expired. Head back to the lobby for another game.",
  match_finished: "This match has finished. Check the result below.",
  player_already_guessed: "You already tried that player. Choose someone else.",
  move_changed_retry:
    "Your previous move was received. Wait for the current game state, then try again.",
  round_changed:
    "The ball or turn has changed. Wait for the latest score, then try again.",
  bid_changed_retry:
    "Another franchise just bid. Check the new price before bidding again.",
  bid_breaks_budget_or_slots:
    "That bid exceeds your safe budget, squad size, or overseas limit.",
  retention_breaks_slot_reserve:
    "Those retentions leave too little purse to fill your minimum squad.",
  retention_breaks_overseas_cap:
    "The retained players exceed your overseas limit.",
  franchise_taken: "That franchise is already controlled by another player.",
  solo_room_is_private:
    "This is a solo bot game. Create a multiplayer room to invite friends.",

  run_finished: "That game has already finished.",
  sign_in_required: "Sign in to save Arcade progress.",
  arcade_unavailable:
    "The Arcade data service is warming up. Try again in a moment.",
  not_found: "That game session has expired. Start a new one.",
};

export async function api<T>(
  path: string,
  init?: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const aborted = () => controller.abort();
  if (init?.signal?.aborted)
    throw new DOMException("Request aborted", "AbortError");
  init?.signal?.addEventListener("abort", aborted, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, init?.timeoutMs ?? 20000);
  let rejectAbort: () => void = () => undefined;
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectAbort = () =>
      reject(new DOMException("Request aborted", "AbortError"));
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  try {
    if (
      init?.body &&
      [
        "/session/start",
        "/cricket-grid/start",
        "/guess-cricketer/start",
      ].includes(path)
    ) {
      try {
        const room = JSON.parse(
          sessionStorage.getItem("arcade-room") ?? "null",
        );
        const game =
          path === "/session/start"
            ? (init.body as { game?: string }).game
            : path.split("/")[1];
        if (room?.game === game)
          init = {
            ...init,
            body: {
              ...(init.body as object),
              roomCode: room.roomCode,
              roomToken: room.roomToken,
              ...(game === "cricket-grid" || game === "guess-cricketer"
                ? { mode: "practice" }
                : {}),
            },
          };
      } catch {
        /* Browser storage is optional. */
      }
    }
    const headers: Record<string, string> = {
      ...(await Promise.race([authHeader(), cancellation])),
    };
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await Promise.race([
      fetch(`/api/arcade${path}`, {
        method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
        headers,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      }),
      cancellation,
    ]);
    const raw = await Promise.race([res.text(), cancellation]);
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      /* Report a non-JSON service response below. */
    }
    if (!res.ok) {
      const code =
        (data as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
      throw new ArcadeError(
        FRIENDLY[code] ??
          (res.status === 400
            ? `That move was not accepted (${code}).`
            : FRIENDLY.arcade_unavailable),
        res.status,
      );
    }
    if (data === null)
      throw new ArcadeError(
        "The game service returned an invalid response. Please retry.",
        502,
      );
    return data as T;
  } catch (error) {
    if (timedOut)
      throw new ArcadeError(
        "The game service took too long to respond. Please retry.",
        408,
      );
    if ((error as Error).name === "AbortError") throw error;
    if (error instanceof ArcadeError) throw error;
    throw new ArcadeError(
      "The game service could not be reached. Please retry.",
      0,
    );
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener("abort", rejectAbort);
    init?.signal?.removeEventListener("abort", aborted);
  }
}

export interface ResultOutcome {
  recorded: boolean;
  xp: number;
  capped: boolean;
  newAchievements: string[];
  level: number;
  totalXp: number;
}
export interface Provenance {
  source: string;
  lastSeason: number;
  dataCutoff: string;
}

/* ─── Local, per-browser records (always available, including signed-out) ── */

const LS = "cricfield-arcade-v2";
interface LocalState {
  bests: Partial<Record<GameId, number>>;
  recent: { game: GameId; at: number }[];
  daily: Record<string, { score: number; at: number }>;
}
function readLocal(): LocalState {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? "null");
    if (raw && typeof raw === "object")
      return {
        bests: raw.bests ?? {},
        recent: Array.isArray(raw.recent) ? raw.recent : [],
        daily: raw.daily ?? {},
      };
  } catch {
    /* blocked or corrupt storage */
  }
  return { bests: {}, recent: [], daily: {} };
}
function writeLocal(s: LocalState) {
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {
    /* storage blocked: game still works */
  }
}
export const localRecords = readLocal;
/** Record a finished game in this browser. Returns true when it is a new personal best. */
export function recordLocal(
  game: GameId,
  score: number,
  dailyKey?: string,
): boolean {
  const s = readLocal();
  const best = s.bests[game];
  const isBest = best == null || score > best;
  if (isBest) s.bests[game] = score;
  s.recent = [
    { game, at: Date.now() },
    ...s.recent.filter((r) => r.game !== game),
  ].slice(0, 6);
  if (dailyKey) s.daily[`${game}:${dailyKey}`] = { score, at: Date.now() };
  writeLocal(s);
  return isBest;
}
export function touchRecent(game: GameId) {
  const s = readLocal();
  s.recent = [
    { game, at: Date.now() },
    ...s.recent.filter((r) => r.game !== game),
  ].slice(0, 6);
  writeLocal(s);
}
export const gameTitle = (id: string) =>
  GAMES.find((g) => g.id === id)?.title ?? id;

/* ─── Saves: server for signed-in players, this browser otherwise ─────────── */

const SAVE_LS = (game: string) => `cricfield-arcade-save:${game}`;
export interface SaveSlot<T> {
  slot: string;
  updated: number;
  state: T;
}
export async function listSaves<T>(game: GameId): Promise<SaveSlot<T>[]> {
  if (await signedIn()) {
    try {
      return await api<SaveSlot<T>[]>(`/saves/${game}`);
    } catch {
      /* fall back to local */
    }
  }
  try {
    return JSON.parse(
      localStorage.getItem(SAVE_LS(game)) ?? "[]",
    ) as SaveSlot<T>[];
  } catch {
    return [];
  }
}
export async function writeSave<T>(
  game: GameId,
  slot: string,
  state: T,
): Promise<"account" | "browser"> {
  if (await signedIn()) {
    try {
      await api(`/saves/${game}/${slot}`, { method: "PUT", body: state });
      return "account";
    } catch {
      /* fall back */
    }
  }
  try {
    const all = (
      JSON.parse(localStorage.getItem(SAVE_LS(game)) ?? "[]") as SaveSlot<T>[]
    ).filter((s) => s.slot !== slot);
    localStorage.setItem(
      SAVE_LS(game),
      JSON.stringify(
        [{ slot, updated: Date.now(), state }, ...all].slice(0, 3),
      ),
    );
  } catch {
    /* storage blocked */
  }
  return "browser";
}
export async function removeSave(game: GameId, slot: string) {
  if (await signedIn()) {
    try {
      await api(`/saves/${game}/${slot}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(
      SAVE_LS(game),
      JSON.stringify(
        (
          JSON.parse(
            localStorage.getItem(SAVE_LS(game)) ?? "[]",
          ) as SaveSlot<unknown>[]
        ).filter((s) => s.slot !== slot),
      ),
    );
  } catch {
    /* ignore */
  }
}
