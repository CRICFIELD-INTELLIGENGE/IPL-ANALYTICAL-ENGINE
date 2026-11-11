import React, { useState } from "react";
import { Link } from "wouter";
import { 
  Info, 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  ExternalLink, 
  Sliders, 
  Database,
  Calculator,
  Compass,
  Brain,
  Activity,
  TrendingUp,
  Percent
} from "lucide-react";

export function ScoutMethodology() {
  // Interactive slider state to illustrate shrinkage in action:
  // formula: (balls * rawIndex + 120 * 100) / (balls + 120)
  const [sliderBalls, setSliderBalls] = useState<number>(30);
  const [sliderRawRate, setSliderRawRate] = useState<number>(180); // e.g. raw strike rate
  const baselineRate = 135; // typical league average strike rate

  const rawIndex = (sliderRawRate / baselineRate) * 100;
  const k = 120; // prior weight balls
  const shrunkIndex = (sliderBalls * rawIndex + k * 100) / (sliderBalls + k);

  // Interactive Chase State Markov Win Probability simulator
  const [chaseRuns, setChaseRuns] = useState<number>(24);
  const [chaseBalls, setChaseBalls] = useState<number>(12);
  const [chaseWickets, setChaseWickets] = useState<number>(5);

  const rrr = chaseBalls > 0 ? (chaseRuns / chaseBalls) * 6 : 0;
  const oversRemaining = chaseBalls / 6;
  const parOverRate = 8.5;
  const wicketPenalty = (10 - chaseWickets) * 0.45;
  const equilibriumRRR = Math.max(5.0, parOverRate + (oversRemaining < 5 ? 1.5 : 0) - wicketPenalty);
  const ratePressure = rrr - equilibriumRRR;
  let simulatedWinProb = 0.5 - ratePressure * 0.08;
  if (chaseWickets <= 1 && chaseRuns > 10) simulatedWinProb *= 0.35;
  if (chaseRuns <= 0) simulatedWinProb = 1.0;
  else if (chaseBalls <= 0 || chaseWickets <= 0) simulatedWinProb = 0.0;
  simulatedWinProb = Math.max(0.01, Math.min(0.99, simulatedWinProb));
  const chasePhase = rrr > 13.0 || chaseWickets <= 2 ? "critical" : rrr > 10.0 ? "pressure" : rrr < 7.5 ? "cruising" : "balanced";

  return (
    <section id="scout-methodology" className="w-full space-y-6 pt-6 border-t border-white/10">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#4CC9C0] text-[11px] font-mono uppercase tracking-widest font-bold mb-1">
            <Calculator className="w-3.5 h-3.5" />
            <span>Mathematical Foundations</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#F5F7F8] tracking-tight uppercase">
            THE SCIENCE BEHIND THE SCOUT
          </h2>
        </div>
        <p className="font-body text-xs sm:text-sm text-[#9BAAB5] max-w-md">
          Transparent, deterministic mathematics replacing black-box scouting formulas.
        </p>
      </div>

      {/* 4 Core Conceptual Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PILLAR 1: CONTEXT MATTERS */}
        <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-[#4CC9C0]/10 text-[#4CC9C0] border border-[#4CC9C0]/30">
              <span>TENET 01</span>
            </div>
            <h3 className="font-display text-base font-bold text-[#F5F7F8] tracking-tight">
              Context Matters
            </h3>
            <p className="font-body text-xs text-[#9BAAB5] leading-relaxed">
              A strike rate of 150 on an Ahmedabad road is not equivalent to 135 on a turning Chepauk pitch.
              CricField computes an <strong>expected baseline</strong> for every match, season, and phase.
              An index of <strong>100</strong> represents exact league average under identical conditions.
            </p>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-[#4CC9C0]">
            League Par = 100.0 Baseline
          </div>
        </div>

        {/* PILLAR 2: SMALL SAMPLES CAN MISLEAD */}
        <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-[#B8F36B]/10 text-[#B8F36B] border border-[#B8F36B]/30">
              <span>TENET 02</span>
            </div>
            <h3 className="font-display text-base font-bold text-[#F5F7F8] tracking-tight">
              Small Samples Can Mislead
            </h3>
            <p className="font-body text-xs text-[#9BAAB5] leading-relaxed">
              A batter striking at 200 over 18 balls has not proven elite longevity. CricField blends
              raw indices toward the league baseline with an empirical prior weight of <strong>k = 120 balls</strong>.
              Small samples shrink heavily toward 100, preventing short hot streaks from distorting rankings.
            </p>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-[#B8F36B]">
            Prior Weight: k = 120 Balls
          </div>
        </div>

        {/* PILLAR 3: SHOW THE UNCERTAINTY */}
        <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-[#F4B96C]/10 text-[#F4B96C] border border-[#F4B96C]/30">
              <span>TENET 03</span>
            </div>
            <h3 className="font-display text-base font-bold text-[#F5F7F8] tracking-tight">
              Show The Uncertainty
            </h3>
            <p className="font-body text-xs text-[#9BAAB5] leading-relaxed">
              Every raw index includes a <strong>95% Confidence Interval</strong>. We use Wilson score intervals for proportions (boundary %, dot %, dismissals) and normal approximations for rate metrics. 
              Statistical margins are fully visible across every player.
            </p>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-[#F4B96C]">
            95% Wilson Score & Normal CIs
          </div>
        </div>

        {/* PILLAR 4: TRUE TALENT VS LUCK */}
        <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-[#B8F36B]/20 text-[#B8F36B] border border-[#B8F36B]/40">
              <span>TENET 04</span>
            </div>
            <h3 className="font-display text-base font-bold text-[#F5F7F8] tracking-tight">
              True Talent & Skill Ratio
            </h3>
            <p className="font-body text-xs text-[#9BAAB5] leading-relaxed">
              Observed numbers contain ability and random noise. Our <strong>Bayesian hierarchical model</strong> isolates
              latent skill E[θ], decomposes variance into <strong>Skill vs Luck</strong>, and calculates sustainability probability P(θ &gt; 100).
            </p>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-[#B8F36B]">
            Bayesian Conjugate Normal Model
          </div>
        </div>
      </div>

      {/* INTERACTIVE DEMONSTRATOR: SHRINKAGE IN ACTION */}
      <div className="rounded-2xl bg-[#0B1118] border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#B8F36B]" />
            <h4 className="font-display text-sm font-bold text-[#F5F7F8] uppercase tracking-wide">
              INTERACTIVE DEMONSTRATION: EMPIRICAL SHRINKAGE FORMULA
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#9BAAB5]">
            Formula: Shrunk = (n × RawIndex + 120 × 100) / (n + 120)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Controls */}
          <div className="md:col-span-7 space-y-4 font-mono text-xs">
            {/* Balls Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9BAAB5]">Sample Size (Balls Faced):</span>
                <strong className="text-[#B8F36B] font-bold text-sm">{sliderBalls} balls</strong>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={sliderBalls}
                onChange={(e) => setSliderBalls(Number(e.target.value))}
                className="w-full accent-[#B8F36B] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>5b (Hot streak)</span>
                <span>120b (Rankable threshold)</span>
                <span>500b (Veteran volume)</span>
              </div>
            </div>

            {/* Raw Strike Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9BAAB5]">Observed Strike Rate (League Par = 135.0):</span>
                <strong className="text-[#4CC9C0] font-bold text-sm">{sliderRawRate} SR</strong>
              </div>
              <input
                type="range"
                min="80"
                max="240"
                step="5"
                value={sliderRawRate}
                onChange={(e) => setSliderRawRate(Number(e.target.value))}
                className="w-full accent-[#4CC9C0] cursor-pointer"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="md:col-span-5 rounded-xl bg-[#14212A] border border-white/10 p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-[#9BAAB5]">Raw Index:</span>
              <strong className="text-[#F5F7F8] text-sm">{rawIndex.toFixed(1)}</strong>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-[#9BAAB5]">Shrunk Rating:</span>
              <strong className="text-xl font-black text-[#B8F36B]">{shrunkIndex.toFixed(1)}</strong>
            </div>
            <div className="text-[11px] font-sans text-[#9BAAB5] leading-relaxed">
              {sliderBalls < 60 ? (
                <span className="text-[#F4B96C]">
                  Notice: At only {sliderBalls} balls, the raw index of {rawIndex.toFixed(1)} is pulled heavily toward 100 down to {shrunkIndex.toFixed(1)}. Short samples cannot dominate.
                </span>
              ) : sliderBalls >= 120 ? (
                <span className="text-[#B8F36B]">
                  Confirmed: At {sliderBalls} balls (≥120b), the player has established reliability; shrinkage allows their observed advantage to stand out at {shrunkIndex.toFixed(1)}.
                </span>
              ) : (
                <span>
                  Emerging: Moderate evidence ({sliderBalls} balls); still blending toward baseline.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DEMONSTRATOR: MARKOV WIN PROBABILITY ENGINE */}
      <div className="rounded-2xl bg-[#0B1118] border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4CC9C0]" />
            <h4 className="font-display text-sm font-bold text-[#F5F7F8] uppercase tracking-wide">
              INTERACTIVE DEMONSTRATION: MARKOV CHASE STATE WIN PROBABILITY
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#9BAAB5]">
            State S = (Runs: {chaseRuns}, Balls: {chaseBalls}, Wickets: {chaseWickets})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Sliders */}
          <div className="md:col-span-7 space-y-4 font-mono text-xs">
            {/* Runs Needed */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9BAAB5]">Runs Required (R):</span>
                <strong className="text-[#F5F7F8] font-bold text-sm">{chaseRuns} runs</strong>
              </div>
              <input
                type="range"
                min="1"
                max="80"
                step="1"
                value={chaseRuns}
                onChange={(e) => setChaseRuns(Number(e.target.value))}
                className="w-full accent-[#F5F7F8] cursor-pointer"
              />
            </div>

            {/* Balls Remaining */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9BAAB5]">Balls Remaining (B):</span>
                <strong className="text-[#4CC9C0] font-bold text-sm">{chaseBalls} balls ({Math.floor(chaseBalls / 6)}.{chaseBalls % 6} ov)</strong>
              </div>
              <input
                type="range"
                min="1"
                max="36"
                step="1"
                value={chaseBalls}
                onChange={(e) => setChaseBalls(Number(e.target.value))}
                className="w-full accent-[#4CC9C0] cursor-pointer"
              />
            </div>

            {/* Wickets Remaining */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#9BAAB5]">Wickets in Hand (W):</span>
                <strong className="text-[#F4B96C] font-bold text-sm">{chaseWickets} / 10</strong>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={chaseWickets}
                onChange={(e) => setChaseWickets(Number(e.target.value))}
                className="w-full accent-[#F4B96C] cursor-pointer"
              />
            </div>
          </div>

          {/* Model Outcome Card */}
          <div className="md:col-span-5 rounded-xl bg-[#14212A] border border-white/10 p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-[#9BAAB5]">Required Run Rate:</span>
              <strong className="text-sm font-bold text-[#F5F7F8]">{rrr.toFixed(1)} rpo</strong>
            </div>

            <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
              <span className="text-[#9BAAB5]">Equilibrium Par Rate:</span>
              <strong className="text-sm font-bold text-[#9BAAB5]">{equilibriumRRR.toFixed(1)} rpo</strong>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-[#9BAAB5] uppercase font-bold">Markov Win Probability:</span>
              <span className={`text-2xl font-black ${
                simulatedWinProb >= 0.65 ? "text-[#B8F36B]" : simulatedWinProb >= 0.40 ? "text-[#F4B96C]" : "text-rose-400"
              }`}>
                {(simulatedWinProb * 100).toFixed(1)}%
              </span>
            </div>

            {/* Pressure Gauge */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  simulatedWinProb >= 0.65 ? "bg-[#B8F36B]" : simulatedWinProb >= 0.40 ? "bg-[#F4B96C]" : "bg-rose-500"
                }`}
                style={{ width: `${Math.round(simulatedWinProb * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] pt-1">
              <span className="text-[#9BAAB5]">Chase Pressure:</span>
              <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-white/5 text-[#F5F7F8] border border-white/10">
                {chasePhase}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* METADATA, SAFEGUARDS & AUDIT FOOTER */}
      <div className="rounded-2xl bg-[#14212A] border border-white/10 p-5 space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#B8F36B]" />
            <span className="text-[#F5F7F8] font-bold uppercase tracking-wider">
              Data Integrity & Warehouse Safeguards
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#9BAAB5]">
            <span>Matches: <strong className="text-[#F5F7F8]">3,309</strong></span>
            <span>•</span>
            <span>Leagues: <strong className="text-[#F5F7F8]">6 Premier T20s</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
          <div className="p-3 rounded-xl bg-[#0B1118]/80 border border-white/5 space-y-1">
            <span className="text-[#9BAAB5] block uppercase text-[10px]">Inferred Roles</span>
            <p className="font-sans text-white/70">
              Computed mathematically from crease entry ball, phase share, and position distributions — not arbitrary squad titles.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1118]/80 border border-white/5 space-y-1">
            <span className="text-[#9BAAB5] block uppercase text-[10px]">Rankable Sample</span>
            <p className="font-sans text-white/70">
              120+ balls required for percentiles. Players below 120 balls display raw and shrunk ratings with appropriate sample tier flags.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1118]/80 border border-white/5 space-y-1">
            <span className="text-[#9BAAB5] block uppercase text-[10px]">Model Boundaries</span>
            <p className="font-sans text-white/70">
              Evaluates historical delivery efficiency. Does not model weather, team auction budgets, pitch degradation, or future form.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1118]/80 border border-white/5 space-y-1">
            <span className="text-[#9BAAB5] block uppercase text-[10px]">Warehouse Mode</span>
            <p className="font-sans text-white/70">
              Read-only immutable database connection. Zero synthetic player generation or hallucinated metrics.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-white/50 text-[11px]">
          <span>CricField Global Talent Explorer • Version 2.4</span>
          <div className="flex items-center gap-4">
            <Link href="/methodology" className="text-[#4CC9C0] hover:underline flex items-center gap-1 font-bold">
              <span>Full Methodology Whitepaper</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link href="/scout/roles" className="text-[#B8F36B] hover:underline flex items-center gap-1 font-bold">
              <span>Role Taxonomy Catalog</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
