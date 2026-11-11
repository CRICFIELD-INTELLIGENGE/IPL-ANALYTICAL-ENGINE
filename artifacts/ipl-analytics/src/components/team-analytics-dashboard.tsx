import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
} from "recharts";
import {
  Zap, Target, MapPin, Swords, AlertTriangle, Download, TrendingUp, Crown, Trophy,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { TeamLogo } from "@/components/team-logo";
import { useTeamAnalytics, type MatchSummary, teamShort } from "@/lib/aggregates";

/** Presets over the eras the league actually divides into. */
const ERA_PRESETS: Array<{ label: string; from: number | null; to: number | null }> = [
  { label: "All-Time", from: null, to: null },
  { label: "2008–2013", from: 2008, to: 2013 },
  { label: "2014–2017", from: 2014, to: 2017 },
  { label: "2018–2021", from: 2018, to: 2021 },
  { label: "2022–2026", from: 2022, to: 2026 },
  { label: "Last 5", from: 2022, to: 2026 },
];

const tooltipStyle = {
  backgroundColor: "#0A0D1A",
  borderColor: "rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
};

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</div>
      <div className="text-[20px] font-black mt-1 tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-[10px] font-bold text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, accent, right }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string; subtitle?: string; accent: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: accent }} />
          {title}
        </h3>
        {subtitle && <p className="text-[10px] text-white/40 font-bold mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function TeamAnalyticsDashboard({
  team, accent, matches,
}: {
  team: string;
  accent: string;
  /** All matches, used for the close-finish record the API does not carry. */
  matches: MatchSummary[];
}) {
  const [era, setEra] = useState(0);
  const preset = ERA_PRESETS[era];
  const analytics = useTeamAnalytics(team, preset.from, preset.to);
  const [opponent, setOpponent] = useState<string | null>(null);

  const d = analytics.data;

  /**
   * Close-finish record.
   *
   * Derived here rather than in SQL because matches.margin_type is NULL for
   * every row in the database; the readable margin ("7 wkts", "12 runs", "tie")
   * only exists on the match summary feed.
   */
  const clutch = useMemo(() => {
    const mine = matches.filter(m => {
      if (m.team1 !== team && m.team2 !== team) return false;
      const season = Number(String(m.season).replace(/[^0-9]/g, ""));
      if (preset.from != null && season < preset.from) return false;
      if (preset.to != null && season > preset.to) return false;
      return true;
    });
    let closePlayed = 0, closeWon = 0, ties = 0, tiesWon = 0;
    for (const m of mine) {
      const margin = String(m.margin ?? "").trim().toLowerCase();
      if (margin === "tie") {
        ties++;
        // An IPL tie is settled by a Super Over, and the winner recorded here
        // is the Super Over winner.
        if (m.winner === team) tiesWon++;
        continue;
      }
      const runs = /^(\d+)\s*runs?$/.exec(margin);
      const wkts = /^(\d+)\s*wkts?$/.exec(margin);
      const isClose = (runs && Number(runs[1]) < 10) || (wkts && Number(wkts[1]) <= 2);
      if (isClose) {
        closePlayed++;
        if (m.winner === team) closeWon++;
      }
    }
    return {
      closePlayed, closeWon,
      closeWinPct: closePlayed ? Math.round((closeWon / closePlayed) * 1000) / 10 : 0,
      ties, tiesWon,
    };
  }, [matches, team, preset.from, preset.to]);

  const h2hRow = useMemo(
    () => d?.headToHead.find(h => h.opponent === opponent) ?? null,
    [d, opponent],
  );

  /**
   * Recent form against the selected opponent, newest first.
   *
   * Constrained to the selected era: without this the panel listed 2026 games
   * while the header above it read "2008–2013".
   */
  const h2hRecent = useMemo(() => {
    if (!opponent) return [];
    const sameSide = (a?: string, b?: string) => !!a && !!b && teamShort(a) === teamShort(b);
    return matches
      .filter(m => {
        const meets =
          (sameSide(m.team1, team) && sameSide(m.team2, opponent)) ||
          (sameSide(m.team2, team) && sameSide(m.team1, opponent));
        if (!meets) return false;
        const season = Number(String(m.season).replace(/[^0-9]/g, ""));
        if (preset.from != null && season < preset.from) return false;
        if (preset.to != null && season > preset.to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [matches, team, opponent, preset.from, preset.to]);

  const exportCsv = () => {
    if (!d) return;
    const rows: string[][] = [
      ["Franchise", d.team],
      ["Season range", `${d.seasonRange.from ?? "2008"}-${d.seasonRange.to ?? "2026"}`],
      [],
      ["Record", "Played", "Won", "Lost", "No result", "Win %"],
      ["", String(d.record.played), String(d.record.wins), String(d.record.losses), String(d.record.noResult), String(d.record.winPct)],
      [],
      ["Batting phase", "Balls", "Runs", "Run rate", "Boundary %", "Dot %", "Wickets lost"],
      ...d.battingPhases.map(p => ["", String(p.balls), String(p.runs), String(p.runRate), String(p.boundaryPct), String(p.dotPct), String(p.wickets)].map((v, i) => i === 0 ? p.phase : v)),
      [],
      ["Bowling phase", "Balls", "Runs", "Economy", "Dot %", "Wickets"],
      ...d.bowlingPhases.map(p => [p.phase, String(p.balls), String(p.runs), String(p.balls ? Math.round((p.runs / p.balls) * 600) / 100 : 0), String(p.dotPct), String(p.wickets)]),
      [],
      ["Toss", "Matches", "Win %"],
      ["Won toss", String(d.toss.tossWon), String(d.toss.tossWonWinPct)],
      ["Lost toss", String(d.toss.tossLost), String(d.toss.tossLostWinPct)],
      [],
      ["Innings", "Matches", "Win %"],
      ["Batting first", String(d.battingOrder.batFirst), String(d.battingOrder.batFirstWinPct)],
      ["Chasing", String(d.battingOrder.chased), String(d.battingOrder.chasedWinPct)],
      [],
      ["Conditions", "Matches", "Win %"],
      ["Home", String(d.homeAway.homePlayed), String(d.homeAway.homeWinPct)],
      ["Away", String(d.homeAway.awayPlayed), String(d.homeAway.awayWinPct)],
      ["Evening", String(d.dayNight.nightPlayed), String(d.dayNight.nightWinPct)],
      ["Afternoon", String(d.dayNight.dayPlayed), String(d.dayNight.dayWinPct)],
      ["No published start time", String(d.dayNight.unknownStartTime), ""],
      [],
      ["Head to head", "Played", "Won", "Lost", "Win %"],
      ...d.headToHead.map(h => [h.opponent, String(h.played), String(h.wins), String(h.losses), String(h.winPct)]),
      [],
      ["Venue", "Played", "Won", "Win %"],
      ...d.venues.map(v => [v.venue, String(v.played), String(v.wins), String(v.winPct)]),
      [],
      ["Captain", "From", "To", "Matches", "Won", "Win %", "Titles", "Totals"],
      ...d.captains.map(c => [
        c.player, String(c.firstSeason ?? ""), String(c.lastSeason ?? ""),
        String(c.matches), String(c.won), String(c.winPct), String(c.titles),
        c.exact ? "this club" : `career (also ${c.alsoLed.join("; ")})`,
      ]),
    ];
    const csv = rows
      .map(r => r.map(cell => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teamShort(team)}-analytics-${preset.label.replace(/[^0-9A-Za-z]+/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (analytics.isLoading) {
    return <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">Computing franchise analytics…</div>;
  }
  if (analytics.isError || !d) {
    return <div className="py-20 text-center text-white/40 font-black uppercase tracking-widest">Analytics unavailable for this franchise.</div>;
  }

  const phaseChart = d.battingPhases.map((b, i) => ({
    phase: b.phase,
    batRR: b.runRate,
    bowlEcon: d.bowlingPhases[i]?.balls ? Math.round((d.bowlingPhases[i].runs / d.bowlingPhases[i].balls) * 600) / 100 : 0,
  }));

  const radarData = d.battingPhases.map((b, i) => ({
    phase: b.phase,
    Batting: b.boundaryPct,
    Bowling: d.bowlingPhases[i]?.dotPct ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Era filter + export */}
      <GlassCard className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mr-1">Era</span>
          {ERA_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setEra(i)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                era === i ? "text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              style={era === i ? { background: `${accent}30`, boxShadow: `0 0 14px -4px ${accent}` } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white border border-white/10 hover:border-white/25 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </GlassCard>

      {/* Headline for the selected era */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Played" value={String(d.record.played)} sub={preset.label} />
        <StatTile label="Won" value={String(d.record.wins)} accent="#34d399" />
        <StatTile label="Lost" value={String(d.record.losses)} accent="#f87171" />
        <StatTile label="Win %" value={`${d.record.winPct}%`} accent={accent} />
      </div>

      {/* Phase analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <SectionHeading
            icon={Zap} accent={accent}
            title="Phase Breakdown"
            subtitle="Batting run rate against bowling economy, by phase of the innings"
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="phase" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700 }} />
                <Bar dataKey="batRR" name="Batting RR" fill={accent} radius={[6, 6, 0, 0]} />
                <Bar dataKey="bowlEcon" name="Bowling Econ" fill="rgba(255,255,255,0.28)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {d.battingPhases.map((p, i) => (
              <div key={p.phase} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{p.phase}</div>
                <div className="text-[11px] font-bold text-white/70 mt-1">Bat {p.runRate} rpo · {p.boundaryPct}% bdry</div>
                <div className="text-[11px] font-bold text-white/45">
                  Bowl {d.bowlingPhases[i]?.dotPct ?? 0}% dots · {d.bowlingPhases[i]?.wickets ?? 0} wkts
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeading
            icon={Target} accent={accent}
            title="Phase Profile"
            subtitle="Boundary share batting vs dot share bowling"
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="phase" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700 }} />
                <PolarRadiusAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} />
                <Radar name="Boundary %" dataKey="Batting" stroke={accent} fill={accent} fillOpacity={0.35} />
                <Radar name="Dot %" dataKey="Bowling" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.18} />
                <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700 }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Toss, innings order, pace vs spin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <SectionHeading icon={TrendingUp} accent={accent} title="Toss Impact" subtitle="Win rate by toss outcome" />
          <div className="space-y-3">
            {[
              { label: "Won the toss", pctv: d.toss.tossWonWinPct, n: d.toss.tossWon },
              { label: "Lost the toss", pctv: d.toss.tossLostWinPct, n: d.toss.tossLost },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-white/60">{r.label}</span>
                  <span className="text-white tabular-nums">{r.pctv}% <span className="text-white/30">({r.n})</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pctv)}%`, background: accent }} />
                </div>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-white/5 text-[11px] font-bold text-white/45">
              On winning the toss: chose to field {d.toss.choseField}× · bat {d.toss.choseBat}×
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeading icon={Target} accent={accent} title="Conditions" subtitle="Innings order, ground and time of day" />
          <div className="space-y-3">
            {[
              { label: "Batting first", pctv: d.battingOrder.batFirstWinPct, n: d.battingOrder.batFirst },
              { label: "Chasing", pctv: d.battingOrder.chasedWinPct, n: d.battingOrder.chased },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-white/60">{r.label}</span>
                  <span className="text-white tabular-nums">{r.pctv}% <span className="text-white/30">({r.n})</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pctv)}%`, background: accent }} />
                </div>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div><span className="text-white/40">Home </span><span className="text-white">{d.homeAway.homeWinPct}%</span><span className="text-white/30"> ({d.homeAway.homePlayed})</span></div>
              <div><span className="text-white/40">Away </span><span className="text-white">{d.homeAway.awayWinPct}%</span><span className="text-white/30"> ({d.homeAway.awayPlayed})</span></div>
              <div><span className="text-white/40">Evening </span><span className="text-white">{d.dayNight.nightWinPct}%</span><span className="text-white/30"> ({d.dayNight.nightPlayed})</span></div>
              <div><span className="text-white/40">Afternoon </span><span className="text-white">{d.dayNight.dayWinPct}%</span><span className="text-white/30"> ({d.dayNight.dayPlayed})</span></div>
            </div>
            {d.dayNight.unknownStartTime > 0 && (
              // Stated rather than folded into one of the buckets.
              <div className="text-[9px] font-bold text-white/25 pt-1">
                {d.dayNight.unknownStartTime} fixtures have no published start time
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeading icon={Zap} accent={accent} title="Pace vs Spin" subtitle="This attack's own returns" />
          <div className="space-y-4">
            {d.bowlerSplit.map(b => (
              <div key={b.kind} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/70">{b.kind}</span>
                  <span className="text-[15px] font-black tabular-nums" style={{ color: accent }}>{b.economy}</span>
                </div>
                <div className="text-[10px] font-bold text-white/40">
                  {b.wickets} wickets · {b.dotPct}% dots · {Math.round(b.balls / 6)} overs
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Clutch + venues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <SectionHeading icon={AlertTriangle} accent={accent} title="Clutch & Collapse" subtitle="Tight finishes and wicket clusters" />
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Close finishes" value={`${clutch.closeWinPct}%`} sub={`${clutch.closeWon} of ${clutch.closePlayed} won`} accent={accent} />
            <StatTile label="Super Overs" value={`${clutch.tiesWon}/${clutch.ties}`} sub="Matches tied in regulation" />
            <StatTile label="Collapse rate" value={`${d.collapses.collapsePct}%`} sub={`${d.collapses.collapseInnings} of ${d.collapses.inningsBatted} innings`} accent="#f87171" />
            <StatTile label="Innings batted" value={String(d.collapses.inningsBatted)} sub="In this era" />
          </div>
          <p className="text-[10px] text-white/30 font-bold mt-4 leading-relaxed">
            A close finish is under 10 runs or 2 wickets or fewer. A collapse is three wickets inside fifteen deliveries.
          </p>
        </GlassCard>

        <GlassCard className="lg:col-span-2 p-6">
          <SectionHeading icon={MapPin} accent={accent} title="Venue Record" subtitle="Grounds with the most fixtures in this era" />
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {d.venues.slice(0, 12).map(v => (
              <div key={v.venue} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-white/60 w-[46%] truncate">{v.venue}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, v.winPct)}%`, background: accent }} />
                </div>
                <span className="text-[11px] font-black text-white tabular-nums w-14 text-right">{v.winPct}%</span>
                <span className="text-[10px] font-bold text-white/30 tabular-nums w-8 text-right">{v.played}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Captains */}
      {d.captains?.length > 0 && (
        <GlassCard className="p-6">
          <SectionHeading
            icon={Crown} accent={accent}
            title="Captaincy"
            subtitle="Everyone who has led the side, and how they fared"
          />
          <div className="space-y-2">
            {d.captains.map(c => (
              <div key={c.player} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <div className="w-[38%] min-w-0">
                  <div className="text-[12px] font-black text-white truncate flex items-center gap-1.5">
                    {c.player}
                    {c.titles > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-300/80">
                        <Trophy className="w-2.5 h-2.5" />{c.titles}
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-bold text-white/35 uppercase tracking-wider truncate">
                    {c.firstSeason === c.lastSeason ? c.firstSeason : `${c.firstSeason}–${c.lastSeason}`}
                    {c.country ? ` · ${c.country}` : ""}
                  </div>
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.winPct)}%`, background: accent }} />
                </div>
                <span className="text-[11px] font-black text-white tabular-nums w-14 text-right">{c.winPct}%</span>
                <span className="text-[10px] font-bold text-white/30 tabular-nums w-20 text-right">
                  {c.won}/{c.matches}
                  {/* Career-wide totals are marked so they are not read as this
                      club's alone. */}
                  {!c.exact && <span className="text-amber-300/50" title={`Career total; also led ${c.alsoLed.join(", ")}`}> *</span>}
                </span>
              </div>
            ))}
          </div>
          {d.captains.some(c => !c.exact) && (
            <p className="text-[10px] text-white/30 font-bold mt-4 leading-relaxed">
              * Career totals across every club the captain led — the source publishes one row per
              captain, not a per-club split.
            </p>
          )}
        </GlassCard>
      )}

      {/* Head to head */}
      <GlassCard className="p-6">
        <SectionHeading
          icon={Swords} accent={accent}
          title="Head to Head"
          subtitle="Select a rival for the full record and recent form"
          right={
            <select
              value={opponent ?? ""}
              onChange={e => setOpponent(e.target.value || null)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/80 focus:outline-none focus:border-white/30"
            >
              <option value="">All rivals</option>
              {d.headToHead.map(h => (
                <option key={h.opponent} value={h.opponent}>{h.opponent}</option>
              ))}
            </select>
          }
        />

        {h2hRow ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <TeamLogo team={h2hRow.opponent} size="w-12 h-12" />
              <div>
                <div className="text-sm font-black text-white">{h2hRow.opponent}</div>
                <div className="text-[11px] font-bold text-white/40">{h2hRow.played} matches in this era</div>
              </div>
              <div className="grid grid-cols-3 gap-3 ml-auto">
                <StatTile label="Won" value={String(h2hRow.wins)} accent="#34d399" />
                <StatTile label="Lost" value={String(h2hRow.losses)} accent="#f87171" />
                <StatTile label="Win %" value={`${h2hRow.winPct}%`} accent={accent} />
              </div>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Last 5 meetings</div>
              <div className="flex gap-2 flex-wrap">
                {h2hRecent.map(m => {
                  const won = m.winner === team;
                  const nr = !m.winner;
                  return (
                    <div
                      key={m.id}
                      className="px-3 py-2 rounded-xl border text-[10px] font-bold"
                      style={{
                        borderColor: nr ? "rgba(255,255,255,0.1)" : won ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)",
                        background: nr ? "rgba(255,255,255,0.02)" : won ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                      }}
                    >
                      <div className="text-white/80">{nr ? "No result" : won ? "Won" : "Lost"}</div>
                      <div className="text-white/35">{m.season} · {nr ? "—" : `by ${m.margin}`}</div>
                    </div>
                  );
                })}
                {h2hRecent.length === 0 && <span className="text-[11px] font-bold text-white/30">No meetings in this era.</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {d.headToHead.map(h => (
              <button
                key={h.opponent}
                onClick={() => setOpponent(h.opponent)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
              >
                <TeamLogo team={h.opponent} size="w-7 h-7" />
                <span className="text-[11px] font-bold text-white/70 w-[34%] truncate">{h.opponent}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.winPct)}%`, background: accent }} />
                </div>
                <span className="text-[11px] font-black text-white tabular-nums w-14 text-right">{h.winPct}%</span>
                <span className="text-[10px] font-bold text-white/30 tabular-nums w-16 text-right">{h.wins}-{h.losses}</span>
              </button>
            ))}
          </div>
        )}
      </GlassCard>

      {/* The API still reports `notSupported` and it stays documented in
          team-analytics.ts, but it is not surfaced to readers. */}
    </div>
  );
}
