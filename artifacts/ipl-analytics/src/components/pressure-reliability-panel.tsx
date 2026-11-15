// Scenario Intelligence → Pressure Reliability.
// Every number comes from /api/stats/pressure-reliability (a published snapshot); nothing is computed here.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PlayerAvatar } from "@/components/player-avatar";
import { playerSlug, usePlayerDisplayNames, displayPlayerName } from "@/lib/aggregates";

type Row = {
  player: string; team: string; competitions: string[];
  pressureBalls: number; pressureMatches: number; pressureRuns: number; pressureOuts: number;
  pressureRate: number | null; ordinaryRate: number | null; lift: number | null;
  rawPer100: number; adjustedPer100: number; interval90: [number, number];
  reliability: number; confidence: "high" | "medium" | "low"; successRate: number;
  phaseShare: { powerplay: number; middle: number; death: number };
};
type Result = {
  version: string; scope: string; unit: string; matches: number; qualified: number;
  cohort: { players: number; mean: number; priorStrengthBalls: number; trueSpreadSd: number };
  players: Row[];
};
type ModelInfo = {
  version: string;
  winProbability: { validation: Record<"chase" | "firstInnings", { holdoutFrom: string; model: { brier: number; n: number }; baseline: { brier: number } }> };
  pressureShare: { innings: { first: number; chase: number }; phase: { powerplay: number; middle: number; death: number } };
  coverage: Record<string, { name: string; matches: number; from: string | null; to: string | null }>;
};

