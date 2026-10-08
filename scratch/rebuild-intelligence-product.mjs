// Rebuilds /intelligence as a public product for cricket fans.
//
// What goes: the ten-layer architecture, the analyst role mapping and the
// "my analytical lens" framing. That was a portfolio pitch aimed at a hiring
// manager, and a fan landing on it has to read past someone's CV to reach a
// story.
//
// What it becomes: a data-led IPL publication. Live wire on the front, findings
// computed from the ball record, business and media reads, and the sources
// behind all of it.

import fs from "node:fs";

const p = "artifacts/ipl-analytics/src/pages/intelligence.tsx";
// The file is entirely CRLF while every anchor below is written with LF, so
// multi-line matches silently fail. Normalise once, edit, write back as LF.
const CR = String.fromCharCode(13);
let s = fs.readFileSync(p, "utf8").split(CR).join("");

/* ── 1. drop the ten-layer architecture ──────────────────────────────────── */

const dimStart = s.indexOf("interface DimensionDef");
const heroStart = s.indexOf("function Hero(");
if (dimStart < 0 || heroStart < 0) throw new Error("dimension/hero markers not found");
// Back up to the banner comment that precedes the dimensions block.
const cut = s.lastIndexOf("/* ═", dimStart);
const from = cut > 0 && cut > dimStart - 400 ? cut : dimStart;
const heroBanner = s.lastIndexOf("/* ═", heroStart);
const to = heroBanner > 0 && heroBanner > heroStart - 400 ? heroBanner : heroStart;
s = s.slice(0, from) + s.slice(to);
console.log(`removed ${to - from} chars of layer architecture`);

/* ── 2. tabs a reader recognises ─────────────────────────────────────────── */

const tabSubs = [
  [
    `type MainTab = "Newsroom" | "Insights" | "Business" | "Dimensions";`,
    `type MainTab = "Top Stories" | "Data Desk" | "Business" | "Deep Dives" | "Sources";`,
  ],
  [
    `const MAIN_TABS: MainTab[] = ["Newsroom", "Insights", "Business", "Dimensions"];`,
    `const MAIN_TABS: MainTab[] = ["Top Stories", "Data Desk", "Business", "Deep Dives", "Sources"];`,
  ],
  [`  const [tab, setTab] = useState<MainTab>("Newsroom");`, `  const [tab, setTab] = useState<MainTab>("Top Stories");`],
  [
    `  const TAB_ICONS: Record<MainTab, typeof PenSquare> = {
    "Newsroom": Newspaper,
    "Insights": Brain,
    "Business": TrendingUp,
    "Dimensions": Layers,
  };`,
    `  const TAB_ICONS: Record<MainTab, typeof PenSquare> = {
    "Top Stories": Newspaper,
    "Data Desk": BarChart3,
    "Business": TrendingUp,
    "Deep Dives": Brain,
    "Sources": BookOpen,
  };`,
  ],
  [
    `            {tab === "Newsroom" && <NewsroomTab />}
            {tab === "Insights" && <InsightsTab articles={aiArticles} />}
            {tab === "Business" && <BusinessTab articles={businessArticles} />}
            {tab === "Dimensions" && <DimensionsTab />}`,
    `            {tab === "Top Stories" && <NewsroomTab />}
            {tab === "Data Desk" && <DataDeskTab />}
            {tab === "Business" && <BusinessTab articles={businessArticles} />}
            {tab === "Deep Dives" && <InsightsTab articles={aiArticles} />}
            {tab === "Sources" && <ReferencesTab />}`,
  ],
];

for (const [a, b] of tabSubs) {
  if (!s.includes(a)) throw new Error(`tab anchor missing: ${a.slice(0, 60)}`);
  s = s.replace(a, b);
}

/* ── 3. the front-page masthead ──────────────────────────────────────────── */

const oldHeroStart = s.indexOf("function Hero(");
const oldHeroEnd = s.indexOf("\nexport default function IntelligencePage");
if (oldHeroStart < 0 || oldHeroEnd < 0) throw new Error("hero bounds not found");

