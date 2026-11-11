import { useEffect, useRef, useState } from "react";
import { cup } from "@workspace/arcade-rules";
import { useArcadeSoloActive } from "@/lib/arcade/solo-mode";
import { GameShell, ErrorNote, Leaderboard } from "@/components/arcade/kit";
import {
  startSession,
  submitSession,
  type Session,
} from "@/lib/arcade/session";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Phase = "menu" | "ready" | "ball" | "shot" | "over";
type Hit = ReturnType<typeof cup.judgeClassicBall>;
const WIDTH = 960,
  HEIGHT = 540;
export default function CupChaseGame() {
  const active = useArcadeSoloActive("cup-chase");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [session, setSession] = useState<Session | null>(null);
  const [swings, setSwings] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0),
    [best, setBest] = useState(0);
  const [hit, setHit] = useState<Hit | null>(null);
  const [paused, setPaused] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState("");
  const clock = useRef({ start: 0, pause: 0, locked: false });
  const startLock = useRef(false),
    gesture = useRef<{ x: number; y: number } | null>(null);
  const next = session
    ? cup.classicDelivery(session.seed, swings.length)
    : null;
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("cricfield-garden-best")) || 0);
    } catch {}
  }, []);
  async function begin() {
    if (startLock.current) return;
    startLock.current = true;
    setBusy(true);
    setError(null);
    setSaved("");
    try {
      const s = await startSession("cup-chase", "classic");
      setSession(s);
      setScore(0);
      setSwings([]);
      setHit(null);
      setPaused(false);
      clock.current = { start: 0, pause: 0, locked: false };
      setPhase("ready");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      startLock.current = false;
      setBusy(false);
    }
  }
  function resolve(swing: number | null) {
    if (
      !active ||
      phase !== "ball" ||
      paused ||
      !session ||
      clock.current.locked
    )
      return;
    clock.current.locked = true;
    const input = swing == null ? null : Math.max(0, Math.round(swing));
    const result = cup.judgeClassicBall(session.seed, swings.length, input);
    const inputs = [...swings, input],
      runs = score + result.runs;
    setHit(result);
    setSwings(inputs);
    setScore(runs);
    setPhase("shot");
    play(result.wicket ? "wicket" : "bat");
    if (runs > best) {
      setBest(runs);
      try {
        localStorage.setItem("cricfield-garden-best", String(runs));
      } catch {}
    }
    if (result.wicket || inputs.length >= cup.CLASSIC_LIMIT) {
      void submitSession(session, { swings: inputs })
        .then((r) => setSaved(r ? "Score verified" : "Saved on this device"))
        .catch((e) => setError((e as Error).message));
    }
  }
  function swing() {
    resolve(performance.now() - clock.current.start);
  }
  function pause() {
    if (phase === "menu" || phase === "over") return;
    if (paused) {
      clock.current.start += performance.now() - clock.current.pause;
      setPaused(false);
    } else {
      clock.current.pause = performance.now();
      setPaused(true);
    }
  }
  // The bowler delivers automatically. No extra Next Ball tap between shots.
  useEffect(() => {
    if (!active || paused) return;
    if (phase !== "ready" && phase !== "shot") return;
    const ended =
      phase === "shot" && (hit?.wicket || swings.length >= cup.CLASSIC_LIMIT);
    const timer = setTimeout(
      () => {
        if (ended) {
          setPhase("over");
          return;
        }
        clock.current = { start: performance.now(), pause: 0, locked: false };
        setPhase("ball");
      },
      phase === "ready" ? 950 : 1450,
    );
    return () => clearTimeout(timer);
  }, [active, paused, phase, hit, swings.length]);
  useEffect(() => {
    if (
      !active &&
      !paused &&
      (phase === "ball" || phase === "shot" || phase === "ready")
    )
      pause();
  }, [active]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !active ||
        e.repeat ||
        (e.target instanceof HTMLElement &&
          e.target.closest("input,select,textarea,button,a"))
      )
        return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (phase === "ball") swing();
      }
      if (e.code === "KeyP") pause();
    };
    const hidden = () => {
      if (document.hidden && !paused) pause();
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", hidden);
    };
  });
  useEffect(() => {
    if (!active) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const shotStart = performance.now();
    const draw = (now: number) => {
      const t =
        phase === "ball" && next
          ? Math.max(
              0,
              ((paused ? clock.current.pause : now) - clock.current.start) /
                next.travelMs,
            )
          : 0;
      garden(
        ctx,
        phase,
        t,
        next?.bounce ?? 0.6,
        hit,
        (now - shotStart) / 1200,
        paused,
      );
      if (phase === "ball" && !paused && t > 1.22) resolve(null);
      else if (!paused && (phase === "ball" || phase === "shot"))
        frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, phase, paused, session, swings.length, hit]);
  return (
    <GameShell game="cup-chase" theme="theme-garden" wide>
      <header className="cup-head">
        <span className="pav-kicker">GARDEN CRICKET</span>
        <h1>Cup Chase.</h1>
        <p>One button. Watch the bounce. Swing as the ball reaches your bat.</p>
      </header>
      <div className="garden-board" aria-live="polite">
        <span>
          RUNS <strong>{score}</strong>
        </span>
        <span>
          BEST <strong>{best}</strong>
        </span>
        <span>
          BALLS <strong>{swings.length}</strong>
        </span>
      </div>
      <div className="garden-stage">
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label="Side-on garden cricket: snail bowls from right to left toward the cricket batter. Tap or swipe to swing."
          onPointerDown={(e) => {
            if (phase !== "ball" || paused) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            gesture.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            if (!gesture.current) return;
            gesture.current = null;
            swing();
          }}
          onPointerCancel={() => {
            gesture.current = null;
          }}
        />
        {phase === "menu" && (
          <div className="garden-overlay">
            <span className="garden-mascot" aria-hidden="true">
              🏏
            </span>
            <h2>
              A little cricket.
              <br />A big innings.
            </h2>
            <p>
              Automatic bowling. Tap, swipe, Space or Enter to bat.
              <br />
              Keep scoring until your first wicket.
            </p>
            <button
              className="pav-btn pav-btn-gold"
              disabled={busy}
              onClick={() => void begin()}
            >
              {busy ? "Getting the pitch ready…" : "Let's play"}
            </button>
          </div>
        )}
        {paused && phase !== "over" && (
          <div className="garden-overlay">
            <h2>Taking a breather.</h2>
            <button className="pav-btn pav-btn-gold" onClick={pause}>
              Resume game
            </button>
          </div>
        )}
        {phase === "over" && (
          <div className="garden-overlay">
            <h2>
              {score >= best && score > 0 ? "What an innings!" : "Bowled!"}
            </h2>
            <strong className="garden-final">{score}</strong>
            <p>
              {swings.length} balls · Best {best}
              <br />
              {saved || "Checking your score…"}
            </p>
            <button
              className="pav-btn pav-btn-gold"
              disabled={busy}
              onClick={() => void begin()}
            >
              Play again
            </button>
          </div>
        )}
      </div>
      {phase !== "menu" && phase !== "over" && (
        <div className="garden-controls">
          <button
            type="button"
            className="garden-swing"
            disabled={phase !== "ball" || paused}
            onClick={swing}
            aria-label="Swing bat"
          >
            🏏 <span>SWING</span>
          </button>
          <button type="button" className="pav-btn" onClick={pause}>
            {paused ? "Resume" : "Pause"}
          </button>
          <p>
            Tap the bat, tap the pitch, or swipe across it.
            <br />
            Keyboard: Space / Enter · P to pause
          </p>
        </div>
      )}
      <p className="cup-status" role="status">
        {phase === "ball"
          ? "Watch the bounce…"
          : phase === "ready"
            ? "Here comes the bowler…"
            : hit?.label}
      </p>
      <ErrorNote error={error} />
      <p className="pav-datanote">
        Original CRICFIELD garden artwork and timing rules, inspired by
        one-button cricket.
      </p>
      <Leaderboard game="cup-chase" />
    </GameShell>
  );
}

