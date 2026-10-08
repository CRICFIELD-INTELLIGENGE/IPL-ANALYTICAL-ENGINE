/**
 * OPPOSITION EXPLOIT MAP — Decision Intelligence OS, Phase 3 (Simulation)
 * ─────────────────────────────────────────────────────────────────────────────
 * A pre-match briefing for one franchise against another from both squads'
 * real records: each opposition batter's sharpest tested weakness, a spin
 * matchup grid, death-overs threats, our bowling rotation planned against
 * their order, a full-match simulation for the toss call, and context.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Flame, Map as MapIcon, MapPin, RotateCw, Swords, Users } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, Pill, SectionTitle, Select, Tile } from "@/components/decision/module-shell";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchCatalog, fetchOpposition, type BatterBrief, type OppositionReport } from "@/lib/sim-api";
import { AdVessel } from "@/components/ad-vessel";

export default function OppositionMapPage() {
  const p = readParams();
  const [team, setTeam] = useState(p.get("team") ?? "RCB");
  const [opponent, setOpponent] = useState(p.get("opp") ?? (team === "CSK" ? "MI" : "CSK"));
  const [venue, setVenue] = useState(p.get("venue") ?? "");
  const [season, setSeason] = useState<number | null>(p.get("season") ? Number(p.get("season")) : null);

  const catalog = useQuery({ queryKey: ["decision-catalog"], queryFn: fetchCatalog, staleTime: 60 * 60_000, retry: 1 });
  const seasonValue = season ?? catalog.data?.latestSeason ?? 2026;
  const report = useQuery({
    queryKey: ["opposition", team, opponent, venue, seasonValue],
    queryFn: () => fetchOpposition(team, opponent, venue || undefined, seasonValue),
    enabled: team !== opponent && Boolean(catalog.data),
    retry: 1,
    staleTime: 10 * 60_000,
  });
  const set = (k: string, v: string | number | null) => writeParams({ [k]: v });
  const active = (catalog.data?.franchises ?? []).filter((f) => f.active);
  const teamOptions = active.map((f) => ({ value: f.short, label: `${f.short} · ${f.name}` }));

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 3 · Simulation" title="Opposition Exploit Map" tagline="A pre-match briefing built from both squads' IPL records — traps, matchups, rotation and the toss call." icon={<MapIcon className="w-5 h-5 text-rose-400" />} />
        {catalog.isError && <ErrorBanner error={catalog.error} />}
        <Card>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Select label="Your team" value={team} onChange={(v) => { setTeam(v); set("team", v); }} options={teamOptions.length ? teamOptions : [{ value: team, label: team }]} />
            <Select label="Opponent" value={opponent} onChange={(v) => { setOpponent(v); set("opp", v); }} options={teamOptions.length ? teamOptions : [{ value: opponent, label: opponent }]} />
            <Select label="Venue" value={venue} onChange={(v) => { setVenue(v); set("venue", v || null); }} options={[{ value: "", label: "Neutral" }, ...(catalog.data?.venues ?? []).filter((v) => v.lastSeason >= seasonValue - 3).slice(0, 30).map((v) => ({ value: v.key, label: v.name }))]} />
            <Select label="Squads from" value={seasonValue} onChange={(v) => { setSeason(v); set("season", v); }} options={(catalog.data?.seasons ?? [seasonValue]).slice(0, 8).map((s) => ({ value: s, label: `IPL ${s}` }))} />
          </div>
          {team === opponent && <p className="text-xs text-rose-300 mt-2">Pick two different franchises.</p>}
        </Card>

        {report.isFetching && !report.data && <Loading label="Scanning their batters and simulating the match…" />}
        {report.isError && <ErrorBanner error={report.error} />}
        {report.data && <Briefing r={report.data} loading={report.isFetching} />}
      </div>
    </Layout>
  );
}

const VULN_TONE: Record<string, string> = {
  High: "bg-[rgba(230,103,103,0.55)] text-white",
  Med: "bg-[rgba(230,103,103,0.22)] text-rose-100",
  Low: "bg-[rgba(57,135,229,0.3)] text-sky-100",
  "—": "bg-white/[0.03] text-muted-foreground",
};

function Briefing({ r, loading }: { r: OppositionReport; loading: boolean }) {
  const w = r.winProbability;
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-rose-600/15 to-pink-600/5 p-4 space-y-3">
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.team} win chance</div>
            <div className="font-display font-black text-5xl leading-none mt-1 tabular-nums">{w.overall.toFixed(0)}<span className="text-lg text-muted-foreground font-bold">%</span></div>
            <div className="text-[11px] text-muted-foreground mt-1.5">{w.sims.toLocaleString("en-US")} simulated matches each way</div>
          </div>
          <Tile label="Batting first" value={`${w.battingFirst.toFixed(0)}%`} sub={`median ${w.medianTotalBattingFirst} vs their ${w.medianOppTotalBattingFirst}`} />
          <Tile label="Chasing" value={`${w.chasing.toFixed(0)}%`} />
          <Tile label="Toss" value={w.toss} />
          <Tile label="Head to head" value={`${r.headToHead.won}–${r.headToHead.lost}`} sub={`${r.headToHead.played} played · last 3 seasons ${r.headToHead.recentWon}/${r.headToHead.recentPlayed}`} />
        </div>
        <ul className="text-sm space-y-1 list-disc pl-5">{r.tacticalOverview.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <Card>
        <SectionTitle icon={<Crosshair className="w-4 h-4 text-rose-400" />} title={`${r.opponent} batters`} sub="Likely order · each batter's sharpest tested weakness (last three seasons)" />
        <div className="overflow-x-auto mt-3 -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["#", "Batter", "Balls", "SR", "Trap", "SR in trap", "Usually out", "Plan"].map((h, i) => <th key={h} className={`py-2 px-2 font-semibold whitespace-nowrap ${i === 1 || i >= 4 ? "text-left" : "text-right"}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.batters.map((b) => <BatterRow key={b.playerId} b={b} />)}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">A trap is shown only when it can be acted on (a bowling type or an over window) and survives a multiple-comparison test; "—" means nothing reliable was found.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Users className="w-4 h-4 text-amber-400" />} title="Spin grid" sub="Vulnerability by spin type, against each batter's own record" />
          <div className="overflow-x-auto mt-3 -mx-4 px-4">
            <table className="w-full text-xs border-separate border-spacing-1">
              <thead><tr className="text-[10px] uppercase tracking-wider text-muted-foreground"><th className="text-left font-semibold">Batter</th>{["Leg-spin", "Left-arm orthodox", "Off-spin"].map((h) => <th key={h} className="font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {r.batters.map((b) => (
                  <tr key={b.playerId}>
                    <td className="pr-2 whitespace-nowrap">{b.name}</td>
                    {(["Leg-spin", "Left-arm orthodox", "Off-spin"] as const).map((t) => {
                      const c = b.spin[t];
                      return (
                        <td key={t} className={`rounded-md px-2 py-1.5 text-center tabular-nums ${VULN_TONE[c.vulnerability]}`} title={`${c.balls} balls · SR ${c.sr ?? "—"} · out every ${c.ballsPerOut ?? "—"} balls`}>
                          {c.vulnerability === "—" ? (c.balls ? `${c.balls}b` : "—") : `${c.vulnerability} · ${c.sr ?? "—"}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">High/Med = scoring rate or dismissal rate clearly worse than the batter's overall; Low = no weakness; "—" = under 12 balls. Cell text: strike rate.</p>
        </Card>
        <Card>
          <SectionTitle icon={<Flame className="w-4 h-4 text-orange-400" />} title="Death-overs threats" sub="Their highest-impact finishers, overs 16–20" />
          <ul className="mt-3 space-y-2">
            {r.deathThreats.map((d) => (
              <li key={d.playerId} className="text-xs">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link href={`/ai-analyst/weakness?player=${d.playerId}&window=recent&side=batting`} className="font-semibold text-sm hover:underline">{d.name}</Link>
                  <span className="text-muted-foreground tabular-nums">death SR {d.deathSR} · {d.deathBalls} balls · {d.boundaryPct}% boundaries · vs pace {d.vsPaceSR ?? "—"} · vs spin {d.vsSpinSR ?? "—"}</span>
                </div>
                <div className="text-muted-foreground mt-0.5">{d.counter}</div>
              </li>
            ))}
            {!r.deathThreats.length && <li className="text-xs text-muted-foreground">No batter with enough death-overs balls.</li>}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={<RotateCw className="w-4 h-4 text-emerald-400" />} title={`${r.team} bowling rotation`} sub="Planned over by over against their likely order (4-over cap, no back-to-back overs)" />
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {r.rotation.map((ph) => (
            <div key={ph.phase} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-baseline justify-between"><span className="font-semibold text-sm">{ph.phase}</span><span className="text-[11px] text-muted-foreground">overs {ph.overs} · exp. econ {ph.expectedEconomy.toFixed(2)}</span></div>
              <ul className="text-xs space-y-0.5">{ph.bowlers.map((b) => <li key={b.playerId} className="flex justify-between gap-2"><span>{b.name} <span className="text-muted-foreground">· {b.type}</span></span><span className="tabular-nums">{b.overs} ov</span></li>)}</ul>
              <p className="text-[11px] text-muted-foreground">{ph.mission}</p>
            </div>
          ))}
        </div>
      </Card>

      {r.venueProfile && (
        <Card>
          <SectionTitle icon={<MapPin className="w-4 h-4 text-cyan-400" />} title={r.venue ?? "Venue"} sub="Last five seasons at this ground" />
          <div className="flex flex-wrap gap-3 mt-3">
            <Tile label="Matches" value={String(r.venueProfile.matches)} />
            <Tile label="Avg 1st innings" value={r.venueProfile.avgFirstInnings?.toFixed(0) ?? "—"} />
            <Tile label="Chasing wins" value={r.venueProfile.chasingWinPct !== null ? `${r.venueProfile.chasingWinPct.toFixed(0)}%` : "—"} />
            <Tile label="Pace economy" value={r.venueProfile.paceEconomy?.toFixed(2) ?? "—"} />
            <Tile label="Spin economy" value={r.venueProfile.spinEconomy?.toFixed(2) ?? "—"} />
          </div>
        </Card>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        <Link href={`/ai-analyst/strategy-sim?bat=${r.opponent}&bowl=${r.team}`} className="inline-flex items-center gap-1 text-blue-300 hover:underline"><Swords className="w-3.5 h-3.5" /> Simulate defending against {r.opponent}</Link>
        <Link href={`/ai-analyst/squad-dna?team=${r.team}&compare=${r.opponent}`} className="inline-flex items-center gap-1 text-emerald-300 hover:underline">Compare squad DNA →</Link>
      </div>

      {/* Simulation Result Summary Screen Ad Unit */}
      <div className="pt-2">
        <div className="text-center mb-1">
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">ADVERTISEMENT</span>
        </div>
        <AdVessel slot="1029485739" format="horizontal" minHeight={90} label="Pre-Match Tactical Exploit Briefing" />
      </div>
    </div>
  );
}

