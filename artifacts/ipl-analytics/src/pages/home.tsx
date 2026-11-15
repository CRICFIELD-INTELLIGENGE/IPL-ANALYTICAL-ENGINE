import "./home-editorial.css";
import { MobileHome } from "@/components/mobile-home";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Activity,
  BarChart2,
  Shield,
  Compass,
  Gavel,
  Sparkles,
  Users,
  Star,
  Flame,
  Target,
  Calendar,
  Bookmark,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { useTeamTheme, type TeamCode, TEAM_REGISTRY } from "@/lib/team-context";
import { TeamLogo } from "@/components/team-logo";
import { AdVessel } from "@/components/ad-vessel";
import { HUB_EVENTS } from "@/lib/ipl-2027";

const EXPLORE_COVERAGE_CARDS = [
  { id: "squad", title: "SQUAD BUILDING", subtitle: "Retentions, releases, core and gaps", img: "/milestone-photos/final-2024-kkr.jpg", color: "text-amber-500 dark:text-amber-400", icon: Users },
  { id: "auction", title: "AUCTION", subtitle: "Purse, market and strategy", img: "/auction-art.jpg", color: "text-amber-500 dark:text-amber-400", icon: Gavel },
  { id: "tactics", title: "TACTICS", subtitle: "Evolving game styles", img: "/assets/tactical-board-hero.png", color: "text-emerald-500 dark:text-emerald-400", icon: Shield },
  { id: "stars", title: "STAR WATCH", subtitle: "Rising names to watch", img: "/milestone-photos/highest-total-2024-srh.jpg", color: "text-rose-500 dark:text-rose-400", icon: Star },
  { id: "venues", title: "VENUES", subtitle: "Conditions and trends", img: "/branding/auth/stadium-sunset-v1.png", color: "text-sky-500 dark:text-sky-400", icon: MapPin },
  { id: "storylines", title: "STORYLINES", subtitle: "Rivalries, narratives and more", img: "/milestone-photos/final-2023-csk.jpg", color: "text-orange-500 dark:text-orange-400", icon: Flame },
];

