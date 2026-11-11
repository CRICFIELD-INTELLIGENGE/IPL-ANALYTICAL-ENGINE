import {PreseasonRecruitment} from "@/components/scout/preseason-recruitment";
/**
 * PLAYER POOL GRAPH — Decision Intelligence OS, Phase 4 (Intelligence)
 * ─────────────────────────────────────────────────────────────────────────────
 * Every qualified IPL batter or bowler as a feature vector — role (phase mix,
 * pace or spin) and output measured against the league in the same phases —
 * and the nearest players to any one of them, across eras. Click a node to
 * re-centre the network on that player.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Network, Users } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, PlayerPicker, SectionTitle, Segmented, Tile } from "@/components/decision/module-shell";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchPool, type PoolGraph, type Side } from "@/lib/sim-api";

const QUICK = ["JJ Bumrah", "V Kohli", "RA Jadeja", "AD Russell", "SP Narine", "Rashid Khan", "SA Yadav", "MS Dhoni"];
const PALETTE = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#a3e635", "#fb923c", "#e879f9"];

export default function PlayerPoolPage() {
  const p = readParams();
  const [player, setPlayer] = useState<string>(p.get("player") ?? "JJ Bumrah");
  const [window, setWindow] = useState<"career" | "recent">(p.get("window") === "recent" ? "recent" : "career");
  const [side, setSide] = useState<Side | undefined>((p.get("side") as Side) || undefined);
  const q = useQuery({ queryKey: ["pool", player, window, side], queryFn: () => fetchPool(player, window, side), placeholderData: (prev) => prev, retry: 1 });
  const choose = (x: string | number) => { setPlayer(String(x)); setSide(undefined); writeParams({ player: x, side: null }); };

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 4 · Intelligence" title="Player Pool Graph" tagline="Every IPL player connected by how they actually played — navigate by analogy, across eras." icon={<Network className="w-5 h-5 text-cyan-400" />}>
          <div className="flex flex-wrap gap-2">
            <Segmented label="Window" value={window} onChange={(v) => { setWindow(v); writeParams({ window: v }); }} options={[{ value: "career", label: "Career" }, { value: "recent", label: "Last 3 seasons" }]} />
            <Segmented label="Side" value={q.data?.side ?? "batting"} onChange={(v) => { setSide(v); writeParams({ side: v }); }}
              options={(["batting", "bowling"] as Side[]).map((s) => ({ value: s, label: s === "batting" ? "Batting" : "Bowling", disabled: q.data ? !q.data.sidesAvailable.includes(s) : false }))} />
          </div>
        </ModuleHeader>
        <PreseasonRecruitment team={p.get("team")??undefined} player={player}/>
        <PlayerPicker onPick={choose} quickPicks={QUICK} />
        {q.isError && <ErrorBanner error={q.error} />}
        {q.isLoading && <Loading label="Building the feature space…" />}
        {q.data && <PoolView g={q.data} loading={q.isFetching} onPick={choose} />}
      </div>
    </Layout>
  );
}

function PoolView({ g, loading, onPick }: { g: PoolGraph; loading: boolean; onPick: (id: number | string) => void }) {
  const colors = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of g.nodes) if (!m.has(n.archetype)) m.set(n.archetype, PALETTE[m.size % PALETTE.length]);
    return m;
  }, [g]);
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-600/15 to-blue-600/5 p-4 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display font-black text-xl">{g.center.name}</h2>
          <span className="text-sm" style={{ color: colors.get(g.center.archetype) }}>{g.center.archetype}</span>
          <span className="text-xs text-muted-foreground ml-auto">{g.side} · {g.window === "recent" ? "last 3 seasons" : "career"} · {g.center.span} · {g.center.balls.toLocaleString("en-US")} balls</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {g.center.headline.map((h) => <Tile key={h.label} label={h.label} value={h.value} />)}
          <Tile label="Closest match" value={g.neighbours[0] ? `${g.neighbours[0].similarity}%` : "—"} sub={g.neighbours[0]?.name} />
          <Tile label="Pool" value={String(g.poolSize)} sub={`qualified ${g.side === "batting" ? "batters" : "bowlers"}`} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href={`/ai-analyst/pressure?player=${g.center.playerId}&side=${g.side}`} className="text-fuchsia-300 hover:underline">Pressure genome →</Link>
          <Link href={`/ai-analyst/weakness?player=${g.center.playerId}&side=${g.side}`} className="text-amber-300 hover:underline">Hidden weaknesses →</Link>
          <Link href={`/ai-analyst/auction-war-room?player=${g.center.playerId}`} className="text-green-300 hover:underline">Auction valuation →</Link>
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
        <Card>
          <SectionTitle icon={<Network className="w-4 h-4 text-cyan-400" />} title="Similarity network" sub="Closer = more similar · dashed ring = different era · click to re-centre" />
          <Graph g={g} colors={colors} onPick={onPick} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
            {[...colors.entries()].map(([a, c]) => <span key={a} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{a}</span>)}
          </div>
        </Card>
        <Card>
          <SectionTitle icon={<Fingerprint className="w-4 h-4 text-violet-400" />} title="Feature profile" sub="Standard deviations from the pool average" />
          <ul className="mt-3 space-y-1.5">
            {g.center.features.map((f) => {
              const good = f.better === null ? null : f.better === "high" ? f.z > 0 : f.z < 0;
              const w = Math.min(50, Math.abs(f.z) * 20);
              return (
                <li key={f.label} className="grid grid-cols-[minmax(0,1fr)_120px_64px] items-center gap-2 text-xs">
                  <span className="truncate" title={f.label}>{f.label}</span>
                  <div className="relative h-2 rounded bg-white/5" aria-hidden>
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                    <div className="absolute top-0 bottom-0 rounded" style={{ left: f.z >= 0 ? "50%" : `${50 - w}%`, width: `${w}%`, background: good === null ? "#94a3b8" : good ? "rgba(57,135,229,0.9)" : "rgba(230,103,103,0.9)" }} />
                  </div>
                  <span className="text-right tabular-nums">{f.value}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-2">Blue = better than the pool, red = worse, gray = role (neither). "vs expected" compares with the league in the same phases{g.side === "batting" ? " against the same bowling types" : ""}.</p>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={<Users className="w-4 h-4 text-cyan-400" />} title="Nearest players" sub="Overall = role 45% + output 55%" />
        <div className="overflow-x-auto mt-3 -mx-4 px-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">{["Player", "Overall", "Role", "Output", "Archetype", "Years", "In common", "Biggest difference"].map((h, i) => <th key={h} className={`py-2 px-2 font-semibold whitespace-nowrap ${i >= 1 && i <= 3 ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
            <tbody>
              {g.neighbours.map((n) => (
                <tr key={n.playerId} className="border-b border-white/[0.05] align-top">
                  <td className="py-2 px-2 whitespace-nowrap"><button onClick={() => onPick(n.playerId)} className="font-semibold hover:underline">{n.name}</button></td>
                  <td className="py-2 px-2 text-right tabular-nums font-semibold">{n.similarity}%</td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{n.roleMatch}%</td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{n.outputMatch}%</td>
                  <td className="py-2 px-2 text-xs whitespace-nowrap" style={{ color: colors.get(n.archetype) }}>{n.archetype}</td>
                  <td className="py-2 px-2 text-xs whitespace-nowrap">{n.span}{n.crossEra && <span className="text-amber-300"> · cross-era</span>}</td>
                  <td className="py-2 px-2 text-xs min-w-[200px]">{n.shared.length ? n.shared.join("; ") : <span className="text-muted-foreground">close on everything, nothing extreme</span>}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground min-w-[160px]">{n.differs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Fingerprint className="w-4 h-4 text-emerald-400" />} title="Archetypes in this pool" sub="Rule-based roles from phase mix and output" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
          {g.archetypeCounts.map((a) => (
            <div key={a.archetype} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs">
              <div className="flex justify-between gap-2"><span className="font-semibold">{a.archetype}</span><span className="tabular-nums text-muted-foreground">{a.count}</span></div>
              <div className="text-muted-foreground mt-0.5">{a.examples.map((e, i) => <span key={e}>{i > 0 && ", "}<button onClick={() => onPick(e)} className="hover:text-white hover:underline">{e}</button></span>)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Radial layout: distance from the centre = dissimilarity; neighbours are
 * ordered around the circle so each sits next to the one it is most similar to.
 */
