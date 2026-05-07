import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useLiveIplMatches, useLiveNews, getMatchScoreLine } from "@/lib/live";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Play, ArrowRight, Trophy, Target, Zap, TrendingUp, Star,
  ChevronLeft, ChevronRight, MapPin, Sparkles, Quote,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from "recharts";
import { useRef } from "react";

const STATS_ROW = [
  { label: "Matches", value: "74", sub: "Completed", icon: Target },
  { label: "Runs", value: "18,542", sub: "This Season", icon: Zap },
  { label: "High Score", value: "277/3", sub: "Sunrisers", icon: TrendingUp },
  { label: "Sixes", value: "1,234", sub: "This Season", icon: Star },
  { label: "Wickets", value: "1,089", sub: "This Season", icon: Trophy },
];

const AWARDS = [
  { tag: "Orange Cap", player: "Virat Kohli", team: "RCB", value: "672", unit: "Runs", color: "from-orange-500 to-amber-500", chip: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { tag: "Purple Cap", player: "Noor Ahmad", team: "CSK", value: "21", unit: "Wickets", color: "from-purple-500 to-fuchsia-500", chip: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { tag: "Most Sixes", player: "Nicholas Pooran", team: "LSG", value: "35", unit: "Sixes", color: "from-blue-500 to-cyan-500", chip: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { tag: "Best Economy", player: "Trent Boult", team: "MI", value: "6.45", unit: "Economy", color: "from-emerald-500 to-teal-500", chip: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
];

const INSIGHTS = [
  { tag: "Business", title: "Why CSK Builds Better Teams", date: "May 18, 2025", read: "8 min read", grad: "from-rose-500/30 via-fuchsia-500/20 to-transparent" },
  { tag: "Product", title: "IPL is not Cricket, It's a Product", date: "May 15, 2025", read: "6 min read", grad: "from-purple-500/30 via-indigo-500/20 to-transparent" },
  { tag: "Analytics", title: "The Undervalued XI of IPL 2025", date: "May 12, 2025", read: "7 min read", grad: "from-blue-500/30 via-cyan-500/20 to-transparent" },
  { tag: "Growth", title: "The Second Screen Economy of IPL", date: "May 10, 2025", read: "6 min read", grad: "from-emerald-500/30 via-teal-500/20 to-transparent" },
  { tag: "Strategy", title: "The Auction Math Nobody Talks About", date: "May 6, 2025", read: "5 min read", grad: "from-amber-500/30 via-orange-500/20 to-transparent" },
];

const VENUES = [
  { name: "Chepauk", type: "Spin Friendly", value: 76, dir: "spin" },
  { name: "Eden Gardens", type: "Spin Friendly", value: 68, dir: "spin" },
  { name: "Wankhede", type: "Pace Friendly", value: 64, dir: "pace" },
  { name: "M. Chinnaswamy", type: "Pace Friendly", value: 58, dir: "pace" },
  { name: "Narendra Modi", type: "Balanced", value: 51, dir: "balanced" },
];

const FOOTER_STATS = [
  { v: "2008", l: "IPL Started" },
  { v: "12", l: "Teams" },
  { v: "2.5B+", l: "Digital Views" },
  { v: "₹1,11,500 Cr+", l: "Economic Impact" },
  { v: "500M+", l: "Fans Worldwide" },
];

const WIN_PROB_DATA = Array.from({ length: 21 }, (_, i) => {
  const ov = i;
  const csk = Math.min(95, 35 + ov * 1.4 + Math.sin(ov / 2) * 5);
  return { ov, MI: 100 - csk, CSK: csk };
});

export default function HomePage() {
  const { data: matches } = useLiveIplMatches();
  const { data: news } = useLiveNews("ipl");

  const liveOrNext = matches?.matches.find((m) => /progress|innings/i.test(m.matchInfo.state))
    ?? matches?.matches.find((m) => /preview|upcoming/i.test(m.matchInfo.state))
    ?? matches?.matches[0];

  const insightScroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => insightScroller.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <Layout>
      {/* HERO + LIVE MATCH PANEL */}
      <div className="grid gap-4 lg:gap-5 lg:[grid-template-columns:minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Hero */}
        <GlassCard className="relative overflow-hidden min-h-[440px]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(800px 500px at 100% 0%, hsl(270 95% 35% / 0.55), transparent 60%), radial-gradient(600px 400px at 110% 100%, hsl(220 100% 40% / 0.5), transparent 60%), radial-gradient(400px 300px at 80% 50%, hsl(320 100% 45% / 0.35), transparent 60%)",
              }}
            />
            {/* Abstract neon orbs */}
            <div className="absolute right-[8%] top-[18%] w-40 h-40 rounded-full opacity-70 blur-2xl"
                 style={{ background: "radial-gradient(circle, hsl(270 100% 70%) 0%, transparent 70%)" }} />
            <div className="absolute right-[28%] bottom-[14%] w-56 h-56 rounded-full opacity-60 blur-3xl"
                 style={{ background: "radial-gradient(circle, hsl(220 100% 65%) 0%, transparent 70%)" }} />
            <div className="absolute right-[45%] top-[10%] w-24 h-24 rounded-full opacity-60 blur-xl"
                 style={{ background: "radial-gradient(circle, hsl(320 100% 65%) 0%, transparent 70%)" }} />
            {/* Cricket-ball motif on the right */}
            <div className="hidden md:block absolute right-[10%] top-1/2 -translate-y-1/2 w-44 h-44 rounded-full"
                 style={{
                   background: "radial-gradient(circle at 35% 30%, hsl(0 90% 60%) 0%, hsl(0 90% 35%) 40%, hsl(0 90% 18%) 80%)",
                   boxShadow: "0 30px 90px -10px hsl(0 90% 30% / 0.6), inset -8px -10px 20px hsl(0 0% 0% / 0.6)",
                 }}>
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-white/40" />
              <div className="absolute inset-x-0 top-[calc(50%-6px)] h-[1px] bg-white/20" />
              <div className="absolute inset-x-0 top-[calc(50%+6px)] h-[1px] bg-white/20" />
            </div>
            <div className="absolute inset-0 scanline opacity-30" />
          </div>
          <div className="relative z-10 p-6 sm:p-8 max-w-[60%] flex flex-col justify-center min-h-[440px]">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl sm:text-4xl lg:text-[40px] font-bold leading-[1.08] tracking-tight"
            >
              IPL is not just cricket.{" "}
              <span className="block mt-1">
                It's a <span className="gradient-text text-glow-purple">Product.</span>
              </span>
              <span className="block">
                A <span className="text-accent text-glow-blue">Business.</span>
              </span>
              <span className="block">
                A <span className="gradient-text text-glow-pink">Billion Dollar</span> Ecosystem.
              </span>
            </motion.h1>
            <p className="mt-5 text-sm text-muted-foreground max-w-md">
              Data-driven insights across Sports, Product, Business, Fans and the IPL Economy.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/product"
                className="neon-btn rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
              >
                Explore Insights <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10">
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-white" />
                </span>
                Watch Trailer <span className="text-muted-foreground text-xs">1:15 min</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Live match panel */}
        <GlassCard className="p-5 flex flex-col" delay={0.05}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="ticker-dot" />
              <span className="text-xs font-mono uppercase tracking-wider text-destructive">{liveOrNext && /progress|innings/i.test(liveOrNext.matchInfo.state) ? "Live Match" : "Featured Match"}</span>
            </div>
            <div className="text-xs text-muted-foreground">{liveOrNext?.matchInfo.seriesName ?? "IPL 2026"} · {liveOrNext?.matchInfo.matchDesc ?? ""}</div>
          </div>

          {liveOrNext ? <FeaturedMatch match={liveOrNext} /> : <FeaturedMatchFallback />}

          <div className="mt-5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Win Probability</div>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={WIN_PROB_DATA} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(220 100% 65%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(220 100% 65%)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 100% 60%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(38 100% 60%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ov" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(240 30% 9%)", border: "1px solid hsl(250 40% 25%)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="MI" stroke="hsl(220 100% 65%)" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="CSK" stroke="hsl(38 100% 60%)" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-around text-xs mt-1">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(220_100%_65%)]" /> MI <span className="text-accent font-mono">38%</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(38_100%_60%)]" /> CSK <span className="text-accent font-mono">62%</span></div>
            </div>
          </div>

          <Link href={liveOrNext ? `/match/${liveOrNext.matchInfo.matchId}` : "/on-field"} className="mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10">
            View Full Match Center <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>

      {/* STATS ROW + AWARDS */}
      <div className="grid gap-4 lg:gap-5 mt-4 lg:mt-5 lg:[grid-template-columns:minmax(0,1fr)_minmax(0,2.6fr)]">
        <GlassCard className="p-4">
          <div className="grid grid-cols-5 lg:grid-cols-1 gap-3">
            {STATS_ROW.map((s, i) => (
              <div key={s.label} className="flex items-start gap-3 px-2 lg:py-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${i % 2 ? "from-primary/30 to-accent/20" : "from-accent/30 to-primary/20"} border border-white/10`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="font-display font-bold text-lg">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {AWARDS.map((a, i) => (
            <GlassCard key={a.tag} className="p-4" delay={i * 0.05}>
              <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold border ${a.chip}`}>
                <Trophy className="w-3 h-3" /> {a.tag}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_-4px_currentColor]`}>
                  {a.player.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className="leading-tight">
                  <div className="font-semibold text-sm">{a.player}</div>
                  <div className="text-[11px] text-muted-foreground">{a.team}</div>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="font-display font-bold text-2xl gradient-text">{a.value}</div>
                <div className="text-[11px] text-muted-foreground">{a.unit}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* INSIGHTS CAROUSEL + VENUE HEATMAP */}
      <div className="grid gap-4 lg:gap-5 mt-4 lg:mt-5 lg:[grid-template-columns:minmax(0,1.7fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold tracking-wider text-sm uppercase">Insights That Matter</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button aria-label="Scroll insights left" onClick={() => scroll(-1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
              <button aria-label="Scroll insights right" onClick={() => scroll(1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div ref={insightScroller} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scroll-smooth">
            {INSIGHTS.map((p, i) => (
              <Link key={i} href="/blogs" className="snap-start shrink-0 w-[230px] sm:w-[260px]">
                <GlassCard className="overflow-hidden h-full" delay={i * 0.04}>
                  <div className={`h-32 relative bg-gradient-to-br ${p.grad} flex items-end p-3`}>
                    <div className="absolute inset-0 scanline opacity-40" />
                    <span className="relative text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-black/40 border border-white/10">{p.tag}</span>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm leading-snug">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2">
                      <span>{p.date}</span><span>·</span><span>{p.read}</span>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
            {news?.items.slice(0, 4).map((n, i) => (
              <a key={`n-${i}`} href={n.link} target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[230px] sm:w-[260px]">
                <GlassCard className="overflow-hidden h-full" delay={(INSIGHTS.length + i) * 0.04}>
                  <div className="h-32 relative bg-gradient-to-br from-slate-700/40 to-slate-900/40">
                    {n.image && <img src={n.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-black/60 border border-white/10">News</span>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm leading-snug line-clamp-2">{n.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1.5">via ESPN Cricinfo</div>
                  </div>
                </GlassCard>
              </a>
            ))}
          </div>
        </div>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold tracking-wider text-sm uppercase">Venue Heatmap</h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Spin vs Pace Dominance</span>
          </div>

          {/* Stylized abstract heatmap */}
          <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(240_35%_10%)] to-[hsl(260_40%_8%)] border border-white/5 mb-3">
            {[
              { l: "20%", t: "25%", c: "hsl(38 100% 60%)" },
              { l: "55%", t: "20%", c: "hsl(220 100% 65%)" },
              { l: "70%", t: "55%", c: "hsl(270 95% 65%)" },
              { l: "35%", t: "70%", c: "hsl(320 100% 65%)" },
              { l: "82%", t: "78%", c: "hsl(180 100% 55%)" },
            ].map((p, i) => (
              <span key={i} className="absolute w-3 h-3 rounded-full" style={{ left: p.l, top: p.t, background: p.c, boxShadow: `0 0 18px ${p.c}, 0 0 6px ${p.c}` }} />
            ))}
            <div className="absolute inset-0 scanline opacity-30 pointer-events-none" />
          </div>

          <div className="flex flex-col gap-2">
            {VENUES.map((v) => (
              <div key={v.name} className="flex items-center gap-3">
                <div className="w-28 leading-tight">
                  <div className="text-xs font-semibold">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground">{v.type}</div>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${v.dir === "spin" ? "bg-gradient-to-r from-accent to-primary" : v.dir === "pace" ? "bg-gradient-to-r from-pink-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-cyan-500"}`}
                    style={{ width: `${v.value}%` }}
                  />
                </div>
                <div className="w-9 text-right text-xs font-mono">{v.value}%</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mt-3">
            <span>Most Spin</span><span>Most Pace</span>
          </div>
        </GlassCard>
      </div>

      {/* FOOTER STATS STRIP */}
      <GlassCard className="p-4 mt-4 lg:mt-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
          {FOOTER_STATS.map((s) => (
            <div key={s.l} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/40 to-accent/30 border border-white/10 flex items-center justify-center text-xs">★</div>
              <div className="leading-tight">
                <div className="font-display font-bold">{s.v}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.l}</div>
              </div>
            </div>
          ))}
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground italic">
            <Quote className="w-4 h-4 text-accent shrink-0" />
            <span>"IPL is where Sports, Entertainment and <span className="text-white not-italic font-semibold">Business</span> hit a six together."</span>
          </div>
        </div>
      </GlassCard>
    </Layout>
  );
}

function FeaturedMatch({ match }: { match: NonNullable<ReturnType<typeof useLiveIplMatches>["data"]>["matches"][number] }) {
  const score = getMatchScoreLine(match);
  const t1 = match.matchInfo.team1;
  const t2 = match.matchInfo.team2;
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3 rounded-xl bg-white/5 border border-white/10">
      <TeamCell short={t1.teamSName} name={t1.teamName} score={score.team1} color="hsl(38 100% 60%)" />
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">vs</span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-destructive/20 text-destructive border border-destructive/40">
          {match.matchInfo.state.toUpperCase()}
        </span>
      </div>
      <TeamCell short={t2.teamSName} name={t2.teamName} score={score.team2} color="hsl(220 100% 65%)" align="right" />
    </div>
  );
}

function TeamCell({ short, name, score, color, align = "left" }: { short: string; name: string; score: string; color: string; align?: "left" | "right" }) {
  return (
    <div className={`flex-1 flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color, boxShadow: `0 0 18px -4px ${color}` }}>{short}</div>
      <div className="leading-tight min-w-0">
        <div className="text-[11px] text-muted-foreground truncate">{name}</div>
        <div className="font-display font-bold text-sm">{score}</div>
      </div>
    </div>
  );
}

function FeaturedMatchFallback() {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3 rounded-xl bg-white/5 border border-white/10">
      <TeamCell short="MI" name="Mumbai Indians" score="186/6 (20)" color="hsl(220 100% 65%)" />
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">vs</span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-destructive/20 text-destructive border border-destructive/40">LIVE</span>
      </div>
      <TeamCell short="CSK" name="Chennai Super Kings" score="189/7 (19.4)" color="hsl(38 100% 60%)" align="right" />
    </div>
  );
}
