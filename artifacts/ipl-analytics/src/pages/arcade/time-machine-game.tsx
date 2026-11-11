import { useEffect, useState } from "react";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

interface Q { id: string; kind: string; prompt: string; options: string[] }
interface Answer { correct: boolean; answer: string; fact: string; score: number; total: number; done: boolean; unlocksNext: boolean; outcome: ResultOutcome | null }
const KEY = "cricfield-time-machine";
/** Chapters unlock in order; progress is kept in this browser (scores also go to your account when signed in). */
function loadProgress(): Record<number, number> { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } }

export default function TimeMachineGame() {
  const [seasons, setSeasons] = useState<number[]>([]);
  const [data, setData] = useState<Provenance | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>(loadProgress);
  const [season, setSeason] = useState<number | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer & { picked: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ seasons: number[]; data: Provenance }>("/time-machine/chapters").then((r) => { setSeasons(r.seasons); setData(r.data); }).catch((e) => setError(e.message)); }, []);
  const unlocked = (s: number) => s === seasons[0] || (progress[s - 1] ?? 0) >= 3 || progress[s] != null;

  async function open(s: number) {
    setBusy(true); setError(null); setAnswers({}); setIdx(0);
    try { const r = await api<{ runId: string; questions: Q[] }>("/time-machine/start", { body: { season: s } }); setSeason(s); setRunId(r.runId); setQs(r.questions); play("reveal"); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function pick(q: Q, option: string) {
    if (!runId || answers[q.id] || busy) return;
    setBusy(true);
    try {
      const r = await api<Answer>(`/time-machine/${runId}/answer`, { body: { questionId: q.id, option } });
      play(r.correct ? "correct" : "wrong");
      setAnswers((a) => ({ ...a, [q.id]: { ...r, picked: option } }));
      if (r.done && season) {
        const next = { ...progress, [season]: Math.max(progress[season] ?? 0, r.score) };
        setProgress(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const q = qs[idx];
  const last = Object.values(answers).find((a) => a.done);
  return (
    <GameShell game="time-machine" theme="theme-scrapbook">
      <GameHeader kicker="DAILY ARENA · NEW" title="IPL Time Machine." intro="A scrapbook of every IPL season. Each chapter asks five questions built from verified records — champions, run and wicket leaders, franchises and great innings. Score 3/5 to unlock the next season." />
      {!season && (
        <section className="tm-timeline" aria-label="Season chapters">
          {seasons.map((s) => {
            const open_ = unlocked(s);
            return <button key={s} type="button" className={`tm-chapter ${progress[s] === 5 ? "gold" : ""}`} disabled={!open_ || busy} onClick={() => void open(s)}>
              <span className="tm-year">{s}</span>
              <small>{progress[s] != null ? `Best ${progress[s]}/5` : open_ ? "Open chapter" : "Locked"}</small>
            </button>;
          })}
        </section>
      )}
      <ErrorNote error={error} />
      {season && q && idx < qs.length && (
        <section className="tm-page">
          <div className="tm-page-head"><span className="tm-stamp">IPL {season}</span><span className="pav-small">Question {idx + 1} of {qs.length} · {q.kind}</span></div>
          <h2>{q.prompt}</h2>
          <div className="tm-options">{q.options.map((o) => {
            const a = answers[q.id];
            const cls = a ? (o === a.answer ? "right" : o === a.picked ? "wrong" : "") : "";
            return <button key={o} type="button" className={`tm-option ${cls}`} disabled={Boolean(a) || busy} onClick={() => void pick(q, o)}>{o}</button>;
          })}</div>
          {answers[q.id] && <div className="tm-fact" role="status"><strong>{answers[q.id].correct ? "Correct." : "Not quite."}</strong> {answers[q.id].fact}<button type="button" className="pav-btn pav-btn-gold" onClick={() => setIdx((i) => i + 1)} autoFocus>{idx + 1 < qs.length ? "Turn the page →" : "Close the chapter →"}</button></div>}
        </section>
      )}
      {season && last && idx >= qs.length && (
        <ResultPanel game="time-machine" score={last.score * 20} outcome={last.outcome}
          headline={`IPL ${season}: ${last.score}/${last.total}`}
          lines={[last.unlocksNext ? `Chapter ${season + 1 <= (seasons.at(-1) ?? season) ? season + 1 : season} is open.` : "Score 3 or more to unlock the next chapter."]}
          share={`Time Machine · IPL ${season} · ${last.score}/${last.total}`}
          onReplay={() => { setSeason(null); setQs([]); }} replayLabel="Back to the timeline" />
      )}
      <DataNote data={data} extra="Franchises are named by their current identity (e.g. Kings XI Punjab appears as Punjab Kings). Champions are the recorded winners of each final; ties for a season lead are never asked." />
      <Leaderboard game="time-machine" />
    </GameShell>
  );
}
