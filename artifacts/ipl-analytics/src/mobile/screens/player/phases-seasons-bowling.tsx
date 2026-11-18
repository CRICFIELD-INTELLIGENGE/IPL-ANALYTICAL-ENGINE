import { useMemo, useState } from "react";
import { Shield, Target, TrendingUp } from "lucide-react";
import { teamShort } from "@/lib/aggregates";
import type { MobilePlayerData } from "./use-mobile-player";

export function PhasesSection({ data }: { data: MobilePlayerData }) {
  const { bat, bowl, isBowler, teamAccent, lens, pressureRow, matchAgg, squadHistory } = data;
  const [sub, setSub] = useState<"performance" | "patterns" | "lens">("performance");
  const [selectedCell, setSelectedCell] = useState<{ l: number; n: number } | null>(null);

  const lensData = lens.player.data;
  const lensMeta = lens.index.data;

  // Compute Scoring Patterns strictly from BatterLens balls (or verified career breakdown fallback)
  const patterns = useMemo(() => {
    const b = lensData?.balls;
    if (b && b.r.length > 0) {
      let dots = 0,
        singlesTwos = 0,
        fours = 0,
        sixes = 0,
        paceBalls = 0,
        paceRuns = 0,
        spinBalls = 0,
        spinRuns = 0;
      const byLength = (lensMeta?.lengths ?? []).map((lbl) => ({ label: lbl, balls: 0, runs: 0, outs: 0 }));
      const byLine = (lensMeta?.lines ?? []).map((lbl) => ({ label: lbl, balls: 0, runs: 0, outs: 0 }));

      for (let i = 0; i < b.r.length; i++) {
        const r = b.r[i];
        const w = b.w[i];
        if (r === 0) dots++;
        else if (r === 4) fours++;
        else if (r === 6) sixes++;
        else singlesTwos++;

        if (b.p[i] === 0) {
          paceBalls++;
          paceRuns += r;
        } else {
          spinBalls++;
          spinRuns += r;
        }
        if (b.l[i] >= 0 && byLength[b.l[i]]) {
          byLength[b.l[i]].balls++;
          byLength[b.l[i]].runs += r;
          byLength[b.l[i]].outs += w;
        }
        if (b.n[i] >= 0 && byLine[b.n[i]]) {
          byLine[b.n[i]].balls++;
          byLine[b.n[i]].runs += r;
          byLine[b.n[i]].outs += w;
        }
      }
      const total = b.r.length;
      const totRuns = b.r.reduce((s, v) => s + v, 0);
      return {
        hasLens: true,
        totalBalls: total,
        dots,
        singlesTwos,
        fours,
        sixes,
        dotPct: Math.round((dots / total) * 1000) / 10,
        boundaryRunPct: totRuns > 0 ? Math.round(((fours * 4 + sixes * 6) / totRuns) * 1000) / 10 : 0,
        pace: { balls: paceBalls, runs: paceRuns, sr: paceBalls ? (paceRuns / paceBalls) * 100 : 0 },
        spin: { balls: spinBalls, runs: spinRuns, sr: spinBalls ? (spinRuns / spinBalls) * 100 : 0 },
        byLength: byLength.filter((x) => x.balls > 0),
        byLine: byLine.filter((x) => x.balls > 0),
      };
    }

    if (bat && bat.balls > 0) {
      const f = Number(bat.fours || 0);
      const x = Number(bat.sixes || 0);
      return {
        hasLens: false,
        totalBalls: bat.balls,
        dots: null as number | null,
        singlesTwos: null as number | null,
        fours: f,
        sixes: x,
        dotPct: null as number | null,
        boundaryRunPct: bat.boundaryPct ?? (bat.runs > 0 ? Math.round(((f * 4 + x * 6) / bat.runs) * 1000) / 10 : 0),
        pace: null,
        spin: null,
        byLength: [] as { label: string; balls: number; runs: number; outs: number }[],
        byLine: [] as { label: string; balls: number; runs: number; outs: number }[],
      };
    }
    return null;
  }, [lensData, lensMeta, bat]);

  // Pitch Grid cells & deterministic Batter Lens strengths / watch areas
  const batterLensSummary = useMemo(() => {
    const b = lensData?.balls;
    if (!b || !lensMeta || b.r.length === 0) return null;
    const grid = new Map<string, { balls: number; runs: number; outs: number; x: number }>();
    for (let i = 0; i < b.r.length; i++) {
      if (b.l[i] < 0 || b.n[i] < 0) continue;
      const k = `${b.l[i]}:${b.n[i]}`;
      const cell = grid.get(k) ?? { balls: 0, runs: 0, outs: 0, x: 0 };
      cell.balls++;
      cell.runs += b.r[i];
      cell.outs += b.w[i];
      cell.x += b.x[i];
      grid.set(k, cell);
    }
    const maxCellBalls = Math.max(1, ...Array.from(grid.values()).map((c) => c.balls));

    // Deterministic strengths & areas to watch (minimum 15 balls per bucket)
    const strengths: string[] = [];
    const watch: string[] = [];

    if (patterns?.pace && patterns.spin && patterns.pace.balls >= 25 && patterns.spin.balls >= 25) {
      const diff = patterns.pace.sr - patterns.spin.sr;
      if (diff >= 10) strengths.push(`High pace velocity: ${patterns.pace.sr.toFixed(1)} SR vs pace (${patterns.pace.balls} balls) vs ${patterns.spin.sr.toFixed(1)} SR vs spin.`);
      else if (diff <= -10) strengths.push(`Excels against spin: ${patterns.spin.sr.toFixed(1)} SR vs spin (${patterns.spin.balls} balls) vs ${patterns.pace.sr.toFixed(1)} SR vs pace.`);
      if (patterns.spin.sr < 118 && patterns.spin.balls >= 30) {
        watch.push(`Contained against spin: ${patterns.spin.sr.toFixed(1)} SR over ${patterns.spin.balls} balls.`);
      }
      if (patterns.pace.sr < 118 && patterns.pace.balls >= 30) {
        watch.push(`Slower scoring rate vs pace (${patterns.pace.sr.toFixed(1)} SR across ${patterns.pace.balls} balls).`);
      }
    }

    if (bat) {
      if (bat.deathSr >= 155) strengths.push(`Death-overs acceleration: ${bat.deathSr.toFixed(1)} SR in overs 16–20.`);
      else if (bat.middleSr >= 132) strengths.push(`Middle-overs anchor & tempo: ${bat.middleSr.toFixed(1)} SR in overs 7–15.`);
      if (bat.ppSr > 0 && bat.ppSr < 114) watch.push(`Measured powerplay tempo (${bat.ppSr.toFixed(1)} SR in overs 1–6).`);
    }

    const bestLen = [...(patterns?.byLength ?? [])]
      .filter((x) => x.balls >= 20)
      .sort((a, b) => b.runs / b.balls - a.runs / a.balls)[0];
    if (bestLen) {
      strengths.push(`Best scoring length: ${bestLen.label} at ${((bestLen.runs / bestLen.balls) * 100).toFixed(1)} SR (${bestLen.balls}b).`);
    }

    const toughLen = [...(patterns?.byLength ?? [])]
      .filter((x) => x.balls >= 20 && x.outs > 0)
      .sort((a, b) => a.runs / a.balls - b.runs / b.balls)[0];
    if (toughLen && (toughLen.runs / toughLen.balls) * 100 < 125) {
      watch.push(`Vulnerable on ${toughLen.label.toLowerCase()}: ${((toughLen.runs / toughLen.balls) * 100).toFixed(1)} SR, ${toughLen.outs} dismissals.`);
    }

    if (matchAgg.chase.sr != null && matchAgg.defend.sr != null && matchAgg.chase.matches >= 4) {
      if (matchAgg.chase.sr > matchAgg.defend.sr + 6) {
        strengths.push(`Thrives in chases: ${matchAgg.chase.sr.toFixed(1)} SR chasing vs ${matchAgg.defend.sr.toFixed(1)} SR setting.`);
      } else if (matchAgg.defend.sr > matchAgg.chase.sr + 8) {
        watch.push(`Higher tempo batting first (${matchAgg.defend.sr.toFixed(1)} SR) vs chasing (${matchAgg.chase.sr.toFixed(1)} SR).`);
      }
    }

    return {
      grid,
      maxCellBalls,
      strengths: strengths.slice(0, 4),
      watch: watch.slice(0, 4),
      labelledCount: Array.from(grid.values()).reduce((s, c) => s + c.balls, 0),
    };
  }, [lensData, lensMeta, patterns, bat, matchAgg]);

  // 6-axis Vector Radar values
  const radarAxes = useMemo(() => {
    if (!isBowler && bat) {
      return [
        { label: "PP", raw: bat.ppSr || 0, val: Math.min(100, ((bat.ppSr || 0) / 180) * 100) },
        { label: "MID", raw: bat.middleSr || 0, val: Math.min(100, ((bat.middleSr || 0) / 170) * 100) },
        { label: "DEATH", raw: bat.deathSr || 0, val: Math.min(100, ((bat.deathSr || 0) / 220) * 100) },
        { label: "BND%", raw: bat.boundaryPct || 0, val: Math.min(100, ((bat.boundaryPct || 0) / 80) * 100) },
        { label: "CLUTCH", raw: bat.clutch || 50, val: Math.min(100, bat.clutch || 50) },
        { label: "FORM", raw: bat.form || 50, val: Math.min(100, bat.form || 50) },
      ];
    }
    if (bowl) {
      return [
        { label: "PP", raw: bowl.ppEcon ?? 8, val: Math.max(10, Math.min(100, (1 - (bowl.ppEcon ?? 8) / 12) * 100)) },
        { label: "MID", raw: bowl.middleEcon ?? 7.5, val: Math.max(10, Math.min(100, (1 - (bowl.middleEcon ?? 7.5) / 12) * 100)) },
        { label: "DEATH", raw: bowl.deathEcon ?? 9.5, val: Math.max(10, Math.min(100, (1 - (bowl.deathEcon ?? 9.5) / 14) * 100)) },
        { label: "DOT%", raw: bowl.dotPct || 35, val: Math.min(100, (bowl.dotPct || 35) * 1.8) },
        { label: "CLUTCH", raw: bowl.clutch || 50, val: Math.min(100, bowl.clutch || 50) },
        { label: "FORM", raw: bowl.form || 50, val: Math.min(100, bowl.form || 50) },
      ];
    }
    return [];
  }, [bat, bowl, isBowler]);

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">Phases · Tactical Lens</span>
          <h2 className="mpd-title">Phase &amp; Scoring Intelligence</h2>
        </div>
      </div>

      {/* Secondary Pills inside Phases */}
      <div className="mpd-subpills" role="tablist" aria-label="Phases sub-views">
        {(
          [
            ["performance", "Performance"],
            ["patterns", "Scoring Patterns"],
            ["lens", "Batter Lens"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="mpd-subpill"
            data-active={sub === id}
            onClick={() => setSub(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 6A. PERFORMANCE */}
      {sub === "performance" && (
        <div className="mpd-card">
          <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
            {isBowler ? "Economy Rate by Match Phase" : "Strike Rate by Match Phase"}
          </div>
          {!isBowler && bat ? (
            <MobilePhaseBars
              rows={[
                ["Powerplay", bat.ppSr || 0],
                ["Middle", bat.middleSr || 0],
                ["Death", bat.deathSr || 0],
              ]}
              max={Math.max(200, bat.ppSr || 0, bat.middleSr || 0, bat.deathSr || 0)}
              accent={teamAccent}
            />
          ) : bowl ? (
            <MobilePhaseBars
              rows={[
                ["Powerplay", bowl.ppEcon ?? 0],
                ["Middle", bowl.middleEcon ?? 0],
                ["Death", bowl.deathEcon ?? 0],
              ]}
              max={14}
              dp={2}
              accent={teamAccent}
            />
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>No phase splits recorded.</p>
          )}

          {radarAxes.length > 0 && (
            <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px solid var(--mpd-line-soft)" }}>
              <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Vector Skill Signature
              </div>
              <VectorRadarSvg axes={radarAxes} accent={teamAccent} />
            </div>
          )}
        </div>
      )}

      {/* 6B. SCORING PATTERNS */}
      {sub === "patterns" && (
        <div className="mpd-card">
          {patterns ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
                    Run Distribution Ring
                  </div>
                  <div style={{ font: "600 11.5px/1.3 var(--m-ui)", color: "var(--m-muted)", marginTop: 4 }}>
                    {patterns.totalBalls.toLocaleString("en-IN")} balls analyzed
                  </div>
                </div>
                <span style={{ font: "800 12px/1 var(--m-mono)", color: teamAccent }}>
                  {patterns.boundaryRunPct}% in bnds
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14, alignItems: "center" }}>
                <ScoringDonutSvg
                  dots={patterns.dots ?? Math.max(0, patterns.totalBalls - patterns.fours - patterns.sixes)}
                  rot={patterns.singlesTwos ?? Math.max(0, Math.round(patterns.totalBalls * 0.35))}
                  fours={patterns.fours}
                  sixes={patterns.sixes}
                  total={patterns.totalBalls}
                  accent={teamAccent}
                />
                <div className="mpd-grid-2">
                  {[
                    ["Dots", patterns.dots != null ? patterns.dots.toLocaleString("en-IN") : "—", "rgba(148,163,184,0.6)"],
                    ["1s–3s", patterns.singlesTwos != null ? patterns.singlesTwos.toLocaleString("en-IN") : "—", "#38bdf8"],
                    ["Fours", patterns.fours.toLocaleString("en-IN"), "#34d399"],
                    ["Sixes", patterns.sixes.toLocaleString("en-IN"), "#fbbf24"],
                  ].map(([k, v, c]) => (
                    <div key={String(k)} className="mpd-kpi" style={{ borderLeft: `3px solid ${c}` }}>
                      <div className="mpd-kpi-k">{k}</div>
                      <div className="mpd-kpi-v" style={{ fontSize: 14 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mpd-grid-2">
                <div className="mpd-kpi">
                  <div className="mpd-kpi-k">Boundary Share</div>
                  <div className="mpd-kpi-v" style={{ color: "#34d399" }}>{patterns.boundaryRunPct}%</div>
                </div>
                <div className="mpd-kpi">
                  <div className="mpd-kpi-k">Dot Ball %</div>
                  <div className="mpd-kpi-v">{patterns.dotPct != null ? `${patterns.dotPct}%` : bowl?.dotPct != null ? `${bowl.dotPct}%` : "—"}</div>
                </div>
              </div>

              {patterns.pace && patterns.spin && (
                <div className="mpd-grid-2">
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs Pace</div>
                    <div className="mpd-kpi-v">{patterns.pace.sr.toFixed(1)} SR</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {patterns.pace.runs} runs ({patterns.pace.balls}b)
                    </div>
                  </div>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs Spin</div>
                    <div className="mpd-kpi-v">{patterns.spin.sr.toFixed(1)} SR</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {patterns.spin.runs} runs ({patterns.spin.balls}b)
                    </div>
                  </div>
                </div>
              )}

              {patterns.byLength.length > 0 && (
                <div>
                  <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                    Scoring by Length
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {patterns.byLength.slice(0, 6).map((row) => (
                      <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                        <span style={{ color: "var(--m-text)", fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontFamily: "var(--m-mono)", color: "var(--m-muted)", fontSize: 11 }}>{row.balls}b</span>
                        <span style={{ fontFamily: "var(--m-mono)", fontWeight: 800, color: teamAccent }}>
                          {((row.runs / row.balls) * 100).toFixed(1)} SR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {patterns.byLine.length > 0 && (
                <div>
                  <div style={{ font: "700 9.5px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                    Scoring by Line
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {patterns.byLine.slice(0, 5).map((row) => (
                      <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                        <span style={{ color: "var(--m-text)", fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontFamily: "var(--m-mono)", color: "var(--m-muted)", fontSize: 11 }}>{row.balls}b</span>
                        <span style={{ fontFamily: "var(--m-mono)", fontWeight: 800, color: "#34d399" }}>
                          {((row.runs / row.balls) * 100).toFixed(1)} SR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>
              Insufficient recorded batting deliveries for scoring pattern splits.
            </p>
          )}
        </div>
      )}

      {/* 6C. ADVANCED BATTER LENS */}
      {sub === "lens" && (
        <div className="mpd-card">
          {batterLensSummary && lensMeta ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
                    Batter Lens · Pitch Heat Grid
                  </div>
                  <div style={{ font: "500 11px/1.3 var(--m-ui)", color: "var(--m-muted)", marginTop: 2 }}>
                    Tap a cell to inspect RAA &amp; SR ({batterLensSummary.labelledCount} tagged deliveries)
                  </div>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 3, fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th />
                      {lensMeta.lines.map((l) => (
                        <th key={l} style={{ color: "var(--m-muted)", fontWeight: 700, paddingBottom: 4, textAlign: "center", fontFamily: "var(--m-mono)", fontSize: 8.5 }}>
                          {l.replace("Outside ", "Out ").replace("Wide ", "W ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lensMeta.lengths.map((len, li) => (
                      <tr key={len}>
                        <th style={{ textAlign: "right", paddingRight: 6, color: "var(--m-muted)", fontWeight: 700, whiteSpace: "nowrap", fontSize: 9 }}>
                          {len}
                        </th>
                        {lensMeta.lines.map((_, ni) => {
                          const c = batterLensSummary.grid.get(`${li}:${ni}`);
                          const srVal = c && c.balls ? Math.round((c.runs / c.balls) * 100) : 0;
                          const rate = c && c.balls >= 5 ? c.x / c.balls : null;
                          const bg =
                            rate === null
                              ? "rgba(255,255,255,0.03)"
                              : rate >= 0
                                ? `rgba(16,185,129,${0.18 + Math.min(0.6, rate / 55)})`
                                : `rgba(244,63,94,${0.18 + Math.min(0.6, -rate / 55)})`;
                          const active = selectedCell?.l === li && selectedCell?.n === ni;
                          return (
                            <td
                              key={ni}
                              onClick={() => c && setSelectedCell(active ? null : { l: li, n: ni })}
                              style={{
                                background: bg,
                                opacity: c ? 0.5 + 0.5 * (c.balls / batterLensSummary.maxCellBalls) : 1,
                                height: 36,
                                borderRadius: 6,
                                textAlign: "center",
                                cursor: c ? "pointer" : "default",
                                border: active ? "1.5px solid #fff" : "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {c ? (
                                <div style={{ lineHeight: 1.1 }}>
                                  <div style={{ fontWeight: 800, color: "#fff", fontFamily: "var(--m-mono)" }}>{srVal}</div>
                                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.65)" }}>{c.balls}b</div>
                                </div>
                              ) : (
                                <span style={{ color: "rgba(255,255,255,0.16)" }}>·</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedCell && (() => {
                const c = batterLensSummary.grid.get(`${selectedCell.l}:${selectedCell.n}`);
                if (!c) return null;
                return (
                  <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--mpd-line)", fontSize: 11.5 }}>
                    <strong>{lensMeta.lengths[selectedCell.l]} × {lensMeta.lines[selectedCell.n]}:</strong>{" "}
                    {c.runs} runs off {c.balls} balls ({((c.runs / c.balls) * 100).toFixed(1)} SR, {c.outs} outs)
                  </div>
                );
              })()}

              {/* Strengths & Areas to Watch (strictly data-supported) */}
              <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
                {batterLensSummary.strengths.length > 0 && (
                  <div style={{ padding: "10px 11px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, font: "800 10px/1 var(--m-mono)", color: "#34d399", textTransform: "uppercase", marginBottom: 6 }}>
                      <Shield size={12} /> Strengths
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4, fontSize: 12, lineHeight: 1.4 }}>
                      {batterLensSummary.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {batterLensSummary.watch.length > 0 && (
                  <div style={{ padding: "10px 11px", borderRadius: 12, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, font: "800 10px/1 var(--m-mono)", color: "#fbbf24", textTransform: "uppercase", marginBottom: 6 }}>
                      <Target size={12} /> Areas to Watch
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4, fontSize: 12, lineHeight: 1.4 }}>
                      {batterLensSummary.watch.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Situational Readout */}
                <div className="mpd-grid-2">
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">Chase Tempo</div>
                    <div className="mpd-kpi-v">
                      {matchAgg.chase.sr != null ? `${matchAgg.chase.sr.toFixed(1)} SR` : "—"}
                    </div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {matchAgg.chase.matches} chase games
                    </div>
                  </div>
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">Pressure SR</div>
                    <div className="mpd-kpi-v">
                      {pressureRow?.pressure?.rate != null ? `${Number(pressureRow.pressure.rate).toFixed(1)}` : "—"}
                    </div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {squadHistory.length} franchise editions
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>
              No Batter Lens ball-by-ball batting record available for this player.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SeasonsSection({ data }: { data: MobilePlayerData }) {
  const { timeline, isBowler, teamAccent } = data;
  const [showAll, setShowAll] = useState(false);

  const ordered = useMemo(() => [...timeline].reverse(), [timeline]);
  const visible = showAll ? ordered : ordered.slice(0, 6);

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">Season Archive</span>
          <h2 className="mpd-title">Season-by-Season Record</h2>
        </div>
        <span style={{ font: "700 11px/1 var(--m-mono)", color: "var(--m-muted)" }}>
          {ordered.length} editions
        </span>
      </div>

      {/* Compact Trends Chart */}
      {timeline.length > 0 && (
        <div className="mpd-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)" }}>
            <span>SEASON TREND ({isBowler ? "WICKETS" : "RUNS"})</span>
            <TrendingUp size={13} style={{ color: teamAccent }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 74, paddingTop: 6 }}>
            {(() => {
              const vals = timeline.map((t) => (isBowler ? t.bowl?.wickets ?? 0 : t.bat?.runs ?? 0));
              const max = Math.max(1, ...vals);
              return timeline.map((t, i) => {
                const v = vals[i];
                const h = Math.max(6, Math.round((v / max) * 58));
                return (
                  <div key={t.season} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div
                      style={{
                        width: "100%",
                        height: h,
                        borderRadius: 4,
                        background: teamAccent,
                        opacity: 0.45 + 0.55 * (v / max),
                      }}
                      title={`${t.season}: ${v}`}
                    />
                    <span style={{ font: "700 8px/1 var(--m-mono)", color: "var(--m-muted)" }}>{t.season.slice(2)}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {visible.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((row) => {
            const tm = row.bat?.team || row.bowl?.team;
            return (
              <div key={row.season} className="mpd-card" style={{ padding: "11px 13px", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ font: "800 14px/1 var(--m-mono)", color: "var(--m-text)" }}>IPL {row.season}</strong>
                  {tm && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--mpd-line)",
                        font: "700 10px/1 var(--m-mono)",
                        color: "var(--m-muted)",
                      }}
                    >
                      {teamShort(tm)}
                    </span>
                  )}
                </div>

                {row.bat && (
                  <div className="mpd-grid-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                    {[
                      ["Runs", row.bat.runs],
                      ["Avg", row.bat.avg.toFixed(1)],
                      ["SR", row.bat.sr.toFixed(1)],
                      ["HS", row.bat.highest],
                    ].map(([k, v]) => (
                      <div key={String(k)}>
                        <div style={{ font: "700 8.5px/1 var(--m-mono)", color: "var(--m-muted)" }}>{k}</div>
                        <div style={{ font: "800 13.5px/1.2 var(--m-mono)", marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {row.bowl && (
                  <div
                    className="mpd-grid-3"
                    style={{
                      gridTemplateColumns: "repeat(4, 1fr)",
                      paddingTop: row.bat ? 6 : 0,
                      borderTop: row.bat ? "1px solid var(--mpd-line-soft)" : 0,
                    }}
                  >
                    {[
                      ["Wkts", row.bowl.wickets],
                      ["Econ", row.bowl.econ.toFixed(2)],
                      ["Avg", row.bowl.avg.toFixed(1)],
                      ["Best", row.bowl.best],
                    ].map(([k, v]) => (
                      <div key={String(k)}>
                        <div style={{ font: "700 8.5px/1 var(--m-mono)", color: "var(--m-muted)" }}>{k}</div>
                        <div style={{ font: "800 13.5px/1.2 var(--m-mono)", marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {ordered.length > 6 && (
            <button
              type="button"
              className="mpd-btn"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer seasons" : `View all ${ordered.length} seasons`}
            </button>
          )}
        </div>
      ) : (
        <div className="mpd-card">
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>No season records found.</p>
        </div>
      )}
    </div>
  );
}

export function BowlingSection({ data }: { data: MobilePlayerData }) {
  const { bowl, timeline, teamAccent } = data;
  const bowlSeasons = useMemo(() => timeline.filter((t) => Boolean(t.bowl)).reverse(), [timeline]);

  return (
    <div className="mpd-sec">
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">With The Ball</span>
          <h2 className="mpd-title">Bowling Intelligence</h2>
        </div>
      </div>

      {!bowl ? (
        <div className="mpd-card">
          <p style={{ margin: 0, fontSize: 13, color: "var(--m-muted)" }}>
            Limited / no IPL bowling innings recorded for this player in the CRICFIELD warehouse.
          </p>
        </div>
      ) : (
        <>
          {bowl.innings < 6 && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", fontSize: 11.5, color: "#fbbf24" }}>
              Limited bowling sample ({bowl.innings} innings, {bowl.overs} overs) — interpret rates cautiously.
            </div>
          )}

          {/* Overall Bowling Summary */}
          <div className="mpd-card">
            <div className="mpd-grid-3">
              {[
                ["Wickets", bowl.wickets],
                ["Overs", bowl.overs],
                ["Economy", bowl.econ.toFixed(2)],
                ["Best", bowl.best],
                ["Dot %", `${bowl.dotPct.toFixed(1)}%`],
                ["True Econ", bowl.trueEconomy != null ? bowl.trueEconomy.toFixed(2) : "—"],
              ].map(([k, v]) => (
                <div key={String(k)} className="mpd-kpi">
                  <div className="mpd-kpi-k">{k}</div>
                  <div className="mpd-kpi-v">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase Economy & Wickets */}
          <div className="mpd-card">
            <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
              Phase-Wise Economy
            </div>
            <MobilePhaseBars
              rows={[
                ["Powerplay", bowl.ppEcon ?? 0],
                ["Middle", bowl.middleEcon ?? 0],
                ["Death", bowl.deathEcon ?? 0],
              ]}
              max={14}
              dp={2}
              accent={teamAccent}
            />
            <div className="mpd-grid-3" style={{ paddingTop: 4 }}>
              {[
                ["PP Wkts", bowl.ppWickets],
                ["Mid Wkts", bowl.middleWickets],
                ["Death Wkts", bowl.deathWickets],
              ].map(([k, v]) => (
                <div key={String(k)} className="mpd-kpi">
                  <div className="mpd-kpi-k">{k}</div>
                  <div className="mpd-kpi-v">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* vs LHB / vs RHB split */}
          {(bowl.vsLhb || bowl.vsRhb) && (
            <div className="mpd-card">
              <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
                Matchup vs Batting Hand
              </div>
              <div className="mpd-grid-2">
                {bowl.vsLhb && (
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs LHB</div>
                    <div className="mpd-kpi-v">{bowl.vsLhb.wickets}W</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {bowl.vsLhb.runs}r · {bowl.vsLhb.balls}b · SR {bowl.vsLhb.strikeRate.toFixed(1)}
                    </div>
                  </div>
                )}
                {bowl.vsRhb && (
                  <div className="mpd-kpi">
                    <div className="mpd-kpi-k">vs RHB</div>
                    <div className="mpd-kpi-v">{bowl.vsRhb.wickets}W</div>
                    <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--m-muted)", marginTop: 2 }}>
                      {bowl.vsRhb.runs}r · {bowl.vsRhb.balls}b · SR {bowl.vsRhb.strikeRate.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Season Bowling Breakdown */}
          {bowlSeasons.length > 0 && (
            <div className="mpd-card">
              <div style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
                Season Bowling Log
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {bowlSeasons.slice(0, 8).map((s) => (
                  <div
                    key={s.season}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "56px 1fr auto",
                      gap: 8,
                      padding: "7px 0",
                      borderTop: "1px solid var(--mpd-line-soft)",
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ fontFamily: "var(--m-mono)" }}>{s.season}</strong>
                    <span style={{ color: "var(--m-muted)", fontFamily: "var(--m-mono)" }}>
                      {s.bowl!.wickets} wkts · {s.bowl!.overs} ov · {s.bowl!.best}
                    </span>
                    <strong style={{ fontFamily: "var(--m-mono)", color: teamAccent }}>
                      {s.bowl!.econ.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MobilePhaseBars({
  rows,
  max,
  dp = 1,
  accent,
}: {
  rows: [string, number][];
  max: number;
  dp?: number;
  accent: string;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr 52px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
          <span style={{ color: "var(--m-text)", fontWeight: 600 }}>{label}</span>
          <span style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "block" }}>
            <i
              style={{
                display: "block",
                height: "100%",
                width: `${Math.min(100, ((val || 0) / max) * 100)}%`,
                background: accent,
                borderRadius: 999,
              }}
            />
          </span>
          <strong style={{ textAlign: "right", fontFamily: "var(--m-mono)" }}>{val ? val.toFixed(dp) : "—"}</strong>
        </div>
      ))}
    </div>
  );
}

function VectorRadarSvg({
  axes,
  accent,
}: {
  axes: { label: string; raw: number; val: number }[];
  accent: string;
}) {
  const cx = 120,
    cy = 100,
    R = 68;
  const pt = (idx: number, radius: number) => {
    const angle = (Math.PI * 2 * idx) / axes.length - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };
  const poly = axes.map((a, i) => pt(i, (a.val / 100) * R).join(",")).join(" ");

  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-[260px] mx-auto h-auto" role="img" aria-label="Phase vector radar chart">
      {[0.33, 0.66, 1].map((scale) => (
        <polygon
          key={scale}
          points={axes.map((_, i) => pt(i, R * scale).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => {
        const [x2, y2] = pt(i, R);
        const [lx, ly] = pt(i, R + 16);
        return (
          <g key={a.label}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" />
            <text x={lx} y={ly + 3} textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="var(--m-mono)" fill="#94a3b8">
              {a.label}
            </text>
          </g>
        );
      })}
      <polygon points={poly} fill={accent} fillOpacity={0.28} stroke={accent} strokeWidth={2} />
    </svg>
  );
}

function ScoringDonutSvg({
  dots,
  rot,
  fours,
  sixes,
  total,
  accent,
}: {
  dots: number;
  rot: number;
  fours: number;
  sixes: number;
  total: number;
  accent: string;
}) {
  const R = 36,
    C = 2 * Math.PI * R;
  const sum = Math.max(1, dots + rot + fours + sixes);
  const segs = [
    { v: dots, color: "rgba(148,163,184,0.55)" },
    { v: rot, color: "#38bdf8" },
    { v: fours, color: "#34d399" },
    { v: sixes, color: "#fbbf24" },
  ];
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-[104px] h-[104px]" role="img" aria-label="Scoring distribution donut">
      <circle cx={50} cy={50} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={11} />
      {segs.map((s, idx) => {
        const len = (s.v / sum) * C;
        const el = (
          <circle
            key={idx}
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={11}
            strokeDasharray={`${len} ${C}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
      <text x={50} y={48} textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="var(--m-mono)" fill="#ffffff">
        {total > 999 ? `${(total / 1000).toFixed(1)}k` : total}
      </text>
      <text x={50} y={60} textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="var(--m-mono)" fill={accent}>
        BALLS
      </text>
    </svg>
  );
}
