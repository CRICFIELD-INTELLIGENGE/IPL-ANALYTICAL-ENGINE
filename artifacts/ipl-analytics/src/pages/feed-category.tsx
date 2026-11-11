import { lazy, useMemo } from "react";
import { Link, useRoute, useLocation, useSearch, Redirect } from "wouter";
import { ArrowLeft, ArrowRight, Radio } from "lucide-react";
import { Layout } from "@/components/layout";
import { getV2Index } from "@/lib/editorial-v2";
import { HUB_TEAMS } from "@/lib/ipl-2027";
import { CARDS, type CardId } from "./feed";
import { NewsCard, newsroomOrder } from "@/components/feed-newsroom";
import { CATEGORY_TOOL } from "@/components/replay-tools";
import FeedAuctionPage from "./feed-auction";
import FeedTacticsPage from "./feed-tactics";
import FeedVenuesPage from "./feed-venues";
import FeedStarsPage from "./feed-stars";
const FeedStorylinesPage = lazy(() => import("./feed-storylines"));

interface CategoryDef {
  kicker: string;
  title: string;
  tagline: string;
  tool: { label: string; desc: string; href: string; teamAware: boolean };
  // Which editorial articles belong here: by aspect, optionally narrowed by title.
  aspects: string[];
  titleMatch?: RegExp;
}

const CATEGORIES: Record<CardId, CategoryDef> = {
  squad: {
    kicker: "Squad Building",
    title: "The Retention Room",
    tagline: "Who stays, who leaves, what's missing?",
    tool: { label: "Retention Lab", desc: "Model retain/release calls against each squad", href: "/feed/ipl-2027?module=retention", teamAware: true },
    aspects: ["future", "scouting"],
    titleMatch: /retain|retention|core|squad|blueprint|next opener|role-fit|undervalued/i,
  },
  auction: {
    kicker: "Auction",
    title: "The Auction Blueprint",
    tagline: "Where should the money go?",
    tool: { label: "Squad Gap Analyzer", desc: "Role depth, slots and priorities per franchise", href: "/feed/ipl-2027?module=gaps", teamAware: true },
    aspects: ["auction-economics"],
  },
  tactics: {
    kicker: "Tactics",
    title: "The Tactical Board",
    tagline: "What style of cricket is each team building?",
    tool: { label: "Scout & Tactics", desc: "Phase strengths and matchup weaknesses", href: "/feed/ipl-2027?module=tools", teamAware: true },
    aspects: ["tactical"],
  },
  stars: {
    kicker: "Star Watch",
    title: "The Scout Files",
    tagline: "The next big auction opportunity",
    tool: { label: "Global Scout Engine", desc: "Role-based candidates across leagues", href: "/scout", teamAware: false },
    aspects: ["scouting"],
  },
  venues: {
    kicker: "Venues",
    title: "Home Ground Advantage",
    tagline: "Build for where you play",
    tool: { label: "Conditions Explorer", desc: "Scoring, pace and spin trends by ground", href: "/visualizations", teamAware: false },
    aspects: ["batting", "bowling-fielding", "tactical", "future", "data-science"],
    titleMatch: /venue|ground|pitch|home|chinnaswamy|wankhede|chepauk|eden|kotla|conditions/i,
  },
  storylines: {
    kicker: "Storylines",
    title: "Beyond the Numbers",
    tagline: "The narratives shaping IPL 2027",
    tool: { label: "Franchise Brief", desc: "Each franchise's open questions for 2027", href: "/feed/ipl-2027?module=brief", teamAware: true },
    aspects: ["history", "fan-culture"],
  },
};

