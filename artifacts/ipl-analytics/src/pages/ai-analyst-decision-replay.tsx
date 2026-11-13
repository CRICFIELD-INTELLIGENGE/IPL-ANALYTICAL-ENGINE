/**
 * CAPTAIN'S DECISION REPLAY — Decision Intelligence OS, Phase 3 (Simulation)
 * ─────────────────────────────────────────────────────────────────────────────
 * A real chase, paused at the overs where it turned and the fielding captain
 * had a genuine choice of bowler. You pick; then every legal option is
 * revealed with what the simulation says it was worth (same random numbers
 * for each option), next to what the captain chose and what happened.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Rewind, Target, Trophy } from "lucide-react";
import { Layout } from "@/components/layout";
import { Card, ErrorBanner, Loading, ModuleHeader, Pill, SectionTitle, Tile, WinProbChart, signed } from "@/components/decision/module-shell";
import { MatchFinder } from "@/components/decision/sim-widgets";
import { readParams, writeParams } from "@/lib/discovery-api";
import { fetchReplay, fetchReplayMatches, type DecisionPoint, type ReplayResult } from "@/lib/sim-api";

export default function DecisionReplayPage() {
  const [matchId, setMatchId] = useState<string | null>(readParams().get("match"));
  const replay = useQuery({ queryKey: ["replay", matchId], queryFn: () => fetchReplay(matchId!), enabled: matchId !== null, retry: 1, staleTime: Infinity });

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-5xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 3 · Simulation" title="Captain's Decision Replay" tagline="Real chases, paused where they turned. Pick the bowler — then see what each option was worth." icon={<Rewind className="w-5 h-5 text-indigo-400" />} />
        {!matchId || replay.isError ? (
          <Card>
            <SectionTitle icon={<Target className="w-4 h-4 text-indigo-400" />} title="Pick a chase" sub="Finals and close finishes · biggest single-ball swing shown on the right" />
            <div className="mt-3">
              <MatchFinder queryKey="replay-matches" fetcher={fetchReplayMatches} selected={matchId}
                onPick={(m) => { setMatchId(m.matchId); writeParams({ match: m.matchId }); }} extra={(m) => `swing ${m.maxSwing.toFixed(0)} pts`} />
            </div>
            {replay.isError && <div className="mt-3"><ErrorBanner error={replay.error} /></div>}
          </Card>
        ) : replay.isLoading ? (
          <Loading label="Finding the turning points and simulating every option (≈1s)…" />
        ) : replay.data ? (
          <Replay key={replay.data.match.matchId} r={replay.data} onBack={() => { setMatchId(null); writeParams({ match: null }); }} />
        ) : null}
      </div>
    </Layout>
  );
}

function Replay({ r, onBack }: { r: ReplayResult; onBack: () => void }) {
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [step, setStep] = useState(0);
  const done = r.decisionPoints.length > 0 && Object.keys(picks).length === r.decisionPoints.length;
  const regret = (dp: DecisionPoint, id: number) => dp.options[0].defendProb - (dp.options.find((o) => o.playerId === id)?.defendProb ?? 0);
  const yours = r.decisionPoints.reduce((s, dp) => s + (picks[dp.over] !== undefined ? regret(dp, picks[dp.over]) : 0), 0);
  const captain = r.decisionPoints.reduce((s, dp) => s + regret(dp, dp.options.find((o) => o.actual)?.playerId ?? 0), 0);
  const bestCalls = r.decisionPoints.filter((dp) => picks[dp.over] !== undefined && dp.options.find((o) => o.playerId === picks[dp.over])?.verdict === "Best call").length;
  const markers = r.decisionPoints.map((dp) => ({ legal: (dp.over - 1) * 6, label: `ov ${dp.over}` }));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/15 to-blue-600/5 p-4 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display font-black text-xl">{r.match.title}, {r.match.season}</h2>
          {r.match.stage && <Pill tone="info">{r.match.stage.toUpperCase()}</Pill>}
          <span className="text-xs text-muted-foreground">{r.match.venue} · {r.firstInnings} · {r.chasingTeam} chasing {r.target}</span>
          <button onClick={onBack} className="ml-auto text-xs text-muted-foreground hover:text-white">Pick another match</button>
        </div>
        <p className="text-xs text-muted-foreground">You captain <b className="text-white">{r.bowlingTeam}</b>. {r.decisionPoints.length} decision points — the overs with the biggest win-probability swing where at least two bowlers were available. Outcome hidden until the end: {done ? <b className="text-white">{r.match.result}</b> : "?"}</p>
        <WinProbChart label={`${r.chasingTeam} chase win probability`} points={done ? r.curve : r.curve.filter((p) => p.legal <= (r.decisionPoints[step]?.over - 1) * 6)} markers={markers} />
        <p className="text-[11px] text-muted-foreground">{r.chasingTeam}'s chance of completing the chase, from a state model calibrated on every IPL chase (league-average players). Dashed lines: decision points.</p>
      </section>

      {r.decisionPoints.length === 0 && <Card><p className="text-sm text-muted-foreground">No over in this chase had two or more bowlers available at a turning point. Try another match.</p></Card>}

      {r.decisionPoints.map((dp, i) => (i <= step ? (
        <Point key={dp.over} dp={dp} n={i + 1} total={r.decisionPoints.length} bowlingTeam={r.bowlingTeam} pick={picks[dp.over]}
          onPick={(id) => { setPicks((p) => ({ ...p, [dp.over]: id })); setStep((s) => Math.max(s, i + 1)); }} />
      ) : null))}

      {done && (
        <Card>
          <SectionTitle icon={<Trophy className="w-4 h-4 text-amber-400" />} title="Your scorecard" sub="Win probability given up versus the model's best option at each point" />
          <div className="flex flex-wrap gap-3 mt-3">
            <Tile label="Best calls" value={`${bestCalls}/${r.decisionPoints.length}`} sub="within 1.5 pts of the best option" />
            <Tile label="You gave up" value={`${yours.toFixed(1)} pts`} sub="summed over all decision points" />
            <Tile label={`The real captain gave up`} value={`${captain.toFixed(1)} pts`} sub={yours < captain ? "you out-captained the real call" : yours > captain ? "the real calls were better" : "level"} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Each option was simulated {r.sims} times from the exact match state with the remaining overs bowled as they really were. Points are the bowling side's win probability; differences under ~2 points are within simulation noise.</p>
          <Link href={`/match/${r.match.matchId}`} className="inline-block mt-2 text-xs text-indigo-300 hover:underline">Full scorecard →</Link>
        </Card>
      )}

      {/* Simulation Result Summary Screen Ad Unit */}
      
    </div>
  );
}

