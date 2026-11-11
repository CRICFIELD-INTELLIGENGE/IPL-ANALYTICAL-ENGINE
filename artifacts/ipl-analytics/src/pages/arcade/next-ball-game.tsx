import { useEffect, useState } from "react";
import { dailyKey } from "@workspace/arcade-rules";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Mode = "daily" | "quick" | "death" | "powerplay" | "chases";
const MODES: [Mode, string][] = [["daily", "Daily Prediction"], ["quick", "Quick"], ["death", "Death overs"], ["powerplay", "Powerplay"], ["chases", "Historic chases"]];
interface Q { round: number; season: string; date: string; stage: string | null; battingTeam: string; bowlingTeam: string; batter: string; bowler: string; innings: number; over: string; score: string; target: number | null; need: string | null }
interface Start { runId?: string; question?: Q; rounds?: number; outcomes?: { key: string; label: string }[]; points?: number; round?: number; alreadyCompleted?: boolean; score?: number; data?: Provenance }
interface Graded { correct: boolean; actual: string; points: number; detail: string; correctCount: number; done: boolean; next: Q | null; outcome: ResultOutcome | null }

export default function NextBallGame() {
  const [mode, setMode] = useState<Mode>("daily");
  const [run, setRun] = useState<Start | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [res, setRes] = useState<Graded | null>(null);
  const [points, setPoints] = useState(0);
  const [log, setLog] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outcomes = run?.outcomes ?? [];

  async function start() {
    setBusy(true); setError(null); setRes(null); setLog([]);
    try { const s = await api<Start>("/next-ball/start", { body: { mode } }); setRun(s); setQ(s.question ?? null); setPoints(s.points ?? 0); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function guess(key: string) {
    if (!run?.runId || res || busy) return;
    setBusy(true);
    try { const r = await api<Graded>(`/next-ball/${run.runId}/guess`, { body: { guess: key } }); setRes(r); setPoints((p) => p + r.points); setLog((l) => [...l, r.correct]); play(r.correct ? "correct" : r.actual === "wicket" ? "wicket" : r.actual === "six" || r.actual === "four" ? "bat" : "wrong"); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!q || res) return;
    const k = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= outcomes.length) void guess(outcomes[n - 1].key); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const label = (k: string) => outcomes.find((o) => o.key === k)?.label ?? k;
  return (
    <GameShell game="next-ball" theme="theme-ballbyball">
      <GameHeader kicker="DAILY ARENA · NEW" title="Predict the Next Ball." intro="A real IPL delivery from the ball-by-ball record. You see the match situation; call what happened next. The answer is held on the server until you commit." />
      {!run && (
        <section className="pav-panel">
          <div className="pav-modes" role="group" aria-label="Mode">{MODES.map(([m, l]) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>)}</div>
          <ul className="pav-rules"><li>Ten deliveries. 10 points for a right call, 20 when you call a wicket or a six correctly.</li><li>“Two or three” covers runs from the bat or byes; wides and no-balls count as “Wide / no-ball / other”.</li><li>The daily ten are the same for everyone and count once per day.</li></ul>
          <button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={() => void start()}>{busy ? "Rewinding the tape…" : "Take guard"}</button>
          <ErrorNote error={error} onRetry={() => void start()} />
        </section>
      )}
      {run?.alreadyCompleted && <section className="pav-panel"><h2>Today's deliveries are done.</h2><p className="pav-small">You scored {run.score}. New deliveries at 00:00 IST.</p><button type="button" className="pav-btn" onClick={() => { setRun(null); setMode("quick"); }}>Play quick mode</button></section>}
      {run && q && !run.alreadyCompleted && (
        <section className="nb-board">
          <div className="nb-score">
            <div><small>{q.battingTeam}</small><strong>{q.score}</strong><span>{q.over} ov</span></div>
            <div className="nb-meta"><span>IPL {q.season}{q.stage ? ` · ${q.stage}` : ""}</span><span>{q.date}</span><span>v {q.bowlingTeam}</span></div>
            {q.target && <div><small>Target</small><strong>{q.target}</strong><span>{q.need}</span></div>}
          </div>
          <div className="nb-matchup"><span>On strike <strong>{q.batter}</strong></span><span>Bowling <strong>{q.bowler}</strong></span><span>Innings {q.innings}</span></div>
          <div className="nb-options" role="group" aria-label="Your prediction">
            {outcomes.map((o, i) => {
              const cls = res ? (o.key === res.actual ? "right" : "") : "";
              return <button key={o.key} type="button" className={`nb-option ${cls}`} disabled={Boolean(res) || busy} onClick={() => void guess(o.key)}><kbd>{i + 1}</kbd>{o.label}</button>;
            })}
          </div>
          {res && <div className="nb-reveal" role="status"><strong>{res.correct ? `Called it! +${res.points}` : `It was: ${label(res.actual)}.`}</strong> {res.detail}
            {!res.done && <button type="button" className="pav-btn pav-btn-gold" autoFocus onClick={() => { setQ(res.next); setRes(null); }}>Next delivery →</button>}
          </div>}
          <div className="nb-dots" aria-label="Your calls so far">{Array.from({ length: run.rounds ?? 10 }, (_, i) => <span key={i} className={log[i] === undefined ? "" : log[i] ? "hit" : "miss"} />)}</div>
        </section>
      )}
      {res?.done && run && (
        <ResultPanel game="next-ball" score={points} outcome={res.outcome} dailyKey={mode === "daily" ? dailyKey() : undefined}
          headline={`${res.correctCount} of ${run.rounds} called right.`}
          share={`${mode === "daily" ? `Daily ${dailyKey()}` : MODES.find((m) => m[0] === mode)![1]} · ${points} pts\n${log.map((h) => (h ? "🟢" : "⚪")).join("")}`}
          onReplay={() => setRun(null)} />
      )}
      <DataNote data={run?.data} extra="Deliveries come from Cricsheet ball-by-ball records; match state is rebuilt from the ball record (including rain-revised targets)." />
      <Leaderboard game="next-ball" />
    </GameShell>
  );
}
