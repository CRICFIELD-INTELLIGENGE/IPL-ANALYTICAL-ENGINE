import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { useGetIplOverview, useGetBatsmen, useGetBowlers, useGetChampionshipHistory } from "@workspace/api-client-react";
import { ChevronRight, TrendingUp, Award, Clock, Flame, BarChart3 } from "lucide-react";

const liveMatches = [
  {
    status: "LIVE",
    statusColor: "bg-red-600",
    series: "IPL 2025 • Match 47",
    teamA: { name: "Mumbai Indians", short: "MI", score: "187/4", overs: "20.0" },
    teamB: { name: "Chennai Super Kings", short: "CSK", score: "142/6", overs: "16.2" },
    note: "CSK need 46 runs in 22 balls",
    venue: "Wankhede Stadium, Mumbai",
  },
  {
    status: "LIVE",
    statusColor: "bg-red-600",
    series: "IPL 2025 • Match 48",
    teamA: { name: "Royal Challengers", short: "RCB", score: "210/5", overs: "20.0" },
    teamB: { name: "Kolkata Knight Riders", short: "KKR", score: "154/3", overs: "14.4" },
    note: "KKR need 57 runs in 32 balls",
    venue: "M. Chinnaswamy Stadium",
  },
  {
    status: "UPCOMING",
    statusColor: "bg-blue-600",
    series: "IPL 2025 • Match 49",
    teamA: { name: "Gujarat Titans", short: "GT", score: "", overs: "" },
    teamB: { name: "Rajasthan Royals", short: "RR", score: "", overs: "" },
    note: "Today, 7:30 PM IST",
    venue: "Narendra Modi Stadium",
  },
];

const newsArticles = [
  {
    category: "ANALYSIS",
    title: "Why CSK keeps building championship-winning sides season after season",
    excerpt: "A deep dive into the auction strategy, retention philosophy, and culture that makes the yellow brigade the most consistent franchise in IPL history.",
    image: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
    time: "2h ago",
    readTime: "6 min read",
  },
  {
    category: "BUSINESS",
    title: "IPL media rights cross ₹48,000 Cr — what it means for the league's future",
    excerpt: "The latest broadcast deal redefines the economics of cricket. Here's how franchises, players, and fans benefit.",
    image: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
    time: "4h ago",
    readTime: "5 min read",
  },
  {
    category: "STATS",
    title: "Virat Kohli closes in on 8,500 IPL runs — a milestone no one has touched",
    excerpt: "With 8,014 runs across 18 seasons, the King of Chase continues to rewrite the record books.",
    image: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
    time: "6h ago",
    readTime: "4 min read",
  },
  {
    category: "OPINION",
    title: "Death-over specialists: The most underrated role in modern T20 cricket",
    excerpt: "Bumrah, Russell, and Rashid explain why the final four overs decide more matches than the powerplay.",
    image: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
    time: "8h ago",
    readTime: "7 min read",
  },
  {
    category: "TEAMS",
    title: "Mumbai Indians valuation hits ₹1,800 Cr, leads franchise rankings again",
    excerpt: "Reliance-backed franchise continues to be the gold standard for sports business in India.",
    image: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
    time: "10h ago",
    readTime: "5 min read",
  },
  {
    category: "VENUES",
    title: "Why Chepauk remains the toughest spin venue in T20 cricket",
    excerpt: "Spinners average 19.8 runs per wicket at MA Chidambaram — and there's a 65-year-old reason why.",
    image: "linear-gradient(135deg, #16a34a 0%, #14532d 100%)",
    time: "12h ago",
    readTime: "5 min read",
  },
];

const editorialPicks = [
  { title: "The complete history of IPL finals: 2008 to 2025", time: "1d ago" },
  { title: "Auction economics: How teams stretch ₹100 Cr purses", time: "1d ago" },
  { title: "Powerplay attack: Why batting first now equals losing", time: "2d ago" },
  { title: "Boundary kings: Players who hit a six every nine balls", time: "2d ago" },
  { title: "Rookie watch: 5 uncapped players to track this season", time: "3d ago" },
];