const INTELLIGENCE_STRIP = [
  { title: "Scout Lab", desc: "Discover & evaluate talent", icon: Compass, href: "/scout", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "Scenario Intelligence", desc: "Situation, strategy & decisions", icon: Target, href: "/ai-analyst/opposition-map", color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "Tactical Matrix", desc: "Matchups, plans & formations", icon: Activity, href: "/ai-analyst/squad-dna", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "Venue Intelligence", desc: "Grounds, dimensions & trends", icon: MapPin, href: "/feed/venues", color: "text-teal-400", bg: "bg-teal-500/10" },
  { title: "Player Intelligence", desc: "Form, consistency & context", icon: BarChart2, href: "/ai-analyst/player-pool", color: "text-purple-400", bg: "bg-purple-500/10" },
  { title: "Auction War Room", desc: "Bids, values & strategy", icon: Gavel, href: "/ai-analyst/auction-war-room", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

interface FranchiseIntelData {
  venue: string;
  image: string;
  tags: string[];
  title: string;
  summary: string;
  link: string;
  metrics: { label: string; pct: number }[];
}

const FRANCHISE_MAP: Record<TeamCode, FranchiseIntelData> = {
  MI: {
    venue: "Wankhede Stadium",
    image: "/venue-images/wankhede stadium.webp",
    tags: ["VENUE ANALYSIS", "TACTICS", "IPL INSIGHTS"],
    title: "The Wankhede Factor: How Boundary Velocity Shapes Mumbai Indians",
    summary: "Wankhede has seen 14.4 sixes per match and an 8.70 run rate. Mumbai Indians have won 59.6% of matches at home, where boundary firepower and chasing dynamics dictate results.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 84 },
      { label: "Middle-order Depth", pct: 78 },
      { label: "Spin Versatility", pct: 52 },
      { label: "Indian Pace Options", pct: 76 },
    ],
  },
  RR: {
    venue: "Sawai Mansingh Stadium",
    image: "/venue-images/sawai mansingh jaipur stadium.webp",
    tags: ["VENUE ANALYSIS", "SPIN DYNAMICS", "IPL INSIGHTS"],
    title: "The Sawai Mansingh Equation: Boundary Dimensions & Middle-Overs Squeeze",
    summary: "Jaipur's square boundaries (74m) reward disciplined spin and athletic boundary denial. Rajasthan Royals have built a 61.2% home win rate leveraging dual-spin containment.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 72 },
      { label: "Middle-order Depth", pct: 64 },
      { label: "Spin Versatility", pct: 58 },
      { label: "Indian Pace Options", pct: 46 },
    ],
  },
  RCB: {
    venue: "M. Chinnaswamy Stadium",
    image: "/venue-images/chinnaswamy stadium.webp",
    tags: ["VENUE ANALYSIS", "DEATH BOWLING", "IPL INSIGHTS"],
    title: "The Chinnaswamy Matrix: High Altitude, Short Boundaries & Bowling At The Death",
    summary: "At 920m elevation with 60m square boundaries, Bangalore is the hardest defensive venue in T20 cricket. RCB's consecutive title runs relied on defensive boundary-percentage control.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 75 },
      { label: "Middle-order Depth", pct: 80 },
      { label: "Spin Versatility", pct: 62 },
      { label: "Indian Pace Options", pct: 70 },
    ],
  },
  CSK: {
    venue: "MA Chidambaram Stadium",
    image: "/venue-images/ma chidambaram stadium.webp",
    tags: ["VENUE ANALYSIS", "SURFACE DECAY", "IPL INSIGHTS"],
    title: "The Chepauk Fortress: Low Bounce, Spin Stranglehold & Chasing Equations",
    summary: "Slow pitches and low ball-rebound at Chepauk allow Chennai Super Kings to dictate games through spin versatility and calculated strike rotation in overs 7–15.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 68 },
      { label: "Middle-order Depth", pct: 82 },
      { label: "Spin Versatility", pct: 88 },
      { label: "Indian Pace Options", pct: 54 },
    ],
  },
  KKR: {
    venue: "Eden Gardens",
    image: "/venue-images/eden gardens stadium.webp",
    tags: ["VENUE ANALYSIS", "POWERPLAY IMPACT", "IPL INSIGHTS"],
    title: "The Eden Gardens Template: True Pace, High Powerplay Baselines & Spin Defense",
    summary: "True bounce and rapid outfields at Kolkata enable record-breaking powerplay blitzes. KKR's championship pedigree centers on explosive phase-one strike rates.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 70 },
      { label: "Middle-order Depth", pct: 85 },
      { label: "Spin Versatility", pct: 92 },
      { label: "Indian Pace Options", pct: 60 },
    ],
  },
  SRH: {
    venue: "Rajiv Gandhi International Stadium",
    image: "/venue-images/rajiv gandhi hyderabad stadium.webp",
    tags: ["VENUE ANALYSIS", "BALL SPEED", "IPL INSIGHTS"],
    title: "The Uppal Highway: Ultra-Aggressive Scoring and Boundary Geometry",
    summary: "Hyderabad has recorded the fastest run-rates in league history. SRH's tactical doctrine weaponizes opening burst velocities to create insurmountable game leads.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 65 },
      { label: "Middle-order Depth", pct: 88 },
      { label: "Spin Versatility", pct: 55 },
      { label: "Indian Pace Options", pct: 72 },
    ],
  },
  DC: {
    venue: "Arun Jaitley Stadium",
    image: "/venue-images/arun jaitely stadium.webp",
    tags: ["VENUE ANALYSIS", "SHORT BOUNDARIES", "IPL INSIGHTS"],
    title: "The Kotla Dimension: Short Squares and Left-Hand Batter Matchups",
    summary: "Compact 58m boundaries at Delhi demand extreme bowling precision. DC's 2027 blueprint focuses on high-release quicks and off-pace variations.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 62 },
      { label: "Middle-order Depth", pct: 66 },
      { label: "Spin Versatility", pct: 74 },
      { label: "Indian Pace Options", pct: 68 },
    ],
  },
  PBKS: {
    venue: "Maharaja Yadavindra Singh Stadium",
    image: "/venue-images/mullanpur stadium.webp",
    tags: ["VENUE ANALYSIS", "SEAM PENETRATION", "IPL INSIGHTS"],
    title: "The Mullanpur Variable: Seam Movement and Pace Penetration Under Lights",
    summary: "Punjab's home venue yields early lateral movement and steep bounce. PBKS strategies revolve around upfront pace strikes to dismantle top orders.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 66 },
      { label: "Middle-order Depth", pct: 58 },
      { label: "Spin Versatility", pct: 60 },
      { label: "Indian Pace Options", pct: 78 },
    ],
  },
  GT: {
    venue: "Narendra Modi Stadium",
    image: "/venue-images/narendra modi stadium.webp",
    tags: ["VENUE ANALYSIS", "EXPANSIVE OUTFIELD", "IPL INSIGHTS"],
    title: "The Ahmedabad Scale: 80m Boundaries, Running Between Wickets & High Pace",
    summary: "The vast outfield at Narendra Modi Stadium places a premium on two-running and speed between wickets. Gujarat Titans exploit spatial depth to squeeze opposition boundaries.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 78 },
      { label: "Middle-order Depth", pct: 72 },
      { label: "Spin Versatility", pct: 80 },
      { label: "Indian Pace Options", pct: 74 },
    ],
  },
  LSG: {
    venue: "Ekana Cricket Stadium",
    image: "/venue-images/lucknow stadium.webp",
    tags: ["VENUE ANALYSIS", "DEFENSIVE BASES", "IPL INSIGHTS"],
    title: "The Ekana Duality: Soil Composition and Defensive First-Innings Totals",
    summary: "With two distinct soil preparations at Lucknow, defending sub-170 scores remains a core art form. LSG's squad architecture emphasizes disciplined defensive lengths.",
    link: "/intelligence",
    metrics: [
      { label: "Death Bowling", pct: 74 },
      { label: "Middle-order Depth", pct: 70 },
      { label: "Spin Versatility", pct: 76 },
      { label: "Indian Pace Options", pct: 65 },
    ],
  },
};

