// Scenario Intelligence → Pressure Reliability.
// Every number comes from /api/stats/pressure-reliability (a published snapshot); nothing is computed here.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlayerAvatar } from "@/components/player-avatar";
import { playerSlug, usePlayerDisplayNames, displayPlayerName } from "@/lib/aggregates";

type Row = {
  player: string; team: string; competitions: string[];
  pressureBalls: number; pressureMatches: number;
  pressure: { rate: number | null; perOut: number | null; outs: number; dotPct: number | null; boundaryPct: number | null };
  ordinary: { rate: number | null; perOut: number | null; dotPct: number | null };
  rateLift: number | null;
  rawPer100: number; usualPer100: number; expectedFromUsualPer100: number; adjustedPer100: number; interval90: [number, number];
  upliftRawPer100: number; upliftAdjustedPer100: number; evidenceWeight: number; goodMatchRate: number;
};
type Result = {
  version: string; definitionLabel: string; scope: string; unit: string; matches: number; qualified: number;
  cohort: { players: number; pressureMeanPer100: number; usualToPressureSlope: number; priorStrengthBalls: number; pressureSpecificSdPer100: number };
  players: Row[];
};
type DefinitionRow = { id: string; label: string; shareOfBalls: number; batting: { priorStrengthBalls: number; upliftSplitHalf: number }; bowling: { priorStrengthBalls: number; upliftSplitHalf: number } };
type ModelInfo = {
  winProbability: { validation: Record<"chase" | "firstInnings", { holdoutFrom: string; model: { brier: number }; baseline: { brier: number } }> };
  definitionComparison: DefinitionRow[];
};

