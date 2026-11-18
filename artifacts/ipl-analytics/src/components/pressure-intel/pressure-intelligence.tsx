// Pressure Intelligence (Scout Lab phase 1): define a situation → choose competitions → evaluate → evidence → compare.
// The engine (lib/pressure-intel/engine.ts) runs on static per-ball league files, because production has no
// warehouse API. Visual accents follow the hub's franchise theme (--team-accent); the data never does.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronDown, X } from "lucide-react";
import { aggregate, score, usesChaseOnly, type ScoredRow } from "@/lib/pressure-intel/engine";
import { loadDataset, loadIndex, loadMethodology, type CompInfo, type Methodology } from "@/lib/pressure-intel/load";
import {
  CHASE_ONLY, PRESETS, RANGE_KEYS, decodeQuery, describeGroup, encodeQuery, isGroup, parseQuery, queryKey,
  type Cond, type Group, type Params, type Query,
} from "@/lib/pressure-intel/query";
import { resolvePlayerImage } from "@/lib/aggregates";

type Tab = "overview" | "builder" | "rankings" | "compare";
const TABS: [Tab, string][] = [["overview", "Overview"], ["builder", "Situation Builder"], ["rankings", "Rankings"], ["compare", "Compare"]];
const ACC = "var(--team-accent, #A8B7C7)";
const tint = (pct: number) => `color-mix(in srgb, ${ACC} ${pct}%, transparent)`;
const SEL = "rounded-md border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B1620] px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 min-w-0";
const CARD = "rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#08121B]";
const MUTED = "text-slate-500 dark:text-slate-400";
/** Short competition label; T20Is are split into Full Member and Associate files. */
const short = (code: string) => (code === "t20i" ? "T20I FM" : code === "t20i_assoc" ? "T20I Assoc" : code.toUpperCase());
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "–");
const signed = (v: number) => (v >= 0 ? "+" : "") + f1(v);
const tone = (v: number) => (v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400");

const DEFAULT_QUERY: Query = {
  comps: ["ipl"], years: [2022, 2026], discipline: "bat", where: PRESETS[0].where, method: "standard", minBalls: 60, minMatches: 5,
};

function Chip({ on, children, onClick, label }: { on: boolean; children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? "text-slate-900 dark:text-white" : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-slate-500"}`}
      style={on ? { borderColor: ACC, background: tint(22) } : undefined}>{children}</button>
  );
}

const COND_LABEL: Record<string, string> = {
  innings: "Innings", phase: "Phase", over: "Over range", wickets: "Wickets down", ballsLeft: "Balls remaining", score: "Team score",
  runsRequired: "Runs required", rrr: "Required run rate", target: "Target", stage: "Match stage", position: "Batting position",
  batHand: "Batter hand", bowlType: "Bowler type",
};
const NEW_COND: Record<string, Cond> = {
  innings: { k: "innings", v: 2 }, phase: { k: "phase", v: "death" }, over: { k: "over", min: 16, max: 20 }, wickets: { k: "wickets", min: 3 },
  ballsLeft: { k: "ballsLeft", max: 30 }, score: { k: "score", max: 35 }, runsRequired: { k: "runsRequired", min: 30 }, rrr: { k: "rrr", min: 10 },
  target: { k: "target", min: 180 }, stage: { k: "stage", v: "knockout" }, position: { k: "position", min: 3, max: 5 },
  batHand: { k: "batHand", v: "left" }, bowlType: { k: "bowlType", v: "spin" },
};
const ENUM_OPTS: Record<string, [string | number, string][]> = {
  innings: [[1, "Batting first"], [2, "Chasing"]], phase: [["powerplay", "Powerplay"], ["middle", "Middle"], ["death", "Death"]],
  stage: [["early", "Early league"], ["mid", "Mid league"], ["late", "Late league"], ["knockout", "Playoffs & finals"]],
  batHand: [["left", "Left-hand"], ["right", "Right-hand"]], bowlType: [["pace", "Pace"], ["spin", "Spin"]],
};

function CondEditor({ c, onChange, onRemove }: { c: Cond; onChange: (c: Cond) => void; onRemove: () => void }) {
  const isRange = (RANGE_KEYS as readonly string[]).includes(c.k);
  const r = c as { min?: number; max?: number };
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-2.5 py-2" style={{ borderLeft: `3px solid ${ACC}` }}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-28 shrink-0">{COND_LABEL[c.k]}{CHASE_ONLY.has(c.k) && <span className={`block text-[10px] font-normal ${MUTED}`}>chase only</span>}</span>
      {isRange ? (
        <span className="flex items-center gap-1 text-xs">
          <input aria-label={`${COND_LABEL[c.k]} minimum`} inputMode="decimal" className={`${SEL} w-16`} placeholder="min" value={r.min ?? ""} onChange={e => onChange({ ...c, min: num(e.target.value) } as Cond)} />
          <span className={MUTED}>to</span>
          <input aria-label={`${COND_LABEL[c.k]} maximum`} inputMode="decimal" className={`${SEL} w-16`} placeholder="max" value={r.max ?? ""} onChange={e => onChange({ ...c, max: num(e.target.value) } as Cond)} />
        </span>
      ) : (
        <select aria-label={COND_LABEL[c.k]} className={SEL} value={String((c as { v: unknown }).v)}
          onChange={e => onChange({ k: c.k, v: c.k === "innings" ? Number(e.target.value) : e.target.value } as Cond)}>
          {ENUM_OPTS[c.k].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove ${COND_LABEL[c.k]}`} className={`ml-auto p-1 ${MUTED} hover:text-rose-500`}><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function GroupEditor({ g, onChange, depth = 1 }: { g: Group; onChange: (g: Group) => void; depth?: number }) {
  const set = (i: number, item: Cond | Group | null) => onChange({ ...g, items: item ? g.items.map((x, j) => (j === i ? item : x)) : g.items.filter((_, j) => j !== i) });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className={MUTED}>Match</span>
        <Chip on={g.op === "and"} onClick={() => onChange({ ...g, op: "and" })}>ALL (AND)</Chip>
        <Chip on={g.op === "or"} onClick={() => onChange({ ...g, op: "or" })}>ANY (OR)</Chip>
      </div>
      {g.items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div className="pl-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: ACC }}>{g.op}</div>}
          {isGroup(it)
            ? <div className="rounded-lg border border-dashed border-slate-300 dark:border-white/15 p-2">
                <GroupEditor g={it} depth={depth + 1} onChange={ng => set(i, ng)} />
                <button type="button" className={`mt-1 text-[11px] underline ${MUTED}`} onClick={() => set(i, null)}>Remove group</button>
              </div>
            : <CondEditor c={it} onChange={nc => set(i, nc)} onRemove={() => set(i, null)} />}
        </React.Fragment>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Add a condition" className={SEL} value="" onChange={e => e.target.value && onChange({ ...g, items: [...g.items, NEW_COND[e.target.value]] })}>
          <option value="">+ Add condition</option>
          {Object.keys(NEW_COND).map(k => <option key={k} value={k}>{COND_LABEL[k]}</option>)}
        </select>
        {depth < 2 && <button type="button" className="rounded-full border border-slate-300 dark:border-white/15 px-3 py-1 text-xs text-slate-600 dark:text-slate-300"
          onClick={() => onChange({ ...g, items: [...g.items, { op: g.op === "and" ? "or" : "and", items: [] }] })}>+ {g.op === "and" ? "OR" : "AND"} group</button>}
      </div>
    </div>
  );
}

interface Result { key: string; query: Query; params: Params; rows: ScoredRow[]; excluded: number; situation: ReturnType<typeof aggregate>["situation"]; comps: ReturnType<typeof aggregate>["comps"]; ms: number }

export function PressureIntelligence({ mobile = false }: { mobile?: boolean }) {
  const index = useQuery({ queryKey: ["pi-index"], queryFn: loadIndex, staleTime: Infinity });
  const method = useQuery({ queryKey: ["pi-method"], queryFn: loadMethodology, staleTime: Infinity });
  const comps = index.data?.competitions ?? [];
  const known = comps.map(c => c.code);

  const url = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [tab, setTab] = useState<Tab>((["overview", "builder", "rankings", "compare"] as Tab[]).find(t => t === url.get("tab")) ?? "overview");
  const [draft, setDraft] = useState<Query>(DEFAULT_QUERY);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [tray, setTray] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: keyof ScoredRow; dir: 1 | -1 }>({ key: "ras", dir: -1 });
  const [page, setPage] = useState(1);
  const runId = useRef(0);

  const params = (q: Query, m: Methodology | undefined): Params | null => (q.method === "custom" && q.params) ? q.params : m?.params ?? null;

  const run = useCallback(async (raw: unknown, goTo?: Tab) => {
    const parsed = parseQuery(raw, known);
    if ("error" in parsed) { setDraftError(parsed.error); return; }
    const q = parsed.query;
    setDraftError(null);
    setDraft(q);
    const id = ++runId.current;
    setStatus({ busy: true, error: null });
    try {
      const m = await loadMethodology();
      const p = params(q, m)!;
      const ds = await Promise.all(q.comps.map(loadDataset));
      if (id !== runId.current) return; // superseded by a newer request
      await new Promise(r => setTimeout(r, 0));
      const t0 = performance.now();
      const agg = aggregate(ds, q, p.wicket);
      const { rows, excluded } = score(agg, p, q.minBalls, q.minMatches, q.discipline === "bat");
      if (id !== runId.current) return;
      setResult({ key: queryKey(q), query: q, params: p, rows, excluded, situation: agg.situation, comps: agg.comps, ms: performance.now() - t0 });
      setStatus({ busy: false, error: null });
      setPage(1); setOpen(null); setSort({ key: "ras", dir: -1 });
      if (goTo) setTab(goTo);
      const sp = new URLSearchParams(window.location.search);
      sp.set("q", encodeQuery(q)); sp.set("tab", goTo ?? tab);
      window.history.replaceState(null, "", `${window.location.pathname}?${sp}`);
    } catch (e) {
      if (id === runId.current) setStatus({ busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [known.join(","), tab]);

  // Shared links: ?q=<query>&tab=… restores and runs the query once the index is known.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !known.length) return;
    restored.current = true;
    const s = url.get("q");
    if (!s) return;
    try { void run(decodeQuery(s), tab === "overview" ? "rankings" : tab); } catch { setDraftError("The shared query link is malformed."); }
  }, [known.length]);

  const changeTab = (t: Tab) => {
    setTab(t);
    const sp = new URLSearchParams(window.location.search); sp.set("tab", t);
    window.history.replaceState(null, "", `${window.location.pathname}?${sp}`);
  };

  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const c of comps) if (draft.comps.includes(c.code)) for (const s of c.seasons) ys.add(Number(s.slice(0, 4)));
    return [...ys].sort((a, b) => a - b);
  }, [comps, draft.comps]);

  const sorted = useMemo(() => {
    if (!result) return [];
    const { key, dir } = sort;
    return [...result.rows].sort((a, b) => ((a[key] as number) - (b[key] as number)) * dir || a.id.localeCompare(b.id));
  }, [result, sort]);
  const rankOf = useMemo(() => new Map(result?.rows.map((r, i) => [r.id, i + 1]) ?? []), [result]);
  const toggleTray = (id: string) => setTray(t => (t.includes(id) ? t.filter(x => x !== id) : t.length < 5 ? [...t, id] : t));
  const bat = (result?.query.discipline ?? draft.discipline) === "bat";
  const parsedDraft = useMemo(() => parseQuery(draft, known), [draft, known.join(",")]);
  const stale = !!result && "query" in parsedDraft && queryKey(parsedDraft.query) !== result.key;

  // ── Header & tabs ──────────────────────────────────────────────────────────
  const header = (
    <header className={mobile ? "px-4 pt-3" : "flex flex-wrap items-end justify-between gap-3"}>
      <div>
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase" style={{ color: ACC }}>CricField Intelligence · Scout Lab</p>
        <h1 className={`font-display font-black uppercase tracking-tight text-slate-900 dark:text-white ${mobile ? "text-xl" : "text-2xl sm:text-3xl"}`}>Pressure Intelligence</h1>
        {!mobile && <p className={`text-sm ${MUTED}`}>Define the situation. Discover the performance.</p>}
      </div>
      {result && !mobile && <p className={`text-xs ${MUTED} max-w-md text-right`}>Current situation: <span className="text-slate-800 dark:text-slate-200">{summary(result.query, comps)}</span></p>}
    </header>
  );
  const tabs = (
    <nav aria-label="Pressure Intelligence" className={`grid grid-cols-4 gap-1 ${mobile ? "px-4" : "max-w-2xl"}`}>
      {TABS.map(([t, l]) => (
        <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => changeTab(t)}
          className={`rounded-md border px-2 font-semibold transition-colors ${mobile ? "py-2 text-[11px] leading-tight" : "py-2 text-xs"} ${tab === t ? "text-slate-900 dark:text-white" : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
          style={tab === t ? { borderColor: ACC, background: tint(20) } : undefined}>
          {mobile && t === "builder" ? "Builder" : l}{t === "compare" && tray.length > 0 && <span className={mobile ? "block text-[10px] opacity-70" : "ml-1 opacity-70"}>({tray.length})</span>}
        </button>
      ))}
    </nav>
  );

  // ── Overview ───────────────────────────────────────────────────────────────
  const overview = (
    <div className="space-y-5">
      <p className={`text-sm ${MUTED} max-w-3xl`}>Pick competitions and seasons, describe a match situation with conditions known before each ball (score, wickets, overs left, chase target, stage, batter and bowler type), and rank batters or bowlers by how far they beat the expected outcome for that exact context.</p>
      <section aria-labelledby="pi-presets">
        <h2 id="pi-presets" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Start from a situation</h2>
        <div className={`grid gap-2 ${mobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {PRESETS.map(p => {
            const d = method.data?.diagnostics.find(x => x.id === p.id);
            return (
              <button key={p.id} type="button" className={`${CARD} p-3 text-left hover:border-slate-400 dark:hover:border-white/30 transition-colors`}
                onClick={() => run({ ...draft, discipline: p.discipline, where: p.where }, "rankings")}>
                <span className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-900 dark:text-white">{p.label}</strong><span className={`text-[10px] uppercase ${MUTED}`}>{p.discipline === "bat" ? "Batters" : "Bowlers"}</span></span>
                <span className={`block text-xs mt-1 ${MUTED}`}>{p.blurb}</span>
                {d && d.rasPredictsOtherHalf < 0.1 && <span className="mt-1 block text-[11px] text-amber-600 dark:text-amber-400">Low predictive evidence: rankings here barely repeat across matches.</span>}
              </button>
            );
          })}
        </div>
        <p className={`text-[11px] mt-2 ${MUTED}`}>Presets run on your current competitions and seasons ({summaryScope(draft, comps)}); change them in the Situation Builder.</p>
      </section>
      <button type="button" onClick={() => changeTab("builder")} className="rounded-md border px-4 py-2 text-sm font-bold text-slate-900 dark:text-white" style={{ borderColor: ACC, background: tint(28) }}>Create a situation</button>
      <section aria-labelledby="pi-coverage">
        <h2 id="pi-coverage" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Competition coverage</h2>
        {index.isError && <ErrorLine msg="Coverage could not be loaded." retry={() => index.refetch()} />}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs min-w-[520px]">
            <thead className={`bg-slate-50 dark:bg-white/5 ${MUTED}`}><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold"><th>Competition</th><th>Seasons</th><th>Matches</th><th>Balls</th><th>Bowler type known</th><th>Partial seasons</th></tr></thead>
            <tbody>{comps.map(c => (
              <tr key={c.code} className="border-t border-slate-100 dark:border-white/5 [&>td]:px-3 [&>td]:py-1.5 text-slate-700 dark:text-slate-300">
                <td className="font-semibold">{c.name}</td><td>{c.seasons[0]} – {c.seasons.at(-1)}</td><td>{c.matches.toLocaleString()}</td><td>{c.balls.toLocaleString()}</td>
                <td className={c.bowlerTypeCoverage < 0.5 ? "text-amber-600 dark:text-amber-400" : ""}>{Math.round(c.bowlerTypeCoverage * 100)}%</td>
                <td>{c.partialSeasons.length ? c.partialSeasons.join(", ") : "—"}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <p className={`text-[11px] mt-1 ${MUTED}`}>Ball-by-ball data from Cricsheet (ODC-BY 1.0). Bowler type and batting hand come from player bios, so outside the IPL many balls have no type and drop out of those filters.</p>
      </section>
    </div>
  );

  // ── Builder ────────────────────────────────────────────────────────────────
  const yr = draft.years;
  const seasonMode = !yr ? "all" : yr[0] === yr[1] ? "one" : "range";
  const setYears = (y: [number, number] | null) => setDraft(d => ({ ...d, years: y }));
  const p = draft.method === "custom" && draft.params ? draft.params : method.data?.params;
  const stage = (title: string, body: React.ReactNode, defOpen = true) => mobile
    ? <details open={defOpen} className={`${CARD} group`}><summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white list-none">{title}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="px-3 pb-3">{body}</div></details>
    : <fieldset className="space-y-2"><legend className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{title}</legend>{body}</fieldset>;

  const controls = (
    <div className={mobile ? "space-y-2" : "space-y-5"}>
      {stage("Competitions", <>
        <div className="flex flex-wrap gap-1.5">{comps.map(c => <Chip key={c.code} on={draft.comps.includes(c.code)} onClick={() => setDraft(d => ({ ...d, comps: d.comps.includes(c.code) ? d.comps.filter(x => x !== c.code) : [...d.comps, c.code] }))}>{short(c.code)}</Chip>)}</div>
        <p className={`text-[11px] ${MUTED}`}>Each league is judged against its own season averages before players are combined. {draft.comps.includes("t20i_assoc") && "Associate T20Is are kept separate from Full Member T20Is because the batting they face is much weaker."}</p>
      </>)}
      {stage("Season", <>
        <div className="flex gap-1.5"><Chip on={seasonMode === "all"} onClick={() => setYears(null)}>All</Chip><Chip on={seasonMode === "range"} onClick={() => setYears([years.at(-5) ?? years[0], years.at(-1)!])}>Range</Chip><Chip on={seasonMode === "one"} onClick={() => setYears([years.at(-1)!, years.at(-1)!])}>Particular</Chip></div>
        {yr && <div className="flex items-center gap-2 text-xs">
          {seasonMode === "range" && <><select aria-label="From season" className={SEL} value={yr[0]} onChange={e => setYears([+e.target.value, yr[1]])}>{years.map(y => <option key={y}>{y}</option>)}</select><span className={MUTED}>to</span></>}
          <select aria-label={seasonMode === "range" ? "To season" : "Season"} className={SEL} value={yr[1]} onChange={e => setYears(seasonMode === "one" ? [+e.target.value, +e.target.value] : [yr[0], +e.target.value])}>{years.map(y => <option key={y}>{y}</option>)}</select>
        </div>}
        {!yr && years.length > 0 && <p className={`text-xs ${MUTED}`}>{years[0]} – {years.at(-1)}</p>}
      </>)}
      {stage("Conditions", <>
        <div className="flex gap-1.5 mb-1"><Chip on={draft.discipline === "bat"} onClick={() => setDraft(d => ({ ...d, discipline: "bat" }))}>Batters</Chip><Chip on={draft.discipline === "bowl"} onClick={() => setDraft(d => ({ ...d, discipline: "bowl" }))}>Bowlers</Chip></div>
        <div className="flex flex-wrap gap-1 mb-2">{PRESETS.map(pr => <button key={pr.id} type="button" className={`rounded-full border border-slate-300 dark:border-white/15 px-2.5 py-0.5 text-[11px] ${MUTED} hover:text-slate-800 dark:hover:text-slate-200`} onClick={() => setDraft(d => ({ ...d, discipline: pr.discipline, where: pr.where }))}>{pr.label}</button>)}</div>
        <GroupEditor g={draft.where} onChange={where => setDraft(d => ({ ...d, where }))} />
      </>)}
      {stage("Evaluation", <>
        <div className="flex gap-1.5"><Chip on={draft.method === "standard"} onClick={() => setDraft(d => ({ ...d, method: "standard", params: undefined }))}>Standard</Chip><Chip on={draft.method === "custom"} onClick={() => setDraft(d => ({ ...d, method: "custom", params: d.params ?? method.data?.params }))}>Advanced</Chip></div>
        {draft.method === "custom" && p && <div className="grid grid-cols-2 gap-2 text-xs">
          {([["wicket", "Wicket value (runs)"], ["lambdaH", "Shrinkage λ pressure (balls)"], ["lambdaN", "Shrinkage λ ordinary (balls)"], ["alpha", "α · weight on lift"], ["beta", "β · uncertainty penalty"]] as [keyof Params, string][]).map(([k, l]) => (
            <label key={k} className={`flex flex-col gap-0.5 ${MUTED}`}>{l}<input inputMode="decimal" className={SEL} value={p[k]} onChange={e => setDraft(d => ({ ...d, params: { ...p, [k]: Number(e.target.value) } }))} /></label>
          ))}
          <p className="col-span-2 text-[11px] text-amber-600 dark:text-amber-400">Custom scores are not comparable with the standard score. Lift is built from the same balls as the pressure score, so weighting both double-counts form.</p>
        </div>}
        {draft.method === "standard" && p && <p className={`text-[11px] ${MUTED}`}>Standard v1: wicket = {p.wicket} runs, λ = {p.lambdaH} balls, α = {p.alpha}, β = {p.beta} (chosen by split-half prediction).</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className={`flex flex-col gap-0.5 ${MUTED}`}>Min. {draft.discipline === "bat" ? "balls faced" : "balls bowled"}<input inputMode="numeric" className={SEL} value={draft.minBalls} onChange={e => setDraft(d => ({ ...d, minBalls: Number(e.target.value) || 0 }))} /></label>
          <label className={`flex flex-col gap-0.5 ${MUTED}`}>Min. matches<input inputMode="numeric" className={SEL} value={draft.minMatches} onChange={e => setDraft(d => ({ ...d, minMatches: Number(e.target.value) || 0 }))} /></label>
        </div>
      </>)}
      {mobile && stage("Review", <p className="text-xs text-slate-700 dark:text-slate-300">{summary(draft, comps)}</p>)}
    </div>
  );
  const generate = (
    <div className={mobile ? "sticky z-20 px-4 py-2 bg-white/95 dark:bg-[#050816]/95 backdrop-blur border-t border-slate-200 dark:border-white/10" : ""}
      style={mobile ? { bottom: "calc(var(--m-tabs, 60px) + var(--m-safe-b, 0px) + 8px)" } : undefined}>
      {draftError && <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-400">{draftError}</p>}
      <button type="button" disabled={status.busy} onClick={() => run(draft, "rankings")}
        className="w-full rounded-md border px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white disabled:opacity-60" style={{ borderColor: ACC, background: tint(30) }}>
        {status.busy ? "Analysing…" : "Generate Analysis"}
      </button>
    </div>
  );
  const builder = mobile ? <div className="space-y-2">{controls}{generate}</div> : (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)] items-start">
      <div className={`${CARD} p-4 space-y-4 lg:sticky lg:top-20`}>{controls}{generate}</div>
      <div className="space-y-3">
        <div className={`${CARD} p-4`}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your situation</h2>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{summary(draft, comps)}</p>
          {usesChaseOnly(draft.where) && <p className={`mt-1 text-[11px] ${MUTED}`}>Required runs, rate and target exist only in chases, so only second-innings balls can match those conditions.</p>}
          {stale && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Results below are for the previous situation — press Generate Analysis to update.</p>}
        </div>
        {result ? <>{sampleCard(result, comps)}{rankTable(sorted.slice(0, 10), false)}<button type="button" className="text-xs underline" style={{ color: ACC }} onClick={() => changeTab("rankings")}>Open full rankings →</button></>
          : <div className={`${CARD} p-6 text-sm ${MUTED}`}>Set the situation on the left and press <strong>Generate Analysis</strong>. Rankings, sample size and evidence appear here.</div>}
      </div>
    </div>
  );

  // ── Rankings ───────────────────────────────────────────────────────────────
  const PAGE = 25;
  function rankTable(rows: ScoredRow[], full: boolean) {
    const th = (key: keyof ScoredRow, label: string, title?: string) => (
      <th className="cursor-pointer select-none" title={title} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
        onClick={() => full && setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>{label}{full && sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</th>
    );
    if (mobile) return (
      <ul className="divide-y divide-slate-200 dark:divide-white/10 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {rows.map(r => (
          <li key={r.id}>
            <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left bg-white dark:bg-[#08121B]" onClick={() => setOpen(r.id)}>
              <span className={`w-6 text-xs tabular-nums ${MUTED}`}>{rankOf.get(r.id)}</span>
              <img src={resolvePlayerImage(r.name)} alt="" className="h-9 w-9 rounded-full object-cover bg-slate-200 dark:bg-white/10" loading="lazy" onError={e => (e.currentTarget.style.visibility = "hidden")} />
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-white">{r.name}</strong>
                <span className={`block text-[11px] ${MUTED}`}>{bat ? `SR ${f1((100 * r.runs) / r.balls)}` : `Econ ${f1((6 * r.runs) / r.balls)}`} · {r.balls} balls · {r.matches} m</span></span>
              <span className="text-right"><span className={`block text-sm font-bold tabular-nums ${tone(r.ras)}`}>{signed(r.ras)}</span><Evidence e={r.evidence} /></span>
            </button>
          </li>
        ))}
      </ul>
    );
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[760px] text-xs">
          <thead className={`bg-slate-50 dark:bg-white/5 ${MUTED}`}>
            <tr className="text-right [&>th]:px-2.5 [&>th]:py-2 [&>th]:font-semibold">
              <th className="text-left">#</th><th className="text-left">Player</th>
              {th("ras", "RAS", "Reliability-Adjusted Score: pressure score minus an uncertainty penalty")}
              {th("A", "Pressure /100", "Runs above the context expectation per 100 balls in this situation (shrunk)")}
              {th("lift", "Lift", "Pressure score minus the player's own score on their other balls")}
              {th("se", "± SE", "Match-clustered standard error of the raw pressure rate")}
              {th("balls", "Balls")}{th("matches", "Matches")}
              <th>{bat ? "SR" : "Econ"}</th><th>{bat ? "Avg" : "Wkts"}</th><th className="text-left">Evidence</th>{full && <th />}
            </tr>
          </thead>
          <tbody className="text-slate-800 dark:text-slate-200">
            {rows.map(r => (
              <tr key={r.id} className="text-right border-t border-slate-100 dark:border-white/5 [&>td]:px-2.5 [&>td]:py-1.5 tabular-nums hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <td className={`text-left ${MUTED}`}>{rankOf.get(r.id)}</td>
                <td className="text-left"><button type="button" className="font-semibold hover:underline" onClick={() => setOpen(r.id)}>{r.name}</button><span className={`ml-1.5 text-[10px] ${MUTED}`}>{r.comps.map(c => short(c.comp)).join(" · ")}</span></td>
                <td className={`font-bold ${tone(r.ras)}`}>{signed(r.ras)}</td><td className={tone(r.A)}>{signed(r.A)}</td><td className={tone(r.lift)}>{signed(r.lift)}</td><td>{f1(r.se)}</td>
                <td>{r.balls}</td><td>{r.matches}</td>
                <td>{bat ? f1((100 * r.runs) / r.balls) : f1((6 * r.runs) / r.balls)}</td><td>{bat ? (r.outs ? f1(r.runs / r.outs) : "–") : r.outs}</td>
                <td className="text-left"><Evidence e={r.evidence} /></td>
                {full && <td><button type="button" aria-pressed={tray.includes(r.id)} aria-label={`${tray.includes(r.id) ? "Remove" : "Add"} ${r.name} ${tray.includes(r.id) ? "from" : "to"} comparison`} onClick={() => toggleTray(r.id)}
                  className="rounded border px-1.5 py-0.5 text-[11px]" style={tray.includes(r.id) ? { borderColor: ACC, background: tint(22) } : undefined}>{tray.includes(r.id) ? "✓ Compare" : "+ Compare"}</button></td>}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={12} className={`px-3 py-6 text-center ${MUTED}`}>No player meets the evidence thresholds. Lower the minimum balls/matches or widen competitions and seasons.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  const rankings = !result ? <Empty onBuild={() => changeTab("builder")} busy={status.busy} /> : (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip on={result.query.discipline === "bat"} onClick={() => result.query.discipline !== "bat" && run({ ...result.query, discipline: "bat" })}>Batters</Chip>
        <Chip on={result.query.discipline === "bowl"} onClick={() => result.query.discipline !== "bowl" && run({ ...result.query, discipline: "bowl" })}>Bowlers</Chip>
        {mobile && <select aria-label="Sort by" className={SEL} value={String(sort.key)} onChange={e => setSort({ key: e.target.value as keyof ScoredRow, dir: -1 })}>
          {[["ras", "RAS"], ["A", "Pressure /100"], ["lift", "Lift"], ["balls", "Balls"], ["matches", "Matches"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        <button type="button" className={`text-xs underline ${MUTED}`} onClick={() => { setDraft(result.query); changeTab("builder"); }}>Edit situation</button>
        <CopyLink />
      </div>
      <p className="text-xs text-slate-700 dark:text-slate-300">{summary(result.query, comps)}{result.query.method === "custom" && <span className="ml-1 text-amber-600 dark:text-amber-400">· custom scoring, not comparable with standard</span>}</p>
      {sampleCard(result, comps)}
      {rankTable(sorted.slice(0, page * PAGE), true)}
      {sorted.length > page * PAGE && <button type="button" className="rounded-full border border-slate-300 dark:border-white/15 px-3 py-1 text-xs" onClick={() => setPage(n => n + 1)}>Show {Math.min(PAGE, sorted.length - page * PAGE)} more</button>}
      <HowScored m={method.data} params={result.params} custom={result.query.method === "custom"} />
    </div>
  );

  // ── Compare ────────────────────────────────────────────────────────────────
  const compared = result ? tray.map(id => ({ id, row: result.rows.find(r => r.id === id) })) : [];
  const compare = !result ? <Empty onBuild={() => changeTab("builder")} busy={status.busy} /> : !tray.length ? (
    <div className={`${CARD} p-6 text-sm ${MUTED}`}>Add up to five players from <button type="button" className="underline" onClick={() => changeTab("rankings")}>Rankings</button> (“+ Compare”). Every player is measured under exactly the same situation.</div>
  ) : <CompareView items={compared} names={new Map(result.rows.map(r => [r.id, r.name]))} bat={bat} mobile={mobile} query={result.query} comps={comps} onRemove={id => toggleTray(id)} />;

  const openRow = result?.rows.find(r => r.id === open) ?? null;

  return (
    <div className={mobile ? "space-y-3 pb-4" : "w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"}>
      {header}
      {tabs}
      {mobile && result && <p className={`px-4 text-[11px] ${MUTED}`}>Current: <span className="text-slate-800 dark:text-slate-200">{summary(result.query, comps)}</span></p>}
      {status.error && <div className={mobile ? "px-4" : ""}><ErrorLine msg={`Analysis failed: ${status.error}`} retry={() => run(draft)} /></div>}
      <div className={mobile ? "px-4" : ""} aria-busy={status.busy}>
        {tab === "overview" && overview}
        {tab === "builder" && builder}
        {tab === "rankings" && rankings}
        {tab === "compare" && compare}
      </div>
      {openRow && result && <Dossier row={openRow} rank={rankOf.get(openRow.id)!} of={result.rows.length} bat={bat} mobile={mobile} inTray={tray.includes(openRow.id)} onTray={() => toggleTray(openRow.id)} onClose={() => setOpen(null)} />}
    </div>
  );
}

function summaryScope(q: Query, comps: CompInfo[]) {
  const names = q.comps.map(c => short(c)).join(" + ");
  return `${names}, ${q.years ? (q.years[0] === q.years[1] ? q.years[0] : `${q.years[0]}–${q.years[1]}`) : "all seasons"}`;
}
function summary(q: Query, comps: CompInfo[]) {
  return `${q.discipline === "bat" ? "Batters" : "Bowlers"} in ${summaryScope(q, comps)}, on balls where ${describeGroup(q.where)}.`;
}

function sampleCard(r: Result, comps: CompInfo[]) {
  const bat = r.query.discipline === "bat";
  const s = r.situation;
  const share = s.balls ? (100 * s.events) / s.balls : 0;
  return (
    <div className={`${CARD} p-3 text-xs grid gap-2 sm:grid-cols-[auto_1fr]`}>
      <div className="space-y-0.5">
        <p><strong className="text-slate-900 dark:text-white">{s.events.toLocaleString()}</strong> <span className={MUTED}>matching {bat ? "balls faced" : "deliveries"} ({f1(share)}% of the scope)</span></p>
        <p className={MUTED}>{bat ? `Situation SR ${f1((100 * s.runs) / s.events)}, ${s.outs ? f1(s.runs / s.outs) : "–"} runs per dismissal` : `Situation economy ${f1((6 * s.runs) / Math.max(1, s.legal))}, a wicket every ${s.outs ? f1(s.legal / s.outs) : "–"} balls`}</p>
        <p className={MUTED}>{r.rows.length} players qualify · {r.excluded} below thresholds · computed in {Math.round(r.ms)} ms</p>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:justify-end content-start">
        {r.comps.map(c => <span key={c.comp} className="rounded-full border border-slate-200 dark:border-white/10 px-2 py-0.5" title={`${c.events} of ${c.inScope} balls in scope`}>{short(c.comp)} {c.events.toLocaleString()}</span>)}
      </div>
      {s.events === 0 && <p className="sm:col-span-2 text-amber-600 dark:text-amber-400">No ball matches this situation in the selected competitions and seasons.</p>}
    </div>
  );
}

function Evidence({ e }: { e: ScoredRow["evidence"] }) {
  return <span className={`inline-block rounded-full px-1.5 py-px text-[10px] font-semibold ${e === "strong" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300"}`}>{e === "strong" ? "Strong" : "Adequate"}</span>;
}
function ErrorLine({ msg, retry }: { msg: string; retry: () => void }) {
  return <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{msg} <button type="button" className="underline" onClick={retry}>Retry</button></p>;
}
function Empty({ onBuild, busy }: { onBuild: () => void; busy: boolean }) {
  return <div className={`${CARD} p-6 text-sm ${MUTED}`} aria-live="polite">{busy ? "Analysing…" : <>No analysis yet. Pick a preset on Overview or <button type="button" className="underline" onClick={onBuild}>build a situation</button>.</>}</div>;
}
function CopyLink() {
  const [done, setDone] = useState(false);
  return <button type="button" className={`text-xs underline ${MUTED}`} onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>{done ? "Link copied" : "Copy share link"}</button>;
}

function HowScored({ m, params, custom }: { m?: Methodology; params: Params; custom: boolean }) {
  return (
    <details className={`${CARD} p-3 text-xs`}>
      <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200">How this is scored</summary>
      <div className={`mt-2 space-y-1.5 ${MUTED}`}>
        <p><strong>Pressure /100</strong> (contextual_pressure_performance_v1): every ball is compared with the average outcome for the same competition-season, innings, over and wickets down, leaving that match out. Batting: runs above expected minus a dismissal cost; bowling: runs saved plus wickets above expected. A dismissal is worth {params.wicket} runs. Summed per player and shrunk toward 0 by {params.lambdaH} balls.</p>
        <p><strong>Lift</strong>: pressure score minus the player's score on all their other balls in the same scope. <strong>RAS</strong> (reliability_adjusted_score_v1) = Pressure + {params.alpha}·Lift − {params.beta}·SE, where SE is the match-clustered standard error.</p>
        {m && !custom && <p>Standard parameters were chosen by split-half prediction (odd vs even matches) on {m.selection.scope.comps.map(short).join(" + ")} {m.selection.scope.years.join("–")}: shrinkage by prediction error, then the score on one half ranks raw value on the other with mean Spearman {m.selection.best.mean.toFixed(2)} — a modest signal. Lift barely repeats (r {m.diagnostics.filter(d => d.playersBothHalves >= 30).map(d => d.liftRepeat.toFixed(2)).join(", ")} across presets), so it is shown but not weighted. Moving a rule threshold one step keeps {Math.min(...m.sensitivity.map(s => s.overlapTop20))}–{Math.max(...m.sensitivity.map(s => s.overlapTop20))} of the top 20.</p>}
        <p>These are CricField's own methods, validated only as described; they are not win-probability models.</p>
      </div>
    </details>
  );
}

function Explain({ r, rank, of, bat }: { r: ScoredRow; rank: number; of: number; bat: boolean }) {
  const parts = [`Ranked ${rank} of ${of} on RAS.`];
  parts.push(`${r.A >= 0 ? "Beats" : "Falls short of"} the context expectation by ${f1(Math.abs(r.A))} runs per 100 ${bat ? "balls" : "deliveries"} in this situation`);
  parts.push(`${r.lift >= 0 ? "which is" : "against"} ${f1(Math.abs(r.lift))} ${r.lift >= 0 ? "better than" : "worse than"} their own other balls.`);
  parts.push(`Positive in ${Math.round(100 * r.positiveShare)}% of ${r.matches} matches; the uncertainty (±${f1(r.se)}) ${r.se > Math.abs(r.A) ? "is larger than the score itself, so treat the rank loosely" : "is smaller than the score"}.`);
  return <p className="text-xs text-slate-700 dark:text-slate-300">{parts.join(" ")}</p>;
}

function Dossier({ row: r, rank, of, bat, mobile, inTray, onTray, onClose }: { row: ScoredRow; rank: number; of: number; bat: boolean; mobile: boolean; inTray: boolean; onTray: () => void; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const stat = (l: string, v: string, cls = "") => <div className="rounded-lg bg-slate-50 dark:bg-white/[0.04] p-2"><div className={`text-[10px] uppercase ${MUTED}`}>{l}</div><div className={`text-sm font-bold tabular-nums ${cls}`}>{v}</div></div>;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${r.name} evidence`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className={`absolute bg-white dark:bg-[#071018] border-slate-200 dark:border-white/10 overflow-y-auto p-4 space-y-3 ${mobile ? "inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t" : "right-0 top-0 h-full w-full max-w-md border-l"}`}>
        <div className="flex items-start justify-between gap-2">
          <div><h2 className="text-lg font-black text-slate-900 dark:text-white">{r.name}</h2><p className={`text-xs ${MUTED}`}>{bat ? "Batting" : "Bowling"} · {[r.batHand && `${r.batHand}-hand bat`, r.bowlType].filter(Boolean).join(" · ") || "type unknown"}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className={`p-1 ${MUTED}`}><X className="h-5 w-5" /></button>
        </div>
        <Explain r={r} rank={rank} of={of} bat={bat} />
        <div className="grid grid-cols-3 gap-2">
          {stat("RAS", signed(r.ras), tone(r.ras))}{stat("Pressure /100", signed(r.A), tone(r.A))}{stat("Ordinary /100", signed(r.B), tone(r.B))}
          {stat("Lift", signed(r.lift), tone(r.lift))}{stat("± SE", f1(r.se))}{stat("+ matches", `${Math.round(100 * r.positiveShare)}%`)}
          {stat(bat ? "Balls" : "Balls", String(r.balls))}{stat("Runs", String(r.runs))}{stat(bat ? "Outs" : "Wickets", String(r.outs))}
          {stat(bat ? "SR" : "Econ", bat ? f1((100 * r.runs) / r.balls) : f1((6 * r.runs) / r.balls))}{stat("Dot %", f1((100 * r.dots) / r.balls))}{stat("Bdry %", f1((100 * r.boundaries) / r.balls))}
        </div>
        <p className={`text-[11px] ${MUTED}`}>≈95% interval on the raw pressure rate: {f1(r.ci[0])} to {f1(r.ci[1])} per 100.</p>
        <Breakdown title="By competition" rows={r.comps.map(c => [short(c.comp), c.balls, c.per100])} />
        <Breakdown title="By season" rows={r.years.map(y => [String(y.year), y.balls, y.per100])} />
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={onTray} className="rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: ACC, background: inTray ? tint(25) : undefined }}>{inTray ? "In comparison ✓" : "+ Add to comparison"}</button>
          <Link href={`/scout/player/${r.id}`} className="rounded-md border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs">Player profile ↗</Link>
        </div>
      </aside>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number, number][] }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r[2])));
  return (
    <section>
      <h3 className={`text-[11px] font-bold uppercase tracking-wider ${MUTED} mb-1`}>{title} <span className="font-normal normal-case">(raw, per 100)</span></h3>
      <ul className="space-y-1 text-xs">{rows.map(([l, n, v]) => (
        <li key={l} className="grid grid-cols-[7.5rem_1fr_3.2rem_3rem] items-center gap-2 tabular-nums">
          <span className="truncate" title={l}>{l}</span>
          <span className="relative h-2 rounded bg-slate-100 dark:bg-white/5"><span className={`absolute top-0 h-2 rounded ${v >= 0 ? "left-1/2 bg-emerald-500/70" : "right-1/2 bg-rose-500/70"}`} style={{ width: `${(50 * Math.abs(v)) / max}%` }} /></span>
          <span className={`text-right ${tone(v)}`}>{signed(v)}</span><span className={`text-right ${MUTED}`}>{n}</span>
        </li>))}</ul>
    </section>
  );
}

function CompareView({ items, names, bat, mobile, query, comps, onRemove }: {
  items: { id: string; row?: ScoredRow }[]; names: Map<string, string>; bat: boolean; mobile: boolean; query: Query; comps: CompInfo[]; onRemove: (id: string) => void;
}) {
  const rows = items.filter((x): x is { id: string; row: ScoredRow } => !!x.row).map(x => x.row);
  const missing = items.filter(x => !x.row).map(x => x.id);
  const metrics: [string, (r: ScoredRow) => string, ((r: ScoredRow) => number)?][] = [
    ["RAS", r => signed(r.ras), r => r.ras], ["Pressure /100", r => signed(r.A), r => r.A], ["Ordinary /100", r => signed(r.B), r => r.B], ["Lift", r => signed(r.lift), r => r.lift],
    ["± SE", r => f1(r.se)], ["≈95% interval", r => `${f1(r.ci[0])} to ${f1(r.ci[1])}`], ["Positive matches", r => `${Math.round(100 * r.positiveShare)}%`],
    ["Balls · matches", r => `${r.balls} · ${r.matches}`], [bat ? "Strike rate" : "Economy", r => (bat ? f1((100 * r.runs) / r.balls) : f1((6 * r.runs) / r.balls))],
    [bat ? "Average" : "Wickets", r => (bat ? (r.outs ? f1(r.runs / r.outs) : "–") : String(r.outs))], ["Dot %", r => f1((100 * r.dots) / r.balls)],
    ["Competitions", r => r.comps.map(c => `${short(c.comp)} ${c.balls}`).join(", ")], ["Evidence", r => (r.evidence === "strong" ? "Strong" : "Adequate")],
  ];
  const best = rows.length > 1 ? [...rows].sort((a, b) => b.ras - a.ras) : [];
  const overlap = best.length > 1 && best[0].ci[0] <= best[1].ci[1];
  const compSets = new Set(rows.map(r => r.comps.map(c => c.comp).sort().join("+")));
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-700 dark:text-slate-300">Same situation for everyone: {summary(query, comps)}</p>
      {missing.length > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{missing.map(id => names.get(id) ?? id).join(", ")} {missing.length > 1 ? "do" : "does"} not meet the evidence thresholds for this situation. <button type="button" className="underline" onClick={() => missing.forEach(onRemove)}>Remove</button></p>}
      {compSets.size > 1 && <p className="text-xs text-amber-600 dark:text-amber-400">These players' balls come from different competitions, so part of any gap may be league context the model cannot fully remove.</p>}
      {best.length > 1 && <p className="text-xs text-slate-700 dark:text-slate-300">{overlap ? `No clear leader: ${best[0].name}'s and ${best[1].name}'s intervals overlap.` : `${best[0].name} leads, and the interval does not overlap ${best[1].name}'s.`}</p>}
      {mobile ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {rows.map(r => (
            <article key={r.id} className={`${CARD} w-[78vw] max-w-[320px] shrink-0 snap-center p-3`}>
              <div className="mb-2 flex items-center justify-between"><strong className="text-sm text-slate-900 dark:text-white">{r.name}</strong><button type="button" aria-label={`Remove ${r.name}`} onClick={() => onRemove(r.id)} className={MUTED}><X className="h-4 w-4" /></button></div>
              <dl className="space-y-1 text-xs">{metrics.map(([l, fmt]) => <div key={l} className="flex justify-between gap-2"><dt className={MUTED}>{l}</dt><dd className="text-right tabular-nums text-slate-800 dark:text-slate-200">{fmt(r)}</dd></div>)}</dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs">
            <thead className={`bg-slate-50 dark:bg-white/5 ${MUTED}`}><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-right"><th className="!text-left">Metric</th>{rows.map(r => <th key={r.id}><span className="font-semibold text-slate-900 dark:text-white">{r.name}</span> <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onRemove(r.id)} className="align-middle"><X className="inline h-3 w-3" /></button></th>)}</tr></thead>
            <tbody className="text-slate-800 dark:text-slate-200">{metrics.map(([l, fmt, num]) => {
              const top = num && rows.length > 1 ? Math.max(...rows.map(num)) : null;
              return <tr key={l} className="border-t border-slate-100 dark:border-white/5 [&>td]:px-3 [&>td]:py-1.5 tabular-nums"><td className={MUTED}>{l}</td>{rows.map(r => <td key={r.id} className={`text-right ${top !== null && num!(r) === top ? "font-bold" : ""}`} style={top !== null && num!(r) === top ? { color: ACC } : undefined}>{fmt(r)}</td>)}</tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <Breakdown title="Pressure /100 in each player's last three seasons" rows={rows.flatMap(r => r.years.slice(-3).map(y => [`${r.name} '${String(y.year).slice(2)}`, y.balls, y.per100] as [string, number, number]))} />}
    </div>
  );
}