function snail(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  facing = -1,
) {
  g.save();
  g.translate(x, y);
  g.scale(s * facing, s);
  g.lineCap = "round";
  g.fillStyle = "#f1c78c";
  g.beginPath();
  g.ellipse(0, 0, 40, 13, 0, 0, 7);
  g.fill();
  g.fillStyle = "#d97f50";
  g.beginPath();
  g.arc(-8, -24, 29, 0, 7);
  g.fill();
  g.strokeStyle = "#a94e34";
  g.lineWidth = 4;
  g.beginPath();
  for (let a = 0; a < 15; a += 0.1) {
    const r = a * 1.5;
    const px = -8 + Math.cos(a) * r,
      py = -24 + Math.sin(a) * r;
    if (a === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
  for (const dx of [25, 38]) {
    g.strokeStyle = "#efc88e";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(24, -3);
    g.lineTo(dx, -42);
    g.stroke();
    g.fillStyle = "white";
    g.beginPath();
    g.arc(dx, -42, 8, 0, 7);
    g.fill();
    g.fillStyle = "#273a38";
    g.beginPath();
    g.arc(dx + 2, -42, 3, 0, 7);
    g.fill();
  }
  g.restore();
}
function cricket(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  swing: number,
  running = 0,
) {
  g.save();
  g.translate(x, y);
  g.lineCap = "round";
  g.strokeStyle = "#285b39";
  g.lineWidth = 7;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 9, -15);
    g.lineTo(side * 27, Math.sin(running + side) * 8);
    g.lineTo(side * 39, 12);
    g.stroke();
  }
  g.fillStyle = "#62a84f";
  g.beginPath();
  g.ellipse(0, -34, 19, 29, -0.2, 0, 7);
  g.fill();
  g.fillStyle = "#89c858";
  g.beginPath();
  g.arc(5, -71, 24, 0, 7);
  g.fill();
  g.strokeStyle = "#315e35";
  g.lineWidth = 3;
  for (const dx of [-7, 13]) {
    g.beginPath();
    g.moveTo(dx, -90);
    g.quadraticCurveTo(dx - 8, -119, dx + 10, -125);
    g.stroke();
    g.fillStyle = "white";
    g.beginPath();
    g.ellipse(dx + 4, -77, 9, 12, 0, 0, 7);
    g.fill();
    g.fillStyle = "#233a30";
    g.beginPath();
    g.arc(dx + 7, -77, 4, 0, 7);
    g.fill();
  }
  g.strokeStyle = "#315e35";
  g.beginPath();
  g.arc(12, -65, 9, 0.2, 2.6);
  g.stroke();
  g.fillStyle = "#f7e9ac";
  g.fillRect(-17, -43, 34, 11);
  g.save();
  g.translate(18, -36);
  g.rotate(-0.4 - swing * 1.9);
  g.fillStyle = "#b57b3a";
  g.fillRect(-4, -5, 8, 25);
  g.fillStyle = "#f4cc79";
  g.beginPath();
  g.roundRect(-9, 18, 18, 57, 5);
  g.fill();
  g.restore();
  g.restore();
}
function garden(
  g: CanvasRenderingContext2D,
  phase: Phase,
  t: number,
  bounce: number,
  hit: Hit | null,
  shot: number,
  paused: boolean,
) {
  const sky = g.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, "#9adbe8");
  sky.addColorStop(1, "#e7f1c8");
  g.fillStyle = sky;
  g.fillRect(0, 0, WIDTH, HEIGHT);
  g.fillStyle = "#fff5bd";
  g.beginPath();
  g.arc(825, 75, 38, 0, 7);
  g.fill();
  for (const [x, y] of [
    [130, 80],
    [420, 55],
    [670, 115],
  ]) {
    g.fillStyle = "#ffffffb0";
    g.beginPath();
    g.ellipse(x, y, 80, 20, 0, 0, 7);
    g.fill();
  }
  g.fillStyle = "#b7d56b";
  g.beginPath();
  g.moveTo(0, 300);
  for (let x = 0; x <= 960; x += 15) g.lineTo(x, 260 + Math.sin(x / 100) * 25);
  g.lineTo(960, 540);
  g.lineTo(0, 540);
  g.fill();
  g.fillStyle = "#70b45b";
  g.fillRect(0, 340, 960, 200);
  g.fillStyle = "#8cc169";
  g.fillRect(0, 400, 960, 140);
  for (let x = 30; x < 960; x += 85) {
    g.strokeStyle = "#5e9d49";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, 340);
    g.lineTo(x - 8, 326);
    g.moveTo(x, 340);
    g.lineTo(x + 7, 321);
    g.stroke();
  }
  for (const [x, y] of [
    [95, 365],
    [450, 350],
    [595, 370],
    [890, 355],
  ])
    snail(g, x, y, 0.5);
  g.fillStyle = "#e4bf81";
  g.beginPath();
  g.roundRect(165, 424, 660, 56, 28);
  g.fill();
  g.strokeStyle = "#fff1ca";
  g.lineWidth = 3;
  for (const x of [252, 755]) {
    g.beginPath();
    g.moveTo(x, 427);
    g.lineTo(x, 478);
    g.stroke();
  }
  const out = phase === "shot" && hit?.wicket;
  g.strokeStyle = "#e8ae55";
  g.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(220 + i * 10, 450);
    g.lineTo(
      220 + i * 10 + (out ? shot * (i - 1) * 35 : 0),
      395 - (out ? Math.sin(shot * 3) * 25 : 0),
    );
    g.stroke();
  }
  if (!out) {
    g.beginPath();
    g.moveTo(215, 395);
    g.lineTo(245, 395);
    g.stroke();
  }
  snail(
    g,
    790 + (phase === "ball" ? Math.sin(Math.min(t, 0.2) * 15) * 10 : 0),
    445,
    0.95,
  );
  const motion =
    phase === "shot" && hit && !hit.wicket
      ? Math.sin(Math.min(1, shot) * Math.PI) * 100
      : 0;
  cricket(
    g,
    273 + motion,
    451,
    phase === "shot" ? Math.max(0, 1 - shot) : 0,
    motion * 0.15,
  );
  let bx = 0,
    by = 0,
    visible = false;
  if (phase === "ball") {
    bx = 755 - (755 - 300) * t;
    by =
      t < bounce
        ? 355 + (448 - 355) * (t / bounce) ** 0.7
        : 448 -
          Math.sin((Math.min(1, (t - bounce) / (1 - bounce)) * Math.PI) / 2) *
            38;
    visible = true;
  } else if (phase === "shot" && hit && !hit.wicket) {
    const u = Math.min(1, shot);
    bx = 300 + u * (hit.runs >= 4 ? 780 : 400);
    by =
      410 -
      Math.sin(u * Math.PI) *
        (hit.runs === 6 ? 320 : hit.runs === 4 ? 110 : 40);
    visible = shot < 1.25;
  }
  if (visible) {
    g.fillStyle = "#213d2829";
    g.beginPath();
    g.ellipse(bx, 457, 9, 3, 0, 0, 7);
    g.fill();
    g.fillStyle = "#c33d35";
    g.beginPath();
    g.arc(bx, by, 7, 0, 7);
    g.fill();
    g.strokeStyle = "#ffe0b6";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(bx, by, 4, 0, 3);
    g.stroke();
  }
  if (phase === "shot" && hit) {
    g.textAlign = "center";
    g.font = "900 64px Georgia";
    g.fillStyle = hit.wicket ? "#8c3434" : "#244e32";
    g.fillText(hit.label, 480, 165);
    g.textAlign = "left";
  }
  if (phase === "ready" && !paused) {
    g.textAlign = "center";
    g.font = "bold 30px sans-serif";
    g.fillStyle = "#31573c";
    g.fillText("Get ready…", 480, 175);
    g.textAlign = "left";
  }
}
