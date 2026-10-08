import { useAnalyticsFilterStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useMatches, useSeasons, useSquadsBySeason, usePlayerBios, usePointsTables,
  TEAM_COLORS, teamShort,
  type SquadPlayer, type PlayerBio,
} from "@/lib/aggregates";
import { PlayerAvatar } from "@/components/player-avatar";
import { Link } from "wouter";
import { Calendar, Trophy, Users, Activity, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { AdVessel } from "@/components/ad-vessel";

export default function ScoresPage() {
  const seasons = useSeasons();
  const filterStore = useAnalyticsFilterStore();
  const selectedSeason = filterStore.filters.season === "All Seasons"
    ? (seasons.data?.at(-1)?.season ?? "2026")
    : filterStore.filters.season;
  const [activeTab, setActiveTab] = useState("schedule");

  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-[#050816] text-white p-6 gap-6">
        {/* Top Filter Bar */}
        <div className="bg-[#0B1020] rounded-[24px] border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl sticky top-4 z-[100]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Filter className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Filter Dashboard</span>
              <span className="text-[14px] font-black uppercase tracking-widest text-white">IPL Archives</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {seasons.data?.slice().reverse().map(s => (
              <button 
                key={s.season}
                onClick={() => filterStore.setFilter("season", s.season)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSeason === s.season ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white/[0.03] text-white/40 hover:bg-white/10 hover:text-white'}`}
              >
                {s.season}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: "schedule", label: "Schedule", icon: Calendar },
            { id: "points", label: "Points Table", icon: Trophy },
            { id: "squad", label: "Squads", icon: Users },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {/* No AnimatePresence/exit here on purpose: an exiting child stays
            mounted until its exit animation completes, so if animation frames
            stall the previous tab's content never unmounts and two tabs render
            at once. Keying the div still gives the enter animation. */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {activeTab === "schedule" && <ScheduleView season={selectedSeason} />}
          {activeTab === "points" && <PointsView season={selectedSeason} />}
          {activeTab === "squad" && <SquadsListView season={selectedSeason} />}
        </motion.div>

        {/* Native Ad Vessel - Match Day Telemetry Sponsor */}
        <div className="pt-2">
          <AdVessel slot="1029384757" format="horizontal" label="Match Day Partner · Live Telemetry Briefing" />
        </div>
      </div>
    </Layout>
  );
}

function ScheduleView({ season }: { season: string }) {
  const allMatches = useMatches();
  const filteredMatches = allMatches.data?.filter(m => m.season === season) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredMatches.map(m => (
        <Link key={m.id} href={`/match/${m.id}`}>
          <div className="bg-[#0B1020] border border-white/10 rounded-2xl p-5 hover:border-primary/50 hover:bg-white/[0.02] transition-all cursor-pointer group shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/[0.03] px-2 py-1 rounded-md">{new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              {/* This is the match's id, not its number in the season — calling
                  it "Match 1082591" read as a fixture number. */}
              <div className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-primary uppercase" title={`Match ID ${m.id}`}>#{m.id}</div>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black" style={{backgroundColor: TEAM_COLORS[m.team1] || '#555', color: '#fff'}}>{teamShort(m.team1)}</div>
                  <span className="text-[13px] font-black text-white group-hover:text-primary transition-colors">{teamShort(m.team1)}</span>
                </div>
                <span className="text-[12px] font-black text-white/60">{m.team1Score || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black" style={{backgroundColor: TEAM_COLORS[m.team2] || '#555', color: '#fff'}}>{teamShort(m.team2)}</div>
                  <span className="text-[13px] font-black text-white group-hover:text-accent transition-colors">{teamShort(m.team2)}</span>
                </div>
                <span className="text-[12px] font-black text-white/60">{m.team2Score || "-"}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              {/* 25 matches have no winner because they were tied (decided by a
                  super over) or abandoned. The margin already says which, so
                  they no longer read as "Scheduled" years after being played. */}
              <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter truncate max-w-[200px] leading-tight">
                {m.winner
                  ? `${m.winner} won by ${m.margin}`
                  : m.margin === "tie" ? "Match tied · decided by Super Over"
                  : m.margin === "no result" ? "No result"
                  : m.margin || "Scheduled"}
              </span>
              <Activity className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors shrink-0" />
            </div>
          </div>
        </Link>
      ))}
      {filteredMatches.length === 0 && (
        <div className="col-span-full py-20 text-center text-white/40 font-black uppercase tracking-widest">No matches found for {season}</div>
      )}
    </div>
  );
}

function PointsView({ season }: { season: string }) {
  const points = usePointsTables();
  const table = points.data?.[season];

  if (points.isLoading) {
    return <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">Loading standings…</div>;
  }
  if (!table || table.length === 0) {
    return (
      <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">
        No standings available for {season}
      </div>
    );
  }

  return (
    <div className="bg-[#0B1020] rounded-[32px] border border-white/10 overflow-hidden shadow-xl">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <Trophy className="w-5 h-5 text-amber-400" />
        <span className="font-black uppercase tracking-widest text-[14px] text-white">
          {season} League Stage Standings
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02]">
            <tr>
              {["Pos", "Team", "P", "W", "L", "NR", "NRR", "Pts"].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${h === "Pts" ? "text-primary" : "text-white/30"} ${i > 1 ? "text-center" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {table.map(r => (
              <tr
                key={r.team}
                className={`hover:bg-white/[0.02] transition-colors ${r.qualified ? "bg-emerald-400/[0.04]" : ""}`}
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-white/40">{r.position}</span>
                    {/* Teams that reached the playoffs get a rail, matching how
                        the source table marks qualification. */}
                    {r.qualified && <span className="w-1 h-4 rounded-full bg-emerald-400/70" />}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shrink-0"
                      style={{ backgroundColor: TEAM_COLORS[r.team] || "#555", color: "#fff" }}
                    >
                      {teamShort(r.team)}
                    </div>
                    <span className="text-[13px] font-black text-white">{r.team}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center font-bold text-white/60">{r.played}</td>
                <td className="px-6 py-5 text-center font-black text-emerald-400">{r.wins}</td>
                <td className="px-6 py-5 text-center font-black text-red-400">{r.losses}</td>
                <td className="px-6 py-5 text-center font-bold text-white/40">{r.noResult}</td>
                <td className={`px-6 py-5 text-center font-bold tabular-nums ${(r.nrr ?? 0) >= 0 ? "text-white/70" : "text-white/40"}`}>
                  {r.nrr == null ? "—" : (r.nrr > 0 ? "+" : "") + r.nrr.toFixed(3)}
                </td>
                <td className="px-6 py-5 text-center font-black text-primary text-[18px]">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SquadsListView({ season }: { season: string }) {
  const squads = useSquadsBySeason();
  const bios = usePlayerBios();

  const seasonSquads = squads.data?.[season];
  const teamNames = useMemo(
    () => (seasonSquads ? Object.keys(seasonSquads).sort() : []),
    [seasonSquads],
  );

  // Bios are keyed by slug, so index them by the names a squad row can carry.
  const bioIndex = useMemo(() => {
    const map = new Map<string, PlayerBio>();
    for (const bio of Object.values(bios.data ?? {})) {
      for (const key of [bio.playerName, bio.fullName]) {
        const k = key?.trim().toLowerCase();
        if (k && !map.has(k)) map.set(k, bio);
      }
    }
    return map;
  }, [bios.data]);

  const bioFor = (p: SquadPlayer) =>
    bioIndex.get((p.cricsheetName ?? "").toLowerCase()) ??
    bioIndex.get(p.name.toLowerCase()) ??
    null;

  if (squads.isLoading) {
    return <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">Loading squads…</div>;
  }
  if (!seasonSquads || teamNames.length === 0) {
    return (
      <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">
        No squad data for {season}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {teamNames.map(team => {
        const players = seasonSquads[team] ?? [];
        // Fees are quoted in rupees from 2014 on and in US dollars before that;
        // the two are not interconvertible without a historical rate, so the
        // total is shown in whichever currency that season actually used.
        const spendLakh = players.reduce((sum, p) => sum + (p.priceLakh ?? 0), 0);
        const spendUsd = players.reduce((sum, p) => sum + (p.priceUsd ?? 0), 0);
        const spendLabel = spendLakh > 0
          ? `₹${(spendLakh / 100).toFixed(2)} Cr`
          : spendUsd > 0
            ? `$${(spendUsd / 1_000_000).toFixed(2)}M`
            : "—";
        const overseas = players.filter(p => p.country && p.country !== "India").length;
        return (
          <div key={team} className="bg-[#0B1020] rounded-[24px] border border-white/10 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-4 p-6 pb-4 border-b border-white/5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black shadow-lg shrink-0"
                style={{ backgroundColor: TEAM_COLORS[team] || "#555", color: "#fff" }}
              >
                {teamShort(team)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {season} Squad · {players.length} players
                </span>
                <span className="text-[14px] font-black text-white leading-tight truncate">{team}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5">
              <div className="bg-[#0B1020] px-4 py-3">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Known Spend</div>
                <div className="text-[14px] font-black text-primary">{spendLabel}</div>
              </div>
              <div className="bg-[#0B1020] px-4 py-3">
                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Overseas</div>
                <div className="text-[14px] font-black text-white/80">{overseas}</div>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-white/5 max-h-[420px] overflow-y-auto">
              {players.map(p => (
                <div key={p.cricsheetName ?? p.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <PlayerAvatar
                    name={p.cricsheetName ?? p.name}
                    bio={bioFor(p)}
                    className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[12px] font-black text-white truncate leading-tight">{p.name}</span>
                    <span className="text-[9px] font-bold text-white/35 uppercase tracking-wider truncate">
                      {[p.country, p.role].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Squad members who never took the field are still part of
                        the roster, so mark them rather than hiding them. */}
                    {!p.played && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/25 border border-white/10 rounded px-1.5 py-0.5">
                        Bench
                      </span>
                    )}
                    {p.acquisition === "retained" && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300/70 border border-emerald-400/20 bg-emerald-400/5 rounded px-1.5 py-0.5">
                        Ret
                      </span>
                    )}
                    <span className={`text-[11px] font-black tabular-nums ${p.priceDisplay ? "text-primary" : "text-white/20"}`}>
                      {p.priceDisplay ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
