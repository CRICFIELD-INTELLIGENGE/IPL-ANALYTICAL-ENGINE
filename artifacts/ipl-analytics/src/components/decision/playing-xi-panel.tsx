/**
 * BUILD PLAYING XI — Decision Intelligence OS, Slice 2
 * ─────────────────────────────────────────────────────────────────────────────
 * Body of the /ai-analyst/playing-xi page (formerly a slide-over drawer).
 * The backend solves a MILP (POST /api/optimizer/playing-xi); this UI turns
 * every user action into a constraint and re-solves:
 *   • drag a bench player onto the XI  → lock them in
 *   • drag an XI player onto the bench → exclude them
 *   • pitch chips, overseas / keeper overrides → re-weight and re-solve
 * When the API is unreachable it renders a bundled demo result instead.
 */

import { Link } from "wouter";
import { SquadIntelligencePanel } from "@/components/intelligence/intel-components";
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Ban, Check, ChevronDown, GripVertical, Loader2, Lock, Plane,
  RotateCcw, Sparkles, Unlock, Users, Zap,
} from "lucide-react";
import {
  fetchFranchises, optimizePlayingXi,
  type PitchType, type PlayerOverride, type PlayingRole, type PlayingXiRequest, type PlayingXiResult, type XiCandidate,
} from "@/lib/decision-api";
import { MOCK_FRANCHISES, MOCK_PLAYING_XI } from "./playing-xi-mock";

const PITCHES: { id: PitchType; label: string; hint: string }[] = [
  { id: "balanced", label: "Balanced", hint: "No adjustment" },
  { id: "batting", label: "Flat deck", hint: "Batting ×1.15, bowlers −0.3 runs/over" },
  { id: "pace", label: "Seaming", hint: "Pacers +0.8 runs/over, spinners −0.5" },
  { id: "spin", label: "Turning", hint: "Spinners +1.0 runs/over, pacers −0.5" },
];