function Graph({ g, colors, onPick }: { g: PoolGraph; colors: Map<string, string>; onPick: (id: number) => void }) {
  const W = 560, H = 420, cx = W / 2, cy = H / 2;
  const layout = useMemo(() => {
    const sim = (a: number, b: number) => g.edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))?.similarity ?? 0;
    const rest = g.nodes.filter((n) => !n.center);
    const order: typeof rest = [];
    let cur = rest[0];
    const left = new Set(rest);
    while (cur) {
      order.push(cur);
      left.delete(cur);
      cur = [...left].sort((a, b) => sim(cur!.id, b.id) - sim(cur!.id, a.id) || b.similarity - a.similarity)[0];
    }
    const minS = Math.min(...rest.map((n) => n.similarity), 100), maxS = Math.max(...rest.map((n) => n.similarity), 0);
    const pos = new Map<number, { x: number; y: number }>([[g.nodes.find((n) => n.center)!.id, { x: cx, y: cy }]]);
    order.forEach((n, i) => {
      const t = maxS === minS ? 0.5 : (maxS - n.similarity) / (maxS - minS);
      const r = 95 + t * 95;
      const ang = (i / order.length) * Math.PI * 2 - Math.PI / 2;
      pos.set(n.id, { x: cx + Math.cos(ang) * r * 1.25, y: cy + Math.sin(ang) * r });
    });
    return pos;
  }, [g, cx, cy]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" role="img" aria-label={`Players most similar to ${g.center.name}`}>
      {g.edges.map((e) => {
        const a = layout.get(e.a), b = layout.get(e.b);
        if (!a || !b) return null;
        const fromCenter = e.a === g.center.playerId || e.b === g.center.playerId;
        return <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={fromCenter ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.1)"} strokeWidth={fromCenter ? Math.max(1, (e.similarity - 30) / 15) : 1} />;
      })}
      {g.nodes.map((n) => {
        const p = layout.get(n.id)!;
        const r = n.center ? 22 : 9 + (n.similarity / 100) * 8;
        const label = n.name.length > 16 ? `${n.name.slice(0, 15)}…` : n.name;
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`} className={n.center ? "" : "cursor-pointer"} onClick={() => !n.center && onPick(n.id)}
            role={n.center ? undefined : "button"} tabIndex={n.center ? undefined : 0} aria-label={n.center ? undefined : `Re-centre on ${n.name}, ${n.similarity}% similar`}
            onKeyDown={(ev) => { if (!n.center && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); onPick(n.id); } }}>
            <title>{`${n.name} · ${n.archetype}${n.center ? "" : ` · ${n.similarity}% similar`}`}</title>
            <circle r={r} fill={colors.get(n.archetype)} fillOpacity={n.center ? 0.95 : 0.8} stroke={n.crossEra ? "#fbbf24" : "rgba(255,255,255,0.6)"} strokeWidth={n.center ? 2 : 1.2} strokeDasharray={n.crossEra ? "3 2" : undefined} />
            {!n.center && <text y={4} textAnchor="middle" fontSize="8" fontWeight="700" fill="#0b1020">{n.similarity}</text>}
            <text y={r + 11} textAnchor="middle" fontSize={n.center ? 12 : 10} fontWeight={n.center ? 800 : 600} fill="rgba(255,255,255,0.9)">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}
