import { useEffect, useMemo, useRef, useState } from "react";
import { drs } from "@workspace/arcade-rules";
import { ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { startSession, submitSession, type Session, type Submitted } from "@/lib/arcade/session";
import { play, useReducedMotion } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Call = { decision: drs.Call; reason: string | null };
const S = 3; // px per cm in the views

/** Front view (bowler's end): stumps, impact and the projected path, all simulated geometry. */
function ReviewView({ sc, stage, slow }: { sc: drs.DrsScenario; stage: number; slow: boolean }) {
  const cx = 200, ground = 260;
  const X = (x: number) => cx + x * S, Y = (y: number) => ground - y * S;
  const offSign = sc.hand === "R" ? 1 : -1;
  return (
    <svg viewBox="0 0 400 300" className={`drs-view ${slow ? "slow" : ""}`} role="img" aria-label={`Simulated review: ${sc.pitch ? `pitched ${Math.abs(sc.pitch.x)} cm ${sc.pitch.x * offSign > 0 ? "off" : "leg"} side` : "full toss"}, impact ${Math.abs(sc.impact.x)} cm from middle, projected ${sc.stumps.x} cm across and ${sc.stumps.y} cm high`}>
      <rect x="0" y="0" width="400" height="300" fill="#0e1b2c" />
      <rect x="0" y={ground} width="400" height="40" fill="#2a4c3a" />
      {/* line of the stumps */}
      <rect x={X(-drs.STUMP_HALF)} y="0" width={drs.STUMP_HALF * 2 * S} height={ground} fill="rgba(217,178,95,0.08)" />
      <text x="8" y="16" fill="#a9b6c6" fontSize="10">{sc.hand === "R" ? "OFF →" : "← OFF"} · {sc.hand}HB · simulated</text>
      {[-1, 0, 1].map((k) => <rect key={k} x={X(k * 8.6) - 2} y={Y(71.1)} width="4" height={71.1 * S} fill="#f5f1e6" />)}
      <rect x={X(-drs.STUMP_HALF)} y={Y(72.4)} width={drs.STUMP_HALF * 2 * S} height="4" fill="#d9b25f" />
      {stage >= 1 && sc.pitch && <g className="drs-step"><ellipse cx={X(sc.pitch.x)} cy={ground + 18} rx={drs.BALL_R * S} ry="5" fill="#e0705f" /><text x={X(sc.pitch.x) + 14} y={ground + 32} fill="#ffd6cf" fontSize="10">pitch</text></g>}
      {stage >= 2 && <g className="drs-step"><circle cx={X(sc.impact.x)} cy={Y(sc.impact.y)} r={drs.BALL_R * S} fill="#4ea3ff" fillOpacity="0.85" /><text x={X(sc.impact.x) + 14} y={Y(sc.impact.y)} fill="#cfe5ff" fontSize="10">impact</text></g>}
      {stage >= 3 && <g className="drs-step"><line x1={X(sc.impact.x)} y1={Y(sc.impact.y)} x2={X(sc.stumps.x)} y2={Y(sc.stumps.y)} stroke="#79d3a5" strokeDasharray="5 5" strokeWidth="2" /><circle cx={X(sc.stumps.x)} cy={Y(sc.stumps.y)} r={drs.BALL_R * S} fill="none" stroke="#79d3a5" strokeWidth="3" /><text x={X(sc.stumps.x) + 14} y={Y(sc.stumps.y) - 6} fill="#b8f0d2" fontSize="10">projected</text></g>}
    </svg>
  );
}

export default function DrsGame() {
  const [session, setSession] = useState<Session | null>(null);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);
  const [decision, setDecision] = useState<drs.Call | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [shown, setShown] = useState<ReturnType<typeof drs.scoreDrs> | null>(null);
  const [final, setFinal] = useState<Submitted | null | "offline">(null);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const timer = useRef<number[]>([]);
  const sc = useMemo(() => (session ? drs.drsScenario(session.seed, i, drs.drsLevel(i)) : null), [session, i]);

  function replay() {
    timer.current.forEach(clearTimeout); timer.current = [];
    if (reduced) { setStage(3); return; }
    setStage(0);
    const gap = slow ? 1100 : 550;
    [1, 2, 3].forEach((s) => timer.current.push(window.setTimeout(() => setStage(s), s * gap)));
  }
  useEffect(() => { if (sc) replay(); return () => timer.current.forEach(clearTimeout); }, [sc, slow]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setError(null); setCalls([]); setI(0); setFinal(null); setShown(null);
    try { setSession(await startSession("drs", "standard")); } catch (e) { setError((e as Error).message); }
  }
  function submitCall() {
    if (!sc || !decision) return;
    const r = drs.scoreDrs(sc, decision, reason);
    play(r.correct ? "correct" : "wrong");
    setShown(r);
    setCalls((c) => [...c, { decision, reason }]);
  }
  async function next() {
    setShown(null); setDecision(null); setReason(null);
    if (i + 1 < drs.DRS_ROUNDS) { setI(i + 1); return; }
    try { const r = await submitSession(session!, { calls }); setFinal(r ?? "offline"); } catch (e) { setError((e as Error).message); setFinal("offline"); }
  }
  const correct = session ? calls.filter((c, k) => drs.scoreDrs(drs.drsScenario(session.seed, k, drs.drsLevel(k)), c.decision, c.reason).correct).length : 0;
  const points = session ? calls.reduce((t, c, k) => t + drs.scoreDrs(drs.drsScenario(session.seed, k, drs.drsLevel(k)), c.decision, c.reason).points, 0) : 0;
  return (
    <GameShell game="drs" theme="theme-review">
      <GameHeader kicker="DECISION ARENA · NEW" title="DRS: You Decide." intro="Ten simulated LBW reviews. Watch pitching, impact and the projected path, then make the final call under the Laws of Cricket and this game's umpire's-call thresholds." />
      {!session && <section className="pav-panel">
        <span className="pav-sim-label">Simulation — not broadcast ball-tracking</span>
        <ul className="pav-rules">
          <li>Not out if the ball pitched outside leg, or hit the pad outside the line of leg stump.</li>
          <li>Hit outside off while playing a shot: not out. With no shot offered, it can still be out.</li>
          <li>Umpire's call: if the ball's centre is outside the stump line (impact) or outside the stumps-and-bails zone (wickets) but part of the ball is inside, the on-field decision stands.</li>
          <li>10 points for the right final decision, +5 for naming the deciding reason. Reviews get tighter as you go.</li>
        </ul>
        <button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} onClick={() => void start()}>Enter the review room</button>
        <ErrorNote error={error} onRetry={() => void start()} />
      </section>}
      {session && sc && !final && (
        <div className="drs-room">
          <div className="drs-screen">
            <div className="drs-onfield">On-field call: <strong className={sc.onField === "OUT" ? "out" : ""}>{sc.onField}</strong> · Review {i + 1}/{drs.DRS_ROUNDS} · {sc.shotOffered ? "shot offered" : "no shot offered"}{sc.fullToss ? " · full toss" : ""}</div>
            <ReviewView sc={sc} stage={stage} slow={slow} />
            <div className="drs-controls">
              <button type="button" className="pav-btn" onClick={replay}>Replay</button>
              <label className="drs-slow"><input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow motion</label>
              <span className="pav-small">Impact {sc.impact.distM} m from the stumps{sc.pitch ? ` · pitched ${sc.pitch.distM} m out` : ""}</span>
            </div>
          </div>
          <aside className="drs-panel">
            {!shown ? <>
              <h3>Your decision</h3>
              <div className="drs-decide">{(["OUT", "NOT OUT"] as const).map((d) => <button key={d} type="button" aria-pressed={decision === d} className={`pav-btn ${decision === d ? "pav-btn-gold" : ""}`} onClick={() => setDecision(d)}>{d}</button>)}</div>
              <fieldset className="drs-reasons"><legend>Deciding reason (optional, +5)</legend>{drs.REASONS.map((r) => <label key={r.key}><input type="radio" name="reason" checked={reason === r.key} onChange={() => setReason(r.key)} /> {r.label}</label>)}</fieldset>
              <button type="button" className="pav-btn pav-btn-gold" disabled={!decision || stage < 3} onClick={submitCall}>{stage < 3 ? "Watch the review…" : "Confirm decision"}</button>
            </> : <>
              <h3 className={shown.correct ? "drs-ok" : "drs-bad"}>{shown.correct ? "Correct" : "Overruled"} — {shown.ruling.decision}</h3>
              <p>{shown.ruling.reason}</p>
              <ul className="pav-rules"><li>Pitching: {shown.ruling.pitching}</li><li>Impact: {shown.ruling.impact}</li><li>Wickets: {shown.ruling.wickets}</li></ul>
              <p className="pav-small">+{shown.points} points</p>
              <button type="button" className="pav-btn pav-btn-gold" autoFocus onClick={() => void next()}>{i + 1 < drs.DRS_ROUNDS ? "Next review →" : "See results"}</button>
            </>}
          </aside>
        </div>
      )}
      <ErrorNote error={error} />
      {final && <ResultPanel game="drs" score={points} outcome={final === "offline" ? null : final.outcome} headline={`${correct}/${drs.DRS_ROUNDS} decisions right.`}
        lines={final === "offline" ? ["Played offline: the score is saved in this browser only."] : []}
        share={`DRS: You Decide · ${correct}/10 · ${points} pts`} onReplay={() => { setSession(null); }} />}
      <Leaderboard game="drs" />
    </GameShell>
  );
}
