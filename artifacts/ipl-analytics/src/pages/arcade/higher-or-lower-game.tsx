import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

interface Round { round: number; level: number; metric: { key: string; label: string; scope: string; season: number | null; unit: string; threshold: string }; a: { id: string; name: string; team: string; value: number }; b: { id: string; name: string; team: string } }
interface Start { runId?: string; day?: string; streak?: number; round?: Round; rounds?: number | null; alreadyCompleted?: boolean; score?: number; data?: Provenance }
interface Graded { correct: boolean; aValue: number; bValue: number; streak: number; done: boolean; next: Round | null; outcome: ResultOutcome | null }

const fmt = (v: number, key: string) => (["sr", "avg", "econ"].includes(key) ? v.toFixed(2) : v.toLocaleString("en-IN"));
const LEVELS = ["Warm-up", "Club", "Domestic", "International", "Legend"];

export default function HigherOrLowerGame() {
  const [mode, setMode] = useState<"daily" | "endless">("daily");
  const [run, setRun] = useState<Start | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [reveal, setReveal] = useState<Graded | null>(null);
  const [streak, setStreak] = useState(0);
  const [final, setFinal] = useState<Graded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(m = mode) {
    setBusy(true); setError(null); setFinal(null); setReveal(null);
    try {
      const s = await api<Start>("/higher-or-lower/start", { body: { mode: m } });
      setRun(s); setRound(s.round ?? null); setStreak(s.streak ?? 0);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function guess(g: "higher" | "lower") {
    if (!run?.runId || busy || reveal) return;
    setBusy(true); setError(null);
    try {
      const r = await api<Graded>(`/higher-or-lower/${run.runId}/guess`, { body: { guess: g } });
      play(r.correct ? "correct" : "wrong");
      setReveal(r); setStreak(r.streak);
      if (r.done) setFinal(r);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function next() { if (reveal?.next) { setRound(reveal.next); setReveal(null); } }

  return (
    <GameShell game="higher-or-lower" theme="theme-statsheet">
      <GameHeader kicker="PUZZLES & STATS · VERIFIED RECORDS" title="Higher or Lower." intro="Two players, one verified IPL record. Is the second player's number higher or lower? Every value comes from the CRICFIELD warehouse, with its qualification rule shown." />
      {!run && (
        <section className="pav-panel">
          <div className="pav-modes" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily challenge · 10 rounds</button>
            <button type="button" aria-pressed={mode === "endless"} onClick={() => setMode("endless")}>Endless streak</button>
          </div>
          <ul className="pav-rules">
            <li>Compare like with like: career against career, one season against the same season.</li>
            <li>Rounds get closer as your streak grows. One wrong answer ends the run.</li>
            <li>The daily challenge is the same for everyone and counts once per day (00:00 IST reset). Endless mode is unlimited practice.</li>
          </ul>
          <button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={() => void start()}>{busy ? "Loading…" : "Start"}</button>
          <ErrorNote error={error} onRetry={() => void start()} />
        </section>
      )}
      {run?.alreadyCompleted && <section className="pav-panel"><h2>Today's challenge is done.</h2><p className="pav-small">You scored a streak of {run.score}. A new challenge arrives at 00:00 IST. Endless mode is open any time.</p><button type="button" className="pav-btn pav-btn-gold" onClick={() => { setMode("endless"); setRun(null); void start("endless"); }}>Play endless</button></section>}
      {run && round && !run.alreadyCompleted && (
        <>
          <div className="hl-hud" aria-live="polite">
            <span>Streak <strong>{streak}</strong></span>
            <span>{LEVELS[round.level]} level</span>
            {run.rounds && <span>Round {round.round + 1} / {run.rounds}</span>}
          </div>
          <div className="hl-metric"><span className="pav-kicker">{round.metric.scope === "season" ? `IPL ${round.metric.season} season` : "IPL career"}</span><h2>{round.metric.label}</h2><p className="pav-small">{round.metric.threshold} · Data cut-off {run.data?.dataCutoff}</p></div>
          <div className="hl-duel">
            <article className="hl-card">
              <span className="hl-team">{round.a.team}</span>
              <h3>{round.a.name}</h3>
              <div className="hl-value"><strong>{fmt(round.a.value, round.metric.key)}</strong><small>{round.metric.unit}</small></div>
            </article>
            <div className="hl-vs" aria-hidden="true">vs</div>
            <article className={`hl-card hl-card-b ${reveal ? (reveal.correct ? "is-right" : "is-wrong") : ""}`}>
              <span className="hl-team">{round.b.team}</span>
              <h3>{round.b.name}</h3>
              {reveal ? (
                <div className="hl-value hl-reveal"><strong>{fmt(reveal.bValue, round.metric.key)}</strong><small>{round.metric.unit}</small><span className="hl-bar" style={{ ["--w" as string]: `${Math.min(100, (reveal.bValue / Math.max(reveal.aValue, reveal.bValue)) * 100)}%` }} /></div>
              ) : (
                <div className="hl-choices">
                  <button type="button" className="pav-btn pav-btn-green" disabled={busy} onClick={() => void guess("higher")}><ArrowUp size={16} aria-hidden="true" /> Higher</button>
                  <button type="button" className="pav-btn" disabled={busy} onClick={() => void guess("lower")}><ArrowDown size={16} aria-hidden="true" /> Lower</button>
                </div>
              )}
            </article>
          </div>
          {reveal && !final && <div className="hl-next"><p role="status">{reveal.correct ? "Correct." : "Not this time."} {round.b.name}: {fmt(reveal.bValue, round.metric.key)} vs {fmt(reveal.aValue, round.metric.key)}.</p><button type="button" className="pav-btn pav-btn-gold" onClick={next} autoFocus>Next pair →</button></div>}
          <ErrorNote error={error} />
          {final && (
            <ResultPanel game="higher-or-lower" score={final.streak} dailyKey={run.day ?? undefined} outcome={final.outcome}
              headline={final.correct ? `A perfect ${final.streak}/${run.rounds}!` : `Streak of ${final.streak}.`}
              lines={[`Last pair: ${round.b.name} ${fmt(final.bValue, round.metric.key)} vs ${round.a.name} ${fmt(final.aValue, round.metric.key)} (${round.metric.label.toLowerCase()}).`]}
              share={`${run.day ? `Daily ${run.day}` : "Endless"} · streak ${final.streak}`}
              onReplay={() => { setRun(null); setRound(null); }} replayLabel="Choose a mode" />
          )}
          <DataNote data={run.data} extra="Higher or Lower compares players only when both meet the shown qualification. Ties are never asked." />
        </>
      )}
      <Leaderboard game="higher-or-lower" />
    </GameShell>
  );
}
