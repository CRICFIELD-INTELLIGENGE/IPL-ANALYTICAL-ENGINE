// Shared widgets for the Phase 3 / 4 modules: a match finder and small SVG
// charts. Charts are plain SVG with a viewBox so they scale to any width.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { MatchSummary } from "@/lib/sim-api";
import { ErrorBanner, Loading, Pill } from "@/components/decision/module-shell";

/** Search box + list of real matches. `fetcher` returns finals and close games first. */
export function MatchFinder<T extends MatchSummary>({ queryKey, fetcher, selected, onPick, extra }: {
  queryKey: string;
  fetcher: (q?: string) => Promise<{ matches: T[] }>;
  selected: string | null;
  onPick: (m: T) => void;
  extra?: (m: T) => string | null;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 200); return () => clearTimeout(t); }, [q]);
  const list = useQuery({ queryKey: [queryKey, debounced], queryFn: () => fetcher(debounced || undefined), placeholderData: (p) => p, retry: 1 });
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-violet-400/60 px-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: team, season, venue, 'final'…" aria-label="Search matches"
          className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-muted-foreground min-w-0" />
      </div>
      {list.isError && <ErrorBanner error={list.error} />}
      {list.isLoading && <Loading label="Loading matches…" />}
      <ul className="max-h-72 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/[0.05]" role="listbox" aria-label="Matches">
        {(list.data?.matches ?? []).map((m) => (
          <li key={m.matchId} role="option" aria-selected={m.matchId === selected}>
            <button onClick={() => onPick(m)} className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm ${m.matchId === selected ? "bg-violet-500/15" : "hover:bg-white/5"}`}>
              <span className="font-semibold shrink-0">{m.title}</span>
              {m.stage && <Pill tone="info">{m.stage.toUpperCase()}</Pill>}
              <span className="text-xs text-muted-foreground truncate">{m.season} · {m.venue} · {m.result}</span>
              {extra?.(m) && <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{extra(m)}</span>}
            </button>
          </li>
        ))}
        {list.data && !list.data.matches.length && <li className="px-3 py-2 text-xs text-muted-foreground">No matches for "{debounced}".</li>}
      </ul>
    </div>
  );
}

export interface Series { name: string; color: string; dashed?: boolean; points: { x: number; y: number }[] }

/** Several lines on shared axes, with a legend. */
export function LineChart({ series, xLabel, yLabel, height = 200, label, refY }: { series: Series[]; xLabel: string; yLabel: string; height?: number; label: string; refY?: { y: number; label: string } }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;
  const W = 600, H = height, pad = { l: 36, r: 10, t: 10, b: 24 };
  const minX = Math.min(...all.map((p) => p.x)), maxX = Math.max(...all.map((p) => p.x));
  const ys = all.map((p) => p.y).concat(refY ? [refY.y] : []);
  const minY = Math.floor(Math.min(...ys) / 10) * 10, maxY = Math.ceil(Math.max(...ys) / 10) * 10 || 10;
  const x = (v: number) => pad.l + ((v - minX) / Math.max(1, maxX - minX)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - minY) / Math.max(1, maxY - minY)) * (H - pad.t - pad.b);
  const ticks = 4;
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={label}>
        {Array.from({ length: ticks + 1 }, (_, i) => minY + ((maxY - minY) * i) / ticks).map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" />
            <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)">{Math.round(v)}</text>
          </g>
        ))}
        {[...new Set(all.map((p) => p.x))].filter((v, i, a) => a.length <= 12 || i % Math.ceil(a.length / 10) === 0).map((v) => (
          <text key={v} x={x(v)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">{v}</text>
        ))}
        <text x={W - pad.r} y={H - 0} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">{xLabel}</text>
        <text x={4} y={pad.t + 2} fontSize="9" fill="rgba(255,255,255,0.35)">{yLabel}</text>
        {refY && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(refY.y)} y2={y(refY.y)} stroke="#fbbf24" strokeDasharray="4 3" />
            <text x={W - pad.r} y={y(refY.y) - 3} textAnchor="end" fontSize="9" fill="#fbbf24">{refY.label}</text>
          </g>
        )}
        {series.map((s) => (
          <g key={s.name}>
            <path d={s.points.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join("")} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" />
            {s.points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r="2" fill={s.color}><title>{`${s.name} · ${xLabel} ${p.x}: ${p.y}`}</title></circle>)}
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden><line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} /></svg>{s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Two overlaid distributions on shared bins. */
export function PairedHistogram({ bins, aLabel, bLabel, marker }: { bins: { from: number; to: number; a: number; b: number }[]; aLabel: string; bLabel: string; marker?: { x: number; label: string } }) {
  if (!bins.length) return null;
  const max = Math.max(1, ...bins.flatMap((b) => [b.a, b.b]));
  const W = 600, H = 150, pb = 18;
  const lo = bins[0].from, hi = bins[bins.length - 1].to;
  const x = (v: number) => ((v - lo) / Math.max(1, hi - lo)) * W;
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${aLabel} versus ${bLabel}`}>
        {bins.map((b) => {
          const w = Math.max(1, (x(b.to) - x(b.from)) / 2 - 1);
          return (
            <g key={b.from}>
              <rect x={x(b.from) + 1} width={w} y={(H - pb) * (1 - b.a / max)} height={(H - pb) * (b.a / max)} fill="rgba(148,163,184,0.7)"><title>{`${aLabel} ${b.from}–${b.to - 1}: ${b.a}`}</title></rect>
              <rect x={x(b.from) + 1 + w} width={w} y={(H - pb) * (1 - b.b / max)} height={(H - pb) * (b.b / max)} fill="rgba(167,139,250,0.85)"><title>{`${bLabel} ${b.from}–${b.to - 1}: ${b.b}`}</title></rect>
            </g>
          );
        })}
        {marker && marker.x >= lo && marker.x <= hi && (
          <g>
            <line x1={x(marker.x)} x2={x(marker.x)} y1={0} y2={H - pb} stroke="#fbbf24" strokeDasharray="4 3" />
            <text x={Math.min(W - 4, x(marker.x) + 4)} y={10} fontSize="9" fill="#fbbf24" textAnchor={x(marker.x) > W - 80 ? "end" : "start"}>{marker.label}</text>
          </g>
        )}
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => <text key={v} x={Math.min(W - 12, Math.max(12, x(v)))} y={H - 4} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.5)">{v}</text>)}
      </svg>
      <figcaption className="flex gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: "rgba(148,163,184,0.7)" }} />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm" style={{ background: "rgba(167,139,250,0.85)" }} />{bLabel}</span>
      </figcaption>
    </figure>
  );
}