const AUCTION_TARGETS = [
  {
    name: "Ayush Mhatre",
    role: "Batting All-rounder",
    statLabel: "T20 SR",
    statVal: "178.6",
    estValue: "₹4–6 Cr",
    img: "/players/profiles-2026/ayush-mhatre.webp",
  },
  {
    name: "Vignesh Puthur",
    role: "Left-arm Spinner",
    statLabel: "Econ",
    statVal: "7.12",
    estValue: "₹2–4 Cr",
    img: "/players/profiles-2026/vignesh-puthur.webp",
  },
  {
    name: "Priyansh Arya",
    role: "Top-order Batter",
    statLabel: "T20 Avg",
    statVal: "42.3",
    estValue: "₹3–5 Cr",
    img: "/players/profiles-2026/priyansh-arya.webp",
  },
];

const LATEST_INSIGHTS = [
  {
    id: "ins-1",
    category: "AUCTION",
    tag: "Auction",
    title: "IPL 2027 Auction: 5 Big Questions for Every Franchise",
    date: "Nov 13, 2026",
    img: "/auction-art.jpg",
    href: "/pulse?season=2027&tab=Live+Blog",
  },
  {
    id: "ins-2",
    category: "TACTICS",
    tag: "Tactics",
    title: "The Rise of Matchup-Specific Bowling in T20 Cricket",
    date: "Nov 11, 2026",
    img: "/assets/tactical-board-hero.png",
    href: "/feed/tactics",
  },
  {
    id: "ins-3",
    category: "RISING STARS",
    tag: "Players",
    title: "10 Indian Uncapped Players to Watch for IPL 2027",
    date: "Nov 10, 2026",
    img: "/milestone-photos/highest-total-2024-srh.jpg",
    href: "/feed/stars",
  },
  {
    id: "ins-4",
    category: "VENUE INTELLIGENCE",
    tag: "Venues",
    title: "How Ground Dimensions Are Shaping T20 Strategy",
    date: "Nov 9, 2026",
    img: "/branding/auth/stadium-sunset-v1.png",
    href: "/feed/venues",
  },
  {
    id: "ins-5",
    category: "SQUAD BUILDING",
    tag: "Teams",
    title: "Squad Rebuilding & Retention Geometry: The Core vs Flexibility Dilemma",
    date: "Nov 8, 2026",
    img: "/milestone-photos/final-2024-kkr.jpg",
    href: "/feed/squad",
  },
  {
    id: "ins-6",
    category: "AUCTION",
    tag: "Auction",
    title: "Purse Dynamics: Inflation, Right-to-Match Cards and Bidding Curves",
    date: "Nov 7, 2026",
    img: "/auction-gavel.jpg",
    href: "/feed/auction",
  },
];

const CATEGORY_TABS = ["All", "Auction", "Tactics", "Players", "Venues", "Teams"] as const;

