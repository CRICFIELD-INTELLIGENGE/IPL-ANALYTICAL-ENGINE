import { useState, useMemo } from "react";
import { fetchPlayerIntelligence } from "@/lib/intelligence-api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchPicks, type PickRow, type Category } from "@/lib/retention-api";
import { getFranchisePredictions, franchiseCall } from "@/lib/franchise-predictions";
import { money } from "@/lib/sim-api";
import { PlayerAvatar } from "@/components/player-avatar";
import { CategoryTag } from "@/components/retention/retention-widgets";
import { Filter, Layers, ListOrdered, ShieldCheck, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

export type FilterTierOption = "all" | "core" | "priority" | "strong" | "retain" | "dilemma" | "release";

const FILTER_PILLS: { id: FilterTierOption; label: string; tone: string }[] = [
  { id: "all", label: "All Players", tone: "border-white/20 bg-white/10 text-white" },
  { id: "core", label: "Franchise Core", tone: "border-emerald-400/40 bg-emerald-500/20 text-emerald-300" },
  { id: "priority", label: "Priority Retain", tone: "border-teal-400/40 bg-teal-500/20 text-teal-300" },
  { id: "strong", label: "Strong Retain", tone: "border-sky-400/40 bg-sky-500/20 text-sky-300" },
  { id: "retain", label: "Retain", tone: "border-indigo-400/40 bg-indigo-500/20 text-indigo-300" },
  { id: "dilemma", label: "Retention Dilemma", tone: "border-amber-400/40 bg-amber-500/20 text-amber-300" },
  { id: "release", label: "Release Candidate", tone: "border-rose-400/40 bg-rose-500/20 text-rose-300" },
];

const TIER_ORDER: Record<string, number> = {
  "Franchise Cornerstone": 1,
  "Franchise Core": 1,
  "Priority Retain": 2,
  "Strong Retain": 3,
  "Strong retain": 3,
  "Retain": 4,
  "Retention Dilemma": 5,
  "Release / Buyback Review": 6,
  "Release Candidate": 6,
  "Insufficient Evidence": 7,
};

const TIER_SECTIONS: { category: Category; title: string; desc: string; badgeTone: string }[] = [
  {
    category: "Franchise Cornerstone",
    title: "Franchise Core / Cornerstone",
    desc: "Indispensable leadership spine and franchise identity anchors through 2028.",
    badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  },
  {
    category: "Priority Retain",
    title: "Priority Retain",
    desc: "Match-winning locks and core playing XI regular starters.",
    badgeTone: "bg-teal-500/20 text-teal-300 border-teal-400/40",
  },
  {
    category: "Strong Retain",
    title: "Strong Retain",
    desc: "High-value proven assets with positive replacement differential.",
    badgeTone: "bg-sky-500/20 text-sky-300 border-sky-400/40",
  },
  {
    category: "Retain",
    title: "Retain (60/40 Chance)",
    desc: "60/40 more chance of keeping him; has potential but yet to prove consistency.",
    badgeTone: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40",
  },
  {
    category: "Retention Dilemma",
    title: "Retention Dilemma",
    desc: "Auction price vs salary trade-offs, tactical fit questions or aging curve considerations.",
    badgeTone: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  },
  {
    category: "Release / Buyback Review",
    title: "Release / Buyback Review",
    desc: "Candidates to release to free purse space with possible auction buyback at lower price.",
    badgeTone: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  },
  {
    category: "Release Candidate",
    title: "Release Candidate",
    desc: "Clear releases to maximize available auction purse flexibility and rebuild slots.",
    badgeTone: "bg-rose-500/20 text-rose-300 border-rose-400/40",
  },
  {
    category: "Insufficient Evidence",
    title: "Insufficient Evidence",
    desc: "Development investments or unverified contract sample sizes.",
    badgeTone: "bg-slate-500/20 text-slate-300 border-slate-400/40",
  },
];

export function FranchiseSquadInsights({ team = "RR" }: { team?: string }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [filterTier, setFilterTier] = useState<FilterTierOption>("all");
  const [viewMode, setViewMode] = useState<"tier" | "role">("tier");

  const teamCode = team.toUpperCase();
  const q = useQuery({ queryKey: ["retention-picks", teamCode], queryFn: () => fetchPicks(2027, teamCode as any), retry: 1 });
  const pred = getFranchisePredictions(teamCode);

  if (q.isLoading) return <p role="status" className="text-sm text-slate-400 p-4">Reading {teamCode} squad intelligence…</p>;
  if (!q.data) return <button onClick={() => q.refetch()} className="text-sm text-rose-300 p-4">Squad insights unavailable · retry</button>;

  const rows = q.data.rows;
  const kept = rows.filter((p) => p.recommendation === "retain");
  const salary = kept.reduce((sum, p) => sum + (p.contractLakh ?? 0), 0);
  const os = kept.filter((p) => p.overseas).length;
  const planning = q.data.planning || (pred ? {
    coreLocks: (pred.coreLocks || []).map((name: string) => ({ name, contractLakh: null })),
    coreCommittedLakh: null,
    recommendedCommittedLakh: salary,
    remainingPurseCr: pred.remainingPurseCr,
    note: "Official 10-Team Master Retention Intelligence Board (2026-11-07).",
    externalReviews: [],
    unclassifiedPlayers: []
  } : null);

  const priorities: string[] = pred?.priorities || [
    "Retain core domestic and international match-winners",
    "Identify value picks and emerging talents",
    "Preserve auction purse flexibility"
  ];

  // Match filter function
  const matchFilter = (p: PickRow) => {
    if (filterTier === "all") return true;
    if (filterTier === "core") return p.category === "Franchise Cornerstone" || p.category === "Franchise Core";
    if (filterTier === "priority") return p.category === "Priority Retain";
    if (filterTier === "strong") return p.category === "Strong Retain" || p.category === "Strong retain";
    if (filterTier === "retain") return p.category === "Retain";
    if (filterTier === "dilemma") return p.category === "Retention Dilemma";
    if (filterTier === "release") return p.category === "Release Candidate" || p.category === "Release / Buyback Review" || p.recommendation === "release";
    return true;
  };

  // Sorted players in sequence by tier then by score
  const sortedRows = [...rows].sort((a, b) => {
    const oA = TIER_ORDER[a.category] ?? 99;
    const oB = TIER_ORDER[b.category] ?? 99;
    if (oA !== oB) return oA - oB;
    return b.index - a.index;
  });

  const filteredRows = sortedRows.filter(matchFilter);

  // Filter count helper
  const countFor = (opt: FilterTierOption) => {
    if (opt === "all") return rows.length;
    if (opt === "core") return rows.filter((p) => p.category === "Franchise Cornerstone" || p.category === "Franchise Core").length;
    if (opt === "priority") return rows.filter((p) => p.category === "Priority Retain").length;
    if (opt === "strong") return rows.filter((p) => p.category === "Strong Retain" || p.category === "Strong retain").length;
    if (opt === "retain") return rows.filter((p) => p.category === "Retain").length;
    if (opt === "dilemma") return rows.filter((p) => p.category === "Retention Dilemma").length;
    if (opt === "release") return rows.filter((p) => p.category === "Release Candidate" || p.category === "Release / Buyback Review" || p.recommendation === "release").length;
    return 0;
  };

  return (
    <section className="space-y-5" aria-label={`${teamCode} projected squad insights`}>
      {/* 1. Header Overview & Purse Strategy */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B1536] via-[#080E24] to-[#040816] p-5 lg:p-6 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Franchise Retention Forecast
              </span>
              {pred?.vulnerabilityScore != null && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono font-bold">
                  Vulnerability: {pred.vulnerabilityScore}/100
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1.5">
              Decoding {pred?.teamName || teamCode}’s Projected Squad
            </h2>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("tier")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all ${
                viewMode === "tier" ? "bg-violet-600 text-white shadow" : "text-white/60 hover:text-white"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" /> Tier Sequence
            </button>
            <button
              type="button"
              onClick={() => setViewMode("role")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all ${
                viewMode === "role" ? "bg-violet-600 text-white shadow" : "text-white/60 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> By Role
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
          Franchise retention blueprint assembled from official squad intelligence, tier recommendations, personal scout strength/weakness analysis, and auction purse optimization.
        </p>

        {/* 4 Key Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ["Recommended keeps", kept.length, "text-emerald-400"],
            ["Indian / overseas", `${kept.length - os} / ${os}`, "text-sky-300"],
            ["Open squad places", Math.max(0, 25 - kept.length), "text-amber-300"],
            ["Known retained spend", money(salary), "text-purple-300"],
          ].map(([label, value, tone]) => (
            <div key={label as string} className="rounded-xl bg-black/30 border border-white/5 p-3">
              <p className="text-[11px] text-white/50">{label}</p>
              <b className={`text-lg sm:text-xl font-mono font-black ${tone}`}>{value}</b>
            </div>
          ))}
        </div>

        {/* Core Commitments & Auction Purse */}
        {planning && (
          <div className="rounded-xl border border-violet-400/25 bg-violet-950/20 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Core Commitments & Planning Purse
              </h3>
              <span className="font-mono text-emerald-300 font-black text-sm">
                Available: {planning.remainingPurseCr != null ? `₹${planning.remainingPurseCr} Cr` : money(planning.remainingPurseLakh ?? 0)}
              </span>
            </div>
            <p className="text-white/80">
              <b className="text-white">Core Locks ({planning.coreLocks.length}):</b>{" "}
              {planning.coreLocks.map((p: any) => p.name).join(", ")}.
              {planning.coreCommittedLakh ? ` Committed: ${money(planning.coreCommittedLakh)}.` : ""}
            </p>
            <p className="text-[11px] text-white/50 leading-relaxed">{planning.note}</p>
          </div>
        )}

        {/* Recruitment Priorities */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2">
          <h3 className="font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Strategic Recruitment Priorities
          </h3>
          <ol className="grid sm:grid-cols-2 gap-2 list-decimal pl-4 text-white/80 mt-1">
            {priorities.map((p: string, i: number) => (
              <li key={i} className="text-white/85">
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 2. Interactive Filter Out Option Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#0B1226]/80 p-4 space-y-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-violet-400" /> Filter Players by Retention Tier
          </span>
          <span className="text-[11px] font-mono text-white/50">
            Showing {filteredRows.length} of {rows.length} players
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PILLS.map((f) => {
            const count = countFor(f.id);
            const active = filterTier === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterTier(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? `${f.tone} ring-2 ring-violet-500/40 shadow-lg font-black`
                    : "bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:border-white/20"
                }`}
              >
                <span>{f.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 border border-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Player Listing — Mode A: By Tier Sequence */}
      {viewMode === "tier" && (
        <div className="space-y-4">
          {TIER_SECTIONS.map((sec) => {
            const secPlayers = filteredRows.filter((p) => p.category === sec.category);
            if (!secPlayers.length) return null;
            return (
              <div key={sec.category} className="rounded-2xl border border-white/10 bg-[#0B1226]/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${sec.badgeTone}`}>
                      {sec.title}
                    </span>
                    <span className="text-xs font-mono font-bold text-white/40">({secPlayers.length})</span>
                  </div>
                  <span className="text-[11px] text-white/45 hidden sm:inline">{sec.desc}</span>
                </div>

                <div className="divide-y divide-white/5">
                  {secPlayers.map((p) => (
                    <PlayerDetailCard
                      key={p.id}
                      p={p}
                      teamCode={teamCode}
                      expanded={expanded.includes(p.id)}
                      onToggle={(id) =>
                        setExpanded((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Player Listing — Mode B: By Role */}
      {viewMode === "role" && (
        <div className="space-y-4">
          {Object.entries({
            Batters: "batter",
            Wicketkeepers: "wicketkeeper",
            "All-rounders": "all-rounder",
            Bowlers: "bowler",
          }).map(([roleLabel, roleKey]) => {
            const rolePlayers = filteredRows.filter((p) => p.role === roleKey);
            if (!rolePlayers.length) return null;
            return (
              <div key={roleKey} className="rounded-2xl border border-white/10 bg-[#0B1226]/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    {roleLabel} <span className="font-mono text-xs font-bold text-white/40">({rolePlayers.length})</span>
                  </h3>
                </div>

                <div className="divide-y divide-white/5">
                  {rolePlayers.map((p) => (
                    <PlayerDetailCard
                      key={p.id}
                      p={p}
                      teamCode={teamCode}
                      expanded={expanded.includes(p.id)}
                      onToggle={(id) =>
                        setExpanded((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredRows.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0B1226]/40 p-8 text-center text-white/50 text-xs">
          No players match the selected retention tier filter.
        </div>
      )}
    </section>
  );
}

export function RRSquadInsights() {
  return <FranchiseSquadInsights team="RR" />;
}

function PlayerDetailCard({
  p,
  teamCode,
  expanded,
  onToggle,
}: {
  p: PickRow;
  teamCode: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const pIntel = franchiseCall(teamCode, p.name);
  const strengths = p.strengths || pIntel?.strengths || p.editorial?.strengths;
  const weaknesses = p.weaknesses || pIntel?.weaknesses || p.editorial?.weaknesses;
  const inXI = p.inPlayingXI || pIntel?.inPlayingXI || p.editorial?.inPlayingXI;
  const impactSub = p.impactSub || pIntel?.impactSub || p.editorial?.impactSub;
  const reason = p.reason || pIntel?.reason || p.editorial?.rationale;
  const salaryDisplay = pIntel?.salary || (p.contractLakh ? money(p.contractLakh) : "Contract n/a");

  return (
    <div className="py-3 space-y-2">
      <div
        className="flex items-center justify-between gap-3 cursor-pointer group"
        onClick={() => onToggle(p.id)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <PlayerAvatar name={p.name} teamId={teamCode as any} className="w-10 h-10 rounded-full shrink-0 ring-1 ring-white/10" disableHover />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <b className="text-white text-sm group-hover:text-violet-300 transition-colors">{p.name}</b>
              <CategoryTag category={p.category} />
              {inXI && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Starting XI
                </span>
              )}
              {impactSub && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Impact Sub
                </span>
              )}
            </div>
            <div className="text-[11px] text-white/50 flex flex-wrap items-center gap-2 mt-0.5">
              <span>{p.overseas ? "✈️ Overseas" : "🇮🇳 Indian"}</span>
              <span>·</span>
              <span className="capitalize">{p.granularRole || p.role}</span>
              <span>·</span>
              <span className="font-mono text-white/70">{salaryDisplay}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono font-black text-white">{p.index.toFixed(0)}</span>
            <span className="text-[10px] text-white/40 block">Score</span>
          </div>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.05] text-violet-300 hover:bg-white/10 transition-colors"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {/* Rationale & Quick Peek */}
      <p className="text-xs text-white/70 line-clamp-2 pl-13">
        <b className="text-white/90">Franchise Rationale:</b> {reason}
      </p>

      {/* Expanded Dossier: Strengths, Weaknesses, Auction History */}
      {expanded && (
        <div className="mt-3 pl-13 pr-2 space-y-3 pt-2 border-t border-white/5">
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {strengths && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Scout Strengths
                </span>
                <p className="text-white/85 leading-relaxed">{strengths}</p>
              </div>
            )}
            {weaknesses && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-3 space-y-1">
                <span className="text-[10px] font-black uppercase text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Scout Weaknesses
                </span>
                <p className="text-white/85 leading-relaxed">{weaknesses}</p>
              </div>
            )}
          </div>

          <PlayerAuctionHistory id={p.id} active={expanded} />

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] text-white/40">
              Auction estimate: {money(p.predictedLakh)}
            </span>
            <Link
              href={`/players/${encodeURIComponent(p.name)}`}
              className="text-violet-300 hover:text-white font-bold transition-colors"
            >
              Full player analytics →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerAuctionHistory({ id, active }: { id: string; active: boolean }) {
  const q = useQuery({
    queryKey: ["player-contract-history", id],
    queryFn: () => fetchPlayerIntelligence(id),
    enabled: active,
    staleTime: 300000,
    retry: 1,
  });

  if (!active) return null;
  if (q.isLoading) return <p className="text-[11px] text-slate-400 mt-2">Loading recorded auction history...</p>;
  if (!q.data) return null;

  const history = q.data.history;
  if (!history.length) return null;

  return (
    <div className="mt-2 rounded-xl bg-black/20 border border-white/5 p-3 text-xs space-y-2">
      <h4 className="font-black uppercase tracking-wider text-[10px] text-white/50">Recorded Auction Transactions</h4>
      <table className="w-full text-left text-[11px]">
        <thead className="text-[9px] uppercase text-white/40 border-b border-white/5">
          <tr>
            <th className="py-1">Year</th>
            <th className="py-1">Team</th>
            <th className="py-1 text-right">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {history
            .slice()
            .sort((a, b) => b.season - a.season)
            .map((h, i) => (
              <tr key={`${h.season}-${i}`}>
                <td className="py-1 font-mono text-white/70">{h.season}</td>
                <td className="py-1 text-white/80">{h.team}</td>
                <td className="py-1 text-right font-mono text-emerald-400 font-bold">{money(h.paidLakh)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
