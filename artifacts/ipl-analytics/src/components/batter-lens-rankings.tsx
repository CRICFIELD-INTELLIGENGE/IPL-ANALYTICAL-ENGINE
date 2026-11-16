// Stats → Batter Lens: every IPL batter ranked on runs above average, filtered by seasons,
// pace / spin and phase. Same RAA as the player-page Batter Lens (one build, one definition).
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useLensRankings } from "@/lib/batter-lens-data";
import { playerSlug, usePlayerDisplayNames, displayPlayerName } from "@/lib/aggregates";

const PHASES = ["Powerplay", "Middle", "Death"];

export function BatterLensRankings() {
  const q = useLensRankings();
  const displayNames = usePlayerDisplayNames();
  const seasons = useMemo(() => (q.data ? [...new Set(q.data.rows.map(r => r[1]))].sort((a, b) => a - b) : []), [q.data]);
  const [from, setFrom] = useState(2022), [to, setTo] = useState(2026);
  const [type, setType] = useState<0 | 1 | 2>(0); // 0 all, 1 pace, 2 spin
  const [phase, setPhase] = useState(-1);
  const [minBalls, setMinBalls] = useState(500);
  const [sort, setSort] = useState<"raa" | "balls" | "sr">("raa");

  const rows = useMemo(() => {
    if (!q.data) return [];
    const acc = new Map<number, number[]>();
    for (const [ni, s, p, ph, balls, runs, outs, x, dots, bnd] of q.data.rows) {
      if (s < from || s > to || (type && p !== type) || (phase >= 0 && ph !== phase)) continue;
      const a = acc.get(ni) ?? acc.set(ni, [0, 0, 0, 0, 0, 0]).get(ni)!;
      a[0] += balls; a[1] += runs; a[2] += outs; a[3] += x; a[4] += dots; a[5] += bnd;
    }
    const list = [...acc].filter(([, a]) => a[0] >= minBalls).map(([ni, a]) => ({ name: q.data!.names[ni], balls: a[0], runs: a[1], outs: a[2], raa: a[3] / a[0], dots: a[4], bnd: a[5] }));
    return list.sort((x, y) => (sort === "balls" ? y.balls - x.balls : sort === "sr" ? y.runs / y.balls - x.runs / x.balls : y.raa - x.raa));
  }, [q.data, from, to, type, phase, minBalls, sort]);

  const chip = (on: boolean) => `px-2.5 py-1 rounded-lg text-[10px] font-black border ${on ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-400/50" : "stats-tool-chip"}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="stats-tool-panel p-4">
        <p className="text-[11px] text-white/60 mt-1 max-w-3xl">
          Every IPL ball faced, scored against the average for that innings, over and wickets-down state (season-adjusted). A dismissal costs
          the runs it removes from the innings. RAA / 100 = runs above average per 100 balls. Open a player for the pitch grid, wagon wheel and
          impact trajectory.
        </p>
      </div>
      <div className="stats-tool-panel grid gap-3 p-4 text-xs sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-[10px] font-black uppercase text-white/40">Seasons</span>
          <select aria-label="From season" className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white" value={from} onChange={e => setFrom(Number(e.target.value))}>{seasons.filter(s => s <= to).map(s => <option key={s}>{s}</option>)}</select>
          <span>to</span>
          <select aria-label="To season" className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white" value={to} onChange={e => setTo(Number(e.target.value))}>{seasons.filter(s => s >= from).map(s => <option key={s}>{s}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-20 text-[10px] font-black uppercase text-white/40">Bowling</span>
          {(["All", "Pace", "Spin"] as const).map((l, k) => <button key={l} type="button" aria-pressed={type === k} className={chip(type === k)} onClick={() => setType(k as 0 | 1 | 2)}>{l}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-20 text-[10px] font-black uppercase text-white/40">Phase</span>
          {["All", ...PHASES].map((l, k) => <button key={l} type="button" aria-pressed={phase === k - 1} className={chip(phase === k - 1)} onClick={() => setPhase(k - 1)}>{l}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-20 text-[10px] font-black uppercase text-white/40">Min balls</span>
          {[100, 250, 500, 1000].map(n => <button key={n} type="button" aria-pressed={minBalls === n} className={chip(minBalls === n)} onClick={() => setMinBalls(n)}>{n}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-20 text-[10px] font-black uppercase text-white/40">Rank by</span>
          {([["raa", "RAA / 100"], ["sr", "Strike rate"], ["balls", "Balls faced"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={sort === k} className={chip(sort === k)} onClick={() => setSort(k)}>{l}</button>)}
        </div>
      </div>
      {q.isError ? <p role="alert" className="text-sm text-rose-300/80">Rankings could not be loaded. <button type="button" className="font-bold text-primary underline" onClick={() => void q.refetch()}>Retry</button></p>
        : !q.data ? <p className="text-sm text-white/40 font-mono">Crunching deliveries…</p>
        : !rows.length ? <p role="status" className="text-sm text-white/60">No batter meets these filters. Lower the minimum balls.</p> : (
          <div className="stats-tool-panel overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <caption className="sr-only">Batters ranked on runs above average</caption>
              <thead className="bg-white/5 border-b border-white/10">
                <tr>{["#", "Batter", "Balls", "Runs", "SR", "Outs", "Avg", "Dot %", "Bnd %", "RAA / 100"].map(h => <th key={h} className="px-3 py-2.5 text-[9px] font-black text-white/40 uppercase tracking-wider text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={r.name} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-[10px] text-amber-400/60 font-black">{i + 1}</td>
                    <td className="px-3 py-2"><Link href={`/players/${playerSlug(r.name)}`} className="font-bold hover:underline">{displayPlayerName(r.name, displayNames)}</Link></td>
                    <td className="px-3 py-2 text-white/60">{r.balls}</td><td className="px-3 py-2 text-white/60">{r.runs}</td>
                    <td className="px-3 py-2 text-amber-300 font-bold">{((r.runs / r.balls) * 100).toFixed(1)}</td>
                    <td className="px-3 py-2 text-white/60">{r.outs}</td><td className="px-3 py-2 text-white/60">{r.outs ? (r.runs / r.outs).toFixed(1) : "—"}</td>
                    <td className="px-3 py-2 text-white/60">{Math.round((r.dots / r.balls) * 100)}%</td><td className="px-3 py-2 text-white/60">{Math.round((r.bnd / r.balls) * 100)}%</td>
                    <td className={`px-3 py-2 font-black ${r.raa >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.raa >= 0 ? "+" : ""}{r.raa.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <p className="text-[10px] text-white/30">{rows.length} batters qualify · showing top 50 · IPL ball-by-ball (Cricsheet).</p>
    </div>
  );
}
