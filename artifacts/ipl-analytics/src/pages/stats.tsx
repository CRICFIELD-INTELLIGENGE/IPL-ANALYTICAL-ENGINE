import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { useGetIplOverview, useGetBatsmen, useGetBowlers, useGetImpactBatsmen } from "@workspace/api-client-react";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { BatsmanStat, BowlerStat, ImpactPlayer } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsPage() {
  const { data: overview, isLoading: loadingOverview } = useGetIplOverview();
  const { data: batsmen = [], isLoading: loadingBatsmen } = useGetBatsmen({ limit: 10 });
  const { data: bowlers = [], isLoading: loadingBowlers } = useGetBowlers({ limit: 10 });
  const { data: impactPlayers = [], isLoading: loadingImpact } = useGetImpactBatsmen();

  const loading = loadingOverview || loadingBatsmen || loadingBowlers || loadingImpact;

  const batsmenColumns: ColumnDef<BatsmanStat>[] = [
    { accessorKey: "name", header: "Player" },
    { accessorKey: "team", header: "Team" },
    { accessorKey: "runs", header: "Runs" },
    { accessorKey: "strikeRate", header: "SR" },
    { accessorKey: "average", header: "Avg" },
    { accessorKey: "sixes", header: "6s" },
    { accessorKey: "fours", header: "4s" },
  ];

  const bowlersColumns: ColumnDef<BowlerStat>[] = [
    { accessorKey: "name", header: "Player" },
    { accessorKey: "team", header: "Team" },
    { accessorKey: "wickets", header: "Wkts" },
    { accessorKey: "economy", header: "Econ" },
    { accessorKey: "average", header: "Avg" },
    { accessorKey: "strikeRate", header: "SR" },
    { accessorKey: "bestFigures", header: "BBI" },
  ];

  const impactColumns: ColumnDef<ImpactPlayer>[] = [
    { accessorKey: "name", header: "Player" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "impactScore", header: "Impact Score", cell: ({ row }) => <span className="text-primary font-bold">{row.original.impactScore.toFixed(1)}</span> },
    { accessorKey: "clutchIndex", header: "Clutch Index" },
    { accessorKey: "winContribution", header: "Win Contribution" },
  ];

  return (
    <Layout>
      <PageHeader 
        title="On-Field Statistics" 
        subtitle="Deep dive into player performance metrics and impact ratings across 18 seasons."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard title="Total Batsmen" value={overview?.totalBatsmen} loading={loadingOverview} />
        <KPICard title="Total Bowlers" value={overview?.totalBowlers} loading={loadingOverview} />
        <KPICard title="Total Runs" value={overview?.totalRuns?.toLocaleString()} loading={loadingOverview} />
        <KPICard title="Total Wickets" value={overview?.totalWickets?.toLocaleString()} loading={loadingOverview} />
      </div>

      <div className="space-y-8">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>Impact Player Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingImpact ? <Skeleton className="h-64 w-full" /> : <DataTable data={impactPlayers} columns={impactColumns} pageSize={5} />}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Top Batsmen</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBatsmen ? <Skeleton className="h-96 w-full" /> : <DataTable data={batsmen} columns={batsmenColumns} pageSize={10} />}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle>Top Bowlers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBowlers ? <Skeleton className="h-96 w-full" /> : <DataTable data={bowlers} columns={bowlersColumns} pageSize={10} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
