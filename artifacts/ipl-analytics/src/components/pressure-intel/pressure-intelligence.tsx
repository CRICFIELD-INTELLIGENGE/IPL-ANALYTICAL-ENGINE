// Pressure Intelligence (Pressure Lab): define a situation -> choose competitions -> evaluate -> evidence -> compare.
// Engine (lib/pressure-intel/engine.ts) evaluates ball-by-ball static league datasets; UI adapts cleanly
// across desktop & mobile using active franchise colors/logos (useTeamTheme) without altering data truth.
import "./pressure-lab.css";
import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Crosshair,
  FlaskConical,
  GitCompare,
  Layers,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { aggregate, score, usesChaseOnly, type ScoredRow } from "@/lib/pressure-intel/engine";
import { loadDataset, loadIndex, loadMethodology, type CompInfo, type Methodology } from "@/lib/pressure-intel/load";
import {
  CHASE_ONLY,
  PRESETS,
  RANGE_KEYS,
  decodeQuery,
  describeGroup,
  encodeQuery,
  isGroup,
  parseQuery,
  queryKey,
  type Cond,
  type Group,
  type Params,
  type Query,
} from "@/lib/pressure-intel/query";
import { resolvePlayerImage, teamShort, usePlayerLatestTeamResolver } from "@/lib/aggregates";
import { useTeamTheme, type TeamCode } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { EDITORIAL_ASPECTS } from "@/data/editorial/schema";
import { getV2ForFranchise, getV2Index } from "@/lib/editorial-v2";

type Tab = "rankings" | "compare" | "overview" | "builder";

const DESKTOP_TABS: { id: Exclude<Tab, "builder">; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "rankings", label: "Rankings", icon: BarChart3 },
  { id: "compare", label: "Compare", icon: GitCompare },
  { id: "overview", label: "Coverage & Evidence", icon: Layers },
];

const MOBILE_TABS: { id: Tab; label: string }[] = [
  { id: "rankings", label: "Rankings" },
  { id: "builder", label: "Builder" },
  { id: "compare", label: "Compare" },
  { id: "overview", label: "Coverage" },
];

const short = (code: string) => (code === "t20i" ? "T20I FM" : code === "t20i_assoc" ? "T20I Assoc" : code.toUpperCase());
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "–");
const signed = (v: number) => (v >= 0 ? "+" : "") + f1(v);
const tone = (v: number) => (v >= 0 ? "text-emerald-400" : "text-rose-400");

const SEL =
  "rounded-lg border border-white/15 bg-[#060b16] px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[var(--pl-accent)] min-w-0";
const MUTED = "text-slate-400";

const DEFAULT_QUERY: Query = {
  comps: ["ipl"],
  years: [2022, 2026],
  discipline: "bat",
  where: PRESETS[0].where,
  method: "standard",
  minBalls: 60,
  minMatches: 5,
};

const COND_LABEL: Record<string, string> = {
  innings: "Innings",
  phase: "Phase",
  over: "Over range",
  wickets: "Wickets down",
  ballsLeft: "Balls left",
  score: "Team score",
  runsRequired: "Runs req.",
  rrr: "Req. RR",
  target: "Target",
  stage: "Match stage",
  position: "Bat pos.",
  batHand: "Batter hand",
  bowlType: "Bowler type",
};

const NEW_COND: Record<string, Cond> = {
  innings: { k: "innings", v: 2 },
  phase: { k: "phase", v: "death" },
  over: { k: "over", min: 16, max: 20 },
  wickets: { k: "wickets", min: 3 },
  ballsLeft: { k: "ballsLeft", max: 30 },
  score: { k: "score", max: 35 },
  runsRequired: { k: "runsRequired", min: 30 },
  rrr: { k: "rrr", min: 10 },
  target: { k: "target", min: 180 },
  stage: { k: "stage", v: "knockout" },
  position: { k: "position", min: 3, max: 5 },
  batHand: { k: "batHand", v: "left" },
  bowlType: { k: "bowlType", v: "spin" },
};

const ENUM_OPTS: Record<string, [string | number, string][]> = {
  innings: [
    [1, "Batting first"],
    [2, "Chasing"],
  ],
  phase: [
    ["powerplay", "Powerplay"],
    ["middle", "Middle"],
    ["death", "Death"],
  ],
  stage: [
    ["early", "Early league"],
    ["mid", "Mid league"],
    ["late", "Late league"],
    ["knockout", "Playoffs & finals"],
  ],
  batHand: [
    ["left", "Left-hand"],
    ["right", "Right-hand"],
  ],
  bowlType: [
    ["pace", "Pace"],
    ["spin", "Spin"],
  ],
};