const newHero = `/**
 * The Data Desk tab: findings computed from the ball-by-ball record.
 *
 * Same cards in two shapes — a swipeable deck for phones and sharing, a read
 * layout for everything else. Each carries the sample it came from, because a
 * number without one is just an opinion with a decimal point.
 */
function DataDeskTab() {
  const feed = useInsightFeed();
  const insights = feed.data?.insights ?? [];
  const articles = feed.data?.articles ?? [];
  const [mode, setMode] = useState<"swipe" | "read">("swipe");

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#0B1020] border border-white/10 rounded-[24px] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <SectionLabel>Our data desk</SectionLabel>
          <p className="text-[13px] text-white/60 leading-relaxed">
            Every IPL delivery ever bowled, read ball by ball — what was bowled, where it went,
            and what it cost. These are the findings that came out of it.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["swipe", "read"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={\`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \${
                mode === m ? "bg-primary text-white" : "bg-white/5 text-white/40 hover:text-white"
              }\`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {feed.isLoading ? (
        <div className="rounded-[24px] border border-white/10 bg-[#0B1020] p-12 text-center text-white/40 font-mono text-sm">
          Reading the ball record…
        </div>
      ) : mode === "swipe" ? (
        <InsightStoryDeck cards={insights} articles={articles} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map(c => (
            <InsightFeedCard
              key={c.id}
              card={c}
              article={c.testsSlug ? articles.find(a => a.slug === c.testsSlug) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Masthead. A publication's front page, not a personal introduction — the
 * numbers shown are the ones a fan would find interesting about the archive
 * itself, and they are counts, not claims.
 */
function Hero() {
  const news = useNews();
  const live = news.data?.statuses.filter(s => s.ok).length ?? 0;
  const total = news.data?.statuses.length ?? 0;
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="relative overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/8" />
      <div className="absolute inset-0 bg-grid-40 opacity-[0.04]" />

      <div className="relative px-6 md:px-10 py-10 md:py-14 flex flex-col gap-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{today}</span>
          {total > 0 && (
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {live} of {total} feeds live
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              The IPL Data Desk
            </span>
          </div>
          <h1 className="text-[38px] md:text-[58px] font-black leading-[0.93] tracking-tight">
            EVERY BALL.<br />
            <span className="text-primary">EVERY STORY.</span>
          </h1>
          <p className="text-[13px] md:text-[15px] text-white/50 leading-relaxed max-w-2xl">
            IPL news, and the numbers underneath it. Live coverage from across the league
            alongside findings read out of every delivery bowled since 2008.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
          {[
            { v: "1,243", l: "Matches" },
            { v: "2,95,732", l: "Deliveries read" },
            { v: "19", l: "Seasons" },
            { v: "1,141", l: "Players" },
          ].map(s => (
            <div key={s.l} className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3">
              <div className="text-[22px] font-black text-white tabular-nums leading-none">{s.v}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

`;

s = s.slice(0, oldHeroStart) + newHero + s.slice(oldHeroEnd + 1);

/* ── 4. imports and the now-unused props ─────────────────────────────────── */

s = s.replace(
  'import { NewsroomTab } from "@/components/newsroom";',
  'import { NewsroomTab } from "@/components/newsroom";\nimport { InsightStoryDeck, InsightFeedCard } from "@/components/insight-reader";',
);
s = s.replace(
  "import { useContentHub, useNews } from \"@/lib/aggregates\";",
  "import { useContentHub, useNews, useInsightFeed } from \"@/lib/aggregates\";",
);
s = s.replace("        <Hero totalPosts={socialPosts.length} />", "        <Hero />");
s = s.replace("  const socialPosts = hub.data?.socialPosts ?? [];\n", "");

fs.writeFileSync(p, s);
console.log("rebuilt as a public product");
console.log("layer refs left:", (s.match(/DimensionsTab|DIMENSIONS|Layer \d/g) || []).length);
