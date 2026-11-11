import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { DataNote, ErrorNote, GameHeader, GameShell, Leaderboard, ResultPanel } from "@/components/arcade/kit";
import { api, listSaves, writeSave, type Provenance, type ResultOutcome } from "@/lib/arcade/client";
import { play } from "@/lib/arcade/feel";
import "./arcade-games.css";

type Mode = "open" | "budget" | "rebuild" | "season";
interface PoolP { id: string; name: string; team: string | null; role?: string; overseas: boolean; keeper: boolean; bowlingType?: string; rating?: number; contractCr?: number | null; marketCr?: number; phase?: Record<string, number | null>; bowls?: boolean; value?: number; runs?: number; wickets?: number; sr?: number | null; econ?: number | null }
interface Report { valid: boolean; issues: string[]; rating: number; strength?: number; battingValue?: number; bowlingValue?: number; composition?: { phaseCoverage: Record<string, number>; battingDepth: number; bowlingOptions: number } | null; costCr?: number; budgetCr?: number | null; paceOptions?: number; spinOptions?: number; leftHandersTop7?: number; efficiency?: number | null; strengths?: string[]; weaknesses?: string[]; total?: number; reference?: number; topPicks?: string[] }
const TEAMS = ["CSK", "DC", "GT", "KKR", "LSG", "MI", "PBKS", "RCB", "RR", "SRH"];
const MODES: [Mode, string, string][] = [["open", "Open Draft", "Any players, no budget."], ["budget", "Budget Challenge", "₹100 Cr game budget (not an IPL rule)."], ["rebuild", "Franchise Rebuild", "Your franchise's squad plus up to 3 uncontracted signings."], ["season", "Best XI by Season", "Players who appeared that season, rated on that season."]];
const bowls = (p: PoolP) => p.bowls ?? Object.values(p.phase ?? {}).some((v) => v != null);
const cost = (p: PoolP) => p.contractCr ?? p.marketCr ?? 0;

