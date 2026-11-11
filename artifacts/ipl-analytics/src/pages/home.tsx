import "./home-editorial.css";
import { MobileHome } from "@/components/mobile-home";
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { Brain, Sparkles, ArrowRight, ArrowUpRight, MapPin, Flame, TrendingUp, ChevronLeft, ChevronRight, Activity, BarChart2, Trophy, Shield, ExternalLink, Play, Compass, Gavel } from "lucide-react";
import { SmartFilters } from "@/components/smart-filters";
import { useTeamTheme } from "@/lib/team-context";
import {
  useLiveIplMatches, getMatchScoreLine
} from "@/lib/live";
import {
  useSeasons, useSeasonTops, usePlayerDisplayNames, displayPlayerName, teamShort
} from "@/lib/aggregates";
import { TeamLogo } from "@/components/team-logo";
import { AdVessel } from "@/components/ad-vessel";
import { PlayerAvatar } from "@/components/player-avatar";
import { HUB_EVENTS } from "@/lib/ipl-2027";

const HomeInsights = React.lazy(() => import("@/components/home-insights"));

// IPL 2027 storylines: each opens the page that covers it (Pulse, Feed, Dugout).
const TRENDING_2027 = [
  { title: "Retention deadline: who stays, who goes?", sub: "Retentions list", href: "/feed/ipl-2027/retentions" },
  { title: "The purse race before the auction", sub: "Auction Pulse", href: "/pulse" },
  { title: "Pick your keepers in the Retention Room", sub: "Feed · Squad Building", href: "/feed/squad" },
  { title: "Does CSK's auction philosophy deliver?", sub: "Dugout · Auction Economics", href: "/articles/csk-experience-as-an-asset-does-csks-auction-philosophy-deliver-value" },
];