export default function Home() {
  const { data: overview } = useGetIplOverview();
  const { data: batsmen = [] } = useGetBatsmen();
  const { data: bowlers = [] } = useGetBowlers();
  const { data: history = [] } = useGetChampionshipHistory();

  const topBatsmen = batsmen.slice(0, 5);
  const topBowlers = bowlers.slice(0, 5);
  const recentChampions = history.slice(-5).reverse();

  return (
    <Layout>
      {/* Live matches strip */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Live & Upcoming</h2>
          </div>
          <a href="#" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            See All Matches <ChevronRight className="w-3 h-3" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {liveMatches.map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className={`${m.statusColor} text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded`}>
                  {m.status === "LIVE" && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />}
                  {m.status}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{m.series}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{m.teamA.short}</div>
                    <span className="font-semibold text-sm">{m.teamA.name}</span>
                  </div>
                  {m.teamA.score && (
                    <div className="text-right">
                      <div className="font-bold text-sm">{m.teamA.score}</div>
                      <div className="text-[10px] text-muted-foreground">({m.teamA.overs})</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{m.teamB.short}</div>
                    <span className="font-semibold text-sm">{m.teamB.name}</span>
                  </div>
                  {m.teamB.score && (
                    <div className="text-right">
                      <div className="font-bold text-sm">{m.teamB.score}</div>
                      <div className="text-[10px] text-muted-foreground">({m.teamB.overs})</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className={`text-xs font-semibold ${m.status === "LIVE" ? "text-primary" : "text-blue-600"}`}>{m.note}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.venue}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hero feature article */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 relative rounded-md overflow-hidden bg-card border border-border min-h-[380px] group cursor-pointer">
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 50%, #1f2937 100%)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded w-fit mb-3">
                Editor's Pick
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3 group-hover:underline">
                IPL is not just cricket. It's a product, a business, and a billion-dollar ecosystem.
              </h1>
              <p className="text-sm md:text-base text-gray-200 mb-3 max-w-2xl">
                18 seasons. 1,169 matches. ₹48,000 Cr in media rights. We unpack the data, the deals, and the dynasties.
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <span>By CricStats Editorial</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated today</span>
                <span>•</span>
                <span>12 min read</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-md p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-bold uppercase text-sm tracking-wider">Editorial Picks</h3>
            </div>
            <div className="space-y-3">
              {editorialPicks.map((p, i) => (
                <a key={i} href="#" className="block group">
                  <div className="flex gap-3">
                    <span className="text-xl font-black text-primary leading-none">{i + 1}</span>
                    <div>
                      <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">{p.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">{p.time}</p>
                    </div>
                  </div>
                  {i < editorialPicks.length - 1 && <div className="border-b border-border mt-3" />}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats overview strip */}
      <section className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Matches", value: overview?.totalMatches?.toLocaleString() ?? "1,169", change: "All seasons" },
          { label: "Total Runs", value: overview?.totalRuns?.toLocaleString() ?? "362,847", change: "2008–2025" },
          { label: "Total Wickets", value: overview?.totalWickets?.toLocaleString() ?? "12,094", change: "All-time" },
          { label: "Avg Score", value: overview?.avgScore ?? "168", change: "Per innings" },
        ].map((s, i) => (
          <div key={i} className="bg-card border-l-4 border-primary border-y border-r border-border rounded p-4">
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
            <h2 className="text-xl font-bold">Latest Stories</h2>
            <a href="#" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newsArticles.map((a, i) => (
              <article key={i} className="bg-card border border-border rounded-md overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                <div className="h-40 relative" style={{ background: a.image }}>
                  <span className="absolute top-3 left-3 bg-white text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    {a.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors mb-2">{a.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.excerpt}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{a.time}</span>
                    <span>•</span>
                    <span>{a.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          {/* Top run-getters */}
          <div className="bg-card border border-border rounded-md">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-bold uppercase text-sm tracking-wider">Top Run-Getters</h3>
              </div>
              <Link href="/stats" className="text-[11px] text-primary font-semibold hover:underline">More</Link>
            </div>
            <table className="w-full text-sm">
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
            </table>
          </div>

          {/* Top wicket-takers */}
          <div className="bg-card border border-border rounded-md">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <h3 className="font-bold uppercase text-sm tracking-wider">Top Wicket-Takers</h3>
              </div>
              <Link href="/stats" className="text-[11px] text-primary font-semibold hover:underline">More</Link>
            </div>
            <table className="w-full text-sm">
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
            </table>
          </div>

          {/* Champions */}
          <div className="bg-card border border-border rounded-md">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="font-bold uppercase text-sm tracking-wider">Recent Champions</h3>
              </div>
              <Link href="/business" className="text-[11px] text-primary font-semibold hover:underline">All</Link>
            </div>
            <ul className="divide-y divide-border">
              {recentChampions.map((c, i) => (
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
        <Link href="/dashboard" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group cursor-pointer">
          <BarChart3 className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Analytics Dashboard</h3>
          <p className="text-xs text-muted-foreground">Season trends, toss impact, phase-wise scoring, venue analytics, and more.</p>
        </Link>
        <Link href="/business" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group cursor-pointer">
          <TrendingUp className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Business & Revenue</h3>
          <p className="text-xs text-muted-foreground">Franchise valuations, sponsorship deals, and the IPL commercial ecosystem.</p>
        </Link>
        <Link href="/records" className="bg-card border border-border rounded-md p-5 hover:border-primary hover:shadow-md transition group cursor-pointer">
          <Award className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-bold text-base mb-1 group-hover:text-primary">Records Book</h3>
          <p className="text-xs text-muted-foreground">All-time bests, boundary kings, fastest hundreds, and historic milestones.</p>
        </Link>
      </section>
    </Layout>
  );
}