function Point({ dp, n, total, bowlingTeam, pick, onPick }: { dp: DecisionPoint; n: number; total: number; bowlingTeam: string; pick: number | undefined; onPick: (id: number) => void }) {
  const revealed = pick !== undefined;
  const best = dp.options[0].defendProb;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Decision {n} of {total} · over {dp.over}</span>
        <span className="text-sm font-semibold">{dp.situation}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{dp.striker} on strike, {dp.nonStriker} at the other end · chase win probability {dp.winProbBefore.toFixed(0)}%. Who bowls for {bowlingTeam}?</p>
      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        {(revealed ? dp.options : [...dp.options].sort((a, b) => a.name.localeCompare(b.name))).map((o) => {
          const mine = pick === o.playerId;
          return (
            <button key={o.playerId} disabled={revealed} onClick={() => onPick(o.playerId)} aria-pressed={mine}
              className={`text-left rounded-xl border p-3 transition-colors ${mine ? "border-indigo-400/70 bg-indigo-500/15" : "border-white/10 bg-white/[0.02]"} ${revealed ? "" : "hover:border-white/30"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{o.name}</span>
                <span className="text-[10px] text-muted-foreground">{o.type}</span>
                {revealed && <Pill tone={o.verdict === "Best call" ? "good" : o.verdict === "Costly" ? "bad" : "neutral"}>{o.verdict.toUpperCase()}</Pill>}
                {revealed && o.actual && <Pill tone="info">CAPTAIN'S CALL</Pill>}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                Phase econ {o.phaseEconomy?.toFixed(2) ?? "—"} · wkt every {o.phaseBallsPerWicket?.toFixed(1) ?? "—"} balls
                {o.vsStriker && <> · vs {dp.striker}: {o.vsStriker.runs} off {o.vsStriker.balls}, out {o.vsStriker.outs}×</>}
              </div>
              {revealed && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs tabular-nums"><span>{o.expRunsThisOver} runs exp. · {o.wicketProbThisOver}% wkt</span><b>{o.defendProb.toFixed(1)}% defend</b></div>
                  <div className="h-1.5 rounded bg-white/5 overflow-hidden" aria-hidden><div className={`h-full ${o.verdict === "Best call" ? "bg-emerald-400" : o.verdict === "Costly" ? "bg-rose-400/80" : "bg-slate-400/70"}`} style={{ width: `${o.defendProb}%` }} /></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <p className="text-xs mt-3 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <span>
            {(() => { const gap = best - (dp.options.find((o) => o.playerId === pick)?.defendProb ?? 0); return gap < 0.05 ? "You picked the best option." : `Your pick was ${gap.toFixed(1)} pts below the best option.`; })()} {bowlingTeam} actually bowled <b>{dp.actualChoice}</b>: {dp.actualOutcome}. The chase moved {dp.winProbBefore.toFixed(0)}% → {dp.winProbAfter.toFixed(0)}% ({signed(dp.swing)} pts) over that over.
          </span>
        </p>
      )}
    </Card>
  );
}
