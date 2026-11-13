// Shared building blocks for the Decision Intelligence OS module pages:
// page header, player search, segmented toggle, demo banner and the chart
// colour tokens (dark surface; diverging blue ↔ red with a gray midpoint).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Search } from "lucide-react";
import { errorText, searchPlayers, type PlayerSearchHit } from "@/lib/discovery-api";

export function ModuleHeader({ phase, title, tagline, icon, children }: { phase: string; title: string; tagline: string; icon: ReactNode; children?: ReactNode }) {
  return (
    <div className="analyst-module-header space-y-3">
      <Link href="/ai-analyst" className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> AI Analyst
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="analyst-module-icon w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
          <div className="min-w-0">
            <div className="analyst-phase text-[10px] font-bold uppercase tracking-widest">{phase}</div>
            <h1 className="font-display font-black text-2xl sm:text-3xl leading-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="text-sm text-slate-600 dark:text-muted-foreground mt-0.5">{tagline}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: NoInfer<T>; label: string; disabled?: boolean }[]; onChange: (v: NoInfer<T>) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="analyst-segmented inline-flex rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-1 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 ${value === o.value ? "bg-white dark:bg-violet-500/25 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="self-center">{icon}</span>
      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">{title}</h3>
      <span className="text-[11px] text-slate-500 dark:text-muted-foreground">{sub}</span>
    </div>
  );
}

/** Stat tile: proportional figures for the value, small caps label under it. */
export function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="analyst-stat-tile rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 min-w-[96px]">
      <div className="font-display font-bold text-lg leading-none text-slate-900 dark:text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 dark:text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{children}</span>
    </div>
  );
}

/**
 * Player search combobox: type 2+ letters, arrows to move, Enter to pick, Esc to close.
 * `onPick` receives a player id, or a Cricsheet name for quick picks — the API accepts both.
 */
