// Interactive pre-retention tools for the Feed category pages. Each one works on the replay snapshot
// (lib/replay.ts): reader choices are saved locally, and real outcomes appear only after the reader reveals them.
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Eye, RotateCcw, Star } from "lucide-react";
import { HUB_TEAMS, type HubPlayer, type HubTeam } from "@/lib/ipl-2027";
import { TEAM_REGISTRY } from "@/lib/team-context";
import { useMatches, normalizeVenueName, venueSlug, venueHref, type MatchSummary } from "@/lib/aggregates";
import { fetchScoutRankings, type Discipline } from "@/lib/scout-api";
import { ACTIVE_CYCLE, ROLES, ROLE_LABEL, crore, useReplay, useReplayPhase, useStored, type Outcome } from "@/lib/replay";

const cycle = ACTIVE_CYCLE;
const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const pill = (on: boolean) => `rounded-lg border px-2.5 py-1 text-xs font-bold ${on ? "border-[#B8F36B] bg-[#B8F36B] text-black" : "border-white/15 text-white/70 hover:border-white/40"}`;
const OUTCOME_STYLE: Record<Outcome, string> = { retained: "text-emerald-400", moved: "text-sky-300", released: "text-red-400" };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Shared frame ───────────────────────────────────────────────────────────────────────────────────
export function ReplayBar() {
  const r = useReplayPhase();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs text-amber-50/90 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-black uppercase tracking-widest text-[10px] text-amber-300">{cycle.label} replay</span>
        <span>
          {r.retentionsRevealed
            ? `Showing what happened${r.auctionRevealed ? " at retentions and the auction" : " at the retention announcement"}.`
            : `Information as it stood on ${fmtDate(cycle.snapshotDate)}, before the official retention announcement.`}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {!r.retentionsRevealed && (
            <button className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 font-bold text-black" onClick={() => r.reveal("retentions")}>
              <Eye className="w-3.5 h-3.5" /> Reveal retentions
            </button>
          )}
          {r.retentionsRevealed && !r.auctionRevealed && (
            <button className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 font-bold text-black" onClick={() => r.reveal("auction")}>
              <Eye className="w-3.5 h-3.5" /> Reveal auction results
            </button>
          )}
          {r.retentionsRevealed && (
            <button className="inline-flex items-center gap-1 rounded-lg border border-amber-300/50 px-2.5 py-1" onClick={r.restart}>
              <RotateCcw className="w-3.5 h-3.5" /> Hide outcomes
            </button>
          )}
          <button className="underline underline-offset-2" onClick={() => setOpen(!open)} aria-expanded={open}>Sources & method</button>
        </div>
      </div>
      {open && (
        <ul className="list-disc pl-4 space-y-1 text-amber-50/75">
          {cycle.notes.map((n) => <li key={n}>{n}</li>)}
          <li>Squad rules: <a className="underline" href={cycle.rules.source} target="_blank" rel="noreferrer">max {cycle.rules.maxSquad} players, {cycle.rules.maxOverseas} overseas</a>; at most {cycle.rules.xiMaxOverseas} overseas players in a playing XI.</li>
          {cycle.purses && <li>Purses after retentions are {cycle.purses.status} figures (<a className="underline" href={cycle.purses.source} target="_blank" rel="noreferrer">source</a>), shown only after you reveal retentions.</li>}
          <li>Your choices are saved only in this browser.</li>
        </ul>
      )}
    </div>
  );
}

function TeamPicker({ team, onPick }: { team: HubTeam; onPick: (t: HubTeam) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a franchise">
      {HUB_TEAMS.map((t) => (
        <button key={t} onClick={() => onPick(t)} aria-pressed={team === t} className={pill(team === t)}>{t}</button>
      ))}
    </div>
  );
}

function Frame({ title, intro, team, onTeam, children, picker = true }: { title: string; intro: string; team: HubTeam; onTeam: (t: HubTeam) => void; children: ReactNode; picker?: boolean }) {
  return (
    <section className="rounded-[20px] border border-[#B8F36B]/25 bg-[#0B1020] p-4 sm:p-5 space-y-4" aria-label={title}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#B8F36B]">Interactive</div>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="text-sm text-white/60 mt-1 max-w-2xl">{intro}</p>
      </div>
      <ReplayBar />
      {picker && <TeamPicker team={team} onPick={onTeam} />}
      {children}
    </section>
  );
}

