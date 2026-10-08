// The Newsroom: a live front page for IPL data, business and media coverage.
//
// Stories come from real RSS — ESPNcricinfo plus Google News desks tuned to
// analytics, business, media rights and the auction — refreshed server-side
// every ten minutes. Nothing is written here; if a feed is down the strip at
// the top says so by name, because a news page that quietly shows fewer stories
// looks identical to a quiet news day.
//
// The "By the numbers" rail and the ticker are the one thing on this page the
// site itself produces: figures computed from the 295,732-delivery record. They
// sit beside the wire deliberately — the pitch of the whole project is that the
// data desk has something the wire does not.

import { useMemo, useState } from "react";
import { useNews, useInsightFeed } from "@/lib/aggregates";
import type { NewsItem } from "@/lib/aggregates";
import { NewsLead, NewsRow, StatTicker, FeedStatusStrip, toneOf, timeAgo } from "@/components/news-desk";
import {
  Newspaper, ExternalLink, Mail, Linkedin, Twitter, Globe,
  BarChart3, AlertTriangle, Rss,
} from "lucide-react";

/* ═══════════════════════ FOLLOW & NEWSLETTERS ═══════════════════════

   Only links verified to resolve are listed. Anything unreachable was left
   out rather than shipped as a dead link on a page whose whole point is that
   its sources check out.
   ══════════════════════════════════════════════════════════════════════ */

interface FollowRef {
  name: string;
  handle: string;
  url: string;
  what: string;
  kind: "official" | "media" | "analyst" | "product";
}

const FOLLOW: FollowRef[] = [
  { name: "Indian Premier League", handle: "@IPL", url: "https://x.com/IPL", what: "Official league account — fixtures, results, announcements", kind: "official" },
  { name: "IPL T20 (official site)", handle: "iplt20.com", url: "https://www.iplt20.com/", what: "Official standings, squads, match centre and archives", kind: "official" },
  { name: "Cricbuzz", handle: "@cricbuzz", url: "https://x.com/cricbuzz", what: "Live scores and breaking cricket news", kind: "media" },
  { name: "ESPNcricinfo", handle: "espncricinfo.com", url: "https://www.espncricinfo.com/", what: "Statsguru, ball-by-ball commentary and long-form analysis", kind: "media" },
  { name: "Vishal Misra", handle: "@vishalmisra", url: "https://x.com/vishalmisra", what: "Columbia CS professor; T20 metrics research and the Impact Player work", kind: "analyst" },
  { name: "CricViz", handle: "cricviz.com", url: "https://cricviz.com/", what: "Ball-tracking analytics used across broadcast", kind: "analyst" },
  { name: "Unicorns AI", handle: "sfunicorns.ai", url: "https://sfunicorns.ai", what: "Cricket analytics platform behind the Delta metric", kind: "product" },
  { name: "CricMind AI", handle: "cricmind.ai", url: "https://www.cricmind.ai/", what: "AI-led cricket insight product", kind: "product" },
];

interface NewsletterRef {
  name: string;
  by: string;
  url: string;
  what: string;
  cadence: string;
}

const NEWSLETTERS: NewsletterRef[] = [
  { name: "The Impact Player Treadmill", by: "Vishal Misra · Medium", url: "https://medium.com/@vishalmisra/the-impact-player-treadmill-b25749674b12", what: "How the substitution rule reshaped squad design without changing results", cadence: "Essay" },
  { name: "Cricket analytics papers", by: "Vishal Misra · Columbia", url: "http://www.cs.columbia.edu/~misra/other.html", what: "Delta, the Set-Batter Paradox, Five Bowlers in Eighteen Years", cadence: "Research index" },
  { name: "Brand Finance press releases", by: "Brand Finance", url: "https://brandfinance.com/press-releases", what: "Annual IPL and franchise brand valuations", cadence: "Annual" },
];

const KIND_TONE: Record<FollowRef["kind"], string> = {
  official: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  media: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  analyst: "text-primary border-primary/30 bg-primary/10",
  product: "text-amber-300 border-amber-400/30 bg-amber-400/10",
};

/* ══════════════════════════════════════════════════════════════════════ */

const SECTIONS = ["All", "Data", "Business", "Media", "Auction", "Wire"] as const;
type Section = typeof SECTIONS[number];

