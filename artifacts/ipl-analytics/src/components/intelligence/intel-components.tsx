// Reusable Player Intelligence components. Four concepts are shown apart and never
// merged into a score: player performance, market price, franchise-specific value
// and retention outlook. Every component formats API values and calculates none.

import { CategoryTag, LIVE_SEASON, RetentionLoadPanel } from "@/components/retention/retention-widgets";
import { fetchPicks } from "@/lib/retention-api";
import { RETENTION_INDEX_VERSION } from "@/lib/retention-version";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Legend } from "recharts";
import { ArrowRightLeft, BrainCircuit, ClipboardCopy, Gauge, Search, Sparkles, TrendingDown, TrendingUp, Users } from "lucide-react";
import { signed } from "@/components/decision/module-shell";
import { errorText } from "@/lib/discovery-api";
import { money } from "@/lib/sim-api";
import {
  fetchCitation, fetchInsights, fetchPlayerIntelligence, fetchPlayerList, fetchReplacements, fetchTeamReport, INTEL_TEAMS, simulateSquad,
  type DisplayStatus, type Envelope, type FranchiseFit, type PlayerIntelligence, type PlayerListQuery, type PlayerRow, type Retention, type SaleHistory, type ScenarioMove, type ValueCheck,
} from "@/lib/intelligence-api";

