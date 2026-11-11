import { useEffect, useMemo, useState } from "react";
import { ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, listSaves, removeSave, writeSave, type ResultOutcome, type SaveSlot } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

interface P { id: string; name: string; team: string | null; role: string; overseas: boolean; keeper: boolean; rating: number; contractCr: number | null; marketCr: number; marketLow: number; marketHigh: number }
interface Franchise { code: string; name: string; strength: number; squad: P[] }
interface Setup { franchises: Franchise[]; freeAgents: P[]; purseCr: number; maxRetain: number; provenance: { version: string; dataCutoff: string } }
interface Match { n: number; home: string; away: string; winner: string; margin: string; userInvolved: boolean; note?: string }
interface Season { matches: Match[]; table: { code: string; played: number; won: number; lost: number; points: number }[]; playoffs: Match[]; champion: string; userFinish: string; seasonPoints: number; injuries: { player: string; match: number; out: number }[]; strengths: Record<string, number> }
type Stage = "retain" | "trade" | "market" | "select" | "season" | "done";
interface Career { slot: string; team: string; seed: string; stage: Stage; retained: string[]; squad: string[]; purseCr: number; rivals: Record<string, string[]>; approach: "balanced" | "aggressive" | "conservative"; season: Season | null; revealed: number; log: string[] }
const SLOTS = ["career-1", "career-2", "career-3"];
const MIN_SQUAD = 18, MAX_SQUAD = 25;

