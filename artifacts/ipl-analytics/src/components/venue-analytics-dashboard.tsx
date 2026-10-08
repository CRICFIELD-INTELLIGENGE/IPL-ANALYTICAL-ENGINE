import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { Zap, Gauge, Droplets, Trophy, Calculator, Users } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { useVenueAnalytics, usePlayerDisplayNames, displayPlayerName } from "@/lib/aggregates";

const ERA_PRESETS: Array<{ label: string; from: number | null; to: number | null }> = [
  { label: "All-Time", from: null, to: null },
  { label: "2008–2013", from: 2008, to: 2013 },
  { label: "2014–2019", from: 2014, to: 2019 },
  { label: "2020–2023", from: 2020, to: 2023 },
  { label: "Last 3", from: 2024, to: 2026 },
];

const TIME_SLOTS = [
  { id: "all", label: "All" },
  { id: "evening", label: "Evening" },
  { id: "afternoon", label: "Afternoon" },
] as const;

const tooltipStyle = {
  backgroundColor: "#0A0D1A",
  borderColor: "rgba(255,255,255,0.1)",
  borderRadius: "12px",
  fontSize: "12px",
};

function Heading({ icon: Icon, title, subtitle, right }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h3>
        {subtitle && <p className="text-[10px] text-white/40 font-bold mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function VenueAnalyticsDashboard({ venue }: { venue: string }) {
  const [era, setEra] = useState(0);
  const [slot, setSlot] = useState<"all" | "evening" | "afternoon">("all");
  const preset = ERA_PRESETS[era];
  const q = useVenueAnalytics(venue, { from: preset.from, to: preset.to, timeOfDay: slot });
  const displayNames = usePlayerDisplayNames();
  const d = q.data;

  /** Par calculator input: how many overs have been bowled. */
  const [parOver, setParOver] = useState(10);

  const parAt = useMemo(() => {
    if (!d?.parByOver?.length) return null;
    return d.parByOver.find(p => p.over === parOver) ?? d.parByOver[d.parByOver.length - 1];
  }, [d, parOver]);

  if (q.isLoading) {
    return <div className="py-16 text-center text-white/40 font-black uppercase tracking-widest">Reading the pitch…</div>;
  }
  if (q.isError || !d) {
    return <div className="py-16 text-center text-white/40 font-black uppercase tracking-widest">No ball-by-ball record for this ground.</div>;
  }
  if (d.matches === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="text-sm font-black uppercase tracking-widest text-white/50">
          No matches here in this filter
        </div>
        <p className="text-[11px] text-white/35 font-bold mt-1">Widen the era or time-of-day selection.</p>
      </GlassCard>
    );
  }

  const phaseChart = d.phases.map(p => ({ phase: p.phase, runRate: p.runRate, wickets: p.wickets }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassCard className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mr-1">Seasons</span>
          {ERA_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setEra(i)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                era === i ? "bg-primary/30 text-white shadow-[0_0_14px_-4px_hsl(var(--primary))]" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Start</span>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {TIME_SLOTS.map(t => (
              <button
                key={t.id}
                onClick={() => setSlot(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  slot === t.id ? "bg-primary/30 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Matches", value: String(d.matches), sub: `${d.seasons} seasons` },
          { label: "Avg 1st Inn", value: String(Math.round(d.innings.firstAvg)), sub: `${d.innings.firstWkts.toFixed(1)} wkts` },
          { label: "Avg 2nd Inn", value: String(Math.round(d.innings.secondAvg)), sub: `${d.innings.secondWkts.toFixed(1)} wkts` },
          { label: "Powerplay RR", value: String(d.phases[0]?.runRate ?? 0) },
          { label: "Death RR", value: String(d.phases[2]?.runRate ?? 0) },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</div>
            <div className="text-[20px] font-black text-white mt-1 tabular-nums">{s.value}</div>
            {s.sub && <div className="text-[10px] font-bold text-white/35 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Phase profile + pace vs spin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <Heading icon={Zap} title="Phase Profile" subtitle="Scoring rate and wickets by stage of the innings" />
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="phase" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis yAxisId="l" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 700 }} />
                <Bar yAxisId="l" dataKey="runRate" name="Run rate" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="wickets" name="Wickets" fill="rgba(255,255,255,0.25)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {d.phases.map(p => (
              <div key={p.phase} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{p.phase}</div>
                <div className="text-[11px] font-bold text-white/70 mt-1">{p.runRate} rpo · {p.boundaryPct}% bdry</div>
                <div className="text-[11px] font-bold text-white/45">{p.dotPct}% dots · {p.wickets} wkts</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Heading icon={Gauge} title="Pace vs Spin" subtitle="What this surface rewards" />
          <div className="space-y-3">
            {d.surface.map(s => (
              <div key={s.kind} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/70">{s.kind}</span>
                  <span className="text-[16px] font-black text-primary tabular-nums">{s.economy}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
                  <div><span className="text-white/35">Wkts </span><span className="text-white">{s.wickets}</span></div>
                  <div><span className="text-white/35">Avg </span><span className="text-white">{s.average}</span></div>
                  <div><span className="text-white/35">SR </span><span className="text-white">{s.strikeRate}</span></div>
                </div>
              </div>
            ))}
            {/* A plain reading of which discipline the deck favours. */}
            {d.surface.length === 2 && d.surface[0].economy > 0 && d.surface[1].economy > 0 && (
              <p className="text-[10px] text-white/35 font-bold leading-relaxed pt-1">
                {d.surface[1].economy < d.surface[0].economy
                  ? `Spin goes for ${(d.surface[0].economy - d.surface[1].economy).toFixed(2)} fewer runs an over here.`
                  : `Pace goes for ${(d.surface[1].economy - d.surface[0].economy).toFixed(2)} fewer runs an over here.`}
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Par calculator + dew */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <Heading
            icon={Calculator}
            title="Par Score By Over"
            subtitle="Mean first-innings total at the end of each over here"
            right={
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Par after {parOver} ov</div>
                  <div className="text-[20px] font-black text-primary tabular-nums">{parAt?.par ?? "—"}</div>
                </div>
              </div>
            }
          />
          <input
            type="range"
            min={1}
            max={Math.max(1, d.parByOver.length)}
            value={parOver}
            onChange={e => setParOver(Number(e.target.value))}
            className="w-full accent-[hsl(var(--primary))] mb-4"
            aria-label="Overs bowled"
          />
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.parByOver} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="over" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} runs`, "Par"]} />
                <ReferenceLine x={parOver} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="par" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Heading icon={Droplets} title="Second-Innings Shift" subtitle="How chasing scores differ by start time" />
          <div className="space-y-3">
            {[
              { label: "Evening starts", d: d.dew.evening, swing: d.dew.eveningSwing },
              { label: "Afternoon starts", d: d.dew.afternoon, swing: d.dew.afternoonSwing },
            ].map(row => (
              <div key={row.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/70">{row.label}</span>
                  <span
                    className="text-[15px] font-black tabular-nums"
                    style={{ color: row.swing >= 0 ? "#34d399" : "#f87171" }}
                  >
                    {row.swing > 0 ? "+" : ""}{row.swing}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-white/40 mt-1">
                  1st {Math.round(row.d.first)} → 2nd {Math.round(row.d.second)} · {row.d.matches} matches
                </div>
              </div>
            ))}
          </div>
          {/* Said plainly: this is a scoring shift, not a weather reading. */}
          <p className="text-[10px] text-white/30 font-bold mt-4 leading-relaxed">
            No weather is recorded anywhere in this data, so this is not a dew measurement — it is how much
            second-innings scoring rises or falls against the first, split by when the match started.
          </p>
        </GlassCard>
      </div>

      {/* Ground leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <Heading icon={Trophy} title="Most Runs Here" subtitle="Across every innings played at this ground" />
          <div className="space-y-2">
            {d.topBatters.map((b, i) => (
              <div key={b.player} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] font-black text-amber-400/40 w-4">#{i + 1}</span>
                <PlayerAvatar name={b.player} className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-white truncate">{displayPlayerName(b.player, displayNames)}</div>
                  <div className="text-[9px] font-bold text-white/35 uppercase tracking-wider">
                    {b.matches} matches · SR {b.strikeRate}
                  </div>
                </div>
                <span className="text-[15px] font-black text-primary tabular-nums">{b.runs}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Heading icon={Users} title="Most Wickets Here" subtitle="Across every spell bowled at this ground" />
          <div className="space-y-2">
            {d.topBowlers.map((b, i) => (
              <div key={b.player} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] font-black text-amber-400/40 w-4">#{i + 1}</span>
                <PlayerAvatar name={b.player} className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-white truncate">{displayPlayerName(b.player, displayNames)}</div>
                  <div className="text-[9px] font-bold text-white/35 uppercase tracking-wider">
                    {b.matches} matches · econ {b.economy} · avg {b.average}
                  </div>
                </div>
                <span className="text-[15px] font-black text-primary tabular-nums">{b.wickets}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
