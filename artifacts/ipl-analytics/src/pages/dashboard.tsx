import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { 
  useGetIplOverview, 
  useGetPhaseAnalysis, 
  useGetRunDistribution,
  useGetDismissalTypes,
  useGetTossAnalysis,
  useGetSeasons
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

const CHART_COLORS = {
  blue: "hsl(var(--chart-1))",
  gold: "hsl(var(--chart-2))",
  green: "hsl(var(--chart-3))",
  red: "hsl(var(--chart-4))",
  purple: "hsl(var(--chart-5))",
};

const CHART_COLOR_LIST = [
  CHART_COLORS.blue, CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.purple
];

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useGetIplOverview();
  const { data: phases, isLoading: loadingPhases } = useGetPhaseAnalysis();
  const { data: runDist, isLoading: loadingRuns } = useGetRunDistribution();
  const { data: dismissals, isLoading: loadingDismissals } = useGetDismissalTypes();
  const { data: toss, isLoading: loadingToss } = useGetTossAnalysis();
  const { data: seasons = [], isLoading: loadingSeasons } = useGetSeasons();

  const phaseData = phases ? [
    { name: phases.powerplay.label, runRate: phases.powerplay.avgRunRate, wickets: phases.powerplay.avgWicketsPerMatch },
    { name: phases.middleOvers.label, runRate: phases.middleOvers.avgRunRate, wickets: phases.middleOvers.avgWicketsPerMatch },
    { name: phases.deathOvers.label, runRate: phases.deathOvers.avgRunRate, wickets: phases.deathOvers.avgWicketsPerMatch }
  ] : [];

  const tossData = toss ? [
    { name: "Bat First", value: toss.tossBatDecisionPct },
    { name: "Field First", value: toss.tossFieldDecisionPct }
  ] : [];

  return (
    <Layout>
      <PageHeader 
        title="Analytics Dashboard" 
        subtitle="Comprehensive visual analysis of IPL match data, phase metrics, and strategic decisions."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Batting 1st Win %" value={`${overview?.battingFirstWinPct.toFixed(1)}%`} loading={loadingOverview} />
        <KPICard title="Chasing Win %" value={`${overview?.chasingWinPct.toFixed(1)}%`} loading={loadingOverview} />
        <KPICard title="Avg 1st Innings" value={overview?.avgFirstInningsScore.toFixed(0)} loading={loadingOverview} />
        <KPICard title="Avg 2nd Innings" value={overview?.avgSecondInningsScore.toFixed(0)} loading={loadingOverview} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Season Trends (Avg Score)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSeasons ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={seasons}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="season" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <YAxis domain={['auto', 'auto']} tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke={CHART_COLORS.blue} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Phase Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPhases ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={phaseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <YAxis yAxisId="left" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <YAxis yAxisId="right" orientation="right" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="runRate" name="Run Rate" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="wickets" name="Wickets / Match" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Toss Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingToss ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={tossData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none" paddingAngle={2}>
                    {tossData.map((_, i) => <Cell key={i} fill={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Dismissal Types</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDismissals ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dismissals} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <YAxis type="category" dataKey="type" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" width={80} />
                  <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Bar dataKey="pct" name="Percentage %" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
