import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, PlayerSearch, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { dailyKey } from "@workspace/arcade-rules";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Mode = "daily" | "practice" | "legends" | "current" | "prospects";
const MODES: [Mode, string][] = [["daily", "Daily Mystery"], ["practice", "Unlimited practice"], ["legends", "IPL Legends"], ["current", "Current players"], ["prospects", "Emerging Indian players"]];
interface Clue { label: string; text: string }
interface Start { photoUrl?: string | null; runId?: string; clues?: Clue[]; wrong?: number; guesses?: string[]; maxWrong?: number; modeLabel?: string; alreadyCompleted?: boolean; score?: number; data?: Provenance }
interface Reveal { id: string; name: string; country: string; history: string; matches: number; firstSeason: number; lastSeason: number; titles: number[]; bat: { runs: number; sr: number } | null; bowl: { wickets: number; econ: number } | null }
interface End { done: true; score: number; player: Reveal; outcome: ResultOutcome | null; correct?: boolean }

export default function GuessCricketerGame() {
  const [mode, setMode] = useState<Mode>("daily");
  const [run, setRun] = useState<Start | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [guesses, setGuesses] = useState<{ name: string; ok: boolean }[]>([]);
  const [end, setEnd] = useState<End | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function start() {
    setBusy(true); setError(null); setEnd(null); setGuesses([]); setMessage("");
    try {
      const s = await api<Start>("/guess-cricketer/start", { body: { mode } });
      setRun(s); setClues(s.clues ?? []); setGuesses((s.guesses ?? []).map((name) => ({ name, ok: false })));
      if (s.clues) play("reveal");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function clue() {
    if (!run?.runId || busy) return;
    setBusy(true);
    try { const r = await api<{ clues: Clue[] }>(`/guess-cricketer/${run.runId}/clue`, { body: {} }); setClues(r.clues); play("reveal"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function answer(p: { id: string; name: string }) {
    if (!run?.runId || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await api<{ correct: boolean; done: boolean } & Partial<End>>(`/guess-cricketer/${run.runId}/answer`, { body: { playerId: p.id } });
      setGuesses((g) => [...g, { name: p.name, ok: r.correct }]);
      play(r.correct ? "correct" : "wrong");
      if (r.done) setEnd(r as End);
      else setMessage(`Not ${p.name}. ${clues.length < 5 ? "Reveal another hint, or guess again." : "Keep guessing."}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function giveUp() {
    if (!run?.runId) return;
    try { setEnd(await api<End>(`/guess-cricketer/${run.runId}/give-up`, { body: {} })); } catch (e) { setError((e as Error).message); }
  }
  const solved = guesses.some((g) => g.ok);
  return (
    <GameShell game="guess-cricketer" theme="theme-locker">
      <GameHeader kicker="PUZZLES & STATS · MYSTERY LOCKER" title="Guess the Cricketer." intro="A player is locked in the dressing room. Open five lockers of verified clues — role, nationality, franchise history, career numbers and a strong clue — and name them in as few as you can." />
      {!run && (
        <section className="pav-panel">
          <div className="pav-modes" role="group" aria-label="Mode">{MODES.map(([m, l]) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{l}</button>)}</div>
          <ul className="pav-rules"><li>100 points for a first-clue answer; each extra clue costs 15 and each wrong guess 10 (minimum 10 when solved).</li><li>Five wrong guesses end the round. Players are matched by their canonical CRICFIELD identity, so any recorded name works.</li><li>Only players with complete verified records are used, and every puzzle is checked so the clues fit exactly one player.</li></ul>
          <button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={() => void start()}>{busy ? "Unlocking…" : "Reveal the mystery"}</button>
          <ErrorNote error={error} onRetry={() => void start()} />
        </section>
      )}
      {run?.alreadyCompleted && <section className="pav-panel"><h2>Today's mystery is solved.</h2><p className="pav-small">Score {run.score}. A new mystery arrives at 00:00 IST. Practice modes are always open.</p><button type="button" className="pav-btn" onClick={() => { setRun(null); setMode("practice"); }}>Practice</button></section>}
      {run && !run.alreadyCompleted && (
        <div className="gc-room">
          <div className={`gc-mystery-photo ${end ? "revealed" : ""}`}>
            {run.photoUrl ? <img src={run.photoUrl} alt={end ? end.player.name : "Masked mystery cricketer"} style={{filter:end?"none":`blur(${Math.max(10,26-clues.length*3)}px)`}} /> : <div className="gc-silhouette" aria-hidden="true">?</div>}
            {!end && <span>WHO AM I?</span>}
          </div>
          <div className="gc-lockers">
            {Array.from({ length: 5 }, (_, i) => {
              const c = clues[i];
              return <div key={i} className={`gc-locker ${c ? "open" : ""}`}>
                <span className="gc-num">{String(i + 1).padStart(2, "0")}</span>
                {c ? <><LockOpen size={16} aria-hidden="true" /><small>{c.label}</small><p>{c.text}</p></> : <><Lock size={16} aria-hidden="true" /><small>Locked</small></>}
              </div>;
            })}
          </div>
          <aside className="gc-side">
            {!end && <>
              <PlayerSearch onPick={(p) => void answer(p)} disabled={busy} label="Type a player's name" />
              <div className="gc-actions">
                <button type="button" className="pav-btn" disabled={busy || clues.length >= 5} onClick={() => void clue()}>Open next locker (−15)</button>
                <button type="button" className="pav-btn pav-btn-ghost" onClick={() => void giveUp()}>Reveal</button>
              </div>
              <p className="pav-small" role="status">{message || `${clues.length} of 5 clues open · ${(run.maxWrong ?? 5) - guesses.filter((g) => !g.ok).length} guesses left`}</p>
              {guesses.length > 0 && <ul className="gc-guesses">{guesses.map((g, i) => <li key={i} className={g.ok ? "ok" : ""}>{g.ok ? "✓" : "✗"} {g.name}</li>)}</ul>}
            </>}
            <ErrorNote error={error} />
          </aside>
        </div>
      )}
      {end && (
        <ResultPanel game="guess-cricketer" score={end.score} outcome={end.outcome} dailyKey={mode === "daily" ? dailyKey() : undefined}
          headline={solved ? `${end.player.name}, in ${clues.length} clue${clues.length > 1 ? "s" : ""}.` : `It was ${end.player.name}.`}
          share={`${mode === "daily" ? "Daily Mystery" : MODES.find((m) => m[0] === mode)![1]} · ${solved ? `solved with ${clues.length}/5 clues` : "unsolved"} · ${end.score} pts`}
          onReplay={() => setRun(null)} replayLabel="Another mystery">
          <div className="gc-card">
            <span className="pav-kicker">Player card</span>
            <h3>{end.player.name}</h3>
            <p>{end.player.country} · {end.player.history}</p>
            <div className="pav-stat-grid">
              <div className="pav-stat"><small>Matches</small><strong>{end.player.matches}</strong></div>
              {end.player.bat && <div className="pav-stat"><small>Runs · SR</small><strong>{end.player.bat.runs} · {end.player.bat.sr.toFixed(1)}</strong></div>}
              {end.player.bowl && end.player.bowl.wickets > 0 && <div className="pav-stat"><small>Wkts · Econ</small><strong>{end.player.bowl.wickets} · {end.player.bowl.econ.toFixed(2)}</strong></div>}
              <div className="pav-stat"><small>Titles</small><strong>{end.player.titles.length ? end.player.titles.join(", ") : "—"}</strong></div>
            </div>
          </div>
        </ResultPanel>
      )}
      <DataNote data={run?.data} extra="Titles count seasons the player appeared for that year's champion." />
      <Leaderboard game="guess-cricketer" />
    </GameShell>
  );
}