export default function BuildYourXIGame() {
  const [mode, setMode] = useState<Mode>("open");
  const [team, setTeam] = useState("MI");
  const [season, setSeason] = useState(2026);
  const [pool, setPool] = useState<PoolP[]>([]);
  const [meta, setMeta] = useState<{ data?: Provenance; budgetNote?: string; rules?: string[] }>({});
  const [xi, setXi] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [report, setReport] = useState<Report | null>(null);
  const [final, setFinal] = useState<{ report: Report; outcome: ResultOutcome | null } | null>(null);
  const [saved, setSaved] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null); setReport(null);
    api<{ players: PoolP[]; data: Provenance; budgetNote?: string; rules: string[] }>(mode === "season" ? `/xi/pool?season=${season}` : "/xi/pool").then((r) => { setPool(r.players); setMeta(r); }).catch((e) => setError(e.message));
  }, [mode, season]);
  useEffect(() => { void listSaves<{ mode: Mode; ids: string[]; team: string; season: number }>("build-your-xi").then((s) => { if (s[0]) setSaved(`Saved XI from ${new Date(s[0].updated).toLocaleDateString()} available.`); }); }, []);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const picked = xi.map((id) => byId.get(id)).filter((p): p is PoolP => Boolean(p));
  const visible = pool.filter((p) => !xi.includes(p.id) && (mode !== "rebuild" || p.team === team || !p.team) && (role === "all" || (role === "WK" ? p.keeper : role === "BOWL" ? bowls(p) : p.role ? p.role === role : role === "BAT" ? !bowls(p) : bowls(p) && (p.runs ?? 0) >= 150)) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))).slice(0, 60);
  const spent = picked.reduce((s, p) => s + cost(p), 0);
  const counts = { overseas: picked.filter((p) => p.overseas).length, keepers: picked.filter((p) => p.keeper).length, bowlers: picked.filter(bowls).length };

  function add(id: string) { if (xi.length < 11) { setXi([...xi, id]); setReport(null); play("click"); } }
  function move(i: number, d: number) { const n = [...xi]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setXi(n); }
  async function evaluate(submit = false) {
    setBusy(true); setError(null);
    try {
      const body = { ids: xi, mode, team, season };
      if (submit) { const r = await api<{ report: Report; outcome: ResultOutcome | null }>("/xi/submit", { body }); setReport(r.report); if (r.report.valid) setFinal(r); }
      else setReport(await api<Report>("/xi/evaluate", { body }));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save() { const where = await writeSave("build-your-xi", "slot-1", { mode, ids: xi, team, season }); setSaved(`Saved to your ${where}.`); }
  async function load() { const s = await listSaves<{ mode: Mode; ids: string[]; team: string; season: number }>("build-your-xi"); if (s[0]) { setMode(s[0].state.mode); setTeam(s[0].state.team); setSeason(s[0].state.season); setXi(s[0].state.ids); } }

  return (
    <GameShell game="build-your-xi" theme="theme-selection" wide>
      <GameHeader kicker="STRATEGY · SELECTION BOARD" title="Build Your XI." intro="Pick eleven, set the batting order, and let CRICFIELD's squad optimiser — the same model behind the Retention Room — judge batting depth, bowling cover by phase and balance." />
      <div className="pav-modes" role="group" aria-label="Mode">{MODES.map(([m, l, d]) => <button key={m} type="button" aria-pressed={mode === m} title={d} onClick={() => { setMode(m); setXi([]); setFinal(null); }}>{l}</button>)}</div>
      <p className="pav-small">{mode === "budget" && meta.budgetNote ? meta.budgetNote : MODES.find((m) => m[0] === mode)![2]}</p>
      {mode === "rebuild" && <label className="xi-select">Franchise <select value={team} onChange={(e) => { setTeam(e.target.value); setXi([]); }}>{TEAMS.map((t) => <option key={t}>{t}</option>)}</select></label>}
      {mode === "season" && <label className="xi-select">Season <select value={season} onChange={(e) => { setSeason(Number(e.target.value)); setXi([]); }}>{Array.from({ length: 19 }, (_, i) => 2026 - i).map((s) => <option key={s}>{s}</option>)}</select></label>}
      {saved && <p className="pav-small">{saved} <button type="button" className="xi-link" onClick={() => void load()}>Load it</button></p>}
      <div className="xi-board">
        <section className="xi-pool" aria-label="Player pool">
          <div className="xi-filters"><input aria-label="Filter players" placeholder="Filter by name" value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="BAT">Batters</option><option value="WK">Keepers</option><option value="AR">All-rounders</option><option value="BOWL">Bowling options</option></select></div>
          <ul>{visible.map((p) => <li key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}>
            <button type="button" disabled={xi.length >= 11} onClick={() => add(p.id)} aria-label={`Add ${p.name}`}>
              <strong>{p.name}</strong>
              <small>{p.team ?? "Uncontracted"} · {p.keeper ? "WK" : p.role ?? (p.bowls ? "bowls" : "bat")}{p.overseas ? " · OS" : ""}{mode === "season" ? ` · ${p.runs} r, ${p.wickets} w` : ` · ₹${cost(p).toFixed(2)} Cr`}</small>
              {mode !== "season" ? <span className="xi-rating">{p.rating}</span> : <span className="xi-rating">{p.value?.toFixed(0)}</span>}
            </button>
          </li>)}</ul>
        </section>
        <section className="xi-team" aria-label="Your XI" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id && !xi.includes(id)) add(id); }}>
          <div className="xi-counters">
            <span className={xi.length === 11 ? "ok" : ""}>{xi.length}/11</span>
            <span className={counts.overseas > 4 ? "bad" : ""}>{counts.overseas}/4 overseas</span>
            <span className={counts.keepers ? "ok" : "bad"}>{counts.keepers} keeper</span>
            <span className={counts.bowlers >= 5 ? "ok" : "bad"}>{counts.bowlers} bowling options</span>
            {mode === "budget" && <span className={spent > 100 ? "bad" : ""}>₹{spent.toFixed(1)} / 100 Cr</span>}
          </div>
          <ol className="xi-order">{picked.map((p, i) => <li key={p.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); if (drag != null && drag !== i) { const n = [...xi]; const [m] = n.splice(drag, 1); n.splice(i, 0, m); setXi(n); } setDrag(null); }}>
            <span className="xi-pos">{i + 1}</span><span className="xi-name">{p.name}<small>{p.keeper ? "WK · " : ""}{p.overseas ? "Overseas · " : ""}{bowls(p) ? (p.bowlingType && p.bowlingType !== "unknown" && p.bowlingType !== "none" ? `bowls ${p.bowlingType}` : "bowls") : "bats"}</small></span>
            <span className="xi-move"><button type="button" aria-label={`Move ${p.name} up`} onClick={() => move(i, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${p.name} down`} onClick={() => move(i, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Remove ${p.name}`} onClick={() => { setXi(xi.filter((x) => x !== p.id)); setReport(null); }}><X size={14} /></button></span>
          </li>)}{Array.from({ length: 11 - picked.length }, (_, i) => <li key={`e${i}`} className="empty"><span className="xi-pos">{picked.length + i + 1}</span><span className="xi-name">Drag or tap a player</span></li>)}</ol>
          <div className="xi-actions"><button type="button" className="pav-btn" disabled={xi.length !== 11 || busy} onClick={() => void evaluate()}>Analyse XI</button><button type="button" className="pav-btn pav-btn-gold" disabled={xi.length !== 11 || busy} onClick={() => void evaluate(true)}>Submit XI</button><button type="button" className="pav-btn pav-btn-ghost" disabled={!xi.length} onClick={() => void save()}>Save</button></div>
          <ErrorNote error={error} />
          {report && <XiReport report={report} season={mode === "season"} />}
        </section>
      </div>
      {final && <ResultPanel game="build-your-xi" score={final.report.rating} outcome={final.outcome} headline={`Team rating ${final.report.rating}/100`} lines={[mode === "season" ? `Season value ${final.report.total} vs a reference best XI of ${final.report.reference}.` : "60 ≈ the median real franchise XI, 90 ≈ the strongest."]}
        share={`Build Your XI · ${MODES.find((m) => m[0] === mode)![1]} · rating ${final.report.rating}\n${picked.map((p, i) => `${i + 1}. ${p.name}`).join("\n")}`} onReplay={() => { setFinal(null); setXi([]); }} replayLabel="Build another" />}
      <p className="pav-small">Compare any player in <Link href="/scout">Scout Lab</Link>.</p>
      <DataNote data={meta.data} extra={`Ratings come from the CRICFIELD Player Intelligence snapshot (runs above replacement). Rules: ${(meta.rules ?? []).join("; ")}.`} />
      <Leaderboard game="build-your-xi" />
    </GameShell>
  );
}

