import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useGetIplOverview, useGetBatsmen, useGetBowlers, useGetChampionshipHistory } from "@workspace/api-client-react";
import { ChevronRight, TrendingUp, Award, Flame, BarChart3, Newspaper, RefreshCw, MapPin } from "lucide-react";
import { useLiveIplMatches, useLiveNews, getMatchScoreLine, getMatchStateColor, timeAgo, startTime } from "@/lib/live";

export default function Home() {
  const { data: overview } = useGetIplOverview();
  const { data: batsmen = [] } = useGetBatsmen();
  const { data: bowlers = [] } = useGetBowlers();
  const { data: history = [] } = useGetChampionshipHistory();
  const { data: liveData, isLoading: loadingLive, dataUpdatedAt } = useLiveIplMatches();
  const { data: newsData, isLoading: loadingNews } = useLiveNews("general");

  const matches = liveData?.matches?.slice(0, 6) ?? [];
  const liveOnly = matches.filter((m) => /progress|innings break/i.test(m.matchInfo.state));
  const upcoming = matches.filter((m) => /preview|upcoming/i.test(m.matchInfo.state));
  const completed = matches.filter((m) => /complete|stumps/i.test(m.matchInfo.state));
  const ordered = [...liveOnly, ...upcoming, ...completed].slice(0, 6);

  const news = newsData?.items?.slice(0, 8) ?? [];
  const heroNews = news[0];
  const sideNews = news.slice(1, 6);
  const gridNews = news.slice(6, 8);

  const topBatsmen = batsmen.slice(0, 5);
  const topBowlers = bowlers.slice(0, 5);
  const recentChampions = history.slice(-5).reverse();

  return (
    <Layout>
      {/* Live matches strip */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Live & Upcoming</h2>
            {dataUpdatedAt > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Updated {timeAgo(new Date(dataUpdatedAt).toISOString())} • via Cricbuzz
              </span>
            )}
          </div>
          <Link href="/matches" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            See All Matches <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {loadingLive ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-md p-4 h-44 animate-pulse" />
            ))}
          </div>
        ) : ordered.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-6 text-center text-muted-foreground text-sm">
            No live matches right now. Check the <Link href="/matches" className="text-primary font-semibold">schedule</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ordered.map((m) => <LiveMatchCard key={m.matchInfo.matchId} match={m} />)}
          </div>
        )}
      </section>

      {/* Hero news + sidebar */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {loadingNews ? (
            <div className="bg-card border border-border rounded-md min-h-[420px] animate-pulse" />
          ) : heroNews ? (
            <a href={heroNews.link} target="_blank" rel="noopener noreferrer" className="block group relative rounded-md overflow-hidden bg-card border border-border min-h-[420px]">
              {heroNews.image && (
                <img src={heroNews.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
                <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded w-fit mb-3">
                  Top Story
                </span>
                <h1 className="text-2xl md:text-4xl font-extrabold leading-tight mb-3 group-hover:underline">
                  {heroNews.title}
                </h1>
                <p className="text-sm md:text-base text-gray-200 mb-3 max-w-2xl line-clamp-2">{heroNews.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span>ESPN Cricinfo</span>
                  <span>•</span>
                  <span>{timeAgo(heroNews.pubDate)}</span>
                </div>
              </div>
            </a>
          ) : null}
        </div>

        <aside className="bg-card border border-border rounded-md flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" />
              <h3 className="font-bold uppercase text-sm tracking-wider">Latest News</h3>
            </div>
            <Link href="/news" className="text-[11px] text-primary font-semibold hover:underline">View all</Link>
          </div>
          <ol className="divide-y divide-border flex-1">
            {(loadingNews ? Array(5).fill(null) : sideNews).map((n, i) =>
              n ? (
                <li key={i}>
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="px-4 py-3 flex gap-3 hover:bg-muted/40 transition-colors group">
                    <span className="text-2xl font-black text-primary leading-none w-6 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-3">{n.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.pubDate)}</p>
                    </div>
                  </a>
                </li>
              ) : (
                <li key={i} className="px-4 py-3 h-16 animate-pulse" />
              )
            )}
          </ol>
        </aside>
      </section>

      {/* Stats overview */}
      <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Matches", value: overview?.totalMatches?.toLocaleString() ?? "1,169", change: "All seasons" },
          { label: "Total Runs", value: overview?.totalRuns?.toLocaleString() ?? "362,847", change: "2008–2025" },
          { label: "Total Wickets", value: overview?.totalWickets?.toLocaleString() ?? "12,094", change: "All-time" },
          { label: "Avg 1st Inns", value: overview?.avgFirstInningsScore?.toFixed(0) ?? "168", change: "Per innings" },
        ].map((s, i) => (
          <div key={i} className="bg-card border-l-4 border-primary border-y border-r border-border rounded-md p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{s.label}</p>
            <p className="text-2xl md:text-3xl font-black mt-1 tracking-tight">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.change}</p>
          </div>
        ))}
      </section>

      {/* News grid + sidebar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Featured Stories</h2>
            <Link href="/news" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(loadingNews ? Array(2).fill(null) : gridNews).map((n, i) =>
              n ? (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block bg-card border border-border rounded-md overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="h-44 relative bg-muted">
                    {n.image && <img src={n.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    <span className="absolute top-3 left-3 bg-white text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      News
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors mb-2 line-clamp-2">{n.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{n.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>ESPN Cricinfo</span>
                      <span>•</span>
                      <span>{timeAgo(n.pubDate)}</span>
                    </div>
                  </div>
                </a>
              ) : (
                <div key={i} className="bg-card border border-border rounded-md h-72 animate-pulse" />
              )
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <StatTable title="Top Run-Getters" icon={<TrendingUp className="w-4 h-4 text-primary" />} link="/stats">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-3 font-semibold">Player</th>
                <th className="text-right py-2 px-3 font-semibold">M</th>
                <th className="text-right py-2 px-3 font-semibold">Runs</th>
                <th className="text-right py-2 px-3 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {topBatsmen.map((b: any, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="py-2 px-3 font-semibold">
                    <div>{b.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{b.team}</div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{b.matches}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-primary">{b.runs?.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{b.average?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </StatTable>

          <StatTable title="Top Wicket-Takers" icon={<Flame className="w-4 h-4 text-primary" />} link="/stats">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-3 font-semibold">Player</th>
                <th className="text-right py-2 px-3 font-semibold">M</th>
                <th className="text-right py-2 px-3 font-semibold">Wkts</th>
                <th className="text-right py-2 px-3 font-semibold">Econ</th>
              </tr>
            </thead>
            <tbody>
              {topBowlers.map((b: any, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="py-2 px-3 font-semibold">
                    <div>{b.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{b.team}</div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{b.matches}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-primary">{b.wickets}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{b.economy?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </StatTable>

          <div className="bg-card border border-border rounded-md">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="font-bold uppercase text-sm tracking-wider">Recent Champions</h3>
              </div>
              <Link href="/business" className="text-[11px] text-primary font-semibold hover:underline">All</Link>
            </div>
            <ul className="divide-y divide-border">
              {recentChampions.map((c: any, i) => (
                <li key={i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <div className="font-bold text-sm">{c.champion}</div>
                    <div className="text-[11px] text-muted-foreground">beat {c.runnerUp}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{c.season}</div>
                    <div className="text-[10px] text-muted-foreground">{c.venue?.split(",")[0]}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Section CTAs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group">
          <BarChart3 className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Analytics Dashboard</h3>
          <p className="text-xs text-muted-foreground">Season trends, toss impact, phase-wise scoring, venue analytics, and more.</p>
        </Link>
        <Link href="/business" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group">
          <TrendingUp className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Business & Revenue</h3>
          <p className="text-xs text-muted-foreground">Franchise valuations, sponsorship deals, and the IPL commercial ecosystem.</p>
        </Link>
        <Link href="/records" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group">
          <Award className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Records Book</h3>
          <p className="text-xs text-muted-foreground">All-time bests, boundary kings, fastest hundreds, and historic milestones.</p>
        </Link>
      </section>
    </Layout>
  );
}

function StatTable({ title, icon, link, children }: { title: string; icon: React.ReactNode; link: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold uppercase text-sm tracking-wider">{title}</h3>
        </div>
        <Link href={link} className="text-[11px] text-primary font-semibold hover:underline">More</Link>
      </div>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function LiveMatchCard({ match }: { match: import("@/lib/live").LiveMatch }) {
  const info = match.matchInfo;
  const score = getMatchScoreLine(match);
  const state = getMatchStateColor(info.state);
  const isLive = state.label === "LIVE";
  const isUpcoming = state.label === "UPCOMING";

  return (
    <Link href={`/match/${info.matchId}`} className="block bg-card border border-border rounded-md p-4 hover:shadow-md hover:border-primary/40 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className={`${state.bg} text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1`}>
          {isLive && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
          {state.label}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium truncate ml-2">
          {info.seriesName.replace("Indian Premier League", "IPL")} • {info.matchDesc}
        </span>
      </div>
      <div className="space-y-2">
        <TeamRow short={info.team1.teamSName} name={info.team1.teamName} score={score.team1} highlight={info.currBatTeamId === info.team1.teamId} hide={isUpcoming} />
        <TeamRow short={info.team2.teamSName} name={info.team2.teamName} score={score.team2} highlight={info.currBatTeamId === info.team2.teamId} hide={isUpcoming} />
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <p className={`text-xs font-semibold ${isLive ? "text-red-600" : isUpcoming ? "text-blue-600" : "text-foreground"}`}>
          {isUpcoming ? `Starts ${startTime(info.startDate)}` : info.status}
        </p>
        {info.venueInfo && (
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {info.venueInfo.ground}, {info.venueInfo.city}
          </p>
        )}
      </div>
    </Link>
  );
}

function TeamRow({ short, name, score, highlight, hide }: { short: string; name: string; score: string; highlight?: boolean; hide?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "font-bold" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${highlight ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{short}</div>
        <span className="text-sm truncate">{name}</span>
      </div>
      {!hide && (
        <div className="text-right ml-2 shrink-0">
          <div className="font-bold text-sm tabular-nums">{score}</div>
        </div>
      )}
    </div>
  );
}
