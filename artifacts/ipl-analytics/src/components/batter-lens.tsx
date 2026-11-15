// Player page → Batter Lens: every IPL ball the batter faced, filterable, with a pitch grid,
// wagon wheel, outcome splits, impact (RAA) trajectory, first-5-balls and entry points.
// Labels (length, line, shot, zone) are commentary-derived, not ball tracking: there is no
// ball height (no beehive) and too little speed data for speed bands, so neither is shown.
import { useMemo, useState } from "react";
import { useLensPlayer, type LensBalls, type LensMeta } from "@/lib/batter-lens-data";

type Filters = { from: number; to: number; type: "all" | "pace" | "spin"; phase: "all" | "pp" | "mid" | "death"; length: number; line: number; shot: number };
type Lens = "length" | "line" | "shot" | "phase" | "type";
const PHASES = ["Powerplay", "Middle", "Death"];
const phaseOf = (over: number) => (over < 6 ? 0 : over < 15 ? 1 : 2);

function Chip<T extends string | number>({ v, cur, set, children }: { v: T; cur: T; set: (v: T) => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={v === cur} onClick={() => set(v)}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${v === cur ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/50" : "bg-white/5 text-white/50 border-white/10 hover:text-white"}`}>
      {children}
    </button>
  );
}
const Card = ({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 min-w-0 ${className}`}>
    <h3 className="text-[11px] font-black uppercase tracking-widest text-white/80">{title}</h3>
    {note && <p className="text-[10px] text-white/40 mt-0.5 mb-3">{note}</p>}
    {children}
  </section>
);
const sr = (runs: number, balls: number) => (balls ? ((runs / balls) * 100).toFixed(1) : "—");
const per100 = (x: number, balls: number) => (balls ? `${x / balls >= 0 ? "+" : ""}${(x / balls).toFixed(1)}` : "—");

/** Indices of balls passing the filters. */
function select(b: LensBalls, f: Filters, ignore: Partial<Record<keyof Filters, true>> = {}) {
  const out: number[] = [];
  for (let i = 0; i < b.s.length; i++) {
    if (b.s[i] < f.from || b.s[i] > f.to) continue;
    if (!ignore.type && f.type !== "all" && b.p[i] !== (f.type === "pace" ? 0 : 1)) continue;
    if (!ignore.phase && f.phase !== "all" && phaseOf(b.o[i]) !== ["pp", "mid", "death"].indexOf(f.phase)) continue;
    if (!ignore.length && f.length >= 0 && b.l[i] !== f.length) continue;
    if (!ignore.line && f.line >= 0 && b.n[i] !== f.line) continue;
    if (!ignore.shot && f.shot >= 0 && b.h[i] !== f.shot) continue;
    out.push(i);
  }
  return out;
}
type Agg = { balls: number; runs: number; outs: number; x: number; dots: number; bnd: number; ones: number };
function agg(b: LensBalls, idx: number[]): Agg {
  const a = { balls: 0, runs: 0, outs: 0, x: 0, dots: 0, bnd: 0, ones: 0 };
  for (const i of idx) { a.balls++; a.runs += b.r[i]; a.outs += b.w[i]; a.x += b.x[i]; if (b.r[i] === 0) a.dots++; if (b.r[i] === 4 || b.r[i] === 6) a.bnd++; if (b.r[i] >= 1 && b.r[i] <= 3) a.ones++; }
  return a;
}

function PitchGrid({ b, idx, meta, f, setF }: { b: LensBalls; idx: number[]; meta: LensMeta; f: Filters; setF: (f: Filters) => void }) {
  const cells = new Map<string, Agg>();
  let labelled = 0;
  for (const i of idx) {
    if (b.l[i] < 0 || b.n[i] < 0) continue;
    labelled++;
    const k = `${b.l[i]}:${b.n[i]}`;
    const a = cells.get(k) ?? cells.set(k, { balls: 0, runs: 0, outs: 0, x: 0, dots: 0, bnd: 0, ones: 0 }).get(k)!;
    a.balls++; a.runs += b.r[i]; a.outs += b.w[i]; a.x += b.x[i];
  }
  const max = Math.max(1, ...[...cells.values()].map(a => a.balls));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="text-[9px] w-full min-w-[520px] border-separate border-spacing-0.5">
          <thead><tr><th />{meta.lines.map(l => <th key={l} className="text-white/40 font-bold px-1 pb-1">{l}</th>)}</tr></thead>
          <tbody>
            {meta.lengths.map((len, li) => (
              <tr key={len}>
                <th className="text-right text-white/40 font-bold pr-2 whitespace-nowrap">{len}</th>
                {meta.lines.map((_, ni) => {
                  const a = cells.get(`${li}:${ni}`);
                  const rate = a && a.balls >= 5 ? a.x / a.balls : null;
                  const bg = rate === null ? "rgba(255,255,255,0.03)" : rate >= 0 ? `rgba(16,185,129,${0.15 + Math.min(0.65, rate / 60)})` : `rgba(244,63,94,${0.15 + Math.min(0.65, -rate / 60)})`;
                  const on = f.length === li && f.line === ni;
                  return (
                    <td key={ni} style={{ background: bg, opacity: a ? 0.45 + 0.55 * (a.balls / max) : 1 }}
                      className={`rounded text-center align-middle h-10 cursor-pointer ${on ? "ring-2 ring-white" : ""}`}
                      title={a ? `${len}, ${meta.lines[ni]}: ${a.balls} balls, ${a.runs} runs, SR ${sr(a.runs, a.balls)}, ${a.outs} out, RAA ${per100(a.x, a.balls)}/100` : "No balls"}
                      onClick={() => setF(on ? { ...f, length: -1, line: -1 } : { ...f, length: li, line: ni })}>
                      {a ? <><div className="font-black text-white">{sr(a.runs, a.balls)}</div><div className="text-white/50">{a.balls}b{a.outs ? ` · ${a.outs}W` : ""}</div></> : <span className="text-white/15">·</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-white/40 mt-2">Cell = strike rate, balls, dismissals. Green/red = runs above/below average (5+ balls). Click a cell to filter every panel; click again to clear. {labelled} of {idx.length} balls have both labels.</p>
    </div>
  );
}

function Wagon({ b, idx, meta }: { b: LensBalls; idx: number[]; meta: LensMeta }) {
  const s = meta.sectors.map(() => ({ runs: 0, balls: 0 }));
  let known = 0, totalRuns = 0;
  for (const i of idx) { if (b.z[i] < 0 || b.r[i] === 0) continue; s[b.z[i]].runs += b.r[i]; s[b.z[i]].balls++; known++; totalRuns += b.r[i]; }
  const maxShare = Math.max(0.01, ...s.map(x => x.runs / Math.max(1, totalRuns)));
  const R = 92, cx = 110, cy = 110;
  // Sector k spans [k*45, (k+1)*45] degrees clockwise from straight (top); off side on the right.
  const pt = (deg: number, r: number) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox="0 0 220 220" className="w-[220px] h-[220px] shrink-0" role="img" aria-label="Runs by scoring direction">
        <circle cx={cx} cy={cy} r={R} fill="rgba(16,185,129,0.06)" stroke="rgba(255,255,255,0.15)" />
        <rect x={cx - 3} y={cy - 16} width={6} height={32} fill="rgba(253,230,138,0.5)" rx={1} />
        {s.map((x, k) => {
          const share = totalRuns ? x.runs / totalRuns : 0;
          const r = 10 + (R - 10) * (share / maxShare);
          const [x1, y1] = pt(k * 45 + 2, r), [x2, y2] = pt(k * 45 + 43, r);
          const [lx, ly] = pt(k * 45 + 22.5, R + 0.5 - 14);
          return (
            <g key={k}>
              <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`} fill={`rgba(52,211,153,${0.25 + 0.6 * (share / maxShare)})`}>
                <title>{`${meta.sectors[k]}: ${x.runs} runs (${Math.round(share * 100)}%), ${x.balls} scoring balls`}</title>
              </path>
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="800" fill="white">{Math.round(share * 100)}%</text>
            </g>
          );
        })}
        <text x={200} y={14} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.45)">OFF</text>
        <text x={20} y={14} fontSize="8" fill="rgba(255,255,255,0.45)">LEG</text>
      </svg>
      <div className="text-[10px] text-white/60 w-full">
        {meta.sectors.map((name, k) => (
          <div key={name} className="flex justify-between border-b border-white/5 py-0.5"><span>{name}</span><span className="text-white/80 font-bold">{s[k].runs} runs · {s[k].balls}</span></div>
        ))}
        <p className="text-white/40 mt-2">Runs from scoring shots by 45° sector (commentary direction, no distances). {known} of {idx.filter(i => b.r[i] > 0).length} scoring balls have a direction.</p>
      </div>
    </div>
  );
}

