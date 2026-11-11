import "./home-editorial.css";
import { MobileHome } from "@/components/mobile-home";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Activity,
  BarChart2,
  Trophy,
  Shield,
  Compass,
  Gavel,
} from "lucide-react";
import { useTeamTheme } from "@/lib/team-context";
import { useLiveIplMatches, getMatchScoreLine } from "@/lib/live";
import {
  useSeasons,
  useSeasonTops,
  usePlayerDisplayNames,
  displayPlayerName,
  teamShort,
} from "@/lib/aggregates";
import { TeamLogo } from "@/components/team-logo";
import { AdVessel } from "@/components/ad-vessel";
import { hasAds } from "@/lib/analytics";
import { HUB_EVENTS } from "@/lib/ipl-2027";

const HomeInsights = React.lazy(() => import("@/components/home-insights"));

const HEADLINES = [
  { prefix: "IPL IS NOT JUST ABOUT", highlight: "CRICKET.", color: "#F9CD05" },
  { prefix: "IT'S A", highlight: "PRODUCT.", color: "#06B6D4" },
  { prefix: "A", highlight: "BUSINESS.", color: "#10B981" },
  { prefix: "IPL - A", highlight: "FESTIVAL.", color: "#EF4444" },
  { prefix: "AN", highlight: "EMOTION.", color: "#818CF8" },
  { prefix: "A", highlight: "CELEBRATION.", color: "#38BDF8" },
  { prefix: "A", highlight: "BILLION DOLLAR ECOSYSTEM.", color: "#E879F9" },
];

const daysUntil = (date: string | null) => {
  if (!date) return null;
  return Math.ceil((Date.parse(date) - Date.parse(new Date().toLocaleDateString("en-CA"))) / 86_400_000);
};

