// Decision Intelligence panels for the existing profile pages. Each panel is
// one request to /api/intel/*, renders nothing while the warehouse API is
// unreachable or has no record, and links into the matching AI Analyst module.

import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Dna, Eye, Gavel, GitBranch, HeartPulse, MapPin, Network, Rewind, Shield, Swords } from "lucide-react";
import { Pill, WinProbChart, signed } from "@/components/decision/module-shell";
import { fetchMatchIntel, fetchPlayerIntel, fetchTeamIntel, fetchVenueIntel, money, type PlayerIntelSide, type VenueProfile } from "@/lib/sim-api";

function Shell({ title, sub, children, className = "" }: { title: string; sub: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-transparent p-4 space-y-3 min-w-0 ${className}`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <BrainCircuit className="w-4 h-4 text-violet-300 self-center" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">{title}</h3>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
      {children}
    </section>
  );
}

const linkCls = "inline-flex items-center gap-1 text-xs hover:underline";

/* ─── Player ─── */

export function PlayerIntelPanel({ player, className }: { player: string | number | null | undefined; className?: string }) {
  const q = useQuery({ queryKey: ["intel-player", player], queryFn: () => fetchPlayerIntel(player!), enabled: Boolean(player), retry: false, staleTime: 10 * 60_000 });
  const d = q.data;
  if (!d || (!d.batting && !d.bowling && !d.auction)) return null;
  const sides = ([["batting", d.batting], ["bowling", d.bowling]] as const).filter(([, s]) => s) as [string, PlayerIntelSide][];
  const a = d.auction;
  return (
    <Shell title="Decision Intelligence" sub="From the ball-by-ball warehouse" className={className}>
      <div className={`grid gap-3 ${sides.length + (a ? 1 : 0) >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {sides.map(([side, s]) => (
          <div key={side} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2 text-xs min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{side}</div>
            {s.pressure && (
              <div className="flex items-baseline gap-2">
                <HeartPulse className="w-3.5 h-3.5 text-fuchsia-400 self-center" />
                <span>Pressure index <b className="text-white text-sm tabular-nums">{s.pressure.index ?? "—"}</b>/100 · {s.pressure.archetype}</span>
              </div>
            )}
            {s.weakness && <div className="flex items-start gap-2"><Eye className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" /><span><b className="text-white">Weak spot:</b> {s.weakness.headline}</span></div>}
            {!s.weakness && s.strength && <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /><span><b className="text-white">Strength:</b> {s.strength.headline}</span></div>}
            {s.pool && (
              <div className="flex items-start gap-2">
                <Network className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span><b className="text-white">{s.pool.archetype}.</b> Most like {s.pool.neighbours.slice(0, 3).map((n) => `${n.name} (${n.similarity}%)`).join(", ")}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={`/ai-analyst/pressure?player=${d.playerId}&side=${side}`} className={`${linkCls} text-fuchsia-300`}>Pressure genome</Link>
              <Link href={`/ai-analyst/weakness?player=${d.playerId}&side=${side}`} className={`${linkCls} text-amber-300`}>Weaknesses</Link>
              <Link href={`/ai-analyst/player-pool?player=${d.playerId}&side=${side}`} className={`${linkCls} text-cyan-300`}>Similar players</Link>
            </div>
          </div>
        ))}
        {a && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2 text-xs min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">Auction value <Pill tone={a.signal === "BUY" ? "good" : a.signal === "AVOID" ? "bad" : a.signal === "SCOUT" ? "info" : "neutral"}>{a.signal}</Pill></div>
            <div className="grid grid-cols-3 gap-2 tabular-nums">
              <div><div className="text-white font-bold text-sm">{money(a.market)}</div><div className="text-muted-foreground">expected price</div></div>
              <div><div className="text-white font-bold text-sm">{money(a.value)}</div><div className="text-muted-foreground">output value</div></div>
              <div><div className="text-white font-bold text-sm">{money(a.maxBid)}</div><div className="text-muted-foreground">max bid</div></div>
            </div>
            <div className="text-muted-foreground">
              {a.iar !== null && <>{signed(a.iar)} runs/match above replacement (data to {a.asOf}). </>}
              {a.lastSale && <>Last auction fee: {a.lastSale.season} {a.lastSale.team} {money(a.lastSale.price)}{a.contract ? ` — ${a.contract.toLowerCase()}` : ""}.</>}
            </div>
            {a.bestFits[0] && <div><b className="text-white">Best fit:</b> {a.bestFits.map((f) => `${f.short} (${f.score})`).join(", ")}</div>}
            <Link href={`/ai-analyst/auction-war-room?player=${d.playerId}`} className={`${linkCls} text-green-300`}><Gavel className="w-3.5 h-3.5" /> War room dossier</Link>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ─── Team ─── */

export function TeamIntelPanel({ team, season, className }: { team: string | null | undefined; season?: number; className?: string }) {
  const q = useQuery({ queryKey: ["intel-team", team, season], queryFn: () => fetchTeamIntel(team!, season), enabled: Boolean(team), retry: false, staleTime: 10 * 60_000 });
  const d = q.data;
  if (!d) return null;
  const fp = d.fingerprint.filter((f) => f.group !== "Results" && f.score !== null);
  return (
    <Shell title={`Squad DNA · ${d.season}`} sub={`${d.matches} matches · each dimension against the ${d.season} league`} className={className}>
      <div className="grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4">
        <div className="space-y-1.5 min-w-0">
          {fp.map((f) => (
            <div key={f.group} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_28px] items-center gap-2 text-xs">
              <span className="truncate">{f.group}</span>
              <div className="relative h-2 rounded bg-white/5" aria-hidden><div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/25" /><div className="h-full rounded bg-emerald-400/80" style={{ width: `${f.score}%` }} /></div>
              <span className="tabular-nums text-right">{f.score}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">Percentile among every IPL team-season; tick = 50th.</p>
        </div>
        <div className="space-y-2 text-xs min-w-0">
          <div><span className="text-muted-foreground">Vulnerability</span> <b className="text-white text-lg tabular-nums">{d.vulnerability.score}</b><span className="text-muted-foreground">/100</span></div>
          {d.vulnerability.exposures.length > 0 && <div><b className="text-rose-300">Exposed:</b> {d.vulnerability.exposures.map((e) => `${e.label} (${e.score}th)`).join("; ")}</div>}
          {d.strengths.length > 0 && <div><b className="text-emerald-300">Strongest:</b> {d.strengths.map((e) => `${e.label} (${e.score}th)`).join("; ")}</div>}
          {d.twins.length > 0 && <div><b className="text-white">Historical twins:</b> {d.twins.map((t) => `${t.short} ${t.season}`).join(", ")}</div>}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={`/ai-analyst/squad-dna?team=${d.short}&season=${d.season}`} className={`${linkCls} text-emerald-300`}><Dna className="w-3.5 h-3.5" /> Full DNA</Link>
            <Link href={`/ai-analyst/auction-war-room?team=${d.short}`} className={`${linkCls} text-green-300`}><Gavel className="w-3.5 h-3.5" /> Auction targets</Link>
            <Link href={`/ai-analyst/opposition-map?team=${d.short}`} className={`${linkCls} text-rose-300`}><Swords className="w-3.5 h-3.5" /> Opposition briefing</Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ─── Venue ─── */

export function VenueIntelPanel({ venue, className }: { venue: string | null | undefined; className?: string }) {
  const q = useQuery({ queryKey: ["intel-venue", venue], queryFn: () => fetchVenueIntel(venue!), enabled: Boolean(venue), retry: false, staleTime: 30 * 60_000 });
  const d = q.data;
  if (!d || !d.allTime.matches) return null;
  const rows: [string, (p: VenueProfile) => string][] = [
    ["Matches", (p) => String(p.matches)],
    ["Avg 1st innings", (p) => p.avgFirstInnings?.toFixed(0) ?? "—"],
    ["Chasing side won", (p) => (p.chasingWinPct === null ? "—" : `${p.chasingWinPct.toFixed(0)}%`)],
    ["Pace economy", (p) => p.paceEconomy?.toFixed(2) ?? "—"],
    ["Spin economy", (p) => p.spinEconomy?.toFixed(2) ?? "—"],
  ];
  return (
    <Shell title="Venue intelligence" sub="Ball-by-ball warehouse" className={className}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead><tr className="text-[10px] uppercase tracking-wider text-muted-foreground"><th className="text-left py-1"><MapPin className="w-3 h-3 inline" /> {d.name}</th><th className="text-right py-1">Last 5 seasons</th><th className="text-right py-1">All seasons</th></tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label} className="border-t border-white/[0.05]"><td className="py-1">{label}</td><td className="py-1 text-right text-white">{d.recent.matches ? f(d.recent) : "—"}</td><td className="py-1 text-right">{f(d.allTime)}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/ai-analyst/strategy-sim?venue=${encodeURIComponent(d.key)}`} className={`${linkCls} text-blue-300`}><Swords className="w-3.5 h-3.5" /> Simulate a chase here</Link>
        <Link href={`/ai-analyst/opposition-map?venue=${encodeURIComponent(d.key)}`} className={`${linkCls} text-rose-300`}>Opposition briefing at this ground</Link>
      </div>
    </Shell>
  );
}

/* ─── Match ─── */

export function MatchIntelPanel({ matchId, className }: { matchId: string | number | null | undefined; className?: string }) {
  const q = useQuery({ queryKey: ["intel-match", matchId], queryFn: () => fetchMatchIntel(matchId!), enabled: matchId !== null && matchId !== undefined, retry: false, staleTime: Infinity });
  const d = q.data;
  if (!d || d.curve.length < 2) return null;
  return (
    <Shell title="Chase win probability" sub={`${d.chasing} chasing ${d.target} · calibrated state model, league-average players`} className={className}>
      <WinProbChart label={`${d.chasing} chance of completing the chase, ball by ball`} points={d.curve} markers={d.turningPoints.map((t) => ({ legal: t.legal, label: t.ball }))} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {d.turningPoints.map((t) => (
          <div key={t.legal} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs">
            <div className="font-semibold tabular-nums">Ball {t.ball}{t.event ? ` · ${t.event === "W" ? "wicket" : t.event}` : ""}</div>
            <div className={`tabular-nums ${t.swing < 0 ? "text-rose-300" : "text-sky-300"}`}>{signed(t.swing)} pts → {t.winProb.toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {d.replayable && <Link href={`/ai-analyst/decision-replay?match=${d.match.matchId}`} className={`${linkCls} text-indigo-300`}><Rewind className="w-3.5 h-3.5" /> Replay the captain's decisions</Link>}
        <Link href={`/ai-analyst/alt-universe?match=${d.match.matchId}`} className={`${linkCls} text-violet-300`}><GitBranch className="w-3.5 h-3.5" /> Alternate universe</Link>
      </div>
    </Shell>
  );
}
