/**
 * SQUAD DNA — Decision Intelligence OS, Phase 4 (Intelligence)
 * ─────────────────────────────────────────────────────────────────────────────
 * Every franchise-season measured on 38 dimensions of how it actually played,
 * each scored against the same season's league (so eras compare fairly) and
 * placed as a percentile across every IPL team-season. Grouped into a
 * fingerprint, weighted by how strongly each dimension has tracked winning
 * into a vulnerability score, with historical twins and a side-by-side compare.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Dna, GitCompare, Shield, Trophy, Users } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, SectionTitle, Select, Tile } from "@/components/decision/module-shell";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchSquadCompare, fetchSquadProfile, fetchSquadTeams, type DimensionView, type SquadProfile } from "@/lib/sim-api";

const A_COLOR = "#34d399", B_COLOR = "#a78bfa";

export default function SquadDnaPage() {
  const p = readParams();
  const [team, setTeam] = useState(p.get("team") ?? "RCB");
  const [season, setSeason] = useState<number | undefined>(p.get("season") ? Number(p.get("season")) : undefined);
  const [cmp, setCmp] = useState<string | null>(p.get("compare"));
  const [cmpSeason, setCmpSeason] = useState<number | undefined>(p.get("compareSeason") ? Number(p.get("compareSeason")) : undefined);

  const teams = useQuery({ queryKey: ["squad-teams"], queryFn: fetchSquadTeams, staleTime: 60 * 60_000, retry: 1 });
  const profile = useQuery({ queryKey: ["squad", team, season], queryFn: () => fetchSquadProfile(team, season), placeholderData: (x) => x, retry: 1 });
  const compare = useQuery({ queryKey: ["squad-compare", team, season, cmp, cmpSeason], queryFn: () => fetchSquadCompare(team, season, cmp!, cmpSeason), enabled: cmp !== null, placeholderData: (x) => x, retry: 1 });

  const list = teams.data?.teams ?? [];
  const seasonsOf = (t: string) => list.find((x) => x.short === t)?.seasons ?? [];
  const teamOptions = list.map((t) => ({ value: t.short, label: `${t.short} · ${t.franchise}` }));
  const a = profile.data;
  const b = cmp ? compare.data?.b : undefined;

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 4 · Intelligence" title="Squad DNA" tagline="38 dimensions of how a franchise actually played — each judged against its own season's league." icon={<Dna className="w-5 h-5 text-emerald-400" />} />
        {teams.isError && <ErrorBanner error={teams.error} />}
        <Card>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Select label="Franchise" value={team} onChange={(v) => { setTeam(v); setSeason(undefined); writeParams({ team: v, season: null }); }} options={teamOptions.length ? teamOptions : [{ value: team, label: team }]} />
            <Select label="Season" value={season ?? a?.season ?? 0} onChange={(v) => { setSeason(v); writeParams({ season: v }); }} options={seasonsOf(team).map((s) => ({ value: s, label: String(s) }))} />
            <div className="hidden lg:block" />
            {cmp ? (
              <>
                <Select label="Compare with" value={cmp} onChange={(v) => { setCmp(v); setCmpSeason(undefined); writeParams({ compare: v, compareSeason: null }); }} options={teamOptions} />
                <Select label="Season" value={cmpSeason ?? b?.season ?? 0} onChange={(v) => { setCmpSeason(v); writeParams({ compareSeason: v }); }} options={seasonsOf(cmp).map((s) => ({ value: s, label: String(s) }))} />
              </>
            ) : (
              <button onClick={() => { const other = list.find((t) => t.short !== team)?.short ?? "MI"; setCmp(other); writeParams({ compare: other }); }}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm">
                <GitCompare className="w-4 h-4" /> Compare with another team-season
              </button>
            )}
          </div>
          {cmp && <button onClick={() => { setCmp(null); writeParams({ compare: null, compareSeason: null }); }} className="mt-2 text-xs text-muted-foreground hover:text-white">Remove comparison</button>}
        </Card>

        {profile.isError && <ErrorBanner error={profile.error} />}
        {compare.isError && <ErrorBanner error={compare.error} />}
        {profile.isLoading && <Loading label="Measuring every team-season…" />}
        {a && <DnaView a={a} b={b} correlation={cmp ? compare.data?.correlation : undefined} gaps={cmp ? compare.data?.biggestGaps : undefined} loading={profile.isFetching || compare.isFetching}
          onTwin={(t, s) => { setCmp(t); setCmpSeason(s); writeParams({ compare: t, compareSeason: s }); }} />}
      </div>
    </Layout>
  );
}

function DnaView({ a, b, correlation, gaps, loading, onTwin }: { a: SquadProfile; b?: SquadProfile; correlation?: number; gaps?: { label: string; a: number | null; b: number | null; aDisplay: string; bDisplay: string }[]; loading: boolean; onTwin: (team: string, season: number) => void }) {
  const groups = useMemo(() => [...new Set(a.dimensions.map((d) => d.group))], [a]);
  const winPct = a.dimensions.find((d) => d.key === "win_pct");
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/15 to-teal-600/5 p-4">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-center">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-display font-black text-xl"><span style={{ color: A_COLOR }}>●</span> {a.franchise} {a.season}</h2>
              {b && <h2 className="font-display font-black text-lg text-muted-foreground"><span style={{ color: B_COLOR }}>●</span> vs {b.short} {b.season}</h2>}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 min-w-[170px]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vulnerability</div>
                <div className="font-display font-black text-5xl leading-none mt-1 tabular-nums">{a.vulnerability.score}<span className="text-lg text-muted-foreground font-bold">/100</span></div>
                <div className="text-[11px] text-muted-foreground mt-1.5 max-w-[200px]">How far below average it sat on the dimensions most linked with winning</div>
              </div>
              <Tile label="Win %" value={winPct?.display ?? "—"} sub={`${a.matches} matches`} />
              {b && correlation !== undefined && <Tile label="Style correlation" value={correlation.toFixed(2)} sub="+1 same shape · −1 mirror image" />}
            </div>
            {a.vulnerability.exposures.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Exposed on</div>
                {a.vulnerability.exposures.map((e) => <div key={e.label} className="flex justify-between gap-2"><span>{e.label}</span><span className="tabular-nums text-muted-foreground">{e.score}th pct · link to winning r={e.importance.toFixed(2)}</span></div>)}
              </div>
            )}
            {a.strengths.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold"><Shield className="w-3.5 h-3.5" /> Strongest at</div>
                {a.strengths.map((e) => <div key={e.label} className="flex justify-between gap-2"><span>{e.label}</span><span className="tabular-nums text-muted-foreground">{e.score}th pct</span></div>)}
              </div>
            )}
          </div>
          <Radar a={a} b={b} />
        </div>
      </section>

      {gaps && b && (
        <Card>
          <SectionTitle icon={<GitCompare className="w-4 h-4 text-violet-400" />} title="Biggest differences" sub={`${a.short} ${a.season} vs ${b.short} ${b.season}, as percentile scores (higher = better)`} />
          <div className="overflow-x-auto mt-3 -mx-4 px-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground"><th className="text-left py-2 px-2">Dimension</th><th className="text-right py-2 px-2">{a.short} {a.season}</th><th className="text-right py-2 px-2">{b.short} {b.season}</th></tr></thead>
              <tbody>{gaps.map((g) => <tr key={g.label} className="border-b border-white/[0.05] tabular-nums"><td className="py-1.5 px-2">{g.label}</td><td className="py-1.5 px-2 text-right">{g.aDisplay} <span className="text-muted-foreground">({g.a})</span></td><td className="py-1.5 px-2 text-right">{g.bDisplay} <span className="text-muted-foreground">({g.b})</span></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle icon={<Dna className="w-4 h-4 text-emerald-400" />} title="All 38 dimensions" sub="Bar = percentile score among all IPL team-seasons (oriented so right is better) · tick = 50th" />
        <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4 mt-3">
          {groups.map((g) => (
            <div key={g} className="space-y-1.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{g}</div>
              {a.dimensions.filter((d) => d.group === g).map((d) => <DimRow key={d.key} d={d} other={b?.dimensions.find((x) => x.key === d.key)} />)}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">Each dimension is first standardised within its season, so a 2010 run rate is compared with 2010. "r" is how strongly the dimension has moved with win % across all team-seasons — a correlation, not proof of cause. Style dimensions (gray) are neither good nor bad.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Trophy className="w-4 h-4 text-amber-400" />} title="Historical twins" sub="Most similar team-seasons in IPL history (shape of strengths and weaknesses)" />
          <ul className="mt-3 space-y-1.5 text-sm">
            {a.twins.map((t) => (
              <li key={`${t.short}${t.season}`} className="flex items-center gap-2">
                <button onClick={() => onTwin(t.short, t.season)} className="hover:underline font-semibold">{t.franchise} {t.season}</button>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">{t.similarity}% similar · won {t.winPct ?? "—"}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle icon={<Users className="w-4 h-4 text-cyan-400" />} title="Players used" sub={`${a.roster.length} players · by appearances`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {a.roster.map((r) => (
              <Link key={r.playerId} href={`/ai-analyst/player-pool?player=${r.playerId}`} className="px-2 py-0.5 rounded-full text-xs border border-white/10 bg-white/5 hover:border-white/30">
                {r.name} <span className="text-muted-foreground tabular-nums">{r.matches}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs mt-3">
            <Link href={`/ai-analyst/auction-war-room?team=${a.short}`} className="text-green-300 hover:underline">Auction targets for these gaps →</Link>
            <Link href={`/ai-analyst/opposition-map?team=${a.short}`} className="text-rose-300 hover:underline">Opposition briefing →</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DimRow({ d, other }: { d: DimensionView; other?: DimensionView }) {
  const style = d.direction === "style";
  const bar = style ? d.percentile : d.score;
  const obar = other ? (style ? other.percentile : other.score) : null;
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs">
      <span className="truncate" title={`${d.label}${d.best ? ` · best ever: ${d.best.team} ${d.best.season} (${d.best.display})` : ""}`}>{d.label}</span>
      <div className="relative h-3 rounded bg-white/5" aria-hidden>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/25" />
        {bar !== null && <div className="absolute top-0.5 bottom-0.5 left-0 rounded" style={{ width: `${bar}%`, background: style ? "#64748b" : A_COLOR, opacity: 0.85 }} />}
        {obar !== null && obar !== undefined && <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded" style={{ left: `${obar}%`, background: B_COLOR }} />}
      </div>
      <span className="tabular-nums text-right whitespace-nowrap">
        {d.display}
        {d.importance !== null && !style && <span className="text-[10px] text-muted-foreground"> · r {d.importance.toFixed(2)}</span>}
      </span>
    </div>
  );
}

function Radar({ a, b }: { a: SquadProfile; b?: SquadProfile }) {
  const axes = a.fingerprint.filter((f) => f.group !== "Results");
  const N = axes.length, R = 120, cx = 170, cy = 150;
  const pt = (i: number, v: number) => {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(ang) * (v / 100) * R, cy + Math.sin(ang) * (v / 100) * R];
  };
  const poly = (fp: SquadProfile["fingerprint"]) => axes.map((ax, i) => pt(i, fp.find((f) => f.group === ax.group)?.score ?? 0).join(",")).join(" ");
  return (
    <svg viewBox="-75 -6 490 312" className="w-full h-auto max-w-[520px] mx-auto" role="img" aria-label={`Fingerprint of ${a.franchise} ${a.season}${b ? ` and ${b.short} ${b.season}` : ""}`}>
      {[25, 50, 75, 100].map((v) => <polygon key={v} points={axes.map((_, i) => pt(i, v).join(",")).join(" ")} fill="none" stroke={v === 50 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"} />)}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 100);
        const [lx, ly] = pt(i, 118);
        return (
          <g key={ax.group}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />
            <text x={lx} y={ly} fontSize="12" fill="rgba(255,255,255,0.75)" textAnchor={Math.abs(lx - cx) < 10 ? "middle" : lx > cx ? "start" : "end"} dominantBaseline="middle">{ax.group}</text>
          </g>
        );
      })}
      {b && <polygon points={poly(b.fingerprint)} fill={B_COLOR} fillOpacity={0.18} stroke={B_COLOR} strokeWidth={1.5} />}
      <polygon points={poly(a.fingerprint)} fill={A_COLOR} fillOpacity={0.25} stroke={A_COLOR} strokeWidth={2} />
      {axes.map((ax, i) => { const [x, y] = pt(i, ax.score ?? 0); return <circle key={ax.group} cx={x} cy={y} r={2.5} fill={A_COLOR}><title>{`${ax.group}: ${ax.score ?? "—"}`}</title></circle>; })}
      <text x={cx} y={cy - R * 0.5 - 2} fontSize="7" fill="rgba(255,255,255,0.4)" textAnchor="middle">50</text>
    </svg>
  );
}
