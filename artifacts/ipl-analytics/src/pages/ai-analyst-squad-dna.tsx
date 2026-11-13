import { PreseasonRecruitment } from "@/components/scout/preseason-recruitment";
/**
 * SQUAD DNA — Decision Intelligence OS, Phase 4 (Intelligence)
 * ─────────────────────────────────────────────────────────────────────────────
 * Top: the IPL 2027 squad plan, built from the same CRICFIELD Picks the Retention
 * Room shows (shared rules in lib/retention-summary), so every page agrees.
 * Below: how the franchise actually played — 38 dimensions per team-season, each
 * scored against its own season's league, with historical twins and a compare.
 * The team follows the site-wide selection: a ?team= link sets it, and changing
 * the team in the header (or here) changes it everywhere.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Dna, GitCompare, Shield, Trophy, Users } from "lucide-react";
import { Layout } from "@/components/layout";
import { PlayerAvatar } from "@/components/player-avatar";
import { Card, ErrorBanner, Loading, ModuleHeader, SectionTitle, Select, Tile } from "@/components/decision/module-shell";
import { CategoryTag, LIVE_SEASON } from "@/components/retention/retention-widgets";import { readParams, writeParams, errorText } from "@/lib/discovery-api";
import { fetchSquadCompare, fetchSquadProfile, fetchSquadTeams, money, type DimensionView, type SquadProfile } from "@/lib/sim-api";
import { fetchPicks, type PickRow, type TeamPicks } from "@/lib/retention-api";
import { RETENTION_INDEX_VERSION } from "@/lib/retention-version";
import { fetchTeamReport } from "@/lib/intelligence-api";
import { CALL, callOf, coreFive, firstSentence, genuineDoubt, isCore, likelyReleases, plainAgainst, type Call } from "@/lib/retention-summary";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import { RR_PREDICTIONS, getFranchisePredictions } from "@/lib/franchise-predictions";
import { isTeamCode, TEAM_REGISTRY, useTeamTheme, type TeamCode } from "@/lib/team-context";

const A_COLOR = "#34d399", B_COLOR = "#a78bfa";
const ROLES: [string, string, string][] = [["batter", "Batters", "#38BDF8"], ["wicketkeeper", "Keepers", "#06B6D4"], ["all-rounder", "All-rounders", "#A855F7"], ["bowler", "Bowlers", "#EC4899"]];
const panel = "rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1226]/80 p-5 min-w-0 shadow-sm dark:shadow-none";

const CALL_TONES: Record<Call, string> = {
  retain: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  doubt: "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-500/30",
  release: "bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
  unclear: "bg-slate-50 dark:bg-white/10 text-slate-700 dark:text-white/60 border-slate-200 dark:border-white/10",
};

export default function SquadDnaPage() {
  const p = readParams();
  const { selectedTeam } = useTeamTheme();
  const urlTeam = p.get("team")?.toUpperCase() ?? null;
  // A ?team= link wins, then the site-wide team, then RCB.
  const [team, setTeamState] = useState<string>(urlTeam ?? selectedTeam ?? "RCB");
  const [season, setSeason] = useState<number | undefined>(p.get("season") && p.get("season") !== "2027" ? Number(p.get("season")) : undefined);
  const [cmp, setCmp] = useState<string | null>(p.get("compare"));
  const [cmpSeason, setCmpSeason] = useState<number | undefined>(p.get("compareSeason") ? Number(p.get("compareSeason")) : undefined);

  const pickTeam = (t: string) => {
    setTeamState(t); setSeason(undefined); setCmp(null); setCmpSeason(undefined);
    writeParams({ team: t, season: null, compare: null, compareSeason: null });
  };
  // Changing the team in the site header while here follows it.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (selectedTeam && selectedTeam !== team) pickTeam(selectedTeam);
  }, [selectedTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  const teams = useQuery({ queryKey: ["squad-teams"], queryFn: fetchSquadTeams, staleTime: 60 * 60_000, retry: 1 });
  const profile = useQuery({ queryKey: ["squad", team, season], queryFn: () => fetchSquadProfile(team, season), placeholderData: (x) => x, retry: 1 });
  const compare = useQuery({ queryKey: ["squad-compare", team, season, cmp, cmpSeason], queryFn: () => fetchSquadCompare(team, season, cmp!, cmpSeason), enabled: cmp !== null, placeholderData: (x) => x, retry: 1 });

  const list = teams.data?.teams ?? [];
  const seasonsOf = (t: string) => list.find((x) => x.short === t)?.seasons ?? [];
  const teamOptions = list.map((t) => ({ value: t.short, label: `${t.short} · ${t.franchise}` }));
  const a = profile.data;
  const b = cmp ? compare.data?.b : undefined;
  const theme = isTeamCode(team) ? TEAM_REGISTRY[team] : null;

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0" style={theme ? ({ "--team-accent": theme.accent } as React.CSSProperties) : undefined}>
        <ModuleHeader phase="Phase 4 · Intelligence" title="Squad DNA" tagline="The 2027 squad plan, then how the franchise actually played, season by season." icon={<Dna className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />} />

        <nav aria-label="Franchise" className="-mx-4 overflow-x-auto px-4 py-1 no-scrollbar">
          <div className="flex items-center gap-2 w-max">
            {HUB_TEAMS.map((t) => (
              <button key={t} type="button" aria-pressed={team === t} onClick={() => pickTeam(t)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
                  team === t 
                    ? "btn-dark-pill bg-slate-900 dark:bg-slate-950 border-[var(--team-accent)] text-white ring-2 ring-[var(--team-accent)]/30 shadow-md" 
                    : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/70 hover:border-slate-300 dark:hover:border-white/30 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none"
                }`}>
                <img src={TEAM_REGISTRY[t].logoImg} alt="" className="w-5 h-5 object-contain" /><span className={team === t ? "!text-white" : ""}>{t}</span>
              </button>
            ))}
          </div>
        </nav>

        {isTeamCode(team) ? <SquadPlan team={team} /> : <p className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent p-4 text-sm text-slate-600 dark:text-white/60 shadow-sm dark:shadow-none">{team} no longer plays in the IPL, so there is no 2027 plan. Its history is below.</p>}

        <div className="flex items-center gap-2 pt-2">
          <Dna className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">How {team} actually played</h2>
          <span className="text-[11px] text-slate-500 dark:text-white/45">Measured from ball-by-ball data, one season at a time</span>
        </div>
        {teams.isError && <ErrorBanner error={teams.error} />}
        <Card>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Select label="Season" value={season ?? a?.season ?? 0} onChange={(v) => { setSeason(v); writeParams({ season: v }); }} options={seasonsOf(team).map((s) => ({ value: s, label: String(s) }))} />
            <div className="hidden lg:block" />
            <div className="hidden lg:block" />
            {cmp ? (
              <>
                <Select label="Compare with" value={cmp} onChange={(v) => { setCmp(v); setCmpSeason(undefined); writeParams({ compare: v, compareSeason: null }); }} options={teamOptions} />
                <Select label="Season" value={cmpSeason ?? b?.season ?? 0} onChange={(v) => { setCmpSeason(v); writeParams({ compareSeason: v }); }} options={seasonsOf(cmp).map((s) => ({ value: s, label: String(s) }))} />
              </>
            ) : (
              <button onClick={() => { const other = list.find((t) => t.short !== team)?.short ?? "MI"; setCmp(other); writeParams({ compare: other }); }}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 shadow-sm dark:shadow-none transition-colors">
                <GitCompare className="w-4 h-4" /> Compare with another team-season
              </button>
            )}
          </div>
          {cmp && <button onClick={() => { setCmp(null); writeParams({ compare: null, compareSeason: null }); }} className="mt-2 text-xs text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors">Remove comparison</button>}
        </Card>

        {profile.isError && <ErrorBanner error={profile.error} />}
        {compare.isError && <ErrorBanner error={compare.error} />}
        {profile.isLoading && <Loading label="Measuring every team-season…" />}
        {a && <DnaView a={a} b={b} correlation={cmp ? compare.data?.correlation : undefined} gaps={cmp ? compare.data?.biggestGaps : undefined} loading={profile.isFetching || compare.isFetching}
          onTwin={(t, s) => { setCmp(t); setCmpSeason(s); writeParams({ compare: t, compareSeason: s }); }} />}

        <PreseasonRecruitment team={team} />
      </div>
    </Layout>
  );
}

/** IPL 2027 squad plan: the CRICFIELD Picks verdicts, summarised. Same query key as the Retention Room. */
function SquadPlan({ team }: { team: TeamCode }) {
  const theme = TEAM_REGISTRY[team];
  const q = useQuery({ queryKey: ["retention-picks", team, RETENTION_INDEX_VERSION], queryFn: () => fetchPicks(LIVE_SEASON, team), retry: false, staleTime: 5 * 60_000 });
  const report = useQuery({ queryKey: ["team-intelligence", team], queryFn: () => fetchTeamReport(team), retry: false, staleTime: 5 * 60_000 });
  if (q.isError) return <p className="text-xs text-rose-300">{errorText(q.error)}</p>;
  if (!q.data) return <Loading label={`Reading ${team}'s 2027 picks…`} />;
  const picks: TeamPicks = q.data;
  const rows = [...picks.rows].sort((x, y) => y.index - x.index);
  const by = (c: Call) => rows.filter((p) => callOf(p) === c);
  const stay = by("retain");
  const osStay = stay.filter((p) => p.overseas).length;
  const salary = stay.reduce((s, p) => s + (p.contractLakh ?? 0), 0);
  const unpriced = stay.filter((p) => p.contractLakh === null).length;
  const doubts = genuineDoubt(picks);
  const gaps = report.data?.gaps ?? [];
  return (
    <section className="space-y-5" aria-label={`${team} 2027 squad plan`}>
      <div className={`${panel} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 0% 0%, ${theme.accent}, transparent 55%)` }} />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={theme.logoImg} alt="" className="w-11 h-11 object-contain" />
            <div><div className="text-[10px] font-black uppercase tracking-widest text-[var(--team-accent)]">IPL 2027 · squad plan</div><h2 className="text-xl font-black text-slate-900 dark:text-white">{theme.name}</h2></div>
          </div>
          <Link href={`/retention-room/${team}`} className="text-xs font-bold text-indigo-600 dark:text-violet-300 hover:text-indigo-800 dark:hover:text-white inline-flex items-center gap-1 transition-colors">Same calls as the Retention Room <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {(["retain", "doubt", "release", "unclear"] as const).map((c) => (
            <div key={c} className={`rounded-xl p-3 border shadow-sm dark:shadow-none ${CALL_TONES[c]}`}><div className="text-[10px] font-black uppercase tracking-wider">{CALL[c].label}</div><div className="text-2xl font-black tabular-nums">{by(c).length}</div></div>
          ))}
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
          {([["Indian / overseas kept", `${stay.length - osStay} / ${osStay}`], ["Places left to fill", String(Math.max(0, picks.rules.maxSquad - stay.length))], ["Salary of players kept", `${money(salary)}${unpriced ? ` + ${unpriced} unpriced` : ""}`], ["2027 auction purse", picks.rules.auctionPurseLakh ? money(picks.rules.auctionPurseLakh) : "Not confirmed yet"]] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-3 shadow-sm dark:shadow-none"><div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/45">{k}</div><div className="font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{v}</div></div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={panel}>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Build around · 2028 core</h3>
          <ul className="mt-3 space-y-2.5">{coreFive(picks).map((p) => <PlayerLine key={p.id} p={p} team={team} core={isCore(picks, p.id)} note={firstSentence(p.reason)} />)}</ul>
        </div>
        <div className={panel}>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Most likely released</h3>
          <ul className="mt-3 space-y-2.5">{likelyReleases(picks).map((p) => <PlayerLine key={p.id} p={p} team={team} note={`${plainAgainst(p)}.${p.contractLakh ? ` Frees ${money(p.contractLakh)}.` : ""}`} />)}</ul>
          {!likelyReleases(picks).length && <p className="text-xs text-slate-500 dark:text-white/50 mt-3">No player is in a release tier.</p>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className={panel}>
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Role balance after retentions</h3>
          <p className="text-[10px] text-slate-500 dark:text-white/45 mt-0.5">Players kept, against the whole 2026 squad</p>
          <div className="mt-3 space-y-3">{ROLES.map(([role, label, colour]) => {
            const all = rows.filter((p) => p.role === role), kept = all.filter((p) => callOf(p) === "retain");
            return (
              <div key={role}>
                <div className="flex justify-between text-xs text-slate-700 dark:text-white/80"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: colour }} />{label}</span><span className="tabular-nums text-slate-500 dark:text-white/55">{kept.length} kept of {all.length}</span></div>
                <div className="h-2 mt-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(kept.length / Math.max(1, all.length)) * 100}%`, background: colour }} /></div>
                <div className="flex flex-wrap gap-1 mt-1.5">{all.map((p) => <span key={p.id} title={`${p.category} · ${p.index.toFixed(0)}/100`} className={`px-1.5 py-0.5 rounded text-[10px] border ${CALL_TONES[callOf(p)]}`}>{p.name}</span>)}</div>
              </div>
            );
          })}</div>
        </div>
        <div className={`${panel} space-y-4`}>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Open questions</h3>
            {doubts.length ? <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-white/80">{doubts.map((p) => <li key={p.id}><b className="text-slate-900 dark:text-white">{p.name}</b> <CategoryTag category={p.category} /><span className="block text-slate-500 dark:text-white/55">Salary {p.contractLakh ? money(p.contractLakh) : "n/a"} against an auction value of about {money(p.predictedLakh)}.</span></li>)}</ul> : <p className="text-xs text-slate-500 dark:text-white/50 mt-2">Every call is clear.</p>}
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">Gaps to fill at the auction</h3>
            {gaps.length ? <ul className="mt-2 list-disc pl-4 text-xs text-slate-700 dark:text-white/75 space-y-0.5">{gaps.map((g) => <li key={g}>{g}</li>)}</ul> : <p className="text-xs text-slate-500 dark:text-white/50 mt-2">{report.isLoading ? "Checking the best XII…" : "No role shortage in the current best XII."}</p>}
            {(() => {
              const priorities = getFranchisePredictions(team)?.priorities || (team === "RR" ? RR_PREDICTIONS.priorities : []);
              return priorities.length > 0 ? (
                <>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/50 mt-3">{team} recruitment order</h4>
                  <ol className="list-decimal pl-4 text-xs text-slate-700 dark:text-white/75 space-y-0.5 mt-1">{priorities.map((x: string) => <li key={x}>{x}</li>)}</ol>
                </>
              ) : null;
            })()}
          </div>
          <div className="flex flex-wrap gap-3 text-xs pt-1">
            <Link href={`/ai-analyst/auction-war-room?team=${team}`} className="text-emerald-600 dark:text-emerald-300 font-semibold hover:underline">Auction targets →</Link>
            <Link href="/ai-analyst/playing-xi" className="text-sky-600 dark:text-sky-300 font-semibold hover:underline">Build the playing XI →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayerLine({ p, team, note, core }: { p: PickRow; team: TeamCode; note: string; core?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <PlayerAvatar name={p.name} teamId={team} className="w-8 h-8 rounded-full shrink-0" disableHover />
      <div className="min-w-0 text-xs">
        <div className="flex flex-wrap items-center gap-1.5"><b className="text-slate-900 dark:text-white">{p.name}</b><CategoryTag category={p.category} />{core && <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-300">🔒 CORE</span>}</div>
        <div className="text-[10px] text-slate-500 dark:text-white/45">{p.granularRole}{p.horizon.age !== null ? ` · age ${p.horizon.age}` : ""}{p.contractLakh ? ` · ${money(p.contractLakh)}` : ""}</div>
        <div className="text-[11px] text-slate-600 dark:text-white/70">{note}</div>
      </div>
    </li>
  );
}

function DnaView({ a, b, correlation, gaps, loading, onTwin }: { a: SquadProfile; b?: SquadProfile; correlation?: number; gaps?: { label: string; a: number | null; b: number | null; aDisplay: string; bDisplay: string }[]; loading: boolean; onTwin: (team: string, season: number) => void }) {
  const groups = useMemo(() => [...new Set(a.dimensions.map((d) => d.group))], [a]);
  const winPct = a.dimensions.find((d) => d.key === "win_pct");
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-emerald-500/20 dark:border-white/10 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-600/15 dark:to-teal-600/5 p-4 shadow-sm dark:shadow-none">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-center">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="font-display font-black text-xl text-slate-900 dark:text-white"><span style={{ color: A_COLOR }}>●</span> {a.franchise} {a.season}</h2>
              {b && <h2 className="font-display font-black text-lg text-slate-500 dark:text-muted-foreground"><span style={{ color: B_COLOR }}>●</span> vs {b.short} {b.season}</h2>}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-background/40 px-4 py-3 min-w-[170px] shadow-sm dark:shadow-none">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Vulnerability</div>
                <div className="font-display font-black text-5xl leading-none mt-1 tabular-nums text-slate-900 dark:text-white">{a.vulnerability.score}<span className="text-lg text-slate-400 dark:text-muted-foreground font-bold">/100</span></div>
                <div className="text-[11px] text-slate-600 dark:text-muted-foreground mt-1.5 max-w-[200px]">How far below average it sat on the dimensions most linked with winning</div>
              </div>
              <Tile label="Win %" value={winPct?.display ?? "—"} sub={`${a.matches} matches`} />
              {b && correlation !== undefined && <Tile label="Style correlation" value={correlation.toFixed(2)} sub="+1 same shape · −1 mirror image" />}
            </div>
            {a.vulnerability.exposures.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-300 font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Exposed on</div>
                {a.vulnerability.exposures.map((e) => <div key={e.label} className="flex justify-between gap-2"><span className="text-slate-800 dark:text-slate-200">{e.label}</span><span className="tabular-nums text-slate-500 dark:text-muted-foreground">{e.score}th pct · link to winning r={e.importance.toFixed(2)}</span></div>)}
              </div>
            )}
            {a.strengths.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-semibold"><Shield className="w-3.5 h-3.5" /> Strongest at</div>
                {a.strengths.map((e) => <div key={e.label} className="flex justify-between gap-2"><span className="text-slate-800 dark:text-slate-200">{e.label}</span><span className="tabular-nums text-slate-500 dark:text-muted-foreground">{e.score}th pct</span></div>)}
              </div>
            )}
          </div>
          <Radar a={a} b={b} />
        </div>
      </section>

      {gaps && b && (
        <Card>
          <SectionTitle icon={<GitCompare className="w-4 h-4 text-violet-500 dark:text-violet-400" />} title="Biggest differences" sub={`${a.short} ${a.season} vs ${b.short} ${b.season}, as percentile scores (higher = better)`} />
          <div className="overflow-x-auto mt-3 -mx-4 px-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground"><th className="text-left py-2 px-2">Dimension</th><th className="text-right py-2 px-2">{a.short} {a.season}</th><th className="text-right py-2 px-2">{b.short} {b.season}</th></tr></thead>
              <tbody>{gaps.map((g) => <tr key={g.label} className="border-b border-slate-100 dark:border-white/[0.05] tabular-nums text-slate-800 dark:text-slate-200"><td className="py-1.5 px-2">{g.label}</td><td className="py-1.5 px-2 text-right">{g.aDisplay} <span className="text-slate-400 dark:text-muted-foreground">({g.a})</span></td><td className="py-1.5 px-2 text-right">{g.bDisplay} <span className="text-slate-400 dark:text-muted-foreground">({g.b})</span></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle icon={<Dna className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />} title="All 38 dimensions" sub="Bar = percentile score among all IPL team-seasons (oriented so right is better) · tick = 50th" />
        <div className="grid lg:grid-cols-2 gap-x-6 gap-y-4 mt-3">
          {groups.map((g) => (
            <div key={g} className="space-y-1.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-muted-foreground font-semibold">{g}</div>
              {a.dimensions.filter((d) => d.group === g).map((d) => <DimRow key={d.key} d={d} other={b?.dimensions.find((x) => x.key === d.key)} />)}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-4">Each dimension is first standardised within its season, so a 2010 run rate is compared with 2010. "r" is how strongly the dimension has moved with win % across all team-seasons — a correlation, not proof of cause. Style dimensions (gray) are neither good nor bad.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />} title="Historical twins" sub="Most similar team-seasons in IPL history (shape of strengths and weaknesses)" />
          <ul className="mt-3 space-y-1.5 text-sm">
            {a.twins.map((t) => (
              <li key={`${t.short}${t.season}`} className="flex items-center gap-2">
                <button onClick={() => onTwin(t.short, t.season)} className="hover:underline font-semibold text-slate-900 dark:text-white transition-colors">{t.franchise} {t.season}</button>
                <span className="ml-auto text-xs tabular-nums text-slate-500 dark:text-muted-foreground">{t.similarity}% similar · won {t.winPct ?? "—"}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle icon={<Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />} title="Players used" sub={`${a.roster.length} players · by appearances`} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {a.roster.map((r) => (
              <Link key={r.playerId} href={`/ai-analyst/player-pool?player=${r.playerId}`} className="px-2 py-0.5 rounded-full text-xs border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/30 text-slate-700 dark:text-slate-300 transition-colors">
                {r.name} <span className="text-slate-400 dark:text-muted-foreground tabular-nums">{r.matches}</span>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs mt-3">
            <Link href={`/ai-analyst/auction-war-room?team=${a.short}`} className="text-emerald-600 dark:text-green-300 font-semibold hover:underline">Auction targets for these gaps →</Link>
            <Link href={`/ai-analyst/opposition-map?team=${a.short}`} className="text-rose-600 dark:text-rose-300 font-semibold hover:underline">Opposition briefing →</Link>
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
      <span className="truncate text-slate-800 dark:text-slate-200" title={`${d.label}${d.best ? ` · best ever: ${d.best.team} ${d.best.season} (${d.best.display})` : ""}`}>{d.label}</span>
      <div className="relative h-3 rounded bg-slate-200 dark:bg-white/5" aria-hidden>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400 dark:bg-white/25" />
        {bar !== null && <div className="absolute top-0.5 bottom-0.5 left-0 rounded" style={{ width: `${bar}%`, background: style ? "#64748b" : A_COLOR, opacity: 0.85 }} />}
        {obar !== null && obar !== undefined && <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded" style={{ left: `${obar}%`, background: B_COLOR }} />}
      </div>
      <span className="tabular-nums text-right whitespace-nowrap text-slate-800 dark:text-slate-200">
        {d.display}
        {d.importance !== null && !style && <span className="text-[10px] text-slate-500 dark:text-muted-foreground"> · r {d.importance.toFixed(2)}</span>}
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
    <svg viewBox="-75 -6 490 312" className="w-full h-auto max-w-[520px] mx-auto text-slate-400 dark:text-white/45" role="img" aria-label={`Fingerprint of ${a.franchise} ${a.season}${b ? ` and ${b.short} ${b.season}` : ""}`}>
      {[25, 50, 75, 100].map((v) => (
        <polygon
          key={v}
          points={axes.map((_, i) => pt(i, v).join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          className={v === 50 ? "opacity-35" : "opacity-15"}
        />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 100);
        const [lx, ly] = pt(i, 118);
        return (
          <g key={ax.group}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="opacity-15" />
            <text x={lx} y={ly} fontSize="12" fill="currentColor" className="opacity-90 font-medium" textAnchor={Math.abs(lx - cx) < 10 ? "middle" : lx > cx ? "start" : "end"} dominantBaseline="middle">{ax.group}</text>
          </g>
        );
      })}
      {b && <polygon points={poly(b.fingerprint)} fill={B_COLOR} fillOpacity={0.18} stroke={B_COLOR} strokeWidth={1.5} />}
      <polygon points={poly(a.fingerprint)} fill={A_COLOR} fillOpacity={0.25} stroke={A_COLOR} strokeWidth={2} />
      {axes.map((ax, i) => { const [x, y] = pt(i, ax.score ?? 0); return <circle key={ax.group} cx={x} cy={y} r={2.5} fill={A_COLOR}><title>{`${ax.group}: ${ax.score ?? "—"}`}</title></circle>; })}
      <text x={cx} y={cy - R * 0.5 - 2} fontSize="7" fill="currentColor" className="opacity-50" textAnchor="middle">50</text>
    </svg>
  );
}
