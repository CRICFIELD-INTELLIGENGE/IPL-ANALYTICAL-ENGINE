// Scout Lab section: who performs best in a given match situation (season × situation filters).
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { loadSituationData, loadSituationIndex, rankSituation, SHRINK_BALLS } from "@/lib/scout-situations";

type SeasonMode = "all" | "range" | "one";
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : "–");
const ratio = (a: number, b: number, k = 1) => (b ? ((k * a) / b).toFixed(k === 100 ? 1 : 2) : "–");
const sel = "rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0B1620] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100";
const chip = (on: boolean) => `rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${on
  ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-200"
  : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-slate-500"}`;

export function ScoutPressureLab() {
  const index = useQuery({ queryKey: ["scout-situations-index"], queryFn: loadSituationIndex, staleTime: Infinity });
  const [comp, setComp] = useState("ipl");
  const [role, setRole] = useState<0 | 1>(0);
  const [mode, setMode] = useState<SeasonMode>("all");
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [group, setGroup] = useState("High pressure");
  const [situation, setSituation] = useState("pressure");
  const [minBalls, setMinBalls] = useState(120);
  const [limit, setLimit] = useState(25);

  const meta = index.data?.competitions.find(c => c.code === comp);
  const data = useQuery({ queryKey: ["scout-situations", meta?.file], queryFn: () => loadSituationData(meta!.file), enabled: !!meta, staleTime: Infinity });
  const seasons = meta?.seasons ?? [];
  // Default the range/particular pickers to the latest season whenever the league changes.
  useEffect(() => { setFrom(Math.max(0, seasons.length - 3)); setTo(Math.max(0, seasons.length - 1)); }, [comp, seasons.length]);
  useEffect(() => setLimit(25), [comp, role, mode, from, to, situation, minBalls]);

  const sits = index.data?.situations ?? [];
  const groups = [...new Set(sits.map(s => s.group))];
  const inGroup = sits.filter(s => s.group === group);
  const sitIdx = sits.findIndex(s => s.id === situation);

  const picked = useMemo(() => {
    if (mode === "all") return new Set(seasons.map((_, i) => i));
    if (mode === "one") return new Set([to]);
    const [a, b] = from <= to ? [from, to] : [to, from];
    return new Set(seasons.map((_, i) => i).filter(i => i >= a && i <= b));
  }, [mode, from, to, seasons]);

  const result = useMemo(() => (data.data && sitIdx >= 0 ? rankSituation(data.data, role, sitIdx, picked, minBalls) : null), [data.data, role, sitIdx, picked, minBalls]);
  const bat = role === 0;
  const base = result?.baseline;

  return (
    <section aria-labelledby="pressure-lab-title" className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-2xl border border-slate-200 dark:border-[#142330] bg-white dark:bg-[#071018] p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-sky-600 dark:text-sky-300">Situation lab</p>
            <h2 id="pressure-lab-title" className="font-display font-black text-xl sm:text-2xl uppercase tracking-tight text-slate-900 dark:text-white">Who performs best under pressure</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">Ranked on real match situations rebuilt ball by ball from the scorecards: score, wickets, overs left and the chase target.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">League{" "}
              <select className={sel} value={comp} onChange={e => setComp(e.target.value)}>
                {(index.data?.competitions ?? [{ code: "ipl", name: "IPL" }]).map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
            <div role="group" aria-label="Discipline" className="flex gap-1">
              <button type="button" aria-pressed={bat} className={chip(bat)} onClick={() => setRole(0)}>Batting</button>
              <button type="button" aria-pressed={!bat} className={chip(!bat)} onClick={() => setRole(1)}>Bowling</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] mb-5">
          <fieldset className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Season</legend>
            <div role="group" aria-label="Season mode" className="flex gap-1 mb-2">
              {(["all", "range", "one"] as const).map(m => <button key={m} type="button" aria-pressed={mode === m} className={chip(mode === m)} onClick={() => setMode(m)}>{m === "all" ? "All" : m === "range" ? "Range" : "Particular"}</button>)}
            </div>
            {mode === "range" && <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <label>From <select className={sel} value={from} onChange={e => setFrom(+e.target.value)}>{seasons.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label>
              <label>to <select className={sel} value={to} onChange={e => setTo(+e.target.value)}>{seasons.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label>
            </div>}
            {mode === "one" && <label className="text-xs text-slate-500 dark:text-slate-400">Season <select className={sel} value={to} onChange={e => setTo(+e.target.value)}>{seasons.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label>}
            {mode === "all" && <p className="text-xs text-slate-500 dark:text-slate-400">{seasons.length ? `${seasons[0]} – ${seasons.at(-1)}` : "…"}</p>}
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">Min. {bat ? "balls faced" : "balls bowled"}
              <input type="number" min={1} step={10} value={minBalls} onChange={e => setMinBalls(Math.max(1, Number(e.target.value) || 1))} className={`${sel} w-20`} />
            </label>
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
            <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Situation</legend>
            <div role="group" aria-label="Situation type" className="flex flex-wrap gap-1 mb-2">
              {groups.map(g => <button key={g} type="button" aria-pressed={group === g} className={chip(group === g)}
                onClick={() => { setGroup(g); setSituation(sits.find(s => s.group === g)!.id); }}>{g}</button>)}
            </div>
            {inGroup.length > 1 && <div role="group" aria-label={group} className="flex flex-wrap gap-1 pt-2 border-t border-slate-200 dark:border-white/10">
              {inGroup.map(s => <button key={s.id} type="button" aria-pressed={situation === s.id} className={chip(situation === s.id)} onClick={() => setSituation(s.id)}>{s.label}</button>)}
            </div>}
            {inGroup.length === 1 && <p className="text-xs text-slate-500 dark:text-slate-400">{inGroup[0].label}</p>}
            {!bat && (group === "Kind of batter" || group === "Batting position") && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Bowling view: balls bowled to that kind of batter.</p>}
            {bat && group === "Kind of batter" && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Batting view: left- or right-handed batters themselves.</p>}
            {!bat && group === "Kind of bowler" && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Bowling view: pace or spin bowlers themselves.</p>}
          </fieldset>
        </div>

        {(index.isError || data.isError) && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">Situation data could not be loaded. <button type="button" className="underline" onClick={() => { void index.refetch(); void data.refetch(); }}>Retry</button></p>}
        {(index.isLoading || data.isLoading) && <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">Loading {meta?.name ?? "league"} situations…</p>}

        {result && base && <>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2" aria-live="polite">
            {result.rows.length} players · situation average: {bat
              ? `SR ${ratio(base.runs, base.balls, 100)}, ${ratio(base.runs, base.outs)} runs per dismissal`
              : `economy ${ratio(base.runs, base.balls, 6)}, a wicket every ${ratio(base.balls, base.outs)} balls`} over {base.balls.toLocaleString()} balls
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <tr className="text-right [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                  <th className="text-left">#</th><th className="text-left">Player</th><th>Balls</th><th>Runs</th>
                  {bat ? <><th>Outs</th><th>SR</th><th>Avg</th></> : <><th>Wkts</th><th>Econ</th><th>Avg</th></>}
                  <th>Dot %</th><th>Bdry %</th><th title={`Runs above the situation average per 100 balls (a wicket = half the situation's runs per wicket), shrunk toward 0 with ${SHRINK_BALLS} balls`}>Impact /100</th>
                </tr>
              </thead>
              <tbody className="text-slate-800 dark:text-slate-200">
                {result.rows.slice(0, limit).map((r, i) => (
                  <tr key={r.cricsheetId || r.name} className="text-right border-t border-slate-100 dark:border-white/5 [&>td]:px-3 [&>td]:py-1.5 tabular-nums">
                    <td className="text-left text-slate-400">{i + 1}</td>
                    <td className="text-left font-semibold">
                      {r.cricsheetId ? <Link href={`/scout/player/${r.cricsheetId}`} className="hover:underline">{r.name}</Link> : r.name}
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">{bat ? (r.batHand ? `${r.batHand[0].toUpperCase()}HB` : "") : r.bowlType}</span>
                    </td>
                    <td>{r.balls}</td><td>{r.runs}</td><td>{r.outs}</td>
                    {bat ? <><td>{ratio(r.runs, r.balls, 100)}</td><td>{ratio(r.runs, r.outs)}</td></> : <><td>{ratio(r.runs, r.balls, 6)}</td><td>{ratio(r.runs, r.outs)}</td></>}
                    <td>{pct(r.dots, r.balls)}</td><td>{pct(r.boundaries, r.balls)}</td>
                    <td className={`font-bold ${r.impact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{r.impact >= 0 ? "+" : ""}{r.impact.toFixed(1)}</td>
                  </tr>
                ))}
                {!result.rows.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No player reaches {minBalls} balls in this situation. Lower the minimum or widen the seasons.</td></tr>}
              </tbody>
            </table>
          </div>
          {result.rows.length > limit && <button type="button" className={`${chip(false)} mt-3`} onClick={() => setLimit(l => l + 25)}>Show 25 more</button>}
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Impact = runs above that season's average in the same situation, per 100 balls, with a dismissal worth half the situation's runs per wicket, shrunk toward 0 for small samples.
            Bowler type and batting hand come from player bios, so they cover IPL players best; balls without a known type are left out of those filters. Source: {index.data?.source}.
          </p>
        </>}
      </div>
    </section>
  );
}
