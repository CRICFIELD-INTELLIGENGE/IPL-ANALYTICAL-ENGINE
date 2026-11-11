import { MatchArena } from "./match-arena";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/arcade/client";
import { SOLO_MODE_EVENT } from "@/lib/arcade/solo-mode";
import type { GameId } from "@workspace/arcade-rules";
interface Room {
  code: string;
  token?: string;
  host: boolean;
  started: boolean;
  members: { id: number; name: string; you: boolean }[];
}
interface BotSession {
  game: GameId;
  code: string;
  token: string;
}
function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Play remains available without browser storage. */
  }
}
function remove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}
export function MultiplayerGate({
  game,
  children,
}: {
  game: GameId;
  children: ReactNode;
}) {
  const [botMatch, setBotMatch] = useState<BotSession | null>(null);
  const [mode, setMode] = useState<"choose" | "solo" | "room">("choose"),
    [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    generation = useRef(0);
  const puzzle = game === "cricket-grid" || game === "guess-cricketer";
  useEffect(() => {
    let alive = true;
    const epoch = generation.current;
    try {
      const storedBot = JSON.parse(
        sessionStorage.getItem("cricfield-arcade-bot") ?? "null",
      ) as BotSession | null;
      const storedRoom = JSON.parse(
        sessionStorage.getItem("arcade-room") ?? "null",
      );
      if (storedBot?.game === game) {
        api(
          `/match/${storedBot.code}?token=${encodeURIComponent(storedBot.token)}`,
        )
          .then(() => {
            if (alive && epoch === generation.current) setBotMatch(storedBot);
          })
          .catch(() => remove("cricfield-arcade-bot"));
      } else if (storedRoom?.game === game) {
        api<Room>(
          `/rooms/${storedRoom.roomCode}?token=${encodeURIComponent(storedRoom.roomToken)}`,
        )
          .then((r) => {
            if (alive && epoch === generation.current) {
              setToken(storedRoom.roomToken);
              setRoom(r);
              setMode("room");
            }
          })
          .catch(() => remove("arcade-room"));
      }
    } catch {
      /* Ignore malformed or unavailable storage. */
    }
    return () => {
      alive = false;
    };
  }, [game]);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(SOLO_MODE_EVENT, {
        detail: { game, active: mode === "solo" },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent(SOLO_MODE_EVENT, { detail: { game, active: false } }),
      );
    };
  }, [game, mode]);
  useEffect(() => {
    if (!room || !token || room.started) return;
    let alive = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const ctl = new AbortController();
    const refresh = async () => {
      try {
        const r = await api<Room>(
          `/rooms/${room.code}?token=${encodeURIComponent(token)}`,
          { signal: ctl.signal },
        );
        if (alive) {
          setRoom(r);
          setError("");
        }
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError")
          setError((e as Error).message);
      } finally {
        if (alive) timer = setTimeout(() => void refresh(), 1500);
      }
    };
    void refresh();
    return () => {
      alive = false;
      ctl.abort();
      clearTimeout(timer);
    };
  }, [room?.code, room?.started, token]);
  async function enter(join: boolean) {
    if (lock.current) return;
    lock.current = true;
    const epoch = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const r = await api<Room>(join ? "/rooms/join" : "/rooms", {
        body: {
          game,
          name: name.trim() || "Cricket fan",
          ...(join ? { code: code.trim().toUpperCase() } : {}),
        },
      });
      if (epoch !== generation.current) return;
      setToken(r.token!);
      setRoom(r);
      setMode("room");
      remove("cricfield-arcade-bot");
      save("arcade-room", { game, roomCode: r.code, roomToken: r.token });
    } catch (e) {
      if (epoch === generation.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function bot() {
    if (lock.current) return;
    remove("arcade-room");
    ++generation.current;
    setError("");
    if (!puzzle) {
      setMode("solo");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const r = await api<{ code: string; token: string }>("/match/bot", {
        body: { game, name: name.trim() || "You" },
      });
      const session = { game, code: r.code, token: r.token };
      setBotMatch(session);
      save("cricfield-arcade-bot", session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function leave() {
    generation.current++;
    if (room && token)
      void api(`/rooms/${room.code}/leave`, { body: { token } }).catch(
        () => undefined,
      );
    if (botMatch)
      void api(`/match/${botMatch.code}/action`, {
        body: { token: botMatch.token, type: "forfeit" },
      }).catch(() => undefined);
    remove("arcade-room");
    remove("cricfield-arcade-bot");
    setBotMatch(null);
    setRoom(null);
    setMode("choose");
    setToken("");
    setError("");
  }
  if (botMatch)
    return (
      <MatchArena
        game={game}
        code={botMatch.code}
        token={botMatch.token}
        onExit={leave}
      />
    );
  if (mode === "solo")
    return (
      <>
        <button className="pav-btn pav-btn-ghost" onClick={leave}>
          Change play mode
        </button>
        {children}
      </>
    );
  if (mode === "room" && room)
    return (
      <>
        <section className="pav-panel mp-room">
          <h2>Room {room.code}</h2>
          <p className="pav-small">
            Share this code for a live head-to-head match. Rooms recover after
            refresh or an API restart for up to one hour.
          </p>
          {!room.started && (
            <div className="mp-players">
              {room.members.map((m) => (
                <div key={m.id}>
                  <strong>
                    {m.name}
                    {m.you ? " (you)" : ""}
                  </strong>
                  <span>Ready</span>
                </div>
              ))}
            </div>
          )}
          {!room.started && room.host && (
            <button
              className="pav-btn pav-btn-gold"
              disabled={room.members.length < 2 || busy}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  setRoom(
                    await api<Room>(`/rooms/${room.code}/start`, {
                      body: { token },
                    }),
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              Start head-to-head
            </button>
          )}
          {!room.started && !room.host && <p>Waiting for the host to start.</p>}
          <button className="pav-btn pav-btn-ghost" onClick={leave}>
            Leave room
          </button>
          {error && <p role="alert">{error}</p>}
        </section>
        {room.started && (
          <MatchArena
            game={game}
            code={room.code}
            token={token}
            onExit={leave}
          />
        )}
      </>
    );
  return (
    <section className="pav-panel mp-lobby">
      <span className="pav-kicker">YOUR GAME. YOUR RIVALS.</span>
      <h1>Take the field.</h1>
      <p>Play on your own, challenge a bot, or invite a friend.</p>
      <label>
        Your name
        <input
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cricket fan"
        />
      </label>
      <div className="mp-options">
        {puzzle && (
          <button
            className="pav-btn"
            disabled={busy}
            onClick={() => {
              generation.current++;
              remove("arcade-room");
              remove("cricfield-arcade-bot");
              setMode("solo");
            }}
          >
            Play solo puzzle
          </button>
        )}
        <button
          className="pav-btn pav-btn-gold"
          disabled={busy}
          onClick={() => void bot()}
        >
          Play vs bot
        </button>
        <button
          className="pav-btn"
          disabled={busy}
          onClick={() => void enter(false)}
        >
          Create room
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enter(true);
        }}
      >
        <label>
          Room code
          <input
            value={code}
            maxLength={8}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8-character code"
            required
            pattern="[A-Fa-f0-9]{8}"
          />
        </label>
        <button className="pav-btn" disabled={busy}>
          Join room
        </button>
      </form>
      <p className="pav-small">
        Both rivals commit hand numbers and shot/delivery choices before either
        choice is revealed.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
