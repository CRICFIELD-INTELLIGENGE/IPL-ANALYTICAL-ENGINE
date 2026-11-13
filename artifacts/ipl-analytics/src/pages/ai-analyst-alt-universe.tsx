/**
 * ALTERNATE UNIVERSE ENGINE — Decision Intelligence OS, Phase 3 (Simulation)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pick a real innings and an over. From the real state at that moment the
 * rest of the innings is simulated twice with the same random numbers — once
 * with the bowlers who actually bowled, once with the what-if — so the gap is
 * the change, not noise. The re-run is also checked against what happened.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, GitBranch, Play, Target } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, PlayerPicker, SectionTitle, Segmented, Select, Tile, signed } from "@/components/decision/module-shell";
import { LineChart, MatchFinder, PairedHistogram } from "@/components/decision/sim-widgets";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchAltMatch, fetchAltMatches, runAlternate, type AltChange, type AltResult } from "@/lib/sim-api";

type Mode = "swap" | "type" | "none";

export default function AltUniversePage() {
  const p = readParams();
  const [matchId, setMatchId] = useState<string | null>(p.get("match"));
  const [innings, setInnings] = useState<1 | 2>(p.get("inn") === "1" ? 1 : 2);
  const [fromOver, setFromOver] = useState(Number(p.get("from") ?? 15) - 1);
  const [mode, setMode] = useState<Mode>((p.get("mode") as Mode) || "swap");
  const [outId, setOutId] = useState<number | null>(null);
  const [inPlayer, setInPlayer] = useState<{ id: number; name: string } | null>(null);
  const [bowlingType, setBowlingType] = useState("Leg-spin");

  const detail = useQuery({ queryKey: ["alt-match", matchId], queryFn: () => fetchAltMatch(matchId!), enabled: matchId !== null, retry: 1 });
  const inn = detail.data?.innings.find((i) => i.innings === innings) ?? detail.data?.innings[0];
  const lastOver = inn ? Math.max(...inn.overs.map((o) => o.over)) : 19;
  const from = Math.min(fromOver, lastOver);
  const laterBowlers = inn ? [...new Set(inn.overs.filter((o) => o.over >= from).map((o) => o.bowler))] : [];
  const out = outId !== null && laterBowlers.includes(outId) ? outId : laterBowlers[0] ?? null;
  const otherInnings = detail.data?.innings.find((i) => i.innings !== inn?.innings);

  const sim = useMutation({ mutationFn: runAlternate });
  const change: AltChange | null =
    mode === "none" ? { type: "none" }
    : mode === "type" ? { type: "bowling_type", bowlingType }
    : out !== null && inPlayer ? { type: "swap_bowler", out, in: inPlayer.id } : null;

  const run = () => {
    if (!matchId || !inn || !change) return;
    writeParams({ match: matchId, inn: inn.innings, from: from + 1, mode });
    sim.mutate({ matchId, innings: inn.innings, fromOver: from, change, sims: 2000 });
  };

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 3 · Simulation" title="Alternate Universe Engine" tagline="Replay any IPL innings from any over with one thing changed — same dice, so the gap is the change." icon={<GitBranch className="w-5 h-5 text-violet-400" />} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5">
          <Card>
            <SectionTitle icon={<Target className="w-4 h-4 text-violet-400" />} title="1 · Pick a match" sub="Finals and close games first" />
            <div className="mt-3">
              <MatchFinder queryKey="alt-matches" fetcher={(q) => fetchAltMatches(q)} selected={matchId}
                onPick={(m) => { setMatchId(m.matchId); setOutId(null); sim.reset(); writeParams({ match: m.matchId }); }} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<GitBranch className="w-4 h-4 text-violet-400" />} title="2 · Change one thing" sub={detail.data ? `${detail.data.match.title}, ${detail.data.match.season} · ${detail.data.match.result}` : "Pick a match first"} />
            {detail.isFetching && <div className="mt-3"><Loading label="Loading the scorecard…" /></div>}
            {detail.isError && <div className="mt-3"><ErrorBanner error={detail.error} /></div>}
            {inn && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <Segmented label="Innings" value={String(inn.innings) as "1" | "2"} onChange={(v) => { setInnings(Number(v) as 1 | 2); setOutId(null); }}
                    options={detail.data!.innings.map((i) => ({ value: String(i.innings) as "1" | "2", label: `${i.battingTeam} ${i.total}` }))} />
                  <Select label="From over" value={from} onChange={setFromOver} options={inn.overs.map((o) => ({ value: o.over, label: `${o.over + 1} (${o.cumulative - o.runs} before)` }))} />
                </div>
                <Segmented label="What-if" value={mode} onChange={setMode} options={[{ value: "swap", label: "Swap a bowler" }, { value: "type", label: "Only one bowling type" }, { value: "none", label: "Re-run as it was" }]} />
                {mode === "swap" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Select label={`Take off (${inn.bowlingTeam})`} value={out ?? 0} onChange={(v) => setOutId(v)}
                      options={laterBowlers.map((b) => ({ value: b, label: `${inn.bowlers.find((x) => x.playerId === b)?.name ?? b} · ${inn.overs.filter((o) => o.bowler === b && o.over >= from).length} ov left` }))} />
                    <div className="space-y-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bring on (any IPL bowler)</div>
                      {inPlayer ? (
                        <div className="flex items-center gap-2 text-sm"><b>{inPlayer.name}</b><button onClick={() => setInPlayer(null)} className="text-xs text-muted-foreground hover:text-white">change</button></div>
                      ) : (
                        <PlayerPicker placeholder="Search a bowler…" onPick={(id, hit) => typeof id === "number" && setInPlayer({ id, name: hit?.name ?? `#${id}` })} />
                      )}
                      {!inPlayer && otherInnings && (
                        <div className="flex flex-wrap gap-1">
                          {otherInnings.bowlers.slice(0, 6).map((b) => (
                            <button key={b.playerId} onClick={() => setInPlayer({ id: b.playerId, name: b.name })} className="px-2 py-0.5 rounded-full text-[11px] border border-white/10 bg-white/5 text-muted-foreground hover:text-white">{b.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {mode === "type" && (
                  <Select label="Every remaining over bowled by a typical…" value={bowlingType} onChange={setBowlingType} options={detail.data!.bowlingTypes.map((t) => ({ value: t, label: t }))} />
                )}
                <div className="flex items-center gap-3">
                  <button onClick={run} disabled={!change || sim.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-semibold text-white">
                    <Play className="w-4 h-4" /> {sim.isPending ? "Simulating 2,000 × 2…" : "Run both universes"}
                  </button>
                  <Link href={`/match/${matchId}`} className="text-xs text-muted-foreground hover:text-white">Scorecard →</Link>
                </div>
              </div>
            )}
          </Card>
        </div>

        {sim.isError && <ErrorBanner error={sim.error} />}
        {sim.data && <AltView r={sim.data} />}
      </div>
    </Layout>
  );
}

function AltView({ r }: { r: AltResult }) {
  const chase = r.innings === 2;
  const d = r.alternate.meanRuns - r.baseline.meanRuns;
  const wp = r.alternate.winProb - r.baseline.winProb;
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 to-purple-600/5 p-4 space-y-3">
        <p className="text-sm font-semibold">{r.description}</p>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Change in {r.battingTeam}'s total</div>
            <div className="font-display font-black text-5xl leading-none mt-1 tabular-nums">{signed(d)}</div>
            <div className="text-[11px] text-muted-foreground mt-1.5">runs on average, what-if vs the real bowlers</div>
          </div>
          <Tile label={`Win chance · ${chase ? "chase" : r.battingTeam}`} value={`${r.baseline.winProb.toFixed(0)}% → ${r.alternate.winProb.toFixed(0)}%`} sub={`${signed(wp)} pts · ${r.alternate.winProbFor}`} />
          <Tile label="Real bowlers (re-run)" value={`${r.baseline.finalRuns.p50}`} sub={`median; 80% between ${r.baseline.finalRuns.p10}–${r.baseline.finalRuns.p90}`} />
          <Tile label="What-if" value={`${r.alternate.finalRuns.p50}`} sub={`median; 80% between ${r.alternate.finalRuns.p10}–${r.alternate.finalRuns.p90}`} />
          <Tile label="What really happened" value={`${r.actual.runs}/${r.actual.wickets}`} sub={r.actual.result} />
        </div>
        <p className="text-[11px] text-muted-foreground">From over {r.fromOver + 1}: {r.state.runs}/{r.state.wickets}, {r.state.striker} and {r.state.nonStriker} batting{r.state.target ? `, target ${r.state.target}` : ""}. {r.sims.toLocaleString("en-US")} simulations per universe.</p>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<GitBranch className="w-4 h-4 text-violet-400" />} title="Run worms" sub="Cumulative score at the end of each over" />
          <div className="mt-3">
            <LineChart label="Cumulative runs by over" xLabel="over" yLabel="runs" refY={r.state.target ? { y: r.state.target, label: `target ${r.state.target}` } : undefined}
              series={[
                { name: "What really happened", color: "#fbbf24", points: r.actual.worm.filter((w) => w.over > r.fromOver).map((w) => ({ x: w.over, y: w.cumulative })) },
                { name: "Real bowlers, re-run (median)", color: "#94a3b8", dashed: true, points: r.baseline.worm.map((w) => ({ x: w.over, y: w.median })) },
                { name: "What-if (median)", color: "#a78bfa", points: r.alternate.worm.map((w) => ({ x: w.over, y: w.median })) },
              ]} />
          </div>
        </Card>
        <Card>
          <SectionTitle icon={<BarChart3 className="w-4 h-4 text-cyan-400" />} title="Final totals" sub="Both universes on the same bins" />
          <div className="mt-3">
            <PairedHistogram bins={r.histogram.map((b) => ({ from: b.from, to: b.to, a: b.baseline, b: b.alternate }))} aLabel="Real bowlers" bLabel="What-if" marker={{ x: r.actual.runs, label: `actual ${r.actual.runs}` }} />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Target className="w-4 h-4 text-amber-400" />} title="Where the universes split" sub="Overs with the biggest difference" />
          <div className="overflow-x-auto mt-3 -mx-4 px-4">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">{["Over", "Real bowler", "What-if bowler", "Runs", "Wicket chance"].map((h, i) => <th key={h} className={`py-1.5 px-2 font-semibold ${i < 3 ? "text-left" : "text-right"}`}>{h}</th>)}</tr></thead>
              <tbody>
                {r.divergence.map((v) => (
                  <tr key={v.over} className="border-b border-white/[0.05] tabular-nums">
                    <td className="py-1.5 px-2">{v.over}</td><td className="py-1.5 px-2">{v.actualBowler}</td><td className="py-1.5 px-2">{v.alternateBowler}</td>
                    <td className="py-1.5 px-2 text-right">{v.baselineRuns} → <b>{v.alternateRuns}</b></td>
                    <td className="py-1.5 px-2 text-right">{v.baselineWicketProb}% → <b>{v.alternateWicketProb}%</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle icon={<FileText className="w-4 h-4 text-emerald-400" />} title="Why" sub="The records driving the difference" />
          <ul className="mt-3 space-y-1.5 text-xs list-disc pl-4">{r.dossier.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="text-[11px] text-muted-foreground mt-3 border-t border-white/10 pt-2">Model check: {r.modelCheck}</p>
        </Card>
      </div>

      {/* Simulation Result Summary Screen Ad Unit */}
      
    </div>
  );
}
