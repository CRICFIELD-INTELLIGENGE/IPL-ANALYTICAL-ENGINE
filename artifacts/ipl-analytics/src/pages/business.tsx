import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { useGetFranchiseValuation, useGetRevenueBreakdown, useGetChampionshipHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { ChampionshipEntry } from "@workspace/api-client-react";
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
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
  CHART_COLORS.blue, CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.purple,
  "#0ea5e9", "#f43f5e"
];

export default function BusinessPage() {
  const { data: valuations, isLoading: loadingValuations } = useGetFranchiseValuation();
  const { data: revenue, isLoading: loadingRevenue } = useGetRevenueBreakdown();
  const { data: history = [], isLoading: loadingHistory } = useGetChampionshipHistory();

  const loading = loadingValuations || loadingRevenue || loadingHistory;

  const historyColumns: ColumnDef<ChampionshipEntry>[] = [
    { accessorKey: "season", header: "Season" },
    { accessorKey: "champion", header: "Champion", cell: ({row}) => <span className="font-bold text-primary">{row.original.champion}</span> },
    { accessorKey: "runnerUp", header: "Runner Up" },
    { accessorKey: "finalScore", header: "Final Score" },
    { accessorKey: "mvp", header: "MVP" },
    { accessorKey: "venue", header: "Venue" },
  ];

  const revenuePieData = revenue ? [
    { name: "Media Rights", value: revenue.mediaRightsPct },
    { name: "Sponsorship", value: revenue.sponsorshipPct },
    { name: "Ticketing", value: revenue.ticketingPct },
    { name: "Merchandise", value: revenue.merchandisePct },
    { name: "Digital", value: revenue.digitalPct },
  ] : [];

  return (
    <Layout>
      <PageHeader 
        title="Business & Revenue" 
        subtitle="Financial growth, franchise valuations, and the commercial ecosystem of the IPL."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total 2024 Revenue" value={`₹${revenue?.totalRevenue2024Crore || 0} Cr`} loading={loadingRevenue} />
        <KPICard title="Media Rights Share" value={`${revenue?.mediaRightsPct || 0}%`} loading={loadingRevenue} />
        <KPICard title="Top Team Value" value={valuations ? `₹${Math.max(...valuations.map(v => v.valuations[v.valuations.length-1]?.valuationCrore || 0))} Cr` : "--"} loading={loadingValuations} />
        <KPICard title="Total Champions" value={new Set(history.map(h => h.champion)).size} loading={loadingHistory} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">League Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenue?.revenueByYear}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <YAxis tickFormatter={(v) => `₹${v}Cr`} tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                  <Tooltip formatter={(v: number) => `₹${v} Cr`} contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Area type="monotone" dataKey="totalCrore" name="Total Revenue" stroke={CHART_COLORS.green} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Mix (2024)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRevenue ? <Skeleton className="h-[300px] w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={revenuePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} stroke="none" paddingAngle={2}>
                    {revenuePieData.map((_, i) => <Cell key={i} fill={CHART_COLOR_LIST[i % CHART_COLOR_LIST.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Championship History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? <Skeleton className="h-64 w-full" /> : <DataTable data={history} columns={historyColumns} pageSize={10} />}
        </CardContent>
      </Card>
    </Layout>
  );
}