function XiReport({ report, season }: { report: Report; season: boolean }) {
  return (
    <div className="xi-report" aria-live="polite">
      {report.issues.length > 0 && <ul className="xi-issues">{report.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <div className="pav-stat-grid">
        <div className="pav-stat"><small>Team rating</small><strong>{report.rating}</strong></div>
        {!season && <><div className="pav-stat"><small>Batting value</small><strong>{report.battingValue}</strong></div><div className="pav-stat"><small>Bowling value</small><strong>{report.bowlingValue}</strong></div><div className="pav-stat"><small>Pace / spin</small><strong>{report.paceOptions} / {report.spinOptions}</strong></div><div className="pav-stat"><small>Left-handers top 7</small><strong>{report.leftHandersTop7}</strong></div><div className="pav-stat"><small>Cost</small><strong>₹{report.costCr} Cr</strong></div></>}
        {season && <><div className="pav-stat"><small>Season value</small><strong>{report.total}</strong></div><div className="pav-stat"><small>Reference XI</small><strong>{report.reference}</strong></div></>}
      </div>
      {report.composition && <div className="xi-phases">{Object.entries(report.composition.phaseCoverage).map(([ph, v]) => <div key={ph}><small>{ph} overs covered</small><span style={{ ["--w" as string]: `${v}%` }} /><b>{v}%</b></div>)}</div>}
      {report.strengths?.length ? <><h4>Strengths</h4><ul>{report.strengths.map((s) => <li key={s}>{s}</li>)}</ul></> : null}
      {report.weaknesses?.length ? <><h4>Watch-outs</h4><ul>{report.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul></> : null}
      {season && report.topPicks && <p className="pav-small">That season's top performers by value: {report.topPicks.join(", ")}.</p>}
    </div>
  );
}
