import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import {
  Boxes, Banknote, TrendingUp, Layers, FolderDown, Newspaper,
  Download, ArrowUpRight, ArrowDownRight, Eye, Smartphone, Users, Tv,
  Trophy, Target, BarChart3, PieChart, Sparkles, Activity as ActivityIcon,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
} from "recharts";

/* --------------------------------- Product Signals -------------------------------- */
const ENGAGEMENT = Array.from({ length: 12 }, (_, i) => ({
  m: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i],
  app: 30 + Math.sin(i / 1.6) * 18 + i * 4,
  hotstar: 50 + Math.cos(i / 2) * 22 + i * 5,
}));
const FUNNEL = [
  { stage: "Aware", v: 500 }, { stage: "Watch", v: 280 }, { stage: "Engage", v: 145 }, { stage: "Pay", v: 62 }, { stage: "Loyal", v: 28 },
];

export function ProductPage() {
  return (
    <Layout>
      <PageHeader Icon={Boxes} title="Product Signals" subtitle="App engagement, retention, second-screen behavior" />
      <div className="grid md:grid-cols-3 gap-4">
        <KPI label="Daily Active Fans" value="42.6M" delta="+12.3%" up />
        <KPI label="Avg. Watch Time" value="48m 22s" delta="+4.1%" up />
        <KPI label="Second-Screen Rate" value="68%" delta="-1.2%" up={false} />
      </div>
      <div className="grid lg:grid-cols-[7fr_5fr] gap-4 mt-4">
        <GlassCard className="p-5">
          <SectionTitle icon={BarChart3} title="Engagement Trend" subtitle="Hotstar app vs in-app fan engagement" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ENGAGEMENT} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="ea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(270 95% 65%)" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(270 95% 65%)" stopOpacity={0.05} /></linearGradient>
                  <linearGradient id="eb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(220 100% 65%)" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(220 100% 65%)" stopOpacity={0.05} /></linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="app" stroke="hsl(270 95% 65%)" strokeWidth={2} fill="url(#ea)" />
                <Area type="monotone" dataKey="hotstar" stroke="hsl(220 100% 65%)" strokeWidth={2} fill="url(#eb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <SectionTitle icon={Target} title="Fan Funnel" subtitle="Aware → Loyal · in millions" />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FUNNEL} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="v" radius={[8, 8, 0, 0]} fill="url(#barg)" />
                <defs>
                  <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(320 100% 65%)" /><stop offset="100%" stopColor="hsl(270 95% 55%)" /></linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
      <SignalGrid />
    </Layout>
  );
}

function SignalGrid() {
  const items = [
    { Icon: Smartphone, label: "Mobile share", v: "84%", t: "Of total streams" },
    { Icon: Tv, label: "CTV share", v: "11%", t: "Living-room viewing" },
    { Icon: Eye, label: "Avg. screens/fan", v: "1.7", t: "Across devices" },
    { Icon: Users, label: "Co-viewing", v: "2.4", t: "People per screen" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
      {items.map((s, i) => (
        <GlassCard key={s.label} className="p-4" delay={i * 0.04}>
          <s.Icon className="w-4 h-4 text-accent" />
          <div className="font-display font-bold text-2xl mt-2 gradient-text">{s.v}</div>
          <div className="text-xs font-semibold mt-0.5">{s.label}</div>
          <div className="text-[11px] text-muted-foreground">{s.t}</div>
        </GlassCard>
      ))}
    </div>
  );
}

/* --------------------------------- Revenue Engine ------------------------------- */
const REV = [
  { y: "2008", media: 8, sponsor: 4, ticket: 1.2, merch: 0.4 },
  { y: "2014", media: 16, sponsor: 8, ticket: 2.6, merch: 1.0 },
  { y: "2018", media: 28, sponsor: 16, ticket: 4.0, merch: 1.8 },
  { y: "2022", media: 48, sponsor: 25, ticket: 5.4, merch: 3.0 },
  { y: "2026", media: 72, sponsor: 38, ticket: 7.8, merch: 4.6 },
];
export function RevenuePage() {
  return (
    <Layout>
      <PageHeader Icon={Banknote} title="Revenue Engine" subtitle="Media rights, sponsorship, ticketing, merchandise" />
      <div className="grid md:grid-cols-4 gap-3">
        <KPI label="Total revenue" value="₹12,240 Cr" delta="+18%" up />
        <KPI label="Media rights" value="₹7,200 Cr" delta="+22%" up />
        <KPI label="Sponsorships" value="₹3,800 Cr" delta="+14%" up />
        <KPI label="Avg. team valuation" value="₹9,750 Cr" delta="+11%" up />
      </div>
      <GlassCard className="p-5 mt-4">
        <SectionTitle icon={BarChart3} title="Revenue Mix Across Cycles" subtitle="₹ Crore · stacked by source" />
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REV} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
              <XAxis dataKey="y" tick={{ fontSize: 11, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="media" stackId="a" fill="hsl(270 95% 65%)" />
              <Bar dataKey="sponsor" stackId="a" fill="hsl(220 100% 65%)" />
              <Bar dataKey="ticket" stackId="a" fill="hsl(320 100% 65%)" />
              <Bar dataKey="merch" stackId="a" fill="hsl(38 100% 60%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Legend items={[
          { c: "hsl(270 95% 65%)", l: "Media rights" },
          { c: "hsl(220 100% 65%)", l: "Sponsorship" },
          { c: "hsl(320 100% 65%)", l: "Ticketing" },
          { c: "hsl(38 100% 60%)", l: "Merchandise" },
        ]} />
      </GlassCard>
    </Layout>
  );
}

/* --------------------------------- Growth Radar --------------------------------- */
const RADAR = [
  { axis: "Reach", a: 95 }, { axis: "Engagement", a: 82 }, { axis: "Spend", a: 76 },
  { axis: "Retention", a: 68 }, { axis: "Virality", a: 88 }, { axis: "NPS", a: 72 },
];
export function GrowthPage() {
  return (
    <Layout>
      <PageHeader Icon={TrendingUp} title="Growth Radar" subtitle="Fan acquisition · retention · virality" />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <GlassCard className="p-5">
          <SectionTitle icon={PieChart} title="Brand Health Radar" subtitle="6 dimensions · 0–100 scale" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR}>
                <PolarGrid stroke="hsl(250 30% 25%)" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(230 15% 70%)" }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(230 15% 50%)" }} />
                <Radar name="IPL" dataKey="a" stroke="hsl(270 95% 65%)" fill="hsl(270 95% 65%)" fillOpacity={0.45} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <SectionTitle icon={ActivityIcon} title="Cohort Retention" subtitle="% returning by season since acquisition" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.from({ length: 7 }, (_, i) => ({ s: `S${i + 1}`, c2024: 100 - i * 11, c2025: 100 - i * 8, c2026: 100 - i * 5 }))} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="hsl(250 30% 18%)" strokeDasharray="3 3" />
                <XAxis dataKey="s" tick={{ fontSize: 11, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(230 15% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="c2024" stroke="hsl(220 100% 65%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c2025" stroke="hsl(320 100% 65%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c2026" stroke="hsl(270 95% 65%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}

/* --------------------------------- Strategy Layer ------------------------------- */
const PLAYBOOKS = [
  { title: "The Anchor + Power-Hitter Top 3", angle: "On-Field", desc: "Why teams pairing one anchor with two boundary hitters in the top 3 win 14% more powerplays.", color: "from-purple-500/30 to-fuchsia-500/20" },
  { title: "Buying Local: The Auction Heuristic", angle: "Strategy", desc: "Franchises with ≥5 home-state players see a +9% home win rate and +18% jersey sales.", color: "from-blue-500/30 to-cyan-500/20" },
  { title: "Death-Bowling Specialists Are Underpriced", angle: "Auction", desc: "Spec death bowlers averaged ₹4.2 Cr but delivered the lowest economy in 17–20 overs.", color: "from-emerald-500/30 to-teal-500/20" },
  { title: "Why CSK Pays for Continuity", angle: "Culture", desc: "Lowest squad turnover (12%) correlates with the highest playoff appearance rate (88%).", color: "from-amber-500/30 to-orange-500/20" },
];
export function StrategyPage() {
  return (
    <Layout>
      <PageHeader Icon={Layers} title="Strategy Layer" subtitle="Playbooks · auction logic · franchise economics" />
      <div className="grid sm:grid-cols-2 gap-4">
        {PLAYBOOKS.map((p, i) => (
          <GlassCard key={p.title} className={`p-5 bg-gradient-to-br ${p.color}`} delay={i * 0.05}>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-black/40 border border-white/10">{p.angle}</span>
            <h3 className="font-display font-bold text-lg mt-3">{p.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-snug">{p.desc}</p>
            <button className="mt-4 text-xs font-semibold text-accent flex items-center gap-1.5 hover:gap-2 transition-all">Read playbook <ArrowUpRight className="w-3.5 h-3.5" /></button>
          </GlassCard>
        ))}
      </div>
    </Layout>
  );
}

/* --------------------------------- Reports Vault -------------------------------- */
const REPORTS = [
  { title: "IPL 2026 Mid-Season Intelligence Report", pages: 84, size: "12.4 MB", tag: "Comprehensive", date: "May 4, 2026" },
  { title: "Auction Economics 2008–2026", pages: 56, size: "8.1 MB", tag: "Business", date: "Apr 29, 2026" },
  { title: "Fan Behavior in the Streaming Era", pages: 42, size: "6.8 MB", tag: "Product", date: "Apr 18, 2026" },
  { title: "The CSK Operating Model", pages: 38, size: "5.6 MB", tag: "Strategy", date: "Apr 10, 2026" },
  { title: "India's Cricket Economy Outlook", pages: 64, size: "9.9 MB", tag: "Macro", date: "Mar 28, 2026" },
];
export function ReportsPage() {
  return (
    <Layout>
      <PageHeader Icon={FolderDown} title="Reports Vault" subtitle="Deep-dive PDFs · downloadable" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r, i) => (
          <GlassCard key={r.title} className="p-4 flex flex-col" delay={i * 0.04}>
            <div className="h-32 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <FolderDown className="w-10 h-10 text-white/80 relative" />
              <div className="absolute inset-0 scanline opacity-30" />
            </div>
            <span className="mt-3 text-[10px] uppercase tracking-wider font-semibold text-accent">{r.tag}</span>
            <div className="font-semibold text-sm mt-1 leading-snug">{r.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{r.date} · {r.pages} pp · {r.size}</div>
            <button onClick={() => alert(`Download stub: ${r.title}`)} className="mt-3 neon-btn rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </GlassCard>
        ))}
      </div>
    </Layout>
  );
}

/* --------------------------------- Blogs ---------------------------------------- */
const BLOGS = [
  { tag: "Business", title: "Why CSK Builds Better Teams", excerpt: "Continuity, culture and the math of low squad turnover.", date: "May 18, 2025", read: "8 min", grad: "from-rose-500/30 to-fuchsia-500/20" },
  { tag: "Product", title: "IPL is not Cricket. It's a Product.", excerpt: "Inside the playbook that turned a league into the world's most-watched annual product launch.", date: "May 15, 2025", read: "6 min", grad: "from-purple-500/30 to-indigo-500/20" },
  { tag: "Analytics", title: "The Undervalued XI of IPL 2025", excerpt: "Eleven players who delivered 2.4x ROI vs their auction price.", date: "May 12, 2025", read: "7 min", grad: "from-blue-500/30 to-cyan-500/20" },
  { tag: "Growth", title: "The Second Screen Economy of IPL", excerpt: "How fantasy, betting and chat apps stitch a parallel economy.", date: "May 10, 2025", read: "6 min", grad: "from-emerald-500/30 to-teal-500/20" },
  { tag: "Strategy", title: "The Auction Math Nobody Talks About", excerpt: "A latent-value model for IPL auctions.", date: "May 6, 2025", read: "5 min", grad: "from-amber-500/30 to-orange-500/20" },
  { tag: "Macro", title: "Cricket as India's Soft Power", excerpt: "From colonial inheritance to a billion-dollar export.", date: "Apr 28, 2025", read: "9 min", grad: "from-pink-500/30 to-purple-500/20" },
];
export function BlogsPage() {
  return (
    <Layout>
      <PageHeader Icon={Newspaper} title="Blogs" subtitle="Insight-driven essays across product, business, and strategy" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BLOGS.map((b, i) => (
          <GlassCard key={b.title} className="overflow-hidden" delay={i * 0.04}>
            <div className={`h-36 relative bg-gradient-to-br ${b.grad} flex items-end p-3`}>
              <div className="absolute inset-0 scanline opacity-40" />
              <span className="relative text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-black/40 border border-white/10">{b.tag}</span>
            </div>
            <div className="p-4">
              <div className="font-display font-semibold leading-snug">{b.title}</div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{b.excerpt}</p>
              <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
                <span>{b.date}</span><span>·</span><span>{b.read} read</span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </Layout>
  );
}

/* --------------------------------- AI Analyst (full page) ----------------------- */
import { AIAnalystPanel } from "@/components/ai-analyst-panel";
export function AIAnalystPage() {
  const queries = [
    "Best XI under ₹40 Cr in IPL 2026",
    "Show me death-over economy leaderboard",
    "Which franchise has best ROI on auction spend?",
    "Compare Wankhede vs Eden run distribution",
    "Top young players (under 23) in IPL 2026",
    "Predict playoff qualification probabilities",
  ];
  return (
    <Layout hideRightPanel>
      <PageHeader Icon={Sparkles} title="AI Analyst" subtitle="Ask anything. Get insights. Tap the data warehouse." />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <AIAnalystPanel />
        <GlassCard className="p-5">
          <SectionTitle icon={Trophy} title="Suggested Analytics Queries" subtitle="Hand-picked starters" />
          <div className="grid grid-cols-1 gap-2 mt-3">
            {queries.map((q) => (
              <div key={q} className="text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 transition-colors">{q}</div>
            ))}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}

/* --------------------------------- Shared --------------------------------------- */
function PageHeader({ Icon, title, subtitle }: { Icon: typeof Boxes; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/40 to-accent/30 border border-white/10 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <div>
        <h1 className="font-display font-bold text-2xl">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon: I, title, subtitle }: { icon: typeof Boxes; title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <I className="w-4 h-4 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <span className="text-[11px] text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function KPI({ label, value, delta, up }: { label: string; value: string; delta: string; up: boolean }) {
  return (
    <GlassCard className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-2xl mt-1">{value}</div>
      <div className={`text-xs mt-1 flex items-center gap-1 ${up ? "text-emerald-400" : "text-pink-400"}`}>
        {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />} {delta} <span className="text-muted-foreground">vs prev season</span>
      </div>
    </GlassCard>
  );
}

function Legend({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.l} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.c }} />{i.l}</span>
      ))}
    </div>
  );
}

const tooltipStyle = { background: "hsl(240 30% 9%)", border: "1px solid hsl(250 40% 25%)", borderRadius: 8, fontSize: 12, color: "hsl(220 30% 95%)" } as const;
