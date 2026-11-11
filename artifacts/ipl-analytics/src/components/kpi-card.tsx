import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardProps {
  title: string;
  value?: string | number;
  loading?: boolean;
}

export function KPICard({ title, value, loading }: KPICardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-6 flex flex-col justify-center">
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-3xl font-bold text-primary tracking-tight">
            {value !== undefined ? value : "--"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
