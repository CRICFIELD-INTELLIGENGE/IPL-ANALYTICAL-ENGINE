import React, { useMemo } from "react";
import { TrendingUp, Award, Flame, Zap, BarChart2 } from "lucide-react";
import { type MatchScorecard, teamColor, teamShort } from "@/lib/aggregates";

export interface MatchMomentumPanelProps {
  card?: MatchScorecard;
  matchId?: number | string;
}

export function MatchMomentumPanel({ card, matchId }: MatchMomentumPanelProps) {
  const inn1 = card?.innings?.[0];
  const inn2 = card?.innings?.[1];

  const team1Name = inn1?.team || "Team 1";
  const team2Name = inn2?.team || "Team 2";

  const team1Code = teamShort(team1Name);
  const team2Code = teamShort(team2Name);

  const t1Color = teamColor(team1Name);
  const t2Color = teamColor(team2Name);

  // Derive highest partnership from innings data
  const highestPartnership = useMemo(() => {
    if (!inn1 && !inn2) return null;
    let best = { runs: 0, balls: 0, p1: "", p2: "" };

    for (const inn of [inn1, inn2].filter(Boolean)) {
      if (!inn || inn.batting.length < 2) continue;
      // Pair consecutive top scorers
      const b1 = inn.batting[0];
      const b2 = inn.batting[1];
      if (b1 && b2) {
        const totalRuns = b1.runs + b2.runs;
        const totalBalls = b1.balls + b2.balls;
        if (totalRuns > best.runs) {
          best = {
            runs: totalRuns,
            balls: totalBalls,
            p1: b1.name,
            p2: b2.name,
          };
        }
      }
    }
    return best.runs > 0 ? best : null;
  }, [inn1, inn2]);

  // Derive key turning point / clutch event
  const turningPoint = useMemo(() => {
    if (!inn2) return null;
    // Find batter with highest strike rate in chase or match-winning partnership
    const topChaser = [...inn2.batting].sort((a, b) => b.runs - a.runs)[0];
    const secondChaser = inn2.batting[1];
    if (topChaser) {
      return {
        title: secondChaser ? `${topChaser.name.split(" ").pop()}-${secondChaser.name.split(" ").pop()} ${topChaser.runs + secondChaser.runs} (${topChaser.balls + secondChaser.balls})` : `${topChaser.name} ${topChaser.runs} (${topChaser.balls})`,
        desc: `${team2Code} seized control during the chase`,
      };
    }
    return null;
  }, [inn2, team2Code]);

  // Construct mock or real telemetry curve points (0 to 20 overs)
  const trajectoryPoints = useMemo(() => {
    const points: Array<{ over: number; t1Advantage: number; t2Advantage: number }> = [];
    const t1Target = inn1 ? inn1.runs : 160;
    const t2Final = inn2 ? inn2.runs : 162;

    for (let ov = 0; ov <= 20; ov++) {
      // Simulate/derive differential curve across match phases
      const progress = ov / 20;
      const t1Expected = t1Target * progress;
      const t2Expected = t2Final * Math.pow(progress, 1.1);
      const diff = t2Expected - t1Expected;

      points.push({
        over: ov,
        t1Advantage: diff < 0 ? Math.abs(diff) : 0,
        t2Advantage: diff >= 0 ? diff : 0,
      });
    }
    return points;
  }, [inn1, inn2]);

  return (
    <div className="w-full bg-[#080d1a] border border-white/10 rounded-[24px] p-5 md:p-6 shadow-2xl flex flex-col gap-5">
      {/* ─── HEADER BAR: TITLE, TEAMS & TELEMETRY LEGEND ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white uppercase tracking-tight">
              MATCH MOMENTUM
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 uppercase">
              F1 TELEMETRY
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400 mt-0.5 block">
            {team1Code} vs {team2Code} · Innings Run Acceleration & Leverage Delta
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-slate-300">{team1Code} ADVANTAGE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span className="text-slate-300">{team2Code} ADVANTAGE</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN TELEMETRY HUD: 3 METRIC BLOCKS & CURVE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_240px] gap-6 items-center">
        
        {/* Metric 1: Highest Partnership */}
        {highestPartnership ? (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center gap-2 text-cyan-400">
              <BarChart2 className="w-4 h-4" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                HIGHEST PARTNERSHIP
              </span>
            </div>
            <div className="font-mono text-2xl font-black text-white tabular-nums">
              {highestPartnership.runs}{" "}
              <span className="text-xs text-slate-400 font-normal">({highestPartnership.balls})</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-300 truncate">
              {highestPartnership.p1.split(" ").pop()} & {highestPartnership.p2.split(" ").pop()}
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">PARTNERSHIP</span>
            <span className="text-sm font-bold text-white">Even Contest</span>
          </div>
        )}

        {/* Center: Interactive SVG Worm Telemetry Graph */}
        <div className="relative h-28 flex flex-col justify-end pt-2">
          {/* Milestone Tag Callout */}
          <div className="absolute top-0 left-3/5 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-[10px] font-mono font-bold text-rose-300 shadow-lg pointer-events-none">
            {team2Code} SEIZED CONTROL · 15.0 OV
          </div>

          <svg className="w-full h-20 overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none">
            {/* Center zero axis */}
            <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />

            {/* Gradient fill */}
            <defs>
              <linearGradient id="telemetryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="55%" stopColor="#f43f5e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Spline Curve */}
            <path
              d="M 0 40 Q 80 20 160 30 T 240 55 T 320 62 T 400 48"
              fill="none"
              stroke="url(#telemetryGrad)"
              strokeWidth="2.5"
            />

            {/* Over markers along the curve */}
            {[
              { x: 20, y: 35 },
              { x: 80, y: 24 },
              { x: 140, y: 28 },
              { x: 200, y: 44 },
              { x: 240, y: 56, active: true },
              { x: 300, y: 60 },
              { x: 360, y: 52 },
              { x: 395, y: 48 },
            ].map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={pt.active ? "5" : "2.5"}
                fill={pt.active ? "#f43f5e" : "#ffffff"}
                className={pt.active ? "animate-pulse shadow-lg" : ""}
              />
            ))}
          </svg>

          {/* Over X-Axis labels */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
            <span>0</span>
            <span>5 OV</span>
            <span>10 OV</span>
            <span>15 OV</span>
            <span>20 OV</span>
          </div>
        </div>

        {/* Metric 3: Turning Point / High Leverage */}
        {turningPoint ? (
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-3 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <Flame className="w-5 h-5 fill-rose-500/40" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                TURNING POINT
              </span>
              <span className="text-sm font-black text-white truncate mt-0.5">
                {turningPoint.title}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {turningPoint.desc}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">LEVERAGE</span>
            <span className="text-sm font-bold text-white">Consistent Run Flow</span>
          </div>
        )}
      </div>
    </div>
  );
}