const COMP_SETS = [
  { id: "ipl", label: "IPL", comps: "ipl" },
  { id: "leagues", label: "IPL + overseas leagues", comps: "ipl,bbl,cpl,sa20,ilt20" },
  { id: "all", label: "+ SMAT", comps: "ipl,bbl,cpl,sa20,ilt20,smat" },
];
const TIERS = [
  { id: "medium", label: "Medium · top 50%" },
  { id: "high", label: "High · top 30%" },
  { id: "extreme", label: "Extreme · top 10%" },
];
const LENSES = [
  { id: "all", label: "Any phase" },
  { id: "powerplay", label: "Powerplay rebuild" },
  { id: "middle", label: "Middle-overs control" },
  { id: "death", label: "Death finisher / enforcer" },
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
  const [compSet, setCompSet] = useState("ipl");
  const [role, setRole] = useState<"batting" | "bowling">("batting");
  const [tier, setTier] = useState("high");
  const [lens, setLens] = useState("all");
  const [minBalls, setMinBalls] = useState("120");
  const [minMatches, setMinMatches] = useState("10");
  const [sort, setSort] = useState<"adjusted" | "conservative">("adjusted");

  const params = new URLSearchParams({
    comps: COMP_SETS.find(c => c.id === compSet)!.comps, role, tier, lens, minBalls, minMatches, sort, limit: "30",
  });
  if (seasonFrom) params.set("seasonFrom", seasonFrom);
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

  const rateLabel = role === "batting" ? "SR" : "Econ";
  const data = result.data;
  const maxAbs = Math.max(10, ...(data?.players ?? []).flatMap(p => p.interval90.map(Math.abs)));
  const toX = (v: number) => 50 + (v / maxAbs) * 50;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-pink-500/[0.05] p-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-white tracking-wider">Pressure Reliability</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-500/20 text-pink-200 border border-pink-400/30">
            Leverage-defined · Bayes-adjusted
          </span>
        </div>
        <p className="text-[11px] text-white/70 max-w-3xl leading-relaxed">
          Who keeps delivering when one ball can swing the match? A ball counts as pressure when the next delivery is expected to move the
          batting side's win probability the most. Each ball is then scored against what is normal for that innings, over and wickets down in
          that competition-season, with a wicket costing the runs it removes from the innings. Small samples are pulled toward the average
          by an amount estimated from the data, so a hot month does not top the table.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Chips label="Competitions" value={compSet} options={COMP_SETS} onChange={setCompSet} />
        <Chips<"batting" | "bowling"> label="Role" value={role} options={[{ id: "batting", label: "Batters" }, { id: "bowling", label: "Bowlers" }]} onChange={setRole} />
        <Chips label="Pressure level" value={tier} options={TIERS} onChange={setTier} />
        <Chips label="Role lens" value={lens} options={LENSES} onChange={setLens} />
        <Chips label="Min pressure balls" value={minBalls} options={["60", "120", "250", "500"].map(v => ({ id: v, label: v }))} onChange={setMinBalls} />
        <Chips label="Min matches" value={minMatches} options={["5", "10", "20"].map(v => ({ id: v, label: v }))} onChange={setMinMatches} />
        <Chips<"adjusted" | "conservative"> label="Rank by" value={sort} options={[{ id: "adjusted", label: "Adjusted value" }, { id: "conservative", label: "Safest pick (lower bound)" }]} onChange={setSort} />
      </div>

      {data && (
        <div className="text-[10px] font-mono text-white/50 border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02]">
          {data.scope} · {data.matches.toLocaleString("en-IN")} matches · {data.qualified} qualify
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
          <table className="w-full min-w-[980px]">
            <caption className="sr-only">Pressure reliability ranking</caption>
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {[
                  ["Player", ""], ["P balls", "Pressure balls"], ["Matches", "Matches with pressure balls"],
                  [`P ${rateLabel}`, `${rateLabel} under pressure`], [`Normal ${rateLabel}`, `${rateLabel} in calmer balls`],
                  ["Lift", role === "batting" ? "Pressure SR minus normal SR" : "Normal economy minus pressure economy"],
                  ["Raw /100", "Runs above expectation per 100 pressure balls, before adjustment"],
                  ["Adjusted /100 · 90% range", "After pulling toward the cohort average; bar shows the 90% range"],
                  ["Reliability", "Share of the score that comes from the player's own balls"],
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
                        <span className="text-[9px] text-white/40">{p.team}{p.competitions.length > 1 ? ` · ${p.competitions.join(", ").toUpperCase()}` : ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-white/70 text-[12px]">{p.pressureBalls}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{p.pressureMatches}</td>
                  <td className="px-3 py-2.5 font-bold text-amber-300 text-[12px]">{p.pressureRate?.toFixed(role === "batting" ? 1 : 2) ?? "—"}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{p.ordinaryRate?.toFixed(role === "batting" ? 1 : 2) ?? "—"}</td>
                  <td className={`px-3 py-2.5 text-[12px] font-bold ${p.lift !== null && p.lift >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{signed(p.lift, role === "batting" ? 1 : 2)}</td>
                  <td className="px-3 py-2.5 text-white/50 text-[12px]">{signed(p.rawPer100)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black text-pink-200 w-12">{signed(p.adjustedPer100)}</span>
                      <svg width="120" height="12" role="img" aria-label={`90% range ${p.interval90[0]} to ${p.interval90[1]}`}>
                        <line x1="60" x2="60" y1="0" y2="12" stroke="rgba(255,255,255,0.2)" />
                        <line x1={toX(p.interval90[0]) * 1.2} x2={toX(p.interval90[1]) * 1.2} y1="6" y2="6" stroke="rgba(244,114,182,0.6)" strokeWidth="3" strokeLinecap="round" />
                        <circle cx={toX(p.adjustedPer100) * 1.2} cy="6" r="3.5" fill="#fbcfe8" />
                      </svg>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px]">
                    <span className={p.confidence === "high" ? "text-emerald-300" : p.confidence === "medium" ? "text-amber-300" : "text-white/40"}>
                      {pct(p.reliability)} · {p.confidence}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/60 text-[12px]">{pct(p.successRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && model.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-white/60">
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">How hard the adjustment is</div>
            A player needs about <b className="text-white">{data.cohort.priorStrengthBalls} pressure balls</b> before half their score is their own;
            the rest is the cohort average ({signed(data.cohort.mean)} per 100). Real differences between players are about ±{data.cohort.trueSpreadSd} per 100.
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Win-probability check (unseen matches)</div>
            Tested on matches from {model.data.winProbability.validation.chase.holdoutFrom.slice(0, 4)} on. Brier score, lower is better:
            chases {model.data.winProbability.validation.chase.model.brier} vs {model.data.winProbability.validation.chase.baseline.brier} for always guessing the average win rate;
            first innings {model.data.winProbability.validation.firstInnings.model.brier} vs {model.data.winProbability.validation.firstInnings.baseline.brier}.
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Where high-pressure balls fall</div>
            Chases {pct(model.data.pressureShare.innings.chase)}, first innings {pct(model.data.pressureShare.innings.first)}.
            Powerplay {pct(model.data.pressureShare.phase.powerplay)}, middle {pct(model.data.pressureShare.phase.middle)}, death {pct(model.data.pressureShare.phase.death)}.
            Early wickets move the result more than most people expect.
          </div>
        </div>
      )}
      {data && (
        <div className="text-[9px] text-white/30 font-mono">
          Model {data.version} · Ball-by-ball data: Cricsheet (ODC-BY 1.0) · No T20I matches loaded yet · Opposition strength is not adjusted
        </div>
      )}
    </div>
  );
}
