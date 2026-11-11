/**
 * STRATEGY SIMULATOR — Decision Intelligence OS, Phase 3 (Simulation)
 * ─────────────────────────────────────────────────────────────────────────────
 * You are bowling, defending a target. Set the chase state; the engine plays
 * out the rest of the innings thousands of times from ball-outcome tables and
 * each player's own IPL record, under three bowling plans, and ranks the
 * next-over options. A league-average baseline and real chases from similar
 * positions sit alongside so the simulation can be sanity-checked.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, History, Play, Shield, Swords, Users, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, NumberField, Pill, SectionTitle, Select, Tile } from "@/components/decision/module-shell";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchCatalog, fetchStrategySetup, runStrategy, type PlanResult, type StrategyResult } from "@/lib/sim-api";
import { AdVessel } from "@/components/ad-vessel";
import { askGeminiAnalyst } from "@/lib/gemini-client";

export default function StrategySimPage() {
  const p = readParams();
  const [bat, setBat] = useState(p.get("bat") ?? "GT");
  const [bowl, setBowl] = useState(p.get("bowl") ?? "RCB");
  const [season, setSeason] = useState<number | null>(p.get("season") ? Number(p.get("season")) : null);
  const [venue, setVenue] = useState(p.get("venue") ?? "");
  const [target, setTarget] = useState(Number(p.get("target") ?? 201));
  const [runs, setRuns] = useState(Number(p.get("runs") ?? 120));
  const [over, setOver] = useState(Number(p.get("over") ?? 14));
  const [ballInOver, setBallInOver] = useState(Number(p.get("ball") ?? 0));
  const [wickets, setWickets] = useState(Number(p.get("wkts") ?? 3));
  const [striker, setStriker] = useState<number | null>(null);
  const [nonStriker, setNonStriker] = useState<number | null>(null);
  const [attack, setAttack] = useState<number[] | null>(null);

  const catalog = useQuery({ queryKey: ["decision-catalog"], queryFn: fetchCatalog, staleTime: 60 * 60_000, retry: 1 });
  const seasonValue = season ?? catalog.data?.latestSeason ?? 2026;
  const setup = useQuery({
    queryKey: ["strategy-setup", bat, bowl, seasonValue],
    queryFn: () => fetchStrategySetup(bat, bowl, seasonValue),
    enabled: bat !== bowl && Boolean(catalog.data),
    retry: 1,
  });

  // New squads → reset the picks to the likely XI / attack.
  useEffect(() => {
    if (!setup.data) return;
    const order = setup.data.batting.likelyOrder;
    setStriker(order[Math.min(wickets, order.length - 1)] ?? null);
    setNonStriker(order[Math.min(wickets + 1, order.length - 1)] ?? null);
    setAttack(setup.data.bowling.likelyAttack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.data]);

  const sim = useMutation({ mutationFn: runStrategy });
  const balls = over * 6 + ballInOver;
  const valid = bat !== bowl && runs < target && balls < 120 && (attack?.length ?? 0) >= 2;

  const run = () => {
    writeParams({ bat, bowl, season: season ?? undefined, venue: venue || null, target, runs, over, ball: ballInOver, wkts: wickets });
    const order = setup.data?.batting.likelyOrder ?? [];
    sim.mutate({
      battingTeam: bat, bowlingTeam: bowl, season: seasonValue, venue: venue || undefined,
      target, runs, balls, wickets,
      striker: striker ?? undefined, nonStriker: nonStriker ?? undefined,
      battingOrder: order.length ? order : undefined,
      attack: attack ?? undefined, sims: 2000,
    });
  };

  const active = (catalog.data?.franchises ?? []).filter((f) => f.active);
  const teamOptions = (active.length ? active : catalog.data?.franchises ?? []).map((f) => ({ value: f.short, label: `${f.short} · ${f.name}` }));
  const batters = setup.data?.batting.players ?? [];

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-6xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 3 · Simulation" title="Strategy Simulator" tagline="You're bowling, defending a total. Set the chase; the engine plays it out thousands of times under three plans." icon={<Swords className="w-5 h-5 text-blue-400" />} />

        {catalog.isError && <ErrorBanner error={catalog.error} />}

        <Card>
          <SectionTitle icon={<Shield className="w-4 h-4 text-blue-400" />} title="Match situation" sub="Second innings, from the fielding captain's side" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            <Select label="Chasing" value={bat} onChange={setBat} options={teamOptions.length ? teamOptions : [{ value: bat, label: bat }]} />
            <Select label="Defending (you)" value={bowl} onChange={setBowl} options={teamOptions.length ? teamOptions : [{ value: bowl, label: bowl }]} />
            <Select label="Squads from" value={seasonValue} onChange={(v) => setSeason(v)} options={(catalog.data?.seasons ?? [seasonValue]).slice(0, 8).map((s) => ({ value: s, label: `IPL ${s}` }))} />
            <Select label="Venue" value={venue} onChange={setVenue} options={[{ value: "", label: "Neutral" }, ...(catalog.data?.venues ?? []).filter((v) => v.lastSeason >= seasonValue - 3).slice(0, 30).map((v) => ({ value: v.key, label: v.name }))]} className="col-span-2" />
            <NumberField label="Target" value={target} onChange={setTarget} min={50} max={300} />
            <NumberField label="Score" value={runs} onChange={setRuns} min={0} max={299} />
            <Select label="Overs bowled" value={over} onChange={setOver} options={Array.from({ length: 20 }, (_, i) => ({ value: i, label: String(i) }))} />
            <Select label="+ balls" value={ballInOver} onChange={setBallInOver} options={[0, 1, 2, 3, 4, 5].map((b) => ({ value: b, label: String(b) }))} />
            <Select label="Wickets down" value={wickets} onChange={setWickets} options={Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }))} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 tabular-nums">
            {bat} need <b className="text-white">{Math.max(0, target - runs)}</b> off <b className="text-white">{120 - balls}</b> balls
            {120 - balls > 0 && <> · required rate {(((target - runs) / (120 - balls)) * 6).toFixed(2)}</>}
            {runs >= target && <span className="text-rose-300"> · the score must be below the target</span>}
            {bat === bowl && <span className="text-rose-300"> · pick two different teams</span>}
          </p>

          {setup.isFetching && <div className="mt-3"><Loading label="Loading squads…" /></div>}
          {setup.isError && <div className="mt-3"><ErrorBanner error={setup.error} /></div>}
          {setup.data && (
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">At the crease ({bat})</div>
                <div className="grid grid-cols-2 gap-2">
                  <Select label="Striker" value={striker ?? 0} onChange={(v) => setStriker(v || null)} options={batters.map((b) => ({ value: b.playerId, label: `${b.name} (#${b.avgPosition})` }))} />
                  <Select label="Non-striker" value={nonStriker ?? 0} onChange={(v) => setNonStriker(v || null)} options={batters.map((b) => ({ value: b.playerId, label: `${b.name} (#${b.avgPosition})` }))} />
                </div>
                <p className="text-[11px] text-muted-foreground">The rest bat in their usual {setup.data.season} order. #n = average batting position.</p>
              </div>
              <div className="space-y-2 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your attack ({bowl}) — pick 2 to 8</div>
                <div className="flex flex-wrap gap-1.5">
                  {setup.data.bowling.players.map((b) => {
                    const on = attack?.includes(b.playerId) ?? false;
                    return (
                      <button key={b.playerId} aria-pressed={on}
                        onClick={() => setAttack((a) => { const cur = a ?? []; return on ? cur.filter((x) => x !== b.playerId) : cur.length < 8 ? [...cur, b.playerId] : cur; })}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${on ? "border-blue-400/60 bg-blue-500/20 text-white" : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"}`}>
                        {b.name} <span className="text-[10px] opacity-70">· {b.type} · {b.overs} ov</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Overs already bowled are assigned as the data-optimal plan would have spent them; 4-over cap and no back-to-back overs are enforced.</p>
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={run} disabled={!valid || sim.isPending || !setup.data}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold text-white">
              <Play className="w-4 h-4" /> {sim.isPending ? "Simulating 2,000 innings × 3 plans…" : "Simulate"}
            </button>
            {sim.data && <span className="text-[11px] text-muted-foreground">{sim.data.sims.toLocaleString("en-US")} simulations per plan · seed {sim.data.seed}</span>}
          </div>
        </Card>

        {sim.isError && <ErrorBanner error={sim.error} />}
        {sim.data && <Results r={sim.data} />}
      </div>
    </Layout>
  );
}

function Results({ r }: { r: StrategyResult }) {
  const best = [...r.plans].sort((a, b) => b.defendProb - a.defendProb)[0];
  const [planId, setPlanId] = useState<PlanResult["id"]>(best.id);
  const plan = r.plans.find((p) => p.id === planId) ?? best;
  const c = r.context;

  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachUnavailable, setCoachUnavailable] = useState<string | null>(null);

  const requestCoachBriefing = async () => {
    setIsCoachLoading(true);
    try {
      const prompt = `Defending total in IPL: ${c.bowlingTeam} defending ${c.target} runs against ${c.battingTeam}.
Current chase state: ${c.runs}/${c.wickets} in ${Math.floor(c.balls / 6)}.${c.balls % 6} overs (${c.runsNeeded} needed off ${c.ballsLeft} balls, RRR: ${c.requiredRate?.toFixed(2) ?? "N/A"}).
Venue: ${c.venue ?? "Standard pitch"}.
Simulated Plan: "${best.name}" gives ${best.defendProb.toFixed(1)}% defense chance.
Top next-over bowlers: ${r.nextBowler.slice(0, 3).map((b) => `${b.name} (${b.defendProb.toFixed(1)}% defend)`).join(", ")}.
Key batters at crease: Striker ${r.batting.striker.name}, Non-striker ${r.batting.nonStriker.name}.

Provide a tactical dugout briefing for the captain:
1. Bowling selection recommendation for over ${Math.floor(c.balls / 6) + 1}.
2. Field placement & line/length trap to restrict or dismiss ${r.batting.striker.name}.
3. Risk analysis (how this total could be leaked).`;

      const response = await askGeminiAnalyst(prompt, { context: "Live Strategy Simulation Dugout Briefing" });
      if (response.source === "live_api") {
        setCoachAdvice(response.text);
        setCoachUnavailable(null);
      } else {
        setCoachAdvice(null);
        setCoachUnavailable(response.error ?? "Gemini is unavailable.");
      }
    } catch (err) {
      setCoachAdvice(null);
      setCoachUnavailable(`Gemini is unavailable: ${(err as Error).message}`);
    } finally {
      setIsCoachLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600/15 to-cyan-600/5 p-4 space-y-3">
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.bowlingTeam} defend — best plan</div>
            <div className="font-display font-black text-5xl leading-none mt-1 tabular-nums">{best.defendProb.toFixed(0)}<span className="text-lg text-muted-foreground font-bold">%</span></div>
            <div className="text-[11px] text-muted-foreground mt-1.5">{best.name}</div>
          </div>
          <Tile label="League-average chase" value={`${(100 - r.leagueBaseline.chaseProb).toFixed(0)}% defend`} sub={r.leagueBaseline.note} />
          <Tile label="Real chases from here" value={r.parallels.chaseWinRate === null ? "—" : `${(100 - r.parallels.chaseWinRate).toFixed(0)}% defended`} sub={`${r.parallels.similar} similar states in IPL history`} />
          <Tile label="Need" value={`${c.runsNeeded} off ${c.ballsLeft}`} sub={`RRR ${c.requiredRate?.toFixed(2) ?? "—"} · ${10 - c.wickets} wkts left`} />
        </div>
        <p className="text-xs text-muted-foreground">
          The plan figure uses these two squads' own records; the league-average figure is the same state with average players. When the two disagree, the difference is the players.
          {c.venue && <> Venue boundary factor at {c.venue}: ×{c.venueFactor.toFixed(2)}.</>}
        </p>
      </section>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <SectionTitle icon={<Swords className="w-4 h-4 text-blue-400" />} title="Three bowling plans" sub="Same random numbers for each plan, so differences come from the plan" />
          <button
            onClick={requestCoachBriefing}
            disabled={isCoachLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            {isCoachLoading ? "Consulting Gemini…" : "Ask Gemini (optional, your key)"}
          </button>
        </div>

        {coachUnavailable && (
          <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <span>{coachUnavailable} The simulation results below are unaffected.</span>
            <button onClick={() => setCoachUnavailable(null)} className="text-amber-200/80 hover:text-white shrink-0">Dismiss</button>
          </div>
        )}

        {coachAdvice && (
          <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-[#070B18]/90 backdrop-blur-md p-4 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Gemini briefing — unverified AI text
              </div>
              <button onClick={() => setCoachAdvice(null)} className="text-xs text-muted-foreground hover:text-white">Dismiss</button>
            </div>
            <p className="text-[11px] text-amber-200/90">
              Written by an external language model from the figures above. It is not computed from CricField's data; check any number it adds against the simulation.
            </p>
            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line border-t border-cyan-500/15 pt-2">
              {coachAdvice}
            </div>
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {r.plans.map((pl) => (
            <button key={pl.id} onClick={() => setPlanId(pl.id)} aria-pressed={pl.id === plan.id}
              className={`text-left rounded-xl border p-3 transition-colors ${pl.id === plan.id ? "border-blue-400/60 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{pl.name}</span>
                {pl.id === best.id && <Pill tone="good">BEST</Pill>}
              </div>
              <div className="font-display font-black text-3xl mt-1 tabular-nums">{pl.defendProb.toFixed(1)}%</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">final {pl.finalRuns.p10}–{pl.finalRuns.p90} (median {pl.finalRuns.p50}) · {pl.expectedWickets.toFixed(1)} wkts down at the end</div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{pl.description}</p>
            </button>
          ))}
        </div>
        <div className="overflow-x-auto mt-4 -mx-4 px-4">
          <table className="w-full text-sm">
            <caption className="text-left text-[11px] text-muted-foreground pb-2">{plan.name}: who bowls each remaining over (most frequent choice across simulations)</caption>
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Over", "Bowler", "How often", "Exp. runs", "Wicket chance", "Over reached"].map((h, i) => <th key={h} className={`py-2 px-2 font-semibold ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {plan.overs.map((o) => (
                <tr key={o.over} className="border-b border-white/[0.05] tabular-nums">
                  <td className="py-1.5 px-2">{o.over}</td>
                  <td className="py-1.5 px-2 text-left">{o.bowlerName}</td>
                  <td className="py-1.5 px-2 text-right">{o.share}%</td>
                  <td className="py-1.5 px-2 text-right">{o.expRuns.toFixed(1)}</td>
                  <td className="py-1.5 px-2 text-right">{o.wicketProb}%</td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">{o.bowledProb}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Play className="w-4 h-4 text-emerald-400" />} title="Who bowls the next over?" sub="Each option simulated with the best plan after it" />
          <ul className="mt-3 space-y-2">
            {r.nextBowler.map((b, i) => {
              const top = r.nextBowler[0].defendProb;
              return (
                <li key={b.playerId} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{i === 0 && "→ "}{b.name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground shrink-0">{b.expRunsThisOver.toFixed(1)} runs · {b.wicketProbThisOver}% wkt · <b className="text-white">{b.defendProb.toFixed(1)}%</b></span>
                  </div>
                  <div className="h-1.5 rounded bg-white/5 overflow-hidden" aria-hidden>
                    <div className={`h-full ${i === 0 ? "bg-emerald-400" : top - b.defendProb > 5 ? "bg-rose-400/70" : "bg-slate-400/60"}`} style={{ width: `${b.defendProb}%` }} />
                  </div>
                </li>
              );
            })}
            {!r.nextBowler.length && <li className="text-xs text-muted-foreground">The over is in progress, so the bowler is fixed. Set "+ balls" to 0 to compare next-over options.</li>}
          </ul>
        </Card>
        <Card>
          <SectionTitle icon={<BarChart3 className="w-4 h-4 text-cyan-400" />} title="Where the chase ends" sub={`Final totals, best plan · target ${c.target}`} />
          <Histogram bins={r.histogram} target={c.target} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle icon={<Users className="w-4 h-4 text-amber-400" />} title="The players" sub="Phase records as of this season, shrunk toward the league for small samples" />
          <div className="text-xs mt-3 space-y-1">
            <div><span className="text-muted-foreground">Striker:</span> {r.batting.striker.name} <span className="text-muted-foreground">SR {r.batting.striker.strikeRateThisPhase ?? "—"} in this phase</span></div>
            <div><span className="text-muted-foreground">Non-striker:</span> {r.batting.nonStriker.name} <span className="text-muted-foreground">SR {r.batting.nonStriker.strikeRateThisPhase ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Still to come:</span> {r.batting.toCome.map((b) => b.name).join(", ") || "—"}</div>
          </div>
          <div className="overflow-x-auto mt-3 -mx-4 px-4">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-muted-foreground">{["Bowler", "Type", "Used", "Left", "Econ (phase)", "Econ (death)"].map((h, i) => <th key={h} className={`py-1.5 px-2 font-semibold ${i < 2 ? "text-left" : "text-right"}`}>{h}</th>)}</tr></thead>
              <tbody>
                {r.attack.map((b) => (
                  <tr key={b.playerId} className="border-b border-white/[0.05] tabular-nums">
                    <td className="py-1.5 px-2">{b.name}</td><td className="py-1.5 px-2 text-muted-foreground">{b.type}</td>
                    <td className="py-1.5 px-2 text-right">{b.oversUsed}</td><td className="py-1.5 px-2 text-right">{b.oversLeft}</td>
                    <td className="py-1.5 px-2 text-right">{b.economyThisPhase?.toFixed(2) ?? "—"}</td><td className="py-1.5 px-2 text-right">{b.deathEconomy?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle icon={<History className="w-4 h-4 text-violet-400" />} title="Real chases from a similar spot" sub={`${r.parallels.similar} IPL chases · ${r.parallels.chaseWinRate ?? "—"}% were won by the chasing side`} />
          <ul className="mt-3 space-y-1.5 text-xs">
            {r.parallels.examples.map((e) => (
              <li key={e.matchId} className="flex items-baseline gap-2">
                <Pill tone={e.won ? "bad" : "good"}>{e.won ? "CHASED" : "DEFENDED"}</Pill>
                <Link href={`/match/${e.matchId}`} className="hover:underline truncate">{e.batting} v {e.bowling}, {e.season}</Link>
                <span className="ml-auto text-muted-foreground tabular-nums shrink-0">{e.state}</span>
              </li>
            ))}
            {!r.parallels.examples.length && <li className="text-muted-foreground">No close historical match for this state.</li>}
          </ul>
        </Card>
      </div>

      {/* Simulation Result Summary Screen Ad Unit */}
      <div className="pt-2">
        <div className="text-center mb-1">
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/30">ADVERTISEMENT</span>
        </div>
        <AdVessel slot="1029384756" format="horizontal" minHeight={90} label="Tactical Simulation Partner Briefing" />
      </div>
    </div>
  );
}