const daysUntil = (date: string | null) => {
  if (!date) return null;
  return Math.ceil((Date.parse(date) - Date.parse(new Date().toLocaleDateString("en-CA"))) / 86_400_000);
};

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const { selectedTeam } = useTeamTheme();
  const [capIdx, setCapIdx] = useState(0);
  const [selYear, setSelYear] = useState("2026");
  const [selTeam, setSelTeam] = useState("");
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const heroScrollRef = React.useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const ask = (q: string) => { if (q.trim()) navigate(`/ai-analyst/ask?q=${encodeURIComponent(q.trim())}`); };

  const liveMatches = useLiveIplMatches();
  const seasonTops = useSeasonTops();
  const seasons = useSeasons();
  const displayNames = usePlayerDisplayNames();

  // Leaders come from the ball-by-ball season aggregates, so the card (and its photo) follows the slicer.
  const CAPS = useMemo(() => {
    const tops = seasonTops.data?.[selYear];
    const inTeam = (t?: string) => !selTeam || teamShort(t) === selTeam;
    const bat = (tops?.topBatters ?? []).filter(b => inTeam(b.teamName ?? b.team));
    const bowl = (tops?.topBowlers ?? []).filter(b => inTeam(b.teamName ?? b.team));
    const best = <T,>(xs: T[], score: (x: T) => number) => xs.reduce<T | undefined>((a, x) => (!a || score(x) > score(a) ? x : a), undefined);
    const prefix = selTeam ? `${selTeam} · ` : "";
    const rows = [
      [best(bat, b => b.runs), selTeam ? "Top run-scorer" : "Orange Cap", (b: any) => b.runs, "Runs", "#F9CD05"],
      [best(bowl, b => b.wickets), selTeam ? "Top wicket-taker" : "Purple Cap", (b: any) => b.wickets, "Wickets", "#8B5CF6"],
      [best(bat, b => b.sixes), "Most sixes (top-10 scorers)", (b: any) => b.sixes, "Sixes", "#F97316"],
      [best(bowl, b => -b.econ), "Best economy (top-10 wicket-takers)", (b: any) => b.econ.toFixed(2), "Economy", "#3B82F6"],
    ] as const;
    return rows.filter(([p]) => p).map(([p, label, value, unit, color]) => ({
      label: prefix + label, player: displayPlayerName(p!.player, displayNames), statsName: p!.player,
      team: teamShort(p!.teamName ?? p!.team), teamName: p!.teamName ?? p!.team ?? null, value: String(value(p)), unit, color,
    }));
  }, [seasonTops.data, selYear, selTeam, displayNames]);

  const seasonRow = seasons.data?.find(s => s.season === selYear);
  const STATS = seasonRow ? [
    { label: "Matches", value: seasonRow.matches.toLocaleString("en-IN"), sub: "Played" },
    { label: "Runs", value: seasonRow.runs.toLocaleString("en-IN"), sub: "This Season" },
    { label: "High Total", value: String(seasonRow.highestTotal), sub: "Team innings" },
    { label: "Sixes", value: seasonRow.sixes.toLocaleString("en-IN"), sub: "This Season" },
    { label: "Wickets", value: seasonRow.wickets.toLocaleString("en-IN"), sub: "This Season" },
  ] : [];
  const cap = CAPS[Math.min(capIdx, CAPS.length - 1)];

  // Only a match actually in progress takes over the card; otherwise it counts down to IPL 2027.
  const liveMatch = liveMatches.data?.matches?.find(m => /progress|innings/i.test(m.matchInfo.state));
  const retention = HUB_EVENTS.find(e => e.id === "retention"), auction = HUB_EVENTS.find(e => e.id === "auction");

  const scrollToInsights = () => {
    const el = heroScrollRef.current;
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight - window.innerHeight, behavior: "smooth" });
  };

  const headerProgress = useTransform(scrollYProgress, [0, 0.08], [0, 1]);

  // Proportional master scale ensures all 3 rows fit cleanly on screen without cut-off
  const masterScale = useTransform(scrollYProgress, [0.45, 0.82, 1], [1, 0.88, 0.88]);

  const heroH = useTransform(scrollYProgress, [0, 0.32, 1], ["100%", "41%", "41%"]);
  const heroW = useTransform(scrollYProgress, [0, 0.15, 0.35, 1], ["100%", "100%", "calc(100% - 312px)", "calc(100% - 312px)"]);
  const col2W = useTransform(scrollYProgress, [0.15, 0.35, 1], ["0px", "240px", "240px"]);
  const col3W = useTransform(scrollYProgress, [0.15, 0.35, 1], ["0px", "300px", "300px"]);
  const titleSz = useTransform(scrollYProgress, [0, 0.28, 1], ["72px", "24px", "24px"]);
  const padTop = useTransform(scrollYProgress, [0, 0.28, 1], ["10%", "5%", "5%"]);
  const padLeft = useTransform(scrollYProgress, [0, 0.28, 1], ["6%", "5%", "5%"]);
  const subtitleOp = useTransform(scrollYProgress, [0, 0.20, 0.8, 1], [1, 0, 0, 0]);
  const ctaOp = useTransform(scrollYProgress, [0, 0.22, 0.8, 1], [1, 0, 0, 0]);
  const titleOp = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0]);
  const bannerOp = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 1]);

  // Calibrated Caption pacing: even intervals provide smooth, readable transitions without skipping
  const [scrollCaption, setScrollCaption] = useState("IPL IS NOT JUST ABOUT CRICKET.");
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.12) setScrollCaption("IPL IS NOT JUST ABOUT CRICKET.");
    else if (v < 0.22) setScrollCaption("IT'S A PRODUCT.");
    else if (v < 0.32) setScrollCaption("A BUSINESS.");
    else if (v < 0.42) setScrollCaption("IPL - A FESTIVAL.");
    else if (v < 0.52) setScrollCaption("AN EMOTION.");
    else if (v < 0.62) setScrollCaption("A CELEBRATION.");
    else setScrollCaption("A BILLION DOLLAR ECOSYSTEM.");
  });

  const r1Op = useTransform(scrollYProgress, [0.14, 0.32, 1], [0, 1, 1]);
  const r1X = useTransform(scrollYProgress, [0.14, 0.32, 1], [20, 0, 0]);
  const r2Op = useTransform(scrollYProgress, [0.28, 0.50, 1], [0, 1, 1]);
  const r2Y = useTransform(scrollYProgress, [0.28, 0.50, 1], [40, 0, 0]);
  const r3Op = useTransform(scrollYProgress, [0.46, 0.70, 1], [0, 1, 1]);
  const r3Y = useTransform(scrollYProgress, [0.46, 0.70, 1], [50, 0, 0]);

  if (isPhone) return <Layout hideRightPanel><MobileHome /></Layout>;

  return (
    <Layout hideHeaderProgress={headerProgress} hideRightPanel>
      <div className="cricfield-home home-editorial">
      <div ref={heroScrollRef} style={{ height: isPhone ? "auto" : "295vh" }}>
        <motion.div
          style={{ scale: isPhone ? 1 : masterScale, transformOrigin: "center top" }}
          className={`home-scroll-canvas ${isPhone ? "relative min-h-screen overflow-visible pb-10" : "sticky top-0 w-full h-screen overflow-y-auto lg:overflow-hidden"} flex flex-col gap-2.5 bg-[#050816] p-2.5 pb-2`}
        >

          {/* ROW 1 */}
          <motion.div style={{ height: heroH }} className="flex gap-2.5 shrink-0 min-h-0">
            {/* HERO */}
            <motion.div style={{ width: heroW }} className="home-main-hero relative bg-[#050816] rounded-[24px] border border-white/10 overflow-hidden shrink-0 group flex">
              {/* IMAGE SIDE (RIGHT) */}
              <div className="absolute inset-0 flex justify-end">
                <motion.div 
                  style={{ opacity: bannerOp }}
                  className="w-[60%] h-full relative"
                >
                  <motion.img 
                    src="/TITLE BANNER.png" 
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-[12s]" 
                    alt="Cricket stadium artwork" 
                  />
                  {/* Seamless blending gradients */}
                  <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#050816] to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050816]/80 via-transparent to-transparent" />
                </motion.div>
              </div>

              {/* TEXT CONTENT (LEFT) */}
              <motion.div style={{ paddingTop: padTop, paddingLeft: padLeft, opacity: titleOp }} className="home-hero-copy relative z-10 h-full flex flex-col w-[45%]">
                <motion.h1 style={{ fontSize: titleSz }} className="font-black leading-[1.05] text-white uppercase tracking-tight mb-4 origin-left">
                  {scrollCaption === "IPL IS NOT JUST ABOUT CRICKET." ? (
                    <><span className="animate-ipl-glow">IPL</span><span className="opacity-15"> IS NOT JUST ABOUT</span> <br /><span className="text-[#F9CD05]">CRICKET.</span></>
                  ) : scrollCaption === "IT'S A PRODUCT." ? (
                    <><span className="opacity-15">IT'S A </span><span className="text-[#06B6D4]">PRODUCT.</span></>
                  ) : scrollCaption === "A BUSINESS." ? (
                    <><span className="opacity-15">A </span><span className="text-[#10B981]">BUSINESS.</span></>
                  ) : scrollCaption === "IPL - A FESTIVAL." ? (
                    <><span className="opacity-15">A </span><span className="text-[#FF0000]">FESTIVAL.</span></>
                  ) : scrollCaption === "AN EMOTION." ? (
                    <><span className="opacity-15">AN </span><span className="text-[#6366F1]">EMOTION.</span></>
                  ) : scrollCaption === "A CELEBRATION." ? (
                    <><span className="opacity-15">A </span><span className="text-[#0077FF]">CELEBRATION.</span></>
                  ) : (
                    <><span className="opacity-15">A </span><span className="text-[#D946EF]">BILLION DOLLAR ECOSYSTEM.</span></>
                  )}
                </motion.h1>
                <motion.p className="text-white/50 text-[13px] max-w-[420px] mb-7">Data-driven insights across sports, business, fans and the IPL economy.</motion.p>
                <motion.div style={{ opacity: ctaOp }} className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={scrollToInsights} className="flex items-center gap-2 bg-primary text-white font-black text-[12px] uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/30 transition-all hover:scale-105 cursor-pointer">Explore Insights <ArrowRight className="w-4 h-4" /></button>
                    <Link href="/feed">
                      <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-white font-black text-[12px] uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-white/10 transition-all hover:scale-105 cursor-pointer">Feed <Activity className="w-4 h-4" /></button>
                    </Link>
                  </div>
                </motion.div>

              </motion.div>
            </motion.div>

            <motion.aside style={{ opacity: r1Op, x: r1X }} className="reference-scores">
              <div className="reference-heading"><h2>{liveMatch ? "Scores" : "Season honours"}</h2><Link href="/scores">View all →</Link></div>
              {liveMatch ? <Link href="/scores" className="reference-live-match"><span className="reference-kicker">MATCH IN PROGRESS</span><div className="flex justify-between items-center mt-4">{[liveMatch.matchInfo.team1,liveMatch.matchInfo.team2].map(t=><div key={t.teamId}><TeamLogo team={t.teamSName}/><strong className="block mt-2">{t.teamSName}</strong></div>)}</div><p className="mt-3 text-sm">{getMatchScoreLine(liveMatch).team1} · {getMatchScoreLine(liveMatch).team2}</p><p className="text-xs text-slate-400 mt-2">{liveMatch.matchInfo.status}</p></Link> : <div className="reference-champion"><div className="flex justify-between items-center"><span className="reference-kicker">IPL 2026 · CHAMPIONS</span><Trophy size={22} className="text-amber-300"/></div><div className="flex items-center gap-3 mt-4"><TeamLogo team="RCB"/><div><h3 className="text-xl font-black">RCB</h3><p className="text-xs text-slate-300">Royal Challengers Bengaluru</p></div></div><p className="mt-4 text-sm font-semibold">Back-to-back champions.</p><p className="text-xs text-slate-400 mt-2">Defeated Gujarat Titans by 5 wickets in the 2026 final.</p><div className="flex justify-between mt-4 text-xs"><Link href="/dugout/RCB" className="text-red-300">Explore RCB →</Link><a href="https://www.royalchallengers.com/rcb-cricket-news/news/rcb-crowned-as-ipl-2026-champions" target="_blank" rel="noopener noreferrer" className="text-slate-400">Final report ↗</a></div></div>}
              <Link href={selectedTeam ? `/dugout/${selectedTeam}` : '/dugout'} className="reference-team-link"><Shield size={18}/><span>Your franchise, in focus<small>Squads, seasons and stories</small></span><ArrowUpRight size={15}/></Link>
            </motion.aside>
          </motion.div>

          <motion.div style={{ opacity: r2Op, y: r2Y }} className="reference-middle">
            <section className="reference-stories">
              <div className="reference-heading"><div className="flex items-baseline gap-3"><h2>Top story</h2><p className="hidden md:block text-xs text-slate-400">Analysis. Opinions. The stories behind the game.</p></div><Link href="/feed">View all stories →</Link></div>
              <div className="reference-story-grid"><React.Suspense fallback={<p className="text-sm text-slate-400">Loading stories…</p>}><HomeInsights team={selectedTeam} limit={1}/></React.Suspense><aside className="reference-auction">
              <div className="reference-heading"><h2>IPL 2027 Auction Pulse</h2><Link href="/pulse" aria-label="Open Auction Pulse">↗</Link></div>
              <div className="reference-countdown"><span className="reference-kicker">PLAYER AUCTION · {auction?.status === 'confirmed' ? 'CONFIRMED' : 'REPORTED DATE'}</span><strong>{daysUntil(auction?.date ?? null) == null ? 'Date TBA' : `${Math.max(0, daysUntil(auction?.date ?? null)!)} days`}</strong><small>{auction?.date ?? 'Awaiting announcement'}</small></div>
              {[
                ['Retention tracker','Confirmed updates and coverage','/feed/ipl-2027/retentions'],
                ['Player market','Historical results and available player pools','/pulse'],
                ['Franchise needs','Role balance and squad depth','/ai-analyst/squad-dna'],
                ['Auction news & analysis','Stories behind the decisions','/feed/auction'],
              ].map(([title,desc,href])=><Link key={href} href={href} className="reference-auction-link"><Gavel size={16}/><span>{title}<small>{desc}</small></span><ArrowUpRight size={13}/></Link>)}
            <div className="reference-auction-prep"><div className="flex items-center gap-2"><Shield size={15}/><span className="text-[10px] font-bold uppercase tracking-wider">Your auction starts here</span></div><p>Who stays? Who makes room? Build your retention plan before exploring the player market.</p><Link href="/feed/squad">Enter the Retention Room <ArrowUpRight size={14}/></Link><span className="block text-[9px] text-slate-400 mt-2">Your picks are simulations, separate from official decisions.</span></div></aside></div>
            </section>
            <aside className="reference-home-ad" aria-label="Advertisement"><AdVessel slot="5938201746" format="rectangle" label="Advertisement" className="h-full" /></aside>
          </motion.div>

          <motion.section style={{ opacity: r3Op, y: r3Y }} className="reference-tools">
            <div className="reference-heading"><div className="flex items-baseline gap-3"><h2>Explore CricField</h2><p className="hidden md:block text-xs text-slate-400">Tools, data and insights for every cricket mind.</p></div><Link href="/ai-analyst">All tools →</Link></div>
            <div className="reference-tool-grid">{[
              {name:'Scout Lab',desc:'Player research across leagues',href:'/scout',icon:Compass,color:'#68ed9c'},
              {name:'Tactical Matrix',desc:'Strategy and matchups',href:'/ai-analyst/opposition-map',icon:Activity,color:'#3ccff4'},
              {name:'Squad DNA',desc:'Roles, balance and depth',href:'/ai-analyst/squad-dna',icon:Shield,color:'#ee9b65'},
              {name:'Player Intelligence',desc:'Compare player profiles',href:'/ai-analyst/player-pool',icon:BarChart2,color:'#c69af5'},
              {name:'Venue Intelligence',desc:'Grounds and conditions',href:'/feed/venues',icon:MapPin,color:'#37d3bd'},
              {name:'Auction War Room',desc:'Price context and squad needs',href:'/ai-analyst/auction-war-room',icon:Gavel,color:'#edcd64'},
            ].map(t=><Link key={t.href} href={t.href} className="reference-tool"><div className="flex justify-between items-center mb-2"><t.icon size={21} style={{color:t.color}}/><ArrowUpRight size={13} className="text-slate-500"/></div><h3>{t.name}</h3><p>{t.desc}</p></Link>)}</div>
          </motion.section>

        </motion.div>
      </div>


      </div>
    </Layout>
  );
}