function useTeam() {
  return useStored<HubTeam>("team", "CSK");
}

function Loading({ r }: { r: { isPending: boolean; unavailable: boolean; squad: HubPlayer[] } }) {
  if (r.unavailable) return <p className="text-sm text-white/50">Squad data is unavailable right now. Try again shortly.</p>;
  if (r.isPending) return <p className="text-sm text-white/50">Loading the {cycle.preSeason} squad…</p>;
  if (r.squad.length === 0) return <p className="text-sm text-white/50">No {cycle.preSeason} squad list found for this franchise.</p>;
  return null;
}

const roleCounts = (players: HubPlayer[]) =>
  ROLES.map((role) => [role, players.filter((p) => p.role === role).length] as const);
const PACE = /fast|medium|seam/i;
const SPIN = /spin|break|orthodox|googly|chinaman|slow left/i;
type Replay = ReturnType<typeof useReplay>;
const batRow = (r: Replay, p: HubPlayer) => r.stats?.batters.find((b) => b.player === p.statsName && b.season === cycle.preSeason);
const bowlRow = (r: Replay, p: HubPlayer) => r.stats?.bowlers.find((b) => b.player === p.statsName && b.season === cycle.preSeason);
/** One-line IPL record for the snapshot season, or a plain statement that there is none. */
export function seasonLine(r: Replay, p: HubPlayer) {
  const bat = batRow(r, p);
  const bowl = bowlRow(r, p);
  return [bat && `${bat.runs} runs @ SR ${bat.sr.toFixed(0)}`, bowl && `${bowl.wickets} wkts @ ${bowl.econ.toFixed(2)}`].filter(Boolean).join(" · ") || `no IPL ${cycle.preSeason} appearances`;
}

/** Squad evaluation in plain counts and named specialists; no composite ratings. */
function SquadEvaluation({ kept }: { kept: HubPlayer[] }) {
  const n = (f: (p: HubPlayer) => boolean) => kept.filter(f).length;
  const bowlers = kept.filter((p) => p.role === "bowler" || p.role === "all-rounder");
  const rows: [string, string, boolean][] = [
    ["Batting depth", `${n((p) => p.role !== "bowler")} who bat (batters, keepers, all-rounders)`, n((p) => p.role !== "bowler") >= 7],
    ["Bowling depth", `${bowlers.length} bowling options · ${bowlers.filter((p) => PACE.test(p.bowlStyle ?? "")).length} pace, ${bowlers.filter((p) => SPIN.test(p.bowlStyle ?? "")).length} spin`, bowlers.length >= 6],
    ["Wicketkeeping", n((p) => p.role === "wicketkeeper") ? `${n((p) => p.role === "wicketkeeper")} keeper(s)` : "No keeper retained", n((p) => p.role === "wicketkeeper") >= 1],
    ["All-rounders", `${n((p) => p.role === "all-rounder")}`, n((p) => p.role === "all-rounder") >= 2],
    ["Indian / overseas", `${n((p) => p.overseas === false)} / ${n((p) => !!p.overseas)} (max ${cycle.rules.maxOverseas} overseas)`, n((p) => !!p.overseas) <= cycle.rules.maxOverseas],
  ];
  return (
    <div className={`${card} space-y-2 text-sm`}>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">Your retained squad</h3>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {rows.map(([k, v, ok]) => (
          <li key={k} className="flex gap-2">
            <span className={ok ? "text-emerald-400" : "text-amber-300"}>{ok ? "●" : "○"}</span>
            <span><span className="text-white/50">{k}:</span> <span className="text-white">{v}</span></span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-white/40">
        Green marks are rough guides for a 25-player squad (seven or more who bat, six or more bowling options, a keeper, two all-rounders), not rules.
        Phase-by-phase coverage isn't shown: the season data has no per-phase ball counts, so a few death-over balls could look like a specialist.
      </p>
    </div>
  );
}