function BatterRow({ b }: { b: BatterBrief }) {
  return (
    <tr className="border-b border-white/[0.05] tabular-nums align-top">
      <td className="py-2 px-2 text-right text-muted-foreground">{b.position}</td>
      <td className="py-2 px-2 text-left whitespace-nowrap">
        <Link href={`/ai-analyst/weakness?player=${b.playerId}&window=recent&side=batting`} className="font-semibold hover:underline">{b.name}</Link>
        <div className="h-1 mt-1 rounded bg-white/5 w-20 overflow-hidden" title={`Vulnerability index ${b.vulnerabilityIndex}`}><div className="h-full bg-rose-400/80" style={{ width: `${b.vulnerabilityIndex}%` }} /></div>
      </td>
      <td className="py-2 px-2 text-right">{b.balls}</td>
      <td className="py-2 px-2 text-right">{b.strikeRate?.toFixed(1) ?? "—"}</td>
      <td className="py-2 px-2 text-left">{b.trap ? <span className="inline-flex items-center gap-1.5">{b.trap} <Pill tone={b.trapSignificant ? "bad" : "neutral"}>{b.trapConfidence}%</Pill></span> : <span className="text-muted-foreground">—</span>}</td>
      <td className="py-2 px-2 text-left">{b.srInTrap?.toFixed(1) ?? "—"}</td>
      <td className="py-2 px-2 text-left text-muted-foreground">{b.dismissalWindow ?? "—"}</td>
      <td className="py-2 px-2 text-left text-xs min-w-[180px]">{b.exploit ?? <span className="text-muted-foreground">Bowl to the plan for this phase</span>}</td>
    </tr>
  );
}