const STATUS: Record<DisplayStatus, { label: string; cls: string; help: string }> = {
  verified_data: { label: "Verified Data", cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200", help: "From a sourced record, not a model." },
  model_prediction: { label: "Model Prediction", cls: "border-sky-400/40 bg-sky-500/15 text-sky-200", help: "From a model that passed time-based validation." },
  provisional_estimate: { label: "Provisional Estimate", cls: "border-amber-400/40 bg-amber-500/15 text-amber-200", help: "Calculated, but not validated well enough to be called a prediction." },
  limited_evidence: { label: "Limited Evidence", cls: "border-orange-400/40 bg-orange-500/15 text-orange-200", help: "Too little IPL play to judge reliably." },
  unavailable: { label: "Unavailable", cls: "border-white/15 bg-white/5 text-white/60", help: "Not published: the data does not support a figure." },
};

export function ModelConfidenceIndicator({ status, reason }: { status: DisplayStatus; reason?: string | null }) {
  const s = STATUS[status];
  return <span title={reason ?? s.help} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function Panel({ title, status, reason, children, className = "" }: { title: string; status?: DisplayStatus; reason?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</h4>
        {status && <ModelConfidenceIndicator status={status} reason={reason} />}
      </div>
      {children}
    </div>
  );
}

function Provenance({ version, cutoff, target }: { version: string; cutoff: string; target?: number }) {
  return <p className="text-[10px] text-muted-foreground">Model {version} · data to {cutoff}{target ? ` · for the ${target} season` : ""}. CricField estimate, not an official IPL or franchise valuation.</p>;
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[11px] text-muted-foreground leading-snug">{children}</p>;

/** Player Performance: sporting units only. */
export function PlayerValuationCard({ d }: { d: PlayerIntelligence }) {
  const e = d.performance;
  const raw = d.raw;
  return (
    <Panel title="Player performance" status={e.status} reason={e.statusReason}>
      {e.value === null ? <Note>{e.statusReason}</Note> : <>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-black text-2xl text-white tabular-nums">{signed(e.value)}</span>
          <span className="text-[11px] text-muted-foreground">runs above replacement per match</span>
        </div>
        {e.uncertainty && <div className="text-[11px] text-muted-foreground tabular-nums">80% range {signed(e.uncertainty.low)} to {signed(e.uncertainty.high)}{e.sampleSize ? ` · ${e.sampleSize.value} ${e.sampleSize.unit}` : ""}</div>}
        <ul className="text-xs space-y-0.5">{e.factors.map((f) => <li key={f.label}><b className="text-white">{f.label}:</b> <span className="text-muted-foreground">{f.detail}</span></li>)}</ul>
        {raw && (
          <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] tabular-nums pt-1 border-t border-white/10">
            {([["PP SR", raw.ppSR], ["Mid SR", raw.midSR], ["Death SR", raw.deathSR], ["PP econ", raw.ppEcon], ["Mid econ", raw.midEcon], ["Death econ", raw.deathEcon]] as const).map(([k, v]) => v === null || v === undefined ? null : (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="text-white font-semibold">{v.toFixed(k.includes("econ") ? 2 : 0)}</dd></div>
            ))}
          </dl>
        )}
        <Note>Raw splits are the last three seasons. Fielding is not in this figure: catches alone cannot show runs saved.</Note>
      </>}
    </Panel>
  );
}

/** Market Price: what the auction may pay, kept apart from what the player produces. */
export function AuctionPriceForecast({ market, sold, value }: { market: Envelope; sold: Envelope; value?: ValueCheck }) {
  return (
    <Panel title="Market price" status={market.status} reason={market.statusReason}>
      {market.value === null ? <Note>{market.statusReason}</Note> : <>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-black text-2xl text-white tabular-nums">{money(market.value)}</span>
          <span className="text-[11px] text-muted-foreground">expected price if sold</span>
        </div>
        {market.uncertainty && <div className="text-[11px] text-muted-foreground tabular-nums">80% range {money(market.uncertainty.low)} to {money(market.uncertainty.high)}</div>}
        {market.statusReason && <Note>{market.statusReason}</Note>}
        {value && value.verdict !== "Not assessed" && <div className="text-xs"><b className={value.verdict === "Undervalued" ? "text-emerald-300" : value.verdict === "Overvalued" ? "text-rose-300" : "text-white"}>{value.verdict}</b> <span className="text-muted-foreground">{value.note}</span></div>}
        {sold.value !== null && <div className="text-[11px] text-amber-200/90" title={sold.statusReason ?? undefined}>Provisional sold likelihood {Math.round(sold.value * 100)}%, from the 2026 pool alone.</div>}
        {market.factors.length > 0 && <ul className="text-[11px] text-muted-foreground">{market.factors.map((f) => <li key={f.label}>{f.label}: {f.detail}</li>)}</ul>}
        <Note>No rupee value of a run is assumed. No validated conversion exists, so performance and price stay separate.</Note>
      </>}
    </Panel>
  );
}

/** Franchise-Specific Value: the same player, worth different amounts to different squads. */
export function FranchiseFitMatrix({ fit }: { fit: FranchiseFit }) {
  const top = Math.max(0.1, ...fit.teams.map((t) => t.increment));
  return (
    <Panel title="Franchise-specific value" status={fit.status} reason={fit.statusReason} className="lg:col-span-2">
      <ul className="space-y-1">
        {fit.teams.map((t) => (
          <li key={t.team} className="grid grid-cols-[3rem_1fr_3.5rem] gap-2 items-center text-xs tabular-nums" title={t.replaces.length ? `Would replace ${t.replaces.join(", ")} in the best XII` : t.entersBestSide ? "Enters the best XII" : "Would not make the best XII"}>
            <span className={`font-semibold ${t.isCurrentTeam ? "text-violet-300" : "text-white"}`}>{t.team}</span>
            <span className="h-2 rounded-full bg-white/10 overflow-hidden"><span className={`block h-full rounded-full ${t.isCurrentTeam ? "bg-violet-400" : "bg-emerald-400/80"}`} style={{ width: `${Math.max(0, (t.increment / top) * 100)}%` }} /></span>
            <span className="text-right">{signed(t.increment)}</span>
          </li>
        ))}
      </ul>
      <Note>Runs per match added to each team's best XII, from IPL 2026 squads{fit.teams.some((t) => t.isCurrentTeam) ? "; in violet, the current team, measured against losing this player" : ""}. Best XII means seven batting slots by position and a full 20-over bowling plan under the overseas limit. {fit.statusReason}</Note>
      {fit.scarcity && <Note>{fit.scarcity.strong} of {fit.scarcity.players} comparable-role players rate 1+ run above replacement.</Note>}
    </Panel>
  );
}

/** Retention Outlook: never written as a percentage unless the model earned one. */
export function RetentionOutlook({ r }: { r: Retention }) {
  return (
    <Panel title="Retention outlook" status={r.status} reason={r.statusReason}>
      {r.kind === "none" ? <Note>{r.statusReason}</Note> : <>
        <div className="flex items-baseline gap-2">
          <span className={`font-display font-black text-xl ${/kept|Retained/.test(r.band ?? "") ? "text-emerald-300" : /risk|Released/.test(r.band ?? "") ? "text-rose-300" : "text-amber-200"}`}>{r.band}</span>
          {r.kind === "index" && <span className="text-[11px] text-muted-foreground tabular-nums">index {r.value}/100</span>}
          {r.kind === "probability" && r.value !== null && <span className="text-[11px] text-muted-foreground tabular-nums">{Math.round(r.value * 100)}%</span>}
        </div>
        {r.kind === "index" && <Note>{r.value} is a rank across 2026 squads, not a chance of being kept. {r.statusReason}</Note>}
        {r.kind === "decision" && <Note>{r.statusReason}</Note>}
        {r.factors.length > 0 && <ul className="text-[11px] text-muted-foreground">{r.factors.map((f) => <li key={f.label}>{f.label} {f.detail}</li>)}</ul>}
      </>}
    </Panel>
  );
}

/** What the model expected before each auction against what was paid. Each prediction used earlier seasons only. */
export function ValuationHistoryChart({ history }: { history: SaleHistory[] }) {
  if (!history.length) return <Panel title="Valuation history"><Note>No rupee auction sale since 2019 is on file for this player.</Note></Panel>;
  const rows = history.map((h) => ({ season: h.season, Paid: h.paidLakh / 100, Predicted: h.predictedLakh / 100 }));
  return (
    <Panel title="Valuation history">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="season" tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit=" Cr" />
            <Tooltip contentStyle={{ background: "#0B1020", border: "1px solid rgba(255,255,255,.15)", fontSize: 11 }} formatter={(v: number) => `₹${v.toFixed(2)} Cr`} />
            <Line dataKey="Paid" stroke="#34d399" strokeWidth={2} dot />
            <Line dataKey="Predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 3" dot />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
      <Note>Each prediction was made with data from before that auction.</Note>
    </Panel>
  );
}

function Citation({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const c = await fetchCitation(id);
    await navigator.clipboard.writeText(`${c.text} ${c.provenance}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return <button onClick={() => void copy()} className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline"><ClipboardCopy className="w-3 h-3" /> {copied ? "Citation copied" : "Copy citation for a report"}</button>;
}

/** The unified Player Intelligence section for player profiles. */
export function PlayerIntelligenceSection({ player, className = "" }: { player: string | number | null | undefined; className?: string }) {
  const q = useQuery({ queryKey: ["player-intelligence", player], queryFn: () => fetchPlayerIntelligence(player!), enabled: Boolean(player), retry: false, staleTime: 5 * 60_000 });
  if (!q.data) return null;
  const d = q.data;
  return (
    <section className={`rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-transparent p-4 space-y-3 min-w-0 ${className}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <BrainCircuit className="w-4 h-4 text-violet-300 self-center" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">Player Intelligence</h3>
        <span className="text-[11px] text-muted-foreground">{d.current?.team ? `${d.current.team} · ` : ""}{d.current?.role ?? ""}{d.current?.contractLakh ? ` · 2026 contract ${money(d.current.contractLakh)}` : ""}</span>
      </div>
      {d.inCurrentPool ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PlayerValuationCard d={d} />
          <AuctionPriceForecast market={d.market} sold={d.soldLikelihood} value={d.value} />
          <RetentionOutlook r={d.retention} />
          {d.franchise && <FranchiseFitMatrix fit={d.franchise} />}
          <ValuationHistoryChart history={d.history} />
          {d.comparables && d.comparables.length > 0 && (
            <Panel title="Comparable players" className="lg:col-span-3">
              <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums">
                <thead><tr className="text-[10px] uppercase tracking-wider text-muted-foreground"><th className="text-left py-1">Player</th><th className="text-right">Similar</th><th className="text-right">Runs/match</th><th className="text-right">Expected price</th><th className="text-right">Note</th></tr></thead>
                <tbody>{d.comparables.map((c) => (
                  <tr key={c.id} className="border-t border-white/[0.06]"><td className="py-1 font-semibold">{c.name}</td><td className="text-right">{c.similarity}%</td><td className="text-right">{c.rar === null ? "—" : signed(c.rar)}</td><td className="text-right">{money(c.predictedLakh)}</td><td className="text-right text-emerald-300">{c.betterValue ? "Better value" : ""}</td></tr>
                ))}</tbody>
              </table></div>
            </Panel>
          )}
        </div>
      ) : <Note>{d.reason}</Note>}
      {d.seasonSimulation && !d.seasonSimulation.available && <Note>{d.seasonSimulation.reason}</Note>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Provenance version={d.modelVersion} cutoff={d.dataCutoff} target={d.targetSeason} />
        {d.inCurrentPool && <Citation id={d.identity.canonicalId} />}
      </div>
    </section>
  );
}

export function SquadImpactComparison({ before, after, delta }: { before: { strength: number; composition: { battingDepth: number; overseas: number; phaseCoverage: { powerplay: number; middle: number; death: number } }; gaps: string[] }; after: { strength: number; composition: { battingDepth: number; overseas: number; phaseCoverage: { powerplay: number; middle: number; death: number } }; gaps: string[] }; delta: number }) {
  const rows: [string, string | number, string | number][] = [
    ["Best XII strength", before.strength.toFixed(2), after.strength.toFixed(2)], ["Batting depth", before.composition.battingDepth, after.composition.battingDepth],
    ["Powerplay overs covered", `${before.composition.phaseCoverage.powerplay}%`, `${after.composition.phaseCoverage.powerplay}%`], ["Middle overs covered", `${before.composition.phaseCoverage.middle}%`, `${after.composition.phaseCoverage.middle}%`],
    ["Death overs covered", `${before.composition.phaseCoverage.death}%`, `${after.composition.phaseCoverage.death}%`], ["Overseas in best XII", before.composition.overseas, after.composition.overseas],
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-baseline gap-2"><span className={`font-display font-black text-xl tabular-nums ${delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-white"}`}>{signed(delta)}</span><span className="text-[11px] text-muted-foreground">runs per match, best XII</span></div>
      <table className="w-full text-xs tabular-nums"><thead><tr className="text-[10px] uppercase text-muted-foreground"><th className="text-left">Measure</th><th className="text-right">Before</th><th className="text-right">After</th></tr></thead>
        <tbody>{rows.map(([k, a, b]) => <tr key={k} className="border-t border-white/[0.06]"><td className="py-0.5">{k}</td><td className="text-right">{a}</td><td className="text-right font-semibold">{b}</td></tr>)}</tbody></table>
      {after.gaps.length > 0 && <Note>Still open: {after.gaps.join("; ")}.</Note>}
    </div>
  );
}

export function ReplacementPlayerComparison({ id, team }: { id: string; team: string }) {
  const q = useQuery({ queryKey: ["replacements", id, team], queryFn: () => fetchReplacements(id, team), staleTime: 5 * 60_000, retry: false });
  if (q.isLoading) return <Note>Solving replacements…</Note>;
  if (!q.data) return null;
  const d = q.data;
  return (
    <div className="space-y-1 text-xs">
      <Note>Without {d.player}, {team}'s best XII falls to {d.withoutPlayer.toFixed(2)} (now {d.withPlayer.toFixed(2)}). Best same-role options:</Note>
      {d.options.map((o) => <div key={o.id} className="flex justify-between gap-2 tabular-nums"><span>{o.name}{o.team ? <span className="text-muted-foreground"> · {o.team}</span> : null}</span><span className="text-muted-foreground">{signed(o.increment)} · {money(o.priceLakh)}</span></div>)}
    </div>
  );
}

const inputCls = "h-8 min-w-0 rounded-lg bg-[#0B1020] border border-white/10 px-2 text-xs text-white";
type MoveKind = "buy" | "release" | "trade" | "replace";

/** Squad Builder: retention board, gaps and buy / release / trade scenarios for one franchise. */
export function SquadIntelligencePanel({ team: teamIn }: { team?: string | null }) {
  const [picked, setPicked] = useState<string>(teamIn && (INTEL_TEAMS as readonly string[]).includes(teamIn) ? teamIn : "RCB");
  const team = teamIn && (INTEL_TEAMS as readonly string[]).includes(teamIn) ? teamIn : picked;
  const q = useQuery({ queryKey: ["team-intelligence", team], queryFn: () => fetchTeamReport(team), retry: false, staleTime: 5 * 60_000 });
  // Same query key as the Retention Room, so both pages share one CRICFIELD Picks verdict per player.
  const picks = useQuery({ queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION], queryFn: () => fetchPicks(LIVE_SEASON, team), retry: false, staleTime: 5 * 60_000 });
  const pickOf = new Map((picks.data?.rows ?? []).map((p) => [p.id, p]));
  const isCore = (id: string) => Boolean(picks.data?.planning?.coreLocks.some((l) => l.id === id));
  const [kind, setKind] = useState<MoveKind>("buy");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [moves, setMoves] = useState<ScenarioMove[]>([]);
  const [replacing, setReplacing] = useState<string | null>(null);
  const sim = useMutation({ mutationFn: (m: ScenarioMove[]) => simulateSquad(team, m) });
  const addMove = () => {
    if (!a.trim() || ((kind === "trade" || kind === "replace") && !b.trim())) return;
    const m: ScenarioMove = kind === "trade" || kind === "replace" ? { action: kind, out: a.trim(), in: b.trim() } : { action: kind, player: a.trim() };
    const next = [...moves, m];
    setMoves(next); setA(""); setB("");
    sim.mutate(next);
  };
  const clear = () => { setMoves([]); sim.reset(); };
  const d = q.data;
  return (
    <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-transparent p-4 space-y-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="w-4 h-4 text-violet-300" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">Squad intelligence</h3>
        {!teamIn && <div className="flex flex-wrap gap-1">{INTEL_TEAMS.map((t) => <button key={t} onClick={() => { setPicked(t); clear(); setReplacing(null); }} aria-pressed={team === t} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${team === t ? "bg-violet-500/25 border-violet-400/60 text-white" : "bg-white/5 border-white/10 text-muted-foreground"}`}>{t}</button>)}</div>}
      </div>
      {q.isError && <Note>{errorText(q.error)}</Note>}
      {d && <>
        <div className="grid sm:grid-cols-4 gap-2 text-xs">
          {([["Best XII strength", d.strength.toFixed(2)], ["Batting depth", d.composition.battingDepth], ["Death overs covered", `${d.composition.phaseCoverage.death}%`], ["2026 contracts", money(d.contractLakh)]] as const).map(([k, v]) => <div key={k} className="rounded-lg border border-white/10 bg-white/[0.03] p-2"><div className="text-muted-foreground text-[10px] uppercase tracking-wider">{k}</div><div className="font-display font-black text-lg text-white tabular-nums">{v}</div></div>)}
        </div>
        {d.gaps.length > 0 ? <Note>Role shortages: {d.gaps.join("; ")}.</Note> : <Note>No role shortage in the best XII.</Note>}
        <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums">
          <thead><tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/10">{["Player", "Role", "Performance", "Contract", "Expected price", "CricField pick", ""].map((h, i) => <th key={h || i} className={`py-1.5 px-1 ${i >= 2 && i <= 4 ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
          <tbody>{[...d.retentionBoard].sort((x, y) => (pickOf.get(y.id)?.index ?? -1) - (pickOf.get(x.id)?.index ?? -1)).map((p) => (
            <tr key={p.id} className="border-b border-white/[0.05] align-top">
              <td className="py-1 px-1 font-semibold whitespace-nowrap">{p.name}{p.overseas ? <span className="text-muted-foreground font-normal"> · OS</span> : null}{replacing === p.id && <div className="font-normal min-w-[240px] py-1"><ReplacementPlayerComparison id={p.id} team={team} /></div>}</td>
              <td className="py-1 px-1">{p.role}</td>
              <td className="py-1 px-1 text-right">{p.rar === null ? "—" : signed(p.rar)}</td>
              <td className="py-1 px-1 text-right">{money(p.contractLakh)}</td>
              <td className="py-1 px-1 text-right">{money(p.priceLakh)}</td>
              <td className="py-1 px-1 whitespace-nowrap">{pickOf.get(p.id) ? <><CategoryTag category={pickOf.get(p.id)!.category} />{isCore(p.id) && <span className="ml-1 text-[9px] font-black text-emerald-300">🔒 CORE</span>}<span className="ml-1 text-[10px] text-muted-foreground">{pickOf.get(p.id)!.index.toFixed(0)}</span></> : <span className="text-muted-foreground">{picks.isLoading ? "…" : "—"}</span>}</td>
              <td className="py-1 px-1 text-right"><button onClick={() => setReplacing(replacing === p.id ? null : p.id)} className="text-[11px] text-violet-300 hover:underline whitespace-nowrap">{replacing === p.id ? "Hide" : "Replacements"}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <Note>Performance is runs above replacement per match. CricField pick is the same verdict and score (out of 100) shown on the <Link href={`/retention-room/${team}`} className="text-violet-300 hover:underline">Retention Room</Link>; it is a recommendation, not a chance of being kept. {d.squadAsOf}</Note>
        <RetentionLoadPanel team={team} />
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1"><ArrowRightLeft className="w-3.5 h-3.5" /> Scenario</div>
          <div className="flex flex-wrap gap-2 items-center">
            <select aria-label="Scenario action" value={kind} onChange={(e) => setKind(e.target.value as MoveKind)} className={inputCls}>{(["buy", "release", "trade", "replace"] as MoveKind[]).map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}</select>
            <input aria-label={kind === "buy" ? "Player to buy" : "Player leaving"} value={a} onChange={(e) => setA(e.target.value)} placeholder={kind === "buy" ? "Player to buy" : "Player leaving"} className={`${inputCls} w-44`} />
            {(kind === "trade" || kind === "replace") && <input aria-label="Player arriving" value={b} onChange={(e) => setB(e.target.value)} placeholder="Player arriving" className={`${inputCls} w-44`} />}
            <button onClick={addMove} disabled={sim.isPending} className="h-8 px-3 rounded-lg bg-violet-500/30 border border-violet-400/50 text-xs font-semibold text-white disabled:opacity-50">Add move</button>
            {moves.length > 0 && <button onClick={clear} className="text-[11px] text-muted-foreground hover:text-white">Clear</button>}
          </div>
          {moves.length > 0 && <ol className="text-[11px] text-muted-foreground list-decimal pl-4">{moves.map((m, i) => <li key={i}>{"player" in m ? `${m.action} ${m.player}` : `${m.action}: ${m.out} out, ${m.in} in`}</li>)}</ol>}
          {sim.isError && <Note>{errorText(sim.error)}</Note>}
          {sim.data && <>
            <SquadImpactComparison before={sim.data.before} after={sim.data.after} delta={sim.data.delta} />
            {[...sim.data.messages, ...sim.data.warnings].map((m) => <Note key={m}>{m}</Note>)}
            <Note>Estimated spend {money(sim.data.budget.estimatedSpendLakh)}, at predicted prices. {sim.data.budget.note}</Note>
          </>}
          <Note>{d.simulation.reason} {d.caveat}</Note>
        </div>
        <Provenance version={d.modelVersion} cutoff={d.dataCutoff} target={d.targetSeason} />
      </>}
    </section>
  );
}

/** Stats tab: value against performance, scarcity and franchise efficiency. */
export function LeagueValuePanel() {
  const q = useQuery({ queryKey: ["league-insights"], queryFn: fetchInsights, staleTime: 5 * 60_000, retry: false });
  const d = q.data;
  const groups = useMemo(() => {
    const colours: Record<string, string> = { batter: "#60a5fa", bowler: "#34d399", "all-rounder": "#fbbf24", wicketkeeper: "#f472b6" };
    return Object.entries(colours).map(([role, color]) => ({ role, color, rows: (d?.scatter ?? []).filter((s) => s.role === role && s.rar !== null).map((s) => ({ ...s, x: s.rar, y: s.priceLakh / 100 })) }));
  }, [d]);
  if (q.isError) return <p className="text-xs text-muted-foreground">{errorText(q.error)}</p>;
  if (!d) return <p className="text-xs text-muted-foreground">Loading…</p>;
  const List = ({ title, rows, icon }: { title: string; rows: PlayerRow[]; icon: React.ReactNode }) => (
    <Panel title={title}>
      <ul className="text-xs space-y-0.5 tabular-nums">{rows.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{icon} {p.name} <span className="text-muted-foreground">· {p.role}</span></span><span className="text-muted-foreground whitespace-nowrap">{p.rar === null ? "—" : signed(p.rar)} · {money(p.priceLakh)}</span></li>)}</ul>
    </Panel>
  );
  return (
    <div className="space-y-4">
      <Panel title="Expected price against performance">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: -6, bottom: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" dataKey="x" name="Runs above replacement per match" tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "Runs above replacement per match", position: "insideBottom", offset: -4, fontSize: 10, fill: "#94a3b8" }} />
              <YAxis type="number" dataKey="y" name="Expected price" unit=" Cr" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <ZAxis range={[28, 28]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#0B1020", border: "1px solid rgba(255,255,255,.15)", fontSize: 11 }} formatter={(v: number, n: string) => [typeof v === "number" ? v.toFixed(2) : v, n]} labelFormatter={() => ""} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 11 }} />
              {groups.map((g) => <Scatter key={g.role} name={g.role} data={g.rows} fill={g.color} />)}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid md:grid-cols-2 gap-3">
        <List title="Performance ranks above price" rows={d.undervalued} icon={<TrendingUp className="inline w-3 h-3 text-emerald-300" />} />
        <List title="Price ranks above performance" rows={d.overvalued} icon={<TrendingDown className="inline w-3 h-3 text-rose-300" />} />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <Panel title="Role scarcity">
          <table className="w-full text-xs tabular-nums"><thead><tr className="text-[10px] uppercase text-muted-foreground"><th className="text-left">Role</th><th className="text-right">Rated players</th><th className="text-right">Above replacement</th><th className="text-right">Rated 1+</th><th className="text-right">Median price</th></tr></thead>
            <tbody>{Object.entries(d.scarcity).map(([role, s]) => <tr key={role} className="border-t border-white/[0.06]"><td className="py-0.5">{role}</td><td className="text-right">{s.players}</td><td className="text-right">{s.aboveReplacement}</td><td className="text-right">{s.strong}</td><td className="text-right">{money(s.medianPredictedLakh)}</td></tr>)}</tbody></table>
        </Panel>
        <Panel title="Franchise efficiency and auction spending">
          <table className="w-full text-xs tabular-nums"><thead><tr className="text-[10px] uppercase text-muted-foreground"><th className="text-left">Team</th><th className="text-right">Best XII</th><th className="text-right">2026 contracts</th><th className="text-right">Paid 2024–26</th><th className="text-right">Model expected</th></tr></thead>
            <tbody>{[...d.teams].sort((a, b) => b.strength - a.strength).map((t) => { const sp = d.spending.find((x) => x.team === t.team); return <tr key={t.team} className="border-t border-white/[0.06]"><td className="py-0.5 font-semibold">{t.team}</td><td className="text-right">{t.strength.toFixed(2)}</td><td className="text-right">{money(t.contractLakh)}</td><td className="text-right">{money(sp?.paidLakh ?? null)}</td><td className="text-right">{money(sp?.predictedLakh ?? null)}</td></tr>; })}</tbody></table>
          <Note>Strength and spending are separate columns on purpose. Paid and expected cover players still in the current pool.</Note>
        </Panel>
      </div>
      <Provenance version={d.modelVersion} cutoff={d.dataCutoff} target={d.targetSeason} />
    </div>
  );
}

/** Feed snippets. Labelled as calculated output so they cannot be read as reporting. */
export function FeedIntelSnippets({ limit = 3 }: { limit?: number }) {
  const q = useQuery({ queryKey: ["league-insights"], queryFn: fetchInsights, staleTime: 5 * 60_000, retry: false });
  const d = q.data;
  if (!d) return null;
  const items = [
    ...d.undervalued.slice(0, limit).map((p) => ({ id: `u${p.id}`, tag: "Emerging value", text: `${p.name} ranks well above the expected price among ${p.role}s: ${signed(p.rar ?? 0)} runs a match at ${money(p.priceLow)}–${money(p.priceHigh)}.` })),
    ...d.risers.slice(0, limit).map((p) => ({ id: `r${p.id}`, tag: "Performance trend", text: `${p.name}'s rating rose ${signed(p.change)} runs a match on last season's.` })),
    ...d.teams.filter((t) => t.gaps.length).slice(0, limit).map((t) => ({ id: `t${t.team}`, tag: "Squad weakness", text: `${t.team}: ${t.gaps[0].toLowerCase()}.` })),
  ];
  return (
    <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-transparent p-4 space-y-2 min-w-0">
      <div className="flex items-center gap-2 flex-wrap"><Sparkles className="w-4 h-4 text-violet-300" /><h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">Model insights</h3><ModelConfidenceIndicator status="provisional_estimate" reason={d.disclaimer} /></div>
      <ul className="grid md:grid-cols-3 gap-2">{items.map((i) => <li key={i.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs"><div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold">{i.tag}</div><div className="text-white/90">{i.text}</div></li>)}</ul>
      <p className="text-[10px] text-muted-foreground">{d.disclaimer} Model {d.modelVersion}, data to {d.dataCutoff}.</p>
    </section>
  );
}

const BANDS = [{ label: "Any price", min: 0, max: 0 }, { label: "Under ₹1 Cr", min: 0, max: 100 }, { label: "₹1–5 Cr", min: 100, max: 500 }, { label: "₹5–12 Cr", min: 500, max: 1200 }, { label: "Over ₹12 Cr", min: 1200, max: 0 }];

/** Scout Lab: filterable board on the shared numbers. */
export function ScoutValueBoard() {
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [fitTeam, setFitTeam] = useState("");
  const [overseas, setOverseas] = useState<"" | "only" | "exclude">("");
  const [band, setBand] = useState(0);
  const [phase, setPhase] = useState("");
  const [discipline, setDiscipline] = useState("batting");
  const [minMatches, setMinMatches] = useState(10);
  const [text, setText] = useState("");
  const b = BANDS[band];
  const query: PlayerListQuery = { role: role || undefined, team: team || undefined, fitTeam: fitTeam || undefined, overseas: overseas || undefined, minLakh: b.min || undefined, maxLakh: b.max || undefined, phase: phase || undefined, discipline: phase ? discipline : undefined, minMatches: minMatches || undefined, q: text.trim() || undefined, limit: 40 };
  const q = useQuery({ queryKey: ["scout-value-board", query], queryFn: () => fetchPlayerList(query), placeholderData: (x) => x, retry: false, staleTime: 5 * 60_000 });
  const Sel = ({ label, value, onChange, options }: { label: string; value: string | number; onChange: (v: string) => void; options: [string | number, string][] }) => (
    <label className="flex flex-col gap-0.5 text-[10px] uppercase tracking-wider text-[#8FA6B2] min-w-0">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  );
  const teams: [string, string][] = INTEL_TEAMS.map((t) => [t, t]);
  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-6 space-y-3 min-w-0" aria-label="Value board">
      <div className="flex items-center gap-2 flex-wrap"><Gauge className="w-4 h-4 text-violet-300" /><h2 className="font-display font-bold text-sm uppercase tracking-wider text-white">IPL value board</h2><span className="text-[11px] text-[#8FA6B2]">Performance, expected price and franchise fit</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 items-end">
        <Sel label="Role" value={role} onChange={setRole} options={[["", "Any"], ["batter", "Batter"], ["wicketkeeper", "Wicketkeeper"], ["all-rounder", "All-rounder"], ["bowler", "Bowler"]]} />
        <Sel label="Current team" value={team} onChange={setTeam} options={[["", "Any"], ...teams]} />
        <Sel label="Fit for" value={fitTeam} onChange={setFitTeam} options={[["", "No team"], ...teams]} />
        <Sel label="Overseas" value={overseas} onChange={(v) => setOverseas(v as typeof overseas)} options={[["", "All"], ["only", "Overseas"], ["exclude", "Indian"]]} />
        <Sel label="Price band" value={band} onChange={(v) => setBand(Number(v))} options={BANDS.map((x, i) => [i, x.label])} />
        <Sel label="Rank by phase" value={phase} onChange={setPhase} options={[["", "Overall"], ["powerplay", "Powerplay"], ["middle", "Middle"], ["death", "Death"]]} />
        {phase ? <Sel label="Discipline" value={discipline} onChange={setDiscipline} options={[["batting", "Batting"], ["bowling", "Bowling"]]} /> : <Sel label="Minimum evidence" value={minMatches} onChange={(v) => setMinMatches(Number(v))} options={[[0, "None"], [10, "10 matches"], [30, "30 matches"], [60, "60 matches"]]} />}
      </div>
      <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B1020] px-2.5 max-w-sm"><Search className="w-3.5 h-3.5 text-[#8FA6B2]" /><input aria-label="Search players" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search a player" className="flex-1 bg-transparent outline-none py-1.5 text-xs text-white min-w-0" /></label>
      {q.isError && <p className="text-xs text-[#8FA6B2]">{errorText(q.error)}</p>}
      {q.data && (
        <>
          <div className="overflow-x-auto"><table className="w-full text-xs tabular-nums text-white">
            <thead><tr className="text-[10px] uppercase tracking-wider text-[#8FA6B2] border-b border-white/10">{["Player", "Role", "Team", "Performance", "Evidence", "Expected price", "80% range", "Value", fitTeam ? `Fit ${fitTeam}` : "Best fit", "CRICFIELD Pick"].map((h, i) => <th key={h} className={`py-1.5 px-1.5 whitespace-nowrap ${i >= 3 && i <= 6 ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody>{q.data.rows.map((p) => (
              <tr key={p.id} className="border-b border-white/[0.05]">
                <td className="py-1 px-1.5 font-semibold whitespace-nowrap">{p.warehouseId ? <Link href={`/players/${encodeURIComponent(p.name)}`} className="hover:underline">{p.name}</Link> : p.name}{p.overseas ? <span className="text-[#8FA6B2] font-normal"> · OS</span> : null}</td>
                <td className="py-1 px-1.5">{p.role}</td><td className="py-1 px-1.5">{p.team ?? "—"}</td>
                <td className="py-1 px-1.5 text-right">{p.rar === null ? "—" : signed(p.rar)}</td><td className="py-1 px-1.5 text-right">{p.matchesCareer ?? 0} M</td>
                <td className="py-1 px-1.5 text-right">{money(p.priceLakh)}</td><td className="py-1 px-1.5 text-right whitespace-nowrap text-[#8FA6B2]">{money(p.priceLow)}–{money(p.priceHigh)}</td>
                <td className={`py-1 px-1.5 ${p.verdict === "Undervalued" ? "text-emerald-300" : p.verdict === "Overvalued" ? "text-rose-300" : "text-[#8FA6B2]"}`}>{p.verdict}</td>
                <td className="py-1 px-1.5 whitespace-nowrap">{p.fit ? `${signed(p.fit.increment)}` : p.bestFit ? `${p.bestFit.team} ${signed(p.bestFit.increment)}` : "—"}</td>
                <td className="py-1 px-1.5 whitespace-nowrap text-[#8FA6B2]">{p.retentionIndex === null ? "—" : `${p.retentionIndex.toFixed(0)} · ${p.retentionCategory}`}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="text-[10px] text-[#8FA6B2]">{q.data.total} players. Performance is runs above replacement per match; fit is runs per match added to a best XII. Model {q.data.modelVersion}, data to {q.data.dataCutoff}.</p>
        </>
      )}
    </section>
  );
}

