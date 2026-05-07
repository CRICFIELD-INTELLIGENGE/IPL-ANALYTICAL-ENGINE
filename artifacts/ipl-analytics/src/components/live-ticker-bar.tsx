import { useMemo } from "react";
import { useLiveIplMatches } from "@/lib/live";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

function pad(n: number) { return n.toString().padStart(2, "0"); }

function useCountdown(targetMs?: number) {
  const t = targetMs ?? 0;
  const remain = Math.max(0, t - Date.now());
  const h = Math.floor(remain / 3_600_000);
  const m = Math.floor((remain % 3_600_000) / 60_000);
  const s = Math.floor((remain % 60_000) / 1000);
  return { h, m, s, remain };
}

export function LiveTickerBar() {
  const { data } = useLiveIplMatches();

  const live = useMemo(
    () => data?.matches.find((m) => /progress|innings/i.test(m.matchInfo.state)),
    [data],
  );
  const upcoming = useMemo(
    () => data?.matches.find((m) => /preview|upcoming/i.test(m.matchInfo.state)),
    [data],
  );

  const cd = useCountdown(upcoming?.matchInfo.startDate);

  return (
    <div className="flex items-center gap-3 min-w-0">
      {live ? (
        <Link href={`/match/${live.matchInfo.matchId}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/15 border border-destructive/40 hover:bg-destructive/25 transition-colors">
          <span className="ticker-dot" />
          <span className="text-xs font-mono uppercase tracking-wider text-destructive">Live</span>
          <span className="text-sm font-semibold truncate max-w-[140px]">
            {live.matchInfo.team1.teamSName} vs {live.matchInfo.team2.teamSName}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">No Live</span>
        </div>
      )}

      {upcoming && cd.remain > 0 && (
        <Link href={`/match/${upcoming.matchInfo.matchId}`} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 min-w-0 transition-colors">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Next</span>
          <span className="text-sm font-semibold truncate max-w-[120px]">
            {upcoming.matchInfo.team1.teamSName} vs {upcoming.matchInfo.team2.teamSName}
          </span>
          <span className="text-xs font-mono text-accent">{pad(cd.h)}h : {pad(cd.m)}m : {pad(cd.s)}s</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>
      )}
    </div>
  );
}
