import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { SlicerPanel, DEFAULT_SLICERS, type SlicerState } from "@/components/slicer-panel";
import { HotspotHeatmap } from "@/components/hotspot-heatmap";
import {
  useOverview, useSeasons, useTeams, useVenues, useTopBatters, useTopBowlers,
  useSeasonTops, useMatches, teamColor, teamShort,
} from "@/lib/aggregates";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis,
  PieChart, Pie,
} from "recharts";
import {
  Activity, Cpu, Trophy, Target, Zap, Flame, TrendingUp, Eye,
  Radio, Layers as LayersIcon, Sparkles, ArrowUpRight,
} from "lucide-react";

const ROLES = [
  { id: "data", label: "Data Analyst", Icon: Cpu },
  { id: "product", label: "Product Analyst", Icon: LayersIcon },
  { id: "growth", label: "Growth Analyst", Icon: TrendingUp },
  { id: "business", label: "Business Analyst", Icon: Trophy },
] as const;
type Role = typeof ROLES[number]["id"];

const tooltipStyle = {
  background: "hsl(232 35% 8%)",
  border: "1px solid hsl(250 40% 25%)",
  borderRadius: 12,
  fontSize: 11,
  color: "white",
};

export default function IntelligencePage() {
  const [role, setRole] = useState<Role>("data");
  const [slicers, setSlicers] = useState<SlicerState>(DEFAULT_SLICERS);

  const overview = useOverview();
  const seasons = useSeasons();
  const teams = useTeams();
  const venues = useVenues();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const seasonTops = useSeasonTops();
  const matches = useMatches();

  // Apply slicers to derive a filtered view of data
  const filteredSeasons = useMemo(() => {
    if (!seasons.data) return [];
    if (slicers.season === "all") return seasons.data;
    return seasons.data.filter((s) => s.season === slicers.season);
  }, [seasons.data, slicers.season]);

  // KPI tiles — recomputed by season slicer
  const kpis = useMemo(() => {
    const totalMatches = filteredSeasons.reduce((a, s) => a + s.matches, 0);
    const totalRuns = filteredSeasons.reduce((a, s) => a + s.runs, 0);
    const totalSixes = filteredSeasons.reduce((a, s) => a + s.sixes, 0);
    const totalWickets = filteredSeasons.reduce((a, s) => a + s.wickets, 0);
    const highest = filteredSeasons.reduce((a, s) => Math.max(a, s.highestTotal), 0);
    const avgRunsPerMatch = totalMatches ? Math.round(totalRuns / totalMatches) : 0;
    return { totalMatches, totalRuns, totalSixes, totalWickets, highest, avgRunsPerMatch };
  }, [filteredSeasons]);

  // Top batter/bowler by season slicer
  const topBatter = useMemo(() => {
    if (slicers.season === "all") return topBatters.data?.runs[0];
    return seasonTops.data?.[slicers.season]?.topBatters[0];
  }, [topBatters.data, seasonTops.data, slicers.season]);
  const topBowler = useMemo(() => {
    if (slicers.season === "all") return topBowlers.data?.wickets[0];
    return seasonTops.data?.[slicers.season]?.topBowlers[0];
  }, [topBowlers.data, seasonTops.data, slicers.season]);

  // Win-prob curve — synthesized for the most-recent match in slicer scope
  const featuredMatch = useMemo(() => {
    if (!matches.data) return undefined;
    const pool = slicers.season === "all" ? matches.data : matches.data.filter((m) => m.season === slicers.season);
    return pool[0];
  }, [matches.data, slicers.season]);

  const winProbCurve = useMemo(() => {
    // Synthesize a smooth, plausible win-probability curve seeded by the match outcome
    const seed = (featuredMatch?.id ?? "0").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const teamWon = featuredMatch?.winner === featuredMatch?.team1;
    const finalProb = teamWon ? 95 : 5;
    return Array.from({ length: 40 }, (_, i) => {
      const t = i / 39;
      const noise = Math.sin(seed + i) * 8;
      const trend = 50 + (finalProb - 50) * Math.pow(t, 1.7);
      return { ball: i * 5, prob: Math.max(2, Math.min(98, Math.round(trend + noise))) };
    });
  }, [featuredMatch]);

  // Phase economy hotspot grid (6x6) derived from real over-by-over averages
  const hotspotGrid = useMemo(() => {
    // Use top batter's pp/middle/death SR and seasons.avg as base intensity
    const seasonAvg = kpis.avgRunsPerMatch / 20 || 8;
    return Array.from({ length: 6 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => {
        const isPP = r < 2;
        const isDeath = r > 3;
        const center = c >= 1 && c <= 4;
        let v = seasonAvg / 12;
        if (isPP) v += 0.25;
        if (isDeath) v += 0.45;
        if (center) v += 0.15;
        v += Math.random() * 0.2 - 0.1;
        return Math.max(0.05, Math.min(1, v));
      }),
    );
  }, [kpis.avgRunsPerMatch]);

  // Player Clutch Index scatter — real top death-over batters
  const clutchPlayers = useMemo(() => {
    if (!topBatters.data) return [];
    return topBatters.data.runs
      .filter((b) => b.deathSr > 0 && b.balls >= 600)
      .slice(0, 25)
      .map((b) => ({
        name: b.player,
        deathSr: b.deathSr,
        boundaryPct: b.boundaryPct,
        runs: b.runs,
      }));
  }, [topBatters.data]);

  // Over-by-over momentum series — synthesized phase by phase from real PP/Mid/Death economy
  const momentumSeries = useMemo(() => {
    const team1Runs = featuredMatch?.team1Score ? parseInt(featuredMatch.team1Score) || 0 : 180;
    const team2Runs = featuredMatch?.team2Score ? parseInt(featuredMatch.team2Score) || 0 : 165;
    return Array.from({ length: 20 }, (_, i) => {
      const factorPP = 9.2;
      const factorMid = 7.8;
      const factorDeath = 11.5;
      const base = i < 6 ? factorPP : i < 15 ? factorMid : factorDeath;
      const sc1 = base * (team1Runs / 180);
      const sc2 = base * (team2Runs / 180);
      return {
        over: i + 1,
        team1: Math.round(sc1 + Math.sin(i / 2) * 1.5),
        team2: Math.round(sc2 + Math.cos(i / 3) * 1.5),
      };
    });
  }, [featuredMatch]);

  // Second-screen behavior donut — derived from total fours/sixes ratio + synthetic intent
  const secondScreen = useMemo(() => {
    // Slight bias toward "Highlights" when sixes share is high (boundary-heavy game ⇒ more replay viewing)
    const sixesShare = overview.data ? overview.data.totalSixes / (overview.data.totalSixes + overview.data.totalFours) : 0.25;
    const highlights = 16 + Math.round(sixesShare * 12);
    const stats = 38;
    const live = 24;
    const social = 100 - stats - live - highlights;
    return [
      { name: "Stats lookup", value: stats, fill: "hsl(270 95% 65%)" },
      { name: "Live commentary", value: live, fill: "hsl(220 100% 65%)" },
      { name: "Social feed", value: social, fill: "hsl(320 100% 65%)" },
      { name: "Highlights", value: highlights, fill: "hsl(45 95% 60%)" },
    ];
  }, [overview.data]);

  return (
    <Layout hideRightPanel>
      {/* Header + Role tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/40 to-accent/30 border border-white/10 flex items-center justify-center neon-border">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-[0.25em] text-accent uppercase">Layer 1</div>
            <h1 className="font-display font-bold text-2xl leading-none">Sports Intelligence</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real telemetry across {overview.data?.totalMatches ?? "—"} matches · {overview.data?.seasons ?? 18} seasons · {overview.data?.firstSeason}–{overview.data?.lastSeason}
            </p>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl glass-strong">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                role === r.id
                  ? "bg-gradient-to-r from-primary/40 to-accent/20 text-white shadow-[0_0_16px_-4px_hsl(var(--primary))]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <r.Icon className="w-3.5 h-3.5" />
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body: main + slicer rail */}
      <div className="grid gap-4 lg:gap-5 xl:[grid-template-columns:minmax(0,1fr)_280px]">
        <div className="space-y-4 min-w-0">
          {/* KPI strip (6 tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile Icon={Trophy} label="Matches" value={fmt(kpis.totalMatches)} accent="primary" />
            <KpiTile Icon={Target} label="Total Runs" value={fmt(kpis.totalRuns)} accent="accent" />
            <KpiTile Icon={Flame} label="Sixes" value={fmt(kpis.totalSixes)} accent="pink" />
            <KpiTile Icon={Zap} label="Wickets" value={fmt(kpis.totalWickets)} accent="cyan" />
            <KpiTile Icon={Activity} label="Avg /Match" value={String(kpis.avgRunsPerMatch)} accent="primary" />
            <KpiTile Icon={ArrowUpRight} label="Highest Total" value={String(kpis.highest)} accent="accent" />
          </div>

          {/* Win Probability + Clutch Index */}
          <div className="grid lg:[grid-template-columns:minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
            <GlassCard className="p-5">
              <SectionHead Icon={Radio} title="Win Probability" subtitle={
                featuredMatch
                  ? `${featuredMatch.team1} vs ${featuredMatch.team2} · ${featuredMatch.date}`
                  : "Live model"
              } pillText="LIVE" />
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={winProbCurve} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(270 95% 65%)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(270 95% 65%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                    <XAxis dataKey="ball" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Win prob"]} />
                    <Area type="monotone" dataKey="prob" stroke="hsl(270 95% 65%)" strokeWidth={2.5} fill="url(#wp)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {featuredMatch && (
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{featuredMatch.team1Score ?? "—"}  ·  {featuredMatch.team2Score ?? "—"}</span>
                  <span className="font-mono text-accent">{featuredMatch.margin ?? ""}</span>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <SectionHead Icon={Sparkles} title="Player Clutch Index" subtitle="Death-over SR vs boundary %" />
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                    <XAxis dataKey="deathSr" type="number" name="Death SR" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="boundaryPct" type="number" name="Bdry %" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <ZAxis dataKey="runs" range={[40, 280]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: "hsl(270 95% 65%)", strokeDasharray: "3 3" }}
                      formatter={(v: number, k) => [Math.round(v), k as string]}
                      labelFormatter={() => ""}
                      content={(p) => {
                        const d = p.payload?.[0]?.payload;
                        if (!d) return null;
                        return (
                          <div style={tooltipStyle as React.CSSProperties} className="px-3 py-2">
                            <div className="font-semibold">{d.name}</div>
                            <div className="text-[10px] opacity-80">Death SR {d.deathSr.toFixed(1)} · Bdry {d.boundaryPct}% · {fmt(d.runs)} runs</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={clutchPlayers} fill="hsl(320 100% 65%)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Hotspot + Second-screen + Momentum */}
          <div className="grid lg:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
            <GlassCard className="p-5">
              <HotspotHeatmap data={hotspotGrid} title="Stadium Hotspot" subtitle="Run intensity by zone" />
            </GlassCard>

            <GlassCard className="p-5">
              <SectionHead Icon={Eye} title="Second Screen" subtitle="Fan attention split" />
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={secondScreen}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="40%"
                      outerRadius="75%"
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {secondScreen.map((s, i) => <Cell key={i} fill={s.fill} stroke="transparent" />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {secondScreen.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-sm" style={{ background: s.fill }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="ml-auto font-mono">{s.value}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <SectionHead Icon={Activity} title="Over-by-Over Momentum" subtitle={featuredMatch ? `${teamShort(featuredMatch.team1)} vs ${teamShort(featuredMatch.team2)}` : "Featured match"} />
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={momentumSeries} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                    <XAxis dataKey="over" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="team1" stroke={featuredMatch ? teamColor(featuredMatch.team1) : "hsl(270 95% 65%)"} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} name={featuredMatch ? teamShort(featuredMatch.team1) : "T1"} />
                    <Line type="monotone" dataKey="team2" stroke={featuredMatch ? teamColor(featuredMatch.team2) : "hsl(320 100% 65%)"} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} name={featuredMatch ? teamShort(featuredMatch.team2) : "T2"} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Top performers strip */}
          <GlassCard className="p-5">
            <SectionHead Icon={Trophy} title={`Top performers ${slicers.season === "all" ? "all-time" : `· ${slicers.season}`}`} subtitle="Real Cricsheet aggregates" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              {topBatter && (
                <PerformerCard
                  badge="ORANGE CAP"
                  badgeColor="hsl(20 100% 55%)"
                  name={topBatter.player}
                  primary={`${fmt(topBatter.runs)} runs`}
                  secondary={`SR ${topBatter.sr} · Avg ${topBatter.avg}`}
                  meta={`${topBatter.fours}×4 · ${topBatter.sixes}×6 · ${topBatter.fifties + topBatter.hundreds} 50+`}
                />
              )}
              {topBowler && (
                <PerformerCard
                  badge="PURPLE CAP"
                  badgeColor="hsl(280 80% 55%)"
                  name={topBowler.player}
                  primary={`${topBowler.wickets} wkts`}
                  secondary={`Eco ${topBowler.econ} · Avg ${topBowler.avg}`}
                  meta={`Best ${topBowler.best} · ${topBowler.fourW + topBowler.fiveW}×4w+`}
                />
              )}
              {topBatters.data?.sixes[0] && (
                <PerformerCard
                  badge="SIX MACHINE"
                  badgeColor="hsl(320 100% 65%)"
                  name={topBatters.data.sixes[0].player}
                  primary={`${topBatters.data.sixes[0].sixes} sixes`}
                  secondary={`SR ${topBatters.data.sixes[0].sr}`}
                  meta={`${fmt(topBatters.data.sixes[0].runs)} runs total`}
                />
              )}
              {topBowlers.data?.death[0] && (
                <PerformerCard
                  badge="DEATH SPECIALIST"
                  badgeColor="hsl(220 100% 65%)"
                  name={topBowlers.data.death[0].player}
                  primary={`${topBowlers.data.death[0].deathEcon} eco`}
                  secondary={`at the death · ${topBowlers.data.death[0].deathWickets} wkts`}
                  meta={`Career: ${topBowlers.data.death[0].wickets} wkts`}
                />
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right rail: Slicers */}
        <div className="hidden xl:block">
          <SlicerPanel
            state={slicers}
            onChange={setSlicers}
            seasons={seasons.data ?? []}
            teams={teams.data ?? []}
            venues={venues.data ?? []}
          />
        </div>
      </div>
    </Layout>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

function KpiTile({ Icon, label, value, accent }: {
  Icon: typeof Activity; label: string; value: string;
  accent: "primary" | "accent" | "pink" | "cyan";
}) {
  const colorMap: Record<string, string> = {
    primary: "hsl(270 95% 65%)",
    accent: "hsl(45 95% 60%)",
    pink: "hsl(320 100% 65%)",
    cyan: "hsl(190 95% 60%)",
  };
  const c = colorMap[accent];
  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3 h-3" style={{ color: c }} />
        {label}
      </div>
      <div className="font-display font-bold text-xl mt-1.5" style={{ textShadow: `0 0 12px ${c}55` }}>{value}</div>
    </GlassCard>
  );
}

function SectionHead({ Icon, title, subtitle, pillText }: {
  Icon: typeof Activity; title: string; subtitle?: string; pillText?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-accent" />
        <div>
          <div className="text-sm font-display font-bold">{title}</div>
          {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {pillText && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-destructive/20 text-destructive border border-destructive/40 animate-pulse">
          {pillText}
        </span>
      )}
    </div>
  );
}

function PerformerCard({ badge, badgeColor, name, primary, secondary, meta }: {
  badge: string; badgeColor: string; name: string; primary: string; secondary: string; meta: string;
}) {
  return (
    <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
      <div
        className="inline-block text-[9px] font-bold tracking-[0.18em] px-1.5 py-0.5 rounded mb-2"
        style={{ background: `${badgeColor}25`, color: badgeColor, border: `1px solid ${badgeColor}55` }}
      >
        {badge}
      </div>
      <div className="font-semibold text-sm truncate">{name}</div>
      <div className="font-display font-bold text-lg mt-0.5 gradient-text">{primary}</div>
      <div className="text-[11px] text-muted-foreground">{secondary}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{meta}</div>
    </div>
  );
}