export default function FranchiseGmGame() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [saves, setSaves] = useState<SaveSlot<Career>[]>([]);
  const [c, setC] = useState<Career | null>(null);
  const [strength, setStrength] = useState<{ strength: number; feasible: boolean; gaps: string[]; xii: string[] } | null>(null);
  const [trade, setTrade] = useState<{ ai: string; give: string; get: string; msg: string }>({ ai: "", give: "", get: "", msg: "" });
  const [outcome, setOutcome] = useState<ResultOutcome | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<Setup>("/gm/setup").then(setSetup).catch((e) => setError(e.message)); void listSaves<Career>("franchise-gm").then(setSaves); }, []);
  const players = useMemo(() => { const m = new Map<string, P>(); setup?.franchises.forEach((f) => f.squad.forEach((p) => m.set(p.id, p))); setup?.freeAgents.forEach((p) => m.set(p.id, p)); return m; }, [setup]);
  const name = (id: string) => players.get(id)?.name ?? id;
  const update = (patch: Partial<Career>) => setC((cur) => { const next = { ...cur!, ...patch }; void writeSave("franchise-gm", next.slot, next); return next; });

  useEffect(() => {
    if (!c || !["trade", "market", "select"].includes(c.stage) || c.squad.length < 12) { setStrength(null); return; }
    api<typeof strength>("/gm/strength", { body: { ids: c.squad } }).then(setStrength).catch(() => setStrength(null));
  }, [c?.squad.join(","), c?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function newCareer(slot: string, team: string) {
    const f = setup!.franchises.find((x) => x.code === team)!;
    const rivals = Object.fromEntries(setup!.franchises.filter((x) => x.code !== team).map((x) => [x.code, x.squad.map((p) => p.id)]));
    const career: Career = { slot, team, seed: `gm:${slot}:${Date.now()}`, stage: "retain", retained: f.squad.slice().sort((a, b) => b.rating - a.rating).slice(0, 4).map((p) => p.id), squad: [], purseCr: setup!.purseCr, rivals, approach: "balanced", season: null, revealed: 0, log: [`Took charge of ${f.name}.`] };
    setC(career); void writeSave("franchise-gm", slot, career);
  }
  const own = c ? setup?.franchises.find((f) => f.code === c.team) : null;
  const contract = (id: string) => players.get(id)?.contractCr ?? players.get(id)?.marketCr ?? 0;

  function confirmRetentions() {
    const cost = c!.retained.reduce((s, id) => s + contract(id), 0);
    // Retained players plus the rest of the list re-signed is out of scope: released players leave the squad.
    update({ stage: "trade", squad: c!.retained, purseCr: Math.round((setup!.purseCr - cost) * 100) / 100, log: [...c!.log, `Retained ${c!.retained.length} for ₹${cost.toFixed(2)} Cr; released ${own!.squad.length - c!.retained.length}.`] });
  }
  async function proposeTrade() {
    if (!trade.ai || !trade.give || !trade.get) return;
    setBusy(true);
    try {
      const r = await api<{ accepted: boolean; reason: string }>("/gm/trade", { body: { aiTeam: trade.ai, aiSquad: c!.rivals[trade.ai], give: [trade.give], get: [trade.get] } });
      play(r.accepted ? "correct" : "wrong");
      if (r.accepted) {
        const rivals = { ...c!.rivals, [trade.ai]: [...c!.rivals[trade.ai].filter((x) => x !== trade.get), trade.give] };
        update({ squad: [...c!.squad.filter((x) => x !== trade.give), trade.get], rivals, purseCr: Math.round((c!.purseCr + contract(trade.give) - contract(trade.get)) * 100) / 100, log: [...c!.log, `Traded ${name(trade.give)} to ${trade.ai} for ${name(trade.get)}.`] });
      }
      setTrade({ ...trade, give: "", get: "", msg: r.reason });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function sign(p: P) {
    if (!c || c.squad.length >= MAX_SQUAD || p.marketCr > c.purseCr) return;
    play("hammer");
    update({ squad: [...c.squad, p.id], purseCr: Math.round((c.purseCr - p.marketCr) * 100) / 100, log: [...c.log, `Signed ${p.name} for ₹${p.marketCr.toFixed(2)} Cr.`] });
  }
  async function playSeason() {
    setBusy(true); setError(null);
    try {
      const r = await api<{ season: Season; outcome: ResultOutcome | null }>("/gm/season", { body: { seed: c!.seed, team: c!.team, squad: c!.squad, approach: c!.approach, rivals: c!.rivals, record: true } });
      update({ stage: "season", season: r.season, revealed: 0 });
      setOutcome(r.outcome);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const userMatches = c?.season?.matches.filter((m) => m.userInvolved) ?? [];
  const freeAgents = setup?.freeAgents.filter((p) => !c?.squad.includes(p.id) && !Object.values(c?.rivals ?? {}).flat().includes(p.id)) ?? [];
  return (
    <GameShell game="franchise-gm" theme="theme-gm" wide>
      <GameHeader kicker="FRANCHISE CAREER · NEW · MILESTONE 1" title="Franchise GM." intro="Run an IPL franchise through one simulated season: retentions, trades, the free-agent market, selection and tactics. Squads and ratings start from real CRICFIELD data; every match, injury and result after that is fiction." />
      <ErrorNote error={error} />
      {!c && setup && (
        <section className="pav-panel">
          <h3>Career slots</h3>
          <div className="gm-slots">{SLOTS.map((slot) => { const s = saves.find((x) => x.slot === slot); return <div key={slot} className="gm-slot">
            <strong>{slot.replace("career-", "Slot ")}</strong>
            {s ? <><span>{s.state.team} · {s.state.stage}{s.state.season ? ` · ${s.state.season.userFinish}` : ""}</span><button type="button" className="pav-btn pav-btn-gold" onClick={() => setC(s.state)}>Resume</button><button type="button" className="pav-btn pav-btn-ghost" onClick={() => { void removeSave("franchise-gm", slot); setSaves(saves.filter((x) => x.slot !== slot)); }}>Delete</button></>
              : <><label>Franchise <select id={`t-${slot}`} defaultValue="MI">{setup.franchises.map((f) => <option key={f.code} value={f.code}>{f.name}</option>)}</select></label><button type="button" className="pav-btn pav-btn-gold" onClick={() => newCareer(slot, (document.getElementById(`t-${slot}`) as HTMLSelectElement).value)}>New career</button></>}
          </div>; })}</div>
          <p className="pav-small">Saved to your account when signed in, otherwise in this browser. Player ratings: Player Intelligence snapshot {setup.provenance.version} (data to {setup.provenance.dataCutoff}).</p>
        </section>
      )}
      {c && own && (
        <>
          <nav className="gm-steps" aria-label="Season stages">{(["retain", "trade", "market", "select", "season"] as Stage[]).map((s, i) => <span key={s} className={c.stage === s ? "on" : ""}>{i + 1}. {s === "retain" ? "Retentions" : s === "trade" ? "Trades" : s === "market" ? "Market" : s === "select" ? "Selection" : "Season"}</span>)}</nav>
          <div className="gm-status"><span>{own.name}</span><span>Purse ₹{c.purseCr.toFixed(2)} Cr <small>(game purse)</small></span><span>Squad {c.squad.length || c.retained.length}/{MAX_SQUAD}</span>{strength && <span>Best-XII strength {strength.strength.toFixed(1)} runs/match above replacement</span>}</div>
          {c.stage === "retain" && <section className="pav-panel">
            <h3>Retentions — keep up to {setup!.maxRetain}</h3>
            <p className="pav-small">Costs are 2026 contract prices. Everyone you release leaves the squad.</p>
            <ul className="gm-list">{own.squad.slice().sort((a, b) => b.rating - a.rating).map((p) => <li key={p.id}><label><input type="checkbox" checked={c.retained.includes(p.id)} disabled={!c.retained.includes(p.id) && c.retained.length >= setup!.maxRetain} onChange={(e) => update({ retained: e.target.checked ? [...c.retained, p.id] : c.retained.filter((x) => x !== p.id) })} /> <strong>{p.name}</strong> <small>{p.role}{p.overseas ? " · OS" : ""} · rating {p.rating} · ₹{(p.contractCr ?? p.marketCr).toFixed(2)} Cr</small></label></li>)}</ul>
            <button type="button" className="pav-btn pav-btn-gold" onClick={confirmRetentions}>Confirm retentions →</button>
          </section>}
          {c.stage === "trade" && <section className="pav-panel">
            <h3>Trade window (optional)</h3>
            <p className="pav-small">One-for-one swaps. AI franchises accept when the model market value they receive is close to what they give and their best XII does not get weaker.</p>
            <div className="gm-trade">
              <select aria-label="Your player" value={trade.give} onChange={(e) => setTrade({ ...trade, give: e.target.value })}><option value="">Your player…</option>{c.squad.map((id) => <option key={id} value={id}>{name(id)}</option>)}</select>
              <select aria-label="Franchise" value={trade.ai} onChange={(e) => setTrade({ ...trade, ai: e.target.value, get: "" })}><option value="">Franchise…</option>{Object.keys(c.rivals).map((t) => <option key={t}>{t}</option>)}</select>
              <select aria-label="Their player" value={trade.get} disabled={!trade.ai} onChange={(e) => setTrade({ ...trade, get: e.target.value })}><option value="">Their player…</option>{(c.rivals[trade.ai] ?? []).map((id) => <option key={id} value={id}>{name(id)} (₹{players.get(id)?.marketCr.toFixed(1)} Cr model)</option>)}</select>
              <button type="button" className="pav-btn" disabled={busy || !trade.give || !trade.get} onClick={() => void proposeTrade()}>Propose</button>
            </div>
            {trade.msg && <p role="status">{trade.msg}</p>}
            <button type="button" className="pav-btn pav-btn-gold" onClick={() => update({ stage: "market" })}>Close the window →</button>
          </section>}
          {c.stage === "market" && <section className="pav-panel">
            <h3>Free-agent market</h3>
            <p className="pav-small">Uncontracted players with an IPL record, at CRICFIELD's model market price (not a real fee). Build to at least {MIN_SQUAD} players.</p>
            <ul className="gm-list">{freeAgents.slice(0, 40).map((p) => <li key={p.id}><span><strong>{p.name}</strong> <small>{p.role}{p.overseas ? " · OS" : ""} · rating {p.rating}</small></span><button type="button" className="pav-btn" disabled={c.squad.length >= MAX_SQUAD || p.marketCr > c.purseCr} onClick={() => sign(p)}>Sign · ₹{p.marketCr.toFixed(2)} Cr</button></li>)}</ul>
            <button type="button" className="pav-btn pav-btn-gold" disabled={c.squad.length < MIN_SQUAD} onClick={() => update({ stage: "select" })}>{c.squad.length < MIN_SQUAD ? `Need ${MIN_SQUAD - c.squad.length} more` : "To selection →"}</button>
          </section>}
          {c.stage === "select" && <section className="pav-panel">
            <h3>Selection & tactics</h3>
            {strength && <><p>The optimiser's best XII: {strength.xii.map(name).join(", ")}.</p>{strength.gaps.length > 0 && <ul className="xi-issues">{strength.gaps.map((g) => <li key={g}>{g}</li>)}</ul>}</>}
            <div className="pav-modes" role="radiogroup" aria-label="Approach">{(["conservative", "balanced", "aggressive"] as const).map((a) => <button key={a} type="button" aria-pressed={c.approach === a} onClick={() => update({ approach: a })}>{a === "aggressive" ? "Aggressive — higher ceiling, more variance" : a === "conservative" ? "Conservative — steadier, lower ceiling" : "Balanced"}</button>)}</div>
            <button type="button" className="pav-btn pav-btn-gold" disabled={busy || !strength?.feasible} onClick={() => void playSeason()}>{busy ? "Simulating…" : "Start the season"}</button>
          </section>}
          {(c.stage === "season" || c.stage === "done") && c.season && <section className="pav-panel">
            <span className="pav-sim-label">Simulated season — not real results</span>
            <h3>Your fixtures</h3>
            <ol className="gm-fixtures">{userMatches.slice(0, c.revealed).map((m) => <li key={m.n} className={m.winner === c.team ? "w" : "l"}>{m.home} v {m.away} — {m.winner} won by {m.margin}</li>)}</ol>
            {c.season.injuries.filter((i) => i.match <= c.revealed).map((i) => <p key={`${i.player}${i.match}`} className="pav-small">🩹 Simulated injury: {i.player} misses {i.out} match{i.out > 1 ? "es" : ""} from match {i.match}.</p>)}
            {c.revealed < userMatches.length ? <div className="xi-actions"><button type="button" className="pav-btn pav-btn-gold" onClick={() => { update({ revealed: c.revealed + 1 }); play("bat"); }}>Play next match</button><button type="button" className="pav-btn" onClick={() => update({ revealed: userMatches.length })}>Sim to the end of the league</button></div> : <>
              <h3>Final table</h3>
              <ol className="gm-table">{c.season.table.map((t, i) => <li key={t.code} className={t.code === c.team ? "me" : i < 4 ? "q" : ""}><span>{t.code}</span><span>{t.won}–{t.lost}</span><strong>{t.points}</strong></li>)}</ol>
              <h3>Playoffs</h3>
              <ul className="gm-fixtures">{c.season.playoffs.map((m) => <li key={m.n} className={m.winner === c.team ? "w" : m.home === c.team || m.away === c.team ? "l" : ""}>{m.note}: {m.home} v {m.away} — {m.winner}</li>)}</ul>
            </>}
          </section>}
          {c.season && c.revealed >= userMatches.length && (
            <ResultPanel game="franchise-gm" score={c.season.seasonPoints} outcome={outcome ?? null} headline={`${own.name}: ${c.season.userFinish}`} lines={[`Champions: ${c.season.champion}.`, "This season is a simulation from real starting squads; none of it happened."]}
              share={`Franchise GM · ${c.team} · ${c.season.userFinish} · ${c.season.seasonPoints} pts`} onReplay={() => setC(null)} replayLabel="Career slots" />
          )}
          <details className="gm-log"><summary>Front-office log</summary><ul>{c.log.map((l, i) => <li key={i}>{l}</li>)}</ul></details>
        </>
      )}
      <p className="pav-datanote">Milestone 1 of Franchise GM: one season per career. Ratings and team strength come from the CRICFIELD Player Intelligence snapshot and squad optimiser; the purse, free-agent prices, match results and injuries are game simulation, seeded so each career replays the same way.</p>
      <Leaderboard game="franchise-gm" />
    </GameShell>
  );
}