const ROLE_STYLE: Record<PlayingRole, { label: string; cls: string }> = {
  batter: { label: "BAT", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  wicketkeeper: { label: "WK", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  "all-rounder": { label: "AR", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  bowler: { label: "BOWL", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}`;

type DragSource = "xi" | "bench";

export function PlayingXiPanel() {
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [pitch, setPitch] = useState<PitchType>("balanced");
  const [locked, setLocked] = useState<number[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<PlayerOverride[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DragSource | null>(null);

  const franchisesQ = useQuery({
    queryKey: ["optimizer-franchises", season ?? "latest"],
    queryFn: () => fetchFranchises(season),
    retry: 1,
    staleTime: 10 * 60_000,
  });
  const demo = franchisesQ.isError;
  const franchises = demo ? MOCK_FRANCHISES : franchisesQ.data;

  // Default to the first franchise; reset constraints whenever the squad changes.
  useEffect(() => {
    if (!franchises?.franchises.length) return;
    if (teamId === null || !franchises.franchises.some((f) => f.teamId === teamId)) {
      setTeamId(franchises.franchises[0].teamId);
    }
  }, [franchises, teamId]);
  useEffect(() => {
    setLocked([]); setExcluded([]); setOverrides([]); setExpanded(null);
  }, [teamId, season]);

  const request: PlayingXiRequest | null = teamId === null ? null : {
    teamId, season, pitch, lockedIds: locked, excludedIds: excluded, overrides,
  };

  const xiQ = useQuery({
    queryKey: ["playing-xi", request],
    queryFn: () => optimizePlayingXi(request!),
    enabled: !demo && request !== null,
    placeholderData: (prev) => prev,
    retry: 1,
  });
  const result: PlayingXiResult | undefined = demo ? MOCK_PLAYING_XI : xiQ.data;
  const solving = xiQ.isFetching;

  /* ─── Constraint actions ─── */
  const lockIn = (id: number) => { setExcluded((e) => e.filter((x) => x !== id)); setLocked((l) => (l.includes(id) ? l : [...l, id])); };
  const exclude = (id: number) => { setLocked((l) => l.filter((x) => x !== id)); setExcluded((e) => (e.includes(id) ? e : [...e, id])); };
  const release = (id: number) => { setLocked((l) => l.filter((x) => x !== id)); setExcluded((e) => e.filter((x) => x !== id)); };
  const setOverride = (id: number, patch: Omit<PlayerOverride, "playerId">) =>
    setOverrides((os) => [...os.filter((o) => o.playerId !== id), { ...os.find((o) => o.playerId === id), playerId: id, ...patch }]);
  const resetAll = () => { setLocked([]); setExcluded([]); setOverrides([]); setPitch("balanced"); };
  const dirty = locked.length + excluded.length + overrides.length > 0 || pitch !== "balanced";

  /* ─── Drag & drop ─── */
  const onDragStart = (e: DragEvent, id: number, from: DragSource) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, from }));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: DragEvent, to: DragSource) => {
    e.preventDefault();
    setDropTarget(null);
    try {
      const { id, from } = JSON.parse(e.dataTransfer.getData("text/plain")) as { id: number; from: DragSource };
      if (from === to || demo) return;
      if (to === "xi") lockIn(id);
      else exclude(id);
    } catch { /* foreign drag payload */ }
  };
  const dropZone = (zone: DragSource) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); setDropTarget(zone); },
    onDragLeave: () => setDropTarget((z) => (z === zone ? null : z)),
    onDrop: (e: DragEvent) => onDrop(e, zone),
  });

  const team = franchises?.franchises.find((f) => f.teamId === teamId);
  const benchSelectable = useMemo(() => result?.bench.filter((c) => !excluded.includes(c.playerId)) ?? [], [result, excluded]);
  const benchExcluded = useMemo(() => result?.bench.filter((c) => excluded.includes(c.playerId)) ?? [], [result, excluded]);

  return (
        <div className="space-y-5">

          {demo && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Can't reach the optimizer API, so this is a <b>demo result</b> (read-only). Start the api-server to optimize live squads.</span>
            </div>
          )}

          {/* ── Controls ── */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-1.5">
              {franchises?.franchises.map((f) => (
                <button
                  key={f.teamId}
                  onClick={() => setTeamId(f.teamId)}
                  disabled={demo}
                  title={`${f.name} · ${f.squadSize} players used in ${franchises.season}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    f.teamId === teamId ? "bg-violet-500/25 border-violet-400/60 text-white" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/25"
                  }`}
                >
                  {f.shortName || f.name}
                </button>
              ))}
              {franchisesQ.isLoading && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading squads…</span>}
            </div>
            <select
              value={season ?? franchises?.season ?? ""}
              onChange={(e) => setSeason(e.target.value)}
              disabled={demo}
              aria-label="Squad season"
              className="h-8 rounded-lg bg-white/5 border border-white/10 px-2 text-xs"
            >
              {(franchises?.seasons ?? []).map((s) => <option key={s} value={s} className="bg-background">{s} squad</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Pitch</span>
            {PITCHES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPitch(p.id)}
                disabled={demo}
                title={p.hint}
                className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                  pitch === p.id ? "bg-blue-500/20 border-blue-400/60 text-blue-200" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/25"
                }`}
              >
                {p.label}
              </button>
            ))}
            {dirty && !demo && (
              <button onClick={resetAll} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
                <RotateCcw className="w-3 h-3" /> Reset constraints
              </button>
            )}
          </div>

          {/* ── Summary ── */}
          {result && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/15 to-cyan-600/5 p-4">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected impact of this XI</div>
                  <div className="font-display font-black text-3xl gradient-text">
                    {signed(result.objective)} <span className="text-sm font-semibold text-muted-foreground">runs / match</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">vs. an XI of average IPL players · {team?.name ?? result.teamName} · {result.season}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  <Stat label="Overseas" value={`${result.composition.overseas}/${result.constraints.maxOverseas}`} ok={result.composition.overseas <= result.constraints.maxOverseas} />
                  <Stat label="Keepers" value={result.composition.keepers} ok={!result.constraints.requireKeeper || result.composition.keepers >= 1} />
                  <Stat label="Bowling overs" value={`${result.composition.bowlingOvers}/${result.constraints.minBowlingOvers}`} ok={result.composition.bowlingOvers >= result.constraints.minBowlingOvers} />
                  <Stat label="Bowlers" value={result.composition.bowlingOptions} ok={result.composition.bowlingOptions >= result.constraints.minBowlingOptions} />
                  <Stat label="Batters" value={result.composition.battingOptions} ok={result.composition.battingOptions >= result.constraints.minBattingOptions} />
                  <Stat label="Spin / Pace" value={`${result.composition.spinners} / ${result.composition.pacers}`} ok={result.composition.spinners >= result.constraints.minSpinners && result.composition.pacers >= result.constraints.minPacers} />
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                {solving ? <><Loader2 className="w-3 h-3 animate-spin" /> re-solving…</> : <>MILP · {result.solver.variables} candidates · {result.solver.solves} solves · {result.solver.ms} ms</>}
              </div>
            </div>
          )}

          {xiQ.isError && !demo && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">Optimizer error: {(xiQ.error as Error).message}</div>
          )}
          {result && !result.feasible && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              <Ban className="w-4 h-4 shrink-0 mt-0.5" /> <span><b>No valid XI.</b> {result.message}</span>
            </div>
          )}
          {result?.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 text-[11px] text-amber-200/80">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" /> {w}
            </div>
          ))}

          {/* ── XI + Bench ── */}
          {result && (
            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
              <section
                {...dropZone("xi")}
                className={`rounded-2xl border p-3 transition-colors ${dropTarget === "xi" ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <PanelTitle title="Optimized XI" sub="Batting order by balls faced per match · drag to bench to drop a player" />
                <div className="space-y-1.5">
                  {result.xi.map((c, i) => (
                    <PlayerRow
                      key={c.playerId} c={c} index={i + 1} where="xi" demo={demo}
                      expanded={expanded === c.playerId}
                      onExpand={() => setExpanded((e) => (e === c.playerId ? null : c.playerId))}
                      onDragStart={(e) => onDragStart(e, c.playerId, "xi")}
                      isLocked={locked.includes(c.playerId)}
                      onLock={() => (locked.includes(c.playerId) ? release(c.playerId) : lockIn(c.playerId))}
                      onExclude={() => exclude(c.playerId)}
                      onOverride={(patch) => setOverride(c.playerId, patch)}
                    />
                  ))}
                  {!result.xi.length && <p className="text-xs text-muted-foreground py-6 text-center">No XI — adjust constraints.</p>}
                </div>
              </section>

              <div className="space-y-4">
                {(result.impactPlayer.batting || result.impactPlayer.bowling) && (
                  <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.07] p-3">
                    <PanelTitle title="Impact Player" sub="Best 12th man from the bench (respects the overseas cap)" icon={<Zap className="w-3.5 h-3.5 text-fuchsia-300" />} />
                    <div className="space-y-1.5 text-xs">
                      {result.impactPlayer.bowling && <ImpactPick label="Batting first → sub in" c={result.impactPlayer.bowling} metric="bowling" />}
                      {result.impactPlayer.batting && <ImpactPick label="Chasing → sub in" c={result.impactPlayer.batting} metric="batting" />}
                    </div>
                  </div>
                )}

                <section
                  {...dropZone("bench")}
                  className={`rounded-2xl border p-3 transition-colors ${dropTarget === "bench" ? "border-red-400/60 bg-red-500/10" : "border-white/10 bg-white/[0.03]"}`}
                >
                  <PanelTitle title="Bench" sub="Drag onto the XI to force a player in" />
                  <div className="space-y-1.5">
                    {benchSelectable.map((c) => (
                      <PlayerRow
                        key={c.playerId} c={c} where="bench" demo={demo}
                        expanded={expanded === c.playerId}
                        onExpand={() => setExpanded((e) => (e === c.playerId ? null : c.playerId))}
                        onDragStart={(e) => onDragStart(e, c.playerId, "bench")}
                        isLocked={false}
                        onLock={() => lockIn(c.playerId)}
                        onExclude={() => exclude(c.playerId)}
                        onOverride={(patch) => setOverride(c.playerId, patch)}
                      />
                    ))}
                  </div>
                  {benchExcluded.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Excluded by you</div>
                      <div className="flex flex-wrap gap-1.5">
                        {benchExcluded.map((c) => (
                          <button key={c.playerId} onClick={() => release(c.playerId)} title="Make selectable again"
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20">
                            <Ban className="w-3 h-3" /> {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {!result && (franchisesQ.isLoading || xiQ.isLoading) && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Solving the optimal XI…
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <b>Impact</b> = runs above an average IPL player per match from ball-by-ball data: batting (runs vs. league
            rate, minus the cost of getting out) plus bowling (runs saved plus wickets above expectation). Seasons are
            weighted ×0.55 per year back and small samples are pulled toward a below-average prior. <b>Marginal</b> = how
            much the XI's total drops if that player is removed and the solver picks the best replacement.
          </p>
          <SquadIntelligencePanel team={franchises?.franchises.find((f) => f.teamId === teamId)?.shortName ?? null} />
          <p className="text-[10px] text-muted-foreground"><Link href="/ai-analyst/squad-builder" className="text-violet-300 hover:underline">Open the full Squad Builder and model record</Link>. Impact above is match-day selection against an average player; the panel uses runs above replacement for the 2027 squad.</p>
        </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function PanelTitle({ title, sub, icon }: { title: string; sub: string; icon?: ReactNode }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center gap-1.5 font-display font-bold text-sm">{icon}{title}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string | number; ok: boolean }) {
  return (
    <div className={`px-2.5 py-1.5 rounded-xl border text-center min-w-[72px] ${ok ? "border-white/10 bg-white/5" : "border-red-500/40 bg-red-500/10"}`}>
      <div className="font-mono font-bold text-sm flex items-center justify-center gap-1">
        {value}{ok && <Check className="w-3 h-3 text-emerald-400" />}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ImpactPick({ label, c, metric }: { label: string; c: XiCandidate; metric: "batting" | "bowling" }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-semibold truncate">{c.name} {c.overseas && <Plane className="inline w-3 h-3 text-sky-300" />}</div>
      </div>
      <span className="font-mono text-fuchsia-200">{signed(c.impact[metric])} {metric === "batting" ? "bat" : "bowl"}</span>
    </div>
  );
}

function PlayerRow({
  c, index, where, demo, expanded, onExpand, onDragStart, isLocked, onLock, onExclude, onOverride,
}: {
  c: XiCandidate;
  index?: number;
  where: DragSource;
  demo: boolean;
  expanded: boolean;
  onExpand: () => void;
  onDragStart: (e: DragEvent) => void;
  isLocked: boolean;
  onLock: () => void;
  onExclude: () => void;
  onOverride: (patch: { overseas?: boolean; keeper?: boolean }) => void;
}) {
  const role = ROLE_STYLE[c.role];
  return (
    <div
      draggable={!demo}
      onDragStart={onDragStart}
      className={`group rounded-xl border bg-background/40 transition-colors ${isLocked ? "border-emerald-500/40" : "border-white/[0.07] hover:border-white/20"}`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {!demo && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab shrink-0" />}
        {index !== undefined && <span className="w-5 text-center font-mono text-[11px] text-muted-foreground">{index}</span>}
        <button onClick={onExpand} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <span className="font-semibold text-sm truncate">{c.name}</span>
          {c.overseas && <Plane className="w-3 h-3 text-sky-300 shrink-0" aria-label="Overseas" />}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${role.cls}`}>{role.label}</span>
          {c.bowlingCapacity > 0 && (
            <span className={`text-[9px] font-semibold shrink-0 ${c.bowlingType === "spin" ? "text-purple-300" : c.bowlingType === "pace" ? "text-orange-300" : "text-muted-foreground"}`}>
              {c.bowlingType === "unknown" ? "?" : c.bowlingType.toUpperCase()} {c.bowlingCapacity}ov
            </span>
          )}
          {c.confidence === "low" && <span className="text-[9px] text-muted-foreground shrink-0" title="Small sample">low n</span>}
        </button>
        <span className={`font-mono text-xs w-12 text-right ${c.impact.adjusted >= 0 ? "text-emerald-300" : "text-red-300/80"}`} title="Pitch-adjusted impact (runs/match)">
          {signed(c.impact.adjusted)}
        </span>
        {where === "xi" && (
          <span
            className={`font-mono text-[10px] w-11 text-right hidden sm:inline ${c.marginalValue === null && !isLocked ? "text-cyan-300" : "text-muted-foreground"}`}
            title={c.marginalValue !== null ? "Marginal value to this XI" : isLocked ? "Locked by you" : "No valid XI exists without this player"}
          >
            {c.marginalValue !== null ? `Δ${signed(c.marginalValue)}` : isLocked ? "lock" : "must"}
          </span>
        )}
        {!demo && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={onLock} title={isLocked ? "Unlock" : "Lock into XI"} className={`p-1 rounded hover:bg-white/10 ${isLocked ? "text-emerald-300" : "text-muted-foreground"}`}>
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onExclude} title="Exclude from selection" className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-red-300">
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} onClick={onExpand} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 grid sm:grid-cols-2 gap-3 text-[11px] border-t border-white/[0.06]">
              <div className="space-y-1">
                <Line k="Batting impact" v={signed(c.impact.batting)} />
                <Line k="Bowling impact" v={signed(c.impact.bowling)} />
                <Line k="Pitch adjustment" v={signed(c.impact.pitchAdjustment)} />
                <Line k="Balls faced / match" v={c.ballsFacedPerMatch.toFixed(1)} />
                <Line k="Matches this season" v={String(c.matchesThisSeason)} />
              </div>
              <div className="space-y-1.5">
                <div className="text-muted-foreground">{c.fullName ?? c.name} · {c.country ?? "country unknown"}{c.bowlingStyle ? ` · ${c.bowlingStyle}` : ""}</div>
                {!demo && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={c.overseas} onChange={(e) => onOverride({ overseas: e.target.checked })} className="accent-sky-400" />
                      Counts as overseas
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={c.keeper} onChange={(e) => onOverride({ keeper: e.target.checked })} className="accent-cyan-400" />
                      Can keep wicket
                    </label>
                  </>
                )}
                {c.confidence !== "high" && (
                  <div className="flex items-center gap-1 text-amber-200/70"><Sparkles className="w-3 h-3" /> {c.confidence} confidence — limited IPL sample</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
