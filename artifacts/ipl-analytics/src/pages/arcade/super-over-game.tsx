import { useArcadeSoloActive } from "@/lib/arcade/solo-mode";
import { CricketScene } from "@/components/arcade/cricket-scene";
import { useEffect, useRef, useState } from "react";
import { superOver as SO } from "@workspace/arcade-rules";
import {
  ErrorNote,
  GameHeader,
  GameShell,
  Leaderboard,
  ResultPanel,
} from "@/components/arcade/kit";
import {
  startSession,
  submitSession,
  type Session,
  type Submitted,
} from "@/lib/arcade/session";
import { play, useReducedMotion } from "@/lib/arcade/feel";
import "./arcade-games.css";

const MODES: [SO.Mode, string][] = [
  ["easy", "Easy chase · 12"],
  ["balanced", "Balanced · 17"],
  ["impossible", "Impossible-looking · 24"],
  ["custom", "Custom target"],
];
const OUT_LABEL = ["Dot", "1", "2", "4", "6", "Wicket"];

export default function SuperOverGame() {
  const soloActive = useArcadeSoloActive("super-over");
  const starting = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<SO.Mode>("balanced");
  const [custom, setCustom] = useState(20);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<SO.SuperOver | null>(null);
  const [shot, setShot] = useState<SO.Shot>("push");
  const [shots, setShots] = useState<SO.Shot[]>([]);
  const [finale, setFinale] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null | "offline">(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();

  async function begin() {
    if (starting.current) return;
    starting.current = true;
    setError(null);
    setSubmitted(null);
    setShots([]);
    setFinale(false);
    try {
      const s = await startSession(
        "super-over",
        mode,
        mode === "custom" ? { target: custom } : {},
      );
      setSession(s);
      setState(SO.newSuperOver(s.seed, mode, custom));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      starting.current = false;
    }
  }
  const ball = state && !state.result ? SO.nextBall(state) : null;
  function face() {
    if (!soloActive || !state || state.result || !session) return;
    const wasFinal = SO.isFinalBall(state);
    const next = SO.playSuperBall(state, shot);
    const allShots = [...shots, shot];
    const last = next.balls.at(-1)!;
    play(last.wicket ? "wicket" : last.runs >= 4 ? "bat" : "tick");
    if (last.runs >= 4 && !last.wicket) setTimeout(() => play("crowd"), 120);
    setShots(allShots);
    if (wasFinal && !reduced) {
      setFinale(true);
      setTimeout(() => setFinale(false), 1600);
    }
    setState(next);
    if (next.result)
      void submitSession(session, { shots: allShots })
        .then((r) => setSubmitted(r ?? "offline"))
        .catch((e) => {
          setError((e as Error).message);
          setSubmitted("offline");
        });
  }
  useEffect(() => {
    const keys: Record<string, SO.Shot> = {
      "1": "block",
      "2": "push",
      "3": "drive",
      "4": "loft",
      "5": "ramp",
      "6": "slog",
    };
    const k = (e: KeyboardEvent) => {
      if (
        !soloActive ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,textarea,select"))
      )
        return;
      if (keys[e.key]) setShot(keys[e.key]);
      if (e.key === "Enter" && ball) {
        e.preventDefault();
        face();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const need = state ? state.target - state.runs : 0;
  const left = state ? 6 - state.legal : 6;
  const pressure =
    state && !state.result
      ? Math.min(
          100,
          Math.round((need / Math.max(1, left)) * 16 + state.wickets * 20),
        )
      : 0;
  const odds =
    ball && state ? SO.expectedOdds(state.mode, ball.field, shot) : null;
  const sub = submitted && submitted !== "offline" ? submitted : null;
  return (
    <GameShell game="super-over" theme="theme-finalover">
      <GameHeader
        kicker="QUICK PLAY · PRESSURE"
        title="Super Over Showdown."
        intro="Six legal balls, two wickets, one target. Read the field and the bowler, choose your shot, and own the risk."
      />
      {!state && (
        <section className="pav-panel">
          <div className="pav-modes" role="group" aria-label="Target">
            {MODES.map(([m, l]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {l}
              </button>
            ))}
          </div>
          {mode === "custom" && (
            <label className="so-custom">
              Target{" "}
              <input
                type="number"
                min={1}
                max={36}
                value={custom}
                onChange={(e) =>
                  setCustom(
                    Math.max(1, Math.min(36, Number(e.target.value) || 1)),
                  )
                }
              />
            </label>
          )}
          <ul className="pav-rules">
            <li>
              Before each ball you see the field and what the bowler tends to
              bowl — not the ball itself. Pick a shot (keys 1–6), then face it
              (Enter).
            </li>
            <li>
              Wides and no-balls add one run and are re-bowled; a no-ball brings
              a free hit. Two wickets end the over.
            </li>
            <li>
              Outcome odds are CRICFIELD game balancing, shown before you
              commit.
            </li>
          </ul>
          <button
            type="button"
            className="pav-btn pav-btn-gold"
            style={{ marginTop: 14 }}
            onClick={() => void begin()}
          >
            Walk out to bat
          </button>
          <ErrorNote error={error} onRetry={() => void begin()} />
        </section>
      )}
      {state && (
        <div
          className={`so-arena ${finale ? "so-finale" : ""}`}
          onPointerDown={(e) => {
            if (
              e.target instanceof HTMLElement &&
              e.target.closest("button,input,select,a")
            )
              return;
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const p = swipe.current;
            swipe.current = null;
            if (!p || !ball) return;
            const dx = e.clientX - p.x,
              dy = e.clientY - p.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 35) return;
            setShot(
              Math.abs(dy) > Math.abs(dx)
                ? dy < 0
                  ? "loft"
                  : "block"
                : dx > 0
                  ? "drive"
                  : "slog",
            );
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
          <div className="so-board" aria-live="polite">
            <div>
              <small>Target</small>
              <strong>{state.target}</strong>
            </div>
            <div>
              <small>Score</small>
              <strong>
                {state.runs}/{state.wickets}
              </strong>
            </div>
            <div>
              <small>Need</small>
              <strong>{Math.max(0, need)}</strong>
              <span>from {left}</span>
            </div>
            <div className="so-pressure">
              <small>Pressure</small>
              <span style={{ ["--p" as string]: `${pressure}%` }} />
            </div>
          </div>
          <CricketScene
            ballKey={state.balls.length}
            hit={state.balls.length > 0}
            outcome={
              !state.balls.length
                ? "waiting"
                : state.balls.at(-1)!.wicket
                  ? "wicket"
                  : state.balls.at(-1)!.runs >= 4
                    ? "boundary"
                    : state.balls.at(-1)!.runs > 0
                      ? "runs"
                      : "dot"
            }
            label={`${state.runs}/${state.wickets} · Target ${state.target}`}
          />
          <div className="so-balls">
            {state.balls.map((b) => (
              <span
                key={b.n}
                className={
                  b.wicket ? "w" : b.extra ? "x" : b.runs >= 4 ? "b" : ""
                }
                title={b.text}
              >
                {b.wicket
                  ? "W"
                  : b.extra === "wide"
                    ? "wd"
                    : b.extra === "noball"
                      ? `nb${b.runs > 1 ? `+${b.runs - 1}` : ""}`
                      : b.runs}
              </span>
            ))}
            {Array.from({ length: Math.max(0, 6 - state.legal) }, (_, i) => (
              <span key={`e${i}`} className="empty">
                ·
              </span>
            ))}
          </div>
          {state.balls.at(-1) && (
            <p className="so-commentary" role="status">
              {state.balls.at(-1)!.text}
            </p>
          )}
          {ball && (
            <div className="so-decide">
              <div className="so-read">
                {state.freeHit && (
                  <span className="pav-chip pav-chip-gold">FREE HIT</span>
                )}
                {SO.isFinalBall(state) && (
                  <span className="pav-chip pav-chip-gold">THE FINAL BALL</span>
                )}
                <p>
                  <strong>Field:</strong> {SO.FIELDS[ball.field]}
                </p>
                <p>
                  <strong>Bowler's plan:</strong>{" "}
                  {state.mode === "impossible"
                    ? "Death specialist — lives on yorkers"
                    : state.mode === "easy"
                      ? "Part-timer — mixes up lengths"
                      : "Seasoned seamer — yorkers and slower balls"}
                </p>
              </div>
              <p className="pav-small">
                Tap a shot below, or swipe on the field: up for loft, down to
                block, right to drive, left to slog. Then tap Face the ball.
              </p>
              <div className="so-shots" role="radiogroup" aria-label="Shot">
                {(Object.keys(SO.SHOTS) as SO.Shot[]).map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={shot === s}
                    className={shot === s ? "on" : ""}
                    onClick={() => setShot(s)}
                  >
                    <kbd>{i + 1}</kbd>
                    <strong>{SO.SHOTS[s].name}</strong>
                    <small>{SO.SHOTS[s].risk}</small>
                  </button>
                ))}
              </div>
              <p className="pav-small">
                Against this bowler's usual mix:{" "}
                {odds &&
                  OUT_LABEL.map(
                    (l, i) => `${l} ${Math.round(odds[i] * 100)}%`,
                  ).join(" · ")}
              </p>
              <button
                type="button"
                className="pav-btn pav-btn-gold so-face"
                onClick={face}
              >
                Face the ball ↵
              </button>
            </div>
          )}
          {state.balls.length > 0 && (
            <p className="pav-small">
              Last delivery: {SO.DELIVERIES[state.balls.at(-1)!.delivery].name}{" "}
              — {SO.DELIVERIES[state.balls.at(-1)!.delivery].tell.toLowerCase()}
              .
            </p>
          )}
        </div>
      )}
      {state?.result && (
        <ResultPanel
          game="super-over"
          score={sub?.score ?? 0}
          outcome={sub ? sub.outcome : null}
          headline={
            state.result === "won"
              ? `Chased ${state.target}${state.legal === 6 ? " off the final ball!" : ` with ${6 - state.legal} to spare.`}`
              : state.result === "tied"
                ? "Tied! Scores level."
                : `Lost by ${state.target - 1 - state.runs} run${state.target - 1 - state.runs === 1 ? "" : "s"}.`
          }
          lines={[
            `${state.runs}/${state.wickets} from ${state.legal} legal balls.`,
            ...(submitted === "offline"
              ? ["Played offline: saved in this browser only."]
              : []),
          ]}
          share={`Super Over · target ${state.target} · ${state.runs}/${state.wickets} · ${state.balls.map((b) => (b.wicket ? "W" : b.extra ? "x" : b.runs)).join(" ")}`}
          onReplay={() => setState(null)}
        />
      )}
      <Leaderboard game="super-over" />
    </GameShell>
  );
}
