import { useState } from "react";
import { Link } from "wouter";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

interface Cand { id: string; name: string; country: string | null; team: string; priceCr: number; balls: number; rawRate: number; rawWktRate: number; overBudget: boolean; seasons: string }
interface Problem { brief: { key: string; title: string; need: string; phase: string; side: "bowl" | "bat" }; budgetCr: number; league: { rate: number; wktRate: number; window: string }; candidates: Cand[]; rateLabel: string }
interface Full extends Cand { shrunkRate: number; impact: number; band: number; value: number; riskAdjusted: number }
interface Graded { points: number; modelPick: string; tied: string[]; truth: Record<string, boolean>; ranking: string[]; candidates: Full[]; outcome: ResultOutcome | null }

export default function ScoutGemGame() {
  const [run, setRun] = useState<{ runId: string; problem: Problem; reasons: Record<string, string>; data: Provenance } | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [res, setRes] = useState<Graded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true); setError(null); setRes(null); setPick(null); setReasons([]);
    try { setRun(await api("/scout-gem/start", { body: {} })); play("reveal"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function submit() {
    if (!run || !pick) return;
    setBusy(true);
    try { const r = await api<Graded>(`/scout-gem/${run.runId}/answer`, { body: { pickId: pick, reasons } }); setRes(r); play(r.tied.includes(pick) ? "correct" : "wrong"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const p = run?.problem;
  const bowl = p?.brief.side === "bowl";
  const name = (id: string) => res?.candidates.find((c) => c.id === id)?.name ?? id;
  return (
    <GameShell game="scout-gem" theme="theme-scouting" wide>
      <GameHeader kicker="TACTICAL LAB · NEW" title="Scout the Hidden Gem." intro="A real shortlist from the last two IPL seasons, a budget, and a brief. Read the numbers, weigh the sample sizes, pick your player and say why. Then see how a transparent model would have ranked them." />
      {!run && <section className="pav-panel"><ul className="pav-rules"><li>Up to 60 points for picking the model's choice (or a candidate statistically tied with it), 35 for its second, 15 for its third. Over-budget picks score nothing.</li><li>Each reason you claim earns 10 if it is true of your pick, and costs 5 if it is not.</li><li>Prices are real 2026 contract prices from squad lists — not predicted auction prices.</li></ul><button type="button" className="pav-btn pav-btn-gold" style={{ marginTop: 14 }} disabled={busy} onClick={() => void start()}>{busy ? "Opening the file…" : "Open a scouting brief"}</button><ErrorNote error={error} onRetry={() => void start()} /></section>}
      {p && (
        <>
          <section className="sg-brief">
            <div><span className="pav-kicker">Brief · {p.brief.title}</span><h2>{p.brief.need}</h2></div>
            <div className="pav-stat-grid">
              <div className="pav-stat"><small>Budget</small><strong>₹{p.budgetCr} Cr</strong></div>
              <div className="pav-stat"><small>League {bowl ? "economy" : "strike rate"}</small><strong>{p.league.rate}</strong></div>
              <div className="pav-stat"><small>League balls / {bowl ? "wicket" : "dismissal"}</small><strong>{p.league.wktRate}</strong></div>
              <div className="pav-stat"><small>Window</small><strong>{p.league.window}</strong></div>
            </div>
          </section>
          <div className="sg-table" role="radiogroup" aria-label="Candidates">
            <div className="sg-row sg-headrow"><span>Player</span><span>{p.rateLabel}</span><span>Balls / {bowl ? "wkt" : "dismissal"}</span><span>Sample (balls)</span><span>2026 contract</span></div>
            {p.candidates.map((c) => {
              const full = res?.candidates.find((x) => x.id === c.id);
              return <label key={c.id} className={`sg-row ${pick === c.id ? "picked" : ""} ${c.overBudget ? "over" : ""}`}>
                <span><input type="radio" name="gem" disabled={Boolean(res)} checked={pick === c.id} onChange={() => setPick(c.id)} /> <strong>{c.name}</strong><small>{c.country} · {c.team}</small></span>
                <span>{c.rawRate}{full && <small>model {full.shrunkRate}</small>}</span>
                <span>{c.rawWktRate}</span>
                <span>{c.balls}{c.balls < 150 && <small className="sg-warn">small sample</small>}</span>
                <span>₹{c.priceCr} Cr{c.overBudget && <small className="sg-warn">over budget</small>}</span>
              </label>;
            })}
          </div>
          {!res && <section className="pav-panel">
            <h3 style={{ marginTop: 0 }}>Why this player?</h3>
            <div className="sg-reasons">{Object.entries(run!.reasons).map(([k, l]) => <label key={k}><input type="checkbox" checked={reasons.includes(k)} onChange={(e) => setReasons((r) => (e.target.checked ? [...r, k] : r.filter((x) => x !== k)))} /> {l}</label>)}</div>
            <button type="button" className="pav-btn pav-btn-gold" disabled={!pick || busy} onClick={() => void submit()}>Submit scouting report</button>
          </section>}
          <ErrorNote error={error} />
          {res && (
            <ResultPanel game="scout-gem" score={res.points} outcome={res.outcome} headline={res.tied.includes(pick!) ? "Your pick matches the model." : `The model preferred ${name(res.modelPick)}.`}
              share={`Scout the Hidden Gem · ${p.brief.title} · ${res.points} pts`} onReplay={() => void start()} replayLabel="New brief">
              <div className="sg-model">
                <h3>How the model ranked them</h3>
                <p className="pav-small">Each player's phase rate is shrunk toward the league average (as if they had 120 extra league-average balls), converted to runs per {bowl ? "four overs (runs saved plus wickets above average)" : "24 balls (runs above average minus extra dismissals)"}, then a 90% uncertainty band is half-subtracted. Over-budget players are excluded. Candidates within the leader's band count as tied.</p>
                <ol>{res.ranking.map((id) => { const c = res.candidates.find((x) => x.id === id)!; return <li key={id}><strong>{c.name}</strong> — impact {c.impact > 0 ? "+" : ""}{c.impact} ± {(c.band / 2).toFixed(1)}, value {c.value} per ₹ Cr{res.tied.includes(id) ? " · top tier" : ""}</li>; })}</ol>
                <p className="pav-small">Your reasons: {reasons.length ? reasons.map((r) => `${run!.reasons[r]} ${res.truth[r] ? "✓" : "✗"}`).join(" · ") : "none claimed"}</p>
                <p className="pav-small">Dig deeper in <Link href="/scout">Scout Lab</Link>.</p>
              </div>
            </ResultPanel>
          )}
          <DataNote data={run?.data} extra="This is a simple transparent model for a game, not an expert ranking. Small samples are flagged and widen the uncertainty." />
        </>
      )}
      <Leaderboard game="scout-gem" />
    </GameShell>
  );
}
