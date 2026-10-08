/**
 * Stats Portal — Image 2 reference outer page.
 * Tabs: Stats | Dashboard | Reports | Blogs.
 * Backed by real Cricsheet aggregates.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import {
  useOverview, useSeasons, useTeams, useVenues, useTopBatters, useTopBowlers,
  useSeasonTops, useRunDistribution, teamColor, teamShort, playerSlug,
} from "@/lib/aggregates";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  BarChart3, LayoutDashboard, FileText, Newspaper, Trophy, ArrowUpRight,
  Database, Filter, Cpu, Download, Calendar, ShoppingBag
} from "lucide-react";

const TABS = [
  { id: "stats", label: "Stats", Icon: BarChart3 },
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "reports", label: "Reports", Icon: FileText },
  { id: "blogs", label: "Blogs", Icon: Newspaper },
] as const;
type Tab = typeof TABS[number]["id"];

const tooltipStyle = {
  background: "hsl(232 35% 8%)",
  border: "1px solid hsl(250 40% 25%)",
  borderRadius: 12,
  fontSize: 11,
  color: "white",
};

export default function PortalPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [season, setSeason] = useState<string>("all");

  const overview = useOverview();
  const seasons = useSeasons();
  const teams = useTeams();
  const venues = useVenues();
  const topBatters = useTopBatters();
  const topBowlers = useTopBowlers();
  const seasonTops = useSeasonTops();
  const runDist = useRunDistribution();

  const seasonOptions = useMemo(
    () => [{ value: "all", label: "All seasons" }, ...(seasons.data ?? []).map((s) => ({ value: s.season, label: s.season }))],
    [seasons.data],
  );

  return (
    <Layout hideRightPanel>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/40 to-primary/30 border border-white/10 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-[0.25em] text-accent uppercase">Cricket Intelligence OS</div>
            <h1 className="font-display font-bold text-2xl leading-none">Stats &amp; Reports Portal</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.data?.totalMatches.toLocaleString("en-IN") ?? "—"} matches · {overview.data?.totalRuns.toLocaleString("en-IN") ?? "—"} runs · {overview.data?.totalSixes.toLocaleString("en-IN") ?? "—"} sixes · {overview.data?.firstSeason}–{overview.data?.lastSeason}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-400/40 text-sm font-semibold hover:border-amber-400 text-amber-300 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Intelligence Cards &amp; Shop
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/intelligence"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/30 to-accent/20 border border-primary/40 text-sm font-semibold hover:shadow-[0_0_20px_-4px_hsl(var(--primary))] transition-all"
          >
            <Cpu className="w-4 h-4" />
            Open Sports Insights
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs + Season filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl glass-strong">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-primary/40 to-accent/20 text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <t.Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
          <Link
            href="/shop"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-all border border-amber-400/20"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            Shop
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <label className="text-muted-foreground">Season</label>
          <select
            aria-label="Season filter"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/60"
          >
            {seasonOptions.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
          </select>
        </div>
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          season={season}
          runDist={runDist.data}
          teams={teams.data ?? []}
          venues={venues.data ?? []}
          seasons={seasons.data ?? []}
          topBatters={topBatters.data}
          topBowlers={topBowlers.data}
          seasonTops={seasonTops.data}
        />
      )}
      {tab === "stats" && (
        <StatsTab
          season={season}
          topBatters={topBatters.data}
          topBowlers={topBowlers.data}
          seasonTops={seasonTops.data}
          teams={teams.data ?? []}
        />
      )}
      {tab === "reports" && <ReportsTab seasons={seasons.data ?? []} />}
      {tab === "blogs" && <BlogsTab />}
    </Layout>
  );
}

/* ---------------- Dashboard Tab ---------------- */
function DashboardTab(props: {
  season: string;
  runDist: Record<string, number> | undefined;
  teams: ReturnType<typeof useTeams>["data"] extends infer T ? (T extends undefined ? never : T) : never;
  venues: ReturnType<typeof useVenues>["data"] extends infer T ? (T extends undefined ? never : T) : never;
  seasons: ReturnType<typeof useSeasons>["data"] extends infer T ? (T extends undefined ? never : T) : never;
  topBatters: ReturnType<typeof useTopBatters>["data"];
  topBowlers: ReturnType<typeof useTopBowlers>["data"];
  seasonTops: ReturnType<typeof useSeasonTops>["data"];
}) {
  const { season, runDist, teams, venues, seasons, topBatters, topBowlers, seasonTops } = props;

  const distData = useMemo(() => {
    if (!runDist) return [];
    return Object.entries(runDist).map(([bucket, count]) => ({ bucket, count }));
  }, [runDist]);

  const teamWinsDonut = useMemo(
    () => teams.filter((t) => t.matches >= 50).map((t) => ({ name: teamShort(t.team), full: t.team, value: t.wins, fill: teamColor(t.team) })),
    [teams],
  );

  const venueData = useMemo(
    () => venues.slice(0, 12).map((v) => ({
      name: v.venue.split(",")[0].slice(0, 18),
      "Bat 1st": v.battingFirstWinPct,
      "Chase": v.chasingWinPct,
    })),
    [venues],
  );

  const seasonTrend = useMemo(
    () => seasons.map((s) => ({
      season: s.season,
      runs: s.runs,
      avg: s.matches ? Math.round((s.runs / s.matches) / 2) : 0,
    })),
    [seasons],
  );

  const impactList = useMemo(() => {
    if (season === "all") {
      return (topBatters?.runs ?? []).slice(0, 8).map((b) => ({
        name: b.player,
        impact: Math.round((b.runs / 100) + b.sr * 0.6 + b.sixes * 1.2),
        primary: `${b.runs} runs`,
        secondary: `SR ${b.sr}`,
      }));
    }
    return (seasonTops?.[season]?.topBatters ?? []).slice(0, 8).map((b) => ({
      name: b.player,
      impact: Math.round((b.runs / 10) + b.sr * 0.5 + b.sixes * 1.5),
      primary: `${b.runs} runs`,
      secondary: `SR ${b.sr}`,
    }));
  }, [season, topBatters, seasonTops]);

  return (
    <div className="space-y-4">
      <div className="grid lg:[grid-template-columns:minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
        <GlassCard className="p-5">
          <SectionTitle title="Run Distribution" subtitle="All innings totals · 1st & 2nd combined" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 95% 60%)" />
                    <stop offset="100%" stopColor="hsl(20 100% 55%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="url(#bd)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Matches Won by Team" subtitle="Across all 18 seasons" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={teamWinsDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="80%"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {teamWinsDonut.map((s, i) => <Cell key={i} fill={s.fill} stroke="transparent" />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${v} wins`, p?.payload?.full]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:[grid-template-columns:minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <GlassCard className="p-5">
          <SectionTitle title="Win % by Venue" subtitle="Bat first vs chase · top 12 venues" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={venueData} margin={{ top: 10, right: 8, left: -22, bottom: 50 }}>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0} />
                <YAxis unit="%" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Bar dataKey="Bat 1st" fill="hsl(270 95% 65%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Chase" fill="hsl(45 95% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Avg Score Trend" subtitle="Per match average by season" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonTrend} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="season" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="avg" stroke="hsl(320 100% 65%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(320 100% 65%)", stroke: "hsl(320 100% 65%)" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionTitle title={`Impact Score Leaderboard ${season === "all" ? "· all-time" : `· ${season}`}`} subtitle="Composite of runs + strike rate + boundary hits" />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">Impact</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">Runs</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">SR</th>
                <th className="px-3 py-2 text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {impactList.map((row, i) => (
                <tr key={row.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold">
                    <Link href={`/players/${playerSlug(row.name)}`} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-display font-bold text-accent">{row.impact}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">{row.primary}</td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell text-muted-foreground">{row.secondary}</td>
                  <td className="px-3 py-2.5 text-right">
                    <ImpactBar value={row.impact} max={impactList[0]?.impact ?? 1} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Top wicket-takers + venue analysis */}
      <div className="grid lg:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <GlassCard className="p-5">
          <SectionTitle title="Top Wicket-Takers" subtitle={season === "all" ? "All-time" : `Season ${season}`} />
          <div className="space-y-2">
            {((season === "all" ? topBowlers?.wickets : seasonTops?.[season]?.topBowlers) ?? []).slice(0, 8).map((b, i) => (
              <div key={b.player + i} className="flex items-center gap-3">
                <div className="w-6 text-center font-mono text-xs text-muted-foreground">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{b.player}</div>
                  <div className="text-[11px] text-muted-foreground">Eco {b.econ} · Avg {b.avg} · Best {b.best}</div>
                </div>
                <div className="font-display font-bold text-lg gradient-text">{b.wickets}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Venue Analysis" subtitle="Most-played venues" />
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                  <th className="px-2 py-2">Venue</th>
                  <th className="px-2 py-2 text-right">M</th>
                  <th className="px-2 py-2 text-right">Avg 1st</th>
                  <th className="px-2 py-2 text-right">Chase %</th>
                </tr>
              </thead>
              <tbody>
                {venues.slice(0, 8).map((v) => (
                  <tr key={v.venue} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-2 py-2 truncate max-w-[180px]" title={v.venue}>{v.venue.split(",")[0]}</td>
                    <td className="px-2 py-2 text-right font-mono">{v.matches}</td>
                    <td className="px-2 py-2 text-right font-mono">{v.avg1stInn}</td>
                    <td className="px-2 py-2 text-right font-mono text-accent">{v.chasingWinPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------------- Stats Tab ---------------- */
function StatsTab(props: {
  season: string;
  topBatters: ReturnType<typeof useTopBatters>["data"];
  topBowlers: ReturnType<typeof useTopBowlers>["data"];
  seasonTops: ReturnType<typeof useSeasonTops>["data"];
  teams: ReturnType<typeof useTeams>["data"] extends infer T ? (T extends undefined ? never : T) : never;
}) {
  const { season, topBatters, topBowlers, seasonTops, teams } = props;

  const batters = season === "all" ? topBatters?.runs ?? [] : seasonTops?.[season]?.topBatters ?? [];
  const bowlers = season === "all" ? topBowlers?.wickets ?? [] : seasonTops?.[season]?.topBowlers ?? [];

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <SectionTitle title={`Most Runs ${season === "all" ? "(all-time)" : `· ${season}`}`} subtitle="Top 25" />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2 text-right">Runs</th>
                <th className="px-2 py-2 text-right hidden sm:table-cell">Inns</th>
                <th className="px-2 py-2 text-right">Avg</th>
                <th className="px-2 py-2 text-right">SR</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">4s</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">6s</th>
                <th className="px-2 py-2 text-right hidden lg:table-cell">50/100</th>
                <th className="px-2 py-2 text-right hidden lg:table-cell">HS</th>
              </tr>
            </thead>
            <tbody>
              {batters.slice(0, 25).map((b, i) => (
                <tr key={b.player + i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-2 py-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2 font-semibold">{b.player}</td>
                  <td className="px-2 py-2 text-right font-display font-bold gradient-text">{b.runs}</td>
                  <td className="px-2 py-2 text-right hidden sm:table-cell">{b.innings}</td>
                  <td className="px-2 py-2 text-right">{b.avg}</td>
                  <td className="px-2 py-2 text-right">{b.sr}</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{b.fours}</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{b.sixes}</td>
                  <td className="px-2 py-2 text-right hidden lg:table-cell">{b.fifties}/{b.hundreds}</td>
                  <td className="px-2 py-2 text-right hidden lg:table-cell">{b.highest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle title={`Most Wickets ${season === "all" ? "(all-time)" : `· ${season}`}`} subtitle="Top 25" />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2 text-right">Wkts</th>
                <th className="px-2 py-2 text-right hidden sm:table-cell">Inns</th>
                <th className="px-2 py-2 text-right">Eco</th>
                <th className="px-2 py-2 text-right">Avg</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">SR</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">Best</th>
                <th className="px-2 py-2 text-right hidden lg:table-cell">4w/5w</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.slice(0, 25).map((b, i) => (
                <tr key={b.player + i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-2 py-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-2 py-2 font-semibold">{b.player}</td>
                  <td className="px-2 py-2 text-right font-display font-bold gradient-text">{b.wickets}</td>
                  <td className="px-2 py-2 text-right hidden sm:table-cell">{b.innings}</td>
                  <td className="px-2 py-2 text-right">{b.econ}</td>
                  <td className="px-2 py-2 text-right">{b.avg}</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{b.sr}</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{b.best}</td>
                  <td className="px-2 py-2 text-right hidden lg:table-cell">{b.fourW}/{b.fiveW}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle title="Team Standings" subtitle="All seasons combined" />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/5">
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2 text-right">Mat</th>
                <th className="px-2 py-2 text-right">W</th>
                <th className="px-2 py-2 text-right">L</th>
                <th className="px-2 py-2 text-right">Win %</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">Bat SR</th>
                <th className="px-2 py-2 text-right hidden md:table-cell">Bowl Eco</th>
                <th className="px-2 py-2 text-right">Titles</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.team} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: teamColor(t.team) }} />
                      <span className="font-semibold">{t.team}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">{t.matches}</td>
                  <td className="px-2 py-2 text-right text-emerald-400">{t.wins}</td>
                  <td className="px-2 py-2 text-right text-red-400">{t.losses}</td>
                  <td className="px-2 py-2 text-right font-mono">{t.winPct}%</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{t.battingSr}</td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{t.bowlingEcon}</td>
                  <td className="px-2 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      {t.titles > 0 && <Trophy className="w-3 h-3 text-accent" />}
                      <span className="font-bold">{t.titles}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- Reports Tab ---------------- */
function ReportsTab({ seasons }: { seasons: ReturnType<typeof useSeasons>["data"] extends infer T ? (T extends undefined ? never : T) : never }) {
  const reports = useMemo(() => {
    const items = [
      { title: "Season-on-Season Pace of Play", desc: "Run rates, dot %, boundary % across 18 seasons", tag: "Trend", date: "Updated weekly" },
      { title: "Death-Over Specialists", desc: "Top batters & bowlers in overs 16-20", tag: "Performance", date: "Updated weekly" },
      { title: "Toss vs Result Correlation", desc: "Whether the toss matters by venue + decade", tag: "Strategy", date: "Quarterly" },
      { title: "Powerplay Attack Profiles", desc: "Per-team SR and dismissal patterns in 0-6", tag: "Tactics", date: "Per season" },
      { title: "Venue Profile Atlas", desc: "Avg 1st innings, chasing edge, boundary frequency", tag: "Reference", date: "Per season" },
      { title: "Player Clutch Index", desc: "Performance under pressure across phases", tag: "Performance", date: "Updated weekly" },
    ];
    return items;
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((r, i) => (
          <GlassCard key={r.title} className="p-4 hover:bg-white/5 transition-colors" delay={i * 0.04}>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/40">{r.tag}</span>
              <span className="text-muted-foreground">{r.date}</span>
            </div>
            <div className="font-display font-bold text-base">{r.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
            <button className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-5">
        <SectionTitle title="Per-Season Report Library" subtitle={`${seasons.length} seasons available`} />
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
          {seasons.map((s) => (
            <button key={s.season} className="px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-accent" /> {s.season}
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- Blogs Tab ---------------- */
function BlogsTab() {
  const posts = [
    { title: "Why the powerplay rules are quietly inflating IPL totals", excerpt: "An analysis across 18 seasons of how the 0-6 phase has shifted from caution to carnage.", tag: "Analysis", read: "8 min" },
    { title: "The clutch hierarchy: who actually performs when it matters", excerpt: "Beyond raw runs, here's the data that separates the closers from the front-runners.", tag: "Players", read: "12 min" },
    { title: "Death overs: is the spinner finally beating the hitter?", excerpt: "Over the last three seasons, the wrist-spin economy at the death has dropped sharply.", tag: "Tactics", read: "6 min" },
    { title: "Toss truth: the venues where it still wins games", excerpt: "We separated the noise from the signal across every IPL ground.", tag: "Strategy", read: "10 min" },
    { title: "The new batting templates of 2024-26", excerpt: "Three distinct openers archetypes have emerged. Here's what the data says.", tag: "Trends", read: "9 min" },
    { title: "Venue effects on bowler economy", excerpt: "How much of an opening bowler's number is the pitch vs the player?", tag: "Reference", read: "7 min" },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {posts.map((p, i) => (
        <GlassCard key={p.title} className="p-5 hover:bg-white/5 transition-colors" delay={i * 0.04}>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-3">
            <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/40">{p.tag}</span>
            <span className="text-muted-foreground">{p.read}</span>
          </div>
          <div className="font-display font-bold text-base leading-snug">{p.title}</div>
          <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.excerpt}</div>
          <button className="mt-3 text-xs font-semibold text-accent inline-flex items-center gap-1 hover:underline">
            Read more <ArrowUpRight className="w-3 h-3" />
          </button>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-display font-bold">{title}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function ImpactBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="inline-block w-24 h-1.5 rounded-full bg-white/5 overflow-hidden align-middle">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(270 95% 65%), hsl(45 95% 60%))" }}
      />
    </div>
  );
}