export function NewsroomTab() {
  const news = useNews();
  const insights = useInsightFeed();
  const [section, setSection] = useState<Section>("All");
  const [iplOnly, setIplOnly] = useState(true);

  const items = news.data?.items ?? [];

  const filtered = useMemo(() => {
    let list = items;
    if (iplOnly) list = list.filter(i => i.isIpl);
    if (section !== "All") list = list.filter(i => i.section === section);
    return list;
  }, [items, section, iplOnly]);

  // The lead is simply the newest story. Picking the newest one that happens to
  // carry an image put a six-day-old wire piece at the top of the page purely
  // because Google News items ship without art — recency has to win over
  // decoration on a front page.
  const lead = filtered[0];
  const rest = filtered.filter(i => i.id !== lead?.id);

  const tickerLines = useMemo(
    () => (insights.data?.insights ?? []).map(c => `${c.stat} — ${c.statLabel}`),
    [insights.data],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) if (!iplOnly || i.isIpl) c[i.section] = (c[i.section] ?? 0) + 1;
    return c;
  }, [items, iplOnly]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── wire status ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {news.data ? (
          <FeedStatusStrip statuses={news.data.statuses} fetchedAt={news.data.fetchedAt} />
        ) : (
          <span className="text-[10px] font-mono text-white/25">connecting to the wire…</span>
        )}
        <button
          onClick={() => setIplOnly(v => !v)}
          className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
            iplOnly ? "bg-primary/15 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
          }`}
        >
          {iplOnly ? "IPL only" : "All cricket"}
        </button>
      </div>

      {tickerLines.length > 0 && <StatTicker lines={tickerLines} />}

      {/* ── section nav ── */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              section === s ? "bg-white text-[#050816]" : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
            }`}
          >
            {s}
            {s !== "All" && counts[s] != null && (
              <span className="ml-1.5 opacity-50">{counts[s]}</span>
            )}
          </button>
        ))}
      </div>

      {news.isLoading && (
        <div className="rounded-[24px] border border-white/10 bg-[#0B1020] p-12 text-center text-white/40 font-mono text-sm">
          Pulling the wire…
        </div>
      )}

      {news.isError && (
        <div className="rounded-[24px] border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
          <div>
            <div className="text-[13px] font-black text-red-200">The news wire could not be reached</div>
            <p className="text-[11px] text-white/40 mt-1">
              Nothing is shown rather than a cached stand-in, so what you see is always what the feeds returned.
            </p>
          </div>
        </div>
      )}

      {!news.isLoading && !news.isError && filtered.length === 0 && (
        <div className="rounded-[24px] border border-white/10 bg-[#0B1020] p-12 text-center text-white/40 font-mono text-sm">
          No stories in this section right now.
        </div>
      )}

      {/* ── front page ── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 flex flex-col gap-5">
            {lead && <NewsLead item={lead} />}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">More stories</span>
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-mono text-white/20">{rest.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {rest.slice(0, 24).map((it, n) => <NewsRow key={it.id} item={it} rank={n + 1} />)}
            </div>
          </div>

          {/* ── sidebar ── */}
          <aside className="lg:col-span-4 flex flex-col gap-5">
            <ByTheNumbers cards={insights.data?.insights ?? []} />
            <NewsletterRail />
            <FollowRail />
          </aside>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── sidebar rails ─────────────────────────── */

function ByTheNumbers({ cards }: { cards: { id: string; stat: string; statLabel: string; headline: string; sample: string }[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden">
      <header className="px-5 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">From our data desk</h3>
      </header>
      <div className="divide-y divide-white/5">
        {cards.slice(0, 6).map(c => (
          <div key={c.id} className="px-5 py-4 flex gap-4 items-start hover:bg-white/[0.02] transition-colors">
            <div className="text-[22px] font-black text-primary tabular-nums leading-none shrink-0 min-w-[70px]">{c.stat}</div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-white/80 leading-snug">{c.headline}</div>
              <div className="text-[10px] text-white/30 mt-1 font-mono">n = {c.sample}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-white/5 text-[9px] font-black uppercase tracking-widest text-white/25">
        Computed from 2,95,732 deliveries
      </div>
    </section>
  );
}

function NewsletterRail() {
  return (
    <section className="bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden">
      <header className="px-5 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
        <Mail className="w-4 h-4 text-orange-300" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Newsletters & long reads</h3>
      </header>
      <div className="divide-y divide-white/5">
        {NEWSLETTERS.map(n => (
          <a
            key={n.url}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-4 flex flex-col gap-1.5 hover:bg-white/[0.03] transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] font-black text-white/85 leading-snug group-hover:text-primary transition-colors">{n.name}</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/20 shrink-0 mt-0.5" />
            </div>
            <span className="text-[11px] text-white/40 leading-snug">{n.what}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/25">{n.by}</span>
              <span className="text-white/10">·</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-300/60">{n.cadence}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function FollowRail() {
  return (
    <section className="bg-[#0B1020] border border-white/10 rounded-[24px] overflow-hidden">
      <header className="px-5 py-4 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
        <Globe className="w-4 h-4 text-sky-300" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">Follow the beat</h3>
      </header>
      <div className="divide-y divide-white/5">
        {FOLLOW.map(f => (
          <a
            key={f.url}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3.5 flex items-start gap-3 hover:bg-white/[0.03] transition-colors group"
          >
            <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest shrink-0 mt-0.5 ${KIND_TONE[f.kind]}`}>
              {f.kind}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-black text-white/85 group-hover:text-primary transition-colors truncate">{f.name}</span>
              </div>
              <div className="text-[10px] font-mono text-white/25">{f.handle}</div>
              <div className="text-[10px] text-white/35 leading-snug mt-1">{f.what}</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/20 shrink-0 mt-1" />
          </a>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-white/5 text-[9px] text-white/25 leading-relaxed">
        Every link here was checked to resolve. Accounts that could not be verified were left out.
      </div>
    </section>
  );
}