function Histogram({ bins, target }: { bins: { from: number; to: number; count: number }[]; target: number }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  const total = bins.reduce((s, b) => s + b.count, 0) || 1;
  const lo = bins[0]?.from ?? 0, hi = bins.at(-1)?.to ?? 1;
  const W = 600, H = 150, pb = 18;
  const x = (v: number) => ((v - lo) / Math.max(1, hi - lo)) * W;
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Distribution of simulated final totals">
        {bins.map((b) => (
          <rect key={b.from} x={x(b.from) + 1} width={Math.max(1, x(b.to) - x(b.from) - 2)} y={(H - pb) * (1 - b.count / max)} height={(H - pb) * (b.count / max)}
            fill={b.from >= target ? "rgba(230,103,103,0.75)" : "rgba(57,135,229,0.75)"}>
            <title>{`${b.from}–${b.to - 1}: ${((b.count / total) * 100).toFixed(1)}%`}</title>
          </rect>
        ))}
        {target >= lo && target <= hi && <line x1={x(target)} x2={x(target)} y1={0} y2={H - pb} stroke="#fbbf24" strokeDasharray="4 3" />}
        {[lo, Math.round((lo + hi) / 2), hi].map((v) => <text key={v} x={Math.min(W - 12, Math.max(12, x(v)))} y={H - 4} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.5)">{v}</text>)}
      </svg>
      <figcaption className="text-[11px] text-muted-foreground mt-1">Blue = defended, red = target reached. Dashed line: target {target}.</figcaption>
    </figure>
  );
}
