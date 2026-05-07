import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useLiveIplMatches, useLiveAllMatches, getMatchScoreLine, getMatchStateColor, startTime } from "@/lib/live";
import { Activity, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const TABS = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "recent", label: "Recent" },
  { id: "all", label: "All" },
] as const;
type Tab = typeof TABS[number]["id"];

export default function OnFieldPage() {
  const [scope, setScope] = useState<"ipl" | "all">("ipl");
  const ipl = useLiveIplMatches();
  const all = useLiveAllMatches();
  const q = scope === "ipl" ? ipl : all;
  const [tab, setTab] = useState<Tab>("live");

  const matches = q.data?.matches ?? [];
  const buckets: Record<Tab, typeof matches> = {
    live: matches.filter((m) => /progress|innings/i.test(m.matchInfo.state)),
    upcoming: matches.filter((m) => /preview|upcoming/i.test(m.matchInfo.state)),
    recent: matches.filter((m) => /complete|stumps/i.test(m.matchInfo.state)),
    all: matches,
  };
  const visible = buckets[tab];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/40 to-accent/30 border border-white/10 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl">On-Field Intelligence</h1>
            <p className="text-xs text-muted-foreground">Live match center · scores · context</p>
          </div>
        </div>
        <button onClick={() => q.refetch()} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
          <RefreshCw className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl glass-strong">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.id ? "bg-gradient-to-r from-primary/40 to-accent/20 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {t.label} <span className="text-[10px] opacity-70">{buckets[t.id].length}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl glass-strong">
          {(["ipl", "all"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${scope === s ? "bg-white/10 text-white" : "text-muted-foreground"}`}>
              {s === "ipl" ? "IPL only" : "All Cricket"}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <GlassCard className="p-8 text-center text-muted-foreground">No matches in this bucket right now.</GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((m, i) => {
            const s = getMatchScoreLine(m);
            const state = getMatchStateColor(m.matchInfo.state);
            return (
              <Link key={m.matchInfo.matchId} href={`/match/${m.matchInfo.matchId}`}>
                <GlassCard className="p-4 hover:bg-white/5 transition-colors h-full" delay={i * 0.03}>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-3">
                    <span className={`px-2 py-0.5 rounded-md font-mono ${state.label === "LIVE" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-white/5 text-muted-foreground border border-white/10"}`}>{state.label}</span>
                    <span className="text-muted-foreground">{m.matchInfo.seriesName} · {m.matchInfo.matchDesc}</span>
                  </div>
                  <Row team={m.matchInfo.team1.teamSName} name={m.matchInfo.team1.teamName} score={s.team1} />
                  <Row team={m.matchInfo.team2.teamSName} name={m.matchInfo.team2.teamName} score={s.team2} />
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs">
                    <div className={state.label === "UPCOMING" ? "text-accent font-semibold" : "text-muted-foreground"}>
                      {state.label === "UPCOMING" ? `Starts ${startTime(m.matchInfo.startDate)}` : m.matchInfo.status || "—"}
                    </div>
                    {m.matchInfo.venueInfo && (
                      <div className="text-[11px] text-muted-foreground mt-1">📍 {m.matchInfo.venueInfo.ground}, {m.matchInfo.venueInfo.city}</div>
                    )}
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

function Row({ team, name, score }: { team: string; name: string; score: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold">{team}</div>
        <span className="text-sm font-medium truncate">{name}</span>
      </div>
      <span className="font-display font-bold text-sm">{score}</span>
    </div>
  );
}
