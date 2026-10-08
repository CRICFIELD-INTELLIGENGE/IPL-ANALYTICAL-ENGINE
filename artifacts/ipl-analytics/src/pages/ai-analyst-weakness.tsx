/**
 * HIDDEN WEAKNESS DETECTOR — Decision Intelligence OS, Phase 2 (Discovery)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pick a player; the API tests every bowler-type × over-window situation
 * against the rest of their own record (Bonferroni-corrected) and returns
 * reliable weaknesses with an evidence trail and an exploitation window.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Crosshair, Eye, HeartPulse, Loader2, ShieldCheck, Swords } from "lucide-react";
import { Layout } from "@/components/layout";
import {
  DemoBanner, DivergingLegend, ModuleHeader, PlayerPicker, SectionTitle, Segmented, Tile, divergingColor, signed,
} from "@/components/decision/module-shell";
import { fetchWeakness, isOffline, readParams, writeParams, type Anomaly, type HeatCell, type Side, type WeaknessReport } from "@/lib/discovery-api";
import { MOCK_WEAKNESS } from "@/components/decision/discovery-mock";

const QUICK_PICKS = ["RG Sharma", "V Kohli", "MS Dhoni", "RR Pant", "SA Yadav", "YS Chahal", "JJ Bumrah"];

export default function WeaknessPage() {
  const params = readParams();
  const [player, setPlayer] = useState<string | null>(params.get("player"));
  const [window, setWindow] = useState<"recent" | "career">(params.get("window") === "career" ? "career" : "recent");
  const [side, setSide] = useState<Side | undefined>((params.get("side") as Side) || undefined);

  const q = useQuery({
    queryKey: ["weakness", player, window, side],
    queryFn: () => fetchWeakness(player!, window, side),
    enabled: player !== null,
    placeholderData: (prev) => prev,
    retry: 1,
  });
  const demo = q.isError && isOffline(q.error);
  const report: WeaknessReport | undefined = demo ? MOCK_WEAKNESS : q.isError ? undefined : q.data;

  const choose = (p: string | number) => { setPlayer(String(p)); setSide(undefined); writeParams({ player: p, side: null }); };

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-5xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 2 · Discovery" title="Hidden Weakness Detector" tagline="Anomalies in one player's record that a scorecard hides — tested, not guessed." icon={<Eye className="w-5 h-5 text-amber-400" />}>
          <div className="flex flex-wrap gap-2">
            <Segmented label="Window" value={window} onChange={(v) => { setWindow(v); writeParams({ window: v }); }} options={[{ value: "recent", label: "Last 3 seasons" }, { value: "career", label: "Career" }]} />
            {report && (
              <Segmented label="Side" value={report.side} onChange={(v) => { setSide(v); writeParams({ side: v }); }}
                options={(["batting", "bowling"] as Side[]).map((s) => ({ value: s, label: s === "batting" ? "Batting" : "Bowling", disabled: !report.sidesAvailable.includes(s) }))} />
            )}
          </div>
        </ModuleHeader>

        <PlayerPicker onPick={choose} quickPicks={QUICK_PICKS} />

        {demo && <DemoBanner>Can't reach the API ({(q.error as Error).message}) — showing a saved scan of RG Sharma's career. Start the api-server to scan any player.</DemoBanner>}
        {q.isError && !demo && <DemoBanner>{(q.error as Error).message}{window === "recent" ? " Try the Career window." : ""}</DemoBanner>}

        {!player && !demo && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
            <Crosshair className="w-5 h-5 mx-auto mb-2 text-amber-400" />
            Pick a player. Every situation with 30+ balls — bowler type × over window, pace vs spin, batting first vs chasing — is tested
            against the rest of their record. Only differences that survive a multiple-testing correction are called weaknesses.
          </div>
        )}

        {q.isFetching && !report && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</div>}

        {report && <ReportView report={report} loading={q.isFetching} />}
      </div>
    </Layout>
  );
}

function ReportView({ report: r, loading }: { report: WeaknessReport; loading: boolean }) {
  const rateLabel = r.side === "batting" ? "SR" : "Econ";
  const outLabel = r.side === "batting" ? "Balls / dismissal" : "Balls / wicket";
  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-display font-black text-xl">{r.name}</h2>
          {r.fullName && r.fullName !== r.name && <span className="text-xs text-muted-foreground">{r.fullName}</span>}
          <span className="text-xs text-muted-foreground ml-auto">{r.side} · {r.windowLabel}</span>
        </div>
        <p className="text-sm mt-2 leading-relaxed">{r.summary}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Tile label="Balls" value={r.overall.balls.toLocaleString("en-US")} />
          <Tile label={rateLabel} value={r.overall.rate?.toFixed(1) ?? "—"} />
          <Tile label={outLabel} value={r.overall.ballsPerOut?.toFixed(1) ?? "—"} />
          <Tile label="Situations tested" value={String(r.cellsTested)} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <Link href={`/ai-analyst/pressure?player=${r.playerId}&window=${r.window === "recent" ? "recent" : "career"}&side=${r.side}`} className="inline-flex items-center gap-1 text-fuchsia-300 hover:underline">
            <HeartPulse className="w-3.5 h-3.5" /> Pressure genome for {r.name}
          </Link>
        </div>
      </section>

      {r.weaknesses.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<Swords className="w-4 h-4 text-red-400" />} title="Reliable weaknesses" sub="Situations that are clearly worse than the rest of this record" />
          {r.weaknesses.map((a) => <AnomalyCard key={a.id} a={a} side={r.side} tone="weak" />)}
        </section>
      )}
      {r.watchList.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<Eye className="w-4 h-4 text-muted-foreground" />} title="Watch list — not significant" sub="The weakest situations, but the gap could be chance at this sample size" />
          {r.watchList.map((a) => <AnomalyCard key={a.id} a={a} side={r.side} tone="watch" />)}
        </section>
      )}
      {r.strengths.length > 0 && (
        <section className="space-y-2">
          <SectionTitle icon={<ShieldCheck className="w-4 h-4 text-sky-400" />} title="Strength zones" sub="Where to avoid feeding this player" />
          {r.strengths.map((a) => <AnomalyCard key={a.id} a={a} side={r.side} tone="strong" />)}
        </section>
      )}

      <Heatmap report={r} />

      <p className="text-[11px] text-muted-foreground leading-relaxed">{r.method}</p>
    </div>
  );
}

function AnomalyCard({ a, side, tone }: { a: Anomaly; side: Side; tone: "weak" | "strong" | "watch" }) {
  const [open, setOpen] = useState(false);
  const border = tone === "weak" ? "border-red-500/30 bg-red-500/[0.05]" : tone === "strong" ? "border-sky-500/30 bg-sky-500/[0.05]" : "border-white/10 bg-white/[0.02]";
  const rate = side === "batting" ? "SR" : "Econ";
  const out = side === "batting" ? "Balls/out" : "Balls/wkt";
  const d = a.evidence.distribution;
  return (
    <div className={`rounded-2xl border ${border}`}>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <p className="font-semibold leading-snug flex-1 min-w-[240px]">{a.headline}</p>
          <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border ${tone === "watch" ? "border-white/15 text-muted-foreground" : tone === "weak" ? "border-red-400/40 text-red-200" : "border-sky-400/40 text-sky-200"}`}>
            {tone === "watch" ? `${a.confidence}% confidence · not significant` : `${a.confidence}% confidence`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Compare label={rate} cell={a.cell.rate} rest={a.elsewhere.rate} />
          <Compare label={out} cell={a.cell.ballsPerOut} rest={a.elsewhere.ballsPerOut} />
          <Compare label="Dot %" cell={a.cell.dotPct} rest={a.elsewhere.dotPct} />
          <Compare label="Boundary %" cell={a.cell.boundaryPct} rest={a.elsewhere.boundaryPct} />
        </div>
        {a.exploit && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-sm">
            <Crosshair className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span><span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mr-1.5">Exploitation window</span>{a.exploit}</span>
          </div>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          Evidence trail — {a.cell.balls} balls, {a.cell.outs} {side === "batting" ? "dismissals" : "wickets"}, effect {signed(a.effectPer100)} runs / 100 balls
        </button>
      </div>
      {open && (
        <div className="border-t border-white/[0.07] p-4 grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{side === "batting" ? "Dismissals in this situation" : "Wickets in this situation"} (latest first)</div>
            {a.evidence.dismissals.length ? (
              <table className="w-full">
                <tbody>
                  {a.evidence.dismissals.map((e, i) => (
                    <tr key={i} className="border-b border-white/[0.05]">
                      <td className="py-1 pr-2 font-mono text-muted-foreground whitespace-nowrap">{e.date?.replace(/\//g, "-")}</td>
                      <td className="py-1 pr-2 whitespace-nowrap">vs {e.opponent}</td>
                      <td className="py-1 pr-2">{e.counterpart}</td>
                      <td className="py-1 pr-2 font-mono">{e.ball}</td>
                      <td className="py-1 text-muted-foreground">{e.kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted-foreground">None in this situation.</p>}
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{side === "batting" ? "Bowlers in this situation" : "Batters in this situation"}</div>
              <table className="w-full">
                <thead><tr className="text-muted-foreground"><th className="text-left font-normal">Name</th><th className="text-right font-normal">Balls</th><th className="text-right font-normal">Runs</th><th className="text-right font-normal">{side === "batting" ? "Outs" : "Wkts"}</th><th className="text-right font-normal">{rate}</th></tr></thead>
                <tbody>
                  {a.evidence.counterparts.map((c) => (
                    <tr key={c.name} className="border-b border-white/[0.05] tabular-nums">
                      <td className="py-1">{c.name}</td><td className="py-1 text-right">{c.balls}</td><td className="py-1 text-right">{c.runs}</td><td className="py-1 text-right">{c.outs}</td><td className="py-1 text-right">{c.rate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ball outcomes</div>
              <div className="flex flex-wrap gap-1.5 font-mono">
                {Object.entries({ Dots: d.dot, "1s": d["1"], "2s": d["2"], "4s": d["4"], "6s": d["6"], Outs: d.out }).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{k} {v}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Compare({ label, cell, rest }: { label: string; cell: number | null; rest: number | null }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{cell?.toFixed(1) ?? "—"} <span className="text-muted-foreground font-normal">vs {rest?.toFixed(1) ?? "—"}</span></div>
    </div>
  );
}

function Heatmap({ report: r }: { report: WeaknessReport }) {
  const [focus, setFocus] = useState<HeatCell | null>(null);
  const cell = (row: string, col: string) => r.heatmap.cells.find((c) => c.row === row && c.col === col)!;
  const rate = r.side === "batting" ? "SR" : "econ";
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-baseline gap-2 mb-1">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider">{r.heatmap.rowLabel} × over window</h3>
        <span className="text-[11px] text-muted-foreground">Colour = runs per 100 balls versus {r.name}'s own average (net of dismissals)</span>
      </div>
      <DivergingLegend worse={r.side === "batting" ? "Worse for the batter" : "Worse for the bowler"} better="Better" />
      <div className="overflow-x-auto mt-3 -mx-4 px-4">
        <table className="w-full text-xs border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="text-left font-semibold text-muted-foreground pr-2 py-1">{r.heatmap.rowLabel}</th>
              {r.heatmap.cols.map((c) => <th key={c} className="font-semibold text-muted-foreground px-1 py-1 whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.heatmap.rows.map((row) => (
              <tr key={row}>
                <th scope="row" className="text-left font-normal pr-2 whitespace-nowrap">{row}</th>
                {r.heatmap.cols.map((col) => {
                  const c = cell(row, col);
                  const empty = !c.balls;
                  return (
                    <td key={col} className="p-0">
                      <button
                        type="button"
                        disabled={empty}
                        onMouseEnter={() => setFocus(c)}
                        onFocus={() => setFocus(c)}
                        onMouseLeave={() => setFocus(null)}
                        onBlur={() => setFocus(null)}
                        aria-label={empty ? `${row}, ${col}: no balls` : `${row}, ${col}: ${c.balls} balls, ${rate} ${c.rate}, ${c.effectPer100 === null ? "too few balls to compare" : `${signed(c.effectPer100)} runs per 100 balls vs own average`}`}
                        className="w-full min-w-[84px] h-12 rounded-[4px] flex flex-col items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        // Too few balls to judge: no fill and muted text, so it never reads as the gray "no difference" class.
                        style={{ background: empty || c.effectPer100 === null ? "transparent" : divergingColor(c.effectPer100), boxShadow: empty ? undefined : "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
                      >
                        {empty ? <span className="text-muted-foreground/50">—</span> : (
                          <>
                            <span className={`font-semibold tabular-nums ${c.effectPer100 === null ? "text-muted-foreground" : "text-white"}`}>{c.rate?.toFixed(0) ?? "—"}</span>
                            <span className={`text-[10px] tabular-nums ${c.effectPer100 === null ? "text-muted-foreground/70" : "text-white/70"}`}>{c.balls} b</span>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 min-h-[18px] text-[11px] text-muted-foreground" aria-live="polite">
        {focus
          ? `${focus.row}, ${focus.col}: ${focus.balls} balls · ${rate} ${focus.rate ?? "—"} · ${focus.ballsPerOut ? `${focus.ballsPerOut} balls per ${r.side === "batting" ? "dismissal" : "wicket"}` : `no ${r.side === "batting" ? "dismissals" : "wickets"}`} · ${focus.effectPer100 === null ? "fewer than 12 balls — not coloured" : `${signed(focus.effectPer100)} runs / 100 balls vs own average`}`
          : `Each cell shows ${rate} and balls. Hover or tab to a cell for detail. Cells under 12 balls stay uncoloured.`}
      </div>
    </section>
  );
}
