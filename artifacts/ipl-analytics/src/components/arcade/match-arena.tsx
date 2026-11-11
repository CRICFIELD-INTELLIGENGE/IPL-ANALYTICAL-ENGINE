import { HandGesture } from "./hand-gesture";
import {
  acceptsLiveSnapshot,
  serverClockOffset,
} from "@/lib/arcade/live-snapshot";
import { CricketScene } from "./cricket-scene";
import { useEffect, useRef, useState } from "react";
import { cup, superOver as SO, type GameId } from "@workspace/arcade-rules";
import { api } from "@/lib/arcade/client";
import { PlayerSearch } from "./kit";
type View = {
  lastHands: { values: number[]; round: number } | null;
  lastOutcome: { runs: number; wicket: boolean } | null;
  revision: number;
  move: number;
  revealed: boolean;
  endReason: string | null;
  guessed: string[];
  game: string;
  you: number;
  seats: {
    name: string;
    score: number;
    wickets: number;
    balls: number;
    done: boolean;
    bot: boolean;
  }[];
  turn: number;
  innings: number;
  round: number;
  committed: boolean;
  opponentCommitted: boolean;
  grid: {
    rows: { key: string; label: string }[];
    cols: { key: string; label: string }[];
  } | null;
  filled: ({ id: string; name: string; seat: number } | null)[];
  used: string[];
  log: string[];
  done: boolean;
  winner: number | null;
  clues: { label: string; text: string }[] | null;
  photoUrl: string | null;
  answer: string | null;
  hints: number;
  wrong: number;
  delivery: cup.CupDelivery | null;
  releaseAt: number;
  serverNow: number;
};
export function MatchArena({
  game,
  code,
  token,
  onExit,
}: {
  game: GameId;
  code: string;
  token: string;
  onExit: () => void;
}) {
  const [v, setV] = useState<View | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [cell, setCell] = useState<number | null>(null),
    [now, setNow] = useState(Date.now()),
    [offset, setOffset] = useState(0),
    [aim, setAim] = useState<cup.Aim>("straight");

  const [connectionError, setConnectionError] = useState("");
  const latest = useRef<View | null>(null),
    actionLock = useRef(false);
  function accept(r: View, sentAt: number) {
    if (!acceptsLiveSnapshot(latest.current, r)) return;
    const changed = latest.current?.revision !== r.revision;
    latest.current = r;
    if (changed) setV(r);
    const nextOffset = serverClockOffset(r.serverNow, sentAt, Date.now());
    setOffset((previous) =>
      Math.abs(previous - nextOffset) > 10 ? nextOffset : previous,
    );
  }
  useEffect(() => {
    let alive = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const ctl = new AbortController();
    latest.current = null;
    setV(null);
    setError("");
    const load = async () => {
      const sentAt = Date.now();
      try {
        const r = await api<View>(
          `/match/${code}?token=${encodeURIComponent(token)}`,
          { signal: ctl.signal },
        );
        if (alive) {
          accept(r, sentAt);
          setConnectionError("");
        }
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError")
          setConnectionError((e as Error).message);
      } finally {
        if (alive)
          timer = setTimeout(
            () => void load(),
            game === "cup-chase" ? 350 : 1000,
          );
      }
    };
    void load();
    const clock =
      game === "cup-chase"
        ? setInterval(() => setNow(Date.now()), 30)
        : undefined;
    return () => {
      alive = false;
      ctl.abort();
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [code, token, game]);
  async function act(type: string, body: Record<string, unknown> = {}) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    const sentAt = Date.now();
    try {
      const r = await api<View>(`/match/${code}/action`, {
        body: {
          token,
          type,
          round: latest.current?.round,
          move: latest.current?.move,
          ...body,
        },
      });
      accept(r, sentAt);
      if (game === "cricket-grid" && type === "guess") setCell(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  if (!v)
    return (
      <section className="pav-panel">
        <p>{error || "Preparing the shared pitch…"}</p>
      </section>
    );
  const bat = v.you === v.innings,
    canPick = !busy && !v.committed && !v.done,
    progress = v.delivery
      ? Math.max(
          0,
          Math.min(1.2, (now + offset - v.releaseAt) / v.delivery.travelMs),
        )
      : 0;
  return (
    <section className={`pav-panel live-match lm-${game}`}>
      <header>
        <span className="pav-kicker">
          {v.seats.some((s) => s.bot)
            ? "VS CRICFIELD BOT"
            : "LIVE HEAD-TO-HEAD"}
        </span>
        <h2>
          {game === "cricket-grid"
            ? "Cricket Grid"
            : game === "guess-cricketer"
              ? "Guess the Cricketer"
              : game === "hand-cricket"
                ? "Hand Cricket"
                : game === "cup-chase"
                  ? "Cup Chase"
                  : "Super Over Showdown"}
        </h2>
      </header>
      <div className="lm-scoreboard">
        {v.seats.map((s, i) => (
          <article key={i} className={i === v.you ? "you" : ""}>
            <small>
              {s.name}
              {i === v.you ? " · YOU" : ""}
            </small>
            <strong>
              {s.score}
              {["hand-cricket", "super-over", "cup-chase"].includes(game)
                ? `/${s.wickets}`
                : ""}
            </strong>
            <span>
              {["hand-cricket", "super-over", "cup-chase"].includes(game)
                ? `${s.balls}/6 balls`
                : s.done
                  ? "Finished"
                  : `${s.balls} turns`}
            </span>
          </article>
        ))}
      </div>
      {v.done ? (
        <div className="lm-result">
          <h2>
            {v.winner == null
              ? "Match tied"
              : v.winner === v.you
                ? "You win!"
                : `${v.seats[v.winner].name} wins`}
          </h2>
          {v.endReason && <p>{v.endReason}</p>}
          {v.answer && <p>The mystery cricketer was {v.answer}.</p>}
          {game === "guess-cricketer" && v.photoUrl && (
            <img
              className="lm-reveal-photo"
              src={v.photoUrl}
              alt={v.answer ?? "Mystery cricketer"}
            />
          )}
          <button className="pav-btn pav-btn-gold" onClick={onExit}>
            Back to lobby
          </button>
        </div>
      ) : (
        <>
          {game === "cricket-grid" && v.grid && (
            <>
              <p>
                {v.turn === v.you
                  ? "Your turn: select a cell."
                  : `${v.seats[v.turn].name} is choosing…`}{" "}
                · 18 total attempts · one point per cell.
              </p>
              <div className="cg-board">
                <div className="cg-corner">CF</div>
                {v.grid.cols.map((c) => (
                  <div key={c.key} className="cg-head">
                    {c.label}
                  </div>
                ))}
                {v.grid.rows.map((r, ri) => (
                  <div key={r.key} style={{ display: "contents" }}>
                    <div className="cg-head">{r.label}</div>
                    {v.grid!.cols.map((_, ci) => {
                      const n = ri * 3 + ci,
                        f = v.filled[n];
                      return (
                        <button
                          key={ci}
                          className={`cg-cell ${f ? "filled" : ""}`}
                          disabled={busy || Boolean(f) || v.turn !== v.you}
                          onClick={() => setCell(n)}
                        >
                          {f ? (
                            <>
                              <strong>{f.name}</strong>
                              <small>{v.seats[f.seat].name}</small>
                            </>
                          ) : cell === n ? (
                            "Choose player"
                          ) : (
                            "+"
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {cell != null && v.turn === v.you && !v.filled[cell] && (
                <PlayerSearch
                  exclude={v.used}
                  disabled={busy}
                  onPick={(p) => void act("guess", { cell, playerId: p.id })}
                  label="Name a player for both clues"
                />
              )}
            </>
          )}
          {game === "guess-cricketer" && (
            <div className="lm-mystery">
              <div className="gc-mystery-photo">
                {v.photoUrl ? (
                  <img
                    src={v.photoUrl}
                    alt="Masked mystery cricketer"
                    style={{
                      filter: v.revealed
                        ? "none"
                        : `blur(${Math.max(10, 26 - v.hints * 3)}px)`,
                    }}
                  />
                ) : (
                  <div className="gc-silhouette">?</div>
                )}
                <span>{v.revealed ? v.answer : "WHO AM I?"}</span>
              </div>
              <div>
                {v.clues?.map((c) => (
                  <article key={c.label}>
                    <small>{c.label}</small>
                    <p>{c.text}</p>
                  </article>
                ))}
                <p>
                  {5 - v.wrong} guesses remaining · each hint costs 15 points.
                </p>
                <button
                  className="pav-btn"
                  disabled={busy || v.hints >= 5 || v.seats[v.you].done}
                  onClick={() => void act("hint")}
                >
                  Reveal hint
                </button>
                <PlayerSearch
                  exclude={v.guessed}
                  disabled={busy || v.seats[v.you].done}
                  onPick={(p) => void act("guess", { playerId: p.id })}
                  label="Guess the cricketer"
                />
                {v.seats[v.you].done && (
                  <p>You finished. Waiting for your opponent.</p>
                )}
                <small>
                  The bot eliminates candidates using the same revealed clues.
                  Room and bot results stay separate from public leaderboards.
                </small>
              </div>
            </div>
          )}
          {game === "hand-cricket" && (
            <div className="lm-hand">
              <p>
                {bat ? "BAT" : "BOWL"} ·{" "}
                {v.innings === 1
                  ? `Target ${v.seats[0].score + 1}`
                  : "Set the target"}{" "}
                · two wickets per innings
              </p>
              <div className="lm-hands">
                <HandGesture
                  value={v.lastHands?.values[v.you]}
                  hidden={v.committed}
                />
                <b>VS</b>
                <HandGesture
                  value={v.lastHands?.values[1 - v.you]}
                  hidden={v.opponentCommitted}
                />
              </div>
              <p>
                {v.committed
                  ? "Choice locked. Waiting for your rival."
                  : "Choose 1–6. Both numbers stay hidden until committed."}
              </p>
              <div className="lm-controls">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className="pav-btn pav-btn-gold"
                    disabled={!canPick}
                    onClick={() => void act("hand", { value: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {game === "super-over" && (
            <div className="lm-worldcup">
              <CricketScene
                ballKey={v.round}
                hit={v.round > 0}
                outcome={
                  !v.lastOutcome
                    ? "waiting"
                    : v.lastOutcome.wicket
                      ? "wicket"
                      : v.lastOutcome.runs >= 4
                        ? "boundary"
                        : v.lastOutcome.runs > 0
                          ? "runs"
                          : "dot"
                }
                label={bat ? "Choose your shot" : "Choose your delivery"}
              />
              <p>
                {v.innings === 1
                  ? `Target ${v.seats[0].score + 1}`
                  : "Set a six-ball target"}{" "}
                ·{" "}
                {v.committed
                  ? "Choice locked — waiting for your rival."
                  : "The shot and delivery reveal together."}
              </p>
              <div className="lm-controls">
                {bat
                  ? Object.entries(SO.SHOTS).map(([key, s]) => (
                      <button
                        key={key}
                        className="pav-btn"
                        disabled={!canPick}
                        onClick={() => void act("shot", { value: key })}
                      >
                        {s.name}
                      </button>
                    ))
                  : Object.entries(SO.DELIVERIES).map(([key, d]) => (
                      <button
                        key={key}
                        className="pav-btn"
                        disabled={!canPick}
                        onClick={() => void act("delivery", { value: key })}
                      >
                        {d.name}
                      </button>
                    ))}
              </div>
            </div>
          )}
          {game === "cup-chase" && (
            <div className="lm-doodle">
              <div className="lm-doodle-field">
                <span className="lm-cricket">🦗</span>
                <span className="lm-snail">🐌</span>
                {v.delivery && (
                  <span
                    className="lm-ball"
                    style={{
                      left: `${14 + progress * 65}%`,
                      bottom: `${40 + Math.sin(progress * Math.PI) * 25}%`,
                    }}
                  >
                    ●
                  </span>
                )}
                <span className="lm-wicket">Ⅲ</span>
              </div>
              <p>
                {bat
                  ? "Tap Swing as the ball reaches the cricket."
                  : "Release the next ball when ready."}{" "}
                {v.innings === 1 ? `Target ${v.seats[0].score + 1}` : ""}
              </p>
              {bat ? (
                <>
                  <div className="lm-controls">
                    {(["off", "straight", "leg"] as const).map((a) => (
                      <button
                        key={a}
                        className="pav-btn"
                        aria-pressed={aim === a}
                        onClick={() => setAim(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <button
                    className="pav-btn pav-btn-gold"
                    disabled={busy || !v.delivery || now + offset < v.releaseAt}
                    onClick={() =>
                      void act("swing", {
                        aim,
                        swingMs: Math.max(0, Date.now() + offset - v.releaseAt),
                      })
                    }
                  >
                    🏏 SWING
                  </button>
                </>
              ) : (
                <button
                  className="pav-btn pav-btn-gold"
                  disabled={busy || Boolean(v.delivery)}
                  onClick={() => void act("bowl")}
                >
                  Bowl next ball
                </button>
              )}
              <small>
                Swing timestamps are checked against the server clock with up to
                200 ms of network compensation.
              </small>
            </div>
          )}
          <button
            className="pav-btn pav-btn-ghost"
            onClick={() => {
              if (confirm("Forfeit this match?")) void act("forfeit");
            }}
          >
            Forfeit
          </button>
        </>
      )}
      {(error || connectionError) && (
        <p role="alert">{(error || connectionError).replaceAll("_", " ")}</p>
      )}
      <ol className="lm-feed">
        {v.log
          .slice()
          .reverse()
          .map((l, i) => (
            <li key={i}>{l}</li>
          ))}
      </ol>
    </section>
  );
}
