import {
  loadLiveState,
  saveLiveState,
  pruneLiveStates,
  deleteLiveState,
} from "./live-state-store";
import { randomBytes, randomUUID } from "node:crypto";
import * as S from "./arcade-store";
const games = [
  "cup-chase",
  "hand-cricket",
  "super-over",
  "auction-room",
  "cricket-grid",
  "guess-cricketer",
];
type Member = { token: string; name: string; runId?: string };
type Room = {
  code: string;
  game: string;
  seed: string;
  created: number;
  started: boolean;
  members: Member[];
  config?: { mode: string; params: unknown };
};
const rooms = new Map<string, Room>();
const persist = (r: Room) =>
  saveLiveState("room", r.code, r, r.created + 3600000);
const fail = (s: string): never => {
  throw new Error(`bad_request:${s}`);
};
export function create(game: string, name: string) {
  pruneLiveStates();
  if (!games.includes(game)) fail("unknown_game");
  for (const [k, r] of rooms)
    if (Date.now() - r.created > 3600000) rooms.delete(k);
  if (rooms.size >= 1000) fail("rooms_busy");
  let code: string;
  do {
    code = randomBytes(4).toString("hex").toUpperCase();
  } while (rooms.has(code) || loadLiveState<Room>("room", code));
  const token = randomUUID();
  const room: Room = {
    code,
    game,
    seed: randomUUID(),
    created: Date.now(),
    started: false,
    members: [{ token, name: name.trim().slice(0, 24) || "Host" }],
  };
  rooms.set(code, room);
  persist(room);
  return { token, ...view(room, token) };
}
export function join(code: string, game: string, name: string) {
  const r = find(code);
  if (r.game !== game) fail("wrong_game");
  if (r.started) fail("room_already_started");
  if (r.members.length >= (game === "auction-room" ? 10 : 2)) fail("room_full");
  const token = randomUUID();
  r.members.push({
    token,
    name: name.trim().slice(0, 24) || `Player ${r.members.length + 1}`,
  });
  persist(r);
  return { token, ...view(r, token) };
}
function find(code: string) {
  const key = code.toUpperCase();
  const r = rooms.get(key) ?? loadLiveState<Room>("room", key);
  if (r) rooms.set(key, r);
  if (!r || Date.now() - r.created > 3600000) fail("room_expired");
  return r!;
}
export function member(code: string, token: string) {
  const r = find(code);
  if (!r.members.some((m) => m.token === token))
    fail("room_membership_required");
  return r;
}
export function view(r: Room, token: string) {
  return {
    code: r.code,
    game: r.game,
    started: r.started,
    host: r.members[0].token === token,
    members: r.members.map((m, i) => {
      const run = m.runId ? S.getRun(m.runId) : null;
      return {
        id: i,
        name: m.name,
        you: m.token === token,
        done: run?.status === "done",
        score: run?.status === "done" ? run.score : null,
      };
    }),
  };
}
export function start(code: string, token: string) {
  const r = member(code, token);
  if (r.members[0].token !== token) fail("host_only");
  if (r.members.length < 2) fail("need_two_players");
  r.started = true;
  persist(r);
  return view(r, token);
}
export function prepare(
  code: string,
  token: string,
  game: string,
  body: Record<string, unknown>,
) {
  const r = member(code, token);
  if (r.game !== game || !r.started) fail("room_not_ready");
  const m = r.members.find((m) => m.token === token)!;
  if (m.runId) fail("room_game_already_started");
  if (!r.config) {
    if (r.members[0].token !== token) fail("host_must_launch_first");
    r.config = {
      mode:
        game === "cricket-grid" || game === "guess-cricketer"
          ? "practice"
          : String(body.mode),
      params: body.params ?? {},
    };
  }
  if (
    game !== "cricket-grid" &&
    game !== "guess-cricketer" &&
    (String(body.mode) !== r.config.mode ||
      JSON.stringify(body.params ?? {}) !== JSON.stringify(r.config.params))
  )
    fail("match_host_game_settings");
  body.mode = r.config.mode;
  body.params = r.config.params;
  persist(r);
  return r.seed;
}
export function attach(code: string, token: string, runId: string) {
  const r = member(code, token);
  r.members.find((m) => m.token === token)!.runId = runId;
  persist(r);
}

export function leave(code: string, token: string) {
  const r = member(code, token);
  if (r.started) return { ok: true };
  if (r.members[0].token === token) {
    rooms.delete(r.code);
    deleteLiveState("room", r.code);
    return { ok: true };
  }
  r.members = r.members.filter((m) => m.token !== token);
  persist(r);
  return { ok: true };
}
