import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { KPICard } from "@/components/kpi-card";
import { useGetRecords, useGetBoundaryKings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { RecordEntry } from "@workspace/api-client-react";

const CHART_COLORS = {
  blue: "hsl(var(--chart-1))",
  gold: "hsl(var(--chart-2))",
};

export default function RecordsPage() {
  const { data: records, isLoading: loadingRecords } = useGetRecords();
  const { data: boundaryKings = [], isLoading: loadingBoundaries } = useGetBoundaryKings();

  const loading = loadingRecords || loadingBoundaries;

  const renderRecordCard = (title: string, record?: RecordEntry) => (
    <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <span className="text-8xl font-black">{record?.value}</span>
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        {loadingRecords ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div>
            <div className="text-3xl font-black text-primary mb-1">{record?.value}</div>
            <div className="text-sm font-semibold">{record?.holder}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {record?.match} &bull; {record?.season}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <PageHeader 
        title="Records & Milestones" 
        subtitle="All-time highs, historic achievements, and individual brilliance."
      />

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Team Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderRecordCard("Highest Team Score", records?.highestTeamScore)}
          {renderRecordCard("Lowest Team Score", records?.lowestTeamScore)}
          {renderRecordCard("Most Sixes (Season)", records?.mostSixesSeason)}
          {renderRecordCard("Most Fours (Season)", records?.mostFoursSeason)}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Individual Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderRecordCard("Highest Individual Score", records?.highestIndividualScore)}
          {renderRecordCard("Best Bowling Figures", records?.bestBowlingFigures)}
          {renderRecordCard("Fastest Fifty", records?.fastestFifty)}
          {renderRecordCard("Fastest Hundred", records?.fastestHundred)}
          {renderRecordCard("Most Career Runs", records?.mostRunsCareer)}
          {renderRecordCard("Most Career Wickets", records?.mostWicketsCareer)}
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Boundary Kings (All-Time)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBoundaries ? <Skeleton className="h-[400px] w-full" /> : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={boundaryKings.slice(0, 10)} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" />
                <YAxis type="category" dataKey="name" tick={{fill: "hsl(var(--muted-foreground))"}} stroke="hsl(var(--border))" width={100} />
                <Tooltip contentStyle={{backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))"}} cursor={{fill: 'hsl(var(--muted)/0.3)'}} />
                <Bar dataKey="sixes" name="Sixes" stackId="a" fill={CHART_COLORS.blue} radius={[0, 0, 0, 0]} />
                <Bar dataKey="fours" name="Fours" stackId="a" fill={CHART_COLORS.gold} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
