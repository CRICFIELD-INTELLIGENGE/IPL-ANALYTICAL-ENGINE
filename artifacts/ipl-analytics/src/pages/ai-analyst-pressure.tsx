/**
 * PRESSURE GENOME — Decision Intelligence OS, Phase 2 (Discovery)
 * ─────────────────────────────────────────────────────────────────────────────
 * A player's pressure personality: performance in death overs, knockouts,
 * close finishes, steep chases and collapse rescues — each judged against
 * the league in that same situation — plus a 0–100 pressure index, the lift
 * versus their own calm phases, and the most similar pressure profiles.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Eye, HeartPulse, Loader2, Trophy, TrendingUp, Users } from "lucide-react";
import { Layout } from "@/components/layout";
import { DemoBanner, ModuleHeader, PlayerPicker, SectionTitle, Segmented, Tile, signed } from "@/components/decision/module-shell";
import {
  fetchPressure, fetchPressureLeaders, isOffline, readParams, writeParams,
  type ContextSplit, type PressureGenome, type PressureLeader, type PressureLeaders, type Side,
} from "@/lib/discovery-api";
import { MOCK_PRESSURE, MOCK_PRESSURE_LEADERS } from "@/components/decision/discovery-mock";

const QUICK_PICKS = ["MS Dhoni", "HH Pandya", "V Kohli", "AB de Villiers", "JJ Bumrah", "SP Narine", "AD Russell"];

export default function PressurePage() {
  const params = readParams();
  const [player, setPlayer] = useState<string | null>(params.get("player"));
  const [window, setWindow] = useState<"career" | "recent">(params.get("window") === "recent" ? "recent" : "career");
  const [side, setSide] = useState<Side | undefined>((params.get("side") as Side) || undefined);

  const q = useQuery({
    queryKey: ["pressure", player, window, side],
    queryFn: () => fetchPressure(player!, window, side),
    enabled: player !== null,
    placeholderData: (prev) => prev,
    retry: 1,
  });
  const leadersSide: Side = side ?? "batting";
  const leadersQ = useQuery({
    queryKey: ["pressure-leaders", window, leadersSide],
    queryFn: () => fetchPressureLeaders(window, leadersSide),
    enabled: player === null,
    retry: 1,
  });

  const demo = (q.isError && isOffline(q.error)) || (player === null && leadersQ.isError && isOffline(leadersQ.error));
  const genome: PressureGenome | undefined = q.isError ? (isOffline(q.error) ? MOCK_PRESSURE : undefined) : q.data;
  const leaders: PressureLeaders | undefined = leadersQ.isError ? MOCK_PRESSURE_LEADERS : leadersQ.data;

  const choose = (p: string | number) => { setPlayer(String(p)); setSide(undefined); writeParams({ player: p, side: null }); };
  const clear = () => { setPlayer(null); writeParams({ player: null }); };

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-5xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 2 · Discovery" title="Pressure Genome" tagline="How a player changes when it matters — judged only on IPL pressure situations." icon={<HeartPulse className="w-5 h-5 text-fuchsia-400" />}>
          <div className="flex flex-wrap gap-2">
            <Segmented label="Window" value={window} onChange={(v) => { setWindow(v); writeParams({ window: v }); }} options={[{ value: "career", label: "Career" }, { value: "recent", label: "Last 3 seasons" }]} />
            <Segmented label="Side" value={genome?.side ?? leadersSide} onChange={(v) => { setSide(v); writeParams({ side: v }); }}
              options={(["batting", "bowling"] as Side[]).map((s) => ({ value: s, label: s === "batting" ? "Batting" : "Bowling", disabled: genome ? !genome.sidesAvailable.includes(s) : false }))} />
          </div>
        </ModuleHeader>

        <PlayerPicker onPick={choose} quickPicks={QUICK_PICKS} />

        {demo && <DemoBanner>Can't reach the API — showing a saved {genome ? "genome for MS Dhoni" : "leaderboard"}. Start the api-server to profile any player.</DemoBanner>}
        {q.isError && !isOffline(q.error) && <DemoBanner>{(q.error as Error).message}</DemoBanner>}
        {q.isFetching && !genome && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Profiling…</div>}

        {player && genome ? (
          <GenomeView g={genome} loading={q.isFetching} onPick={choose} onBack={clear} />
        ) : !player && leaders ? (
          <LeadersView leaders={leaders} side={leadersSide} window={window} onPick={choose} />
        ) : null}
      </div>
    </Layout>
  );
}

const CONTEXT_HELP = "Death overs: 16–20 · Knockouts: qualifiers, eliminators, finals · Close finishes: last 5 overs of a live chase (required rate 6–14) · Steep chases: required rate above 12 · Collapse rescue: 4+ down inside 12 overs · Defending a chase: chase on track (RR ≤ 8.5) from over 11.";

function GenomeView({ g, loading, onPick, onBack }: { g: PressureGenome; loading: boolean; onPick: (p: number) => void; onBack: () => void }) {
  const unit = g.side === "batting" ? "SR" : "Econ";
  const outUnit = g.side === "batting" ? "Balls / dismissal" : "Balls / wicket";
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-600/15 to-violet-600/5 p-4 space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display font-black text-xl">{g.name}</h2>
          {g.fullName && g.fullName !== g.name && <span className="text-xs text-muted-foreground">{g.fullName}</span>}
          <span className="text-xs text-muted-foreground ml-auto">{g.side} · {g.windowLabel}</span>
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          {/* Hero figure: the index is a percentile, so say what it means beside it. */}
          <div className="rounded-2xl border border-white/10 bg-background/40 px-4 py-3 min-w-[180px]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pressure index</div>
            <div className="font-display font-black text-5xl leading-none mt-1">{g.pressureIndex ?? "—"}<span className="text-lg text-muted-foreground font-bold">/100</span></div>
            <div className="text-[11px] text-muted-foreground mt-1.5 max-w-[220px]">
              {g.qualified ? `Better under pressure than ${g.pressureIndex}% of qualified ${g.side === "batting" ? "batters" : "bowlers"}` : "Provisional — fewer than 120 pressure balls"}
            </div>
          </div>
          <Tile label="Pressure lift" value={signed(g.liftPer100)} sub="runs / 100 balls vs own calm phases" />
          <Tile label="Personality" value={g.archetype} />
          <Tile label="Pressure balls" value={g.pressureBalls.toLocaleString("en-US")} sub={`${g.confidence} confidence`} />
        </div>
        <p className="text-sm leading-relaxed">{g.summary}</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <Link href={`/ai-analyst/weakness?player=${g.playerId}&window=${g.window === "recent" ? "recent" : "career"}&side=${g.side}`} className="inline-flex items-center gap-1 text-amber-300 hover:underline">
            <Eye className="w-3.5 h-3.5" /> Hidden weaknesses for {g.name}
          </Link>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-muted-foreground hover:text-white">
            <Trophy className="w-3.5 h-3.5" /> Leaderboards
          </button>
        </div>
      </section>

      <ContextBars g={g} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <SectionTitle icon={<HeartPulse className="w-4 h-4 text-fuchsia-400" />} title="Context splits" sub="The numbers behind the chart, with the league in the same situation" />
        <div className="overflow-x-auto mt-3 -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Situation", "Balls", unit, "League", outUnit, "League", "Bdry %", "Dot %", "vs league"].map((h, i) => (
                  <th key={i} className={`py-2 px-2 font-semibold whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...g.contexts, g.pressure, g.calm].map((c) => (
                <tr key={c.context} className={`border-b border-white/[0.05] tabular-nums ${c.context === "pressure" ? "font-semibold" : ""}`}>
                  <td className="py-2 px-2 text-left whitespace-nowrap" title={c.description}>{c.label}</td>
                  <td className="py-2 px-2 text-right">{c.balls.toLocaleString("en-US")}</td>
                  <td className="py-2 px-2 text-right">{c.rate?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{c.leagueRate?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right">{c.ballsPerOut?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-muted-foreground">{c.leagueBallsPerOut?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right">{c.boundaryPct?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right">{c.dotPct?.toFixed(1) ?? "—"}</td>
                  <td className="py-2 px-2 text-right">{c.balls ? signed(c.valuePer100) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{CONTEXT_HELP} "vs league" is runs per 100 balls better (+) or worse (−) than the league in that situation, counting a wicket as 30% of that situation's runs per wicket, shrunk toward 0 for small samples.</p>
      </section>

      {g.comparables.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <SectionTitle icon={<Users className="w-4 h-4 text-violet-300" />} title="Comparable pressure profiles" sub="Closest shape across the pressure situations (cosine similarity)" />
          <div className="grid sm:grid-cols-3 gap-2 mt-3">
            {g.comparables.map((c) => (
              <button key={c.playerId} onClick={() => onPick(c.playerId)} className="text-left rounded-xl border border-white/10 bg-background/40 p-3 hover:border-white/25">
                <div className="font-semibold">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.archetype}</div>
                <div className="text-xs mt-1.5 flex gap-3"><span>Index <b>{c.pressureIndex}</b></span><span>{c.similarity}% similar</span></div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Diverging bars around the league average for each pressure situation; calm phases as a gray reference. */
function ContextBars({ g }: { g: PressureGenome }) {
  const [focus, setFocus] = useState<ContextSplit | null>(null);
  const rows = [...g.contexts, g.calm];
  const maxAbs = Math.max(20, Math.ceil(Math.max(...rows.map((r) => Math.abs(r.valuePer100))) / 10) * 10);
  const rate = g.side === "batting" ? "SR" : "econ";
  const describe = (c: ContextSplit) =>
    !c.balls ? `${c.label}: no balls in this window.`
      : `${c.label} (${c.description}): ${c.balls} balls, ${rate} ${c.rate ?? "—"} vs league ${c.leagueRate ?? "—"}, ${c.ballsPerOut ? `${c.ballsPerOut} balls per ${g.side === "batting" ? "dismissal" : "wicket"}` : `no ${g.side === "batting" ? "dismissals" : "wickets"}`} — ${signed(c.valuePer100)} runs / 100 balls vs the league.`;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle icon={<TrendingUp className="w-4 h-4 text-fuchsia-400" />} title="Pressure profile" sub="Runs per 100 balls better or worse than the league in the same situation" />
      <div className="mt-4 space-y-1.5" role="list">
        <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[132px_1fr] gap-3 text-[10px] text-muted-foreground">
          <span />
          {/* End labels sit where a full-scale bar ends (8% in from each edge); words drop on small screens. */}
          <div className="flex justify-between whitespace-nowrap" style={{ paddingInline: "8%" }}>
            <span>−{maxAbs}<span className="hidden sm:inline"> worse</span></span>
            <span>League <span className="hidden sm:inline">average</span><span className="sm:hidden">avg</span></span>
            <span><span className="hidden sm:inline">better </span>+{maxAbs}</span>
          </div>
        </div>
        {rows.map((c) => {
          const v = c.balls ? c.valuePer100 : 0;
          // A full-scale bar uses 42% of the half-width, leaving room for its value label.
          const pct = (Math.abs(v) / maxAbs) * 42;
          const isCalm = c.context === "calm";
          const color = isCalm ? "#898781" : v >= 0 ? "#3987e5" : "#e66767";
          return (
            <div
              key={c.context}
              role="listitem"
              tabIndex={0}
              aria-label={describe(c)}
              onMouseEnter={() => setFocus(c)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(c)}
              onBlur={() => setFocus(null)}
              className={`grid grid-cols-[96px_1fr] sm:grid-cols-[132px_1fr] gap-3 items-center rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${isCalm ? "mt-3 pt-3 border-t border-white/[0.07]" : ""}`}
            >
              <div className="text-xs leading-tight">
                <div className={isCalm ? "text-muted-foreground" : "font-semibold"}>{c.label}{isCalm ? " (reference)" : ""}</div>
                <div className="text-[10px] text-muted-foreground">{c.balls.toLocaleString("en-US")} balls</div>
              </div>
              <div className="relative h-6">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
                {c.balls > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3.5"
                    style={{
                      background: color,
                      width: `${pct}%`,
                      left: v >= 0 ? "50%" : `${50 - pct}%`,
                      borderRadius: v >= 0 ? "0 4px 4px 0" : "4px 0 0 4px",
                    }}
                  />
                )}
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold tabular-nums"
                  style={v >= 0 ? { left: `calc(${50 + pct}% + 6px)` } : { right: `calc(${50 + pct}% + 6px)` }}
                >
                  {c.balls ? signed(c.valuePer100) : "no balls"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 min-h-[18px] text-[11px] text-muted-foreground" aria-live="polite">
        {focus ? describe(focus) : "Hover or tab to a bar for the underlying numbers; the table below lists them all."}
      </div>
    </section>
  );
}

function LeadersView({ leaders, side, window, onPick }: { leaders: PressureLeaders; side: Side; window: string; onPick: (p: number) => void }) {
  const list = (title: string, sub: string, rows: PressureLeader[], metric: (l: PressureLeader) => string) => (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <SectionTitle icon={<Trophy className="w-4 h-4 text-amber-400" />} title={title} sub={sub} />
      <ol className="mt-3 space-y-1">
        {rows.map((l, i) => (
          <li key={l.playerId}>
            <button onClick={() => onPick(l.playerId)} className="w-full flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5 text-left">
              <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="font-semibold text-sm">{l.name}</span>
              <span className="text-[11px] text-muted-foreground truncate">{l.archetype}</span>
              <span className="ml-auto font-mono text-sm tabular-nums">{metric(l)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
  const who = side === "batting" ? "batters" : "bowlers";
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pick a player, or start from the leaderboards ({window === "career" ? "IPL career" : "last 3 seasons"}, {who} with {leaders.qualifyBalls}+ pressure balls).
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        {list("Highest pressure index", `The best ${who} when it matters`, leaders.byIndex, (l) => String(l.pressureIndex))}
        {list("Biggest lift under pressure", "Most improved relative to their own calm phases", leaders.byLift, (l) => signed(l.liftPer100))}
      </div>
    </div>
  );
}