function Breakdown({ b, idx, meta, lens }: { b: LensBalls; idx: number[]; meta: LensMeta; lens: Lens }) {
  const groups: { label: string; test: (i: number) => boolean }[] =
    lens === "length" ? meta.lengths.map((l, k) => ({ label: l, test: i => b.l[i] === k }))
    : lens === "line" ? meta.lines.map((l, k) => ({ label: l, test: i => b.n[i] === k }))
    : lens === "shot" ? meta.shots.map((l, k) => ({ label: l, test: i => b.h[i] === k }))
    : lens === "phase" ? PHASES.map((l, k) => ({ label: l, test: i => phaseOf(b.o[i]) === k }))
    : [{ label: "Pace", test: i => b.p[i] === 0 }, { label: "Spin", test: i => b.p[i] === 1 }];
  const rows = groups.map(g => ({ label: g.label, a: agg(b, idx.filter(g.test)) })).filter(r => r.a.balls > 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] min-w-[460px]">
        <thead><tr className="text-[9px] uppercase tracking-wider text-white/40 text-left">
          {["", "Balls", "Runs", "SR", "Outs", "Balls/out", "Dot %", "Bnd %", "RAA/100"].map(h => <th key={h} className="py-1.5 pr-2 font-black">{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(({ label, a }) => (
            <tr key={label}>
              <td className="py-1.5 pr-2 text-white font-bold whitespace-nowrap">{label}</td>
              <td className="text-white/60">{a.balls}</td><td className="text-white/60">{a.runs}</td>
              <td className="text-amber-300 font-bold">{sr(a.runs, a.balls)}</td><td className="text-white/60">{a.outs}</td>
              <td className="text-white/60">{a.outs ? (a.balls / a.outs).toFixed(1) : "—"}</td>
              <td className="text-white/60">{Math.round((a.dots / a.balls) * 100)}%</td><td className="text-white/60">{Math.round((a.bnd / a.balls) * 100)}%</td>
              <td className={`font-bold ${a.x >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{per100(a.x, a.balls)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-[11px] text-white/40 py-3">No labelled balls for this view.</p>}
    </div>
  );
}

function OutcomesByLength({ b, idx, meta }: { b: LensBalls; idx: number[]; meta: LensMeta }) {
  const parts = [
    { k: "Dot", c: "rgba(255,255,255,0.18)", t: (r: number, w: number) => r === 0 && !w },
    { k: "1–3", c: "rgba(56,189,248,0.6)", t: (r: number) => r >= 1 && r <= 3 },
    { k: "4", c: "rgba(52,211,153,0.75)", t: (r: number) => r === 4 },
    { k: "6", c: "rgba(250,204,21,0.8)", t: (r: number) => r === 6 },
    { k: "W", c: "rgba(244,63,94,0.85)", t: (_r: number, w: number) => !!w },
  ];
  return (
    <div className="space-y-1.5">
      {meta.lengths.map((len, li) => {
        const sub = idx.filter(i => b.l[i] === li);
        if (!sub.length) return null;
        const counts = parts.map(p => sub.filter(i => p.t(b.r[i], b.w[i])).length);
        return (
          <div key={len} className="grid grid-cols-[110px_1fr_44px] items-center gap-2 text-[10px]">
            <span className="text-white/70 truncate">{len}</span>
            <div className="flex h-3 rounded overflow-hidden bg-white/5">
              {counts.map((n, k) => n ? <div key={k} style={{ width: `${(n / sub.length) * 100}%`, background: parts[k].c }} title={`${parts[k].k}: ${n} (${Math.round((n / sub.length) * 100)}%)`} /> : null)}
            </div>
            <span className="text-right text-white/40">{sub.length}b</span>
          </div>
        );
      })}
      <div className="flex gap-3 text-[9px] text-white/50 pt-1">{parts.map(p => <span key={p.k} className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm inline-block" style={{ background: p.c }} />{p.k}</span>)}</div>
    </div>
  );
}

function Trajectory({ b, idx }: { b: LensBalls; idx: number[] }) {
  const N = 30;
  const series = [0, 1].map(type => {
    let sx = 0, sn = 0;
    const byBall = Array.from({ length: N }, () => ({ x: 0, n: 0 }));
    for (const i of idx) { if (b.p[i] !== type || b.f[i] > N) continue; byBall[b.f[i] - 1].x += b.x[i]; byBall[b.f[i] - 1].n++; }
    return byBall.map(v => { sx += v.x; sn += v.n; return sn >= 20 ? sx / sn / 100 : null; });
  });
  const vals = series.flat().filter((v): v is number => v !== null);
  if (!vals.length) return <p className="text-[11px] text-white/40">Not enough balls for this selection.</p>;
  const lo = Math.min(-0.3, ...vals), hi = Math.max(0.3, ...vals);
  const W = 420, H = 160, X = (k: number) => 30 + (k / (N - 1)) * (W - 40), Y = (v: number) => 10 + ((hi - v) / (hi - lo)) * (H - 30);
  const line = (s: (number | null)[]) => s.map((v, k) => (v === null ? "" : `${X(k)},${Y(v)}`)).filter(Boolean).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cumulative runs above average by ball faced, pace and spin">
        <line x1={30} x2={W - 10} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
        {[1, 5, 10, 15, 20, 25, 30].map(k => <text key={k} x={X(k - 1)} y={H - 4} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">{k}</text>)}
        {[hi, 0, lo].map(v => <text key={v} x={26} y={Y(v) + 3} fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">{v.toFixed(2)}</text>)}
        <polyline points={line(series[0])} fill="none" stroke="#38bdf8" strokeWidth={2} />
        <polyline points={line(series[1])} fill="none" stroke="#f59e0b" strokeWidth={2} />
      </svg>
      <div className="flex gap-4 text-[10px] text-white/60"><span><i className="inline-block w-3 h-0.5 bg-sky-400 align-middle mr-1" />vs pace</span><span><i className="inline-block w-3 h-0.5 bg-amber-500 align-middle mr-1" />vs spin</span><span className="text-white/40">x = nth ball of the innings · y = cumulative mean RAA per ball (shown once 20+ balls)</span></div>
    </div>
  );
}

function EntryPoints({ e, from, to }: { e: { s: number[]; e: number[] }; from: number; to: number }) {
  const balls = e.e.filter((_, i) => e.s[i] >= from && e.s[i] <= to);
  if (!balls.length) return <p className="text-[11px] text-white/40">No innings in this range.</p>;
  const bins = new Array(20).fill(0);
  for (const v of balls) bins[Math.min(19, Math.floor(v / 6))]++;
  const sorted = [...balls].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  const max = Math.max(...bins);
  return (
    <div>
      <div className="flex items-end gap-0.5 h-24">
        {bins.map((n, k) => <div key={k} className="flex-1 rounded-t" style={{ height: `${(n / max) * 100}%`, background: "rgba(167,139,250,0.75)" }} title={`Came in during over ${k + 1}: ${n} innings`} />)}
      </div>
      <div className="flex justify-between text-[9px] text-white/40 mt-1"><span>Over 1</span><span>10</span><span>20</span></div>
      <p className="text-[11px] text-white/70 mt-2">{balls.length} innings · median entry: ball {median} of the innings (over {Math.floor(median / 6) + 1}). Uses the season range only.</p>
    </div>
  );
}

export function BatterLens({ names }: { names: (string | null | undefined)[] }) {
  const { index, player, missing } = useLensPlayer(names);
  const b = player.data?.balls;
  const seasons = useMemo(() => (b ? [...new Set(b.s)].sort((x, y) => x - y) : []), [b]);
  const [f, setF] = useState<Filters | null>(null);
  const [lens, setLens] = useState<Lens>("length");
  const filters: Filters | null = f ?? (seasons.length ? { from: seasons[0], to: seasons.at(-1)!, type: "all", phase: "all", length: -1, line: -1, shot: -1 } : null);
  const idx = useMemo(() => (b && filters ? select(b, filters) : []), [b, filters]);
  const meta = index.data;

  if (index.isError || player.isError) return <p role="alert" className="text-sm text-rose-300/80">Batter Lens data could not be loaded.</p>;
  if (missing) return <p className="text-sm text-white/50">No IPL balls faced on record for this player.</p>;
  if (!b || !meta || !filters) return <p className="text-sm text-white/40 font-mono">Crunching deliveries…</p>;

  const set = (patch: Partial<Filters>) => setF({ ...filters, ...patch });
  const a = agg(b, idx);
  const first5 = [0, 1].map(t => agg(b, idx.filter(i => b.p[i] === t && b.f[i] <= 5)));
  const labelled = idx.filter(i => b.l[i] >= 0).length;
  const active = filters.length >= 0 || filters.line >= 0 || filters.shot >= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-emerald-400/20 bg-[#0b1020] p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black w-16 text-white/40 uppercase">Seasons</span>
          <select aria-label="From season" className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[11px] text-white" value={filters.from} onChange={e => set({ from: Number(e.target.value) })}>
            {seasons.filter(s => s <= filters.to).map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="text-white/40 text-[11px]">to</span>
          <select aria-label="To season" className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[11px] text-white" value={filters.to} onChange={e => set({ to: Number(e.target.value) })}>
            {seasons.filter(s => s >= filters.from).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-black w-16 text-white/40 uppercase">Bowling</span>
          {(["all", "pace", "spin"] as const).map(v => <Chip key={v} v={v} cur={filters.type} set={t => set({ type: t })}>{v === "all" ? "All" : v === "pace" ? "Pace" : "Spin"}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="text-[10px] font-black w-16 text-white/40 uppercase">Phase</span>
          {(["all", "pp", "mid", "death"] as const).map(v => <Chip key={v} v={v} cur={filters.phase} set={p => set({ phase: p })}>{v === "all" ? "All" : PHASES[["pp", "mid", "death"].indexOf(v)]}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black w-16 text-white/40 uppercase">Shot</span>
          <select aria-label="Shot type" className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[11px] text-white" value={filters.shot} onChange={e => set({ shot: Number(e.target.value) })}>
            <option value={-1}>All shots</option>{meta.shots.map((s, k) => <option key={s} value={k}>{s}</option>)}
          </select>
          {active && <button type="button" className="text-[10px] text-emerald-300 underline" onClick={() => set({ length: -1, line: -1, shot: -1 })}>Clear length / line / shot</button>}
        </div>
        {active && <p className="text-[10px] text-amber-300/80">Length, line or shot filters keep only balls the commentary described ({labelled} here).</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          ["Balls", a.balls], ["Runs", a.runs], ["Strike rate", sr(a.runs, a.balls)], ["Out on strike", a.outs],
          ["Runs per out", a.outs ? (a.runs / a.outs).toFixed(1) : "—"], ["Dot %", a.balls ? `${Math.round((a.dots / a.balls) * 100)}%` : "—"],
          ["Boundary %", a.balls ? `${Math.round((a.bnd / a.balls) * 100)}%` : "—"], ["RAA / 100 balls", per100(a.x, a.balls)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
            <div className="text-base font-black text-white">{v}</div><div className="text-[9px] uppercase tracking-wider text-white/40">{k}</div>
          </div>
        ))}
      </div>
      {!a.balls ? <p className="text-sm text-white/50">No balls match these filters. Loosen a filter.</p> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title="Pitch grid" note="Length × line from commentary. Not measured bounce positions." className="xl:col-span-2">
            <PitchGrid b={b} idx={select(b, filters, { length: true, line: true })} meta={meta} f={filters} setF={setF} />
          </Card>
          <Card title="Wagon wheel" note="Share of runs by 45° sector."><Wagon b={b} idx={idx} meta={meta} /></Card>
          <Card title="0 / 1 / 4 / 6 / W by length" note="What happens to each length bowled to him."><OutcomesByLength b={b} idx={idx} meta={meta} /></Card>
          <Card title="Breakdowns" note="Every split uses the filters above." className="xl:col-span-2">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(["length", "line", "shot", "phase", "type"] as const).map(v => <Chip<Lens> key={v} v={v} cur={lens} set={setLens}>{v === "type" ? "Pace / spin" : `By ${v}`}</Chip>)}
            </div>
            <Breakdown b={b} idx={idx} meta={meta} lens={lens} />
          </Card>
          <Card title="Impact trajectory" note="Cumulative mean runs above average as the innings develops."><Trajectory b={b} idx={idx} /></Card>
          <div className="flex flex-col gap-4">
            <Card title="First 5 balls" note="Mean runs above average per ball over each innings' first five balls.">
              <div className="grid grid-cols-2 gap-2">
                {["Pace", "Spin"].map((t, k) => (
                  <div key={t} className="rounded-lg border border-white/10 p-3 text-center">
                    <div className={`text-xl font-black ${first5[k].x >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{first5[k].balls ? (first5[k].x / first5[k].balls / 100).toFixed(2) : "—"}</div>
                    <div className="text-[10px] text-white/50">vs {t.toLowerCase()} · {first5[k].balls} balls · SR {sr(first5[k].runs, first5[k].balls)}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Entry points" note="The innings ball when he walked in."><EntryPoints e={player.data!.entries} from={filters.from} to={filters.to} /></Card>
          </div>
        </div>
      )}
      <p className="text-[10px] text-white/30">
        IPL ball-by-ball (Cricsheet) with commentary-derived length, line, shot and direction labels. RAA = runs above average: runs off the bat
        minus the average for that innings, over and wickets-down state (season-adjusted), with a dismissal costing the runs it removes from the
        innings. No ball-tracking data, so there is no beehive, speed or swing view.
      </p>
    </div>
  );
}