// ── Squad Building: Build Your Retention List ─────────────────────────────────────────────────────
type Call = "retain" | "release";
export function RetentionBuilder({ team: fixed, onTeam }: { team?: HubTeam; onTeam?: (t: HubTeam) => void } = {}) {
  const [stored, setStored] = useTeam();
  const team = fixed ?? stored;
  const r = useReplay(team);
  const [calls, setCalls] = useStored<Record<string, Call>>(`retention:${team}`, {});
  const kept = r.squad.filter((p) => calls[p.id] === "retain");
  const decided = r.squad.filter((p) => calls[p.id]);
  const matched = r.outcomes ? decided.filter((p) => (calls[p.id] === "retain") === (r.outcomes!.get(p.id)?.outcome === "retained")).length : 0;
  const actualKept = r.outcomes ? [...r.outcomes.values()].filter((o) => o.outcome === "retained").length : 0;

  return (
    <Frame title="Build your retention list" intro={`Go through the ${team} squad from IPL ${cycle.preSeason} and decide who stays. Switch to the official outcomes when you're ready to compare.`} team={team} onTeam={onTeam ?? setStored} picker={!fixed}>
      <Loading r={r} />
      {!r.isPending && r.squad.length > 0 && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-center">
            <Stat label="Retained" value={`${kept.length}`} warn={kept.length > cycle.rules.maxSquad} />
            <Stat label="Overseas retained" value={`${kept.filter((p) => p.overseas).length} / ${cycle.rules.maxOverseas}`} warn={kept.filter((p) => p.overseas).length > cycle.rules.maxOverseas} />
            <Stat label="Slots left to fill" value={`${Math.max(0, cycle.rules.maxSquad - kept.length)}`} />
            <Stat label="Decided" value={`${decided.length} / ${r.squad.length}`} />
          </div>
          {kept.length > 0 && <SquadEvaluation kept={kept} />}
          {r.outcomes && (
            <div className={`${card} text-sm`}>
              <b className="text-white">{TEAM_REGISTRY[team].name} retained {actualKept} of {r.squad.length}.</b>{" "}
              {decided.length > 0 ? `Your calls matched ${matched} of ${decided.length} decisions.` : "Make some calls to compare."}
            </div>
          )}
          <ul className="grid gap-2 md:grid-cols-2">
            {r.squad.map((p) => {
              const o = r.outcomes?.get(p.id);
              return (
                <li key={p.id} className={`${card} py-3 flex flex-col gap-2`}>
                  <div className="min-w-0">
                    <Link href={`/players/${p.id}`} className="font-semibold text-white hover:underline">{p.name}</Link>
                    <div className="text-[11px] text-white/50">{team} · {p.role} · {p.country ?? "nationality unlisted"}{p.overseas ? " (overseas)" : ""}</div>
                    <div className="text-[11px] text-white/70">{seasonLine(r, p)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["retain", "release"] as const).map((c) => (
                      <button key={c} onClick={() => setCalls((prev) => ({ ...prev, [p.id]: c }))} aria-pressed={calls[p.id] === c} aria-label={`${c === "retain" ? "Retain" : "Release"} ${p.name}`} className={pill(calls[p.id] === c)}>
                        {c === "retain" ? "Retain" : "Release"}
                      </button>
                    ))}
                    {o && (
                      <span className={`ml-auto text-[10px] font-black uppercase ${OUTCOME_STYLE[o.outcome]}`}>
                        Official: {o.outcome === "moved" ? `moved to ${o.to}` : o.outcome}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="text-xs text-white/50 underline" onClick={() => setCalls({})}>Reset my calls for {team}</button>
        </>
      )}
    </Frame>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`${card} py-3`}>
      <div className={`text-xl font-black ${warn ? "text-red-400" : "text-white"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/45">{label}{warn ? " · over the limit" : ""}</div>
    </div>
  );
}

// ── Storylines: Make Your Predictions ──────────────────────────────────────────────────────────────
interface Prediction { team: HubTeam; retained: number; priority: string; savedAt: string }
export function Predictions() {
  const [team, setTeam] = useTeam();
  const r = useReplay(team);
  const [saved, setSaved] = useStored<Prediction[]>("predictions", []);
  const [retained, setRetained] = useState(15);
  const [priority, setPriority] = useState<string>("bowler");
  const mine = saved.filter((p) => p.team === team);
  const blind = (p: Prediction) => !r.firstRevealAt || p.savedAt < r.firstRevealAt;
  const actualKept = r.outcomes ? [...r.outcomes.values()].filter((o) => o.outcome === "retained").length : null;
  const topRole = useMemo(() => {
    if (!r.buys?.length) return null;
    const by: Record<string, number> = {};
    r.buys.forEach((b) => (by[b.role] = (by[b.role] ?? 0) + b.lakhs));
    return Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  }, [r.buys]);

  return (
    <Frame title="Make your predictions" intro="Call how many players each franchise keeps and where it spends at the auction. Saved predictions are timestamped and can't be edited." team={team} onTeam={setTeam}>
      <div className={`${card} flex flex-wrap items-end gap-4`}>
        <label className="text-xs text-white/60">
          Players {team} will retain
          <input type="number" min={0} max={cycle.rules.maxSquad} value={retained} onChange={(e) => setRetained(Math.max(0, Math.min(cycle.rules.maxSquad, Number(e.target.value) || 0)))}
            className="mt-1 block w-24 rounded-lg border border-white/15 bg-background px-2 py-1.5 text-sm text-white" />
        </label>
        <label className="text-xs text-white/60">
          Biggest auction spend on
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 block rounded-lg border border-white/15 bg-background px-2 py-1.5 text-sm text-white">
            {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-[#B8F36B] px-3 py-1.5 text-xs font-black text-black" onClick={() => setSaved((prev) => [...prev, { team, retained, priority, savedAt: new Date().toISOString() }])}>
          Save prediction
        </button>
      </div>
      {mine.length === 0 ? (
        <p className="text-sm text-white/50">No saved predictions for {team} yet.</p>
      ) : (
        <ul className="space-y-2">
          {mine.map((p) => (
            <li key={p.savedAt} className={`${card} text-sm`}>
              <div className="text-[10px] text-white/40">
                Saved {new Date(p.savedAt).toLocaleString("en-IN")}
                {!blind(p) && <span className="ml-2 text-amber-300">made after you had seen an outcome</span>}
              </div>
              <div className="text-white">
                {p.retained} retained · biggest spend on {ROLE_LABEL[p.priority].toLowerCase()}
              </div>
              {actualKept != null && (
                <div className="text-xs text-white/60 mt-1">
                  Actual: <b className="text-white">{actualKept}</b> retained ({p.retained === actualKept ? "exact" : `off by ${Math.abs(p.retained - actualKept)}`})
                  {topRole && <> · biggest spend on <b className="text-white">{ROLE_LABEL[topRole[0]].toLowerCase()}</b> ({crore(topRole[1])}){topRole[0] === p.priority ? " ✓" : ""}</>}
                  {!r.auctionRevealed && " · reveal auction results to check spending"}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

// ── Auction: Budget Planner ────────────────────────────────────────────────────────────────────────
export function BudgetPlanner() {
  const [team, setTeam] = useTeam();
  const r = useReplay(team);
  const [plan, setPlan] = useStored<{ assumedPurse: number; alloc: Record<string, number> }>(`budget:${team}`, { assumedPurse: 0, alloc: {} });
  const purse = r.purseLakhs ?? plan.assumedPurse;
  const spent = ROLES.reduce((s, role) => s + (plan.alloc[role] ?? 0), 0);
  const actual = useMemo(() => {
    const by: Record<string, number> = {};
    r.buys?.forEach((b) => (by[b.role] = (by[b.role] ?? 0) + b.lakhs));
    return by;
  }, [r.buys]);

  return (
    <Frame title="Auction budget planner" intro="Split a franchise's auction money across roles and see the trade-offs. Official purse figures and your own assumptions are always labelled separately." team={team} onTeam={setTeam}>
      <div className={`${card} text-sm`}>
        {r.purseLakhs != null ? (
          <>Purse available: <b className="text-white">{crore(r.purseLakhs)}</b> <span className="text-[10px] uppercase text-amber-300">{cycle.purses?.status}</span>{" "}
            <a href={cycle.purses?.source} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-0.5">source <ExternalLink className="w-3 h-3" /></a></>
        ) : (
          <label className="flex flex-wrap items-center gap-2 text-white/70">
            The official purse isn't known until retentions are announced. <b className="text-white">Your assumption</b> (₹ Cr):
            <input type="number" min={0} step={0.25} value={plan.assumedPurse / 100 || ""} onChange={(e) => setPlan((prev) => ({ ...prev, assumedPurse: Math.round((Number(e.target.value) || 0) * 100) }))}
              className="w-24 rounded-lg border border-white/15 bg-background px-2 py-1 text-sm text-white" />
          </label>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map((role) => (
          <label key={role} className={`${card} text-xs text-white/60`}>
            {ROLE_LABEL[role]} (₹ Cr, your plan)
            <input type="number" min={0} step={0.25} value={(plan.alloc[role] ?? 0) / 100 || ""} onChange={(e) => setPlan((prev) => ({ ...prev, alloc: { ...prev.alloc, [role]: Math.round((Number(e.target.value) || 0) * 100) } }))}
              className="mt-1 block w-full rounded-lg border border-white/15 bg-background px-2 py-1.5 text-sm text-white" />
            {r.buys && <span className="mt-1 block">Actually spent: <b className="text-white">{crore(actual[role] ?? 0)}</b></span>}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Planned <b className="text-white">{crore(spent)}</b> of {purse ? crore(purse) : "an unset purse"}</span>
        {purse > 0 && <span className={spent > purse ? "text-red-400" : "text-emerald-400"}>{spent > purse ? `${crore(spent - purse)} over budget` : `${crore(purse - spent)} left`}</span>}
        {r.buys && <span className="text-white/60">Actual auction spend: <b className="text-white">{crore(r.buys.reduce((s, b) => s + b.lakhs, 0))}</b> on {r.buys.length} players</span>}
        <button className="ml-auto text-xs text-white/50 underline" onClick={() => setPlan({ assumedPurse: 0, alloc: {} })}>Reset plan</button>
      </div>
      <Link href="/pulse#auction" className="text-xs text-primary">Follow the IPL 2027 auction on Pulse</Link>
    </Frame>
  );
}

// ── Tactics: Build Your Playing XI ─────────────────────────────────────────────────────────────────
export function XiBuilder() {
  const [team, setTeam] = useTeam();
  const r = useReplay(team);
  const [xi, setXi] = useStored<{ order: string[]; captain: string | null }>(`xi:${team}`, { order: [], captain: null });
  const byId = new Map(r.squad.map((p) => [p.id, p]));
  const picked = xi.order.map((id) => byId.get(id)).filter((p): p is HubPlayer => !!p);
  const checks = [
    { ok: picked.length === 11, text: `${picked.length} / 11 players` },
    { ok: picked.filter((p) => p.overseas).length <= cycle.rules.xiMaxOverseas, text: `${picked.filter((p) => p.overseas).length} overseas (max ${cycle.rules.xiMaxOverseas})` },
    { ok: picked.some((p) => p.role === "wicketkeeper"), text: "a wicketkeeper" },
    { ok: picked.filter((p) => p.role === "bowler" || p.role === "all-rounder").length >= 5, text: `${picked.filter((p) => p.role === "bowler" || p.role === "all-rounder").length} bowling options (need 5)` },
  ];
  const toggle = (id: string) =>
    setXi((prev) => ({ order: prev.order.includes(id) ? prev.order.filter((x) => x !== id) : prev.order.length < 11 ? [...prev.order, id] : prev.order, captain: prev.captain === id ? null : prev.captain }));
  const move = (i: number, d: -1 | 1) =>
    setXi((prev) => {
      const o = [...prev.order];
      [o[i], o[i + d]] = [o[i + d], o[i]];
      return { ...prev, order: o };
    });

  return (
    <Frame title="Build your playing XI" intro={`Choose eleven from the ${cycle.preSeason} squad, set the batting order and captain, and check the balance. Numbers are each player's IPL ${cycle.preSeason} season.`} team={team} onTeam={setTeam}>
      <Loading r={r} />
      {!r.isPending && r.squad.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Squad</h3>
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 max-h-[420px] overflow-y-auto">
              {r.squad.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={xi.order.includes(p.id)} onChange={() => toggle(p.id)} disabled={!xi.order.includes(p.id) && xi.order.length >= 11} />
                    <span className="text-white">{p.name}</span>
                    <span className="text-[11px] text-white/45">{p.role}{p.overseas ? " · overseas" : ""}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {checks.map((c) => <li key={c.text} className={c.ok ? "text-emerald-400" : "text-amber-300"}>{c.ok ? "✓" : "•"} {c.text}</li>)}
            </ul>
            <ol className="space-y-1.5">
              {picked.map((p, i) => (
                <li key={p.id} className={`${card} py-2 flex items-center gap-2 text-sm`}>
                  <span className="w-5 text-white/40 font-mono">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="text-white font-semibold">{p.name}</span>{xi.captain === p.id && <span className="ml-1 text-[10px] font-black text-[#B8F36B]">(c)</span>}
                    <span className="block text-[11px] text-white/45">{p.role} · {seasonLine(r, p)}</span>
                  </span>
                  <button aria-label={`Make ${p.name} captain`} onClick={() => setXi((prev) => ({ ...prev, captain: p.id }))} className="text-white/40 hover:text-[#B8F36B]"><Star className="w-4 h-4" /></button>
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-white/40 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                  <button aria-label="Move down" disabled={i === picked.length - 1} onClick={() => move(i, 1)} className="text-white/40 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                </li>
              ))}
            </ol>
            {picked.length === 0 && <p className="text-sm text-white/50">Tick players on the left to build your XI.</p>}
            {picked.length > 0 && <button className="text-xs text-white/50 underline" onClick={() => setXi({ order: [], captain: null })}>Clear XI</button>}
          </div>
        </div>
      )}
    </Frame>
  );
}

// ── Star Watch: Scout Your Next Star ───────────────────────────────────────────────────────────────
const LEAGUES = [["ipl", "IPL"], ["smat", "SMAT"], ["bbl", "BBL"], ["sa20", "SA20"], ["cpl", "CPL"], ["ilt20", "ILT20"]] as const;
interface Shortlisted { id: string; name: string; competition: string; discipline: Discipline }
export function ScoutShortlist() {
  const [discipline, setDiscipline] = useState<Discipline>("batting");
  const [league, setLeague] = useState("smat");
  const [list, setList] = useStored<Shortlisted[]>("shortlist", []);
  const q = useQuery({
    queryKey: ["replay-scout", discipline, league],
    queryFn: () => fetchScoutRankings({ discipline, competitions: league, limit: 12 }),
    staleTime: 300_000,
  });
  const metric = discipline === "batting" ? "strike_rate" : "economy";

  return (
    <section className="rounded-[20px] border border-[#B8F36B]/25 bg-[#0B1020] p-4 sm:p-5 space-y-4" aria-label="Scout your next star">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#B8F36B]">Interactive</div>
        <h2 className="text-xl font-black text-white">Scout your next star</h2>
        <p className="text-sm text-white/60 mt-1 max-w-2xl">Browse the Global Scout Engine's rankings by role and league, open a dossier and build a shortlist.</p>
      </div>
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 text-xs text-amber-50/90">
        Scouting candidates, not confirmed auction registrations. These rankings use every season in the scouting warehouse, including seasons after the {cycle.label} snapshot, so treat this as a demonstration rather than a pre-retention view.
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["batting", "bowling"] as const).map((d) => <button key={d} className={pill(discipline === d)} aria-pressed={discipline === d} onClick={() => setDiscipline(d)}>{d === "batting" ? "Batters" : "Bowlers"}</button>)}
        <span className="w-px bg-white/10 mx-1" />
        {LEAGUES.map(([id, label]) => <button key={id} className={pill(league === id)} aria-pressed={league === id} onClick={() => setLeague(id)}>{label}</button>)}
      </div>
      {q.isPending ? <p className="text-sm text-white/50">Loading rankings…</p>
        : q.isError ? <p className="text-sm text-white/50">The Scout Engine is unavailable right now. Try again shortly.</p>
        : q.data.data.length === 0 ? <p className="text-sm text-white/50">No ranked players for this league and role.</p>
        : (
          <ul className="divide-y divide-white/5 rounded-2xl border border-white/10">
            {q.data.data.map((p) => {
              const on = list.some((s) => s.id === p.cricsheet_id);
              return (
                <li key={p.cricsheet_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <Link href={`/scout/player/${p.cricsheet_id}`} className="font-semibold text-white hover:underline">{p.name}</Link>
                  <span className="text-[11px] text-white/45">{p.role?.label} · {p.seasons.join(", ")} · {p.balls} balls</span>
                  <span className="text-xs text-white/70">{metric.replace("_", " ")} {p.metrics[metric]?.value?.toFixed(metric === "economy" ? 2 : 1) ?? "–"}</span>
                  <button className={`ml-auto ${pill(on)}`} aria-pressed={on} onClick={() => setList((prev) => (on ? prev.filter((s) => s.id !== p.cricsheet_id) : [...prev, { id: p.cricsheet_id, name: p.name, competition: p.competition, discipline }]))}>
                    {on ? "Shortlisted" : "Shortlist"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      {list.length > 0 && (
        <div className={`${card} text-sm space-y-2`}>
          <div className="text-[11px] font-black uppercase tracking-widest text-white/50">Your shortlist</div>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => <Link key={s.id} href={`/scout/player/${s.id}`} className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white hover:border-white/40">{s.name} <span className="text-white/40">{s.competition.toUpperCase()}</span></Link>)}
          </div>
          {(["batting", "bowling"] as const).map((d) => {
            const ids = list.filter((s) => s.discipline === d).map((s) => s.id);
            return ids.length >= 2 ? <Link key={d} href={`/scout/compare?ids=${ids.slice(0, 4).join(",")}&discipline=${d}&phase=all`} className="mr-4 text-xs text-primary">Compare shortlisted {d === "batting" ? "batters" : "bowlers"}</Link> : null;
          })}
          <button className="text-xs text-white/50 underline" onClick={() => setList([])}>Clear shortlist</button>
        </div>
      )}
    </section>
  );
}

// ── Venues: Home-Ground Fit ────────────────────────────────────────────────────────────────────────
const HOME: Record<HubTeam, RegExp> = {
  CSK: /Chidambaram|Chepauk/i, MI: /Wankhede/i, RCB: /Chinnaswamy/i, KKR: /Eden Gardens/i, SRH: /Rajiv Gandhi/i,
  RR: /Sawai Mansingh/i, DC: /Arun Jaitley|Feroz Shah Kotla/i, PBKS: /Mullanpur|Yadavindra|Bindra|Mohali/i, GT: /Narendra Modi|Motera/i, LSG: /Ekana/i,
};
const FIRST = "2023"; // Impact Player era: older seasons played to different rules
const runs = (s?: string) => (s ? parseInt(s, 10) : NaN);
function venueProfile(ms: MatchSummary[]) {
  const decided = ms.filter((m) => m.winner && m.margin);
  const first = decided.map((m) => (/run/i.test(m.margin!) ? (m.winner === m.team1 ? runs(m.team1Score) : runs(m.team2Score)) : (m.winner === m.team1 ? runs(m.team2Score) : runs(m.team1Score)))).filter(Number.isFinite);
  return {
    matches: ms.length,
    avgFirst: first.length ? first.reduce((a, b) => a + b, 0) / first.length : null,
    chaseWin: decided.length ? (decided.filter((m) => /wicket/i.test(m.margin!)).length / decided.length) * 100 : null,
  };
}
export function VenueFit() {
  const [team, setTeam] = useTeam();
  const r = useReplay(team);
  const matches = useMatches();
  const requestedVenue = new URLSearchParams(useSearch()).get("venue");
  const requestedSlug = requestedVenue ? venueSlug(requestedVenue.replace(/-/g, " ")) : "";
  const window_ = useMemo(() => (matches.data ?? []).filter((m) => m.season >= FIRST && m.season <= cycle.preSeason), [matches.data]);
  const home = useMemo(() => window_.filter((m) => requestedSlug ? venueSlug(m.venue) === requestedSlug : HOME[team].test(m.venue)), [window_, team, requestedSlug]);
  const league = useMemo(() => venueProfile(window_), [window_]);
  const ground = useMemo(() => venueProfile(home), [home]);
  const venueName = home[0] ? normalizeVenueName(home[0].venue) : requestedVenue ? normalizeVenueName(requestedVenue.replace(/-/g, " ")) : "Home ground";
  const squadNames = new Set(r.squad.map((p) => p.statsName));
  const batters = (r.stats?.batters ?? []).filter((b) => b.season === cycle.preSeason && squadNames.has(b.player) && b.balls >= 60).sort((a, b) => b.sr - a.sr).slice(0, 5);
  const bowlers = (r.stats?.bowlers ?? []).filter((b) => b.season === cycle.preSeason && squadNames.has(b.player) && b.balls >= 60).sort((a, b) => a.econ - b.econ).slice(0, 5);

  return (
    <Frame title={requestedVenue ? "Selected venue fit" : "Home-ground fit"} intro="How the selected ground has played, alongside franchise player numbers for comparison." team={team} onTeam={setTeam}>
      {home.length > 0 && <Link href={venueHref(venueName)} className="inline-flex items-center gap-2 text-xs font-bold text-sky-300">Open {venueName} venue profile <ExternalLink size={12} /></Link>}
      {matches.isPending ? <p className="text-sm text-white/50">Loading venue history…</p>
        : matches.isError ? <p className="text-sm text-white/50">Venue history is unavailable right now.</p>
        : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 text-center">
              <Stat label={`${venueName} matches, ${FIRST}–${cycle.preSeason}`} value={`${ground.matches}`} />
              <Stat label={`Avg first-innings score (league ${league.avgFirst?.toFixed(0) ?? "–"})`} value={ground.avgFirst?.toFixed(0) ?? "–"} />
              <Stat label={`Chasing side won (league ${league.chaseWin?.toFixed(0) ?? "–"}%)`} value={ground.chaseWin != null ? `${ground.chaseWin.toFixed(0)}%` : "–"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={card}>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Fastest-scoring {team} batters, IPL {cycle.preSeason}</h3>
                {batters.length ? batters.map((b) => <div key={b.player} className="text-sm text-white">{b.player} <span className="text-white/50">SR {b.sr.toFixed(0)} · {b.runs} runs</span></div>) : <p className="text-sm text-white/50">Not enough {cycle.preSeason} data.</p>}
              </div>
              <div className={card}>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-2">Most economical {team} bowlers, IPL {cycle.preSeason}</h3>
                {bowlers.length ? bowlers.map((b) => <div key={b.player} className="text-sm text-white">{b.player} <span className="text-white/50">econ {b.econ.toFixed(2)} · {b.wickets} wkts</span></div>) : <p className="text-sm text-white/50">Not enough {cycle.preSeason} data.</p>}
              </div>
            </div>
            <p className="text-xs text-white/50">
              Method: venue figures use completed IPL matches at the ground from {FIRST} (when the Impact Player rule began) to {cycle.preSeason}; the first-innings score is taken from the side that batted first. Player numbers are their whole IPL {cycle.preSeason} season (minimum 60 balls), not performances at this ground, because player-at-venue splits aren't loaded. Past conditions don't predict future pitches.
            </p>
          </>
        )}
    </Frame>
  );
}

/** The featured interactive for each Feed category. */
export const CATEGORY_TOOL: Record<string, () => ReactNode> = {
  squad: RetentionBuilder,
  auction: BudgetPlanner,
  tactics: XiBuilder,
  stars: ScoutShortlist,
  venues: VenueFit,
  storylines: Predictions,
};
