import { useState } from "react";
import { dailyKey } from "@workspace/arcade-rules";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, PlayerSearch, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

interface Cond { key: string; label: string }
interface Grid { rows: Cond[]; cols: Cond[]; answerCounts: number[] }
interface View { filled: ({ id: string; name: string } | null)[]; attemptsLeft: number; rarity: (number | null)[] }
interface Start extends Partial<View> { runId?: string; grid?: Grid; alreadyCompleted?: boolean; score?: number; data?: Provenance }
interface End { score: number; cells: number; examples: string[][]; outcome: ResultOutcome | null }

export default function CricketGridGame() {
  const [mode, setMode] = useState<"daily" | "practice">("daily");
  const [run, setRun] = useState<Start | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const [end, setEnd] = useState<End | null>(null);
  const [flash, setFlash] = useState<{ cell: number; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true); setError(null); setEnd(null); setCell(null);
    try { const s = await api<Start>("/cricket-grid/start", { body: { mode } }); setRun(s); if (s.filled) setView({ filled: s.filled, attemptsLeft: s.attemptsLeft!, rarity: s.rarity! }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function guess(p: { id: string; name: string }) {
    if (cell == null || !run?.runId) return;
    setBusy(true); setError(null);
    try {
      const r = await api<View & { correct: boolean; done: boolean } & Partial<End>>(`/cricket-grid/${run.runId}/guess`, { body: { cell, playerId: p.id } });
      play(r.correct ? "correct" : "wrong");
      setFlash({ cell, ok: r.correct });
      setView({ filled: r.filled, attemptsLeft: r.attemptsLeft, rarity: r.rarity });
      if (r.correct) setCell(null);
      if (r.done) setEnd(r as unknown as End);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function stop() {
    if (!run?.runId) return;
    try { setEnd(await api<End>(`/cricket-grid/${run.runId}/finish`, { body: {} })); } catch (e) { setError((e as Error).message); }
  }
  const grid = run?.grid;
  const used = view?.filled.filter(Boolean).map((p) => p!.id) ?? [];
  return (
    <GameShell game="cricket-grid" theme="theme-grid">
      <GameHeader kicker="DAILY ARENA · NEW" title="Cricket Grid." intro="Nine cells. Each needs one IPL player who satisfies both the row and the column. Every cell is generated only when verified answers exist, and a player can only be used once." />
      {!run && (
        <section className="pav-panel">
          <div className="pav-modes" role="group" aria-label="Mode"><button type="button" aria-pressed={mode === "daily"} onClick={() => setMode("daily")}>Daily grid</button><button type="button" aria-pressed={mode === "practice"} onClick={() => setMode("practice")}>Practice grid</button></div>
          <ul className="pav-rules"><li>12 attempts for 9 cells. A wrong answer costs an attempt.</li><li>Each correct cell scores 10, plus up to 10 for rarity: the fewer players who chose your answer today, the more it earns (shown once five players have answered a cell).</li><li>“Played for” means appeared in at least one IPL match for that franchise (renamed franchises count as one). “Won an IPL title” means appeared that season for the champion.</li></ul>
          <button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={() => void start()}>{busy ? "Drawing the grid…" : "Open the grid"}</button>
          <ErrorNote error={error} onRetry={() => void start()} />
        </section>
      )}
      {run?.alreadyCompleted && <section className="pav-panel"><h2>Today's grid is complete.</h2><p className="pav-small">Score {run.score}. Tomorrow's grid unlocks at 00:00 IST.</p><button type="button" className="pav-btn" onClick={() => { setRun(null); setMode("practice"); }}>Try a practice grid</button></section>}
      {grid && view && (
        <div className="cg-wrap">
          <div className="cg-board" role="grid" aria-label="Cricket grid">
            <div className="cg-corner" aria-hidden="true">CF</div>
            {grid.cols.map((c) => <div key={c.key} className="cg-head" role="columnheader">{c.label}</div>)}
            {grid.rows.map((r, ri) => (
              <div key={r.key} role="row" style={{ display: "contents" }}>
                <div className="cg-head cg-row" role="rowheader">{r.label}</div>
                {grid.cols.map((c, ci) => {
                  const i = ri * 3 + ci, f = view.filled[i];
                  return <button key={c.key} type="button" role="gridcell" disabled={Boolean(f) || Boolean(end)} aria-pressed={cell === i}
                    aria-label={`${r.label} and ${c.label}${f ? `: ${f.name}` : ""}`}
                    className={`cg-cell ${f ? "filled" : ""} ${cell === i ? "active" : ""} ${flash?.cell === i ? (flash.ok ? "flash-ok" : "flash-bad") : ""}`}
                    onClick={() => setCell(i)}>
                    {f ? <><strong>{f.name}</strong>{view.rarity[i] != null && <small>{Math.round(view.rarity[i]! * 100)}% picked</small>}</> : <small>{grid.answerCounts[i]} possible</small>}
                  </button>;
                })}
              </div>
            ))}
          </div>
          <aside className="cg-side">
            <p className="cg-attempts" aria-live="polite"><strong>{view.attemptsLeft}</strong> attempts left · {used.length}/9 filled</p>
            {!end && (cell != null ? <>
              <p className="pav-small">{grid.rows[Math.floor(cell / 3)].label} <em>and</em> {grid.cols[cell % 3].label}</p>
              <PlayerSearch onPick={(p) => void guess(p)} disabled={busy} exclude={used} label="Name a player for this cell" />
            </> : <p className="pav-small">Choose a cell to answer.</p>)}
            {!end && <button type="button" className="pav-btn pav-btn-ghost" style={{ marginTop: 12 }} onClick={() => void stop()}>Finish and reveal</button>}
            <ErrorNote error={error} />
          </aside>
        </div>
      )}
      {end && grid && (
        <ResultPanel game="cricket-grid" score={end.score} outcome={end.outcome} dailyKey={mode === "daily" ? dailyKey() : undefined}
          headline={end.cells === 9 ? "Full grid!" : `${end.cells} of 9 cells.`}
          share={`${mode === "daily" ? `Daily grid ${dailyKey()}` : "Practice grid"} · ${end.cells}/9 · ${end.score} pts\n${view!.filled.map((f, i) => (f ? "🟩" : "⬛") + (i % 3 === 2 ? "\n" : "")).join("")}`}
          onReplay={() => setRun(null)} replayLabel="New grid">
          <details className="cg-examples"><summary>Example answers for every cell</summary><ol>{end.examples.map((ex, i) => <li key={i}><strong>{grid.rows[Math.floor(i / 3)].label} × {grid.cols[i % 3].label}:</strong> {ex.join(", ")}</li>)}</ol></details>
        </ResultPanel>
      )}
      <DataNote data={run?.data} />
      <Leaderboard game="cricket-grid" />
    </GameShell>
  );
}
