import "./home-editorial.css";
import { MobileHome } from "@/components/mobile-home";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Gavel,
  Users,
  Calendar,
  Bookmark,
  Database,
  Cpu,
  Target,
} from "lucide-react";
import { useTeamTheme, type TeamCode, TEAM_REGISTRY } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { AdVessel } from "@/components/ad-vessel";
import { HUB_EVENTS, HUB_TEAMS } from "@/lib/ipl-2027";
import { fetchOfficialLeague, fetchOfficialRoom, formatPurse } from "@/lib/retention-official-api";
import { getArticleHeroImage } from "@/lib/editorial-images";
import { EditorialImageFigure } from "@/components/dugout/editorial-image-figure";
import { EditorialCoverCanvas } from "@/components/dugout/editorial-cover-canvas";
import editorialArchive from "@/data/editorial/index.json";

const HEADLINES = [
  { prefix: "IPL IS NOT JUST ABOUT", highlight: "CRICKET.", darkColor: "#F9CD05", lightColor: "#D97706" },
  { prefix: "IT'S A", highlight: "PRODUCT.", darkColor: "#06B6D4", lightColor: "#0284C7" },
  { prefix: "A", highlight: "BUSINESS.", darkColor: "#10B981", lightColor: "#059669" },
  { prefix: "IPL - A", highlight: "FESTIVAL.", darkColor: "#EF4444", lightColor: "#DC2626" },
  { prefix: "AN", highlight: "EMOTION.", darkColor: "#818CF8", lightColor: "#4F46E5" },
  { prefix: "A", highlight: "CELEBRATION.", darkColor: "#38BDF8", lightColor: "#0284C7" },
  { prefix: "A", highlight: "BILLION DOLLAR ECOSYSTEM.", darkColor: "#E879F9", lightColor: "#C026D3" },
];

const EXPLORE_COVERAGE_CARDS = [
  { id: "squad", title: "SQUAD HQ", subtitle: "Retentions, releases, squad building & XI", href: "/squad-hq", img: "/milestone-photos/final-2024-kkr.jpg", color: "text-amber-400" },
  { id: "auction", title: "AUCTION ROOM", subtitle: "Player choices, budgets & recruitment", href: "/auction", img: "/auction-art.jpg", color: "text-amber-400" },
  { id: "tactics", title: "MATCH LAB", subtitle: "Playing XI, tactics & opposition", href: "/tactics", img: "/assets/tactical-board-hero.png", color: "text-emerald-400" },
  { id: "venues", title: "VENUE ATLAS", subtitle: "Grounds, conditions & historical trends", href: "/venues", img: "/branding/auth/stadium-sunset-v1.png", color: "text-sky-400" },
  { id: "scout", title: "SCOUT LAB", subtitle: "Discover players, compare roles & build shortlists", href: "/scout", img: "/scout-desk-bg.jpg", color: "text-cyan-400" },
] as const;

const ASPECT_LABELS: Record<string, string> = {
  "batting": "Batting Intelligence",
  "bowling-fielding": "Bowling Telemetry",
  "auction-economics": "Retention & Auction",
  "tactical": "Tactical Modeling",
  "venues": "Venue Conditions",
  "history": "Franchise History",
  "future": "Strategic Outlook",
  "data-science": "Deep Quant Analytics",
};

const FRANCHISE_ORDER: TeamCode[] = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"];
const DHONI_SLUG = "csk-dhoni-retirement-mentor-2027";
const DHONI_FEATURE_UNTIL_MS = new Date("2026-12-01T23:59:59+05:30").getTime();
const SAVED_STORIES_KEY = "cricfield:saved-editorial-slugs";

export interface ArticleArchiveItem {
  id: string;
  slug: string;
  category: string;
  tag: string;
  title: string;
  dek: string;
  date: string;
  publishedDate: string;
  href: string;
  aspect: string;
  franchise: string;
  status: string;
  featured: boolean;
}