function Chip({
  on,
  children,
  onClick,
  label,
  className = "",
}: {
  on: boolean;
  children: React.ReactNode;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide transition-all ${
        on
          ? "text-white shadow-[0_0_16px_-6px_var(--pl-accent)]"
          : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-white/30 hover:text-white"
      } ${className}`}
      style={
        on
          ? {
              borderColor: "var(--pl-accent)",
              background: "color-mix(in srgb, var(--pl-accent) 18%, rgba(9, 14, 26, 0.9))",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function CondEditor({ c, onChange, onRemove }: { c: Cond; onChange: (c: Cond) => void; onRemove: () => void }) {
  const isRange = (RANGE_KEYS as readonly string[]).includes(c.k);
  const r = c as { min?: number; max?: number };
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#050914] px-2.5 py-2"
      style={{ borderLeft: "3px solid var(--pl-accent)" }}
    >
      <span className="text-[11px] font-bold text-slate-200 w-24 shrink-0">
        {COND_LABEL[c.k]}
        {CHASE_ONLY.has(c.k) && <span className="block text-[9.5px] font-normal text-slate-500">chase only</span>}
      </span>
      {isRange ? (
        <span className="flex items-center gap-1 text-xs">
          <input
            aria-label={`${COND_LABEL[c.k]} minimum`}
            inputMode="decimal"
            className={`${SEL} w-14 text-center`}
            placeholder="min"
            value={r.min ?? ""}
            onChange={(e) => onChange({ ...c, min: num(e.target.value) } as Cond)}
          />
          <span className="text-slate-500">–</span>
          <input
            aria-label={`${COND_LABEL[c.k]} maximum`}
            inputMode="decimal"
            className={`${SEL} w-14 text-center`}
            placeholder="max"
            value={r.max ?? ""}
            onChange={(e) => onChange({ ...c, max: num(e.target.value) } as Cond)}
          />
        </span>
      ) : (
        <select
          aria-label={COND_LABEL[c.k]}
          className={SEL}
          value={String((c as { v: unknown }).v)}
          onChange={(e) => onChange({ k: c.k, v: c.k === "innings" ? Number(e.target.value) : e.target.value } as Cond)}
        >
          {ENUM_OPTS[c.k].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${COND_LABEL[c.k]}`}
        className="ml-auto p-1 text-slate-500 hover:text-rose-400 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GroupEditor({ g, onChange, depth = 1 }: { g: Group; onChange: (g: Group) => void; depth?: number }) {
  const set = (i: number, item: Cond | Group | null) =>
    onChange({
      ...g,
      items: item ? g.items.map((x, j) => (j === i ? item : x)) : g.items.filter((_, j) => j !== i),
    });
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-400 font-semibold">Condition Logic</span>
        <div className="flex items-center gap-1.5">
          <Chip on={g.op === "and"} onClick={() => onChange({ ...g, op: "and" })}>
            AND (All)
          </Chip>
          <Chip on={g.op === "or"} onClick={() => onChange({ ...g, op: "or" })}>
            OR (Any)
          </Chip>
        </div>
      </div>
      <div className="space-y-1.5">
        {g.items.map((it, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="pl-2 text-[9.5px] font-mono font-black uppercase tracking-widest" style={{ color: "var(--pl-accent)" }}>
                {g.op}
              </div>
            )}
            {isGroup(it) ? (
              <div className="rounded-xl border border-dashed border-white/20 p-2 bg-white/[0.015]">
                <GroupEditor g={it} depth={depth + 1} onChange={(ng) => set(i, ng)} />
                <button type="button" className="mt-1 text-[10.5px] text-slate-400 hover:text-rose-300 underline" onClick={() => set(i, null)}>
                  Remove group
                </button>
              </div>
            ) : (
              <CondEditor c={it} onChange={(nc) => set(i, nc)} onRemove={() => set(i, null)} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <select
          aria-label="Add a condition"
          className={`${SEL} flex-1`}
          value=""
          onChange={(e) => e.target.value && onChange({ ...g, items: [...g.items, NEW_COND[e.target.value]] })}
        >
          <option value="">+ Add condition…</option>
          {Object.keys(NEW_COND).map((k) => (
            <option key={k} value={k}>
              {COND_LABEL[k]}
            </option>
          ))}
        </select>
        {depth < 2 && (
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-white/30"
            onClick={() => onChange({ ...g, items: [...g.items, { op: g.op === "and" ? "or" : "and", items: [] }] })}
          >
            + {g.op === "and" ? "OR" : "AND"}
          </button>
        )}
      </div>
    </div>
  );
}

interface Result {
  key: string;
  query: Query;
  params: Params;
  rows: ScoredRow[];
  excluded: number;
  situation: ReturnType<typeof aggregate>["situation"];
  comps: ReturnType<typeof aggregate>["comps"];
  ms: number;
}

export function PressureIntelligence({ mobile = false }: { mobile?: boolean }) {
  const { selectedTeam, setSelectedTeam, clearTeam, theme, allTeams } = useTeamTheme();
  const resolvePlayerTeam = usePlayerLatestTeamResolver();
  const index = useQuery({ queryKey: ["pi-index"], queryFn: loadIndex, staleTime: Infinity });
  const method = useQuery({ queryKey: ["pi-method"], queryFn: loadMethodology, staleTime: Infinity });
  const comps = index.data?.competitions ?? [];
  const known = comps.map((c) => c.code);

  const url = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialTabParam = url.get("tab");
  const initialTab: Tab =
    initialTabParam === "compare" || initialTabParam === "overview" || (mobile && initialTabParam === "builder")
      ? initialTabParam
      : "rankings";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [draft, setDraft] = useState<Query>(DEFAULT_QUERY);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [tray, setTray] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: keyof ScoredRow; dir: 1 | -1 }>({ key: "ras", dir: -1 });
  const [page, setPage] = useState(1);
  const [franchiseMenuOpen, setFranchiseMenuOpen] = useState(false);
  const [rosterOnly, setRosterOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const runId = useRef(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Dynamic CSS custom properties synced to selected IPL franchise
  const accent = theme?.accent || "#FACC15";
  const secondary = theme?.secondary || "#38BDF8";
  const franchiseName = theme?.name || "All IPL Franchises";
  const franchiseShort = theme?.shortName || "IPL";

  // Close franchise selector on outside click / Escape
  useEffect(() => {
    if (!franchiseMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFranchiseMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFranchiseMenuOpen(false);
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [franchiseMenuOpen]);

  // Reset roster-only toggle when global team is cleared
  useEffect(() => {
    if (!selectedTeam) setRosterOnly(false);
  }, [selectedTeam]);

  // Player -> verified IPL franchise code lookup for row badges and roster filtering
  const getTeamCode = useCallback(
    (name: string): string | null => {
      const t = resolvePlayerTeam(name);
      return t ? teamShort(t).toUpperCase() : null;
    },
    [resolvePlayerTeam],
  );

  const params = (q: Query, m: Methodology | undefined): Params | null =>
    q.method === "custom" && q.params ? q.params : m?.params ?? null;

  const run = useCallback(
    async (raw: unknown, goTo?: Tab) => {
      const parsed = parseQuery(raw, known);
      if ("error" in parsed) {
        setDraftError(parsed.error);
        return;
      }
      const q = parsed.query;
      setDraftError(null);
      setDraft(q);
      const id = ++runId.current;
      setStatus({ busy: true, error: null });
      try {
        const m = await loadMethodology();
        const p = params(q, m)!;
        const ds = await Promise.all(q.comps.map(loadDataset));
        if (id !== runId.current) return;
        await new Promise((r) => setTimeout(r, 0));
        const t0 = performance.now();
        const agg = aggregate(ds, q, p.wicket);
        const { rows, excluded } = score(agg, p, q.minBalls, q.minMatches, q.discipline === "bat");
        if (id !== runId.current) return;
        const nextResult: Result = {
          key: queryKey(q),
          query: q,
          params: p,
          rows,
          excluded,
          situation: agg.situation,
          comps: agg.comps,
          ms: performance.now() - t0,
        };
        setResult(nextResult);
        setStatus({ busy: false, error: null });
        setPage(1);
        setOpen(null);
        setSort({ key: "ras", dir: -1 });
        // Pre-seed compare tray with top 2 once when empty so Compare Tray is immediately rich
        setTray((prev) => (prev.length === 0 && rows.length >= 2 ? [rows[0].id, rows[1].id] : prev));
        if (goTo) setTab(goTo);
        const sp = new URLSearchParams(window.location.search);
        sp.set("q", encodeQuery(q));
        sp.set("tab", goTo ?? tab);
        window.history.replaceState(null, "", `${window.location.pathname}?${sp}`);
      } catch (e) {
        if (id === runId.current) setStatus({ busy: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
    [known.join(","), tab],
  );

  // Restore ?q=<query> or run default preset immediately on initial index load so the lab opens populated
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || !known.length) return;
    initialized.current = true;
    const s = url.get("q");
    if (s) {
      try {
        void run(decodeQuery(s), initialTab);
        return;
      } catch {
        setDraftError("The shared query link is malformed.");
      }
    }
    void run(DEFAULT_QUERY, initialTab);
  }, [known.length]);

  const changeTab = (t: Tab) => {
    setTab(t);
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", t);
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
    const base =
      rosterOnly && selectedTeam
        ? result.rows.filter((r) => getTeamCode(r.name) === selectedTeam)
        : result.rows;
    return [...base].sort((a, b) => ((a[key] as number) - (b[key] as number)) * dir || a.id.localeCompare(b.id));
  }, [result, sort, rosterOnly, selectedTeam, getTeamCode]);

  const rankOf = useMemo(() => new Map(result?.rows.map((r, i) => [r.id, i + 1]) ?? []), [result]);
  const toggleTray = (id: string) => setTray((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < 3 ? [...t, id] : t));
  const bat = (result?.query.discipline ?? draft.discipline) === "bat";
  const parsedDraft = useMemo(() => parseQuery(draft, known), [draft, known.join(",")]);
  const stale = !!result && "query" in parsedDraft && queryKey(parsedDraft.query) !== result.key;

  // Deterministic Telemetry Widgets calculated from current visible cohort (`sorted`)
  const telemetry = useMemo(() => {
    const cohort = sorted.length > 0 ? sorted : result?.rows ?? [];
    const top = cohort[0];
    const rasWindow = cohort.slice(0, 25).map((r) => r.ras);
    const minRas = rasWindow.length ? Math.min(...rasWindow) : -10;
    const maxRas = rasWindow.length ? Math.max(...rasWindow) : 10;
    const spanRas = Math.max(1, maxRas - minRas);
    const topSrOrEcon = top
      ? bat
        ? (100 * top.runs) / Math.max(1, top.balls)
        : (6 * top.runs) / Math.max(1, top.balls)
      : 0;
    const topAvgOrWkts = top ? (bat ? (top.outs ? top.runs / top.outs : top.runs) : top.outs) : 0;

    // Season trend across top 5 qualifying players' real yearly per-100 pressure values
    const yearMap = new Map<number, { sum: number; count: number; balls: number }>();
    for (const r of cohort.slice(0, 8)) {
      for (const y of r.years) {
        if (y.balls <= 0) continue;
        const cur = yearMap.get(y.year) ?? { sum: 0, count: 0, balls: 0 };
        cur.sum += y.per100;
        cur.count += 1;
        cur.balls += y.balls;
        yearMap.set(y.year, cur);
      }
    }
    const seasonTrend = [...yearMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-6)
      .map(([year, v]) => ({ year, val: v.sum / Math.max(1, v.count), balls: v.balls }));

    // Aggregate Boundary / Dot / Rotation profile from selected tray (or top 5) real ball counts
    const focusRows =
      tray.length > 0 && result
        ? tray.map((id) => result.rows.find((r) => r.id === id)).filter((x): x is ScoredRow => Boolean(x))
        : cohort.slice(0, 5);
    const totalBalls = focusRows.reduce((s, r) => s + r.balls, 0);
    const totalDots = focusRows.reduce((s, r) => s + r.dots, 0);
    const totalBdry = focusRows.reduce((s, r) => s + r.boundaries, 0);
    const dotPct = totalBalls > 0 ? (100 * totalDots) / totalBalls : 0;
    const bdryPct = totalBalls > 0 ? (100 * totalBdry) / totalBalls : 0;
    const rotPct = Math.max(0, 100 - dotPct - bdryPct);
    const avgPosShare =
      focusRows.length > 0 ? (100 * focusRows.reduce((s, r) => s + r.positiveShare, 0)) / focusRows.length : 0;

    return {
      top,
      minRas,
      spanRas,
      topSrOrEcon,
      topAvgOrWkts,
      seasonTrend,
      focusCount: focusRows.length,
      totalBalls,
      dotPct,
      bdryPct,
      rotPct,
      avgPosShare,
    };
  }, [sorted, result, tray, bat]);

  // Franchise-relevant real published editorial investigations (bottom 5 cards)
  const investigations = useMemo(() => {
    const pool = selectedTeam ? getV2ForFranchise(selectedTeam) : getV2Index();
    const priority = new Set(["tactical", "batting", "bowling-fielding", "data-science", "auction-economics"]);
    const ranked = [...pool].sort((a, b) => {
      const pa = priority.has(a.aspect) ? 0 : 1;
      const pb = priority.has(b.aspect) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.publishedDate.localeCompare(a.publishedDate);
    });
    return ranked.slice(0, 5);
  }, [selectedTeam]);

  // ── Shared Pieces ───────────────────────────────────────────────────────────

  const heroSection = (
    <section className="pl-hero p-4 sm:p-5 space-y-4">
      <div className="pl-hero-grid" aria-hidden="true" />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2.5 min-w-0">
          {/* Interactive Franchise Theme Picker */}
          <div className="relative max-w-full" ref={menuRef}>
            <button
              type="button"
              onClick={() => setFranchiseMenuOpen((o) => !o)}
              aria-expanded={franchiseMenuOpen}
              className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all bg-[#050814]/85 hover:bg-white/[0.06]"
              style={{
                borderColor: "color-mix(in srgb, var(--pl-accent) 45%, rgba(255,255,255,0.14))",
                color: "var(--pl-accent)",
              }}
              data-testid="pl-franchise-picker"
            >
              {theme ? <TeamLogo team={theme.name} size="w-4 h-4 shrink-0" /> : <Trophy className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate whitespace-nowrap">{theme ? theme.name : "All IPL Franchises"}</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${franchiseMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {franchiseMenuOpen && (
              <div
                className="absolute left-0 top-full mt-2 z-50 w-72 max-h-80 overflow-y-auto pl-scroll rounded-2xl border border-white/15 bg-[#070c18]/98 p-1.5 shadow-2xl backdrop-blur-xl"
                role="listbox"
                aria-label="Choose franchise theme"
              >
                <button
                  type="button"
                  onClick={() => {
                    clearTeam();
                    setFranchiseMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${
                    !selectedTeam ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    All IPL Franchises (League Theme)
                  </span>
                  {!selectedTeam && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <div className="my-1 h-px bg-white/10" />
                {allTeams.map((t) => {
                  const active = selectedTeam === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeam(t.id as TeamCode);
                        setFranchiseMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <TeamLogo team={t.name} size="w-5 h-5" />
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
                        {active && <Check className="w-3.5 h-3.5" style={{ color: t.accent }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Lab Title & Tagline */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl border shrink-0"
              style={{
                borderColor: "color-mix(in srgb, var(--pl-accent) 45%, transparent)",
                background: "color-mix(in srgb, var(--pl-accent) 14%, rgba(6,11,22,0.9))",
                color: "var(--pl-accent)",
              }}
            >
              <FlaskConical className="h-5 w-5" />
            </span>
            <h1 className="font-display font-black tracking-tight text-white text-2xl sm:text-3xl leading-none">
              Pressure Lab
            </h1>
            <span className="text-xs sm:text-sm text-slate-300/90 font-medium">
              Define the situation. Discover the performance.
            </span>
            <span className="pl-slashes text-sm hidden sm:inline" aria-hidden="true">
              ///
            </span>
          </div>
        </div>

        {/* Neon Crest + Floating Cricket Orb Stage */}
        <div className="pl-crest-stage shrink-0">
          <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl bg-[#040813] border border-white/10 pl-crest-glow">
            {theme ? (
              <TeamLogo team={theme.name} size="w-9 h-9" />
            ) : (
              <FlaskConical className="w-6 h-6" style={{ color: accent }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                {franchiseShort} LAB TELEMETRY
              </span>
              <span
                className="pl-orb-float inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-black"
                style={{
                  borderColor: "color-mix(in srgb, var(--pl-accent) 60%, transparent)",
                  background: "radial-gradient(circle at 35% 30%, #ffffff55, var(--pl-accent))",
                  color: "#040812",
                }}
                aria-hidden="true"
              >
                ●
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[260px] mt-0.5">
              {result
                ? `${result.query.discipline === "bat" ? "Batters" : "Bowlers"} · ${summaryScope(result.query, comps)}`
                : "Ready · Ball-by-ball expected value model"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="relative flex items-center gap-2 overflow-x-auto pl-no-scrollbar pt-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          Quick Presets:
        </span>
        {PRESETS.map((pr, idx) => {
          const active =
            result &&
            result.query.discipline === pr.discipline &&
            JSON.stringify(result.query.where) === JSON.stringify(pr.where);
          return (
            <button
              key={pr.id}
              type="button"
              onClick={() => void run({ ...draft, discipline: pr.discipline, where: pr.where }, "rankings")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                active
                  ? "text-white"
                  : "border-white/12 bg-[#060b16]/85 text-slate-300 hover:border-white/30 hover:text-white"
              }`}
              style={
                active
                  ? {
                      borderColor: "var(--pl-accent)",
                      background: "color-mix(in srgb, var(--pl-accent) 18%, rgba(6,11,22,0.95))",
                      boxShadow: "0 0 18px -6px var(--pl-accent)",
                    }
                  : undefined
              }
            >
              {idx % 2 === 0 ? (
                <Zap className="h-3 w-3 shrink-0" style={{ color: "var(--pl-accent)" }} />
              ) : (
                <Target className="h-3 w-3 shrink-0" style={{ color: "var(--pl-accent)" }} />
              )}
              <span>{pr.label}</span>
              <span className="text-[9.5px] font-mono uppercase opacity-65">
                {pr.discipline === "bat" ? "BAT" : "BOWL"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  // ── Situation Builder Controls ──────────────────────────────────────────────
  const yr = draft.years;
  const seasonMode = !yr ? "all" : yr[0] === yr[1] ? "one" : "range";
  const setYears = (y: [number, number] | null) => setDraft((d) => ({ ...d, years: y }));
  const p = draft.method === "custom" && draft.params ? draft.params : method.data?.params;

  const builderPanel = (
    <aside className="pl-card pl-card-accent p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" style={{ color: "var(--pl-accent)" }} />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white leading-none">
              Situation Builder
            </h2>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Build a match context &amp; rank performers.
            </p>
          </div>
        </div>
        <span className="pl-slashes text-xs" aria-hidden="true">
          ///
        </span>
      </div>

      {/* Competitions */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Competition
        </label>
        <div className="flex flex-wrap gap-1.5">
          {comps.map((c) => (
            <Chip
              key={c.code}
              on={draft.comps.includes(c.code)}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  comps: d.comps.includes(c.code) ? d.comps.filter((x) => x !== c.code) : [...d.comps, c.code],
                }))
              }
            >
              {short(c.code)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Seasons */}
      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Seasons
        </label>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={seasonMode === "all"} onClick={() => setYears(null)}>
            All
          </Chip>
          <Chip on={seasonMode === "range"} onClick={() => setYears([years.at(-5) ?? years[0], years.at(-1)!])}>
            Range
          </Chip>
          <Chip on={seasonMode === "one"} onClick={() => setYears([years.at(-1)!, years.at(-1)!])}>
            Single Year
          </Chip>
        </div>
        {yr ? (
          <div className="flex items-center gap-2 text-xs">
            {seasonMode === "range" && (
              <>
                <select
                  aria-label="From season"
                  className={`${SEL} flex-1`}
                  value={yr[0]}
                  onChange={(e) => setYears([+e.target.value, yr[1]])}
                >
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <span className="text-slate-500">to</span>
              </>
            )}
            <select
              aria-label={seasonMode === "range" ? "To season" : "Season"}
              className={`${SEL} flex-1`}
              value={yr[1]}
              onChange={(e) => setYears(seasonMode === "one" ? [+e.target.value, +e.target.value] : [yr[0], +e.target.value])}
            >
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        ) : (
          years.length > 0 && (
            <p className="text-[11px] font-mono text-slate-400">
              {years[0]} – {years.at(-1)} active
            </p>
          )
        )}
      </div>

      {/* Match Conditions */}
      <div className="space-y-2">
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Match Conditions
        </label>
        <GroupEditor g={draft.where} onChange={(where) => setDraft((d) => ({ ...d, where }))} />
        {usesChaseOnly(draft.where) && (
          <p className="text-[10.5px] text-amber-300/85 leading-snug">
            Required runs, target &amp; RRR only exist in chases (2nd innings).
          </p>
        )}
      </div>

      {/* Discipline Toggle */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Discipline
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, discipline: "bat" }))}
            className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition-all ${
              draft.discipline === "bat" ? "text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
            }`}
            style={
              draft.discipline === "bat"
                ? { borderColor: "var(--pl-accent)", background: "color-mix(in srgb, var(--pl-accent) 16%, #050816)" }
                : undefined
            }
          >
            Batting
          </button>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, discipline: "bowl" }))}
            className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition-all ${
              draft.discipline === "bowl" ? "text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
            }`}
            style={
              draft.discipline === "bowl"
                ? { borderColor: "var(--pl-accent)", background: "color-mix(in srgb, var(--pl-accent) 16%, #050816)" }
                : undefined
            }
          >
            Bowling
          </button>
        </div>
      </div>

      {/* Collapsible Thresholds & Scoring Parameters */}
      <div className="border-t border-white/10 pt-2.5">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white"
        >
          <span>Thresholds &amp; Model Weights</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
        {showAdvanced && (
          <div className="mt-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex flex-col gap-1 text-[10.5px] text-slate-400">
                Min. {draft.discipline === "bat" ? "balls faced" : "balls bowled"}
                <input
                  inputMode="numeric"
                  className={SEL}
                  value={draft.minBalls}
                  onChange={(e) => setDraft((d) => ({ ...d, minBalls: Number(e.target.value) || 0 }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10.5px] text-slate-400">
                Min. matches
                <input
                  inputMode="numeric"
                  className={SEL}
                  value={draft.minMatches}
                  onChange={(e) => setDraft((d) => ({ ...d, minMatches: Number(e.target.value) || 0 }))}
                />
              </label>
            </div>
            <div className="flex gap-1.5">
              <Chip on={draft.method === "standard"} onClick={() => setDraft((d) => ({ ...d, method: "standard", params: undefined }))}>
                Standard v1
              </Chip>
              <Chip
                on={draft.method === "custom"}
                onClick={() => setDraft((d) => ({ ...d, method: "custom", params: d.params ?? method.data?.params }))}
              >
                Custom Weights
              </Chip>
            </div>
            {draft.method === "custom" && p && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ["wicket", "Wicket value"],
                    ["lambdaH", "λ pressure"],
                    ["lambdaN", "λ ordinary"],
                    ["alpha", "α lift weight"],
                    ["beta", "β SE penalty"],
                  ] as [keyof Params, string][]
                ).map(([k, l]) => (
                  <label key={k} className="flex flex-col gap-0.5 text-[10.5px] text-slate-400">
                    {l}
                    <input
                      inputMode="decimal"
                      className={SEL}
                      value={p[k]}
                      onChange={(e) => setDraft((d) => ({ ...d, params: { ...p, [k]: Number(e.target.value) } }))}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {draftError && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300">
          {draftError}
        </p>
      )}
      {stale && (
        <p className="text-[11px] font-mono text-amber-300">
          Conditions updated — click Generate Analysis to refresh.
        </p>
      )}

      <button
        type="button"
        disabled={status.busy}
        onClick={() => void run(draft, "rankings")}
        className="pl-cta w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs uppercase tracking-wider disabled:opacity-60"
        data-testid="pl-generate-btn"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>{status.busy ? "Analyzing Dataset…" : "Generate Analysis"}</span>
      </button>
    </aside>
  );

  // ── Rankings View (Table/Mobile List + Right Telemetry Rail + Compare Tray) ─
  const PAGE = 20;
  const visibleRows = sorted.slice(0, page * PAGE);

  const rankingsWorkspace = !result ? (
    <Empty onBuild={() => changeTab(mobile ? "builder" : "rankings")} busy={status.busy} />
  ) : (
    <div className="space-y-4">
      <div className={`grid gap-4 ${mobile ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_285px] items-start"}`}>
        {/* Center: Player Performance Ranking Card */}
        <div className="pl-card p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="pl-slashes text-xs" aria-hidden="true">
                  ///
                </span>
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Player Performance Ranking
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {sorted.length} qualifying {bat ? "batters" : "bowlers"} · {result.situation.events.toLocaleString()} matching balls ({f1(result.ms)} ms)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTeam && theme && (
                <button
                  type="button"
                  onClick={() => setRosterOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    rosterOnly ? "text-white" : "border-white/15 bg-white/[0.03] text-slate-300"
                  }`}
                  style={
                    rosterOnly
                      ? { borderColor: "var(--pl-accent)", background: "color-mix(in srgb, var(--pl-accent) 18%, #050816)" }
                      : undefined
                  }
                >
                  <TeamLogo team={theme.name} size="w-3.5 h-3.5" />
                  <span>{rosterOnly ? `${theme.shortName} Only` : `All Players`}</span>
                </button>
              )}

              <select
                aria-label="Sort ranking metric"
                className={SEL}
                value={String(sort.key)}
                onChange={(e) => setSort({ key: e.target.value as keyof ScoredRow, dir: -1 })}
              >
                <option value="ras">Metric: Reliability Score (RAS)</option>
                <option value="A">Metric: Pressure /100</option>
                <option value="lift">Metric: Clutch Lift</option>
                <option value="balls">Metric: Sample Balls</option>
                <option value="matches">Metric: Matches</option>
              </select>
            </div>
          </div>

          {mobile ? (
            <div className="space-y-2">
              {visibleRows.map((r, idx) => {
                const overallRank = rankOf.get(r.id) ?? idx + 1;
                const meterPct = Math.max(18, Math.min(96, Math.round(18 + ((r.ras - telemetry.minRas) / telemetry.spanRas) * 78)));
                const rateVal = bat ? f1((100 * r.runs) / Math.max(1, r.balls)) : f1((6 * r.runs) / Math.max(1, r.balls));
                const avgOrWkt = bat ? (r.outs ? f1(r.runs / r.outs) : "–") : String(r.outs);
                const teamCode = getTeamCode(r.name);
                const inTray = tray.includes(r.id);

                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-white/10 bg-[#050914]/90 p-3 space-y-2.5"
                    style={overallRank === 1 ? { borderColor: "color-mix(in srgb, var(--pl-accent) 45%, rgba(255,255,255,0.12))" } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-lg font-mono text-xs font-black shrink-0 ${
                          overallRank === 1 ? "text-[#050816]" : "bg-white/[0.06] text-slate-300"
                        }`}
                        style={overallRank === 1 ? { background: "var(--pl-accent)" } : undefined}
                      >
                        {overallRank}
                      </span>
                      <PlayerChipAvatar name={r.name} sizeClass="h-10 w-10" />
                      <button type="button" onClick={() => setOpen(r.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">{r.name}</span>
                          {teamCode && <TeamLogo team={teamCode} size="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-400">
                          {teamCode ? `${teamCode} · ` : ""}
                          {r.balls}b · {r.matches}m · {bat ? `SR ${rateVal}` : `Econ ${rateVal}`} ·{" "}
                          {bat ? `Avg ${avgOrWkt}` : `${avgOrWkt}W`}
                        </div>
                      </button>
                      <div className="text-right shrink-0">
                        <div className={`font-mono text-base font-black tabular-nums ${tone(r.ras)}`}>{signed(r.ras)}</div>
                        <div className="text-[9.5px] font-mono text-slate-400">RAS</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${meterPct}%`,
                            background: "linear-gradient(90deg, var(--pl-secondary), var(--pl-accent))",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-300 w-9 text-right">
                        {Math.round(r.positiveShare * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleTray(r.id)}
                        className={`rounded-lg border px-2 py-1 text-[10.5px] font-bold shrink-0 ${
                          inTray ? "text-[#050816]" : "border-white/15 bg-white/[0.04] text-slate-200"
                        }`}
                        style={inTray ? { background: "var(--pl-accent)", borderColor: "var(--pl-accent)" } : undefined}
                      >
                        {inTray ? "✓ Compare" : "+ Compare"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleRows.length === 0 && (
                <div className="rounded-xl border border-white/10 p-6 text-center text-xs text-slate-400">
                  No qualifying player matches the selected filters. Try widening seasons or switching off the team roster filter.
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto pl-scroll rounded-xl border border-white/10 bg-[#050914]/70">
              <table className="w-full text-xs">
                <thead className="bg-white/[0.03] text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr className="[&>th]:px-2.5 [&>th]:py-2.5">
                    <th className="text-left w-8">#</th>
                    <th className="text-left">Player</th>
                    <th className="text-right cursor-pointer whitespace-nowrap" onClick={() => setSort((s) => ({ key: "ras", dir: s.key === "ras" ? (s.dir === 1 ? -1 : 1) : -1 }))}>
                      RAS {sort.key === "ras" ? (sort.dir === 1 ? "↑" : "↓") : ""}
                    </th>
                    <th className="text-right">{bat ? "SR" : "Econ"}</th>
                    <th className="text-right">{bat ? "Avg" : "Wkts"}</th>
                    <th className="text-left w-32">Pressure Meter</th>
                    <th className="text-center">Evidence</th>
                    <th className="text-right w-20">Compare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visibleRows.map((r, idx) => {
                    const overallRank = rankOf.get(r.id) ?? idx + 1;
                    const meterPct = Math.max(18, Math.min(96, Math.round(18 + ((r.ras - telemetry.minRas) / telemetry.spanRas) * 78)));
                    const rateVal = bat ? f1((100 * r.runs) / Math.max(1, r.balls)) : f1((6 * r.runs) / Math.max(1, r.balls));
                    const avgOrWkt = bat ? (r.outs ? f1(r.runs / r.outs) : "–") : String(r.outs);
                    const teamCode = getTeamCode(r.name);
                    const inTray = tray.includes(r.id);

                    return (
                      <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-2.5 py-2.5">
                          <span
                            className={`inline-grid h-6 w-6 place-items-center rounded-md font-mono text-[11px] font-black ${
                              overallRank === 1 ? "text-[#050816]" : "bg-white/[0.06] text-slate-300"
                            }`}
                            style={overallRank === 1 ? { background: "var(--pl-accent)" } : undefined}
                          >
                            {overallRank}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <button type="button" onClick={() => setOpen(r.id)} className="flex items-center gap-2 text-left group">
                            <PlayerChipAvatar name={r.name} sizeClass="h-8 w-8" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-100 group-hover:underline truncate max-w-[135px]">
                                  {r.name}
                                </span>
                                {teamCode && <TeamLogo team={teamCode} size="w-3.5 h-3.5" />}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {teamCode ? `${teamCode} · ` : ""}
                                {r.comps.map((c) => short(c.comp)).join("/")} · {r.balls}b · {r.matches}m
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className={`px-2.5 py-2.5 text-right font-mono font-black tabular-nums ${tone(r.ras)}`}>
                          {signed(r.ras)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-200 tabular-nums">
                          {rateVal}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-slate-300 tabular-nums">
                          {avgOrWkt}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${meterPct}%`,
                                  background: "linear-gradient(90deg, var(--pl-secondary), var(--pl-accent))",
                                }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-300 w-7 text-right tabular-nums">
                              {Math.round(r.positiveShare * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-center">
                          <Evidence e={r.evidence} />
                        </td>
                        <td className="px-2.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleTray(r.id)}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold whitespace-nowrap transition-all ${
                              inTray
                                ? "text-[#050816]"
                                : "border-white/15 bg-white/[0.03] text-slate-300 hover:border-white/30"
                            }`}
                            style={inTray ? { background: "var(--pl-accent)", borderColor: "var(--pl-accent)" } : undefined}
                          >
                            {inTray ? "✓ Added" : "+ Add"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No player matches the evidence thresholds or roster filter. Adjust minimum balls/matches or select All Players.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > visibleRows.length && (
            <button
              type="button"
              onClick={() => setPage((n) => n + 1)}
              className="w-full rounded-xl border border-white/12 bg-white/[0.03] py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              Show {Math.min(PAGE, sorted.length - visibleRows.length)} more ({sorted.length - visibleRows.length} remaining)
            </button>
          )}
        </div>

        {/* Right Telemetry Rail: Snapshot + Pressure Trend + Boundary & Dot Ground Dial */}
        <div className="space-y-4 min-w-0">
          {/* Situation Snapshot */}
          <div className="pl-card pl-card-accent p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" style={{ color: "var(--pl-accent)" }} />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Situation Snapshot</h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{sorted.length} ranked</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-[#050914] p-2.5 text-center">
                <div className="font-mono text-lg font-black tabular-nums" style={{ color: "var(--pl-accent)" }}>
                  {telemetry.top ? signed(telemetry.top.ras) : "–"}
                </div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400 mt-0.5">Top RAS</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#050914] p-2.5 text-center">
                <div className="font-mono text-lg font-black text-white tabular-nums">
                  {telemetry.top ? f1(telemetry.topSrOrEcon) : "–"}
                </div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400 mt-0.5">
                  {bat ? "Top SR" : "Top Econ"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#050914] p-2.5 text-center">
                <div className="font-mono text-lg font-black text-cyan-300 tabular-nums">
                  {telemetry.top ? (bat ? f1(telemetry.topAvgOrWkts) : telemetry.topAvgOrWkts) : "–"}
                </div>
                <div className="text-[9.5px] font-mono uppercase text-slate-400 mt-0.5">
                  {bat ? "Top Avg" : "Top Wkts"}
                </div>
              </div>
            </div>
          </div>

          {/* Pressure Trend + Boundary Profile (2-col on mobile if space allows or stacked cleanly) */}
          <div className={`grid gap-4 ${mobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {/* Season Pressure Trend SVG */}
            <div className="pl-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--pl-accent)" }} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Pressure Trend</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Per-100 seasonal</span>
              </div>
              <TrendSparkline points={telemetry.seasonTrend} accent={accent} />
            </div>

            {/* Boundary & Dot Ground Dial */}
            <div className="pl-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" style={{ color: "var(--pl-accent)" }} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Scoring vs Pressure</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {tray.length > 0 ? `${telemetry.focusCount} tray` : "Top 5"} · {telemetry.totalBalls}b
                </span>
              </div>
              <GroundControlDial
                bdryPct={telemetry.bdryPct}
                dotPct={telemetry.dotPct}
                rotPct={telemetry.rotPct}
                posShare={telemetry.avgPosShare}
                accent={accent}
                secondary={secondary}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Compare Tray Dock */}
      <div className="pl-card pl-card-accent p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl border shrink-0"
            style={{
              borderColor: "color-mix(in srgb, var(--pl-accent) 45%, transparent)",
              background: "color-mix(in srgb, var(--pl-accent) 14%, #050816)",
              color: "var(--pl-accent)",
            }}
          >
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white">Compare Tray ({tray.length}/3)</div>
            <div className="text-[10.5px] text-slate-400">Compare players under identical pressure conditions.</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
          {tray.map((id) => {
            const row = result.rows.find((r) => r.id === id);
            if (!row) return null;
            return (
              <div
                key={id}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#050914] px-2.5 py-1.5"
              >
                <img
                  src={resolvePlayerImage(row.name)}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover bg-slate-800"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                />
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-bold text-white max-w-[110px] truncate">{row.name}</div>
                  <div className="text-[9.5px] font-mono font-bold" style={{ color: "var(--pl-accent)" }}>
                    RAS {signed(row.ras)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${row.name}`}
                  onClick={() => toggleTray(id)}
                  className="text-slate-400 hover:text-rose-400 ml-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {tray.length < 3 && sorted.some((r) => !tray.includes(r.id)) && (
            <button
              type="button"
              onClick={() => {
                const next = sorted.find((r) => !tray.includes(r.id));
                if (next) toggleTray(next.id);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-dashed border-white/25 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-white/45 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Player
            </button>
          )}

          <button
            type="button"
            disabled={tray.length === 0}
            onClick={() => changeTab("compare")}
            className="pl-cta inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs disabled:opacity-40"
          >
            <span>Compare</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  // ── Coverage & Scoring Evidence View ────────────────────────────────────────
  const overviewWorkspace = (
    <div className="space-y-4">
      <div className="pl-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--pl-accent)" }}>
              Warehouse Scope
            </span>
            <h2 className="text-base font-black text-white">Competition Coverage &amp; Bio Match Rates</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Cricsheet ODC-BY 1.0</span>
        </div>
        {index.isError && <ErrorLine msg="Coverage could not be loaded." retry={() => index.refetch()} />}
        <div className="overflow-x-auto pl-scroll rounded-xl border border-white/10 bg-[#050914]/70">
          <table className="w-full text-xs min-w-[540px]">
            <thead className="bg-white/[0.03] text-[10.5px] font-mono uppercase text-slate-400 border-b border-white/10">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left">
                <th>Competition</th>
                <th>Seasons</th>
                <th>Matches</th>
                <th>Balls</th>
                <th>Bowler Type Known</th>
                <th>Partial Seasons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-200">
              {comps.map((c) => (
                <tr key={c.code} className="[&>td]:px-3 [&>td]:py-2 hover:bg-white/[0.03]">
                  <td className="font-bold text-white">{c.name}</td>
                  <td className="font-mono">{c.seasons[0]} – {c.seasons.at(-1)}</td>
                  <td className="font-mono">{c.matches.toLocaleString()}</td>
                  <td className="font-mono">{c.balls.toLocaleString()}</td>
                  <td className={`font-mono ${c.bowlerTypeCoverage < 0.5 ? "text-amber-300" : "text-emerald-300"}`}>
                    {Math.round(c.bowlerTypeCoverage * 100)}%
                  </td>
                  <td className="font-mono text-slate-400">{c.partialSeasons.length ? c.partialSeasons.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result && <HowScored m={method.data} params={result.params} custom={result.query.method === "custom"} />}
    </div>
  );

  // ── Compare View ────────────────────────────────────────────────────────────
  const compared = result ? tray.map((id) => ({ id, row: result.rows.find((r) => r.id === id) })) : [];
  const compareWorkspace = !result ? (
    <Empty onBuild={() => changeTab(mobile ? "builder" : "rankings")} busy={status.busy} />
  ) : !tray.length ? (
    <div className="pl-card p-6 text-sm text-slate-300">
      Add up to three players from{" "}
      <button type="button" className="underline font-bold" style={{ color: "var(--pl-accent)" }} onClick={() => changeTab("rankings")}>
        Rankings
      </button>{" "}
      using “+ Compare”. Every player is evaluated under the exact same pressure context.
    </div>
  ) : (
    <CompareView
      items={compared}
      names={new Map(result.rows.map((r) => [r.id, r.name]))}
      bat={bat}
      mobile={mobile}
      query={result.query}
      comps={comps}
      onRemove={(id) => toggleTray(id)}
    />
  );

  // ── Bottom Strip: Explore Investigations (5 Real Editorial Articles) ────────
  const aspectMap = useMemo(() => new Map<string, string>(EDITORIAL_ASPECTS.map((a) => [a.id, a.name])), []);
  const investigationsStrip = investigations.length > 0 && (
    <section className="space-y-3 pt-2" aria-labelledby="pl-investigations">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "var(--pl-accent)" }} />
          <h2 id="pl-investigations" className="text-sm sm:text-base font-black text-white">
            Explore Investigations
          </h2>
          <span className="pl-slashes text-xs" aria-hidden="true">
            ///
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Deep-dive editorial research {theme ? `for ${theme.name}` : "across IPL franchises"}
          </span>
        </div>
        <Link
          href={theme ? `/intelligence?q=${encodeURIComponent(theme.name)}` : "/intelligence"}
          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
          style={{ color: "var(--pl-accent)" }}
        >
          <span>View All Investigations</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div
        className={
          mobile
            ? "flex gap-3 overflow-x-auto pl-no-scrollbar snap-x snap-mandatory pb-1"
            : "grid gap-3 md:grid-cols-2 lg:grid-cols-5"
        }
      >
        {investigations.map((art) => {
          const aspectLabel = aspectMap.get(art.aspect) ?? "Intelligence";
          return (
            <Link
              key={art.id}
              href={`/dugout/articles/${art.slug}`}
              className={`pl-card group flex flex-col justify-between p-3.5 transition-all hover:border-white/30 ${
                mobile ? "w-[78vw] max-w-[290px] shrink-0 snap-start" : ""
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-block rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider truncate max-w-[175px]"
                    style={{
                      borderColor: "color-mix(in srgb, var(--pl-accent) 40%, transparent)",
                      background: "color-mix(in srgb, var(--pl-accent) 12%, transparent)",
                      color: "var(--pl-accent)",
                    }}
                  >
                    {aspectLabel}
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] shrink-0">
                    <FlaskConical className="h-3 w-3" style={{ color: "var(--pl-accent)" }} />
                  </span>
                </div>
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white leading-snug line-clamp-2 group-hover:underline">
                  {art.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{art.dek}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-mono uppercase text-slate-400 truncate">
                  {art.headlineStat?.label ?? `${art.franchise} · ${art.readMinutes}m`}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-black shrink-0" style={{ color: "var(--pl-accent)" }}>
                  <span>{art.headlineStat?.display ?? art.franchise}</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );

  const openRow = result?.rows.find((r) => r.id === open) ?? null;

  return (
    <div
      className={`pl-shell ${mobile ? "px-3 pt-3 pb-6 space-y-4" : "w-full px-4 sm:px-6 lg:px-8 py-5 space-y-5"}`}
      style={
        {
          "--pl-accent": accent,
          "--pl-secondary": secondary,
        } as CSSProperties
      }
    >
      <div className={mobile ? "space-y-4" : "max-w-[1560px] mx-auto space-y-5"}>
        {heroSection}

        {status.error && <ErrorLine msg={`Analysis failed: ${status.error}`} retry={() => void run(draft)} />}

        {mobile ? (
          <>
            {/* Mobile Segmented Switcher: Rankings · Builder · Compare · Coverage */}
            <nav
              aria-label="Pressure Lab tabs"
              className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#070c18]/90 p-1.5"
            >
              {MOBILE_TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changeTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex-1 rounded-xl py-2 px-2 text-[10.5px] font-extrabold whitespace-nowrap transition-all ${
                      active ? "text-[#050816]" : "text-slate-300 hover:text-white"
                    }`}
                    style={active ? { background: "var(--pl-accent)" } : undefined}
                  >
                    {t.label}
                    {t.id === "compare" && tray.length > 0 ? ` (${tray.length})` : ""}
                  </button>
                );
              })}
            </nav>

            {tab === "builder" && builderPanel}
            {tab === "rankings" && rankingsWorkspace}
            {tab === "compare" && compareWorkspace}
            {tab === "overview" && overviewWorkspace}
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)] items-start">
            <div className="lg:sticky lg:top-20">{builderPanel}</div>
            <div className="space-y-4 min-w-0">
              {/* Desktop Top Bar: Rankings · Compare · Coverage & Evidence + Active Analysis Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <nav
                  aria-label="Pressure Lab views"
                  className="inline-flex items-center gap-1 rounded-2xl border border-white/12 bg-[#070c18]/90 p-1"
                >
                  {DESKTOP_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => changeTab(t.id)}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                          active ? "text-[#050816]" : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                        }`}
                        style={active ? { background: "var(--pl-accent)" } : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>
                          {t.label}
                          {t.id === "compare" && tray.length > 0 ? ` (${tray.length})` : ""}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                  {result && (
                    <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 max-w-md truncate">
                      {summary(result.query, comps)}
                    </span>
                  )}
                  <CopyLink />
                </div>
              </div>

              <div aria-busy={status.busy}>
                {tab === "rankings" && rankingsWorkspace}
                {tab === "compare" && compareWorkspace}
                {tab === "overview" && overviewWorkspace}
              </div>
            </div>
          </div>
        )}

        {investigationsStrip}
      </div>

      {openRow && result && (
        <Dossier
          row={openRow}
          rank={rankOf.get(openRow.id)!}
          of={result.rows.length}
          bat={bat}
          mobile={mobile}
          inTray={tray.includes(openRow.id)}
          onTray={() => toggleTray(openRow.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

// ── Telemetry Helper Visuals (Strictly Deterministic from Calculated Data) ──

function PlayerChipAvatar({ name, sizeClass = "h-8 w-8" }: { name: string; sizeClass?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`relative inline-grid place-items-center rounded-full overflow-hidden border border-white/15 bg-slate-900 shrink-0 ${sizeClass}`}
      style={{ boxShadow: "0 0 12px -6px var(--pl-accent)" }}
    >
      <span className="font-mono text-[10px] font-black text-slate-300 select-none">{initials || "PL"}</span>
      {!failed && (
        <img
          src={resolvePlayerImage(name)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function TrendSparkline({ points, accent }: { points: { year: number; val: number; balls: number }[]; accent: string }) {
  if (points.length === 0) {
    return <p className="text-xs text-slate-400 py-6 text-center">No seasonal trend sample for current filters.</p>;
  }
  const W = 280;
  const H = 104;
  const padX = 18;
  const padTop = 14;
  const padBot = 22;
  const vals = points.map((p) => p.val);
  const minV = Math.min(...vals, 0);
  const maxV = Math.max(...vals, minV + 10);
  const span = Math.max(1, maxV - minV);
  const xAt = (i: number) => (points.length === 1 ? W / 2 : padX + (i / (points.length - 1)) * (W - padX * 2));
  const yAt = (v: number) => padTop + (1 - (v - minV) / span) * (H - padTop - padBot);

  const linePts = points.map((p, i) => `${xAt(i)},${yAt(p.val)}`).join(" ");
  const areaPts = `${xAt(0)},${H - padBot} ${linePts} ${xAt(points.length - 1)},${H - padBot}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Seasonal pressure trend">
      <defs>
        <linearGradient id="pl-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={padX} y1={yAt(0)} x2={W - padX} y2={yAt(0)} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
      <polygon points={areaPts} fill="url(#pl-trend-fill)" />
      <polyline fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" points={linePts} />
      {points.map((p, i) => {
        const cx = xAt(i);
        const cy = yAt(p.val);
        return (
          <g key={p.year}>
            <circle cx={cx} cy={cy} r="3.8" fill={accent} stroke="#050816" strokeWidth="1.5" />
            <text x={cx} y={H - 5} textAnchor="middle" fontSize="9.5" fill="#94a3b8" fontFamily="monospace">
              {p.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GroundControlDial({
  bdryPct,
  dotPct,
  rotPct,
  posShare,
  accent,
  secondary,
}: {
  bdryPct: number;
  dotPct: number;
  rotPct: number;
  posShare: number;
  accent: string;
  secondary: string;
}) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const bLen = (bdryPct / 100) * C;
  const rLen = (rotPct / 100) * C;
  const dLen = Math.max(0, C - bLen - rLen);

  return (
    <div className="flex items-center gap-3.5">
      <svg viewBox="0 0 96 96" className="w-24 h-24 shrink-0" role="img" aria-label="Scoring vs dot ball distribution">
        <circle cx="48" cy="48" r="44" fill="rgba(6, 32, 24, 0.55)" stroke="rgba(52, 211, 153, 0.2)" strokeWidth="1" />
        <rect x="44" y="34" width="8" height="28" rx="2" fill="rgba(217, 119, 6, 0.45)" stroke="rgba(251, 191, 36, 0.35)" strokeWidth="0.7" />
        <g transform="rotate(-90 48 48)">
          <circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="7"
            strokeDasharray={`${bLen} ${C}`}
          />
          <circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke={secondary}
            strokeWidth="7"
            strokeDasharray={`${rLen} ${C}`}
            strokeDashoffset={-bLen}
          />
          <circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke="rgba(148,163,184,0.38)"
            strokeWidth="7"
            strokeDasharray={`${dLen} ${C}`}
            strokeDashoffset={-(bLen + rLen)}
          />
        </g>
        <text x="48" y="47" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="monospace">
          {Math.round(posShare)}%
        </text>
        <text x="48" y="57" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="monospace">
          +MATCHES
        </text>
      </svg>

      <div className="flex-1 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: accent }} /> Boundary %
          </span>
          <strong className="text-white tabular-nums">{f1(bdryPct)}%</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: secondary }} /> Rotation %
          </span>
          <strong className="text-white tabular-nums">{f1(rotPct)}%</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-400/60" /> Dot Ball %
          </span>
          <strong className="text-white tabular-nums">{f1(dotPct)}%</strong>
        </div>
      </div>
    </div>
  );
}

function summaryScope(q: Query, comps: CompInfo[]) {
  const names = q.comps.map((c) => short(c)).join(" + ");
  return `${names}, ${q.years ? (q.years[0] === q.years[1] ? q.years[0] : `${q.years[0]}–${q.years[1]}`) : "all seasons"}`;
}
function summary(q: Query, comps: CompInfo[]) {
  return `${q.discipline === "bat" ? "Batters" : "Bowlers"} in ${summaryScope(q, comps)} · ${describeGroup(q.where)}`;
}

function Evidence({ e }: { e: ScoredRow["evidence"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        e === "strong"
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "bg-slate-500/15 text-slate-300 border border-white/10"
      }`}
    >
      {e === "strong" ? "Strong" : "Adequate"}
    </span>
  );
}

function ErrorLine({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
      {msg}{" "}
      <button type="button" className="underline font-bold" onClick={retry}>
        Retry
      </button>
    </p>
  );
}

function Empty({ onBuild, busy }: { onBuild: () => void; busy: boolean }) {
  return (
    <div className="pl-card p-6 text-sm text-slate-300" aria-live="polite">
      {busy ? (
        "Analyzing ball-by-ball records…"
      ) : (
        <>
          No analysis loaded yet. Pick a Quick Preset or{" "}
          <button type="button" className="underline font-bold" style={{ color: "var(--pl-accent)" }} onClick={onBuild}>
            open Situation Builder
          </button>
          .
        </>
      )}
    </div>
  );
}

function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(window.location.href).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white transition-colors"
    >
      <Copy className="h-3 w-3" />
      <span>{done ? "Copied!" : "Share"}</span>
    </button>
  );
}

function HowScored({ m, params, custom }: { m?: Methodology; params: Params; custom: boolean }) {
  return (
    <details className="pl-card p-4 text-xs" open>
      <summary className="cursor-pointer font-bold uppercase tracking-wider text-white">How Pressure Scores Are Computed</summary>
      <div className={`mt-2.5 space-y-2 ${MUTED} leading-relaxed`}>
        <p>
          <strong className="text-slate-200">Pressure /100</strong> (<code>contextual_pressure_performance_v1</code>): every ball is compared with the average outcome for the same competition-season, innings, over and wickets down, leaving that match out. Batting: runs above expected minus a dismissal cost; bowling: runs saved plus wickets above expected. A dismissal is worth {params.wicket} runs. Summed per player and shrunk toward 0 by {params.lambdaH} balls.
        </p>
        <p>
          <strong className="text-slate-200">Lift</strong>: pressure score minus the player's score on all their other balls in the same scope. <strong className="text-slate-200">RAS</strong> (<code>reliability_adjusted_score_v1</code>) = Pressure + {params.alpha}·Lift − {params.beta}·SE, where SE is the match-clustered standard error.
        </p>
        {m && !custom && (
          <p>
            Standard parameters were chosen by split-half prediction (odd vs even matches) on{" "}
            {m.selection.scope.comps.map(short).join(" + ")} {m.selection.scope.years.join("–")} (mean Spearman {m.selection.best.mean.toFixed(2)}). Moving a rule threshold one step keeps {Math.min(...m.sensitivity.map((s) => s.overlapTop20))}–{Math.max(...m.sensitivity.map((s) => s.overlapTop20))} of the top 20.
          </p>
        )}
      </div>
    </details>
  );
}

function Explain({ r, rank, of, bat }: { r: ScoredRow; rank: number; of: number; bat: boolean }) {
  const parts = [`Ranked ${rank} of ${of} on RAS.`];
  parts.push(`${r.A >= 0 ? "Beats" : "Falls short of"} context expectation by ${f1(Math.abs(r.A))} runs per 100 ${bat ? "balls" : "deliveries"}`);
  parts.push(`${r.lift >= 0 ? "which is" : "against"} ${f1(Math.abs(r.lift))} ${r.lift >= 0 ? "better than" : "worse than"} their other balls.`);
  parts.push(
    `Positive in ${Math.round(100 * r.positiveShare)}% of ${r.matches} matches (±${f1(r.se)} SE${r.se > Math.abs(r.A) ? ", wider than score" : ""}).`,
  );
  return <p className="text-xs text-slate-300 leading-relaxed">{parts.join(" ")}</p>;
}

function Dossier({
  row: r,
  rank,
  of,
  bat,
  mobile,
  inTray,
  onTray,
  onClose,
}: {
  row: ScoredRow;
  rank: number;
  of: number;
  bat: boolean;
  mobile: boolean;
  inTray: boolean;
  onTray: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const stat = (l: string, v: string, cls = "") => (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <div className={`text-[9.5px] font-mono uppercase ${MUTED}`}>{l}</div>
      <div className={`text-sm font-black font-mono tabular-nums mt-0.5 ${cls}`}>{v}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`${r.name} evidence`}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={`absolute bg-[#070c18] border-white/15 overflow-y-auto pl-scroll p-4 space-y-3.5 text-slate-100 shadow-2xl ${
          mobile ? "inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t" : "right-0 top-0 h-full w-full max-w-md border-l"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src={resolvePlayerImage(r.name)}
              alt=""
              className="h-12 w-12 rounded-full object-cover bg-slate-800 border border-white/15"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            <div>
              <h2 className="text-lg font-black text-white leading-tight">{r.name}</h2>
              <p className={`text-xs ${MUTED}`}>
                {bat ? "Batting" : "Bowling"} · {[r.batHand && `${r.batHand}-hand`, r.bowlType].filter(Boolean).join(" · ") || "type unrecorded"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Explain r={r} rank={rank} of={of} bat={bat} />

        <div className="grid grid-cols-3 gap-2">
          {stat("RAS", signed(r.ras), tone(r.ras))}
          {stat("Pressure /100", signed(r.A), tone(r.A))}
          {stat("Ordinary /100", signed(r.B), tone(r.B))}
          {stat("Lift", signed(r.lift), tone(r.lift))}
          {stat("± SE", f1(r.se), "text-white")}
          {stat("+ Matches", `${Math.round(100 * r.positiveShare)}%`, "text-white")}
          {stat("Balls", String(r.balls), "text-white")}
          {stat("Runs", String(r.runs), "text-white")}
          {stat(bat ? "Outs" : "Wickets", String(r.outs), "text-white")}
          {stat(bat ? "SR" : "Econ", bat ? f1((100 * r.runs) / r.balls) : f1((6 * r.runs) / r.balls), "text-white")}
          {stat("Dot %", f1((100 * r.dots) / r.balls), "text-white")}
          {stat("Bdry %", f1((100 * r.boundaries) / r.balls), "text-white")}
        </div>

        <p className={`text-[11px] ${MUTED}`}>≈95% interval on raw pressure rate: {f1(r.ci[0])} to {f1(r.ci[1])} per 100.</p>
        <Breakdown title="By competition" rows={r.comps.map((c) => [short(c.comp), c.balls, c.per100])} />
        <Breakdown title="By season" rows={r.years.map((y) => [String(y.year), y.balls, y.per100])} />

        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onTray}
            className="rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: "var(--pl-accent)",
              background: inTray ? "var(--pl-accent)" : "color-mix(in srgb, var(--pl-accent) 16%, transparent)",
              color: inTray ? "#050816" : "#fff",
            }}
          >
            {inTray ? "In Comparison ✓" : "+ Add to Comparison"}
          </button>
          <Link
            href={`/players/${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white"
          >
            Player Dossier ↗
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number, number][] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r[2])));
  return (
    <section className="space-y-1.5">
      <h3 className={`text-[10.5px] font-mono font-bold uppercase tracking-wider ${MUTED}`}>
        {title} <span className="font-normal normal-case">(raw, per 100)</span>
      </h3>
      <ul className="space-y-1 text-xs">
        {rows.map(([l, n, v]) => (
          <li key={l} className="grid grid-cols-[7.5rem_1fr_3.2rem_3rem] items-center gap-2 tabular-nums">
            <span className="truncate text-slate-200" title={l}>
              {l}
            </span>
            <span className="relative h-2 rounded bg-white/[0.06]">
              <span
                className={`absolute top-0 h-2 rounded ${v >= 0 ? "left-1/2 bg-emerald-400/75" : "right-1/2 bg-rose-400/75"}`}
                style={{ width: `${(50 * Math.abs(v)) / max}%` }}
              />
            </span>
            <span className={`text-right font-mono ${tone(v)}`}>{signed(v)}</span>
            <span className={`text-right font-mono ${MUTED}`}>{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompareView({
  items,
  names,
  bat,
  mobile,
  query,
  comps,
  onRemove,
}: {
  items: { id: string; row?: ScoredRow }[];
  names: Map<string, string>;
  bat: boolean;
  mobile: boolean;
  query: Query;
  comps: CompInfo[];
  onRemove: (id: string) => void;
}) {
  const rows = items.filter((x): x is { id: string; row: ScoredRow } => !!x.row).map((x) => x.row);
  const missing = items.filter((x) => !x.row).map((x) => x.id);
  const metrics: [string, (r: ScoredRow) => string, ((r: ScoredRow) => number)?][] = [
    ["RAS", (r) => signed(r.ras), (r) => r.ras],
    ["Pressure /100", (r) => signed(r.A), (r) => r.A],
    ["Ordinary /100", (r) => signed(r.B), (r) => r.B],
    ["Lift", (r) => signed(r.lift), (r) => r.lift],
    ["± SE", (r) => f1(r.se)],
    ["≈95% interval", (r) => `${f1(r.ci[0])} to ${f1(r.ci[1])}`],
    ["Positive matches", (r) => `${Math.round(100 * r.positiveShare)}%`],
    ["Balls · matches", (r) => `${r.balls} · ${r.matches}`],
    [bat ? "Strike rate" : "Economy", (r) => (bat ? f1((100 * r.runs) / r.balls) : f1((6 * r.runs) / r.balls))],
    [bat ? "Average" : "Wickets", (r) => (bat ? (r.outs ? f1(r.runs / r.outs) : "–") : String(r.outs))],
    ["Dot %", (r) => f1((100 * r.dots) / r.balls)],
    ["Boundary %", (r) => f1((100 * r.boundaries) / r.balls)],
    ["Competitions", (r) => r.comps.map((c) => `${short(c.comp)} ${c.balls}`).join(", ")],
    ["Evidence", (r) => (r.evidence === "strong" ? "Strong" : "Adequate")],
  ];

  const best = rows.length > 1 ? [...rows].sort((a, b) => b.ras - a.ras) : [];
  const overlap = best.length > 1 && best[0].ci[0] <= best[1].ci[1];
  const compSets = new Set(rows.map((r) => r.comps.map((c) => c.comp).sort().join("+")));

  return (
    <div className="pl-card p-4 space-y-3">
      <p className="text-xs text-slate-300">Identical pressure scope: {summary(query, comps)}</p>
      {missing.length > 0 && (
        <p className="text-xs text-amber-300">
          {missing.map((id) => names.get(id) ?? id).join(", ")} did not qualify under current thresholds.{" "}
          <button type="button" className="underline" onClick={() => missing.forEach(onRemove)}>
            Remove
          </button>
        </p>
      )}
      {compSets.size > 1 && (
        <p className="text-xs text-amber-300">
          Players include different competitions, so league-strength gaps may partially remain.
        </p>
      )}
      {best.length > 1 && (
        <p className="text-xs text-slate-200 font-semibold">
          {overlap
            ? `Close sample: ${best[0].name} & ${best[1].name} confidence intervals overlap.`
            : `${best[0].name} clearly leads with non-overlapping confidence intervals over ${best[1].name}.`}
        </p>
      )}

      {mobile ? (
        <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pl-no-scrollbar px-2 pb-2">
          {rows.map((r) => (
            <article key={r.id} className="w-[78vw] max-w-[300px] shrink-0 snap-center rounded-xl border border-white/12 bg-[#050914] p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={resolvePlayerImage(r.name)}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover bg-slate-800"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  />
                  <strong className="text-xs font-extrabold text-white truncate">{r.name}</strong>
                </div>
                <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onRemove(r.id)} className={MUTED}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <dl className="space-y-1.5 text-xs">
                {metrics.map(([l, fmt]) => (
                  <div key={l} className="flex justify-between gap-2">
                    <dt className={MUTED}>{l}</dt>
                    <dd className="text-right font-mono tabular-nums text-slate-200">{fmt(r)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pl-scroll rounded-xl border border-white/10 bg-[#050914]/70">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.03] text-slate-400 border-b border-white/10">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-right">
                <th className="!text-left font-mono uppercase text-[10.5px]">Metric</th>
                {rows.map((r) => (
                  <th key={r.id}>
                    <span className="inline-flex items-center gap-1.5 font-bold text-white">
                      <img
                        src={resolvePlayerImage(r.name)}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover bg-slate-800"
                        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                      />
                      {r.name}
                    </span>{" "}
                    <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onRemove(r.id)} className="align-middle ml-1 text-slate-400 hover:text-rose-400">
                      <X className="inline h-3.5 w-3.5" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-200">
              {metrics.map(([l, fmt, num]) => {
                const top = num && rows.length > 1 ? Math.max(...rows.map(num)) : null;
                return (
                  <tr key={l} className="[&>td]:px-3 [&>td]:py-2 tabular-nums hover:bg-white/[0.02]">
                    <td className={MUTED}>{l}</td>
                    {rows.map((r) => (
                      <td
                        key={r.id}
                        className={`text-right font-mono ${top !== null && num!(r) === top ? "font-black" : ""}`}
                        style={top !== null && num!(r) === top ? { color: "var(--pl-accent)" } : undefined}
                      >
                        {fmt(r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <Breakdown
          title="Pressure /100 in each player's last three seasons"
          rows={rows.flatMap((r) => r.years.slice(-3).map((y) => [`${r.name} '${String(y.year).slice(2)}`, y.balls, y.per100] as [string, number, number]))}
        />
      )}
    </div>
  );
}