const COMP_SETS = [
  { id: "ipl-t20i", label: "IPL + T20I (challenge)", comps: "ipl,t20i" },
  { id: "ipl", label: "IPL", comps: "ipl" },
  { id: "t20i", label: "T20I", comps: "t20i" },
  { id: "leagues", label: "IPL + overseas leagues", comps: "ipl,bbl,cpl,sa20,ilt20" },
];
const DEFS = [
  { id: "rules", label: "Rules (selected)" },
  { id: "leverage30", label: "Leverage · top 30%" },
  { id: "leverage10", label: "Leverage · top 10%" },
];
const LENSES = [
  { id: "all", label: "Any phase" },
  { id: "powerplay", label: "Powerplay" },
  { id: "middle", label: "Middle overs" },
  { id: "death", label: "Death overs" },
];

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider w-28 shrink-0">{label}</span>
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all border ${value === o.id
            ? "bg-pink-500/20 text-pink-200 border-pink-400/50"
            : "bg-white/5 text-white/50 border-white/10 hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number | null, d = 1) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}`);

export function PressureReliabilityPanel({ seasonFrom, seasonTo }: { seasonFrom: string; seasonTo: string }) {
  const displayNames = usePlayerDisplayNames();
  const [compSet, setCompSet] = useState("ipl-t20i");
  const [t20iScope, setT20iScope] = useState<"full-members" | "all">("full-members");
  const [role, setRole] = useState<"batting" | "bowling">("batting");
  const [definition, setDefinition] = useState("rules");
  const [lens, setLens] = useState("all");
  const [minBalls, setMinBalls] = useState("250");
  const [minMatches, setMinMatches] = useState("20");
  const [sort, setSort] = useState<"adjusted" | "conservative">("adjusted");

  const comps = COMP_SETS.find(c => c.id === compSet)!.comps;
  const params = new URLSearchParams({ comps, role, definition, lens, minBalls, minMatches, sort, t20iScope, limit: "30" });
  // The challenge window starts in 2022; the shared season range overrides it.
  params.set("seasonFrom", seasonFrom || "2022");
  if (seasonTo) params.set("seasonTo", seasonTo);

  const result = useQuery({
    queryKey: ["pressure-reliability", params.toString()],
    queryFn: async (): Promise<Result> => {
      const res = await fetch(`/api/stats/pressure-reliability?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
    placeholderData: prev => prev,
  });
  const model = useQuery({
    queryKey: ["pressure-reliability-model"],
    queryFn: async (): Promise<ModelInfo> => {
      const res = await fetch(`/api/stats/pressure-reliability/model`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
  });

  const bat = role === "batting";
  const data = result.data;
  const maxAbs = Math.max(10, ...(data?.players ?? []).flatMap(p => p.interval90.map(Math.abs)));
  const toX = (v: number) => 60 + (v / maxAbs) * 58;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-pink-500/[0.05] p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-white tracking-wider">Pressure Reliability</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-500/20 text-pink-200 border border-pink-400/30">
            Same pressure for bat &amp; ball · anchored Bayes
          </span>
        </div>
        <p className="text-[11px] text-white/70 max-w-3xl leading-relaxed">
          Every ball is scored against what normally happens in that innings, over and wickets-down state, after allowing for the opposition.
          A wicket costs the runs it removes from the innings. Each player's pressure balls are then combined with their usual level, and the
          data decides how much: a long pressure record moves a player a long way from their usual form, a short one barely moves them.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Chips label="Competitions" value={compSet} options={COMP_SETS} onChange={setCompSet} />
        {comps.includes("t20i") && (
          <Chips<"full-members" | "all"> label="T20I matches" value={t20iScope}
            options={[{ id: "full-members", label: "Full Members only" }, { id: "all", label: "All nations" }]} onChange={setT20iScope} />
        )}
        <Chips<"batting" | "bowling"> label="Role" value={role} options={[{ id: "batting", label: "Batters" }, { id: "bowling", label: "Bowlers" }]} onChange={setRole} />
        <Chips label="Pressure model" value={definition} options={DEFS} onChange={setDefinition} />
        <Chips label="Role lens" value={lens} options={LENSES} onChange={setLens} />
        <Chips label="Min pressure balls" value={minBalls} options={["120", "250", "400"].map(v => ({ id: v, label: v }))} onChange={setMinBalls} />
        <Chips label="Min matches" value={minMatches} options={["10", "20", "30"].map(v => ({ id: v, label: v }))} onChange={setMinMatches} />
        <Chips<"adjusted" | "conservative"> label="Rank by" value={sort} options={[{ id: "adjusted", label: "Best estimate" }, { id: "conservative", label: "Safest pick (lower bound)" }]} onChange={setSort} />
      </div>

      {data && (
        <div className="text-[10px] font-mono text-white/50 border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02] flex flex-col gap-0.5">
          <span>{data.definitionLabel}</span>
          <span>{data.scope} · {data.matches.toLocaleString("en-IN")} matches · {data.qualified} qualify</span>
        </div>
      )}

      {result.isError ? (
        <div role="alert" className="text-center py-10 text-red-300/80 text-sm">Pressure data is unavailable right now.</div>
      ) : !data ? (
        <div className="text-center py-12 text-white/40 font-mono text-sm">Loading pressure model…</div>
      ) : data.players.length === 0 ? (
        <div role="status" className="text-center py-12 text-white/60 text-sm">No players meet these filters. Lower the minimums or widen the seasons.</div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <caption className="sr-only">Pressure reliability ranking</caption>
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {[
                  ["Player", ""], ["P balls", "Pressure balls"], ["Matches", "Matches with pressure balls"],
                  [bat ? "P SR" : "P Econ", bat ? "Strike rate under pressure" : "Economy under pressure"],
                  [bat ? "Usual SR" : "Usual Econ", "In ordinary balls"],
                  [bat ? "P Avg" : "P Balls/wkt", bat ? "Runs per dismissal under pressure" : "Balls per wicket under pressure"],
                  ["P Dot%", "Dot-ball share under pressure"],
                  ["Raw /100", "Runs above expectation per 100 pressure balls, before adjustment"],
                  ["Usual /100", "Same measure in ordinary balls (shrunk)"],
                  ["Estimate /100 · 90% range", "Best estimate of pressure value; bar shows the 90% range"],
                  ["Uplift", "Estimate minus usual: better (+) or worse (−) than usual under pressure"],
                  ["Own evidence", "Share of the estimate from the player's own pressure balls (rest from their usual level)"],
                  ["Good games", "Share of matches with positive pressure value"],
                ].map(([h, title]) => (
                  <th key={h} title={title} className="px-3 py-3 text-[9px] font-black text-white/40 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.players.map((p, i) => (
                <tr key={p.player} className="hover:bg-white/5">
                  <td className="px-3 py-2.5">
                    <Link href={`/players/${playerSlug(p.player)}`} className="flex items-center gap-2 group/p hover:opacity-90">
                      <span className="text-[9px] font-black text-amber-400/50 w-5">#{i + 1}</span>
                      <PlayerAvatar name={p.player} className="w-6 h-6 shrink-0" />
                      <span className="flex flex-col">
                        <span className="text-[12px] font-bold text-white group-hover/p:underline">{displayPlayerName(p.player, displayNames)}</span>
                        <span className="text-[9px] text-white/40">{p.team} · {p.competitions.join(" + ").toUpperCase()}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/70 text-[12px]">{p.pressureBalls}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{p.pressureMatches}</td>
                  <td className="px-3 py-2.5 font-bold text-amber-300 text-[12px]">{p.pressure.rate?.toFixed(bat ? 1 : 2) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{p.ordinary.rate?.toFixed(bat ? 1 : 2) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/60 text-[12px]">{p.pressure.perOut ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/60 text-[12px]">{p.pressure.dotPct ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{signed(p.rawPer100)}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{signed(p.usualPer100)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black text-pink-200 w-12">{signed(p.adjustedPer100)}</span>
                      <svg width="120" height="12" role="img" aria-label={`90% range ${p.interval90[0]} to ${p.interval90[1]}`}>
                        <line x1="60" x2="60" y1="0" y2="12" stroke="rgba(255,255,255,0.2)" />
                        <line x1={toX(p.interval90[0])} x2={toX(p.interval90[1])} y1="6" y2="6" stroke="rgba(244,114,182,0.6)" strokeWidth="3" strokeLinecap="round" />
                        <circle cx={toX(p.adjustedPer100)} cy="6" r="3.5" fill="#fbcfe8" />
                      </svg>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${p.upliftAdjustedPer100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{signed(p.upliftAdjustedPer100)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-white/60">{pct(p.evidenceWeight)}</td>
                  <td className="px-3 py-2.5 text-white/60 text-[12px]">{pct(p.goodMatchRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && model.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-white/60">
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">How much pressure differs from usual</div>
            Usual form predicts pressure form with a slope of {data.cohort.usualToPressureSlope}. On top of that, real pressure-specific
            differences are about ±{data.cohort.pressureSpecificSdPer100} per 100 balls. A player needs about
            {" "}<b className="text-white">{data.cohort.priorStrengthBalls.toLocaleString("en-IN")} pressure balls</b> before half their estimate comes from pressure alone.
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Why the rules model</div>
            Tested on IPL + Full-Member T20Is since 2022. Under the rules model, pressure value repeats best from odd to even matches
            (players needing {model.data.definitionComparison.find(d => d.id === "rules")?.batting.priorStrengthBalls} balls for batting,
            {" "}{model.data.definitionComparison.find(d => d.id === "rules")?.bowling.priorStrengthBalls} for bowling, against
            {" "}{model.data.definitionComparison.find(d => d.id === "leverage40")?.batting.priorStrengthBalls} and
            {" "}{model.data.definitionComparison.find(d => d.id === "leverage40")?.bowling.priorStrengthBalls} for leverage at the same share of balls).
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Win-probability check (unseen matches)</div>
            Matches from {model.data.winProbability.validation.chase.holdoutFrom.slice(0, 4)} on. Brier score (lower is better): chases
            {" "}{model.data.winProbability.validation.chase.model.brier} vs {model.data.winProbability.validation.chase.baseline.brier} for always
            guessing the average; first innings {model.data.winProbability.validation.firstInnings.model.brier} vs {model.data.winProbability.validation.firstInnings.baseline.brier}.
          </div>
        </div>
      )}
      {data && (
        <div className="text-[9px] text-white/30 font-mono">
          Model {data.version} · Ball-by-ball data: Cricsheet (ODC-BY 1.0) · Cricsheet withholds Afghanistan matches, so Afghan players count from franchise cricket only
        </div>
      )}
    </div>
  );
}