export function PlayerPicker({ onPick, placeholder = "Search any IPL player…", quickPicks = [] }: { onPick: (player: string | number, hit?: PlayerSearchHit) => void; placeholder?: string; quickPicks?: string[] }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const results = useQuery({
    queryKey: ["player-search", debounced],
    queryFn: () => searchPlayers(debounced),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
  });
  const hits: PlayerSearchHit[] = results.data ?? [];

  const pick = (player: string | number) => {
    onPick(player, hits.find((h) => h.playerId === player));
    setQ("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] focus-within:border-indigo-500 dark:focus-within:border-violet-400/60 px-3 shadow-sm dark:shadow-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && hits[active]) { e.preventDefault(); pick(hits[active].playerId); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            aria-label="Search players"
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls="player-picker-list"
            className="flex-1 bg-transparent outline-none text-sm py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-muted-foreground min-w-0"
          />
          {results.isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 dark:text-muted-foreground" />}
        </div>
        {open && debounced.length >= 2 && (
          <ul id="player-picker-list" role="listbox" className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            {results.isError && <li className="px-3 py-2 text-xs text-rose-500 dark:text-red-300">Search unavailable — is the API running?</li>}
            {!results.isError && !results.isFetching && !hits.length && <li className="px-3 py-2 text-xs text-slate-500 dark:text-muted-foreground">No player matches "{debounced}".</li>}
            {hits.map((h, i) => (
              <li
                key={h.playerId}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); pick(h.playerId); }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${i === active ? "bg-slate-100 dark:bg-white/10" : ""}`}
              >
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{h.name}</span>
                {h.fullName && h.fullName !== h.name && <span className="text-[11px] text-slate-500 dark:text-muted-foreground truncate">{h.fullName}</span>}
                <span className="ml-auto text-[10px] text-slate-500 dark:text-muted-foreground shrink-0">{h.primary} · {h.matches} M · last {h.lastSeason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {quickPicks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quickPicks.map((name) => (
            <button key={name} onClick={() => pick(name)} className="px-2.5 py-1 rounded-full text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/25 shadow-sm dark:shadow-none">
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Diverging scale for "better / worse than a baseline", in runs per 100 balls.
 * Blue = better, red = worse, gray = within ±8 (no meaningful difference).
 * One hue per arm, stepping in strength; binned so each class reads clearly.
 */
export const DIVERGING_BINS = [
  { min: 40, color: "rgba(57,135,229,0.95)", label: "+40 or more" },
  { min: 20, color: "rgba(57,135,229,0.62)", label: "+20 to +40" },
  { min: 8, color: "rgba(57,135,229,0.34)", label: "+8 to +20" },
  { min: -8, color: "#383835", label: "within ±8" },
  { min: -20, color: "rgba(230,103,103,0.34)", label: "−8 to −20" },
  { min: -40, color: "rgba(230,103,103,0.62)", label: "−20 to −40" },
  { min: -Infinity, color: "rgba(230,103,103,0.95)", label: "−40 or less" },
] as const;

export function divergingColor(v: number | null): string {
  if (v === null) return "transparent";
  return (DIVERGING_BINS.find((b) => v >= b.min) ?? DIVERGING_BINS[DIVERGING_BINS.length - 1]).color;
}

export function DivergingLegend({ worse, better }: { worse: string; better: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
      <span>{worse}</span>
      <div className="flex rounded overflow-hidden" aria-hidden>
        {[...DIVERGING_BINS].reverse().map((b) => (
          <span key={b.label} title={b.label} className="w-6 h-2.5" style={{ background: b.color }} />
        ))}
      </div>
      <span>{better}</span>
      <span className="ml-1">(runs per 100 balls · gray = within ±8)</span>
    </div>
  );
}

export const signed = (n: number, dp = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(dp)}`;

/** Error state for API-backed modules (no demo fallback: these figures only exist in the warehouse). */
export function ErrorBanner({ error }: { error: unknown }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{errorText(error)}</span>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="w-4 h-4 animate-spin" /> {label}</div>;
}

/** Labelled native select, styled for both light and dark surfaces. */
export function Select<T extends string | number>({ label, value, onChange, options, className = "" }: { label: string; value: T; onChange: (v: NoInfer<T>) => void; options: { value: NoInfer<T>; label: string }[]; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground min-w-0 ${className}`}>
      {label}
      <select
        value={String(value)}
        onChange={(e) => {
          const hit = options.find((o) => String(o.value) === e.target.value);
          if (hit) onChange(hit.value);
        }}
        className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2.5 py-2 text-sm normal-case tracking-normal text-slate-900 dark:text-white outline-none focus:border-violet-500 dark:focus:border-violet-400/60 min-w-0 shadow-sm dark:shadow-none"
      >
        {options.map((o) => <option key={String(o.value)} value={String(o.value)} className="bg-white dark:bg-[#0B1020] text-slate-900 dark:text-white">{o.label}</option>)}
      </select>
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground min-w-0">
      {label}
      <input
        type="number" inputMode="numeric" value={value} min={min} max={max} step={step}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v))); }}
        className="rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0B1020] px-2.5 py-2 text-sm tabular-nums text-slate-900 dark:text-white outline-none focus:border-violet-500 dark:focus:border-violet-400/60 w-full shadow-sm dark:shadow-none"
      />
    </label>
  );
}

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`analyst-card rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 min-w-0 shadow-sm dark:shadow-none ${className}`}>{children}</section>
);

/** Signals and verdicts share one palette across modules. */
export const TONE = {
  good: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  neutral: "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/15",
  bad: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
  info: "bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-500/30",
} as const;

export function Pill({ tone, children, title }: { tone: keyof typeof TONE; children: ReactNode; title?: string }) {
  return <span title={title} className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

/**
 * Chase win-probability line (0–100%), with optional markers. Plain SVG so it
 * scales to any width; `markers` are legal-ball positions to highlight.
 */
export function WinProbChart({ points, markers = [], height = 160, label }: { points: { legal: number; winProb: number }[]; markers?: { legal: number; label: string }[]; height?: number; label: string }) {
  if (points.length < 2) return null;
  const W = 600, H = height, pad = { l: 30, r: 8, t: 8, b: 18 };
  const maxX = Math.max(120, ...points.map((p) => p.legal));
  const x = (v: number) => pad.l + (v / maxX) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.legal).toFixed(1)},${y(p.winProb).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-slate-400 dark:text-white/45" role="img" aria-label={label}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="opacity-20" strokeDasharray={v === 50 ? "0" : "2 4"} />
          <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor">{v}%</text>
        </g>
      ))}
      {[0, 30, 60, 90, 120].filter((o) => o <= maxX).map((b) => (
        <text key={b} x={x(b)} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor">{b === 0 ? "over 0" : b / 6}</text>
      ))}
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
      {markers.map((m) => (
        <g key={`${m.legal}-${m.label}`}>
          <line x1={x(m.legal)} x2={x(m.legal)} y1={pad.t} y2={H - pad.b} stroke="#f59e0b" strokeDasharray="3 3" />
          <text x={x(m.legal) + 3} y={pad.t + 9} fontSize="9" fill="#d97706">{m.label}</text>
        </g>
      ))}
    </svg>
  );
}
