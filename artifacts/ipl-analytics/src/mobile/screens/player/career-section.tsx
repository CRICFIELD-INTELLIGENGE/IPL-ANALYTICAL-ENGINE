import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Award, ChevronDown, ChevronUp, Coins, Cpu, Crown, Flame, Gauge, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { TeamLogo } from "@/components/team-logo";
import { EditorialImageFigure } from "@/components/dugout/editorial-image-figure";
import { teamShort } from "@/lib/aggregates";
import type { MobilePlayerData, PlayerMilestone } from "./use-mobile-player";

export function CareerSection({
  data,
  onOpenBowling,
}: {
  data: MobilePlayerData;
  onOpenBowling: () => void;
}) {
  const {
    bio,
    displayName,
    primaryTeam,
    teamAccent,
    bat,
    bowl,
    isBowler,
    isAllRounder,
    timeline,
    squadHistory,
    captaincy,
    lens,
    pressureRow,
    matchAgg,
    milestones,
    playerImages,
  } = data;

  const [chartMode, setChartMode] = useState<"batting" | "bowling">(isBowler ? "bowling" : "batting");
  const [activeSeasonIdx, setActiveSeasonIdx] = useState<number | null>(null);
  const [milestoneFilter, setMilestoneFilter] = useState<"all" | "records" | "matches" | "chapters">("all");
  const [showAllAuction, setShowAllAuction] = useState(false);

  useEffect(() => {
    setChartMode(isBowler ? "bowling" : "batting");
    setActiveSeasonIdx(null);
    setShowAllAuction(false);
  }, [bio?.playerName, isBowler]);

  const showBattingChart = chartMode === "batting" && Boolean(bat || timeline.some((t) => t.bat));
  const chartRows = useMemo(
    () =>
      timeline
        .filter((t) => (showBattingChart ? Boolean(t.bat) : Boolean(t.bowl)))
        .map((t) => ({
          season: t.season,
          primary: showBattingChart ? Number(t.bat?.runs ?? 0) : Number(t.bowl?.wickets ?? 0),
          secondary: showBattingChart ? Number(t.bat?.sr ?? 0) : Number(t.bowl?.econ ?? 0),
          subLabel: showBattingChart
            ? `HS ${t.bat?.highest ?? "—"} · Avg ${t.bat?.avg?.toFixed?.(1) ?? "—"}`
            : `Avg ${t.bowl?.avg?.toFixed?.(1) ?? "—"} · Best ${t.bowl?.best ?? "—"}`,
        })),
    [timeline, showBattingChart],
  );

  // Career Telemetry computations — strictly deterministic from existing aggregates
  const telemetry = useMemo(() => {
    const validSeasons = chartRows.filter((r) => r.primary > 0);
    const vals = validSeasons.map((r) => r.primary);
    const maxVal = vals.length ? Math.max(...vals) : 0;
    const avgVal = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const variance =
      vals.length > 1 ? vals.reduce((s, v) => s + (v - avgVal) ** 2, 0) / vals.length : 0;
    const cvPct = avgVal > 0 ? Math.min(100, Math.round((Math.sqrt(variance) / avgVal) * 100)) : null;
    const consistencyScore = cvPct != null ? Math.max(10, Math.min(99, 100 - Math.round(cvPct * 0.65))) : null;

    // Sliding 3-season peak window
    let peakWindowLabel = "—";
    let peakWindowTotal = 0;
    if (validSeasons.length >= 3) {
      for (let i = 0; i <= validSeasons.length - 3; i++) {
        const sum3 = validSeasons[i].primary + validSeasons[i + 1].primary + validSeasons[i + 2].primary;
        if (sum3 > peakWindowTotal) {
          peakWindowTotal = sum3;
          peakWindowLabel = `${validSeasons[i].season}–${validSeasons[i + 2].season}`;
        }
      }
    } else if (validSeasons.length > 0) {
      const peak = [...validSeasons].sort((a, b) => b.primary - a.primary)[0];
      peakWindowTotal = peak.primary;
      peakWindowLabel = `IPL ${peak.season}`;
    }

    // Conversion rate (50+ innings %) & Boundary Frequency (Balls per boundary)
    const milestonesCount = bat ? Number(bat.fifties || 0) + Number(bat.hundreds || 0) : 0;
    const conversionPct = bat && bat.innings > 0 ? Math.round((milestonesCount / bat.innings) * 1000) / 10 : null;
    const hundredConvPct =
      bat && milestonesCount > 0 ? Math.round((Number(bat.hundreds || 0) / milestonesCount) * 1000) / 10 : null;
    const totalBoundaries = bat ? Number(bat.fours || 0) + Number(bat.sixes || 0) : 0;
    const ballsPerBoundary =
      bat && totalBoundaries > 0 ? Math.round((Number(bat.balls || 0) / totalBoundaries) * 10) / 10 : null;

    // Dot-ball resistance from BatterLens balls (for batters) or Bowler dot% (for bowlers)
    const lensBalls = lens.player.data?.balls;
    const lensDots = lensBalls ? lensBalls.r.filter((x) => x === 0).length : 0;
    const dotResistancePct =
      lensBalls && lensBalls.r.length > 0
        ? Math.round((1 - lensDots / lensBalls.r.length) * 1000) / 10
        : bowl?.dotPct != null
          ? Number(bowl.dotPct.toFixed(1))
          : null;

    return {
      maxVal,
      peakWindowLabel,
      peakWindowTotal,
      consistencyScore,
      conversionPct,
      hundredConvPct,
      ballsPerBoundary,
      dotResistancePct,
      isBowlerDotMetric: !(lensBalls && lensBalls.r.length > 0) && bowl?.dotPct != null,
    };
  }, [chartRows, bat, bowl, lens.player.data]);

  const filteredMilestones = useMemo(
    () => (milestoneFilter === "all" ? milestones : milestones.filter((m) => m.category === milestoneFilter)),
    [milestones, milestoneFilter],
  );

  if (!bio) return null;

  const focusedRow =
    activeSeasonIdx != null && chartRows[activeSeasonIdx]
      ? chartRows[activeSeasonIdx]
      : chartRows[chartRows.length - 1];

  return (
    <div className="mpd-sec">
      {/* A. IPL CAREER OVERVIEW */}
      <div className="mpd-sec-head">
        <div>
          <span className="mpd-kicker">A · IPL Career Overview</span>
          <h2 className="mpd-title">Verified Career Ledger</h2>
        </div>
        {isAllRounder && (
          <button
            type="button"
            className="mpd-subpill"
            data-active="false"
            onClick={onOpenBowling}
          >
            Bowling splits →
          </button>
        )}
      </div>

      <div className="mpd-card">
        {bat ? (
          <div className="mpd-grid-3">
            {[
              ["Innings", bat.innings],
              ["Runs", bat.runs.toLocaleString("en-IN")],
              ["Balls", bat.balls.toLocaleString("en-IN")],
              ["50s / 100s", `${bat.fifties} / ${bat.hundreds}`],
              ["Fours", bat.fours.toLocaleString("en-IN")],
              ["Sixes", bat.sixes.toLocaleString("en-IN")],
            ].map(([label, val]) => (
              <div key={String(label)} className="mpd-kpi">
                <div className="mpd-kpi-k">{label}</div>
                <div className="mpd-kpi-v">{val}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--m-muted)" }}>
            No recorded IPL batting innings in warehouse.
          </p>
        )}

        {bowl && (
          <div
            style={{
              padding: "10px 11px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--mpd-line-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--m-muted)", lineHeight: 1.4 }}>
              <strong style={{ color: "var(--m-text)", fontFamily: "var(--m-mono)" }}>
                {bowl.wickets} wkts
              </strong>{" "}
              in {bowl.overs} overs · Econ {bowl.econ.toFixed(2)} · Best {bowl.best}
            </div>
            <button
              type="button"
              onClick={onOpenBowling}
              style={{
                border: 0,
                background: "transparent",
                color: "var(--mpd-accent)",
                font: "700 11px/1 var(--m-mono)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Details →
            </button>
          </div>
        )}
      </div>

      {/* B. CAREER PROGRESSION */}
      <div className="mpd-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div>
            <span className="mpd-kicker">C · Career Progression</span>
            <h3 style={{ margin: "2px 0 0", font: "800 15px/1.2 var(--m-display)" }}>
              Season-by-Season Curve
            </h3>
          </div>
          {bat && bowl && (
            <div style={{ display: "flex", gap: 4 }}>
              {(["batting", "bowling"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="mpd-subpill"
                  data-active={chartMode === m}
                  style={{ padding: "5px 10px", fontSize: 10.5 }}
                  onClick={() => {
                    setChartMode(m);
                    setActiveSeasonIdx(null);
                  }}
                >
                  {m === "batting" ? "Runs" : "Wickets"}
                </button>
              ))}
            </div>
          )}
        </div>

        {chartRows.length > 0 ? (
          <>
            <ProgressionSvg
              rows={chartRows}
              accent={teamAccent}
              activeIdx={activeSeasonIdx}
              onSelect={setActiveSeasonIdx}
            />
            {focusedRow && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--mpd-line-soft)",
                  fontSize: 11.5,
                }}
              >
                <span style={{ fontFamily: "var(--m-mono)", fontWeight: 700, color: "var(--m-text)" }}>
                  IPL {focusedRow.season}
                </span>
                <span style={{ fontFamily: "var(--m-mono)", color: "var(--mpd-accent)", fontWeight: 700 }}>
                  {showBattingChart
                    ? `${focusedRow.primary} runs · SR ${focusedRow.secondary.toFixed(1)}`
                    : `${focusedRow.primary} wkts · Econ ${focusedRow.secondary.toFixed(2)}`}
                </span>
              </div>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>
            Season progression unavailable for this profile.
          </p>
        )}
      </div>

      {/* D. MILESTONES SECTION (Editorial Collector Rail) */}
      <div className="mpd-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <span className="mpd-kicker">D · Career Milestones</span>
            <h3 style={{ margin: "2px 0 0", font: "800 15px/1.2 var(--m-display)" }}>
              Collector Moments &amp; Landmarks
            </h3>
          </div>
          <Trophy size={16} style={{ color: teamAccent }} />
        </div>

        <div className="mpd-subpills">
          {(
            [
              ["all", "All"],
              ["records", "Benchmarks"],
              ["matches", "Top Knocks"],
              ["chapters", "Chapters"],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              className="mpd-subpill"
              data-active={milestoneFilter === id}
              onClick={() => setMilestoneFilter(id)}
            >
              {lbl}
            </button>
          ))}
        </div>

        {filteredMilestones.length > 0 ? (
          <div className="mpd-milestone-rail">
            {filteredMilestones.map((m) => (
              <MilestoneCollectorCard
                key={m.id}
                milestone={m}
                playerName={displayName}
                bioName={bio.playerName}
                teamAccent={teamAccent}
                primaryTeam={primaryTeam}
                playerImages={playerImages}
              />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>
            No recorded landmarks match this category.
          </p>
        )}
      </div>

      {/* E. CAREER TELEMETRY (F1-Inspired Performance Engineering Panel) */}
      <div className="mpd-telemetry" data-testid="mpd-career-telemetry">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "color-mix(in srgb, var(--mpd-accent) 16%, transparent)",
                border: "1px solid color-mix(in srgb, var(--mpd-accent) 45%, transparent)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Cpu size={14} style={{ color: "var(--mpd-accent)" }} />
            </div>
            <div>
              <span className="mpd-kicker" style={{ letterSpacing: "0.16em" }}>
                E · Performance Engineering
              </span>
              <h3 style={{ margin: 0, font: "800 14.5px/1.15 var(--m-display)", color: "#fff" }}>
                Career Telemetry
              </h3>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              font: "700 9px/1 var(--m-mono)",
              color: "#34d399",
            }}
          >
            <span className="mpd-led" style={{ background: "#34d399", color: "#34d399" }} />
            VERIFIED TRACE
          </span>
        </div>

        {/* Multi-channel Telemetry Trace Graphic */}
        {chartRows.length > 1 && (
          <TelemetryTraceSvg rows={chartRows} accent={teamAccent} secondary="#34d399" isBowler={!showBattingChart} />
        )}

        {/* Segmented Telemetry Strips */}
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {/* Strip 1: Phase Velocity / Economy Delta */}
          {bat && !isBowler && (
            <TelemetryStripRow
              label="PHASE VELOCITY · PP / MID / DEATH"
              value={`${bat.ppSr.toFixed(0)} → ${bat.middleSr.toFixed(0)} → ${bat.deathSr.toFixed(0)} SR`}
              pct={Math.min(100, Math.round((Math.max(bat.ppSr, bat.middleSr, bat.deathSr) / 220) * 100))}
              color="#38bdf8"
            />
          )}
          {bowl && (isBowler || isAllRounder) && (
            <TelemetryStripRow
              label="BOWLING PHASE ECON · PP / MID / DEATH"
              value={`${(bowl.ppEcon ?? 0).toFixed(2)} / ${(bowl.middleEcon ?? 0).toFixed(2)} / ${(bowl.deathEcon ?? 0).toFixed(2)}`}
              pct={Math.min(100, Math.round((1 - Math.min(12, bowl.econ) / 14) * 100))}
              color="#a78bfa"
            />
          )}

          {/* Strip 2: Consistency & Peak Window */}
          <div className="mpd-grid-2">
            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                PEAK SCORING WINDOW
              </div>
              <div style={{ font: "800 13.5px/1.2 var(--m-mono)", color: "#fff", marginTop: 4 }}>
                {telemetry.peakWindowLabel}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "var(--mpd-accent)", marginTop: 2 }}>
                {telemetry.peakWindowTotal > 0
                  ? `${telemetry.peakWindowTotal.toLocaleString("en-IN")} ${showBattingChart ? "runs" : "wkts"}`
                  : "—"}
              </div>
            </div>

            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                CONSISTENCY INDEX
              </div>
              <div style={{ font: "800 13.5px/1.2 var(--m-mono)", color: telemetry.consistencyScore != null ? "#34d399" : "#94a3b8", marginTop: 4 }}>
                {telemetry.consistencyScore != null ? `${telemetry.consistencyScore}/100` : "Insufficient"}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "#94a3b8", marginTop: 2 }}>
                Across {chartRows.length} editions
              </div>
            </div>
          </div>

          {/* Telemetry Readouts Matrix: Conversion / Boundary Freq / Dot Resistance / Chase vs Defend */}
          <div className="mpd-grid-2">
            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                {isBowler ? "DOT-BALL PRESSURE" : "50+ CONVERSION RATE"}
              </div>
              <div style={{ font: "800 14px/1.2 var(--m-mono)", color: "#fff", marginTop: 4 }}>
                {isBowler
                  ? bowl?.dotPct != null
                    ? `${bowl.dotPct.toFixed(1)}%`
                    : "—"
                  : telemetry.conversionPct != null
                    ? `${telemetry.conversionPct}%`
                    : "—"}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "#94a3b8", marginTop: 2 }}>
                {isBowler
                  ? `True econ: ${bowl?.trueEconomy != null ? bowl.trueEconomy.toFixed(2) : "—"}`
                  : telemetry.hundredConvPct != null
                    ? `${telemetry.hundredConvPct}% 50→100 rate`
                    : "50+/innings"}
              </div>
            </div>

            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                {isBowler ? "BOUNDARY CONCESSION" : "BOUNDARY FREQUENCY"}
              </div>
              <div style={{ font: "800 14px/1.2 var(--m-mono)", color: "#fbbf24", marginTop: 4 }}>
                {isBowler
                  ? bowl?.ballsPerBoundary != null
                    ? `${bowl.ballsPerBoundary.toFixed(1)} b/bnd`
                    : "—"
                  : telemetry.ballsPerBoundary != null
                    ? `${telemetry.ballsPerBoundary} b/bnd`
                    : "—"}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "#94a3b8", marginTop: 2 }}>
                {isBowler
                  ? `${bowl?.boundaryPct?.toFixed?.(1) ?? "—"}% boundary rate`
                  : telemetry.dotResistancePct != null
                    ? `${telemetry.dotResistancePct}% non-dot rotation`
                    : `${bat?.boundaryPct?.toFixed?.(1) ?? "—"}% bnd share`}
              </div>
            </div>
          </div>

          {/* Chase vs Defend Split + Clutch Response */}
          <div className="mpd-grid-2">
            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                CHASE VS DEFEND
              </div>
              <div style={{ font: "800 12.5px/1.25 var(--m-mono)", color: "#fff", marginTop: 4 }}>
                {isBowler
                  ? `${matchAgg.chase.econ != null ? matchAgg.chase.econ.toFixed(2) : "—"} / ${matchAgg.defend.econ != null ? matchAgg.defend.econ.toFixed(2) : "—"}`
                  : `${matchAgg.chase.sr != null ? matchAgg.chase.sr.toFixed(1) : "—"} / ${matchAgg.defend.sr != null ? matchAgg.defend.sr.toFixed(1) : "—"}`}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "#94a3b8", marginTop: 2 }}>
                {matchAgg.chase.winPct != null || matchAgg.defend.winPct != null
                  ? `Win: ${matchAgg.chase.winPct ?? "—"}% chase · ${matchAgg.defend.winPct ?? "—"}% defend`
                  : "No split sample"}
              </div>
            </div>

            <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ font: "700 8.5px/1.1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                PRESSURE RESPONSE
              </div>
              <div style={{ font: "800 13.5px/1.2 var(--m-mono)", color: pressureRow ? "#f472b6" : "#94a3b8", marginTop: 4 }}>
                {pressureRow?.pressure?.rate != null
                  ? `${Number(pressureRow.pressure.rate).toFixed(isBowler ? 2 : 1)} ${isBowler ? "econ" : "SR"}`
                  : "Insufficient"}
              </div>
              <div style={{ font: "600 10px/1.2 var(--m-mono)", color: "#94a3b8", marginTop: 2 }}>
                {pressureRow?.rateLift != null
                  ? `${pressureRow.rateLift > 0 ? "+" : ""}${Number(pressureRow.rateLift).toFixed(isBowler ? 2 : 1)} vs baseline`
                  : `${pressureRow?.pressureMatches ?? 0} high-leverage games`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAPTAINCY RECORD */}
      {captaincy && (
        <div className="mpd-card" data-testid="mpd-captaincy-record">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Crown size={16} style={{ color: "#fbbf24" }} />
              <div>
                <span className="mpd-kicker">Leadership</span>
                <h3 style={{ margin: "2px 0 0", font: "800 15px/1.2 var(--m-display)" }}>
                  Captaincy Record
                </h3>
              </div>
            </div>
            {captaincy.titles > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 9px",
                  borderRadius: 999,
                  font: "800 9.5px/1 var(--m-mono)",
                  background: "rgba(251, 191, 36, 0.14)",
                  border: "1px solid rgba(251, 191, 36, 0.35)",
                  color: "#fcd34d",
                }}
              >
                <Trophy size={11} />
                {captaincy.titles} {captaincy.titles === 1 ? "Title" : "Titles"}
              </span>
            )}
          </div>

          <div style={{ font: "600 11px/1.3 var(--m-mono)", color: "var(--m-muted)", marginTop: 6 }}>
            {captaincy.firstSeason === captaincy.lastSeason
              ? `Led in IPL ${captaincy.firstSeason}`
              : `Led from IPL ${captaincy.firstSeason} to ${captaincy.lastSeason}`}
          </div>

          <div className="mpd-grid-3" style={{ marginTop: 10 }}>
            <div className="mpd-kpi">
              <div className="mpd-kpi-k">Matches</div>
              <div className="mpd-kpi-v">{captaincy.matches}</div>
            </div>
            <div className="mpd-kpi">
              <div className="mpd-kpi-k">Won / Lost</div>
              <div className="mpd-kpi-v" style={{ color: "#34d399" }}>
                {captaincy.won}
                <span style={{ color: "var(--m-muted)", fontWeight: 700 }}>/</span>
                <span style={{ color: "#f87171" }}>{captaincy.lost}</span>
              </div>
            </div>
            <div className="mpd-kpi">
              <div className="mpd-kpi-k">Win %</div>
              <div className="mpd-kpi-v" style={{ color: teamAccent }}>
                {captaincy.matches > 0 ? Math.round((captaincy.won / captaincy.matches) * 1000) / 10 : 0}%
              </div>
            </div>
          </div>

          {captaincy.teams.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              <span style={{ font: "700 9.5px/1 var(--m-mono)", color: "var(--m-muted)", textTransform: "uppercase" }}>
                Led
              </span>
              {captaincy.teams.map((code) => (
                <span
                  key={code}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--mpd-line)",
                    font: "700 10.5px/1 var(--m-mono)",
                    color: "var(--m-text)",
                  }}
                >
                  <TeamLogo team={code} size="w-3.5 h-3.5" />
                  {teamShort(code)}
                </span>
              ))}
              <span style={{ marginLeft: "auto", font: "600 10px/1 var(--m-mono)", color: "var(--m-muted)" }}>
                T/NR {captaincy.tied}/{captaincy.noResult}
              </span>
            </div>
          )}
        </div>
      )}

      {/* CAREER AUCTION PRICE PROGRESSION */}
      <div className="mpd-card" data-testid="mpd-career-auction-price">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Coins size={16} style={{ color: "#34d399" }} />
            <div>
              <span className="mpd-kicker">Contract Ledger</span>
              <h3 style={{ margin: "2px 0 0", font: "800 15px/1.2 var(--m-display)" }}>
                Career Auction Price
              </h3>
            </div>
          </div>
          {squadHistory.length > 0 && (
            <span style={{ font: "700 10px/1 var(--m-mono)", color: "var(--m-muted)" }}>
              {squadHistory.length} {squadHistory.length === 1 ? "season" : "seasons"}
            </span>
          )}
        </div>

        <p style={{ margin: "4px 0 10px", font: "600 10.5px/1.3 var(--m-mono)", color: "var(--m-muted)" }}>
          Fee paid per season — retentions included, sourced from IPL auction records
        </p>

        {squadHistory.length > 0 ? (
          <>
            <div style={{ display: "grid", gap: 7 }}>
              {(showAllAuction ? [...squadHistory].reverse() : squadHistory.slice(-3).reverse()).map((r) => {
                const feeText =
                  r.priceDisplay ||
                  (r.priceLakh != null ? `₹${(r.priceLakh / 100).toFixed(2)} Cr` : "Undisclosed");
                const isRetained = r.acquisition === "retained";
                return (
                  <div
                    key={`${r.season}-${r.team}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "9px 11px",
                      borderRadius: 11,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--mpd-line-soft)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <span
                        style={{
                          padding: "4px 7px",
                          borderRadius: 7,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--mpd-line)",
                          font: "800 11px/1 var(--m-mono)",
                          color: "var(--m-text)",
                          flexShrink: 0,
                        }}
                      >
                        {r.season}
                      </span>
                      <TeamLogo team={r.team} size="w-5 h-5" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: "700 12px/1.2 var(--m-ui)", color: "var(--m-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {teamShort(r.team)}
                        </div>
                        <div
                          style={{
                            font: "700 9px/1.2 var(--m-mono)",
                            textTransform: "uppercase",
                            color: isRetained ? "#34d399" : "var(--m-muted)",
                            marginTop: 2,
                          }}
                        >
                          {r.acquisition || "squad"}
                        </div>
                      </div>
                    </div>
                    <div style={{ font: "800 13px/1 var(--m-mono)", color: r.priceDisplay || r.priceLakh != null ? "#fbbf24" : "var(--m-muted)", flexShrink: 0 }}>
                      {feeText}
                    </div>
                  </div>
                );
              })}
            </div>

            {squadHistory.length > 3 && (
              <button
                type="button"
                className="mpd-btn"
                style={{ width: "100%", marginTop: 10, height: 36 }}
                onClick={() => setShowAllAuction((v) => !v)}
              >
                {showAllAuction ? (
                  <>
                    Collapse older seasons <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Show all {squadHistory.length} auction seasons <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: "var(--m-muted)" }}>
            No auction record found for this player.
          </p>
        )}
      </div>
    </div>
  );
}

function MilestoneCollectorCard({
  milestone,
  playerName,
  bioName,
  teamAccent,
  primaryTeam,
  playerImages,
}: {
  milestone: PlayerMilestone;
  playerName: string;
  bioName: string;
  teamAccent: string;
  primaryTeam: string;
  playerImages: Record<string, string>;
}) {
  return (
    <article className="mpd-milestone-card" style={{ ["--c" as string]: teamAccent }}>
      <div className="mpd-milestone-media">
        {milestone.photo ? (
          <EditorialImageFigure
            image={milestone.photo}
            fallback={
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingRight: 10 }}>
                <PlayerAvatar
                  framing="chest"
                  name={bioName}
                  teamId={primaryTeam}
                  season={milestone.season}
                  strictHistoricalJersey={false}
                  playerImages={playerImages}
                  className="w-24 h-24"
                  imgClassName="w-full h-full object-contain object-bottom"
                />
              </div>
            }
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", paddingRight: 12 }}>
            <PlayerAvatar
              framing="chest"
              name={bioName}
              teamId={primaryTeam}
              season={milestone.season}
              strictHistoricalJersey={false}
              playerImages={playerImages}
              className="w-24 h-24"
              imgClassName="w-full h-full object-contain object-bottom"
            />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(5,8,22,0.05) 10%, rgba(7,10,22,0.92) 98%)",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            padding: "4px 8px",
            borderRadius: 999,
            background: "rgba(5,8,22,0.8)",
            border: `1px solid ${teamAccent}66`,
            font: "800 9.5px/1 var(--m-mono)",
            color: teamAccent,
          }}
        >
          IPL {milestone.season || "ARCHIVE"}
        </span>
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 8,
            font: "900 22px/1 var(--m-mono)",
            color: "#ffffff",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          {milestone.callout}
        </div>
      </div>

      <div style={{ padding: "11px 12px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ font: "700 9px/1 var(--m-mono)", letterSpacing: "0.1em", color: teamAccent }}>
          {milestone.kicker}
        </div>
        <h4 style={{ margin: 0, font: "800 13.5px/1.2 var(--m-display)", color: "#fff" }}>
          {milestone.title}
        </h4>
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.4, color: "rgba(203,213,225,0.8)" }}>
          {milestone.description}
        </p>

        <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 6 }}>
          {milestone.stats.slice(0, 2).map((st) => (
            <div
              key={st.label}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ font: "700 8px/1 var(--m-mono)", color: "#94a3b8", textTransform: "uppercase" }}>
                {st.label}
              </div>
              <div style={{ font: "800 12px/1.2 var(--m-mono)", color: "#fff", marginTop: 2 }}>{st.value}</div>
            </div>
          ))}
        </div>

        {milestone.matchId && (
          <Link
            href={`/match/${milestone.matchId}`}
            style={{
              font: "700 10.5px/1 var(--m-mono)",
              color: teamAccent,
              textDecoration: "none",
              marginTop: 4,
            }}
          >
            Inspect scorecard ({playerName.split(" ").slice(-1)[0]}) →
          </Link>
        )}
      </div>
    </article>
  );
}

function TelemetryStripRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  const activeSegments = Math.max(1, Math.min(16, Math.round((pct / 100) * 16)));
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ font: "700 9px/1 var(--m-mono)", color: "#94a3b8" }}>{label}</span>
        <span style={{ font: "800 11px/1 var(--m-mono)", color: "#fff" }}>{value}</span>
      </div>
      <div className="mpd-telemetry-strip" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="mpd-telemetry-seg"
            style={{
              background: i < activeSegments ? color : "rgba(255,255,255,0.08)",
              opacity: i < activeSegments ? 0.55 + (i / 16) * 0.45 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressionSvg({
  rows,
  accent,
  activeIdx,
  onSelect,
}: {
  rows: { season: string; primary: number; secondary: number }[];
  accent: string;
  activeIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  const W = 320;
  const H = 128;
  const maxP = Math.max(1, ...rows.map((r) => r.primary));
  const x = (i: number) => (rows.length <= 1 ? W / 2 : 16 + (i / (rows.length - 1)) * (W - 32));
  const y = (v: number) => H - 22 - (v / maxP) * (H - 36);
  const pts = rows.map((r, i) => `${x(i)},${y(r.primary)}`).join(" ");
  const area = `${x(0)},${H - 22} ${pts} ${x(rows.length - 1)},${H - 22}`;
  const selected = activeIdx != null && rows[activeIdx] ? activeIdx : rows.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Career season progression">
      <defs>
        <linearGradient id="mpdProgFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.42" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={12} x2={W - 12} y1={H - 22} y2={H - 22} stroke="rgba(255,255,255,0.1)" />
      <polygon points={area} fill="url(#mpdProgFill)" />
      <polyline points={pts} fill="none" stroke={accent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {rows.map((r, i) => {
        const isSel = i === selected;
        return (
          <g key={r.season} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            <circle
              cx={x(i)}
              cy={y(r.primary)}
              r={isSel ? 5 : 2.8}
              fill={isSel ? "#ffffff" : accent}
              stroke={accent}
              strokeWidth={isSel ? 2 : 0}
            />
            {(i === 0 || i === rows.length - 1 || isSel) && (
              <text
                x={x(i)}
                y={H - 7}
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="var(--m-mono)"
                fill={isSel ? "#ffffff" : "rgba(148,163,184,0.85)"}
              >
                {r.season.slice(2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TelemetryTraceSvg({
  rows,
  accent,
  secondary,
  isBowler,
}: {
  rows: { season: string; primary: number; secondary: number }[];
  accent: string;
  secondary: string;
  isBowler: boolean;
}) {
  const W = 320;
  const H = 96;
  const maxP = Math.max(1, ...rows.map((r) => r.primary));
  const maxS = Math.max(1, ...rows.map((r) => r.secondary));
  const x = (i: number) => 14 + (i / Math.max(1, rows.length - 1)) * (W - 28);
  const yp = (v: number) => H - 16 - (v / maxP) * (H - 30);
  const ys = (v: number) => H - 16 - ((isBowler ? maxS - v : v) / maxS) * (H - 30);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Telemetry rate and volume trace">
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={10}
          x2={W - 10}
          y1={14 + g * (H - 30)}
          y2={14 + g * (H - 30)}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="3 3"
        />
      ))}
      <polyline
        points={rows.map((r, i) => `${x(i)},${yp(r.primary)}`).join(" ")}
        fill="none"
        stroke={accent}
        strokeWidth={2.2}
      />
      <polyline
        points={rows.map((r, i) => `${x(i)},${ys(r.secondary)}`).join(" ")}
        fill="none"
        stroke={secondary}
        strokeWidth={1.6}
        strokeDasharray="4 3"
      />
      <text x={14} y={11} fontSize="8" fontFamily="var(--m-mono)" fill={accent}>
        VOLUME
      </text>
      <text x={W - 14} y={11} fontSize="8" fontFamily="var(--m-mono)" fill={secondary} textAnchor="end">
        {isBowler ? "ECON EFFICIENCY" : "STRIKE VELOCITY"}
      </text>
    </svg>
  );
}
