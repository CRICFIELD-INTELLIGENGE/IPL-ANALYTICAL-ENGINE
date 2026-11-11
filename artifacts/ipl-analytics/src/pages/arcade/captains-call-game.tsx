import { useMemo, useState } from "react";
import { captain } from "@workspace/arcade-rules";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { startSession, submitSession, type Session, type Submitted } from "@/lib/arcade/session";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Extra = { baseRates?: captain.BaseRates };
const pct = (p: number) => `${Math.round(p * 20) * 5}%`; // nearest 5% — no fake precision
const range = (e: captain.Estimate) => `${pct(e.low)}–${pct(e.high)}`;
const objective = (s: captain.Scenario) => (s.objective.kind === "defend" ? `Stop them scoring ${s.objective.runs} in ${s.balls} balls` : s.objective.kind === "wickets" ? `Take ${s.objective.wickets} wicket${s.objective.wickets > 1 ? "s" : ""} in ${s.balls} balls` : `Concede ${s.objective.runs} or fewer in ${s.balls} balls`);

export default function CaptainsCallGame() {
  const [scenario, setScenario] = useState<captain.Scenario>(captain.SCENARIOS[0]);
  const [session, setSession] = useState<Session<Extra> | null>(null);
  const [choice, setChoice] = useState<captain.Choice>({ bowler: "a", plan: "yorkers", field: "balanced" });
  const [result, setResult] = useState<captain.CallResult | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null | "offline">(null);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = session?.extra.baseRates;
  const preview = useMemo(() => (base && session ? captain.estimate(base, scenario, choice, session.seed, 600) : null), [base, scenario, choice, session]);

  async function begin(s: captain.Scenario) {
    setScenario(s); setResult(null); setSubmitted(null); setShown(0); setError(null);
    setChoice({ bowler: s.bowlers[0].id, plan: "yorkers", field: "balanced" });
    try {
      const sess = await startSession<Extra>("captains-call", s.id, { scenario: s.id });
      if (!sess.extra.baseRates) throw new Error("Base rates need the CRICFIELD data service. Please retry when online.");
      setSession(sess);
    } catch (e) { setError((e as Error).message); }
  }
  async function decide() {
    if (!session || !base) return;
    setBusy(true);
    const r = captain.playCall(base, scenario, choice, session.seed);
    setResult(r);
    // Reveal the spell ball by ball.
    r.outcome.log.forEach((b, k) => setTimeout(() => { setShown(k + 1); play(b === "W" ? "wicket" : b === "6" || b === "4" ? "bat" : "tick"); }, 450 * (k + 1)));
    try { setSubmitted((await submitSession(session, choice)) ?? "offline"); } catch (e) { setError((e as Error).message); setSubmitted("offline"); } finally { setBusy(false); }
  }
  const bowlerName = (id: string) => scenario.bowlers.find((b) => b.id === id)?.name ?? id;
  const done = result && shown >= result.outcome.log.length;
  return (
    <GameShell game="captains-call" theme="theme-tactics" wide>
      <GameHeader kicker="TACTICAL LAB · NEW" title="Captain's Call." intro="You have the ball and the field. Pick the bowler, the plan and the field setting. The game estimates the range of outcomes, then plays out one simulated spell." />
      <div className="cc-scenarios" role="group" aria-label="Scenario">{captain.SCENARIOS.map((s) => <button key={s.id} type="button" aria-pressed={session != null && scenario.id === s.id} className="cc-scn" onClick={() => void begin(s)}><strong>{s.title}</strong><small>{s.brief}</small></button>)}</div>
      <ErrorNote error={error} />
      {session && base && (
        <div className="cc-board">
          <section className="pav-panel">
            <span className="pav-kicker">{scenario.phase} · {captain.BATTERS[scenario.batter]}</span>
            <h2 style={{ margin: "6px 0 14px" }}>{objective(scenario)}</h2>
            <fieldset className="cc-group" disabled={Boolean(result)}><legend>Bowler</legend>{scenario.bowlers.map((b) => <label key={b.id}><input type="radio" name="bowler" checked={choice.bowler === b.id} onChange={() => setChoice({ ...choice, bowler: b.id })} /> <strong>{b.name}</strong> <small>{captain.BOWLER_TYPES[b.type]} · {b.note}</small></label>)}</fieldset>
            <fieldset className="cc-group" disabled={Boolean(result)}><legend>Plan</legend>{(Object.keys(captain.PLANS) as captain.Plan[]).map((p) => <label key={p}><input type="radio" name="plan" checked={choice.plan === p} onChange={() => setChoice({ ...choice, plan: p })} /> {captain.PLANS[p]}</label>)}</fieldset>
            <fieldset className="cc-group" disabled={Boolean(result)}><legend>Field</legend>{(Object.keys(captain.FIELDS) as captain.FieldSet[]).map((f) => <label key={f}><input type="radio" name="field" checked={choice.field === f} onChange={() => setChoice({ ...choice, field: f })} /> {captain.FIELDS[f]}</label>)}</fieldset>
          </section>
          <section className="pav-panel cc-read">
            <h3>Dressing-room read</h3>
            {preview && <><p className="cc-big">{range(preview)}</p><p className="pav-small">Estimated chance this plan succeeds (90% range from simulation), median {preview.medianRuns} runs conceded.</p></>}
            <FieldDiagram field={choice.field} />
            {!result && <button type="button" className="pav-btn pav-btn-gold" disabled={busy} onClick={() => void decide()}>Make the call</button>}
            {result && <div className="cc-spell" aria-live="polite"><h3>The spell</h3><div className="cc-balls">{result.outcome.log.slice(0, shown).map((b, k) => <span key={k} className={b === "W" ? "w" : b === "6" || b === "4" ? "b" : ""}>{b}</span>)}</div>{done && <p><strong>{result.outcome.success ? "Plan worked." : "Plan failed."}</strong> {result.outcome.runs} runs, {result.outcome.wickets} wicket{result.outcome.wickets === 1 ? "" : "s"} in {result.outcome.legal} legal balls.</p>}</div>}
          </section>
        </div>
      )}
      {done && result && (
        <ResultPanel game="captains-call" score={result.points} outcome={submitted === "offline" || !submitted ? null : submitted.outcome}
          headline={result.outcome.success ? "Captain's call vindicated." : "It didn't come off this time."}
          lines={[`Your plan: ${bowlerName(choice.bowler)}, ${captain.PLANS[choice.plan].toLowerCase()}, ${choice.field} field — success ${range(result.chosen)}.`, `Best estimate on the board: ${bowlerName(result.best.choice.bowler)}, ${captain.PLANS[result.best.choice.plan].toLowerCase()}, ${result.best.choice.field} field — ${range(result.best.est)}.`, "A good decision can still lose a single spell; the score rewards the decision first."]}
          share={`Captain's Call · ${scenario.title} · ${result.points} pts`} onReplay={() => void begin(scenario)} replayLabel="Replay this scenario" />
      )}
      <DataNote extra="Base ball-by-ball rates for each phase come from every IPL delivery in the CRICFIELD warehouse. Bowler, plan, field and batter effects are synthetic game balancing applied on top — they are not measured matchup data." />
      <Leaderboard game="captains-call" />
    </GameShell>
  );
}

function FieldDiagram({ field }: { field: captain.FieldSet }) {
  const ring = field === "attacking" ? 7 : field === "balanced" ? 5 : 4;
  const spots = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2 - Math.PI / 2; const deep = i >= ring; const r = deep ? 92 : 52; return { x: 110 + Math.cos(a) * r, y: 110 + Math.sin(a) * r, deep }; });
  return <svg viewBox="0 0 220 220" className="cc-field" role="img" aria-label={`${field} field: ${9 - ring} fielders on the boundary`}><circle cx="110" cy="110" r="104" fill="#1f5a3f" /><circle cx="110" cy="110" r="64" fill="none" stroke="#f5f1e6" strokeOpacity="0.35" strokeDasharray="4 4" /><rect x="104" y="92" width="12" height="36" fill="#c9a970" />{spots.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="5" fill={s.deep ? "#d9b25f" : "#f5f1e6"} />)}</svg>;
}