export default function HomePage() {
  const { selectedTeam } = useTeamTheme();
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    const handleResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Timezone-aware countdown calculation
  const auctionEvent = HUB_EVENTS.find((e) => e.id === "auction");
  const targetDateStr = auctionEvent?.date ?? "2026-12-16";
  const targetTime = useMemo(() => new Date(`${targetDateStr}T10:00:00+05:30`).getTime(), [targetDateStr]);

  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, targetTime - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, targetTime - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  // Mobile layout fallback
  if (isPhone) {
    return (
      <Layout hideRightPanel>
        <MobileHome />
      </Layout>
    );
  }

  // Active franchise data for Section 3
  const activeTeamCode: TeamCode = selectedTeam && FRANCHISE_MAP[selectedTeam] ? selectedTeam : "RR";
  const activeIntel = FRANCHISE_MAP[activeTeamCode];
  const activeTheme = TEAM_REGISTRY[activeTeamCode];

  // Filtered latest insights
  const filteredInsights = selectedCategory === "All"
    ? LATEST_INSIGHTS.slice(0, 4)
    : LATEST_INSIGHTS.filter((ins) => ins.tag.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <Layout hideRightPanel>
      <div className="cricfield-home home-editorial min-h-screen">
        <div className="home-layout-container">

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 1: HERO & AUCTION COUNTDOWN
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* HERO BANNER (8 cols lg, 9 cols xl) */}
            <div className="lg:col-span-8 xl:col-span-9 home-main-hero min-h-[400px] lg:min-h-[440px] flex relative overflow-hidden rounded-[24px] border border-white/10 bg-[#050C18] shadow-2xl">
              {/* IMAGE SIDE (RIGHT) */}
              <div className="absolute inset-y-0 right-0 w-full sm:w-[65%] md:w-[60%] lg:w-[58%] pointer-events-none select-none overflow-hidden">
                <div className="w-full h-full relative">
                  <img
                    src="/TITLE BANNER.png"
                    className="w-full h-full object-cover object-[right_top] sm:object-[center_top] transition-transform duration-[12s] hover:scale-105"
                    alt="IPL Champions and Star Players"
                  />
                  {/* Blending gradients */}
                  <div className="absolute inset-y-0 left-0 w-36 sm:w-60 bg-gradient-to-r from-[#050C18] via-[#050C18]/90 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050C18] via-[#050C18]/70 to-transparent" />
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050C18]/60 to-transparent" />
                </div>
              </div>

              {/* TEXT CONTENT (LEFT) */}
              <div className="home-hero-copy relative z-10 w-full md:w-[70%] lg:w-[64%] xl:w-[60%] flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div>
                  {/* Pills / Badges */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase tracking-wider text-[#00D2FF] bg-[#00D2FF]/10 border border-[#00D2FF]/30">
                      IPL OFFSEASON
                    </span>
                    <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-400">
                      IPL 2027
                    </span>
                  </div>

                  {/* Headline */}
                  <h1 className="font-black leading-[1.05] tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-[54px] select-none break-words mb-3">
                    <span className="text-white block">The Road to</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] via-[#38BDF8] to-[#2563EB] italic block">
                      IPL 2027
                    </span>
                  </h1>

                  <p className="text-slate-300 text-sm md:text-[15px] max-w-[460px] leading-relaxed mb-6 font-normal">
                    Retentions, auction intelligence, squad needs and emerging talent — all in one place.
                  </p>
                </div>

                {/* Call to Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/pulse">
                    <button className="flex items-center gap-2 bg-[#00D2FF] text-slate-950 font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl hover:bg-[#00D2FF]/90 shadow-lg shadow-[#00D2FF]/25 transition-all hover:scale-[1.02] cursor-pointer">
                      Explore Auction Hub <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>

                  <Link href={selectedTeam ? `/dugout/${selectedTeam}` : "/dugout"}>
                    <button className="flex items-center gap-2 bg-[#091424] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl border border-white/15 hover:bg-white/10 transition-all cursor-pointer">
                      View Franchise Analysis
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* AUCTION COUNTDOWN CARD (4 cols lg, 3 cols xl) */}
            <aside className="lg:col-span-4 xl:col-span-3 rounded-[24px] border border-white/10 bg-[#081322] p-5 shadow-2xl flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                      <Gavel size={15} />
                    </div>
                    <h2 className="text-xs font-black text-white uppercase tracking-wider">
                      IPL 2027 AUCTION
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Live</span>
                  </div>
                </div>

                {/* 4 Countdown Boxes */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="bg-[#0D1B2E] border border-white/10 rounded-xl p-2.5 text-center">
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {String(timeLeft.days).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] font-mono tracking-wider text-rose-400 font-bold uppercase mt-0.5">
                      DAYS
                    </div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-white/10 rounded-xl p-2.5 text-center">
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] font-mono tracking-wider text-rose-400 font-bold uppercase mt-0.5">
                      HRS
                    </div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-white/10 rounded-xl p-2.5 text-center">
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] font-mono tracking-wider text-rose-400 font-bold uppercase mt-0.5">
                      MIN
                    </div>
                  </div>
                  <div className="bg-[#0D1B2E] border border-white/10 rounded-xl p-2.5 text-center">
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] font-mono tracking-wider text-rose-400 font-bold uppercase mt-0.5">
                      SEC
                    </div>
                  </div>
                </div>

                {/* Quick Link Navigation */}
                <div className="flex flex-col gap-1.5 mt-4 pt-3 border-t border-white/10">
                  <Link
                    href="/feed/ipl-2027/retentions"
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
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
                          Latest updates and confirmed retentions
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  <Link
                    href="/ai-analyst/squad-dna"
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
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
                    href="/pulse?tab=Player+Pool"
                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
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
                          Player value, demand and availability
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </div>
              </div>

              {/* Bottom Scout Link */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-[#00D2FF]">
                <Link href="/scout" className="hover:underline flex items-center gap-1.5">
                  <Compass size={14} />
                  <span>Open Scout Lab</span>
                </Link>
                <Link href="/pulse" className="text-slate-400 hover:text-white transition-colors">
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </aside>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              INTELLIGENCE STRIP: 6 QUICK CARDS
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {INTELLIGENCE_STRIP.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#081220] border border-white/10 hover:border-white/25 hover:bg-[#0D1A2E] transition-all group shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <tool.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                    {tool.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {tool.desc}
                  </p>
                </div>
              </Link>
            ))}
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 2: EXPLORE IPL 2027 COVERAGE
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
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5">
              {EXPLORE_COVERAGE_CARDS.map((c) => (
                <Link
                  key={c.id}
                  href={`/feed/${c.id}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#081220] hover:border-white/30 shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  <div className="h-28 overflow-hidden relative bg-slate-900 shrink-0">
                    <img
                      src={c.img}
                      alt={c.title}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between bg-[#081220]">
                    <div className="flex items-center gap-1.5">
                      <c.icon className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${c.color}`} />
                      <span className="text-[11px] font-black text-white leading-tight uppercase tracking-wider">
                        {c.title}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <span className="text-[10px] text-white/60 line-clamp-1">{c.subtitle}</span>
                      <ArrowRight className={`w-3 h-3 shrink-0 ${c.color} transition-transform group-hover:translate-x-0.5`} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ═════════════════════════════════════════════════════════════════════
              SECTION 3: FEATURED ANALYSIS, SQUAD INTELLIGENCE & TOP AUCTION TARGETS
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* COLUMN 1: FEATURED ANALYSIS (5 cols lg, 5 cols xl) */}
            <div className="lg:col-span-5 xl:col-span-5 rounded-[24px] border border-white/10 bg-[#081322] overflow-hidden shadow-2xl flex flex-col justify-between group">
              <div className="relative">
                {/* Image */}
                <div className="h-56 w-full overflow-hidden relative bg-slate-950">
                  <img
                    src={activeIntel.image}
                    alt={activeIntel.venue}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#081322] via-[#081322]/40 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider text-[#00D2FF] bg-[#00D2FF]/20 border border-[#00D2FF]/40 backdrop-blur-md">
                      FEATURED ANALYSIS
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 space-y-3 -mt-6 relative z-10">
                  {/* Category Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeIntel.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight group-hover:text-[#00D2FF] transition-colors">
                    {activeIntel.title}
                  </h3>

                  {/* Dek */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {activeIntel.summary}
                  </p>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="p-5 sm:p-6 pt-0 flex items-center justify-between gap-3 border-t border-white/5 mt-2">
                <Link href={activeIntel.link}>
                  <button className="flex items-center gap-2 bg-[#00D2FF] text-slate-950 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-[#00D2FF]/90 transition-all cursor-pointer">
                    Read Full Analysis <ArrowRight size={14} />
                  </button>
                </Link>
                <button
                  type="button"
                  aria-label="Save for later"
                  className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Bookmark size={16} />
                </button>
              </div>
            </div>

            {/* COLUMN 2: FRANCHISE SQUAD INTELLIGENCE (3.5 cols lg, 3.5 cols xl) */}
            <div className="lg:col-span-3 xl:col-span-3 rounded-[24px] border border-white/10 bg-[#081322] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              <div>
                {/* Crest & Heading */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center p-2 border"
                    style={{
                      borderColor: activeTheme?.accent ?? "#E11D48",
                      backgroundColor: `${activeTheme?.accent ?? "#E11D48"}15`,
                    }}
                  >
                    <TeamLogo team={activeTeamCode} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {activeTeamCode} SQUAD INTELLIGENCE
                    </h3>
                    <p className="text-[11px] text-slate-400">Key focus areas for IPL 2027</p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-4 mt-5">
                  {activeIntel.metrics.map((m) => (
                    <div key={m.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">{m.label}</span>
                        <span className="text-white font-mono">{m.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${m.pct}%`,
                            backgroundColor: activeTheme?.accent ?? "#E11D48",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Full Analysis Button */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <Link href={`/dugout/${activeTeamCode}`}>
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-white/15 hover:bg-white/10 text-xs font-bold text-white uppercase tracking-wider transition-all cursor-pointer">
                    Full {activeTeamCode} Analysis <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>

            {/* COLUMN 3: TOP AUCTION TARGETS (3.5 cols lg, 3.5 cols xl) */}
            <aside className="lg:col-span-4 xl:col-span-4 rounded-[24px] border border-white/10 bg-[#081322] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      TOP AUCTION TARGETS
                    </h3>
                    <p className="text-[10px] text-slate-400">Uncapped & High-Value</p>
                  </div>
                  <Link href="/scout" className="text-xs font-semibold text-[#00D2FF] hover:underline">
                    Scout →
                  </Link>
                </div>

                {/* 3 Player Cards */}
                <div className="space-y-3 mt-4">
                  {AUCTION_TARGETS.map((player) => (
                    <div
                      key={player.name}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#0D1B2E] border border-white/5 hover:border-white/15 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                          <img
                            src={player.img}
                            alt={player.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-[#00D2FF] transition-colors">
                            {player.name}
                          </h4>
                          <p className="text-[10px] text-slate-400">{player.role}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono text-slate-400">
                          {player.statLabel} <span className="font-bold text-white">{player.statVal}</span>
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          {player.estValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Watchlist Button */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <Link href="/scout">
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-white/15 hover:bg-white/10 text-xs font-bold text-white uppercase tracking-wider transition-all cursor-pointer">
                    View Complete Watchlist <ArrowRight size={14} />
                  </button>
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
              SECTION 4: LATEST INSIGHTS
          ═════════════════════════════════════════════════════════════════════ */}
          <section className="space-y-4 my-2">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Latest Insights
                </h2>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-[#081322] border border-white/10 rounded-xl p-1">
                  {CATEGORY_TABS.map((cat) => (
                    <button
                      key={cat}
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
                href="/intelligence"
                className="text-xs font-bold text-[#00D2FF] hover:underline flex items-center gap-1"
              >
                <span>View all insights</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* 4 Responsive Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredInsights.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-[#081322] overflow-hidden hover:border-white/25 hover:bg-[#0D1C2E] transition-all flex flex-col group shadow-lg"
                >
                  {/* Card Image */}
                  <div className="h-44 overflow-hidden relative bg-slate-950 shrink-0">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider text-[#00D2FF] bg-slate-950/80 border border-[#00D2FF]/30 backdrop-blur-sm">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <h3 className="font-black text-sm sm:text-base leading-snug text-white group-hover:text-[#00D2FF] transition-colors line-clamp-2 mb-3">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      <Calendar size={13} className="text-slate-500" />
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
              {/* Left Brand Value */}
              <div className="lg:col-span-4 space-y-2 lg:border-r border-white/10 lg:pr-6">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Why CricField?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  A cricket intelligence platform that goes beyond scores — into strategy, talent, context and decisions.
                </p>
              </div>

              {/* Right 4 Pillars */}
              <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Database size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Multi-league Data</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    IPL, domestic & global
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Cpu size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">AI-Powered Insights</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Tactical, predictive & contextual
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Scout-Grade Analysis</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Players, roles & market value
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Target size={18} />
                  </div>
                  <h4 className="text-xs font-black text-white">Franchise Ready</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Squad, auction & season planning
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
