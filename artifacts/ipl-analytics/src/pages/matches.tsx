import { Layout } from "@/components/layout";
import { useLiveAllMatches, useLiveIplMatches } from "@/lib/live";
import { LiveMatchCard } from "./home";
import { useState } from "react";
import { Flame, Calendar, CheckCircle2, RefreshCw } from "lucide-react";

type Tab = "live" | "upcoming" | "completed" | "all";

export default function MatchesPage() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [scope, setScope] = useState<"ipl" | "all">("ipl");

  const iplQ = useLiveIplMatches();
  const allQ = useLiveAllMatches();
  const q = scope === "ipl" ? iplQ : allQ;
  const matches = q.data?.matches ?? [];

  const groups = {
    live: matches.filter((m) => /progress|innings break/i.test(m.matchInfo.state)),
    upcoming: matches.filter((m) => /preview|upcoming/i.test(m.matchInfo.state)),
    completed: matches.filter((m) => /complete|stumps/i.test(m.matchInfo.state)),
    all: matches,
  };
  // Auto-select first non-empty tab on first load
  const effectiveTab: Tab =
    tab ??
    (groups.live.length > 0
      ? "live"
      : groups.upcoming.length > 0
      ? "upcoming"
      : groups.completed.length > 0
      ? "completed"
      : "all");
  const visible = groups[effectiveTab];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "live", label: "Live", icon: <Flame className="w-3.5 h-3.5" />, count: groups.live.length },
    { id: "upcoming", label: "Upcoming", icon: <Calendar className="w-3.5 h-3.5" />, count: groups.upcoming.length },
    { id: "completed", label: "Recent Results", icon: <CheckCircle2 className="w-3.5 h-3.5" />, count: groups.completed.length },
    { id: "all", label: "All Matches", icon: null, count: groups.all.length },
  ];

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live scores and schedules from Cricbuzz, refreshed every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
          {q.dataUpdatedAt > 0 && <span>Updated {new Date(q.dataUpdatedAt).toLocaleTimeString()}</span>}
          <button onClick={() => q.refetch()} className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary/90">
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setScope("ipl")}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
            scope === "ipl" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          IPL Only
        </button>
        <button
          onClick={() => setScope("all")}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider ${
            scope === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Cricket
        </button>
      </div>

      <div className="border-b border-border mb-6 flex gap-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              effectiveTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${effectiveTab === t.id ? "bg-primary/15" : "bg-muted"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border border-border rounded-md h-44 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center">
          <p className="text-muted-foreground">No matches in this category right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((m) => <LiveMatchCard key={m.matchInfo.matchId} match={m} />)}
        </div>
      )}
    </Layout>
  );
}