export default function FeedCategoryPage({ params }: { params?: { category?: string } } = {}) {
  const [match, routeParams] = useRoute("/feed/:category");
  const [location] = useLocation();
  const search = useSearch();
  const team = new URLSearchParams(search).get("team")?.toUpperCase();

  const rawCat = params?.category || routeParams?.category || (location.includes("/feed/") ? location.split("/feed/")[1]?.split(/[?#]/)[0] : "");
  const category = (rawCat || "").toLowerCase() as CardId;

  const def = CATEGORIES[category];
  const card = CARDS.find((c) => c.id === category);

  const articles = useMemo(() => {
    if (!def) return [];
    const own = getV2Index()
      .filter((a) => def.aspects.includes(a.aspect) && (!def.titleMatch || def.titleMatch.test(a.title)))
      .filter((a) => !team || a.franchise === team);
    return newsroomOrder(own).slice(0, 12);
  }, [def, team]);

  if (category === "auction") return <FeedAuctionPage />;
  if (category === "tactics") return <FeedTacticsPage />;
  if (category === "venues") return <FeedVenuesPage />;
  if (category === "stars") return <FeedStarsPage />;
  if (category === "storylines") return <FeedStorylinesPage />;

  if (!def || !card) return <Redirect to="/feed" />;
  const Tool = CATEGORY_TOOL[category];
  const toolHref = (t?: string) =>
    def.tool.teamAware && t ? `${def.tool.href}&team=${t}` : def.tool.href;

  return (
    <Layout>
      <div className="space-y-5 p-4 bg-[#050816] min-h-screen">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> IPL 2027 Feed
        </Link>

        {/* HERO */}
        <section className="relative rounded-[24px] border border-white/10 overflow-hidden min-h-[220px] flex items-end p-6">
          <img src={card.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/80 to-transparent" />
          <div className="relative z-10">
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${card.color}`}>
              IPL 2027 / {def.kicker}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white mt-1">{def.title}</h1>
            <p className="text-white/60 text-sm mt-2">{def.tagline}</p>
          </div>
        </section>

        {/* LEAD + SECONDARY STORIES */}
        {articles.length === 0 ? (
          <p className="text-sm text-white/50">No published stories in this section{team ? ` for ${team}` : ""} yet.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            {articles.slice(0, 3).map((a, i) => <NewsCard key={a.id} entry={a} lead={i === 0} />)}
          </div>
        )}

        {/* FEATURED INTERACTIVE */}
        {Tool && <Tool />}

        {/* LATEST */}
        {articles.length > 3 && (
          <section>
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Latest</h2>
            <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
              {articles.slice(3).map((a) => (
                <li key={a.id}>
                  <Link href={`/dugout/articles/${a.slug}`} className="flex flex-col gap-0.5 p-3 hover:bg-white/[0.03]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{a.franchise} · {a.readMinutes} min read</span>
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FRANCHISE COVERAGE */}
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Franchise coverage</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/feed/${category}`}
              aria-current={!team ? "page" : undefined}
              className={`px-3 py-1.5 rounded-lg border text-xs font-black ${!team ? "bg-white text-black border-white" : "border-white/15 text-white/70 hover:border-white/40"}`}
            >
              ALL
            </Link>
            {HUB_TEAMS.map((t) => (
              <Link
                key={t}
                href={`/feed/${category}?team=${t}`}
                aria-current={team === t ? "page" : undefined}
                className={`px-3 py-1.5 rounded-lg border text-xs font-black ${team === t ? "bg-white text-black border-white" : "border-white/15 text-white/70 hover:border-white/40"}`}
              >
                {t}
              </Link>
            ))}
            {team && <Link href={`/dugout/${team.toLowerCase()}`} className="self-center text-xs text-primary ml-1">{team} Dugout</Link>}
          </div>
        </section>

        {/* RELATED CRICFIELD TOOL */}
        <Link
          href={toolHref(team)}
          className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 hover:bg-primary/15 transition-colors"
        >
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-primary">Related CricField tool</div>
            <div className="text-lg font-black text-white">{def.tool.label}</div>
            <div className="text-xs text-white/60">{def.tool.desc}</div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary shrink-0" />
        </Link>

        {/* PULSE CONNECTION */}
        <Link
          href="/pulse#auction"
          className="flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 hover:bg-pink-500/15 transition-colors"
        >
          <Radio className="w-5 h-5 text-pink-400 shrink-0" />
          <div className="flex-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-pink-400">Connected to Pulse</div>
            <div className="text-sm font-bold text-white">Follow confirmed auction developments</div>
          </div>
          <ArrowRight className="w-4 h-4 text-pink-400" />
        </Link>
      </div>
    </Layout>
  );
}
