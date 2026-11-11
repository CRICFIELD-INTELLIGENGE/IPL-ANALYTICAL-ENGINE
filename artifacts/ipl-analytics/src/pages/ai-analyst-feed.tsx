/**
 * AI INSIGHT FEED — Decision Intelligence OS, Phase 2 (Discovery)
 * ─────────────────────────────────────────────────────────────────────────────
 * Five discoveries a day from the ball-by-ball warehouse — an unexpected rise,
 * a venue pattern, a matchup anomaly, an auction opportunity, a tactical
 * trend — each with its evidence, a "so what", and a link to dig in.
 * Any past day's feed can be reproduced by date.
 */

import { RetentionFeedCard } from "@/components/retention/retention-widgets";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, ChevronLeft, ChevronRight, Gavel, Lightbulb, Loader2, MapPin, Rss, Swords, TrendingUp } from "lucide-react";
import { Layout } from "@/components/layout";
import { DemoBanner, ModuleHeader } from "@/components/decision/module-shell";
import { FeedIntelSnippets } from "@/components/intelligence/intel-components";
import { fetchDailyFeed, isOffline, linkHref, readParams, writeParams, type DailyFeed, type Insight, type InsightCategory } from "@/lib/discovery-api";
import { MOCK_FEED } from "@/components/decision/discovery-mock";

const CATEGORY_ICON: Record<InsightCategory, typeof Activity> = {
  player_rise: TrendingUp,
  venue_pattern: MapPin,
  matchup_anomaly: Swords,
  auction_opportunity: Gavel,
  tactical_trend: Activity,
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shiftDay = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const prettyDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function FeedPage() {
  const today = localToday();
  const fromUrl = readParams().get("date");
  const [date, setDate] = useState(fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) && fromUrl <= today ? fromUrl : today);
  const go = (d: string) => { setDate(d); writeParams({ date: d === today ? null : d }); };

  const q = useQuery({ queryKey: ["daily-feed", date], queryFn: () => fetchDailyFeed(date), placeholderData: (prev) => prev, retry: 1 });
  const demo = q.isError && isOffline(q.error);
  const feed: DailyFeed | undefined = demo ? MOCK_FEED : q.data;

  return (
    <Layout hideRightPanel>
      <div className="space-y-6 pb-16 max-w-4xl mx-auto w-full min-w-0">
        <ModuleHeader phase="Phase 2 · Discovery" title="AI Insight Feed" tagline="Five discoveries from the IPL database, every day. No searching needed." icon={<Rss className="w-5 h-5 text-orange-400" />}>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button onClick={() => go(shiftDay(date, -1))} aria-label="Previous day" className="p-1.5 rounded-lg hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-semibold px-2 tabular-nums">{date === today ? "Today" : date}</span>
            <button onClick={() => go(shiftDay(date, 1))} disabled={date >= today} aria-label="Next day" className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </ModuleHeader>

        <RetentionFeedCard />
        <FeedIntelSnippets />
        {demo && <DemoBanner>Can't reach the API — showing a saved feed from {MOCK_FEED.date}. Start the api-server for today's discoveries.</DemoBanner>}
        {q.isError && !demo && <DemoBanner>{(q.error as Error).message}</DemoBanner>}
        {q.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Generating today's feed…</div>}

        {feed && (
          <>
            <div className="text-xs text-muted-foreground">
              {prettyDate(feed.date)} · drawn from data through {feed.dataThrough?.replace(/\//g, "-") ?? "—"} (IPL {feed.latestSeason}). Each category rotates daily among its five strongest signals.
            </div>
            <div className={`space-y-4 transition-opacity ${q.isFetching ? "opacity-60" : ""}`}>
              {feed.insights.map((i, n) => <InsightCard key={i.id} insight={i} index={n + 1} poolSize={feed.poolSizes[i.category]} />)}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function InsightCard({ insight: i, index, poolSize }: { insight: Insight; index: number; poolSize: number }) {
  const Icon = CATEGORY_ICON[i.category];
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-mono text-muted-foreground">{String(index).padStart(2, "0")}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/15 bg-white/5 font-semibold">
            <Icon className="w-3.5 h-3.5 text-orange-300" /> {i.categoryLabel}
          </span>
          <span className="ml-auto text-muted-foreground">{i.confidence === "high" ? "High confidence" : "Medium confidence"}</span>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <h2 className="flex-1 min-w-[240px] font-display font-bold text-lg leading-snug">{i.headline}</h2>
          <div className="rounded-xl border border-white/10 bg-background/40 px-3 py-2 text-right">
            <div className="font-display font-black text-2xl leading-none">{i.stat.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1 max-w-[140px]">{i.stat.label}</div>
          </div>
        </div>

        <ul className="space-y-1">
          {i.evidence.map((e) => (
            <li key={e} className="flex items-start gap-2 text-sm text-foreground/85">
              <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" /> {e}
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2 rounded-xl border border-orange-500/25 bg-orange-500/[0.07] px-3 py-2 text-sm">
          <Lightbulb className="w-4 h-4 text-orange-300 shrink-0 mt-0.5" />
          <span><span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 mr-1.5">So what</span>{i.implication}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {i.links.map((l) => (
            <Link key={l.label} href={linkHref(l.link)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10">
              {l.label} <ArrowRight className="w-3 h-3" />
            </Link>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground">1 of {poolSize} candidates in this category</span>
        </div>
      </div>
    </article>
  );
}