const ALL_EDITORIAL_INSIGHTS: ArticleArchiveItem[] = (editorialArchive.articles || []).map((art) => {
  const franchise = art.franchise || "IPL";
  const tag =
    art.aspect === "auction-economics"
      ? "Auction"
      : art.aspect === "batting" || art.aspect === "bowling-fielding" || art.aspect === "tactical"
      ? "Tactics"
      : (art.players && art.players.length > 0)
      ? "Players"
      : (art.aspect === "venues" || art.title.toLowerCase().includes("stadium") || art.title.toLowerCase().includes("ground"))
      ? "Venues"
      : "Teams";

  const dateFormatted = art.publishedDate
    ? new Date(art.publishedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Nov 2026";

  return {
    id: art.id,
    slug: art.slug,
    category: `${franchise} • ${ASPECT_LABELS[art.aspect] || "Editorial Insight"}`,
    tag,
    title: art.title,
    dek: art.dek,
    date: dateFormatted,
    publishedDate: art.publishedDate || "2026-10-26",
    href: `/dugout/articles/${art.slug}`,
    aspect: art.aspect,
    franchise,
    status: art.status || "review",
    featured: Boolean(art.featured),
  };
});

const CATEGORY_TABS = ["All", "Auction", "Tactics", "Players", "Venues", "Teams"] as const;

function ArticleCardMedia({
  articleId,
  franchise,
  title,
  aspect,
  className = "h-44 w-full",
}: {
  articleId: string;
  franchise: string;
  title: string;
  aspect: string;
  className?: string;
}) {
  const heroImage = getArticleHeroImage(articleId);
  const meta = TEAM_REGISTRY[franchise as TeamCode];
  const fallback = (
    <EditorialCoverCanvas
      franchiseName={meta?.name ?? franchise}
      teamCode={franchise}
      parameter={ASPECT_LABELS[aspect] ?? "Editorial"}
      title={title}
      accent={meta?.accent ?? "#00D2FF"}
      aspectRatio="video"
      hideTitle
      className="h-full w-full"
    />
  );

  return (
    <div className={`${className} overflow-hidden relative bg-slate-950 shrink-0`}>
      {heroImage ? (
        <EditorialImageFigure
          image={heroImage}
          variant="hero"
          allowUnpublished={import.meta.env.DEV}
          className="h-full w-full [&_figure]:h-full [&_figure]:m-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export default function HomePage() {
  const { selectedTeam } = useTeamTheme();
  const [captionIdx, setCaptionIdx] = useState(0);
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [savedSlugs, setSavedSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCaptionIdx((prev) => (prev + 1) % HEADLINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const auctionEvent = HUB_EVENTS.find((e) => e.id === "auction");
  const targetDateStr = auctionEvent?.date ?? "2026-12-16";
  const targetTime = useMemo(() => new Date(`${targetDateStr}T10:00:00+05:30`).getTime(), [targetDateStr]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diffMs = Math.max(0, targetTime - nowMs);
  const auctionFinished = nowMs > targetTime + 1000 * 60 * 60 * 12;
  const auctionActiveNow = nowMs >= targetTime && !auctionFinished;
  const timeLeft = {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diffMs / (1000 * 60)) % 60),
    seconds: Math.floor((diffMs / 1000) % 60),
  };

  const activeTeamCode: TeamCode = selectedTeam && TEAM_REGISTRY[selectedTeam] ? selectedTeam : "CSK";
  const activeTheme = TEAM_REGISTRY[activeTeamCode];

  const officialRoomQuery = useQuery({
    queryKey: ["home-retention-official", 2027, activeTeamCode],
    queryFn: () => fetchOfficialRoom(2027, activeTeamCode),
    staleTime: 300_000,
    retry: false,
  });

  const officialLeagueQuery = useQuery({
    queryKey: ["home-retention-league", 2027],
    queryFn: () => fetchOfficialLeague(2027),
    staleTime: 300_000,
    retry: false,
  });

  // Global Featured Editorial (MS Dhoni retirement during featured window, else top franchise story)
  const featuredStory = useMemo(() => {
    const dhoniEntry = ALL_EDITORIAL_INSIGHTS.find((a) => a.slug === DHONI_SLUG);
    const inDhoniWindow = nowMs <= DHONI_FEATURE_UNTIL_MS;
    if (dhoniEntry && dhoniEntry.status === "published" && inDhoniWindow) {
      return {
        isDhoniLead: true,
        articleId: dhoniEntry.id,
        imageLookupId: getArticleHeroImage(dhoniEntry.id) ? dhoniEntry.id : "art-csk-04",
        slug: dhoniEntry.slug,
        href: dhoniEntry.href,
        eyebrow: "FEATURED EDITORIAL",
        tags: ["CSK", "RETROSPECTIVE", "IPL 2027"],
        title: "The Last Time Behind the Stumps",
        dek: "MS Dhoni's playing career ends. The memories, the legacy and Chennai's next chapter remain.",
        date: dhoniEntry.date,
        franchise: "CSK",
      };
    }

    const fallback =
      ALL_EDITORIAL_INSIGHTS.find((a) => a.franchise === activeTeamCode && a.status === "published") ??
      ALL_EDITORIAL_INSIGHTS.find((a) => a.franchise === activeTeamCode) ??
      ALL_EDITORIAL_INSIGHTS[0];

    return {
      isDhoniLead: false,
      articleId: fallback.id,
      imageLookupId: fallback.id,
      slug: fallback.slug,
      href: fallback.href,
      eyebrow: "FEATURED ANALYSIS",
      tags: [fallback.franchise, fallback.tag.toUpperCase()],
      title: fallback.title,
      dek: fallback.dek,
      date: fallback.date,
      franchise: fallback.franchise,
    };
  }, [activeTeamCode, nowMs]);

  const isSaved = savedSlugs.includes(featuredStory.slug);
  const toggleSaveFeatured = () => {
    setSavedSlugs((prev) => {
      const next = prev.includes(featuredStory.slug)
        ? prev.filter((s) => s !== featuredStory.slug)
        : [...prev, featuredStory.slug];
      try {
        localStorage.setItem(SAVED_STORIES_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  // Verified Purse Ranking (top 3 sorted dynamically by remaining verified purse)
  const purseTop3 = useMemo(() => {
    const teams = officialLeagueQuery.data?.teams ?? [];
    return teams
      .filter((t) => typeof t.purse.valueLakh === "number" && t.purse.valueLakh > 0)
      .slice()
      .sort((a, b) => (b.purse.valueLakh ?? 0) - (a.purse.valueLakh ?? 0))
      .slice(0, 3);
  }, [officialLeagueQuery.data]);
  const maxPurseLakh = purseTop3[0]?.purse.valueLakh ?? 12000;

  // Deterministic Latest Insights selector: IPL 2027 Retention Special (10 franchises) on "All"
  const filteredInsights = useMemo(() => {
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    if (selectedCategory === "All") {
      const retentionPicks: ArticleArchiveItem[] = [];
      for (const franchise of FRANCHISE_ORDER) {
        const teamPool = ALL_EDITORIAL_INSIGHTS.filter(
          (a) => a.franchise === franchise && !seenIds.has(a.id) && !seenSlugs.has(a.slug),
        );
        // Deterministic retention priority: explicit retention-mathematics/retention articles first, then auction-economics
        const candidate =
          teamPool.find((a) => /retention/i.test(a.title) || /retention/i.test(a.slug)) ??
          teamPool.find((a) => a.aspect === "auction-economics") ??
          teamPool.find((a) => a.status === "published") ??
          teamPool[0];

        if (candidate) {
          seenIds.add(candidate.id);
          seenSlugs.add(candidate.slug);
          retentionPicks.push(candidate);
        }
      }
      return retentionPicks;
    }

    const cat = selectedCategory.toLowerCase();
    const results: ArticleArchiveItem[] = [];
    for (const ins of ALL_EDITORIAL_INSIGHTS) {
      if (ins.tag.toLowerCase() === cat && !seenIds.has(ins.id) && !seenSlugs.has(ins.slug)) {
        seenIds.add(ins.id);
        seenSlugs.add(ins.slug);
        results.push(ins);
      }
      if (results.length >= 10) break;
    }
    return results;
  }, [selectedCategory]);

  if (isPhone) {
    return (
      <Layout hideRightPanel>
        <MobileHome />
      </Layout>
    );
  }

  const curHeadline = HEADLINES[captionIdx];
  const officialRoom = officialRoomQuery.data;
  const auctionBadgeText = auctionActiveNow
    ? "Underway"
    : auctionFinished
    ? "Complete"
    : auctionEvent?.status === "confirmed"
    ? "Confirmed · Dec 16"
    : "Reported · Dec 16";

  return (
    <Layout hideRightPanel>
      <div className="cricfield-home home-editorial min-h-screen">
        <div className="home-layout-container">
          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 1: HERO & AUCTION COUNTDOWN
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* HERO BANNER (8 cols lg, 9 cols xl) */}
            <div className="lg:col-span-8 xl:col-span-9 home-main-hero min-h-[380px] lg:min-h-[420px] flex relative overflow-hidden rounded-[24px] border border-white/10 bg-[#050C18] shadow-2xl">
              <div className="absolute inset-y-0 right-0 w-full sm:w-[65%] md:w-[60%] lg:w-[58%] pointer-events-none select-none overflow-hidden">
                <div className="w-full h-full relative">
                  <img
                    src="/TITLE BANNER.png"
                    className="w-full h-full object-cover object-[right_top] sm:object-[center_top] transition-transform duration-[12s] hover:scale-105"
                    alt="IPL Champions and Star Players"
                  />
                  <div className="absolute inset-y-0 left-0 w-36 sm:w-60 bg-gradient-to-r from-[#050C18] via-[#050C18]/90 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050C18] via-[#050C18]/70 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050C18]/60 to-transparent" />
                </div>
              </div>

              <div className="home-hero-copy relative z-10 w-full md:w-[70%] lg:w-[64%] xl:w-[60%] flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                <div>
                  <div className="min-h-[110px] sm:min-h-[125px] md:min-h-[140px] flex items-center mb-3">
                    <AnimatePresence mode="wait">
                      <motion.h1
                        key={captionIdx}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="font-black leading-[1.08] text-white uppercase tracking-tight text-2xl sm:text-3xl md:text-[34px] lg:text-[40px] xl:text-[44px] select-none break-words"
                      >
                        {curHeadline.prefix === "IPL IS NOT JUST ABOUT" ? (
                          <span>
                            <span className="text-[#FF6B00]">IPL</span>{" "}
                            <span className="text-white">IS NOT JUST ABOUT</span>{" "}
                            <span className="text-amber-500 font-black inline-block">CRICKET.</span>
                          </span>
                        ) : (
                          <>
                            <span className="text-white">{curHeadline.prefix}</span>{" "}
                            <span
                              className="font-black text-[var(--hl-dark)]"
                              style={{ "--hl-dark": curHeadline.darkColor } as React.CSSProperties}
                            >
                              {curHeadline.highlight}
                            </span>
                          </>
                        )}
                      </motion.h1>
                    </AnimatePresence>
                  </div>

                  <p className="text-slate-300 text-sm md:text-[15px] max-w-[460px] leading-relaxed font-normal">
                    Data-driven insights across sports, business, fans and the IPL economy.
                  </p>
                </div>
              </div>
            </div>

            {/* AUCTION COUNTDOWN CARD (4 cols lg, 3 cols xl) */}
            <aside className="lg:col-span-4 xl:col-span-3 rounded-[24px] border border-white/10 bg-[#081322] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                      <Gavel size={15} />
                    </div>
                    <h2 className="text-xs font-black text-white uppercase tracking-wider truncate">
                      IPL 2027 AUCTION
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300/90 uppercase whitespace-nowrap shrink-0">
                    {auctionBadgeText}
                  </span>
                </div>

                {!auctionActiveNow && !auctionFinished ? (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[
                      { val: timeLeft.days, lbl: "DAYS" },
                      { val: timeLeft.hours, lbl: "HRS" },
                      { val: timeLeft.minutes, lbl: "MIN" },
                      { val: timeLeft.seconds, lbl: "SEC" },
                    ].map((unit) => (
                      <div key={unit.lbl} className="bg-[#0D1B2E] border border-white/10 rounded-xl p-2.5 text-center">
                        <div className="text-xl sm:text-2xl font-black text-white font-mono">
                          {String(unit.val).padStart(2, "0")}
                        </div>
                        <div className="text-[9px] font-mono tracking-wider text-amber-400 font-bold uppercase mt-0.5">
                          {unit.lbl}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#0D1B2E] p-3.5 text-xs text-slate-200">
                    <p className="font-bold text-white">
                      {auctionActiveNow ? "IPL 2027 Auction is underway" : "IPL 2027 Auction concluded"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {auctionActiveNow
                        ? "Follow live signings, remaining purses and squad slots."
                        : "Inspect final signings, squad balances and tactical fits."}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-white/10">
                  <Link
                    href="/retentions"
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                        <Users size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          Retention Tracking
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Official retentions &amp; releases
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  <Link
                    href="/ai-analyst/squad-dna"
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                        <Shield size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                          Squad Needs
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Role gaps for all 10 franchises
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  <Link
                    href="/auction?tab=Player+Pool"
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                        <Gavel size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          Auction Market
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Purse room, slots &amp; pool status
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </div>
              </div>
            </aside>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 2: EXPLORE IPL 2027 COVERAGE (FIVE FINAL CARDS)
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="space-y-3.5 my-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-white/10 pb-2.5">
              <div className="flex items-baseline gap-2.5">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                  Explore IPL 2027 coverage
                </h2>
                <p className="text-xs text-slate-400 hidden md:block">
                  Analyses, stories and tools to help you make sense of the road to the auction.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-3.5">
              {EXPLORE_COVERAGE_CARDS.map((c) => {
                const href =
                  selectedTeam && ["squad", "auction", "tactics"].includes(c.id)
                    ? c.id === "squad"
                      ? `/squad-hq/${selectedTeam}`
                      : `${c.href}?team=${selectedTeam}`
                    : c.href;

                return (
                  <Link
                    key={c.id}
                    href={href}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-[#081220] hover:border-white/30 shadow-xs hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="h-28 overflow-hidden relative bg-slate-900 shrink-0">
                      <img
                        src={c.img}
                        alt={c.title}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between bg-[#081220]">
                      <span className="text-[11px] font-black text-white leading-tight uppercase tracking-wider">
                        {c.title}
                      </span>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <span className="text-[11px] text-white/65 line-clamp-2 leading-snug">{c.subtitle}</span>
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${c.color} transition-transform group-hover:translate-x-0.5`} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 3: FEATURED EDITORIAL, RETENTION TRACKER & AUCTION PURSE WATCH
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* COLUMN 1 (5/12): FEATURED EDITORIAL — MS DHONI RETIREMENT LEAD */}
            <article className="lg:col-span-5 rounded-[24px] border border-white/10 bg-[#081322] overflow-hidden shadow-2xl flex flex-col justify-between group">
              <div className="relative">
                <div className="h-60 w-full overflow-hidden relative bg-slate-950">
                  <ArticleCardMedia
                    articleId={featuredStory.imageLookupId}
                    franchise={featuredStory.franchise}
                    title={featuredStory.title}
                    aspect="future"
                    className="h-60 w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#081322] via-[#081322]/35 to-transparent" />
                  <div className="pointer-events-none absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider text-[#00D2FF] bg-[#081322]/85 border border-[#00D2FF]/40 backdrop-blur-md">
                      {featuredStory.eyebrow}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-3 relative z-10">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {featuredStory.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{featuredStory.date}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight group-hover:text-[#00D2FF] transition-colors">
                    {featuredStory.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {featuredStory.dek}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-4 flex items-center justify-between gap-3 border-t border-white/10">
                <Link
                  href={featuredStory.href}
                  className="inline-flex items-center gap-2 bg-[#00D2FF] text-slate-950 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#00D2FF]/90 transition-all"
                >
                  Read Story <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  aria-label={isSaved ? "Remove from saved stories" : "Save story for later"}
                  aria-pressed={isSaved}
                  onClick={toggleSaveFeatured}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    isSaved
                      ? "border-[#00D2FF]/50 bg-[#00D2FF]/15 text-[#00D2FF]"
                      : "border-white/10 hover:bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <Bookmark size={15} className={isSaved ? "fill-current" : ""} />
                  <span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              </div>
            </article>

            {/* COLUMN 2 (3/12): IPL 2027 RETENTION TRACKER */}
            <section className="lg:col-span-3 rounded-[24px] border border-white/10 bg-[#081322] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5 border shrink-0"
                    style={{
                      borderColor: `${activeTheme?.accent ?? "#38BDF8"}55`,
                      backgroundColor: `${activeTheme?.accent ?? "#38BDF8"}14`,
                    }}
                  >
                    <TeamLogo team={activeTeamCode} className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">
                      IPL 2027 RETENTION TRACKER
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {activeTheme?.name ?? activeTeamCode}
                    </p>
                  </div>
                </div>

                {officialRoomQuery.isPending ? (
                  <div className="space-y-3 mt-5">
                    <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
                  </div>
                ) : officialRoom ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-white/10 bg-[#0D1B2E] p-3.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Retained Players
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-3xl font-black font-mono text-white">
                          {officialRoom.summary.retained}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {officialRoom.summary.tradedIn > 0 ? `+${officialRoom.summary.tradedIn} traded in` : "Official list"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                        <span className="text-slate-400">Remaining Slots</span>
                        <span className="font-mono font-bold text-white">{officialRoom.summary.slots}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                        <span className="text-slate-400">Available Purse</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatPurse(officialRoom.purse.valueLakh)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-slate-400">Overseas Retained</span>
                        <span className="font-mono font-bold text-white">{officialRoom.summary.overseas}</span>
                      </div>
                    </div>

                    <p className="text-[10px] font-mono text-slate-500">
                      Official records · Updated {officialRoom.reviewedAt}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-white/10 bg-[#0D1B2E] p-4 text-xs text-slate-400 space-y-1.5">
                    <p className="font-bold text-slate-200">Retention records incomplete</p>
                    <p>Official 2027 retention ledger for {activeTeamCode} is awaiting verification.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10">
                <Link
                  href={`/squad-hq/${activeTeamCode}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-white/15 hover:bg-white/10 text-xs font-bold text-white uppercase tracking-wider transition-all"
                >
                  Explore Retentions <ArrowRight size={14} />
                </Link>
              </div>
            </section>

            {/* COLUMN 3 (4/12): AUCTION PURSE WATCH */}
            <aside className="lg:col-span-4 rounded-[24px] border border-white/10 bg-[#081322] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      AUCTION PURSE WATCH
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Who has room to rebuild?</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">IPL 2027</span>
                </div>

                {officialLeagueQuery.isPending ? (
                  <div className="space-y-3 mt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : purseTop3.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    {purseTop3.map((row) => {
                      const tTheme = TEAM_REGISTRY[row.team as TeamCode];
                      const purseVal = row.purse.valueLakh ?? 0;
                      const barPct = Math.max(12, Math.min(100, Math.round((purseVal / maxPurseLakh) * 100)));
                      return (
                        <div
                          key={row.team}
                          className="p-3 rounded-2xl bg-[#0D1B2E] border border-white/5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 p-1 shrink-0 flex items-center justify-center">
                                <TeamLogo team={row.team as TeamCode} className="w-full h-full object-contain" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-white">{row.team}</div>
                                <div className="text-[10px] text-slate-400">
                                  {row.summary.slots} open slots
                                  {row.summary.overseasSlots != null ? ` · ${row.summary.overseasSlots} OS` : ""}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
                              {formatPurse(row.purse.valueLakh)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${barPct}%`,
                                backgroundColor: tTheme?.accent ?? "#34D399",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {officialLeagueQuery.data?.reviewedAt && (
                      <p className="text-[10px] font-mono text-slate-500 pt-1">
                        Verified purse ledger · {officialLeagueQuery.data.reviewedAt}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0D1B2E] p-4 text-xs text-slate-400 space-y-1.5">
                    <p className="font-bold text-slate-200">Purse ledger pending</p>
                    <p>Official franchise purses will rank here once verified retention records load.</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10">
                <Link
                  href="/auction"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-white/15 hover:bg-white/10 text-xs font-bold text-white uppercase tracking-wider transition-all"
                >
                  Explore Auction Room <ArrowRight size={14} />
                </Link>
              </div>
            </aside>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              HORIZONTAL ADVERTISEMENT VESSEL
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="my-1">
            <AdVessel
              slot="1029384759"
              format="horizontal"
              minHeight={90}
              label="ADVERTISEMENT"
              className="w-full rounded-2xl overflow-hidden border border-white/10 bg-[#081322]/80"
            />
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 4: LATEST INSIGHTS — IPL 2027 RETENTION SPECIAL
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="space-y-4 my-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Latest Insights
                  </h2>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00D2FF] bg-[#00D2FF]/10 border border-[#00D2FF]/25 px-2.5 py-0.5 rounded-full">
                    IPL 2027 · Retention Special
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-[#081322] border border-white/10 rounded-xl p-1 flex-wrap">
                  {CATEGORY_TABS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-[#00D2FF] text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href="/editorials"
                className="text-xs font-bold text-[#00D2FF] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Explore all stories</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredInsights.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-[#081322] overflow-hidden hover:border-white/25 hover:bg-[#0D1C2E] transition-all flex flex-col group shadow-lg"
                >
                  <div className="relative">
                    <ArticleCardMedia
                      articleId={item.id}
                      franchise={item.franchise}
                      title={item.title}
                      aspect={item.aspect}
                      className="h-40 w-full"
                    />
                    <div className="pointer-events-none absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider text-[#00D2FF] bg-slate-950/85 border border-[#00D2FF]/30 backdrop-blur-sm">
                        {item.franchise}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                        {ASPECT_LABELS[item.aspect] || item.tag}
                      </span>
                      <h3 className="font-bold text-sm leading-snug text-white group-hover:text-[#00D2FF] transition-colors line-clamp-3 mb-3">
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      <Calendar size={12} className="text-slate-500" />
                      <span>{item.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 5: WHY CRICFIELD?
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="rounded-[24px] border border-white/10 bg-gradient-to-r from-[#06101D] via-[#091527] to-[#06101D] p-6 sm:p-8 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 space-y-2 lg:border-r border-white/10 lg:pr-6">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Why CricField?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  A cricket intelligence platform that goes beyond scores — into strategy, talent, context and decisions.
                </p>
              </div>

              <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Database size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Multi-league Data</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    IPL, domestic &amp; global
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Cpu size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Evidence-Backed Models</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Tactical, predictive &amp; contextual
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Scout-Grade Analysis</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Players, roles &amp; market value
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Target size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Franchise Ready</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Squad, auction &amp; season planning
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