export default function HomePage() {
  const { selectedTeam } = useTeamTheme();
  const [captionIdx, setCaptionIdx] = useState(0);
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Smoothly rotate the headline without causing layout shifts
  useEffect(() => {
    const timer = setInterval(() => {
      setCaptionIdx((prev) => (prev + 1) % HEADLINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const insightsSectionRef = useRef<HTMLDivElement>(null);
  const scrollToInsights = () => {
    if (insightsSectionRef.current) {
      insightsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const liveMatches = useLiveIplMatches();
  const liveMatch = liveMatches.data?.matches?.find((m) => /progress|innings/i.test(m.matchInfo.state));
  const auction = HUB_EVENTS.find((e) => e.id === "auction");

  if (isPhone) {
    return (
      <Layout hideRightPanel>
        <MobileHome />
      </Layout>
    );
  }

  const curHeadline = HEADLINES[captionIdx];

  return (
    <Layout hideRightPanel>
      <div className="cricfield-home home-editorial min-h-screen">
        <div className="home-layout-container">
          {/* ── ROW 1: HERO BANNER & SEASON HONOURS SIDEBAR ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* HERO BANNER */}
            <div className="lg:col-span-8 xl:col-span-9 home-main-hero min-h-[380px] lg:min-h-[420px] flex relative overflow-hidden">
              {/* IMAGE SIDE (RIGHT) */}
              <div className="absolute inset-y-0 right-0 w-full sm:w-[65%] md:w-[60%] lg:w-[58%] pointer-events-none select-none overflow-hidden">
                <div className="w-full h-full relative">
                  <img
                    src="/TITLE BANNER.png"
                    className="w-full h-full object-cover object-[right_top] sm:object-[center_top] transition-transform duration-[10s] hover:scale-105"
                    alt="IPL Champions and Star Players"
                  />
                  {/* Blending gradients */}
                  <div className="absolute inset-y-0 left-0 w-32 sm:w-56 bg-gradient-to-r from-[#050b14] via-[#050b14]/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050b14] via-[#050b14]/60 to-transparent" />
                </div>
              </div>

              {/* TEXT CONTENT (LEFT) */}
              <div className="home-hero-copy relative z-10 w-full md:w-[65%] lg:w-[58%] flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div>
                  {/* Fixed min-height headline box prevents vertical jumping */}
                  <div className="h-[105px] sm:h-[120px] md:h-[135px] flex items-center mb-3 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.h1
                        key={captionIdx}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="font-black leading-[1.08] text-white uppercase tracking-tight text-3xl sm:text-4xl md:text-5xl"
                      >
                        {curHeadline.prefix === "IPL IS NOT JUST ABOUT" ? (
                          <>
                            <span className="animate-ipl-glow">IPL</span>{" "}
                            <span className="text-white/80">IS NOT JUST ABOUT</span>{" "}
                            <br />
                            <span style={{ color: curHeadline.color }}>CRICKET.</span>
                          </>
                        ) : (
                          <>
                            <span className="text-white/80">{curHeadline.prefix}</span>{" "}
                            <span style={{ color: curHeadline.color }}>{curHeadline.highlight}</span>
                          </>
                        )}
                      </motion.h1>
                    </AnimatePresence>
                  </div>

                  <p className="text-slate-300 text-sm md:text-[15px] max-w-[440px] leading-relaxed mb-6 font-normal">
                    Data-driven insights across sports, business, fans and the IPL economy.
                  </p>
                </div>

                {/* CALL TO ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={scrollToInsights}
                    className="flex items-center gap-2 bg-primary text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    Explore Insights <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link href="/feed">
                    <button className="flex items-center gap-2 bg-white/10 border border-white/15 text-white font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl hover:bg-white/20 transition-all hover:scale-[1.02] cursor-pointer">
                      Feed <Activity className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: SEASON HONOURS & FRANCHISE SPOTLIGHT */}
            <aside className="lg:col-span-4 xl:col-span-3 reference-scores flex flex-col justify-between gap-4">
              <div>
                <div className="reference-heading">
                  <h2>{liveMatch ? "Scores" : "Season Honours"}</h2>
                  <Link href="/scores">View all →</Link>
                </div>

                {liveMatch ? (
                  <Link href="/scores" className="reference-live-match block">
                    <span className="reference-kicker">MATCH IN PROGRESS</span>
                    <div className="flex justify-between items-center mt-3">
                      {[liveMatch.matchInfo.team1, liveMatch.matchInfo.team2].map((t) => (
                        <div key={t.teamId} className="flex items-center gap-2">
                          <TeamLogo team={t.teamSName} />
                          <strong className="block text-sm">{t.teamSName}</strong>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-200">
                      {getMatchScoreLine(liveMatch).team1} · {getMatchScoreLine(liveMatch).team2}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{liveMatch.matchInfo.status}</p>
                  </Link>
                ) : (
                  <div className="reference-champion">
                    <div className="flex justify-between items-center">
                      <span className="reference-kicker">IPL 2026 · CHAMPIONS</span>
                      <Trophy size={20} className="text-amber-400" />
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <TeamLogo team="RCB" />
                      <div>
                        <h3 className="text-lg font-black text-white">RCB</h3>
                        <p className="text-xs text-slate-300">Royal Challengers Bengaluru</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs sm:text-sm font-semibold text-white">
                      Back-to-back champions.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Defeated Gujarat Titans by 5 wickets in the 2026 final.
                    </p>
                    <div className="flex justify-between mt-3 text-xs pt-1 border-t border-white/10">
                      <Link href="/dugout/RCB" className="text-red-400 font-semibold hover:underline">
                        Explore RCB →
                      </Link>
                      <a
                        href="https://www.royalchallengers.com/rcb-cricket-news/news/rcb-crowned-as-ipl-2026-champions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Final report ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* FRANCHISE IN FOCUS CARD - REPLACES EMPTY SPACE */}
              <div className="reference-franchise-focus">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-sky-400" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">
                      Franchise in Focus
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-400/30">
                    {selectedTeam || "IPL 2026"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug mb-3">
                  Deep-dive into {selectedTeam ? `${selectedTeam}'s` : "all franchise"} squads, tactical balance, and season timelines.
                </p>
                <Link
                  href={selectedTeam ? `/dugout/${selectedTeam}` : "/dugout"}
                  className="inline-flex items-center justify-between w-full text-xs font-semibold text-sky-400 hover:text-white transition-colors"
                >
                  <span>Open Dugout Hub</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </aside>
          </section>

          {/* ── ROW 2: TOP STORY & AUCTION PULSE ── */}
          <section ref={insightsSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* TOP STORY (7 cols lg, 8 cols xl) */}
            <div className={`reference-stories ${hasAds ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-7 xl:col-span-8"} flex flex-col`}>
              <div className="reference-heading">
                <div className="flex items-baseline gap-2.5">
                  <h2>Top Story</h2>
                  <p className="hidden md:block text-xs text-slate-400">Analysis. Opinions. The stories behind the game.</p>
                </div>
                <Link href="/feed">View all stories →</Link>
              </div>
              <div className="flex-1 min-h-[320px]">
                <React.Suspense
                  fallback={
                    <div className="p-8 text-center text-xs text-slate-400 bg-[#081622] rounded-xl border border-[#19303c]">
                      Loading stories…
                    </div>
                  }
                >
                  <HomeInsights team={selectedTeam} limit={1} />
                </React.Suspense>
              </div>
            </div>

            {/* AUCTION PULSE (5 cols lg, 4 cols xl) */}
            <aside className={`reference-auction ${hasAds ? "lg:col-span-5 xl:col-span-4" : "lg:col-span-5 xl:col-span-4"} flex flex-col justify-between`}>
              <div>
                <div className="reference-heading">
                  <h2>IPL 2027 Auction Pulse</h2>
                  <Link href="/pulse" aria-label="Open Auction Pulse">
                    ↗
                  </Link>
                </div>

                <div className="reference-countdown">
                  <span className="reference-kicker">
                    PLAYER AUCTION · {auction?.status === "confirmed" ? "CONFIRMED" : "REPORTED DATE"}
                  </span>
                  <strong>
                    {daysUntil(auction?.date ?? null) == null
                      ? "Date TBA"
                      : `${Math.max(0, daysUntil(auction?.date ?? null)!)} days`}
                  </strong>
                  <small>{auction?.date ?? "Awaiting announcement"}</small>
                </div>

                <div className="reference-auction-links flex flex-col gap-1 my-2">
                  {[
                    ["Retention tracker", "Confirmed updates and coverage", "/feed/ipl-2027/retentions"],
                    ["Player market", "Historical results and available player pools", "/pulse"],
                    ["Franchise needs", "Role balance and squad depth", "/ai-analyst/squad-dna"],
                    ["Auction news & analysis", "Stories behind the decisions", "/feed/auction"],
                  ].map(([title, desc, href]) => (
                    <Link key={href} href={href} className="reference-auction-link">
                      <Gavel size={16} />
                      <span>
                        {title}
                        <small>{desc}</small>
                      </span>
                      <ArrowUpRight size={13} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="reference-auction-prep mt-3">
                <div className="flex items-center gap-2">
                  <Shield size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Your auction starts here</span>
                </div>
                <p>Who stays? Who makes room? Build your retention plan before exploring the player market.</p>
                <Link href="/feed/squad">
                  Enter the Retention Room <ArrowUpRight size={14} />
                </Link>
                <span className="block text-[9px] text-slate-400 mt-1.5">
                  Your picks are simulations, separate from official decisions.
                </span>
              </div>
            </aside>

            {/* ADVERTISEMENT (ONLY RENDERED IF ADS ARE CONFIGURED & ENABLED) */}
            {hasAds && (
              <aside className="lg:col-span-12 reference-home-ad" aria-label="Advertisement">
                <AdVessel slot="5938201746" format="horizontal" label="Advertisement" className="h-full" />
              </aside>
            )}
          </section>

          {/* ── ROW 3: EXPLORE CRICFIELD TOOLS ── */}
          <section className="reference-tools">
            <div className="reference-heading">
              <div className="flex items-baseline gap-2.5">
                <h2>Explore CricField</h2>
                <p className="hidden md:block text-xs text-slate-400">Tools, data and insights for every cricket mind.</p>
              </div>
              <Link href="/ai-analyst">All tools →</Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {[
                { name: "Scout Lab", desc: "Player research across leagues", href: "/scout", icon: Compass, color: "#68ed9c" },
                { name: "Tactical Matrix", desc: "Strategy and matchups", href: "/ai-analyst/opposition-map", icon: Activity, color: "#3ccff4" },
                { name: "Squad DNA", desc: "Roles, balance and depth", href: "/ai-analyst/squad-dna", icon: Shield, color: "#ee9b65" },
                { name: "Player Intelligence", desc: "Compare player profiles", href: "/ai-analyst/player-pool", icon: BarChart2, color: "#c69af5" },
                { name: "Venue Intelligence", desc: "Grounds and conditions", href: "/feed/venues", icon: MapPin, color: "#37d3bd" },
                { name: "Auction War Room", desc: "Price context and squad needs", href: "/ai-analyst/auction-war-room", icon: Gavel, color: "#edcd64" },
              ].map((t) => (
                <Link key={t.href} href={t.href} className="reference-tool">
                  <div className="flex justify-between items-center mb-2">
                    <t.icon size={22} style={{ color: t.color }} />
                    <ArrowUpRight size={13} className="text-slate-400" />
                  </div>
                  <h3>{t.name}</h3>
                  <p>{t.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
