import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useLiveAllMatches, getMatchScoreLine, getMatchStateColor, startTime } from "@/lib/live";
import { Link, useRoute } from "wouter";
import { ArrowLeft, MapPin, Calendar, Trophy } from "lucide-react";

export default function MatchDetailPage() {
  const [, params] = useRoute<{ id: string }>("/match/:id");
  const matchId = params?.id ? parseInt(params.id, 10) : null;
  const q = useLiveAllMatches();
  const match = q.data?.matches.find((m) => m.matchInfo.matchId === matchId);

  return (
    <Layout>
      <Link href="/on-field" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Back to On-Field Intelligence
      </Link>

      {q.isLoading && !match ? (
        <GlassCard className="h-96 animate-pulse"><span /></GlassCard>
      ) : !match ? (
        <GlassCard className="p-12 text-center text-muted-foreground">
          Match not found or no longer in the live feed.
        </GlassCard>
      ) : (
        <MatchView match={match} />
      )}
    </Layout>
  );
}

function MatchView({ match }: { match: import("@/lib/live").LiveMatch }) {
  const info = match.matchInfo;
  const score = getMatchScoreLine(match);
  const state = getMatchStateColor(info.state);
  const isLive = state.label === "LIVE";
  const isUpcoming = state.label === "UPCOMING";
  const isComplete = state.label === "RESULT";
  const s1 = match.matchScore?.team1Score?.inngs1;
  const s2 = match.matchScore?.team2Score?.inngs1;

  return (
    <GlassCard className="overflow-hidden">
      <div className="relative p-6 bg-gradient-to-br from-primary/40 via-accent/20 to-transparent">
        <div className="absolute inset-0 scanline opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1 ${
              isLive ? "bg-destructive/30 text-destructive border border-destructive/40" :
              isUpcoming ? "bg-accent/20 text-accent border border-accent/40" :
              "bg-white/10 text-muted-foreground border border-white/10"
            }`}>
              {isLive && <span className="ticker-dot" />} {state.label}
            </span>
            <span className="text-xs text-muted-foreground">{info.seriesName} • {info.matchDesc}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
            <TeamHeader team={info.team1} batting={info.currBatTeamId === info.team1.teamId} score={score.team1} hide={isUpcoming} />
            <div className="text-center text-xs uppercase tracking-widest text-muted-foreground font-bold">vs</div>
            <TeamHeader team={info.team2} batting={info.currBatTeamId === info.team2.teamId} score={score.team2} hide={isUpcoming} alignRight />
          </div>
          <div className="mt-5 text-center text-sm font-semibold gradient-text">
            {isUpcoming ? `Starts ${startTime(info.startDate)}` : info.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 border-t border-white/5">
        <Meta icon={<Trophy className="w-4 h-4" />} label="Format" value={info.matchFormat} />
        <Meta icon={<Calendar className="w-4 h-4" />} label="Start" value={startTime(info.startDate)} />
        {info.venueInfo && (
          <Meta icon={<MapPin className="w-4 h-4" />} label="Venue" value={`${info.venueInfo.ground}, ${info.venueInfo.city}`} />
        )}
      </div>

      {!isUpcoming && (s1 || s2) && (
        <div className="p-6 border-t border-white/5">
          <h2 className="font-display text-lg font-bold mb-4">Innings Scorecard</h2>
          <div className="space-y-3">
            <InningsRow team={info.team1} innings={s1} />
            <InningsRow team={info.team2} innings={s2} />
          </div>
        </div>
      )}

      {isComplete && (
        <div className="p-6 border-t border-white/5 bg-white/3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Match Result</h3>
          <p className="text-base font-semibold">{info.status}</p>
        </div>
      )}

      <div className="px-6 py-4 border-t border-white/5 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Live data via Cricbuzz · refreshed every 30s.</span>
        <span>Match ID: {info.matchId}</span>
      </div>
    </GlassCard>
  );
}

function TeamHeader({ team, batting, score, hide, alignRight }: { team: { teamSName: string; teamName: string }; batting?: boolean; score: string; hide?: boolean; alignRight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${alignRight ? "sm:flex-row-reverse sm:text-right" : ""}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${batting ? "bg-gradient-to-br from-accent to-primary text-white shadow-[0_0_20px_-4px_hsl(var(--accent))]" : "bg-white/10 text-white border border-white/20"}`}>
        {team.teamSName}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-base truncate">{team.teamName}</div>
        {!hide && <div className="font-display text-2xl font-black tracking-tight tabular-nums">{score}</div>}
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
        {icon} {label}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function InningsRow({ team, innings }: { team: { teamSName: string; teamName: string }; innings?: import("@/lib/live").LiveScoreInnings }) {
  if (!innings || innings.runs == null) {
    return (
      <div className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl">
        <span className="font-semibold">{team.teamName}</span>
        <span className="text-sm text-muted-foreground italic">Yet to bat</span>
      </div>
    );
  }
  const rr = innings.overs ? (innings.runs / innings.overs).toFixed(2) : "—";
  return (
    <div className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl">
      <div>
        <div className="font-bold">{team.teamName}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">RR: {rr}</div>
      </div>
      <div className="text-right">
        <div className="font-display text-2xl font-black tabular-nums">{innings.runs}<span className="text-base text-muted-foreground">/{innings.wickets ?? 0}</span></div>
        <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">({innings.overs ?? 0} ov)</div>
      </div>
    </div>
  );
}
